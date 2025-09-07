-- RLS Policies for encrypted_cycle_data table
-- Purpose: Complete user isolation for cycle data with deny-by-default security
-- Author: Dev Agent (Story 0.8)

-- ==================================================================
-- ENCRYPTED_CYCLE_DATA RLS POLICIES
-- ==================================================================

-- Enable RLS (if not already enabled)
ALTER TABLE encrypted_cycle_data ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Users can only access their own cycle data
CREATE POLICY "encrypted_cycle_data_user_isolation"
ON encrypted_cycle_data FOR SELECT
USING (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only access their own records
  AND "userId" = auth.uid()
);

-- INSERT Policy: Users can only insert their own cycle data  
CREATE POLICY "encrypted_cycle_data_insert"
ON encrypted_cycle_data FOR INSERT
WITH CHECK (
  -- Authenticated user required
  auth.uid() IS NOT NULL 
  -- User can only insert records for themselves
  AND "userId" = auth.uid()
);

-- UPDATE Policy: Users can only update their own cycle data
CREATE POLICY "encrypted_cycle_data_update"
ON encrypted_cycle_data FOR UPDATE
USING (
  -- User must own the existing record
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
)
WITH CHECK (
  -- User must own the updated record
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- DELETE Policy: Users can only delete their own cycle data
CREATE POLICY "encrypted_cycle_data_delete"  
ON encrypted_cycle_data FOR DELETE
USING (
  -- User must own the record to delete it
  auth.uid() IS NOT NULL 
  AND "userId" = auth.uid()
);

-- Performance Index: Optimize RLS queries
CREATE INDEX IF NOT EXISTS idx_encrypted_cycle_data_user_updated 
ON encrypted_cycle_data ("userId", "updatedAt" DESC);

-- Documentation
COMMENT ON POLICY "encrypted_cycle_data_user_isolation" ON encrypted_cycle_data 
IS 'Ensures users can only SELECT their own encrypted cycle data. Zero cross-user access.';

COMMENT ON POLICY "encrypted_cycle_data_insert" ON encrypted_cycle_data 
IS 'Ensures users can only INSERT cycle data for their own userId. Prevents data injection attacks.';

COMMENT ON POLICY "encrypted_cycle_data_update" ON encrypted_cycle_data 
IS 'Ensures users can only UPDATE their own cycle data. Prevents unauthorized modifications.';

COMMENT ON POLICY "encrypted_cycle_data_delete" ON encrypted_cycle_data 
IS 'Ensures users can only DELETE their own cycle data. Prevents data destruction attacks.';