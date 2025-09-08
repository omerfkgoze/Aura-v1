import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ChaosEngineeringSuite,
  createChaosEngineeringSuite,
  ChaosExperiment,
  ChaosExperimentResult,
} from '../../src/testing/chaos-engineering';

describe('ChaosEngineeringSuite', () => {
  let chaosSuite: ChaosEngineeringSuite;

  beforeEach(() => {
    chaosSuite = createChaosEngineeringSuite();
    vi.clearAllMocks();
  });

  describe('experiment management', () => {
    it('should create chaos suite with default experiments', () => {
      expect(chaosSuite).toBeInstanceOf(ChaosEngineeringSuite);

      // Check that default experiments are loaded
      const experiments = (chaosSuite as any).experiments;
      expect(experiments).toBeDefined();
      expect(experiments.length).toBeGreaterThan(0);
    });

    it('should allow adding custom experiments', () => {
      const customExperiment: ChaosExperiment = {
        name: 'test-custom-experiment',
        description: 'A custom test experiment',
        duration: 30,
        failures: [
          {
            type: 'network',
            severity: 0.5,
            parameters: { dropRate: 0.1 },
            delay: 5,
            duration: 20,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'test-behavior',
            check: async () => true,
            expectedResult: true,
            criticality: 'medium',
          },
        ],
      };

      chaosSuite.addExperiment(customExperiment);

      const experiments = (chaosSuite as any).experiments;
      const addedExperiment = experiments.find(
        (exp: ChaosExperiment) => exp.name === 'test-custom-experiment'
      );

      expect(addedExperiment).toBeDefined();
      expect(addedExperiment.name).toBe('test-custom-experiment');
    });
  });

  describe('experiment execution', () => {
    beforeEach(() => {
      // Mock setTimeout and clearInterval to avoid actual delays
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        if (typeof fn === 'function') fn();
        return {} as any;
      });
      vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
    });

    it('should run specific experiment by name', async () => {
      // Add a minimal test experiment
      const testExperiment: ChaosExperiment = {
        name: 'test-experiment',
        description: 'Test experiment',
        duration: 1,
        failures: [],
        expectedSecurityBehavior: [
          {
            name: 'always-pass',
            check: async () => true,
            expectedResult: true,
            criticality: 'low',
          },
        ],
      };

      chaosSuite.addExperiment(testExperiment);

      const result = await chaosSuite.runExperiment('test-experiment');

      expect(result).toBeDefined();
      expect(result.name).toBe('test-experiment');
      expect(result.success).toBe(true);
      expect(result.behaviorResults).toHaveLength(1);
      expect(result.behaviorResults[0].passed).toBe(true);
    });

    it('should handle experiment not found', async () => {
      await expect(chaosSuite.runExperiment('non-existent-experiment')).rejects.toThrow(
        'Experiment not found: non-existent-experiment'
      );
    });

    it('should handle failing security behavior checks', async () => {
      const failingExperiment: ChaosExperiment = {
        name: 'failing-experiment',
        description: 'Experiment with failing checks',
        duration: 1,
        failures: [],
        expectedSecurityBehavior: [
          {
            name: 'always-fail',
            check: async () => false,
            expectedResult: true,
            criticality: 'critical',
          },
        ],
      };

      chaosSuite.addExperiment(failingExperiment);

      const result = await chaosSuite.runExperiment('failing-experiment');

      expect(result.success).toBe(false);
      expect(result.behaviorResults[0].passed).toBe(false);
    });

    it('should handle exceptions in security behavior checks', async () => {
      const throwingExperiment: ChaosExperiment = {
        name: 'throwing-experiment',
        description: 'Experiment with throwing checks',
        duration: 1,
        failures: [],
        expectedSecurityBehavior: [
          {
            name: 'throws-error',
            check: async () => {
              throw new Error('Test error');
            },
            expectedResult: true,
            criticality: 'high',
          },
        ],
      };

      chaosSuite.addExperiment(throwingExperiment);

      const result = await chaosSuite.runExperiment('throwing-experiment');

      expect(result.success).toBe(false);
      expect(result.behaviorResults[0].passed).toBe(false);
      expect(result.behaviorResults[0].error).toBe('Test error');
    });
  });

  describe('runAllExperiments', () => {
    beforeEach(() => {
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        if (typeof fn === 'function') fn();
        return {} as any;
      });
    });

    it('should run all experiments', async () => {
      // Get the actual number of default experiments
      const experiments = (chaosSuite as any).experiments;
      const expectedLength = experiments.length;

      const results = await chaosSuite.runAllExperiments();

      expect(results).toHaveLength(expectedLength);
      expect(results.every(r => typeof r.name === 'string')).toBe(true);
      expect(results.every(r => typeof r.success === 'boolean')).toBe(true);
    });
  });

  describe('failure injection', () => {
    it('should emit events for failure injection', () => {
      const eventSpy = vi.fn();
      chaosSuite.on('crypto-failure', eventSpy);

      // Call private method through reflection
      const cryptoFailure = {
        type: 'crypto' as const,
        severity: 1.0,
        parameters: { service: 'encryption' },
        delay: 0,
        duration: 1,
      };

      (chaosSuite as any).injectCryptoFailure(cryptoFailure);

      expect(eventSpy).toHaveBeenCalledWith({ service: 'encryption' });
    });

    it('should emit events for different failure types', () => {
      const eventSpies = {
        database: vi.fn(),
        memory: vi.fn(),
        network: vi.fn(),
        cpu: vi.fn(),
      };

      chaosSuite.on('database-failure', eventSpies.database);
      chaosSuite.on('memory-pressure', eventSpies.memory);
      chaosSuite.on('network-partition', eventSpies.network);
      chaosSuite.on('cpu-exhaustion', eventSpies.cpu);

      // Test each failure type
      (chaosSuite as any).injectDatabaseFailure({ parameters: { db: 'test' } });
      (chaosSuite as any).injectMemoryFailure({ parameters: { memoryPressureMB: 500 } });
      (chaosSuite as any).injectNetworkFailure({ parameters: { partition: 'external' } });
      (chaosSuite as any).injectCpuFailure({ parameters: { load: 95 } });

      expect(eventSpies.database).toHaveBeenCalled();
      expect(eventSpies.memory).toHaveBeenCalled();
      expect(eventSpies.network).toHaveBeenCalled();
      expect(eventSpies.cpu).toHaveBeenCalled();
    });
  });

  describe('security behavior checks', () => {
    it('should have default security behavior check implementations', () => {
      // Test crypto failure behavior check
      const cryptoCheck = (chaosSuite as any).checkCryptoFailureBehavior;
      expect(cryptoCheck).toBeDefined();
      expect(typeof cryptoCheck).toBe('function');

      // Test other behavior checks
      const checksToTest = [
        'checkNoPlaintextFallback',
        'checkRLSEnforcementUnderFailure',
        'checkDenyUnknownRequests',
        'checkSensitiveDataZeroization',
        'checkGracefulDegradation',
        'checkLocalValidationEnforcement',
        'checkCachedPoliciesValid',
        'checkRateLimitingActive',
        'checkPriorityQueuing',
      ];

      checksToTest.forEach(checkName => {
        const check = (chaosSuite as any)[checkName];
        expect(check).toBeDefined();
        expect(typeof check).toBe('function');
      });
    });

    it('should execute behavior checks and return results', async () => {
      const mockBehaviorCheck = {
        name: 'test-check',
        check: vi.fn().mockResolvedValue(true),
        expectedResult: true,
        criticality: 'medium' as const,
      };

      const result = await (chaosSuite as any).runSecurityBehaviorCheck(mockBehaviorCheck);

      expect(result).toHaveProperty('name', 'test-check');
      expect(result).toHaveProperty('passed', true);
      expect(result).toHaveProperty('expected', true);
      expect(result).toHaveProperty('actual', true);
      expect(result).toHaveProperty('duration');
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('metrics collection', () => {
    it('should start and collect metrics', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue({} as any);

      (chaosSuite as any).startMetricsCollection();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });
  });

  describe('default experiments', () => {
    it('should have pre-defined security experiments', () => {
      const experiments = (chaosSuite as any).experiments;

      const expectedExperiments = [
        'crypto-service-failure',
        'database-connection-failure',
        'memory-pressure-attack',
        'network-partition-attack',
        'cpu-exhaustion-attack',
      ];

      expectedExperiments.forEach(expName => {
        const experiment = experiments.find((exp: ChaosExperiment) => exp.name === expName);
        expect(experiment).toBeDefined();
        expect(experiment.expectedSecurityBehavior.length).toBeGreaterThan(0);
      });
    });

    it('should have critical security behaviors defined', () => {
      const experiments = (chaosSuite as any).experiments;

      // Check that critical behaviors are present
      const allBehaviors = experiments.flatMap(
        (exp: ChaosExperiment) => exp.expectedSecurityBehavior
      );

      const criticalBehaviors = allBehaviors.filter(
        (behavior: any) => behavior.criticality === 'critical'
      );

      expect(criticalBehaviors.length).toBeGreaterThan(0);

      // Verify specific critical behaviors exist
      const behaviorNames = criticalBehaviors.map((b: any) => b.name);
      expect(behaviorNames).toContain('fail-closed-on-crypto-failure');
      expect(behaviorNames).toContain('no-plaintext-fallback');
    });
  });

  describe('createChaosEngineeringSuite', () => {
    it('should create chaos engineering suite', () => {
      const suite = createChaosEngineeringSuite();
      expect(suite).toBeInstanceOf(ChaosEngineeringSuite);
    });
  });
});
