/**
 * OPAQUE Authentication System Factory
 *
 * Creates complete OPAQUE authentication system with all components
 */
import { __awaiter } from 'tslib';
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
    serverUrl:
      (config === null || config === void 0 ? void 0 : config.serverUrl) || '/api/auth/opaque',
    timeout: 30000,
    retryAttempts: 3,
  });
  const server = createOpaqueServer({
    sessionTimeoutMs:
      (config === null || config === void 0 ? void 0 : config.sessionTimeoutMs) ||
      OPAQUE_CONSTANTS.DEFAULT_SESSION_TIMEOUT_MS,
    rateLimitWindowMs:
      (config === null || config === void 0 ? void 0 : config.rateLimitWindowMs) ||
      OPAQUE_CONSTANTS.DEFAULT_RATE_LIMIT_WINDOW_MS,
    rateLimitMaxAttempts:
      (config === null || config === void 0 ? void 0 : config.maxAttempts) ||
      OPAQUE_CONSTANTS.DEFAULT_MAX_ATTEMPTS,
  });
  const sessionManager = new OpaqueSessionManager(server);
  return {
    client,
    server,
    sessionManager,
    // Convenience methods
    register(username, password, userId) {
      return __awaiter(this, void 0, void 0, function* () {
        return executeOpaqueRegistration(client, server, username, password, userId);
      });
    },
    authenticate(username, password) {
      return __awaiter(this, void 0, void 0, function* () {
        return executeOpaqueAuthentication(client, server, username, password);
      });
    },
    validateSession(sessionKey) {
      return __awaiter(this, void 0, void 0, function* () {
        return sessionManager.validateSession(sessionKey);
      });
    },
    logout(sessionKey) {
      return __awaiter(this, void 0, void 0, function* () {
        return sessionManager.revokeSession(sessionKey);
      });
    },
    logoutAll(userId) {
      return __awaiter(this, void 0, void 0, function* () {
        return sessionManager.revokeAllUserSessions(userId);
      });
    },
  };
}
//# sourceMappingURL=auth-system.js.map
