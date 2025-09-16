/**
 * Session Management Integration - Main Export File
 * Central exports for session management system
 */
export type {
  EncryptedDataSessionManager,
  EncryptedSession,
  SessionValidationResult as SessionValidationResultFromTypes,
  SessionDataKey as SessionDataKeyFromTypes,
  DataAccessResult as DataAccessResultFromTypes,
  DataType,
  DataAccessPurpose,
  DataOperation,
  DataAccessLevel,
  DataRetentionPolicy,
  DataAccessRestriction,
} from './types.js';
export type {
  SessionManager,
  SessionValidationResult,
  SessionDataKey,
  DataAccessResult,
  SessionTransferResult,
  DeviceSessionSyncResult,
  SessionSecurityContext,
  KeyDerivationContext,
} from './core.js';
export type {
  SessionMonitor,
  SessionSecurityMetrics,
  SessionHealthStatus,
  SessionRiskAssessment,
  RiskFactor,
  LocationRiskFactor,
  RiskFactorType,
} from './monitoring.js';
