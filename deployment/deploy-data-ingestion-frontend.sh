#!/bin/bash
# Deploy data-ingestion-frontend to Cloud Run
# Public-facing web app for capturing banana images

set -e

# Get script directory and source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "🚀 Deploying Data Ingestion Frontend to Cloud Run"
echo "=================================================="
echo ""

# Check prerequisites
if ! check_prerequisites; then
  exit 1
fi

# Set GCP project
set_gcp_project

# Load backend URL (from backend deployment)
if [ -f "$SCRIPT_DIR/.backend_url" ]; then
  source "$SCRIPT_DIR/.backend_url"
  log_info "Using backend URL from .backend_url: $BACKEND_URL"
else
  log_warning ".backend_url not found. Using computed URL from config"
  # Use the computed BACKEND_URL from config.sh
fi

if [ -z "$BACKEND_URL" ]; then
  log_error "BACKEND_URL not set. Deploy backend first."
  exit 1
fi

# Define image name
IMAGE_NAME="${ARTIFACT_REGISTRY_URL}/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${DATA_INGESTION_FRONTEND_SERVICE}:latest"

# Navigate to frontend directory
FRONTEND_DIR="$PROJECT_ROOT/data-ingestion/data-ingestion-frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
  log_error "Frontend directory not found: $FRONTEND_DIR"
  exit 1
fi

log_info "Building Docker image from: $FRONTEND_DIR"
log_info "Backend URL: $BACKEND_URL"
echo ""

# Verify critical files exist before building
log_info "Verifying critical frontend files..."
CRITICAL_FILES=(
  "package.json"
  "Dockerfile.prod"
  "vite.config.ts"
  "index.html"
  "src/App.tsx"
  "src/index.tsx"
  "src/components/CameraCapture.tsx"
  "src/contexts/AuthContext.tsx"
  "src/utils/apiClient.ts"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$FRONTEND_DIR/$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  log_error "Critical files missing from frontend directory:"
  for file in "${MISSING_FILES[@]}"; do
    echo "  ❌ $file"
  done
  log_error "Build aborted. Please ensure all files are present in: $FRONTEND_DIR"
  exit 1
fi

log_success "All critical files verified (${#CRITICAL_FILES[@]} files)"
echo ""

# Build Docker image with backend URL
log_info "Building Docker image..."
docker build \
  --platform linux/amd64 \
  --build-arg VITE_BACKEND_URL="$BACKEND_URL" \
  -f "$FRONTEND_DIR/Dockerfile.prod" \
  -t "$IMAGE_NAME" \
  "$FRONTEND_DIR"

echo ""

# Configure Docker authentication
configure_docker_auth

# Push image to Artifact Registry
log_info "Pushing image to Artifact Registry..."
docker push "$IMAGE_NAME"

echo ""

# Deploy to Cloud Run
log_info "Deploying to Cloud Run..."
gcloud run deploy "$DATA_INGESTION_FRONTEND_SERVICE" \
  --image="$IMAGE_NAME" \
  --platform=managed \
  --region="$GCP_REGION" \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --port=8080 \
  --quiet

echo ""

# Get service URL
DEPLOYED_FRONTEND_URL=$(gcloud run services describe "$DATA_INGESTION_FRONTEND_SERVICE" \
  --region="$GCP_REGION" \
  --format='value(status.url)')

log_success "Frontend deployed successfully!"
log_info "Frontend URL: $DEPLOYED_FRONTEND_URL"

echo ""

# Health check
log_info "Performing health check..."
sleep 5

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  log_success "Health check passed (HTTP 200)"
else
  log_warning "Health check returned HTTP $HTTP_STATUS"
fi

echo ""
log_success "Frontend deployment complete!"
echo ""
