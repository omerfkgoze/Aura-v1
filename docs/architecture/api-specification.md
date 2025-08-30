# API Specification

## Database Schema with Complete RLS

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_key ENABLE ROW LEVEL SECURITY;

-- Users table policies (minimal data, own access only)
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Encrypted user preferences policies
CREATE POLICY "User prefs own access" ON encrypted_user_prefs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cycle data with optimistic concurrency
CREATE POLICY "Cycle data own access" ON encrypted_cycle_data
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Healthcare share own access
CREATE POLICY "Healthcare share own access" ON healthcare_share
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Device key management
CREATE POLICY "Device key own access" ON device_key
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- NO direct access to share_token table - RPC only
-- (No policies = no access except via SECURITY DEFINER functions)
```

## Enhanced Schema with Constraints

```sql
-- Encrypted cycle data with strict constraints
CREATE TABLE encrypted_cycle_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_payload TEXT NOT NULL,
  crypto_envelope JSONB NOT NULL,

  -- Optimistic concurrency
  version INTEGER NOT NULL DEFAULT 1,
  device_id_hash TEXT NOT NULL,

  -- Timestamps (UTC ISO)
  local_timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('pending', 'synced', 'conflict')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for performance
  CONSTRAINT valid_crypto_envelope CHECK (
    crypto_envelope ? 'version' AND
    crypto_envelope ? 'algorithm' AND
    crypto_envelope ? 'kdfParams' AND
    crypto_envelope ? 'salt' AND
    crypto_envelope ? 'nonce' AND
    crypto_envelope ? 'keyId'
  )
);

CREATE INDEX idx_cycle_data_user_sync ON encrypted_cycle_data(user_id, sync_status);
CREATE INDEX idx_cycle_data_device_version ON encrypted_cycle_data(device_id_hash, version);
```

## Secure RPC Functions

```sql
-- Healthcare share access via secure RPC
CREATE OR REPLACE FUNCTION validate_share_token(token_input TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  share_record healthcare_share;
  token_record share_token;
  result JSONB;
BEGIN
  -- Validate token exists and not expired
  SELECT * INTO token_record
  FROM share_token
  WHERE token = token_input
    AND expires_at > now()
    AND (single_use = false OR used_at IS NULL);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired token');
  END IF;

  -- Get share data
  SELECT * INTO share_record
  FROM healthcare_share
  WHERE id = token_record.share_id
    AND status = 'active'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Share not found or expired');
  END IF;

  -- Update access tracking (privacy-safe)
  UPDATE healthcare_share
  SET
    access_count = access_count + 1,
    last_accessed_at = now()
  WHERE id = share_record.id;

  -- Mark single-use token as used
  IF token_record.single_use THEN
    UPDATE share_token
    SET used_at = now()
    WHERE token = token_input;
  END IF;

  -- Return encrypted share data only
  RETURN jsonb_build_object(
    'shareId', share_record.id,
    'encryptedShareData', share_record.encrypted_share_data,
    'cryptoEnvelope', share_record.crypto_envelope,
    'expiresAt', share_record.expires_at
  );
END;
$$;

-- Optimistic concurrency update
CREATE OR REPLACE FUNCTION update_cycle_data_optimistic(
  record_id UUID,
  new_payload TEXT,
  new_envelope JSONB,
  current_version INTEGER,
  device_hash TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  update_count INTEGER;
BEGIN
  -- Attempt optimistic update
  UPDATE encrypted_cycle_data
  SET
    encrypted_payload = new_payload,
    crypto_envelope = new_envelope,
    version = version + 1,
    device_id_hash = device_hash,
    updated_at = now(),
    synced_at = now(),
    sync_status = 'synced'
  WHERE id = record_id
    AND user_id = auth.uid()
    AND version = current_version;

  GET DIAGNOSTICS update_count = ROW_COUNT;

  IF update_count = 0 THEN
    -- Check if record exists but version conflict
    IF EXISTS (SELECT 1 FROM encrypted_cycle_data WHERE id = record_id AND user_id = auth.uid()) THEN
      RETURN jsonb_build_object('status', 'conflict', 'message', 'Version conflict detected');
    ELSE
      RETURN jsonb_build_object('status', 'error', 'message', 'Record not found');
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'success', 'newVersion', current_version + 1);
END;
$$;
```

## REST API Endpoints

```typescript
// Cycle data management with optimistic concurrency
POST /api/cycle-data
{
  encryptedPayload: string;
  cryptoEnvelope: CryptoEnvelope;
  deviceIdHash: string;
  localTimestamp: string; // ISO
}

PUT /api/cycle-data/:id
{
  encryptedPayload: string;
  cryptoEnvelope: CryptoEnvelope;
  currentVersion: number; // Optimistic concurrency
  deviceIdHash: string;
}

// Healthcare sharing (encrypted report generation)
POST /api/healthcare/share
{
  encryptedShareData: string;
  cryptoEnvelope: CryptoEnvelope;
  expiresAt: string; // ISO
  singleUse: boolean;
}

// Secure token validation (calls RPC)
POST /api/healthcare/validate-token
{
  token: string;
}

// Encrypted report storage + signed URL
POST /api/healthcare/upload-report
{
  shareId: string;
  encryptedReport: string; // Client-generated PDF/CSV/FHIR
  cryptoEnvelope: CryptoEnvelope;
  contentType: string;
}

GET /api/healthcare/download/:shareId/:token
// Returns time-limited signed URL (5 minutes)
```
