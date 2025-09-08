/**
 * Error Message Sanitization Validation Framework
 *
 * Validates that error messages do not expose PII, health data, or security-sensitive
 * information while maintaining useful debugging capabilities for developers.
 */

export interface ErrorSanitizationRule {
  name: string;
  pattern: RegExp;
  replacement: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  category: 'health-data' | 'pii' | 'crypto' | 'internal' | 'system';
}

export interface ErrorSanitizationResult {
  passed: boolean;
  violations: ErrorViolation[];
  summary: {
    totalErrors: number;
    violationsFound: number;
    criticalViolations: number;
    healthDataViolations: number;
  };
  errors: string[];
}

export interface ErrorViolation {
  rule: ErrorSanitizationRule;
  originalMessage: string;
  sanitizedMessage: string;
  context: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location?: {
    file?: string;
    line?: number;
    function?: string;
  };
}

export interface ErrorSanitizerConfig {
  rules: ErrorSanitizationRule[];
  environments: ('development' | 'staging' | 'production')[];
  preserveStackTrace: boolean;
  maxErrorLength: number;
  logSanitizedErrors: boolean;
}

/**
 * Comprehensive error sanitization rules for healthcare applications
 */
export const DEFAULT_SANITIZATION_RULES: ErrorSanitizationRule[] = [
  // Health Data Protection - Critical
  {
    name: 'cycle-data-exposure',
    pattern: /\b(?:cycleLength|periodFlow|symptoms|temperature|mood|notes)\s*[:=]\s*[^\s,}]+/gi,
    replacement: '[CYCLE_DATA_REDACTED]',
    severity: 'critical',
    description: 'Cycle tracking data in error messages',
    category: 'health-data',
  },
  {
    name: 'health-terms-exposure',
    pattern:
      /\b(?:period|menstrual|ovulation|fertility|pregnancy|contraception|cramps|pms|spotting)\b/gi,
    replacement: '[HEALTH_TERM_REDACTED]',
    severity: 'critical',
    description: 'Healthcare terminology in error messages',
    category: 'health-data',
  },
  {
    name: 'medical-measurements',
    pattern: /\b(?:temperature|basal|bbt|cervical|mucus|luteal|follicular)\s*[:=]\s*[^\s,}]+/gi,
    replacement: '[MEDICAL_DATA_REDACTED]',
    severity: 'critical',
    description: 'Medical measurement data in error messages',
    category: 'health-data',
  },

  // PII Protection - Critical
  {
    name: 'email-exposure',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]@[DOMAIN_REDACTED]',
    severity: 'critical',
    description: 'Email addresses in error messages',
    category: 'pii',
  },
  {
    name: 'phone-exposure',
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    replacement: '[PHONE_REDACTED]',
    severity: 'critical',
    description: 'Phone numbers in error messages',
    category: 'pii',
  },
  {
    name: 'user-id-exposure',
    pattern: /user[_-]?id\s*[:=]\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    replacement: 'user_id=[USER_ID_REDACTED]',
    severity: 'high',
    description: 'User ID UUIDs in error messages',
    category: 'pii',
  },

  // Crypto Data Protection - Critical
  {
    name: 'crypto-key-exposure',
    pattern: /\b(?:private[_-]?key|secret[_-]?key|api[_-]?key)\s*[:=]\s*[A-Za-z0-9+/]{20,}/gi,
    replacement: '[CRYPTO_KEY_REDACTED]',
    severity: 'critical',
    description: 'Cryptographic keys in error messages',
    category: 'crypto',
  },
  {
    name: 'password-exposure',
    pattern: /\bpassword\s*[:=]\s*[^\s,}]+/gi,
    replacement: 'password=[PASSWORD_REDACTED]',
    severity: 'critical',
    description: 'Passwords in error messages',
    category: 'crypto',
  },
  {
    name: 'jwt-token-exposure',
    pattern: /\beyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/g,
    replacement: '[JWT_TOKEN_REDACTED]',
    severity: 'high',
    description: 'JWT tokens in error messages',
    category: 'crypto',
  },
  {
    name: 'encrypted-data-exposure',
    pattern: /encrypted[_-]?data\s*[:=]\s*[A-Za-z0-9+/=]{50,}/gi,
    replacement: 'encrypted_data=[ENCRYPTED_BLOB_REDACTED]',
    severity: 'high',
    description: 'Encrypted data blobs in error messages',
    category: 'crypto',
  },

  // Internal System Information - Medium
  {
    name: 'database-connection-string',
    pattern: /(?:postgres|mysql|mongodb):\/\/[^\s]+/gi,
    replacement: '[DATABASE_CONNECTION_REDACTED]',
    severity: 'high',
    description: 'Database connection strings',
    category: 'internal',
  },
  {
    name: 'file-path-exposure',
    pattern: /\/(?:home|Users|var|etc|usr)\/[^\s]+/g,
    replacement: '[FILE_PATH_REDACTED]',
    severity: 'medium',
    description: 'Server file paths in error messages',
    category: 'system',
  },
  {
    name: 'ip-address-exposure',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[IP_ADDRESS_REDACTED]',
    severity: 'medium',
    description: 'IP addresses in error messages',
    category: 'system',
  },

  // SQL and Database Errors - Medium
  {
    name: 'sql-query-exposure',
    pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+[^;]+/gi,
    replacement: '[SQL_QUERY_REDACTED]',
    severity: 'medium',
    description: 'SQL queries in error messages',
    category: 'internal',
  },
  {
    name: 'table-name-exposure',
    pattern: /\btable\s+[`'"]?([a-zA-Z_][a-zA-Z0-9_]*)[`'"]?/gi,
    replacement: 'table [TABLE_NAME_REDACTED]',
    severity: 'low',
    description: 'Database table names in error messages',
    category: 'internal',
  },
];

