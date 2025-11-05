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
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Frontend health check passed (HTTP 200)"
else
  echo "⚠️  Frontend health check returned HTTP $HTTP_STATUS"
fi

echo "✅ Frontend deployment complete!"
