/**
 * OPAQUE Authentication Flow Implementation
 *
 * This module provides high-level authentication flow orchestration
 * for OPAQUE protocol, handling client-server coordination.
 */
import type {
  OpaqueClient,
  OpaqueServer,
  OpaqueError,
  LoginRequest,
  LoginResponse,
  ServerLoginState,
} from './types';
/**
 * OPAQUE authentication flow configuration
 */
export interface OpaqueAuthenticationConfig {
  timeout: number;
  retryAttempts: number;
  sessionTimeout: number;
  rememberMe: boolean;
}
/**
 * Authentication flow result
 */
export interface AuthenticationFlowResult {
  success: boolean;
  sessionKey?: string;
  userId?: string;
  exportKey?: string;
  expiresAt?: Date;
  error?: string;
}
/**
 * Authentication flow state
 */
export interface AuthenticationFlowState {
  username: string;
  loginRequest?: LoginRequest;
  loginResponse?: LoginResponse;
  serverState?: ServerLoginState;
  step:
    | 'idle'
    | 'client-request'
    | 'server-processing'
    | 'client-completion'
    | 'server-verification'
    | 'authenticated'
    | 'error';
  startTime: number;
  attempts: number;
  error?: OpaqueError;
}
/**
 * OPAQUE Authentication Flow Orchestrator
 */
export declare class OpaqueAuthenticationFlow {
  private client;
  private server;
  private config;
  private state;
  constructor(
    client: OpaqueClient,
    server: OpaqueServer,
    username: string,
    config?: Partial<OpaqueAuthenticationConfig>
  );
  /**
   * Execute complete OPAQUE authentication flow
   */
  authenticate(password: string): Promise<AuthenticationFlowResult>;
  /**
   * Retry authentication with exponential backoff
   */
  retryAuthentication(password: string): Promise<AuthenticationFlowResult>;
  /**
   * Get current authentication state
   */
  getState(): AuthenticationFlowState;
  /**
   * Check if authentication is in progress
   */
  isInProgress(): boolean;
  /**
   * Get authentication progress percentage
   */
  getProgress(): number;
  /**
   * Cancel authentication flow
   */
  cancel(): void;
  /**
   * Reset authentication state
   */
  reset(): void;
  /**
   * Get remaining retry attempts
   */
  getRemainingAttempts(): number;
  /**
   * Wrap async operation with timeout
   */
  private withTimeout;
}
/**
 * Session manager for OPAQUE authentication
 */
export declare class OpaqueSessionManager {
  private server;
  private activeSessions;
  constructor(server: OpaqueServer);
  /**
   * Store active session
   */
  storeSession(
    sessionKey: string,
    userId: string,
    username: string,
    exportKey: string,
    expiresAt: Date
  ): void;
  /**
   * Validate session
   */
  validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
    username?: string;
    exportKey?: string;
  }>;
  /**
   * Extend session
   */
  extendSession(sessionKey: string, additionalMs: number): boolean;
  /**
   * Revoke session
   */
  revokeSession(sessionKey: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): string[];
  /**
   * Revoke all sessions for user
   */
  revokeAllUserSessions(userId: string): Promise<{
    success: boolean;
    revokedCount: number;
    errors?: string[];
  }>;
  /**
   * Clean up expired sessions
   */
  cleanup(): void;
  /**
   * Get session count
   */
  getActiveSessionCount(): number;
}
/**
 * Utility function to create and execute OPAQUE authentication flow
 */
export declare function executeOpaqueAuthentication(
  client: OpaqueClient,
  server: OpaqueServer,
  username: string,
  password: string,
  config?: Partial<OpaqueAuthenticationConfig>
): Promise<AuthenticationFlowResult>;
/**
 * Validate authentication inputs
 */
export declare function validateAuthenticationInputs(
  username: string,
  password: string
): {
  isValid: boolean;
  errors: string[];
};
