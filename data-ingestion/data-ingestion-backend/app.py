"""
BananaFate Data Ingestion API
FastAPI backend for banana image capture and metadata storage.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import os
from datetime import datetime
from dotenv import load_dotenv

from helper_mongodb import get_collection
from helper_gcs import generate_signed_upload_url

load_dotenv(override=True)

# Detect if running on Cloud Run (K_SERVICE environment variable is set by Cloud Run)
IS_PRODUCTION = os.getenv('K_SERVICE') is not None

app = FastAPI(
    title="BananaFate Data Ingestion API",
    version="1.0.0",
    description="Backend API for banana image capture and metadata storage",
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
    capturePerson: str = Field(..., description="Name of person capturing the image")
    captureTime: str = Field(..., description="ISO 8601 timestamp of capture")
    stage: str = Field(..., description="Ripeness stage (Under Ripe, Barely Ripe, Ripe, Very Ripe, Over Ripe, Death)")
    notes: Optional[str] = Field(default="", description="Optional observation notes")
    objectPath: str = Field(..., description="GCS object path returned from signed URL generation")

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint - API information"""
    return {
        "service": "BananaFate Data Ingestion API",
        "version": "1.0.0",
        "status": "operational",
        "environment": "production" if IS_PRODUCTION else "development"
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
async def create_signed_url(request: SignedUrlRequest):
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
async def save_metadata(request: MetadataRequest):
    """
    Save image metadata to MongoDB after successful GCS upload.

    This endpoint should be called after the image has been successfully
    uploaded to GCS using the signed URL. It stores the metadata and
    creates a link to the GCS object.

    Request Body:
        {
            "batchId": "batch_001",
            "bananaId": "banana_042",
            "capturePerson": "Nguyen Tran",
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
            "capturePerson": request.capturePerson,
            "captureTime": request.captureTime,
            "stage": request.stage,
            "notes": request.notes,
            "objectPath": request.objectPath,
            "gcsUrl": f"gs://bananafate-images/{request.objectPath}",
            "uploadedAt": datetime.utcnow().isoformat() + "Z"
        }

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
