/**
 * Auto-lock Security Mechanism Tests
 * Comprehensive testing of idle timeout and database locking functionality
 * Author: Dev Agent (Story 2.1)
 */

import { Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  AutoLockManager,
  autoLockManager,
  type AutoLockConfig,
  type LockStatus,
  type UnlockAuthConfig,
} from '../auto-lock-manager';

// Mock external dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('expo-secure-store');
jest.mock('../security-logger', () => ({
  securityLogger: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('AutoLockManager', () => {
  let manager: AutoLockManager;
  const testDeviceId = 'test-device-001';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup default mocks
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();

    manager = new AutoLockManager({
      enabled: true,
      idleTimeout: 5000, // 5 seconds for testing
      backgroundTimeout: 2000, // 2 seconds for testing
      requirePin: true,
      requireBiometric: false,
      maxUnlockAttempts: 3,
      lockoutDuration: 10000, // 10 seconds for testing
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    manager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default configuration', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();

      expect(manager.getConfig().enabled).toBe(true);
      expect(manager.getLockStatus().isLocked).toBe(false);
    });

    it('should load stored configuration on initialization', async () => {
      const storedConfig = {
        enabled: false,
        idleTimeout: 10000,
        requireBiometric: true,
      };

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(storedConfig));

      await manager.initialize();

      const config = manager.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.idleTimeout).toBe(10000);
      expect(config.requireBiometric).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      // Should not throw, should continue with defaults
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should update configuration successfully', async () => {
      const newConfig: Partial<AutoLockConfig> = {
        idleTimeout: 15000,
        requireBiometric: true,
        enableNotifications: false,
      };

      await manager.updateConfig(newConfig);

      const config = manager.getConfig();
      expect(config.idleTimeout).toBe(15000);
      expect(config.requireBiometric).toBe(true);
      expect(config.enableNotifications).toBe(false);
    });

    it('should store configuration changes', async () => {
      await manager.updateConfig({ idleTimeout: 20000 });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'auto_lock_config',
        expect.stringContaining('"idleTimeout":20000')
      );
    });
  });

  describe('Idle Timeout Locking', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should automatically lock after idle timeout', async () => {
      // Start with unlocked state
      expect(manager.getLockStatus().isLocked).toBe(false);

      // Fast-forward past idle timeout
      jest.advanceTimersByTime(6000); // 6 seconds (> 5 second timeout)

      const lockStatus = manager.getLockStatus();
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockReason).toBe('idle');
    });

    it('should reset idle timer on activity', async () => {
      // Fast-forward to near timeout
      jest.advanceTimersByTime(4000); // 4 seconds

      // Record activity - should reset timer
      manager.recordActivity();

      // Fast-forward 4 more seconds (should not lock yet)
      jest.advanceTimersByTime(4000);
      expect(manager.getLockStatus().isLocked).toBe(false);

      // Fast-forward past new timeout
      jest.advanceTimersByTime(2000); // Total 6 seconds from activity
      expect(manager.getLockStatus().isLocked).toBe(true);
    });

    it('should not monitor idle time when disabled', async () => {
      await manager.updateConfig({ enabled: false });

      // Fast-forward past timeout
      jest.advanceTimersByTime(10000);

      expect(manager.getLockStatus().isLocked).toBe(false);
    });
  });

  describe('Background Timeout Locking', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should lock when app goes to background and timeout expires', async () => {
      // Simulate app going to background
      const mockChangeHandler = mockAppState.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      expect(mockChangeHandler).toBeDefined();

      // Trigger background state
      mockChangeHandler?.('background');

      // Fast-forward past background timeout
      jest.advanceTimersByTime(3000); // 3 seconds (> 2 second timeout)

      const lockStatus = manager.getLockStatus();
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockReason).toBe('background');
    });

    it('should resume idle monitoring when app becomes active', async () => {
      const mockChangeHandler = mockAppState.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      // Background then active
      mockChangeHandler?.('background');
      mockChangeHandler?.('active');

      // Should resume idle monitoring
      jest.advanceTimersByTime(6000); // Past idle timeout
      expect(manager.getLockStatus().isLocked).toBe(true);
      expect(manager.getLockStatus().lockReason).toBe('idle');
    });
  });

  describe('Manual Locking', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should manually lock the database', async () => {
      await manager.lock('manual');

      const lockStatus = manager.getLockStatus();
      expect(lockStatus.isLocked).toBe(true);
      expect(lockStatus.lockReason).toBe('manual');
      expect(lockStatus.requiresAuthentication).toBe(true);
    });

    it('should handle duplicate lock calls gracefully', async () => {
      await manager.lock('manual');
      const firstLockTime = manager.getLockStatus().lockedAt;

      await manager.lock('manual');
      const secondLockTime = manager.getLockStatus().lockedAt;

      expect(firstLockTime).toBe(secondLockTime); // Should not change
    });
  });

  describe('Unlock Authentication', () => {
    beforeEach(async () => {
      await manager.initialize();

      // Set up PIN hash
      const testPin = '1234';
      const pinHash = await hashPin(testPin);
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'auto_lock_pin_hash') {
          return pinHash;
        }
        return null;
      });

      await manager.lock('manual');
    });

    it('should unlock with correct PIN when PIN required', async () => {
      const result = await manager.unlock({
        pin: '1234',
        deviceId: testDeviceId,
      });

      expect(result.success).toBe(true);
      expect(manager.getLockStatus().isLocked).toBe(false);
    });

    it('should reject unlock with incorrect PIN', async () => {
      const result = await manager.unlock({
        pin: '0000',
        deviceId: testDeviceId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid PIN');
      expect(manager.getLockStatus().isLocked).toBe(true);
    });

    it('should unlock with biometric when biometric required', async () => {
      await manager.updateConfig({ requirePin: false, requireBiometric: true });
      await manager.lock('manual');

      const result = await manager.unlock({
        biometricSuccess: true,
        deviceId: testDeviceId,
      });

      expect(result.success).toBe(true);
      expect(manager.getLockStatus().isLocked).toBe(false);
    });

    it('should require both PIN and biometric when both enabled', async () => {
      await manager.updateConfig({ requirePin: true, requireBiometric: true });
      await manager.lock('manual');

      // Test with only PIN
      let result = await manager.unlock({
        pin: '1234',
        deviceId: testDeviceId,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Biometric authentication required');

      // Test with only biometric
      result = await manager.unlock({
        biometricSuccess: true,
        deviceId: testDeviceId,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('PIN required');

      // Test with both
      result = await manager.unlock({
        pin: '1234',
        biometricSuccess: true,
        deviceId: testDeviceId,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Failed Unlock Attempts and Lockout', () => {
    beforeEach(async () => {
      await manager.initialize();

      // Set up PIN hash
      const testPin = '1234';
      const pinHash = await hashPin(testPin);
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'auto_lock_pin_hash') {
          return pinHash;
        }
        return null;
      });

      await manager.lock('manual');
    });

    it('should track failed unlock attempts', async () => {
      // First failed attempt
      await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      expect(manager.getLockStatus().unlockAttempts).toBe(1);

      // Second failed attempt
      await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      expect(manager.getLockStatus().unlockAttempts).toBe(2);
    });

    it('should activate lockout after max failed attempts', async () => {
      // Fail 3 times (max attempts)
      await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      const result = await manager.unlock({ pin: '0000', deviceId: testDeviceId });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many failed attempts');
      expect(manager.getLockStatus().isInLockout).toBe(true);
      expect(result.lockoutRemaining).toBe(10000); // 10 second lockout
    });

    it('should prevent unlock attempts during lockout', async () => {
      // Trigger lockout
      for (let i = 0; i < 3; i++) {
        await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      }

      // Try to unlock with correct PIN during lockout
      const result = await manager.unlock({
        pin: '1234',
        deviceId: testDeviceId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account locked');
      expect(result.lockoutRemaining).toBeGreaterThan(0);
    });

    it('should clear lockout after timeout', async () => {
      // Trigger lockout
      for (let i = 0; i < 3; i++) {
        await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      }

      expect(manager.getLockStatus().isInLockout).toBe(true);

      // Fast-forward past lockout duration
      jest.advanceTimersByTime(11000); // 11 seconds

      expect(manager.getLockStatus().isInLockout).toBe(false);

      // Should be able to unlock now
      const result = await manager.unlock({
        pin: '1234',
        deviceId: testDeviceId,
      });
      expect(result.success).toBe(true);
    });

    it('should reset failed attempts after successful unlock', async () => {
      // One failed attempt
      await manager.unlock({ pin: '0000', deviceId: testDeviceId });
      expect(manager.getLockStatus().unlockAttempts).toBe(1);

      // Successful unlock
      await manager.unlock({ pin: '1234', deviceId: testDeviceId });

      // Lock again
      await manager.lock('manual');

      // Failed attempts should be reset
      expect(manager.getLockStatus().unlockAttempts).toBe(0);
    });
  });

  describe('Event System', () => {
    let eventCallback: jest.Mock;

    beforeEach(async () => {
      await manager.initialize();
      eventCallback = jest.fn();
    });

    it('should emit lock-changed events', async () => {
      manager.addEventListener('lock-changed', eventCallback);

      await manager.lock('manual');

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          isLocked: true,
          lockReason: 'manual',
        })
      );
    });

    it('should emit config-updated events', async () => {
      manager.addEventListener('config-updated', eventCallback);

      await manager.updateConfig({ idleTimeout: 15000 });

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          idleTimeout: 15000,
        })
      );
    });

    it('should emit app-state-changed events', async () => {
      manager.addEventListener('app-state-changed', eventCallback);

      const mockChangeHandler = mockAppState.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];

      mockChangeHandler?.('background');

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 'background',
          previous: 'active',
        })
      );
    });

    it('should remove event listeners', () => {
      manager.addEventListener('lock-changed', eventCallback);
      manager.removeEventListener('lock-changed', eventCallback);

      // Should not emit after removal
      manager.lock('manual');
      expect(eventCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle SecureStore errors gracefully', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should handle event listener errors gracefully', async () => {
      const badCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      manager.addEventListener('lock-changed', badCallback);

      // Should not throw even if callback errors
      await expect(manager.lock('manual')).resolves.not.toThrow();
    });

    it('should handle malformed stored configuration', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('invalid json');

      await expect(manager.initialize()).resolves.not.toThrow();

      // Should use default configuration
      expect(manager.getConfig().enabled).toBe(true);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should clean up timers and listeners on cleanup', () => {
      const removeListenerSpy = jest.spyOn(AppState, 'removeEventListener');

      manager.cleanup();

      expect(removeListenerSpy).toHaveBeenCalled();
    });

    it('should clear all event listeners on cleanup', () => {
      const callback = jest.fn();
      manager.addEventListener('lock-changed', callback);

      manager.cleanup();

      // Should not emit after cleanup
      manager.lock('manual');
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Global auto-lock manager', () => {
  it('should provide singleton instance', () => {
    expect(autoLockManager).toBeInstanceOf(AutoLockManager);
  });
});

// Helper function to hash PIN (copied from implementation for testing)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'auto_lock_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hashBuffer).toString('hex');
}
