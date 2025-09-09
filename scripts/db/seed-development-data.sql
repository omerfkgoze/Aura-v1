-- Development seed data for local testing
-- Contains anonymized test data that matches production schema
-- This data is safe for development and testing purposes

-- Insert development test users into auth.users (simulating Supabase auth)
INSERT INTO auth.users (id, email, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'dev.user1@aura-test.local', now() - interval '30 days'),
('22222222-2222-2222-2222-222222222222', 'dev.user2@aura-test.local', now() - interval '15 days'),
('33333333-3333-3333-3333-333333333333', 'dev.user3@aura-test.local', now() - interval '7 days')
ON CONFLICT (email) DO NOTHING;

-- Insert corresponding users into main users table
INSERT INTO users (id, created_at, last_active_at) VALUES
('11111111-1111-1111-1111-111111111111', now() - interval '30 days', now() - interval '1 hour'),
('22222222-2222-2222-2222-222222222222', now() - interval '15 days', now() - interval '2 hours'),
('33333333-3333-3333-3333-333333333333', now() - interval '7 days', now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Insert development device keys (anonymized)
INSERT INTO device_key (
    id, user_id, device_id_hash, encrypted_master_key, key_derivation_path, 
    key_version, next_rotation_at, status, platform, app_version, 
    last_active_at, created_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'dev_device_hash_1234567890abcdef1234567890abcdef12345678',
    'encrypted_dev_master_key_user1_device1',
    'm/44/0/0/0',
    1,
    now() + interval '90 days',
    'active',
    'ios',
    '1.0.0-dev',
    now() - interval '1 hour',
    now() - interval '30 days'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'dev_device_hash_abcdef1234567890abcdef1234567890abcdef12',
    'encrypted_dev_master_key_user2_device1',
    'm/44/0/0/0',
    1,
    now() + interval '85 days',
    'active',
    'android',
    '1.0.0-dev',
    now() - interval '2 hours',
    now() - interval '15 days'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'dev_device_hash_fedcba0987654321fedcba0987654321fedcba09',
    'encrypted_dev_master_key_user3_device1',
    'm/44/0/0/0',
    1,
    now() + interval '87 days',
    'active',
    'web',
    '1.0.0-dev',
    now() - interval '30 minutes',
    now() - interval '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Insert development encrypted user preferences (test data)
INSERT INTO encrypted_user_prefs (
    id, user_id, encrypted_payload, crypto_envelope, version, device_id,
    synced_at, created_at, updated_at
) VALUES
(
    'pref1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'encrypted_dev_prefs_user1_theme_notifications_etc',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_1"}',
    1,
    'dev_device_1',
    now() - interval '1 hour',
    now() - interval '30 days',
    now() - interval '1 hour'
),
(
    'pref2222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'encrypted_dev_prefs_user2_theme_notifications_etc',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_2"}',
    1,
    'dev_device_2',
    now() - interval '2 hours',
    now() - interval '15 days',
    now() - interval '2 hours'
),
(
    'pref3333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'encrypted_dev_prefs_user3_theme_notifications_etc',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_3"}',
    1,
    'dev_device_3',
    now() - interval '30 minutes',
    now() - interval '7 days',
    now() - interval '30 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Insert development encrypted cycle data (anonymized health data)
INSERT INTO encrypted_cycle_data (
    id, user_id, encrypted_payload, crypto_envelope, version, device_id,
    local_timestamp, synced_at, sync_status, created_at, updated_at
) VALUES
-- User 1 cycle data
(
    'cycle111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'encrypted_dev_cycle_data_user1_entry1',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_1"}',
    1,
    'dev_device_1',
    now() - interval '5 days',
    now() - interval '5 days',
    'synced',
    now() - interval '5 days',
    now() - interval '5 days'
),
(
    'cycle112-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'encrypted_dev_cycle_data_user1_entry2',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_1"}',
    1,
    'dev_device_1',
    now() - interval '3 days',
    now() - interval '3 days',
    'synced',
    now() - interval '3 days',
    now() - interval '3 days'
),
-- User 2 cycle data
(
    'cycle221-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'encrypted_dev_cycle_data_user2_entry1',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_2"}',
    1,
    'dev_device_2',
    now() - interval '4 days',
    now() - interval '4 days',
    'synced',
    now() - interval '4 days',
    now() - interval '4 days'
),
-- User 3 cycle data (with a conflict example)
(
    'cycle331-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'encrypted_dev_cycle_data_user3_entry1',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_3"}',
    1,
    'dev_device_3',
    now() - interval '2 days',
    now() - interval '2 days',
    'synced',
    now() - interval '2 days',
    now() - interval '2 days'
),
(
    'cycle332-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    'encrypted_dev_cycle_data_user3_entry2_conflict',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_3"}',
    2,
    'dev_device_3_alt',
    now() - interval '1 day',
    now() - interval '1 day',
    'conflict',
    now() - interval '1 day',
    now() - interval '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- Insert development healthcare sharing data (for testing sharing functionality)
INSERT INTO healthcare_share (
    id, user_id, encrypted_share_data, crypto_envelope, share_token,
    status, expires_at, access_count, last_accessed_at, device_type,
    created_at
) VALUES
(
    'share111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'encrypted_dev_share_data_user1_summary',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_1"}',
    'dev_share_token_1234567890abcdef1234567890abcdef',
    'active',
    now() + interval '24 hours',
    3,
    now() - interval '2 hours',
    'mobile',
    now() - interval '12 hours'
),
(
    'share222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'encrypted_dev_share_data_user2_summary',
    '{"version": 1, "algorithm": "AES-GCM", "key_id": "dev_key_2"}',
    'dev_share_token_abcdef1234567890abcdef1234567890',
    'active',
    now() + interval '48 hours',
    1,
    now() - interval '4 hours',
    'desktop',
    now() - interval '6 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding share tokens
INSERT INTO share_token (token, share_id, expires_at) VALUES
(
    'dev_share_token_1234567890abcdef1234567890abcdef',
    'share111-1111-1111-1111-111111111111',
    now() + interval '24 hours'
),
(
    'dev_share_token_abcdef1234567890abcdef1234567890',
    'share222-2222-2222-2222-222222222222',
    now() + interval '48 hours'
)
ON CONFLICT (token) DO NOTHING;

-- Insert development audit logs (privacy-safe examples)
INSERT INTO security_audit_log (
    id, user_id, event_type, event_data, ip_address, user_agent,
    device_id_hash, success, created_at
) VALUES
(
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'login',
    '{"platform": "ios", "app_version": "1.0.0-dev"}',
    '127.0.0.1',
    'Aura-iOS/1.0.0-dev',
    'dev_device_hash_1234567890abcdef1234567890abcdef12345678',
    true,
    now() - interval '1 hour'
),
(
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'cycle_data_sync',
    '{"records_synced": 1, "conflicts": 0}',
    '127.0.0.1',
    'Aura-Android/1.0.0-dev',
    'dev_device_hash_abcdef1234567890abcdef1234567890abcdef12',
    true,
    now() - interval '2 hours'
),
(
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    'healthcare_share_create',
    '{"share_duration_hours": 24, "device_type": "web"}',
    '127.0.0.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'dev_device_hash_fedcba0987654321fedcba0987654321fedcba09',
    true,
    now() - interval '12 hours'
);

-- Insert healthcare sharing audit logs
INSERT INTO healthcare_share_audit (
    id, share_id, action, accessor_device_type, access_ip_hash, success, created_at
) VALUES
(
    gen_random_uuid(),
    'share111-1111-1111-1111-111111111111',
    'created',
    'mobile',
    encode(digest('127.0.0.1', 'sha256'), 'hex'),
    true,
    now() - interval '12 hours'
),
(
    gen_random_uuid(),
    'share111-1111-1111-1111-111111111111',
    'accessed',
    'desktop',
    encode(digest('127.0.0.2', 'sha256'), 'hex'),
    true,
    now() - interval '4 hours'
),
(
    gen_random_uuid(),
    'share222-2222-2222-2222-222222222222',
    'created',
    'desktop',
    encode(digest('127.0.0.1', 'sha256'), 'hex'),
    true,
    now() - interval '6 hours'
);

-- Print development data summary
DO $$
DECLARE
    user_count int;
    cycle_data_count int;
    share_count int;
    audit_count int;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO cycle_data_count FROM encrypted_cycle_data;
    SELECT COUNT(*) INTO share_count FROM healthcare_share;
    SELECT COUNT(*) INTO audit_count FROM security_audit_log;
    
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Development Seed Data Loaded Successfully';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Cycle Data Records: %', cycle_data_count;
    RAISE NOTICE 'Healthcare Shares: %', share_count;
    RAISE NOTICE 'Audit Log Entries: %', audit_count;
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'Development users:';
    RAISE NOTICE '- User 1: 11111111-1111-1111-1111-111111111111';
    RAISE NOTICE '- User 2: 22222222-2222-2222-2222-222222222222';
    RAISE NOTICE '- User 3: 33333333-3333-3333-3333-333333333333';
    RAISE NOTICE 'Share tokens:';
    RAISE NOTICE '- Token 1: dev_share_token_1234567890abcdef1234567890abcdef';
    RAISE NOTICE '- Token 2: dev_share_token_abcdef1234567890abcdef1234567890';
    RAISE NOTICE '===============================================';
END $$;