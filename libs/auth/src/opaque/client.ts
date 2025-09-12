/**
 * OPAQUE Protocol Client Implementation
 *
 * This module implements the client-side OPAQUE protocol for zero-knowledge
 * password authentication without server-side password storage.
 */

// Dynamic import to handle different environments
let opaqueModule: any = null;

async function getOpaqueModule() {
  if (opaqueModule) return opaqueModule;

  try {
    // Try to import the real OPAQUE library
    opaqueModule = await import('@cloudflare/opaque-ts');

    // Verify the library has the required functions
    if (!opaqueModule.createClientRegistration || !opaqueModule.createClientLogin) {
      throw new Error('OPAQUE library missing required functions');
    }

    return opaqueModule;
  } catch (error) {
    // Fall back to mock implementation in test environment
    if (
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
    ) {
      opaqueModule = await import('./mock');
      return opaqueModule;
    }
    throw new Error('OPAQUE library not available and not in test environment');
  }
}

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
  OpaqueError,
  OpaqueRegistrationStatus,
  OpaqueAuthenticationStatus,
} from './types';

/**
 * Default OPAQUE client configuration
 */
const DEFAULT_CONFIG: OpaqueClientConfig = {
  serverUrl: '/api/auth/opaque',
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
};

/**
 * OPAQUE protocol client implementation
 */
export class OpaqueClientImpl implements OpaqueClient {
  private config: OpaqueClientConfig;
  private registrationStatus: OpaqueRegistrationStatus = 'idle';
  private authenticationStatus: OpaqueAuthenticationStatus = 'idle';

  constructor(config?: Partial<OpaqueClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start OPAQUE registration flow
   * Generates initial registration request without exposing password to server
   */
  async startRegistration(
    username: string,
    password: string
  ): Promise<{
    registrationRequest: RegistrationRequest;
    clientState: ClientRegistrationState;
  }> {
    try {
      this.registrationStatus = 'generating-request';

      if (!username || username.trim().length === 0) {
        throw new Error('Username cannot be empty');
      }

      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Create OPAQUE registration request
      // This does NOT send the password to the server
      const opaque = await getOpaqueModule();
      const { request, state } = await opaque.createClientRegistration({
        password: new TextEncoder().encode(password),
      });

      this.registrationStatus = 'waiting-server';

      return {
        registrationRequest: request,
        clientState: state,
      };
    } catch (error) {
      this.registrationStatus = 'error';
      throw this.createError('CLIENT_ERROR', 'Failed to start registration', error);
    }
  }

  /**
   * Complete OPAQUE registration flow
   * Processes server response and generates final registration record
   */
  async completeRegistration(
    clientState: ClientRegistrationState,
    registrationResponse: RegistrationResponse
  ): Promise<{
    registrationRecord: string;
    exportKey: string;
  }> {
    try {
      this.registrationStatus = 'completing-registration';

      if (!clientState) {
        throw new Error('Client registration state is required');
      }

      if (!registrationResponse) {
        throw new Error('Server registration response is required');
      }

      // Complete OPAQUE registration
      const opaque = await getOpaqueModule();
      const { record, exportKey } = await opaque.finishClientRegistration({
        state: clientState,
        response: registrationResponse,
      });

      this.registrationStatus = 'completed';

      return {
        registrationRecord: this.arrayBufferToBase64(record),
        exportKey: this.arrayBufferToBase64(exportKey),
      };
    } catch (error) {
      this.registrationStatus = 'error';
      throw this.createError('CLIENT_ERROR', 'Failed to complete registration', error);
    }
  }

  /**
   * Start OPAQUE authentication flow
   * Generates login request without exposing password to server
   */
  async startAuthentication(
    username: string,
    password: string
  ): Promise<{
    loginRequest: LoginRequest;
    clientState: ClientLoginState;
  }> {
    try {
      this.authenticationStatus = 'generating-request';

      if (!username || username.trim().length === 0) {
        throw new Error('Username cannot be empty');
      }

      if (!password || password.length === 0) {
        throw new Error('Password cannot be empty');
      }

      // Create OPAQUE login request
      // This does NOT send the password to the server
      const opaque = await getOpaqueModule();
      const { request, state } = await opaque.createClientLogin({
        password: new TextEncoder().encode(password),
      });

      this.authenticationStatus = 'waiting-server';

      return {
        loginRequest: request,
        clientState: state,
      };
    } catch (error) {
      this.authenticationStatus = 'error';
      throw this.createError('CLIENT_ERROR', 'Failed to start authentication', error);
    }
  }

  /**
   * Complete OPAQUE authentication flow
   * Processes server response and establishes secure session
   */
  async completeAuthentication(
    clientState: ClientLoginState,
    loginResponse: LoginResponse
  ): Promise<{
    sessionKey: string;
    exportKey: string;
  }> {
    try {
      this.authenticationStatus = 'completing-authentication';

      if (!clientState) {
        throw new Error('Client login state is required');
      }

      if (!loginResponse) {
        throw new Error('Server login response is required');
      }

      // Complete OPAQUE authentication
      const opaque = await getOpaqueModule();
      const { sessionKey, exportKey } = await opaque.finishClientLogin({
        state: clientState,
        response: loginResponse,
      });

      this.authenticationStatus = 'authenticated';

      return {
        sessionKey: this.arrayBufferToBase64(sessionKey),
        exportKey: this.arrayBufferToBase64(exportKey),
      };
    } catch (error) {
      this.authenticationStatus = 'error';
      throw this.createError('CLIENT_ERROR', 'Failed to complete authentication', error);
    }
  }

  /**
   * Get current registration status
   */
  getRegistrationStatus(): OpaqueRegistrationStatus {
    return this.registrationStatus;
  }

  /**
   * Get current authentication status
   */
  getAuthenticationStatus(): OpaqueAuthenticationStatus {
    return this.authenticationStatus;
  }

  /**
   * Reset registration status
   */
  resetRegistration(): void {
    this.registrationStatus = 'idle';
  }

  /**
   * Reset authentication status
   */
  resetAuthentication(): void {
    this.authenticationStatus = 'idle';
  }

  /**
   * Convert ArrayBuffer to Base64 string for serialization
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string back to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Create standardized OPAQUE error
   */
  private createError(
    code: OpaqueError['code'],
    message: string,
    originalError?: unknown
  ): OpaqueError {
    const error: OpaqueError = {
      code,
      message,
    };

    if (originalError) {
      error.details =
        originalError instanceof Error ? originalError.message : String(originalError);
    }

    return error;
  }
}

/**
 * Create new OPAQUE client instance
 */
export function createOpaqueClient(config?: Partial<OpaqueClientConfig>): OpaqueClient {
  return new OpaqueClientImpl(config);
}

/**
 * Utility function to validate username format
 */
export function validateUsername(username: string): boolean {
  // Basic validation - can be extended based on requirements
  return (
    username &&
    username.trim().length > 0 &&
    username.length <= 255 &&
    /^[a-zA-Z0-9._@-]+$/.test(username)
  );
}

/**
 * Utility function to validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
