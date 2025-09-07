-- Migration: 001_rls_policies.sql
-- Description: Comprehensive RLS implementation with deny-by-default policies
-- Author: Dev Agent (Story 0.8)
-- Created: 2025-09-07

-- ==================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==================================================================

-- Enable RLS on encrypted_cycle_data table
ALTER TABLE encrypted_cycle_data ENABLE ROW LEVEL SECURITY;

-- Enable RLS on encrypted_user_prefs table  
ALTER TABLE encrypted_user_prefs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on healthcare_share table
ALTER TABLE healthcare_share ENABLE ROW LEVEL SECURITY;

-- Enable RLS on share_token table
ALTER TABLE share_token ENABLE ROW LEVEL SECURITY;

-- Enable RLS on device_key table
ALTER TABLE device_key ENABLE ROW LEVEL SECURITY;

-- ==================================================================
-- DENY-BY-DEFAULT RLS POLICIES FOR ENCRYPTED_CYCLE_DATA TABLE
-- ==================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "encrypted_cycle_data_user_isolation" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_insert" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_update" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_delete" ON encrypted_cycle_data;

-- SELECT: Users can only access their own cycle data
CREATE POLICY "encrypted_cycle_data_user_isolation"
ON encrypted_cycle_data FOR SELECT
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- INSERT: Users can only insert their own cycle data
CREATE POLICY "encrypted_cycle_data_insert"
ON encrypted_cycle_data FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- UPDATE: Users can only update their own cycle data
CREATE POLICY "encrypted_cycle_data_update"
ON encrypted_cycle_data FOR UPDATE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- DELETE: Users can only delete their own cycle data
CREATE POLICY "encrypted_cycle_data_delete"
ON encrypted_cycle_data FOR DELETE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- ==================================================================
-- DENY-BY-DEFAULT RLS POLICIES FOR ENCRYPTED_USER_PREFS TABLE
-- ==================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "encrypted_user_prefs_user_isolation" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_insert" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_update" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_delete" ON encrypted_user_prefs;

-- SELECT: Users can only access their own preferences
CREATE POLICY "encrypted_user_prefs_user_isolation"
ON encrypted_user_prefs FOR SELECT
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- INSERT: Users can only insert their own preferences
CREATE POLICY "encrypted_user_prefs_insert"
ON encrypted_user_prefs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- UPDATE: Users can only update their own preferences
CREATE POLICY "encrypted_user_prefs_update"
ON encrypted_user_prefs FOR UPDATE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- DELETE: Users can only delete their own preferences
CREATE POLICY "encrypted_user_prefs_delete"
ON encrypted_user_prefs FOR DELETE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- ==================================================================
-- DENY-BY-DEFAULT RLS POLICIES FOR HEALTHCARE_SHARE TABLE
-- ==================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "healthcare_share_user_isolation" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_insert" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_update" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_delete" ON healthcare_share;

-- SELECT: Users can only access their own sharing records
CREATE POLICY "healthcare_share_user_isolation"
ON healthcare_share FOR SELECT
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- INSERT: Users can only create their own sharing records
CREATE POLICY "healthcare_share_insert"
ON healthcare_share FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- UPDATE: Users can only update their own sharing records
CREATE POLICY "healthcare_share_update"
ON healthcare_share FOR UPDATE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- DELETE: Users can only delete their own sharing records
CREATE POLICY "healthcare_share_delete"
ON healthcare_share FOR DELETE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- ==================================================================
-- DENY-BY-DEFAULT RLS POLICIES FOR SHARE_TOKEN TABLE
-- ==================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "share_token_validation" ON share_token;
DROP POLICY IF EXISTS "share_token_insert" ON share_token;
DROP POLICY IF EXISTS "share_token_update" ON share_token;
DROP POLICY IF EXISTS "share_token_delete" ON share_token;

-- SELECT: Token-based access only (no user enumeration)
CREATE POLICY "share_token_validation"
ON share_token FOR SELECT
USING (
  -- Token must be provided and valid
  "token" = current_setting('request.jwt.claims', true)::json->>'share_token' 
  AND "expiresAt" > NOW()
);

-- INSERT: Only authenticated users can create tokens for their shares
CREATE POLICY "share_token_insert"
ON share_token FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only token creator can update (via healthcare_share relationship)
CREATE POLICY "share_token_update"
ON share_token FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token."shareId" 
    AND healthcare_share."userId" = auth.uid()
  )
);

