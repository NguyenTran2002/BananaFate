"""
Google Cloud Storage utilities for BananaFate data ingestion.
Handles signed URL generation for direct browser uploads.
"""

from google.cloud import storage
from google import auth
from google.auth.transport import requests as auth_requests
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def generate_signed_upload_url(object_path: str, content_type: str = "image/jpeg") -> dict:
    """
    Generate a signed URL for direct browser upload to GCS.

    This enables the frontend to upload images directly to GCS without
    proxying through the backend, reducing latency and server load.

    Args:
        object_path: Path within bucket (e.g., "batch_001/banana_042_1730819400.jpg")
        content_type: MIME type for upload validation (default: image/jpeg)

    Returns:
        dict: {
            "signedUrl": str - Temporary upload URL (valid for 15 minutes),
            "objectPath": str - Path to the object in GCS,
            "expiresIn": int - Expiration time in seconds (900)
        }

    Raises:
        Exception: If GCS credentials are missing or URL generation fails
    """
    bucket_name = os.getenv('GCS_BUCKET_NAME', 'bananafate-images')
    project_id = os.getenv('GCS_PROJECT_ID', 'banana-fate')

    # Get default credentials (works automatically in Cloud Run and local dev with ADC)
    # In Cloud Run: Uses the service account attached to the Cloud Run service
    # In local dev: Uses Application Default Credentials (gcloud auth application-default login)
    credentials, project = auth.default()

    # CRITICAL: Refresh credentials to obtain access token
    # Cloud Run service accounts use temporary tokens, not key files
    # This call fetches the token from the metadata server
    credentials.refresh(auth_requests.Request())

    # Initialize GCS client with refreshed credentials
    storage_client = storage.Client(project=project_id or project, credentials=credentials)

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_path)

    # Generate signed URL with 15-minute expiration
    expiration = timedelta(minutes=15)

    # Build signing parameters
    # For Cloud Run, we MUST pass both service_account_email AND access_token
    # The access_token is used to call the IAM signBlob API for signing
    signing_params = {
        "version": "v4",
        "expiration": expiration,
        "method": "PUT",
        "content_type": content_type,
        "service_account_email": credentials.service_account_email,
        "access_token": credentials.token
    }

    url = blob.generate_signed_url(**signing_params)

    return {
        "signedUrl": url,
        "objectPath": object_path,
        "expiresIn": 900  # 15 minutes in seconds
    }
