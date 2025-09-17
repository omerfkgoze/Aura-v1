/**
 * OPAQUE Authentication Manager
 *
 * This module provides a high-level manager for OPAQUE authentication
 * with fallback support and integration with Passkeys.
 */
import { __awaiter } from 'tslib';
import { createOpaqueClient } from './client';
import { createOpaqueServer } from './server';
import { OpaqueSessionManager } from './authentication';
import { executeOpaqueRegistration } from './registration';
import { executeOpaqueAuthentication } from './authentication';
import { validateRegistrationInputs } from './registration';
import { validateAuthenticationInputs } from './authentication';
import { checkUsernameAvailability } from './registration';
/**
 * Default manager configuration
 */
const DEFAULT_MANAGER_CONFIG = {
  fallbackEnabled: true,
  autoCleanupInterval: 5 * 60 * 1000, // 5 minutes
};
/**
 * OPAQUE Authentication Manager
 *
 * Provides unified interface for OPAQUE authentication with Passkeys fallback
 */
export class OpaqueManager {
  constructor(config) {
    // User context cache
    this.userContexts = new Map();
    this.config = Object.assign(Object.assign({}, DEFAULT_MANAGER_CONFIG), config);
    this.client = createOpaqueClient(this.config.client);
    this.server = createOpaqueServer(this.config.server);
    this.sessionManager = new OpaqueSessionManager(this.server);
    // Start automatic cleanup if configured
    if (this.config.autoCleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.config.autoCleanupInterval);
    }
  }
  /**
   * Register user with OPAQUE protocol
   */
  registerUser(username, password, userId, options) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const opts = Object.assign({ validateInputs: true, checkAvailability: true }, options);
        // Validate inputs if requested
        if (opts.validateInputs) {
          const validation = validateRegistrationInputs(username, password);
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.errors.join(', '),
            };
          }
        }
        // Check username availability if requested
        if (opts.checkAvailability) {
          const availability = yield checkUsernameAvailability(this.server, username);
          if (!availability.available) {
            return {
              success: false,
              error: `Username not available${availability.suggestion ? `. Try: ${availability.suggestion}` : ''}`,
            };
          }
        }
        // Execute OPAQUE registration
        const result = yield executeOpaqueRegistration(
          this.client,
          this.server,
          username,
          password,
          userId,
          this.config.registration
        );
        if (result.success) {
          // Create user context
          const userContext = {
            userId,
            username,
            preferredAuthMethod: 'opaque',
            hasPasskey: false, // Will be updated when Passkey is registered
            hasOpaqueRegistration: true,
            lastAuthMethod: 'opaque',
            lastAuthTime: new Date(),
          };
          this.userContexts.set(username, userContext);
          this.userContexts.set(userId, userContext);
          return Object.assign(Object.assign({}, result), { userContext });
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        };
      }
    });
  }
  /**
   * Authenticate user with OPAQUE protocol
   */
  authenticateUser(username, password, options) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const opts = Object.assign({ validateInputs: true, rememberMe: false }, options);
        // Validate inputs if requested
        if (opts.validateInputs) {
          const validation = validateAuthenticationInputs(username, password);
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.errors.join(', '),
            };
          }
        }
        // Execute OPAQUE authentication
        const authConfig = Object.assign(Object.assign({}, this.config.authentication), {
          rememberMe: opts.rememberMe,
        });
        const result = yield executeOpaqueAuthentication(
          this.client,
          this.server,
          username,
          password,
          authConfig
        );
        if (result.success && result.sessionKey && result.userId) {
          // Store session
          this.sessionManager.storeSession(
            result.sessionKey,
            result.userId,
            username,
            result.exportKey || '',
            result.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
          );
          // Update user context
          let userContext = this.getUserContext(username);
          if (!userContext) {
            userContext = {
              userId: result.userId,
              username,
              preferredAuthMethod: 'opaque',
              hasPasskey: false,
              hasOpaqueRegistration: true,
            };
          }
          userContext.lastAuthMethod = 'opaque';
          userContext.lastAuthTime = new Date();
          this.userContexts.set(username, userContext);
          this.userContexts.set(result.userId, userContext);
          return Object.assign(Object.assign({}, result), { userContext });
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        };
      }
    });
  }
  /**
   * Determine best authentication method for user
   */
  getRecommendedAuthMethod(username) {
    return __awaiter(this, void 0, void 0, function* () {
      const userContext = this.getUserContext(username);
      if (!userContext) {
        return {
          method: 'opaque',
          reason: 'New user - OPAQUE registration required',
          fallbackAvailable: false,
        };
      }
      // Check if user has Passkeys enabled
      if (userContext.hasPasskey) {
        return {
          method: 'passkey',
          reason: 'Passkey available - most secure option',
          fallbackAvailable: userContext.hasOpaqueRegistration,
        };
      }
      // Fall back to OPAQUE
      if (userContext.hasOpaqueRegistration) {
        return {
          method: 'opaque',
          reason: 'OPAQUE available - secure password-based authentication',
          fallbackAvailable: false,
        };
      }
      return {
        method: 'opaque',
        reason: 'Registration required',
        fallbackAvailable: false,
      };
    });
  }
  /**
   * Validate existing session
   */
  validateSession(sessionKey) {
    return __awaiter(this, void 0, void 0, function* () {
      const validation = yield this.sessionManager.validateSession(sessionKey);
      if (!validation.isValid) {
        return { isValid: false };
      }
      const userContext = validation.username
        ? this.getUserContext(validation.username)
        : undefined;
      const result = Object.assign({}, validation);
      if (userContext) {
        result.userContext = userContext;
      }
      return result;
    });
  }
  /**
   * Logout user
   */
  logout(sessionKey) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this.sessionManager.revokeSession(sessionKey);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Logout failed',
        };
      }
    });
  }
  /**
   * Logout all sessions for user
   */
  logoutAll(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this.sessionManager.revokeAllUserSessions(userId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Logout all failed',
        };
      }
    });
  }
  /**
   * Get user context by username or userId
   */
  getUserContext(identifier) {
    return this.userContexts.get(identifier);
  }
  /**
   * Update user context (e.g., when Passkey is registered)
   */
  updateUserContext(identifier, updates) {
    const existing = this.userContexts.get(identifier);
    if (!existing) return false;
    const updated = Object.assign(Object.assign({}, existing), updates);
    // Update both username and userId mappings
    this.userContexts.set(existing.username, updated);
    this.userContexts.set(existing.userId, updated);
    return true;
  }
  /**
   * Delete user account and all associated data
   */
  deleteUser(username) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const userContext = this.getUserContext(username);
        if (!userContext) {
          return { success: false, error: 'User not found' };
        }
        // Delete from server
        yield this.server.deleteUser(username);
        // Revoke all sessions
        yield this.sessionManager.revokeAllUserSessions(userContext.userId);
        // Remove from context cache
        this.userContexts.delete(username);
        this.userContexts.delete(userContext.userId);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'User deletion failed',
        };
      }
    });
  }
  /**
   * Get active session statistics
   */
  getSessionStats() {
    return {
      totalSessions: this.sessionManager.getActiveSessionCount(),
      userContexts: this.userContexts.size,
      serverSessions: this.sessionManager.getActiveSessionCount(),
    };
  }
  /**
   * Cleanup expired sessions and contexts
   */
  cleanup() {
    this.sessionManager.cleanup();
    // Clean up stale user contexts (optional)
    const staleThreshold = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [key, context] of this.userContexts.entries()) {
      if (context.lastAuthTime && context.lastAuthTime.getTime() < staleThreshold) {
        this.userContexts.delete(key);
      }
    }
  }
  /**
   * Shutdown manager and cleanup resources
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.cleanup();
  }
}
/**
 * Create and configure OPAQUE manager
 */
export function createOpaqueManager(config) {
  return new OpaqueManager(config);
}
//# sourceMappingURL=manager.js.map
