# Database Migration Framework

Comprehensive database migration system for Aura with Supabase CLI integration, RLS validation, and rollback procedures.

## Overview

This migration framework provides:

- ✅ Structured migration management with versioning
- ✅ Automated RLS policy validation
- ✅ Pre and post-migration checks
- ✅ Rollback procedures for development
- ✅ Environment-specific migration support
- ✅ Comprehensive logging and reporting

## Directory Structure

```
db/
├── migrations/
│   ├── production/           # Production-ready migration files
│   │   ├── 20250909001_initial_schema.sql
│   │   ├── 20250909002_rls_policies.sql
│   │   ├── 20250909003_rpc_functions.sql
│   │   └── 20250909004_performance_indexes.sql
│   ├── policies/             # RLS policy definitions (for reference)
│   └── README.md            # This file
├── functions/               # RPC function definitions
└── init/                   # Initial setup scripts
```

## Migration Naming Convention

Migrations follow the naming pattern: `YYYYMMDDNNN_description.sql`

- `YYYY`: Year (4 digits)
- `MM`: Month (2 digits)
- `DD`: Day (2 digits)
- `NNN`: Sequential number (3 digits, starting from 001)
- `description`: Brief description using snake_case

**Examples:**

- `20250909001_initial_schema.sql`
- `20250909002_rls_policies.sql`
- `20250910001_add_user_preferences.sql`

## Available Migrations

### 1. Initial Schema Migration (`20250909001_initial_schema.sql`)

Creates the core database schema with all required tables:

- `users` - User identification with minimal metadata
- `encrypted_user_prefs` - Encrypted user preferences
- `encrypted_cycle_data` - Encrypted cycle tracking data
- `healthcare_share` - Healthcare sharing configuration
- `share_token` - Token-based sharing access
- `device_key` - Secure device key management
- `security_audit_log` - Security event logging
- `healthcare_share_audit` - Healthcare sharing audit trail

**Features:**

- UUID primary keys for all tables
- Proper foreign key constraints
- Check constraints for data validation
- Automatic timestamp triggers
- Performance indexes
- RLS enabled on all tables

### 2. RLS Policies Migration (`20250909002_rls_policies.sql`)

Implements comprehensive Row Level Security policies:

- User isolation policies (users can only access their own data)
- Service role restrictions (zero-knowledge principle)
- Anonymous role restrictions (public access control)
- Healthcare sharing token validation
- Audit trail access controls

**Security Features:**

- Complete user data isolation using `auth.uid()`
- Service role cannot access user data (zero-knowledge)
- Token-based anonymous access for healthcare sharing
- Audit trails with privacy-safe logging

### 3. RPC Functions Migration (`20250909003_rpc_functions.sql`)

Creates secure RPC functions for complex operations:

- `update_cycle_data_optimistic()` - Optimistic concurrency control
- `validate_share_token()` - Secure token validation
- `healthcare_access_audit()` - Privacy-safe audit logging
- `rotate_device_key()` - Secure key rotation

**Function Features:**

- Proper authentication checks
- Version conflict detection
- Comprehensive error handling
- Audit trail integration
- Privacy-safe logging

### 4. Performance Indexes Migration (`20250909004_performance_indexes.sql`)

Optimizes database performance with targeted indexes:

- Composite indexes for RLS queries
- Covering indexes for common queries
- Partial indexes for maintenance tasks
- Hash indexes for exact matches
- Cleanup indexes for expired data

**Performance Features:**

- RLS-optimized query performance
- Efficient sync conflict resolution
- Fast healthcare token validation
- Automated cleanup support

## Usage

### Running Migrations

Use the migration runner script for all environments:

```bash
# Run all pending migrations in development
./scripts/migrations/run-migration.sh development

# Run specific migration in development
./scripts/migrations/run-migration.sh development 20250909001_initial_schema.sql

# Run migrations in staging
./scripts/migrations/run-migration.sh staging

# Run migrations in production
./scripts/migrations/run-migration.sh production
```

