/**
 * OPAQUE Registration Flow Implementation
 *
 * This module provides high-level registration flow orchestration
 * for OPAQUE protocol, handling client-server coordination.
 */
import type {
  OpaqueClient,
  OpaqueServer,
  OpaqueError,
  RegistrationRequest,
  RegistrationResponse,
  ServerRegistrationState,
} from './types';
/**
 * OPAQUE registration flow configuration
 */
export interface OpaqueRegistrationConfig {
  timeout: number;
  retryAttempts: number;
  validateUsername: boolean;
  validatePassword: boolean;
}
/**
 * Registration flow result
 */
export interface RegistrationFlowResult {
  success: boolean;
  userId?: string;
  error?: string;
  registrationData?: {
    username: string;
    exportKey: string;
  };
}
/**
 * Registration flow state
 */
export interface RegistrationFlowState {
  username: string;
  registrationRequest?: RegistrationRequest;
  registrationResponse?: RegistrationResponse;
  serverState?: ServerRegistrationState;
  step:
    | 'idle'
    | 'client-request'
    | 'server-processing'
    | 'client-completion'
    | 'server-storage'
    | 'completed'
    | 'error';
  startTime: number;
  error?: OpaqueError;
}
/**
 * OPAQUE Registration Flow Orchestrator
 */
export declare class OpaqueRegistrationFlow {
  private client;
  private server;
  private config;
  private state;
  constructor(
    client: OpaqueClient,
    server: OpaqueServer,
    username: string,
    config?: Partial<OpaqueRegistrationConfig>
  );
  /**
   * Execute complete OPAQUE registration flow
   */
  register(password: string, userId: string): Promise<RegistrationFlowResult>;
  /**
   * Get current registration state
   */
  getState(): RegistrationFlowState;
  /**
   * Check if registration is in progress
   */
  isInProgress(): boolean;
  /**
   * Get registration progress percentage
   */
  getProgress(): number;
  /**
   * Cancel registration flow
   */
  cancel(): void;
  /**
   * Wrap async operation with timeout
   */
  private withTimeout;
}
/**
 * Utility function to create and execute OPAQUE registration flow
 */
export declare function executeOpaqueRegistration(
  client: OpaqueClient,
  server: OpaqueServer,
  username: string,
  password: string,
  userId: string,
  config?: Partial<OpaqueRegistrationConfig>
): Promise<RegistrationFlowResult>;
/**
 * Validate registration inputs
 */
export declare function validateRegistrationInputs(
  username: string,
  password: string
): {
  isValid: boolean;
  errors: string[];
};
/**
 * Generate secure random username suffix
 */
export declare function generateUsernameSuffix(): string;
/**
 * Check username availability
 */
export declare function checkUsernameAvailability(
  server: OpaqueServer,
  username: string
): Promise<{
  available: boolean;
  suggestion?: string;
}>;
