-- Initialize PostgreSQL extensions for local development
-- This script runs automatically when the PostgreSQL container starts

-- Enable required extensions (matches Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create auth schema to simulate Supabase auth
CREATE SCHEMA IF NOT EXISTS auth;

-- Create basic auth.users table structure for RLS testing
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create auth.uid() function to simulate Supabase auth
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.sub', true)::uuid,
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
    );
$$;

-- Create auth.role() function to simulate Supabase auth
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
        current_user
    );
$$;

-- Create authenticated and anon roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END
$$;

-- Grant basic permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
GRANT SELECT ON auth.users TO authenticated;