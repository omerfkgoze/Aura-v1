-- RLS Policies for encrypted_cycle_data table
-- Description: Encrypted cycle data with user isolation and sync support
-- Author: Dev Agent (Story 1.1)

-- ==================================================================
-- ENCRYPTED_CYCLE_DATA TABLE RLS POLICIES
-- ==================================================================

-- Enable RLS
ALTER TABLE encrypted_cycle_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "encrypted_cycle_data_user_isolation" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_insert" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_update" ON encrypted_cycle_data;
DROP POLICY IF EXISTS "encrypted_cycle_data_delete" ON encrypted_cycle_data;

-- SELECT: Users can only access their own encrypted cycle data
CREATE POLICY "encrypted_cycle_data_user_isolation"
ON encrypted_cycle_data FOR SELECT
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
);

-- INSERT: Users can only insert their own encrypted cycle data
CREATE POLICY "encrypted_cycle_data_insert"
ON encrypted_cycle_data FOR INSERT
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
    version > 0 AND
    -- Validate local timestamp is reasonable (not too far in future)
    local_timestamp <= now() + interval '1 hour' AND
    -- Validate sync status is valid
    sync_status IN ('pending', 'synced', 'conflict')
);

-- UPDATE: Users can only update their own encrypted cycle data
CREATE POLICY "encrypted_cycle_data_update"
ON encrypted_cycle_data FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
)
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    -- Prevent changing user_id
    OLD.user_id = NEW.user_id AND
    -- Prevent changing id
    OLD.id = NEW.id AND
    -- Validate crypto envelope structure if changed
    (OLD.crypto_envelope = NEW.crypto_envelope OR validate_crypto_envelope(NEW.crypto_envelope)) AND
    -- Ensure encrypted payload is not empty if changed
    (OLD.encrypted_payload = NEW.encrypted_payload OR length(NEW.encrypted_payload) > 0) AND
    -- Version can only increase (optimistic concurrency) or stay same for status updates
    NEW.version >= OLD.version AND
    -- Validate sync status transitions
    CASE 
        WHEN OLD.sync_status = 'synced' AND NEW.sync_status = 'conflict' THEN true
        WHEN OLD.sync_status = 'pending' AND NEW.sync_status = 'synced' THEN true
        WHEN OLD.sync_status = 'conflict' AND NEW.sync_status IN ('synced', 'pending') THEN true
        WHEN OLD.sync_status = NEW.sync_status THEN true
        ELSE false
    END
);

-- DELETE: Users can only delete their own encrypted cycle data
CREATE POLICY "encrypted_cycle_data_delete"
ON encrypted_cycle_data FOR DELETE
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
);

-- ==================================================================
-- SERVICE ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all privileges from service role
REVOKE ALL ON encrypted_cycle_data FROM service_role;

-- Service role has NO access to encrypted cycle data
-- This ensures zero-knowledge principle - server cannot access health data

-- ==================================================================
-- ANONYMOUS ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all access from anonymous role
REVOKE ALL ON encrypted_cycle_data FROM anon;

-- Anonymous users have NO access to any cycle data

-- ==================================================================
-- SYNC CONFLICT DETECTION AND RESOLUTION
-- ==================================================================

-- Function to detect sync conflicts
CREATE OR REPLACE FUNCTION detect_sync_conflicts()
RETURNS TRIGGER AS $$
DECLARE
    conflict_count integer;
BEGIN
    -- Check for existing records with same sync_hash but different version
    SELECT COUNT(*) INTO conflict_count
    FROM encrypted_cycle_data 
    WHERE 
        user_id = NEW.user_id AND
        sync_hash = NEW.sync_hash AND
        version != NEW.version AND
        id != NEW.id;
    
    -- If conflict detected, mark as conflict
    IF conflict_count > 0 THEN
        NEW.sync_status = 'conflict';
        NEW.resolution_status = 'pending';
        NEW.conflict_data = jsonb_build_object(
            'detected_at', now(),
            'conflict_type', 'version_mismatch',
            'device_id', NEW.device_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conflict detection
CREATE TRIGGER detect_cycle_data_conflicts
    BEFORE INSERT OR UPDATE ON encrypted_cycle_data
    FOR EACH ROW EXECUTE PROCEDURE detect_sync_conflicts();

-- Function to audit cycle data access
CREATE OR REPLACE FUNCTION audit_cycle_data_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log access without exposing sensitive health data
    INSERT INTO security_audit_log (
        user_id, 
        event_type, 
        event_data,
        device_id_hash,
        success
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP || '_encrypted_cycle_data',
        jsonb_build_object(
            'table', 'encrypted_cycle_data',
            'operation', TG_OP,
            'version', COALESCE(NEW.version, OLD.version),
            'sync_status', COALESCE(NEW.sync_status, OLD.sync_status),
            'has_conflict', CASE WHEN COALESCE(NEW.resolution_status, OLD.resolution_status) = 'pending' THEN true ELSE false END,
            'device_id_present', CASE WHEN COALESCE(NEW.device_id, OLD.device_id) IS NOT NULL THEN true ELSE false END
        ),
        left(encode(digest(COALESCE(NEW.device_id, OLD.device_id), 'sha256'), 'hex'), 16),
        true
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for all cycle data operations
CREATE TRIGGER audit_encrypted_cycle_data_access
    AFTER INSERT OR UPDATE OR DELETE ON encrypted_cycle_data
    FOR EACH ROW EXECUTE PROCEDURE audit_cycle_data_access();

-- ==================================================================
-- PERFORMANCE OPTIMIZATION FOR RLS QUERIES
-- ==================================================================

-- Ensure indexes exist for RLS policy performance
-- These indexes optimize the auth.uid() = user_id queries

-- Already created in schema, but ensuring they exist:
-- CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_id ON encrypted_cycle_data (user_id);
-- CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_updated ON encrypted_cycle_data (user_id, updated_at DESC);

-- Additional index for sync operations
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_sync_status ON encrypted_cycle_data (user_id, sync_status, synced_at DESC);

-- ==================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================

COMMENT ON POLICY "encrypted_cycle_data_user_isolation" ON encrypted_cycle_data IS 
'Users can only SELECT their own encrypted cycle data via auth.uid() validation';

COMMENT ON POLICY "encrypted_cycle_data_insert" ON encrypted_cycle_data IS 
'Users can INSERT their own encrypted cycle data with validation and sync support';

COMMENT ON POLICY "encrypted_cycle_data_update" ON encrypted_cycle_data IS 
'Users can UPDATE their own encrypted cycle data with version control and sync status management';

COMMENT ON POLICY "encrypted_cycle_data_delete" ON encrypted_cycle_data IS 
'Users can DELETE their own encrypted cycle data';

COMMENT ON FUNCTION detect_sync_conflicts IS 
'Automatically detects sync conflicts and marks records for resolution';

COMMENT ON FUNCTION audit_cycle_data_access IS 
'Audit trigger for encrypted cycle data access (privacy-safe logging without health data)';

COMMENT ON TRIGGER detect_cycle_data_conflicts ON encrypted_cycle_data IS 
'Automatic sync conflict detection for multi-device synchronization';

COMMENT ON TRIGGER audit_encrypted_cycle_data_access ON encrypted_cycle_data IS 
'Logs all access to encrypted cycle data for security monitoring';