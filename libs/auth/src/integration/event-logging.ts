/**
 * Authentication Event Logging for Security Audit Trail
 *
 * Advanced event logging interfaces for integration with:
 * - Security audit trail systems
 * - Real-time security monitoring
 * - Compliance reporting and data retention
 * - Forensic analysis capabilities
 * - Privacy-preserving logging
 * - Cross-platform audit consistency
 */

import type {
  AuthenticationContext,
  AuditContext,
  SessionSecurityContext,
  GeolocationData,
  RiskLevel,
  AuthenticationMethod,
} from './types.js';

// Core Event Logging Interfaces
export interface SecurityEventLogger {
  // Event logging
  logAuthenticationEvent(event: AuthenticationEvent): Promise<LoggedEvent>;
  logSecurityEvent(event: SecurityEvent): Promise<LoggedEvent>;
  logDataAccessEvent(event: DataAccessEvent): Promise<LoggedEvent>;
  logSystemEvent(event: SystemEvent): Promise<LoggedEvent>;

  // Batch logging
  logEventBatch(events: AuditableEvent[]): Promise<BatchLogResult>;

  // Event querying
  getEventsByUser(userId: string, filters?: EventQueryFilters): Promise<LoggedEvent[]>;
  getEventsBySession(sessionId: string, filters?: EventQueryFilters): Promise<LoggedEvent[]>;
  getEventsByType(eventType: EventType, filters?: EventQueryFilters): Promise<LoggedEvent[]>;

  // Real-time monitoring
  subscribeToEvents(eventTypes: EventType[], callback: EventCallback): Promise<EventSubscription>;
  subscribeToSecurityEvents(
    userId: string,
    callback: SecurityEventCallback
  ): Promise<EventSubscription>;

  // Event analytics
  analyzeEventPatterns(query: EventPatternQuery): Promise<EventPatternAnalysis>;
  detectEventAnomalies(query: AnomalyDetectionQuery): Promise<EventAnomalyReport>;
}

export interface ComplianceEventLogger {
  // Compliance-specific logging
  logGDPREvent(event: GDPREvent): Promise<LoggedEvent>;
  logHIPAAEvent(event: HIPAAEvent): Promise<LoggedEvent>;
  logDataProcessingEvent(event: DataProcessingEvent): Promise<LoggedEvent>;
  logConsentEvent(event: ConsentEvent): Promise<LoggedEvent>;

  // Compliance reporting
  generateComplianceReport(
    framework: ComplianceFramework,
    timeRange: TimeRange
  ): Promise<ComplianceReport>;
  exportEventsForCompliance(
    framework: ComplianceFramework,
    filters: ComplianceExportFilters
  ): Promise<ComplianceExport>;

  // Data retention management
  applyRetentionPolicies(policies: RetentionPolicy[]): Promise<RetentionResult>;
  scheduleEventPurging(purgePolicy: EventPurgePolicy): Promise<PurgeScheduleResult>;
}

export interface ForensicEventLogger {
  // Forensic logging
  logForensicEvent(event: ForensicEvent): Promise<LoggedEvent>;
  createForensicSnapshot(context: ForensicSnapshotContext): Promise<ForensicSnapshot>;

  // Evidence collection
  collectEventEvidence(eventIds: string[]): Promise<EventEvidence>;
  preserveEventChain(startEventId: string, endEventId: string): Promise<EventChainEvidence>;

  // Forensic analysis
  reconstructEventTimeline(query: TimelineReconstructionQuery): Promise<EventTimeline>;
  analyzeEventCorrelations(query: CorrelationAnalysisQuery): Promise<EventCorrelationReport>;
  generateForensicReport(query: ForensicReportQuery): Promise<ForensicReport>;
}

// Core Event Types
export interface BaseEvent {
  // Event identity
  eventId: string;
  eventType: EventType;
  timestamp: Date;

  // Context
  userId?: string;
  sessionId?: string;
  deviceId?: string;

  // Event details
  description: string;
  metadata: Record<string, any>;

