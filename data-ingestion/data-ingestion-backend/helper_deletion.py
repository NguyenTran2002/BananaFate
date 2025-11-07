"""
Deletion Helper Module for BananaFate Backend

This module provides robust deletion operations with:
- Transaction-like behavior (fail-fast on GCS errors)
- Batch deletion for performance
- Count verification
- Audit logging
- Soft delete support
"""

import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from google.cloud import storage
from google import auth
from google.auth.transport import requests as auth_requests
from pymongo.collection import Collection
from bson import ObjectId

# Configuration
IS_PRODUCTION = os.getenv('IS_PRODUCTION', 'false').lower() == 'true'
SOFT_DELETE_ENABLED = os.getenv('SOFT_DELETE_ENABLED', 'false').lower() == 'true'
SOFT_DELETE_RETENTION_DAYS = int(os.getenv('SOFT_DELETE_RETENTION_DAYS', '30'))


class DeletionError(Exception):
    """Custom exception for deletion failures."""
    def __init__(self, message: str, gcs_errors: List[str] = None):
        super().__init__(message)
        self.gcs_errors = gcs_errors or []


def get_gcs_client():
    """Get authenticated GCS client."""
    bucket_name = os.getenv('GCS_BUCKET_NAME', 'bananafate-images')
    project_id = os.getenv('GCS_PROJECT_ID', 'banana-fate')

    credentials, project = auth.default()
    credentials.refresh(auth_requests.Request())
    storage_client = storage.Client(
        project=project_id or project,
        credentials=credentials
    )

    return storage_client, bucket_name


