/**
 * OPAQUE Authentication Flow Implementation
 *
 * This module provides high-level authentication flow orchestration
 * for OPAQUE protocol, handling client-server coordination.
 */
/**
 * Default authentication configuration
 */
const DEFAULT_AUTH_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  rememberMe: false,
};
/**
 * OPAQUE Authentication Flow Orchestrator
 */
export class OpaqueAuthenticationFlow {
  client;
  server;
  config;
  state;
  constructor(client, server, username, config) {
    this.client = client;
    this.server = server;
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.state = {
      username,
      step: 'idle',
      startTime: Date.now(),
      attempts: 0,
    };
  }
  /**
   * Execute complete OPAQUE authentication flow
   */
  async authenticate(password) {
    const startTime = Date.now();
    try {
      this.state.attempts++;
      // Step 1: Client generates login request
      this.state.step = 'client-request';
      const { loginRequest, clientState } = await this.withTimeout(
        this.client.startAuthentication(this.state.username, password),
        'Client authentication request timed out'
      );
      this.state.loginRequest = loginRequest;
      // Step 2: Server processes login request
      this.state.step = 'server-processing';
      const { loginResponse, serverState } = await this.withTimeout(
        this.server.processAuthentication(this.state.username, loginRequest),
        'Server authentication processing timed out'
      );
      this.state.loginResponse = loginResponse;
      this.state.serverState = serverState;
      // Step 3: Client completes authentication
      this.state.step = 'client-completion';
      const { exportKey } = await this.withTimeout(
        this.client.completeAuthentication(clientState, loginResponse),
        'Client authentication completion timed out'
      );
      // Step 4: Server verifies authentication and establishes session
      this.state.step = 'server-verification';
      const sessionResult = await this.withTimeout(
        this.server.verifyAuthentication(this.state.username, serverState),
        'Server authentication verification timed out'
      );
      if (!sessionResult.success) {
        throw new Error(sessionResult.error || 'Authentication verification failed');
      }
      this.state.step = 'authenticated';
      const totalTime = Date.now() - startTime;
      console.info(
        `OPAQUE authentication completed in ${totalTime}ms for user ${this.state.username}`
      );
      const expiresAt = new Date(Date.now() + this.config.sessionTimeout);
      const result = { success: true };
      if (sessionResult.sessionKey) result.sessionKey = sessionResult.sessionKey;
      if (sessionResult.userId) result.userId = sessionResult.userId;
      if (exportKey) result.exportKey = exportKey;
      result.expiresAt = expiresAt;
      return result;
    } catch (error) {
      this.state.step = 'error';
      this.state.error =
        error instanceof Error
          ? { code: 'CLIENT_ERROR', message: error.message }
          : { code: 'CLIENT_ERROR', message: 'Unknown error occurred' };
      const totalTime = Date.now() - startTime;
      console.error(
        `OPAQUE authentication failed after ${totalTime}ms for user ${this.state.username}:`,
        error
      );
      return {
        success: false,
        error: this.state.error.message,
      };
    }
  }
  /**
   * Retry authentication with exponential backoff
   */
  async retryAuthentication(password) {
    if (this.state.attempts >= this.config.retryAttempts) {
      return {
        success: false,
        error: `Maximum authentication attempts (${this.config.retryAttempts}) exceeded`,
      };
    }
    // Exponential backoff
    const delayMs = Math.pow(2, this.state.attempts - 1) * 1000;
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return this.authenticate(password);
  }
  /**
   * Get current authentication state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Check if authentication is in progress
   */
  isInProgress() {
    return !['idle', 'authenticated', 'error'].includes(this.state.step);
  }
  /**
   * Get authentication progress percentage
   */
  getProgress() {
    switch (this.state.step) {
      case 'idle':
        return 0;
      case 'client-request':
        return 25;
      case 'server-processing':
        return 50;
      case 'client-completion':
        return 75;
      case 'server-verification':
        return 90;
      case 'authenticated':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  }
  /**
   * Cancel authentication flow
   */
  cancel() {
    if (this.isInProgress()) {
      this.state.step = 'error';
      this.state.error = {
        code: 'CLIENT_ERROR',
        message: 'Authentication cancelled by user',
      };
    }
  }
  /**
   * Reset authentication state
   */
  reset() {
    this.state = {
      username: this.state.username,
      step: 'idle',
      startTime: Date.now(),
      attempts: 0,
    };
  }
  /**
   * Get remaining retry attempts
   */
  getRemainingAttempts() {
    return Math.max(0, this.config.retryAttempts - this.state.attempts);
  }
  /**
   * Wrap async operation with timeout
   */
  async withTimeout(promise, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(errorMessage));
        }, this.config.timeout);
      }),
    ]);
  }
}
/**
 * Session manager for OPAQUE authentication
 */
