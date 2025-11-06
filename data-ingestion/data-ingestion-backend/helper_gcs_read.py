"""
Google Cloud Storage utilities for reading images.
Handles signed URL generation for viewing images.
"""

from google.cloud import storage
from google import auth
from google.auth.transport import requests as auth_requests
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def generate_signed_read_url(object_path: str) -> dict:
    """
    Generate a signed URL for reading/viewing an image from GCS.

    This creates a temporary URL that allows the frontend to display
    images stored in GCS without making the bucket public.

    Args:
        object_path: Path within bucket (e.g., "batch_001/banana_042_1730819400.jpg")

    Returns:
        dict: {
            "signedUrl": str - Temporary read URL (valid for 1 hour),
            "objectPath": str - Path to the object in GCS,
            "expiresIn": int - Expiration time in seconds (3600)
        }

    Raises:
        Exception: If GCS credentials are missing or URL generation fails
    """
    bucket_name = os.getenv('GCS_BUCKET_NAME', 'bananafate-images')
    project_id = os.getenv('GCS_PROJECT_ID', 'banana-fate')

    # Get default credentials
    credentials, project = auth.default()

    # Refresh credentials to obtain access token
    credentials.refresh(auth_requests.Request())

    # Initialize GCS client with refreshed credentials
    storage_client = storage.Client(project=project_id or project, credentials=credentials)

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_path)

    # Generate signed URL with 1-hour expiration for viewing
    expiration = timedelta(hours=1)

    signing_params = {
        "version": "v4",
        "expiration": expiration,
        "method": "GET",  # Read-only access
        "service_account_email": credentials.service_account_email,
        "access_token": credentials.token
    }

    url = blob.generate_signed_url(**signing_params)

    return {
        "signedUrl": url,
        "objectPath": object_path,
        "expiresIn": 3600  # 1 hour in seconds
    }
