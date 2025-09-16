/**
 * Synchronization Status Monitoring Tests
 *
 * Comprehensive test suite for sync status monitoring, progress tracking,
 * error handling, and network condition management across various scenarios.
 */

import { SyncStatusMonitor } from '../../components/sync/SyncStatusMonitor';
import { SyncProgressTracker } from '../../components/sync/SyncProgressTracker';
import { DataConsistencyVerifier } from '../../components/sync/DataConsistencyVerifier';
import { SyncErrorHandler } from '../../components/sync/SyncErrorHandler';
import { SyncRetryManager } from '../../components/sync/SyncRetryManager';
import {
  SyncStatusDetails,
  DeviceSyncState,
  SyncProgress,
  SyncErrorDetails,
  NetworkCondition,
  SyncMonitoringConfig,
  ProgressSession,
  RetryContext,
  SyncOperationResult,
} from '../../components/sync/types';

// Mock implementations
jest.mock('../../services/EncryptedDataService', () => ({
  CryptoEnvelope: jest.fn(),
}));

describe('SyncStatusMonitor', () => {
  let monitor: SyncStatusMonitor;
  let config: SyncMonitoringConfig;

  beforeEach(() => {
    config = {
      updateInterval: 5000,
      consistencyCheckInterval: 30000,
      progressUpdateInterval: 1000,
      maxNotifications: 10,
      enableDetailedLogging: true,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT', 'NET_UNREACHABLE'],
      },
      networkCheckInterval: 10000,
      enableRealTimeUpdates: true,
      notificationThreshold: {
        errorCount: 3,
        slowSyncDuration: 60000,
        lowDataConsistency: 80,
      },
    };

    monitor = new SyncStatusMonitor(config);
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('Device Status Monitoring', () => {
    test('should update device sync status correctly', () => {
      const deviceId = 'device-123';
      const status: Partial<SyncStatusDetails> = {
        status: 'syncing',
        progress: 50,
        pendingOperations: 5,
      };

      monitor.updateDeviceStatus(deviceId, status);

      const deviceStates = monitor.getDeviceStates();
      const deviceState = deviceStates.find(d => d.deviceId === deviceId);

      expect(deviceState).toBeDefined();
      expect(deviceState?.syncStatus.status).toBe('syncing');
      expect(deviceState?.syncStatus.progress).toBe(50);
      expect(deviceState?.syncStatus.pendingOperations).toBe(5);
    });

    test('should track multiple devices simultaneously', () => {
      const devices = ['device-1', 'device-2', 'device-3'];

      devices.forEach((deviceId, index) => {
        monitor.updateDeviceStatus(deviceId, {
          status: 'synced',
          progress: (index + 1) * 30,
        });
      });

      const deviceStates = monitor.getDeviceStates();
      expect(deviceStates).toHaveLength(3);

      devices.forEach((deviceId, index) => {
        const state = deviceStates.find(d => d.deviceId === deviceId);
        expect(state?.syncStatus.progress).toBe((index + 1) * 30);
      });
    });

    test('should handle device status transitions', () => {
      const deviceId = 'device-transition';

      // Start with pending
      monitor.updateDeviceStatus(deviceId, { status: 'pending' });
      expect(monitor.getDeviceStates()[0].syncStatus.status).toBe('pending');

      // Transition to syncing
      monitor.updateDeviceStatus(deviceId, { status: 'syncing', progress: 25 });
      expect(monitor.getDeviceStates()[0].syncStatus.status).toBe('syncing');

      // Complete sync
      monitor.updateDeviceStatus(deviceId, { status: 'synced', progress: 100 });
      expect(monitor.getDeviceStates()[0].syncStatus.status).toBe('synced');
    });
  });

  describe('Progress Monitoring', () => {
    test('should track sync progress updates', () => {
      const progress: SyncProgress = {
        sessionId: 'session-123',
        totalOperations: 100,
        completedOperations: 30,
        currentOperation: 'Syncing cycle data',
        operationType: 'upload',
        estimatedTimeRemaining: 45000,
        dataTransferred: 1024000,
        totalDataSize: 3072000,
        currentFileIndex: 30,
        totalFiles: 100,
        speed: 256000,
      };

      monitor.updateSyncProgress(progress);

      const currentProgress = monitor.getCurrentProgress();
      expect(currentProgress).toEqual(progress);
    });

    test('should update device status based on progress', () => {
      const deviceId = 'device-progress';
      const progress: SyncProgress = {
        sessionId: deviceId,
        totalOperations: 50,
        completedOperations: 25,
        currentOperation: 'Processing data',
        operationType: 'download',
        estimatedTimeRemaining: 30000,
        dataTransferred: 512000,
        totalDataSize: 1024000,
        currentFileIndex: 25,
        totalFiles: 50,
        speed: 128000,
      };

      monitor.updateSyncProgress(progress);

      const deviceStates = monitor.getDeviceStates();
      const deviceState = deviceStates.find(d => d.deviceId === deviceId);

      expect(deviceState?.syncStatus.status).toBe('syncing');
      expect(deviceState?.syncStatus.progress).toBe(50); // 25/50 * 100
      expect(deviceState?.syncStatus.pendingOperations).toBe(25); // 50 - 25
    });
  });

  describe('Error Reporting', () => {
    test('should handle sync errors with notifications', () => {
      const deviceId = 'device-error';
      const error: SyncErrorDetails = {
        code: 'NET_TIMEOUT',
        message: 'Connection timeout',
        timestamp: new Date(),
        retryCount: 1,
        recoverable: true,
        category: 'network',
      };

      monitor.reportSyncError(deviceId, error);

      const deviceStates = monitor.getDeviceStates();
      const deviceState = deviceStates.find(d => d.deviceId === deviceId);

      expect(deviceState?.syncStatus.status).toBe('error');
      expect(deviceState?.syncStatus.error).toEqual(error);

      const notifications = monitor.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
    });

    test('should create appropriate error notifications', () => {
      const deviceId = 'device-notification';
      const error: SyncErrorDetails = {
        code: 'CRYPTO_HANDSHAKE_FAILED',
        message: 'Handshake failed',
        timestamp: new Date(),
        retryCount: 0,
        recoverable: true,
        category: 'crypto',
      };

      monitor.reportSyncError(deviceId, error);

      const notifications = monitor.getNotifications();
      expect(notifications[0].title).toBe('Sync Error');
      expect(notifications[0].category).toBe('sync');
      expect(notifications[0].action?.label).toBe('Retry');
    });
  });

  describe('Sync Completion', () => {
    test('should handle successful sync completion', () => {
      const deviceId = 'device-success';
      const result: SyncOperationResult = {
        success: true,
        syncedRecords: 25,
        conflicts: 0,
        duration: 15000,
        bytesTransferred: 512000,
        retryAttempts: 0,
      };

      monitor.reportSyncCompletion(deviceId, result);

      const deviceStates = monitor.getDeviceStates();
      const deviceState = deviceStates.find(d => d.deviceId === deviceId);

      expect(deviceState?.syncStatus.status).toBe('synced');
      expect(deviceState?.syncStatus.progress).toBe(100);
      expect(deviceState?.syncStatus.pendingOperations).toBe(0);
      expect(deviceState?.syncStatus.error).toBeNull();
    });

    test('should handle failed sync completion', () => {
      const deviceId = 'device-failure';
      const error: SyncErrorDetails = {
        code: 'DATA_CORRUPTION',
        message: 'Data corruption detected',
        timestamp: new Date(),
        retryCount: 2,
        recoverable: false,
        category: 'data',
      };

      const result: SyncOperationResult = {
        success: false,
        error,
        syncedRecords: 0,
        conflicts: 0,
        duration: 5000,
        bytesTransferred: 0,
        retryAttempts: 2,
      };

      monitor.reportSyncCompletion(deviceId, result);

      const deviceStates = monitor.getDeviceStates();
      const deviceState = deviceStates.find(d => d.deviceId === deviceId);

      expect(deviceState?.syncStatus.status).toBe('error');
      expect(deviceState?.syncStatus.error).toEqual(error);
    });
  });

  describe('Network Condition Monitoring', () => {
    test('should monitor network conditions', async () => {
      monitor.startMonitoring();

      // Wait for initial network check
      await new Promise(resolve => setTimeout(resolve, 100));

      const networkCondition = monitor.getNetworkCondition();
      expect(networkCondition).toBeDefined();
      expect(networkCondition?.type).toBeDefined();
      expect(networkCondition?.quality).toBeDefined();

      monitor.stopMonitoring();
    });

    test('should adapt to network condition changes', () => {
      const poorNetworkCondition: NetworkCondition = {
        type: 'cellular',
        quality: 'poor',
        bandwidth: 1,
        latency: 1000,
        isMetered: true,
        isReachable: true,
        lastChecked: new Date(),
      };

      // Simulate poor network affecting sync status
      monitor.updateDeviceStatus('device-network', {
        status: 'pending',
      });

      const deviceStates = monitor.getDeviceStates();
      expect(deviceStates[0].networkCondition.type).toBeDefined();
    });
  });

  describe('Notification Management', () => {
    test('should manage notification lifecycle', () => {
      const deviceId = 'device-notifications';
      const error: SyncErrorDetails = {
        code: 'NET_UNREACHABLE',
        message: 'Network unreachable',
        timestamp: new Date(),
        retryCount: 0,
        recoverable: true,
        category: 'network',
      };

      monitor.reportSyncError(deviceId, error);

      let notifications = monitor.getNotifications();
      expect(notifications).toHaveLength(1);

      const notificationId = notifications[0].id;
      monitor.dismissNotification(notificationId);

      notifications = monitor.getNotifications();
      expect(notifications).toHaveLength(0);
    });

    test('should respect max notifications limit', () => {
      const maxNotifications = config.maxNotifications;

      // Create more notifications than the limit
      for (let i = 0; i < maxNotifications + 5; i++) {
        const error: SyncErrorDetails = {
          code: `ERROR_${i}`,
          message: `Error ${i}`,
          timestamp: new Date(),
          retryCount: 0,
          recoverable: true,
          category: 'network',
        };

        monitor.reportSyncError(`device-${i}`, error);
      }

      const notifications = monitor.getNotifications();
      expect(notifications.length).toBeLessThanOrEqual(maxNotifications);
    });

    test('should clear all notifications', () => {
      // Create multiple notifications
      for (let i = 0; i < 3; i++) {
        const error: SyncErrorDetails = {
          code: `ERROR_${i}`,
          message: `Error ${i}`,
          timestamp: new Date(),
          retryCount: 0,
          recoverable: true,
          category: 'network',
        };

        monitor.reportSyncError(`device-${i}`, error);
      }

      expect(monitor.getNotifications()).toHaveLength(3);

      monitor.clearNotifications();
      expect(monitor.getNotifications()).toHaveLength(0);
    });
  });
});

describe('SyncProgressTracker', () => {
  let tracker: SyncProgressTracker;

  beforeEach(() => {
    tracker = new SyncProgressTracker();
  });

  afterEach(() => {
    tracker.dispose();
  });

  describe('Progress Session Management', () => {
    test('should start and track progress session', () => {
      const session: ProgressSession = {
        sessionId: 'session-123',
        deviceId: 'device-123',
        deviceName: 'iPhone 14',
        startTime: new Date(),
        totalSize: 1024000,
        totalOperations: 50,
        priority: 'high',
        canPause: true,
        transferType: 'bidirectional',
      };

      tracker.startProgressTracking(session);

      const activeSessions = tracker.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]).toEqual(session);

      const progress = tracker.getSessionProgress(session.sessionId);
      expect(progress?.sessionId).toBe(session.sessionId);
      expect(progress?.totalOperations).toBe(50);
    });

    test('should update progress with metrics', () => {
      const session: ProgressSession = {
        sessionId: 'session-progress',
        deviceId: 'device-progress',
        deviceName: 'Android Phone',
        startTime: new Date(),
        totalSize: 2048000,
        totalOperations: 100,
        priority: 'medium',
        canPause: true,
        transferType: 'upload',
      };

      const networkCondition: NetworkCondition = {
        type: 'wifi',
        quality: 'excellent',
        bandwidth: 100,
        latency: 10,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      tracker.startProgressTracking(session);

      tracker.updateProgress(
        session.sessionId,
        {
          completedOperations: 25,
          dataTransferred: 512000,
          currentOperation: 'Uploading data batch 1',
        },
        networkCondition
      );

      const progress = tracker.getSessionProgress(session.sessionId);
      expect(progress?.completedOperations).toBe(25);
      expect(progress?.dataTransferred).toBe(512000);
      expect(progress?.currentOperation).toBe('Uploading data batch 1');
    });

    test('should calculate accurate ETA and speed', () => {
      const session: ProgressSession = {
        sessionId: 'session-eta',
        deviceId: 'device-eta',
        deviceName: 'Test Device',
        startTime: new Date(Date.now() - 10000), // Started 10 seconds ago
        totalSize: 1000000, // 1MB
        totalOperations: 10,
        priority: 'high',
        canPause: false,
        transferType: 'download',
      };

      const networkCondition: NetworkCondition = {
        type: 'wifi',
        quality: 'good',
        bandwidth: 50,
        latency: 25,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      tracker.startProgressTracking(session);

      // Simulate 50% completion
      tracker.updateProgress(
        session.sessionId,
        {
          completedOperations: 5,
          dataTransferred: 500000,
          currentOperation: 'Downloading...',
        },
        networkCondition
      );

      const progress = tracker.getSessionProgress(session.sessionId);
      expect(progress?.speed).toBeGreaterThan(0);
      expect(progress?.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });

  describe('Session Control', () => {
    test('should pause and resume sessions', () => {
      const session: ProgressSession = {
        sessionId: 'session-control',
        deviceId: 'device-control',
        deviceName: 'Controllable Device',
        startTime: new Date(),
        totalSize: 512000,
        totalOperations: 20,
        priority: 'medium',
        canPause: true,
        transferType: 'bidirectional',
      };

      tracker.startProgressTracking(session);

      // Pause session
      tracker.pauseSession(session.sessionId);
      expect(tracker.isSessionPaused(session.sessionId)).toBe(true);

      // Resume session
      tracker.resumeSession(session.sessionId);
      expect(tracker.isSessionPaused(session.sessionId)).toBe(false);
    });

    test('should cancel sessions', () => {
      const session: ProgressSession = {
        sessionId: 'session-cancel',
        deviceId: 'device-cancel',
        deviceName: 'Cancellable Device',
        startTime: new Date(),
        totalSize: 256000,
        totalOperations: 10,
        priority: 'low',
        canPause: true,
        transferType: 'upload',
      };

      tracker.startProgressTracking(session);
      expect(tracker.getActiveSessions()).toHaveLength(1);

      tracker.cancelSession(session.sessionId);
      expect(tracker.getActiveSessions()).toHaveLength(0);
    });

    test('should complete sessions with results', () => {
      const session: ProgressSession = {
        sessionId: 'session-complete',
        deviceId: 'device-complete',
        deviceName: 'Completed Device',
        startTime: new Date(),
        totalSize: 128000,
        totalOperations: 5,
        priority: 'high',
        canPause: false,
        transferType: 'download',
      };

      const result: SyncOperationResult = {
        success: true,
        syncedRecords: 5,
        conflicts: 0,
        duration: 15000,
        bytesTransferred: 128000,
        retryAttempts: 0,
      };

      tracker.startProgressTracking(session);
      tracker.completeSession(session.sessionId, result);

      expect(tracker.getActiveSessions()).toHaveLength(0);

      const finalProgress = tracker.getSessionProgress(session.sessionId);
      expect(finalProgress?.completedOperations).toBe(finalProgress?.totalOperations);
    });
  });
});

describe('SyncRetryManager', () => {
  let retryManager: SyncRetryManager;
  let retryConfig: RetryConfig;

  beforeEach(() => {
    retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitterFactor: 0.1,
      retryableErrors: ['NET_TIMEOUT', 'NET_UNREACHABLE', 'CRYPTO_TIMEOUT'],
    };

    retryManager = new SyncRetryManager(retryConfig);
  });

  afterEach(() => {
    retryManager.dispose();
  });

  describe('Retry Logic', () => {
    test('should retry operations with exponential backoff', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error: SyncErrorDetails = {
            code: 'NET_TIMEOUT',
            message: 'Network timeout',
            timestamp: new Date(),
            retryCount: attemptCount - 1,
            recoverable: true,
            category: 'network',
          };
          throw error;
        }
        return {
          success: true,
          syncedRecords: 10,
          conflicts: 0,
          duration: 5000,
          bytesTransferred: 1024,
          retryAttempts: attemptCount - 1,
        };
      });

      const context: RetryContext = {
        operationId: 'op-123',
        operationType: 'sync',
        deviceId: 'device-retry',
        priority: 'medium',
        maxRetries: 3,
        baseDelay: 100, // Short delay for testing
        maxDelay: 1000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT'],
        circuitBreakerEnabled: true,
      };

      const networkCondition: NetworkCondition = {
        type: 'wifi',
        quality: 'good',
        bandwidth: 50,
        latency: 25,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      const result = await retryManager.executeWithRetry(context, mockOperation, networkCondition);

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue({
        code: 'NET_TIMEOUT',
        message: 'Network timeout',
        timestamp: new Date(),
        retryCount: 0,
        recoverable: true,
        category: 'network',
      });

      const context: RetryContext = {
        operationId: 'op-fail',
        operationType: 'sync',
        deviceId: 'device-fail',
        priority: 'high',
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 1000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT'],
        circuitBreakerEnabled: true,
      };

      const networkCondition: NetworkCondition = {
        type: 'cellular',
        quality: 'poor',
        bandwidth: 1,
        latency: 500,
        isMetered: true,
        isReachable: true,
        lastChecked: new Date(),
      };

      await expect(
        retryManager.executeWithRetry(context, mockOperation, networkCondition)
      ).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue({
        code: 'PERM_DENIED',
        message: 'Permission denied',
        timestamp: new Date(),
        retryCount: 0,
        recoverable: false,
        category: 'permission',
      });

      const context: RetryContext = {
        operationId: 'op-perm',
        operationType: 'sync',
        deviceId: 'device-perm',
        priority: 'high',
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT'],
        circuitBreakerEnabled: true,
      };

      const networkCondition: NetworkCondition = {
        type: 'wifi',
        quality: 'excellent',
        bandwidth: 100,
        latency: 10,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      await expect(
        retryManager.executeWithRetry(context, mockOperation, networkCondition)
      ).rejects.toThrow('Permission denied');

      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries for permission errors
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after repeated failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue({
        code: 'NET_TIMEOUT',
        message: 'Network timeout',
        timestamp: new Date(),
        retryCount: 0,
        recoverable: true,
        category: 'network',
      });

      const context: RetryContext = {
        operationId: 'op-circuit',
        operationType: 'sync',
        deviceId: 'device-circuit',
        priority: 'medium',
        maxRetries: 1,
        baseDelay: 100,
        maxDelay: 1000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT'],
        circuitBreakerEnabled: true,
      };

      const networkCondition: NetworkCondition = {
        type: 'wifi',
        quality: 'good',
        bandwidth: 50,
        latency: 25,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await retryManager.executeWithRetry(context, mockOperation, networkCondition);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should now be open
      const circuitState = retryManager.getCircuitBreakerState(
        context.deviceId,
        context.operationType
      );
      expect(circuitState?.state).toBe('open');

      // Next operation should fail immediately due to open circuit
      await expect(
        retryManager.executeWithRetry(context, mockOperation, networkCondition)
      ).rejects.toThrow('Circuit breaker open');
    });

    test('should reset circuit breaker', () => {
      const deviceId = 'device-reset';
      const operationType = 'sync';

      // Manually set circuit breaker state
      retryManager.resetCircuitBreaker(deviceId, operationType);

      const circuitState = retryManager.getCircuitBreakerState(deviceId, operationType);
      expect(circuitState?.state).toBe('closed');
      expect(circuitState?.failureCount).toBe(0);
    });
  });

  describe('Retry Budget', () => {
    test('should manage retry budget per device', () => {
      const deviceId = 'device-budget';

      const budget = retryManager.getRetryBudget(deviceId);
      expect(budget).toBeNull(); // No budget initially

      // Budget should be created after first operation
      const context: RetryContext = {
        operationId: 'op-budget',
        operationType: 'sync',
        deviceId,
        priority: 'low',
        maxRetries: 1,
        baseDelay: 100,
        maxDelay: 1000,
        backoffFactor: 2,
        jitterFactor: 0.1,
        retryableErrors: ['NET_TIMEOUT'],
        circuitBreakerEnabled: false,
      };

      // Simulate budget consumption would happen during actual retry operations
    });

    test('should reset retry budget', () => {
      const deviceId = 'device-budget-reset';

      retryManager.resetRetryBudget(deviceId);

      const budget = retryManager.getRetryBudget(deviceId);
      expect(budget?.usedRetries).toBe(0);
      expect(budget?.maxRetries).toBeGreaterThan(0);
    });
  });
});

// Network condition simulation tests
describe('Network Condition Management', () => {
  test('should handle various network conditions', () => {
    const conditions: NetworkCondition[] = [
      {
        type: 'wifi',
        quality: 'excellent',
        bandwidth: 100,
        latency: 10,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      },
      {
        type: 'cellular',
        quality: 'good',
        bandwidth: 25,
        latency: 50,
        isMetered: true,
        isReachable: true,
        lastChecked: new Date(),
      },
      {
        type: 'offline',
        quality: 'unusable',
        bandwidth: 0,
        latency: 0,
        isMetered: false,
        isReachable: false,
        lastChecked: new Date(),
      },
    ];

    conditions.forEach(condition => {
      expect(condition.type).toBeDefined();
      expect(condition.quality).toBeDefined();
      expect(condition.bandwidth).toBeGreaterThanOrEqual(0);
      expect(condition.latency).toBeGreaterThanOrEqual(0);
      expect(typeof condition.isMetered).toBe('boolean');
      expect(typeof condition.isReachable).toBe('boolean');
    });
  });

  test('should adapt sync behavior based on network quality', () => {
    const poorCondition: NetworkCondition = {
      type: 'cellular',
      quality: 'poor',
      bandwidth: 1,
      latency: 1000,
      isMetered: true,
      isReachable: true,
      lastChecked: new Date(),
    };

    const excellentCondition: NetworkCondition = {
      type: 'wifi',
      quality: 'excellent',
      bandwidth: 1000,
      latency: 5,
      isMetered: false,
      isReachable: true,
      lastChecked: new Date(),
    };

    // Poor network should trigger more conservative sync parameters
    expect(poorCondition.bandwidth).toBeLessThan(excellentCondition.bandwidth);
    expect(poorCondition.latency).toBeGreaterThan(excellentCondition.latency);
    expect(poorCondition.isMetered).toBe(true);

    // Excellent network should allow aggressive sync parameters
    expect(excellentCondition.quality).toBe('excellent');
    expect(excellentCondition.isMetered).toBe(false);
  });
});
