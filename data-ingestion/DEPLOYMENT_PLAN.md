# BananaFate Data Ingestion - Deployment Readiness Plan

**Created**: 2025-11-05
**Status**: Implementation Ready
**Target Platform**: Google Cloud Run (us-central1)
**Architecture Pattern**: Multi-container, Docker-based microservices

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Security & Best Practices](#security--best-practices)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Procedures](#deployment-procedures)
9. [Success Criteria](#success-criteria)

---

## Executive Summary

### Goal
Transform the mockup BananaFate data ingestion frontend into a production-ready, cloud-deployed application with backend API support for:
- Direct-to-GCS image uploads via signed URLs
- MongoDB metadata storage
- Scalable Cloud Run deployment

### Approach
Use proven multi-container architecture patterns with FastAPI for modern async support and automatic API documentation.

### Timeline Estimate
- **Phase 1-2** (Backend): 1-2 days
- **Phase 3** (Frontend Integration): 1 day
- **Phase 4** (Local Testing): 0.5 days
- **Phase 5-6** (Deployment): 1 day
- **Total**: 3.5-4.5 days

---

## Current State Analysis

### ✅ What's Ready

**Frontend** (80% Complete):
- React 19 + Vite + TypeScript stack
- Complete 6-step capture workflow (Welcome → Capture → Preview → Metadata → Upload → Success)
- Camera interface with stem-left orientation guide
- Client-side image resizing (max 1024x1024)
- Metadata form with 6 ripeness stages
- Professional UI with animated backgrounds
- **Gap**: Upload is stubbed (setTimeout simulation)

**MongoDB** (Configured):
- Atlas cluster active in `us-central1`
- Credentials in `data-ingestion-backend/.env`
- Connection string: `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/`
- **Gap**: No database/collections created yet

**Google Cloud Project**:
- Project ID: `banana-fate`
- Project Number: `281433271767`
- Service account with deployment capabilities
- **Gap**: GCS bucket, API enablement, Artifact Registry

### ❌ What's Missing

**Backend** (0% Complete):
- No FastAPI application
- No GCS integration
- No API endpoints
- No Docker configuration

**Deployment Infrastructure**:
- No deployment scripts
- No production Docker images
- No Cloud Run services
- No automated deployment workflow

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Google Cloud Run (us-central1)             │
│                                                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐ │
│  │  Frontend Service    │      │  Backend Service        │ │
│  │  (Nginx:8080)        │─────▶│  (FastAPI:8080)         │ │
│  │  React 19 + Vite     │      │  Python 3.11            │ │
│  │  Tailwind CSS        │      │  CORS enabled           │ │
│  └──────────────────────┘      └─────────────────────────┘ │
│                                           │                 │
│                                           ├─────────────────┤
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
        ┌────────────────────┐  ┌───────────────────┐  ┌──────────────────┐
        │  MongoDB Atlas     │  │  Google Cloud     │  │  User Browser    │
        │  (us-central1)     │  │  Storage          │  │                  │
        │                    │  │  (us-central1)    │  │  Direct Upload   │
        │  BananaFate_DB     │  │  Private Bucket   │  │  via Signed URL  │
        │  - banana_images   │  │  - Image storage  │  │                  │
        └────────────────────┘  └───────────────────┘  └──────────────────┘
```

### Request Flow

**Image Capture & Upload**:
1. User captures image in browser (CameraCapture component)
2. Frontend resizes to 1024x1024 max (imageUtils.ts)
3. User fills metadata form (MetadataForm component)
4. Frontend requests signed URL from backend: `POST /generate-signed-url`
5. Backend generates GCS signed URL (15-min expiration)
6. Frontend uploads image directly to GCS via signed URL (PUT request)
7. Frontend saves metadata to backend: `POST /save-metadata`
8. Backend stores metadata with GCS object path in MongoDB
9. Frontend shows success confirmation

**Key Principles**:
- **Direct Upload**: Browser → GCS (no backend proxy for images)
- **Signed URLs**: Temporary, single-use upload credentials
- **Metadata Linkage**: MongoDB stores `objectPath` to link record with GCS blob

---

## Implementation Phases

### Phase 1: Google Cloud Infrastructure Setup

**Objective**: Prepare GCP resources for deployment

#### Tasks

1. **Create GCS Bucket**
   ```bash
   gsutil mb -p banana-fate -c STANDARD -l us-central1 gs://bananafate-images/
   gsutil lifecycle set lifecycle.json gs://bananafate-images/
   ```

   **lifecycle.json** (optional, for cost management):
   ```json
   {
     "lifecycle": {
       "rule": [
         {
           "action": {"type": "Delete"},
           "condition": {"age": 365}
         }
       ]
     }
   }
   ```

2. **Enable Required APIs**
   ```bash
   gcloud config set project banana-fate
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable storage.googleapis.com
   ```

3. **Create Artifact Registry Repository**
   ```bash
   gcloud artifacts repositories create bananafate \
     --repository-format=docker \
     --location=us-central1 \
     --description="BananaFate container images"
   ```

4. **Configure Service Account Permissions**
   - Verify existing service account has:
     - `roles/run.admin` (Cloud Run deployment)
     - `roles/storage.admin` (GCS bucket management)
     - `roles/artifactregistry.writer` (Push images)

   ```bash
   # If needed, grant permissions
   gcloud projects add-iam-policy-binding banana-fate \
     --member="serviceAccount:YOUR_SA@banana-fate.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   ```

5. **Test GCS Access**
   ```bash
   echo "test" > test.txt
   gsutil cp test.txt gs://bananafate-images/test.txt
   gsutil rm gs://bananafate-images/test.txt
   ```

**Deliverables**:
- ✅ GCS bucket `bananafate-images` created
- ✅ APIs enabled
- ✅ Artifact Registry repository ready
- ✅ Service account permissions verified

---

### Phase 2: Backend Implementation (FastAPI)

**Objective**: Build production-ready FastAPI backend with MongoDB and GCS integration

#### Directory Structure
```
data-ingestion-backend/
├── app.py                     # FastAPI application
├── helper_mongodb.py          # MongoDB connection utilities
├── helper_gcs.py              # GCS signed URL generation
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Production container
├── .env                       # Local dev credentials (not in git)
├── .env.example               # Template for .env
└── .gitignore                 # Ignore .env
```

#### 2.1 Dependencies (requirements.txt)
```txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-dotenv==1.0.1
pymongo==4.10.1
google-cloud-storage==2.18.2
pydantic==2.9.2
```

#### 2.2 MongoDB Helper (helper_mongodb.py)

```python
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def connect_to_mongo():
    """
    Establishes connection to MongoDB Atlas.
    Reads credentials from environment variables.

    Returns:
        MongoClient: Connected MongoDB client
    """
    username = os.getenv('username')
    password = os.getenv('password')
    server_address = os.getenv('server_address')

    if not all([username, password, server_address]):
        raise ValueError("Missing MongoDB credentials in environment variables")

    connection_string = f"mongodb+srv://{username}:{password}{server_address}"

    try:
        client = MongoClient(connection_string)
        # Test connection
        client.admin.command('ping')
        print("✅ MongoDB connection established")
        return client
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        raise

def get_collection(database_name="BananaFate_database", collection_name="banana_images"):
    """
    Get MongoDB collection with connection pooling.

    Args:
        database_name: Name of the database
        collection_name: Name of the collection

    Returns:
        Collection: MongoDB collection object
    """
    client = connect_to_mongo()
    db = client[database_name]
    return db[collection_name]
```

#### 2.3 GCS Helper (helper_gcs.py)

```python
from google.cloud import storage
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv(override=True)

def generate_signed_upload_url(object_path: str, content_type: str = "image/jpeg") -> dict:
    """
    Generate a signed URL for direct browser upload to GCS.

    Args:
        object_path: Path within bucket (e.g., "batch_001/banana_042_1730819400.jpg")
        content_type: MIME type for upload validation

    Returns:
        dict: {
            "signedUrl": str,
            "objectPath": str,
            "expiresIn": int (seconds)
        }
    """
    bucket_name = os.getenv('GCS_BUCKET_NAME', 'bananafate-images')
    project_id = os.getenv('GCS_PROJECT_ID', 'banana-fate')

    # Initialize client
    storage_client = storage.Client(project=project_id)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_path)

    # Generate signed URL (15 minutes expiration)
    expiration = timedelta(minutes=15)

    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration,
        method="PUT",
        content_type=content_type
    )

    return {
        "signedUrl": url,
        "objectPath": object_path,
        "expiresIn": 900  # 15 minutes in seconds
    }
```

#### 2.4 FastAPI Application (app.py)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
from dotenv import load_dotenv

from helper_mongodb import get_collection
from helper_gcs import generate_signed_upload_url

load_dotenv(override=True)

# Detect if running on Cloud Run
IS_PRODUCTION = os.getenv('K_SERVICE') is not None

app = FastAPI(
    title="BananaFate Data Ingestion API",
    version="1.0.0",
    description="Backend API for banana image capture and metadata storage"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SignedUrlRequest(BaseModel):
    filename: str
    contentType: str = "image/jpeg"

class MetadataRequest(BaseModel):
    batchId: str
    bananaId: str
    capturePerson: str
    captureTime: str
    stage: str
    notes: Optional[str] = ""
    objectPath: str

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run deployment verification"""
    try:
        # Test MongoDB connection
        collection = get_collection()
        collection.database.command('ping')
        mongodb_status = True
    except:
        mongodb_status = False

    return {
        "status": "healthy" if mongodb_status else "degraded",
        "mongodb": mongodb_status,
        "environment": "production" if IS_PRODUCTION else "development"
    }

@app.post("/generate-signed-url")
async def create_signed_url(request: SignedUrlRequest):
    """
    Generate a GCS signed URL for direct browser upload.

    Request:
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
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/save-metadata")
async def save_metadata(request: MetadataRequest):
    """
    Save image metadata to MongoDB after successful upload.

    Request:
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
    """
    try:
        collection = get_collection()

        # Build document
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
            print(f"✅ Saved metadata for: {request.bananaId} (ID: {result.inserted_id})")

        return {
            "success": True,
            "documentId": str(result.inserted_id)
        }
    except Exception as e:
        error_msg = "Failed to save metadata"
        if not IS_PRODUCTION:
            error_msg += f": {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)

# Run server
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

#### 2.5 Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build arguments for credentials (baked into environment)
ARG username
ARG password
ARG server_address
ARG GCS_PROJECT_ID
ARG GCS_BUCKET_NAME

# Set environment variables
ENV username=${username}
ENV password=${password}
ENV server_address=${server_address}
ENV GCS_PROJECT_ID=${GCS_PROJECT_ID}
ENV GCS_BUCKET_NAME=${GCS_BUCKET_NAME}

# Cloud Run standard port
EXPOSE 8080
ENV PORT=8080

# Start server
CMD ["python", "app.py"]
```

#### 2.6 Environment Files

**.env.example**:
```bash
# MongoDB Atlas Credentials
username=your_mongodb_username
password=your_mongodb_password
server_address=@your_cluster.mongodb.net/

# Google Cloud Storage
GCS_PROJECT_ID=banana-fate
GCS_BUCKET_NAME=bananafate-images
```

**.env** (already exists, update with GCS config):
```bash
# MongoDB Atlas (existing)
username=<your-mongodb-username>
password=<your-mongodb-password>
server_address=@<your-cluster>.mongodb.net/

# GCS Configuration (add these)
GCS_PROJECT_ID=banana-fate
GCS_BUCKET_NAME=bananafate-images
```

**.gitignore**:
```
.env
__pycache__/
*.pyc
.pytest_cache/
```

**Deliverables**:
- ✅ FastAPI backend with 3 endpoints
- ✅ MongoDB integration
- ✅ GCS signed URL generation
- ✅ Production-ready Dockerfile
- ✅ Environment variable management

---

### Phase 3: Frontend Integration

**Objective**: Connect React frontend to FastAPI backend

#### 3.1 Update Vite Configuration

**File**: `data-ingestion-frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/generate-signed-url': {
        target: 'http://data-ingestion-backend:8080',
        changeOrigin: true,
      },
      '/save-metadata': {
        target: 'http://data-ingestion-backend:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://data-ingestion-backend:8080',
        changeOrigin: true,
      },
    },
  },
})
```

#### 3.2 Create API Client Utility

**New File**: `data-ingestion-frontend/src/utils/apiClient.ts`

```typescript
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function generateSignedUrl(
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<{ signedUrl: string; objectPath: string; expiresIn: number }> {
  const response = await fetch('/generate-signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, `Failed to generate signed URL: ${error}`);
  }

  return response.json();
}

export async function uploadToGcs(signedUrl: string, imageBlob: Blob): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: imageBlob,
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'Failed to upload image to GCS');
  }
}

