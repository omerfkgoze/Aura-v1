/**
 * OPAQUE Protocol Client Implementation
 *
 * This module implements the client-side OPAQUE protocol for zero-knowledge
 * password authentication without server-side password storage.
 */
import type {
  ClientRegistrationState,
  ClientLoginState,
  RegistrationRequest,
  RegistrationResponse,
  LoginRequest,
  LoginResponse,
} from './types';
import type {
  OpaqueClient,
  OpaqueClientConfig,
  OpaqueRegistrationStatus,
  OpaqueAuthenticationStatus,
} from './types';
/**
 * OPAQUE protocol client implementation
 */
export declare class OpaqueClientImpl implements OpaqueClient {
  private config;
  private registrationStatus;
  private authenticationStatus;
  constructor(config?: Partial<OpaqueClientConfig>);
  /**
   * Start OPAQUE registration flow
   * Generates initial registration request without exposing password to server
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
   * Processes server response and generates final registration record
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
   * Generates login request without exposing password to server
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
   * Processes server response and establishes secure session
   */
  completeAuthentication(
    clientState: ClientLoginState,
    loginResponse: LoginResponse
  ): Promise<{
    sessionKey: string;
    exportKey: string;
  }>;
  /**
   * Get current registration status
   */
  getRegistrationStatus(): OpaqueRegistrationStatus;
  /**
   * Get current authentication status
   */
  getAuthenticationStatus(): OpaqueAuthenticationStatus;
  /**
   * Reset registration status
   */
  resetRegistration(): void;
  /**
   * Reset authentication status
   */
  resetAuthentication(): void;
  /**
   * Convert ArrayBuffer to Base64 string for serialization
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
 * Create new OPAQUE client instance
 */
export declare function createOpaqueClient(config?: Partial<OpaqueClientConfig>): OpaqueClient;
/**
 * Utility function to validate username format
 */
export declare function validateUsername(username: string): boolean;
/**
 * Utility function to validate password strength
 */
export declare function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
};
