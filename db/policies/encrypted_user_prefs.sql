-- RLS Policies for encrypted_user_prefs table
-- Description: Encrypted user preferences with strict user isolation
-- Author: Dev Agent (Story 1.1)

-- ==================================================================
-- ENCRYPTED_USER_PREFS TABLE RLS POLICIES
-- ==================================================================

-- Enable RLS
ALTER TABLE encrypted_user_prefs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "encrypted_user_prefs_user_isolation" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_insert" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_update" ON encrypted_user_prefs;
DROP POLICY IF EXISTS "encrypted_user_prefs_delete" ON encrypted_user_prefs;

-- SELECT: Users can only access their own encrypted preferences
CREATE POLICY "encrypted_user_prefs_user_isolation"
ON encrypted_user_prefs FOR SELECT
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
);

-- INSERT: Users can only insert their own encrypted preferences
CREATE POLICY "encrypted_user_prefs_insert"
ON encrypted_user_prefs FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    -- Validate crypto envelope structure
    validate_crypto_envelope(crypto_envelope) AND
    -- Ensure encrypted payload is not empty
    length(encrypted_payload) > 0 AND
    -- Ensure device_id is provided
    length(device_id) > 0 AND
    -- Ensure version is positive
    version > 0
);

-- UPDATE: Users can only update their own encrypted preferences
CREATE POLICY "encrypted_user_prefs_update"
ON encrypted_user_prefs FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
)
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    -- Prevent changing user_id
    OLD.user_id = NEW.user_id AND
    -- Validate crypto envelope structure
    validate_crypto_envelope(NEW.crypto_envelope) AND
    -- Ensure encrypted payload is not empty
    length(NEW.encrypted_payload) > 0 AND
    -- Ensure version progression (optimistic concurrency)
    NEW.version > OLD.version
);

-- DELETE: Users can only delete their own encrypted preferences
CREATE POLICY "encrypted_user_prefs_delete"
ON encrypted_user_prefs FOR DELETE
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
);

-- ==================================================================
-- SERVICE ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all privileges from service role
REVOKE ALL ON encrypted_user_prefs FROM service_role;

-- Service role has NO access to encrypted user preferences
-- This ensures zero-knowledge principle - server cannot access user data

-- ==================================================================
-- ANONYMOUS ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all access from anonymous role
REVOKE ALL ON encrypted_user_prefs FROM anon;

-- Anonymous users have NO access to any user preferences

-- ==================================================================
-- SECURITY VALIDATIONS
-- ==================================================================

-- Additional security checks can be added here
-- These would be triggered before any DML operations

-- Create function to log preference access for security audit
CREATE OR REPLACE FUNCTION audit_preference_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log successful access without exposing sensitive data
    INSERT INTO security_audit_log (
        user_id, 
        event_type, 
        event_data,
        device_id_hash,
        success
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP || '_encrypted_user_prefs',
        jsonb_build_object(
            'table', 'encrypted_user_prefs',
            'operation', TG_OP,
            'version', COALESCE(NEW.version, OLD.version),
            'device_id_present', CASE WHEN COALESCE(NEW.device_id, OLD.device_id) IS NOT NULL THEN true ELSE false END
        ),
        left(encode(digest(COALESCE(NEW.device_id, OLD.device_id), 'sha256'), 'hex'), 16),
        true
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for all operations
CREATE TRIGGER audit_encrypted_user_prefs_access
    AFTER INSERT OR UPDATE OR DELETE ON encrypted_user_prefs
    FOR EACH ROW EXECUTE PROCEDURE audit_preference_access();

-- ==================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================

COMMENT ON POLICY "encrypted_user_prefs_user_isolation" ON encrypted_user_prefs IS 
'Users can only SELECT their own encrypted preferences via auth.uid() validation';

COMMENT ON POLICY "encrypted_user_prefs_insert" ON encrypted_user_prefs IS 
'Users can INSERT their own encrypted preferences with crypto envelope validation';

COMMENT ON POLICY "encrypted_user_prefs_update" ON encrypted_user_prefs IS 
'Users can UPDATE their own encrypted preferences with version control and validation';

COMMENT ON POLICY "encrypted_user_prefs_delete" ON encrypted_user_prefs IS 
'Users can DELETE their own encrypted preferences';

COMMENT ON FUNCTION audit_preference_access IS 
'Audit trigger for encrypted user preferences access (privacy-safe logging)';

COMMENT ON TRIGGER audit_encrypted_user_prefs_access ON encrypted_user_prefs IS 
'Logs all access to encrypted user preferences for security monitoring';