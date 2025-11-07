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

  # Initialize selection variables (Bash 3.2 compatible)
  DEPLOY_BACKEND=false
  DEPLOY_INGESTION_FRONTEND=false
  DEPLOY_MANAGEMENT_FRONTEND=false

  while true; do
    echo ""
    read -p "Enter service numbers to deploy (space-separated, e.g., '1 2' or 'all'): " -a selections

    # Check for 'all' option
    if [ "${selections[0]}" = "all" ]; then
      DEPLOY_BACKEND=true
      DEPLOY_INGESTION_FRONTEND=true
      DEPLOY_MANAGEMENT_FRONTEND=true
      break
    fi

    # Process individual selections
    local valid=true
    for num in "${selections[@]}"; do
      case $num in
        1|3)
          DEPLOY_BACKEND=true
          ;;
        2)
          DEPLOY_INGESTION_FRONTEND=true
          ;;
        4)
          DEPLOY_MANAGEMENT_FRONTEND=true
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
  if [ "$DEPLOY_BACKEND" = "true" ]; then
    echo "  ✓ data-ingestion-backend (with management features)"
  fi
  if [ "$DEPLOY_INGESTION_FRONTEND" = "true" ]; then
    echo "  ✓ data-ingestion-frontend"
  fi
  if [ "$DEPLOY_MANAGEMENT_FRONTEND" = "true" ]; then
    echo "  ✓ data-management-frontend"
  fi
  echo ""

  # Validate dependencies
  if [ "$DEPLOY_MANAGEMENT_FRONTEND" = "true" ] && [ "$DEPLOY_BACKEND" = "false" ]; then
    log_warning "Warning: data-management-frontend requires backend to be deployed/updated"
    read -p "Deploy backend as well? (y/n): " deploy_backend
    if [[ "$deploy_backend" =~ ^[Yy]$ ]]; then
      DEPLOY_BACKEND=true
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

# Monitor parallel deployment with live status updates
monitor_parallel_deployment() {
  local backend_pid=$1
  local ingestion_pid=$2
  local management_pid=$3
  local backend_log=$4
  local ingestion_log=$5
  local management_log=$6

  # Track start time
  local start_time=$(date +%s)

  # Initialize status
  local backend_status="Starting ⏳"
  local ingestion_status="Starting ⏳"
  local management_status="Starting ⏳"

  local backend_done=false
  local ingestion_done=false
  local management_done=false

  local failed=false

  # Function to get elapsed time
  get_elapsed() {
    local now=$(date +%s)
    local elapsed=$((now - start_time))
    local mins=$((elapsed / 60))
    local secs=$((elapsed % 60))
    if [ $mins -gt 0 ]; then
      echo "${mins}m ${secs}s"
    else
      echo "${secs}s"
    fi
  }

  # Function to detect service status from log
  get_service_status() {
    local log_file=$1

    if grep -q "Health check passed" "$log_file" 2>/dev/null; then
      echo "Complete ✅"
    elif grep -q "deployed successfully" "$log_file" 2>/dev/null; then
      echo "Complete ✅"
    elif grep -q "Deploying to Cloud Run" "$log_file" 2>/dev/null; then
      echo "Deploying 🚀"
    elif grep -q "Pushing image to Artifact Registry" "$log_file" 2>/dev/null; then
      echo "Pushing 📤"
    elif grep -q "Building Docker image" "$log_file" 2>/dev/null; then
      echo "Building 🔨"
    elif grep -q "Verifying critical" "$log_file" 2>/dev/null; then
      echo "Preparing 📋"
    else
      echo "Starting ⏳"
    fi
  }

  # Clear screen and show header
  echo ""
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║           Deployment Progress (Parallel)               ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  # Monitor loop
  while true; do
    # Check if processes are still running
    if ! kill -0 $backend_pid 2>/dev/null && [ "$backend_done" = "false" ]; then
      wait $backend_pid
      if [ $? -eq 0 ]; then
        backend_status="Complete ✅"
      else
        backend_status="Failed ❌"
        failed=true
      fi
      backend_done=true
    fi

    if ! kill -0 $ingestion_pid 2>/dev/null && [ "$ingestion_done" = "false" ]; then
      wait $ingestion_pid
      if [ $? -eq 0 ]; then
        ingestion_status="Complete ✅"
      else
        ingestion_status="Failed ❌"
        failed=true
      fi
      ingestion_done=true
    fi

    if ! kill -0 $management_pid 2>/dev/null && [ "$management_done" = "false" ]; then
      wait $management_pid
      if [ $? -eq 0 ]; then
        management_status="Complete ✅"
      else
        management_status="Failed ❌"
        failed=true
      fi
      management_done=true
    fi

    # Update status from logs if still running
    if [ "$backend_done" = "false" ]; then
      backend_status=$(get_service_status "$backend_log")
    fi

    if [ "$ingestion_done" = "false" ]; then
      ingestion_status=$(get_service_status "$ingestion_log")
    fi

    if [ "$management_done" = "false" ]; then
      management_status=$(get_service_status "$management_log")
    fi

    # Move cursor up 5 lines and redraw status
    printf "\033[5A"
    printf "\033[K  Backend:              %-30s\n" "$backend_status"
    printf "\033[K  Ingestion Frontend:   %-30s\n" "$ingestion_status"
    printf "\033[K  Management Frontend:  %-30s\n" "$management_status"
    printf "\033[K\n"
    printf "\033[K  Elapsed: %s\n" "$(get_elapsed)"

    # Check if all done
    if [ "$backend_done" = "true" ] && [ "$ingestion_done" = "true" ] && [ "$management_done" = "true" ]; then
      break
    fi

    # Wait before next update
    sleep 2
  done

  echo ""

  # Return failure status
  if [ "$failed" = "true" ]; then
    return 1
  else
    return 0
  fi
}

