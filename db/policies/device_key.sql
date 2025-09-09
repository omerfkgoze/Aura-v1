-- RLS Policies for device_key table
-- Description: Device key management with user isolation
-- Author: Dev Agent (Story 1.1)

-- Enable RLS
ALTER TABLE device_key ENABLE ROW LEVEL SECURITY;

-- DROP existing policies
DROP POLICY IF EXISTS "device_key_user_isolation" ON device_key;
DROP POLICY IF EXISTS "device_key_insert" ON device_key;
DROP POLICY IF EXISTS "device_key_update" ON device_key;
DROP POLICY IF EXISTS "device_key_delete" ON device_key;

-- SELECT: Users can only access their own device keys
CREATE POLICY "device_key_user_isolation"
ON device_key FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- INSERT: Users can only insert their own device keys
CREATE POLICY "device_key_insert"
ON device_key FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    length(device_id_hash) >= 32 AND
    length(encrypted_master_key) > 0 AND
    key_version > 0
);

-- UPDATE: Users can only update their own device keys
CREATE POLICY "device_key_update"
ON device_key FOR UPDATE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid() AND
    OLD.user_id = NEW.user_id
);

-- DELETE: Users can only delete their own device keys
CREATE POLICY "device_key_delete"
ON device_key FOR DELETE
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role restrictions
REVOKE ALL ON device_key FROM service_role;
REVOKE ALL ON device_key FROM anon;