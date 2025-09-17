/**
 * OPAQUE Protocol Type Definitions
 *
 * This module defines TypeScript types for OPAQUE protocol operations,
 * providing zero-knowledge password authentication without server storage.
 */
export interface ClientRegistrationState {
  data: ArrayBuffer;
}
export interface ClientLoginState {
  data: ArrayBuffer;
}
export interface RegistrationRequest {
  data: ArrayBuffer;
}
export interface RegistrationResponse {
  data: ArrayBuffer;
}
export interface LoginRequest {
  data: ArrayBuffer;
}
export interface LoginResponse {
  data: ArrayBuffer;
}
export interface ServerRegistrationState {
  data: ArrayBuffer;
}
export interface ServerLoginState {
  data: ArrayBuffer;
}
export interface ClientKeyShare {
  data: ArrayBuffer;
}
export interface ServerKeyShare {
  data: ArrayBuffer;
}
export interface OPRFClient {
  data: ArrayBuffer;
}
export interface OPRFServer {
  data: ArrayBuffer;
}
/**
 * OPAQUE registration flow data
 */
export interface OpaqueRegistrationData {
  username: string;
  registrationRequest: RegistrationRequest;
  clientState: ClientRegistrationState;
  timestamp: number;
}
/**
 * OPAQUE authentication flow data
 */
export interface OpaqueAuthenticationData {
  username: string;
  loginRequest: LoginRequest;
  clientState: ClientLoginState;
  timestamp: number;
}
/**
 * Server-side OPAQUE registration storage
 */
export interface OpaqueServerRegistration {
  id: string;
  userId: string;
  username: string;
  registrationRecord: string;
  createdAt: Date;
  lastUsedAt?: Date;
}
/**
 * OPAQUE session establishment result
 */
export interface OpaqueSessionResult {
  success: boolean;
  sessionKey?: string;
  userId?: string;
  error?: string;
}
/**
 * OPAQUE client configuration
 */
export interface OpaqueClientConfig {
  serverUrl: string;
  timeout: number;
  retryAttempts: number;
}
/**
 * OPAQUE server configuration
 */
export interface OpaqueServerConfig {
  serverIdentity?: string;
  sessionTimeoutMs: number;
  maxRegistrationAttempts: number;
  rateLimitWindowMs: number;
  rateLimitMaxAttempts: number;
}
/**
 * OPAQUE registration configuration
 */
export interface OpaqueRegistrationConfig {
  timeout: number;
  retryAttempts: number;
  validateUsername: boolean;
  validatePassword: boolean;
}
/**
 * OPAQUE authentication configuration
 */
export interface OpaqueAuthenticationConfig {
  timeout: number;
  retryAttempts: number;
  sessionTimeout: number;
  rememberMe: boolean;
}
/**
 * Registration flow result
 */
export interface RegistrationFlowResult {
  success: boolean;
  userId?: string;
  username?: string;
  exportKey?: string;
  error?: string;
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
 * OPAQUE registration flow status
 */
export type OpaqueRegistrationStatus =
  | 'idle'
  | 'generating-request'
  | 'waiting-server'
  | 'completing-registration'
  | 'completed'
  | 'error';
/**
 * OPAQUE authentication flow status
 */
export type OpaqueAuthenticationStatus =
  | 'idle'
  | 'generating-request'
  | 'waiting-server'
  | 'completing-authentication'
  | 'authenticated'
  | 'error';
/**
 * OPAQUE flow error types
 */
export interface OpaqueError {
  code: 'NETWORK_ERROR' | 'INVALID_CREDENTIALS' | 'SERVER_ERROR' | 'CLIENT_ERROR';
  message: string;
  details?: string;
}
/**
 * OPAQUE client interface for registration and authentication
 */
export interface OpaqueClient {
  /**
   * Start OPAQUE registration flow
   */
  startRegistration(
    username: string,
    password: string
  ): Promise<{
    registrationRequest: RegistrationRequest;
    clientState: ClientRegistrationState;
  }>;
  /**
   * Complete OPAQUE registration flow
   */
  completeRegistration(
    clientState: ClientRegistrationState,
    registrationResponse: RegistrationResponse
  ): Promise<{
    registrationRecord: string;
    exportKey: string;
  }>;
  /**
   * Start OPAQUE authentication flow
   */
  startAuthentication(
    username: string,
    password: string
  ): Promise<{
    loginRequest: LoginRequest;
    clientState: ClientLoginState;
  }>;
  /**
   * Complete OPAQUE authentication flow
   */
  completeAuthentication(
    clientState: ClientLoginState,
    loginResponse: LoginResponse
  ): Promise<{
    sessionKey: string;
    exportKey: string;
  }>;
}
/**
 * OPAQUE server interface for handling registration and authentication
 */
export interface OpaqueServer {
  /**
   * Process OPAQUE registration request
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
   */
  storeRegistration(
    username: string,
    serverState: ServerRegistrationState,
    userId: string
  ): Promise<void>;
  /**
   * Process OPAQUE authentication request
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
   * Validate session
   */
  validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
    username?: string;
  }>;
  /**
   * Revoke session
   */
  revokeSession(sessionKey: string): Promise<void>;
  /**
   * Delete user
   */
  deleteUser(username: string): Promise<void>;
  /**
   * Get user by username
   */
  getUserByUsername(username: string): Promise<OpaqueServerRegistration | null>;
}