  // Security and integrity
  integrity: EventIntegrity;
  privacy: PrivacySettings;

  // Audit trail
  auditContext: AuditContext;
}

export interface AuthenticationEvent extends BaseEvent {
  eventType:
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
    | 'multi_factor_completed';

  // Authentication-specific data
  authMethod: AuthenticationMethod;
  authStrength: number;
  hardwareVerified: boolean;
  biometricVerified: boolean;

  // Credential information (privacy-safe)
  credentialId?: string;
  credentialType?: string;

  // Challenge/response context
  challengeId?: string;
  responseValid?: boolean;

  // Device and location
  deviceInfo: DeviceEventInfo;
  locationInfo?: LocationEventInfo;

  // Risk assessment
  riskLevel: RiskLevel;
  riskFactors: string[];

  // Failure details (if applicable)
  failureReason?: string;
  failureCode?: string;
  retryCount?: number;
}

export interface SecurityEvent extends BaseEvent {
  eventType:
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
    | 'phishing_attempt';

  // Security-specific data
  severity: SecuritySeverity;
  threatType: ThreatType;
  attackVector?: AttackVector;

  // Security context
  securityContext: SecurityEventContext;
  affectedResources: string[];

  // Detection information
  detectionMethod: DetectionMethod;
  detectionConfidence: number;
  falsePositiveLikelihood: number;

  // Response and mitigation
  autoMitigated: boolean;
  mitigationActions: string[];
  responseRequired: boolean;
  escalated: boolean;

  // Impact assessment
  impactLevel: ImpactLevel;
  affectedUsers: string[];
  dataExposureRisk: DataExposureRisk;
}

export interface DataAccessEvent extends BaseEvent {
  eventType:
    | 'data_read'
    | 'data_write'
    | 'data_delete'
    | 'data_share'
    | 'data_export'
    | 'data_sync'
    | 'data_backup'
    | 'data_restore'
    | 'data_migration'
    | 'data_purge';

  // Data access details
  dataType: DataType;
  dataCategory: DataCategory;
  resourceId: string;

  // Access context
  accessPurpose: DataAccessPurpose;
  accessLevel: DataAccessLevel;
  accessDuration: number;

  // Data sensitivity
  sensitivityLevel: SensitivityLevel;
  encryptionRequired: boolean;
  encryptionApplied: boolean;

  // Legal basis and consent
  legalBasis: LegalBasis;
  consentId?: string;
  consentValid: boolean;

  // Data sharing (if applicable)
  sharedWith?: string[];
  sharingPurpose?: string;
  sharingDuration?: number;

  // Compliance flags
  gdprRelevant: boolean;
  hipaaRelevant: boolean;
  ccpaRelevant: boolean;
}

export interface SystemEvent extends BaseEvent {
  eventType:
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
    | 'software_update';

  // System context
  systemComponent: string;
  operationType: OperationType;

  // Change details
  changeDescription: string;
  oldValue?: any;
  newValue?: any;

  // Impact assessment
  serviceImpact: ServiceImpact;
  userImpact: UserImpact;
  securityImpact: SecurityImpact;

  // Administrative context
  adminUserId?: string;
  approvalId?: string;
  automatedAction: boolean;
}

// Compliance-Specific Events
export interface GDPREvent extends BaseEvent {
  eventType:
    | 'consent_given'
    | 'consent_withdrawn'
    | 'data_subject_request'
    | 'right_to_be_forgotten'
    | 'data_portability_request'
    | 'data_rectification'
    | 'data_processing_started'
    | 'data_processing_stopped'
    | 'breach_notification';

  // GDPR-specific context
  legalBasis: GDPRLegalBasis;
  dataSubjectId: string;
  processingPurpose: string;

  // Data subject rights
  rightExercised?: DataSubjectRight;
  requestId?: string;
  responseDeadline?: Date;

  // Processing details
  dataCategories: DataCategory[];
  processingActivities: string[];
  thirdPartyInvolved: boolean;
  crossBorderTransfer: boolean;
}

