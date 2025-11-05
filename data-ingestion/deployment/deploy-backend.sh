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
  --build-arg GCS_SERVICE_ACCOUNT_EMAIL="$GCS_SERVICE_ACCOUNT_EMAIL" \
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
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health" || echo "Health check failed")
echo "Health check response: $HEALTH_RESPONSE"

# Save backend URL for frontend deployment
echo "BACKEND_URL=$BACKEND_URL" > .backend_url

echo "✅ Backend deployment complete!"
