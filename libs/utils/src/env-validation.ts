import { z } from 'zod';

// Base environment schema with common fields
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_VERSION: z.string().default('1.0.0'),
  SECURITY_AUDIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
});

// Frontend-specific environment variables (Expo/React Native + Next.js)
export const frontendEnvSchema = baseEnvSchema.extend({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  EXPO_PUBLIC_API_URL: z.string().url('Invalid API URL'),
  EXPO_PUBLIC_DEVICE_PEPPER: z.string().min(32, 'Device pepper must be at least 32 characters'),
  
  // UX Configuration
  EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_STEALTH_MODE_DEFAULT: z.string().transform(val => val === 'true').default('false'),
  EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ANIMATION_REDUCED_MOTION: z.string().transform(val => val === 'true').default('false'),
});

// Backend-specific environment variables (Next.js API + Server)
export const backendEnvSchema = baseEnvSchema.extend({
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  DATABASE_URL: z.string().url('Invalid database URL'),
  DEVICE_HASH_PEPPER: z.string().min(32, 'Device hash pepper must be at least 32 characters'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  
  // Optional Redis URL for caching
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  
  // Security headers configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:19006'),
  CSP_REPORT_URI: z.string().url('Invalid CSP report URI').optional(),
});

// Combined environment schema for full-stack validation
export const fullStackEnvSchema = frontendEnvSchema.merge(backendEnvSchema);

// Type exports
export type FrontendEnv = z.infer<typeof frontendEnvSchema>;
export type BackendEnv = z.infer<typeof backendEnvSchema>;
export type FullStackEnv = z.infer<typeof fullStackEnvSchema>;

// Validation functions with detailed error reporting
export function validateFrontendEnv(env: Record<string, string | undefined>): FrontendEnv {
  try {
    return frontendEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Frontend environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export function validateBackendEnv(env: Record<string, string | undefined>): BackendEnv {
  try {
    return backendEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Backend environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export function validateFullStackEnv(env: Record<string, string | undefined>): FullStackEnv {
  try {
    return fullStackEnvSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Utility function to generate secure random values for development
export function generateSecureRandom(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const array = new Uint8Array(length);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else if (typeof require !== 'undefined') {
    const nodeCrypto = require('crypto');
    for (let i = 0; i < length; i++) {
      array[i] = nodeCrypto.randomBytes(1)[0];
    }
  } else {
    // Fallback for environments without crypto (should not be used in production)
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  
  return result;
}

// Development utility to check if required secrets exist
export function checkDevelopmentSecrets(env: Record<string, string | undefined>): {
  missing: string[];
  insecure: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const insecure: string[] = [];
  const warnings: string[] = [];
  
  // Check required secrets
  const requiredSecrets = [
    'EXPO_PUBLIC_DEVICE_PEPPER',
    'DEVICE_HASH_PEPPER',
    'NEXTAUTH_SECRET',
  ];
  
  requiredSecrets.forEach(secret => {
    const value = env[secret];
    if (!value) {
      missing.push(secret);
    } else if (value.length < 32) {
      insecure.push(`${secret} (too short: ${value.length} chars, minimum 32)`);
    } else if (value === 'your-secret-here' || value === 'change-me') {
      insecure.push(`${secret} (using placeholder value)`);
    }
  });
  
  // Check for development-specific warnings
  if (env.NODE_ENV === 'development') {
    if (env.EXPO_PUBLIC_SUPABASE_URL && !env.EXPO_PUBLIC_SUPABASE_URL.includes('localhost')) {
      warnings.push('Using remote Supabase in development - consider local setup');
    }
    if (env.DATABASE_URL && !env.DATABASE_URL.includes('localhost')) {
      warnings.push('Using remote database in development - consider local setup');
    }
  }
  
  return { missing, insecure, warnings };
}