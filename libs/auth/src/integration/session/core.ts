/**
 * Session Management Core Interfaces and Data Structures
 */

import type {
  EncryptedSession,
  SessionValidationResult as SessionValidationBase,
  DataAccessResult as DataAccessBase,
  SessionDataKey,
  DataType,
  DataAccessPurpose,
  DataOperation,
} from './types.js';

export interface SessionValidationResult {
  valid: boolean;
  sessionId: string;
  userId: string;

  // Validation details
  tokenValid: boolean;
  signatureValid: boolean;
  notExpired: boolean;
  deviceTrusted: boolean;
  riskAcceptable: boolean;

  // Session state
  remainingTime: number;
  needsRefresh: boolean;
  needsReauthentication: boolean;

  // Security warnings
  securityWarnings: SecurityWarning[];
  riskFactors: string[];

  // Updated context
  updatedContext?: SessionSecurityContext;
}

export interface SessionTransferResult {
  success: boolean;
  newSessionId: string;
  transferToken: string;

  // Transfer details
  sourceDeviceId: string;
  targetDeviceId: string;
  transferredAt: Date;

  // Security verification
  securityVerified: boolean;
  deviceVerified: boolean;
  userConfirmed: boolean;

  // Session continuity
  dataAccessMaintained: boolean;
  keysMigrated: boolean;
  auditTrailContinuous: boolean;
}

export interface DeviceSessionSyncResult {
  synchronized: boolean;
  syncTimestamp: Date;

  // Sync details
  deviceCount: number;
  syncedDevices: string[];
  failedDevices: DeviceSyncFailure[];

  // Data consistency
  consistencyVerified: boolean;
  conflictsResolved: number;
  syncIntegrityHash: string;

  // Security validation
  allDevicesTrusted: boolean;
  encryptionMaintained: boolean;
  auditTrailPreserved: boolean;
}

export interface SessionDataKey {
  keyId: string;
  sessionId: string;

  // Key properties
  key: string; // Base64 encoded
  algorithm: string;
  keyLength: number;

  // Access control
  dataType: DataType;
  accessPurpose: DataAccessPurpose;
  allowedOperations: DataOperation[];

  // Key lifecycle
  derivedAt: Date;
  expiresAt: Date;
  usageCount: number;
  maxUsage: number;

  // Key derivation context
  derivationContext: KeyDerivationContext;
  parentKeyId?: string;

  // Security properties
  hardwareDerived: boolean;
  sessionBound: boolean;
  deviceBound: boolean;
}

export interface DataAccessResult {
  allowed: boolean;
  sessionId: string;
  resourceId: string;
  operation: DataOperation;

  // Access details
  accessGrantedAt: Date;
  expiresAt: Date;
  accessDuration: number;

  // Authorization context
  authorizationLevel: DataAccessLevel;
  restrictions: DataAccessRestriction[];
  conditions: AccessCondition[];

  // Compliance validation
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
  consentValidated: boolean;
  legalBasisValid: boolean;

  // Audit information
  auditTrailId: string;
  accessJustification: string;
  riskAssessment: DataAccessRisk;

  // Data handling requirements
  encryptionRequired: boolean;
  retentionPolicy: DataRetentionPolicy;
  sharingRestrictions: DataSharingRestriction[];
}

// Supporting Types
export interface SecurityWarning {
  type: SecurityWarningType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendations: string[];
}

export interface DeviceSyncFailure {
  deviceId: string;
  reason: string;
  retryable: boolean;
  lastAttempt: Date;
}

export interface DataAccessRestriction {
  type: 'temporal' | 'conditional' | 'purpose' | 'geographic';
  description: string;
  enforced: boolean;
}

export interface AccessCondition {
  condition: string;
  satisfied: boolean;
  required: boolean;
}

export interface DataAccessRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  mitigations: string[];
}

export interface DataSharingRestriction {
  scope: 'internal' | 'external' | 'healthcare' | 'research';
  allowed: boolean;
  conditions: string[];
}

export type SecurityWarningType =
  | 'unusual_location'
  | 'new_device'
  | 'session_extended'
  | 'elevated_risk'
  | 'compliance_concern';

// Forward declarations
export interface SessionSecurityContext {}
export interface KeyDerivationContext {}
export interface DataAccessLevel {}
export interface DataRetentionPolicy {}
