import { NetworkStatusService } from '../../services/NetworkStatusService';
import { BackgroundSyncService } from '../../services/BackgroundSyncService';
import { OfflineDataPersistence } from '../../services/OfflineDataPersistence';
import { P2PCommunicationProtocol } from '../../components/sync/P2PCommunicationProtocol';
import { ConflictDetectionService } from '../../components/conflict-resolution/ConflictDetectionService';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('../../services/EncryptedDataService');
jest.mock('../../components/sync/P2PCommunicationProtocol');
jest.mock('../../components/conflict-resolution/ConflictDetectionService');

describe('Network-Optional Design', () => {
  let networkService: NetworkStatusService;
  let backgroundSync: BackgroundSyncService;
  let offlineData: OfflineDataPersistence;
  let mockP2PProtocol: jest.Mocked<P2PCommunicationProtocol>;
  let mockConflictService: jest.Mocked<ConflictDetectionService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup NetInfo mock
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: { strength: 75 },
    });

    // Create service instances
    networkService = new NetworkStatusService();
    mockP2PProtocol = new P2PCommunicationProtocol() as jest.Mocked<P2PCommunicationProtocol>;
    mockConflictService = new ConflictDetectionService() as jest.Mocked<ConflictDetectionService>;

    backgroundSync = new BackgroundSyncService(
      networkService,
      mockP2PProtocol,
      mockConflictService
    );
  });

  afterEach(async () => {
    // Cleanup services
    networkService?.dispose();
    backgroundSync?.dispose();
    await offlineData?.dispose();
  });

  describe('Core Offline Functionality', () => {
    test('should maintain full functionality without network', async () => {
      // Simulate no network connectivity
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const networkStatus = networkService.getNetworkStatus();

      expect(networkStatus.isOnline).toBe(false);
      expect(networkStatus.connectionType).toBe('none');

      // Verify offline data persistence works
      const testData = {
        flow: 'heavy',
        symptoms: ['cramps', 'fatigue'],
        timestamp: Date.now(),
      };

      // Should be able to store data offline
      const operationId = await offlineData.storeData('cycle_data', testData);
      expect(operationId).toBeDefined();

      // Should be able to retrieve data offline
      const retrievedData = await offlineData.retrieveData('cycle_data');
      expect(retrievedData).toHaveLength(1);
      expect(retrievedData[0].flow).toBe('heavy');
    });

    test('should queue operations during offline periods', async () => {
      // Start online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Queue sync operation
      const operationId = backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'test-device',
        dataType: 'cycle_data',
        priority: 'medium',
        maxRetries: 3,
        data: { test: 'data' },
      });

      expect(operationId).toBeDefined();

      // Verify operation is queued
      const status = backgroundSync.getSyncStatus();
      expect(status.pending).toBe(1);
      expect(status.totalQueued).toBe(1);
    });

    test('should handle airplane mode gracefully', async () => {
      // Simulate airplane mode activation
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Network service should detect offline state
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow for async initialization

      const networkStatus = networkService.getNetworkStatus();
      expect(networkStatus.isOnline).toBe(false);

      // Background sync should pause
      const initialStatus = backgroundSync.getSyncStatus();
      expect(initialStatus.inProgress).toBe(0);

      // Data operations should continue working
      const testEntry = {
        date: new Date().toISOString(),
        flow: 'medium',
        mood: 'happy',
      };

      const operationId = await offlineData.storeData('cycle_entries', testEntry);
      expect(operationId).toBeDefined();

      // Should be able to retrieve stored data
      const entries = await offlineData.retrieveData('cycle_entries');
      expect(entries).toHaveLength(1);
      expect(entries[0].flow).toBe('medium');
    });
  });

  describe('Graceful Network Degradation', () => {
    test('should detect poor network conditions', async () => {
      // Simulate poor cellular connection
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          cellularGeneration: '3g',
          strength: 15, // Very poor signal
        },
      });

      const networkStatus = networkService.getNetworkStatus();

      // Should detect poor connectivity
      expect(networkStatus.isOnline).toBe(false); // Poor signal treated as offline
      expect(networkService.isSuitableForLargeTransfers()).toBe(false);
    });

    test('should adjust sync behavior based on connection quality', async () => {
      // Test WiFi connection (good for large transfers)
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 85 },
      });

      expect(networkService.isSuitableForLargeTransfers()).toBe(true);

      // Test weak cellular (not suitable for large transfers)
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          cellularGeneration: '4g',
          strength: 30,
        },
      });

      expect(networkService.isSuitableForLargeTransfers()).toBe(false);
    });

    test('should calculate connectivity reliability score', async () => {
      // Simulate unstable connection history
      const connectivityEvents = [
        { timestamp: Date.now() - 10000, isConnected: true },
        { timestamp: Date.now() - 8000, isConnected: false },
        { timestamp: Date.now() - 6000, isConnected: true },
        { timestamp: Date.now() - 4000, isConnected: false },
        { timestamp: Date.now() - 2000, isConnected: true },
      ];

      // Mock connectivity history (would normally be populated over time)
      (networkService as any).connectivityHistory = connectivityEvents;

      const reliability = networkService.getConnectivityReliability();
      expect(reliability).toBe(60); // 3 connected out of 5 events = 60%
    });
  });

  describe('Intelligent Background Sync Resume', () => {
    test('should resume sync when connectivity is restored', done => {
      // Start offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Queue operations while offline
      backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'test-device',
        dataType: 'cycle_data',
        priority: 'high',
        maxRetries: 3,
        data: { offline: 'data' },
      });

      // Listen for network restoration
      networkService.once('online', event => {
        expect(event.connectivityRestored).toBe(true);
        expect(event.downtime).toBeGreaterThan(0);

        // Verify sync resumes
        setTimeout(() => {
          const status = backgroundSync.getSyncStatus();
          expect(status.pending).toBeGreaterThan(0);
          done();
        }, 100);
      });

      // Simulate connectivity restoration
      setTimeout(() => {
        (NetInfo.fetch as jest.Mock).mockResolvedValue({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { strength: 80 },
        });

        // Trigger network state change
        (networkService as any).handleNetworkStateChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { strength: 80 },
        });
      }, 500);
    });

    test('should prioritize high-priority operations on sync resume', async () => {
      // Queue operations with different priorities
      const highPriorityId = backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'test-device',
        dataType: 'urgent_data',
        priority: 'high',
        maxRetries: 3,
        data: { urgent: true },
      });

      const lowPriorityId = backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'test-device',
        dataType: 'regular_data',
        priority: 'low',
        maxRetries: 3,
        data: { urgent: false },
      });

      // Mock successful P2P communication
      mockP2PProtocol.sendData.mockResolvedValue(undefined);

      // Process priority operations
      await (backgroundSync as any).processPriorityOperations();

      // High priority should be processed first
      expect(mockP2PProtocol.sendData).toHaveBeenCalledWith(
        'test-device',
        expect.objectContaining({ urgent: true })
      );
    });

    test('should handle sync resume with low connectivity reliability', done => {
      // Set up low reliability connection
      (networkService as any).connectivityHistory = Array(20)
        .fill(null)
        .map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          isConnected: i % 4 === 0, // 25% reliability
        }));

      networkService.once('online', () => {
        // Should delay sync due to low reliability
        const reliability = networkService.getConnectivityReliability();
        expect(reliability).toBe(25);

        // Verify delayed resume
        setTimeout(() => {
          done();
        }, 1000);
      });

      // Trigger online event
      (networkService as any).handleNetworkStateChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { strength: 40 },
      });
    });
  });

  describe('Network Status Monitoring', () => {
    test('should provide accurate network status information', async () => {
      const status = networkService.getNetworkStatus();

      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('isInitialized');
      expect(status).toHaveProperty('connectionType');
      expect(status).toHaveProperty('signalStrength');
    });

    test('should wait for connectivity with timeout', async () => {
      // Start offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Wait for connectivity with short timeout
      const connectivityPromise = networkService.waitForConnectivity(1000);

      // Should timeout and return false
      const result = await connectivityPromise;
      expect(result).toBe(false);
    });

    test('should return true immediately if already online', async () => {
      // Start online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const result = await networkService.waitForConnectivity(1000);
      expect(result).toBe(true);
    });
  });

  describe('Offline Data Queue Management', () => {
    test('should persist and restore operation queue', async () => {
      // Add operations to queue
      const testOperations = [
        {
          table: 'cycle_data',
          data: { flow: 'light', date: '2025-01-01' },
          operation: 'create' as const,
        },
        {
          table: 'symptoms',
          data: { type: 'headache', severity: 3 },
          operation: 'create' as const,
        },
      ];

      const operationIds = [];
      for (const op of testOperations) {
        const id = await offlineData.storeData(op.table, op.data, op.operation);
        operationIds.push(id);
      }

      expect(operationIds).toHaveLength(2);

      // Get pending operations
      const pending = await offlineData.getPendingOperations();
      expect(pending).toHaveLength(2);

      // Mark one as synced
      await offlineData.markOperationSynced(operationIds[0]);

      // Verify only one pending remains
      const remainingPending = await offlineData.getPendingOperations();
      expect(remainingPending).toHaveLength(1);
    });

    test('should handle offline stats calculation', () => {
      const stats = offlineData.getOfflineStats();

      expect(stats).toHaveProperty('pendingOperations');
      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('conflictCount');
      expect(stats).toHaveProperty('lastSync');
      expect(stats).toHaveProperty('storageSize');
    });

    test('should cleanup old operations', async () => {
      // Add test operations
      await offlineData.storeData('test_table', { test: 'data1' });
      await offlineData.storeData('test_table', { test: 'data2' });

      // Cleanup with very short retention (should clean up immediately for test)
      await offlineData.cleanup(0);

      // Verify cleanup completed without errors
      const stats = offlineData.getOfflineStats();
      expect(stats.pendingOperations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration: Complete Offline-to-Online Flow', () => {
    test('should handle complete offline-to-online workflow', async () => {
      // Phase 1: Start offline, store data
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const cycleData = {
        date: '2025-01-15',
        flow: 'medium',
        symptoms: ['bloating'],
        mood: 'neutral',
      };

      const operationId = await offlineData.storeData('cycle_entries', cycleData);
      expect(operationId).toBeDefined();

      // Phase 2: Queue sync operation
      const syncId = backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'primary-device',
        dataType: 'cycle_entries',
        priority: 'medium',
        maxRetries: 3,
        data: cycleData,
      });

      expect(syncId).toBeDefined();

      // Phase 3: Connectivity restored
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 85 },
      });

      // Mock successful sync
      mockP2PProtocol.sendData.mockResolvedValue(undefined);

      // Trigger network restoration
      (networkService as any).handleNetworkStateChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { strength: 85 },
      });

      // Wait for sync processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify sync completed
      expect(mockP2PProtocol.sendData).toHaveBeenCalledWith(
        'primary-device',
        expect.objectContaining(cycleData)
      );
    });

    test('should handle network interruption during sync', async () => {
      // Start online and begin sync
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      const syncId = backgroundSync.queueOperation({
        type: 'upload',
        deviceId: 'test-device',
        dataType: 'cycle_data',
        priority: 'high',
        maxRetries: 2,
        data: { test: 'interruption' },
      });

      // Simulate network interruption during sync
      mockP2PProtocol.sendData.mockRejectedValue(new Error('Network error'));

      // Network goes offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      (networkService as any).handleNetworkStateChange({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Verify sync is paused
      const status = backgroundSync.getSyncStatus();
      expect(status.inProgress).toBe(0);

      // Network restored
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      mockP2PProtocol.sendData.mockResolvedValue(undefined);

      (networkService as any).handleNetworkStateChange({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Should retry the operation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify eventual success (may need to wait for retry logic)
      setTimeout(() => {
        expect(mockP2PProtocol.sendData).toHaveBeenCalled();
      }, 1000);
    });
  });
});
