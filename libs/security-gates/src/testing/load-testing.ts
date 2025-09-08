import { EventEmitter } from 'events';

/**
 * Load testing with security constraint validation
 * Tests system security behavior under various load conditions
 */

export interface LoadTestConfig {
  /** Duration of load test in seconds */
  duration: number;
  /** Number of virtual users */
  virtualUsers: number;
  /** Requests per second target */
  rps: number;
  /** Ramp-up time in seconds */
  rampUpTime: number;
  /** Ramp-down time in seconds */
  rampDownTime: number;
  /** Security constraints to validate */
  securityConstraints: SecurityConstraint[];
}

export interface SecurityConstraint {
  /** Name of the security constraint */
  name: string;
  /** Type of constraint */
  type: 'rate-limit' | 'resource-limit' | 'authentication' | 'authorization' | 'data-integrity';
  /** Constraint parameters */
  parameters: Record<string, any>;
  /** Function to check if constraint is violated */
  validator: (metrics: LoadTestMetrics) => boolean;
  /** Criticality level */
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoadTestScenario {
  /** Name of the load test scenario */
  name: string;
  /** Description */
  description: string;
  /** Target endpoints or functions */
  targets: LoadTestTarget[];
  /** Load configuration */
  config: LoadTestConfig;
}

export interface LoadTestTarget {
  /** Name of the target */
  name: string;
  /** Target function or endpoint */
  target: (payload: any) => Promise<any>;
  /** Payload generator */
  payloadGenerator: () => any;
  /** Expected response validator */
  responseValidator?: (response: any) => boolean;
  /** Security-specific validations */
  securityValidations: SecurityValidation[];
}

export interface SecurityValidation {
  /** Name of validation */
  name: string;
  /** Validation function */
  validate: (request: any, response: any) => boolean;
  /** Expected result */
  expected: boolean;
}

export interface LoadTestMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time */
  averageResponseTime: number;
  /** 95th percentile response time */
  p95ResponseTime: number;
  /** 99th percentile response time */
  p99ResponseTime: number;
  /** Requests per second achieved */
  actualRps: number;
  /** Error rate */
  errorRate: number;
  /** Security constraint violations */
  securityViolations: SecurityViolation[];
  /** Resource usage metrics */
  resourceUsage: ResourceUsage;
}

export interface SecurityViolation {
  /** Constraint that was violated */
  constraintName: string;
  /** Time of violation */
  timestamp: Date;
  /** Details of the violation */
  details: string;
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResourceUsage {
  /** CPU usage percentage */
  cpuUsage: number[];
  /** Memory usage in MB */
  memoryUsage: number[];
  /** Network I/O in bytes */
  networkIO: number[];
  /** Disk I/O in bytes */
  diskIO: number[];
}

export interface LoadTestResult {
  /** Scenario name */
  scenarioName: string;
  /** Whether test passed all security constraints */
  passed: boolean;
  /** Test metrics */
  metrics: LoadTestMetrics;
  /** Duration of the test */
  duration: number;
  /** Security constraint results */
  constraintResults: ConstraintResult[];
}

export interface ConstraintResult {
  /** Constraint name */
  name: string;
  /** Whether constraint was satisfied */
  satisfied: boolean;
  /** Violation count */
  violationCount: number;
  /** Details */
  details: string;
}

export class LoadTestingSuite extends EventEmitter {
  private scenarios: LoadTestScenario[] = [];
  private currentMetrics: LoadTestMetrics = this.initializeMetrics();

  constructor() {
    super();
    this.setupDefaultScenarios();
  }

  /**
   * Add a custom load test scenario
   */
  addScenario(scenario: LoadTestScenario): void {
    this.scenarios.push(scenario);
  }

  /**
   * Run a specific load test scenario
   */
  async runScenario(scenarioName: string): Promise<LoadTestResult> {
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }

    console.log(`Starting load test scenario: ${scenario.name}`);
    this.currentMetrics = this.initializeMetrics();

