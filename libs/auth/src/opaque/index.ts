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
export { OpaqueServerImpl, createOpaqueServer, type OpaqueServerConfig } from './server';

// Registration flow
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

// Authentication flow
export {
  OpaqueAuthenticationFlow,
  OpaqueSessionManager,
  executeOpaqueAuthentication,
  validateAuthenticationInputs,
  type OpaqueAuthenticationConfig,
  type AuthenticationFlowResult,
  type AuthenticationFlowState,
} from './authentication';

// Fallback authentication manager
export { OpaqueManager, createOpaqueManager } from './manager';

// Migration utilities
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
} as const;

/**
 * Create complete OPAQUE authentication system
 */
export function createOpaqueAuthSystem(config?: {
  serverUrl?: string;
  sessionTimeoutMs?: number;
  rateLimitWindowMs?: number;
  maxAttempts?: number;
}) {
  const client = createOpaqueClient({
    serverUrl: config?.serverUrl || '/api/auth/opaque',
    timeout: 30000,
    retryAttempts: 3,
  });

  const server = createOpaqueServer({
    sessionTimeoutMs: config?.sessionTimeoutMs || OPAQUE_CONSTANTS.DEFAULT_SESSION_TIMEOUT_MS,
    rateLimitWindowMs: config?.rateLimitWindowMs || OPAQUE_CONSTANTS.DEFAULT_RATE_LIMIT_WINDOW_MS,
    rateLimitMaxAttempts: config?.maxAttempts || OPAQUE_CONSTANTS.DEFAULT_MAX_ATTEMPTS,
  });

  const sessionManager = new OpaqueSessionManager(server);

  return {
    client,
    server,
    sessionManager,

    // Convenience methods
    async register(username: string, password: string, userId: string) {
      return executeOpaqueRegistration(client, server, username, password, userId);
    },

    async authenticate(username: string, password: string) {
      return executeOpaqueAuthentication(client, server, username, password);
    },

    async validateSession(sessionKey: string) {
      return sessionManager.validateSession(sessionKey);
    },

    async logout(sessionKey: string) {
      return sessionManager.revokeSession(sessionKey);
    },

    async logoutAll(userId: string) {
      return sessionManager.revokeAllUserSessions(userId);
    },
  };
}
