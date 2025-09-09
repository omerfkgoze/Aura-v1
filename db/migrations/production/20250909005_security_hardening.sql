-- Migration: 20250909005_security_hardening.sql
-- Description: Database security hardening with user roles and connection security
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- DATABASE SECURITY HARDENING
-- ==================================================================

-- Create database roles with least privilege principle
DO $$
BEGIN
    -- Application role for normal operations
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_app') THEN
        CREATE ROLE aura_app;
    END IF;
    
    -- Read-only role for reporting and analytics
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_readonly') THEN
        CREATE ROLE aura_readonly;
    END IF;
    
    -- Backup role for database maintenance
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_backup') THEN
        CREATE ROLE aura_backup;
    END IF;
    
    -- Monitoring role for health checks
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_monitor') THEN
        CREATE ROLE aura_monitor;
    END IF;
END
$$;

-- ==================================================================
-- ROLE PERMISSIONS CONFIGURATION
-- ==================================================================

-- Application role permissions (used by Next.js API)
GRANT CONNECT ON DATABASE postgres TO aura_app;
GRANT USAGE ON SCHEMA public TO aura_app;
GRANT USAGE ON SCHEMA auth TO aura_app;

-- Grant access to application tables with restrictions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO aura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON encrypted_user_prefs TO aura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON encrypted_cycle_data TO aura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON healthcare_share TO aura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON share_token TO aura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON device_key TO aura_app;

-- Grant access to audit tables (insert-only for application)
GRANT INSERT ON security_audit_log TO aura_app;
GRANT INSERT ON healthcare_share_audit TO aura_app;
GRANT SELECT ON security_audit_log TO aura_app; -- For user's own logs only
GRANT SELECT ON healthcare_share_audit TO aura_app; -- For user's own audit only

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aura_app;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION update_cycle_data_optimistic TO aura_app;
GRANT EXECUTE ON FUNCTION validate_share_token TO aura_app;
GRANT EXECUTE ON FUNCTION healthcare_access_audit TO aura_app;
GRANT EXECUTE ON FUNCTION rotate_device_key TO aura_app;

-- Read-only role permissions (for analytics and reporting)
GRANT CONNECT ON DATABASE postgres TO aura_readonly;
GRANT USAGE ON SCHEMA public TO aura_readonly;

-- Grant read-only access to non-sensitive tables and views
GRANT SELECT ON users TO aura_readonly;
GRANT SELECT ON security_audit_log TO aura_readonly;
GRANT SELECT ON healthcare_share_audit TO aura_readonly;
GRANT SELECT ON migration_history TO aura_readonly;

-- EXPLICITLY DENY access to encrypted data for readonly role
REVOKE ALL ON encrypted_user_prefs FROM aura_readonly;
REVOKE ALL ON encrypted_cycle_data FROM aura_readonly;
REVOKE ALL ON healthcare_share FROM aura_readonly;
REVOKE ALL ON share_token FROM aura_readonly;
REVOKE ALL ON device_key FROM aura_readonly;

-- Backup role permissions (for database maintenance)
GRANT CONNECT ON DATABASE postgres TO aura_backup;
GRANT USAGE ON SCHEMA public TO aura_backup;
GRANT USAGE ON SCHEMA information_schema TO aura_backup;
GRANT USAGE ON SCHEMA pg_catalog TO aura_backup;

-- Backup role needs read access for backup operations
GRANT SELECT ON ALL TABLES IN SCHEMA public TO aura_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO aura_backup;

-- Monitor role permissions (for health checks and monitoring)
GRANT CONNECT ON DATABASE postgres TO aura_monitor;
GRANT USAGE ON SCHEMA public TO aura_monitor;
GRANT USAGE ON SCHEMA information_schema TO aura_monitor;
GRANT USAGE ON SCHEMA pg_catalog TO aura_monitor;

-- Grant monitoring-specific permissions
GRANT SELECT ON pg_stat_database TO aura_monitor;
GRANT SELECT ON pg_stat_user_tables TO aura_monitor;
GRANT SELECT ON pg_stat_user_indexes TO aura_monitor;
GRANT SELECT ON pg_locks TO aura_monitor;
GRANT SELECT ON pg_stat_activity TO aura_monitor;

-- Allow monitoring basic table statistics (no data access)
GRANT SELECT ON information_schema.tables TO aura_monitor;
GRANT SELECT ON information_schema.columns TO aura_monitor;

-- ==================================================================
-- CONNECTION SECURITY HARDENING
-- ==================================================================

