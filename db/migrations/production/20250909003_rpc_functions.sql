-- Migration: 20250909003_rpc_functions.sql
-- Description: Secure RPC functions for optimistic concurrency and healthcare sharing
-- Author: Dev Agent (Story 1.1)
-- Created: 2025-09-09

-- ==================================================================
-- OPTIMISTIC CONCURRENCY RPC FUNCTION
-- ==================================================================

CREATE OR REPLACE FUNCTION update_cycle_data_optimistic(
  p_id uuid,
  p_encrypted_payload text,
  p_crypto_envelope jsonb,
  p_expected_version integer,
  p_device_id text,
  p_local_timestamp timestamp with time zone
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_version integer;
  updated_record encrypted_cycle_data%ROWTYPE;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Authentication required'
    );
  END IF;

  -- Get current version with row-level lock
  SELECT version INTO current_version
  FROM encrypted_cycle_data
  WHERE id = p_id AND user_id = auth.uid()
  FOR UPDATE;

  -- Check if record exists and user owns it
  IF current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Record not found or access denied'
    );
  END IF;

  -- Check version for optimistic concurrency
  IF current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'version_conflict',
      'message', 'Record was modified by another process',
      'current_version', current_version,
      'expected_version', p_expected_version
    );
  END IF;

  -- Update the record with new version
  UPDATE encrypted_cycle_data
  SET 
    encrypted_payload = p_encrypted_payload,
    crypto_envelope = p_crypto_envelope,
    version = current_version + 1,
    device_id = p_device_id,
    local_timestamp = p_local_timestamp,
    sync_status = 'synced',
    synced_at = now(),
    updated_at = now()
  WHERE id = p_id AND user_id = auth.uid()
  RETURNING * INTO updated_record;

  -- Log the update in audit trail
  INSERT INTO security_audit_log (
    user_id, event_type, event_data, device_id_hash, success
  ) VALUES (
    auth.uid(), 
    'cycle_data_update',
    jsonb_build_object(
      'record_id', p_id,
      'version_from', current_version,
      'version_to', current_version + 1,
      'sync_status', 'synced'
    ),
    encode(digest(p_device_id, 'sha256'), 'hex'),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', updated_record.id,
      'version', updated_record.version,
      'synced_at', updated_record.synced_at,
      'sync_status', updated_record.sync_status
    )
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO security_audit_log (
    user_id, event_type, event_data, device_id_hash, success, error_code
  ) VALUES (
    auth.uid(), 
    'cycle_data_update',
    jsonb_build_object(
      'record_id', p_id,
      'expected_version', p_expected_version
    ),
    encode(digest(p_device_id, 'sha256'), 'hex'),
    false,
    SQLSTATE
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'An error occurred while updating the record'
  );
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION update_cycle_data_optimistic TO authenticated;

-- ==================================================================
-- SHARE TOKEN VALIDATION RPC FUNCTION
-- ==================================================================