export interface HIPAAEvent extends BaseEvent {
  eventType:
    | 'phi_accessed'
    | 'phi_disclosed'
    | 'phi_modified'
    | 'phi_created'
    | 'phi_deleted'
    | 'authorization_granted'
    | 'authorization_revoked'
    | 'minimum_necessary_applied'
    | 'breach_detected';

  // HIPAA-specific context
  phiType: PHIType;
  accessJustification: string;
  minimumNecessary: boolean;

  // Healthcare context
  patientId?: string;
  providerId?: string;
  treatmentContext?: string;

  // Authorization
  authorizationId?: string;
  authorizationValid: boolean;
  purposeOfUse: string;
}

export interface DataProcessingEvent extends BaseEvent {
  eventType:
    | 'processing_started'
    | 'processing_completed'
    | 'processing_failed'
    | 'processing_paused'
    | 'processing_resumed'
    | 'processing_cancelled';

  // Processing details
  processingType: DataProcessingType;
  processingPurpose: string;
  dataVolume: number;

  // Legal and compliance
  legalBasis: LegalBasis;
  consentRequired: boolean;
  consentObtained: boolean;

  // Technical details
  algorithm?: string;
  parameters?: Record<string, any>;
  outputGenerated: boolean;

  // Quality and validation
  dataQualityScore?: number;
  validationPassed: boolean;
  errorsEncountered: string[];
}

export interface ConsentEvent extends BaseEvent {
  eventType:
    | 'consent_requested'
    | 'consent_given'
    | 'consent_denied'
    | 'consent_withdrawn'
    | 'consent_renewed'
    | 'consent_expired'
    | 'consent_modified';

  // Consent details
  consentId: string;
  consentType: ConsentType;
  consentScope: string[];

  // Consent context
  dataSubjectId: string;
  processingPurposes: string[];
  dataCategories: DataCategory[];

  // Consent mechanism
  consentMechanism: ConsentMechanism;
  explicitConsent: boolean;
  informedConsent: boolean;

  // Validity and lifecycle
  validFrom: Date;
  validUntil?: Date;
  renewalRequired: boolean;
  withdrawalMethod: string;
}

// Forensic-Specific Events
export interface ForensicEvent extends BaseEvent {
  eventType:
    | 'evidence_collected'
    | 'chain_of_custody_established'
    | 'evidence_analyzed'
    | 'timeline_reconstructed'
    | 'correlation_identified'
    | 'incident_declared'
    | 'investigation_started'
    | 'investigation_completed';

  // Forensic context
  investigationId: string;
  evidenceId: string;
  chainOfCustody: ChainOfCustodyRecord[];

  // Evidence details
  evidenceType: EvidenceType;
  evidenceHash: string;
  evidenceSize: number;
  collectionMethod: string;

  // Analysis results
  analysisResults?: ForensicAnalysisResult[];
  correlatedEvents?: string[];
  timelinePosition?: number;

  // Legal considerations
  legalHold: boolean;
  discoverable: boolean;
  privileged: boolean;
}

// Supporting Data Structures
export interface LoggedEvent {
  eventId: string;
  loggedAt: Date;
  success: boolean;
  integrity: EventIntegrity;

  // Storage details
  storageLocation: string;
  backupStatus: BackupStatus;
  retentionUntil: Date;

  // Access and retrieval
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
  retentionPeriod: number; // days
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
}

export interface DeviceEventInfo {
  deviceId: string;
  deviceType: string;
  platform: string;
  hardwareFingerprint: string;
  softwareVersion: string;
  trustLevel: number;

  // Privacy-safe device characteristics
  hardwareCapabilities: string[];
  securityFeatures: string[];

  // Device state
  screenLocked: boolean;
  networkType: string;
  batteryLevel?: number;
}

export interface LocationEventInfo {
  // Privacy-preserving location data
  countryCode: string;
  regionCode?: string;
  cityCode?: string;
  timezone: string;

  // Network-based location
  ipGeolocation: boolean;
  vpnDetected: boolean;
  torDetected: boolean;

