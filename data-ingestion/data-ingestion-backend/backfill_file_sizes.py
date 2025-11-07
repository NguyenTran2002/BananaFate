#!/usr/bin/env python3
"""
Backfill Script: Add fileSizeBytes to Existing Images

This script fetches file size metadata from GCS for all existing images
in MongoDB that don't have a fileSizeBytes field, and updates the documents.

Usage:
    python backfill_file_sizes.py [--dry-run] [--batch-size N]

Options:
    --dry-run       Show what would be updated without making changes
    --batch-size N  Number of documents to update per batch (default: 100)
"""

import argparse
import sys
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from google.cloud import storage
from helper_mongodb import get_collection

# Load environment variables
load_dotenv(override=True)

# GCS bucket name
BUCKET_NAME = "bananafate-images"


def get_blob_size(bucket, object_path: str) -> int:
    """
    Get the size of a blob in GCS without downloading it.

    Args:
        bucket: GCS bucket object
        object_path: Path to the object in GCS

    Returns:
        int: File size in bytes

    Raises:
        Exception: If blob doesn't exist or cannot be accessed
    """
    blob = bucket.blob(object_path)
    blob.reload()  # Fetch metadata from GCS
    return blob.size


def find_images_without_file_size(collection) -> List[Dict[str, Any]]:
    """
    Find all images in MongoDB that don't have a fileSizeBytes field.

    Args:
        collection: MongoDB collection

    Returns:
        List of image documents missing fileSizeBytes
    """
    query = {
        "$or": [
            {"fileSizeBytes": {"$exists": False}},
            {"fileSizeBytes": None}
        ]
    }
    images = list(collection.find(query))
    return images


def backfill_file_sizes(dry_run: bool = False, batch_size: int = 100):
    """
    Main backfill function.

    Args:
        dry_run: If True, only show what would be updated
        batch_size: Number of documents to process in each batch
    """
    print("=" * 70)
    print("BananaFate File Size Backfill Script")
    print("=" * 70)
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (will update database)'}")
    print(f"Batch size: {batch_size}")
    print()

    # Connect to MongoDB
    print("Connecting to MongoDB...")
    try:
        collection = get_collection()
        print("✅ MongoDB connection established")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        sys.exit(1)

    # Initialize GCS client
    print("\nInitializing GCS client...")
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        print(f"✅ GCS client initialized (bucket: {BUCKET_NAME})")
    except Exception as e:
        print(f"❌ Failed to initialize GCS client: {e}")
        sys.exit(1)

    # Find images without file size
    print("\nSearching for images without fileSizeBytes...")
    try:
        images = find_images_without_file_size(collection)
        print(f"✅ Found {len(images)} images missing file size data")
    except Exception as e:
        print(f"❌ Failed to query MongoDB: {e}")
        sys.exit(1)

    if len(images) == 0:
        print("\n✨ All images already have file size data. Nothing to do!")
        return

    # Process images
    print(f"\n{'Would process' if dry_run else 'Processing'} {len(images)} images...")
    print("-" * 70)

    successful = 0
    failed = 0
    failed_items = []

    for i, image in enumerate(images, 1):
        document_id = str(image['_id'])
        object_path = image.get('objectPath', '')
        banana_id = image.get('bananaId', 'unknown')
        batch_id = image.get('batchId', 'unknown')

        try:
            # Get file size from GCS
            file_size = get_blob_size(bucket, object_path)

            if dry_run:
                print(f"[{i}/{len(images)}] DRY RUN - Would update: {batch_id}/{banana_id}")
                print(f"           Object: {object_path}")
                print(f"           Size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")
            else:
                # Update MongoDB document
                collection.update_one(
                    {'_id': image['_id']},
                    {'$set': {'fileSizeBytes': file_size}}
                )
                print(f"[{i}/{len(images)}] ✅ Updated: {batch_id}/{banana_id} - {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")

            successful += 1

            # Progress update every batch_size items
            if i % batch_size == 0:
                print(f"\n--- Progress: {i}/{len(images)} ({i/len(images)*100:.1f}%) ---\n")

        except Exception as e:
            failed += 1
            failed_items.append({
                'documentId': document_id,
                'objectPath': object_path,
                'bananaId': banana_id,
                'batchId': batch_id,
                'error': str(e)
            })
            print(f"[{i}/{len(images)}] ❌ Failed: {batch_id}/{banana_id}")
            print(f"           Object: {object_path}")
            print(f"           Error: {e}")

    # Summary
    print()
    print("=" * 70)
    print("BACKFILL SUMMARY")
    print("=" * 70)
    print(f"Completed at: {datetime.now().isoformat()}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Total images found: {len(images)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")

    if failed > 0:
        print("\nFailed items:")
        for item in failed_items:
            print(f"  - {item['batchId']}/{item['bananaId']} (ID: {item['documentId']})")
            print(f"    Object: {item['objectPath']}")
            print(f"    Error: {item['error']}")

    if dry_run and successful > 0:
        print("\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.")

    print("=" * 70)


def main():
    """Parse arguments and run backfill."""
    parser = argparse.ArgumentParser(
        description='Backfill file sizes for existing images in MongoDB from GCS metadata'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of documents to process per progress update (default: 100)'
    )

    args = parser.parse_args()

    try:
        backfill_file_sizes(dry_run=args.dry_run, batch_size=args.batch_size)
    except KeyboardInterrupt:
        print("\n\n⚠️  Backfill interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
