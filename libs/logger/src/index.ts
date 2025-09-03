import pino from 'pino';

// Privacy-safe logging configuration
// CRITICAL: Never log personal health data or PII
const isDevelopment = process.env.NODE_ENV === 'development';

// Base logger configuration with privacy-safe defaults
const baseLogger = pino({
  level: isDevelopment ? 'debug' : 'info',

  // Development: Pretty print, Production: JSON
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    },
  }),

  // Base fields for all log entries
  base: {
    pid: process.pid,
    hostname: process.env.NODE_ENV === 'production' ? undefined : require('os').hostname(),
    service: 'aura-app',
    version: process.env.APP_VERSION || '1.0.0',
  },

  // Redact sensitive fields (defense in depth)
  redact: {
    paths: [
      // Authentication
      'password',
      'token',
      'jwt',
      'apiKey',
      'secret',
      // Personal data
      'email',
      'phone',
      'name',
      'address',
      'birthDate',
      // Health data (complete prohibition)
      'cycleData',
      'symptoms',
      'temperature',
      'mood',
      'notes',
      'healthData',
      'personalData',
      'biometricData',
      // Device identification
      'deviceId',
      'fingerprint',
      'hardwareId',
      // Request/response data that might contain PII
      'req.body',
      'res.body',
      'body',
      // Headers that might contain sensitive data
      'authorization',
      'cookie',
      'x-api-key',
    ],
    remove: true, // Completely remove redacted fields
  },
});

// Specialized loggers for different contexts
export const logger = {
  // Technical operations (system health, performance)
  technical: baseLogger.child({ context: 'technical' }),

  // Security events (authentication, authorization, threats)
  security: baseLogger.child({ context: 'security' }),

  // API requests/responses (without PII)
  api: baseLogger.child({ context: 'api' }),

  // Database operations (without data content)
  database: baseLogger.child({ context: 'database' }),

  // Crypto operations (without keys or data)
  crypto: baseLogger.child({ context: 'crypto' }),

  // Development utilities (development only)
  dev: isDevelopment ? baseLogger.child({ context: 'development' }) : createNoOpLogger(),
};

// Development-specific utilities
export const devLogger = {
  // Environment validation results
  envValidation: (result: { missing: string[]; insecure: string[]; warnings: string[] }) => {
    if (!isDevelopment) return;

    logger.dev.info(
      {
        event: 'env_validation',
        missing_count: result.missing.length,
        insecure_count: result.insecure.length,
        warnings_count: result.warnings.length,
      },
      'Environment validation completed'
    );
  },

  // Database migration status
  migration: (action: string, name: string, success: boolean) => {
    if (!isDevelopment) return;

    logger.dev.info(
      {
        event: 'db_migration',
        action,
        migration_name: name,
        success,
      },
      `Database migration ${action}: ${name}`
    );
  },

  // Crypto operations validation
  cryptoTest: (operation: string, success: boolean, duration?: number) => {
    if (!isDevelopment) return;

    logger.dev.info(
      {
        event: 'crypto_test',
        operation,
        success,
        duration_ms: duration,
      },
      `Crypto operation test: ${operation}`
    );
  },

  // Service health checks
  healthCheck: (service: string, status: 'healthy' | 'unhealthy', responseTime?: number) => {
    logger.technical.info(
      {
        event: 'health_check',
        service,
        status,
        response_time_ms: responseTime,
      },
      `Service health check: ${service} is ${status}`
    );
  },
};

// Security-focused logging utilities
export const securityLogger = {
  // Authentication events
  auth: (
    event: 'login' | 'logout' | 'signup' | 'password_reset',
    userId?: string,
    success: boolean = true
  ) => {
    logger.security.info(
      {
        event: 'auth_event',
        auth_event: event,
        user_id: userId ? `user_${userId.slice(0, 8)}***` : undefined, // Partial ID for tracing
        success,
        timestamp: new Date().toISOString(),
      },
      `Authentication event: ${event}`
    );
  },

  // Authorization failures
  authz: (resource: string, action: string, userId?: string) => {
    logger.security.warn(
      {
        event: 'authorization_denied',
        resource,
        action,
        user_id: userId ? `user_${userId.slice(0, 8)}***` : undefined,
        timestamp: new Date().toISOString(),
      },
      `Authorization denied: ${action} on ${resource}`
    );
  },

  // Suspicious activity
  threat: (type: string, details: Record<string, any>) => {
    logger.security.error(
      {
        event: 'security_threat',
        threat_type: type,
        details: sanitizeDetails(details), // Remove any PII
        timestamp: new Date().toISOString(),
      },
      `Security threat detected: ${type}`
    );
  },
};

