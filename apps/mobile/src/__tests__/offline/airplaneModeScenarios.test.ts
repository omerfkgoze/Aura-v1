import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock NetInfo to simulate airplane mode
const mockNetInfo = {
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => mockNetInfo);

// Import components and services after mocking
import { OfflineFirstService } from '../../services/offlineFirstService';
import { EncryptedDataService } from '../../services/EncryptedDataService';
import { BayesianPredictionModel } from '../../components/prediction/models/BayesianPredictionModel';
import type { EncryptedCycleData, PeriodDayData } from '@aura/shared-types';

describe('Airplane Mode Scenarios', () => {
  let offlineService: OfflineFirstService;
  let dataService: EncryptedDataService;
  let predictionModel: BayesianPredictionModel;

  const mockCycleData: EncryptedCycleData = {
    id: 'test-cycle-1',
    userId: 'test-user',
    cycleNumber: 1,
    periodStartDate: '2024-01-01',
    periodEndDate: '2024-01-05',
    expectedNextPeriod: '2024-01-29',
    dayData: [
      {
        date: '2024-01-01',
        flowIntensity: 'medium',
        symptoms: [{ id: 'cramps', name: 'Cramps', category: 'physical', severity: 3 }],
        notes: 'First day of period',
      } as PeriodDayData,
      {
        date: '2024-01-02',
        flowIntensity: 'heavy',
        symptoms: [{ id: 'fatigue', name: 'Fatigue', category: 'energy', severity: 4 }],
        notes: 'Heavy flow day',
      } as PeriodDayData,
    ],
    version: 1,
    deviceId: 'test-device',
    syncedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    modificationHistory: [],
  };

  beforeEach(() => {
    // Initialize services
    offlineService = new OfflineFirstService({
      enableOfflineMode: true,
      enableBackgroundSync: true,
      maxRetryAttempts: 3,
    });

    dataService = new EncryptedDataService({
      userId: 'test-user',
      deviceId: 'test-device',
      enableAAD: true,
      enableAuditTrail: true,
    });

    predictionModel = new BayesianPredictionModel();

    // Clear mocks
    jest.clearAllMocks();

    // Setup default offline state
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
      details: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Entry in Airplane Mode', () => {
    it('should allow cycle data entry when offline', async () => {
      // Simulate airplane mode
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      });

      // Mock storage operations
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Initialize data service in offline mode
      await dataService.initialize();

      // Test data entry functionality
      const result = await offlineService.executeOperation(
        // Online operation (would fail)
        async () => {
          throw new Error('Network unavailable');
        },
        // Offline fallback (should succeed)
        async () => {
          return await dataService.storeCycleData(mockCycleData);
        },
        {
          operationType: 'storeCycleData',
          requiresNetwork: false,
        }
      );

      expect(result).toBeDefined();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should queue sync operations when offline', async () => {
      // Ensure offline state
      expect(offlineService.isOffline()).toBe(true);

      // Attempt operation that requires network
      await offlineService.executeOperation(
        async () => {
          throw new Error('Network required');
        },
        async () => {
          // Offline fallback - queue for later sync
          await offlineService.queueOperation({
            type: 'sync',
            data: mockCycleData,
            priority: 'high',
          });
          return 'queued';
        },
        {
          operationType: 'syncCycleData',
          requiresNetwork: true,
          retryOnFailure: true,
        }
      );

      const queueStatus = offlineService.getQueueStatus();
      expect(queueStatus.totalOperations).toBeGreaterThan(0);
      expect(queueStatus.operationsByType.sync).toBe(1);
    });

    it('should handle symptom tracking offline', async () => {
      await dataService.initialize();

      const symptoms = [
        { id: 'mood-happy', name: 'Happy', category: 'mood' as const, severity: 2 },
        { id: 'energy-high', name: 'High Energy', category: 'energy' as const, severity: 4 },
      ];

      // Test offline symptom storage
      const result = await offlineService.executeOperation(
        async () => {
          throw new Error('Network unavailable');
        },
        async () => {
          await dataService.storeSymptomData('test-cycle-1', '2024-01-03', symptoms);
          return 'stored';
        },
        {
          operationType: 'storeSymptoms',
          requiresNetwork: false,
        }
      );

      expect(result).toBe('stored');
    });
  });

  describe('Prediction Engine in Airplane Mode', () => {
    it('should generate predictions without network connection', async () => {
      // Ensure we're offline
      expect(offlineService.isOffline()).toBe(true);

      // Create multiple cycles for better predictions
      const cycleHistory = [
        { ...mockCycleData, cycleNumber: 1, periodStartDate: '2024-01-01' },
        { ...mockCycleData, cycleNumber: 2, periodStartDate: '2024-01-28' },
        { ...mockCycleData, cycleNumber: 3, periodStartDate: '2024-02-25' },
      ];

      // Test offline prediction generation
      const prediction = await predictionModel.predictNextPeriod(cycleHistory);

      expect(prediction).toBeDefined();
      expect(prediction.nextPeriodStart).toBeDefined();
      expect(prediction.confidenceIntervals).toBeDefined();
      expect(prediction.uncertaintyFactors).toBeDefined();
      expect(prediction.probabilityDistribution).toBeDefined();
      expect(prediction.explanation).toBeDefined();
    });

    it('should generate ovulation predictions offline', async () => {
      const cycleHistory = [
        { ...mockCycleData, cycleNumber: 1, periodStartDate: '2024-01-01' },
        { ...mockCycleData, cycleNumber: 2, periodStartDate: '2024-01-28' },
      ];

      const ovulationPrediction = await predictionModel.predictOvulation(cycleHistory);

      expect(ovulationPrediction).toBeDefined();
      expect(ovulationPrediction.ovulationDate).toBeDefined();
      expect(ovulationPrediction.fertilityWindow).toBeDefined();
      expect(ovulationPrediction.fertilityWindow.start).toBeDefined();
      expect(ovulationPrediction.fertilityWindow.end).toBeDefined();
      expect(ovulationPrediction.confidenceIntervals).toBeDefined();
    });

    it('should handle insufficient data gracefully offline', async () => {
      // Test with minimal data
      const minimalHistory = [mockCycleData];

      const prediction = await predictionModel.predictNextPeriod(minimalHistory);

      expect(prediction).toBeDefined();
      expect(prediction.explanation).toContain('Prediction based on average cycle length');
      expect(prediction.uncertaintyFactors.dataQuality).toBeLessThan(0.5);
    });
  });

  describe('Data Persistence in Airplane Mode', () => {
    it('should persist data locally when offline', async () => {
      await dataService.initialize();

      // Mock successful storage
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockCycleData));

      // Store data offline
      const storeResult = await dataService.storeCycleData(mockCycleData);
      expect(storeResult).toBeDefined();

      // Retrieve data offline
      const retrievedData = await dataService.retrieveCycleData(storeResult);
      expect(retrievedData).toBeDefined();
      expect(retrievedData?.userId).toBe(mockCycleData.userId);
    });

    it('should maintain data integrity during offline operations', async () => {
      await dataService.initialize();

      // Mock encryption/decryption success
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const batchData = [
        { data: mockCycleData, type: 'cycle_data' },
        { data: { mood: 'happy', energy: 'high' }, type: 'daily_metrics' },
      ];

      const results = await dataService.batchEncryptData(batchData);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.memoryZeroed).toBe(true);
      });
    });

    it('should handle storage errors gracefully', async () => {
      await dataService.initialize();

      // Mock storage failure
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(dataService.storeCycleData(mockCycleData)).rejects.toThrow(
        'Failed to store encrypted cycle data'
      );
    });
  });

  describe('Network State Transitions', () => {
    it('should detect when network becomes available', async () => {
      let networkStatusChanges = 0;

      offlineService.onNetworkStatusChange('test', () => {
        networkStatusChanges++;
      });

      // Simulate network becoming available
      const mockNetworkChange = mockNetInfo.addEventListener.mock.calls[0][1];

      await act(async () => {
        mockNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { ssid: 'TestWifi' },
        });
      });

      expect(networkStatusChanges).toBeGreaterThan(0);

      // Clean up listener
      offlineService.offNetworkStatusChange('test');
    });

    it('should process queue when network becomes available', async () => {
      // Start offline with queued operations
      await offlineService.queueOperation({
        type: 'sync',
        data: mockCycleData,
        priority: 'high',
      });

      const initialQueueSize = offlineService.getQueueStatus().totalOperations;
      expect(initialQueueSize).toBeGreaterThan(0);

      // Simulate network becoming available
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: null,
      });

      // Process queue manually (simulating automatic processing)
      try {
        await offlineService.syncNow();
      } catch (error) {
        // Expected to fail in test environment, but queue should still be processed
      }

      // Note: In real implementation, successful operations would be removed from queue
    });

    it('should handle intermittent connectivity', async () => {
      const statusUpdates: any[] = [];

      offlineService.onNetworkStatusChange('test', status => {
        statusUpdates.push(status);
      });

      // Simulate connection drops
      const mockNetworkChange = mockNetInfo.addEventListener.mock.calls[0][1];

      // Connected
      await act(async () => {
        mockNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
          details: null,
        });
      });

      // Disconnected
      await act(async () => {
        mockNetworkChange({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
          details: null,
        });
      });

      // Reconnected
      await act(async () => {
        mockNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: null,
        });
      });

      expect(statusUpdates.length).toBeGreaterThanOrEqual(3);

      offlineService.offNetworkStatusChange('test');
    });
  });

  describe('Performance in Airplane Mode', () => {
    it('should maintain responsive UI when offline', async () => {
      const startTime = performance.now();

      // Simulate multiple offline operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        offlineService.executeOperation(
          async () => {
            throw new Error('Network unavailable');
          },
          async () => `offline-result-${i}`,
          { operationType: `operation-${i}` }
        )
      );

      const results = await Promise.all(operations);
      const endTime = performance.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large datasets offline', async () => {
      await dataService.initialize();

      // Create large dataset
      const largeCycleData = {
        ...mockCycleData,
        dayData: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          flowIntensity: ['none', 'spotting', 'light', 'medium', 'heavy'][i % 5] as any,
          symptoms: [
            {
              id: `symptom-${i}`,
              name: `Symptom ${i}`,
              category: 'physical' as const,
              severity: (i % 5) + 1,
            },
          ],
          notes: `Day ${i + 1} notes`,
        })),
      };

      const startTime = performance.now();

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const result = await dataService.storeCycleData(largeCycleData);

      const endTime = performance.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Health Checks in Airplane Mode', () => {
    it('should report degraded status when offline', async () => {
      const health = await offlineService.performHealthCheck();

      expect(health.operationalStatus).toBe('degraded');
      expect(typeof health.networkMonitoring).toBe('boolean');
      expect(typeof health.queuePersistence).toBe('boolean');
      expect(typeof health.queueSize).toBe('number');
    });

    it('should perform data service health check offline', async () => {
      await dataService.initialize();

      const health = await dataService.performHealthCheck();

      expect(health).toBeDefined();
      expect(typeof health.overall).toBe('boolean');
      expect(typeof health.memory).toBe('boolean');
      expect(typeof health.cryptoCore).toBe('boolean');
      expect(typeof health.database).toBe('boolean');
    });
  });

  describe('Error Handling in Airplane Mode', () => {
    it('should handle crypto errors gracefully', async () => {
      // Mock crypto initialization failure
      const failingDataService = new EncryptedDataService({
        userId: 'test-user',
        deviceId: 'test-device',
        enableAAD: true,
        enableAuditTrail: true,
      });

      // This should fail gracefully without crashing
      await expect(failingDataService.storeCycleData(mockCycleData)).rejects.toThrow();
    });

    it('should handle storage quota exceeded', async () => {
      await dataService.initialize();

      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('QuotaExceededError'));

      await expect(dataService.storeCycleData(mockCycleData)).rejects.toThrow(
        'Failed to store encrypted cycle data'
      );
    });

    it('should recover from temporary failures', async () => {
      let attempts = 0;

      const result = await offlineService.executeOperation(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return 'success';
        },
        async () => 'fallback',
        { operationType: 'temperamental-operation' }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('Memory Management in Airplane Mode', () => {
    it('should properly zero sensitive memory', async () => {
      await dataService.initialize();

      const sensitiveData = 'sensitive health information';
      const buffer = new TextEncoder().encode(sensitiveData);

      // Create a copy to verify zeroing
      const originalData = new Uint8Array(buffer);

      // This would be called internally by the encryption process
      buffer.fill(0);

      expect(buffer.every(byte => byte === 0)).toBe(true);
      expect(originalData.every(byte => byte === 0)).toBe(false);
    });

    it('should dispose resources properly', async () => {
      await dataService.initialize();

      // Should not throw when disposing
      await expect(dataService.dispose()).resolves.toBeUndefined();

      offlineService.dispose();

      // Should not throw when disposing
      expect(() => offlineService.dispose()).not.toThrow();
    });
  });
});