CREATE OR REPLACE FUNCTION validate_share_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  share_record healthcare_share%ROWTYPE;
  token_valid boolean := false;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_token_format'
    );
  END IF;

  -- Check if token exists and is valid
  SELECT hs.* INTO share_record
  FROM healthcare_share hs
  JOIN share_token st ON hs.id = st.share_id
  WHERE st.token = p_token 
    AND hs.status = 'active' 
    AND hs.expires_at > now()
    AND st.expires_at > now();

  IF share_record.id IS NULL THEN
    -- Log invalid access attempt
    INSERT INTO healthcare_share_audit (
      share_id, action, success, created_at
    ) VALUES (
      NULL, 'accessed', false, now()
    );

    RETURN jsonb_build_object(
      'valid', false,
      'error', 'token_not_found_or_expired'
    );
  END IF;

  -- Update access count and last accessed
  UPDATE healthcare_share
  SET 
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = share_record.id;

  -- Log successful access
  INSERT INTO healthcare_share_audit (
    share_id, action, accessor_device_type, success
  ) VALUES (
    share_record.id, 'accessed', 'unknown', true
  );

  RETURN jsonb_build_object(
    'valid', true,
    'share_id', share_record.id,
    'expires_at', share_record.expires_at,
    'access_count', share_record.access_count + 1,
    'encrypted_share_data', share_record.encrypted_share_data,
    'crypto_envelope', share_record.crypto_envelope
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO healthcare_share_audit (
    share_id, action, success, created_at
  ) VALUES (
    NULL, 'accessed', false, now()
  );

  RETURN jsonb_build_object(
    'valid', false,
    'error', 'validation_error'
  );
END;
$$;

-- Grant execute permission to anon and authenticated users for sharing
GRANT EXECUTE ON FUNCTION validate_share_token TO anon, authenticated;

-- ==================================================================
-- HEALTHCARE ACCESS AUDIT RPC FUNCTION
-- ==================================================================

CREATE OR REPLACE FUNCTION healthcare_access_audit(
  p_share_id uuid,
  p_action text,
  p_device_type text DEFAULT 'unknown',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  share_exists boolean := false;
  ip_hash text;
BEGIN
  -- Validate action
  IF p_action NOT IN ('created', 'accessed', 'expired', 'revoked') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_action'
    );
  END IF;

  -- Check if share exists (for non-creation actions)
  IF p_action != 'created' THEN
    SELECT EXISTS(
      SELECT 1 FROM healthcare_share 
      WHERE id = p_share_id
    ) INTO share_exists;

    IF NOT share_exists THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'share_not_found'
      );
    END IF;
  END IF;

  -- Hash IP address for privacy
  IF p_ip_address IS NOT NULL THEN
    ip_hash := encode(digest(p_ip_address::text, 'sha256'), 'hex');
  END IF;

  -- Insert audit record
  INSERT INTO healthcare_share_audit (
    share_id,
    action,
    accessor_device_type,
    access_ip_hash,
    success
  ) VALUES (
    p_share_id,
    p_action,
    COALESCE(p_device_type, 'unknown'),
    ip_hash,
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Audit log created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'audit_log_failed',
    'message', 'Failed to create audit log'
  );
END;
$$;

-- Grant execute permission to service role for system logging
GRANT EXECUTE ON FUNCTION healthcare_access_audit TO service_role;

-- ==================================================================
-- DEVICE KEY ROTATION RPC FUNCTION
-- ==================================================================

CREATE OR REPLACE FUNCTION rotate_device_key(
  p_device_id_hash text,
  p_new_encrypted_master_key text,
  p_new_key_derivation_path text,
  p_platform text DEFAULT NULL,
  p_app_version text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_key_record device_key%ROWTYPE;
  new_key_version integer;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized'
    );
  END IF;

  -- Get current key record
  SELECT * INTO current_key_record
  FROM device_key
  WHERE user_id = auth.uid() 
    AND device_id_hash = p_device_id_hash 
    AND status = 'active'
  FOR UPDATE;

  IF current_key_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_key_not_found'
    );
  END IF;

  -- Calculate new version
  new_key_version := current_key_record.key_version + 1;

  -- Update the key with new rotation schedule
  UPDATE device_key
  SET
    encrypted_master_key = p_new_encrypted_master_key,
    key_derivation_path = p_new_key_derivation_path,
    key_version = new_key_version,
    next_rotation_at = now() + interval '90 days',
    platform = COALESCE(p_platform, platform),
    app_version = COALESCE(p_app_version, app_version),
    last_active_at = now()
  WHERE id = current_key_record.id;

  -- Log the rotation
  INSERT INTO security_audit_log (
    user_id, event_type, event_data, device_id_hash, success
  ) VALUES (
    auth.uid(),
    'key_rotation',
    jsonb_build_object(
      'device_key_id', current_key_record.id,
      'version_from', current_key_record.key_version,
      'version_to', new_key_version,
      'platform', COALESCE(p_platform, current_key_record.platform)
    ),
    p_device_id_hash,
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'key_version', new_key_version,
    'next_rotation_at', now() + interval '90 days'
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO security_audit_log (
    user_id, event_type, event_data, device_id_hash, success, error_code
  ) VALUES (
    auth.uid(),
    'key_rotation',
    jsonb_build_object(
      'device_id_hash', p_device_id_hash,
      'error', 'rotation_failed'
    ),
    p_device_id_hash,
    false,
    SQLSTATE
  );

  RETURN jsonb_build_object(
    'success', false,
    'error', 'rotation_failed'
  );
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION rotate_device_key TO authenticated;