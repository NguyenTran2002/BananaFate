#!/usr/bin/env python3
"""
Data Integrity Verification Script for BananaFate

This script checks for orphaned files and records between GCS and MongoDB:
- Orphaned GCS files: Files in GCS bucket but not in MongoDB
- Orphaned MongoDB records: MongoDB records pointing to non-existent GCS files

Usage:
    python verify_data_integrity.py [--cleanup] [--dry-run]

Options:
    --cleanup    Clean up orphaned files (requires confirmation)
    --dry-run    Show what would be cleaned up without actually deleting
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Set
import argparse

# Add parent directory to path to import dependencies
sys.path.insert(0, str(Path(__file__).parent.parent / 'data-ingestion' / 'data-ingestion-backend'))

from dotenv import load_dotenv
from pymongo import MongoClient
from google.cloud import storage

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def load_config() -> Dict[str, str]:
    """Load configuration from deployment .env file."""
    env_path = Path(__file__).parent.parent / 'deployment' / '.env'

    if not env_path.exists():
        print(f"{Colors.FAIL}Error: .env file not found at {env_path}{Colors.ENDC}")
        sys.exit(1)

    load_dotenv(env_path)

    # Construct MongoDB URI from credentials
    mongodb_username = os.getenv('MONGODB_USERNAME')
    mongodb_password = os.getenv('MONGODB_PASSWORD')
    mongodb_cluster = os.getenv('MONGODB_CLUSTER')
    mongodb_database = os.getenv('MONGODB_DATABASE', 'BananaFate_database')

    if not all([mongodb_username, mongodb_password, mongodb_cluster]):
        print(f"{Colors.FAIL}Error: MongoDB credentials not found in .env file{Colors.ENDC}")
        print(f"{Colors.FAIL}Required: MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_CLUSTER{Colors.ENDC}")
        sys.exit(1)

    mongodb_uri = f"mongodb+srv://{mongodb_username}:{mongodb_password}@{mongodb_cluster}/{mongodb_database}?retryWrites=true&w=majority"

    config = {
        'mongodb_uri': mongodb_uri,
        'gcs_bucket': os.getenv('GCS_BUCKET_NAME', 'bananafate-images'),
    }

    return config


def get_mongodb_records(config: Dict[str, str]) -> List[Dict]:
    """Retrieve all records from MongoDB."""
    print(f"{Colors.OKBLUE}Connecting to MongoDB...{Colors.ENDC}")
    client = MongoClient(config['mongodb_uri'])
    db = client['BananaFate_database']
    collection = db['banana_images']

    records = list(collection.find({}, {
        '_id': 1,
        'objectPath': 1,
        'batchId': 1,
        'bananaId': 1,
        'captureTime': 1,
        'fileSizeBytes': 1
    }))

    print(f"{Colors.OKGREEN}Found {len(records)} records in MongoDB{Colors.ENDC}")
    return records


def get_gcs_files(config: Dict[str, str]) -> List[Dict]:
    """Retrieve all files from GCS bucket."""
    print(f"{Colors.OKBLUE}Connecting to GCS...{Colors.ENDC}")
    storage_client = storage.Client()
    bucket = storage_client.bucket(config['gcs_bucket'])

    blobs = []
    for blob in bucket.list_blobs():
        blobs.append({
            'name': blob.name,
            'size': blob.size,
            'updated': blob.updated,
            'content_type': blob.content_type
        })

    print(f"{Colors.OKGREEN}Found {len(blobs)} files in GCS{Colors.ENDC}")
    return blobs


def analyze_data_integrity(
    mongodb_records: List[Dict],
    gcs_files: List[Dict]
) -> Tuple[List[Dict], List[Dict], Dict[str, any]]:
    """
    Analyze data integrity between MongoDB and GCS.

    Returns:
        Tuple of (orphaned_gcs_files, orphaned_mongodb_records, statistics)
    """
    print(f"\n{Colors.HEADER}{Colors.BOLD}Analyzing data integrity...{Colors.ENDC}")

    # Create sets for efficient lookup
    gcs_paths: Set[str] = {file['name'] for file in gcs_files}
    mongodb_paths: Set[str] = {record['objectPath'] for record in mongodb_records}

    # Find orphaned GCS files (in GCS but not in MongoDB)
    orphaned_gcs = [
        file for file in gcs_files
        if file['name'] not in mongodb_paths
    ]

    # Find orphaned MongoDB records (in MongoDB but not in GCS)
    orphaned_mongodb = [
        record for record in mongodb_records
        if record['objectPath'] not in gcs_paths
    ]

    # Calculate statistics
    total_gcs_size = sum(file['size'] for file in gcs_files)
    orphaned_gcs_size = sum(file['size'] for file in orphaned_gcs)

    stats = {
        'total_gcs_files': len(gcs_files),
        'total_mongodb_records': len(mongodb_records),
        'orphaned_gcs_count': len(orphaned_gcs),
        'orphaned_mongodb_count': len(orphaned_mongodb),
        'total_gcs_size_bytes': total_gcs_size,
        'total_gcs_size_mb': total_gcs_size / (1024 * 1024),
        'orphaned_gcs_size_bytes': orphaned_gcs_size,
        'orphaned_gcs_size_mb': orphaned_gcs_size / (1024 * 1024),
        'storage_waste_percent': (orphaned_gcs_size / total_gcs_size * 100) if total_gcs_size > 0 else 0,
        'monthly_cost_estimate': total_gcs_size / (1024**3) * 0.020,  # $0.020/GB/month
        'wasted_cost_estimate': orphaned_gcs_size / (1024**3) * 0.020,
    }

    return orphaned_gcs, orphaned_mongodb, stats


def print_report(
    orphaned_gcs: List[Dict],
    orphaned_mongodb: List[Dict],
    stats: Dict[str, any]
):
    """Print detailed integrity report."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}DATA INTEGRITY REPORT{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")

    # Overall statistics
    print(f"{Colors.BOLD}Overall Statistics:{Colors.ENDC}")
    print(f"  Total GCS files:         {stats['total_gcs_files']}")
    print(f"  Total MongoDB records:   {stats['total_mongodb_records']}")
    print(f"  Total storage:           {stats['total_gcs_size_mb']:.2f} MB")
    print(f"  Monthly cost estimate:   ${stats['monthly_cost_estimate']:.4f}")

    # Data consistency
    print(f"\n{Colors.BOLD}Data Consistency:{Colors.ENDC}")
    if stats['orphaned_gcs_count'] == 0 and stats['orphaned_mongodb_count'] == 0:
        print(f"  {Colors.OKGREEN}✓ Perfect consistency! No orphaned data found.{Colors.ENDC}")
    else:
        if stats['orphaned_gcs_count'] > 0:
            print(f"  {Colors.WARNING}⚠ Orphaned GCS files:    {stats['orphaned_gcs_count']} ({stats['orphaned_gcs_size_mb']:.2f} MB){Colors.ENDC}")
            print(f"  {Colors.WARNING}  Storage waste:         {stats['storage_waste_percent']:.2f}%{Colors.ENDC}")
            print(f"  {Colors.WARNING}  Wasted monthly cost:   ${stats['wasted_cost_estimate']:.4f}{Colors.ENDC}")
        else:
            print(f"  {Colors.OKGREEN}✓ No orphaned GCS files{Colors.ENDC}")

        if stats['orphaned_mongodb_count'] > 0:
            print(f"  {Colors.WARNING}⚠ Orphaned MongoDB records: {stats['orphaned_mongodb_count']}{Colors.ENDC}")
        else:
            print(f"  {Colors.OKGREEN}✓ No orphaned MongoDB records{Colors.ENDC}")

    # Detailed orphaned GCS files
    if orphaned_gcs:
        print(f"\n{Colors.BOLD}Orphaned GCS Files (in GCS but not in MongoDB):{Colors.ENDC}")
        print(f"{Colors.WARNING}These files are wasting storage and should be cleaned up.{Colors.ENDC}\n")

        # Sort by size (largest first)
        orphaned_gcs_sorted = sorted(orphaned_gcs, key=lambda x: x['size'], reverse=True)

        print(f"{'File Path':<60} {'Size (KB)':>12} {'Last Modified':<20}")
        print(f"{'-'*95}")
        for file in orphaned_gcs_sorted[:20]:  # Show top 20
            size_kb = file['size'] / 1024
            updated = file['updated'].strftime('%Y-%m-%d %H:%M:%S') if file['updated'] else 'Unknown'
            print(f"{file['name']:<60} {size_kb:>12.2f} {updated:<20}")

        if len(orphaned_gcs) > 20:
            print(f"\n  ... and {len(orphaned_gcs) - 20} more files")

    # Detailed orphaned MongoDB records
    if orphaned_mongodb:
        print(f"\n{Colors.BOLD}Orphaned MongoDB Records (in MongoDB but not in GCS):{Colors.ENDC}")
        print(f"{Colors.WARNING}These records point to non-existent files and should be cleaned up.{Colors.ENDC}\n")

        print(f"{'Batch ID':<15} {'Banana ID':<15} {'Object Path':<50} {'Capture Time':<20}")
        print(f"{'-'*100}")
        for record in orphaned_mongodb[:20]:  # Show top 20
            batch_id = record.get('batchId', 'Unknown')
            banana_id = record.get('bananaId', 'Unknown')
            path = record.get('objectPath', 'Unknown')
            capture_time = record.get('captureTime', 'Unknown')
            print(f"{batch_id:<15} {banana_id:<15} {path:<50} {str(capture_time):<20}")

        if len(orphaned_mongodb) > 20:
            print(f"\n  ... and {len(orphaned_mongodb) - 20} more records")

    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")


