/**
 * OPAQUE Protocol Implementation
 *
 * This module provides a complete OPAQUE protocol implementation for
 * zero-knowledge password authentication without server-side password storage.
 *
 * OPAQUE eliminates server-side password storage by using a cryptographic
 * protocol that allows the server to verify passwords without ever seeing them.
 */
export * from './types';
export { OpaqueClientImpl, createOpaqueClient, validateUsername, validatePassword } from './client';
export { OpaqueServerImpl, createOpaqueServer, type OpaqueServerConfig } from './server';
export {
  OpaqueRegistrationFlow,
  executeOpaqueRegistration,
  validateRegistrationInputs,
  checkUsernameAvailability,
  generateUsernameSuffix,
  type OpaqueRegistrationConfig,
  type RegistrationFlowResult,
  type RegistrationFlowState,
} from './registration';
export {
  OpaqueAuthenticationFlow,
  OpaqueSessionManager,
  executeOpaqueAuthentication,
  validateAuthenticationInputs,
  type OpaqueAuthenticationConfig,
  type AuthenticationFlowResult,
  type AuthenticationFlowState,
} from './authentication';
export { OpaqueManager, createOpaqueManager } from './manager';
export {
  AuthMigrationManager,
  createAuthMigrationManager,
  shouldRecommendMigration,
  type MigrationConfig,
  type UserMigrationStatus,
  type MigrationResult,
} from './migration';
/**
 * OPAQUE Protocol Version
 */
export declare const OPAQUE_VERSION = '1.0.0';
/**
 * OPAQUE Protocol Constants
 */
export declare const OPAQUE_CONSTANTS: {
  readonly MIN_PASSWORD_LENGTH: 8;
  readonly MAX_PASSWORD_LENGTH: 128;
  readonly MIN_USERNAME_LENGTH: 3;
  readonly MAX_USERNAME_LENGTH: 255;
  readonly DEFAULT_SESSION_TIMEOUT_MS: number;
  readonly DEFAULT_RATE_LIMIT_WINDOW_MS: number;
  readonly DEFAULT_MAX_ATTEMPTS: 5;
};
export { createOpaqueAuthSystem } from './auth-system';
