-- Migration: 003_audit_monitoring.sql
-- Description: Comprehensive audit and monitoring implementation with Sentry integration
-- Author: Dev Agent (Story 0.8)
-- Created: 2025-09-07

-- ==================================================================
-- ENABLE AUDIT LOGGING FOR DATABASE OPERATIONS
-- ==================================================================

-- Enable audit logging for all database connections
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_authentication_failures = 'on';

-- Log RLS policy violations and security events
ALTER SYSTEM SET log_statement = 'all';  -- In production, use 'ddl' for performance
ALTER SYSTEM SET log_min_error_statement = 'error';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Configure audit log rotation and retention
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';

-- ==================================================================
-- REAL-TIME MONITORING FUNCTIONS
-- ==================================================================

-- Function to detect RLS policy violations in real-time
CREATE OR REPLACE FUNCTION detect_rls_violations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_violation_details JSONB;
BEGIN
  -- This trigger fires on access denial due to RLS policies
  v_violation_details := jsonb_build_object(
    'table_name', TG_TABLE_NAME,
    'operation', TG_OP,
    'user_id', auth.uid(),
    'timestamp', NOW(),
    'session_info', current_setting('application_name', true)
  );

  -- Log RLS violation through audit function
  PERFORM healthcare_access_audit(
    'rls_violation',
    NULL, -- share_id
    NULL, -- token_id  
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP),
    false, -- success = false
    'RLS policy denied access'
  );

  -- Continue with the operation (will still be denied by RLS)
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to monitor connection security violations
CREATE OR REPLACE FUNCTION monitor_connection_security()
RETURNS TABLE(
  active_connections INTEGER,
  failed_connections INTEGER,
  ssl_violations INTEGER,
  rate_limit_violations INTEGER,
  blocked_ips TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_conn INTEGER;
  v_failed_conn INTEGER;
  v_ssl_violations INTEGER;
  v_rate_violations INTEGER;
  v_blocked_ips TEXT[];
BEGIN
  -- Get active connections
  SELECT COUNT(*) INTO v_active_conn
  FROM pg_stat_activity 
  WHERE state = 'active';

  -- Get failed connections from last hour
  SELECT COUNT(*) INTO v_failed_conn
  FROM healthcare_access_audit 
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND success = false
    AND event_type = 'connection_failed';

  -- Get SSL violations
  SELECT COUNT(*) INTO v_ssl_violations
  FROM security_violations
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND violation_type = 'ssl_required'
    AND resolved = false;

  -- Get rate limit violations  
  SELECT COUNT(*) INTO v_rate_violations
  FROM security_violations
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND violation_type = 'rate_limit_exceeded'
    AND resolved = false;

  -- Get blocked IPs (hashed for privacy)
  SELECT ARRAY_AGG(DISTINCT client_ip_hash) INTO v_blocked_ips
  FROM security_violations
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND violation_type = 'ip_blocked'
    AND resolved = false;

  -- Return monitoring results
  active_connections := v_active_conn;
  failed_connections := v_failed_conn;
  ssl_violations := v_ssl_violations;
  rate_limit_violations := v_rate_violations;
  blocked_ips := COALESCE(v_blocked_ips, ARRAY[]::TEXT[]);

  RETURN NEXT;
END;
$$;

-- Function for real-time security alerting
CREATE OR REPLACE FUNCTION send_security_alert(
  p_alert_type VARCHAR(50),
  p_severity VARCHAR(20),
  p_details JSONB,
  p_immediate BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id UUID;
  v_alert_threshold INTEGER;
  v_recent_alerts INTEGER;
BEGIN
  -- Generate alert ID
  v_alert_id := gen_random_uuid();

  -- Check alert rate limiting to prevent spam
  v_alert_threshold := CASE p_severity
    WHEN 'critical' THEN 5   -- Max 5 critical alerts per hour
    WHEN 'high' THEN 10      -- Max 10 high alerts per hour  
    WHEN 'medium' THEN 20    -- Max 20 medium alerts per hour
    ELSE 50                  -- Max 50 low alerts per hour
  END;

  -- Count recent similar alerts
  SELECT COUNT(*) INTO v_recent_alerts
  FROM security_alerts
  WHERE alert_type = p_alert_type
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Skip alert if threshold exceeded (unless immediate)
  IF v_recent_alerts >= v_alert_threshold AND NOT p_immediate THEN
    RETURN NULL;
  END IF;

  -- Insert security alert
  INSERT INTO security_alerts (
    id,
    alert_type,
    severity,
    details,
    created_at,
    sent_at,
    status
  )
  VALUES (
    v_alert_id,
    p_alert_type,
    p_severity,
    p_details,
    NOW(),
    CASE WHEN p_immediate THEN NOW() ELSE NULL END,
    CASE WHEN p_immediate THEN 'sent' ELSE 'pending' END
  );

  -- For critical/high alerts, also create security violation
  IF p_severity IN ('critical', 'high') THEN
    INSERT INTO security_violations (
      violation_type,
      severity,
      details,
      created_at
    )
    VALUES (
      p_alert_type,
      p_severity,
      p_details,
      NOW()
    );
  END IF;

  -- Log the alert creation
  PERFORM healthcare_access_audit(
    'security_alert_created',
    NULL,
    NULL,
    jsonb_build_object(
      'alert_id', v_alert_id,
      'alert_type', p_alert_type,
      'severity', p_severity
    ),
    true
  );

  RETURN v_alert_id;
END;
$$;

-- ==================================================================
-- SECURITY ALERTS TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')),
  resolution_notes TEXT
);

-- Indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_status 
ON security_alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_severity 
ON security_alerts (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type 
ON security_alerts (alert_type, created_at DESC);

-- ==================================================================
-- AUTOMATED SECURITY MONITORING TRIGGERS
-- ==================================================================

-- Create trigger function for automated threat detection
CREATE OR REPLACE FUNCTION automated_threat_detection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_violation_count INTEGER;
  v_alert_details JSONB;
BEGIN
  -- Detect multiple RLS violations from same IP
  IF NEW.violation_type = 'rls_violation' THEN
    SELECT COUNT(*) INTO v_violation_count
    FROM security_violations
    WHERE client_ip_hash = NEW.client_ip_hash
      AND violation_type = 'rls_violation'
      AND created_at > NOW() - INTERVAL '10 minutes';

    -- Alert on 3+ RLS violations in 10 minutes
    IF v_violation_count >= 3 THEN
      v_alert_details := jsonb_build_object(
        'client_ip_hash', NEW.client_ip_hash,
        'violation_count', v_violation_count,
        'time_window', '10 minutes',
        'pattern', 'multiple_rls_violations'
      );

      PERFORM send_security_alert(
        'repeated_rls_violations',
        'high',
        v_alert_details,
        true -- immediate alert
      );
    END IF;
  END IF;

  -- Detect potential brute force attacks
  IF NEW.violation_type = 'rate_limit_exceeded' THEN
    SELECT COUNT(*) INTO v_violation_count
    FROM security_violations
    WHERE client_ip_hash = NEW.client_ip_hash
      AND violation_type = 'rate_limit_exceeded'
      AND created_at > NOW() - INTERVAL '5 minutes';

    -- Alert on rapid rate limit violations
    IF v_violation_count >= 5 THEN
      v_alert_details := jsonb_build_object(
        'client_ip_hash', NEW.client_ip_hash,
        'violation_count', v_violation_count,
        'time_window', '5 minutes',
        'pattern', 'potential_brute_force'
      );

      PERFORM send_security_alert(
        'potential_brute_force',
        'critical',
        v_alert_details,
        true -- immediate alert
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on security_violations table
CREATE TRIGGER trigger_automated_threat_detection
  AFTER INSERT ON security_violations
  FOR EACH ROW
  EXECUTE FUNCTION automated_threat_detection();

-- ==================================================================
-- SENTRY INTEGRATION SETUP
-- ==================================================================

-- Function to format events for Sentry integration
CREATE OR REPLACE FUNCTION format_sentry_event(
  p_event_type VARCHAR(50),
  p_level VARCHAR(20),
  p_message TEXT,
  p_extra JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_sentry_event JSONB;
BEGIN
  v_sentry_event := jsonb_build_object(
    'timestamp', extract(epoch from NOW()),
    'level', LOWER(p_level),
    'logger', 'aura.database.security',
    'platform', 'postgres',
    'server_name', current_setting('cluster_name', true),
    'message', jsonb_build_object(
      'message', p_message,
      'params', NULL
    ),
    'extra', p_extra || jsonb_build_object(
      'database_name', current_database(),
      'schema_version', (SELECT migration_name FROM migration_history ORDER BY executed_at DESC LIMIT 1)
    ),
    'tags', jsonb_build_object(
      'environment', COALESCE(current_setting('app.environment', true), 'production'),
      'component', 'database_security',
      'event_type', p_event_type
    ),
    'fingerprint', ARRAY[p_event_type, p_level]
  );

  -- Add privacy-safe context without PII
  v_sentry_event := v_sentry_event || jsonb_build_object(
    'contexts', jsonb_build_object(
      'database', jsonb_build_object(
        'type', 'postgresql',
        'version', version(),
        'security_mode', 'rls_enforced'
      )
    )
  );

  RETURN v_sentry_event;
END;
$$;

-- Function to send events to Sentry (placeholder for webhook integration)
CREATE OR REPLACE FUNCTION send_to_sentry(
  p_event_type VARCHAR(50),
  p_level VARCHAR(20),
  p_message TEXT,
  p_extra JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_sentry_event JSONB;
  v_webhook_url TEXT;
  v_result BOOLEAN := false;
BEGIN
  -- Format event for Sentry
  v_sentry_event := format_sentry_event(p_event_type, p_level, p_message, p_extra);

  -- Get Sentry webhook URL from configuration
  v_webhook_url := current_setting('app.sentry_webhook_url', true);

  IF v_webhook_url IS NOT NULL THEN
    -- In production, this would use pg_net or similar extension
    -- to make HTTP requests to Sentry webhook
    
    -- For now, log to sentry_events table for processing
    INSERT INTO sentry_events (
      event_data,
      webhook_url,
      created_at,
      status
    )
    VALUES (
      v_sentry_event,
      v_webhook_url,
      NOW(),
      'pending'
    );

    v_result := true;
  END IF;

  RETURN v_result;
END;
$$;

-- ==================================================================
-- SENTRY EVENTS TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS sentry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_data JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retry')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- Index for processing Sentry events
CREATE INDEX IF NOT EXISTS idx_sentry_events_pending 
ON sentry_events (created_at) 
WHERE status = 'pending';

-- ==================================================================
-- QUARTERLY ACCESS REVIEW AUTOMATION
-- ==================================================================

-- Function to generate quarterly access review data
CREATE OR REPLACE FUNCTION generate_access_review(
  p_quarter INTEGER,
  p_year INTEGER
)
RETURNS TABLE(
  review_id UUID,
  report_data JSONB,
  total_users BIGINT,
  total_shares BIGINT,
  security_incidents BIGINT,
  recommendations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_report_data JSONB;
  v_total_users BIGINT;
  v_total_shares BIGINT;
  v_incidents BIGINT;
  v_recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Calculate quarter date range
  v_start_date := DATE(p_year || '-' || ((p_quarter - 1) * 3 + 1) || '-01');
  v_end_date := (v_start_date + INTERVAL '3 months - 1 day')::DATE;
  
  -- Generate review ID
  v_review_id := gen_random_uuid();

  -- Count active users (privacy-safe)
  SELECT COUNT(DISTINCT user_id) INTO v_total_users
  FROM healthcare_access_audit
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND user_id IS NOT NULL;

  -- Count healthcare shares created
  SELECT COUNT(*) INTO v_total_shares
  FROM healthcare_access_audit
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND event_type = 'share_created';

  -- Count security incidents
  SELECT COUNT(*) INTO v_incidents
  FROM security_violations
  WHERE created_at >= v_start_date 
    AND created_at <= v_end_date + INTERVAL '1 day'
    AND severity IN ('high', 'critical');

  -- Generate recommendations based on data
  IF v_incidents > 10 THEN
    v_recommendations := v_recommendations || 'Review and strengthen security policies due to high incident count';
  END IF;

  IF v_total_shares > v_total_users * 0.5 THEN
    v_recommendations := v_recommendations || 'High sharing activity detected - review sharing patterns';
  END IF;

  -- Build report data (privacy-safe)
  v_report_data := jsonb_build_object(
    'quarter', p_quarter,
    'year', p_year,
    'period_start', v_start_date,
    'period_end', v_end_date,
    'generated_at', NOW(),
    'metrics', jsonb_build_object(
      'total_users', v_total_users,
      'total_shares', v_total_shares,
      'security_incidents', v_incidents,
      'avg_daily_users', ROUND(v_total_users / 90.0, 2)
    )
  );

  -- Insert review record
  INSERT INTO access_reviews (
    id,
    quarter,
    year,
    report_data,
    total_users,
    total_shares,
    security_incidents,
    recommendations,
    created_at,
    status
  )
  VALUES (
    v_review_id,
    p_quarter,
    p_year,
    v_report_data,
    v_total_users,
    v_total_shares,
    v_incidents,
    v_recommendations,
    NOW(),
    'completed'
  );

  -- Return results
  review_id := v_review_id;
  report_data := v_report_data;
  total_users := v_total_users;
  total_shares := v_total_shares;
  security_incidents := v_incidents;
  recommendations := v_recommendations;

  RETURN NEXT;
END;
$$;

-- ==================================================================
-- ACCESS REVIEWS TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS access_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER NOT NULL CHECK (year >= 2024),
  report_data JSONB NOT NULL,
  total_users BIGINT NOT NULL DEFAULT 0,
  total_shares BIGINT NOT NULL DEFAULT 0,
  security_incidents BIGINT NOT NULL DEFAULT 0,
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reviewed', 'archived')),
  UNIQUE(quarter, year)
);

-- ==================================================================
-- GRANT PERMISSIONS
-- ==================================================================

-- Grant service role access to monitoring functions
GRANT EXECUTE ON FUNCTION detect_rls_violations TO service_role;
GRANT EXECUTE ON FUNCTION monitor_connection_security TO service_role;
GRANT EXECUTE ON FUNCTION send_security_alert TO service_role;
GRANT EXECUTE ON FUNCTION send_to_sentry TO service_role;
GRANT EXECUTE ON FUNCTION generate_access_review TO service_role;

-- Grant table access for monitoring
GRANT INSERT, SELECT ON security_alerts TO service_role;
GRANT INSERT, SELECT ON sentry_events TO service_role;
GRANT INSERT, SELECT, UPDATE ON access_reviews TO service_role;

-- ==================================================================
-- RECORD MIGRATION IN HISTORY
-- ==================================================================

INSERT INTO migration_history (migration_name) 
VALUES ('003_audit_monitoring.sql');

-- ==================================================================
-- VALIDATION AND TESTING
-- ==================================================================

-- Test audit function
DO $$
BEGIN
  PERFORM healthcare_access_audit(
    'migration_test',
    NULL,
    NULL,
    jsonb_build_object('test', 'audit_system'),
    true,
    NULL
  );
  
  RAISE NOTICE 'Audit and monitoring system initialized successfully';
END $$;