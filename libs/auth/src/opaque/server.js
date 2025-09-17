/**
 * OPAQUE Protocol Server Implementation
 *
 * This module implements the server-side OPAQUE protocol for zero-knowledge
 * password authentication without server-side password storage.
 */
import { __awaiter } from 'tslib';
// Dynamic import to handle different environments
let opaqueModule = null;
function getOpaqueModule() {
  return __awaiter(this, void 0, void 0, function* () {
    if (opaqueModule) return opaqueModule;
    try {
      // Try to import the real OPAQUE library
      opaqueModule = yield import('@cloudflare/opaque-ts');
      // Verify the library has the required functions
      if (!opaqueModule.createServerRegistration || !opaqueModule.createServerLogin) {
        throw new Error('OPAQUE library missing required server functions');
      }
      return opaqueModule;
    } catch (error) {
      // Fall back to mock implementation in test environment
      if (
        typeof process !== 'undefined' &&
        (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true')
      ) {
        opaqueModule = yield import('./mock');
        return opaqueModule;
      }
      throw new Error('OPAQUE library not available and not in test environment');
    }
  });
}
/**
 * Default server configuration
 */
const DEFAULT_SERVER_CONFIG = {
  serverIdentity: 'aura-app',
  sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRegistrationAttempts: 5,
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxAttempts: 10,
};
/**
 * OPAQUE protocol server implementation
 */
export class OpaqueServerImpl {
  constructor(config) {
    this.rateLimitMap = new Map();
    // In production, these would be stored in database
    this.registrationStorage = new Map();
    this.sessionStorage = new Map();
    this.config = Object.assign(Object.assign({}, DEFAULT_SERVER_CONFIG), config);
    // Clean up expired sessions and rate limit entries periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupRateLimits();
    }, 60000); // Every minute
  }
  /**
   * Process OPAQUE registration request
   * Server never sees the actual password
   */
  processRegistration(username, registrationRequest) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check rate limiting
        this.checkRateLimit(username);
        if (!username || username.trim().length === 0) {
          throw new Error('Username cannot be empty');
        }
        if (!registrationRequest) {
          throw new Error('Registration request is required');
        }
        // Check if username already exists
        if (this.registrationStorage.has(username)) {
          throw new Error('Username already exists');
        }
        // Create server registration response
        // Server never receives or processes the actual password
        const opaque = yield getOpaqueModule();
        const { response, state } = yield opaque.createServerRegistration({
          request: registrationRequest,
          serverIdentity: new TextEncoder().encode(this.config.serverIdentity),
        });
        this.updateRateLimit(username);
        return {
          registrationResponse: response,
          serverState: state,
        };
      } catch (error) {
        throw this.createError('SERVER_ERROR', 'Failed to process registration', error);
      }
    });
  }
  /**
   * Store OPAQUE registration record
   * Only stores opaque data, never the password
   */
  storeRegistration(username, serverState, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (!username || !serverState || !userId) {
          throw new Error('Username, server state, and user ID are required');
        }
        // Complete server-side registration
        const opaque = yield getOpaqueModule();
        const record = yield opaque.finishServerRegistration({
          state: serverState,
        });
        // Store registration data (password never stored)
        const registration = {
          id: this.generateId(),
          userId,
          username,
          registrationRecord: this.arrayBufferToBase64(record),
          createdAt: new Date(),
        };
        this.registrationStorage.set(username, registration);
      } catch (error) {
        throw this.createError('SERVER_ERROR', 'Failed to store registration', error);
      }
    });
  }
  /**
   * Process OPAQUE authentication request
   * Server verifies authentication without knowing password
   */
  processAuthentication(username, loginRequest) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check rate limiting
        this.checkRateLimit(username);
        if (!username || username.trim().length === 0) {
          throw new Error('Username cannot be empty');
        }
        if (!loginRequest) {
          throw new Error('Login request is required');
        }
        // Get stored registration record
        const registration = this.registrationStorage.get(username);
        if (!registration) {
          throw new Error('User not found');
        }
        // Create server login response
        const opaque = yield getOpaqueModule();
        const { response, state } = yield opaque.createServerLogin({
          request: loginRequest,
          record: this.base64ToArrayBuffer(registration.registrationRecord),
          serverIdentity: new TextEncoder().encode(this.config.serverIdentity),
        });
        this.updateRateLimit(username);
        return {
          loginResponse: response,
          serverState: state,
        };
      } catch (error) {
        throw this.createError('SERVER_ERROR', 'Failed to process authentication', error);
      }
    });
  }
  /**
   * Verify OPAQUE authentication and establish session
   */
  verifyAuthentication(username, serverState) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (!username || !serverState) {
          throw new Error('Username and server state are required');
        }
        const registration = this.registrationStorage.get(username);
        if (!registration) {
          return {
            success: false,
            error: 'User not found',
          };
        }
        // Complete server-side authentication
        const opaque = yield getOpaqueModule();
        yield opaque.finishServerLogin({
          state: serverState,
        });
        // Create secure session
        const sessionId = this.generateSessionId();
        const expiresAt = Date.now() + this.config.sessionTimeoutMs;
        this.sessionStorage.set(sessionId, {
          userId: registration.userId,
          expiresAt,
        });
        // Update last used timestamp
        registration.lastUsedAt = new Date();
        return {
          success: true,
          sessionKey: sessionId,
          userId: registration.userId,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        };
      }
    });
  }
  /**
   * Validate existing session
   */
  validateSession(sessionKey) {
    return __awaiter(this, void 0, void 0, function* () {
      const session = this.sessionStorage.get(sessionKey);
      if (!session || session.expiresAt < Date.now()) {
        if (session) {
          this.sessionStorage.delete(sessionKey);
        }
        return { isValid: false };
      }
      return {
        isValid: true,
        userId: session.userId,
      };
    });
  }
  /**
   * Revoke session (logout)
   */
  revokeSession(sessionKey) {
    return __awaiter(this, void 0, void 0, function* () {
      this.sessionStorage.delete(sessionKey);
    });
  }
  /**
   * Get user by username
   */
  getUserByUsername(username) {
    return __awaiter(this, void 0, void 0, function* () {
      return this.registrationStorage.get(username) || null;
    });
  }
  /**
   * Delete user registration (account deletion)
   */
  deleteUser(username) {
    return __awaiter(this, void 0, void 0, function* () {
      this.registrationStorage.delete(username);
    });
  }
  /**
   * Check rate limiting for IP/username
   */
  checkRateLimit(identifier) {
    const entry = this.rateLimitMap.get(identifier);
    const now = Date.now();
    if (!entry) {
      return; // First attempt, allow
    }
    // Check if window has expired
    if (now - entry.firstAttempt > this.config.rateLimitWindowMs) {
      this.rateLimitMap.delete(identifier);
      return;
    }
    // Check if too many attempts
    if (entry.attempts >= this.config.rateLimitMaxAttempts) {
      throw this.createError(
        'SERVER_ERROR',
        `Too many attempts. Try again in ${Math.ceil((entry.firstAttempt + this.config.rateLimitWindowMs - now) / 1000 / 60)} minutes`
      );
    }
  }
  /**
   * Update rate limiting counter
   */
  updateRateLimit(identifier) {
    const now = Date.now();
    const existing = this.rateLimitMap.get(identifier);
    if (!existing || now - existing.firstAttempt > this.config.rateLimitWindowMs) {
      // New window
      this.rateLimitMap.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    } else {
      // Increment existing window
      existing.attempts++;
      existing.lastAttempt = now;
    }
  }
  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessionStorage.entries()) {
      if (session.expiresAt < now) {
        this.sessionStorage.delete(sessionId);
      }
    }
  }
  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimits() {
    const now = Date.now();
    for (const [identifier, entry] of this.rateLimitMap.entries()) {
      if (now - entry.firstAttempt > this.config.rateLimitWindowMs) {
        this.rateLimitMap.delete(identifier);
      }
    }
  }
  /**
   * Generate unique ID
   */
  generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  /**
   * Generate secure session ID
   */
  generateSessionId() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  /**
   * Convert ArrayBuffer to Base64 string
   */
  arrayBufferToBase64(buffer) {
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
  base64ToArrayBuffer(base64) {
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
  createError(code, message, originalError) {
    const error = {
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
 * Create new OPAQUE server instance
 */
export function createOpaqueServer(config) {
  return new OpaqueServerImpl(config);
}
//# sourceMappingURL=server.js.map
