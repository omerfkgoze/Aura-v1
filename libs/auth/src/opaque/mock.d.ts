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
 * Mock client registration creation
 */
export declare const createClientRegistration: (_options: { password: Uint8Array }) => Promise<{
  request: RegistrationRequest;
  state: ClientRegistrationState;
}>;
/**
 * Mock client registration completion
 */
export declare const finishClientRegistration: (_options: {
  state: ClientRegistrationState;
  response: RegistrationResponse;
}) => Promise<{
  record: ArrayBuffer;
  exportKey: ArrayBuffer;
}>;
/**
 * Mock client login creation
 */
export declare const createClientLogin: (_options: { password: Uint8Array }) => Promise<{
  request: LoginRequest;
  state: ClientLoginState;
}>;
/**
 * Mock client login completion
 */
export declare const finishClientLogin: (_options: {
  state: ClientLoginState;
  response: LoginResponse;
}) => Promise<{
  sessionKey: ArrayBuffer;
  exportKey: ArrayBuffer;
}>;
/**
 * Mock server registration creation
 */
export declare const createServerRegistration: (_options: {
  request: RegistrationRequest;
  serverIdentity: Uint8Array;
}) => Promise<{
  response: RegistrationResponse;
  state: ServerRegistrationState;
}>;
/**
 * Mock server registration completion
 */
export declare const finishServerRegistration: (_options: {
  state: ServerRegistrationState;
}) => Promise<ArrayBuffer>;
/**
 * Mock server login creation
 */
export declare const createServerLogin: (_options: {
  request: LoginRequest;
  record: ArrayBuffer;
  serverIdentity: Uint8Array;
}) => Promise<{
  response: LoginResponse;
  state: ServerLoginState;
}>;
/**
 * Mock server login completion
 */
export declare const finishServerLogin: (_options: {
  state: ServerLoginState;
}) => Promise<ArrayBuffer>;
/**
 * Check if we're running in a test environment
 */
export declare function isTestEnvironment(): boolean;
