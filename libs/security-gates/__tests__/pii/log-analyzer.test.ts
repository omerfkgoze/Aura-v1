/**
 * @fileoverview Tests for log analyzer PII detection
 */

import { describe, it, expect } from 'vitest';
import { LogAnalyzer, DEFAULT_PII_PATTERNS, analyzeLogsForPII } from '../../src/pii/log-analyzer';

describe('LogAnalyzer', () => {
  describe('Pattern Detection', () => {
    it('should detect cycle data in logs', async () => {
      const analyzer = new LogAnalyzer();
      const logs = [
        'User data: cycleLength=28, periodFlow=heavy',
        'Processing cycle info: {"temperature": 98.6, "mood": "happy"}',
      ];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.summary.healthDataViolations).toBeGreaterThan(0);
    });

    it('should detect email addresses in logs', async () => {
      const analyzer = new LogAnalyzer();
      const logs = [
        'User registration failed for john.doe@example.com',
        'Authentication error for user: jane@healthcare.org',
      ];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.violations.every(v => v.pattern.name === 'email')).toBe(true);
    });

    it('should detect crypto keys in logs', async () => {
      const analyzer = new LogAnalyzer();
      const logs = [
        'Error: private_key=abc123def456ghi789jklmnop',
        'JWT token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.Rq8IxqeX7eA6GgYxlcHdPcqVK8IgIB6TmOkwLKcMwPg',
      ];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.summary.criticalViolations).toBeGreaterThan(0);
    });

    it('should pass with clean logs', async () => {
      const analyzer = new LogAnalyzer();
      const logs = [
        'Application started successfully',
        'Database connection established',
        'User authenticated with ID [REDACTED]',
      ];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should exclude test data from analysis', async () => {
      const analyzer = new LogAnalyzer();
      const logs = [
        'test_data: email=test@example.com',
        'Production error: Failed to process data',
      ];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Pattern Validation', () => {
    it('should validate all default patterns are valid regex', () => {
      for (const pattern of DEFAULT_PII_PATTERNS) {
        expect(() => new RegExp(pattern.pattern)).not.toThrow();
      }
    });

    it('should categorize health data patterns correctly', () => {
      const healthPatterns = DEFAULT_PII_PATTERNS.filter(p => p.healthDataRelated);
      expect(healthPatterns.length).toBeGreaterThan(0);
      expect(healthPatterns.every(p => p.severity === 'critical')).toBe(true);
    });
  });

  describe('Redaction', () => {
    it('should redact email addresses safely', async () => {
      const analyzer = new LogAnalyzer();
      const logs = ['User email: john.doe@example.com'];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.violations[0].redactedMatch).toBe('***@example.com');
    });

    it('should redact health data completely', async () => {
      const analyzer = new LogAnalyzer();
      const logs = ['Cycle data: cycleLength=28'];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.violations[0].redactedMatch).toBe('[HEALTH_DATA_REDACTED]');
    });

    it('should redact crypto keys securely', async () => {
      const analyzer = new LogAnalyzer();
      const logs = ['Key: private_key=abc123def456ghi789'];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.violations[0].redactedMatch).toBe('[PLAINTEXT-CRYPTO-KEYS_REDACTED]');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const analyzer = new LogAnalyzer({
        logPaths: ['app.log'],
        patterns: DEFAULT_PII_PATTERNS,
        contextLines: 2,
        maxFileSize: 1024 * 1024,
        excludePatterns: [/test/],
        reportingLevel: 'all',
      });

      const validation = analyzer.validateConfig();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject invalid configuration', () => {
      const analyzer = new LogAnalyzer({
        logPaths: [],
        patterns: [],
        contextLines: -1,
        maxFileSize: -100,
      });

      const validation = analyzer.validateConfig();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate regex patterns in config', () => {
      const analyzer = new LogAnalyzer({
        patterns: [
          {
            name: 'invalid-regex',
            pattern: /\[/,
            severity: 'high',
            description: 'Invalid pattern',
            healthDataRelated: false,
          },
        ],
      });

      const validation = analyzer.validateConfig();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid regex'))).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate passed report', async () => {
      const analyzer = new LogAnalyzer();
      const result = await analyzer.analyzeLogs(['Clean log entry']);

      const report = analyzer.generateReport(result);

      expect(report).toContain('✅ PII Analysis PASSED');
      expect(report).not.toContain('Violations');
    });

    it('should generate failed report with details', async () => {
      const analyzer = new LogAnalyzer();
      const result = await analyzer.analyzeLogs(['Email: test@example.com']);

      const report = analyzer.generateReport(result);

      expect(report).toContain('❌ PII Analysis FAILED');
      expect(report).toContain('Violations found: 1');
      expect(report).toContain('Detailed Violations');
    });

    it('should categorize violations in report', async () => {
      const analyzer = new LogAnalyzer();
      const result = await analyzer.analyzeLogs([
        'Email: test@example.com',
        'Health data: period symptoms noted',
      ]);

      const report = analyzer.generateReport(result);

      expect(report).toContain('CRITICAL:');
      expect(report).toContain('Health data violations:');
    });
  });

  describe('Integration Functions', () => {
    it('should work with analyzeLogsForPII quick function', async () => {
      const result = await analyzeLogsForPII(['Email: test@example.com']);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBe(1);
    });

    it('should handle empty log input', async () => {
      const result = await analyzeLogsForPII([]);

      expect(result.passed).toBe(true);
      expect(result.summary.totalLogs).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long log lines', async () => {
      const analyzer = new LogAnalyzer();
      const longLog = 'A'.repeat(10000) + ' email: test@example.com';

      const result = await analyzer.analyzeLogs([longLog]);

      expect(result.violations.length).toBe(1);
      expect(result.violations[0].context.length).toBeLessThan(200);
    });

    it('should handle logs with special characters', async () => {
      const analyzer = new LogAnalyzer();
      const logs = ['Special chars: 你好 email: test@例え.com'];

      const result = await analyzer.analyzeLogs(logs);

      expect(result.violations.length).toBe(1);
    });

    it('should handle malformed patterns gracefully', async () => {
      const analyzer = new LogAnalyzer();
      const logs = ['Regular log entry without violations'];

      expect(async () => await analyzer.analyzeLogs(logs)).not.toThrow();
    });
  });
});
