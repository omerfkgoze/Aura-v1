/**
 * Duress Protection System Tests
 * Comprehensive testing of emergency data wipe functionality
 * Author: Dev Agent (Story 2.1)
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';

import {
  DuressProtectionManager,
  duressProtectionManager,
  type DuressPinConfig,
  type BiometricDuressConfig,
  type SecureDeletionConfig,
  type DuressActivationResult,
} from '../duress-protection';

// Mock external dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-file-system');
jest.mock('../security-logger', () => ({
  securityLogger: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('DuressProtectionManager', () => {
  let manager: DuressProtectionManager;
  const testDeviceId = 'test-device-001';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockFileSystem.documentDirectory = '/mock/documents/';
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: false,
      uri: '',
      size: 0,
      isDirectory: false,
      modificationTime: 0,
    });

    manager = new DuressProtectionManager();
  });

  describe('Initialization', () => {
    it('should initialize successfully with biometric support', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should disable biometric detection when hardware unavailable', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      await manager.initialize();

      // Verify biometric monitoring returns disabled status
      const result = await manager.monitorBiometricFailure(testDeviceId);
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('should handle initialization errors gracefully', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware error'));

      await expect(manager.initialize()).rejects.toThrow('Hardware error');
    });
  });

  describe('PIN Configuration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should configure valid duress PIN settings', async () => {
      const primaryPin = '1234';
      const duressPin = '9999';

      await manager.configureDuressPin(primaryPin, duressPin);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'duress_primary_pin_hash',
        expect.any(String)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'duress_duress_pin_hash',
        expect.any(String)
      );
    });

    it('should reject identical primary and duress PINs', async () => {
      const samePin = '1234';

      await expect(manager.configureDuressPin(samePin, samePin)).rejects.toThrow(
        'must be different'
      );
    });

    it('should reject PINs shorter than 4 digits', async () => {
      await expect(manager.configureDuressPin('123', '9999')).rejects.toThrow('at least 4 digits');

      await expect(manager.configureDuressPin('1234', '999')).rejects.toThrow('at least 4 digits');
    });
  });

  describe('PIN Validation and Duress Detection', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.configureDuressPin('1234', '9999');
    });

    it('should validate correct primary PIN', async () => {
      const result = await manager.validatePin('1234', testDeviceId);

      expect(result).toMatchObject({
        activated: false,
        trigger: 'pin',
        deviceId: testDeviceId,
        success: true,
      });
    });

    it('should activate duress mode with duress PIN', async () => {
      // Mock file system for secure deletion
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: '/mock/database.db',
        size: 1024,
        isDirectory: false,
        modificationTime: Date.now(),
      });
      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      const result = await manager.validatePin('9999', testDeviceId);

      expect(result).toMatchObject({
        activated: true,
        trigger: 'pin',
        deviceId: testDeviceId,
        success: true,
      });
    });

    it('should handle invalid PIN attempts with counter', async () => {
      // First invalid attempt
      const result1 = await manager.validatePin('0000', testDeviceId);
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('4 attempts remaining');

      // Second invalid attempt
      const result2 = await manager.validatePin('0000', testDeviceId);
      expect(result2.error).toContain('3 attempts remaining');
    });

    it('should activate duress mode after max failed attempts', async () => {
      // Setup file system mocks for secure deletion
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: '/mock/database.db',
        size: 1024,
        isDirectory: false,
        modificationTime: Date.now(),
      });
      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      // Attempt invalid PIN 5 times (max attempts)
      for (let i = 0; i < 4; i++) {
        const result = await manager.validatePin('0000', testDeviceId);
        expect(result.activated).toBe(false);
      }

      // Final attempt should trigger duress
      const finalResult = await manager.validatePin('0000', testDeviceId);
      expect(finalResult).toMatchObject({
        activated: true,
        trigger: 'max-attempts',
        deviceId: testDeviceId,
      });
    });
  });

  describe('Biometric Duress Detection', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should detect rapid biometric failure pattern', async () => {
      // Setup duress activation mocks
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: '/mock/database.db',
        size: 1024,
        isDirectory: false,
        modificationTime: Date.now(),
      });
      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      // Simulate 5 rapid biometric failures
      let result: DuressActivationResult;
      for (let i = 0; i < 4; i++) {
        result = await manager.monitorBiometricFailure(testDeviceId);
        expect(result.activated).toBe(false);
      }

      // Fifth failure should trigger duress
      result = await manager.monitorBiometricFailure(testDeviceId);
      expect(result).toMatchObject({
        activated: true,
        trigger: 'biometric',
        deviceId: testDeviceId,
      });
    });

    it('should ignore old biometric failures outside time window', async () => {
      // Mock time progression
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      // Add failures at start of time window
      await manager.monitorBiometricFailure(testDeviceId);
      await manager.monitorBiometricFailure(testDeviceId);

      // Move time forward beyond window
      currentTime += 35000; // 35 seconds (beyond 30s window)

      // Add more failures - should not trigger duress due to old failures being cleaned
      const result1 = await manager.monitorBiometricFailure(testDeviceId);
      const result2 = await manager.monitorBiometricFailure(testDeviceId);
      const result3 = await manager.monitorBiometricFailure(testDeviceId);

      expect(result3.activated).toBe(false);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('Manual Duress Activation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should activate manual duress successfully', async () => {
      // Setup file system mocks
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        uri: '/mock/database.db',
        size: 1024,
        isDirectory: false,
        modificationTime: Date.now(),
      });
      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      const result = await manager.activateManualDuress(testDeviceId);

      expect(result).toMatchObject({
        activated: true,
        trigger: 'manual',
        deviceId: testDeviceId,
        success: true,
      });
    });
  });

  describe('Secure Data Deletion', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.configureDuressPin('1234', '9999');
    });

    it('should perform multi-pass secure deletion of database files', async () => {
      // Mock existing database files
      mockFileSystem.getInfoAsync.mockImplementation(async (path: string) => {
        const isDbFile = path.includes('.db') || path.includes('.realm');
        return {
          exists: isDbFile,
          uri: path,
          size: isDbFile ? 2048 : 0,
          isDirectory: false,
          modificationTime: Date.now(),
        };
      });

      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      await manager.validatePin('9999', testDeviceId);

      // Verify overwrite operations (3 passes by default)
      expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalledTimes(15); // 5 files × 3 passes
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledTimes(5);
    });

    it('should destroy encryption keys from secure storage', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: '',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      });

      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await manager.validatePin('9999', testDeviceId);

      // Verify key deletion calls
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('duress_primary_pin_hash');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('duress_duress_pin_hash');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('database_encryption_key');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('backup_encryption_key');
    });

    it('should verify deletion success when configured', async () => {
      // Mock file exists before deletion
      mockFileSystem.getInfoAsync
        .mockResolvedValueOnce({
          exists: true,
          uri: '/mock/database.db',
          size: 1024,
          isDirectory: false,
          modificationTime: Date.now(),
        })
        // Mock file doesn't exist after deletion (verification)
        .mockResolvedValueOnce({
          exists: false,
          uri: '/mock/database.db',
          size: 0,
          isDirectory: false,
          modificationTime: 0,
        });

      mockFileSystem.writeAsStringAsync.mockResolvedValue();
      mockFileSystem.deleteAsync.mockResolvedValue();

      const result = await manager.validatePin('9999', testDeviceId);
      expect(result.success).toBe(true);

      // Verify both initial check and verification check
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledTimes(6); // 5 files + 1 verification
    });
  });

  describe('Platform-Specific Functionality', () => {
    it('should handle iOS-specific operations', async () => {
      (Platform as any).OS = 'ios';

      await manager.initialize();
      await manager.configureDuressPin('1234', '9999');

      // Mock successful deletion
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: '',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      });
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await manager.validatePin('9999', testDeviceId);
      expect(result.success).toBe(true);
    });

    it('should handle Android-specific operations', async () => {
      (Platform as any).OS = 'android';

      await manager.initialize();
      await manager.configureDuressPin('1234', '9999');

      // Mock successful deletion
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: '',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      });
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await manager.validatePin('9999', testDeviceId);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.configureDuressPin('1234', '9999');
    });

    it('should handle secure store errors gracefully', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Store error'));
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        uri: '',
        size: 0,
        isDirectory: false,
        modificationTime: 0,
      });

      const result = await manager.validatePin('9999', testDeviceId);

      // Should still attempt completion despite key deletion errors
      expect(result.activated).toBe(true);
    });

    it('should handle file system errors gracefully', async () => {
      mockFileSystem.deleteAsync.mockRejectedValue(new Error('File system error'));
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await manager.validatePin('9999', testDeviceId);

      // Should still complete despite file system errors
      expect(result.activated).toBe(true);
    });

    it('should handle biometric authentication errors', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Auth error'));

      // Should continue with biometric disabled
      await expect(manager.initialize()).rejects.toThrow();
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing stored configuration', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      await manager.initialize();

      // Should initialize without errors even with missing config
      const result = await manager.validatePin('1234', testDeviceId);
      expect(result.success).toBe(false); // No configured PIN
    });

    it('should handle corrupted stored configuration', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('corrupted_data');

      await manager.initialize();

      // Should handle corrupted data gracefully
      const result = await manager.validatePin('1234', testDeviceId);
      expect(result).toBeDefined();
    });
  });
});

describe('Global duress protection manager', () => {
  it('should provide singleton instance', () => {
    expect(duressProtectionManager).toBeInstanceOf(DuressProtectionManager);
  });

  it('should be properly initialized', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

    await expect(duressProtectionManager.initialize()).resolves.not.toThrow();
  });
});
