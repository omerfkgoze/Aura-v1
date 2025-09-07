-- Healthcare Access Audit Function
-- Purpose: Privacy-safe audit logging for healthcare data sharing without PII exposure
-- Author: Dev Agent (Story 0.8)
-- Created: 2025-09-07

-- ==================================================================
-- HEALTHCARE ACCESS AUDIT LOGGING FUNCTION
-- ==================================================================

CREATE OR REPLACE FUNCTION healthcare_access_audit(
  p_event_type VARCHAR(50),
  p_share_id UUID DEFAULT NULL,
  p_token_id UUID DEFAULT NULL,
  p_client_metadata JSONB DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_user_id UUID;
  v_client_ip INET;
  v_user_agent TEXT;
  v_audit_payload JSONB;
BEGIN
  -- Get current user (if authenticated)
  v_user_id := auth.uid();
  
  -- Extract client metadata (privacy-safe only)
  v_client_ip := COALESCE(
    (p_client_metadata->>'client_ip')::INET,
    inet_client_addr()
  );
  
  v_user_agent := COALESCE(
    p_client_metadata->>'user_agent',
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Create privacy-safe audit payload (NO PII)
  v_audit_payload := jsonb_build_object(
    'event_type', p_event_type,
    'timestamp', NOW(),
    'success', p_success,
    'has_user_id', v_user_id IS NOT NULL,
    'has_share_id', p_share_id IS NOT NULL,
    'has_token_id', p_token_id IS NOT NULL,
    'client_ip_hash', encode(digest(v_client_ip::TEXT, 'sha256'), 'hex'),
    'user_agent_hash', encode(digest(COALESCE(v_user_agent, ''), 'sha256'), 'hex'),
    'platform', COALESCE(p_client_metadata->>'platform', 'unknown'),
    'session_context', CASE 
      WHEN v_user_id IS NOT NULL THEN 'authenticated'
      WHEN p_token_id IS NOT NULL THEN 'token_based'
      ELSE 'anonymous'
    END
  );

  -- Add error details if provided (sanitized)
  IF p_error_details IS NOT NULL THEN
    v_audit_payload := v_audit_payload || jsonb_build_object(
      'error_category', CASE
        WHEN p_error_details ILIKE '%rls%' THEN 'access_denied'
        WHEN p_error_details ILIKE '%token%' THEN 'token_invalid'
        WHEN p_error_details ILIKE '%expired%' THEN 'token_expired'
        WHEN p_error_details ILIKE '%rate%' THEN 'rate_limited'
        ELSE 'general_error'
      END,
      'has_error_details', true
    );
  END IF;

  -- Insert audit record
  INSERT INTO healthcare_access_audit (
    id,
    event_type,
    user_id,
    share_id,
    token_id,
    client_ip_hash,
    success,
    audit_payload,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_event_type,
    v_user_id,
    p_share_id,
    p_token_id,
    encode(digest(COALESCE(v_client_ip::TEXT, ''), 'sha256'), 'hex'),
    p_success,
    v_audit_payload,
    NOW()
  )
  RETURNING id INTO v_audit_id;

  -- Log security violations for monitoring
  IF NOT p_success AND p_event_type IN ('rls_violation', 'unauthorized_access', 'token_abuse') THEN
    -- Insert into security violations table for real-time alerting
    INSERT INTO security_violations (
      violation_type,
      severity,
      audit_reference_id,
      client_ip_hash,
      created_at,
      details
    )
    VALUES (
      p_event_type,
      CASE p_event_type
        WHEN 'rls_violation' THEN 'critical'
        WHEN 'unauthorized_access' THEN 'high'
        WHEN 'token_abuse' THEN 'medium'
        ELSE 'low'
      END,
      v_audit_id,
      encode(digest(COALESCE(v_client_ip::TEXT, ''), 'sha256'), 'hex'),
      NOW(),
      v_audit_payload
    );
  END IF;

  RETURN v_audit_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log audit function failures (without exposing sensitive data)
    INSERT INTO system_audit_log (
      event_type,
      success,
      error_message,
      created_at
    )
    VALUES (
      'audit_function_error',
      false,
      SUBSTR(SQLERRM, 1, 500), -- Limit error message length
      NOW()
    );
    
    -- Re-raise the exception for proper error handling
    RAISE;
END;
$$;

-- ==================================================================
-- AUDIT TABLES CREATION
-- ==================================================================

-- Main healthcare access audit table
CREATE TABLE IF NOT EXISTS healthcare_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_id UUID, -- References healthcare_share but nullable for privacy
  token_id UUID, -- References share_token but nullable for privacy
  client_ip_hash VARCHAR(64), -- SHA-256 hash of client IP for privacy
  success BOOLEAN NOT NULL DEFAULT true,
  audit_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security violations table for real-time alerting
CREATE TABLE IF NOT EXISTS security_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  audit_reference_id UUID REFERENCES healthcare_access_audit(id),
  client_ip_hash VARCHAR(64),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB DEFAULT '{}'
);

-- System audit log for audit function monitoring
CREATE TABLE IF NOT EXISTS system_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================================

-- Healthcare access audit indexes
CREATE INDEX IF NOT EXISTS idx_healthcare_audit_created_at 
ON healthcare_access_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_healthcare_audit_event_type 
ON healthcare_access_audit (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_healthcare_audit_user_id 
ON healthcare_access_audit (user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_healthcare_audit_success 
ON healthcare_access_audit (success, created_at DESC) 
WHERE success = false;

-- Security violations indexes
CREATE INDEX IF NOT EXISTS idx_security_violations_unresolved 
ON security_violations (created_at DESC) 
WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_security_violations_severity 
ON security_violations (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_violations_type 
ON security_violations (violation_type, created_at DESC);

-- System audit log index
CREATE INDEX IF NOT EXISTS idx_system_audit_created_at 
ON system_audit_log (created_at DESC);

-- ==================================================================
-- RLS POLICIES FOR AUDIT TABLES
-- ==================================================================

-- Enable RLS on audit tables
ALTER TABLE healthcare_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;

-- Healthcare access audit policies (admin access only)
CREATE POLICY "healthcare_audit_admin_access" 
ON healthcare_access_audit FOR SELECT
USING (
  -- Only authenticated users with admin role can view audit logs
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'role' = 'admin'
  )
);

-- Security violations policies (admin access only)
CREATE POLICY "security_violations_admin_access" 
ON security_violations FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'role' = 'admin'
  )
);

-- System audit log policies (service role only)
CREATE POLICY "system_audit_service_only" 
ON system_audit_log FOR ALL
USING (current_user = 'service_role');

-- ==================================================================
-- AUDIT HELPER FUNCTIONS
-- ==================================================================

-- Function to get audit statistics (privacy-safe)
CREATE OR REPLACE FUNCTION get_audit_statistics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
  event_type VARCHAR(50),
  total_events BIGINT,
  successful_events BIGINT,
  failed_events BIGINT,
  unique_users BIGINT,
  unique_ips BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admin users can access audit statistics
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    h.event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE h.success = true) as successful_events,
    COUNT(*) FILTER (WHERE h.success = false) as failed_events,
    COUNT(DISTINCT h.user_id) as unique_users,
    COUNT(DISTINCT h.client_ip_hash) as unique_ips
  FROM healthcare_access_audit h
  WHERE h.created_at >= p_start_date 
    AND h.created_at <= p_end_date
  GROUP BY h.event_type
  ORDER BY total_events DESC;
