/**
 * Authentication Integration - Main Export File
 * Central export point for all authentication integration components
 */

// Core integration types
export * from './types/index.js';

// Session management
export * from './session/index.js';

// Event logging
export * from './event-logging/index.js';

// Crypto core integration hooks (if exists)
export * from './crypto-core-hooks.js';

// Re-export key interfaces for convenience
export type {
  // Authentication context
  AuthenticationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  KeyDerivationContext,
  SessionSecurityContext,
  AuditContext,

  // Multi-device
  MultiDeviceContext,
  DeviceRegistration,
  AuthenticationHandoff,

  // Session management
  EncryptedDataSessionManager,
  EncryptedSession,
  SessionHealthStatus,

  // Event logging
  SecurityEventLogger,
  ComplianceEventLogger,
  ForensicEventLogger,
} from './types/index.js';