### Validating RLS Policies

Run comprehensive RLS validation to ensure security:

```bash
# Validate RLS policies in development
./scripts/migrations/validate-rls.sh development

# Validate RLS policies in staging
./scripts/migrations/validate-rls.sh staging
```

### Migration Validation

The migration system includes automatic validation:

**Pre-migration checks:**

- Database connectivity
- SQL syntax validation
- Migration file naming convention
- Required dependencies

**Post-migration checks:**

- Table existence validation
- RLS policy verification
- Index creation confirmation
- Function availability

### Creating New Migrations

1. **Create migration file:**

   ```bash
   # Create new migration file with proper naming
   touch db/migrations/production/$(date +'%Y%m%d')001_your_description.sql
   ```

2. **Follow migration template:**

   ```sql
   -- Migration: YYYYMMDDNNN_description.sql
   -- Description: Brief description of what this migration does
   -- Author: Your Name
   -- Created: YYYY-MM-DD

   -- Your migration SQL here
   ```

3. **Test migration:**

   ```bash
   # Test in development first
   ./scripts/migrations/run-migration.sh development your_migration.sql

   # Validate RLS policies if applicable
   ./scripts/migrations/validate-rls.sh development
   ```

## Security Best Practices

### Row Level Security (RLS)

- All user data tables have RLS enabled
- Policies enforce `user_id = auth.uid()` for user isolation
- Service role has zero access to user data (zero-knowledge principle)
- Anonymous users can only access healthcare sharing tokens

### Audit Trail

- All security-sensitive operations are logged
- Privacy-safe logging (no PII/health data in logs)
- IP addresses are hashed for correlation
- Device IDs are hashed for privacy

### Crypto Integration

- All encrypted tables use CryptoEnvelope structure
- Server never accesses plaintext health data
- Proper Additional Authenticated Data (AAD) support
- Version-based optimistic concurrency control

## Troubleshooting

### Common Issues

1. **Migration fails with syntax error:**
   - Check SQL syntax using `supabase db lint`
   - Ensure migration follows naming convention
   - Verify all dependencies exist

2. **RLS validation fails:**
   - Check if RLS is enabled on all tables
   - Verify policy names and conditions
   - Ensure `auth.uid()` is used correctly

3. **Performance issues after migration:**
   - Run `ANALYZE` on affected tables
   - Check if indexes are being used
   - Review query execution plans

### Recovery Procedures

1. **Development rollback:**

   ```bash
   # Reset local database
   supabase db reset

   # Re-run migrations
   ./scripts/migrations/run-migration.sh development
   ```

2. **Production rollback:**
   - Production rollbacks require manual intervention
   - Check migration logs for specific changes made
   - Create reverse migration if needed
   - Contact database administrator

### Monitoring

Check migration logs in `logs/migrations/` directory:

- Migration execution logs
- RLS validation reports
- Performance analysis results
- Error details and recovery steps

## Environment Configuration

### Development

- Local Supabase instance
- Full logging enabled
- Rollback procedures available
- RLS validation after each migration

### Staging

- Production-like environment
- Limited logging (privacy-safe only)
- Manual rollback procedures
- Full RLS validation required

### Production

- Live environment
- Privacy-safe logging only
- No automatic rollback
- Comprehensive validation required

## Migration Checklist

Before running migrations in production:

- [ ] Migration tested in development
- [ ] Migration tested in staging
- [ ] RLS policies validated
- [ ] Performance impact assessed
- [ ] Rollback plan documented
- [ ] Backup created
- [ ] Security review completed
- [ ] Team notification sent

## Support

For migration issues or questions:

1. Check troubleshooting section above
2. Review migration logs in `logs/migrations/`
3. Run RLS validation to identify security issues
4. Contact development team for production issues

---

**Note:** This migration framework implements zero-knowledge architecture where the server cannot access plaintext health data. All migrations maintain this security principle.
