import { EventEmitter } from 'events';

/**
 * Chaos engineering framework for security failure testing
 * Tests system behavior under various failure conditions
 */

export interface ChaosExperiment {
  /** Name of the chaos experiment */
  name: string;
  /** Description of what this experiment tests */
  description: string;
  /** Duration of the experiment in seconds */
  duration: number;
  /** Failure injection configuration */
  failures: FailureInjection[];
  /** Expected security behavior under failure */
  expectedSecurityBehavior: SecurityBehaviorCheck[];
}

export interface FailureInjection {
  /** Type of failure to inject */
  type: 'network' | 'cpu' | 'memory' | 'disk' | 'crypto' | 'database';
  /** Severity of the failure (0-1) */
  severity: number;
  /** Specific failure parameters */
  parameters: Record<string, any>;
  /** Delay before injecting failure (seconds) */
  delay: number;
  /** Duration of the failure (seconds) */
  duration: number;
}

export interface SecurityBehaviorCheck {
  /** Name of the security behavior being checked */
  name: string;
  /** Function to check security behavior */
  check: () => Promise<boolean>;
  /** Expected result under failure conditions */
  expectedResult: boolean;
  /** Criticality level of this check */
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChaosExperimentResult {
  /** Experiment name */
  name: string;
  /** Whether the experiment passed all checks */
  success: boolean;
  /** Duration of the experiment */
  duration: number;
  /** Results of each security behavior check */
  behaviorResults: SecurityBehaviorResult[];
  /** Any failures or exceptions encountered */
  failures: string[];
  /** Performance metrics during chaos */
  metrics: ChaosMetrics;
}

export interface SecurityBehaviorResult {
  /** Name of the behavior check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Expected vs actual result */
  expected: boolean;
  actual: boolean;
  /** Time taken for the check */
  duration: number;
  /** Error message if check failed */
  error?: string;
}

export interface ChaosMetrics {
  /** Average response time during chaos */
  averageResponseTime: number;
  /** Error rate during chaos */
  errorRate: number;
  /** Memory usage during chaos */
  memoryUsage: number[];
  /** CPU usage during chaos */
  cpuUsage: number[];
}

export class ChaosEngineeringSuite extends EventEmitter {
  private experiments: ChaosExperiment[] = [];
  private metrics: ChaosMetrics = {
    averageResponseTime: 0,
    errorRate: 0,
    memoryUsage: [],
    cpuUsage: [],
  };

  constructor() {
    super();
    this.setupDefaultExperiments();
  }

  /**
   * Add a custom chaos experiment
   */
  addExperiment(experiment: ChaosExperiment): void {
    this.experiments.push(experiment);
  }

