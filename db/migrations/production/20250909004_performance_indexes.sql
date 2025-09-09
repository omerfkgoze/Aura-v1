-- Migration: 20250909004_performance_indexes.sql
-- Description: Performance indexes for encrypted data queries and RLS optimization
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- COMPOSITE INDEXES FOR RLS OPTIMIZATION
-- ==================================================================

-- Users table performance indexes
CREATE INDEX IF NOT EXISTS idx_users_activity_cleanup 
ON users (last_active_at) 
WHERE last_active_at < (now() - interval '90 days');

-- Encrypted user prefs performance indexes
CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_sync_conflicts
ON encrypted_user_prefs (user_id, device_id, version DESC)
WHERE version > 1;

CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_recent_activity
ON encrypted_user_prefs (user_id, synced_at DESC)
WHERE synced_at > (now() - interval '7 days');

-- Encrypted cycle data performance indexes
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_sync_pending
ON encrypted_cycle_data (user_id, sync_status, created_at DESC)
WHERE sync_status IN ('pending', 'conflict');

CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_time_range
ON encrypted_cycle_data (user_id, local_timestamp DESC, sync_status)
WHERE sync_status = 'synced';

CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_conflicts
ON encrypted_cycle_data (user_id, device_id, local_timestamp DESC)
WHERE sync_status = 'conflict';

-- Healthcare share performance indexes
CREATE INDEX IF NOT EXISTS idx_healthcare_share_active_tokens
ON healthcare_share (share_token, status, expires_at)
WHERE status = 'active' AND expires_at > now();

CREATE INDEX IF NOT EXISTS idx_healthcare_share_cleanup
ON healthcare_share (expires_at, status)
WHERE status IN ('active', 'expired') AND expires_at < now();

CREATE INDEX IF NOT EXISTS idx_healthcare_share_user_recent
ON healthcare_share (user_id, created_at DESC, status)
WHERE status = 'active' AND created_at > (now() - interval '30 days');

-- Share token performance indexes
CREATE INDEX IF NOT EXISTS idx_share_token_validation
ON share_token (token, expires_at)
WHERE expires_at > now();

CREATE INDEX IF NOT EXISTS idx_share_token_cleanup
ON share_token (expires_at)
WHERE expires_at < now();

-- Device key performance indexes
CREATE INDEX IF NOT EXISTS idx_device_key_rotation_due
ON device_key (user_id, next_rotation_at, status)
WHERE status = 'active' AND next_rotation_at < now();

CREATE INDEX IF NOT EXISTS idx_device_key_inactive_cleanup
ON device_key (last_active_at, status)
WHERE status = 'active' AND last_active_at < (now() - interval '180 days');

CREATE INDEX IF NOT EXISTS idx_device_key_version_conflicts
ON device_key (user_id, device_id_hash, key_version DESC)
WHERE status = 'active';

-- ==================================================================
-- AUDIT TRAIL PERFORMANCE INDEXES
-- ==================================================================

-- Security audit log indexes for monitoring and cleanup
CREATE INDEX IF NOT EXISTS idx_security_audit_log_recent_events
ON security_audit_log (event_type, success, created_at DESC)
WHERE created_at > (now() - interval '30 days');

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_timeline
ON security_audit_log (user_id, created_at DESC)
WHERE user_id IS NOT NULL AND created_at > (now() - interval '7 days');

CREATE INDEX IF NOT EXISTS idx_security_audit_log_failed_attempts
ON security_audit_log (event_type, ip_address, success, created_at DESC)
WHERE success = false AND created_at > (now() - interval '24 hours');

CREATE INDEX IF NOT EXISTS idx_security_audit_log_device_correlation
ON security_audit_log (device_id_hash, event_type, created_at DESC)
WHERE device_id_hash IS NOT NULL AND created_at > (now() - interval '7 days');

-- Healthcare share audit indexes
CREATE INDEX IF NOT EXISTS idx_healthcare_share_audit_recent_access
ON healthcare_share_audit (share_id, action, created_at DESC)
WHERE action = 'accessed' AND created_at > (now() - interval '7 days');

