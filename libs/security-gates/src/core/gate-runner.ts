import { SecurityGate, SecurityGateResult, GateExecutionContext } from './security-gate.interface';

export interface GateRunnerConfig {
  failFast?: boolean;
  parallel?: boolean;
  timeout?: number;
  retries?: number;
  environment?: 'development' | 'staging' | 'production';
}

export class GateRunner {
  private gates: Map<string, SecurityGate> = new Map();
  private config: GateRunnerConfig;

  constructor(config: GateRunnerConfig = {}) {
    this.config = {
      failFast: true,
      parallel: true,
      timeout: 30000, // 30 seconds
      retries: 0,
      environment: 'development',
      ...config,
    };
  }

  registerGate(gate: SecurityGate): void {
    this.gates.set(gate.name, gate);
  }

  unregisterGate(gateName: string): void {
    this.gates.delete(gateName);
  }

  async executeGate(
    gateName: string,
    input: unknown,
    context?: Partial<GateExecutionContext>
  ): Promise<SecurityGateResult> {
    const gate = this.gates.get(gateName);
    if (!gate) {
      return {
        valid: false,
        errors: [`Security gate '${gateName}' not found`],
        warnings: [],
      };
    }

    const executionContext: GateExecutionContext = {
      environment: this.config.environment || 'development',
      timestamp: new Date(),
      ...context,
    };

    return await this.executeWithTimeout(gate, input, executionContext);
  }

  async executeAll(
    input: unknown,
    context?: Partial<GateExecutionContext>
  ): Promise<{
    results: Map<string, SecurityGateResult>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    const gateNames = Array.from(this.gates.keys());
    const results = new Map<string, SecurityGateResult>();

    if (this.config.parallel) {
      const promises = gateNames.map(async gateName => {
        const result = await this.executeGate(gateName, input, context);
        return { gateName, result };
      });

      const completed = await Promise.all(promises);
      completed.forEach(({ gateName, result }) => {
        results.set(gateName, result);

        // Fail fast on first error if configured
        if (this.config.failFast && !result.valid) {
          throw new Error(`Security gate '${gateName}' failed: ${result.errors.join(', ')}`);
        }
      });
    } else {
      for (const gateName of gateNames) {
        const result = await this.executeGate(gateName, input, context);
        results.set(gateName, result);

        // Fail fast on first error if configured
        if (this.config.failFast && !result.valid) {
          break;
        }
      }
    }

    const summary = {
      total: results.size,
      passed: Array.from(results.values()).filter(r => r.valid).length,
      failed: Array.from(results.values()).filter(r => !r.valid).length,
      totalErrors: Array.from(results.values()).reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: Array.from(results.values()).reduce((sum, r) => sum + r.warnings.length, 0),
    };

    return { results, summary };
  }

  async executeSelected(
    gateNames: string[],
    input: unknown,
    context?: Partial<GateExecutionContext>
  ): Promise<{
    results: Map<string, SecurityGateResult>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    const results = new Map<string, SecurityGateResult>();

    for (const gateName of gateNames) {
      const result = await this.executeGate(gateName, input, context);
      results.set(gateName, result);

      if (this.config.failFast && !result.valid) {
        break;
      }
    }

    const summary = {
      total: results.size,
      passed: Array.from(results.values()).filter(r => r.valid).length,
      failed: Array.from(results.values()).filter(r => !r.valid).length,
      totalErrors: Array.from(results.values()).reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: Array.from(results.values()).reduce((sum, r) => sum + r.warnings.length, 0),
    };

    return { results, summary };
  }

  private async executeWithTimeout(
    gate: SecurityGate,
    input: unknown,
    context: GateExecutionContext
  ): Promise<SecurityGateResult> {
    const timeoutPromise = new Promise<SecurityGateResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Security gate '${gate.name}' timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    const executePromise = this.executeWithRetries(gate, input, context);

    try {
      return await Promise.race([executePromise, timeoutPromise]);
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        metadata: { gateName: gate.name, timestamp: context.timestamp },
      };
    }
  }

  private async executeWithRetries(
    gate: SecurityGate,
    input: unknown,
    context: GateExecutionContext
  ): Promise<SecurityGateResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (this.config.retries || 0); attempt++) {
      try {
        const result = await gate.execute(input);

        // Add execution metadata
        result.metadata = {
          ...result.metadata,
          gateName: gate.name,
          attempt: attempt + 1,
          timestamp: context.timestamp,
          environment: context.environment,
        };

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === (this.config.retries || 0)) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      valid: false,
      errors: [lastError?.message || 'Gate execution failed after retries'],
      warnings: [],
      metadata: {
        gateName: gate.name,
        attempts: (this.config.retries || 0) + 1,
        timestamp: context.timestamp,
      },
    };
  }

  listGates(): Array<{ name: string; description: string; version: string }> {
    return Array.from(this.gates.values()).map(gate => ({
      name: gate.name,
      description: gate.description,
      version: gate.version,
    }));
  }

  getGateConfig(gateName: string): Record<string, unknown> | null {
    const gate = this.gates.get(gateName);
    return gate ? gate.getConfig() : null;
  }

  validateGateConfig(gateName: string, config: Record<string, unknown>): SecurityGateResult | null {
    const gate = this.gates.get(gateName);
    return gate ? gate.validateConfig(config) : null;
  }
}