    const startTime = Date.now();
    const result: LoadTestResult = {
      scenarioName: scenario.name,
      passed: true,
      metrics: this.currentMetrics,
      duration: 0,
      constraintResults: [],
    };

    try {
      // Start resource monitoring
      const resourceMonitor = this.startResourceMonitoring();

      // Execute load test
      await this.executeLoadTest(scenario);

      // Stop resource monitoring
      clearInterval(resourceMonitor);

      // Validate security constraints
      const constraintResults = this.validateSecurityConstraints(
        scenario.config.securityConstraints,
        this.currentMetrics
      );

      result.constraintResults = constraintResults;
      result.passed = constraintResults.every(cr => cr.satisfied);
      result.metrics = { ...this.currentMetrics };
    } catch (error) {
      result.passed = false;
      console.error(`Load test scenario ${scenario.name} failed:`, (error as Error).message);
    } finally {
      result.duration = Date.now() - startTime;
    }

    console.log(
      `Load test scenario ${scenario.name} completed: ${result.passed ? 'PASSED' : 'FAILED'}`
    );
    return result;
  }

  /**
   * Run all load test scenarios
   */
  async runAllScenarios(): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const scenario of this.scenarios) {
      const result = await this.runScenario(scenario.name);
      results.push(result);

      // Brief pause between scenarios
      await this.sleep(10000);
    }

    return results;
  }

  /**
   * Execute the actual load test
   */
  private async executeLoadTest(scenario: LoadTestScenario): Promise<void> {
    const { config } = scenario;
    const { duration, virtualUsers, rps, rampUpTime, rampDownTime } = config;

    // Calculate test phases
    const steadyStateTime = duration - rampUpTime - rampDownTime;

    // Ramp-up phase
    console.log(`Ramp-up phase: ${rampUpTime}s`);
    await this.executePhase(scenario, 'ramp-up', rampUpTime * 1000, virtualUsers * 0.3, rps * 0.3);

    // Steady state phase
    console.log(`Steady state phase: ${steadyStateTime}s`);
    await this.executePhase(scenario, 'steady-state', steadyStateTime * 1000, virtualUsers, rps);

    // Ramp-down phase
    console.log(`Ramp-down phase: ${rampDownTime}s`);
    await this.executePhase(
      scenario,
      'ramp-down',
      rampDownTime * 1000,
      virtualUsers * 0.1,
      rps * 0.1
    );
  }

  /**
   * Execute a specific phase of the load test
   */
  private async executePhase(
    scenario: LoadTestScenario,
    _phase: string,
    duration: number,
    targetUsers: number,
    targetRps: number
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const requestInterval = 1000 / targetRps; // Time between requests in ms

    const activeUsers: Promise<void>[] = [];

    while (Date.now() < endTime) {
      // Maintain target number of virtual users
      while (activeUsers.length < targetUsers) {
        const userPromise = this.simulateUser(scenario);
        activeUsers.push(userPromise);

        // Remove completed user simulations
        userPromise.finally(() => {
          const index = activeUsers.indexOf(userPromise);
          if (index > -1) {
            activeUsers.splice(index, 1);
          }
        });
      }

      // Wait for next request interval
      await this.sleep(requestInterval);
    }

    // Wait for remaining users to complete
    await Promise.all(activeUsers);
  }

  /**
   * Simulate a virtual user making requests
   */
  private async simulateUser(scenario: LoadTestScenario): Promise<void> {
    const target = scenario.targets[Math.floor(Math.random() * scenario.targets.length)];

    try {
      const payload = target.payloadGenerator();
      const requestStart = Date.now();

      const response = await target.target(payload);

      const responseTime = Date.now() - requestStart;

      // Update metrics
      this.updateMetrics(responseTime, true);

      // Validate response
      if (target.responseValidator && !target.responseValidator(response)) {
        this.currentMetrics.failedRequests++;
        this.currentMetrics.successfulRequests--;
      }

      // Run security validations
      for (const validation of target.securityValidations) {
        const validationResult = validation.validate(payload, response);
        if (validationResult !== validation.expected) {
          this.recordSecurityViolation({
            constraintName: validation.name,
            timestamp: new Date(),
            details: `Security validation failed for ${target.name}`,
            severity: 'high',
          });
        }
      }
    } catch (error) {
      this.updateMetrics(0, false);
      console.error(`Request failed for ${target.name}:`, (error as Error).message);
    }
  }

  /**
   * Setup default security-focused load test scenarios
   */
  private setupDefaultScenarios(): void {
    this.scenarios = [
      {
        name: 'crypto-operations-load',
        description: 'Tests crypto operations under load',
        targets: [
          {
            name: 'encrypt-data',
            target: this.mockCryptoEncrypt,
            payloadGenerator: () => ({
              data: 'sensitive-data-' + Math.random(),
              userId: 'user-' + Math.floor(Math.random() * 1000),
            }),
            responseValidator: response => response && response.encrypted === true,
            securityValidations: [
              {
                name: 'no-plaintext-in-response',
                validate: (req, res) => !JSON.stringify(res).includes(req.data),
                expected: true,
              },
              {
                name: 'valid-crypto-envelope',
                validate: (_req, res) => res && res.envelope && res.envelope.version,
                expected: true,
              },
            ],
          },
        ],
        config: {
          duration: 60,
          virtualUsers: 50,
          rps: 100,
          rampUpTime: 10,
          rampDownTime: 10,
          securityConstraints: [
            {
              name: 'crypto-response-time',
              type: 'resource-limit',
              parameters: { maxResponseTime: 500 },
              validator: metrics => metrics.p95ResponseTime < 500,
              criticality: 'high',
            },
            {
              name: 'crypto-error-rate',
              type: 'resource-limit',
              parameters: { maxErrorRate: 0.01 },
              validator: metrics => metrics.errorRate < 0.01,
              criticality: 'critical',
            },
          ],
        },
      },
      {
        name: 'authentication-load',
        description: 'Tests authentication under heavy load',
        targets: [
          {
            name: 'authenticate-user',
            target: this.mockUserAuthentication,
            payloadGenerator: () => ({
              token: 'valid-token-' + Math.random(),
              userId: 'user-' + Math.floor(Math.random() * 100),
            }),
            responseValidator: response => response && typeof response.authenticated === 'boolean',
            securityValidations: [
              {
                name: 'rate-limiting-enforced',
                validate: (_req, res) => res.rateLimited !== undefined,
                expected: true,
              },
              {
                name: 'session-validation',
                validate: (_req, res) => res.sessionValid !== undefined,
                expected: true,
              },
            ],
          },
        ],
        config: {
          duration: 90,
          virtualUsers: 100,
          rps: 200,
          rampUpTime: 15,
          rampDownTime: 15,
          securityConstraints: [
            {
              name: 'rate-limiting-active',
              type: 'rate-limit',
              parameters: { maxRps: 250 },
              validator: metrics => metrics.actualRps <= 250,
              criticality: 'critical',
            },
            {
              name: 'auth-response-time',
              type: 'resource-limit',
              parameters: { maxResponseTime: 200 },
              validator: metrics => metrics.p95ResponseTime < 200,
              criticality: 'medium',
            },
          ],
        },
      },
      {
        name: 'database-rls-load',
        description: 'Tests RLS enforcement under database load',
        targets: [
          {
            name: 'query-user-data',
            target: this.mockDatabaseQuery,
            payloadGenerator: () => ({
              userId: 'user-' + Math.floor(Math.random() * 50),
              requestedUserId: 'user-' + Math.floor(Math.random() * 50),
              query: 'SELECT * FROM encrypted_cycle_data',
            }),
            responseValidator: response => response && Array.isArray(response.data),
            securityValidations: [
              {
                name: 'rls-enforced',
                validate: (req, res) => {
                  if (req.userId !== req.requestedUserId) {
                    return res.data.length === 0; // Should return no data for other users
                  }
                  return true;
                },
                expected: true,
              },
              {
                name: 'query-parameterized',
                validate: (_req, res) => !res.rawQuery || !res.rawQuery.includes("'"),
                expected: true,
              },
            ],
          },
        ],
        config: {
          duration: 120,
          virtualUsers: 80,
          rps: 150,
          rampUpTime: 20,
          rampDownTime: 20,
          securityConstraints: [
            {
              name: 'rls-violation-rate',
              type: 'data-integrity',
              parameters: { maxViolationRate: 0 },
              validator: metrics =>
                metrics.securityViolations.filter(v => v.constraintName.includes('rls')).length ===
                0,
              criticality: 'critical',
            },
            {
              name: 'db-response-time',
              type: 'resource-limit',
              parameters: { maxResponseTime: 1000 },
              validator: metrics => metrics.p99ResponseTime < 1000,
              criticality: 'high',
            },
          ],
        },
      },
    ];
  }

  /**
   * Mock target functions
   */
  private mockCryptoEncrypt = async (_payload: any): Promise<any> => {
    await this.sleep(Math.random() * 100); // Simulate crypto processing time
    return {
      encrypted: true,
      envelope: {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        keyId: 'key-123',
      },
    };
  };

  private mockUserAuthentication = async (payload: any): Promise<any> => {
    await this.sleep(Math.random() * 50); // Simulate auth processing time

    // Simulate rate limiting
    const isRateLimited = Math.random() < 0.05; // 5% chance of rate limiting

    return {
      authenticated: !isRateLimited && payload.token.startsWith('valid-token'),
      rateLimited: isRateLimited,
      sessionValid: payload.token.startsWith('valid-token'),
    };
  };

  private mockDatabaseQuery = async (payload: any): Promise<any> => {
    await this.sleep(Math.random() * 200); // Simulate DB query time

    // Simulate RLS enforcement
    const canAccessData = payload.userId === payload.requestedUserId;

    return {
      data: canAccessData ? [{ id: 1, userId: payload.userId }] : [],
      rawQuery: payload.query, // For security validation
    };
  };

  /**
   * Utility methods
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    this.currentMetrics.totalRequests++;

    if (success) {
      this.currentMetrics.successfulRequests++;
    } else {
      this.currentMetrics.failedRequests++;
    }

    // Update response times (simplified calculation)
    const currentAvg = this.currentMetrics.averageResponseTime;
    const totalRequests = this.currentMetrics.totalRequests;
    this.currentMetrics.averageResponseTime =
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;

    // Update error rate
    this.currentMetrics.errorRate =
      this.currentMetrics.failedRequests / this.currentMetrics.totalRequests;
  }

  private recordSecurityViolation(violation: SecurityViolation): void {
    this.currentMetrics.securityViolations.push(violation);
    this.emit('security-violation', violation);
  }

  private validateSecurityConstraints(
    constraints: SecurityConstraint[],
    metrics: LoadTestMetrics
  ): ConstraintResult[] {
    return constraints.map(constraint => {
      const satisfied = constraint.validator(metrics);
      const violationCount = satisfied ? 0 : 1;

      return {
        name: constraint.name,
        satisfied,
        violationCount,
        details: satisfied ? 'Constraint satisfied' : 'Constraint violated',
      };
    });
  }

  private startResourceMonitoring(): NodeJS.Timeout {
    return setInterval(() => {
      const memUsage = process.memoryUsage();
      this.currentMetrics.resourceUsage.memoryUsage.push(memUsage.heapUsed / 1024 / 1024);
      this.currentMetrics.resourceUsage.cpuUsage.push(Math.random() * 100); // Mock CPU usage
      this.currentMetrics.resourceUsage.networkIO.push(Math.random() * 1000); // Mock network I/O
      this.currentMetrics.resourceUsage.diskIO.push(Math.random() * 500); // Mock disk I/O
    }, 1000);
  }

  private initializeMetrics(): LoadTestMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      actualRps: 0,
      errorRate: 0,
      securityViolations: [],
      resourceUsage: {
        cpuUsage: [],
        memoryUsage: [],
        networkIO: [],
        diskIO: [],
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create load testing suite with security constraints
 */
export function createLoadTester(): LoadTestingSuite {
  return new LoadTestingSuite();
}
