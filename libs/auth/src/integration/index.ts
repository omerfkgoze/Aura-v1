/**
 * Authentication Integration Exports
 *
 * Central export point for all authentication system integration interfaces
 * designed for future story integrations including:
 * - Device-specific key management (Story 1.4)
 * - Crypto core integration (Story 1.2)
 * - User session management for encrypted data access
 * - Security audit trail systems
 * - Multi-device scenarios
 */

// Core Integration Types
export * from './types.js';

// Session Management for Encrypted Data Access
export * from './session-management.js';

// Authentication Event Logging for Security Audit Trail
export * from './event-logging.js';

// Crypto Core Integration Hooks
export * from './crypto-core-hooks.js';

// Re-export key interfaces for convenience
export type {
  // Primary integration contexts
  AuthenticationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  KeyDerivationContext,
  SessionSecurityContext,
  AuditContext,
  MultiDeviceContext,

  // Integration hooks and callbacks
  AuthenticationIntegrationHooks,
  BiometricVerificationResult,
  SecurityEvent,
  RiskAssessmentContext,
  DeviceHandoffContext,
  DeviceSyncContext,

  // Session management for encrypted data
  EncryptedDataSessionManager,
  EncryptedSession,
  SessionValidationResult,
  SessionDataKey,
  DataAccessResult,
  SessionHealthStatus,
  ActiveSessionInfo,
  SessionRiskAssessment,

  // Event logging for audit trail
  SecurityEventLogger,
  ComplianceEventLogger,
  ForensicEventLogger,
  AuthenticationEvent,
  SecurityEvent as SecurityEventType,
  DataAccessEvent,
  SystemEvent,
  GDPREvent,
  HIPAAEvent,
  DataProcessingEvent,
  ConsentEvent,
  ForensicEvent,

  // Crypto core integration
  CryptoCoreAuthIntegration,
  AuthenticationKeyDerivation,
  HardwareSecurityIntegration,
  SessionCryptoManager,
  DeviceCryptoManager,
  UserMasterKey,
  SessionKey,
  DeviceKey,
  AuthenticationKeyPair,
  RecoveryKeySet,
} from './types.js';

export type {
  // Session management types
  SessionTransferResult,
  DeviceSessionSyncResult,
  SessionRecoveryManager,
  SessionAnalytics,
  SessionAutomation,
  EmergencySession,
  EmergencyAccessResult,

  // Data access and compliance
  DataType,
  DataAccessPurpose,
  DataOperation,
  DataAccessLevel,
  ComplianceFlags,
  DataRetentionPolicy,

  // Session security and monitoring
  SecurityWarning,
  SessionAnomaly,
  HealthRecommendation,
  RiskCategory,
  RiskFactor,
  RiskMitigation,
  SecurityAction,

  // Performance and analytics
  SessionUsageMetrics,
  DataAccessPattern,
  SessionSecurityAnalysis,
  SessionPerformanceMetrics,
  SessionEfficiencyAnalysis,
  SessionComplianceReport,
  DataRetentionValidation,

  // Automation policies
  AutoRefreshPolicy,
  SessionSyncPolicy,
  SessionCleanupPolicy,
  ThreatResponsePolicy,
  AnomalyDetectionPolicy,
  ComplianceMonitoringPolicy,
} from './session-management.js';

export type {
  // Event logging core types
  BaseEvent,
  LoggedEvent,
  EventIntegrity,
  PrivacySettings,
  DeviceEventInfo,
  LocationEventInfo,
  SecurityEventContext,

  // Query and analysis
  EventQueryFilters,
  EventPatternQuery,
  EventPatternAnalysis,
  EventAnomalyReport,
  AnomalyDetectionQuery,

  // Compliance and forensics
  ComplianceReport,
  ComplianceExport,
  ComplianceExportFilters,
  ForensicSnapshot,
  EventTimeline,
  EventEvidence,
  EventChainEvidence,
  ForensicReport,

  // Event types and enums
  EventType,
  SecuritySeverity,
  ThreatType,
  AttackVector,
  DetectionMethod,
  ImpactLevel,
  DataExposureRisk,
  ComplianceFramework,
  ComplianceStatus,

  // Advanced event types
  TimelineReconstructionQuery,
  CorrelationAnalysisQuery,
  ForensicReportQuery,
  ChainOfCustodyRecord,
  ForensicAnalysisResult,
  EvidenceType,
  EvidenceQuality,
} from './event-logging.js';

export type {
  // Crypto core integration interfaces
  UserRootKey,
  ContextKey,
  SessionBoundKey,
  DeviceSpecificKey,
  ChildKey,

  // Hardware security integration
  HardwareCapabilities,
  SecureEnclaveKey,
  TPMKey,
  StrongBoxKey,
  BiometricProtectedKey,
  HardwareKeyReference,
  HardwareValidationResult,

  // Session crypto management
  SessionEncryptionContext,
  EncryptedSessionData,
  ForwardSecrecyContext,

  // Device and cross-device crypto
  SecureDeviceChannel,
  DeviceTrustResult,

  // Key management results
  KeyRotationResult,
  KeySyncResult,
  KeyTransferResult,
  KeyRecoveryResult,
  KeyIntegrityResult,
  KeyUsageAudit,
  KeyPurgeResult,

  // Key types and enums
  KeyPurpose,
  DeviceKeyType,
  KeyType,
  KeyRotationReason,
  KeyStrength,
  KeyProtectionLevel,
  CryptoAlgorithm,
  AsymmetricCryptoAlgorithm,
  SymmetricCryptoAlgorithm,

  // Hardware and biometric types
  BiometricType,
  BiometricFallback,
  HardwareKeyType,
  AttestationFormat,
  StrongBoxSecurityLevel,

  // Recovery and trust
  RecoveryMethod,
  DeviceTrustMethod,
  TrustRevocationReason,
} from './crypto-core-hooks.js';

