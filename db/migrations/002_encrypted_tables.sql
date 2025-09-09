-- Migration: 002_encrypted_tables.sql
-- Description: Additional encrypted table configurations and constraints
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- ADDITIONAL CONSTRAINTS AND VALIDATIONS
-- ==================================================================

-- Ensure crypto_envelope has required fields
ALTER TABLE encrypted_user_prefs 
ADD CONSTRAINT encrypted_user_prefs_envelope_fields_check 
CHECK (
    crypto_envelope ? 'algorithm' AND
    crypto_envelope ? 'keyId' AND
    crypto_envelope ? 'iv' AND
    jsonb_typeof(crypto_envelope->'algorithm') = 'string' AND
    jsonb_typeof(crypto_envelope->'keyId') = 'string' AND
    jsonb_typeof(crypto_envelope->'iv') = 'string'
);

ALTER TABLE encrypted_cycle_data 
ADD CONSTRAINT encrypted_cycle_data_envelope_fields_check 
CHECK (
    crypto_envelope ? 'algorithm' AND
    crypto_envelope ? 'keyId' AND
    crypto_envelope ? 'iv' AND
    jsonb_typeof(crypto_envelope->'algorithm') = 'string' AND
    jsonb_typeof(crypto_envelope->'keyId') = 'string' AND
    jsonb_typeof(crypto_envelope->'iv') = 'string'
);

ALTER TABLE healthcare_share 
ADD CONSTRAINT healthcare_share_envelope_fields_check 
CHECK (
    crypto_envelope ? 'algorithm' AND
    crypto_envelope ? 'keyId' AND
    crypto_envelope ? 'iv' AND
    jsonb_typeof(crypto_envelope->'algorithm') = 'string' AND
    jsonb_typeof(crypto_envelope->'keyId') = 'string' AND
    jsonb_typeof(crypto_envelope->'iv') = 'string'
);

-- ==================================================================
-- SYNC CONFLICT RESOLUTION ENHANCEMENTS
-- ==================================================================

-- Add sync metadata to encrypted_user_prefs for conflict resolution
ALTER TABLE encrypted_user_prefs 
ADD COLUMN IF NOT EXISTS sync_hash text,
ADD COLUMN IF NOT EXISTS conflict_data jsonb;

-- Add sync metadata to encrypted_cycle_data for enhanced conflict resolution
ALTER TABLE encrypted_cycle_data 
ADD COLUMN IF NOT EXISTS sync_hash text,
ADD COLUMN IF NOT EXISTS conflict_data jsonb,
ADD COLUMN IF NOT EXISTS resolution_status text DEFAULT 'none' 
    CHECK (resolution_status IN ('none', 'pending', 'resolved', 'manual'));

-- Indexes for conflict resolution
CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_sync_hash ON encrypted_user_prefs (user_id, sync_hash);
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_sync_hash ON encrypted_cycle_data (user_id, sync_hash);
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_conflicts ON encrypted_cycle_data (user_id, resolution_status) WHERE resolution_status != 'none';

-- Comments
COMMENT ON COLUMN encrypted_user_prefs.sync_hash IS 'Hash of encrypted payload for conflict detection';
COMMENT ON COLUMN encrypted_user_prefs.conflict_data IS 'Metadata for conflict resolution (no PII)';
COMMENT ON COLUMN encrypted_cycle_data.sync_hash IS 'Hash of encrypted payload for conflict detection';
COMMENT ON COLUMN encrypted_cycle_data.conflict_data IS 'Metadata for conflict resolution (no PII)';
COMMENT ON COLUMN encrypted_cycle_data.resolution_status IS 'Status of conflict resolution process';

