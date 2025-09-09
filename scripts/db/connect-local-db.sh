#!/bin/bash
# Local Database Connection Script
# Provides easy connection to local development database with various options
# Usage: ./connect-local-db.sh [command]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

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

# Check if database is running
check_database() {
    cd "$PROJECT_ROOT"
    
    if ! docker-compose ps postgres | grep -q "Up"; then
        error "PostgreSQL container is not running"
        echo ""
        echo "Start the database with:"
        echo "  docker-compose up -d postgres"
        echo ""
        echo "Or reset the entire database:"
        echo "  ./scripts/db/reset-local-db.sh"
        exit 1
    fi
    
    # Test connection
    if ! docker-compose exec postgres pg_isready -U postgres -d aura_dev &>/dev/null; then
        error "Database is not ready for connections"
        exit 1
    fi
}

# Interactive psql connection
connect_psql() {
    log "Connecting to local development database..."
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "==============================================="
    echo "🐘 PostgreSQL Interactive Console"
    echo "==============================================="
    echo "Database: aura_dev"
    echo "User: postgres"
    echo "Type \\q to quit, \\h for help"
    echo "==============================================="
    echo ""
    
    docker-compose exec postgres psql -U postgres -d aura_dev
}

# Execute SQL file
execute_sql_file() {
    local sql_file="$1"
    
    if [[ ! -f "$sql_file" ]]; then
        error "SQL file not found: $sql_file"
        exit 1
    fi
    
    log "Executing SQL file: $sql_file"
    cd "$PROJECT_ROOT"
    
    # Copy file to container and execute
    docker cp "$sql_file" $(docker-compose ps -q postgres):/tmp/query.sql
    docker-compose exec postgres psql -U postgres -d aura_dev -f /tmp/query.sql
}

# Execute SQL command
execute_sql_command() {
    local sql_command="$1"
    
    log "Executing SQL command..."
    cd "$PROJECT_ROOT"
    
    docker-compose exec postgres psql -U postgres -d aura_dev -c "$sql_command"
}

# Show database status
show_database_status() {
    log "Retrieving database status..."
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "==============================================="
    echo "📊 Database Status"
    echo "==============================================="
    
    # Container status
    echo "🐳 Container Status:"
    docker-compose ps postgres redis
    echo ""
    
    # Database connection info
    echo "🔗 Connection Info:"
    echo "  Host: localhost"
    echo "  Port: 54322"
    echo "  Database: aura_dev"
    echo "  User: postgres"
    echo ""
    
    # Table counts
    echo "📋 Data Summary:"
    local users=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM users" | grep -o '[0-9]\\+' | head -n1 2>/dev/null || echo "0")
    local cycle_data=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM encrypted_cycle_data" | grep -o '[0-9]\\+' | head -n1 2>/dev/null || echo "0")
    local shares=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM healthcare_share" | grep -o '[0-9]\\+' | head -n1 2>/dev/null || echo "0")
    local audit_logs=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM security_audit_log" | grep -o '[0-9]\\+' | head -n1 2>/dev/null || echo "0")
    
    echo "  Users: $users"
    echo "  Cycle Data Records: $cycle_data"
    echo "  Healthcare Shares: $shares"
    echo "  Audit Log Entries: $audit_logs"
    echo ""
    
    # Recent activity
    echo "🕒 Recent Activity (last 24 hours):"
    docker-compose exec -T postgres psql -U postgres -d aura_dev -c "
        SELECT 
            event_type,
            COUNT(*) as count,
            MAX(created_at) as latest
        FROM security_audit_log 
        WHERE created_at > now() - interval '24 hours'
        GROUP BY event_type
        ORDER BY count DESC;
    " 2>/dev/null || echo "  No recent activity data available"
    
    echo ""
    echo "==============================================="
}

# Show development users
show_dev_users() {
    log "Retrieving development users..."
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "==============================================="
    echo "👥 Development Test Users"
    echo "==============================================="
    
    docker-compose exec -T postgres psql -U postgres -d aura_dev -c "
        SELECT 
            u.id,
            au.email,
            u.created_at,
            u.last_active_at,
            (SELECT COUNT(*) FROM encrypted_cycle_data WHERE user_id = u.id) as cycle_records,
            (SELECT COUNT(*) FROM healthcare_share WHERE user_id = u.id) as shares
        FROM users u
        LEFT JOIN auth.users au ON u.id = au.id
        ORDER BY u.created_at;
    "
    
    echo ""
    echo "🔑 Available Share Tokens:"
    docker-compose exec -T postgres psql -U postgres -d aura_dev -c "
        SELECT 
            st.token,
            hs.user_id,
            hs.expires_at,
            hs.status,
            hs.access_count
        FROM share_token st
        JOIN healthcare_share hs ON st.share_id = hs.id
        WHERE st.expires_at > now()
        ORDER BY hs.created_at;
    "
    
    echo ""
    echo "==============================================="
}

