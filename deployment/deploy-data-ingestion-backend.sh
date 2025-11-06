#!/bin/bash
# Deploy data-ingestion-backend to Cloud Run
# This backend serves both data ingestion and data management features

set -e

# Get script directory and source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

echo "🚀 Deploying Data Ingestion Backend to Cloud Run"
echo "=================================================="
echo ""

# Check prerequisites
if ! check_prerequisites; then
  exit 1
fi

# Set GCP project
set_gcp_project

# Generate password hash for management portal authentication
log_info "Generating bcrypt hash for admin password..."
MANAGEMENT_PASSWORD_HASH=$(python3 "$SCRIPT_DIR/generate-password-hash.py" "$ADMIN_PASSWORD")

if [ -z "$MANAGEMENT_PASSWORD_HASH" ]; then
  log_error "Failed to generate password hash"
  exit 1
fi

log_success "Password hash generated successfully"

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))")
  log_info "Generated JWT secret (not persisted)"
fi

# Set default JWT expiration hours if not provided
JWT_EXPIRATION_HOURS="${JWT_EXPIRATION_HOURS:-8}"

# Define image name
IMAGE_NAME="${ARTIFACT_REGISTRY_URL}/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${DATA_INGESTION_BACKEND_SERVICE}:latest"

# Navigate to backend directory
BACKEND_DIR="$PROJECT_ROOT/data-ingestion/data-ingestion-backend"

if [ ! -d "$BACKEND_DIR" ]; then
  log_error "Backend directory not found: $BACKEND_DIR"
  exit 1
fi

log_info "Building Docker image from: $BACKEND_DIR"
echo ""

# Build Docker image with all build args
log_info "Building Docker image..."
docker build \
  --platform linux/amd64 \
  --build-arg username="$MONGODB_USERNAME" \
  --build-arg password="$MONGODB_PASSWORD" \
  --build-arg server_address="$MONGODB_SERVER_ADDRESS" \
  --build-arg GCS_PROJECT_ID="$GCS_PROJECT_ID" \
  --build-arg GCS_BUCKET_NAME="$GCS_BUCKET_NAME" \
  --build-arg GCS_SERVICE_ACCOUNT_EMAIL="$GCS_SERVICE_ACCOUNT_EMAIL" \
  --build-arg MANAGEMENT_PASSWORD_HASH="$MANAGEMENT_PASSWORD_HASH" \
  --build-arg JWT_SECRET="$JWT_SECRET" \
  --build-arg JWT_EXPIRATION_HOURS="$JWT_EXPIRATION_HOURS" \
  -t "$IMAGE_NAME" \
  "$BACKEND_DIR"

echo ""

# Configure Docker authentication
configure_docker_auth

# Push image to Artifact Registry
log_info "Pushing image to Artifact Registry..."
docker push "$IMAGE_NAME"

echo ""

# Deploy to Cloud Run
log_info "Deploying to Cloud Run..."
gcloud run deploy "$DATA_INGESTION_BACKEND_SERVICE" \
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
DEPLOYED_BACKEND_URL=$(gcloud run services describe "$DATA_INGESTION_BACKEND_SERVICE" \
  --region="$GCP_REGION" \
  --format='value(status.url)')

log_success "Backend deployed successfully!"
log_info "Backend URL: $DEPLOYED_BACKEND_URL"

# Save backend URL for frontend deployments
echo "BACKEND_URL=$DEPLOYED_BACKEND_URL" > "$SCRIPT_DIR/.backend_url"

echo ""

# Health check
log_info "Performing health check..."
sleep 5

HEALTH_RESPONSE=$(curl -s "${DEPLOYED_BACKEND_URL}/health" 2>/dev/null || echo '{"error": "Health check failed"}')
echo "Health check response: $HEALTH_RESPONSE"

# Check if health check was successful
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
  log_success "Health check passed!"
else
  log_warning "Health check returned unexpected response"
fi

echo ""
log_success "Backend deployment complete!"
echo ""
