/**
 * Integration Types - Main Export File
 * Central exports for authentication integration types
 */
export * from './authentication-context.js';
export * from './multi-device.js';
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
