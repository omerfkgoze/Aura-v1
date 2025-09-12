/**
 * Event Logging Types and Interfaces
 * Core types for authentication event logging system
 */
import type { AuditContext } from '../types/index.js';
export interface SecurityEventLogger {
  logAuthenticationEvent(event: AuthenticationEvent): Promise<LoggedEvent>;
  logSecurityEvent(event: SecurityEvent): Promise<LoggedEvent>;
  logDataAccessEvent(event: DataAccessEvent): Promise<LoggedEvent>;
  logSystemEvent(event: SystemEvent): Promise<LoggedEvent>;
  logEventBatch(events: AuditableEvent[]): Promise<BatchLogResult>;
  getEventsByUser(userId: string, filters?: EventQueryFilters): Promise<LoggedEvent[]>;
  getEventsBySession(sessionId: string, filters?: EventQueryFilters): Promise<LoggedEvent[]>;
  getEventsByType(eventType: EventType, filters?: EventQueryFilters): Promise<LoggedEvent[]>;
  subscribeToEvents(eventTypes: EventType[], callback: EventCallback): Promise<EventSubscription>;
  subscribeToSecurityEvents(
    userId: string,
    callback: SecurityEventCallback
  ): Promise<EventSubscription>;
  analyzeEventPatterns(query: EventPatternQuery): Promise<EventPatternAnalysis>;
  detectEventAnomalies(query: AnomalyDetectionQuery): Promise<EventAnomalyReport>;
}
export interface ComplianceEventLogger {
  logGDPREvent(event: GDPREvent): Promise<LoggedEvent>;
  logHIPAAEvent(event: HIPAAEvent): Promise<LoggedEvent>;
  logDataProcessingEvent(event: DataProcessingEvent): Promise<LoggedEvent>;
  logConsentEvent(event: ConsentEvent): Promise<LoggedEvent>;
  generateComplianceReport(
    framework: ComplianceFramework,
    timeRange: TimeRange
  ): Promise<ComplianceReport>;
  exportEventsForCompliance(
    framework: ComplianceFramework,
    filters: ComplianceExportFilters
  ): Promise<ComplianceExport>;
  applyRetentionPolicies(policies: RetentionPolicy[]): Promise<RetentionResult>;
  scheduleEventPurging(purgePolicy: EventPurgePolicy): Promise<PurgeScheduleResult>;
}
export interface ForensicEventLogger {
  logForensicEvent(event: ForensicEvent): Promise<LoggedEvent>;
  createForensicSnapshot(context: ForensicSnapshotContext): Promise<ForensicSnapshot>;
  collectEventEvidence(eventIds: string[]): Promise<EventEvidence>;
  preserveEventChain(startEventId: string, endEventId: string): Promise<EventChainEvidence>;
  reconstructEventTimeline(query: TimelineReconstructionQuery): Promise<EventTimeline>;
  analyzeEventCorrelations(query: CorrelationAnalysisQuery): Promise<EventCorrelationReport>;
  generateForensicReport(query: ForensicReportQuery): Promise<ForensicReport>;
}
export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  description: string;
  metadata: Record<string, any>;
  integrity: EventIntegrity;
  privacy: PrivacySettings;
  auditContext: AuditContext;
}
export interface LoggedEvent {
  eventId: string;
  loggedAt: Date;
  success: boolean;
  integrity: EventIntegrity;
  storageLocation: string;
  backupStatus: BackupStatus;
  retentionUntil: Date;
  accessCount: number;
  lastAccessed?: Date;
  accessRestrictions: string[];
}
export interface EventIntegrity {
  hash: string;
  algorithm: string;
  signature?: string;
  chainPreviousHash?: string;
  tamperEvident: boolean;
  integrityVerified: boolean;
}
export interface PrivacySettings {
  piiSanitized: boolean;
  pseudonymized: boolean;
  encrypted: boolean;
  retentionPeriod: number;
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
}
export interface TimeRange {
  start: Date;
  end: Date;
}
export interface EventCallback {
  (event: LoggedEvent): void;
}
export interface SecurityEventCallback {
  (event: SecurityEvent): void;
}
export interface EventSubscription {
  subscriptionId: string;
  eventTypes: EventType[];
  userId?: string;
  active: boolean;
  unsubscribe(): Promise<void>;
}
export interface BatchLogResult {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  failures: EventLogFailure[];
  batchId: string;
  processingTime: number;
}
export interface EventLogFailure {
  eventIndex: number;
  error: string;
  retryable: boolean;
}
export type EventType =
  | 'authentication_started'
  | 'authentication_completed'
  | 'authentication_failed'
  | 'credential_created'
  | 'credential_updated'
  | 'credential_revoked'
  | 'user_verification_started'
  | 'user_verification_completed'
  | 'user_verification_failed'
  | 'biometric_verification'
  | 'hardware_attestation'
  | 'multi_factor_completed'
  | 'security_violation'
  | 'suspicious_activity'
  | 'threat_detected'
  | 'attack_attempt'
  | 'security_policy_violation'
  | 'anomaly_detected'
  | 'privilege_escalation_attempt'
  | 'unauthorized_access_attempt'
  | 'data_breach_detected'
  | 'malware_detected'
  | 'phishing_attempt'
  | 'data_read'
  | 'data_write'
  | 'data_delete'
  | 'data_share'
  | 'data_export'
  | 'data_sync'
  | 'data_backup'
  | 'data_restore'
  | 'data_migration'
  | 'data_purge'
  | 'system_startup'
  | 'system_shutdown'
  | 'configuration_change'
  | 'policy_update'
  | 'maintenance_started'
  | 'maintenance_completed'
  | 'backup_started'
  | 'backup_completed'
  | 'restore_started'
  | 'restore_completed'
  | 'key_rotation'
  | 'certificate_renewal'
  | 'software_update'
  | 'consent_given'
  | 'consent_withdrawn'
  | 'data_subject_request'
  | 'right_to_be_forgotten'
  | 'data_portability_request'
  | 'data_rectification'
  | 'data_processing_started'
  | 'data_processing_stopped'
  | 'breach_notification'
  | 'phi_accessed'
  | 'phi_disclosed'
  | 'phi_modified'
  | 'phi_created'
  | 'phi_deleted'
  | 'authorization_granted'
  | 'authorization_revoked'
  | 'minimum_necessary_applied'
  | 'breach_detected'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'processing_paused'
  | 'processing_resumed'
  | 'processing_cancelled'
  | 'consent_requested'
  | 'consent_denied'
  | 'consent_renewed'
  | 'consent_expired'
  | 'consent_modified'
  | 'evidence_collected'
  | 'chain_of_custody_established'
  | 'evidence_analyzed'
  | 'timeline_reconstructed'
  | 'correlation_identified'
  | 'incident_declared'
  | 'investigation_started'
  | 'investigation_completed';