export class ErrorSanitizer {
  private config: ErrorSanitizerConfig;

  constructor(config: Partial<ErrorSanitizerConfig> = {}) {
    this.config = {
      rules: config.rules || DEFAULT_SANITIZATION_RULES,
      environments: config.environments || ['production', 'staging'],
      preserveStackTrace: config.preserveStackTrace !== false,
      maxErrorLength: config.maxErrorLength || 2000,
      logSanitizedErrors: config.logSanitizedErrors !== false,
    };
  }

  /**
   * Sanitize error message according to configured rules
   */
  sanitizeError(error: Error | string, context?: string): string {
    const originalMessage = error instanceof Error ? error.message : error;
    let sanitizedMessage = originalMessage;

    // Truncate if too long
    if (sanitizedMessage.length > this.config.maxErrorLength) {
      sanitizedMessage = sanitizedMessage.substring(0, this.config.maxErrorLength) + '[TRUNCATED]';
    }

    // Apply sanitization rules
    for (const rule of this.config.rules) {
      sanitizedMessage = sanitizedMessage.replace(rule.pattern, rule.replacement);
    }

    // Log sanitization if enabled
    if (this.config.logSanitizedErrors && originalMessage !== sanitizedMessage) {
      console.warn('Error message sanitized:', {
        context: context || 'unknown',
        originalLength: originalMessage.length,
        sanitizedLength: sanitizedMessage.length,
      });
    }

    return sanitizedMessage;
  }

