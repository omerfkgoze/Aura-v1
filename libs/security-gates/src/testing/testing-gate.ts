import { SecurityGate, SecurityGateResult } from '../core/security-gate.interface';
import { PropertyTestingSuite, createSecurityPropertyTester } from './property-testing';
import { FuzzTestingSuite, createFuzzTester } from './fuzz-testing';
import { ChaosEngineeringSuite, createChaosEngineeringSuite } from './chaos-engineering';
import { LoadTestingSuite, createLoadTester } from './load-testing';

/**
 * Main testing validation gate that orchestrates all advanced testing frameworks
 * Ensures comprehensive security testing before deployment
 */

export interface TestingGateConfig {
  /** Enable property-based testing */
  enablePropertyTesting: boolean;
  /** Enable fuzz testing */
  enableFuzzTesting: boolean;
  /** Enable chaos engineering */
  enableChaosEngineering: boolean;
  /** Enable load testing */
  enableLoadTesting: boolean;
  /** Maximum total testing time in minutes */
  maxTestingTime: number;
  /** Parallel execution of test suites */
  parallelExecution: boolean;
  /** Fail fast on first critical failure */
  failFast: boolean;
  /** Test result output directory */
  outputDirectory: string;
}

export interface TestingSuiteResult {
  /** Name of the test suite */
  suiteName: string;
  /** Whether the suite passed */
  passed: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Number of tests executed */
  testsExecuted: number;
  /** Number of tests failed */
  testsFailed: number;
  /** Critical issues found */
  criticalIssues: string[];
  /** Detailed results */
  details: any;
}

export class TestingGate implements SecurityGate {
  name = 'Testing Gate';
  description = 'Comprehensive security testing framework';
  version = '1.0.0';

  private readonly config: TestingGateConfig;
  private readonly propertyTester: PropertyTestingSuite;
  private readonly fuzzTester: FuzzTestingSuite;
  private readonly chaosTester: ChaosEngineeringSuite;
  private readonly loadTester: LoadTestingSuite;

  constructor(config: Partial<TestingGateConfig> = {}) {
    this.config = {
      enablePropertyTesting: true,
      enableFuzzTesting: true,
      enableChaosEngineering: true,
      enableLoadTesting: true,
      maxTestingTime: 30, // 30 minutes default
      parallelExecution: true,
      failFast: true,
      outputDirectory: './testing-results',
      ...config,
    };

    this.propertyTester = createSecurityPropertyTester({
      runs: 500, // Reduced for faster execution
      timeout: 3000,
    });

    this.fuzzTester = createFuzzTester({
      duration: 120, // 2 minutes
      parallelism: 2,
    });

    this.chaosTester = createChaosEngineeringSuite();

    this.loadTester = createLoadTester();
  }

