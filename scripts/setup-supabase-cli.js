#!/usr/bin/env node

/**
 * Supabase CLI Setup and Database Migration Workflow
 * Configures Supabase CLI for development and production environments
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class SupabaseCLISetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.supabaseDir = path.join(this.projectRoot, 'supabase');
    this.infrastructureDir = path.join(this.projectRoot, 'infrastructure', 'supabase');
  }

  log(message) {
    console.log(`🔧 ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  executeCommand(command, description) {
    this.log(`${description}...`);
    try {
      const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      this.success(`${description} completed`);
      return output;
    } catch (error) {
      this.error(`${description} failed: ${error.message}`);
      throw error;
    }
  }

  checkSupabaseCLI() {
    this.log('Checking Supabase CLI installation...');

    try {
      const version = execSync('supabase --version', { encoding: 'utf8' });
      this.success(`Supabase CLI found: ${version.trim()}`);
      return true;
    } catch {
      this.error('Supabase CLI not found. Please install it first:');
      console.log('npm install -g supabase');
      console.log('or');
      console.log('brew install supabase/tap/supabase');
      return false;
    }
  }

  initializeSupabaseProject() {
    this.log('Initializing Supabase project...');

    if (!fs.existsSync(this.supabaseDir)) {
      this.executeCommand('supabase init', 'Initialize Supabase project');
    } else {
      this.success('Supabase project already initialized');
    }
  }

  createSupabaseConfig() {
    this.log('Creating Supabase configuration...');

    const configPath = path.join(this.infrastructureDir, 'config.toml');

    if (!fs.existsSync(this.infrastructureDir)) {
      fs.mkdirSync(this.infrastructureDir, { recursive: true });
    }

    const config = `# Supabase CLI Configuration
# Docs: https://supabase.com/docs/guides/cli/config

[api]
enabled = true
port = 54321
schemas = ["public", "auth", "storage"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[graphql]
enabled = false

[inbound_email]
enabled = false

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[realtime]
enabled = true
ip_version = "ipv4"
tenants = [
  { name = "realtime", db_name = "postgres", db_host = "localhost", db_port = 54322, db_ssl = false }
]

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true
enable_email_confirmations = false
enable_sms_confirmations = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[auth.sms]
enable_signup = false
enable_confirmations = false

[auth.external.apple]
enabled = false

[auth.external.azure]
enabled = false

[auth.external.bitbucket]
enabled = false

[auth.external.discord]
enabled = false

[auth.external.facebook]
enabled = false

[auth.external.figma]
enabled = false

[auth.external.github]
enabled = false

[auth.external.gitlab]
enabled = false

[auth.external.google]
enabled = false

[auth.external.keycloak]
enabled = false

[auth.external.linkedin]
enabled = false

[auth.external.notion]
enabled = false

[auth.external.twitch]
enabled = false

[auth.external.twitter]
enabled = false

[auth.external.slack]
enabled = false

[auth.external.spotify]
enabled = false

[auth.external.workos]
enabled = false

[auth.external.zoom]
enabled = false

[edge_runtime]
enabled = true
ip_version = "ipv4"
port = 54324
inspector_port = 8083

[analytics]
enabled = false

[functions]
verify_jwt = true

[storage]
enabled = true
file_size_limit = "50MiB"
`;

    fs.writeFileSync(configPath, config);
    this.success('Supabase configuration created');
  }

  createMigrationTemplate() {
    this.log('Creating migration template...');

    const migrationsDir = path.join(this.supabaseDir, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const templatePath = path.join(migrationsDir, '00000000000000_template.sql');

    if (!fs.existsSync(templatePath)) {
      const template = `-- Migration Template
-- This file serves as a template for creating new migrations
-- 
-- To create a new migration:
-- 1. Run: supabase migration new <description>
-- 2. Edit the generated file in supabase/migrations/
-- 3. Test with: supabase db reset
-- 4. Apply with: supabase db push

-- Example: Creating a table with RLS enabled
-- CREATE TABLE IF NOT EXISTS public.example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
--   updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
-- );

-- Enable RLS
-- ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
-- CREATE POLICY "Users can only access their own data"
--   ON public.example_table
--   FOR ALL
--   USING (auth.uid() = user_id);

-- Create updated_at trigger
-- CREATE TRIGGER set_updated_at
--   BEFORE UPDATE ON public.example_table
--   FOR EACH ROW
--   EXECUTE FUNCTION set_updated_at();
`;

      fs.writeFileSync(templatePath, template);
      this.success('Migration template created');
    } else {
      this.success('Migration template already exists');
    }
  }

  createDatabaseFunctions() {
    this.log('Creating database functions...');

    const functionsDir = path.join(this.supabaseDir, 'migrations');
    const functionsPath = path.join(functionsDir, '00000000000001_core_functions.sql');

    const functions = `-- Core Database Functions for Aura App
-- These functions provide essential utilities and security functions

-- Updated at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get tables with RLS status (for validation)
CREATE OR REPLACE FUNCTION get_tables_with_rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity AS rls_enabled
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure user data cleanup function
CREATE OR REPLACE FUNCTION cleanup_user_data(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Only allow users to cleanup their own data
  IF current_user_id IS NULL OR current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot cleanup data for other users';
  END IF;
  
  -- Add cleanup logic here for user-specific tables
  -- Example:
  -- DELETE FROM public.cycle_data WHERE user_id = target_user_id;
  -- DELETE FROM public.user_preferences WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Version tracking for migrations
CREATE TABLE IF NOT EXISTS public.migration_log (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert initial version
INSERT INTO public.migration_log (version, description)
VALUES ('0.0.1', 'Core database functions initialized')
ON CONFLICT DO NOTHING;
`;

    fs.writeFileSync(functionsPath, functions);
    this.success('Database functions created');
  }

  createMigrationScripts() {
    this.log('Creating migration scripts...');

    const scriptsDir = path.join(this.projectRoot, 'scripts');

    // Migration script
    const migrationScript = `#!/usr/bin/env node

/**
 * Database Migration Runner
 * Manages database migrations for development and production
 */