// Helper functions and utilities for integration
export const IntegrationUtils = {
  /**
   * Create a basic authentication context for testing or development
   */
  createMockAuthenticationContext: (
    userId: string,
    deviceId: string,
    authMethod: AuthenticationMethod = 'passkey'
  ): AuthenticationContext => ({
    userId,
    deviceId,
    sessionId: `session-${Date.now()}`,
    authMethod,
    authTimestamp: new Date(),
    deviceInfo: {
      deviceId,
      deviceFingerprint: `fp-${deviceId}`,
      platform: 'web' as const,
      hardwareSecurityModule: false,
      secureEnclave: false,
      strongbox: false,
      keyStorageMethod: 'browser_crypto' as const,
      keyDerivationSupported: true,
      biometricKeyProtection: false,
      deviceSalt: Buffer.from(`salt-${deviceId}`).toString('base64'),
      supportsKeyRotation: true,
    },
    hardwareBacking: {
      available: false,
      type: 'none' as const,
      attestationSupported: false,
      keyProtectionLevel: 'software' as const,
    },
    keyDerivationContext: {
      userId,
      userKeyId: `user-key-${userId}`,
      deviceId,
      deviceSalt: Buffer.from(`salt-${deviceId}`).toString('base64'),
      authMethod,
      authTimestamp: new Date(),
      sessionId: `session-${Date.now()}`,
      keyDerivationFunction: 'pbkdf2' as const,
      masterSalt: Buffer.from('master-salt').toString('base64'),
      contextSalt: Buffer.from(`context-${userId}-${deviceId}`).toString('base64'),
      keyLevel: 'session' as const,
      keyPurpose: 'encryption' as const,
      algorithm: 'AES-256-GCM',
      keyLength: 256,
    },
    securityContext: {
      sessionId: `session-${Date.now()}`,
      securityLevel: 'standard' as const,
      authenticationStrength: {
        factor1: {
          type: 'possession' as const,
          method: authMethod,
          strength: 'strong' as const,
          hardwareBacked: false,
          verifiedAt: new Date(),
        },
        overallStrength: 'strong' as const,
        nistLevel: 'aal2' as const,
      },
      multiFactorComplete: false,
      biometricVerified: false,
      hardwareVerified: false,
      sessionToken: `token-${Date.now()}`,
      tokenType: 'jwt' as const,
      expiresAt: new Date(Date.now() + 3600000),
      maxLifetime: 3600000,
      riskLevel: 'low' as const,
      riskFactors: [],
      maxConcurrentSessions: 5,
      currentSessionCount: 1,
      otherSessionIds: [],
    },
    auditContext: {
      eventId: `event-${Date.now()}`,
      correlationId: `corr-${Date.now()}`,
      userId,
      sessionId: `session-${Date.now()}`,
      deviceId,
      ipAddress: '127.0.0.1',
      userAgent: 'MockUserAgent/1.0',
      securityLevel: 'low' as const,
      riskLevel: 'low' as const,
      gdprRelevant: true,
      hipaaRelevant: false,
      auditChainId: `chain-${Date.now()}`,
      integrityHash: Buffer.from('mock-hash').toString('base64'),
      piiSanitized: true,
      pseudonymizationApplied: false,
      retentionPeriod: 365,
    },
  }),

  /**
   * Validate authentication context structure
   */
  validateAuthenticationContext: (context: AuthenticationContext): boolean => {
    return !!(
      context.userId &&
      context.deviceId &&
      context.sessionId &&
      context.authMethod &&
      context.authTimestamp &&
      context.deviceInfo &&
      context.hardwareBacking &&
      context.keyDerivationContext &&
      context.securityContext &&
      context.auditContext
    );
  },

  /**
   * Extract key derivation parameters from authentication context
   */
  extractKeyDerivationParams: (context: AuthenticationContext) => ({
    userId: context.userId,
    deviceId: context.deviceId,
    authMethod: context.authMethod,
    deviceSalt: context.deviceInfo.deviceSalt,
    sessionId: context.sessionId,
    keyDerivationFunction: context.keyDerivationContext.keyDerivationFunction,
    masterSalt: context.keyDerivationContext.masterSalt,
    contextSalt: context.keyDerivationContext.contextSalt,
  }),

  /**
   * Create session security context from authentication context
   */
  createSessionSecurityContext: (
    authContext: AuthenticationContext,
    sessionToken: string
  ): SessionSecurityContext => ({
    ...authContext.securityContext,
    sessionToken,
  }),

  /**
   * Generate audit context for events
   */
  generateAuditContext: (
    userId: string,
    sessionId: string,
    deviceId: string,
    eventType: string
  ): AuditContext => ({
    eventId: `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    correlationId: `corr-${sessionId}`,
    userId,
    sessionId,
    deviceId,
    ipAddress: '0.0.0.0', // Should be populated by actual implementation
    userAgent: 'Unknown', // Should be populated by actual implementation
    securityLevel: 'medium' as const,
    riskLevel: 'low' as const,
    gdprRelevant: true,
    hipaaRelevant: false,
    auditChainId: `chain-${userId}`,
    integrityHash: Buffer.from(`integrity-${Date.now()}`).toString('base64'),
    piiSanitized: true,
    pseudonymizationApplied: false,
    retentionPeriod: 365,
  }),
};

// Common types re-exported for convenience
export type { AuthenticationMethod, RiskLevel, AuthenticationError, TimeRange } from './types.js';
