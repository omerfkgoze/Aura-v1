/**
 * Device Loss and Recovery Scenario Testing
 *
 * Comprehensive testing for device loss scenarios including:
 * - Complete device loss and recovery flows
 * - Partial credential recovery scenarios
 * - Cross-device authentication handoff
 * - Emergency access procedures
 * - Account recovery validation
 * - Data integrity during recovery
 * - Multi-device synchronization after recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RecoveryManager,
  UnifiedAuthenticationManager,
  AuthStateManager,
  SessionManager,
  WebAuthnAuthentication,
  OpaqueClient,
  PlatformDetectionManager,
  AuthPersistenceManager,
} from '../src/index.js';
import type {
  RecoveryPhrase,
  DeviceInfo,
  AuthenticationMethod,
  RecoveryResult,
  ShamirShare,
  EmergencyCode,
  DeviceRegistrationResult,
} from '../src/index.js';

describe('Device Loss and Recovery Testing', () => {
  let recoveryManager: RecoveryManager;
  let unifiedAuth: UnifiedAuthenticationManager;
  let authStateManager: AuthStateManager;
  let sessionManager: SessionManager;
  let webauthnAuth: WebAuthnAuthentication;
  let opaqueClient: OpaqueClient;
  let platformManager: PlatformDetectionManager;
  let persistenceManager: AuthPersistenceManager;

  // Mock user data for testing
  const testUserId = 'user-device-loss-test';
  const testUserData = {
    id: testUserId,
    email: 'test@example.com',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    recoveryManager = new RecoveryManager();
    unifiedAuth = new UnifiedAuthenticationManager();
    authStateManager = new AuthStateManager();
    sessionManager = new SessionManager();
    webauthnAuth = new WebAuthnAuthentication();
    opaqueClient = new OpaqueClient();
    platformManager = new PlatformDetectionManager();
    persistenceManager = new AuthPersistenceManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Device Loss Scenario', () => {
    it('should handle complete device loss with recovery phrase', async () => {
      // Step 1: User sets up recovery phrase on original device
      const originalDevice: DeviceInfo = {
        id: 'device-original',
        platform: 'ios',
        name: 'iPhone 15 Pro',
        fingerprint: 'ios-device-fingerprint-1',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: true,
          hardwareBacked: true,
          secureEnclave: true,
        },
      };

      // Generate recovery phrase
      const recoveryPhrase = await recoveryManager.generateRecoveryPhrase();
      expect(recoveryPhrase.phrase.split(' ')).toHaveLength(24);

      // Store recovery phrase for user
      await recoveryManager.setupRecoveryForUser(testUserId, recoveryPhrase);

      // Register WebAuthn credential on original device
      const webauthnCredential = await webauthnAuth.registerCredential(testUserId, originalDevice);
      expect(webauthnCredential.credentialId).toBeTruthy();

      // Step 2: Simulate complete device loss
      await simulateDeviceLoss(originalDevice.id);

      // Step 3: User gets new device and starts recovery
      const newDevice: DeviceInfo = {
        id: 'device-new-replacement',
        platform: 'ios',
        name: 'iPhone 16 Pro',
        fingerprint: 'ios-device-fingerprint-2',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: true,
          hardwareBacked: true,
          secureEnclave: true,
        },
      };

      // Step 4: Recovery process using recovery phrase
      const recoveryResult = await recoveryManager.recoverAccountWithPhrase(
        recoveryPhrase.phrase,
        newDevice
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.userId).toBe(testUserId);
      expect(recoveryResult.newDeviceId).toBe(newDevice.id);

      // Step 5: Verify new device can authenticate
      const authResult = await unifiedAuth.authenticateUser(testUserId, 'passkey', newDevice);

      expect(authResult.authenticated).toBe(true);
      expect(authResult.deviceId).toBe(newDevice.id);

      // Step 6: Verify old device credentials are invalidated
      const oldCredentialStatus = await webauthnAuth.checkCredentialStatus(
        webauthnCredential.credentialId
      );
      expect(oldCredentialStatus.valid).toBe(false);
      expect(oldCredentialStatus.reason).toBe('device_lost');
    });

    it('should handle device loss with Shamir Secret Sharing', async () => {
      // Setup: Create Shamir shares during initial setup
      const secret = 'master-recovery-key-for-user';
      const threshold = 3;
      const totalShares = 5;

      const shamirShares = await recoveryManager.createShamirShares(secret, threshold, totalShares);

      // Distribute shares to different storage methods
      const shareStorage = {
        userMemory: shamirShares[0], // User memorized
        secureCloud: shamirShares[1], // Cloud storage
        trustedContact1: shamirShares[2], // Trusted person
        trustedContact2: shamirShares[3], // Another trusted person
        physicalBackup: shamirShares[4], // Physical backup
      };

      await recoveryManager.setupShamirRecovery(testUserId, shamirShares);

      // Simulate device loss
      await simulateDeviceLoss('original-device');

      // Recovery scenario: User has access to 3 out of 5 shares
      const availableShares = [
        shareStorage.userMemory,
        shareStorage.trustedContact1,
        shareStorage.trustedContact2,
      ];

      const recoveredSecret = await recoveryManager.reconstructShamirSecret(availableShares);
      expect(recoveredSecret).toBe(secret);

      // Use recovered secret to restore account
      const recoveryResult = await recoveryManager.recoverAccountWithShamirSecret(
        recoveredSecret,
        testUserId
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.method).toBe('shamir_secret_sharing');
    });

    it('should handle emergency access during device loss', async () => {
      // Setup emergency access codes
      const emergencyCodes = await recoveryManager.generateEmergencyCode(testUserId, {
        expiresInHours: 72, // 3 days
        singleUse: true,
      });

      expect(emergencyCodes.code).toBeTruthy();
      expect(emergencyCodes.expiresAt).toBeInstanceOf(Date);

      // Simulate device loss scenario
      await simulateDeviceLoss('original-device');

      // User uses emergency code for immediate access
      const emergencyResult = await recoveryManager.validateEmergencyCode(
        testUserId,
        emergencyCodes.code
      );

      expect(emergencyResult.valid).toBe(true);
      expect(emergencyResult.access).toBe('emergency');
      expect(emergencyResult.timeRemaining).toBeLessThanOrEqual(72 * 60 * 60 * 1000); // Less than 72 hours

      // Emergency access should be limited and require full recovery
      const limitedSession = await sessionManager.createEmergencySession(
        testUserId,
        emergencyResult.token
      );

      expect(limitedSession.type).toBe('emergency');
      expect(limitedSession.restrictions).toContain('limited_operations');
      expect(limitedSession.restrictions).toContain('recovery_required');
    });
  });

  describe('Partial Credential Recovery', () => {
    it('should handle partial credential loss with backup methods', async () => {
      // Setup multiple authentication methods
      const deviceInfo: DeviceInfo = {
        id: 'multi-auth-device',
        platform: 'android',
        name: 'Galaxy S24 Ultra',
        fingerprint: 'android-device-fingerprint',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: true,
          hardwareBacked: true,
          strongbox: true,
        },
      };

      // Register multiple credentials
      const passkeyCredential = await webauthnAuth.registerCredential(testUserId, deviceInfo);
      const opaqueRegistration = await opaqueClient.register(testUserId, 'backup-password-123');

      expect(passkeyCredential.credentialId).toBeTruthy();
      expect(opaqueRegistration.success).toBe(true);

      // Simulate partial loss: Passkeys corrupted but OPAQUE backup available
      await simulateCredentialCorruption(passkeyCredential.credentialId);

      // User should still be able to authenticate with backup method
      const backupAuthResult = await opaqueClient.authenticate(testUserId, 'backup-password-123');
      expect(backupAuthResult.success).toBe(true);

      // Re-register Passkeys after backup authentication
      const newPasskeyCredential = await webauthnAuth.registerCredential(testUserId, deviceInfo, {
        replaceCorrupted: true,
      });

      expect(newPasskeyCredential.credentialId).not.toBe(passkeyCredential.credentialId);
      expect(newPasskeyCredential.success).toBe(true);
    });

    it('should handle biometric data corruption scenarios', async () => {
      const deviceInfo: DeviceInfo = {
        id: 'biometric-device',
        platform: 'ios',
        name: 'iPhone with corrupted biometrics',
        fingerprint: 'corrupted-biometric-device',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: false, // Simulating biometric corruption
          hardwareBacked: true,
          secureEnclave: true,
        },
      };

      // Initial setup with working biometrics
      const originalCredential = await webauthnAuth.registerCredential(testUserId, {
        ...deviceInfo,
        capabilities: { ...deviceInfo.capabilities, biometricAvailable: true },
      });

      // Simulate biometric corruption (face/fingerprint data lost)
      await simulateBiometricCorruption(deviceInfo.id);

      // System should fall back to device PIN/password + hardware security
      const fallbackAuth = await webauthnAuth.authenticateWithFallback(testUserId, deviceInfo, {
        method: 'device_passcode',
      });

      expect(fallbackAuth.success).toBe(true);
      expect(fallbackAuth.method).toBe('device_passcode_with_hardware_key');
      expect(fallbackAuth.hardwareBacked).toBe(true);

      // User should be prompted to re-register biometrics
      const biometricReregistration = await webauthnAuth.reregisterBiometrics(
        testUserId,
        deviceInfo
      );

      expect(biometricReregistration.success).toBe(true);
    });
  });

  describe('Cross-Device Authentication Handoff', () => {
    it('should enable secure device-to-device handoff', async () => {
      // Primary device
      const primaryDevice: DeviceInfo = {
        id: 'primary-phone',
        platform: 'ios',
        name: 'Primary iPhone',
        fingerprint: 'primary-device-fp',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: true,
          hardwareBacked: true,
          secureEnclave: true,
        },
      };

      // Secondary device (tablet/laptop)
      const secondaryDevice: DeviceInfo = {
        id: 'secondary-tablet',
        platform: 'web',
        name: 'MacBook Pro',
        fingerprint: 'secondary-device-fp',
        capabilities: {
          webauthnSupported: true,
          biometricAvailable: false,
          hardwareBacked: true,
          secureEnclave: false,
        },
      };

      // Register both devices
      await webauthnAuth.registerCredential(testUserId, primaryDevice);
      await webauthnAuth.registerCredential(testUserId, secondaryDevice);

      // Primary device initiates handoff process
      const handoffToken = await unifiedAuth.initiateDeviceHandoff(
        testUserId,
        primaryDevice.id,
        secondaryDevice.id
      );

      expect(handoffToken.token).toBeTruthy();
      expect(handoffToken.expiresAt).toBeInstanceOf(Date);
      expect(handoffToken.targetDeviceId).toBe(secondaryDevice.id);

      // Secondary device accepts handoff
      const handoffResult = await unifiedAuth.completeDeviceHandoff(
        handoffToken.token,
        secondaryDevice
      );

      expect(handoffResult.success).toBe(true);
      expect(handoffResult.sessionTransferred).toBe(true);
      expect(handoffResult.userId).toBe(testUserId);

      // Verify session works on secondary device
      const secondarySession = await sessionManager.getCurrentSession(secondaryDevice.id);
      expect(secondarySession.userId).toBe(testUserId);
      expect(secondarySession.deviceId).toBe(secondaryDevice.id);
    });

    it('should handle interrupted handoff scenarios', async () => {
      const device1: DeviceInfo = {
        id: 'device-1',
        platform: 'ios',
        name: 'iPhone',
        fingerprint: 'fp1',
        capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
      };

      const device2: DeviceInfo = {
        id: 'device-2',
        platform: 'android',
        name: 'Pixel',
        fingerprint: 'fp2',
        capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
      };

      // Start handoff process
      const handoffToken = await unifiedAuth.initiateDeviceHandoff(
        testUserId,
        device1.id,
        device2.id
      );

      // Simulate interruption (network failure, device sleep, etc.)
      await simulateHandoffInterruption(handoffToken.token);

      // Handoff should handle interruption gracefully
      const resumeResult = await unifiedAuth.resumeDeviceHandoff(handoffToken.token, device2);

      if (resumeResult.canResume) {
        const completedHandoff = await unifiedAuth.completeDeviceHandoff(
          handoffToken.token,
          device2
        );
        expect(completedHandoff.success).toBe(true);
      } else {
        // Should fall back to normal authentication
        const fallbackAuth = await unifiedAuth.authenticateUser(testUserId, 'passkey', device2);
        expect(fallbackAuth.authenticated).toBe(true);
      }
    });
  });

  describe('Account Recovery Validation', () => {
    it('should validate complete account recovery workflow', async () => {
      // Step 1: Account setup with all recovery methods
      const recoveryPhrase = await recoveryManager.generateRecoveryPhrase();
      const shamirShares = await recoveryManager.createShamirShares('secret', 3, 5);
      const emergencyCode = await recoveryManager.generateEmergencyCode(testUserId);

      await recoveryManager.setupComprehensiveRecovery(testUserId, {
        recoveryPhrase: recoveryPhrase.phrase,
        shamirShares,
        emergencyCode: emergencyCode.code,
      });

      // Step 2: Simulate complete account loss
      await simulateCompleteAccountLoss(testUserId);

      // Step 3: Recovery validation workflow
      const recoveryValidation = await recoveryManager.validateRecoveryOptions(testUserId);

      expect(recoveryValidation.hasRecoveryPhrase).toBe(true);
      expect(recoveryValidation.hasShamirShares).toBe(true);
      expect(recoveryValidation.hasEmergencyCode).toBe(true);
      expect(recoveryValidation.recoveryMethods).toHaveLength(3);

      // Step 4: Test each recovery method
      const phraseRecovery = await recoveryManager.recoverWithPhrase(
        testUserId,
        recoveryPhrase.phrase
      );
      expect(phraseRecovery.success).toBe(true);

      const shamirRecovery = await recoveryManager.recoverWithShares(
        testUserId,
        shamirShares.slice(0, 3)
      );
      expect(shamirRecovery.success).toBe(true);

      const emergencyRecovery = await recoveryManager.recoverWithEmergencyCode(
        testUserId,
        emergencyCode.code
      );
      expect(emergencyRecovery.success).toBe(true);
    });

    it('should handle recovery attempts with invalid credentials', async () => {
      // Setup valid recovery
      const validPhrase = await recoveryManager.generateRecoveryPhrase();
      await recoveryManager.setupRecoveryForUser(testUserId, validPhrase);

      // Attempt recovery with invalid phrases
      const invalidPhrases = [
        'invalid phrase with wrong words here for testing purposes only',
        'another completely wrong recovery phrase that should not work',
        '', // Empty phrase
        'short phrase', // Too short
        'word '.repeat(25).trim(), // Too long
      ];

      for (const invalidPhrase of invalidPhrases) {
        const recoveryResult = await recoveryManager.recoverWithPhrase(testUserId, invalidPhrase);
        expect(recoveryResult.success).toBe(false);
        expect(recoveryResult.error).toMatch(/(invalid|checksum|length|format)/i);
      }

      // Valid phrase should still work after failed attempts
      const validRecovery = await recoveryManager.recoverWithPhrase(testUserId, validPhrase.phrase);
      expect(validRecovery.success).toBe(true);
    });

    it('should enforce recovery rate limiting', async () => {
      const validPhrase = await recoveryManager.generateRecoveryPhrase();
      await recoveryManager.setupRecoveryForUser(testUserId, validPhrase);

      // Attempt multiple failed recoveries rapidly
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(recoveryManager.recoverWithPhrase(testUserId, 'invalid phrase attempt ' + i));
      }

      const results = await Promise.allSettled(attempts);
      const rateLimitedResults = results.filter(
        result => result.status === 'rejected' && result.reason.message.includes('rate limit')
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity During Recovery', () => {
    it('should maintain data integrity during device recovery', async () => {
      // Setup user data with checksums
      const userData = {
        userId: testUserId,
        preferences: { theme: 'dark', language: 'en' },
        settings: { notifications: true, biometric: true },
        lastSync: new Date(),
      };

      const dataChecksum = await calculateDataChecksum(userData);
      await persistenceManager.storeUserDataWithChecksum(testUserId, userData, dataChecksum);

      // Simulate device loss and recovery
      await simulateDeviceLoss('original-device');

      const recoveryPhrase = await recoveryManager.generateRecoveryPhrase();
      await recoveryManager.setupRecoveryForUser(testUserId, recoveryPhrase);

      const recoveryResult = await recoveryManager.recoverWithPhrase(
        testUserId,
        recoveryPhrase.phrase
      );
      expect(recoveryResult.success).toBe(true);

      // Verify data integrity after recovery
      const recoveredData = await persistenceManager.getUserDataWithChecksum(testUserId);
      const recoveredChecksum = await calculateDataChecksum(recoveredData.data);

      expect(recoveredChecksum).toBe(dataChecksum);
      expect(recoveredData.data).toEqual(userData);
    });

    it('should handle data corruption detection during recovery', async () => {
      const userData = { userId: testUserId, data: 'important user data' };
      const originalChecksum = await calculateDataChecksum(userData);

      // Store data with checksum
      await persistenceManager.storeUserDataWithChecksum(testUserId, userData, originalChecksum);

      // Simulate data corruption
      await simulateDataCorruption(testUserId);

      // Recovery should detect corruption
      const recoveryAttempt = await persistenceManager.getUserDataWithChecksum(testUserId);
      const corruptedChecksum = await calculateDataChecksum(recoveryAttempt.data);

      expect(corruptedChecksum).not.toBe(originalChecksum);

      // Recovery process should handle corruption
      const recoveryResult = await recoveryManager.handleDataCorruption(
        testUserId,
        originalChecksum,
        corruptedChecksum
      );

      expect(recoveryResult.corruptionDetected).toBe(true);
      expect(recoveryResult.recoveryAction).toBe('restore_from_backup');
    });
  });

  describe('Multi-Device Synchronization After Recovery', () => {
    it('should synchronize authentication state across all devices after recovery', async () => {
      const devices: DeviceInfo[] = [
        {
          id: 'phone',
          platform: 'ios',
          name: 'iPhone',
          fingerprint: 'fp1',
          capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
        },
        {
          id: 'tablet',
          platform: 'ios',
          name: 'iPad',
          fingerprint: 'fp2',
          capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
        },
        {
          id: 'laptop',
          platform: 'web',
          name: 'MacBook',
          fingerprint: 'fp3',
          capabilities: {
            webauthnSupported: true,
            biometricAvailable: false,
            hardwareBacked: true,
          },
        },
      ];

      // Register all devices
      for (const device of devices) {
        await webauthnAuth.registerCredential(testUserId, device);
      }

      // Simulate loss of primary device
      await simulateDeviceLoss(devices[0].id);

      // Recovery on new device
      const newDevice: DeviceInfo = {
        id: 'new-phone',
        platform: 'ios',
        name: 'iPhone 16',
        fingerprint: 'fp4',
        capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
      };

      const recoveryPhrase = await recoveryManager.generateRecoveryPhrase();
      await recoveryManager.setupRecoveryForUser(testUserId, recoveryPhrase);

      const recoveryResult = await recoveryManager.recoverAccountWithPhrase(
        recoveryPhrase.phrase,
        newDevice
      );

      expect(recoveryResult.success).toBe(true);

      // Synchronize auth state across remaining devices
      const syncResult = await authStateManager.synchronizeAuthStateAcrossDevices(
        testUserId,
        [devices[1], devices[2], newDevice] // Remaining + new device
      );

      expect(syncResult.synchronized).toBe(true);
      expect(syncResult.deviceCount).toBe(3);
      expect(syncResult.invalidatedDevices).toContain(devices[0].id); // Lost device invalidated

      // Verify each device has updated auth state
      for (const device of [devices[1], devices[2], newDevice]) {
        const deviceAuthState = await authStateManager.getDeviceAuthState(device.id);
        expect(deviceAuthState.isValid).toBe(true);
        expect(deviceAuthState.userId).toBe(testUserId);
        expect(deviceAuthState.lastSyncAt).toBeInstanceOf(Date);
      }
    });

    it('should handle conflicting authentication states during recovery sync', async () => {
      const device1: DeviceInfo = {
        id: 'device1',
        platform: 'ios',
        name: 'iPhone 1',
        fingerprint: 'fp1',
        capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
      };
      const device2: DeviceInfo = {
        id: 'device2',
        platform: 'android',
        name: 'Pixel 1',
        fingerprint: 'fp2',
        capabilities: { webauthnSupported: true, biometricAvailable: true, hardwareBacked: true },
      };

      // Create conflicting states (simulating offline changes)
      const state1 = await authStateManager.createAuthState(testUserId, device1, {
        lastSync: new Date('2023-01-01'),
      });
      const state2 = await authStateManager.createAuthState(testUserId, device2, {
        lastSync: new Date('2023-01-02'),
      });

      // Simulate conflict resolution during sync
      const conflictResolution = await authStateManager.resolveAuthStateConflicts(testUserId, [
        state1,
        state2,
      ]);

      expect(conflictResolution.resolved).toBe(true);
      expect(conflictResolution.winnerDeviceId).toBe(device2.id); // Newer timestamp wins
      expect(conflictResolution.strategy).toBe('last_write_wins');

      // Verify resolution was applied
      const finalState1 = await authStateManager.getDeviceAuthState(device1.id);
      const finalState2 = await authStateManager.getDeviceAuthState(device2.id);

      expect(finalState1.version).toBe(finalState2.version);
      expect(finalState1.lastSyncAt.getTime()).toBe(finalState2.lastSyncAt.getTime());
    });
  });
});

// Helper functions for device loss simulation

async function simulateDeviceLoss(deviceId: string): Promise<void> {
  // Simulate hardware failure, theft, or destruction
  await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async operation

  // Mark device as lost in system
  const deviceRegistry = global.deviceRegistry || new Map();
  deviceRegistry.set(deviceId, { status: 'lost', timestamp: new Date() });
  global.deviceRegistry = deviceRegistry;
}

async function simulateCredentialCorruption(credentialId: string): Promise<void> {
  // Simulate credential corruption (hardware failure, malware, etc.)
  const corruptedRegistry = global.corruptedCredentials || new Set();
  corruptedRegistry.add(credentialId);
  global.corruptedCredentials = corruptedRegistry;
}

async function simulateBiometricCorruption(deviceId: string): Promise<void> {
  // Simulate biometric data corruption
  const biometricRegistry = global.biometricStatus || new Map();
  biometricRegistry.set(deviceId, { available: false, reason: 'corrupted' });
  global.biometricStatus = biometricRegistry;
}

async function simulateHandoffInterruption(handoffToken: string): Promise<void> {
  // Simulate network interruption, device sleep, etc.
  const interruptedHandoffs = global.interruptedHandoffs || new Set();
  interruptedHandoffs.add(handoffToken);
  global.interruptedHandoffs = interruptedHandoffs;
}

async function simulateCompleteAccountLoss(userId: string): Promise<void> {
  // Simulate complete loss of all authentication methods
  const lostAccounts = global.lostAccounts || new Set();
  lostAccounts.add(userId);
  global.lostAccounts = lostAccounts;
}

async function simulateDataCorruption(userId: string): Promise<void> {
  // Simulate data corruption in storage
  const corruptedData = global.corruptedUserData || new Map();
  corruptedData.set(userId, { corrupted: true, timestamp: new Date() });
  global.corruptedUserData = corruptedData;
}

async function calculateDataChecksum(data: any): Promise<string> {
  // Simple checksum calculation for testing
  const dataString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}
