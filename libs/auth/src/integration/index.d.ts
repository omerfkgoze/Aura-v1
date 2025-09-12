/**
 * Authentication Integration - Main Export File
 * Central export point for all authentication integration components
 */
export * from './types/index.js';
export * from './session/index.js';
export * from './event-logging/index.js';
export * from './crypto-core-hooks.js';
export type {
  AuthenticationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  KeyDerivationContext,
  SessionSecurityContext,
  AuditContext,
  MultiDeviceContext,
  DeviceRegistration,
  AuthenticationHandoff,
  EncryptedDataSessionManager,
  EncryptedSession,
  SessionHealthStatus,
  SecurityEventLogger,
  ComplianceEventLogger,
  ForensicEventLogger,
} from './types/index.js';