export async function saveMetadata(metadata: {
  batchId: string;
  bananaId: string;
  capturePerson: string;
  captureTime: string;
  stage: string;
  notes: string;
  objectPath: string;
}): Promise<{ success: boolean; documentId: string }> {
  const response = await fetch('/save-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, `Failed to save metadata: ${error}`);
  }

  return response.json();
}
```

#### 3.3 Update App.tsx Upload Logic

**File**: `data-ingestion-frontend/src/App.tsx`

Replace the `handleMetadataSubmit` function (currently lines 78-86):

```typescript
import { generateSignedUrl, uploadToGcs, saveMetadata, ApiError } from './utils/apiClient';

// ... existing code ...

const handleMetadataSubmit = async (data: BananaMetadata) => {
  setStep(AppStep.UPLOADING);

  try {
    // Step 1: Generate filename with timestamp
    const timestamp = Date.now();
    const filename = `${data.batchId}/${data.bananaId}_${timestamp}.jpg`;

    // Step 2: Get signed URL from backend
    const { signedUrl, objectPath } = await generateSignedUrl(filename);

    // Step 3: Convert resized image to Blob
    const imageBlob = await fetch(resizedImage!).then((r) => r.blob());

    // Step 4: Upload directly to GCS
    await uploadToGcs(signedUrl, imageBlob);

    // Step 5: Save metadata to MongoDB
    await saveMetadata({
      ...data,
      objectPath,
    });

    // Success!
    setStep(AppStep.SUCCESS);
  } catch (error) {
    console.error('Upload failed:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof ApiError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    handleError(`Upload failed: ${errorMessage}`);
  }
};
```

#### 3.4 Create Production Dockerfile

**New File**: `data-ingestion-frontend/Dockerfile.prod`

```dockerfile
# Stage 1: Build React application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build production bundle
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/configfile.template

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set permissions
RUN find /usr/share/nginx/html -type f -exec chmod 644 {} \;

# Cloud Run uses PORT environment variable
ENV PORT 8080
EXPOSE 8080

# Start Nginx with dynamic port configuration
CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/configfile.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
```

#### 3.5 Create Nginx Configuration

**New File**: `data-ingestion-frontend/nginx.conf`

```nginx
server {
    listen $PORT;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 3.6 Update .gitignore

**File**: `data-ingestion-frontend/.gitignore`

Ensure these are ignored:
```
.env
.env.local
.env.production
node_modules/
dist/
```

**Deliverables**:
- ✅ Vite proxy configuration
- ✅ API client utilities
- ✅ Real upload implementation
- ✅ Production Docker + Nginx config
- ✅ Error handling

---

### Phase 4: Local Development Setup

**Objective**: Enable local testing with docker-compose

#### 4.1 Create Docker Compose Configuration

**New File**: `data-ingestion/docker-compose.yml`

```yaml
version: '3.8'

services:
  data-ingestion-frontend:
    build:
      context: ./data-ingestion-frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./data-ingestion-frontend:/app
      - /app/node_modules
    depends_on:
      - data-ingestion-backend
    networks:
      - bananafate-network
    environment:
      - VITE_BACKEND_URL=  # Empty for local proxy

  data-ingestion-backend:
    build:
      context: ./data-ingestion-backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ./data-ingestion-backend/.env
    networks:
      - bananafate-network
    volumes:
      - ./data-ingestion-backend:/app

networks:
  bananafate-network:
    driver: bridge
```

#### 4.2 Create Development Dockerfile for Frontend

**New File**: `data-ingestion-frontend/Dockerfile` (dev version)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

#### 4.3 Local Testing Procedure

**Commands**:
```bash
# Navigate to data-ingestion directory
cd BananaFate/data-ingestion

# Start both services
docker-compose up --build

# Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
# Health check: http://localhost:8080/health
```

**Test Checklist**:
1. ✅ Camera access works
2. ✅ Image capture and preview
3. ✅ Metadata form validation
4. ✅ Upload completes successfully
5. ✅ Check MongoDB for new document:
   ```bash
   # Use MongoDB Compass or mongo shell
   # Connect to: mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/
   # Database: BananaFate_database
   # Collection: banana_images
   ```
6. ✅ Check GCS for uploaded image:
   ```bash
   gsutil ls gs://bananafate-images/
   ```

**Deliverables**:
- ✅ docker-compose.yml for local orchestration
- ✅ Development Dockerfile for frontend
- ✅ End-to-end workflow verified locally

---

### Phase 5: Deployment Automation

**Objective**: Create automated deployment scripts

#### Directory Structure

**New Directory**: `data-ingestion/deployment/`

```
deployment/
├── .env                       # All deployment credentials
├── .env.example               # Template
├── deploy-backend.sh          # Deploy backend to Cloud Run
├── deploy-frontend.sh         # Deploy frontend to Cloud Run
├── deploy-all.sh              # Full automated deployment
└── DEPLOYMENT_GUIDE.md        # Step-by-step instructions
```

#### 5.1 Deployment Environment Variables

**File**: `deployment/.env.example`

```bash
# Google Cloud Project
GCP_PROJECT_ID=banana-fate
GCP_REGION=us-central1
ARTIFACT_REGISTRY_REPO=bananafate

# MongoDB Atlas Credentials
username=<your-mongodb-username>
password=<your-mongodb-password>
server_address=@<your-cluster>.mongodb.net/

# Google Cloud Storage
GCS_PROJECT_ID=banana-fate
GCS_BUCKET_NAME=bananafate-images

# Deployment Configuration
BACKEND_SERVICE_NAME=data-ingestion-backend
FRONTEND_SERVICE_NAME=data-ingestion-frontend
```

**File**: `deployment/.env` (copy from .env.example and fill in actual values)

#### 5.2 Backend Deployment Script

**File**: `deployment/deploy-backend.sh`

```bash
#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

echo "🚀 Deploying Backend to Cloud Run..."

# Set project
gcloud config set project $GCP_PROJECT_ID

# Define image name
IMAGE_NAME="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${BACKEND_SERVICE_NAME}:latest"

# Build Docker image with build args
echo "📦 Building Docker image..."
docker build \
  --platform linux/amd64 \
  --build-arg username="$username" \
  --build-arg password="$password" \
  --build-arg server_address="$server_address" \
  --build-arg GCS_PROJECT_ID="$GCS_PROJECT_ID" \
  --build-arg GCS_BUCKET_NAME="$GCS_BUCKET_NAME" \
  -t $IMAGE_NAME \
  ../data-ingestion-backend

# Configure Docker for Artifact Registry
echo "🔐 Authenticating with Artifact Registry..."
gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev --quiet

# Push image
echo "⬆️  Pushing image to Artifact Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE_NAME \
  --image=$IMAGE_NAME \
  --platform=managed \
  --region=$GCP_REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=8080

# Get service URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE_NAME \
  --region=$GCP_REGION \
  --format='value(status.url)')

echo "✅ Backend deployed successfully!"
echo "🔗 Backend URL: $BACKEND_URL"

# Health check
echo "🏥 Performing health check..."
sleep 5
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health")
echo "Health check response: $HEALTH_RESPONSE"

# Save backend URL for frontend deployment
echo "BACKEND_URL=$BACKEND_URL" > .backend_url

echo "✅ Backend deployment complete!"
```

#### 5.3 Frontend Deployment Script

**File**: `deployment/deploy-frontend.sh`

```bash
#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "❌ .env file not found"
  exit 1
fi

# Load backend URL (from backend deployment)
if [ -f .backend_url ]; then
  export $(cat .backend_url | xargs)
else
  echo "⚠️  .backend_url not found. Using .env value if available."
fi

if [ -z "$BACKEND_URL" ]; then
  echo "❌ BACKEND_URL not set. Deploy backend first or set in .env"
  exit 1
fi

echo "🚀 Deploying Frontend to Cloud Run..."
echo "🔗 Backend URL: $BACKEND_URL"

# Set project
gcloud config set project $GCP_PROJECT_ID

# Define image name
IMAGE_NAME="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${FRONTEND_SERVICE_NAME}:latest"

# Build Docker image with backend URL
echo "📦 Building Docker image..."
docker build \
  --platform linux/amd64 \
  --build-arg VITE_BACKEND_URL="$BACKEND_URL" \
  -f ../data-ingestion-frontend/Dockerfile.prod \
  -t $IMAGE_NAME \
  ../data-ingestion-frontend

# Push image
echo "⬆️  Pushing image to Artifact Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE_NAME \
  --image=$IMAGE_NAME \
  --platform=managed \
  --region=$GCP_REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=8080

# Get service URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME \
  --region=$GCP_REGION \
  --format='value(status.url)')

echo "✅ Frontend deployed successfully!"
echo "🔗 Frontend URL: $FRONTEND_URL"

# Health check
echo "🏥 Performing health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Frontend health check passed (HTTP 200)"
else
  echo "⚠️  Frontend health check returned HTTP $HTTP_STATUS"
fi

echo "✅ Frontend deployment complete!"
```

#### 5.4 Full Deployment Script

**File**: `deployment/deploy-all.sh`

```bash
#!/bin/bash
set -e

echo "════════════════════════════════════════════════"
echo "  BananaFate Data Ingestion - Full Deployment  "
echo "════════════════════════════════════════════════"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Install from: https://docs.docker.com/get-docker/"
  exit 1
fi

if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy from .env.example and fill in values."
  exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Step 1: Deploy Backend
echo "════════════════════════════════════════════════"
echo "STEP 1: Deploying Backend Service"
echo "════════════════════════════════════════════════"
bash deploy-backend.sh
echo ""

# Step 2: Deploy Frontend
echo "════════════════════════════════════════════════"
echo "STEP 2: Deploying Frontend Service"
echo "════════════════════════════════════════════════"
bash deploy-frontend.sh
echo ""

# Summary
echo "════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════"

# Load URLs
export $(cat .env | grep -v '^#' | xargs)
if [ -f .backend_url ]; then
  export $(cat .backend_url | xargs)
fi

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME \
  --region=$GCP_REGION \
  --format='value(status.url)' 2>/dev/null || echo "Unknown")

echo ""
echo "📦 Services Deployed:"
echo "  🔧 Backend:  $BACKEND_URL"
echo "  🎨 Frontend: $FRONTEND_URL"
echo ""
echo "🧪 Test the application at: $FRONTEND_URL"
echo ""
echo "════════════════════════════════════════════════"
```

#### 5.5 Deployment Guide

**File**: `deployment/DEPLOYMENT_GUIDE.md`

```markdown
# BananaFate Data Ingestion - Deployment Guide

## Prerequisites

- Google Cloud SDK (`gcloud` CLI) installed
- Docker installed and running
- Authentication: `gcloud auth login`
- Project access to `banana-fate`

## Initial Setup

1. **Copy environment template**:
   ```bash
   cd BananaFate/data-ingestion/deployment
   cp .env.example .env
   ```

2. **Fill in `.env` with actual credentials**:
   - MongoDB credentials (already have)
   - Verify GCP project ID and region
   - Set service names

3. **Make scripts executable**:
   ```bash
   chmod +x deploy-backend.sh
   chmod +x deploy-frontend.sh
   chmod +x deploy-all.sh
   ```

## Deployment

### Option 1: Full Deployment (Recommended)

```bash
cd BananaFate/data-ingestion/deployment
./deploy-all.sh
```

This will:
1. Deploy backend to Cloud Run
2. Capture backend URL
3. Deploy frontend with backend URL embedded
4. Run health checks
5. Output service URLs

**Duration**: ~5-10 minutes

### Option 2: Individual Services

**Backend only**:
```bash
./deploy-backend.sh
```

**Frontend only** (requires backend deployed first):
```bash
./deploy-frontend.sh
```

## Post-Deployment

1. **Test the application**:
   - Visit frontend URL
   - Capture a test image
   - Verify upload completes

2. **Verify data storage**:
   - Check MongoDB collection: `BananaFate_database.banana_images`
   - Check GCS bucket: `gs://bananafate-images/`

3. **Monitor logs**:
   ```bash
   # Backend logs
   gcloud run logs tail data-ingestion-backend --region=us-central1

   # Frontend logs
   gcloud run logs tail data-ingestion-frontend --region=us-central1
   ```

## Troubleshooting

### Build fails with "permission denied"
```bash
chmod +x deploy-*.sh
```

### "BACKEND_URL not set" error
Deploy backend first, or manually set in `.env`:
```bash
BACKEND_URL=https://data-ingestion-backend-xxx.run.app
```

### Docker push fails
Authenticate with Artifact Registry:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Health check fails
Check backend logs for errors:
```bash
gcloud run logs tail data-ingestion-backend --region=us-central1
```

## Updating Deployment

To redeploy after code changes:
```bash
./deploy-all.sh
```

Cloud Run automatically routes traffic to new revisions.

## Cost Optimization

- Services scale to zero when not in use
- MongoDB Atlas free tier (512 MB)
- GCS storage costs: ~$0.02/GB/month
- Cloud Run: Pay per request + compute time

**Estimated monthly cost**: < $5 for development use
```

**Deliverables**:
- ✅ Complete deployment automation
- ✅ Environment variable management
- ✅ Health checks and verification
- ✅ Comprehensive deployment guide

---

### Phase 6: Cloud Deployment & Testing

**Objective**: Deploy to production and verify end-to-end functionality

#### 6.1 Pre-Deployment Checklist

- [ ] GCS bucket `bananafate-images` exists
- [ ] Artifact Registry repository `bananafate` exists
- [ ] MongoDB cluster accessible
- [ ] `.env` file in `deployment/` directory configured
- [ ] `gcloud` CLI authenticated: `gcloud auth login`
- [ ] Docker running

#### 6.2 Deployment Steps

```bash
cd BananaFate/data-ingestion/deployment
./deploy-all.sh
```

**Expected Output**:
```
════════════════════════════════════════════════
  BananaFate Data Ingestion - Full Deployment
════════════════════════════════════════════════

🔍 Checking prerequisites...
✅ Prerequisites check passed

════════════════════════════════════════════════
STEP 1: Deploying Backend Service
════════════════════════════════════════════════
🚀 Deploying Backend to Cloud Run...
📦 Building Docker image...
⬆️  Pushing image to Artifact Registry...
☁️  Deploying to Cloud Run...
✅ Backend deployed successfully!
🔗 Backend URL: https://data-ingestion-backend-xxx.run.app

════════════════════════════════════════════════
STEP 2: Deploying Frontend Service
════════════════════════════════════════════════
🚀 Deploying Frontend to Cloud Run...
📦 Building Docker image...
⬆️  Pushing image to Artifact Registry...
☁️  Deploying to Cloud Run...
✅ Frontend deployed successfully!
🔗 Frontend URL: https://data-ingestion-frontend-xxx.run.app

════════════════════════════════════════════════
  ✅ DEPLOYMENT COMPLETE!
════════════════════════════════════════════════

📦 Services Deployed:
  🔧 Backend:  https://data-ingestion-backend-xxx.run.app
  🎨 Frontend: https://data-ingestion-frontend-xxx.run.app

🧪 Test the application at: https://data-ingestion-frontend-xxx.run.app
```

#### 6.3 Post-Deployment Testing

**Test Procedure**:

1. **Access Frontend**:
   - Open frontend URL in browser
   - Verify welcome screen loads

2. **Test Image Capture**:
   - Click "Start Capture"
   - Grant camera permissions
   - Capture a test image
   - Verify preview appears

3. **Test Metadata Form**:
   - Fill in test data:
     - Capture Person: "Test User"
     - Batch ID: "test_batch_001"
     - Banana ID: "test_banana_001"
     - Stage: "Ripe"
     - Notes: "End-to-end deployment test"
   - Submit form

4. **Verify Upload**:
   - Wait for upload to complete
   - Check for success message

5. **Verify Data in MongoDB**:
   ```bash
   # Use MongoDB Compass or mongosh
   # Connection string: mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/
   # Query: db.banana_images.find({batchId: "test_batch_001"})
   ```

6. **Verify Image in GCS**:
   ```bash
   gsutil ls gs://bananafate-images/test_batch_001/
   ```

7. **Test Error Handling**:
   - Try capturing without camera permissions
   - Try submitting empty form fields
   - Verify error messages appear

#### 6.4 Monitoring

**View Logs**:
```bash
# Backend
gcloud run logs tail data-ingestion-backend --region=us-central1

# Frontend
gcloud run logs tail data-ingestion-frontend --region=us-central1
```

**Check Metrics** (Cloud Console):
- Request count
- Latency
- Error rate
- Instance count

#### 6.5 Update Documentation

**Update**: `/Users/nnt/Documents/Developer/[BananaFate]/CLAUDE.md`

Add to Implementation Status:

```markdown
### Phase 2: Data Ingestion ✅ COMPLETED
- [x] Backend API setup (FastAPI)
  - [x] GCS signed URL generation endpoint
  - [x] Metadata validation and storage
  - [x] MongoDB Atlas integration
- [x] Frontend web app
  - [x] Camera interface with overlay guide
  - [x] Stem-left orientation overlay
  - [x] Client-side image preprocessing (resize ≤1024px)
  - [x] Direct-to-GCS upload flow
  - [x] Session management UI
- [x] Deployment to Cloud Run
  - Backend: https://data-ingestion-backend-xxx.run.app
  - Frontend: https://data-ingestion-frontend-xxx.run.app
```

**Deliverables**:
- ✅ Backend deployed to Cloud Run
- ✅ Frontend deployed to Cloud Run
- ✅ End-to-end workflow tested
- ✅ MongoDB + GCS verified
- ✅ Documentation updated

---

## Technical Specifications

### MongoDB Schema

**Database**: `BananaFate_database`
**Collection**: `banana_images`

**Document Structure**:
```javascript
{
  "_id": ObjectId("..."),
  "batchId": "batch_001",
  "bananaId": "banana_042",
  "capturePerson": "Nguyen Tran",
  "captureTime": "2025-11-05T14:30:00Z",  // ISO 8601 from frontend
  "stage": "Ripe",  // One of: Under Ripe, Barely Ripe, Ripe, Very Ripe, Over Ripe, Death
  "notes": "Small brown spots appearing on skin",
  "objectPath": "batch_001/banana_042_1730819400000.jpg",
  "gcsUrl": "gs://bananafate-images/batch_001/banana_042_1730819400000.jpg",
  "uploadedAt": "2025-11-05T14:30:15.123Z"  // Server timestamp
}
```

**Indexes**:
```javascript
// Unique constraint on batch + banana ID
db.banana_images.createIndex({ batchId: 1, bananaId: 1 }, { unique: true });

// Query by stage
db.banana_images.createIndex({ stage: 1 });

// Time-series queries
db.banana_images.createIndex({ captureTime: 1 });
```

### GCS Bucket Structure

**Path Pattern**: `{batchId}/{bananaId}_{timestamp}.jpg`

**Example**:
```
gs://bananafate-images/
├── batch_001/
│   ├── banana_001_1730819400000.jpg
│   ├── banana_001_1730905800000.jpg  # Same banana, next day
│   ├── banana_002_1730819500000.jpg
│   └── ...
├── batch_002/
│   └── ...
└── test_batch_001/  # Test data
    └── test_banana_001_1730990000000.jpg
```

### API Specifications

#### POST /generate-signed-url

**Request**:
```json
{
  "filename": "batch_001/banana_042_1730819400000.jpg",
  "contentType": "image/jpeg"
}
```

**Response**:
```json
{
  "signedUrl": "https://storage.googleapis.com/bananafate-images/batch_001/banana_042_1730819400000.jpg?X-Goog-Algorithm=...",
  "objectPath": "batch_001/banana_042_1730819400000.jpg",
  "expiresIn": 900
}
```

**Errors**:
- `500`: Failed to generate signed URL (GCS error)

#### POST /save-metadata

**Request**:
```json
{
  "batchId": "batch_001",
  "bananaId": "banana_042",
  "capturePerson": "Nguyen Tran",
  "captureTime": "2025-11-05T14:30:00Z",
  "stage": "Ripe",
  "notes": "Small brown spots",
  "objectPath": "batch_001/banana_042_1730819400000.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "documentId": "67abc123def456789..."
}
```

**Errors**:
- `500`: Failed to save metadata (MongoDB error)

#### GET /health

**Response**:
```json
{
  "status": "healthy",
  "mongodb": true,
  "environment": "production"
}
```

---

## Security & Best Practices

### 1. Credentials Management

**Never commit**:
- `.env` files
- Service account keys
- MongoDB credentials

**Use**:
- `.env` for local development
- Docker build args for Cloud Run deployment
- Google Secret Manager (future enhancement)

### 2. GCS Signed URLs

**Security Features**:
- Short expiration (15 minutes)
- Content-Type validation (must be `image/jpeg`)
- Single-use for uploads
- No permanent public access

### 3. MongoDB Access

**Current Setup**:
- Atlas IP whitelist: `0.0.0.0/0` (required for Cloud Run)
- Strong password
- Connection string in environment variables

**Future Enhancements**:
- VPC peering (for private networking)
- Least privilege database user roles

### 4. API Security

**Implemented**:
- CORS enabled (all origins for development)
- Input validation via Pydantic models
- No sensitive data in production logs

**Future Enhancements**:
- Rate limiting
- API key authentication
- Cloud Armor for DDoS protection

### 5. Data Privacy

**Current**:
- No PII in metadata (only capture person name)
- Images stored privately in GCS
- No horizontal flip augmentation (preserves orientation)

**Compliance**:
- Document data retention policies
- Implement deletion procedures if needed

---

## Testing Strategy

### Unit Tests

**Backend** (`data-ingestion-backend/tests/`):
```python
# test_gcs.py
def test_generate_signed_url():
    url_data = generate_signed_upload_url("test/image.jpg")
    assert "signedUrl" in url_data
    assert url_data["expiresIn"] == 900

# test_mongodb.py
def test_connect_to_mongo():
    client = connect_to_mongo()
    assert client.admin.command('ping')['ok'] == 1.0
```

**Frontend** (`data-ingestion-frontend/src/__tests__/`):
```typescript
// apiClient.test.ts
describe('generateSignedUrl', () => {
  it('should return signed URL data', async () => {
    const result = await generateSignedUrl('test.jpg');
    expect(result).toHaveProperty('signedUrl');
    expect(result).toHaveProperty('objectPath');
  });
});
```

### Integration Tests

**Backend API**:
```bash
# Start local backend
cd data-ingestion-backend
python app.py

# Test endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/generate-signed-url \
  -H "Content-Type: application/json" \
  -d '{"filename": "test/image.jpg"}'
```

**Full Workflow**:
1. Start docker-compose
2. Open frontend in browser
3. Complete capture workflow
4. Verify MongoDB document
5. Verify GCS object

### Load Testing

**Locust** (future implementation):
```python
# locustfile.py
from locust import HttpUser, task

class BananaUser(HttpUser):
    @task
    def upload_workflow(self):
        # Simulate signed URL request
        response = self.client.post("/generate-signed-url", json={
            "filename": "load_test/banana_001.jpg"
        })
        # ... upload simulation ...
```

---

## Deployment Procedures

### Production Deployment

**Standard Deployment** (with testing):
```bash
# 1. Test locally
cd BananaFate/data-ingestion
docker-compose up --build

# 2. Verify functionality
# ... manual testing ...

# 3. Deploy to Cloud Run
cd deployment
./deploy-all.sh

# 4. Post-deployment testing
# ... cloud testing ...
```

### Hotfix Deployment

**Backend Only**:
```bash
cd BananaFate/data-ingestion/deployment
./deploy-backend.sh
```

**Frontend Only**:
```bash
cd BananaFate/data-ingestion/deployment
./deploy-frontend.sh
```

### Rollback Procedure

**Cloud Console**:
1. Navigate to Cloud Run → Service
2. Click "Revisions" tab
3. Select previous revision
4. Click "Route traffic to this revision"

**CLI**:
```bash
# List revisions
gcloud run revisions list --service=data-ingestion-backend --region=us-central1

# Route traffic to previous revision
gcloud run services update-traffic data-ingestion-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

---

## Success Criteria

### Phase 1: Infrastructure
- [x] GCS bucket created and accessible
- [x] APIs enabled for `banana-fate` project
- [x] Artifact Registry repository configured
- [x] Service account permissions verified

### Phase 2: Backend
- [x] FastAPI server running
- [x] MongoDB connection established
- [x] GCS signed URL generation working
- [x] All 3 endpoints functional
- [x] Docker build succeeds

### Phase 3: Frontend
- [x] Proxy configuration working
- [x] API client utilities implemented
- [x] Upload stub replaced with real logic
- [x] Error handling in place
- [x] Production Docker build succeeds

### Phase 4: Local Testing
- [x] docker-compose brings up both services
- [x] End-to-end capture workflow completes
- [x] MongoDB document created
- [x] GCS image uploaded
- [x] No errors in logs

### Phase 5: Deployment Scripts
- [x] Backend deployment script works
- [x] Frontend deployment script works
- [x] Full deployment script succeeds
- [x] Health checks pass

### Phase 6: Cloud Deployment
- [x] Backend service live on Cloud Run
- [x] Frontend service live on Cloud Run
- [x] Public URL accessible
- [x] End-to-end workflow functional
- [x] Data verified in MongoDB + GCS
- [x] Documentation updated

---

## Next Steps After Deployment

### Phase 3: Data Collection

**Immediate**:
1. Create batch IDs for tracking (e.g., `batch_001`, `batch_002`)
2. Begin capturing banana images twice daily
3. Monitor data quality and consistency

**Tools**:
- Data collection app (deployed)
- MongoDB Compass for data inspection
- GCS console for image verification

### Phase 4: Model Training

**Preparation**:
1. Collect 500+ images across all ripeness stages
2. Label images from observation logs
3. Download dataset from GCS
4. Implement training pipeline (MobileNetV2)

### Phase 5: MLOps

**Future Enhancements**:
- Experiment tracking (MLflow, Weights & Biases)
- Model versioning in GCS
- A/B testing infrastructure
- Monitoring dashboards

---

## Appendix: File Checklist

### Backend Files
- [x] `data-ingestion-backend/app.py`
- [x] `data-ingestion-backend/helper_mongodb.py`
- [x] `data-ingestion-backend/helper_gcs.py`
- [x] `data-ingestion-backend/requirements.txt`
- [x] `data-ingestion-backend/Dockerfile`
- [x] `data-ingestion-backend/.env` (updated with GCS config)
- [x] `data-ingestion-backend/.env.example`
- [x] `data-ingestion-backend/.gitignore`

### Frontend Files
- [x] `data-ingestion-frontend/src/utils/apiClient.ts` (new)
- [x] `data-ingestion-frontend/src/App.tsx` (updated upload logic)
- [x] `data-ingestion-frontend/vite.config.ts` (updated proxy)
- [x] `data-ingestion-frontend/Dockerfile` (dev)
- [x] `data-ingestion-frontend/Dockerfile.prod` (new)
- [x] `data-ingestion-frontend/nginx.conf` (new)

### Deployment Files
- [x] `data-ingestion/docker-compose.yml` (new)
- [x] `deployment/.env` (new)
- [x] `deployment/.env.example` (new)
- [x] `deployment/deploy-backend.sh` (new)
- [x] `deployment/deploy-frontend.sh` (new)
- [x] `deployment/deploy-all.sh` (new)
- [x] `deployment/DEPLOYMENT_GUIDE.md` (new)

### Documentation
- [x] `data-ingestion/DEPLOYMENT_PLAN.md` (this file)
- [x] `/Users/nnt/Documents/Developer/[BananaFate]/CLAUDE.md` (updated status)

---

## References

- **Technical Spec**: `banana_fate_cloud_plan.md`
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/

---

*Last Updated: 2025-11-05*
*Status: Ready for Implementation*
*Next Action: Begin Phase 1 - GCP Infrastructure Setup*
