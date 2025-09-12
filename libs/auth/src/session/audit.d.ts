import { AuthEvent } from './types';
export interface AuditConfig {
  enableEventLogging: boolean;
  enableSecurityAudit: boolean;
  maxEventHistory: number;
  logLevel: 'minimal' | 'standard' | 'detailed';
  sensitiveDataMasking: boolean;
  exportFormat: 'json' | 'csv';
}
export interface SecurityAuditEvent extends AuthEvent {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'session' | 'security' | 'privacy';
  riskScore: number;
  remoteIp?: string;
  userAgent?: string;
  geolocation?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}
export interface AuditSummary {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  logouts: number;
  securityEvents: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  riskLevel: 'low' | 'medium' | 'high';
}
export declare class AuthAuditLogger {
  private config;
  private eventHistory;
  private readonly MAX_HISTORY_SIZE;
  constructor(config?: Partial<AuditConfig>);
  logAuthEvent(event: AuthEvent, additionalData?: Partial<SecurityAuditEvent>): void;
  getAuditHistory(limit?: number): SecurityAuditEvent[];
  getSecurityEvents(severityFilter?: SecurityAuditEvent['severity']): SecurityAuditEvent[];
  generateAuditSummary(timeRangeHours?: number): AuditSummary;
  exportAuditLog(format?: 'json' | 'csv'): string;
  clearAuditHistory(): void;
  setConfig(newConfig: Partial<AuditConfig>): void;
  private enrichEvent;
  private calculateSeverity;
  private categorizeEvent;
  private calculateRiskScore;
  private storeEvent;
  private analyzeSecurityEvent;
  private getRecentFailedLogins;
  private getRecentRecoveryAttempts;
  private getRecentLogins;
  private logSecurityAlert;
  private maskSensitiveData;
  private maskUserAgent;
  private exportToJson;
  private exportToCsv;
}
export declare const globalAuditLogger: AuthAuditLogger;
export declare function useAuthAudit(): {
  logger: AuthAuditLogger;
  logEvent: (event: AuthEvent, additionalData?: Partial<SecurityAuditEvent>) => void;
  getHistory: (limit?: number) => SecurityAuditEvent[];
  getSummary: (hours?: number) => AuditSummary;
  exportLog: (format?: 'json' | 'csv') => string;
};
