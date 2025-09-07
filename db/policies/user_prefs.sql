-- RLS Policies for encrypted_user_prefs table
-- Purpose: Complete user isolation for user preferences with deny-by-default security
-- Author: Dev Agent (Story 0.8)

-- ==================================================================
-- ENCRYPTED_USER_PREFS RLS POLICIES  
-- ==================================================================

-- Enable RLS (if not already enabled)
ALTER TABLE encrypted_user_prefs ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Users can only access their own preferences
CREATE POLICY "encrypted_user_prefs_user_isolation"
ON encrypted_user_prefs FOR SELECT
USING (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only access their own preferences
  AND "userId" = auth.uid()
);

-- INSERT Policy: Users can only insert their own preferences
CREATE POLICY "encrypted_user_prefs_insert"
ON encrypted_user_prefs FOR INSERT
WITH CHECK (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only create preferences for themselves
  AND "userId" = auth.uid()
);

-- UPDATE Policy: Users can only update their own preferences
CREATE POLICY "encrypted_user_prefs_update"
ON encrypted_user_prefs FOR UPDATE
USING (
  -- User must own the existing preferences
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
)
WITH CHECK (
  -- User must own the updated preferences
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- DELETE Policy: Users can only delete their own preferences
CREATE POLICY "encrypted_user_prefs_delete"
ON encrypted_user_prefs FOR DELETE
USING (
  -- User must own the preferences to delete them
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- Performance Index: Optimize RLS queries
CREATE INDEX IF NOT EXISTS idx_encrypted_user_prefs_user_updated 
ON encrypted_user_prefs ("userId", "updatedAt" DESC);

-- Documentation  
COMMENT ON POLICY "encrypted_user_prefs_user_isolation" ON encrypted_user_prefs 
IS 'Ensures users can only SELECT their own encrypted preferences. Complete privacy isolation.';

COMMENT ON POLICY "encrypted_user_prefs_insert" ON encrypted_user_prefs 
IS 'Ensures users can only INSERT preferences for their own userId. Prevents preference injection.';

COMMENT ON POLICY "encrypted_user_prefs_update" ON encrypted_user_prefs 
IS 'Ensures users can only UPDATE their own preferences. Prevents unauthorized preference changes.';

COMMENT ON POLICY "encrypted_user_prefs_delete" ON encrypted_user_prefs 
IS 'Ensures users can only DELETE their own preferences. Prevents preference destruction attacks.';