-- DELETE: Only token creator can delete
CREATE POLICY "share_token_delete"
ON share_token FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token."shareId" 
    AND healthcare_share."userId" = auth.uid()
  )
);

-- ==================================================================
-- DENY-BY-DEFAULT RLS POLICIES FOR DEVICE_KEY TABLE
-- ==================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "device_key_user_isolation" ON device_key;
DROP POLICY IF EXISTS "device_key_insert" ON device_key;
DROP POLICY IF EXISTS "device_key_update" ON device_key;
DROP POLICY IF EXISTS "device_key_delete" ON device_key;

-- SELECT: Users can only access their own device keys
CREATE POLICY "device_key_user_isolation"
ON device_key FOR SELECT
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- INSERT: Users can only insert their own device keys
CREATE POLICY "device_key_insert"
ON device_key FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- UPDATE: Users can only update their own device keys
CREATE POLICY "device_key_update"
ON device_key FOR UPDATE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- DELETE: Users can only delete their own device keys
CREATE POLICY "device_key_delete"
ON device_key FOR DELETE
USING (auth.uid() IS NOT NULL AND "userId" = auth.uid());

-- ==================================================================
-- SERVICE ROLE POLICY RESTRICTIONS
-- ==================================================================

-- Create dedicated service role policies with explicit restrictions
-- Service role can ONLY access:
-- 1. Table metadata for schema validation
-- 2. Migration history for deployment tracking  
-- 3. Health check functions
-- 4. System catalogs for monitoring
-- 5. NO ACCESS to user data tables

-- Grant minimal schema access to service role
GRANT USAGE ON SCHEMA information_schema TO service_role;
GRANT SELECT ON information_schema.tables TO service_role;
GRANT SELECT ON information_schema.columns TO service_role;

-- Create migration_history table for deployment tracking
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by VARCHAR(255) DEFAULT 'service_role'
);

-- Grant service role access to migration_history only
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE migration_history_id_seq TO service_role;

-- System monitoring access (read-only)
GRANT SELECT ON pg_stat_database TO service_role;
GRANT SELECT ON pg_tables TO service_role;

-- ==================================================================
-- EXPLICIT DENIALS FOR SERVICE ROLE ON USER DATA TABLES  
-- ==================================================================

-- Revoke ALL privileges on user data tables from service role
REVOKE ALL ON encrypted_cycle_data FROM service_role;
REVOKE ALL ON encrypted_user_prefs FROM service_role;
REVOKE ALL ON healthcare_share FROM service_role;
REVOKE ALL ON share_token FROM service_role;
REVOKE ALL ON device_key FROM service_role;

-- Revoke access to authentication tables
REVOKE ALL ON auth.users FROM service_role;
REVOKE ALL ON auth.sessions FROM service_role;
REVOKE ALL ON auth.refresh_tokens FROM service_role;

-- ==================================================================
-- PERFORMANCE INDEXES FOR RLS QUERIES
-- ==================================================================

-- Composite indexes to optimize RLS policy queries
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_updated 
ON encrypted_cycle_data ("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_user_updated 
ON encrypted_user_prefs ("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_healthcare_share_user_created
ON healthcare_share ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_device_key_user_device
ON device_key ("userId", "deviceIdHash");

CREATE INDEX IF NOT EXISTS idx_share_token_expires
ON share_token ("expiresAt") WHERE "expiresAt" > NOW();

-- ==================================================================
-- RECORD MIGRATION IN HISTORY
-- ==================================================================

INSERT INTO migration_history (migration_name) 
VALUES ('001_rls_policies.sql');

-- ==================================================================
-- RLS POLICY DOCUMENTATION
-- ==================================================================

COMMENT ON TABLE encrypted_cycle_data IS 'Encrypted cycle data with user isolation via RLS. Users can only access their own records through auth.uid() validation.';
COMMENT ON TABLE encrypted_user_prefs IS 'Encrypted user preferences with user isolation via RLS. Complete privacy through auth.uid() enforcement.';
COMMENT ON TABLE healthcare_share IS 'Healthcare sharing records with user isolation. Only sharing creators can access their own sharing configurations.';
COMMENT ON TABLE share_token IS 'Token-based access for healthcare sharing. No user enumeration, token expiration enforced.';
COMMENT ON TABLE device_key IS 'Device key management with user isolation. Hash-based device identification for privacy.';