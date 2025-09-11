/**
 * OPAQUE Registration Flow Implementation
 *
 * This module provides high-level registration flow orchestration
 * for OPAQUE protocol, handling client-server coordination.
 */

import type {
  OpaqueClient,
  OpaqueServer,
  OpaqueRegistrationData,
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
 * Default registration configuration
 */
const DEFAULT_REGISTRATION_CONFIG: OpaqueRegistrationConfig = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  validateUsername: true,
  validatePassword: true,
};

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
export class OpaqueRegistrationFlow {
  private config: OpaqueRegistrationConfig;
  private state: RegistrationFlowState;

  constructor(
    private client: OpaqueClient,
    private server: OpaqueServer,
    username: string,
    config?: Partial<OpaqueRegistrationConfig>
  ) {
    this.config = { ...DEFAULT_REGISTRATION_CONFIG, ...config };
    this.state = {
      username,
      step: 'idle',
      startTime: Date.now(),
    };
  }

  /**
   * Execute complete OPAQUE registration flow
   */
  async register(password: string, userId: string): Promise<RegistrationFlowResult> {
    const startTime = Date.now();

    try {
      // Step 1: Client generates registration request
      this.state.step = 'client-request';
      const { registrationRequest, clientState } = await this.withTimeout(
        this.client.startRegistration(this.state.username, password),
        'Client registration request timed out'
      );

      this.state.registrationRequest = registrationRequest;

      // Step 2: Server processes registration request
      this.state.step = 'server-processing';
      const { registrationResponse, serverState } = await this.withTimeout(
        this.server.processRegistration(this.state.username, registrationRequest),
        'Server registration processing timed out'
      );

      this.state.registrationResponse = registrationResponse;
      this.state.serverState = serverState;

      // Step 3: Client completes registration
      this.state.step = 'client-completion';
      const { exportKey } = await this.withTimeout(
        this.client.completeRegistration(clientState, registrationResponse),
        'Client registration completion timed out'
      );

      // Step 4: Server stores registration data
      this.state.step = 'server-storage';
      await this.withTimeout(
        this.server.storeRegistration(this.state.username, serverState, userId),
        'Server registration storage timed out'
      );

      this.state.step = 'completed';

      const totalTime = Date.now() - startTime;
      console.info(
        `OPAQUE registration completed in ${totalTime}ms for user ${this.state.username}`
      );

      return {
        success: true,
        userId,
        registrationData: {
          username: this.state.username,
          exportKey,
        },
      };
    } catch (error) {
      this.state.step = 'error';
      this.state.error =
        error instanceof Error
          ? { code: 'CLIENT_ERROR', message: error.message }
          : { code: 'CLIENT_ERROR', message: 'Unknown error occurred' };

      const totalTime = Date.now() - startTime;
      console.error(
        `OPAQUE registration failed after ${totalTime}ms for user ${this.state.username}:`,
        error
      );

      return {
        success: false,
        error: this.state.error.message,
      };
    }
  }

  /**
   * Get current registration state
   */
  getState(): RegistrationFlowState {
    return { ...this.state };
  }

  /**
   * Check if registration is in progress
   */
  isInProgress(): boolean {
    return !['idle', 'completed', 'error'].includes(this.state.step);
  }

  /**
   * Get registration progress percentage
   */
  getProgress(): number {
    switch (this.state.step) {
      case 'idle':
        return 0;
      case 'client-request':
        return 20;
      case 'server-processing':
        return 40;
      case 'client-completion':
        return 70;
      case 'server-storage':
        return 90;
      case 'completed':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Cancel registration flow
   */
  cancel(): void {
    if (this.isInProgress()) {
      this.state.step = 'error';
      this.state.error = {
        code: 'CLIENT_ERROR',
        message: 'Registration cancelled by user',
      };
    }
  }

  /**
   * Wrap async operation with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(errorMessage));
        }, this.config.timeout);
      }),
    ]);
  }
}

/**
 * Utility function to create and execute OPAQUE registration flow
 */
export async function executeOpaqueRegistration(
  client: OpaqueClient,
  server: OpaqueServer,
  username: string,
  password: string,
  userId: string,
  config?: Partial<OpaqueRegistrationConfig>
): Promise<RegistrationFlowResult> {
  const flow = new OpaqueRegistrationFlow(client, server, username, config);
  return flow.register(password, userId);
}

/**
 * Validate registration inputs
 */
export function validateRegistrationInputs(
  username: string,
  password: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Username validation
  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
  } else if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  } else if (username.length > 255) {
    errors.push('Username must be less than 255 characters');
  } else if (!/^[a-zA-Z0-9._@-]+$/.test(username)) {
    errors.push('Username contains invalid characters');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  } else {
    // Password strength checks
    const checks = {
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    if (passedChecks < 3) {
      errors.push(
        'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate secure random username suffix
 */
export function generateUsernameSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check username availability
 */
export async function checkUsernameAvailability(
  server: OpaqueServer,
  username: string
): Promise<{ available: boolean; suggestion?: string }> {
  try {
    const existingUser = await server.getUserByUsername(username);

    if (!existingUser) {
      return { available: true };
    }

    // Generate suggestion
    const baseName = username.replace(/\d+$/, ''); // Remove trailing numbers
    const suggestion = `${baseName}${generateUsernameSuffix()}`;

    return {
      available: false,
      suggestion,
    };
  } catch (error) {
    // Assume not available on error for security
    return { available: false };
  }
}