import { execSync } from 'child_process';

const ENVIRONMENTS = {
  local: {
    name: 'Local Development',
    command: 'supabase db reset',
  },
  staging: {
    name: 'Staging',
    command: 'supabase db push --linked',
  },
  production: {
    name: 'Production',
    command: 'supabase db push --linked',
  },
};

function runMigration(env = 'local') {
  const environment = ENVIRONMENTS[env];
  
  if (!environment) {
    console.error('❌ Invalid environment. Use: local, staging, or production');
    process.exit(1);
  }

  console.log(\`🚀 Running migrations for \${environment.name}...\`);
  
  try {
    if (env === 'local') {
      console.log('🔄 Resetting local database...');
      execSync('supabase stop', { stdio: 'inherit' });
      execSync('supabase start', { stdio: 'inherit' });
    } else {
      console.log(\`🔗 Connecting to \${environment.name}...\`);
      execSync('supabase status', { stdio: 'inherit' });
    }
    
    execSync(environment.command, { stdio: 'inherit' });
    console.log(\`✅ Migration completed for \${environment.name}\`);
    
  } catch (error) {
    console.error(\`❌ Migration failed: \${error.message}\`);
    process.exit(1);
  }
}

// Get environment from command line arguments
const env = process.argv[2] || 'local';
runMigration(env);
`;

    fs.writeFileSync(path.join(scriptsDir, 'run-migrations.js'), migrationScript);

    // Make script executable
    try {
      execSync(`chmod +x ${path.join(scriptsDir, 'run-migrations.js')}`);
    } catch {
      // Ignore chmod errors on Windows
    }

    this.success('Migration scripts created');
  }

  async run() {
    console.log('🔧 Supabase CLI Setup and Database Migration Workflow');
    console.log('======================================================');

    try {
      // Check if CLI is installed
      if (!this.checkSupabaseCLI()) {
        return false;
      }

      // Setup all components
      this.initializeSupabaseProject();
      this.createSupabaseConfig();
      this.createMigrationTemplate();
      this.createDatabaseFunctions();
      this.createMigrationScripts();

      this.success('Database migration workflow setup completed!');
      return true;
    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      return false;
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new SupabaseCLISetup();
  const success = await setup.run();
  process.exit(success ? 0 : 1);
}

export default SupabaseCLISetup;
