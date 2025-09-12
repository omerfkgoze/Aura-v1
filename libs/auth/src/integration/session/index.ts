/**
 * Session Management Integration - Main Export File
 * Central exports for session management system
 */

// Core session types and interfaces
export * from './types.js';
export * from './core.js';
export * from './monitoring.js';

// Re-export main interfaces for convenience
export type {
  EncryptedDataSessionManager,
  EncryptedSession,
  SessionValidationResult,
  SessionDataKey,
  DataAccessResult,
} from './types.js';

export type {
  SessionHealthStatus,
  ActiveSessionInfo,
  SessionRiskAssessment,
} from './monitoring.js';
