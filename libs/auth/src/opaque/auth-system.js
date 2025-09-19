/**
 * OPAQUE Authentication System Factory
 *
 * Creates complete OPAQUE authentication system with all components
 */
import { createOpaqueClient } from './client';
import { createOpaqueServer } from './server';
import { OpaqueSessionManager, executeOpaqueAuthentication } from './authentication';
import { executeOpaqueRegistration } from './registration';
// Import constants
const OPAQUE_CONSTANTS = {
  DEFAULT_SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_MAX_ATTEMPTS: 5,
};
/**
 * Create complete OPAQUE authentication system
 */
export function createOpaqueAuthSystem(config) {
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
    async register(username, password, userId) {
      return executeOpaqueRegistration(client, server, username, password, userId);
    },
    async authenticate(username, password) {
      return executeOpaqueAuthentication(client, server, username, password);
    },
    async validateSession(sessionKey) {
      return sessionManager.validateSession(sessionKey);
    },
    async logout(sessionKey) {
      return sessionManager.revokeSession(sessionKey);
    },
    async logoutAll(userId) {
      return sessionManager.revokeAllUserSessions(userId);
    },
  };
}
//# sourceMappingURL=auth-system.js.map