  /**
   * Validate error messages for PII exposure
   */
  validateErrorMessages(errorMessages: string[]): ErrorSanitizationResult {
    const result: ErrorSanitizationResult = {
      passed: true,
      violations: [],
      summary: {
        totalErrors: errorMessages.length,
        violationsFound: 0,
        criticalViolations: 0,
        healthDataViolations: 0,
      },
      errors: [],
    };

    try {
      for (let i = 0; i < errorMessages.length; i++) {
        const errorMessage = errorMessages[i];
        const violations = this.scanErrorMessage(errorMessage, i);
        result.violations.push(...violations);
      }

      result.summary.violationsFound = result.violations.length;
      result.summary.criticalViolations = result.violations.filter(
        v => v.severity === 'critical'
      ).length;
      result.summary.healthDataViolations = result.violations.filter(
        v => v.rule.category === 'health-data'
      ).length;
      result.passed = result.violations.length === 0;
    } catch (error) {
      result.errors.push(
        `Error validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.passed = false;
    }

    return result;
  }

  /**
   * Scan individual error message for violations
   */
  private scanErrorMessage(errorMessage: string, index: number): ErrorViolation[] {
    const violations: ErrorViolation[] = [];

    for (const rule of this.config.rules) {
      const matches = errorMessage.matchAll(rule.pattern);

      for (const match of matches) {
        const sanitizedMessage = errorMessage.replace(rule.pattern, rule.replacement);

        const violation: ErrorViolation = {
          rule,
          originalMessage: errorMessage,
          sanitizedMessage,
          context: `Error message ${index + 1}`,
          severity: rule.severity,
        };

        violations.push(violation);
      }
    }

    return violations;
  }

  /**
   * Create sanitized error handler middleware
   */
  createErrorHandler(environment: 'development' | 'staging' | 'production') {
    return (error: Error, req?: any, res?: any, next?: any) => {
      const shouldSanitize = this.config.environments.includes(environment);

      let errorMessage = error.message;
      let stack = error.stack;

      if (shouldSanitize) {
        errorMessage = this.sanitizeError(error, 'middleware');

        if (!this.config.preserveStackTrace) {
          stack = '[STACK_TRACE_REDACTED_FOR_SECURITY]';
        } else if (stack) {
          // Sanitize stack trace but preserve structure
          stack = stack
            .split('\n')
            .map(line => {
              let sanitizedLine = line;
              for (const rule of this.config.rules) {
                sanitizedLine = sanitizedLine.replace(rule.pattern, rule.replacement);
              }
              return sanitizedLine;
            })
            .join('\n');
        }
      }

      const sanitizedError = {
        message: errorMessage,
        stack,
        name: error.name,
        statusCode: (error as any).statusCode || 500,
      };

      if (res && !res.headersSent) {
        res.status(sanitizedError.statusCode).json({
          error: environment === 'production' ? 'Internal server error' : sanitizedError.message,
          ...(environment !== 'production' && { stack: sanitizedError.stack }),
        });
      }

      if (next) {
        next(sanitizedError);
      }

      return sanitizedError;
    };
  }

  /**
   * Validate error sanitizer configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.rules || this.config.rules.length === 0) {
      errors.push('Sanitization rules must be specified');
    }

    if (!this.config.environments || this.config.environments.length === 0) {
      errors.push('Target environments must be specified');
    }

    if (this.config.maxErrorLength <= 0) {
      errors.push('Max error length must be positive');
    }

    // Validate rules
    for (const rule of this.config.rules) {
      try {
        new RegExp(rule.pattern);
      } catch (regexError) {
        errors.push(`Invalid regex pattern for rule ${rule.name}: ${regexError}`);
      }

      if (!rule.replacement) {
        errors.push(`Replacement text required for rule ${rule.name}`);
      }
    }

    // Check for conflicting rules
    const ruleNames = this.config.rules.map(r => r.name);
    const duplicates = ruleNames.filter((name, index) => ruleNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate rule names found: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate report of error sanitization violations
   */
  generateReport(result: ErrorSanitizationResult): string {
    if (result.passed) {
      return '✅ Error Sanitization Validation PASSED - No violations detected';
    }

    let report = '❌ Error Sanitization Validation FAILED\n\n';

    report += `Summary:\n`;
    report += `- Total errors analyzed: ${result.summary.totalErrors}\n`;
    report += `- Violations found: ${result.summary.violationsFound}\n`;
    report += `- Critical violations: ${result.summary.criticalViolations}\n`;
    report += `- Health data violations: ${result.summary.healthDataViolations}\n\n`;

    if (result.violations.length > 0) {
      report += 'Violations by Category:\n';

      const byCategory = result.violations.reduce(
        (acc, violation) => {
          acc[violation.rule.category] = (acc[violation.rule.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(byCategory).forEach(([category, count]) => {
        report += `- ${category.toUpperCase()}: ${count}\n`;
      });

      report += '\nDetailed Violations:\n';
      result.violations.forEach((violation, index) => {
        report += `\n${index + 1}. ${violation.rule.name} (${violation.severity})\n`;
        report += `   Category: ${violation.rule.category}\n`;
        report += `   Description: ${violation.rule.description}\n`;
        report += `   Context: ${violation.context}\n`;
        report += `   Original: [REDACTED FOR SECURITY]\n`;
        report += `   Sanitized: ${violation.sanitizedMessage.substring(0, 100)}...\n`;
      });
    }

    if (result.errors.length > 0) {
      report += '\nValidation Errors:\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    return report;
  }

  /**
   * Test error sanitization with sample data
   */
  testSanitization(): {
    passed: boolean;
    results: Array<{ original: string; sanitized: string; rulesApplied: string[] }>;
  } {
    const testCases = [
      'User email john@example.com failed validation',
      'Database error: SELECT * FROM encrypted_cycle_data WHERE user_id = 123e4567-e89b-12d3-a456-426614174000',
      'Cycle data: cycleLength=28, periodFlow=heavy, temperature=98.6',
      'Authentication failed for password=mysecret123',
      'JWT token eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c expired',
      'Connection failed to postgres://user:pass@localhost:5432/healthdb',
      'File not found at /home/user/health_data/cycles.json',
    ];

    const results = testCases.map(testCase => {
      const original = testCase;
      const sanitized = this.sanitizeError(testCase, 'test');

      const rulesApplied: string[] = [];
      for (const rule of this.config.rules) {
        if (rule.pattern.test(original)) {
          rulesApplied.push(rule.name);
        }
      }

      return { original, sanitized, rulesApplied };
    });

    const passed = results.every(
      result => result.original !== result.sanitized || result.rulesApplied.length === 0
    );

    return { passed, results };
  }
}

/**
 * Default error sanitizer instance with healthcare-focused configuration
 */
export const defaultErrorSanitizer = new ErrorSanitizer({
  rules: DEFAULT_SANITIZATION_RULES,
  environments: ['production', 'staging'],
  preserveStackTrace: false,
  maxErrorLength: 1000,
  logSanitizedErrors: true,
});

/**
 * Quick error sanitization function for immediate use
 */
export function sanitizeErrorMessage(error: Error | string, context?: string): string {
  return defaultErrorSanitizer.sanitizeError(error, context);
}

/**
 * Express.js compatible error handler with sanitization
 */
export function createSanitizedErrorHandler(environment: 'development' | 'staging' | 'production') {
  return defaultErrorSanitizer.createErrorHandler(environment);
}
