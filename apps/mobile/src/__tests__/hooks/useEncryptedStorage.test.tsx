import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useEncryptedStorage } from '../../hooks/useEncryptedStorage';
import { EncryptedDataService } from '../../services/encryptedDataService';

// Mock CryptoOperationError to avoid lazy-loading issues
class CryptoOperationError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

// Mock the service
jest.mock('../../services/encryptedDataService');

const MockedEncryptedDataService = EncryptedDataService as jest.MockedClass<
  typeof EncryptedDataService
>;

describe('useEncryptedStorage', () => {
  const mockConfig = {
    userId: 'test-user-123',
    deviceId: 'test-device-456',
    enableAAD: true,
    enableAuditTrail: true,
    autoInitialize: false,
  };

  let mockService: jest.Mocked<EncryptedDataService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      storeCycleData: jest.fn().mockResolvedValue('mock-record-id'),
      retrieveCycleData: jest.fn().mockResolvedValue({
        id: 'test-cycle-1',
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        modificationHistory: [],
      }),
      storeSymptomData: jest.fn().mockResolvedValue(undefined),
      batchEncryptData: jest.fn().mockResolvedValue([
        { success: true, memoryZeroed: true },
        { success: true, memoryZeroed: true },
      ]),
      performHealthCheck: jest.fn().mockResolvedValue({
        cryptoCore: true,
        database: true,
        memory: true,
        overall: true,
      }),
      dispose: jest.fn().mockResolvedValue(undefined),
      createModificationRecord: jest.fn().mockResolvedValue({
        id: 'mod-1',
        timestamp: '2025-01-01T00:00:00Z',
        field: 'test',
        oldValue: 'old',
        newValue: 'new',
        deviceId: 'test-device',
      }),
    } as any;

    MockedEncryptedDataService.mockImplementation(() => mockService);
  });

  describe('initialization', () => {
    it('initializes successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockService.initialize).toHaveBeenCalled();
    });

    it('handles initialization errors', async () => {
      mockService.initialize.mockRejectedValueOnce(
        new CryptoOperationError('Init failed', 'initialization')
      );

      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        try {
          await result.current.initialize();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Init failed');
    });

    it('auto-initializes when configured', async () => {
      const autoInitConfig = { ...mockConfig, autoInitialize: true };

      const { result } = renderHook(() => useEncryptedStorage(autoInitConfig));

      // Wait for auto-initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockService.initialize).toHaveBeenCalled();
    });

    it('prevents double initialization', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
        await result.current.initialize();
      });

      expect(mockService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('storeCycleData', () => {
    it('stores cycle data successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      const mockCycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      let recordId: string;
      await act(async () => {
        recordId = await result.current.storeCycleData(mockCycleData);
      });

      expect(recordId!).toBe('mock-record-id');
      expect(mockService.storeCycleData).toHaveBeenCalledWith(mockCycleData);
      expect(result.current.error).toBeNull();
    });

    it('handles storage errors', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      mockService.storeCycleData.mockRejectedValueOnce(new Error('Storage failed'));

      const mockCycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      await act(async () => {
        try {
          await result.current.storeCycleData(mockCycleData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Storage failed');
    });

    it('throws error when not initialized', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      const mockCycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      await act(async () => {
        try {
          await result.current.storeCycleData(mockCycleData);
        } catch (error) {
          expect(error).toBeInstanceOf(CryptoOperationError);
        }
      });
    });
  });

  describe('retrieveCycleData', () => {
    it('retrieves cycle data successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      let cycleData: any;
      await act(async () => {
        cycleData = await result.current.retrieveCycleData('test-cycle-1');
      });

      expect(cycleData.id).toBe('test-cycle-1');
      expect(mockService.retrieveCycleData).toHaveBeenCalledWith('test-cycle-1');
      expect(result.current.error).toBeNull();
    });

    it('handles retrieval errors', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      mockService.retrieveCycleData.mockRejectedValueOnce(new Error('Retrieval failed'));

      await act(async () => {
        try {
          await result.current.retrieveCycleData('test-cycle-1');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Retrieval failed');
    });
  });

  describe('storeSymptomData', () => {
    it('stores symptom data successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      const symptoms = [
        { id: 'symptom-1', name: 'Headache', category: 'physical' as const, severity: 3 },
      ];

      await act(async () => {
        await result.current.storeSymptomData('cycle-1', '2025-01-01', symptoms);
      });

      expect(mockService.storeSymptomData).toHaveBeenCalledWith('cycle-1', '2025-01-01', symptoms);
      expect(result.current.error).toBeNull();
    });

    it('handles symptom storage errors', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      mockService.storeSymptomData.mockRejectedValueOnce(new Error('Symptom storage failed'));

      await act(async () => {
        try {
          await result.current.storeSymptomData('cycle-1', '2025-01-01', []);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Symptom storage failed');
    });
  });

  describe('batchStoreData', () => {
    it('batch stores data successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      const entries = [
        { data: { test: 'data1' }, type: 'cycle_data' },
        { data: { test: 'data2' }, type: 'symptom_data' },
      ];

      let results: boolean[];
      await act(async () => {
        results = await result.current.batchStoreData(entries);
      });

      expect(results!).toEqual([true, true]);
      expect(mockService.batchEncryptData).toHaveBeenCalledWith(entries);
      expect(result.current.error).toBeNull();
    });

    it('handles batch storage errors', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      mockService.batchEncryptData.mockRejectedValueOnce(new Error('Batch failed'));

      await act(async () => {
        try {
          await result.current.batchStoreData([]);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Batch failed');
    });
  });

  describe('performHealthCheck', () => {
    it('performs health check successfully', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.performHealthCheck();
      });

      expect(result.current.healthStatus).toEqual({
        cryptoCore: true,
        database: true,
        memory: true,
        overall: true,
      });
      expect(mockService.performHealthCheck).toHaveBeenCalled();
    });

    it('handles unhealthy state', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      mockService.performHealthCheck.mockResolvedValueOnce({
        cryptoCore: false,
        database: true,
        memory: true,
        overall: false,
      });

      await act(async () => {
        await result.current.performHealthCheck();
      });

      expect(result.current.healthStatus?.overall).toBe(false);
      expect(result.current.error).toBe(
        'Health check failed - encryption system not operating correctly'
      );
    });

    it('handles health check when not initialized', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.performHealthCheck();
      });

      expect(result.current.healthStatus).toEqual({
        cryptoCore: false,
        database: false,
        memory: false,
        overall: false,
      });
    });
  });

  describe('error handling', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      // Set an error state
      mockService.initialize.mockRejectedValueOnce(new Error('Test error'));

      await act(async () => {
        try {
          await result.current.initialize();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('disposes resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      unmount();

      // Small delay to allow cleanup
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockService.dispose).toHaveBeenCalled();
    });

    it('disposes resources manually', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.dispose();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(mockService.dispose).toHaveBeenCalled();
    });
  });

  describe('background health checks', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('runs background health checks when initialized', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      await act(async () => {
        await result.current.initialize();
      });

      // Fast-forward timer
      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      expect(mockService.performHealthCheck).toHaveBeenCalledTimes(1);
    });

    it('does not run background checks when not initialized', async () => {
      renderHook(() => useEncryptedStorage(mockConfig));

      // Fast-forward timer
      act(() => {
        jest.advanceTimersByTime(60000); // 1 minute
      });

      expect(mockService.performHealthCheck).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('manages loading state during operations', async () => {
      const { result } = renderHook(() => useEncryptedStorage(mockConfig));

      expect(result.current.isLoading).toBe(false);

      // Start initialization
      act(() => {
        result.current.initialize();
      });

      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
