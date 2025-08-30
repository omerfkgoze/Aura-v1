-- Development database initialization script
-- This script sets up the basic database structure for local development
-- Production schema will be managed through Supabase migrations

-- Create development extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create development user (for local testing only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aura_dev') THEN
        CREATE ROLE aura_dev WITH LOGIN PASSWORD 'aura_dev_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE aura_dev TO aura_dev;
GRANT USAGE ON SCHEMA public TO aura_dev;
GRANT CREATE ON SCHEMA public TO aura_dev;

-- Create basic tables for development (minimal structure)
-- Note: These are placeholder tables - actual schema will come from Supabase migrations

CREATE TABLE IF NOT EXISTS dev_health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Insert development health check
INSERT INTO dev_health_checks (service_name, status, metadata) 
VALUES ('postgres', 'healthy', '{"version": "15", "environment": "development"}')
ON CONFLICT DO NOTHING;

-- Create development audit log table
CREATE TABLE IF NOT EXISTS dev_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log database initialization
INSERT INTO dev_audit_log (event_type, event_data)
VALUES ('database_initialized', '{"environment": "development", "timestamp": "' || NOW() || '"}');

-- Development-only: Create sample anonymized data
-- This helps with UI development and testing
CREATE TABLE IF NOT EXISTS dev_sample_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type VARCHAR(100) NOT NULL,
    sample_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert anonymized sample data for development
INSERT INTO dev_sample_data (data_type, sample_value) VALUES
('user_preferences', '{"theme": "light", "language": "en", "stealth_mode": false}'),
('cycle_pattern', '{"average_length": 28, "variation": 3, "confidence": 0.85}'),
('symptom_categories', '["mood", "physical", "energy", "sleep"]')
ON CONFLICT DO NOTHING;