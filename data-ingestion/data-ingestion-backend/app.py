"""
BananaFate Data Ingestion & Management API
FastAPI backend for banana image capture, metadata storage, and data management.
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import os
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
import jwt
from google.cloud import storage
from google import auth
from google.auth.transport import requests as auth_requests
import logging
import traceback

from helper_mongodb import get_collection
from helper_gcs import generate_signed_upload_url
from helper_gcs_read import generate_signed_read_url
from helper_auth import verify_password, generate_token, verify_token
from helper_image_quality import extract_image_quality

load_dotenv(override=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Detect if running on Cloud Run (K_SERVICE environment variable is set by Cloud Run)
IS_PRODUCTION = os.getenv('K_SERVICE') is not None

app = FastAPI(
    title="BananaFate Data Ingestion & Management API",
    version="2.0.0",
    description="Backend API for banana image capture, metadata storage, and data management",
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not IS_PRODUCTION else None
)

# CORS configuration - allow all origins for development
# In production, you may want to restrict this to specific domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request validation

class SignedUrlRequest(BaseModel):
    """Request model for generating signed upload URL"""
    filename: str = Field(..., description="Object path in GCS bucket (e.g., 'batch_001/banana_042_1730819400.jpg')")
    contentType: str = Field(default="image/jpeg", description="MIME type for upload validation")

class MetadataRequest(BaseModel):
    """Request model for saving image metadata"""
    batchId: str = Field(..., description="Batch identifier for data collection session")
    bananaId: str = Field(..., description="Unique identifier for individual banana")
    captureTime: str = Field(..., description="ISO 8601 timestamp of capture")
    stage: str = Field(..., description="Ripeness stage (Under Ripe, Barely Ripe, Ripe, Very Ripe, Over Ripe, Death)")
    notes: Optional[str] = Field(default="", description="Optional observation notes")
    objectPath: str = Field(..., description="GCS object path returned from signed URL generation")
    fileSizeBytes: Optional[int] = Field(default=None, description="File size in bytes (optional for backward compatibility)")

class LoginRequest(BaseModel):
    """Request model for authentication"""
    password: str = Field(..., description="Management access password")

class UpdateMetadataRequest(BaseModel):
    """Request model for updating image metadata"""
    batchId: Optional[str] = Field(None, description="Batch identifier")
    bananaId: Optional[str] = Field(None, description="Banana identifier")
    captureTime: Optional[str] = Field(None, description="ISO 8601 timestamp of capture")
    stage: Optional[str] = Field(None, description="Ripeness stage")
    notes: Optional[str] = Field(None, description="Observation notes")

# Dependency for token authentication
async def verify_auth_token(authorization: Optional[str] = Header(None)):
    """
    Verify JWT token from Authorization header.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        dict: Decoded token payload

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        # Extract token from "Bearer <token>" format
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")

        payload = verify_token(token)
        return payload
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Helper function to serialize MongoDB documents
def serialize_document(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc['_id'] = str(doc['_id'])
    return doc

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "BananaFate Data Ingestion & Management API",
        "version": "2.0.0",
        "status": "operational",
        "environment": "production" if IS_PRODUCTION else "development",
        "features": ["data-ingestion", "data-management", "analytics"]
    }

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Cloud Run deployment verification.
    Tests MongoDB connectivity and reports service status.
    """
    try:
        # Test MongoDB connection
        collection = get_collection()
        collection.database.command('ping')
        mongodb_status = True
    except Exception as e:
        mongodb_status = False
        if not IS_PRODUCTION:
            print(f"MongoDB health check failed: {e}")

    return {
        "status": "healthy" if mongodb_status else "degraded",
        "mongodb": mongodb_status,
        "environment": "production" if IS_PRODUCTION else "development",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@app.post("/generate-signed-url")
async def create_signed_url(request: SignedUrlRequest, auth: dict = Depends(verify_auth_token)):
    """
    Generate a GCS signed URL for direct browser upload.

    This endpoint creates a temporary, pre-authenticated URL that allows
    the frontend to upload images directly to Google Cloud Storage without
    proxying through the backend.

    Request Body:
        {
            "filename": "batch_001/banana_042_1730819400.jpg",
            "contentType": "image/jpeg"
        }

    Response:
        {
            "signedUrl": "https://storage.googleapis.com/...",
            "objectPath": "batch_001/banana_042_1730819400.jpg",
            "expiresIn": 900
        }

    Raises:
        HTTPException: 500 if signed URL generation fails
    """
    try:
        result = generate_signed_upload_url(
            object_path=request.filename,
            content_type=request.contentType
        )

        if not IS_PRODUCTION:
            print(f"✅ Generated signed URL for: {request.filename}")

        return result
    except Exception as e:
        error_msg = "Failed to generate signed URL"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
            print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/save-metadata")
async def save_metadata(request: MetadataRequest, auth: dict = Depends(verify_auth_token)):
    """
    Save image metadata to MongoDB after successful GCS upload.

    This endpoint should be called after the image has been successfully
    uploaded to GCS using the signed URL. It stores the metadata and
    creates a link to the GCS object.

    Request Body:
        {
            "batchId": "batch_001",
            "bananaId": "banana_042",
            "captureTime": "2025-11-05T14:30:00Z",
            "stage": "Ripe",
            "notes": "Small brown spots",
            "objectPath": "batch_001/banana_042_1730819400.jpg"
        }

    Response:
        {
            "success": true,
            "documentId": "67abc123..."
        }

    Raises:
        HTTPException: 500 if metadata save fails
    """
    try:
        collection = get_collection()

        # Build document with metadata and GCS reference
        document = {
            "batchId": request.batchId,
            "bananaId": request.bananaId,
            "captureTime": request.captureTime,
            "stage": request.stage,
            "notes": request.notes,
            "objectPath": request.objectPath,
            "gcsUrl": f"gs://bananafate-images/{request.objectPath}",
            "uploadedAt": datetime.utcnow().isoformat() + "Z"
        }

        # Add file size if provided (optional for backward compatibility)
        if request.fileSizeBytes is not None:
            document["fileSizeBytes"] = request.fileSizeBytes

        # Insert into MongoDB
        result = collection.insert_one(document)

        if not IS_PRODUCTION:
            print(f"✅ Saved metadata for: {request.bananaId} (MongoDB ID: {result.inserted_id})")

        return {
            "success": True,
            "documentId": str(result.inserted_id)
        }
    except Exception as e:
        error_msg = "Failed to save metadata"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
            print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/lookup-banana/{banana_id}")
async def lookup_banana(banana_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Look up batch ID and capture history for a given banana ID.

    This endpoint helps minimize data entry errors by auto-filling the batch ID
    and providing context about the banana's previous captures.

    Args:
        banana_id: Banana identifier to look up

    Requires: Authentication token

    Response (found):
        {
            "found": true,
            "batchId": "batch_001",
            "lastStage": "Ripe",
            "lastCaptureDate": "2025-01-08T14:30:00Z",
            "captureCount": 5
        }

    Response (not found):
        {
            "found": false
        }

    Raises:
        HTTPException: 500 if lookup fails
    """
    try:
        collection = get_collection()

        # Find the most recent entry for this banana ID
        results = list(collection.find(
            {"bananaId": banana_id}
        ).sort("captureTime", -1).limit(1))

        result = results[0] if results else None

        if result:
            # Count total captures for this banana
            capture_count = collection.count_documents({"bananaId": banana_id})

            if not IS_PRODUCTION:
                print(f"✅ Lookup found: {banana_id} → {result['batchId']} (stage: {result.get('stage', 'N/A')}, count: {capture_count})")

            return {
                "found": True,
                "batchId": result['batchId'],
                "lastStage": result.get('stage', None),
                "lastCaptureDate": result.get('captureTime', None),
                "captureCount": capture_count
            }
        else:
            if not IS_PRODUCTION:
                print(f"ℹ️ Lookup not found: {banana_id} (new banana)")

            return {
                "found": False
            }
    except Exception as e:
        import traceback
        error_details = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"❌ Lookup error: {error_details}")  # Always print, even in production

        # Return detailed error for debugging (temporary)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to lookup banana: {type(e).__name__}: {str(e)}"
        )

