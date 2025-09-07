-- RLS Policies for healthcare_share table
-- Purpose: Healthcare sharing security with user isolation and token-based access control
-- Author: Dev Agent (Story 0.8)

-- ==================================================================
-- HEALTHCARE_SHARE RLS POLICIES
-- ==================================================================

-- Enable RLS (if not already enabled)
ALTER TABLE healthcare_share ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Users can only access their own sharing records
CREATE POLICY "healthcare_share_user_isolation"
ON healthcare_share FOR SELECT
USING (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only access sharing records they created
  AND "userId" = auth.uid()
);

-- INSERT Policy: Users can only create their own sharing records
CREATE POLICY "healthcare_share_insert"
ON healthcare_share FOR INSERT
WITH CHECK (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only create sharing records for themselves
  AND "userId" = auth.uid()
);

-- UPDATE Policy: Users can only update their own sharing records
CREATE POLICY "healthcare_share_update"
ON healthcare_share FOR UPDATE
USING (
  -- User must own the existing sharing record
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
)
WITH CHECK (
  -- User must own the updated sharing record
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- DELETE Policy: Users can only delete their own sharing records
CREATE POLICY "healthcare_share_delete"
ON healthcare_share FOR DELETE
USING (
  -- User must own the sharing record to delete it
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- Performance Index: Optimize RLS queries for sharing records
CREATE INDEX IF NOT EXISTS idx_healthcare_share_user_created
ON healthcare_share ("userId", "createdAt" DESC);

-- Additional Index: Optimize sharing status queries
CREATE INDEX IF NOT EXISTS idx_healthcare_share_active
ON healthcare_share ("userId", "isActive") WHERE "isActive" = true;

-- Documentation
COMMENT ON POLICY "healthcare_share_user_isolation" ON healthcare_share 
IS 'Ensures users can only SELECT healthcare sharing records they created. Complete sharing creator control.';

COMMENT ON POLICY "healthcare_share_insert" ON healthcare_share 
IS 'Ensures users can only INSERT sharing records for their own userId. Prevents unauthorized sharing creation.';

COMMENT ON POLICY "healthcare_share_update" ON healthcare_share 
IS 'Ensures users can only UPDATE their own sharing records. Prevents unauthorized sharing modifications.';

COMMENT ON POLICY "healthcare_share_delete" ON healthcare_share 
IS 'Ensures users can only DELETE their own sharing records. Prevents unauthorized sharing termination.';

-- ==================================================================
-- SHARE_TOKEN RLS POLICIES (Related to healthcare sharing)
-- ==================================================================

-- Enable RLS for share_token table
ALTER TABLE share_token ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Token-based access only (no user enumeration)
CREATE POLICY "share_token_validation"
ON share_token FOR SELECT
USING (
  -- Token must match and be valid (not expired)
  "token" = current_setting('request.jwt.claims', true)::json->>'share_token' 
  AND "expiresAt" > NOW()
);

-- INSERT Policy: Only authenticated users can create tokens for their shares
CREATE POLICY "share_token_insert"
ON share_token FOR INSERT
WITH CHECK (
  -- Authenticated user required
  auth.uid() IS NOT NULL
  -- User must own the associated healthcare_share record
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = "shareId" 
    AND healthcare_share."userId" = auth.uid()
  )
);

-- UPDATE Policy: Only token creator can update via healthcare_share relationship
CREATE POLICY "share_token_update"
ON share_token FOR UPDATE
USING (
  -- User must own the associated healthcare_share
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token."shareId" 
    AND healthcare_share."userId" = auth.uid()
  )
);

-- DELETE Policy: Only token creator can delete
CREATE POLICY "share_token_delete"
ON share_token FOR DELETE
USING (
  -- User must own the associated healthcare_share
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM healthcare_share 
    WHERE healthcare_share.id = share_token."shareId" 
    AND healthcare_share."userId" = auth.uid()
  )
);

-- Performance Index: Optimize token expiration queries
CREATE INDEX IF NOT EXISTS idx_share_token_expires
ON share_token ("expiresAt") WHERE "expiresAt" > NOW();

-- Performance Index: Optimize share relationship queries
CREATE INDEX IF NOT EXISTS idx_share_token_share_id
ON share_token ("shareId", "expiresAt");

-- Documentation for share_token policies
COMMENT ON POLICY "share_token_validation" ON share_token 
IS 'Token-based SELECT access only. Prevents user enumeration, enforces expiration.';

COMMENT ON POLICY "share_token_insert" ON share_token 
IS 'Only healthcare sharing creators can generate tokens for their shares.';

COMMENT ON POLICY "share_token_update" ON share_token 
IS 'Only token creator (via healthcare_share ownership) can modify tokens.';

COMMENT ON POLICY "share_token_delete" ON share_token 
IS 'Only token creator (via healthcare_share ownership) can delete tokens.';