-- Migration: 20250909002_rls_policies.sql
-- Description: Comprehensive RLS policies with user isolation and zero-knowledge principle
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- USERS TABLE RLS POLICIES
-- ==================================================================

-- Users can only see their own record
CREATE POLICY "users_user_isolation"
ON users FOR SELECT
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Users can update their own record
CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (auth.uid() IS NOT NULL AND id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

-- ==================================================================
-- ENCRYPTED_USER_PREFS RLS POLICIES
-- ==================================================================

CREATE POLICY "encrypted_user_prefs_user_isolation"
ON encrypted_user_prefs FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_user_prefs_insert"
ON encrypted_user_prefs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_user_prefs_update"
ON encrypted_user_prefs FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_user_prefs_delete"
ON encrypted_user_prefs FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ==================================================================
-- ENCRYPTED_CYCLE_DATA RLS POLICIES
-- ==================================================================

CREATE POLICY "encrypted_cycle_data_user_isolation"
ON encrypted_cycle_data FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_cycle_data_insert"
ON encrypted_cycle_data FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_cycle_data_update"
ON encrypted_cycle_data FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "encrypted_cycle_data_delete"
ON encrypted_cycle_data FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ==================================================================
-- HEALTHCARE_SHARE RLS POLICIES
-- ==================================================================

CREATE POLICY "healthcare_share_user_isolation"
ON healthcare_share FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "healthcare_share_insert"
ON healthcare_share FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "healthcare_share_update"
ON healthcare_share FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "healthcare_share_delete"
ON healthcare_share FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ==================================================================
-- SHARE_TOKEN RLS POLICIES
-- ==================================================================

-- Token-based access only (no user enumeration)
CREATE POLICY "share_token_validation"
ON share_token FOR SELECT
USING (
  token IN (
    SELECT share_token FROM healthcare_share 
    WHERE status = 'active' AND expires_at > now()
  )
  AND expires_at > now()
);

-- Only authenticated users can create tokens for their shares
CREATE POLICY "share_token_insert"
ON share_token FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_id 
    AND healthcare_share.user_id = auth.uid()
  )
);

-- Only token creator can update
CREATE POLICY "share_token_update"
ON share_token FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token.share_id 
    AND healthcare_share.user_id = auth.uid()
  )
);

-- Only token creator can delete
CREATE POLICY "share_token_delete"
ON share_token FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token.share_id 
    AND healthcare_share.user_id = auth.uid()
  )
);

-- ==================================================================
-- DEVICE_KEY RLS POLICIES
-- ==================================================================

CREATE POLICY "device_key_user_isolation"
ON device_key FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "device_key_insert"
ON device_key FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "device_key_update"
ON device_key FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "device_key_delete"
ON device_key FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ==================================================================
-- AUDIT TRAIL RLS POLICIES
-- ==================================================================

-- Users can only see their own audit logs
CREATE POLICY "security_audit_log_user_isolation"
ON security_audit_log FOR SELECT
USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));

-- Only system can insert audit logs
CREATE POLICY "security_audit_log_system_insert"
ON security_audit_log FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Users can see audit logs for their shares
CREATE POLICY "healthcare_share_audit_user_isolation"
ON healthcare_share_audit FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_id 
    AND healthcare_share.user_id = auth.uid()
  )
);

-- Only system can insert share audit logs
CREATE POLICY "healthcare_share_audit_system_insert"
ON healthcare_share_audit FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ==================================================================
-- SERVICE ROLE RESTRICTIONS (ZERO-KNOWLEDGE PRINCIPLE)
-- ==================================================================

-- Create migration history table for service role
CREATE TABLE migration_history (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by VARCHAR(255) DEFAULT 'service_role'
);

-- Grant minimal access to service role
GRANT USAGE ON SCHEMA information_schema TO service_role;
GRANT SELECT ON information_schema.tables TO service_role;
GRANT SELECT ON information_schema.columns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON migration_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE migration_history_id_seq TO service_role;

-- System monitoring access
GRANT SELECT ON pg_stat_database TO service_role;
GRANT SELECT ON pg_tables TO service_role;

-- EXPLICIT DENIALS - Service role CANNOT access user data
REVOKE ALL ON users FROM service_role;
REVOKE ALL ON encrypted_cycle_data FROM service_role;
REVOKE ALL ON encrypted_user_prefs FROM service_role;
REVOKE ALL ON healthcare_share FROM service_role;
REVOKE ALL ON share_token FROM service_role;
REVOKE ALL ON device_key FROM service_role;

-- Grant only INSERT on audit tables for logging
GRANT INSERT ON security_audit_log TO service_role;
GRANT INSERT ON healthcare_share_audit TO service_role;