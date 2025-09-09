-- RLS Policies for healthcare_share table
-- Description: Healthcare sharing with secure token-based access
-- Author: Dev Agent (Story 1.1)

-- ==================================================================
-- HEALTHCARE_SHARE TABLE RLS POLICIES
-- ==================================================================

-- Enable RLS
ALTER TABLE healthcare_share ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "healthcare_share_user_isolation" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_token_access" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_insert" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_update" ON healthcare_share;
DROP POLICY IF EXISTS "healthcare_share_delete" ON healthcare_share;

-- SELECT: Users can access their own shares OR valid token-based access
CREATE POLICY "healthcare_share_user_isolation"
ON healthcare_share FOR SELECT
USING (
    -- Owner access: users can see their own shares
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Token-based access: valid token for active, non-expired shares
    (
        share_token = current_setting('request.headers', true)::json->>'x-share-token' AND
        status = 'active' AND
        expires_at > now()
    )
);

-- INSERT: Users can only create their own healthcare shares
CREATE POLICY "healthcare_share_insert"
ON healthcare_share FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    -- Validate crypto envelope structure
    validate_crypto_envelope(crypto_envelope) AND
    -- Ensure encrypted share data is not empty
    length(encrypted_share_data) > 0 AND
    -- Ensure share token is sufficient length (security)
    length(share_token) >= 32 AND
    -- Ensure expiration is in the future
    expires_at > now() AND
    -- Default status should be active
    status = 'active' AND
    -- Default access count should be 0
    access_count = 0
);

-- UPDATE: Users can update their own shares, token users can only update access tracking
CREATE POLICY "healthcare_share_update"
ON healthcare_share FOR UPDATE
USING (
    -- Owner can update their own shares
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Token holder can update access tracking only
    (
        share_token = current_setting('request.headers', true)::json->>'x-share-token' AND
        status = 'active' AND
        expires_at > now()
    )
)
WITH CHECK (
    CASE 
        -- Owner updates: full control except user_id
        WHEN (auth.uid() IS NOT NULL AND user_id = auth.uid()) THEN
            -- Prevent changing user_id
            OLD.user_id = NEW.user_id AND
            -- Validate crypto envelope if changed
            (OLD.crypto_envelope = NEW.crypto_envelope OR validate_crypto_envelope(NEW.crypto_envelope)) AND
            -- Status transitions validation
            CASE NEW.status
                WHEN 'active' THEN OLD.status IN ('active', 'expired')  -- can reactivate
                WHEN 'expired' THEN OLD.status IN ('active', 'expired')  -- can expire
                WHEN 'revoked' THEN OLD.status IN ('active', 'expired')  -- can revoke
                ELSE false
            END
        -- Token updates: only access tracking
        WHEN (
            share_token = current_setting('request.headers', true)::json->>'x-share-token' AND
            OLD.status = 'active' AND 
            OLD.expires_at > now()
        ) THEN
            -- Only allow updating access tracking fields
            OLD.user_id = NEW.user_id AND
            OLD.encrypted_share_data = NEW.encrypted_share_data AND
            OLD.crypto_envelope = NEW.crypto_envelope AND
            OLD.share_token = NEW.share_token AND
            OLD.status = NEW.status AND
            OLD.expires_at = NEW.expires_at AND
            OLD.device_type = NEW.device_type AND
            OLD.created_at = NEW.created_at AND
            -- Access count can only increase
            NEW.access_count >= OLD.access_count AND
            -- Last accessed can be updated to now
            NEW.last_accessed_at >= OLD.last_accessed_at
        ELSE false
    END
);

-- DELETE: Only users can delete their own shares
CREATE POLICY "healthcare_share_delete"
ON healthcare_share FOR DELETE
USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
);

-- ==================================================================
-- SERVICE ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all privileges from service role
REVOKE ALL ON healthcare_share FROM service_role;

-- Service role has NO access to healthcare shares
-- This ensures zero-knowledge principle

-- ==================================================================
-- ANONYMOUS ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all access from anonymous role
REVOKE ALL ON healthcare_share FROM anon;

-- Anonymous users have NO access to healthcare shares

-- ==================================================================
-- HEALTHCARE SHARING SECURITY FUNCTIONS
-- ==================================================================