def cleanup_orphans(
    config: Dict[str, str],
    orphaned_gcs: List[Dict],
    orphaned_mongodb: List[Dict],
    dry_run: bool = False
):
    """Clean up orphaned files and records."""
    if dry_run:
        print(f"{Colors.WARNING}DRY RUN MODE - No actual deletions will occur{Colors.ENDC}\n")

    # Clean up orphaned GCS files
    if orphaned_gcs:
        print(f"\n{Colors.BOLD}Cleaning up {len(orphaned_gcs)} orphaned GCS files...{Colors.ENDC}")

        if not dry_run:
            storage_client = storage.Client()
            bucket = storage_client.bucket(config['gcs_bucket'])

            success_count = 0
            fail_count = 0

            for file in orphaned_gcs:
                try:
                    if not dry_run:
                        blob = bucket.blob(file['name'])
                        blob.delete()
                    print(f"  {Colors.OKGREEN}✓{Colors.ENDC} Deleted: {file['name']}")
                    success_count += 1
                except Exception as e:
                    print(f"  {Colors.FAIL}✗{Colors.ENDC} Failed: {file['name']} - {e}")
                    fail_count += 1

            print(f"\n{Colors.OKGREEN}Deleted {success_count} orphaned GCS files{Colors.ENDC}")
            if fail_count > 0:
                print(f"{Colors.FAIL}Failed to delete {fail_count} files{Colors.ENDC}")
        else:
            for file in orphaned_gcs:
                print(f"  Would delete: {file['name']}")

    # Clean up orphaned MongoDB records
    if orphaned_mongodb:
        print(f"\n{Colors.BOLD}Cleaning up {len(orphaned_mongodb)} orphaned MongoDB records...{Colors.ENDC}")

        if not dry_run:
            client = MongoClient(config['mongodb_uri'])
            db = client['BananaFate_database']
            collection = db['banana_images']

            ids_to_delete = [record['_id'] for record in orphaned_mongodb]
            result = collection.delete_many({'_id': {'$in': ids_to_delete}})

            print(f"{Colors.OKGREEN}Deleted {result.deleted_count} orphaned MongoDB records{Colors.ENDC}")
        else:
            for record in orphaned_mongodb:
                print(f"  Would delete: {record.get('batchId', 'Unknown')}/{record.get('bananaId', 'Unknown')} - {record.get('objectPath', 'Unknown')}")