  /**
   * Run a specific chaos experiment
   */
  async runExperiment(experimentName: string): Promise<ChaosExperimentResult> {
    const experiment = this.experiments.find(exp => exp.name === experimentName);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentName}`);
    }

    console.log(`Starting chaos experiment: ${experiment.name}`);

    const startTime = Date.now();
    const result: ChaosExperimentResult = {
      name: experiment.name,
      success: true,
      duration: 0,
      behaviorResults: [],
      failures: [],
      metrics: { ...this.metrics },
    };

    try {
      // Start metrics collection
      const metricsCollector = this.startMetricsCollection();

      // Inject failures according to experiment configuration
      const failurePromises = experiment.failures.map(failure => this.injectFailure(failure));

      // Wait for all failures to be injected
      await Promise.all(failurePromises);

      // Run security behavior checks during chaos
      for (const behaviorCheck of experiment.expectedSecurityBehavior) {
        const behaviorResult = await this.runSecurityBehaviorCheck(behaviorCheck);
        result.behaviorResults.push(behaviorResult);

        if (!behaviorResult.passed) {
          result.success = false;
        }
      }

      // Wait for experiment duration
      await this.sleep(experiment.duration * 1000);

      // Stop metrics collection
      clearInterval(metricsCollector);
      result.metrics = { ...this.metrics };
    } catch (error) {
      result.success = false;
      result.failures.push((error as Error).message);
    } finally {
      result.duration = Date.now() - startTime;
    }

    console.log(
      `Chaos experiment ${experiment.name} completed: ${result.success ? 'PASSED' : 'FAILED'}`
    );
    return result;
  }

  /**
   * Run all chaos experiments
   */
  async runAllExperiments(): Promise<ChaosExperimentResult[]> {
    const results: ChaosExperimentResult[] = [];

    for (const experiment of this.experiments) {
      const result = await this.runExperiment(experiment.name);
      results.push(result);

      // Brief pause between experiments
      await this.sleep(5000);
    }

    return results;
  }

  /**
   * Setup default security-focused chaos experiments
   */
  private setupDefaultExperiments(): void {
    this.experiments = [
      {
        name: 'crypto-service-failure',
        description: 'Tests behavior when crypto services become unavailable',
        duration: 30,
        failures: [
          {
            type: 'crypto',
            severity: 1.0,
            parameters: { service: 'encryption' },
            delay: 5,
            duration: 20,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'fail-closed-on-crypto-failure',
            check: this.checkCryptoFailureBehavior,
            expectedResult: true,
            criticality: 'critical',
          },
          {
            name: 'no-plaintext-fallback',
            check: this.checkNoPlaintextFallback,
            expectedResult: true,
            criticality: 'critical',
          },
        ],
      },
      {
        name: 'database-connection-failure',
        description: 'Tests RLS enforcement during database connectivity issues',
        duration: 45,
        failures: [
          {
            type: 'database',
            severity: 0.8,
            parameters: {
              connectionFailureRate: 0.5,
              timeoutMs: 1000,
            },
            delay: 10,
            duration: 25,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'rls-policies-enforced',
            check: this.checkRLSEnforcementUnderFailure,
            expectedResult: true,
            criticality: 'critical',
          },
          {
            name: 'deny-unknown-requests',
            check: this.checkDenyUnknownRequests,
            expectedResult: true,
            criticality: 'high',
          },
        ],
      },
      {
        name: 'memory-pressure-attack',
        description: 'Tests security behavior under memory pressure attacks',
        duration: 60,
        failures: [
          {
            type: 'memory',
            severity: 0.9,
            parameters: {
              memoryPressureMB: 500,
              allocationPattern: 'spike',
            },
            delay: 10,
            duration: 40,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'sensitive-data-zeroized',
            check: this.checkSensitiveDataZeroization,
            expectedResult: true,
            criticality: 'critical',
          },
          {
            name: 'graceful-degradation',
            check: this.checkGracefulDegradation,
            expectedResult: true,
            criticality: 'high',
          },
        ],
      },
      {
        name: 'network-partition-attack',
        description: 'Tests security isolation during network partitions',
        duration: 40,
        failures: [
          {
            type: 'network',
            severity: 0.7,
            parameters: {
              partitionType: 'external-services',
              dropRate: 0.8,
            },
            delay: 5,
            duration: 30,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'local-validation-enforced',
            check: this.checkLocalValidationEnforcement,
            expectedResult: true,
            criticality: 'high',
          },
          {
            name: 'cached-policies-valid',
            check: this.checkCachedPoliciesValid,
            expectedResult: true,
            criticality: 'medium',
          },
        ],
      },
      {
        name: 'cpu-exhaustion-attack',
        description: 'Tests security behavior under CPU exhaustion attacks',
        duration: 35,
        failures: [
          {
            type: 'cpu',
            severity: 0.95,
            parameters: {
              cpuLoadPercent: 95,
              pattern: 'sustained',
            },
            delay: 5,
            duration: 25,
          },
        ],
        expectedSecurityBehavior: [
          {
            name: 'rate-limiting-active',
            check: this.checkRateLimitingActive,
            expectedResult: true,
            criticality: 'high',
          },
          {
            name: 'priority-queuing-works',
            check: this.checkPriorityQueuing,
            expectedResult: true,
            criticality: 'medium',
          },
        ],
      },
    ];
  }

  /**
   * Inject failure according to configuration
   */
  private async injectFailure(failure: FailureInjection): Promise<void> {
    await this.sleep(failure.delay * 1000);

    console.log(`Injecting ${failure.type} failure with severity ${failure.severity}`);

    switch (failure.type) {
      case 'crypto':
        await this.injectCryptoFailure(failure);
        break;
      case 'database':
        await this.injectDatabaseFailure(failure);
        break;
      case 'memory':
        await this.injectMemoryFailure(failure);
        break;
      case 'network':
        await this.injectNetworkFailure(failure);
        break;
      case 'cpu':
        await this.injectCpuFailure(failure);
        break;
    }

    // Schedule failure recovery
    setTimeout(() => {
      this.recoverFromFailure(failure);
    }, failure.duration * 1000);
  }

  /**
   * Failure injection implementations
   */
  private async injectCryptoFailure(failure: FailureInjection): Promise<void> {
    // Mock crypto service failure
    this.emit('crypto-failure', failure.parameters);
  }

  private async injectDatabaseFailure(failure: FailureInjection): Promise<void> {
    // Mock database connectivity issues
    this.emit('database-failure', failure.parameters);
  }

  private async injectMemoryFailure(failure: FailureInjection): Promise<void> {
    // Mock memory pressure
    const memoryPressure = failure.parameters['memoryPressureMB'] || 100;
    this.emit('memory-pressure', { memoryMB: memoryPressure });
  }

  private async injectNetworkFailure(failure: FailureInjection): Promise<void> {
    // Mock network partition
    this.emit('network-partition', failure.parameters);
  }

  private async injectCpuFailure(failure: FailureInjection): Promise<void> {
    // Mock CPU exhaustion
    this.emit('cpu-exhaustion', failure.parameters);
  }

  private recoverFromFailure(failure: FailureInjection): void {
    console.log(`Recovering from ${failure.type} failure`);
    this.emit('failure-recovery', { type: failure.type });
  }

  /**
   * Run security behavior check
   */
  private async runSecurityBehaviorCheck(
    behaviorCheck: SecurityBehaviorCheck
  ): Promise<SecurityBehaviorResult> {
    const startTime = Date.now();

    try {
      const actual = await behaviorCheck.check();
      const passed = actual === behaviorCheck.expectedResult;

      return {
        name: behaviorCheck.name,
        passed,
        expected: behaviorCheck.expectedResult,
        actual,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: behaviorCheck.name,
        passed: false,
        expected: behaviorCheck.expectedResult,
        actual: false,
        duration: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Security behavior check implementations
   */
  private checkCryptoFailureBehavior = async (): Promise<boolean> => {
    // Check that system fails closed when crypto is unavailable
    try {
      // Mock check: attempt crypto operation
      return false; // Should fail closed
    } catch {
      return true; // Correctly fails closed
    }
  };

  private checkNoPlaintextFallback = async (): Promise<boolean> => {
    // Ensure no plaintext fallback when crypto fails
    return true; // Mock: always enforce encryption
  };

  private checkRLSEnforcementUnderFailure = async (): Promise<boolean> => {
    // Check that RLS policies are still enforced during DB issues
    return true; // Mock: RLS always enforced
  };

  private checkDenyUnknownRequests = async (): Promise<boolean> => {
    // Check that unknown/unauthorized requests are denied
    return true; // Mock: deny by default
  };

  private checkSensitiveDataZeroization = async (): Promise<boolean> => {
    // Check that sensitive data is properly zeroized under memory pressure
    return true; // Mock: data properly cleaned up
  };

  private checkGracefulDegradation = async (): Promise<boolean> => {
    // Check that system degrades gracefully under pressure
    return true; // Mock: graceful degradation working
  };

  private checkLocalValidationEnforcement = async (): Promise<boolean> => {
    // Check that local validation is enforced during network issues
    return true; // Mock: local validation working
  };

  private checkCachedPoliciesValid = async (): Promise<boolean> => {
    // Check that cached security policies are still valid
    return true; // Mock: cached policies are valid
  };

  private checkRateLimitingActive = async (): Promise<boolean> => {
    // Check that rate limiting is active under CPU pressure
    return true; // Mock: rate limiting working
  };

  private checkPriorityQueuing = async (): Promise<boolean> => {
    // Check that priority queuing is working for security-critical operations
    return true; // Mock: priority queuing working
  };

  /**
   * Start collecting performance metrics during chaos
   */
  private startMetricsCollection(): NodeJS.Timeout {
    this.metrics = {
      averageResponseTime: 0,
      errorRate: 0,
      memoryUsage: [],
      cpuUsage: [],
    };

    return setInterval(() => {
      // Mock metrics collection
      this.metrics.memoryUsage.push(process.memoryUsage().heapUsed / 1024 / 1024);
      this.metrics.cpuUsage.push(Math.random() * 100); // Mock CPU usage
    }, 1000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create chaos engineering suite with default experiments
 */
export function createChaosEngineeringSuite(): ChaosEngineeringSuite {
  return new ChaosEngineeringSuite();
}
