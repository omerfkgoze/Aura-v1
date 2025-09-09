-- RLS Policies for users table
-- Description: User table access policies with minimal metadata exposure
-- Author: Dev Agent (Story 1.1)

-- ==================================================================
-- USERS TABLE RLS POLICIES
-- ==================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_user_access" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;

-- SELECT: Users can only access their own user record
CREATE POLICY "users_user_access"
ON users FOR SELECT
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- INSERT: Users can create their own user record (handled by Supabase Auth)
-- This policy allows authenticated users to create their record if it matches their auth.uid()
CREATE POLICY "users_insert"
ON users FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid());

-- UPDATE: Users can only update their own last_active_at timestamp
CREATE POLICY "users_update"
ON users FOR UPDATE
USING (auth.uid() IS NOT NULL AND id = auth.uid())
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    id = auth.uid() AND
    -- Only allow updating last_active_at, prevent changes to id and created_at
    OLD.id = NEW.id AND
    OLD.created_at = NEW.created_at
);

-- DELETE: Users can delete their own record (account deletion)
CREATE POLICY "users_delete"
ON users FOR DELETE
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- ==================================================================
-- SERVICE ROLE RESTRICTIONS FOR USERS TABLE
-- ==================================================================

-- Service role access restrictions
-- Revoke all privileges from service role on users table
REVOKE ALL ON users FROM service_role;

-- Grant minimal read access for system health checks
GRANT SELECT (id, created_at, last_active_at) ON users TO service_role;

-- ==================================================================
-- ANONYMOUS ROLE RESTRICTIONS
-- ==================================================================

-- Revoke all access from anonymous role
REVOKE ALL ON users FROM anon;

-- No read access for anonymous users - users must be authenticated
-- to access any user data

-- ==================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================

COMMENT ON POLICY "users_user_access" ON users IS 'Users can only SELECT their own user record via auth.uid() validation';
COMMENT ON POLICY "users_insert" ON users IS 'Users can INSERT their own user record during registration';
COMMENT ON POLICY "users_update" ON users IS 'Users can UPDATE only their last_active_at timestamp';
COMMENT ON POLICY "users_delete" ON users IS 'Users can DELETE their own record for account deletion';