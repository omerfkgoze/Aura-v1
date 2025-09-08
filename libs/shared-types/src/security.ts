// Security Gate Types

export interface SecurityGate {
  name: string;
  description: string;
  version: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  execute(): Promise<SecurityGateResult>;
  configure?(config: SecurityGateConfig): void;
}

export interface SecurityGateResult {
  passed: boolean;
  name: string;
  executionTime: number;
  details: SecurityGateDetails;
  timestamp: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
}

export interface SecurityGateDetails {
  message: string;
  violations?: SecurityViolation[];
  metadata?: Record<string, any>;
  recommendations?: string[];
}

export interface SecurityViolation {
  type: string;
  severity: SecuritySeverity;
  message: string;
  location?: string;
  evidence?: any;
}

export interface SecurityGateConfig {
  [key: string]: any;
}

export interface ClientSecurityGateResult extends SecurityGateResult {
  clientMetadata?: {
    userAgent: string;
    platform: string;
    timestamp: string;
  };
}

export type SecurityCategory =
  | 'CLIENT'
  | 'CRYPTO'
  | 'NETWORK'
  | 'PII'
  | 'TESTING'
  | 'STORAGE'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityAuditResult {
  overallPassed: boolean;
  gateResults: SecurityGateResult[];
  summary: SecurityAuditSummary;
  timestamp: string;
}

export interface SecurityAuditSummary {
  totalGates: number;
  passedGates: number;
  failedGates: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  categories: Record<SecurityCategory, number>;
}
