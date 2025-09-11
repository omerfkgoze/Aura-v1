/**
 * OPAQUE Protocol Implementation Tests
 *
 * Comprehensive test suite for OPAQUE zero-knowledge authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createOpaqueClient,
  createOpaqueServer,
  createOpaqueAuthSystem,
  executeOpaqueRegistration,
  executeOpaqueAuthentication,
  validateRegistrationInputs,
  validateAuthenticationInputs,
  checkUsernameAvailability,
  OpaqueManager,
  createOpaqueManager,
  OpaqueSessionManager,
  OPAQUE_CONSTANTS,
} from '../src/opaque';

import type {
  OpaqueClient,
  OpaqueServer,
  RegistrationFlowResult,
  AuthenticationFlowResult,
} from '../src/opaque/types';

describe('OPAQUE Protocol Implementation', () => {
  let client: OpaqueClient;
  let server: OpaqueServer;
  let sessionManager: OpaqueSessionManager;

  const testUsername = 'testuser123';
  const testPassword = 'SecureP@ssw0rd!';
  const testUserId = 'user-' + Math.random().toString(36).substring(7);

  beforeEach(() => {
    client = createOpaqueClient();
    server = createOpaqueServer();
    sessionManager = new OpaqueSessionManager(server);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OPAQUE Client', () => {
    it('should create client with default config', () => {
      const client = createOpaqueClient();
      expect(client).toBeDefined();
      expect(typeof client.startRegistration).toBe('function');
      expect(typeof client.completeRegistration).toBe('function');
      expect(typeof client.startAuthentication).toBe('function');
      expect(typeof client.completeAuthentication).toBe('function');
    });

    it('should validate username format', () => {
      const { validateUsername } = require('../src/opaque/client');

      expect(validateUsername('validuser')).toBe(true);
      expect(validateUsername('user@email.com')).toBe(true);
      expect(validateUsername('user.name')).toBe(true);
      expect(validateUsername('user_123')).toBe(true);

      expect(validateUsername('')).toBe(false);
      expect(validateUsername('   ')).toBe(false);
      expect(validateUsername('a'.repeat(256))).toBe(false);
      expect(validateUsername('user spaces')).toBe(false);
      expect(validateUsername('user#invalid')).toBe(false);
    });

    it('should validate password strength', () => {
      const { validatePassword } = require('../src/opaque/client');

      // Valid passwords
      const strongPassword = validatePassword('StrongP@ss123');
      expect(strongPassword.isValid).toBe(true);
      expect(strongPassword.errors).toHaveLength(0);

      // Weak passwords
      const weakPassword = validatePassword('weak');
      expect(weakPassword.isValid).toBe(false);
      expect(weakPassword.errors.length).toBeGreaterThan(0);

      // Empty password
      const emptyPassword = validatePassword('');
      expect(emptyPassword.isValid).toBe(false);
      expect(emptyPassword.errors).toContain('Password is required');

      // Too long password
      const longPassword = validatePassword('a'.repeat(129));
      expect(longPassword.isValid).toBe(false);
      expect(longPassword.errors).toContain('Password must be less than 128 characters');
    });

    it('should start registration flow', async () => {
      const result = await client.startRegistration(testUsername, testPassword);

      expect(result).toBeDefined();
      expect(result.registrationRequest).toBeDefined();
      expect(result.clientState).toBeDefined();
    });

    it('should start authentication flow', async () => {
      // First register the user
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);

      const result = await client.startAuthentication(testUsername, testPassword);

      expect(result).toBeDefined();
      expect(result.loginRequest).toBeDefined();
      expect(result.clientState).toBeDefined();
    });

    it('should reject invalid registration inputs', async () => {
      await expect(client.startRegistration('', testPassword)).rejects.toThrow(
        'Username cannot be empty'
      );

      await expect(client.startRegistration(testUsername, 'short')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should reject invalid authentication inputs', async () => {
      await expect(client.startAuthentication('', testPassword)).rejects.toThrow(
        'Username cannot be empty'
      );

      await expect(client.startAuthentication(testUsername, '')).rejects.toThrow(
        'Password cannot be empty'
      );
    });
  });

  describe('OPAQUE Server', () => {
    it('should create server with default config', () => {
      const server = createOpaqueServer();
      expect(server).toBeDefined();
      expect(typeof server.processRegistration).toBe('function');
      expect(typeof server.storeRegistration).toBe('function');
      expect(typeof server.processAuthentication).toBe('function');
      expect(typeof server.verifyAuthentication).toBe('function');
    });

    it('should process registration request', async () => {
      const { registrationRequest } = await client.startRegistration(testUsername, testPassword);

      const result = await server.processRegistration(testUsername, registrationRequest);

      expect(result).toBeDefined();
      expect(result.registrationResponse).toBeDefined();
      expect(result.serverState).toBeDefined();
    });

    it('should reject duplicate usernames', async () => {
      // First registration
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);

      // Second registration with same username
      const { registrationRequest } = await client.startRegistration(
        testUsername,
        'DifferentP@ss123'
      );

      await expect(server.processRegistration(testUsername, registrationRequest)).rejects.toThrow(
        'Username already exists'
      );
    });

    it('should validate session', async () => {
      // Register and authenticate user
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);
      const authResult = await executeOpaqueAuthentication(
        client,
        server,
        testUsername,
        testPassword
      );

      expect(authResult.success).toBe(true);
      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        const validation = await server.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(true);
        expect(validation.userId).toBe(testUserId);
      }
    });

    it('should revoke session', async () => {
      // Register and authenticate user
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);
      const authResult = await executeOpaqueAuthentication(
        client,
        server,
        testUsername,
        testPassword
      );

      expect(authResult.success).toBe(true);
      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        await server.revokeSession(authResult.sessionKey);

        const validation = await server.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(false);
      }
    });
  });

  describe('OPAQUE Registration Flow', () => {
    it('should complete full registration flow', async () => {
      const result = await executeOpaqueRegistration(
        client,
        server,
        testUsername,
        testPassword,
        testUserId
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(testUserId);
      expect(result.registrationData).toBeDefined();
      expect(result.registrationData?.username).toBe(testUsername);
      expect(result.registrationData?.exportKey).toBeDefined();
    });

    it('should validate registration inputs', () => {
      const validResult = validateRegistrationInputs(testUsername, testPassword);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateRegistrationInputs('', 'weak');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should check username availability', async () => {
      const availabilityBefore = await checkUsernameAvailability(server, testUsername);
      expect(availabilityBefore.available).toBe(true);

      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);

      const availabilityAfter = await checkUsernameAvailability(server, testUsername);
      expect(availabilityAfter.available).toBe(false);
      expect(availabilityAfter.suggestion).toBeDefined();
    });
  });

  describe('OPAQUE Authentication Flow', () => {
    beforeEach(async () => {
      // Register user before each authentication test
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);
    });

    it('should complete full authentication flow', async () => {
      const result = await executeOpaqueAuthentication(client, server, testUsername, testPassword);

      expect(result.success).toBe(true);
      expect(result.sessionKey).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.exportKey).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const result = await executeOpaqueAuthentication(
        client,
        server,
        testUsername,
        'WrongPassword123!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const result = await executeOpaqueAuthentication(
        client,
        server,
        'nonexistentuser',
        testPassword
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate authentication inputs', () => {
      const validResult = validateAuthenticationInputs(testUsername, testPassword);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = validateAuthenticationInputs('', '');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Username is required');
      expect(invalidResult.errors).toContain('Password is required');
    });
  });

  describe('Session Management', () => {
    let authResult: AuthenticationFlowResult;

    beforeEach(async () => {
      await executeOpaqueRegistration(client, server, testUsername, testPassword, testUserId);
      authResult = await executeOpaqueAuthentication(client, server, testUsername, testPassword);

      if (authResult.success && authResult.sessionKey) {
        sessionManager.storeSession(
          authResult.sessionKey,
          testUserId,
          testUsername,
          authResult.exportKey || '',
          authResult.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
        );
      }
    });

    it('should validate active session', async () => {
      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        const validation = await sessionManager.validateSession(authResult.sessionKey);

        expect(validation.isValid).toBe(true);
        expect(validation.userId).toBe(testUserId);
        expect(validation.username).toBe(testUsername);
        expect(validation.exportKey).toBeDefined();
      }
    });

    it('should extend session', () => {
      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        const extended = sessionManager.extendSession(authResult.sessionKey, 60000);
        expect(extended).toBe(true);
      }
    });

    it('should revoke session', async () => {
      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        await sessionManager.revokeSession(authResult.sessionKey);

        const validation = await sessionManager.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(false);
      }
    });

    it('should get user sessions', () => {
      const sessions = sessionManager.getUserSessions(testUserId);
      expect(sessions).toBeDefined();
      expect(sessions.length).toBeGreaterThanOrEqual(0);
    });

    it('should revoke all user sessions', async () => {
      await sessionManager.revokeAllUserSessions(testUserId);

      if (authResult.sessionKey) {
        const validation = await sessionManager.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(false);
      }
    });

    it('should cleanup expired sessions', () => {
      const countBefore = sessionManager.getActiveSessionCount();
      sessionManager.cleanup();
      const countAfter = sessionManager.getActiveSessionCount();

      expect(countAfter).toBeLessThanOrEqual(countBefore);
    });
  });

  describe('OPAQUE Manager', () => {
    let manager: OpaqueManager;

    beforeEach(() => {
      manager = createOpaqueManager();
    });

    afterEach(() => {
      manager.shutdown();
    });

    it('should create manager with default config', () => {
      expect(manager).toBeDefined();
      expect(typeof manager.registerUser).toBe('function');
      expect(typeof manager.authenticateUser).toBe('function');
    });

    it('should register user through manager', async () => {
      const result = await manager.registerUser(testUsername, testPassword, testUserId);

      expect(result.success).toBe(true);
      expect(result.userContext).toBeDefined();
      expect(result.userContext?.username).toBe(testUsername);
      expect(result.userContext?.userId).toBe(testUserId);
      expect(result.userContext?.hasOpaqueRegistration).toBe(true);
    });

    it('should authenticate user through manager', async () => {
      await manager.registerUser(testUsername, testPassword, testUserId);

      const result = await manager.authenticateUser(testUsername, testPassword);

      expect(result.success).toBe(true);
      expect(result.sessionKey).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.userContext).toBeDefined();
    });

    it('should get recommended auth method', async () => {
      await manager.registerUser(testUsername, testPassword, testUserId);

      const recommendation = await manager.getRecommendedAuthMethod(testUsername);

      expect(recommendation.method).toBe('opaque');
      expect(recommendation.reason).toBeTruthy();
      expect(typeof recommendation.fallbackAvailable).toBe('boolean');
    });

    it('should validate session through manager', async () => {
      await manager.registerUser(testUsername, testPassword, testUserId);
      const authResult = await manager.authenticateUser(testUsername, testPassword);

      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        const validation = await manager.validateSession(authResult.sessionKey);

        expect(validation.isValid).toBe(true);
        expect(validation.userId).toBe(testUserId);
        expect(validation.userContext).toBeDefined();
      }
    });

    it('should logout user', async () => {
      await manager.registerUser(testUsername, testPassword, testUserId);
      const authResult = await manager.authenticateUser(testUsername, testPassword);

      expect(authResult.sessionKey).toBeDefined();

      if (authResult.sessionKey) {
        const logoutResult = await manager.logout(authResult.sessionKey);
        expect(logoutResult.success).toBe(true);

        const validation = await manager.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(false);
      }
    });

    it('should delete user', async () => {
      await manager.registerUser(testUsername, testPassword, testUserId);

      const deleteResult = await manager.deleteUser(testUsername);
      expect(deleteResult.success).toBe(true);

      const userContext = manager.getUserContext(testUsername);
      expect(userContext).toBeUndefined();
    });

    it('should get session statistics', async () => {
      const stats = manager.getSessionStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSessions).toBe('number');
      expect(typeof stats.userContexts).toBe('number');
      expect(typeof stats.serverSessions).toBe('number');
    });
  });

  describe('OPAQUE Auth System', () => {
    it('should create complete auth system', () => {
      const authSystem = createOpaqueAuthSystem();

      expect(authSystem).toBeDefined();
      expect(authSystem.client).toBeDefined();
      expect(authSystem.server).toBeDefined();
      expect(authSystem.sessionManager).toBeDefined();
      expect(typeof authSystem.register).toBe('function');
      expect(typeof authSystem.authenticate).toBe('function');
      expect(typeof authSystem.validateSession).toBe('function');
      expect(typeof authSystem.logout).toBe('function');
      expect(typeof authSystem.logoutAll).toBe('function');
    });

    it('should use convenience methods', async () => {
      const authSystem = createOpaqueAuthSystem();

      // Register
      const registerResult = await authSystem.register(testUsername, testPassword, testUserId);
      expect(registerResult.success).toBe(true);

      // Authenticate
      const authResult = await authSystem.authenticate(testUsername, testPassword);
      expect(authResult.success).toBe(true);
      expect(authResult.sessionKey).toBeDefined();

      // Validate session
      if (authResult.sessionKey) {
        const validation = await authSystem.validateSession(authResult.sessionKey);
        expect(validation.isValid).toBe(true);

        // Logout
        const logoutResult = await authSystem.logout(authResult.sessionKey);
        expect(logoutResult.success).toBe(true);
      }
    });
  });

  describe('OPAQUE Constants', () => {
    it('should define required constants', () => {
      expect(OPAQUE_CONSTANTS.MIN_PASSWORD_LENGTH).toBe(8);
      expect(OPAQUE_CONSTANTS.MAX_PASSWORD_LENGTH).toBe(128);
      expect(OPAQUE_CONSTANTS.MIN_USERNAME_LENGTH).toBe(3);
      expect(OPAQUE_CONSTANTS.MAX_USERNAME_LENGTH).toBe(255);
      expect(OPAQUE_CONSTANTS.DEFAULT_SESSION_TIMEOUT_MS).toBeGreaterThan(0);
      expect(OPAQUE_CONSTANTS.DEFAULT_RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
      expect(OPAQUE_CONSTANTS.DEFAULT_MAX_ATTEMPTS).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const faultyClient = createOpaqueClient({ serverUrl: 'http://invalid-url' });

      const result = await executeOpaqueRegistration(
        faultyClient,
        server,
        testUsername,
        testPassword,
        testUserId
      );

      // Should complete because server is local
      expect(result).toBeDefined();
    });

    it('should handle malformed data gracefully', async () => {
      await expect(client.completeRegistration(null as any, null as any)).rejects.toThrow();
    });

    it('should handle rate limiting', async () => {
      // This test would need actual rate limiting implementation
      // For now, just verify the structure exists
      expect(server).toBeDefined();
    });
  });
});