  // Location accuracy and privacy
  accuracyLevel: 'country' | 'region' | 'city' | 'precise';
  privacyMode: boolean;
  locationConsentGiven: boolean;
}

export interface SecurityEventContext {
  // Attack context
  attackPhase?: AttackPhase;
  attackComplexity: AttackComplexity;
  userInteractionRequired: boolean;

  // Network context
  sourceIP: string;
  destinationIP?: string;
  protocol: string;
  port?: number;

  // Application context
  endpoint?: string;
  userAgent?: string;
  referer?: string;
  sessionContext?: string;

  // System context
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

export interface EventQueryFilters {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: EventType[];
  severityLevels?: SecuritySeverity[];
  riskLevels?: RiskLevel[];
  deviceIds?: string[];
  locations?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EventPatternQuery {
  userId?: string;
  timeRange: TimeRange;
  eventTypes: EventType[];
  patternType: 'sequence' | 'frequency' | 'anomaly' | 'correlation';
  parameters: Record<string, any>;
}

export interface EventPatternAnalysis {
  patternId: string;
  patternType: string;
  confidence: number;
  occurrences: number;
  timeframe: TimeRange;

  // Pattern details
  eventSequence?: EventSequencePattern[];
  frequencyPattern?: FrequencyPattern;
  anomalyPattern?: AnomalyPattern;
  correlationPattern?: CorrelationPattern;

  // Risk assessment
  riskLevel: RiskLevel;
  securityImplications: string[];
  recommendedActions: string[];
}

export interface EventAnomalyReport {
  reportId: string;
  generatedAt: Date;
  timeRange: TimeRange;

  // Detected anomalies
  anomalies: DetectedAnomaly[];
  totalAnomalies: number;
  anomalyScore: number;

  // Analysis context
  baselineEvents: number;
  comparisonPeriod: TimeRange;
  detectionSensitivity: 'low' | 'medium' | 'high';

  // Risk assessment
  overallRisk: RiskLevel;
  criticalAnomalies: number;
  investigationRequired: boolean;
}

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

export interface ForensicSnapshot {
  snapshotId: string;
  createdAt: Date;
  context: ForensicSnapshotContext;

  // System state
  systemState: SystemStateSnapshot;
  applicationState: ApplicationStateSnapshot;
  userState: UserStateSnapshot;

  // Evidence preservation
  evidenceHash: string;
  chainOfCustody: ChainOfCustodyRecord;
  legalHold: boolean;
}

export interface EventTimeline {
  timelineId: string;
  reconstructedAt: Date;
  timeRange: TimeRange;

  // Timeline events
  events: TimelineEvent[];
  correlations: EventCorrelation[];
  gaps: TimelineGap[];

  // Analysis results
  attackNarrative?: string;
  keyMilestones: TimelineMilestone[];
  evidenceQuality: EvidenceQuality;

