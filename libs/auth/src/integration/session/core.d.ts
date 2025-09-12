/**
 * Session Management Core Interfaces and Data Structures
 */
import type { DataType, DataAccessPurpose, DataOperation } from './types.js';
export interface SessionValidationResult {
  valid: boolean;
  sessionId: string;
  userId: string;
  tokenValid: boolean;
  signatureValid: boolean;
  notExpired: boolean;
  deviceTrusted: boolean;
  riskAcceptable: boolean;
  remainingTime: number;
  needsRefresh: boolean;
  needsReauthentication: boolean;
  securityWarnings: SecurityWarning[];
  riskFactors: string[];
  updatedContext?: SessionSecurityContext;
}
export interface SessionTransferResult {
  success: boolean;
  newSessionId: string;
  transferToken: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  transferredAt: Date;
  securityVerified: boolean;
  deviceVerified: boolean;
  userConfirmed: boolean;
  dataAccessMaintained: boolean;
  keysMigrated: boolean;
  auditTrailContinuous: boolean;
}
export interface DeviceSessionSyncResult {
  synchronized: boolean;
  syncTimestamp: Date;
  deviceCount: number;
  syncedDevices: string[];
  failedDevices: DeviceSyncFailure[];
  consistencyVerified: boolean;
  conflictsResolved: number;
  syncIntegrityHash: string;
  allDevicesTrusted: boolean;
  encryptionMaintained: boolean;
  auditTrailPreserved: boolean;
}
export interface SessionDataKey {
  keyId: string;
  sessionId: string;
  key: string;
  algorithm: string;
  keyLength: number;
  dataType: DataType;
  accessPurpose: DataAccessPurpose;
  allowedOperations: DataOperation[];
  derivedAt: Date;
  expiresAt: Date;
  usageCount: number;
  maxUsage: number;
  derivationContext: KeyDerivationContext;
  parentKeyId?: string;
  hardwareDerived: boolean;
  sessionBound: boolean;
  deviceBound: boolean;
}
export interface DataAccessResult {
  allowed: boolean;
  sessionId: string;
  resourceId: string;
  operation: DataOperation;
  accessGrantedAt: Date;
  expiresAt: Date;
  accessDuration: number;
  authorizationLevel: DataAccessLevel;
  restrictions: DataAccessRestriction[];
  conditions: AccessCondition[];
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
  consentValidated: boolean;
  legalBasisValid: boolean;
  auditTrailId: string;
  accessJustification: string;
  riskAssessment: DataAccessRisk;
  encryptionRequired: boolean;
  retentionPolicy: DataRetentionPolicy;
  sharingRestrictions: DataSharingRestriction[];
}
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
export interface SessionSecurityContext {}
export interface KeyDerivationContext {}
export interface DataAccessLevel {}
export interface DataRetentionPolicy {}
