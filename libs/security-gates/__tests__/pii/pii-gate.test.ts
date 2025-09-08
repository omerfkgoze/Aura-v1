/**
 * @fileoverview Tests for PII prevention security gate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PIIPreventionGate, validatePIIPrevention } from '../../src/pii/pii-gate';

// Mock the analyzers to avoid file system dependencies in tests
vi.mock('../../src/pii/log-analyzer', () => ({
  LogAnalyzer: vi.fn().mockImplementation(() => ({
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    analyzeLogs: vi
      .fn()
      .mockResolvedValue({ passed: true, violations: [], summary: {}, errors: [] }),
    generateReport: vi.fn().mockReturnValue('Mock report'),
  })),
}));
vi.mock('../../src/pii/error-sanitizer', () => ({
  ErrorSanitizer: vi.fn().mockImplementation(() => ({
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    validateErrorMessages: vi
      .fn()
      .mockReturnValue({ passed: true, violations: [], summary: {}, errors: [] }),
    generateReport: vi.fn().mockReturnValue('Mock report'),
  })),
}));
vi.mock('../../src/pii/debug-filter', () => ({
  DebugFilter: vi.fn().mockImplementation(() => ({
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    scanBuildFiles: vi
      .fn()
      .mockResolvedValue({ passed: true, violations: [], summary: {}, errors: [] }),
    generateReport: vi.fn().mockReturnValue('Mock report'),
  })),
}));
vi.mock('../../src/pii/memory-analyzer', () => ({
  MemoryAnalyzer: vi.fn().mockImplementation(() => ({
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    analyzeMemory: vi.fn().mockResolvedValue({
      passed: true,
      violations: [],
      summary: {},
      errors: [],
      analysisMetadata: { timestamp: '', memorySize: 0, gcCollections: 0, heapUsed: 0 },
    }),
    generateReport: vi.fn().mockReturnValue('Mock report'),
  })),
}));

describe('PIIPreventionGate', () => {
  let gate: PIIPreventionGate;

  beforeEach(() => {
    gate = new PIIPreventionGate({
      enableLogAnalysis: true,
      enableErrorSanitization: true,
      enableDebugFilter: true,
      enableMemoryAnalysis: true,
      targetEnvironment: 'production',
    });
  });

  describe('Configuration', () => {
    it('should create gate with default configuration', () => {
      const defaultGate = new PIIPreventionGate();

      const validation = defaultGate.validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should validate valid configuration', () => {
      const validation = gate.validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid environment', () => {
      const invalidGate = new PIIPreventionGate({
        targetEnvironment: 'invalid' as any,
      });

      const validation = invalidGate.validateConfig();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid target environment'))).toBe(true);
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate summary correctly', async () => {
      // Mock results that would have violations
      const mockResults = {
        logAnalysis: {
          passed: false,
          violations: [
            { severity: 'critical', pattern: { healthDataRelated: true } },
            { severity: 'high', pattern: { healthDataRelated: false } },
          ],
          summary: {
            totalLogs: 2,
            violationsFound: 2,
            criticalViolations: 1,
            healthDataViolations: 1,
          },
          errors: [],
        },
        errorSanitization: {
          passed: false,
          violations: [{ severity: 'critical', rule: { category: 'crypto' } }],
          summary: {
            totalErrors: 1,
            violationsFound: 1,
            criticalViolations: 1,
            healthDataViolations: 0,
          },
          errors: [],
        },
        debugFilter: {
          passed: true,
          violations: [],
          summary: {
            totalFiles: 5,
            violationsFound: 0,
            criticalViolations: 0,
            filesWithViolations: 0,
          },
          errors: [],
        },
        memoryAnalysis: {
          passed: false,
          violations: [{ severity: 'high', pattern: { category: 'health-data' } }],
          summary: {
            totalRegions: 10,
            violationsFound: 1,
            criticalViolations: 0,
            healthDataPersistence: 1,
            cryptoPersistence: 0,
          },
          errors: [],
          analysisMetadata: { timestamp: '', memorySize: 0, gcCollections: 0, heapUsed: 0 },
        },
      };

      const summary = (gate as any).calculateSummary(mockResults);

      expect(summary.totalViolations).toBe(4);
      expect(summary.criticalViolations).toBe(2);
      expect(summary.healthDataViolations).toBe(2);
      expect(summary.cryptoViolations).toBe(1);
    });
  });

  describe('Recommendations', () => {
    it('should generate appropriate recommendations for violations', () => {
      const mockResults = {
        logAnalysis: {
          violations: [{ severity: 'critical', pattern: { healthDataRelated: true } }],
          summary: { healthDataViolations: 1 },
        },
        errorSanitization: {
          violations: [{ severity: 'critical', rule: { category: 'crypto' } }],
          summary: { criticalViolations: 1 },
        },
        debugFilter: {
          violations: [{ severity: 'high' }],
          summary: { criticalViolations: 0 },
        },
        memoryAnalysis: {
          violations: [{ severity: 'high', pattern: { category: 'crypto' } }],
          summary: { cryptoPersistence: 1, healthDataPersistence: 0 },
        },
      };

      const recommendations = (gate as any).generateRecommendations(mockResults);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Log Analysis'))).toBe(true);
      expect(recommendations.some(r => r.includes('Health Data'))).toBe(true);
      expect(recommendations.some(r => r.includes('Error Handling'))).toBe(true);
      expect(recommendations.some(r => r.includes('Debug Information'))).toBe(true);
      expect(recommendations.some(r => r.includes('Crypto Material'))).toBe(true);
    });

    it('should generate success recommendations when no violations', () => {
      const mockResults = {
        logAnalysis: { violations: [], summary: {} },
        errorSanitization: { violations: [], summary: {} },
        debugFilter: { violations: [], summary: {} },
        memoryAnalysis: { violations: [], summary: {} },
      };

      const recommendations = (gate as any).generateRecommendations(mockResults);

      expect(recommendations.some(r => r.includes('All validation checks passed'))).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate passed report', () => {
      const result = {
        passed: true,
        results: {
          logAnalysis: {
            passed: true,
            violations: [],
            summary: {
              totalLogs: 0,
              violationsFound: 0,
              criticalViolations: 0,
              healthDataViolations: 0,
            },
            errors: [],
          },
          errorSanitization: {
            passed: true,
            violations: [],
            summary: {
              totalErrors: 0,
              violationsFound: 0,
              criticalViolations: 0,
              healthDataViolations: 0,
            },
            errors: [],
          },
          debugFilter: {
            passed: true,
            violations: [],
            summary: {
              totalFiles: 0,
              violationsFound: 0,
              criticalViolations: 0,
              filesWithViolations: 0,
            },
            errors: [],
          },
          memoryAnalysis: {
            passed: true,
            violations: [],
            summary: {
              totalRegions: 0,
              violationsFound: 0,
              criticalViolations: 0,
              healthDataPersistence: 0,
              cryptoPersistence: 0,
            },
            errors: [],
            analysisMetadata: { timestamp: '', memorySize: 0, gcCollections: 0, heapUsed: 0 },
          },
        },
        summary: {
          totalViolations: 0,
          criticalViolations: 0,
          healthDataViolations: 0,
          cryptoViolations: 0,
        },
        recommendations: ['✅ PII Prevention: All validation checks passed'],
        errors: [],
      };

      const report = gate.generateReport(result);

      expect(report).toContain('✅ PASSED');
      expect(report).toContain('Total Violations: 0');
      expect(report).toContain('deployment can proceed');
    });

    it('should generate failed report with details', () => {
      const result = {
        passed: false,
        results: {
          logAnalysis: {
            passed: false,
            violations: [{}],
            summary: {
              totalLogs: 1,
              violationsFound: 1,
              criticalViolations: 1,
              healthDataViolations: 1,
            },
            errors: [],
          },
          errorSanitization: {
            passed: true,
            violations: [],
            summary: {
              totalErrors: 0,
              violationsFound: 0,
              criticalViolations: 0,
              healthDataViolations: 0,
            },
            errors: [],
          },
          debugFilter: {
            passed: true,
            violations: [],
            summary: {
              totalFiles: 0,
              violationsFound: 0,
              criticalViolations: 0,
              filesWithViolations: 0,
            },
            errors: [],
          },
          memoryAnalysis: {
            passed: true,
            violations: [],
            summary: {
              totalRegions: 0,
              violationsFound: 0,
              criticalViolations: 0,
              healthDataPersistence: 0,
              cryptoPersistence: 0,
            },
            errors: [],
            analysisMetadata: { timestamp: '', memorySize: 0, gcCollections: 0, heapUsed: 0 },
          },
        },
        summary: {
          totalViolations: 1,
          criticalViolations: 1,
          healthDataViolations: 1,
          cryptoViolations: 0,
        },
        recommendations: ['Fix violations'],
        errors: [],
      };

      const report = gate.generateReport(result);

      expect(report).toContain('❌ FAILED');
      expect(report).toContain('Total Violations: 1');
      expect(report).toContain('Critical Violations: 1');
      expect(report).toContain('fix violations before deployment');
    });
  });

  describe('Integration Functions', () => {
    it('should work with validatePIIPrevention function', async () => {
      const result = await validatePIIPrevention({
        enableLogAnalysis: false,
        enableErrorSanitization: false,
        enableDebugFilter: false,
        enableMemoryAnalysis: false,
      });

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
      expect(result.summary).toBeDefined();
    });

    it('should work with quick validation', async () => {
      const passed = await PIIPreventionGate.quickValidation({
        enableLogAnalysis: false,
        enableErrorSanitization: false,
        enableDebugFilter: false,
        enableMemoryAnalysis: false,
      });

      expect(typeof passed).toBe('boolean');
    });
  });

  describe('Environment Handling', () => {
    it('should handle development environment', () => {
      const devGate = new PIIPreventionGate({
        targetEnvironment: 'development',
        failOnCritical: false,
      });

      const validation = devGate.validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should handle staging environment', () => {
      const stagingGate = new PIIPreventionGate({
        targetEnvironment: 'staging',
        failOnCritical: true,
      });

      const validation = stagingGate.validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should handle production environment with strict settings', () => {
      const prodGate = new PIIPreventionGate({
        targetEnvironment: 'production',
        failOnCritical: true,
        enableLogAnalysis: true,
        enableErrorSanitization: true,
        enableDebugFilter: true,
        enableMemoryAnalysis: true,
      });

      const validation = prodGate.validateConfig();
      expect(validation.valid).toBe(true);
    });
  });

  describe('Reporting Levels', () => {
    it('should handle summary reporting level', () => {
      const summaryGate = new PIIPreventionGate({
        reportingLevel: 'summary',
      });

      const validation = summaryGate.validateConfig();
      expect(validation.valid).toBe(true);
    });

    it('should handle verbose reporting level', () => {
      const verboseGate = new PIIPreventionGate({
        reportingLevel: 'verbose',
      });

      const validation = verboseGate.validateConfig();
      expect(validation.valid).toBe(true);
    });
  });
});
