-- RLS Policies for share_token table
-- Description: Token-based access control with no user enumeration
-- Author: Dev Agent (Story 1.1)

-- Enable RLS
ALTER TABLE share_token ENABLE ROW LEVEL SECURITY;

-- DROP existing policies
DROP POLICY IF EXISTS "share_token_validation" ON share_token;
DROP POLICY IF EXISTS "share_token_insert" ON share_token;
DROP POLICY IF EXISTS "share_token_update" ON share_token;
DROP POLICY IF EXISTS "share_token_delete" ON share_token;

-- SELECT: Token-based access only (no user enumeration)
CREATE POLICY "share_token_validation"
ON share_token FOR SELECT
USING (
    token = current_setting('request.headers', true)::json->>'x-share-token' 
    AND expires_at > now()
);

-- INSERT: Only authenticated users can create tokens for their shares
CREATE POLICY "share_token_insert"
ON share_token FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM healthcare_share 
        WHERE healthcare_share.id = share_token.share_id 
        AND healthcare_share.user_id = auth.uid()
    )
);

-- UPDATE: Only token creator can update
CREATE POLICY "share_token_update"
ON share_token FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM healthcare_share 
        WHERE healthcare_share.id = share_token.share_id 
        AND healthcare_share.user_id = auth.uid()
    )
);

-- DELETE: Only token creator can delete
CREATE POLICY "share_token_delete"
ON share_token FOR DELETE
USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM healthcare_share 
        WHERE healthcare_share.id = share_token.share_id 
        AND healthcare_share.user_id = auth.uid()
    )
);

-- Service role restrictions
REVOKE ALL ON share_token FROM service_role;
REVOKE ALL ON share_token FROM anon;