END;
$$;

-- Function to get recent security violations
CREATE OR REPLACE FUNCTION get_recent_security_violations(
  p_limit INTEGER DEFAULT 50,
  p_severity VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  violation_type VARCHAR(50),
  severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN,
  client_ip_hash VARCHAR(64)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admin users can access security violations
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.violation_type,
    v.severity,
    v.created_at,
    v.resolved,
    v.client_ip_hash
  FROM security_violations v
  WHERE (p_severity IS NULL OR v.severity = p_severity)
  ORDER BY v.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ==================================================================
-- GRANT PERMISSIONS
-- ==================================================================

-- Grant execute permissions to service role for audit function
GRANT EXECUTE ON FUNCTION healthcare_access_audit TO service_role;
GRANT EXECUTE ON FUNCTION get_audit_statistics TO service_role;
GRANT EXECUTE ON FUNCTION get_recent_security_violations TO service_role;

-- Grant table access to service role for audit operations
GRANT INSERT, SELECT ON healthcare_access_audit TO service_role;
GRANT INSERT, SELECT ON security_violations TO service_role;
GRANT INSERT, SELECT ON system_audit_log TO service_role;

-- ==================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================

COMMENT ON FUNCTION healthcare_access_audit IS 
'Privacy-safe audit logging for healthcare data access. Logs security events without exposing PII. Returns audit record ID for tracking.';

COMMENT ON TABLE healthcare_access_audit IS 
'Audit trail for healthcare data access with privacy-safe logging. No PII stored, only hashed identifiers and metadata.';

COMMENT ON TABLE security_violations IS 
'Security violations detected through audit monitoring. Used for real-time alerting and incident response.';

COMMENT ON TABLE system_audit_log IS 
'System-level audit events including audit function errors and operational events.';