// API logging utilities (without PII)
export const apiLogger = {
  // Request/response logging (metadata only)
  request: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string
  ) => {
    logger.api.info(
      {
        event: 'api_request',
        method,
        path: sanitizePath(path), // Remove potential PII from path
        status_code: statusCode,
        duration_ms: duration,
        user_id: userId ? `user_${userId.slice(0, 8)}***` : undefined,
      },
      `${method} ${path} - ${statusCode} (${duration}ms)`
    );
  },

  // API errors (without sensitive data)
  error: (method: string, path: string, error: Error, userId?: string) => {
    logger.api.error(
      {
        event: 'api_error',
        method,
        path: sanitizePath(path),
        error_type: error.constructor.name,
        error_message: sanitizeErrorMessage(error.message),
        user_id: userId ? `user_${userId.slice(0, 8)}***` : undefined,
      },
      `API error: ${method} ${path}`
    );
  },
};

// Database operation logging (structure only, no data)
export const dbLogger = {
  // Query performance monitoring
  query: (operation: string, table: string, duration: number, rowCount?: number) => {
    logger.database.info(
      {
        event: 'db_query',
        operation,
        table,
        duration_ms: duration,
        row_count: rowCount,
      },
      `Database ${operation} on ${table} (${duration}ms)`
    );
  },

  // Connection pool monitoring
  connection: (event: 'acquire' | 'release' | 'timeout', poolSize?: number) => {
    logger.database.info(
      {
        event: 'db_connection',
        connection_event: event,
        pool_size: poolSize,
      },
      `Database connection ${event}`
    );
  },

  // Migration events
  migration: (direction: 'up' | 'down', name: string, success: boolean, duration?: number) => {
    logger.database.info(
      {
        event: 'db_migration',
        direction,
        migration_name: name,
        success,
        duration_ms: duration,
      },
      `Database migration ${direction}: ${name}`
    );
  },
};

// Crypto operation logging (metadata only, no keys or data)
export const cryptoLogger = {
  // Encryption/decryption operations
  operation: (
    operation: 'encrypt' | 'decrypt' | 'hash' | 'verify',
    algorithm: string,
    success: boolean,
    duration?: number
  ) => {
    logger.crypto.info(
      {
        event: 'crypto_operation',
        operation,
        algorithm,
        success,
        duration_ms: duration,
      },
      `Crypto operation: ${operation} with ${algorithm}`
    );
  },

  // Key management events
  keyEvent: (event: 'generate' | 'rotate' | 'validate', keyType: string, success: boolean) => {
    logger.crypto.info(
      {
        event: 'crypto_key_event',
        key_event: event,
        key_type: keyType,
        success,
      },
      `Crypto key event: ${event} ${keyType}`
    );
  },
};

// Utility functions
function createNoOpLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

function sanitizeDetails(details: Record<string, any>): Record<string, any> {
  const sanitized = { ...details };

  // Remove known PII fields
  const piiFields = ['email', 'phone', 'name', 'address', 'cycleData', 'symptoms', 'healthData'];
  piiFields.forEach(field => delete sanitized[field]);

  return sanitized;
}

function sanitizePath(path: string): string {
  // Remove potential PII from URL paths
  return path
    .replace(/\/users\/[^\/]+/g, '/users/[USER_ID]')
    .replace(/\/api\/[^\/]*email[^\/]*/gi, '/api/[EMAIL_ENDPOINT]')
    .replace(/\/[a-f0-9-]{36}/g, '/[UUID]'); // Replace UUIDs
}

function sanitizeErrorMessage(message: string): string {
  // Remove potential PII from error messages
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]')
    .replace(/\b[a-f0-9-]{36}\b/gi, '[UUID]');
}

// Export the main logger instance
export default logger;
