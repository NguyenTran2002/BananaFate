#!/bin/bash
# Shared configuration for all deployment scripts
# This file is sourced by deploy.sh and individual service deployment scripts

# Load environment variables from .env
if [ ! -f "$(dirname "${BASH_SOURCE[0]}")/.env" ]; then
  echo "❌ Error: .env file not found in deployment directory"
  echo "Please create .env file with required configuration"
  exit 1
fi

# Source .env file
export $(cat "$(dirname "${BASH_SOURCE[0]}")/.env" | grep -v '^#' | grep -v '^$' | xargs)

# Validate required variables
REQUIRED_VARS=(
  "GCP_PROJECT_ID"
  "GCP_REGION"
  "ARTIFACT_REGISTRY_REPO"
  "MONGODB_USERNAME"
  "MONGODB_PASSWORD"
  "MONGODB_CLUSTER"
  "GCS_PROJECT_ID"
  "GCS_BUCKET_NAME"
  "DATA_INGESTION_BACKEND_SERVICE"
  "DATA_INGESTION_FRONTEND_SERVICE"
  "DATA_MANAGEMENT_FRONTEND_SERVICE"
  "ADMIN_PASSWORD"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Error: Missing required environment variables in .env:"
  printf '  - %s\n' "${missing_vars[@]}"
  exit 1
fi

# Derived configuration
export MONGODB_SERVER_ADDRESS="@${MONGODB_CLUSTER}/"
export ARTIFACT_REGISTRY_URL="${GCP_REGION}-docker.pkg.dev"

# Service URLs (computed from service names)
export BACKEND_URL="https://${DATA_INGESTION_BACKEND_SERVICE}-281433271767.${GCP_REGION}.run.app"
export DATA_INGESTION_FRONTEND_URL="https://${DATA_INGESTION_FRONTEND_SERVICE}-281433271767.${GCP_REGION}.run.app"
export DATA_MANAGEMENT_FRONTEND_URL="https://${DATA_MANAGEMENT_FRONTEND_SERVICE}-281433271767.${GCP_REGION}.run.app"

# Deployment directory
export DEPLOYMENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_ROOT="$(cd "$DEPLOYMENT_DIR/.." && pwd)"

# Color codes for output
export COLOR_RESET='\033[0m'
export COLOR_GREEN='\033[0;32m'
export COLOR_YELLOW='\033[1;33m'
export COLOR_RED='\033[0;31m'
export COLOR_BLUE='\033[0;34m'

# Helper functions
log_info() {
  echo -e "${COLOR_BLUE}ℹ️  $1${COLOR_RESET}"
}

log_success() {
  echo -e "${COLOR_GREEN}✅ $1${COLOR_RESET}"
}

log_warning() {
  echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"
}

log_error() {
  echo -e "${COLOR_RED}❌ $1${COLOR_RESET}"
}

# Verify prerequisites
check_prerequisites() {
  local missing_tools=()

  if ! command -v gcloud &> /dev/null; then
    missing_tools+=("gcloud (Google Cloud SDK)")
  fi

  if ! command -v docker &> /dev/null; then
    missing_tools+=("docker")
  fi

  if ! command -v python3 &> /dev/null; then
    missing_tools+=("python3")
  fi

  if [ ${#missing_tools[@]} -gt 0 ]; then
    log_error "Missing required tools:"
    printf '  - %s\n' "${missing_tools[@]}"
    return 1
  fi

  return 0
}

# Set GCP project
set_gcp_project() {
  log_info "Setting GCP project to $GCP_PROJECT_ID"
  gcloud config set project "$GCP_PROJECT_ID" --quiet
}

# Configure Docker for Artifact Registry
configure_docker_auth() {
  log_info "Configuring Docker authentication for Artifact Registry"
  gcloud auth configure-docker "${ARTIFACT_REGISTRY_URL}" --quiet
}
