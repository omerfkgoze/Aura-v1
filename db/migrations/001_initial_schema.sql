-- Migration: 001_initial_schema.sql
-- Description: Create core database schema with proper constraints and indexes
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- USERS TABLE (MINIMAL METADATA)
-- ==================================================================

-- Users table with minimal metadata for privacy
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_created_at_check CHECK (created_at <= now()),
    CONSTRAINT users_last_active_at_check CHECK (last_active_at <= now())
);

-- Index for user activity queries
CREATE INDEX idx_users_last_active ON users (last_active_at DESC);

-- Comments for documentation
COMMENT ON TABLE users IS 'Users table with minimal metadata for privacy. Only contains essential identification and activity tracking.';
COMMENT ON COLUMN users.id IS 'UUID primary key for user identification';
COMMENT ON COLUMN users.created_at IS 'User account creation timestamp';
COMMENT ON COLUMN users.last_active_at IS 'Last user activity timestamp for cleanup and analytics';

-- ==================================================================
-- ENCRYPTED_USER_PREFS TABLE
-- ==================================================================

-- Encrypted user preferences table with proper indexing
CREATE TABLE encrypted_user_prefs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    encrypted_payload text NOT NULL,
    crypto_envelope jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    device_id text NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT encrypted_user_prefs_version_check CHECK (version > 0),
    CONSTRAINT encrypted_user_prefs_device_id_check CHECK (length(device_id) > 0),
    CONSTRAINT encrypted_user_prefs_payload_check CHECK (length(encrypted_payload) > 0),
    CONSTRAINT encrypted_user_prefs_envelope_check CHECK (crypto_envelope IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_encrypted_user_prefs_user_id ON encrypted_user_prefs (user_id);
CREATE INDEX idx_encrypted_user_prefs_user_updated ON encrypted_user_prefs (user_id, updated_at DESC);
CREATE INDEX idx_encrypted_user_prefs_device ON encrypted_user_prefs (user_id, device_id);
CREATE INDEX idx_encrypted_user_prefs_version ON encrypted_user_prefs (user_id, version DESC);

-- Comments for documentation
COMMENT ON TABLE encrypted_user_prefs IS 'Encrypted user preferences with CryptoEnvelope structure for client-side encryption';
COMMENT ON COLUMN encrypted_user_prefs.encrypted_payload IS 'Client-side encrypted preferences data';
COMMENT ON COLUMN encrypted_user_prefs.crypto_envelope IS 'CryptoEnvelope metadata for encryption/decryption';
COMMENT ON COLUMN encrypted_user_prefs.version IS 'Version number for optimistic concurrency control';
COMMENT ON COLUMN encrypted_user_prefs.device_id IS 'Device identifier for sync conflict resolution';

-- ==================================================================
-- ENCRYPTED_CYCLE_DATA TABLE (ENHANCED WITH SYNC SUPPORT)
-- ==================================================================

-- Encrypted cycle data table with enhanced sync support
CREATE TABLE encrypted_cycle_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    encrypted_payload text NOT NULL,
    crypto_envelope jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    device_id text NOT NULL,
    local_timestamp timestamp with time zone NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    sync_status text DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'conflict')) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT encrypted_cycle_data_version_check CHECK (version > 0),
    CONSTRAINT encrypted_cycle_data_device_id_check CHECK (length(device_id) > 0),
    CONSTRAINT encrypted_cycle_data_payload_check CHECK (length(encrypted_payload) > 0),
    CONSTRAINT encrypted_cycle_data_envelope_check CHECK (crypto_envelope IS NOT NULL),
    CONSTRAINT encrypted_cycle_data_local_timestamp_check CHECK (local_timestamp <= now() + interval '1 hour')
);

-- Indexes for performance and sync operations
CREATE INDEX idx_encrypted_cycle_data_user_id ON encrypted_cycle_data (user_id);
CREATE INDEX idx_encrypted_cycle_data_user_updated ON encrypted_cycle_data (user_id, updated_at DESC);
CREATE INDEX idx_encrypted_cycle_data_user_local_time ON encrypted_cycle_data (user_id, local_timestamp DESC);
CREATE INDEX idx_encrypted_cycle_data_sync_status ON encrypted_cycle_data (sync_status, synced_at);
CREATE INDEX idx_encrypted_cycle_data_device ON encrypted_cycle_data (user_id, device_id);
CREATE INDEX idx_encrypted_cycle_data_version ON encrypted_cycle_data (user_id, version DESC);

