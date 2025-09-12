/**
 * Compliance Reporting and Data Retention
 * Defines compliance reporting, data retention, and export interfaces
 */

import type { ComplianceFramework, ComplianceStatus, TimeRange, EventType } from './types.js';

export interface ComplianceReport {
  reportId: string;
  framework: ComplianceFramework;
  generatedAt: Date;
  timeRange: TimeRange;

  // Compliance overview
  overallScore: number;
  complianceStatus: ComplianceStatus;
  violations: ComplianceViolation[];

  // Event analysis
  totalEvents: number;
  compliantEvents: number;
  nonCompliantEvents: number;

  // Recommendations
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
  retentionPeriod: number; // days
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
  olderThan: number; // days
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