-- Create connection security configuration table
CREATE TABLE IF NOT EXISTS connection_security_config (
    id SERIAL PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert connection security settings
INSERT INTO connection_security_config (setting_name, setting_value, description) VALUES
('ssl_enforce', 'true', 'Enforce SSL/TLS connections for all users'),
('max_connections_per_user', '10', 'Maximum connections per database user'),
('connection_timeout', '30000', 'Connection timeout in milliseconds'),
('idle_timeout', '600000', 'Idle connection timeout in milliseconds (10 minutes)'),
('statement_timeout', '300000', 'Statement execution timeout in milliseconds (5 minutes)'),
('log_connections', 'true', 'Log all connection attempts'),
('log_disconnections', 'true', 'Log all disconnections'),
('log_failed_connections', 'true', 'Log failed connection attempts')
ON CONFLICT (setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- ==================================================================
-- IP ALLOWLIST CONFIGURATION
-- ==================================================================

-- Create IP allowlist table for connection restrictions
CREATE TABLE IF NOT EXISTS ip_allowlist (
    id SERIAL PRIMARY KEY,
    ip_range CIDR NOT NULL,
    description TEXT NOT NULL,
    role_name VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Add unique constraint to prevent duplicate IP ranges per role
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_allowlist_unique 
ON ip_allowlist (ip_range, role_name) WHERE is_active = true;

-- Insert default IP allowlist entries (adjust for production)
INSERT INTO ip_allowlist (ip_range, description, role_name) VALUES
-- Local development
('127.0.0.0/8', 'Local development environment', 'aura_app'),
('::1/128', 'Local IPv6 development', 'aura_app'),

-- Private networks (common cloud provider ranges)
('10.0.0.0/8', 'Private network range A', 'aura_app'),
('172.16.0.0/12', 'Private network range B', 'aura_app'),
('192.168.0.0/16', 'Private network range C', 'aura_app'),

-- Monitoring can access from anywhere (restricted by Supabase)
('0.0.0.0/0', 'Monitoring access (restricted by Supabase)', 'aura_monitor'),

-- Backup access (should be restricted to specific IPs in production)
('10.0.0.0/8', 'Backup service access', 'aura_backup'),

-- Read-only access (for analytics, should be restricted in production)
('10.0.0.0/8', 'Analytics and reporting access', 'aura_readonly')
ON CONFLICT DO NOTHING;

-- ==================================================================
-- PASSWORD POLICY CONFIGURATION
-- ==================================================================

-- Create password policy configuration
CREATE TABLE IF NOT EXISTS password_policy_config (
    id SERIAL PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    policy_value INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert password policy settings
INSERT INTO password_policy_config (policy_name, policy_value, description) VALUES
('min_password_length', 16, 'Minimum password length for database users'),
('password_complexity_required', 1, 'Require complex passwords (1=true, 0=false)'),
('password_expiry_days', 90, 'Password expiration in days'),
('max_failed_attempts', 5, 'Maximum failed login attempts before lockout'),
('lockout_duration_minutes', 30, 'Account lockout duration in minutes'),
('password_history_count', 5, 'Number of previous passwords to remember')
ON CONFLICT (policy_name) DO UPDATE SET 
    policy_value = EXCLUDED.policy_value;

-- ==================================================================
-- QUERY MONITORING AND SECURITY
-- ==================================================================

-- Create slow query monitoring table
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT,
    execution_time_ms INTEGER NOT NULL,
    user_name VARCHAR(64),
    database_name VARCHAR(64),
    client_addr INET,
    query_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_slow_query_log_execution_time 
ON slow_query_log (execution_time_ms DESC, query_start DESC);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_user 
ON slow_query_log (user_name, query_start DESC);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_hash 
ON slow_query_log (query_hash, query_start DESC);

-- Create suspicious activity monitoring table
CREATE TABLE IF NOT EXISTS suspicious_activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL,
    user_name VARCHAR(64),
    client_addr INET,
    query_text TEXT,
    risk_score INTEGER DEFAULT 1 CHECK (risk_score BETWEEN 1 AND 10),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for security monitoring
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_log_type_time 
ON suspicious_activity_log (activity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_log_risk 
ON suspicious_activity_log (risk_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_log_user 
ON suspicious_activity_log (user_name, created_at DESC);

-- ==================================================================
-- SECURITY MONITORING FUNCTIONS
-- ==================================================================

-- Function to log suspicious database activity
CREATE OR REPLACE FUNCTION log_suspicious_activity(
    p_activity_type VARCHAR(50),
    p_user_name VARCHAR(64) DEFAULT NULL,
    p_client_addr INET DEFAULT NULL,
    p_query_text TEXT DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 1,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate risk score
    IF p_risk_score < 1 OR p_risk_score > 10 THEN
        p_risk_score := 1;
    END IF;
    
    -- Insert suspicious activity log
    INSERT INTO suspicious_activity_log (
        activity_type,
        user_name,
        client_addr,
        query_text,
        risk_score,
        description
    ) VALUES (
        p_activity_type,
        COALESCE(p_user_name, current_user),
        p_client_addr,
        p_query_text,
        p_risk_score,
        p_description
    );
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Failed to log suspicious activity: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to check connection limits
CREATE OR REPLACE FUNCTION check_connection_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_connections INTEGER;
    max_connections INTEGER;
    user_connections INTEGER;
    max_user_connections INTEGER := 10; -- Default limit
BEGIN
    -- Get current total connections
    SELECT count(*) INTO current_connections 
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Get max connections setting
    SELECT setting::INTEGER INTO max_connections 
    FROM pg_settings 
    WHERE name = 'max_connections';
    
    -- Check if approaching connection limit
    IF current_connections > (max_connections * 0.8) THEN
        PERFORM log_suspicious_activity(
            'high_connection_usage',
            current_user,
            inet_client_addr(),
            NULL,
            5,
            format('High connection usage: %s/%s', current_connections, max_connections)
        );
    END IF;
    
    -- Get current user connections
    SELECT count(*) INTO user_connections 
    FROM pg_stat_activity 
    WHERE usename = current_user AND state = 'active';
    
    -- Check user-specific connection limit
    IF user_connections > max_user_connections THEN
        PERFORM log_suspicious_activity(
            'user_connection_limit_exceeded',
            current_user,
            inet_client_addr(),
            NULL,
            7,
            format('User connection limit exceeded: %s/%s', user_connections, max_user_connections)
        );
        
        -- Could implement connection killing here if needed
        -- But for now, just log the event
    END IF;
    
    RETURN NULL;
END;
$$;

-- ==================================================================
-- SECURITY EVENT TRIGGERS
-- ==================================================================

-- Create event trigger for DDL monitoring (for production alerting)
CREATE OR REPLACE FUNCTION monitor_ddl_commands()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    audit_query TEXT;
    current_query TEXT;
BEGIN
    current_query := current_query();
    
    -- Log DDL commands for security monitoring
    PERFORM log_suspicious_activity(
        'ddl_command',
        current_user,
        inet_client_addr(),
        current_query,
        CASE 
            WHEN current_query ILIKE '%DROP%' THEN 9
            WHEN current_query ILIKE '%ALTER%' THEN 6
            WHEN current_query ILIKE '%CREATE%' THEN 4
            ELSE 3
        END,
        format('DDL command executed: %s', TG_TAG)
    );
END;
$$;

-- Create the DDL monitoring event trigger
DO $$
BEGIN
    -- Drop existing trigger if it exists
    DROP EVENT TRIGGER IF EXISTS ddl_command_monitor;
    
    -- Create new trigger
    CREATE EVENT TRIGGER ddl_command_monitor
    ON ddl_command_start
    EXECUTE FUNCTION monitor_ddl_commands();
EXCEPTION WHEN insufficient_privilege THEN
    -- Event triggers may not be available in all environments
    RAISE NOTICE 'Event triggers not supported in this environment';
END
$$;

-- ==================================================================
-- CLEANUP AND MAINTENANCE PROCEDURES
-- ==================================================================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_audit_logs(
    retention_days INTEGER DEFAULT 365
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Clean up old security audit logs
    DELETE FROM security_audit_log 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old healthcare share audit logs
    DELETE FROM healthcare_share_audit 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Clean up old slow query logs
    DELETE FROM slow_query_log 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Clean up old suspicious activity logs (keep longer for security analysis)
    DELETE FROM suspicious_activity_log 
    WHERE created_at < (NOW() - '2 years'::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Function to rotate expired shares and tokens
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up expired share tokens
    DELETE FROM share_token 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update expired healthcare shares
    UPDATE healthcare_share 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- ==================================================================
-- GRANT PERMISSIONS FOR SECURITY FUNCTIONS
-- ==================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION log_suspicious_activity TO aura_app, aura_monitor;
GRANT EXECUTE ON FUNCTION cleanup_audit_logs TO aura_backup, service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_shares TO aura_app, service_role;

-- Grant access to security monitoring tables
GRANT SELECT ON slow_query_log TO aura_monitor;
GRANT SELECT ON suspicious_activity_log TO aura_monitor;
GRANT SELECT ON connection_security_config TO aura_monitor;
GRANT SELECT ON ip_allowlist TO aura_monitor;
GRANT SELECT ON password_policy_config TO aura_monitor;

-- Grant insert permissions for logging
GRANT INSERT ON slow_query_log TO aura_monitor;
GRANT INSERT ON suspicious_activity_log TO aura_app, aura_monitor;

-- ==================================================================
-- FINAL SECURITY VALIDATION
-- ==================================================================

-- Ensure RLS is enabled on all security tables
ALTER TABLE connection_security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security tables (admin access only)
CREATE POLICY "security_config_admin_only" ON connection_security_config
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "ip_allowlist_admin_only" ON ip_allowlist
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "password_policy_admin_only" ON password_policy_config
FOR ALL USING (auth.role() = 'service_role');

-- Monitoring tables can be read by monitor role
CREATE POLICY "slow_query_monitor_access" ON slow_query_log
FOR SELECT USING (auth.role() IN ('service_role', 'aura_monitor'));

CREATE POLICY "suspicious_activity_monitor_access" ON suspicious_activity_log
FOR SELECT USING (auth.role() IN ('service_role', 'aura_monitor'));

-- Allow inserting monitoring data
CREATE POLICY "slow_query_insert" ON slow_query_log
FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'aura_monitor'));

CREATE POLICY "suspicious_activity_insert" ON suspicious_activity_log
FOR INSERT WITH CHECK (auth.role() IN ('service_role', 'aura_app', 'aura_monitor'));

-- Log completion
INSERT INTO migration_history (migration_name, executed_by) 
VALUES ('20250909005_security_hardening.sql', current_user);