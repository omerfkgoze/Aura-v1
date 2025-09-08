import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TestingGate,
  createTestingGate,
  DEFAULT_TESTING_GATE_CONFIG,
  TestingGateConfig,
} from '../../src/testing/testing-gate';
import { SecurityGateResult } from '../../src/core/security-gate.interface';

describe('TestingGate', () => {
  let testingGate: TestingGate;

  beforeEach(() => {
    vi.clearAllMocks();

    testingGate = createTestingGate({
      enablePropertyTesting: true,
      enableFuzzTesting: true,
      enableChaosEngineering: false, // Disabled for faster tests
      enableLoadTesting: false, // Disabled for faster tests
      maxTestingTime: 1, // 1 minute for tests
      parallelExecution: true,
      failFast: false,
    });
  });

  describe('initialization', () => {
    it('should create testing gate with default config', () => {
      const gate = createTestingGate();
      expect(gate).toBeInstanceOf(TestingGate);
    });

    it('should create testing gate with custom config', () => {
      const customConfig: Partial<TestingGateConfig> = {
        enablePropertyTesting: false,
        enableFuzzTesting: true,
        enableChaosEngineering: true,
        enableLoadTesting: false,
        maxTestingTime: 5,
        parallelExecution: false,
        failFast: true,
        outputDirectory: './custom-output',
      };

      const gate = createTestingGate(customConfig);
      expect(gate).toBeInstanceOf(TestingGate);
    });

    it('should have default testing gate config', () => {
      expect(DEFAULT_TESTING_GATE_CONFIG).toBeDefined();
      expect(DEFAULT_TESTING_GATE_CONFIG.enablePropertyTesting).toBe(true);
      expect(DEFAULT_TESTING_GATE_CONFIG.enableFuzzTesting).toBe(true);
      expect(DEFAULT_TESTING_GATE_CONFIG.parallelExecution).toBe(true);
    });
  });

  describe('validate method', () => {
    beforeEach(() => {
      // Mock all testing suites to avoid actual execution
      vi.spyOn(testingGate as any, 'runPropertyTesting').mockResolvedValue({
        suiteName: 'PropertyTesting',
        passed: true,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      vi.spyOn(testingGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: true,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });
    });

    it('should validate successfully when all suites pass', async () => {
      const result = await testingGate.validate();

      expect(result).toBeDefined();
      expect(result.gateName).toBe('TestingGate');
      expect(result.passed).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details.suiteResults).toBeDefined();
      expect(result.details.suiteResults.length).toBeGreaterThan(0);
    });

    it('should fail when any suite fails', async () => {
      // Make fuzz testing fail
      vi.spyOn(testingGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: false,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 1,
        criticalIssues: ['Critical security issue found'],
        details: {},
      });

      const result = await testingGate.validate();

      expect(result.passed).toBe(false);
      expect(result.details.criticalIssuesFound).toContain('Critical security issue found');
    });

    it('should handle suite execution errors', async () => {
      vi.spyOn(testingGate as any, 'runPropertyTesting').mockRejectedValue(
        new Error('Property testing failed')
      );

      const result = await testingGate.validate();

      expect(result.passed).toBe(false);
      expect(result.details.suiteResults).toBeDefined();
    });
  });

  describe('testing suite execution', () => {
    it('should run property testing suite', async () => {
      // Mock the property tester
      const mockPropertyTester = {
        createCryptoEnvelopeTests: vi.fn().mockReturnValue([]),
        createPIIDetectionTests: vi.fn().mockReturnValue([]),
        createNetworkSecurityTests: vi.fn().mockReturnValue([]),
        createRLSPolicyTests: vi.fn().mockReturnValue([]),
        testSecurityProperty: vi.fn().mockResolvedValue(undefined),
      };

      (testingGate as any).propertyTester = mockPropertyTester;

      const result = await (testingGate as any).runPropertyTesting();

      expect(result).toBeDefined();
      expect(result.suiteName).toBe('PropertyTesting');
      expect(result.passed).toBe(true);
      expect(mockPropertyTester.createCryptoEnvelopeTests).toHaveBeenCalled();
    });

    it('should run fuzz testing suite', async () => {
      const mockFuzzTester = {
        runAllFuzzTests: vi.fn().mockResolvedValue(undefined),
      };

      (testingGate as any).fuzzTester = mockFuzzTester;

      const result = await (testingGate as any).runFuzzTesting();

      expect(result).toBeDefined();
      expect(result.suiteName).toBe('FuzzTesting');
      expect(result.passed).toBe(true);
      expect(mockFuzzTester.runAllFuzzTests).toHaveBeenCalled();
    });

    it('should run chaos engineering suite', async () => {
      const mockChaosResults = [
        {
          name: 'test-experiment',
          success: true,
          duration: 1000,
          behaviorResults: [{ passed: true }],
          failures: [],
          metrics: {},
        },
      ];

      const mockChaosTester = {
        runAllExperiments: vi.fn().mockResolvedValue(mockChaosResults),
      };

      (testingGate as any).chaosTester = mockChaosTester;

      const result = await (testingGate as any).runChaosEngineering();

      expect(result).toBeDefined();
      expect(result.suiteName).toBe('ChaosEngineering');
      expect(result.passed).toBe(true);
      expect(mockChaosTester.runAllExperiments).toHaveBeenCalled();
    });

    it('should run load testing suite', async () => {
      const mockLoadResults = [
        {
          scenarioName: 'test-scenario',
          passed: true,
          duration: 1000,
          metrics: {
            totalRequests: 100,
            successfulRequests: 100,
            failedRequests: 0,
            averageResponseTime: 50,
            errorRate: 0,
            securityViolations: [],
          },
          constraintResults: [],
        },
      ];

      const mockLoadTester = {
        runAllScenarios: vi.fn().mockResolvedValue(mockLoadResults),
      };

      (testingGate as any).loadTester = mockLoadTester;

      const result = await (testingGate as any).runLoadTesting();

      expect(result).toBeDefined();
      expect(result.suiteName).toBe('LoadTesting');
      expect(result.passed).toBe(true);
      expect(mockLoadTester.runAllScenarios).toHaveBeenCalled();
    });
  });

  describe('parallel vs sequential execution', () => {
    beforeEach(() => {
      // Mock all testing methods
      vi.spyOn(testingGate as any, 'runPropertyTesting').mockResolvedValue({
        suiteName: 'PropertyTesting',
        passed: true,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      vi.spyOn(testingGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: true,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });
    });

    it('should run suites in parallel when enabled', async () => {
      const parallelGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: true,
        enableChaosEngineering: false,
        enableLoadTesting: false,
        parallelExecution: true,
        maxTestingTime: 1,
      });

      // Mock the testing methods
      vi.spyOn(parallelGate as any, 'runPropertyTesting').mockResolvedValue({
        suiteName: 'PropertyTesting',
        passed: true,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      vi.spyOn(parallelGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: true,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      const result = await parallelGate.validate();

      expect(result.passed).toBe(true);
      expect(result.details.suiteResults).toHaveLength(2);
    });

    it('should run suites sequentially when parallel is disabled', async () => {
      const sequentialGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: true,
        enableChaosEngineering: false,
        enableLoadTesting: false,
        parallelExecution: false,
        maxTestingTime: 1,
      });

      // Mock the testing methods
      vi.spyOn(sequentialGate as any, 'runPropertyTesting').mockResolvedValue({
        suiteName: 'PropertyTesting',
        passed: true,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      vi.spyOn(sequentialGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: true,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      const result = await sequentialGate.validate();

      expect(result.passed).toBe(true);
      expect(result.details.suiteResults).toHaveLength(2);
    });
  });

  describe('fail-fast behavior', () => {
    it('should stop on first failure when fail-fast is enabled', async () => {
      const failFastGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: true,
        enableChaosEngineering: false,
        enableLoadTesting: false,
        failFast: true,
        parallelExecution: false, // Use sequential for fail-fast test
        maxTestingTime: 1,
      });

      // Make property testing fail
      vi.spyOn(failFastGate as any, 'runPropertyTesting').mockResolvedValue({
        suiteName: 'PropertyTesting',
        passed: false,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 1,
        criticalIssues: ['Critical issue'],
        details: {},
      });

      // This should not be called due to fail-fast
      vi.spyOn(failFastGate as any, 'runFuzzTesting').mockResolvedValue({
        suiteName: 'FuzzTesting',
        passed: true,
        duration: 2000,
        testsExecuted: 4,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      });

      const result = await failFastGate.validate();

      expect(result.passed).toBe(false);
      // Should only have one suite result due to fail-fast
      expect(result.details.suiteResults).toHaveLength(1);
    });
  });

  describe('timeout handling', () => {
    it('should handle suite timeouts', async () => {
      const timeoutGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: false,
        enableChaosEngineering: false,
        enableLoadTesting: false,
        maxTestingTime: 0.01, // Very short timeout
        parallelExecution: true,
      });

      // Mock a long-running test
      vi.spyOn(timeoutGate as any, 'runPropertyTesting').mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  suiteName: 'PropertyTesting',
                  passed: true,
                  duration: 10000,
                  testsExecuted: 10,
                  testsFailed: 0,
                  criticalIssues: [],
                  details: {},
                }),
              2000
            )
          ) // 2 second delay
      );

      const result = await timeoutGate.validate();

      // Should handle timeout gracefully
      expect(result).toBeDefined();
    });
  });

  describe('enabled suites configuration', () => {
    it('should only run enabled testing suites', () => {
      const customGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: false,
        enableChaosEngineering: false,
        enableLoadTesting: false,
      });

      const enabledSuites = (customGate as any).getEnabledTestingSuites();

      expect(enabledSuites).toHaveLength(1);
      expect(enabledSuites[0].name).toBe('PropertyTesting');
    });

    it('should run all suites when all are enabled', () => {
      const allEnabledGate = createTestingGate({
        enablePropertyTesting: true,
        enableFuzzTesting: true,
        enableChaosEngineering: true,
        enableLoadTesting: true,
      });

      const enabledSuites = (allEnabledGate as any).getEnabledTestingSuites();

      expect(enabledSuites).toHaveLength(4);
      expect(enabledSuites.map((s: any) => s.name)).toEqual([
        'PropertyTesting',
        'FuzzTesting',
        'ChaosEngineering',
        'LoadTesting',
      ]);
    });
  });

  describe('result processing', () => {
    it('should process suite results correctly', async () => {
      const mockResult: SecurityGateResult = {
        valid: true,
        passed: true,
        errors: [],
        warnings: [],
        metadata: {
          suiteResults: [],
          criticalIssuesFound: [],
        },
      };

      const passingResult = {
        suiteName: 'TestSuite',
        passed: true,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 0,
        criticalIssues: [],
        details: {},
      };

      (testingGate as any).processSuiteResult(passingResult, mockResult);

      expect(mockResult.passed).toBe(true);
      expect((mockResult.metadata as any).criticalIssuesFound).toHaveLength(0);
    });

    it('should handle failing suite results', async () => {
      const mockResult: SecurityGateResult = {
        valid: true,
        passed: true,
        errors: [],
        warnings: [],
        metadata: {
          suiteResults: [],
          criticalIssuesFound: [],
        },
      };

      const failingResult = {
        suiteName: 'TestSuite',
        passed: false,
        duration: 1000,
        testsExecuted: 10,
        testsFailed: 2,
        criticalIssues: ['Critical issue 1', 'Critical issue 2'],
        details: {},
      };

      (testingGate as any).processSuiteResult(failingResult, mockResult);

      expect(mockResult.passed).toBe(false);
      expect((mockResult.metadata as any).criticalIssuesFound).toHaveLength(2);
      expect((mockResult.metadata as any).criticalIssuesFound).toContain('Critical issue 1');
      expect((mockResult.metadata as any).criticalIssuesFound).toContain('Critical issue 2');
    });
  });
});