def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Verify data integrity between GCS and MongoDB',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--cleanup',
        action='store_true',
        help='Clean up orphaned files and records (requires confirmation)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be cleaned up without actually deleting'
    )

    args = parser.parse_args()

    print(f"{Colors.HEADER}{Colors.BOLD}")
    print("BananaFate Data Integrity Verification")
    print(f"{'='*80}{Colors.ENDC}\n")

    # Load configuration
    config = load_config()

    # Retrieve data from both sources
    mongodb_records = get_mongodb_records(config)
    gcs_files = get_gcs_files(config)

    # Analyze integrity
    orphaned_gcs, orphaned_mongodb, stats = analyze_data_integrity(
        mongodb_records, gcs_files
    )

    # Print report
    print_report(orphaned_gcs, orphaned_mongodb, stats)

    # Cleanup if requested
    if args.cleanup or args.dry_run:
        if orphaned_gcs or orphaned_mongodb:
            if not args.dry_run:
                print(f"{Colors.WARNING}WARNING: This will permanently delete orphaned data!{Colors.ENDC}")
                response = input("Are you sure you want to proceed? (yes/no): ")
                if response.lower() != 'yes':
                    print("Cleanup cancelled.")
                    return

            cleanup_orphans(config, orphaned_gcs, orphaned_mongodb, args.dry_run)
            print(f"\n{Colors.OKGREEN}Cleanup completed!{Colors.ENDC}")
        else:
            print(f"{Colors.OKGREEN}No orphaned data to clean up.{Colors.ENDC}")
    else:
        if orphaned_gcs or orphaned_mongodb:
            print(f"{Colors.OKCYAN}Tip: Run with --dry-run to see what would be cleaned up{Colors.ENDC}")
            print(f"{Colors.OKCYAN}     Run with --cleanup to actually clean up orphaned data{Colors.ENDC}")


if __name__ == '__main__':
    main()
