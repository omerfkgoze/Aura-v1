/**
 * OPAQUE Protocol Server Implementation
 *
 * This module implements the server-side OPAQUE protocol for zero-knowledge
 * password authentication without server-side password storage.
 */
import type {
  ServerRegistrationState,
  ServerLoginState,
  RegistrationRequest,
  RegistrationResponse,
  LoginRequest,
  LoginResponse,
} from './types';
import type { OpaqueServer, OpaqueSessionResult, OpaqueServerRegistration } from './types';
/**
 * Server configuration for OPAQUE operations
 */
export interface OpaqueServerConfig {
  serverIdentity?: string;
  sessionTimeoutMs: number;
  maxRegistrationAttempts: number;
  rateLimitWindowMs: number;
  rateLimitMaxAttempts: number;
}
/**
 * OPAQUE protocol server implementation
 */
export declare class OpaqueServerImpl implements OpaqueServer {
  private config;
  private rateLimitMap;
  private registrationStorage;
  private sessionStorage;
  constructor(config?: Partial<OpaqueServerConfig>);
  /**
   * Process OPAQUE registration request
   * Server never sees the actual password
   */
  processRegistration(
    username: string,
    registrationRequest: RegistrationRequest
  ): Promise<{
    registrationResponse: RegistrationResponse;
    serverState: ServerRegistrationState;
  }>;
  /**
   * Store OPAQUE registration record
   * Only stores opaque data, never the password
   */
  storeRegistration(
    username: string,
    serverState: ServerRegistrationState,
    userId: string
  ): Promise<void>;
  /**
   * Process OPAQUE authentication request
   * Server verifies authentication without knowing password
   */
  processAuthentication(
    username: string,
    loginRequest: LoginRequest
  ): Promise<{
    loginResponse: LoginResponse;
    serverState: ServerLoginState;
  }>;
  /**
   * Verify OPAQUE authentication and establish session
   */
  verifyAuthentication(
    username: string,
    serverState: ServerLoginState
  ): Promise<OpaqueSessionResult>;
  /**
   * Validate existing session
   */
  validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
  }>;
  /**
   * Revoke session (logout)
   */
  revokeSession(sessionKey: string): Promise<void>;
  /**
   * Get user by username
   */
  getUserByUsername(username: string): Promise<OpaqueServerRegistration | null>;
  /**
   * Delete user registration (account deletion)
   */
  deleteUser(username: string): Promise<void>;
  /**
   * Check rate limiting for IP/username
   */
  private checkRateLimit;
  /**
   * Update rate limiting counter
   */
  private updateRateLimit;
  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions;
  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimits;
  /**
   * Generate unique ID
   */
  private generateId;
  /**
   * Generate secure session ID
   */
  private generateSessionId;
  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64;
  /**
   * Convert Base64 string back to ArrayBuffer
   */
  private base64ToArrayBuffer;
  /**
   * Create standardized OPAQUE error
   */
  private createError;
}
/**
 * Create new OPAQUE server instance
 */
export declare function createOpaqueServer(config?: Partial<OpaqueServerConfig>): OpaqueServer;