export type SecuritySeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type ComplianceFramework = 'gdpr' | 'hipaa' | 'ccpa' | 'pipeda' | 'sox' | 'pci_dss';
export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'unknown';
export type BackupStatus = 'not_backed_up' | 'backup_pending' | 'backed_up' | 'backup_failed';
export interface AuthenticationEvent extends BaseEvent {}
export interface SecurityEvent extends BaseEvent {}
export interface DataAccessEvent extends BaseEvent {}
export interface SystemEvent extends BaseEvent {}
export interface GDPREvent extends BaseEvent {}
export interface HIPAAEvent extends BaseEvent {}
export interface DataProcessingEvent extends BaseEvent {}
export interface ConsentEvent extends BaseEvent {}
export interface ForensicEvent extends BaseEvent {}
export interface EventQueryFilters {}
export interface EventPatternQuery {}
export interface EventPatternAnalysis {}
export interface AnomalyDetectionQuery {}
export interface EventAnomalyReport {}
export interface ComplianceReport {}
export interface ComplianceExportFilters {}
export interface ComplianceExport {}
export interface RetentionPolicy {}
export interface RetentionResult {}
export interface EventPurgePolicy {}
export interface PurgeScheduleResult {}
export interface ForensicSnapshot {}
export interface ForensicSnapshotContext {}
export interface EventTimeline {}
export interface TimelineReconstructionQuery {}
export interface CorrelationAnalysisQuery {}
export interface EventCorrelationReport {}
export interface ForensicReportQuery {}
export interface ForensicReport {}
export interface EventEvidence {}
export interface EventChainEvidence {}
export type AuditableEvent =
  | AuthenticationEvent
  | SecurityEvent
  | DataAccessEvent
  | SystemEvent
  | GDPREvent
  | HIPAAEvent
  | DataProcessingEvent
  | ConsentEvent
  | ForensicEvent;
