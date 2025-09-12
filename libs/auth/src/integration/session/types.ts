/**
 * Session Management Types and Core Interfaces
 */

import type {
  AuthenticationContext,
  SessionSecurityContext,
  KeyDerivationContext,
  MultiDeviceContext,
  DeviceKeyInfo,
  RiskLevel,
  AuthenticationMethod,
  AuditContext,
  GeolocationData,
} from '../types.js';

// Core Session Management Interface
export interface EncryptedDataSessionManager {
  // Session lifecycle
  createEncryptedSession(authContext: AuthenticationContext): Promise<EncryptedSession>;
  validateEncryptedSession(sessionToken: string): Promise<SessionValidationResult>;
  refreshEncryptedSession(sessionId: string, refreshToken: string): Promise<EncryptedSession>;
  terminateEncryptedSession(sessionId: string, reason: SessionTerminationReason): Promise<void>;

  // Cross-device session management
  synchronizeSessionAcrossDevices(
    sessionId: string,
    deviceIds: string[]
  ): Promise<DeviceSessionSyncResult>;
  transferSessionToDevice(
    sessionId: string,
    targetDeviceId: string
  ): Promise<SessionTransferResult>;

  // Session-based data access
  getDataAccessKey(
    sessionId: string,
    dataType: DataType,
    purpose: DataAccessPurpose
  ): Promise<SessionDataKey>;
  validateDataAccess(
    sessionId: string,
    resourceId: string,
    operation: DataOperation
  ): Promise<DataAccessResult>;

  // Session monitoring
  getSessionHealth(sessionId: string): Promise<SessionHealthStatus>;
  getActiveSessions(userId: string): Promise<ActiveSessionInfo[]>;
  getSessionRiskAssessment(sessionId: string): Promise<SessionRiskAssessment>;
}

export interface EncryptedSession {
  // Session identity
  sessionId: string;
  userId: string;
  deviceId: string;

  // Session security
  sessionToken: string;
  refreshToken: string;
  encryptionKey: string;
  signingKey: string;

  // Session metadata
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  maxIdleTime: number;

  // Authentication context
  authMethod: AuthenticationMethod;
  authStrength: number;
  hardwareVerified: boolean;
  biometricVerified: boolean;

  // Data access capabilities
  dataAccessLevel: DataAccessLevel;
  allowedDataTypes: DataType[];
  dataRetentionPolicy: DataRetentionPolicy;

  // Cross-device context
  deviceSyncEnabled: boolean;
  syncEncryptionKey?: string;
  trustedDevices: string[];

  // Risk and compliance
  riskLevel: RiskLevel;
  complianceFlags: ComplianceFlags;
  auditTrailId: string;
}

// Supporting Types
export interface SessionValidationResult {
  valid: boolean;
  reason?: SessionValidationFailureReason;
  session?: EncryptedSession;
  requiresRefresh: boolean;
  securityWarnings: SessionSecurityWarning[];
}

export interface SessionDataKey {
  keyId: string;
  encryptedKey: string;
  keyPurpose: DataAccessPurpose;
  dataType: DataType;
  expiresAt: Date;
  accessRestrictions: DataAccessRestriction[];
}

export interface DataAccessResult {
  allowed: boolean;
  reason?: string;
  restrictions: DataAccessRestriction[];
  auditInfo: DataAccessAuditInfo;
  complianceValidated: boolean;
}

// Enums and Type Definitions
export type SessionTerminationReason =
  | 'user_logout'
  | 'timeout'
  | 'security_violation'
  | 'device_change'
  | 'policy_violation'
  | 'admin_termination';

export type DataType =
  | 'health_data'
  | 'cycle_data'
  | 'symptoms'
  | 'medications'
  | 'user_preferences';

export type DataAccessPurpose = 'read_display' | 'edit_update' | 'analytics' | 'sharing' | 'backup';

export type DataOperation = 'read' | 'write' | 'delete' | 'share' | 'export';

export type DataAccessLevel = 'restricted' | 'standard' | 'full' | 'administrative';

export type SessionValidationFailureReason =
  | 'token_expired'
  | 'token_invalid'
  | 'session_not_found'
  | 'device_mismatch'
  | 'security_violation';

// Supporting interfaces will be in separate files
export interface DeviceSessionSyncResult {}
export interface SessionTransferResult {}
export interface SessionHealthStatus {}
export interface ActiveSessionInfo {}
export interface SessionRiskAssessment {}
export interface DataRetentionPolicy {}
export interface ComplianceFlags {}
export interface SessionSecurityWarning {}
export interface DataAccessRestriction {}
export interface DataAccessAuditInfo {}