-- ==================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ==================================================================

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_device_key_active_user ON device_key (user_id, last_active_at DESC) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_healthcare_share_active ON healthcare_share (user_id, expires_at DESC) 
WHERE status = 'active' AND expires_at > now();

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_device_time ON encrypted_cycle_data (user_id, device_id, local_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_user_device_sync ON encrypted_user_prefs (user_id, device_id, synced_at DESC);

-- ==================================================================
-- DATA RETENTION AND CLEANUP POLICIES
-- ==================================================================

-- Add retention policy metadata
ALTER TABLE security_audit_log 
ADD COLUMN IF NOT EXISTS retention_until timestamp with time zone DEFAULT (now() + interval '1 year');

ALTER TABLE healthcare_share_audit 
ADD COLUMN IF NOT EXISTS retention_until timestamp with time zone DEFAULT (now() + interval '2 years');

-- Indexes for cleanup operations
CREATE INDEX IF NOT EXISTS idx_security_audit_log_retention ON security_audit_log (retention_until) 
WHERE retention_until < now() + interval '30 days';

CREATE INDEX IF NOT EXISTS idx_healthcare_share_audit_retention ON healthcare_share_audit (retention_until) 
WHERE retention_until < now() + interval '30 days';

-- Comments
COMMENT ON COLUMN security_audit_log.retention_until IS 'Automatic deletion timestamp for audit log cleanup';
COMMENT ON COLUMN healthcare_share_audit.retention_until IS 'Automatic deletion timestamp for sharing audit cleanup';

-- ==================================================================
-- ENCRYPTED TABLE STATISTICS
-- ==================================================================

-- Create view for encrypted table statistics (no sensitive data)
CREATE OR REPLACE VIEW encrypted_table_stats AS
SELECT 
    'encrypted_user_prefs' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as earliest_record,
    MAX(updated_at) as latest_update
FROM encrypted_user_prefs
UNION ALL
SELECT 
    'encrypted_cycle_data' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as earliest_record,
    MAX(updated_at) as latest_update
FROM encrypted_cycle_data
UNION ALL
SELECT 
    'healthcare_share' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_update
FROM healthcare_share
UNION ALL
SELECT 
    'device_key' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as earliest_record,
    MAX(last_active_at) as latest_update
FROM device_key;

-- Grant read access to monitoring role
GRANT SELECT ON encrypted_table_stats TO service_role;

COMMENT ON VIEW encrypted_table_stats IS 'Privacy-safe statistics for encrypted tables monitoring';

-- ==================================================================
-- VALIDATION FUNCTIONS FOR ENCRYPTED DATA
-- ==================================================================

-- Function to validate crypto envelope structure
CREATE OR REPLACE FUNCTION validate_crypto_envelope(envelope jsonb)
RETURNS boolean AS $$
BEGIN
    -- Check required fields exist
    IF NOT (envelope ? 'algorithm' AND envelope ? 'keyId' AND envelope ? 'iv') THEN
        RETURN false;
    END IF;
    
    -- Check field types
    IF NOT (
        jsonb_typeof(envelope->'algorithm') = 'string' AND
        jsonb_typeof(envelope->'keyId') = 'string' AND
        jsonb_typeof(envelope->'iv') = 'string'
    ) THEN
        RETURN false;
    END IF;
    
    -- Check minimum lengths
    IF NOT (
        length(envelope->>'algorithm') > 0 AND
        length(envelope->>'keyId') > 0 AND
        length(envelope->>'iv') > 0
    ) THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_crypto_envelope IS 'Validates crypto envelope structure for encrypted data';

-- Function to generate sync hash
CREATE OR REPLACE FUNCTION generate_sync_hash(encrypted_payload text, version integer)
RETURNS text AS $$
BEGIN
    RETURN encode(digest(encrypted_payload || version::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_sync_hash IS 'Generates sync hash for conflict detection';

-- ==================================================================
-- TRIGGERS FOR SYNC HASH GENERATION
-- ==================================================================

-- Function to automatically generate sync hash
CREATE OR REPLACE FUNCTION auto_generate_sync_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sync_hash = generate_sync_hash(NEW.encrypted_payload, NEW.version);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic sync hash generation
CREATE TRIGGER auto_sync_hash_encrypted_user_prefs
    BEFORE INSERT OR UPDATE ON encrypted_user_prefs
    FOR EACH ROW EXECUTE PROCEDURE auto_generate_sync_hash();

CREATE TRIGGER auto_sync_hash_encrypted_cycle_data
    BEFORE INSERT OR UPDATE ON encrypted_cycle_data
    FOR EACH ROW EXECUTE PROCEDURE auto_generate_sync_hash();