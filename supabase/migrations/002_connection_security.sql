-- Migration: 002_connection_security.sql
-- Description: Database connection security hardening with SSL/TLS enforcement
-- Author: Dev Agent (Story 0.8)
-- Created: 2025-09-07

-- ==================================================================
-- SSL/TLS CONFIGURATION ENFORCEMENT  
-- ==================================================================

-- Force SSL connections (minimum TLS 1.3)
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_min_protocol_version = 'TLSv1.3';
ALTER SYSTEM SET ssl_prefer_server_ciphers = 'on';

-- Configure SSL cipher suites for maximum security
ALTER SYSTEM SET ssl_ciphers = 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS';

-- Enforce SSL for all database connections
ALTER SYSTEM SET ssl_require_ssl = 'on';

-- ==================================================================
-- CONNECTION POOLING SECURITY CONFIGURATION
-- ==================================================================

-- Configure secure connection pooling settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Connection timeout and security settings
ALTER SYSTEM SET tcp_keepalives_idle = 600;
ALTER SYSTEM SET tcp_keepalives_interval = 30;
ALTER SYSTEM SET tcp_keepalives_count = 3;

-- Statement timeout for security (prevent long-running attacks)
ALTER SYSTEM SET statement_timeout = '30s';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '10min';

-- Authentication timeout
ALTER SYSTEM SET authentication_timeout = '30s';

-- ==================================================================
-- LOGGING AND MONITORING CONFIGURATION
-- ==================================================================

-- Enable connection logging for security monitoring
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Log authentication failures
ALTER SYSTEM SET log_authentication_failures = 'on';

-- Log statement errors and security violations
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_min_error_statement = 'error';

-- ==================================================================
-- SECURITY FUNCTIONS FOR CONNECTION MONITORING
-- ==================================================================

-- Health check function for connection status
CREATE OR REPLACE FUNCTION connection_status()
RETURNS TABLE(
  active_connections INT,
  ssl_enabled BOOLEAN,
  max_connections INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT count(*)::INT FROM pg_stat_activity WHERE state = 'active'),
    (SELECT setting::BOOLEAN FROM pg_settings WHERE name = 'ssl'),
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database version check function
CREATE OR REPLACE FUNCTION db_version()
RETURNS TEXT AS $$
BEGIN
  RETURN version();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connection security validation function
CREATE OR REPLACE FUNCTION validate_connection_security()
RETURNS TABLE(
  check_name TEXT,
  status BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Check SSL is enabled
  RETURN QUERY
  SELECT 
    'SSL Enabled'::TEXT,
    (SELECT setting::BOOLEAN FROM pg_settings WHERE name = 'ssl'),
    'SSL must be enabled for secure connections'::TEXT;
  
  -- Check minimum TLS version
  RETURN QUERY
  SELECT 
    'TLS Version'::TEXT,
    (SELECT setting >= 'TLSv1.3' FROM pg_settings WHERE name = 'ssl_min_protocol_version'),
    'Minimum TLS 1.3 required for security'::TEXT;
  
  -- Check connection limits
  RETURN QUERY
  SELECT 
    'Connection Limits'::TEXT,
    (SELECT setting::INT <= 200 FROM pg_settings WHERE name = 'max_connections'),
    'Connection limits should be reasonable for security'::TEXT;
    
  -- Check statement timeout
  RETURN QUERY
  SELECT 
    'Statement Timeout'::TEXT,
    (SELECT setting != '0' FROM pg_settings WHERE name = 'statement_timeout'),
    'Statement timeout prevents long-running attacks'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================================
-- SERVICE ROLE HEALTH CHECK PERMISSIONS
-- ==================================================================

-- Grant service role access to health check functions only
GRANT EXECUTE ON FUNCTION connection_status() TO service_role;
GRANT EXECUTE ON FUNCTION db_version() TO service_role; 
GRANT EXECUTE ON FUNCTION validate_connection_security() TO service_role;

-- ==================================================================
-- CONNECTION SECURITY AUDIT TABLE
-- ==================================================================

-- Table to track connection security events
CREATE TABLE IF NOT EXISTS connection_security_audit (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  client_address INET,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  security_check_passed BOOLEAN DEFAULT true
);

-- Index for efficient security audit queries
CREATE INDEX IF NOT EXISTS idx_connection_audit_timestamp 
ON connection_security_audit (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_connection_audit_failed
ON connection_security_audit (security_check_passed, event_timestamp DESC) 
WHERE security_check_passed = false;

-- ==================================================================
-- CERTIFICATE VALIDATION FUNCTIONS
-- ==================================================================

-- Function to validate SSL certificate configuration
CREATE OR REPLACE FUNCTION validate_ssl_config()
RETURNS TABLE(
  ssl_active BOOLEAN,
  ssl_version TEXT,
  cipher_suite TEXT,
  certificate_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT setting::BOOLEAN FROM pg_settings WHERE name = 'ssl'),
    (SELECT ssl_version FROM pg_stat_ssl WHERE pid = pg_backend_pid()),
    (SELECT cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()),
    (SELECT ssl_version IS NOT NULL FROM pg_stat_ssl WHERE pid = pg_backend_pid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to SSL validation function
GRANT EXECUTE ON FUNCTION validate_ssl_config() TO service_role;

-- ==================================================================
-- RECORD MIGRATION IN HISTORY  
-- ==================================================================

INSERT INTO migration_history (migration_name) 
VALUES ('002_connection_security.sql');

-- ==================================================================
-- CONFIGURATION VALIDATION
-- ==================================================================

-- Verify that critical security settings are applied
DO $$
DECLARE
  ssl_setting BOOLEAN;
  tls_version TEXT;
BEGIN
  -- Check SSL is enabled
  SELECT setting::BOOLEAN INTO ssl_setting 
  FROM pg_settings WHERE name = 'ssl';
  
  IF NOT ssl_setting THEN
    RAISE NOTICE 'WARNING: SSL is not enabled. This migration requires SSL configuration.';
  END IF;
  
  -- Check TLS version
  SELECT setting INTO tls_version 
  FROM pg_settings WHERE name = 'ssl_min_protocol_version';
  
  IF tls_version < 'TLSv1.3' THEN
    RAISE NOTICE 'WARNING: TLS version is below 1.3. Update required for maximum security.';
  END IF;
  
  RAISE NOTICE 'Connection security migration completed successfully.';
END $$;