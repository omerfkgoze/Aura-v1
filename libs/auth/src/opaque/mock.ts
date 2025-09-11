/**
 * OPAQUE Protocol Mock Implementation
 *
 * This module provides mock implementations for testing OPAQUE protocol
 * when the actual @cloudflare/opaque-ts library is not available in Node.js environment.
 */

import type {
  ClientRegistrationState,
  ClientLoginState,
  RegistrationRequest,
  RegistrationResponse,
  LoginRequest,
  LoginResponse,
  ServerRegistrationState,
  ServerLoginState,
} from './types';

/**
 * Mock crypto random generator
 */
function generateRandomBytes(length: number): ArrayBuffer {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array.buffer;
}

/**
 * Mock client registration creation
 */
export const createClientRegistration = async (options: {
  password: Uint8Array;
}): Promise<{
  request: RegistrationRequest;
  state: ClientRegistrationState;
}> => {
  // Mock implementation - generates fake data for testing
  const mockRequest = new Uint8Array(generateRandomBytes(32));
  const mockState = new Uint8Array(generateRandomBytes(64));

  return {
    request: mockRequest as any,
    state: mockState as any,
  };
};

/**
 * Mock client registration completion
 */
export const finishClientRegistration = async (options: {
  state: ClientRegistrationState;
  response: RegistrationResponse;
}): Promise<{
  record: ArrayBuffer;
  exportKey: ArrayBuffer;
}> => {
  // Mock implementation
  return {
    record: generateRandomBytes(128),
    exportKey: generateRandomBytes(32),
  };
};

/**
 * Mock client login creation
 */
export const createClientLogin = async (options: {
  password: Uint8Array;
}): Promise<{
  request: LoginRequest;
  state: ClientLoginState;
}> => {
  // Mock implementation
  const mockRequest = new Uint8Array(generateRandomBytes(32));
  const mockState = new Uint8Array(generateRandomBytes(64));

  return {
    request: mockRequest as any,
    state: mockState as any,
  };
};

/**
 * Mock client login completion
 */
export const finishClientLogin = async (options: {
  state: ClientLoginState;
  response: LoginResponse;
}): Promise<{
  sessionKey: ArrayBuffer;
  exportKey: ArrayBuffer;
}> => {
  // Mock implementation
  return {
    sessionKey: generateRandomBytes(32),
    exportKey: generateRandomBytes(32),
  };
};

/**
 * Mock server registration creation
 */
export const createServerRegistration = async (options: {
  request: RegistrationRequest;
  serverIdentity: Uint8Array;
}): Promise<{
  response: RegistrationResponse;
  state: ServerRegistrationState;
}> => {
  // Mock implementation
  const mockResponse = new Uint8Array(generateRandomBytes(128));
  const mockState = new Uint8Array(generateRandomBytes(96));

  return {
    response: mockResponse as any,
    state: mockState as any,
  };
};

/**
 * Mock server registration completion
 */
export const finishServerRegistration = async (options: {
  state: ServerRegistrationState;
}): Promise<ArrayBuffer> => {
  // Mock implementation
  return generateRandomBytes(256);
};

/**
 * Mock server login creation
 */
export const createServerLogin = async (options: {
  request: LoginRequest;
  record: ArrayBuffer;
  serverIdentity: Uint8Array;
}): Promise<{
  response: LoginResponse;
  state: ServerLoginState;
}> => {
  // Mock implementation
  const mockResponse = new Uint8Array(generateRandomBytes(128));
  const mockState = new Uint8Array(generateRandomBytes(96));

  return {
    response: mockResponse as any,
    state: mockState as any,
  };
};

/**
 * Mock server login completion
 */
export const finishServerLogin = async (options: {
  state: ServerLoginState;
}): Promise<ArrayBuffer> => {
  // Mock implementation
  return generateRandomBytes(32);
};

/**
 * Check if we're running in a test environment
 */
export function isTestEnvironment(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env &&
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
  );
}
