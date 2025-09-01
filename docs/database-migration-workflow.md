# Database Migration Workflow

This document describes the database migration workflow for the Aura app.

## Overview

We use Supabase CLI to manage database schema changes through migrations. This ensures consistent database state across development, staging, and production environments.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Environment variables configured
- Database access permissions

## Development Workflow

### 1. Local Development

```bash
# Start local Supabase
supabase start

# Create a new migration
supabase migration new add_cycle_data_table

# Edit the migration file in supabase/migrations/
# Apply migrations locally
supabase db reset
```

### 2. Creating Migrations

```bash
# Create a new migration with descriptive name
supabase migration new add_user_preferences_table

# Edit the generated file
# Example: supabase/migrations/20240101000000_add_user_preferences_table.sql
```

### 3. Testing Migrations

```bash
# Reset local database and apply all migrations
supabase db reset

# Verify schema changes
supabase db diff

# Run application tests
npm test
```

## Production Deployment

### 1. Link to Production Project

```bash
# Link to Supabase project (one-time setup)
supabase link --project-ref YOUR_PROJECT_REF

# Verify connection
supabase status
```

### 2. Deploy Migrations

```bash
# Push migrations to production
supabase db push

# Verify deployment
supabase db diff --linked
```

## Migration Best Practices

### 1. Always Include RLS

```sql
-- Enable RLS on all user tables
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies
CREATE POLICY "policy_name"
  ON public.your_table
  FOR ALL
  USING (auth.uid() = user_id);
```

### 2. Use Transactions

```sql
-- Wrap complex changes in transactions
BEGIN;

-- Your schema changes here
CREATE TABLE ...;
ALTER TABLE ...;

-- Verify changes before committing
COMMIT;
```

### 3. Add Proper Indexes

```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_table_user_id
  ON public.your_table(user_id);

CREATE INDEX CONCURRENTLY idx_table_created_at
  ON public.your_table(created_at);
```

### 4. Include Data Validation

```sql
-- Add constraints for data integrity
ALTER TABLE public.your_table
  ADD CONSTRAINT check_positive_value
  CHECK (value > 0);
```

## Rollback Strategy

### 1. Emergency Rollback

```bash
# Create rollback migration
supabase migration new rollback_problematic_change

# Implement reverse changes in the new migration
# Deploy the rollback
supabase db push
```

### 2. Local Rollback

```bash
# Reset to a specific migration
supabase db reset --to-migration 20240101000000
```

## Troubleshooting

### Common Issues

1. **Migration conflicts**: Resolve by creating a new migration
2. **Permission errors**: Verify database user permissions
3. **Connection issues**: Check environment variables and network

### Debug Commands

```bash
# Check current migration status
supabase migration list

# View database diff
supabase db diff

# Check connection status
supabase status

# View logs
supabase logs -f
```

## Environment Variables

Required environment variables for migrations:

```bash
# Local development
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
```

## Security Considerations

1. **Never disable RLS** on tables containing user data
2. **Always use service role key** for migrations
3. **Test RLS policies** thoroughly before deployment
4. **Audit migration changes** in production
5. **Backup database** before major schema changes

## Automation

The migration process can be automated in CI/CD:

```yaml
# GitHub Actions example
- name: Run migrations
  run: |
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```