# Deploy all services
deploy_all() {
  log_info "Deploying all services in parallel..."
  echo ""

  # Create log files for parallel execution
  local backend_log=$(mktemp)
  local ingestion_log=$(mktemp)
  local management_log=$(mktemp)

  # Deploy all services in parallel
  log_info "Starting parallel deployment of 3 services..."

  "$SCRIPT_DIR/deploy-data-ingestion-backend.sh" > "$backend_log" 2>&1 &
  local backend_pid=$!

  "$SCRIPT_DIR/deploy-data-ingestion-frontend.sh" > "$ingestion_log" 2>&1 &
  local ingestion_pid=$!

  "$SCRIPT_DIR/deploy-data-management-frontend.sh" > "$management_log" 2>&1 &
  local management_pid=$!

  # Monitor deployments with live status updates
  if ! monitor_parallel_deployment $backend_pid $ingestion_pid $management_pid "$backend_log" "$ingestion_log" "$management_log"; then
    local failed=true
    echo "═══════════════════════════════════════════════════════"
    log_error "Some deployments failed. Showing logs:"
    echo ""

    echo "Backend logs:"
    cat "$backend_log"
    echo ""

    echo "Ingestion frontend logs:"
    cat "$ingestion_log"
    echo ""

    echo "Management frontend logs:"
    cat "$management_log"
    echo ""

    rm -f "$backend_log" "$ingestion_log" "$management_log"
    exit 1
  fi

  # Clean up log files
  rm -f "$backend_log" "$ingestion_log" "$management_log"

  echo ""
  log_success "All parallel deployments completed successfully!"
}

# Deploy selected services
deploy_selected() {
  # Deploy backend first if selected
  if [ "$DEPLOY_BACKEND" = "true" ]; then
    echo ""
    "$SCRIPT_DIR/deploy-data-ingestion-backend.sh"
  fi

  # Deploy frontends in parallel (they're independent)
  local pids=()

  if [ "$DEPLOY_INGESTION_FRONTEND" = "true" ]; then
    echo ""
    "$SCRIPT_DIR/deploy-data-ingestion-frontend.sh"
  fi

  if [ "$DEPLOY_MANAGEMENT_FRONTEND" = "true" ]; then
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
  if [ "$DEPLOY_BACKEND" = "true" ] || [ "$1" = "all" ]; then
    echo "Backend API:"
    echo "  $BACKEND_URL"
    echo ""
  fi

  if [ "$DEPLOY_INGESTION_FRONTEND" = "true" ] || [ "$1" = "all" ]; then
    echo "Data Ingestion App (Public):"
    echo "  $DATA_INGESTION_FRONTEND_URL"
    echo ""
  fi

  if [ "$DEPLOY_MANAGEMENT_FRONTEND" = "true" ] || [ "$1" = "all" ]; then
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