# ============================================================================
# MANAGEMENT & ANALYTICS ENDPOINTS (New in v2.0)
# ============================================================================

@app.post("/auth/login")
async def login(request: LoginRequest):
    """
    Authenticate with management password and receive JWT token.

    Request Body:
        { "password": "your-password" }

    Response:
        { "token": "jwt-token-string", "expiresIn": 28800 }

    Raises:
        HTTPException: 401 if password is incorrect
    """
    try:
        if verify_password(request.password):
            token = generate_token()
            return {
                "token": token,
                "expiresIn": 28800  # 8 hours in seconds
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid password")
    except HTTPException:
        raise
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.get("/batches")
async def list_batches(auth: dict = Depends(verify_auth_token)):
    """
    List all batches with metadata (image count, date range, banana count).

    Requires: Authentication token

    Response:
        [
            {
                "batchId": "batch_001",
                "imageCount": 42,
                "bananaCount": 10,
                "firstCaptureTime": "2025-11-01T08:00:00Z",
                "lastCaptureTime": "2025-11-05T18:30:00Z"
            }
        ]
    """
    try:
        collection = get_collection()

        # Aggregate batches with metadata
        pipeline = [
            {
                "$group": {
                    "_id": "$batchId",
                    "imageCount": {"$sum": 1},
                    "uniqueBananas": {"$addToSet": "$bananaId"},
                    "firstCaptureTime": {"$min": "$captureTime"},
                    "lastCaptureTime": {"$max": "$captureTime"}
                }
            },
            {
                "$project": {
                    "batchId": "$_id",
                    "imageCount": 1,
                    "bananaCount": {"$size": "$uniqueBananas"},
                    "firstCaptureTime": 1,
                    "lastCaptureTime": 1,
                    "_id": 0
                }
            },
            {"$sort": {"batchId": 1}}
        ]

        batches = list(collection.aggregate(pipeline))
        return batches
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error listing batches: {e}")
        raise HTTPException(status_code=500, detail="Failed to list batches")

@app.get("/batches/{batch_id}")
async def get_batch_images(batch_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Get all images in a specific batch.

    Args:
        batch_id: Batch identifier

    Requires: Authentication token

    Response:
        [
            {
                "_id": "67abc123...",
                "batchId": "batch_001",
                "bananaId": "banana_042",
                "captureTime": "2025-11-05T14:30:00Z",
                "stage": "Ripe",
                "notes": "Small brown spots",
                "objectPath": "batch_001/banana_042_1730819400.jpg",
                "gcsUrl": "gs://bananafate-images/...",
                "uploadedAt": "2025-11-05T14:30:15.123Z"
            }
        ]
    """
    try:
        collection = get_collection()
        images = list(collection.find({"batchId": batch_id}).sort("captureTime", 1))
        return [serialize_document(img) for img in images]
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error getting batch images: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve batch images")

@app.get("/bananas")
async def list_bananas(auth: dict = Depends(verify_auth_token)):
    """
    List all unique bananas with metadata (image count, date range).

    Requires: Authentication token

    Response:
        [
            {
                "batchId": "batch_001",
                "bananaId": "banana_042",
                "imageCount": 7,
                "firstCaptureTime": "2025-11-01T08:00:00Z",
                "lastCaptureTime": "2025-11-05T18:30:00Z",
                "stages": ["Barely Ripe", "Ripe", "Very Ripe"]
            }
        ]
    """
    try:
        collection = get_collection()

        pipeline = [
            {
                "$group": {
                    "_id": {
                        "batchId": "$batchId",
                        "bananaId": "$bananaId"
                    },
                    "imageCount": {"$sum": 1},
                    "firstCaptureTime": {"$min": "$captureTime"},
                    "lastCaptureTime": {"$max": "$captureTime"},
                    "stages": {"$addToSet": "$stage"}
                }
            },
            {
                "$project": {
                    "batchId": "$_id.batchId",
                    "bananaId": "$_id.bananaId",
                    "imageCount": 1,
                    "firstCaptureTime": 1,
                    "lastCaptureTime": 1,
                    "stages": 1,
                    "_id": 0
                }
            },
            {"$sort": {"batchId": 1, "bananaId": 1}}
        ]

        bananas = list(collection.aggregate(pipeline))
        return bananas
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error listing bananas: {e}")
        raise HTTPException(status_code=500, detail="Failed to list bananas")

@app.get("/bananas/{batch_id}/{banana_id}")
async def get_banana_timeline(batch_id: str, banana_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Get all images of a specific banana (timeline view).

    Args:
        batch_id: Batch identifier
        banana_id: Banana identifier

    Requires: Authentication token

    Response: Array of image documents sorted by captureTime
    """
    try:
        collection = get_collection()
        images = list(collection.find({
            "batchId": batch_id,
            "bananaId": banana_id
        }).sort("captureTime", 1))
        return [serialize_document(img) for img in images]
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error getting banana timeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve banana timeline")

@app.put("/metadata/{document_id}")
async def update_metadata(document_id: str, request: UpdateMetadataRequest, auth: dict = Depends(verify_auth_token)):
    """
    Update metadata for a specific image.

    Args:
        document_id: MongoDB document ID

    Request Body: Any fields to update (all optional)

    Requires: Authentication token

    Response:
        {
            "success": true,
            "modifiedCount": 1,
            "before": { ... },
            "after": { ... }
        }
    """
    try:
        collection = get_collection()

        # Validate document ID
        try:
            obj_id = ObjectId(document_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid document ID")

        # Get current document
        before = collection.find_one({"_id": obj_id})
        if not before:
            raise HTTPException(status_code=404, detail="Document not found")

        # Build update dict (only include non-None fields)
        update_fields = {}
        if request.batchId is not None:
            update_fields["batchId"] = request.batchId
        if request.bananaId is not None:
            update_fields["bananaId"] = request.bananaId
        if request.captureTime is not None:
            update_fields["captureTime"] = request.captureTime
        if request.stage is not None:
            update_fields["stage"] = request.stage
        if request.notes is not None:
            update_fields["notes"] = request.notes

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add update timestamp
        update_fields["updatedAt"] = datetime.utcnow().isoformat() + "Z"

        # Update document
        result = collection.update_one(
            {"_id": obj_id},
            {"$set": update_fields}
        )

        # Get updated document
        after = collection.find_one({"_id": obj_id})

        if not IS_PRODUCTION:
            print(f"✅ Updated metadata for document: {document_id}")

        return {
            "success": True,
            "modifiedCount": result.modified_count,
            "before": serialize_document(before),
            "after": serialize_document(after)
        }
    except HTTPException:
        raise
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error updating metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to update metadata")

@app.delete("/image/{document_id}")
async def delete_image(document_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Delete a single image (MongoDB record + GCS object) with transaction-like behavior.

    Args:
        document_id: MongoDB document ID

    Requires: Authentication token

    Response:
        {
            "success": true,
            "deletedCount": 1,
            "gcsDeletedCount": 1,
            "deletedDocument": { ... }
        }

    Errors:
        - 400: Invalid document ID
        - 404: Document not found
        - 500: Deletion failed (includes GCS or MongoDB errors)
    """
    from helper_deletion import delete_image_transaction, DeletionError

    try:
        collection = get_collection()

        # Get user ID from auth token
        user_id = auth.get('userId', 'unknown')

        # Perform transactional deletion
        result = delete_image_transaction(collection, document_id, user_id)

        return {
            "success": result["success"],
            "deletedCount": result["deletedCount"],
            "gcsDeletedCount": result["gcsDeletedCount"],
            "deletedDocument": serialize_document(result["deletedDocument"])
        }

    except ValueError as e:
        # Invalid ID or not found
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))

    except DeletionError as e:
        # Deletion failed with specific errors
        error_detail = {
            "message": str(e),
            "errors": e.gcs_errors if hasattr(e, 'gcs_errors') else []
        }
        if not IS_PRODUCTION:
            print(f"❌ Deletion failed: {e}")
        raise HTTPException(status_code=500, detail=error_detail)

    except Exception as e:
        if not IS_PRODUCTION:
            print(f"❌ Unexpected error deleting image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

@app.delete("/banana/{batch_id}/{banana_id}")
async def delete_banana(batch_id: str, banana_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Delete all images of a specific banana (MongoDB + GCS) with batch deletion.

    Args:
        batch_id: Batch identifier
        banana_id: Banana identifier

    Requires: Authentication token

    Response:
        {
            "success": true,
            "deletedCount": 7,
            "gcsDeletedCount": 7,
            "expectedCount": 7,
            "deletedImages": [ ... ]
        }

    Errors:
        - 404: No images found for banana
        - 500: Deletion failed (includes GCS or MongoDB errors)
    """
    from helper_deletion import delete_multiple_images_transaction, DeletionError

    try:
        collection = get_collection()

        # Get user ID from auth token
        user_id = auth.get('userId', 'unknown')

        # Prepare filter query
        filter_query = {
            "batchId": batch_id,
            "bananaId": banana_id
        }

        # Prepare target info for audit
        target_info = {
            "batchId": batch_id,
            "bananaId": banana_id
        }

        # Perform transactional deletion
        result = delete_multiple_images_transaction(
            collection,
            filter_query,
            user_id,
            operation_type='banana',
            target_info=target_info
        )

        return {
            "success": result["success"],
            "deletedCount": result["deletedCount"],
            "gcsDeletedCount": result["gcsDeletedCount"],
            "expectedCount": result["expectedCount"],
            "deletedImages": [serialize_document(img) for img in result["deletedImages"]]
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except DeletionError as e:
        error_detail = {
            "message": str(e),
            "errors": e.gcs_errors if hasattr(e, 'gcs_errors') else []
        }
        if not IS_PRODUCTION:
            print(f"❌ Deletion failed: {e}")
        raise HTTPException(status_code=500, detail=error_detail)

    except Exception as e:
        if not IS_PRODUCTION:
            print(f"❌ Unexpected error deleting banana: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete banana: {str(e)}")

@app.delete("/batch/{batch_id}")
async def delete_batch(batch_id: str, auth: dict = Depends(verify_auth_token)):
    """
    Delete entire batch (all images in MongoDB + GCS) with batch deletion.

    Args:
        batch_id: Batch identifier

    Requires: Authentication token

    Response:
        {
            "success": true,
            "deletedCount": 42,
            "gcsDeletedCount": 42,
            "expectedCount": 42,
            "batchId": "batch_001"
        }

    Errors:
        - 404: No images found for batch
        - 500: Deletion failed (includes GCS or MongoDB errors)
    """
    from helper_deletion import delete_multiple_images_transaction, DeletionError

    try:
        collection = get_collection()

        # Get user ID from auth token
        user_id = auth.get('userId', 'unknown')

        # Prepare filter query
        filter_query = {"batchId": batch_id}

        # Prepare target info for audit
        target_info = {"batchId": batch_id}

        # Perform transactional deletion
        result = delete_multiple_images_transaction(
            collection,
            filter_query,
            user_id,
            operation_type='batch',
            target_info=target_info
        )

        return {
            "success": result["success"],
            "deletedCount": result["deletedCount"],
            "gcsDeletedCount": result["gcsDeletedCount"],
            "expectedCount": result["expectedCount"],
            "batchId": batch_id
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except DeletionError as e:
        error_detail = {
            "message": str(e),
            "errors": e.gcs_errors if hasattr(e, 'gcs_errors') else []
        }
        if not IS_PRODUCTION:
            print(f"❌ Deletion failed: {e}")
        raise HTTPException(status_code=500, detail=error_detail)

    except Exception as e:
        if not IS_PRODUCTION:
            print(f"❌ Unexpected error deleting batch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {str(e)}")

@app.get("/audit/deletions")
async def get_deletion_audit(
    limit: int = 50,
    skip: int = 0,
    operation_type: Optional[str] = None,
    auth: dict = Depends(verify_auth_token)
):
    """
    Get deletion audit trail.

    Args:
        limit: Maximum number of records to return (default: 50, max: 200)
        skip: Number of records to skip (for pagination)
        operation_type: Filter by operation type ('image', 'banana', 'batch')

    Requires: Authentication token

    Response:
        {
            "total": 150,
            "limit": 50,
            "skip": 0,
            "audits": [
                {
                    "timestamp": "2025-01-06T10:30:00Z",
                    "userId": "admin",
                    "operationType": "image",
                    "target": { "documentId": "...", "objectPath": "..." },
                    "deletedCount": 1,
                    "gcsDeletedCount": 1,
                    "success": true,
                    "errors": [],
                    "partialSuccess": false
                },
                ...
            ]
        }
    """
    try:
        collection = get_collection()
        db = collection.database
        audit_collection = db['deletion_audit']

        # Validate and cap limit
        limit = min(max(1, limit), 200)

        # Build filter query
        filter_query = {}
        if operation_type:
            if operation_type not in ['image', 'banana', 'batch']:
                raise HTTPException(status_code=400, detail="Invalid operation_type")
            filter_query['operationType'] = operation_type

        # Get total count
        total = audit_collection.count_documents(filter_query)

        # Get audit records
        audits = list(
            audit_collection.find(filter_query)
            .sort('timestamp', -1)  # Most recent first
            .skip(skip)
            .limit(limit)
        )

        # Serialize
        for audit in audits:
            if '_id' in audit:
                audit['_id'] = str(audit['_id'])
            if 'timestamp' in audit:
                audit['timestamp'] = audit['timestamp'].isoformat() + 'Z'

        return {
            "total": total,
            "limit": limit,
            "skip": skip,
            "audits": audits
        }

    except HTTPException:
        raise
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"❌ Error getting audit trail: {e}")
        raise HTTPException(status_code=500, detail="Failed to get audit trail")

@app.post("/maintenance/cleanup-soft-deletes")
async def cleanup_soft_deletes(auth: dict = Depends(verify_auth_token)):
    """
    Clean up expired soft-deleted documents (hard delete after retention period).

    This endpoint should be called periodically (e.g., daily cron job) to clean up
    soft-deleted documents that have exceeded the retention period.

    Requires: Authentication token

    Response:
        {
            "success": true,
            "deletedCount": 15,
            "message": "Cleaned up 15 expired soft deletes"
        }
    """
    from helper_deletion import cleanup_expired_soft_deletes

    try:
        collection = get_collection()

        deleted_count = cleanup_expired_soft_deletes(collection)

        return {
            "success": True,
            "deletedCount": deleted_count,
            "message": f"Cleaned up {deleted_count} expired soft deletes"
        }

    except Exception as e:
        if not IS_PRODUCTION:
            print(f"❌ Error cleaning up soft deletes: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup soft deletes")

@app.get("/analytics/counts")
async def get_analytics_counts(auth: dict = Depends(verify_auth_token)):
    """
    Get image counts by various dimensions.

    Requires: Authentication token

    Response:
        {
            "totalImages": 500,
            "totalBatches": 3,
            "totalBananas": 40,
            "byStage": {
                "Under Ripe": 80,
                "Barely Ripe": 100,
                "Ripe": 150,
                "Very Ripe": 100,
                "Over Ripe": 50,
                "Death": 20
            },
            "byBatch": {
                "batch_001": 180,
                "batch_002": 170,
                "batch_003": 150
            }
        }
    """
    try:
        collection = get_collection()

        # Total counts
        total_images = collection.count_documents({})

        # Count batches
        batches = collection.distinct("batchId")
        total_batches = len(batches)

        # Count unique bananas
        pipeline_bananas = [
            {
                "$group": {
                    "_id": {
                        "batchId": "$batchId",
                        "bananaId": "$bananaId"
                    }
                }
            },
            {"$count": "total"}
        ]
        banana_result = list(collection.aggregate(pipeline_bananas))
        total_bananas = banana_result[0]['total'] if banana_result else 0

        # Count by stage
        pipeline_stage = [
            {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        stage_counts = {item['_id']: item['count'] for item in collection.aggregate(pipeline_stage)}

        # Count by batch
        pipeline_batch = [
            {"$group": {"_id": "$batchId", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        batch_counts = {item['_id']: item['count'] for item in collection.aggregate(pipeline_batch)}

        return {
            "totalImages": total_images,
            "totalBatches": total_batches,
            "totalBananas": total_bananas,
            "byStage": stage_counts,
            "byBatch": batch_counts
        }
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error getting analytics counts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics counts")

@app.get("/analytics/timeline")
async def get_analytics_timeline(auth: dict = Depends(verify_auth_token)):
    """
    Get timeline data for visualization (images per day).

    Requires: Authentication token

    Response:
        [
            {
                "date": "2025-11-01",
                "count": 42,
                "stages": {
                    "Barely Ripe": 10,
                    "Ripe": 25,
                    "Very Ripe": 7
                }
            }
        ]
    """
    try:
        collection = get_collection()

        pipeline = [
            {
                "$project": {
                    "date": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": {"$dateFromString": {"dateString": "$captureTime"}}
                        }
                    },
                    "stage": 1
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": "$date",
                        "stage": "$stage"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "totalCount": {"$sum": "$count"},
                    "stages": {
                        "$push": {
                            "stage": "$_id.stage",
                            "count": "$count"
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}},
            {
                "$project": {
                    "date": "$_id",
                    "count": "$totalCount",
                    "stages": {
                        "$arrayToObject": {
                            "$map": {
                                "input": "$stages",
                                "as": "s",
                                "in": {
                                    "k": "$$s.stage",
                                    "v": "$$s.count"
                                }
                            }
                        }
                    },
                    "_id": 0
                }
            }
        ]

        timeline = list(collection.aggregate(pipeline))
        return timeline
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve timeline data")

@app.get("/analytics/stage-distribution")
async def get_stage_distribution(auth: dict = Depends(verify_auth_token)):
    """
    Get ripeness stage distribution for charts.

    Requires: Authentication token

    Response:
        [
            { "stage": "Under Ripe", "count": 80, "percentage": 16.0 },
            { "stage": "Barely Ripe", "count": 100, "percentage": 20.0 },
            ...
        ]
    """
    try:
        collection = get_collection()

        # Get total count
        total = collection.count_documents({})

        if total == 0:
            return []

        # Count by stage
        pipeline = [
            {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]

        results = list(collection.aggregate(pipeline))

        # Calculate percentages
        distribution = []
        for item in results:
            distribution.append({
                "stage": item['_id'],
                "count": item['count'],
                "percentage": round((item['count'] / total) * 100, 2)
            })

        return distribution
    except Exception as e:
        if not IS_PRODUCTION:
            print(f"Error getting stage distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve stage distribution")

@app.get("/gcs-signed-read-url")
async def get_signed_read_url(object_path: str, auth: dict = Depends(verify_auth_token)):
    """
    Generate signed URL for reading an image from GCS.

    Query Parameters:
        object_path: Path to object in GCS (e.g., "batch_001/banana_042_1730819400.jpg")

    Requires: Authentication token

    Response:
        {
            "signedUrl": "https://storage.googleapis.com/...",
            "objectPath": "batch_001/banana_042_1730819400.jpg",
            "expiresIn": 3600
        }
    """
    try:
        result = generate_signed_read_url(object_path)

        if not IS_PRODUCTION:
            print(f"✅ Generated signed read URL for: {object_path}")

        return result
    except Exception as e:
        error_msg = "Failed to generate signed read URL"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
            print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/image-quality")
async def get_image_quality(object_path: str, user_auth: dict = Depends(verify_auth_token)):
    """
    Extract and return image quality metadata from GCS blob.

    This endpoint downloads the image from GCS and extracts comprehensive
    quality information including resolution, format, file size, aspect ratio,
    orientation, and compression details.

    Query Parameters:
        object_path: Path to object in GCS (e.g., "batch_001/banana_042_1730819400.jpg")

    Requires: Authentication token

    Response:
        {
            "width": 3024,
            "height": 4032,
            "resolution": "3024 × 4032",
            "format": "JPEG",
            "file_size_bytes": 2457600,
            "file_size_kb": 2400.0,
            "file_size_mb": 2.34,
            "file_size_formatted": "2.34 MB",
            "aspect_ratio_decimal": 0.75,
            "aspect_ratio_label": "3:4",
            "orientation": "portrait",
            "compression_quality": 85,
            "color_mode": "RGB"
        }
    """
    logger.info(f"[IMAGE-QUALITY] Received request for object_path: {object_path}")

    try:
        bucket_name = os.getenv('GCS_BUCKET_NAME', 'bananafate-images')
        project_id = os.getenv('GCS_PROJECT_ID', 'banana-fate')

        logger.info(f"[IMAGE-QUALITY] Using bucket: {bucket_name}, project: {project_id}")

        # Get default credentials
        logger.info("[IMAGE-QUALITY] Getting default GCP credentials...")
        credentials, project = auth.default()

        # Refresh credentials to obtain access token
        logger.info("[IMAGE-QUALITY] Refreshing credentials...")
        credentials.refresh(auth_requests.Request())

        # Initialize GCS client with refreshed credentials
        logger.info("[IMAGE-QUALITY] Initializing GCS client...")
        storage_client = storage.Client(project=project_id or project, credentials=credentials)

        logger.info("[IMAGE-QUALITY] Getting bucket and blob references...")
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_path)

        # Check if blob exists
        logger.info(f"[IMAGE-QUALITY] Checking if blob exists: {object_path}")
        if not blob.exists():
            logger.error(f"[IMAGE-QUALITY] Blob not found: {object_path}")
            raise HTTPException(status_code=404, detail=f"Image not found: {object_path}")

        logger.info(f"[IMAGE-QUALITY] Blob exists. Downloading: {object_path}")

        # Download blob as bytes
        blob_bytes = blob.download_as_bytes()
        logger.info(f"[IMAGE-QUALITY] Downloaded blob successfully. Size: {len(blob_bytes)} bytes")

        # Extract image quality metadata
        logger.info(f"[IMAGE-QUALITY] Calling extract_image_quality() with {len(blob_bytes)} bytes...")
        quality_data = extract_image_quality(blob_bytes)

        logger.info(f"[IMAGE-QUALITY] Successfully extracted quality data for: {object_path}")
        logger.info(f"[IMAGE-QUALITY] Resolution: {quality_data.get('resolution')}, Format: {quality_data.get('format')}, Size: {quality_data.get('file_size_formatted')}")

        return quality_data

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # Handle image processing errors
        error_msg = f"Failed to extract image quality: {str(e)}"
        logger.error(f"[IMAGE-QUALITY] ValueError: {error_msg}")
        logger.error(f"[IMAGE-QUALITY] Stack trace:\n{traceback.format_exc()}")
        raise HTTPException(status_code=422, detail=error_msg)
    except Exception as e:
        # Handle other errors (GCS, network, etc.)
        error_msg = f"Failed to retrieve image quality: {str(e)}"
        logger.error(f"[IMAGE-QUALITY] Unexpected error: {error_msg}")
        logger.error(f"[IMAGE-QUALITY] Exception type: {type(e).__name__}")
        logger.error(f"[IMAGE-QUALITY] Stack trace:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/analytics/storage")
async def get_storage_analytics(auth: dict = Depends(verify_auth_token)):
    """
    Get storage analytics for all images.

    Calculates total storage, averages, cost projections, and identifies outliers.

    Requires: Authentication token

    Response:
        {
            "totalStorageBytes": 1234567890,
            "totalStorageFormatted": "1.15 GB",
            "totalPhotos": 500,
            "averagePerPhotoBytes": 2469135,
            "averagePerPhotoFormatted": "2.35 MB",
            "averagePerBananaBytes": 12345678,
            "averagePerBananaFormatted": "11.77 MB",
            "totalBananas": 100,
            "estimatedMonthlyCostUSD": 0.023,
            "largestImages": [
                {
                    "documentId": "...",
                    "batchId": "batch_001",
                    "bananaId": "banana_042",
                    "objectPath": "batch_001/banana_042_1730819400.jpg",
                    "stage": "Ripe",
                    "fileSizeBytes": 5000000,
                    "fileSizeFormatted": "4.77 MB"
                },
                ...
            ],
            "smallestImages": [...]
        }
    """
    try:
        collection = get_collection()

        # Get all images with file size data
        images_with_size = list(collection.find(
            {"fileSizeBytes": {"$exists": True, "$ne": None}},
            {"_id": 1, "batchId": 1, "bananaId": 1, "objectPath": 1, "stage": 1, "fileSizeBytes": 1}
        ))

        if len(images_with_size) == 0:
            return {
                "totalStorageBytes": 0,
                "totalStorageFormatted": "0 B",
                "totalPhotos": 0,
                "averagePerPhotoBytes": 0,
                "averagePerPhotoFormatted": "0 B",
                "averagePerBananaBytes": 0,
                "averagePerBananaFormatted": "0 B",
                "totalBananas": 0,
                "estimatedMonthlyCostUSD": 0.0,
                "largestImages": [],
                "smallestImages": [],
                "imagesWithoutSize": 0
            }

        # Calculate total storage
        total_storage_bytes = sum(img.get("fileSizeBytes", 0) for img in images_with_size)

        # Total photos with size data
        total_photos = len(images_with_size)

        # Average per photo
        avg_per_photo_bytes = total_storage_bytes // total_photos if total_photos > 0 else 0

        # Calculate average per banana (group by bananaId)
        banana_storage = {}
        for img in images_with_size:
            banana_id = img.get("bananaId")
            if banana_id:
                if banana_id not in banana_storage:
                    banana_storage[banana_id] = 0
                banana_storage[banana_id] += img.get("fileSizeBytes", 0)

        total_bananas = len(banana_storage)
        avg_per_banana_bytes = total_storage_bytes // total_bananas if total_bananas > 0 else 0

        # Cost projection (GCS Standard Storage: $0.020/GB/month in us-central1)
        # Convert bytes to GB, then multiply by rate
        total_storage_gb = total_storage_bytes / (1024 ** 3)
        estimated_monthly_cost = total_storage_gb * 0.020

        # Format sizes
        def format_bytes(bytes_val):
            if bytes_val >= 1024 ** 3:  # GB
                return f"{bytes_val / (1024 ** 3):.2f} GB"
            elif bytes_val >= 1024 ** 2:  # MB
                return f"{bytes_val / (1024 ** 2):.2f} MB"
            elif bytes_val >= 1024:  # KB
                return f"{bytes_val / 1024:.2f} KB"
            else:
                return f"{bytes_val} B"

        # Find largest and smallest images (top 5 each)
        sorted_by_size = sorted(images_with_size, key=lambda x: x.get("fileSizeBytes", 0), reverse=True)

        largest_images = [
            {
                "documentId": str(img["_id"]),
                "batchId": img.get("batchId", ""),
                "bananaId": img.get("bananaId", ""),
                "objectPath": img.get("objectPath", ""),
                "stage": img.get("stage", ""),
                "fileSizeBytes": img.get("fileSizeBytes", 0),
                "fileSizeFormatted": format_bytes(img.get("fileSizeBytes", 0))
            }
            for img in sorted_by_size[:5]
        ]

        smallest_images = [
            {
                "documentId": str(img["_id"]),
                "batchId": img.get("batchId", ""),
                "bananaId": img.get("bananaId", ""),
                "objectPath": img.get("objectPath", ""),
                "stage": img.get("stage", ""),
                "fileSizeBytes": img.get("fileSizeBytes", 0),
                "fileSizeFormatted": format_bytes(img.get("fileSizeBytes", 0))
            }
            for img in sorted_by_size[-5:][::-1]  # Reverse to show smallest first
        ]

        # Count images without file size for info
        images_without_size = collection.count_documents({
            "$or": [
                {"fileSizeBytes": {"$exists": False}},
                {"fileSizeBytes": None}
            ]
        })

        return {
            "totalStorageBytes": total_storage_bytes,
            "totalStorageFormatted": format_bytes(total_storage_bytes),
            "totalPhotos": total_photos,
            "averagePerPhotoBytes": avg_per_photo_bytes,
            "averagePerPhotoFormatted": format_bytes(avg_per_photo_bytes),
            "averagePerBananaBytes": avg_per_banana_bytes,
            "averagePerBananaFormatted": format_bytes(avg_per_banana_bytes),
            "totalBananas": total_bananas,
            "estimatedMonthlyCostUSD": round(estimated_monthly_cost, 4),
            "largestImages": largest_images,
            "smallestImages": smallest_images,
            "imagesWithoutSize": images_without_size
        }

    except Exception as e:
        error_msg = "Failed to retrieve storage analytics"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
            print(f"Error getting storage analytics: {e}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/analytics/mobile-dashboard")
async def get_mobile_dashboard(auth: dict = Depends(verify_auth_token)):
    """
    Get lightweight analytics for mobile dashboard.

    Returns collection progress, stage distribution, and basic storage stats
    optimized for the data ingestion frontend.

    Requires: Authentication token

    Response:
        {
            "totalImages": 250,
            "progressToGoal": 50.0,
            "goal": 500,
            "stageDistribution": [
                {"stage": "Under Ripe", "count": 45},
                {"stage": "Barely Ripe", "count": 52},
                ...
            ],
            "storage": {
                "totalStorageBytes": 123456789,
                "totalStorageFormatted": "117.74 MB",
                "totalPhotos": 250,
                "averagePerPhotoBytes": 493827,
                "averagePerPhotoFormatted": "482.25 KB",
                "estimatedMonthlyCostUSD": 0.0024
            }
        }
    """
    try:
        collection = get_collection()

        # Total images count
        total_images = collection.count_documents({})

        # Progress to 500 images goal
        goal = 500
        progress_percentage = (total_images / goal) * 100 if goal > 0 else 0

        # Stage distribution
        stage_pipeline = [
            {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        stage_results = list(collection.aggregate(stage_pipeline))
        stage_distribution = [
            {"stage": result["_id"], "count": result["count"]}
            for result in stage_results
        ]

        # Basic storage stats
        images_with_size = list(collection.find(
            {"fileSizeBytes": {"$exists": True, "$ne": None}},
            {"fileSizeBytes": 1}
        ))

        if len(images_with_size) > 0:
            total_storage_bytes = sum(img.get("fileSizeBytes", 0) for img in images_with_size)
            total_photos = len(images_with_size)
            avg_per_photo_bytes = total_storage_bytes // total_photos if total_photos > 0 else 0

            # Cost projection (GCS Standard Storage: $0.020/GB/month)
            total_storage_gb = total_storage_bytes / (1024 ** 3)
            estimated_monthly_cost = total_storage_gb * 0.020

            # Format function
            def format_bytes(bytes_val):
                if bytes_val >= 1024 ** 3:  # GB
                    return f"{bytes_val / (1024 ** 3):.2f} GB"
                elif bytes_val >= 1024 ** 2:  # MB
                    return f"{bytes_val / (1024 ** 2):.2f} MB"
                elif bytes_val >= 1024:  # KB
                    return f"{bytes_val / 1024:.2f} KB"
                else:
                    return f"{bytes_val} B"

            storage_stats = {
                "totalStorageBytes": total_storage_bytes,
                "totalStorageFormatted": format_bytes(total_storage_bytes),
                "totalPhotos": total_photos,
                "averagePerPhotoBytes": avg_per_photo_bytes,
                "averagePerPhotoFormatted": format_bytes(avg_per_photo_bytes),
                "estimatedMonthlyCostUSD": round(estimated_monthly_cost, 4)
            }
        else:
            storage_stats = {
                "totalStorageBytes": 0,
                "totalStorageFormatted": "0 B",
                "totalPhotos": 0,
                "averagePerPhotoBytes": 0,
                "averagePerPhotoFormatted": "0 B",
                "estimatedMonthlyCostUSD": 0.0
            }

        return {
            "totalImages": total_images,
            "progressToGoal": round(progress_percentage, 1),
            "goal": goal,
            "stageDistribution": stage_distribution,
            "storage": storage_stats
        }

    except Exception as e:
        error_msg = "Failed to retrieve mobile dashboard data"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
            print(f"Error getting mobile dashboard: {e}")
        raise HTTPException(status_code=500, detail=error_msg)

# Run server (for local development)
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info" if not IS_PRODUCTION else "warning"
    )
