/**
 * Integration Types - Main Export File
 * Central exports for authentication integration types
 */

// Authentication context types
export * from './authentication-context.js';

// Multi-device management types
export * from './multi-device.js';

// Re-export key types for convenience
export type {
  AuthenticationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  KeyDerivationContext,
  SessionSecurityContext,
  AuditContext,
  AuthenticationMethod,
  SecurityLevel,
  RiskLevel,
} from './authentication-context.js';

export type {
  MultiDeviceContext,
  DeviceRegistration,
  DevicePendingRegistration,
  SecureDeviceChannel,
  AuthenticationHandoff,
  DeviceKeyInfo,
} from './multi-device.js';