  // Confidence and reliability
  reconstructionConfidence: number;
  timelineAccuracy: number;
  missingEvidence: string[];
}

// Enums and Types
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
export type ThreatType =
  | 'malware'
  | 'phishing'
  | 'social_engineering'
  | 'brute_force'
  | 'injection'
  | 'privilege_escalation'
  | 'data_exfiltration';
export type AttackVector =
  | 'network'
  | 'email'
  | 'web'
  | 'physical'
  | 'social'
  | 'supply_chain'
  | 'insider';
export type DetectionMethod =
  | 'signature'
  | 'heuristic'
  | 'behavioral'
  | 'anomaly'
  | 'machine_learning'
  | 'rule_based';
export type ImpactLevel = 'minimal' | 'minor' | 'moderate' | 'major' | 'severe';
export type DataExposureRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type DataType =
  | 'health_data'
  | 'cycle_data'
  | 'symptoms'
  | 'medications'
  | 'appointments'
  | 'test_results'
  | 'user_preferences'
  | 'device_data';
export type DataCategory =
  | 'personal_data'
  | 'sensitive_data'
  | 'special_category'
  | 'health_data'
  | 'biometric_data'
  | 'location_data';
export type DataAccessPurpose =
  | 'read_display'
  | 'edit_update'
  | 'analytics'
  | 'sharing'
  | 'backup'
  | 'sync'
  | 'export'
  | 'healthcare_provider_access';
export type DataAccessLevel = 'restricted' | 'standard' | 'full' | 'administrative';
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export type OperationType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'configure'
  | 'backup'
  | 'restore';
export type ServiceImpact = 'none' | 'minimal' | 'partial' | 'significant' | 'complete';
export type UserImpact = 'none' | 'minor' | 'moderate' | 'major' | 'severe';
export type SecurityImpact = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type GDPRLegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';
export type DataSubjectRight =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restrict_processing'
  | 'data_portability'
  | 'object';
export type PHIType =
  | 'identifiers'
  | 'health_information'
  | 'payment_information'
  | 'dates'
  | 'communication';
export type DataProcessingType =
  | 'collection'
  | 'storage'
  | 'analysis'
  | 'sharing'
  | 'deletion'
  | 'anonymization';
export type ConsentType = 'explicit' | 'implicit' | 'opt_in' | 'opt_out' | 'blanket' | 'granular';
export type ConsentMechanism =
  | 'checkbox'
  | 'signature'
  | 'verbal'
  | 'implied'
  | 'electronic'
  | 'biometric';

export type AttackPhase =
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_control'
  | 'actions_objectives';
export type AttackComplexity = 'low' | 'medium' | 'high';
export type EvidenceType =
  | 'log_entry'
  | 'network_packet'
  | 'file_system'
  | 'memory_dump'
  | 'database_record'
  | 'system_state';
export type ComplianceFramework = 'gdpr' | 'hipaa' | 'ccpa' | 'pipeda' | 'sox' | 'pci_dss';
export type ComplianceStatus = 'compliant' | 'partially_compliant' | 'non_compliant' | 'unknown';
export type BackupStatus = 'not_backed_up' | 'backup_pending' | 'backed_up' | 'backup_failed';

// Additional supporting types
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

export interface AnomalyDetectionQuery {
  userId?: string;
  timeRange: TimeRange;
  eventTypes?: EventType[];
  sensitivity: 'low' | 'medium' | 'high';
  baselinePeriod: TimeRange;
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

// Additional complex types for forensic analysis
export interface ChainOfCustodyRecord {
  recordId: string;
  timestamp: Date;
  custodian: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  location: string;
  integrityHash: string;
  signature: string;
}

export interface ForensicAnalysisResult {
  analysisId: string;
  analysisType: string;
  findings: string[];
  confidence: number;
  methodology: string;
  tools: string[];
  analyst: string;
}

export interface SystemStateSnapshot {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkConnections: NetworkConnection[];
  runningProcesses: ProcessInfo[];
  systemLogs: LogEntry[];
}

export interface ApplicationStateSnapshot {
  timestamp: Date;
  applicationVersion: string;
  configurationHash: string;
  activeSessions: string[];
  databaseConnections: number;
  cacheStatus: CacheStatus;
}

export interface UserStateSnapshot {
  timestamp: Date;
  userId: string;
  sessionStates: SessionState[];
  permissions: string[];
  recentActivities: RecentActivity[];
}

export interface ForensicSnapshotContext {
  incidentId: string;
  triggerEvent: string;
  investigatorId: string;
  legalHold: boolean;
  preservationOrder: string;
}

export interface TimelineEvent {
  eventId: string;
  timestamp: Date;
  eventType: EventType;
  description: string;
  confidence: number;
  sourceReliability: number;
  correlatedEvents: string[];
}

export interface EventCorrelation {
  correlationId: string;
  eventIds: string[];
  correlationType: 'causal' | 'temporal' | 'behavioral' | 'technical';
  strength: number;
  description: string;
}

export interface TimelineGap {
  startTime: Date;
  endTime: Date;
  duration: number;
  possibleCauses: string[];
  impactOnAnalysis: 'minimal' | 'moderate' | 'significant';
}

export interface TimelineMilestone {
  timestamp: Date;
  event: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidenceQuality: EvidenceQuality;
}

export interface EvidenceQuality {
  completeness: number; // 0-100
  reliability: number; // 0-100
  integrity: number; // 0-100
  chainOfCustody: boolean;
  verifiable: boolean;
}

// Pattern analysis supporting types
export interface EventSequencePattern {
  sequence: EventType[];
  occurrences: number;
  averageInterval: number;
  confidence: number;
}

export interface FrequencyPattern {
  eventType: EventType;
  normalFrequency: number;
  observedFrequency: number;
  deviation: number;
  timeWindow: string;
}

export interface AnomalyPattern {
  anomalyType: string;
  severity: SecuritySeverity;
  description: string;
  affectedEvents: number;
  timeRange: TimeRange;
}

export interface CorrelationPattern {
  eventTypes: EventType[];
  correlationStrength: number;
  description: string;
  occurrences: number;
}

export interface DetectedAnomaly {
  anomalyId: string;
  type: string;
  severity: SecuritySeverity;
  confidence: number;
  description: string;
  affectedEvents: string[];
  recommendedAction: string;
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

// Supporting utility types
export interface NetworkConnection {
  localAddress: string;
  remoteAddress: string;
  protocol: string;
  state: string;
  processId: number;
}

export interface ProcessInfo {
  processId: number;
  processName: string;
  cpuUsage: number;
  memoryUsage: number;
  startTime: Date;
  userId: string;
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface CacheStatus {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  size: number;
  maxSize: number;
}

export interface SessionState {
  sessionId: string;
  status: 'active' | 'idle' | 'expired' | 'terminated';
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export interface RecentActivity {
  timestamp: Date;
  activityType: string;
  details: string;
  riskLevel: RiskLevel;
}

// Forensic reporting types
export interface TimelineReconstructionQuery {
  incidentId: string;
  timeRange: TimeRange;
  eventTypes?: EventType[];
  userIds?: string[];
  deviceIds?: string[];
  confidence: number;
}

export interface CorrelationAnalysisQuery {
  eventIds: string[];
  analysisType: 'temporal' | 'causal' | 'behavioral' | 'technical' | 'all';
  timeWindow: number; // minutes
  confidence: number;
}

export interface ForensicReportQuery {
  incidentId: string;
  reportType: 'summary' | 'detailed' | 'technical' | 'executive';
  includeTimeline: boolean;
  includeEvidence: boolean;
  includeRecommendations: boolean;
}

export interface EventEvidence {
  evidenceId: string;
  eventIds: string[];
  collectedAt: Date;
  integrityHash: string;
  chainOfCustody: ChainOfCustodyRecord[];
  legalHold: boolean;
  admissible: boolean;
}

export interface EventChainEvidence {
  chainId: string;
  startEventId: string;
  endEventId: string;
  eventCount: number;
  chainIntegrity: boolean;
  missingEvents: string[];
  preservationQuality: EvidenceQuality;
}

export interface ForensicReport {
  reportId: string;
  incidentId: string;
  generatedAt: Date;
  investigator: string;

  // Report content
  executiveSummary: string;
  findings: ForensicFinding[];
  timeline: EventTimeline;
  evidence: EventEvidence[];

  // Analysis results
  rootCause: string;
  attackVector: AttackVector;
  impactAssessment: string;

  // Recommendations
  recommendations: ForensicRecommendation[];
  lessoneLearned: string[];

  // Legal considerations
  legalImplications: string[];
  regulatoryRequirements: string[];
  disclosureRequirements: string[];
}

export interface ForensicFinding {
  findingId: string;
  category: string;
  severity: SecuritySeverity;
  description: string;
  evidence: string[];
  confidence: number;
  implications: string[];
}

export interface ForensicRecommendation {
  category: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  rationale: string;
  estimatedCost: string;
  estimatedTimeframe: string;
}