  /**
   * Execute all enabled testing frameworks
   */
  async execute(_input?: unknown): Promise<SecurityGateResult> {
    console.log('🧪 Starting comprehensive security testing gate...');

    const startTime = Date.now();
    const maxTestingTimeMs = this.config.maxTestingTime * 60 * 1000;

    const result: SecurityGateResult = {
      valid: true,
      passed: true,
      errors: [],
      warnings: [],
      executionTime: 0,
      details: `Testing gate execution with config: ${JSON.stringify(this.config)}`,
      metadata: {
        config: this.config,
        suiteResults: [] as TestingSuiteResult[],
        totalDuration: 0,
        criticalIssuesFound: [] as string[],
      },
    };

    try {
      const testingSuites = this.getEnabledTestingSuites();

      if (this.config.parallelExecution) {
        await this.runTestingSuitesInParallel(testingSuites, result, maxTestingTimeMs);
      } else {
        await this.runTestingSuitesSequentially(testingSuites, result, maxTestingTimeMs);
      }

      // Aggregate results
      const metadata = result.metadata as any;
      const allPassed = metadata.suiteResults.every((sr: TestingSuiteResult) => sr.passed);
      const hasCriticalIssues = metadata.criticalIssuesFound.length > 0;

      result.valid = allPassed && !hasCriticalIssues;
      result.passed = allPassed && !hasCriticalIssues;
      metadata.totalDuration = Date.now() - startTime;
      result.executionTime = Date.now() - startTime;
      result.errors = hasCriticalIssues ? metadata.criticalIssuesFound : [];

      if (result.passed) {
        console.log('✅ All security testing suites passed');
      } else {
        console.error('❌ Security testing gate failed');
        if (hasCriticalIssues) {
          console.error('Critical issues found:', metadata.criticalIssuesFound);
        }
      }
    } catch (error) {
      result.valid = false;
      result.passed = false;
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
      result.executionTime = Date.now() - startTime;
      (result.metadata as any).error = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        'Security testing gate encountered an error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return result;
  }

  /**
   * Validate method for backward compatibility with tests
   */
  async validate(): Promise<any> {
    const result = await this.execute();
    return {
      gateName: this.name,
      passed: result.passed,
      timestamp: new Date(),
      details: result.metadata || {},
      executionTime: result.executionTime,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Get gate configuration
   */
  getConfig(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * Validate gate configuration
   */
  validateConfig(config: Record<string, unknown>): SecurityGateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof config['maxTestingTime'] !== 'number' || config['maxTestingTime'] <= 0) {
      errors.push('maxTestingTime must be a positive number');
    }

    if (typeof config['outputDirectory'] !== 'string' || !config['outputDirectory'].trim()) {
      warnings.push('outputDirectory should be a non-empty string');
    }

    return {
      valid: errors.length === 0,
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get list of enabled testing suites
   */
  private getEnabledTestingSuites(): Array<{
    name: string;
    runner: () => Promise<TestingSuiteResult>;
  }> {
    const suites = [];

    if (this.config.enablePropertyTesting) {
      suites.push({
        name: 'PropertyTesting',
        runner: () => this.runPropertyTesting(),
      });
    }

    if (this.config.enableFuzzTesting) {
      suites.push({
        name: 'FuzzTesting',
        runner: () => this.runFuzzTesting(),
      });
    }

    if (this.config.enableChaosEngineering) {
      suites.push({
        name: 'ChaosEngineering',
        runner: () => this.runChaosEngineering(),
      });
    }

    if (this.config.enableLoadTesting) {
      suites.push({
        name: 'LoadTesting',
        runner: () => this.runLoadTesting(),
      });
    }

    return suites;
  }

  /**
   * Run testing suites in parallel
   */
  private async runTestingSuitesInParallel(
    suites: Array<{ name: string; runner: () => Promise<TestingSuiteResult> }>,
    result: SecurityGateResult,
    maxTimeMs: number
  ): Promise<void> {
    console.log(`Running ${suites.length} testing suites in parallel...`);

    const suitePromises = suites.map(suite =>
      this.runSuiteWithTimeout(suite.runner(), suite.name, maxTimeMs / suites.length)
    );

    const suiteResults = await Promise.allSettled(suitePromises);

    suiteResults.forEach((suiteResult, index) => {
      const suiteName = suites[index].name;

      if (suiteResult.status === 'fulfilled') {
        (result.metadata as any).suiteResults.push(suiteResult.value);
        this.processSuiteResult(suiteResult.value, result);
      } else {
        const errorMessage =
          suiteResult.reason instanceof Error ? suiteResult.reason.message : 'Unknown error';
        const failedResult: TestingSuiteResult = {
          suiteName,
          passed: false,
          duration: 0,
          testsExecuted: 0,
          testsFailed: 1,
          criticalIssues: [`Suite failed: ${errorMessage}`],
          details: { error: errorMessage },
        };
        (result.metadata as any).suiteResults.push(failedResult);
        this.processSuiteResult(failedResult, result);
      }

      if (this.config.failFast && !result.passed) {
        console.log('Fail-fast enabled, stopping remaining tests');
        return;
      }
    });
  }

  /**
   * Run testing suites sequentially
   */
  private async runTestingSuitesSequentially(
    suites: Array<{ name: string; runner: () => Promise<TestingSuiteResult> }>,
    result: SecurityGateResult,
    maxTimeMs: number
  ): Promise<void> {
    console.log(`Running ${suites.length} testing suites sequentially...`);

    const timePerSuite = maxTimeMs / suites.length;

    for (const suite of suites) {
      try {
        const suiteResult = await this.runSuiteWithTimeout(
          suite.runner(),
          suite.name,
          timePerSuite
        );

        (result.metadata as any).suiteResults.push(suiteResult);
        this.processSuiteResult(suiteResult, result);

        if (this.config.failFast && !suiteResult.passed) {
          console.log('Fail-fast enabled, stopping remaining tests');
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const failedResult: TestingSuiteResult = {
          suiteName: suite.name,
          passed: false,
          duration: 0,
          testsExecuted: 0,
          testsFailed: 1,
          criticalIssues: [`Suite failed: ${errorMessage}`],
          details: { error: errorMessage },
        };
        (result.metadata as any).suiteResults.push(failedResult);
        this.processSuiteResult(failedResult, result);
        break;
      }
    }
  }

  /**
   * Run a suite with timeout
   */
  private async runSuiteWithTimeout<T>(
    promise: Promise<T>,
    suiteName: string,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${suiteName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * Process individual suite result
   */
  private processSuiteResult(suiteResult: TestingSuiteResult, result: SecurityGateResult): void {
    if (!suiteResult.passed) {
      result.passed = false;
    }

    // Add critical issues to overall result
    (result.metadata as any).criticalIssuesFound.push(...suiteResult.criticalIssues);

    console.log(
      `${suiteResult.passed ? '✅' : '❌'} ${suiteResult.suiteName}: ` +
        `${suiteResult.testsExecuted} tests, ${suiteResult.testsFailed} failed, ` +
        `${suiteResult.duration}ms duration`
    );
  }

  /**
   * Run property-based testing suite
   */
  private async runPropertyTesting(): Promise<TestingSuiteResult> {
    const startTime = Date.now();
    let testsExecuted = 0;
    let testsFailed = 0;
    const criticalIssues: string[] = [];

    try {
      console.log('Running property-based tests...');

      // Run all property test categories
      const testCategories = [
        { name: 'Crypto Envelope Tests', tests: this.propertyTester.createCryptoEnvelopeTests() },
        { name: 'PII Detection Tests', tests: this.propertyTester.createPIIDetectionTests() },
        { name: 'Network Security Tests', tests: this.propertyTester.createNetworkSecurityTests() },
        { name: 'RLS Policy Tests', tests: this.propertyTester.createRLSPolicyTests() },
      ];

      for (const category of testCategories) {
        console.log(`Running ${category.name}...`);

        for (const test of category.tests) {
          testsExecuted++;
          try {
            await this.propertyTester.testSecurityProperty(test);
          } catch (error) {
            testsFailed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            criticalIssues.push(`Property test failed: ${test.name} - ${errorMessage}`);
          }
        }
      }

      return {
        suiteName: 'PropertyTesting',
        passed: testsFailed === 0,
        duration: Date.now() - startTime,
        testsExecuted,
        testsFailed,
        criticalIssues,
        details: {
          categoriesRun: testCategories.length,
          totalProperties: testsExecuted,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        suiteName: 'PropertyTesting',
        passed: false,
        duration: Date.now() - startTime,
        testsExecuted,
        testsFailed: testsExecuted,
        criticalIssues: [`Property testing suite failed: ${errorMessage}`],
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Run fuzz testing suite
   */
  private async runFuzzTesting(): Promise<TestingSuiteResult> {
    const startTime = Date.now();
    const criticalIssues: string[] = [];

    try {
      console.log('Running fuzz tests...');

      await this.fuzzTester.runAllFuzzTests();

      return {
        suiteName: 'FuzzTesting',
        passed: true,
        duration: Date.now() - startTime,
        testsExecuted: 4, // Number of fuzz targets
        testsFailed: 0,
        criticalIssues,
        details: {
          targetsRun: [
            'crypto-envelope-validation',
            'pii-detection',
            'network-packet-analysis',
            'rls-policy-evaluation',
          ],
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      criticalIssues.push(`Fuzz testing failed: ${errorMessage}`);

      return {
        suiteName: 'FuzzTesting',
        passed: false,
        duration: Date.now() - startTime,
        testsExecuted: 4,
        testsFailed: 1,
        criticalIssues,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Run chaos engineering suite
   */
  private async runChaosEngineering(): Promise<TestingSuiteResult> {
    const startTime = Date.now();
    const criticalIssues: string[] = [];

    try {
      console.log('Running chaos engineering experiments...');

      const results = await this.chaosTester.runAllExperiments();
      const failedExperiments = results.filter(r => !r.success);

      failedExperiments.forEach(exp => {
        criticalIssues.push(`Chaos experiment failed: ${exp.name}`);
        exp.failures.forEach(failure => criticalIssues.push(failure));
      });

      return {
        suiteName: 'ChaosEngineering',
        passed: failedExperiments.length === 0,
        duration: Date.now() - startTime,
        testsExecuted: results.length,
        testsFailed: failedExperiments.length,
        criticalIssues,
        details: {
          experiments: results.map(r => ({
            name: r.name,
            success: r.success,
            duration: r.duration,
            behaviorChecksPassed: r.behaviorResults.filter(br => br.passed).length,
            behaviorChecksTotal: r.behaviorResults.length,
          })),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      criticalIssues.push(`Chaos engineering failed: ${errorMessage}`);

      return {
        suiteName: 'ChaosEngineering',
        passed: false,
        duration: Date.now() - startTime,
        testsExecuted: 0,
        testsFailed: 1,
        criticalIssues,
        details: { error: errorMessage },
      };
    }
  }

  /**
   * Run load testing suite
   */
  private async runLoadTesting(): Promise<TestingSuiteResult> {
    const startTime = Date.now();
    const criticalIssues: string[] = [];

    try {
      console.log('Running load tests with security constraints...');

      const results = await this.loadTester.runAllScenarios();
      const failedScenarios = results.filter(r => !r.passed);

      failedScenarios.forEach(scenario => {
        criticalIssues.push(`Load test scenario failed: ${scenario.scenarioName}`);
        scenario.constraintResults.forEach(cr => {
          if (!cr.satisfied) {
            criticalIssues.push(`Security constraint violated: ${cr.name} - ${cr.details}`);
          }
        });
      });

      return {
        suiteName: 'LoadTesting',
        passed: failedScenarios.length === 0,
        duration: Date.now() - startTime,
        testsExecuted: results.length,
        testsFailed: failedScenarios.length,
        criticalIssues,
        details: {
          scenarios: results.map(r => ({
            name: r.scenarioName,
            passed: r.passed,
            duration: r.duration,
            totalRequests: r.metrics.totalRequests,
            errorRate: r.metrics.errorRate,
            averageResponseTime: r.metrics.averageResponseTime,
            securityViolations: r.metrics.securityViolations.length,
          })),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      criticalIssues.push(`Load testing failed: ${errorMessage}`);

      return {
        suiteName: 'LoadTesting',
        passed: false,
        duration: Date.now() - startTime,
        testsExecuted: 0,
        testsFailed: 1,
        criticalIssues,
        details: { error: errorMessage },
      };
    }
  }
}

/**
 * Create testing gate with default configuration
 */
export function createTestingGate(config?: Partial<TestingGateConfig>): TestingGate {
  return new TestingGate(config);
}

/**
 * Default testing gate configuration for CI/CD
 */
export const DEFAULT_TESTING_GATE_CONFIG: TestingGateConfig = {
  enablePropertyTesting: true,
  enableFuzzTesting: true,
  enableChaosEngineering: true,
  enableLoadTesting: true,
  maxTestingTime: 30,
  parallelExecution: true,
  failFast: true,
  outputDirectory: './testing-results',
};
