/**
 * Compliance Reporting and Data Retention
 * Defines compliance reporting, data retention, and export interfaces
 */
import type {
  ComplianceFramework,
  ComplianceStatus,
  TimeRange,
  EventType,
  BaseEvent,
  LoggedEvent,
} from './types.js';
export interface ComplianceEventLogger {
  logComplianceEvent(event: ComplianceEvent): Promise<LoggedEvent>;
  logAuditEvent(event: AuditEvent): Promise<LoggedEvent>;
  generateComplianceReport(
    framework: ComplianceFramework,
    timeRange: TimeRange
  ): Promise<ComplianceReport>;
  exportCompliance(filters: ComplianceExportFilters): Promise<ComplianceExport>;
}
export interface ComplianceEvent extends BaseEvent {
  eventType: 'compliance_check' | 'policy_violation' | 'data_processing' | 'consent_given';
  framework: ComplianceFramework;
  compliant: boolean;
  details: any;
}
export interface AuditEvent extends BaseEvent {
  eventType: 'audit_log_created' | 'audit_log_accessed' | 'audit_trail_verified';
  auditType: string;
  result: 'pass' | 'fail' | 'warning';
  findings: string[];
}
export { ComplianceFramework } from './types.js';
export interface ComplianceReport {
  reportId: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  timeRange: TimeRange;
  overallScore: number;
  complianceStatus: ComplianceStatus;
  violations: ComplianceViolation[];
  totalEvents: number;
  compliantEvents: number;
  nonCompliantEvents: number;
  recommendations: ComplianceRecommendation[];
  actionItems: ComplianceActionItem[];
  nextAssessment: Date;
}
export interface ComplianceExportFilters {
  timeRange: TimeRange;
  eventTypes?: EventType[];
  userIds?: string[];
  includePersonalData: boolean;
  anonymize: boolean;
}
export interface ComplianceExport {
  exportId: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  format: 'json' | 'csv' | 'xml' | 'pdf';
  encrypted: boolean;
  fileSize: number;
  eventCount: number;
  downloadUrl: string;
  expiresAt: Date;
}
export interface RetentionPolicy {
  framework: ComplianceFramework;
  eventTypes: EventType[];
  retentionPeriod: number;
  autoDelete: boolean;
  backupBeforeDelete: boolean;
}
export interface RetentionResult {
  policiesApplied: number;
  eventsProcessed: number;
  eventsDeleted: number;
  eventsArchived: number;
  errors: string[];
}
export interface EventPurgePolicy {
  eventTypes: EventType[];
  olderThan: number;
  conditions: PurgeCondition[];
  confirmationRequired: boolean;
}
export interface PurgeCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}
export interface PurgeScheduleResult {
  scheduleId: string;
  nextExecution: Date;
  estimatedEventsToDelete: number;
  estimatedStorageReclaimed: number;
}
export interface ComplianceViolation {
  violationType: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  affectedEvents: string[];
  remediation: string;
  deadline?: Date;
}
export interface ComplianceRecommendation {
  area: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  benefit: string;
}
export interface ComplianceActionItem {
  action: string;
  responsible: string;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}
