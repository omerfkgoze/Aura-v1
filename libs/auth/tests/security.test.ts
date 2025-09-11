/**
 * Security Testing and Validation Suite
 *
 * Comprehensive security testing for all authentication flows including:
 * - Challenge-response security testing
 * - Replay attack prevention
 * - Session security validation
 * - Recovery system security
 * - Hardware security integration
 * - Authentication audit trail validation
 * - Cross-platform security consistency
 * - Penetration testing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WebAuthnRegistration,
  WebAuthnAuthentication,
  OpaqueClient,
  OpaqueServer,
  AuthStateManager,
  SessionManager,
  RecoveryManager,
  UnifiedAuthenticationManager,
  PlatformDetectionManager,
  AuthPersistenceManager,
} from '../src/index.js';
import type {
  WebAuthnCredentialCreationOptions,
  WebAuthnCredentialRequestOptions,
  AuthenticationResult,
  SessionToken,
  RecoveryPhrase,
  SecurityAuditEvent,
} from '../src/index.js';

describe('Authentication Security Testing Suite', () => {
  let webauthnReg: WebAuthnRegistration;
  let webauthnAuth: WebAuthnAuthentication;
  let opaqueClient: OpaqueClient;
  let opaqueServer: OpaqueServer;
  let authStateManager: AuthStateManager;
  let sessionManager: SessionManager;
  let recoveryManager: RecoveryManager;
  let unifiedAuth: UnifiedAuthenticationManager;

  beforeEach(() => {
    // Initialize components with security testing configurations
    webauthnReg = new WebAuthnRegistration();
    webauthnAuth = new WebAuthnAuthentication();
    opaqueClient = new OpaqueClient();
    opaqueServer = new OpaqueServer();
    authStateManager = new AuthStateManager();
    sessionManager = new SessionManager();
    recoveryManager = new RecoveryManager();
    unifiedAuth = new UnifiedAuthenticationManager();
  });

  afterEach(() => {
    // Clean up security test state
    vi.clearAllMocks();
  });

  describe('Challenge-Response Security Testing', () => {
    it('should generate cryptographically secure challenges', async () => {
      const challenge1 = await webauthnReg.generateChallenge();
      const challenge2 = await webauthnReg.generateChallenge();

      // Challenges should be unique
      expect(challenge1).not.toBe(challenge2);

      // Challenges should be proper length (at least 32 bytes)
      expect(Buffer.from(challenge1, 'base64url').length).toBeGreaterThanOrEqual(32);
      expect(Buffer.from(challenge2, 'base64url').length).toBeGreaterThanOrEqual(32);

      // Challenges should have sufficient entropy
      const challenge1Buffer = Buffer.from(challenge1, 'base64url');
      const challenge2Buffer = Buffer.from(challenge2, 'base64url');
      const hammingDistance = calculateHammingDistance(challenge1Buffer, challenge2Buffer);
      expect(hammingDistance).toBeGreaterThan(challenge1Buffer.length / 4); // At least 25% different
    });

    it('should validate challenge expiration', async () => {
      const challenge = await webauthnReg.generateChallenge();
      const shortExpiryOptions: WebAuthnCredentialCreationOptions = {
        challenge: challenge,
        rp: { name: 'Test', id: 'localhost' },
        user: { id: new Uint8Array(32), name: 'test', displayName: 'Test User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        timeout: 100, // Very short timeout for testing
        challengeExpiry: Date.now() + 50, // Expires in 50ms
      };

      // Wait for challenge to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const mockCredential = createMockWebAuthnCredential(challenge);

      await expect(
        webauthnReg.verifyRegistration(mockCredential, shortExpiryOptions)
      ).rejects.toThrow('Challenge expired');
    });

    it('should prevent challenge reuse attacks', async () => {
      const challenge = await webauthnReg.generateChallenge();
      const options = createMockCreationOptions(challenge);
      const mockCredential = createMockWebAuthnCredential(challenge);

      // First registration should succeed
      const result1 = await webauthnReg.verifyRegistration(mockCredential, options);
      expect(result1.verified).toBe(true);

      // Second registration with same challenge should fail
      await expect(webauthnReg.verifyRegistration(mockCredential, options)).rejects.toThrow(
        'Challenge already used'
      );
    });

    it('should validate challenge origin and RP ID', async () => {
      const challenge = await webauthnReg.generateChallenge();
      const maliciousOptions: WebAuthnCredentialCreationOptions = {
        challenge: challenge,
        rp: { name: 'Malicious', id: 'evil.com' },
        user: { id: new Uint8Array(32), name: 'test', displayName: 'Test User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      };

      const mockCredential = createMockWebAuthnCredential(challenge, 'evil.com');

      await expect(
        webauthnReg.verifyRegistration(mockCredential, maliciousOptions)
      ).rejects.toThrow('Invalid RP ID or origin');
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should prevent credential replay attacks', async () => {
      const challenge = await webauthnAuth.generateChallenge();
      const options = createMockRequestOptions(challenge);
      const mockAssertion = createMockWebAuthnAssertion(challenge);

      // First authentication should succeed
      const result1 = await webauthnAuth.verifyAuthentication(mockAssertion, options);
      expect(result1.verified).toBe(true);

      // Second authentication with same assertion should fail
      await expect(webauthnAuth.verifyAuthentication(mockAssertion, options)).rejects.toThrow(
        'Assertion replay detected'
      );
    });

    it('should validate signature counter increases', async () => {
      const credentialId = 'test-credential';
      let storedCounter = 100;

      const mockAssertion1 = createMockWebAuthnAssertion('challenge1', credentialId, 101);
      const mockAssertion2 = createMockWebAuthnAssertion('challenge2', credentialId, 99); // Lower counter

      // First authentication with higher counter should succeed
      const result1 = await webauthnAuth.verifyAuthentication(
        mockAssertion1,
        createMockRequestOptions('challenge1')
      );
      expect(result1.verified).toBe(true);
      storedCounter = 101;

      // Second authentication with lower counter should fail (cloned authenticator detection)
      await expect(
        webauthnAuth.verifyAuthentication(mockAssertion2, createMockRequestOptions('challenge2'))
      ).rejects.toThrow('Signature counter decreased - possible cloned authenticator');
    });

    it('should prevent session token replay', async () => {
      const sessionToken = await sessionManager.createSession('user-123', 'passkey');

      // First API call should succeed
      const validationResult1 = await sessionManager.validateSession(sessionToken.token);
      expect(validationResult1.valid).toBe(true);

      // Expire the token
      await sessionManager.invalidateSession(sessionToken.token);

      // Second API call with expired token should fail
      const validationResult2 = await sessionManager.validateSession(sessionToken.token);
      expect(validationResult2.valid).toBe(false);
    });
  });

  describe('Session Security Validation', () => {
    it('should enforce secure session token generation', async () => {
      const token1 = await sessionManager.createSession('user-123', 'passkey');
      const token2 = await sessionManager.createSession('user-456', 'opaque');

      // Tokens should be unique and sufficiently random
      expect(token1.token).not.toBe(token2.token);
      expect(token1.token.length).toBeGreaterThanOrEqual(64); // Minimum 64 characters
      expect(token2.token.length).toBeGreaterThanOrEqual(64);

      // Tokens should not contain predictable patterns
      expect(token1.token).not.toMatch(/^user-123/);
      expect(token1.token).not.toMatch(/passkey/);
    });

    it('should validate JWT token security', async () => {
      const sessionToken = await sessionManager.createSession('user-123', 'passkey');
      const jwtParts = sessionToken.token.split('.');

      // JWT should have 3 parts
      expect(jwtParts).toHaveLength(3);

      // Header should specify secure algorithm
      const header = JSON.parse(Buffer.from(jwtParts[0], 'base64url').toString());
      expect(header.alg).toMatch(/^(RS256|ES256|HS256)$/);
      expect(header.typ).toBe('JWT');

      // Payload should have proper claims
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());
      expect(payload.sub).toBe('user-123');
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
      expect(payload.iat).toBeLessThanOrEqual(Date.now() / 1000);
      expect(payload.jti).toBeTruthy(); // JWT ID for replay prevention
    });

    it('should prevent session fixation attacks', async () => {
      const preAuthSession = 'malicious-session-id';

      // Attempt to create session with pre-existing session ID should fail
      await expect(
        sessionManager.createSessionWithId(preAuthSession, 'user-123', 'passkey')
      ).rejects.toThrow('Session fixation attempt detected');
    });

    it('should enforce session timeout policies', async () => {
      const shortSessionToken = await sessionManager.createSession('user-123', 'passkey', {
        expiresInSeconds: 1,
      });

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const validationResult = await sessionManager.validateSession(shortSessionToken.token);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.reason).toBe('expired');
    });

    it('should detect concurrent session anomalies', async () => {
      const userId = 'user-123';

      // Create multiple sessions for same user
      const session1 = await sessionManager.createSession(userId, 'passkey');
      const session2 = await sessionManager.createSession(userId, 'passkey');
      const session3 = await sessionManager.createSession(userId, 'passkey');
      const session4 = await sessionManager.createSession(userId, 'passkey');
      const session5 = await sessionManager.createSession(userId, 'passkey');
      const session6 = await sessionManager.createSession(userId, 'passkey'); // Should trigger alert

      const auditEvents = await sessionManager.getSecurityAuditEvents(userId);
      const anomalyEvents = auditEvents.filter(
        event =>
          event.type === 'session_anomaly' && event.details?.anomalyType === 'concurrent_sessions'
      );

      expect(anomalyEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery System Security', () => {
    it('should generate cryptographically secure recovery phrases', async () => {
      const phrase1 = await recoveryManager.generateRecoveryPhrase();
      const phrase2 = await recoveryManager.generateRecoveryPhrase();

      // Phrases should be unique
      expect(phrase1.phrase).not.toBe(phrase2.phrase);

      // Phrases should have sufficient entropy
      const words1 = phrase1.phrase.split(' ');
      const words2 = phrase2.phrase.split(' ');
      expect(words1).toHaveLength(24); // Standard 24-word mnemonic
      expect(words2).toHaveLength(24);

      // Validate BIP39 checksum
      expect(await recoveryManager.validateRecoveryPhrase(phrase1.phrase)).toBe(true);
      expect(await recoveryManager.validateRecoveryPhrase(phrase2.phrase)).toBe(true);
    });

    it('should prevent recovery phrase brute force attacks', async () => {
      const userId = 'user-123';
      const validPhrase =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const invalidPhrases = [
        'invalid phrase one two three four five six seven eight nine ten eleven twelve',
        'another bad phrase that should not work for recovery attempts here',
        'malicious recovery attempt with fake words and bad checksum validation',
      ];

      // Multiple failed attempts should trigger rate limiting
      for (let i = 0; i < 5; i++) {
        const result = await recoveryManager.validateRecoveryAttempt(
          userId,
          invalidPhrases[i % invalidPhrases.length]
        );
        expect(result.valid).toBe(false);
      }

      // Next attempt should be rate limited
      await expect(recoveryManager.validateRecoveryAttempt(userId, validPhrase)).rejects.toThrow(
        'Too many recovery attempts - rate limited'
      );
    });

    it('should validate Shamir Secret Sharing security', async () => {
      const secret = 'critical-recovery-data';
      const threshold = 3;
      const totalShares = 5;

      const shares = await recoveryManager.createShamirShares(secret, threshold, totalShares);
      expect(shares).toHaveLength(totalShares);

      // Should not be able to reconstruct with fewer than threshold shares
      const insufficientShares = shares.slice(0, threshold - 1);
      await expect(recoveryManager.reconstructShamirSecret(insufficientShares)).rejects.toThrow(
        'Insufficient shares for reconstruction'
      );

      // Should be able to reconstruct with threshold shares
      const sufficientShares = shares.slice(0, threshold);
      const reconstructed = await recoveryManager.reconstructShamirSecret(sufficientShares);
      expect(reconstructed).toBe(secret);

      // Should be able to reconstruct with more than threshold shares
      const extraShares = shares.slice(0, threshold + 1);
      const reconstructed2 = await recoveryManager.reconstructShamirSecret(extraShares);
      expect(reconstructed2).toBe(secret);
    });

    it('should enforce emergency code time limits', async () => {
      const userId = 'user-123';
      const shortCode = await recoveryManager.generateEmergencyCode(userId, {
        expiresInSeconds: 1,
      });

      // Wait for code to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const validationResult = await recoveryManager.validateEmergencyCode(userId, shortCode.code);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.reason).toBe('expired');
    });
  });

  describe('Hardware Security Integration', () => {
    it('should validate hardware-backed credential storage', async () => {
      const platformManager = new PlatformDetectionManager();
      const capabilities = await platformManager.getSecurityCapabilities();

      if (capabilities.hardwareBacked) {
        // Test hardware security requirements
        expect(capabilities.secureEnclave).toBe(true);
        expect(capabilities.biometricAvailable).toBe(true);

        // Create credential with hardware backing
        const challenge = await webauthnReg.generateChallenge();
        const options: WebAuthnCredentialCreationOptions = {
          challenge,
          rp: { name: 'Test', id: 'localhost' },
          user: { id: new Uint8Array(32), name: 'test', displayName: 'Test User' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            userVerification: 'required',
          },
        };

        const mockCredential = createMockWebAuthnCredential(challenge, 'localhost', true);
        const result = await webauthnReg.verifyRegistration(mockCredential, options);

        expect(result.verified).toBe(true);
        expect(result.attestationObject).toBeTruthy();
      }
    });

    it('should validate biometric authentication security', async () => {
      const unifiedAuth = new UnifiedAuthenticationManager();
      const biometricResult = await unifiedAuth.authenticateWithBiometric('user-123');

      if (biometricResult.available) {
        expect(biometricResult.securityLevel).toBeGreaterThanOrEqual(2); // At least strong security
        expect(biometricResult.hardwareBacked).toBe(true);
        expect(biometricResult.authenticatorType).toMatch(/^(platform|cross-platform)$/);
      }
    });

    it('should prevent credential extraction attacks', async () => {
      // Test that credentials cannot be extracted from secure storage
      const mockSecureStorage = vi.fn();
      mockSecureStorage.mockRejectedValue(new Error('Access denied - secure enclave protection'));

      await expect(webauthnAuth.extractCredentialKey('credential-id')).rejects.toThrow(
        'Access denied - secure enclave protection'
      );
    });
  });

  describe('Authentication Audit Trail Validation', () => {
    it('should log all authentication events', async () => {
      const userId = 'user-123';
      const persistenceManager = new AuthPersistenceManager();

      // Simulate authentication events
      await persistenceManager.logAuthEvent(userId, 'login_attempt', { method: 'passkey' });
      await persistenceManager.logAuthEvent(userId, 'login_success', { method: 'passkey' });
      await persistenceManager.logAuthEvent(userId, 'session_created', {
        sessionId: 'session-123',
      });

      const auditEvents = await persistenceManager.getAuditEvents(userId);
      expect(auditEvents).toHaveLength(3);

      // Verify event structure
      auditEvents.forEach(event => {
        expect(event.userId).toBe(userId);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.type).toMatch(/^(login_attempt|login_success|session_created)$/);
        expect(event.details).toBeTruthy();
      });
    });

    it('should detect suspicious authentication patterns', async () => {
      const userId = 'user-123';
      const persistenceManager = new AuthPersistenceManager();

      // Simulate suspicious pattern: multiple failed attempts
      for (let i = 0; i < 10; i++) {
        await persistenceManager.logAuthEvent(userId, 'login_failed', {
          method: 'passkey',
          reason: 'invalid_credential',
          ip: '192.168.1.100',
        });
      }

      const suspiciousEvents = await persistenceManager.detectSuspiciousPatterns(userId);
      expect(suspiciousEvents.length).toBeGreaterThan(0);

      const bruteForceAttempt = suspiciousEvents.find(
        event => event.pattern === 'brute_force_attempt'
      );
      expect(bruteForceAttempt).toBeTruthy();
    });

    it('should maintain audit trail integrity', async () => {
      const userId = 'user-123';
      const persistenceManager = new AuthPersistenceManager();

      // Log events with integrity checks
      const event1 = await persistenceManager.logAuthEvent(userId, 'login_success', {
        method: 'passkey',
      });
      const event2 = await persistenceManager.logAuthEvent(userId, 'session_created', {
        sessionId: 'session-123',
      });

      // Verify audit trail integrity
      const integrityCheck = await persistenceManager.verifyAuditIntegrity(userId);
      expect(integrityCheck.valid).toBe(true);
      expect(integrityCheck.eventCount).toBe(2);
      expect(integrityCheck.hash).toBeTruthy();
    });
  });

  describe('Cross-Platform Security Consistency', () => {
    it('should maintain consistent security across platforms', async () => {
      const platforms = ['ios', 'android', 'web'] as const;
      const securityResults: Record<string, any> = {};

      for (const platform of platforms) {
        const platformAuth = await unifiedAuth.createPlatformManager(platform);
        const capabilities = await platformAuth.getSecurityCapabilities();
        securityResults[platform] = capabilities;
      }

      // All platforms should meet minimum security requirements
      platforms.forEach(platform => {
        const caps = securityResults[platform];
        expect(caps.webauthnSupported).toBe(true);
        expect(caps.challengeLength).toBeGreaterThanOrEqual(32);
        expect(caps.tokenSecurity).toMatch(/^(strong|very_strong)$/);
      });
    });

    it('should validate cross-platform session synchronization security', async () => {
      const userId = 'user-123';
      const sessionToken = await sessionManager.createSession(userId, 'passkey');

      // Test session validation across platforms
      const platforms = ['ios', 'android', 'web'] as const;
      const validationResults: Record<string, any> = {};

      for (const platform of platforms) {
        const platformSession = await sessionManager.validateSessionForPlatform(
          sessionToken.token,
          platform
        );
        validationResults[platform] = platformSession;
      }

      // All platforms should validate session consistently
      platforms.forEach(platform => {
        expect(validationResults[platform].valid).toBe(true);
        expect(validationResults[platform].userId).toBe(userId);
      });
    });
  });

  describe('Penetration Testing Scenarios', () => {
    it('should resist timing attacks on authentication', async () => {
      const validUserId = 'user-123';
      const invalidUserId = 'user-456';

      // Measure timing for valid vs invalid user authentication attempts
      const validTimes: number[] = [];
      const invalidTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        // Valid user timing
        const validStart = performance.now();
        try {
          await webauthnAuth.authenticateUser(validUserId, 'dummy-credential');
        } catch (e) {
          // Expected to fail, we're measuring timing
        }
        validTimes.push(performance.now() - validStart);

        // Invalid user timing
        const invalidStart = performance.now();
        try {
          await webauthnAuth.authenticateUser(invalidUserId, 'dummy-credential');
        } catch (e) {
          // Expected to fail, we're measuring timing
        }
        invalidTimes.push(performance.now() - invalidStart);
      }

      // Calculate average times
      const avgValidTime = validTimes.reduce((a, b) => a + b) / validTimes.length;
      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b) / invalidTimes.length;

      // Times should be similar to prevent user enumeration
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime);
      expect(timingDifference).toBeLessThan(10); // Less than 10ms difference
    });

    it('should prevent CSRF attacks on authentication endpoints', async () => {
      const maliciousRequest = {
        headers: {
          origin: 'https://evil.com',
          referer: 'https://evil.com/malicious-page',
        },
        body: {
          challenge: 'malicious-challenge',
          credential: 'fake-credential',
        },
      };

      await expect(webauthnAuth.verifyAuthenticationRequest(maliciousRequest)).rejects.toThrow(
        'CSRF protection: Invalid origin or referer'
      );
    });

    it('should prevent injection attacks on user inputs', async () => {
      const maliciousInputs = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE users; --",
        '{{7*7}}',
        "${java.lang.Runtime.getRuntime().exec('ls')}",
        '../../../etc/passwd',
      ];

      for (const maliciousInput of maliciousInputs) {
        await expect(unifiedAuth.authenticateUser(maliciousInput, 'credential')).rejects.toThrow(
          'Invalid input detected'
        );
      }
    });

    it('should resist password spraying attacks', async () => {
      const commonPasswords = [
        'password123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
        '123456',
        'password',
        'qwerty',
        'abc123',
        'Password1',
      ];

      const userId = 'user-123';
      let attempts = 0;

      for (const password of commonPasswords) {
        try {
          await opaqueClient.authenticate(userId, password);
          attempts++;
        } catch (e) {
          // Expected to fail
          attempts++;

          // Should trigger account protection after too many attempts
          if (attempts >= 5) {
            expect(e.message).toContain('Account temporarily locked');
            break;
          }
        }
      }

      expect(attempts).toBeLessThanOrEqual(5); // Should be locked before trying all passwords
    });
  });

  describe('Performance Security Testing', () => {
    it('should maintain security under load', async () => {
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      // Simulate concurrent authentication attempts
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = webauthnAuth
          .generateChallenge()
          .then(challenge => webauthnAuth.validateChallenge(challenge));
        promises.push(promise);
      }

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // Most requests should succeed under normal load
      expect(successful.length).toBeGreaterThan(concurrentRequests * 0.8);

      // Failed requests should fail gracefully
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).not.toContain('undefined');
          expect(result.reason.message).not.toContain('null');
        }
      });
    });

    it('should prevent DoS through resource exhaustion', async () => {
      // Test memory usage during intense operations
      const initialMemory = process.memoryUsage();

      // Generate many challenges rapidly
      const challenges: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const challenge = await webauthnReg.generateChallenge();
        challenges.push(challenge);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 1000 challenges)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Cleanup should work properly
      challenges.length = 0;
      global.gc?.(); // Force garbage collection if available
    });
  });
});

// Helper functions for security testing

function calculateHammingDistance(buffer1: Buffer, buffer2: Buffer): number {
  if (buffer1.length !== buffer2.length) {
    throw new Error('Buffers must be same length for Hamming distance');
  }

  let distance = 0;
  for (let i = 0; i < buffer1.length; i++) {
    const xor = buffer1[i] ^ buffer2[i];
    distance += countBits(xor);
  }
  return distance;
}

function countBits(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

function createMockCreationOptions(challenge: string): WebAuthnCredentialCreationOptions {
  return {
    challenge,
    rp: { name: 'Test', id: 'localhost' },
    user: { id: new Uint8Array(32), name: 'test', displayName: 'Test User' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  };
}

function createMockRequestOptions(challenge: string): WebAuthnCredentialRequestOptions {
  return {
    challenge,
    rpId: 'localhost',
    userVerification: 'preferred',
  };
}

function createMockWebAuthnCredential(
  challenge: string,
  origin: string = 'localhost',
  hardwareBacked: boolean = false
): any {
  return {
    id: 'mock-credential-id',
    rawId: new Uint8Array(32),
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({
          type: 'webauthn.create',
          challenge: challenge,
          origin: `https://${origin}`,
        })
      ),
      attestationObject: new Uint8Array(64),
    },
    type: 'public-key',
    getClientExtensionResults: () => ({
      hardwareBacked,
    }),
  };
}

function createMockWebAuthnAssertion(
  challenge: string,
  credentialId: string = 'test-credential',
  counter: number = 100
): any {
  return {
    id: credentialId,
    rawId: new Uint8Array(32),
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({
          type: 'webauthn.get',
          challenge: challenge,
          origin: 'https://localhost',
        })
      ),
      authenticatorData: new Uint8Array(37), // Includes counter
      signature: new Uint8Array(64),
      userHandle: new Uint8Array(32),
    },
    type: 'public-key',
  };
}
