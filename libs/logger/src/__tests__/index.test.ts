import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pino before any imports
const mockChildLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const mockPino = {
  child: vi.fn(() => mockChildLogger),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('pino', () => ({
  default: vi.fn(() => mockPino),
}));

// Import after mocking
import {
  logger,
  devLogger,
  securityLogger,
  apiLogger,
  dbLogger,
  cryptoLogger,
} from '../index';

describe('Logger Privacy and Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger Configuration', () => {
    it('should create logger with privacy-safe configuration', () => {
      const pino = vi.mocked(require('pino').default);
      
      // Verify pino was called with privacy configuration
      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          redact: expect.objectContaining({
            paths: expect.arrayContaining([
              'password', 'token', 'jwt', 'apiKey', 'secret',
              'email', 'phone', 'name', 'address', 'birthDate',
              'cycleData', 'symptoms', 'temperature', 'mood', 'notes',
              'healthData', 'personalData', 'biometricData',
              'deviceId', 'fingerprint', 'hardwareId',
            ]),
            remove: true,
          }),
        })
      );
    });

    it('should create specialized context loggers', () => {
      expect(mockPino.child).toHaveBeenCalledWith({ context: 'technical' });
      expect(mockPino.child).toHaveBeenCalledWith({ context: 'security' });
      expect(mockPino.child).toHaveBeenCalledWith({ context: 'api' });
      expect(mockPino.child).toHaveBeenCalledWith({ context: 'database' });
      expect(mockPino.child).toHaveBeenCalledWith({ context: 'crypto' });
    });
  });

  describe('Development Logger', () => {
    beforeEach(() => {
      // Set development environment
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should log environment validation results without PII', () => {
      const validationResult = {
        missing: ['SOME_SECRET'],
        insecure: ['WEAK_KEY'],
        warnings: ['Remote service in dev'],
      };

      devLogger.envValidation(validationResult);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'env_validation',
          missing_count: 1,
          insecure_count: 1,
          warnings_count: 1,
        },
        'Environment validation completed'
      );
    });

    it('should log database migration status', () => {
      devLogger.migration('up', '001_initial_schema', true);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'db_migration',
          action: 'up',
          migration_name: '001_initial_schema',
          success: true,
        },
        'Database migration up: 001_initial_schema'
      );
    });

    it('should log crypto test operations', () => {
      devLogger.cryptoTest('encrypt_cycle_data', true, 150);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'crypto_test',
          operation: 'encrypt_cycle_data',
          success: true,
          duration_ms: 150,
        },
        'Crypto operation test: encrypt_cycle_data'
      );
    });

    it('should not log in non-development environments', () => {
      process.env.NODE_ENV = 'production';
      
      devLogger.envValidation({ missing: [], insecure: [], warnings: [] });
      devLogger.migration('up', 'test', true);
      devLogger.cryptoTest('test', true);

      expect(mockChildLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Security Logger', () => {
    it('should log authentication events with partial user IDs', () => {
      const userId = 'user-12345678-abcd-efgh-ijkl-mnopqrstuvwx';
      
      securityLogger.auth('login', userId, true);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_event',
          auth_event: 'login',
          user_id: 'user_12345678***', // Partial ID for tracing
          success: true,
          timestamp: expect.any(String),
        }),
        'Authentication event: login'
      );
    });

    it('should log authentication events without user ID', () => {
      securityLogger.auth('signup', undefined, true);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_event',
          auth_event: 'signup',
          user_id: undefined,
          success: true,
        }),
        'Authentication event: signup'
      );
    });

    it('should log authorization failures', () => {
      const userId = 'user-12345678-abcd-efgh-ijkl-mnopqrstuvwx';
      
      securityLogger.authz('/api/admin/users', 'DELETE', userId);

      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'authorization_denied',
          resource: '/api/admin/users',
          action: 'DELETE',
          user_id: 'user_12345678***',
        }),
        'Authorization denied: DELETE on /api/admin/users'
      );
    });

    it('should log security threats with sanitized details', () => {
      const threatDetails = {
        ip: '192.168.1.1',
        userAgent: 'malicious-bot',
        email: 'user@example.com', // Should be removed
        cycleData: { temperature: 98.6 }, // Should be removed
        attempts: 5,
      };

      securityLogger.threat('brute_force', threatDetails);

      expect(mockChildLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'security_threat',
          threat_type: 'brute_force',
          details: {
            ip: '192.168.1.1',
            userAgent: 'malicious-bot',
            attempts: 5,
            // email and cycleData should be removed
          },
        }),
        'Security threat detected: brute_force'
      );

      const logCall = mockChildLogger.error.mock.calls[0][0];
      expect(logCall.details).not.toHaveProperty('email');
      expect(logCall.details).not.toHaveProperty('cycleData');
    });
  });

  describe('API Logger', () => {
    it('should log API requests with sanitized paths', () => {
      const userId = 'user-12345678-abcd-efgh-ijkl-mnopqrstuvwx';
      
      apiLogger.request(
        'GET',
        '/api/users/user-12345678-abcd-efgh-ijkl-mnopqrstuvwx/profile',
        200,
        150,
        userId
      );

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api_request',
          method: 'GET',
          path: '/users/[USER_ID]/profile', // Sanitized path
          status_code: 200,
          duration_ms: 150,
          user_id: 'user_12345678***',
        }),
        expect.stringContaining('GET')
      );
    });

    it('should sanitize UUIDs in paths', () => {
      apiLogger.request(
        'POST',
        '/api/data/f47ac10b-58cc-4372-a567-0e02b2c3d479/update',
        201,
        300
      );

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/data/[UUID]/update',
        }),
        expect.any(String)
      );
    });

    it('should log API errors with sanitized messages', () => {
      const error = new Error('Failed to process data for user@example.com');
      
      apiLogger.error('POST', '/api/users/create', error);

      expect(mockChildLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api_error',
          error_message: 'Failed to process data for [EMAIL]', // Sanitized
        }),
        expect.any(String)
      );
    });
  });

  describe('Database Logger', () => {
    it('should log database operations without data content', () => {
      dbLogger.query('SELECT', 'encrypted_cycle_data', 45, 10);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'db_query',
          operation: 'SELECT',
          table: 'encrypted_cycle_data',
          duration_ms: 45,
          row_count: 10,
        },
        'Database SELECT on encrypted_cycle_data (45ms)'
      );
    });

    it('should log connection pool events', () => {
      dbLogger.connection('acquire', 8);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'db_connection',
          connection_event: 'acquire',
          pool_size: 8,
        },
        'Database connection acquire'
      );
    });

    it('should log migration events', () => {
      dbLogger.migration('up', '002_add_user_prefs', true, 2500);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'db_migration',
          direction: 'up',
          migration_name: '002_add_user_prefs',
          success: true,
          duration_ms: 2500,
        },
        'Database migration up: 002_add_user_prefs'
      );
    });
  });

  describe('Crypto Logger', () => {
    it('should log crypto operations without keys or data', () => {
      cryptoLogger.operation('encrypt', 'AES-256-GCM', true, 12);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'crypto_operation',
          operation: 'encrypt',
          algorithm: 'AES-256-GCM',
          success: true,
          duration_ms: 12,
        },
        'Crypto operation: encrypt with AES-256-GCM'
      );
    });

    it('should log key management events without key material', () => {
      cryptoLogger.keyEvent('rotate', 'master_key', true);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'crypto_key_event',
          key_event: 'rotate',
          key_type: 'master_key',
          success: true,
        },
        'Crypto key event: rotate master_key'
      );
    });
  });

  describe('Privacy Protection Functions', () => {
    it('should sanitize details by removing PII fields', () => {
      // This tests the internal sanitizeDetails function indirectly
      const threatDetails = {
        ip: '192.168.1.1',
        email: 'test@example.com',
        phone: '555-1234',
        cycleData: { day: 15 },
        symptoms: ['cramping'],
        healthData: { weight: 150 },
        safeField: 'this should remain',
      };

      securityLogger.threat('test_threat', threatDetails);

      const logCall = mockChildLogger.error.mock.calls[0][0];
      expect(logCall.details).toHaveProperty('ip');
      expect(logCall.details).toHaveProperty('safeField');
      expect(logCall.details).not.toHaveProperty('email');
      expect(logCall.details).not.toHaveProperty('phone');
      expect(logCall.details).not.toHaveProperty('cycleData');
      expect(logCall.details).not.toHaveProperty('symptoms');
      expect(logCall.details).not.toHaveProperty('healthData');
    });

    it('should sanitize error messages', () => {
      const errorWithPII = new Error('Database error: duplicate email user@test.com and phone 123-456-7890');
      
      apiLogger.error('POST', '/api/test', errorWithPII);

      const logCall = mockChildLogger.error.mock.calls[0][0];
      expect(logCall.error_message).toBe('Database error: duplicate email [EMAIL] and phone [PHONE]');
    });

    it('should sanitize UUIDs in error messages', () => {
      const errorWithUUID = new Error('Record not found: f47ac10b-58cc-4372-a567-0e02b2c3d479');
      
      apiLogger.error('GET', '/api/test', errorWithUUID);

      const logCall = mockChildLogger.error.mock.calls[0][0];
      expect(logCall.error_message).toBe('Record not found: [UUID]');
    });
  });

  describe('No-Op Logger in Production', () => {
    it('should create no-op logger when not in development', () => {
      process.env.NODE_ENV = 'production';
      
      // Re-import to test production behavior
      vi.resetModules();
      const { devLogger: prodDevLogger } = require('../index');
      
      // Dev logger should be no-op in production
      expect(typeof prodDevLogger).toBe('object');
      
      // These calls should not throw and should not log
      prodDevLogger.envValidation({ missing: [], insecure: [], warnings: [] });
      prodDevLogger.migration('up', 'test', true);
      prodDevLogger.cryptoTest('test', true);
      
      // No calls should have been made to the underlying logger
      expect(mockChildLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Logging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should log service health checks', () => {
      devLogger.healthCheck('database', 'healthy', 45);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'health_check',
          service: 'database',
          status: 'healthy',
          response_time_ms: 45,
        },
        'Service health check: database is healthy'
      );
    });

    it('should log unhealthy services', () => {
      devLogger.healthCheck('redis', 'unhealthy', 5000);

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        {
          event: 'health_check',
          service: 'redis',
          status: 'unhealthy',
          response_time_ms: 5000,
        },
        'Service health check: redis is unhealthy'
      );
    });
  });
});