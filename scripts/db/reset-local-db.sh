#!/bin/bash
# Local Database Reset Script
# Completely resets the local development database and reloads all migrations and seed data
# Usage: ./reset-local-db.sh [--force]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/db-reset"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if force flag is provided
FORCE_RESET=false
if [[ "$1" == "--force" ]]; then
    FORCE_RESET=true
fi

# Create log directory
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/reset_$(date +'%Y%m%d_%H%M%S').log"

# Log function with file output
log_to_file() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    log "$1"
}

# Confirmation check
confirm_reset() {
    if [[ "$FORCE_RESET" == "true" ]]; then
        return 0
    fi
    
    warning "This will completely destroy and recreate the local development database."
    warning "All data will be lost and replaced with seed data."
    echo ""
    echo "Current database status:"
    
    # Check if containers are running
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres | grep -q "Up"; then
        echo "✅ PostgreSQL container is running"
    else
        echo "❌ PostgreSQL container is not running"
    fi
    
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [[ "$confirmation" != "yes" ]]; then
        log "Database reset cancelled by user"
        exit 0
    fi
}

# Stop and remove existing containers
stop_containers() {
    log_to_file "Stopping and removing existing containers..."
    
    cd "$PROJECT_ROOT"
    
    # Stop containers if running
    docker-compose down --volumes 2>/dev/null || true
    
    # Remove any orphaned containers
    docker-compose rm -f 2>/dev/null || true
    
    # Remove volumes to ensure clean slate
    docker volume rm aura_postgres_data 2>/dev/null || true
    docker volume rm aura_redis_data 2>/dev/null || true
    
    success "Containers and volumes removed"
}

# Start fresh containers
start_containers() {
    log_to_file "Starting fresh database containers..."
    
    cd "$PROJECT_ROOT"
    
    # Start containers in background
    docker-compose up -d
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    max_attempts=30
    attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker-compose exec -T postgres pg_isready -U postgres -d aura_dev &>/dev/null; then
            success "PostgreSQL is ready"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        error "PostgreSQL failed to start within expected time"
        exit 1
    fi
    
    # Wait a bit more for full initialization
    log "Waiting for database initialization to complete..."
    sleep 5
}

# Run migrations
run_migrations() {
    log_to_file "Running database migrations..."
    
    # Check if migrations directory exists
    if [[ ! -d "$PROJECT_ROOT/db/migrations/production" ]]; then
        error "Migrations directory not found: $PROJECT_ROOT/db/migrations/production"
        exit 1
    fi
    
    # Run migrations in order
    cd "$PROJECT_ROOT"
    for migration_file in db/migrations/production/*.sql; do
        if [[ -f "$migration_file" ]]; then
            migration_name=$(basename "$migration_file")
            log "Running migration: $migration_name"
            
            if docker-compose exec -T postgres psql -U postgres -d aura_dev -f "/docker-entrypoint-initdb.d/migrations/$migration_name"; then
                success "✅ Migration completed: $migration_name"
            else
                error "❌ Migration failed: $migration_name"
                exit 1
            fi
        fi
    done
}

# Load seed data
load_seed_data() {
    log_to_file "Loading development seed data..."
    
    cd "$PROJECT_ROOT"
    
    if docker-compose exec -T postgres psql -U postgres -d aura_dev -f "/docker-entrypoint-initdb.d/scripts/seed-development-data.sql"; then
        success "✅ Seed data loaded successfully"
    else
        error "❌ Failed to load seed data"
        exit 1
    fi
}

# Validate database setup
validate_setup() {
    log_to_file "Validating database setup..."
    
    # Check if tables exist
    local expected_tables=("users" "encrypted_user_prefs" "encrypted_cycle_data" "healthcare_share" "share_token" "device_key")
    local validation_passed=true
    
    cd "$PROJECT_ROOT"
    
    for table in "${expected_tables[@]}"; do
        if docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q "1"; then
            success "✅ Table '$table' exists"
        else
            error "❌ Table '$table' not found"
            validation_passed=false
        fi
    done
    
    # Check row counts
    log "Checking data counts..."
    local user_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM users" | grep -o '[0-9]\\+' | head -n1)
    local cycle_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM encrypted_cycle_data" | grep -o '[0-9]\\+' | head -n1)
    local share_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM healthcare_share" | grep -o '[0-9]\\+' | head -n1)
    
    log "Data summary:"
    log "- Users: $user_count"
    log "- Cycle Data Records: $cycle_count" 
    log "- Healthcare Shares: $share_count"
    
    # Check RLS policies
    local policy_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM pg_policies" | grep -o '[0-9]\\+' | head -n1)
    log "- RLS Policies: $policy_count"
    
    if [[ "$validation_passed" == "true" ]] && [[ $policy_count -gt 0 ]]; then
        success "✅ Database validation passed"
        return 0
    else
        error "❌ Database validation failed"
        return 1
    fi
}

# Run RLS validation
run_rls_validation() {
    log_to_file "Running RLS policy validation..."
    
    if [[ -f "$PROJECT_ROOT/scripts/migrations/validate-rls.sh" ]]; then
        cd "$PROJECT_ROOT"
        if bash scripts/migrations/validate-rls.sh development; then
            success "✅ RLS validation passed"
        else
            warning "⚠️  RLS validation failed - check the output above"
        fi
    else
        warning "⚠️  RLS validation script not found, skipping..."
    fi
}

# Display connection information
display_connection_info() {
    log_to_file "Database reset completed successfully"
    
    echo ""
    echo "==============================================="
    echo "🎉 Local Development Database Ready!"
    echo "==============================================="
    echo ""
    echo "📋 Connection Details:"
    echo "  Host: localhost"
    echo "  Port: 54322"
    echo "  Database: aura_dev"
    echo "  User: postgres"
    echo "  Password: postgres_dev_password"
    echo ""
    echo "🔗 Connection String:"
    echo "  postgresql://postgres:postgres_dev_password@localhost:54322/aura_dev"
    echo ""
    echo "👥 Development Test Users:"
    echo "  User 1: 11111111-1111-1111-1111-111111111111"
    echo "  User 2: 22222222-2222-2222-2222-222222222222"
    echo "  User 3: 33333333-3333-3333-3333-333333333333"
    echo ""
    echo "🔑 Test Share Tokens:"
    echo "  Token 1: dev_share_token_1234567890abcdef1234567890abcdef"
    echo "  Token 2: dev_share_token_abcdef1234567890abcdef1234567890"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs: docker-compose logs postgres"
    echo "  Connect to DB: docker-compose exec postgres psql -U postgres -d aura_dev"
    echo "  Stop DB: docker-compose down"
    echo "  Reset DB: ./scripts/db/reset-local-db.sh --force"
    echo ""
    echo "📝 Log file: $LOG_FILE"
    echo "==============================================="
}

# Main execution
main() {
    log_to_file "Starting local database reset process..."
    
    # Confirm the reset
    confirm_reset
    
    # Execute reset steps
    stop_containers
    start_containers
    run_migrations
    load_seed_data
    
    # Validate setup
    if validate_setup; then
        # Run RLS validation
        run_rls_validation
        
        # Display success information
        display_connection_info
        
        success "🎉 Database reset completed successfully!"
        exit 0
    else
        error "Database reset failed during validation"
        exit 1
    fi
}

# Execute main function
main "$@"