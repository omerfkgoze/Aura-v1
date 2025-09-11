/**
 * Cross-Platform Consistency Validation Tests
 *
 * Validates authentication behavior consistency across:
 * - iOS, Android, and Web platforms
 * - Different WebAuthn implementations
 * - Platform-specific security features
 * - Cross-platform session synchronization
 * - Authentication method compatibility
 * - Error handling consistency
 * - Performance consistency
 * - Security policy enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  UnifiedAuthenticationManager,
  IOSWebAuthnManager,
  AndroidWebAuthnManager,
  WebWebAuthnManager,
  PlatformDetectionManager,
  AuthStateManager,
  SessionManager,
  RecoveryManager,
  OpaqueClient,
} from '../src/index.js';
import type {
  DeviceInfo,
  AuthenticationResult,
  SecurityCapabilities,
  BiometricAuthResult,
  WebAuthnCredentialCreationOptions,
  WebAuthnCredentialRequestOptions,
  PlatformAuthenticationMethod,
  CrossPlatformValidationResult,
} from '../src/index.js';

describe('Cross-Platform Consistency Validation', () => {
  let unifiedAuth: UnifiedAuthenticationManager;
  let iosManager: IOSWebAuthnManager;
  let androidManager: AndroidWebAuthnManager;
  let webManager: WebWebAuthnManager;
  let platformDetection: PlatformDetectionManager;
  let authStateManager: AuthStateManager;
  let sessionManager: SessionManager;
  let recoveryManager: RecoveryManager;
  let opaqueClient: OpaqueClient;

  // Test devices representing each platform
  const testDevices: Record<string, DeviceInfo> = {
    ios: {
      id: 'ios-test-device',
      platform: 'ios',
      name: 'iPhone 15 Pro',
      fingerprint: 'ios-device-fingerprint',
      capabilities: {
        webauthnSupported: true,
        biometricAvailable: true,
        hardwareBacked: true,
        secureEnclave: true,
        biometricTypes: ['faceID', 'touchID'],
        platformAuthenticator: true,
      },
    },
    android: {
      id: 'android-test-device',
      platform: 'android',
      name: 'Pixel 8 Pro',
      fingerprint: 'android-device-fingerprint',
      capabilities: {
        webauthnSupported: true,
        biometricAvailable: true,
        hardwareBacked: true,
        strongbox: true,
        biometricTypes: ['fingerprint', 'face', 'iris'],
        platformAuthenticator: true,
      },
    },
    web: {
      id: 'web-test-device',
      platform: 'web',
      name: 'Chrome on macOS',
      fingerprint: 'web-device-fingerprint',
      capabilities: {
        webauthnSupported: true,
        biometricAvailable: false,
        hardwareBacked: true,
        conditionalMediation: true,
        passkeysSupported: true,
        platformAuthenticator: false,
        crossPlatformAuthenticator: true,
      },
    },
  };

  beforeEach(async () => {
    unifiedAuth = new UnifiedAuthenticationManager();
    iosManager = new IOSWebAuthnManager();
    androidManager = new AndroidWebAuthnManager();
    webManager = new WebWebAuthnManager();
    platformDetection = new PlatformDetectionManager();
    authStateManager = new AuthStateManager();
    sessionManager = new SessionManager();
    recoveryManager = new RecoveryManager();
    opaqueClient = new OpaqueClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WebAuthn Implementation Consistency', () => {
    it('should generate consistent challenge formats across platforms', async () => {
      const challenges = {
        ios: await iosManager.generateChallenge(),
        android: await androidManager.generateChallenge(),
        web: await webManager.generateChallenge(),
      };

      // All challenges should be base64url encoded
      Object.values(challenges).forEach(challenge => {
        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(Buffer.from(challenge, 'base64url').length).toBeGreaterThanOrEqual(32);
      });

      // Challenges should be unique across platforms
      const challengeValues = Object.values(challenges);
      const uniqueChallenges = new Set(challengeValues);
      expect(uniqueChallenges.size).toBe(challengeValues.length);
    });

    it('should create consistent credential creation options', async () => {
      const userId = 'test-user';
      const challenge = 'test-challenge-base64url';

      const creationOptions = {
        ios: await iosManager.createCredentialCreationOptions(userId, challenge, testDevices.ios),
        android: await androidManager.createCredentialCreationOptions(
          userId,
          challenge,
          testDevices.android
        ),
        web: await webManager.createCredentialCreationOptions(userId, challenge, testDevices.web),
      };

      // Validate common properties across platforms
      Object.entries(creationOptions).forEach(([platform, options]) => {
        expect(options.challenge).toBe(challenge);
        expect(options.user.id).toBeTruthy();
        expect(options.user.name).toBeTruthy();
        expect(options.user.displayName).toBeTruthy();
        expect(options.rp.name).toBeTruthy();
        expect(options.rp.id).toBeTruthy();
        expect(options.pubKeyCredParams).toBeInstanceOf(Array);
        expect(options.pubKeyCredParams.length).toBeGreaterThan(0);

        // Algorithm support should be consistent
        const supportedAlgs = options.pubKeyCredParams.map(param => param.alg);
        expect(supportedAlgs).toContain(-7); // ES256
      });

      // Platform-specific validation
      expect(creationOptions.ios.authenticatorSelection?.authenticatorAttachment).toBe('platform');
      expect(creationOptions.android.authenticatorSelection?.authenticatorAttachment).toBe(
        'platform'
      );
      expect(creationOptions.web.authenticatorSelection?.authenticatorAttachment).toBeUndefined(); // Allow both
    });

    it('should handle credential request options consistently', async () => {
      const challenge = 'auth-challenge-base64url';
      const credentialIds = ['cred-1', 'cred-2', 'cred-3'];

      const requestOptions = {
        ios: await iosManager.createCredentialRequestOptions(
          challenge,
          credentialIds,
          testDevices.ios
        ),
        android: await androidManager.createCredentialRequestOptions(
          challenge,
          credentialIds,
          testDevices.android
        ),
        web: await webManager.createCredentialRequestOptions(
          challenge,
          credentialIds,
          testDevices.web
        ),
      };

      // Validate consistency across platforms
      Object.entries(requestOptions).forEach(([platform, options]) => {
        expect(options.challenge).toBe(challenge);
        expect(options.allowCredentials).toBeInstanceOf(Array);
        expect(options.allowCredentials?.length).toBe(credentialIds.length);
        expect(options.userVerification).toMatch(/^(required|preferred|discouraged)$/);

        // Timeout should be reasonable and consistent
        expect(options.timeout).toBeGreaterThanOrEqual(30000); // At least 30 seconds
        expect(options.timeout).toBeLessThanOrEqual(300000); // At most 5 minutes
      });
    });

    it('should validate credentials consistently across platforms', async () => {
      const testCredential = createMockWebAuthnCredential();
      const challenge = 'validation-challenge';

      const validationResults = {
        ios: await iosManager.validateWebAuthnCredential(
          testCredential,
          challenge,
          testDevices.ios
        ),
        android: await androidManager.validateWebAuthnCredential(
          testCredential,
          challenge,
          testDevices.android
        ),
        web: await webManager.validateWebAuthnCredential(
          testCredential,
          challenge,
          testDevices.web
        ),
      };

      // All platforms should agree on credential validity
      const validationStatuses = Object.values(validationResults).map(result => result.valid);
      const uniqueStatuses = new Set(validationStatuses);
      expect(uniqueStatuses.size).toBe(1); // All should be the same (either all valid or all invalid)

      // If valid, all platforms should extract same key information
      if (validationResults.ios.valid) {
        Object.values(validationResults).forEach(result => {
          expect(result.credentialId).toBe(testCredential.id);
          expect(result.userHandle).toEqual(testCredential.response.userHandle);
          expect(result.authenticatorData).toBeTruthy();
        });
      }
    });
  });

  describe('Biometric Authentication Consistency', () => {
    it('should provide consistent biometric capability detection', async () => {
      const biometricCapabilities = {
        ios: await iosManager.getBiometricCapabilities(testDevices.ios),
        android: await androidManager.getBiometricCapabilities(testDevices.android),
        web: await webManager.getBiometricCapabilities(testDevices.web),
      };

      // Validate capability structure consistency
      Object.entries(biometricCapabilities).forEach(([platform, capabilities]) => {
        expect(capabilities).toHaveProperty('available');
        expect(capabilities).toHaveProperty('types');
        expect(capabilities).toHaveProperty('securityLevel');
        expect(capabilities).toHaveProperty('hardwareBacked');

        // Security level should be numeric and reasonable
        if (capabilities.available) {
          expect(capabilities.securityLevel).toBeGreaterThanOrEqual(1);
          expect(capabilities.securityLevel).toBeLessThanOrEqual(3);
        }
      });

      // Platform-specific expectations
      expect(biometricCapabilities.ios.available).toBe(true);
      expect(biometricCapabilities.android.available).toBe(true);
      expect(biometricCapabilities.web.available).toBe(false); // Web doesn't have direct biometric access
    });

    it('should handle biometric authentication results consistently', async () => {
      const userId = 'biometric-test-user';

      // Mock biometric authentication for each platform
      const biometricResults = {
        ios: await iosManager.authenticateWithBiometric(userId, testDevices.ios),
        android: await androidManager.authenticateWithBiometric(userId, testDevices.android),
      };

      // Both mobile platforms should provide similar result structures
      Object.entries(biometricResults).forEach(([platform, result]) => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('biometricType');
        expect(result).toHaveProperty('hardwareBacked');
        expect(result).toHaveProperty('timestamp');

        if (result.success) {
          expect(result.biometricType).toMatch(/^(faceID|touchID|fingerprint|face|iris)$/);
          expect(result.hardwareBacked).toBe(true);
          expect(result.timestamp).toBeInstanceOf(Date);
        }
      });
    });

    it('should handle biometric failure scenarios consistently', async () => {
      const userId = 'biometric-failure-test';

      // Simulate biometric failures
      const failureScenarios = [
        'user_cancel',
        'sensor_unavailable',
        'too_many_attempts',
        'hardware_error',
      ];

      for (const scenario of failureScenarios) {
        const results = {
          ios: await iosManager.simulateBiometricFailure(userId, scenario, testDevices.ios),
          android: await androidManager.simulateBiometricFailure(
            userId,
            scenario,
            testDevices.android
          ),
        };

        Object.entries(results).forEach(([platform, result]) => {
          expect(result.success).toBe(false);
          expect(result.error).toBe(scenario);
          expect(result.fallbackAvailable).toBeTypeOf('boolean');

          // Error handling should be consistent
          if (scenario === 'too_many_attempts') {
            expect(result.lockoutDuration).toBeGreaterThan(0);
          }
        });
      }
    });
  });

  describe('Session Management Consistency', () => {
    it('should create consistent session tokens across platforms', async () => {
      const userId = 'session-consistency-user';
      const authMethod = 'passkey';

      const sessionTokens = {
        ios: await sessionManager.createSession(userId, authMethod, { platform: 'ios' }),
        android: await sessionManager.createSession(userId, authMethod, { platform: 'android' }),
        web: await sessionManager.createSession(userId, authMethod, { platform: 'web' }),
      };

      // All tokens should have same structure
      Object.values(sessionTokens).forEach(tokenData => {
        expect(tokenData.token).toBeTruthy();
        expect(tokenData.expiresAt).toBeInstanceOf(Date);
        expect(tokenData.userId).toBe(userId);
        expect(tokenData.authMethod).toBe(authMethod);

        // JWT structure validation
        const jwtParts = tokenData.token.split('.');
        expect(jwtParts).toHaveLength(3);
      });

      // Tokens should be unique
      const tokens = Object.values(sessionTokens).map(t => t.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should validate sessions consistently across platforms', async () => {
      const userId = 'session-validation-user';
      const sessionToken = await sessionManager.createSession(userId, 'passkey');

      const validationResults = {
        ios: await sessionManager.validateSession(sessionToken.token, { platform: 'ios' }),
        android: await sessionManager.validateSession(sessionToken.token, { platform: 'android' }),
        web: await sessionManager.validateSession(sessionToken.token, { platform: 'web' }),
      };

      // All platforms should validate the session consistently
      Object.values(validationResults).forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.userId).toBe(userId);
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.platform).toBeTruthy();
      });
    });

    it('should handle session expiration consistently', async () => {
      const userId = 'session-expiry-user';
      const shortSessionToken = await sessionManager.createSession(userId, 'passkey', {
        expiresInSeconds: 1,
      });

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expiredValidationResults = {
        ios: await sessionManager.validateSession(shortSessionToken.token, { platform: 'ios' }),
        android: await sessionManager.validateSession(shortSessionToken.token, {
          platform: 'android',
        }),
        web: await sessionManager.validateSession(shortSessionToken.token, { platform: 'web' }),
      };

      // All platforms should consistently reject expired sessions
      Object.values(expiredValidationResults).forEach(result => {
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('expired');
      });
    });
  });

  describe('Recovery System Consistency', () => {
    it('should generate consistent recovery phrases across platforms', async () => {
      const recoveryPhrases = {
        ios: await recoveryManager.generateRecoveryPhrase({ platform: 'ios' }),
        android: await recoveryManager.generateRecoveryPhrase({ platform: 'android' }),
        web: await recoveryManager.generateRecoveryPhrase({ platform: 'web' }),
      };

      // All platforms should generate BIP39-compliant phrases
      Object.values(recoveryPhrases).forEach(phraseData => {
        const words = phraseData.phrase.split(' ');
        expect(words).toHaveLength(24); // Standard 24-word mnemonic

        // Each word should be valid BIP39 word
        words.forEach(word => {
          expect(word).toMatch(/^[a-z]+$/); // Only lowercase letters
          expect(word.length).toBeGreaterThanOrEqual(3); // Minimum word length
        });

        // Phrases should have valid checksums
        expect(phraseData.checksum).toBeTruthy();
        expect(phraseData.entropyBits).toBe(256); // 24 words = 256 bits entropy
      });

      // Phrases should be unique
      const phrases = Object.values(recoveryPhrases).map(p => p.phrase);
      const uniquePhrases = new Set(phrases);
      expect(uniquePhrases.size).toBe(phrases.length);
    });

    it('should validate recovery phrases consistently across platforms', async () => {
      const testPhrase =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

      const validationResults = {
        ios: await recoveryManager.validateRecoveryPhrase(testPhrase, { platform: 'ios' }),
        android: await recoveryManager.validateRecoveryPhrase(testPhrase, { platform: 'android' }),
        web: await recoveryManager.validateRecoveryPhrase(testPhrase, { platform: 'web' }),
      };

      // All platforms should consistently validate the same phrase
      const isValid = Object.values(validationResults).every(result => result === true);
      expect(isValid).toBe(true);

      // Test invalid phrase
      const invalidPhrase = 'invalid phrase with wrong checksum here for testing';
      const invalidValidationResults = {
        ios: await recoveryManager.validateRecoveryPhrase(invalidPhrase, { platform: 'ios' }),
        android: await recoveryManager.validateRecoveryPhrase(invalidPhrase, {
          platform: 'android',
        }),
        web: await recoveryManager.validateRecoveryPhrase(invalidPhrase, { platform: 'web' }),
      };

      // All platforms should consistently reject invalid phrases
      const allInvalid = Object.values(invalidValidationResults).every(result => result === false);
      expect(allInvalid).toBe(true);
    });

    it('should handle emergency codes consistently', async () => {
      const userId = 'emergency-consistency-test';

      const emergencyCodes = {
        ios: await recoveryManager.generateEmergencyCode(userId, { platform: 'ios' }),
        android: await recoveryManager.generateEmergencyCode(userId, { platform: 'android' }),
        web: await recoveryManager.generateEmergencyCode(userId, { platform: 'web' }),
      };

      // All emergency codes should have consistent structure
      Object.values(emergencyCodes).forEach(codeData => {
        expect(codeData.code).toMatch(/^[A-Z0-9]{8,16}$/); // Alphanumeric, 8-16 characters
        expect(codeData.expiresAt).toBeInstanceOf(Date);
        expect(codeData.singleUse).toBe(true);
      });

      // Test validation consistency
      for (const [platform, codeData] of Object.entries(emergencyCodes)) {
        const validationResults = {
          ios: await recoveryManager.validateEmergencyCode(userId, codeData.code, {
            platform: 'ios',
          }),
          android: await recoveryManager.validateEmergencyCode(userId, codeData.code, {
            platform: 'android',
          }),
          web: await recoveryManager.validateEmergencyCode(userId, codeData.code, {
            platform: 'web',
          }),
        };

        // All platforms should validate emergency codes consistently
        Object.values(validationResults).forEach(result => {
          expect(result.valid).toBe(true);
          expect(result.userId).toBe(userId);
        });
      }
    });
  });

  describe('Error Handling Consistency', () => {
    it('should provide consistent error messages across platforms', async () => {
      const errorScenarios = [
        'invalid_challenge',
        'expired_challenge',
        'invalid_credential',
        'user_verification_failed',
        'hardware_unavailable',
        'timeout_exceeded',
      ];

      for (const scenario of errorScenarios) {
        const errorResults = {
          ios: await iosManager.simulateError(scenario, testDevices.ios),
          android: await androidManager.simulateError(scenario, testDevices.android),
          web: await webManager.simulateError(scenario, testDevices.web),
        };

        // Error structure should be consistent
        Object.entries(errorResults).forEach(([platform, error]) => {
          expect(error.code).toBe(scenario);
          expect(error.message).toBeTruthy();
          expect(error.recoverable).toBeTypeOf('boolean');
          expect(error.platform).toBe(platform);

          // Error message should be user-friendly but consistent
          expect(error.message).not.toContain('undefined');
          expect(error.message).not.toContain('null');
        });

        // Error recoverability should be consistent for same scenario
        const recoverabilityValues = Object.values(errorResults).map(e => e.recoverable);
        const uniqueRecoverability = new Set(recoverabilityValues);
        expect(uniqueRecoverability.size).toBe(1); // All should agree on recoverability
      }
    });

    it('should handle network errors consistently', async () => {
      const networkErrors = ['timeout', 'connection_failed', 'server_error', 'invalid_response'];

      for (const errorType of networkErrors) {
        const errorHandlingResults = {
          ios: await unifiedAuth.handleNetworkError(errorType, testDevices.ios),
          android: await unifiedAuth.handleNetworkError(errorType, testDevices.android),
          web: await unifiedAuth.handleNetworkError(errorType, testDevices.web),
        };

        Object.entries(errorHandlingResults).forEach(([platform, handling]) => {
          expect(handling.retryable).toBeTypeOf('boolean');
          expect(handling.fallbackAvailable).toBeTypeOf('boolean');
          expect(handling.userMessage).toBeTruthy();

          // Retry logic should be consistent
          if (errorType === 'timeout' || errorType === 'connection_failed') {
            expect(handling.retryable).toBe(true);
          }
        });
      }
    });
  });

  describe('Performance Consistency', () => {
    it('should maintain consistent response times across platforms', async () => {
      const operations = ['generateChallenge', 'createCredential', 'authenticateCredential'];
      const performanceResults: Record<string, Record<string, number>> = {};

      for (const operation of operations) {
        performanceResults[operation] = {};

        // Measure performance on each platform
        for (const [platformName, device] of Object.entries(testDevices)) {
          const startTime = performance.now();

          switch (operation) {
            case 'generateChallenge':
              await unifiedAuth.generateChallenge(device);
              break;
            case 'createCredential':
              await unifiedAuth.mockCreateCredential(device);
              break;
            case 'authenticateCredential':
              await unifiedAuth.mockAuthenticateCredential(device);
              break;
          }

          const endTime = performance.now();
          performanceResults[operation][platformName] = endTime - startTime;
        }
      }

      // Validate performance consistency
      Object.entries(performanceResults).forEach(([operation, platformTimes]) => {
        const times = Object.values(platformTimes);
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const maxDeviation = Math.max(...times) - Math.min(...times);

        // Performance should be reasonably consistent (within 200% of average)
        expect(maxDeviation).toBeLessThan(avgTime * 2);

        // All operations should complete within reasonable time
        times.forEach(time => {
          expect(time).toBeLessThan(2000); // Less than 2 seconds
        });
      });
    });

    it('should handle concurrent operations consistently', async () => {
      const concurrentOperations = 10;
      const userId = 'concurrent-test-user';

      for (const [platformName, device] of Object.entries(testDevices)) {
        const promises: Promise<any>[] = [];

        // Create concurrent authentication attempts
        for (let i = 0; i < concurrentOperations; i++) {
          promises.push(
            unifiedAuth
              .authenticateUser(userId, 'passkey', device)
              .catch(error => ({ error: error.message }))
          );
        }

        const results = await Promise.all(promises);
        const successCount = results.filter(r => !r.error).length;
        const errorCount = results.filter(r => r.error).length;

        // Most operations should succeed under normal load
        expect(successCount).toBeGreaterThan(concurrentOperations * 0.7);

        // Failed operations should fail gracefully
        results
          .filter(r => r.error)
          .forEach(result => {
            expect(result.error).not.toContain('undefined');
            expect(result.error).toBeTruthy();
          });
      }
    });
  });

  describe('Security Policy Consistency', () => {
    it('should enforce consistent security policies across platforms', async () => {
      const securityPolicies = {
        ios: await iosManager.getSecurityPolicies(testDevices.ios),
        android: await androidManager.getSecurityPolicies(testDevices.android),
        web: await webManager.getSecurityPolicies(testDevices.web),
      };

      // Core security requirements should be consistent
      Object.values(securityPolicies).forEach(policy => {
        expect(policy.minimumChallengeLength).toBeGreaterThanOrEqual(32);
        expect(policy.challengeTimeout).toBeGreaterThanOrEqual(30000);
        expect(policy.challengeTimeout).toBeLessThanOrEqual(300000);
        expect(policy.requireUserVerification).toBe(true);
        expect(policy.allowInsecureOrigins).toBe(false);
      });

      // Platform-specific policies should be reasonable
      expect(securityPolicies.ios.requireHardwareBacking).toBe(true);
      expect(securityPolicies.android.requireHardwareBacking).toBe(true);
      expect(securityPolicies.web.requireHardwareBacking).toBe(false); // Web may not have hardware backing
    });

    it('should validate credential security requirements consistently', async () => {
      const credentialRequirements = {
        ios: await iosManager.getCredentialRequirements(testDevices.ios),
        android: await androidManager.getCredentialRequirements(testDevices.android),
        web: await webManager.getCredentialRequirements(testDevices.web),
      };

      // Algorithm requirements should be consistent
      Object.values(credentialRequirements).forEach(requirements => {
        expect(requirements.supportedAlgorithms).toContain(-7); // ES256
        expect(requirements.supportedAlgorithms).toContain(-257); // RS256
        expect(requirements.minimumKeyLength).toBeGreaterThanOrEqual(256);
        expect(requirements.requireResidentKey).toBe(true);
        expect(requirements.requireUserVerification).toBe(true);
      });
    });
  });

  describe('Integration Testing', () => {
    it('should validate end-to-end authentication flow across platforms', async () => {
      const userId = 'e2e-test-user';
      const testResults: Record<string, any> = {};

      for (const [platformName, device] of Object.entries(testDevices)) {
        const flowResult = await runEndToEndAuthFlow(userId, device, platformName);
        testResults[platformName] = flowResult;
      }

      // All platforms should complete the flow successfully
      Object.entries(testResults).forEach(([platform, result]) => {
        expect(result.registrationSuccess).toBe(true);
        expect(result.authenticationSuccess).toBe(true);
        expect(result.sessionCreated).toBe(true);
        expect(result.recoverySetup).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Cross-platform session sharing should work
      const crossPlatformValidation = await validateCrossPlatformSessions(testResults);
      expect(crossPlatformValidation.success).toBe(true);
      expect(crossPlatformValidation.sharedSessions).toBeGreaterThan(0);
    });
  });
});

// Helper functions for cross-platform testing

function createMockWebAuthnCredential(): any {
  return {
    id: 'mock-credential-id-' + Date.now(),
    rawId: new Uint8Array(32),
    response: {
      clientDataJSON: Buffer.from(
        JSON.stringify({
          type: 'webauthn.create',
          challenge: 'mock-challenge',
          origin: 'https://localhost',
        })
      ),
      attestationObject: new Uint8Array(64),
      userHandle: new Uint8Array(32),
    },
    type: 'public-key',
  };
}

async function runEndToEndAuthFlow(
  userId: string,
  device: DeviceInfo,
  platformName: string
): Promise<any> {
  const results = {
    registrationSuccess: false,
    authenticationSuccess: false,
    sessionCreated: false,
    recoverySetup: false,
    errors: [] as string[],
  };

  try {
    // Step 1: Register credential
    const unifiedAuth = new UnifiedAuthenticationManager();
    const registrationResult = await unifiedAuth.registerCredential(userId, device);
    results.registrationSuccess = registrationResult.success;

    // Step 2: Authenticate
    const authResult = await unifiedAuth.authenticateUser(userId, 'passkey', device);
    results.authenticationSuccess = authResult.authenticated;

    // Step 3: Create session
    const sessionManager = new SessionManager();
    const session = await sessionManager.createSession(userId, 'passkey', {
      platform: platformName,
    });
    results.sessionCreated = !!session.token;

    // Step 4: Setup recovery
    const recoveryManager = new RecoveryManager();
    const recoveryPhrase = await recoveryManager.generateRecoveryPhrase({ platform: platformName });
    await recoveryManager.setupRecoveryForUser(userId, recoveryPhrase);
    results.recoverySetup = true;
  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

async function validateCrossPlatformSessions(
  testResults: Record<string, any>
): Promise<CrossPlatformValidationResult> {
  const sessionManager = new SessionManager();
  const sessions = Object.values(testResults)
    .filter(result => result.sessionCreated)
    .map(result => result.sessionToken);

  let sharedSessions = 0;

  for (const session of sessions) {
    const validationResults = await Promise.all([
      sessionManager.validateSession(session, { platform: 'ios' }),
      sessionManager.validateSession(session, { platform: 'android' }),
      sessionManager.validateSession(session, { platform: 'web' }),
    ]);

    const validCount = validationResults.filter(r => r.valid).length;
    if (validCount >= 2) {
      sharedSessions++;
    }
  }

  return {
    success: sharedSessions > 0,
    sharedSessions,
    totalSessions: sessions.length,
  };
}
