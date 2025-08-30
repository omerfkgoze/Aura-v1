-- Development seed data for Supabase local development
-- This file contains anonymized sample data for development and testing

-- Insert development health check data
INSERT INTO dev_health_checks (service_name, status, metadata) VALUES
('supabase_auth', 'healthy', '{"provider": "local", "users_count": 0}'),
('supabase_storage', 'healthy', '{"buckets_count": 0, "files_count": 0}'),
('redis_cache', 'healthy', '{"memory_usage": "minimal", "keys_count": 0}')
ON CONFLICT (service_name) DO UPDATE SET
  status = EXCLUDED.status,
  checked_at = NOW(),
  metadata = EXCLUDED.metadata;

-- Log seed data initialization
INSERT INTO dev_audit_log (event_type, event_data) VALUES
('seed_data_loaded', JSON_BUILD_OBJECT(
  'timestamp', NOW(),
  'environment', 'development',
  'tables_seeded', ARRAY['dev_health_checks', 'dev_sample_data']
));

-- Insert additional sample data for UI development
INSERT INTO dev_sample_data (data_type, sample_value) VALUES
('ui_themes', '{"light": {"primary": "#6366f1", "secondary": "#8b5cf6"}, "dark": {"primary": "#4f46e5", "secondary": "#7c3aed"}}'),
('localization_keys', '["welcome_message", "cycle_tracking", "symptom_log", "insights", "settings"]'),
('feature_flags', '{"stealth_mode": true, "cultural_adaptation": true, "paa_alerts": true, "biometric_auth": false}'),
('sample_symptoms', '{"categories": ["physical", "emotional", "energy"], "severity_scale": [1, 2, 3, 4, 5]}')
ON CONFLICT (data_type) DO UPDATE SET
  sample_value = EXCLUDED.sample_value,
  created_at = NOW();

-- Development notification: Seed data loaded successfully
DO $$
BEGIN
  RAISE NOTICE 'Development seed data loaded successfully at %', NOW();
END $$;