export class OpaqueSessionManager {
  server;
  activeSessions = new Map();
  constructor(server) {
    this.server = server;
  }
  /**
   * Store active session
   */
  storeSession(sessionKey, userId, username, exportKey, expiresAt) {
    this.activeSessions.set(sessionKey, {
      userId,
      username,
      exportKey,
      expiresAt,
    });
  }
  /**
   * Validate session
   */
  async validateSession(sessionKey) {
    const session = this.activeSessions.get(sessionKey);
    if (!session) {
      // Check server-side validation
      const serverValidation = await this.server.validateSession(sessionKey);
      return {
        isValid: serverValidation.isValid,
        ...(serverValidation.userId && { userId: serverValidation.userId }),
      };
    }
    if (session.expiresAt < new Date()) {
      this.activeSessions.delete(sessionKey);
      await this.server.revokeSession(sessionKey);
      return { isValid: false };
    }
    return {
      isValid: true,
      userId: session.userId,
      username: session.username,
      exportKey: session.exportKey,
    };
  }
  /**
   * Extend session
   */
  extendSession(sessionKey, additionalMs) {
    const session = this.activeSessions.get(sessionKey);
    if (!session) return false;
    session.expiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    return true;
  }
  /**
   * Revoke session
   */
  async revokeSession(sessionKey) {
    try {
      this.activeSessions.delete(sessionKey);
      await this.server.revokeSession(sessionKey);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke session',
      };
    }
  }
  /**
   * Get all active sessions for user
   */
  getUserSessions(userId) {
    const sessions = [];
    for (const [sessionKey, session] of this.activeSessions.entries()) {
      if (session.userId === userId && session.expiresAt > new Date()) {
        sessions.push(sessionKey);
      }
    }
    return sessions;
  }
  /**
   * Revoke all sessions for user
   */
  async revokeAllUserSessions(userId) {
    const userSessions = this.getUserSessions(userId);
    const results = await Promise.all(
      userSessions.map(sessionKey => this.revokeSession(sessionKey))
    );
    const errors = results.filter(result => !result.success).map(result => result.error);
    const revokedCount = results.filter(result => result.success).length;
    const result = {
      success: errors.length === 0,
      revokedCount,
    };
    if (errors.length > 0) {
      result.errors = errors;
    }
    return result;
  }
  /**
   * Clean up expired sessions
   */
  cleanup() {
    const now = new Date();
    for (const [sessionKey, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionKey);
        // Fire and forget server cleanup
        this.server.revokeSession(sessionKey).catch(() => {});
      }
    }
  }
  /**
   * Get session count
   */
  getActiveSessionCount() {
    return this.activeSessions.size;
  }
}
/**
 * Utility function to create and execute OPAQUE authentication flow
 */
export async function executeOpaqueAuthentication(client, server, username, password, config) {
  const flow = new OpaqueAuthenticationFlow(client, server, username, config);
  return flow.authenticate(password);
}
/**
 * Validate authentication inputs
 */
export function validateAuthenticationInputs(username, password) {
  const errors = [];
  if (!username || username.trim().length === 0) {
    errors.push('Username is required');
  }
  if (!password || password.length === 0) {
    errors.push('Password is required');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
//# sourceMappingURL=authentication.js.map