-- Comments for documentation
COMMENT ON TABLE encrypted_cycle_data IS 'Encrypted cycle data with enhanced sync support and conflict resolution';
COMMENT ON COLUMN encrypted_cycle_data.encrypted_payload IS 'Client-side encrypted cycle data';
COMMENT ON COLUMN encrypted_cycle_data.crypto_envelope IS 'CryptoEnvelope metadata for encryption/decryption';
COMMENT ON COLUMN encrypted_cycle_data.local_timestamp IS 'Timestamp from device when data was recorded';
COMMENT ON COLUMN encrypted_cycle_data.sync_status IS 'Sync status for conflict resolution (pending/synced/conflict)';
COMMENT ON COLUMN encrypted_cycle_data.version IS 'Version number for optimistic concurrency control';

-- ==================================================================
-- HEALTHCARE_SHARE TABLE
-- ==================================================================

-- Healthcare sharing table for secure data sharing
CREATE TABLE healthcare_share (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    encrypted_share_data text NOT NULL,
    crypto_envelope jsonb NOT NULL,
    share_token text UNIQUE NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    access_count integer DEFAULT 0 NOT NULL,
    last_accessed_at timestamp with time zone,
    device_type text CHECK (device_type IN ('mobile', 'desktop', 'unknown')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT healthcare_share_token_check CHECK (length(share_token) >= 32),
    CONSTRAINT healthcare_share_expires_check CHECK (expires_at > created_at),
    CONSTRAINT healthcare_share_access_count_check CHECK (access_count >= 0),
    CONSTRAINT healthcare_share_payload_check CHECK (length(encrypted_share_data) > 0),
    CONSTRAINT healthcare_share_envelope_check CHECK (crypto_envelope IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_healthcare_share_user_id ON healthcare_share (user_id);
CREATE INDEX idx_healthcare_share_token ON healthcare_share (share_token);
CREATE INDEX idx_healthcare_share_status_expires ON healthcare_share (status, expires_at);
CREATE INDEX idx_healthcare_share_user_created ON healthcare_share (user_id, created_at DESC);
CREATE INDEX idx_healthcare_share_expires_cleanup ON healthcare_share (expires_at) WHERE status = 'active';

-- Comments for documentation
COMMENT ON TABLE healthcare_share IS 'Healthcare sharing records with secure token-based access';
COMMENT ON COLUMN healthcare_share.encrypted_share_data IS 'Client-side encrypted data prepared for sharing';
COMMENT ON COLUMN healthcare_share.share_token IS 'Unique token for accessing shared data';
COMMENT ON COLUMN healthcare_share.access_count IS 'Number of times the share has been accessed';
COMMENT ON COLUMN healthcare_share.device_type IS 'Type of device used for sharing';

-- ==================================================================
-- SHARE_TOKEN TABLE (SEPARATE FOR RLS)
-- ==================================================================

-- Separate share token table for RLS isolation
CREATE TABLE share_token (
    token text PRIMARY KEY,
    share_id uuid REFERENCES healthcare_share(id) ON DELETE CASCADE NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT share_token_token_check CHECK (length(token) >= 32),
    CONSTRAINT share_token_expires_check CHECK (expires_at > now())
);

-- Indexes for performance
CREATE INDEX idx_share_token_share_id ON share_token (share_id);
CREATE INDEX idx_share_token_expires ON share_token (expires_at) WHERE expires_at > now();

-- Comments for documentation
COMMENT ON TABLE share_token IS 'Token access control for healthcare sharing with RLS isolation';
COMMENT ON COLUMN share_token.token IS 'Access token for healthcare share';
COMMENT ON COLUMN share_token.expires_at IS 'Token expiration timestamp';

-- ==================================================================
-- DEVICE_KEY TABLE (SECURE KEY MANAGEMENT)
-- ==================================================================

-- Device key management table for secure key storage
CREATE TABLE device_key (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    device_id_hash text NOT NULL,
    encrypted_master_key text NOT NULL,
    key_derivation_path text NOT NULL,
    key_version integer NOT NULL DEFAULT 1,
    next_rotation_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'suspended')) NOT NULL,
    platform text CHECK (platform IN ('ios', 'android', 'web')),
    app_version text,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT device_key_hash_check CHECK (length(device_id_hash) >= 32),
    CONSTRAINT device_key_master_key_check CHECK (length(encrypted_master_key) > 0),
    CONSTRAINT device_key_path_check CHECK (length(key_derivation_path) > 0),
    CONSTRAINT device_key_version_check CHECK (key_version > 0),
    CONSTRAINT device_key_rotation_check CHECK (next_rotation_at > created_at),
    CONSTRAINT device_key_user_device_unique UNIQUE (user_id, device_id_hash)
);

-- Indexes for performance
CREATE INDEX idx_device_key_user_id ON device_key (user_id);
CREATE INDEX idx_device_key_user_device ON device_key (user_id, device_id_hash);
CREATE INDEX idx_device_key_status_active ON device_key (status, last_active_at DESC) WHERE status = 'active';
CREATE INDEX idx_device_key_rotation ON device_key (next_rotation_at) WHERE status = 'active';
CREATE INDEX idx_device_key_platform ON device_key (platform, app_version);

-- Comments for documentation
COMMENT ON TABLE device_key IS 'Secure device key management with hash-based device identification';
COMMENT ON COLUMN device_key.device_id_hash IS 'Salted hash of device identifier for privacy';
COMMENT ON COLUMN device_key.encrypted_master_key IS 'Device-encrypted master key for data encryption';
COMMENT ON COLUMN device_key.key_derivation_path IS 'Key derivation path for hierarchical key management';
COMMENT ON COLUMN device_key.next_rotation_at IS 'Scheduled key rotation timestamp';

-- ==================================================================
-- AUDIT TRAIL TABLES FOR SECURITY-SENSITIVE OPERATIONS
-- ==================================================================

-- Security audit log table for security-sensitive operations
CREATE TABLE security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    event_data jsonb,
    ip_address inet,
    user_agent text,
    device_id_hash text,
    success boolean NOT NULL,
    error_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT security_audit_log_event_type_check CHECK (length(event_type) > 0)
);

