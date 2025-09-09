# Local Development Database Environment

Complete guide for setting up and managing the local PostgreSQL development database that mirrors the Supabase production environment.

## Overview

The local development database provides:

- ✅ Production-identical PostgreSQL 15 setup
- ✅ Complete schema with all tables and RLS policies
- ✅ Anonymized seed data for testing
- ✅ Automated migration and reset workflows
- ✅ Docker Compose orchestration
- ✅ RLS policy validation tools

## Quick Start

### 1. Initial Setup

```bash
# Start the database for the first time
docker-compose up -d postgres

# Reset and initialize with all migrations and seed data
./scripts/db/reset-local-db.sh --force
```

### 2. Daily Development

```bash
# Connect to database
./scripts/db/connect-local-db.sh

# Check database status
./scripts/db/connect-local-db.sh status

# View test users and tokens
./scripts/db/connect-local-db.sh users

# Run database tests
./scripts/db/connect-local-db.sh test
```

## Database Configuration

### Connection Details

- **Host:** localhost
- **Port:** 54322 (matches Supabase local)
- **Database:** aura_dev
- **User:** postgres
- **Password:** postgres_dev_password
- **SSL:** Enabled (with self-signed certificates)

### Connection String

```
postgresql://postgres:postgres_dev_password@localhost:54322/aura_dev
```

## Environment Setup

### Docker Compose Services

The `docker-compose.yml` includes:

#### PostgreSQL Database

- **Image:** postgres:15-alpine (matches Supabase)
- **Container:** aura-postgres-dev
- **Port:** 54322:5432
- **Extensions:** uuid-ossp, pgcrypto, pgjwt
- **Configuration:**
  - max_connections=100 (matches production)
  - SSL enabled
  - Logging enabled for development
  - Point-in-time recovery ready

#### Redis Cache (Optional)

- **Image:** redis:7-alpine
- **Container:** aura-redis-dev
- **Port:** 6379:6379
- **Configuration:**
  - 256MB memory limit
  - Persistence enabled
  - LRU eviction policy

### Volume Mounts

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data # Database storage
  - ./db/init:/docker-entrypoint-initdb.d # Init scripts
  - ./db/migrations/production:/docker-entrypoint-initdb.d/migrations # Migrations
  - ./scripts/db:/docker-entrypoint-initdb.d/scripts # Seed data scripts
```

## Development Seed Data

### Test Users

The local database includes three test users with complete data:

| User ID                                | Email                     | Purpose                               |
| -------------------------------------- | ------------------------- | ------------------------------------- |
| `11111111-1111-1111-1111-111111111111` | dev.user1@aura-test.local | Primary test user with complete data  |
| `22222222-2222-2222-2222-222222222222` | dev.user2@aura-test.local | Secondary user for multi-user testing |
| `33333333-3333-3333-3333-333333333333` | dev.user3@aura-test.local | User with conflict scenarios          |

### Test Data Includes

1. **Device Keys**
   - Encrypted master keys for each user
   - Different platforms (iOS, Android, Web)
   - Active key rotation schedules

2. **Encrypted Preferences**
   - User settings and configuration
   - Device-specific preferences
   - Version tracking for sync conflicts

3. **Encrypted Cycle Data**
   - Anonymized health tracking data
   - Multiple entries per user
   - Sync conflict examples

4. **Healthcare Sharing**
   - Active share tokens for testing
   - Expired shares for cleanup testing
   - Access audit trails

5. **Security Audit Logs**
   - Login events
   - Data sync operations
   - Healthcare sharing activities
   - Privacy-safe logging examples

### Available Share Tokens

For testing healthcare sharing functionality:

- **Token 1:** `dev_share_token_1234567890abcdef1234567890abcdef`
  - User: User 1
  - Expires: 24 hours from database creation
  - Access count: 3

- **Token 2:** `dev_share_token_abcdef1234567890abcdef1234567890`
  - User: User 2
  - Expires: 48 hours from database creation
  - Access count: 1

## Management Scripts

### Database Reset Script

**File:** `scripts/db/reset-local-db.sh`

Completely resets the local database with fresh migrations and seed data.

```bash
# Interactive reset with confirmation
./scripts/db/reset-local-db.sh

# Force reset without confirmation
./scripts/db/reset-local-db.sh --force
```

**Process:**

1. Stops and removes containers
2. Removes data volumes
3. Starts fresh containers
4. Runs all migrations in order
5. Loads development seed data
6. Validates database setup
7. Runs RLS policy validation

### Database Connection Script

**File:** `scripts/db/connect-local-db.sh`

Provides multiple ways to interact with the local database.

```bash
# Connect to psql interactive console
./scripts/db/connect-local-db.sh
./scripts/db/connect-local-db.sh connect

# Show database status and statistics
./scripts/db/connect-local-db.sh status

# Show development users and share tokens
./scripts/db/connect-local-db.sh users

# Run database validation tests
./scripts/db/connect-local-db.sh test

# Execute SQL command
./scripts/db/connect-local-db.sh exec "SELECT COUNT(*) FROM users"

# Execute SQL file
./scripts/db/connect-local-db.sh file ./my-query.sql

