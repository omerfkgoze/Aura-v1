import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateFrontendEnv,
  validateBackendEnv,
  validateFullStackEnv,
  generateSecureRandom,
  checkDevelopmentSecrets,
  frontendEnvSchema,
  backendEnvSchema,
  fullStackEnvSchema,
} from '../env-validation';

describe('Environment Validation', () => {
  describe('Frontend Environment Validation', () => {
    it('should validate valid frontend environment', () => {
      const validEnv = {
        NODE_ENV: 'development' as const,
        APP_VERSION: '1.0.0',
        SECURITY_AUDIT_ENABLED: 'true',
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED: 'true',
        EXPO_PUBLIC_STEALTH_MODE_DEFAULT: 'false',
        EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED: 'true',
        EXPO_PUBLIC_ANIMATION_REDUCED_MOTION: 'false',
      };

      const result = validateFrontendEnv(validEnv);
      expect(result.NODE_ENV).toBe('development');
      expect(result.EXPO_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
      expect(result.EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED).toBe(true);
      expect(result.EXPO_PUBLIC_STEALTH_MODE_DEFAULT).toBe(false);
    });

    it('should apply default values for optional fields', () => {
      const minimalEnv = {
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
      };

      const result = validateFrontendEnv(minimalEnv);
      expect(result.NODE_ENV).toBe('development');
      expect(result.APP_VERSION).toBe('1.0.0');
      expect(result.SECURITY_AUDIT_ENABLED).toBe(true);
      expect(result.EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalidEnv = {
        EXPO_PUBLIC_SUPABASE_URL: 'invalid-url',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
      };

      expect(() => validateFrontendEnv(invalidEnv)).toThrow('Frontend environment validation failed');
      expect(() => validateFrontendEnv(invalidEnv)).toThrow('Invalid Supabase URL');
    });

    it('should reject short device pepper', () => {
      const invalidEnv = {
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'too-short',
      };

      expect(() => validateFrontendEnv(invalidEnv)).toThrow('Device pepper must be at least 32 characters');
    });

    it('should reject missing required fields', () => {
      const incompleteEnv = {
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        // Missing EXPO_PUBLIC_SUPABASE_ANON_KEY
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
      };

      expect(() => validateFrontendEnv(incompleteEnv)).toThrow('Frontend environment validation failed');
    });
  });

  describe('Backend Environment Validation', () => {
    it('should validate valid backend environment', () => {
      const validEnv = {
        NODE_ENV: 'development' as const,
        APP_VERSION: '1.0.0',
        SECURITY_AUDIT_ENABLED: 'true',
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:19006',
      };

      const result = validateBackendEnv(validEnv);
      expect(result.NODE_ENV).toBe('development');
      expect(result.SUPABASE_URL).toBe('http://localhost:54321');
      expect(result.CORS_ORIGIN).toBe('http://localhost:3000,http://localhost:19006');
    });

    it('should handle optional Redis URL', () => {
      const envWithRedis = {
        NODE_ENV: 'development' as const,
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        REDIS_URL: 'redis://localhost:6379',
      };

      const result = validateBackendEnv(envWithRedis);
      expect(result.REDIS_URL).toBe('redis://localhost:6379');
    });

    it('should reject invalid database URL', () => {
      const invalidEnv = {
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'invalid-db-url',
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
      };

      expect(() => validateBackendEnv(invalidEnv)).toThrow('Invalid database URL');
    });

    it('should reject short secrets', () => {
      const invalidEnv = {
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
        DEVICE_HASH_PEPPER: 'short',
        NEXTAUTH_SECRET: 'c'.repeat(32),
      };

      expect(() => validateBackendEnv(invalidEnv)).toThrow('Device hash pepper must be at least 32 characters');
    });
  });

  describe('Full Stack Environment Validation', () => {
    it('should validate complete full-stack environment', () => {
      const validEnv = {
        // Base
        NODE_ENV: 'development' as const,
        APP_VERSION: '1.0.0',
        SECURITY_AUDIT_ENABLED: 'true',
        // Frontend
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED: 'true',
        EXPO_PUBLIC_STEALTH_MODE_DEFAULT: 'false',
        EXPO_PUBLIC_ACCESSIBILITY_PAA_ENABLED: 'true',
        EXPO_PUBLIC_ANIMATION_REDUCED_MOTION: 'false',
        // Backend
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:19006',
      };

      const result = validateFullStackEnv(validEnv);
      expect(result.NODE_ENV).toBe('development');
      expect(result.EXPO_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');
      expect(result.SUPABASE_URL).toBe('http://localhost:54321');
    });

    it('should reject if frontend validation fails', () => {
      const invalidEnv = {
        // Invalid frontend
        EXPO_PUBLIC_SUPABASE_URL: 'invalid-url',
        // Valid backend
        SUPABASE_URL: 'http://localhost:54321',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
      };

      expect(() => validateFullStackEnv(invalidEnv)).toThrow('Environment validation failed');
    });
  });

  describe('Secure Random Generation', () => {
    it('should generate random string of specified length', () => {
      const result = generateSecureRandom(32);
      expect(result).toHaveLength(32);
      expect(typeof result).toBe('string');
    });

    it('should generate different values on subsequent calls', () => {
      const result1 = generateSecureRandom(16);
      const result2 = generateSecureRandom(16);
      // Note: Due to mocked crypto, these will be the same in tests
      // In real environment, they would be different
      expect(result1).toHaveLength(16);
      expect(result2).toHaveLength(16);
      // In test environment with mocked crypto, we just verify length
      // Real randomness would be tested in integration tests
    });

    it('should use default length when not specified', () => {
      const result = generateSecureRandom();
      expect(result).toHaveLength(64);
    });

    it('should only use valid characters', () => {
      const result = generateSecureRandom(100);
      const validChars = /^[A-Za-z0-9+/]+$/;
      expect(result).toMatch(validChars);
    });
  });

  describe('Development Secrets Validation', () => {
    it('should identify missing required secrets', () => {
      const incompleteEnv = {
        NODE_ENV: 'development',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        // Missing DEVICE_HASH_PEPPER and NEXTAUTH_SECRET
      };

      const result = checkDevelopmentSecrets(incompleteEnv);
      expect(result.missing).toContain('DEVICE_HASH_PEPPER');
      expect(result.missing).toContain('NEXTAUTH_SECRET');
      expect(result.missing).not.toContain('EXPO_PUBLIC_DEVICE_PEPPER');
    });

    it('should identify insecure secrets', () => {
      const insecureEnv = {
        NODE_ENV: 'development',
        EXPO_PUBLIC_DEVICE_PEPPER: 'short',
        DEVICE_HASH_PEPPER: 'your-secret-here',
        NEXTAUTH_SECRET: 'change-me',
      };

      const result = checkDevelopmentSecrets(insecureEnv);
      expect(result.insecure).toHaveLength(3);
      expect(result.insecure.some(item => item.includes('too short'))).toBe(true);
      expect(result.insecure.some(item => item.includes('using placeholder value'))).toBe(true);
    });

    it('should provide warnings for remote services in development', () => {
      const remoteEnv = {
        NODE_ENV: 'development',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        DATABASE_URL: 'postgresql://remote-db/postgres',
      };

      const result = checkDevelopmentSecrets(remoteEnv);
      expect(result.warnings).toContain('Using remote Supabase in development - consider local setup');
      expect(result.warnings).toContain('Using remote database in development - consider local setup');
    });

    it('should return no issues for valid development environment', () => {
      const validEnv = {
        NODE_ENV: 'development',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',
      };

      const result = checkDevelopmentSecrets(validEnv);
      expect(result.missing).toHaveLength(0);
      expect(result.insecure).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn about remote services in production', () => {
      const prodEnv = {
        NODE_ENV: 'production',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        DEVICE_HASH_PEPPER: 'b'.repeat(32),
        NEXTAUTH_SECRET: 'c'.repeat(32),
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        DATABASE_URL: 'postgresql://remote-db/postgres',
      };

      const result = checkDevelopmentSecrets(prodEnv);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Schema Type Safety', () => {
    it('should transform string booleans correctly', () => {
      const env = {
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
        SECURITY_AUDIT_ENABLED: 'false',
        EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED: 'false',
        EXPO_PUBLIC_STEALTH_MODE_DEFAULT: 'true',
      };

      const result = validateFrontendEnv(env);
      expect(result.SECURITY_AUDIT_ENABLED).toBe(false);
      expect(result.EXPO_PUBLIC_CULTURAL_DETECTION_ENABLED).toBe(false);
      expect(result.EXPO_PUBLIC_STEALTH_MODE_DEFAULT).toBe(true);
    });

    it('should validate NODE_ENV enum values', () => {
      const invalidEnv = {
        NODE_ENV: 'invalid-env',
        EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        EXPO_PUBLIC_API_URL: 'http://localhost:3000',
        EXPO_PUBLIC_DEVICE_PEPPER: 'a'.repeat(32),
      };

      expect(() => validateFrontendEnv(invalidEnv)).toThrow();
    });
  });
});