-- Indexes for audit queries
CREATE INDEX idx_security_audit_log_user_id ON security_audit_log (user_id, created_at DESC);
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log (event_type, created_at DESC);
CREATE INDEX idx_security_audit_log_success ON security_audit_log (success, created_at DESC);
CREATE INDEX idx_security_audit_log_created ON security_audit_log (created_at DESC);
CREATE INDEX idx_security_audit_log_ip ON security_audit_log (ip_address, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE security_audit_log IS 'Security audit trail for sensitive operations (privacy-safe logging)';
COMMENT ON COLUMN security_audit_log.event_type IS 'Type of security event (login, share_create, key_rotation, etc.)';
COMMENT ON COLUMN security_audit_log.event_data IS 'Privacy-safe event metadata (no PII/health data)';
COMMENT ON COLUMN security_audit_log.device_id_hash IS 'Hash of device identifier for correlation';

-- Healthcare sharing audit log
CREATE TABLE healthcare_share_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id uuid REFERENCES healthcare_share(id) ON DELETE CASCADE NOT NULL,
    action text NOT NULL CHECK (action IN ('created', 'accessed', 'expired', 'revoked')),
    accessor_device_type text CHECK (accessor_device_type IN ('mobile', 'desktop', 'unknown')),
    access_ip_hash text,
    success boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT healthcare_share_audit_action_check CHECK (length(action) > 0)
);

-- Indexes for healthcare sharing audit
CREATE INDEX idx_healthcare_share_audit_share_id ON healthcare_share_audit (share_id, created_at DESC);
CREATE INDEX idx_healthcare_share_audit_action ON healthcare_share_audit (action, created_at DESC);
CREATE INDEX idx_healthcare_share_audit_success ON healthcare_share_audit (success, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE healthcare_share_audit IS 'Healthcare sharing activity audit trail (privacy-safe)';
COMMENT ON COLUMN healthcare_share_audit.access_ip_hash IS 'Hashed IP address for security correlation';
COMMENT ON COLUMN healthcare_share_audit.accessor_device_type IS 'Type of device accessing shared data';

-- ==================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ==================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_encrypted_user_prefs_updated_at
    BEFORE UPDATE ON encrypted_user_prefs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_encrypted_cycle_data_updated_at
    BEFORE UPDATE ON encrypted_cycle_data
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update last_active_at for users
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_active_at = now() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update user activity
CREATE TRIGGER update_user_activity_on_prefs
    AFTER INSERT OR UPDATE ON encrypted_user_prefs
    FOR EACH ROW EXECUTE PROCEDURE update_user_last_active();

CREATE TRIGGER update_user_activity_on_cycle
    AFTER INSERT OR UPDATE ON encrypted_cycle_data
    FOR EACH ROW EXECUTE PROCEDURE update_user_last_active();

-- ==================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_share_audit ENABLE ROW LEVEL SECURITY;