def delete_gcs_object(bucket, object_path: str) -> Tuple[bool, Optional[str]]:
    """
    Delete a single GCS object.

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    try:
        blob = bucket.blob(object_path)
        blob.delete()
        return True, None
    except Exception as e:
        error_msg = f"Failed to delete {object_path}: {str(e)}"
        if not IS_PRODUCTION:
            print(f"⚠️ {error_msg}")
        return False, error_msg


def delete_gcs_objects_batch(
    object_paths: List[str],
    max_workers: int = 10
) -> Tuple[int, List[str]]:
    """
    Delete multiple GCS objects in parallel.

    Args:
        object_paths: List of GCS object paths to delete
        max_workers: Maximum number of parallel deletion threads

    Returns:
        Tuple of (success_count: int, errors: List[str])
    """
    storage_client, bucket_name = get_gcs_client()
    bucket = storage_client.bucket(bucket_name)

    success_count = 0
    errors = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_path = {
            executor.submit(delete_gcs_object, bucket, path): path
            for path in object_paths
        }

        for future in as_completed(future_to_path):
            path = future_to_path[future]
            try:
                success, error = future.result()
                if success:
                    success_count += 1
                else:
                    errors.append(error)
            except Exception as e:
                error_msg = f"Failed to delete {path}: {str(e)}"
                errors.append(error_msg)
                if not IS_PRODUCTION:
                    print(f"⚠️ {error_msg}")

    if not IS_PRODUCTION:
        print(f"✅ Deleted {success_count}/{len(object_paths)} GCS objects")
        if errors:
            print(f"⚠️ {len(errors)} deletion errors")

    return success_count, errors


def log_deletion_audit(
    collection: Collection,
    user_id: str,
    operation_type: str,
    target: Dict,
    deleted_count: int,
    gcs_deleted_count: int,
    success: bool,
    errors: List[str] = None
):
    """
    Log deletion operation to audit trail.

    Args:
        collection: MongoDB collection (parent database will be used)
        user_id: User performing deletion
        operation_type: 'image', 'banana', or 'batch'
        target: Target information (documentId, batchId, bananaId, etc.)
        deleted_count: Number of MongoDB records deleted
        gcs_deleted_count: Number of GCS objects deleted
        success: Whether operation succeeded
        errors: List of error messages (if any)
    """
    try:
        db = collection.database
        audit_collection = db['deletion_audit']

        audit_record = {
            'timestamp': datetime.utcnow(),
            'userId': user_id,
            'operationType': operation_type,
            'target': target,
            'deletedCount': deleted_count,
            'gcsDeletedCount': gcs_deleted_count,
            'success': success,
            'errors': errors or [],
            'partialSuccess': gcs_deleted_count > 0 and gcs_deleted_count < deleted_count
        }

        audit_collection.insert_one(audit_record)

        if not IS_PRODUCTION:
            print(f"✅ Logged deletion audit: {operation_type} - {target}")

    except Exception as e:
        if not IS_PRODUCTION:
            print(f"⚠️ Failed to log audit: {e}")
        # Don't fail the deletion if audit logging fails


def soft_delete_documents(
    collection: Collection,
    filter_query: Dict,
    user_id: str
) -> int:
    """
    Soft delete documents by setting deletedAt and deletedBy fields.

    Args:
        collection: MongoDB collection
        filter_query: Query to find documents to soft delete
        user_id: User performing deletion

    Returns:
        Number of documents soft deleted
    """
    result = collection.update_many(
        filter_query,
        {
            '$set': {
                'deletedAt': datetime.utcnow(),
                'deletedBy': user_id,
                'isDeleted': True
            }
        }
    )

    if not IS_PRODUCTION:
        print(f"✅ Soft deleted {result.modified_count} documents")

    return result.modified_count


def hard_delete_documents(
    collection: Collection,
    filter_query: Dict
) -> int:
    """
    Hard delete documents from MongoDB.

    Args:
        collection: MongoDB collection
        filter_query: Query to find documents to delete

    Returns:
        Number of documents deleted
    """
    result = collection.delete_many(filter_query)

    if not IS_PRODUCTION:
        print(f"✅ Hard deleted {result.deleted_count} documents")

    return result.deleted_count


def delete_image_transaction(
    collection: Collection,
    document_id: str,
    user_id: str
) -> Dict:
    """
    Delete a single image with transaction-like behavior.

    Phase 1: Delete from GCS (fail-fast)
    Phase 2: Delete from MongoDB (or soft delete)
    Phase 3: Log audit trail

    Args:
        collection: MongoDB collection
        document_id: MongoDB document ID
        user_id: User performing deletion

    Returns:
        Dictionary with deletion results

    Raises:
        DeletionError: If deletion fails
    """
    try:
        obj_id = ObjectId(document_id)
    except Exception:
        raise ValueError("Invalid document ID")

    # Get document
    document = collection.find_one({"_id": obj_id})
    if not document:
        raise ValueError("Document not found")

    object_path = document.get('objectPath')
    if not object_path:
        raise ValueError("Document has no objectPath")

    # Phase 1: Delete from GCS (fail-fast)
    storage_client, bucket_name = get_gcs_client()
    bucket = storage_client.bucket(bucket_name)

    success, error = delete_gcs_object(bucket, object_path)
    if not success:
        # CRITICAL: GCS deletion failed - abort MongoDB deletion
        log_deletion_audit(
            collection, user_id, 'image',
            {'documentId': document_id, 'objectPath': object_path},
            0, 0, False, [error]
        )
        raise DeletionError(f"GCS deletion failed: {error}", [error])

    # Phase 2: Delete from MongoDB
    if SOFT_DELETE_ENABLED:
        deleted_count = soft_delete_documents(
            collection,
            {"_id": obj_id},
            user_id
        )
    else:
        deleted_count = hard_delete_documents(
            collection,
            {"_id": obj_id}
        )

    # Verify deletion
    if deleted_count == 0:
        # GCS deleted but MongoDB didn't - this is bad
        # We can't rollback GCS deletion, but we log it
        log_deletion_audit(
            collection, user_id, 'image',
            {'documentId': document_id, 'objectPath': object_path},
            0, 1, False,
            ["MongoDB deletion failed after GCS deletion succeeded"]
        )
        raise DeletionError(
            "MongoDB deletion failed after GCS deletion succeeded. "
            "GCS object has been orphaned.",
            ["MongoDB deletion returned 0 count"]
        )

    # Phase 3: Log audit
    log_deletion_audit(
        collection, user_id, 'image',
        {'documentId': document_id, 'objectPath': object_path},
        deleted_count, 1, True
    )

    return {
        "success": True,
        "deletedCount": deleted_count,
        "gcsDeletedCount": 1,
        "deletedDocument": document
    }


def delete_multiple_images_transaction(
    collection: Collection,
    filter_query: Dict,
    user_id: str,
    operation_type: str = 'banana',
    target_info: Dict = None
) -> Dict:
    """
    Delete multiple images with batch GCS deletion.

    Phase 1: Get all images
    Phase 2: Delete from GCS in parallel (fail if any fail)
    Phase 3: Delete from MongoDB (or soft delete)
    Phase 4: Log audit trail

    Args:
        collection: MongoDB collection
        filter_query: Query to find images to delete
        user_id: User performing deletion
        operation_type: 'banana' or 'batch'
        target_info: Target information for audit log

    Returns:
        Dictionary with deletion results

    Raises:
        DeletionError: If deletion fails
    """
    # Phase 1: Get all images
    images = list(collection.find(filter_query))

    if not images:
        raise ValueError(f"No images found for {operation_type}")

    expected_count = len(images)
    object_paths = [img.get('objectPath') for img in images if img.get('objectPath')]

    if len(object_paths) != expected_count:
        missing = expected_count - len(object_paths)
        error_msg = f"{missing} documents missing objectPath"
        if not IS_PRODUCTION:
            print(f"⚠️ {error_msg}")

    # Phase 2: Delete from GCS in parallel
    gcs_deleted, gcs_errors = delete_gcs_objects_batch(object_paths)

    # Check for GCS failures
    if gcs_errors:
        # Some GCS deletions failed - this is critical
        log_deletion_audit(
            collection, user_id, operation_type, target_info or {},
            0, gcs_deleted, False, gcs_errors
        )

        # Decide whether to continue with MongoDB deletion
        # If SOME succeeded, we have a problem - orphaned files
        if gcs_deleted > 0:
            error_msg = (
                f"Partial GCS deletion: {gcs_deleted}/{len(object_paths)} succeeded. "
                f"{len(gcs_errors)} failed. Aborting MongoDB deletion to prevent data inconsistency."
            )
            raise DeletionError(error_msg, gcs_errors)
        else:
            # All GCS deletions failed - safe to abort
            error_msg = f"All GCS deletions failed. Aborting MongoDB deletion."
            raise DeletionError(error_msg, gcs_errors)

    # Phase 3: Delete from MongoDB
    if SOFT_DELETE_ENABLED:
        deleted_count = soft_delete_documents(collection, filter_query, user_id)
    else:
        deleted_count = hard_delete_documents(collection, filter_query)

    # Phase 4: Verify counts match
    if deleted_count != expected_count:
        warning_msg = (
            f"Count mismatch: expected {expected_count}, deleted {deleted_count}"
        )
        if not IS_PRODUCTION:
            print(f"⚠️ {warning_msg}")

        log_deletion_audit(
            collection, user_id, operation_type, target_info or {},
            deleted_count, gcs_deleted, False, [warning_msg]
        )
        raise DeletionError(warning_msg, [warning_msg])

    # Phase 5: Log audit
    log_deletion_audit(
        collection, user_id, operation_type, target_info or {},
        deleted_count, gcs_deleted, True
    )

    return {
        "success": True,
        "deletedCount": deleted_count,
        "gcsDeletedCount": gcs_deleted,
        "expectedCount": expected_count,
        "deletedImages": images
    }


def cleanup_expired_soft_deletes(collection: Collection) -> int:
    """
    Clean up soft-deleted documents that have exceeded retention period.

    Args:
        collection: MongoDB collection

    Returns:
        Number of documents hard deleted
    """
    from datetime import timedelta

    if not SOFT_DELETE_ENABLED:
        return 0

    cutoff_date = datetime.utcnow() - timedelta(days=SOFT_DELETE_RETENTION_DAYS)

    # Find expired soft deletes
    expired_docs = list(collection.find({
        'isDeleted': True,
        'deletedAt': {'$lt': cutoff_date}
    }))

    if not expired_docs:
        return 0

    # Delete GCS objects
    object_paths = [doc.get('objectPath') for doc in expired_docs if doc.get('objectPath')]
    gcs_deleted, gcs_errors = delete_gcs_objects_batch(object_paths)

    if gcs_errors:
        if not IS_PRODUCTION:
            print(f"⚠️ Failed to delete {len(gcs_errors)} expired GCS objects")
        # Continue with MongoDB cleanup anyway

    # Hard delete from MongoDB
    result = collection.delete_many({
        'isDeleted': True,
        'deletedAt': {'$lt': cutoff_date}
    })

    if not IS_PRODUCTION:
        print(f"✅ Cleaned up {result.deleted_count} expired soft deletes")

    return result.deleted_count