# Show recent database logs
./scripts/db/connect-local-db.sh logs
```

## Database Schema

The local database mirrors production exactly:

### Core Tables

- `users` - User identification (minimal metadata)
- `encrypted_user_prefs` - Client-encrypted user preferences
- `encrypted_cycle_data` - Client-encrypted health data
- `healthcare_share` - Healthcare sharing configuration
- `share_token` - Anonymous access tokens
- `device_key` - Secure key management

### Audit Tables

- `security_audit_log` - Security event logging
- `healthcare_share_audit` - Healthcare sharing activity

### Auth Simulation

- `auth.users` - Simulated Supabase auth users
- `auth.uid()` - Function to simulate current user
- `auth.role()` - Function to simulate user role

## RLS Policy Testing

### Automatic Validation

The reset script automatically runs RLS validation to ensure:

- Complete user isolation
- Service role restrictions
- Anonymous access controls
- Healthcare sharing security

### Manual RLS Testing

```bash
# Run comprehensive RLS validation
./scripts/migrations/validate-rls.sh development
```

### Test Scenarios

The validation includes:

1. **User Isolation Tests**
   - Users can only access their own data
   - Cross-user data access prevention
   - Authenticated user requirements

2. **Service Role Restrictions**
   - Zero access to user data (zero-knowledge principle)
   - Limited system table access
   - Audit log insertion permissions

3. **Anonymous Access**
   - Public data restrictions
   - Healthcare share token validation
   - Expired token handling

## Development Workflows

### Starting Development

```bash
# 1. Start database
docker-compose up -d postgres

# 2. Check status
./scripts/db/connect-local-db.sh status

# 3. Connect and explore
./scripts/db/connect-local-db.sh
```

### Testing Changes

```bash
# 1. Make schema changes
# 2. Create new migration file
# 3. Test migration
./scripts/migrations/run-migration.sh development new_migration.sql

# 4. Reset database to test full setup
./scripts/db/reset-local-db.sh --force

# 5. Validate RLS policies
./scripts/migrations/validate-rls.sh development
```

### Debugging Issues

```bash
# View recent logs
./scripts/db/connect-local-db.sh logs

# Check database health
./scripts/db/connect-local-db.sh test

# Inspect specific data
./scripts/db/connect-local-db.sh users

# Connect for manual investigation
./scripts/db/connect-local-db.sh connect
```

### Cleaning Up

```bash
# Stop database
docker-compose down

# Remove all data (full cleanup)
docker-compose down --volumes
docker volume rm aura_postgres_data aura_redis_data
```

## Performance Configuration

The local database is configured to match production performance characteristics:

- **Connection pooling:** 100 max connections
- **Logging:** All statements with 1000ms threshold
- **SSL:** Enabled with self-signed certificates
- **Extensions:** Same as Supabase (uuid-ossp, pgcrypto, pgjwt)
- **Memory settings:** Development-optimized

## Troubleshooting

### Database Won't Start

```bash
# Check container status
docker-compose ps

# View startup logs
docker-compose logs postgres

# Reset containers
docker-compose down --volumes
docker-compose up -d postgres
```

### Connection Refused

```bash
# Check if port is available
netstat -an | grep 54322

# Verify container is running
docker-compose ps postgres

# Test connection manually
docker-compose exec postgres pg_isready -U postgres -d aura_dev
```

### Migration Failures

```bash
# Check migration logs
ls -la logs/migrations/

# Reset database completely
./scripts/db/reset-local-db.sh --force

# Run specific migration manually
docker-compose exec postgres psql -U postgres -d aura_dev -f /docker-entrypoint-initdb.d/migrations/filename.sql
```

### RLS Policy Issues

```bash
# Run RLS validation
./scripts/migrations/validate-rls.sh development

# Check policy definitions
./scripts/db/connect-local-db.sh exec "SELECT * FROM pg_policies"

# Test specific policy
./scripts/db/connect-local-db.sh exec "SET local role authenticated; SET request.jwt.claim.sub TO '11111111-1111-1111-1111-111111111111'; SELECT COUNT(*) FROM encrypted_cycle_data;"
```

### Data Issues

```bash
# Check data counts
./scripts/db/connect-local-db.sh status

# View test users
./scripts/db/connect-local-db.sh users

# Reload seed data
./scripts/db/reset-local-db.sh --force
```

## Integration with Application

### Environment Variables

Set these in your `.env.local`:

```bash
# Local database connection
DATABASE_URL=postgresql://postgres:postgres_dev_password@localhost:54322/aura_dev

# Redis cache (optional)
REDIS_URL=redis://localhost:6379

# Development flags
NODE_ENV=development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_local_anon_key
```

### Application Configuration

Your app should detect the local environment and use:

- Local database connection
- Development logging levels
- Test data awareness
- Local authentication simulation

## Security Considerations

### Development vs Production

The local database:

- ✅ Uses same RLS policies as production
- ✅ Enforces zero-knowledge architecture
- ✅ Tests complete user isolation
- ⚠️ Uses weaker passwords (development only)
- ⚠️ Uses self-signed SSL certificates
- ⚠️ Contains obvious test data identifiers

### Safe Practices

- Never use production credentials locally
- Test data uses clearly fake identifiers
- All health data is anonymized/encrypted
- Connection details are development-specific
- Database runs in isolated Docker network

---

This local development database environment provides a secure, production-like testing environment for developing the Aura healthcare application while maintaining the zero-knowledge architecture and privacy principles.