-- Function to validate share token access
CREATE OR REPLACE FUNCTION validate_share_access(token_value text)
RETURNS boolean AS $$
DECLARE
    share_record healthcare_share%ROWTYPE;
BEGIN
    -- Get share record by token
    SELECT * INTO share_record
    FROM healthcare_share
    WHERE share_token = token_value;
    
    -- Check if share exists and is valid
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if share is active and not expired
    IF share_record.status != 'active' OR share_record.expires_at <= now() THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment access count safely
CREATE OR REPLACE FUNCTION increment_share_access(token_value text)
RETURNS void AS $$
BEGIN
    UPDATE healthcare_share 
    SET 
        access_count = access_count + 1,
        last_accessed_at = now()
    WHERE 
        share_token = token_value AND
        status = 'active' AND 
        expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit healthcare share access
CREATE OR REPLACE FUNCTION audit_healthcare_share_access()
RETURNS TRIGGER AS $$
DECLARE
    access_type text;
    current_token text;
BEGIN
    -- Determine access type
    current_token := current_setting('request.headers', true)::json->>'x-share-token';
    
    IF current_token IS NOT NULL AND current_token = COALESCE(NEW.share_token, OLD.share_token) THEN
        access_type := 'token_access';
    ELSE
        access_type := 'owner_access';
    END IF;
    
    -- Log access to healthcare share audit table
    INSERT INTO healthcare_share_audit (
        share_id,
        action,
        accessor_device_type,
        access_ip_hash,
        success
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE 
            WHEN access_type = 'token_access' THEN 'external'
            ELSE 'owner'
        END,
        -- Hash IP for privacy
        left(encode(digest(
            coalesce(
                current_setting('request.headers', true)::json->>'x-forwarded-for',
                current_setting('request.headers', true)::json->>'x-real-ip',
                '0.0.0.0'
            ), 'sha256'
        ), 'hex'), 16),
        true
    );
    
    -- Also log to general security audit
    INSERT INTO security_audit_log (
        user_id, 
        event_type, 
        event_data,
        success
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP || '_healthcare_share',
        jsonb_build_object(
            'table', 'healthcare_share',
            'operation', TG_OP,
            'access_type', access_type,
            'share_status', COALESCE(NEW.status, OLD.status),
            'expires_at', COALESCE(NEW.expires_at, OLD.expires_at)
        ),
        true
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger for healthcare share operations
CREATE TRIGGER audit_healthcare_share_operations
    AFTER INSERT OR UPDATE OR DELETE ON healthcare_share
    FOR EACH ROW EXECUTE PROCEDURE audit_healthcare_share_access();

-- ==================================================================
-- AUTOMATIC EXPIRATION MANAGEMENT
-- ==================================================================

-- Function to handle automatic expiration
CREATE OR REPLACE FUNCTION handle_share_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- If share is accessed after expiration, mark as expired
    IF NEW.expires_at <= now() AND OLD.status = 'active' THEN
        NEW.status = 'expired';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic expiration
CREATE TRIGGER handle_healthcare_share_expiration
    BEFORE UPDATE ON healthcare_share
    FOR EACH ROW EXECUTE PROCEDURE handle_share_expiration();

-- ==================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================

COMMENT ON POLICY "healthcare_share_user_isolation" ON healthcare_share IS 
'Users can SELECT their own healthcare shares OR access via valid token';

COMMENT ON POLICY "healthcare_share_insert" ON healthcare_share IS 
'Users can INSERT their own healthcare shares with validation';

COMMENT ON POLICY "healthcare_share_update" ON healthcare_share IS 
'Users can UPDATE their own shares, token holders can update access tracking';

COMMENT ON POLICY "healthcare_share_delete" ON healthcare_share IS 
'Only users can DELETE their own healthcare shares';

COMMENT ON FUNCTION validate_share_access IS 
'Validates if a share token provides valid access to healthcare data';

COMMENT ON FUNCTION increment_share_access IS 
'Safely increments access count for healthcare share';

COMMENT ON FUNCTION audit_healthcare_share_access IS 
'Audit trigger for all healthcare share operations';

COMMENT ON TRIGGER audit_healthcare_share_operations ON healthcare_share IS 
'Logs all healthcare share access for security monitoring';

COMMENT ON TRIGGER handle_healthcare_share_expiration ON healthcare_share IS 
'Automatically handles share expiration status updates';