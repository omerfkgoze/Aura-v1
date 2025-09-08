import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LoadTestingSuite,
  createLoadTester,
  LoadTestScenario,
  LoadTestResult,
  SecurityConstraint,
} from '../../src/testing/load-testing';

describe('LoadTestingSuite', () => {
  let loadTester: LoadTestingSuite;

  beforeEach(() => {
    loadTester = createLoadTester();
    vi.clearAllMocks();

    // Mock setTimeout to avoid delays in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      if (typeof fn === 'function') fn();
      return {} as any;
    });

    // Mock setInterval
    vi.spyOn(global, 'setInterval').mockImplementation(() => ({}) as any);
    vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
  });

  describe('scenario management', () => {
    it('should create load tester with default scenarios', () => {
      expect(loadTester).toBeInstanceOf(LoadTestingSuite);

      const scenarios = (loadTester as any).scenarios;
      expect(scenarios).toBeDefined();
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should allow adding custom scenarios', () => {
      const customScenario: LoadTestScenario = {
        name: 'custom-test',
        description: 'Custom test scenario',
        targets: [
          {
            name: 'test-target',
            target: vi.fn().mockResolvedValue({ success: true }),
            payloadGenerator: () => ({ test: 'data' }),
            securityValidations: [],
          },
        ],
        config: {
          duration: 10,
          virtualUsers: 5,
          rps: 10,
          rampUpTime: 2,
          rampDownTime: 2,
          securityConstraints: [],
        },
      };

      loadTester.addScenario(customScenario);

      const scenarios = (loadTester as any).scenarios;
      const addedScenario = scenarios.find((s: LoadTestScenario) => s.name === 'custom-test');

      expect(addedScenario).toBeDefined();
      expect(addedScenario.name).toBe('custom-test');
    });
  });

  describe('scenario execution', () => {
    it('should run specific scenario by name', async () => {
      // Add a quick test scenario
      const quickScenario: LoadTestScenario = {
        name: 'quick-test',
        description: 'Quick test scenario',
        targets: [
          {
            name: 'mock-target',
            target: vi.fn().mockResolvedValue({ success: true }),
            payloadGenerator: () => ({ test: 'data' }),
            securityValidations: [
              {
                name: 'always-pass',
                validate: () => true,
                expected: true,
              },
            ],
          },
        ],
        config: {
          duration: 1,
          virtualUsers: 1,
          rps: 1,
          rampUpTime: 0,
          rampDownTime: 0,
          securityConstraints: [
            {
              name: 'test-constraint',
              type: 'rate-limit',
              parameters: { maxRps: 10 },
              validator: () => true,
              criticality: 'low',
            },
          ],
        },
      };

      loadTester.addScenario(quickScenario);

      const result = await loadTester.runScenario('quick-test');

      expect(result).toBeDefined();
      expect(result.scenarioName).toBe('quick-test');
      expect(result.passed).toBe(true);
      expect(result.constraintResults).toHaveLength(1);
    });

    it('should handle scenario not found', async () => {
      await expect(loadTester.runScenario('non-existent-scenario')).rejects.toThrow(
        'Scenario not found: non-existent-scenario'
      );
    });

    it('should handle failing security constraints', async () => {
      const failingScenario: LoadTestScenario = {
        name: 'failing-scenario',
        description: 'Scenario with failing constraints',
        targets: [
          {
            name: 'mock-target',
            target: vi.fn().mockResolvedValue({ success: true }),
            payloadGenerator: () => ({ test: 'data' }),
            securityValidations: [],
          },
        ],
        config: {
          duration: 1,
          virtualUsers: 1,
          rps: 1,
          rampUpTime: 0,
          rampDownTime: 0,
          securityConstraints: [
            {
              name: 'failing-constraint',
              type: 'rate-limit',
              parameters: { maxRps: 1 },
              validator: () => false, // Always fails
              criticality: 'critical',
            },
          ],
        },
      };

      loadTester.addScenario(failingScenario);

      const result = await loadTester.runScenario('failing-scenario');

      expect(result.passed).toBe(false);
      expect(result.constraintResults[0].satisfied).toBe(false);
    });
  });

  describe('runAllScenarios', () => {
    it('should run all scenarios', async () => {
      // Mock runScenario to avoid full execution
      const mockResults: LoadTestResult[] = [
        {
          scenarioName: 'scenario-1',
          passed: true,
          metrics: {
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            averageResponseTime: 50,
            p95ResponseTime: 75,
            p99ResponseTime: 90,
            actualRps: 10,
            errorRate: 0,
            securityViolations: [],
            resourceUsage: { cpuUsage: [], memoryUsage: [], networkIO: [], diskIO: [] },
          },
          duration: 1000,
          constraintResults: [],
        },
      ];

      vi.spyOn(loadTester, 'runScenario').mockResolvedValueOnce(mockResults[0]);

      const results = await loadTester.runAllScenarios();

      expect(results).toHaveLength(1);
      expect(results[0].scenarioName).toBe('scenario-1');
    });
  });

  describe('security validations', () => {
    it('should validate security constraints', () => {
      const mockConstraints: SecurityConstraint[] = [
        {
          name: 'response-time-limit',
          type: 'resource-limit',
          parameters: { maxResponseTime: 100 },
          validator: metrics => metrics.averageResponseTime < 100,
          criticality: 'high',
        },
      ];

      const mockMetrics = {
        totalRequests: 50,
        successfulRequests: 50,
        failedRequests: 0,
        averageResponseTime: 75, // Within limit
        p95ResponseTime: 90,
        p99ResponseTime: 95,
        actualRps: 10,
        errorRate: 0,
        securityViolations: [],
        resourceUsage: { cpuUsage: [], memoryUsage: [], networkIO: [], diskIO: [] },
      };

      const results = (loadTester as any).validateSecurityConstraints(mockConstraints, mockMetrics);

      expect(results).toHaveLength(1);
      expect(results[0].satisfied).toBe(true);
      expect(results[0].name).toBe('response-time-limit');
    });

    it('should detect security violations in responses', () => {
      const mockTarget = {
        name: 'test-target',
        target: vi.fn().mockResolvedValue({
          success: true,
          userData: 'user-123-data',
        }),
        payloadGenerator: () => ({ userId: 'user-123', data: 'sensitive' }),
        securityValidations: [
          {
            name: 'no-user-data-leakage',
            validate: (req: any, res: any) => !JSON.stringify(res).includes(req.userId),
            expected: true,
          },
        ],
      };

      // This should detect that user ID appears in response
      const validationResult = mockTarget.securityValidations[0].validate(
        { userId: 'user-123', data: 'sensitive' },
        { success: true, userData: 'user-123-data' }
      );

      expect(validationResult).toBe(false); // Should fail because user ID is in response
    });
  });

  describe('mock target functions', () => {
    it('should test crypto encrypt mock', async () => {
      const mockPayload = { data: 'test-data', userId: 'user-123' };

      const result = await (loadTester as any).mockCryptoEncrypt(mockPayload);

      expect(result).toHaveProperty('encrypted', true);
      expect(result).toHaveProperty('envelope');
      expect(result.envelope).toHaveProperty('version', 1);
    });

    it('should test user authentication mock', async () => {
      const validToken = { token: 'valid-token-123', userId: 'user-123' };
      const invalidToken = { token: 'invalid-token', userId: 'user-123' };

      const validResult = await (loadTester as any).mockUserAuthentication(validToken);
      const invalidResult = await (loadTester as any).mockUserAuthentication(invalidToken);

      expect(validResult).toHaveProperty('authenticated');
      expect(validResult).toHaveProperty('rateLimited');
      expect(validResult).toHaveProperty('sessionValid');

      expect(invalidResult.authenticated).toBe(false);
    });

    it('should test database query mock with RLS', async () => {
      const sameUserQuery = {
        userId: 'user-123',
        requestedUserId: 'user-123',
        query: 'SELECT * FROM encrypted_cycle_data',
      };

      const crossUserQuery = {
        userId: 'user-123',
        requestedUserId: 'user-456',
        query: 'SELECT * FROM encrypted_cycle_data',
      };

      const sameUserResult = await (loadTester as any).mockDatabaseQuery(sameUserQuery);
      const crossUserResult = await (loadTester as any).mockDatabaseQuery(crossUserQuery);

      expect(sameUserResult.data.length).toBeGreaterThan(0); // Should return data
      expect(crossUserResult.data.length).toBe(0); // Should return no data (RLS)
    });
  });

  describe('metrics tracking', () => {
    it('should update metrics correctly', () => {
      const initialMetrics = (loadTester as any).initializeMetrics();
      (loadTester as any).currentMetrics = initialMetrics;

      // Update with successful request
      (loadTester as any).updateMetrics(100, true);

      expect((loadTester as any).currentMetrics.totalRequests).toBe(1);
      expect((loadTester as any).currentMetrics.successfulRequests).toBe(1);
      expect((loadTester as any).currentMetrics.failedRequests).toBe(0);
      expect((loadTester as any).currentMetrics.averageResponseTime).toBe(100);

      // Update with failed request
      (loadTester as any).updateMetrics(200, false);

      expect((loadTester as any).currentMetrics.totalRequests).toBe(2);
      expect((loadTester as any).currentMetrics.successfulRequests).toBe(1);
      expect((loadTester as any).currentMetrics.failedRequests).toBe(1);
      expect((loadTester as any).currentMetrics.errorRate).toBe(0.5);
    });

    it('should record security violations', () => {
      const initialMetrics = (loadTester as any).initializeMetrics();
      (loadTester as any).currentMetrics = initialMetrics;

      const violation = {
        constraintName: 'test-violation',
        timestamp: new Date(),
        details: 'Test violation details',
        severity: 'high' as const,
      };

      (loadTester as any).recordSecurityViolation(violation);

      expect((loadTester as any).currentMetrics.securityViolations).toHaveLength(1);
      expect((loadTester as any).currentMetrics.securityViolations[0]).toEqual(violation);
    });

    it('should initialize metrics correctly', () => {
      const metrics = (loadTester as any).initializeMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.securityViolations).toEqual([]);
      expect(metrics.resourceUsage).toHaveProperty('cpuUsage', []);
      expect(metrics.resourceUsage).toHaveProperty('memoryUsage', []);
    });
  });

  describe('default scenarios', () => {
    it('should have pre-defined load test scenarios', () => {
      const scenarios = (loadTester as any).scenarios;

      const expectedScenarios = [
        'crypto-operations-load',
        'authentication-load',
        'database-rls-load',
      ];

      expectedScenarios.forEach(scenarioName => {
        const scenario = scenarios.find((s: LoadTestScenario) => s.name === scenarioName);
        expect(scenario).toBeDefined();
        expect(scenario.targets.length).toBeGreaterThan(0);
        expect(scenario.config.securityConstraints.length).toBeGreaterThan(0);
      });
    });

    it('should have security constraints for each scenario', () => {
      const scenarios = (loadTester as any).scenarios;

      scenarios.forEach((scenario: LoadTestScenario) => {
        expect(scenario.config.securityConstraints.length).toBeGreaterThan(0);

        // Check that constraints have required properties
        scenario.config.securityConstraints.forEach(constraint => {
          expect(constraint).toHaveProperty('name');
          expect(constraint).toHaveProperty('type');
          expect(constraint).toHaveProperty('validator');
          expect(constraint).toHaveProperty('criticality');
        });
      });
    });
  });

  describe('createLoadTester', () => {
    it('should create load tester', () => {
      const tester = createLoadTester();
      expect(tester).toBeInstanceOf(LoadTestingSuite);
    });
  });
});
