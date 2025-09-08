/**
 * Client-Side Security Gate Integration Tests
 *
 * Comprehensive tests for the main client-side security gate that orchestrates
 * all client-side security validations and integrates with build pipeline.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import ClientSecurityGate from '../../src/client/client-gate';

// Mock the individual validators
vi.mock('../../src/client/ssr-validator', () => {
  const MockSSRValidator = vi.fn().mockImplementation(() => ({
    validatePages: vi.fn().mockResolvedValue(
      new Map([
        [
          'test',
          {
            isValid: true,
            violations: [],
            riskScore: 0,
            recommendations: [],
          },
        ],
      ])
    ),
    generateReport: vi.fn().mockReturnValue('SSR Report'),
  }));

  return { default: MockSSRValidator };
});

vi.mock('../../src/client/storage-validator', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      validateAllStorage: vi.fn().mockResolvedValue(
        new Map([
          [
            'localStorage',
            {
              isValid: true,
              violations: [],
              riskScore: 0,
              recommendations: [],
              totalItems: 1,
              encryptedItems: 1,
              unencryptedItems: 0,
            },
          ],
        ])
      ),
      generateReport: vi.fn().mockReturnValue('Storage Report'),
    })),
  };
});

vi.mock('../../src/client/xss-tester', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      runFullTest: vi.fn().mockResolvedValue({
        isVulnerable: false,
        vulnerabilities: [],
        riskScore: 0,
        testedPayloads: 10,
        blockedPayloads: 10,
        recommendations: [],
      }),
      generateReport: vi.fn().mockReturnValue('XSS Report'),
    })),
  };
});

vi.mock('../../src/client/crypto-validator', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      validateCryptoImplementation: vi.fn().mockResolvedValue({
        isValid: true,
        violations: [],
        riskScore: 0,
        recommendations: [],
        testedOperations: 5,
        secureOperations: 5,
        insecureOperations: 0,
      }),
      generateReport: vi.fn().mockReturnValue('Crypto Report'),
    })),
  };
});

// Mock console.log to capture output
const mockConsoleLog = vi.fn();
vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);

describe('ClientSecurityGate', () => {
  let gate: ClientSecurityGate;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      gate = new ClientSecurityGate({
        buildMode: 'development',
        maxRiskScore: 100,
        minComplianceRate: 90,
      });
    });

    it('should pass when all validations succeed', async () => {
      const result = await gate.execute();

      expect(result.passed).toBe(true);
      expect(result.name).toBe('Client-Side Security Gate');
      expect(result.overallRiskScore).toBe(0);
      expect(result.complianceRate).toBe(100);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should include all validation results', async () => {
      const result = await gate.execute();

      expect(result.ssrValidation).toBeDefined();
      expect(result.storageValidation).toBeDefined();
      expect(result.xssValidation).toBeDefined();
      expect(result.cryptoValidation).toBeDefined();

      expect(result.ssrValidation.isValid).toBe(true);
      expect(result.storageValidation.size).toBe(1);
      expect(result.xssValidation.isVulnerable).toBe(false);
      expect(result.cryptoValidation.isValid).toBe(true);
    });

    it('should log success status', async () => {
      await gate.execute();

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✅ PASSED'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('All client-side security validations passed')
      );
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      gate = new ClientSecurityGate({
        buildMode: 'production',
        maxRiskScore: 0,
        minComplianceRate: 100,
        failOnHighRisk: true,
      });
    });

    it('should have stricter validation in production mode', async () => {
      const result = await gate.execute();

      // In production, all validations must pass with zero risk
      expect(result.passed).toBe(true);
      expect(result.overallRiskScore).toBe(0);
      expect(result.complianceRate).toBe(100);
    });
  });

  describe('Failure Scenarios', () => {
    beforeEach(() => {
      gate = new ClientSecurityGate({
        buildMode: 'development',
        maxRiskScore: 50,
        minComplianceRate: 95,
      });
    });

    it('should fail when risk score exceeds maximum', async () => {
      // Mock SSR validator to return high risk
      const ssrValidator = require('../../src/client/ssr-validator').default;
      const mockInstance = new ssrValidator();
      mockInstance.validatePages.mockResolvedValue({
        isValid: false,
        violations: [
          {
            type: 'pii_exposure',
            severity: 'high',
            location: 'test',
            content: 'sensitive data',
            recommendation: 'Fix this',
          },
        ],
        riskScore: 75, // Exceeds maxRiskScore of 50
        recommendations: ['Fix violations'],
      });

      const result = await gate.execute();

      expect(result.passed).toBe(false);
      expect(result.overallRiskScore).toBeGreaterThan(50);
    });

    it('should fail when compliance rate is below minimum', async () => {
      // Mock XSS tester to fail
      const xssTester = require('../../src/client/xss-tester').default;
      const mockInstance = new xssTester();
      mockInstance.runFullTest.mockResolvedValue({
        isVulnerable: true,
        vulnerabilities: [
          {
            type: 'dom_xss',
            severity: 'critical',
            payload: '<script>alert("xss")</script>',
            context: 'test',
            evidence: 'XSS vulnerability found',
            recommendation: 'Sanitize input',
          },
        ],
        riskScore: 25,
        testedPayloads: 10,
        blockedPayloads: 8,
        recommendations: ['Fix XSS'],
      });

      const result = await gate.execute();

      expect(result.passed).toBe(false);
      expect(result.complianceRate).toBeLessThan(95);
    });

    it('should log failure details', async () => {
      // Mock storage validator to fail
      const storageValidator = require('../../src/client/storage-validator').default;
      const mockInstance = new storageValidator();
      mockInstance.validateAllStorage.mockResolvedValue(
        new Map([
          [
            'localStorage',
            {
              isValid: false,
              violations: [
                {
                  storageType: 'localStorage',
                  key: 'sensitiveData',
                  value: 'unencrypted health data',
                  violationType: 'unencrypted_sensitive',
                  severity: 'critical',
                  recommendation: 'Encrypt sensitive data',
                },
              ],
              riskScore: 100,
              recommendations: ['Encrypt data'],
              totalItems: 1,
              encryptedItems: 0,
              unencryptedItems: 1,
            },
          ],
        ])
      );

      await gate.execute();

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('❌ FAILED'));
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Security Gate Failures:')
      );
    });
  });

  describe('Selective Validation', () => {
    it('should allow disabling specific validations', async () => {
      const selectiveGate = new ClientSecurityGate({
        enableSSRValidation: false,
        enableStorageValidation: true,
        enableXSSValidation: false,
        enableCryptoValidation: true,
      });

      const result = await selectiveGate.execute();

      expect(result.passed).toBe(true);
      expect(result.ssrValidation.violations).toHaveLength(0);
      expect(result.xssValidation.vulnerabilities).toHaveLength(0);
      // Storage and crypto should still run
      expect(result.storageValidation.size).toBe(1);
      expect(result.cryptoValidation.testedOperations).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Mock SSR validator to throw error
      const ssrValidator = require('../../src/client/ssr-validator').default;
      const mockInstance = new ssrValidator();
      mockInstance.validatePages.mockRejectedValue(new Error('SSR validation failed'));

      const result = await gate.execute();

      expect(result.passed).toBe(false);
      expect(result.details).toContain('SSR validation failed');
      expect(result.overallRiskScore).toBeGreaterThan(0);
    });

    it('should continue with other validations when one fails', async () => {
      // Mock only XSS tester to throw error
      const xssTester = require('../../src/client/xss-tester').default;
      const mockInstance = new xssTester();
      mockInstance.runFullTest.mockRejectedValue(new Error('XSS test failed'));

      const result = await gate.execute();

      // Other validations should still complete
      expect(result.ssrValidation.isValid).toBe(true);
      expect(result.storageValidation.size).toBe(1);
      expect(result.cryptoValidation.isValid).toBe(true);

      // But XSS should show error
      expect(result.xssValidation.vulnerabilities.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive security report', async () => {
      const result = await gate.execute();
      const report = gate.generateReport(result);

      expect(report).toContain('Client-Side Security Gate Report');
      expect(report).toContain('Executive Summary');
      expect(report).toContain('Status: ✅ PASSED');
      expect(report).toContain('Overall Risk Score:');
      expect(report).toContain('Compliance Rate:');
      expect(report).toContain('Build Pipeline Integration');
    });

    it('should show failure details in report', async () => {
      // Mock a failure scenario
      const cryptoValidator = require('../../src/client/crypto-validator').default;
      const mockInstance = new cryptoValidator();
      mockInstance.validateCryptoImplementation.mockResolvedValue({
        isValid: false,
        violations: [
          {
            type: 'key_management',
            severity: 'critical',
            context: 'Hardcoded keys detected',
            evidence: 'const key = "secret123"',
            recommendation: 'Remove hardcoded keys',
          },
        ],
        riskScore: 150,
        recommendations: ['Fix crypto issues'],
        testedOperations: 3,
        secureOperations: 2,
        insecureOperations: 1,
      });

      const result = await gate.execute();
      const report = gate.generateReport(result);

      expect(report).toContain('Status: ❌ FAILED');
      expect(report).toContain('security violations detected');
      expect(report).toContain('Remove hardcoded keys');
    });
  });

  describe('Build Pipeline Integration', () => {
    it('should provide static method for build pipeline', async () => {
      const result = await ClientSecurityGate.runForBuildPipeline('development');

      expect(result).toBe(true); // Should pass with mocked success responses
    });

    it('should handle production build pipeline', async () => {
      const result = await ClientSecurityGate.runForBuildPipeline('production');

      expect(result).toBe(true);
    });

    it('should exit process on production failure', async () => {
      // Mock process.exit
      const mockExit = vi.fn();
      vi.stubGlobal('process', { exit: mockExit });

      // Mock a critical failure
      const ssrValidator = require('../../src/client/ssr-validator').default;
      const mockInstance = new ssrValidator();
      mockInstance.validatePages.mockResolvedValue({
        isValid: false,
        violations: [
          {
            type: 'pii_exposure',
            severity: 'critical',
            location: 'production',
            content: 'critical violation',
            recommendation: 'Fix immediately',
          },
        ],
        riskScore: 200,
        recommendations: ['Fix critical issues'],
      });

      const result = await ClientSecurityGate.runForBuildPipeline('production');

      expect(result).toBe(false);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Performance', () => {
    it('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await gate.execute();
      const endTime = Date.now();

      expect(result.executionTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should run validations in parallel', async () => {
      // All validators should be called
      const result = await gate.execute();

      expect(result.ssrValidation).toBeDefined();
      expect(result.storageValidation).toBeDefined();
      expect(result.xssValidation).toBeDefined();
      expect(result.cryptoValidation).toBeDefined();

      // Execution time should be reasonable for parallel execution
      expect(result.executionTime).toBeLessThan(2000);
    });
  });
});
