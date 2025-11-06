#!/bin/bash
# Banana Fate - Interactive Deployment Script
# Centralized deployment for all services

set -e

# Get script directory and source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║        🍌 Banana Fate - Deployment Manager 🍌          ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! check_prerequisites; then
  exit 1
fi

# Display current configuration
echo "Configuration:"
echo "  Project:  $GCP_PROJECT_ID"
echo "  Region:   $GCP_REGION"
echo "  Password: ${ADMIN_PASSWORD:0:2}***${ADMIN_PASSWORD: -2}"
echo ""

# Deployment options menu
show_menu() {
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║              Deployment Options                        ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  echo "  [1] Deploy Everything (All Services)"
  echo "  [2] Select Individual Services"
  echo "  [3] Exit"
  echo ""
}

# Service selection menu
select_services() {
  echo ""
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║            Select Services to Deploy                   ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""
  echo "Available services organized by module:"
  echo ""
  echo "📦 Data Ingestion Module (Public Image Capture)"
  echo "   [1] data-ingestion-backend"
  echo "   [2] data-ingestion-frontend"
  echo ""
  echo "🔐 Data Management Module (Admin Portal)"
  echo "   [3] data-ingestion-backend (update with management features)"
  echo "   [4] data-management-frontend"
  echo ""
  echo "Note: Options 1 and 3 deploy the same backend service with different features"
  echo ""

  # Initialize selection array
  declare -g -A SELECTED_SERVICES
  SELECTED_SERVICES[backend]=false
  SELECTED_SERVICES[ingestion_frontend]=false
  SELECTED_SERVICES[management_frontend]=false

  while true; do
    echo ""
    read -p "Enter service numbers to deploy (space-separated, e.g., '1 2' or 'all'): " -a selections

    # Check for 'all' option
    if [ "${selections[0]}" = "all" ]; then
      SELECTED_SERVICES[backend]=true
      SELECTED_SERVICES[ingestion_frontend]=true
      SELECTED_SERVICES[management_frontend]=true
      break
    fi

    # Process individual selections
    local valid=true
    for num in "${selections[@]}"; do
      case $num in
        1|3)
          SELECTED_SERVICES[backend]=true
          ;;
        2)
          SELECTED_SERVICES[ingestion_frontend]=true
          ;;
        4)
          SELECTED_SERVICES[management_frontend]=true
          ;;
        *)
          echo "Invalid selection: $num"
          valid=false
          ;;
      esac
    done

    if $valid; then
      break
    fi
  done

  # Display selected services
  echo ""
  echo "Selected services:"
  if [ "${SELECTED_SERVICES[backend]}" = "true" ]; then
    echo "  ✓ data-ingestion-backend (with management features)"
  fi
  if [ "${SELECTED_SERVICES[ingestion_frontend]}" = "true" ]; then
    echo "  ✓ data-ingestion-frontend"
  fi
  if [ "${SELECTED_SERVICES[management_frontend]}" = "true" ]; then
    echo "  ✓ data-management-frontend"
  fi
  echo ""

  # Validate dependencies
  if [ "${SELECTED_SERVICES[management_frontend]}" = "true" ] && [ "${SELECTED_SERVICES[backend]}" = "false" ]; then
    log_warning "Warning: data-management-frontend requires backend to be deployed/updated"
    read -p "Deploy backend as well? (y/n): " deploy_backend
    if [[ "$deploy_backend" =~ ^[Yy]$ ]]; then
      SELECTED_SERVICES[backend]=true
    else
      log_warning "Proceeding without backend update. Management features may not work."
    fi
  fi

  # Confirm deployment
  echo ""
  read -p "Proceed with deployment? (y/n): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "Deployment cancelled"
    exit 0
  fi
}

# Deploy all services
deploy_all() {
  log_info "Deploying all services..."
  echo ""

  # Deploy in order: backend first, then frontends
  "$SCRIPT_DIR/deploy-data-ingestion-backend.sh"
  echo ""
  "$SCRIPT_DIR/deploy-data-ingestion-frontend.sh"
  echo ""
  "$SCRIPT_DIR/deploy-data-management-frontend.sh"
}

# Deploy selected services
deploy_selected() {
  # Deploy backend first if selected
  if [ "${SELECTED_SERVICES[backend]}" = "true" ]; then
    echo ""
    "$SCRIPT_DIR/deploy-data-ingestion-backend.sh"
  fi

  # Deploy frontends in parallel (they're independent)
  local pids=()

  if [ "${SELECTED_SERVICES[ingestion_frontend]}" = "true" ]; then
    echo ""
    "$SCRIPT_DIR/deploy-data-ingestion-frontend.sh"
  fi

  if [ "${SELECTED_SERVICES[management_frontend]}" = "true" ]; then
    echo ""
    "$SCRIPT_DIR/deploy-data-management-frontend.sh"
  fi
}

# Display deployment summary
show_summary() {
  echo ""
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║           Deployment Summary                           ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  # Check which services were deployed and show their URLs
  if [ "${SELECTED_SERVICES[backend]}" = "true" ] || [ "$1" = "all" ]; then
    echo "Backend API:"
    echo "  $BACKEND_URL"
    echo ""
  fi

  if [ "${SELECTED_SERVICES[ingestion_frontend]}" = "true" ] || [ "$1" = "all" ]; then
    echo "Data Ingestion App (Public):"
    echo "  $DATA_INGESTION_FRONTEND_URL"
    echo ""
  fi

  if [ "${SELECTED_SERVICES[management_frontend]}" = "true" ] || [ "$1" = "all" ]; then
    echo "Data Management Portal (Password Protected):"
    echo "  $DATA_MANAGEMENT_FRONTEND_URL"
    echo "  Password: $ADMIN_PASSWORD"
    echo ""
  fi

  echo "═══════════════════════════════════════════════════════"
  log_success "All deployments complete!"
  echo ""
}

# Main execution
main() {
  while true; do
    show_menu
    read -p "Select an option [1-3]: " choice

    case $choice in
      1)
        echo ""
        log_info "Deploying all services..."
        read -p "This will deploy all services. Continue? (y/n): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
          deploy_all
          show_summary "all"
        fi
        break
        ;;
      2)
        select_services
        deploy_selected
        show_summary "selected"
        break
        ;;
      3)
        log_info "Exiting deployment manager"
        exit 0
        ;;
      *)
        log_error "Invalid option. Please select 1, 2, or 3."
        echo ""
        ;;
    esac
  done
}

# Run main function
main
