/**
 * OPAQUE Authentication Manager
 *
 * This module provides a high-level manager for OPAQUE authentication
 * with fallback support and integration with Passkeys.
 */
import type {
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
  autoCleanupInterval?: number;
}
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
export declare class OpaqueManager {
  private client;
  private server;
  private sessionManager;
  private config;
  private cleanupInterval?;
  private userContexts;
  constructor(config?: Partial<OpaqueManagerConfig>);
  /**
   * Register user with OPAQUE protocol
   */
  registerUser(
    username: string,
    password: string,
    userId: string,
    options?: {
      validateInputs?: boolean;
      checkAvailability?: boolean;
    }
  ): Promise<
    RegistrationFlowResult & {
      userContext?: UserAuthContext;
    }
  >;
  /**
   * Authenticate user with OPAQUE protocol
   */
  authenticateUser(
    username: string,
    password: string,
    options?: {
      validateInputs?: boolean;
      rememberMe?: boolean;
    }
  ): Promise<
    AuthenticationFlowResult & {
      userContext?: UserAuthContext;
    }
  >;
  /**
   * Determine best authentication method for user
   */
  getRecommendedAuthMethod(username: string): Promise<{
    method: AuthMethod;
    reason: string;
    fallbackAvailable: boolean;
  }>;
  /**
   * Validate existing session
   */
  validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
    username?: string;
    expiresAt?: Date;
    userContext?: UserAuthContext;
  }>;
  /**
   * Logout user
   */
  logout(sessionKey: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  /**
   * Logout all sessions for user
   */
  logoutAll(userId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  /**
   * Get user context by username or userId
   */
  getUserContext(identifier: string): UserAuthContext | undefined;
  /**
   * Update user context (e.g., when Passkey is registered)
   */
  updateUserContext(identifier: string, updates: Partial<UserAuthContext>): boolean;
  /**
   * Delete user account and all associated data
   */
  deleteUser(username: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  /**
   * Get active session statistics
   */
  getSessionStats(): {
    totalSessions: number;
    userContexts: number;
    serverSessions: number;
  };
  /**
   * Cleanup expired sessions and contexts
   */
  cleanup(): void;
  /**
   * Shutdown manager and cleanup resources
   */
  shutdown(): void;
}
/**
 * Create and configure OPAQUE manager
 */
export declare function createOpaqueManager(config?: Partial<OpaqueManagerConfig>): OpaqueManager;
