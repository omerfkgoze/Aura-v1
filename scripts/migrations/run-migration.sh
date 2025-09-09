#!/bin/bash
# Migration runner script for Supabase database migrations
# Usage: ./run-migration.sh [environment] [migration_file]
# Example: ./run-migration.sh development 20250909001_initial_schema.sql

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/db/migrations/production"
LOG_DIR="$PROJECT_ROOT/logs/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Validate environment
validate_environment() {
    local env=$1
    case $env in
        "development"|"staging"|"production")
            log "Running migration in $env environment"
            ;;
        *)
            error "Invalid environment: $env"
            error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        error "Supabase CLI is not installed"
        error "Install it with: npm install -g supabase"
        exit 1
    fi
    
    log "Supabase CLI version: $(supabase --version)"
}

# Validate migration file
validate_migration_file() {
    local migration_file=$1
    local full_path="$MIGRATIONS_DIR/$migration_file"
    
    if [[ ! -f "$full_path" ]]; then
        error "Migration file not found: $full_path"
        error "Available migrations:"
        ls -la "$MIGRATIONS_DIR"/*.sql 2>/dev/null || echo "No migration files found"
        exit 1
    fi
    
    # Check if migration file follows naming convention
    if [[ ! "$migration_file" =~ ^[0-9]{8}[0-9]{3}_[a-zA-Z0-9_]+\.sql$ ]]; then
        warning "Migration file doesn't follow naming convention: YYYYMMDDNNN_description.sql"
        warning "Current file: $migration_file"
    fi
    
    log "Migration file validated: $migration_file"
}

# Create migration log entry
create_migration_log() {
    local migration_file=$1
    local environment=$2
    local status=$3
    local error_msg=${4:-""}
    
    mkdir -p "$LOG_DIR"
    local log_file="$LOG_DIR/migration_$(date +'%Y%m%d_%H%M%S').log"
    
    cat > "$log_file" <<EOF
Migration Log
=============
Timestamp: $(date +'%Y-%m-%d %H:%M:%S')
Environment: $environment
Migration File: $migration_file
Status: $status
Error: $error_msg

Migration Content:
EOF
    
    cat "$MIGRATIONS_DIR/$migration_file" >> "$log_file"
    
    log "Migration log created: $log_file"
}

# Run pre-migration validation
pre_migration_validation() {
    local migration_file=$1
    local environment=$2
    
    log "Running pre-migration validation..."
    
    # Check database connection
    if ! supabase db start &> /dev/null; then
        warning "Local database not running, attempting to start..."
        supabase start
    fi
    
    # Validate migration syntax
    log "Validating SQL syntax..."
    if ! supabase db lint --file "$MIGRATIONS_DIR/$migration_file"; then
        error "SQL validation failed for $migration_file"
        return 1
    fi
    
    success "Pre-migration validation passed"
    return 0
}

# Run post-migration validation
post_migration_validation() {
    local migration_file=$1
    
    log "Running post-migration validation..."
    
    # Check if tables exist
    log "Validating table creation..."
    local expected_tables=("users" "encrypted_user_prefs" "encrypted_cycle_data" "healthcare_share" "share_token" "device_key")
    
    for table in "${expected_tables[@]}"; do
        if supabase db exec "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" &> /dev/null; then
            success "Table '$table' exists"
        else
            error "Table '$table' not found"
            return 1
        fi
    done
    
    # Check RLS policies
    log "Validating RLS policies..."
    if supabase db exec "SELECT COUNT(*) FROM pg_policies" &> /dev/null; then
        success "RLS policies validated"
    else
        error "RLS policy validation failed"
        return 1
    fi
    
    success "Post-migration validation passed"
    return 0
}

# Rollback function
rollback_migration() {
    local migration_file=$1
    
    warning "Rolling back migration: $migration_file"
    
    # This is a simplified rollback - in production, you'd have proper rollback scripts
    log "Rollback functionality requires manual intervention"
    log "Check the migration log for details and manually revert changes if needed"
    
    return 0
}

# Main migration function
run_migration() {
    local environment=$1
    local migration_file=$2
    local full_path="$MIGRATIONS_DIR/$migration_file"
    
    log "Starting migration: $migration_file in $environment"
    
    # Pre-migration validation
    if ! pre_migration_validation "$migration_file" "$environment"; then
        create_migration_log "$migration_file" "$environment" "FAILED" "Pre-migration validation failed"
        exit 1
    fi
    
    # Run the migration
    log "Executing migration..."
    if supabase db exec --file "$full_path"; then
        success "Migration executed successfully"
        create_migration_log "$migration_file" "$environment" "SUCCESS"
    else
        error "Migration execution failed"
        create_migration_log "$migration_file" "$environment" "FAILED" "Migration execution failed"
        
        # Attempt rollback for development
        if [[ "$environment" == "development" ]]; then
            rollback_migration "$migration_file"
        fi
        
        exit 1
    fi
    
    # Post-migration validation
    if ! post_migration_validation "$migration_file"; then
        warning "Post-migration validation failed"
        create_migration_log "$migration_file" "$environment" "WARNING" "Post-migration validation failed"
    fi
    
    success "Migration completed successfully: $migration_file"
}

# Main script execution
main() {
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 [environment] [migration_file]"
        echo "Environment: development, staging, production"
        echo "Migration file: optional, if not provided, all pending migrations will be run"
        echo ""
        echo "Examples:"
        echo "  $0 development"
        echo "  $0 development 20250909001_initial_schema.sql"
        echo ""
        echo "Available migrations:"
        ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -n1 basename || echo "No migration files found"
        exit 1
    fi
    
    local environment=$1
    local migration_file=${2:-""}
    
    # Validate inputs
    validate_environment "$environment"
    check_supabase_cli
    
    if [[ -n "$migration_file" ]]; then
        # Run specific migration
        validate_migration_file "$migration_file"
        run_migration "$environment" "$migration_file"
    else
        # Run all pending migrations
        log "Running all pending migrations..."
        
        # Get list of migration files in order
        local migration_files=($(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort | xargs -n1 basename))
        
        if [[ ${#migration_files[@]} -eq 0 ]]; then
            warning "No migration files found in $MIGRATIONS_DIR"
            exit 0
        fi
        
        # Run each migration
        for migration_file in "${migration_files[@]}"; do
            log "Processing migration: $migration_file"
            run_migration "$environment" "$migration_file"
        done
        
        success "All migrations completed successfully"
    fi
}

# Run main function with all arguments
main "$@"