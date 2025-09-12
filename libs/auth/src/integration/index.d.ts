/**
 * Authentication Integration - Main Export File
 * Central export point for all authentication integration components
 */
export {
  AuthenticationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  KeyDerivationContext,
  SessionSecurityContext,
  AuditContext,
  AuthenticationMethod,
  SecurityLevel,
  RiskLevel,
} from './types/authentication-context.js';
export {
  MultiDeviceContext,
  DeviceRegistration,
  DevicePendingRegistration,
  SecureDeviceChannel,
  AuthenticationHandoff,
  DeviceKeyInfo,
} from './types/multi-device.js';
export {
  SessionManager,
  SessionValidationResult,
  DataAccessResult,
  SessionDataKey,
} from './session/core.js';
export {
  SessionMonitor,
  SessionHealthStatus as SessionHealth,
  SessionSecurityMetrics,
  SessionRiskAssessment,
  RiskFactor as SessionRiskFactor,
  LocationRiskFactor,
  RiskFactorType,
} from './session/monitoring.js';
export {
  SecurityEventLogger,
  SecurityEvent,
  AuthenticationEvent,
  SessionEvent,
  DeviceEvent,
} from './event-logging/security-events.js';
export {
  ComplianceEventLogger,
  ComplianceEvent,
  AuditEvent,
  ComplianceFramework as AuditComplianceFramework,
} from './event-logging/compliance-reporting.js';
export {
  DataEventLogger,
  DataEvent,
  DataAccessEvent,
  DataModificationEvent,
} from './event-logging/data-events.js';
export * from './crypto-core-hooks.js';
