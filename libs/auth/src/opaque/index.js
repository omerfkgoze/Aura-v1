/**
 * OPAQUE Protocol Implementation
 *
 * This module provides a complete OPAQUE protocol implementation for
 * zero-knowledge password authentication without server-side password storage.
 *
 * OPAQUE eliminates server-side password storage by using a cryptographic
 * protocol that allows the server to verify passwords without ever seeing them.
 */
// Type definitions
export * from './types';
// Client implementation
export { OpaqueClientImpl, createOpaqueClient, validateUsername, validatePassword } from './client';
// Server implementation
export { OpaqueServerImpl, createOpaqueServer } from './server';
// Registration flow
export {
  OpaqueRegistrationFlow,
  executeOpaqueRegistration,
  validateRegistrationInputs,
  checkUsernameAvailability,
  generateUsernameSuffix,
} from './registration';
// Authentication flow
export {
  OpaqueAuthenticationFlow,
  OpaqueSessionManager,
  executeOpaqueAuthentication,
  validateAuthenticationInputs,
} from './authentication';
// Fallback authentication manager
export { OpaqueManager, createOpaqueManager } from './manager';
// Migration utilities
export {
  AuthMigrationManager,
  createAuthMigrationManager,
  shouldRecommendMigration,
} from './migration';
/**
 * OPAQUE Protocol Version
 */
export const OPAQUE_VERSION = '1.0.0';
/**
 * OPAQUE Protocol Constants
 */
export const OPAQUE_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 255,
  DEFAULT_SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_MAX_ATTEMPTS: 5,
};
// Auth System Factory
export { createOpaqueAuthSystem } from './auth-system';
//# sourceMappingURL=index.js.map
