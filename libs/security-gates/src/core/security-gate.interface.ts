export interface SecurityGateResult {
  valid: boolean;
  passed: boolean;
  errors: string[];
  warnings: string[];
  details?: string;
  executionTime?: number;
  metadata?: Record<string, unknown>;
}

export interface SecurityGate {
  name: string;
  description: string;
  version: string;

  /**
   * Execute the security gate validation
   */
  execute(input: unknown): Promise<SecurityGateResult>;

  /**
   * Get gate configuration
   */
  getConfig(): Record<string, unknown>;

  /**
   * Validate gate configuration
   */
  validateConfig(config: Record<string, unknown>): SecurityGateResult;
}

export interface SecurityGateRegistry {
  register(gate: SecurityGate): void;
  unregister(gateName: string): void;
  getGate(gateName: string): SecurityGate | undefined;
  listGates(): string[];
  executeGate(gateName: string, input: unknown): Promise<SecurityGateResult>;
}

export interface GateExecutionContext {
  environment: 'development' | 'staging' | 'production';
  timestamp: Date;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}