# Run database tests
run_tests() {
    log "Running database tests..."
    cd "$PROJECT_ROOT"
    
    echo ""
    echo "==============================================="
    echo "🧪 Database Tests"
    echo "==============================================="
    echo ""
    
    # Test 1: Basic connectivity
    echo "Test 1: Database connectivity..."
    if docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT 1" &>/dev/null; then
        success "✅ Database connection successful"
    else
        error "❌ Database connection failed"
        return 1
    fi
    
    # Test 2: Table existence
    echo ""
    echo "Test 2: Required tables..."
    local tables=("users" "encrypted_user_prefs" "encrypted_cycle_data" "healthcare_share" "share_token" "device_key")
    local all_tables_exist=true
    
    for table in "${tables[@]}"; do
        if docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT 1 FROM information_schema.tables WHERE table_name='$table'" | grep -q "1"; then
            success "✅ Table '$table' exists"
        else
            error "❌ Table '$table' missing"
            all_tables_exist=false
        fi
    done
    
    # Test 3: RLS policies
    echo ""
    echo "Test 3: RLS policies..."
    local policy_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM pg_policies" | grep -o '[0-9]\\+' | head -n1)
    if [[ $policy_count -gt 0 ]]; then
        success "✅ RLS policies active ($policy_count policies)"
    else
        error "❌ No RLS policies found"
        all_tables_exist=false
    fi
    
    # Test 4: Seed data
    echo ""
    echo "Test 4: Seed data..."
    local user_count=$(docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT COUNT(*) FROM users" | grep -o '[0-9]\\+' | head -n1)
    if [[ $user_count -gt 0 ]]; then
        success "✅ Seed data present ($user_count users)"
    else
        warning "⚠️  No seed data found"
    fi
    
    # Test 5: RPC functions
    echo ""
    echo "Test 5: RPC functions..."
    local function_names=("update_cycle_data_optimistic" "validate_share_token" "healthcare_access_audit")
    local all_functions_exist=true
    
    for func in "${function_names[@]}"; do
        if docker-compose exec -T postgres psql -U postgres -d aura_dev -c "SELECT 1 FROM information_schema.routines WHERE routine_name='$func'" | grep -q "1"; then
            success "✅ Function '$func' exists"
        else
            error "❌ Function '$func' missing"
            all_functions_exist=false
        fi
    done
    
    echo ""
    echo "==============================================="
    
    if [[ "$all_tables_exist" == "true" ]] && [[ "$all_functions_exist" == "true" ]]; then
        success "🎉 All database tests passed!"
        return 0
    else
        error "❌ Some database tests failed"
        echo ""
        echo "Consider running database reset:"
        echo "  ./scripts/db/reset-local-db.sh --force"
        return 1
    fi
}

# Show usage information
show_usage() {
    echo "Local Database Connection Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  connect, psql          Connect to PostgreSQL interactive console (default)"
    echo "  status                 Show database status and statistics"
    echo "  users                  Show development test users and share tokens"
    echo "  test                   Run database connectivity and validation tests"
    echo "  exec <SQL>             Execute SQL command"
    echo "  file <path>            Execute SQL file"
    echo "  logs                   Show database container logs"
    echo "  help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Connect to psql console"
    echo "  $0 status              # Show database status"
    echo "  $0 users               # Show test users"
    echo "  $0 test                # Run validation tests"
    echo "  $0 exec 'SELECT COUNT(*) FROM users'"
    echo "  $0 file ./my-query.sql"
    echo "  $0 logs                # Show recent logs"
    echo ""
    echo "Database Info:"
    echo "  Host: localhost"
    echo "  Port: 54322"
    echo "  Database: aura_dev"
    echo "  User: postgres"
    echo "  Password: postgres_dev_password"
}

# Main function
main() {
    local command="${1:-connect}"
    
    case $command in
        "connect"|"psql")
            check_database
            connect_psql
            ;;
        "status")
            check_database
            show_database_status
            ;;
        "users")
            check_database
            show_dev_users
            ;;
        "test")
            check_database
            run_tests
            ;;
        "exec")
            if [[ -z "$2" ]]; then
                error "SQL command required"
                echo "Usage: $0 exec '<SQL_COMMAND>'"
                exit 1
            fi
            check_database
            execute_sql_command "$2"
            ;;
        "file")
            if [[ -z "$2" ]]; then
                error "SQL file path required"
                echo "Usage: $0 file <path_to_sql_file>"
                exit 1
            fi
            check_database
            execute_sql_file "$2"
            ;;
        "logs")
            cd "$PROJECT_ROOT"
            log "Showing recent database logs..."
            docker-compose logs --tail=50 postgres
            ;;
        "help"|"--help"|"-h")
            show_usage
            ;;
        *)
            error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"