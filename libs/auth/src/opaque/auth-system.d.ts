/**
 * OPAQUE Authentication System Factory
 *
 * Creates complete OPAQUE authentication system with all components
 */
import { OpaqueSessionManager } from './authentication';
/**
 * Create complete OPAQUE authentication system
 */
export declare function createOpaqueAuthSystem(config?: {
  serverUrl?: string;
  sessionTimeoutMs?: number;
  rateLimitWindowMs?: number;
  maxAttempts?: number;
}): {
  client: import('./types').OpaqueClient;
  server: import('./types').OpaqueServer;
  sessionManager: OpaqueSessionManager;
  register(
    username: string,
    password: string,
    userId: string
  ): Promise<import('./registration').RegistrationFlowResult>;
  authenticate(
    username: string,
    password: string
  ): Promise<import('./authentication').AuthenticationFlowResult>;
  validateSession(sessionKey: string): Promise<{
    isValid: boolean;
    userId?: string;
    username?: string;
    exportKey?: string;
  }>;
  logout(sessionKey: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  logoutAll(userId: string): Promise<{
    success: boolean;
    revokedCount: number;
    errors?: string[];
  }>;
};
