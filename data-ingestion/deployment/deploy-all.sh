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