CREATE INDEX IF NOT EXISTS idx_healthcare_share_audit_failed_access
ON healthcare_share_audit (action, success, created_at DESC)
WHERE success = false AND created_at > (now() - interval '24 hours');

CREATE INDEX IF NOT EXISTS idx_healthcare_share_audit_ip_correlation
ON healthcare_share_audit (access_ip_hash, success, created_at DESC)
WHERE access_ip_hash IS NOT NULL AND created_at > (now() - interval '24 hours');

-- ==================================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ==================================================================

-- Covering index for user data synchronization queries
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_sync_covering
ON encrypted_cycle_data (user_id, sync_status, synced_at DESC)
INCLUDE (id, version, device_id, local_timestamp)
WHERE sync_status IN ('synced', 'conflict');

-- Covering index for healthcare share token validation
CREATE INDEX IF NOT EXISTS idx_healthcare_share_token_covering
ON healthcare_share (share_token, status, expires_at)
INCLUDE (id, user_id, encrypted_share_data, crypto_envelope, access_count)
WHERE status = 'active';

-- Covering index for device key management queries
CREATE INDEX IF NOT EXISTS idx_device_key_management_covering
ON device_key (user_id, device_id_hash, status)
INCLUDE (id, key_version, next_rotation_at, platform, last_active_at)
WHERE status = 'active';

-- ==================================================================
-- BTREE INDEXES FOR RANGE QUERIES
-- ==================================================================

-- Time-based range queries for cycle data
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_time_btree
ON encrypted_cycle_data USING btree (user_id, local_timestamp DESC, created_at DESC)
WHERE sync_status = 'synced';

-- Version-based range queries for conflict resolution
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_version_btree
ON encrypted_cycle_data USING btree (user_id, device_id, version DESC)
WHERE sync_status IN ('pending', 'conflict');

-- Access pattern optimization for healthcare sharing
CREATE INDEX IF NOT EXISTS idx_healthcare_share_access_btree
ON healthcare_share USING btree (user_id, last_accessed_at DESC NULLS LAST, created_at DESC)
WHERE status = 'active';

-- ==================================================================
-- HASH INDEXES FOR EXACT MATCH QUERIES
-- ==================================================================

-- Hash index for share token lookups (exact match only)
CREATE INDEX IF NOT EXISTS idx_share_token_hash
ON share_token USING hash (token)
WHERE expires_at > now();

-- Hash index for device ID hash lookups
CREATE INDEX IF NOT EXISTS idx_device_key_device_hash
ON device_key USING hash (device_id_hash)
WHERE status = 'active';

-- ==================================================================
-- PARTIAL INDEXES FOR MAINTENANCE QUERIES
-- ==================================================================

-- Index for expired record cleanup
CREATE INDEX IF NOT EXISTS idx_expired_shares_cleanup
ON healthcare_share (expires_at, id)
WHERE status = 'active' AND expires_at < now();

CREATE INDEX IF NOT EXISTS idx_expired_tokens_cleanup
ON share_token (expires_at, token)
WHERE expires_at < now();

-- Index for inactive device cleanup
CREATE INDEX IF NOT EXISTS idx_inactive_devices_cleanup
ON device_key (last_active_at, id)
WHERE status = 'active' AND last_active_at < (now() - interval '365 days');

-- Index for old audit log cleanup
CREATE INDEX IF NOT EXISTS idx_old_audit_cleanup
ON security_audit_log (created_at, id)
WHERE created_at < (now() - interval '365 days');

CREATE INDEX IF NOT EXISTS idx_old_share_audit_cleanup
ON healthcare_share_audit (created_at, id)
WHERE created_at < (now() - interval '365 days');

-- ==================================================================
-- STATISTICS AND MAINTENANCE
-- ==================================================================

-- Update table statistics for query planning
ANALYZE users;
ANALYZE encrypted_user_prefs;
ANALYZE encrypted_cycle_data;
ANALYZE healthcare_share;
ANALYZE share_token;
ANALYZE device_key;
ANALYZE security_audit_log;
ANALYZE healthcare_share_audit;