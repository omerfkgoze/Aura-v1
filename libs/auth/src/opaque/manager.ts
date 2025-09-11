/**
 * OPAQUE Authentication Manager
 *
 * This module provides a high-level manager for OPAQUE authentication
 * with fallback support and integration with Passkeys.
 */

import { createOpaqueClient } from './client';
import { createOpaqueServer } from './server';
import { OpaqueSessionManager } from './authentication';
import { executeOpaqueRegistration } from './registration';
import { executeOpaqueAuthentication } from './authentication';
import { validateRegistrationInputs } from './registration';
import { validateAuthenticationInputs } from './authentication';
import { checkUsernameAvailability } from './registration';

import type {
  OpaqueClient,
  OpaqueServer,
  OpaqueClientConfig,
  OpaqueServerConfig,
  RegistrationFlowResult,
  AuthenticationFlowResult,
  OpaqueAuthenticationConfig,
  OpaqueRegistrationConfig,
} from './types';

/**
 * OPAQUE manager configuration
 */
export interface OpaqueManagerConfig {
  client?: Partial<OpaqueClientConfig>;
  server?: Partial<OpaqueServerConfig>;
  registration?: Partial<OpaqueRegistrationConfig>;
  authentication?: Partial<OpaqueAuthenticationConfig>;
  fallbackEnabled: boolean;
  autoCleanupInterval?: number; // ms
}

/**
 * Default manager configuration
 */
const DEFAULT_MANAGER_CONFIG: OpaqueManagerConfig = {
  fallbackEnabled: true,
  autoCleanupInterval: 5 * 60 * 1000, // 5 minutes
};

/**
 * Authentication method preference
 */
export type AuthMethod = 'passkey' | 'opaque' | 'auto';

/**
 * User authentication context
 */
export interface UserAuthContext {
  userId: string;
  username: string;
  preferredAuthMethod: AuthMethod;
  hasPasskey: boolean;
  hasOpaqueRegistration: boolean;
  lastAuthMethod?: AuthMethod;
  lastAuthTime?: Date;
}

/**
 * OPAQUE Authentication Manager
 *
 * Provides unified interface for OPAQUE authentication with Passkeys fallback
 */
export class OpaqueManager {
  private client: OpaqueClient;
  private server: OpaqueServer;
  private sessionManager: OpaqueSessionManager;
  private config: OpaqueManagerConfig;
  private cleanupInterval?: NodeJS.Timeout;

  // User context cache
  private userContexts = new Map<string, UserAuthContext>();

  constructor(config?: Partial<OpaqueManagerConfig>) {
    this.config = { ...DEFAULT_MANAGER_CONFIG, ...config };

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
  async registerUser(
    username: string,
    password: string,
    userId: string,
    options?: {
      validateInputs?: boolean;
      checkAvailability?: boolean;
    }
  ): Promise<RegistrationFlowResult & { userContext?: UserAuthContext }> {
    try {
      const opts = { validateInputs: true, checkAvailability: true, ...options };

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
        const availability = await checkUsernameAvailability(this.server, username);
        if (!availability.available) {
          return {
            success: false,
            error: `Username not available${availability.suggestion ? `. Try: ${availability.suggestion}` : ''}`,
          };
        }
      }

      // Execute OPAQUE registration
      const result = await executeOpaqueRegistration(
        this.client,
        this.server,
        username,
        password,
        userId,
        this.config.registration
      );

      if (result.success) {
        // Create user context
        const userContext: UserAuthContext = {
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

        return {
          ...result,
          userContext,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Authenticate user with OPAQUE protocol
   */
  async authenticateUser(
    username: string,
    password: string,
    options?: {
      validateInputs?: boolean;
      rememberMe?: boolean;
    }
  ): Promise<AuthenticationFlowResult & { userContext?: UserAuthContext }> {
    try {
      const opts = { validateInputs: true, rememberMe: false, ...options };

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
      const authConfig = {
        ...this.config.authentication,
        rememberMe: opts.rememberMe,
      };

      const result = await executeOpaqueAuthentication(
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

        return {
          ...result,
          userContext,
        };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Determine best authentication method for user
   */
  async getRecommendedAuthMethod(username: string): Promise<{
    method: AuthMethod;
    reason: string;
    fallbackAvailable: boolean;
  }> {
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
  }

  /**
   * Validate existing session
   */
  async validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
    username?: string;
    expiresAt?: Date;
    userContext?: UserAuthContext;
  }> {
    const validation = await this.sessionManager.validateSession(sessionKey);

    if (!validation.isValid) {
      return { isValid: false };
    }

    const userContext = validation.username ? this.getUserContext(validation.username) : undefined;

    return {
      ...validation,
      userContext,
    };
  }

  /**
   * Logout user
   */
  async logout(sessionKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sessionManager.revokeSession(sessionKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Logout all sessions for user
   */
  async logoutAll(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sessionManager.revokeAllUserSessions(userId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout all failed',
      };
    }
  }

  /**
   * Get user context by username or userId
   */
  getUserContext(identifier: string): UserAuthContext | undefined {
    return this.userContexts.get(identifier);
  }

  /**
   * Update user context (e.g., when Passkey is registered)
   */
  updateUserContext(identifier: string, updates: Partial<UserAuthContext>): boolean {
    const existing = this.userContexts.get(identifier);
    if (!existing) return false;

    const updated = { ...existing, ...updates };

    // Update both username and userId mappings
    this.userContexts.set(existing.username, updated);
    this.userContexts.set(existing.userId, updated);

    return true;
  }

  /**
   * Delete user account and all associated data
   */
  async deleteUser(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userContext = this.getUserContext(username);
      if (!userContext) {
        return { success: false, error: 'User not found' };
      }

      // Delete from server
      await this.server.deleteUser(username);

      // Revoke all sessions
      await this.sessionManager.revokeAllUserSessions(userContext.userId);

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
  }

  /**
   * Get active session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    userContexts: number;
    serverSessions: number;
  } {
    return {
      totalSessions: this.sessionManager.getActiveSessionCount(),
      userContexts: this.userContexts.size,
      serverSessions: this.sessionManager.getActiveSessionCount(),
    };
  }

  /**
   * Cleanup expired sessions and contexts
   */
  cleanup(): void {
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
  shutdown(): void {
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
export function createOpaqueManager(config?: Partial<OpaqueManagerConfig>): OpaqueManager {
  return new OpaqueManager(config);
}
