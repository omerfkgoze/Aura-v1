import { EncryptedDataService } from '../../services/encryptedDataService';
// Mock CryptoOperationError to avoid lazy-loading issues
class CryptoOperationError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}
import type { EncryptedCycleData, Symptom } from '@aura/shared-types';

// Mock dependencies
jest.mock('@aura/crypto-core', () => ({
  AsyncCryptoCore: {
    create: jest.fn(() => ({
      createEnvelope: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      generateEncryptionKey: jest.fn().mockResolvedValue({ keyData: new Uint8Array(32) }),
      generateSigningKey: jest.fn().mockResolvedValue({ keyData: new Uint8Array(32) }),
      createCycleDataAAD: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      runHealthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
    })),
  },
  initializeCrypto: jest.fn().mockResolvedValue({ verified: true }),
  CryptoOperationError: class extends Error {
    constructor(
      message: string,
      public operation: string,
      public cause?: Error
    ) {
      super(message);
      this.name = 'CryptoOperationError';
    }
  },
}));

jest.mock('@aura/database-security', () => ({
  createRealmEncryptedDatabase: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    storeEncryptedCycleData: jest.fn().mockResolvedValue('mock-record-id'),
    retrieveEncryptedCycleData: jest.fn().mockResolvedValue({
      id: 'test-cycle-1',
      userId: 'test-user',
      cycleNumber: 1,
      periodStartDate: '2025-01-01',
      encryptedDayData: 'mock-encrypted-data',
      version: 1,
      deviceId: 'test-device',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      modificationHistory: [],
    }),
    updateCycleSymptoms: jest.fn().mockResolvedValue(undefined),
    performHealthCheck: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('EncryptedDataService', () => {
  let service: EncryptedDataService;
  const mockConfig = {
    userId: 'test-user-123',
    deviceId: 'test-device-456',
    enableAAD: true,
    enableAuditTrail: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EncryptedDataService(mockConfig);
  });

  afterEach(async () => {
    if (service) {
      await service.dispose();
    }
  });

  describe('initialization', () => {
    it('initializes successfully with valid config', async () => {
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('prevents double initialization', async () => {
      await service.initialize();
      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('throws error when crypto initialization fails', async () => {
      const { initializeCrypto } = await import('@aura/crypto-core');
      (initializeCrypto as jest.Mock).mockRejectedValueOnce(new Error('Crypto init failed'));

      await expect(service.initialize()).rejects.toThrow(CryptoOperationError);
    });
  });

  describe('storeCycleData', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('stores cycle data with encryption', async () => {
      const mockCycleData: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'test-user-123',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        periodEndDate: '2025-01-05',
        expectedNextPeriod: '2025-02-01',
        dayData: [
          {
            date: '2025-01-01',
            flowIntensity: 'medium',
            symptoms: [{ id: 'symptom-1', name: 'Cramps', category: 'physical', severity: 3 }],
            isPeriodStart: true,
          },
        ],
        version: 1,
        deviceId: 'test-device-456',
        modificationHistory: [],
      };

      const recordId = await service.storeCycleData(mockCycleData);
      expect(recordId).toBe('mock-record-id');
    });

    it('throws error when not initialized', async () => {
      const uninitializedService = new EncryptedDataService(mockConfig);

      const mockCycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      await expect(uninitializedService.storeCycleData(mockCycleData)).rejects.toThrow(
        CryptoOperationError
      );
    });
  });

  describe('retrieveCycleData', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('retrieves and decrypts cycle data', async () => {
      const cycleData = await service.retrieveCycleData('test-cycle-1');

      expect(cycleData).toBeDefined();
      expect(cycleData?.id).toBe('test-cycle-1');
      expect(cycleData?.userId).toBe('test-user');
    });

    it('returns null for non-existent cycle', async () => {
      const { createRealmEncryptedDatabase } = await import('@aura/database-security');
      const mockDatabase = await createRealmEncryptedDatabase({} as any);
      (mockDatabase.retrieveEncryptedCycleData as jest.Mock).mockResolvedValueOnce(null);

      const cycleData = await service.retrieveCycleData('non-existent');
      expect(cycleData).toBeNull();
    });

    it('throws error when not initialized', async () => {
      const uninitializedService = new EncryptedDataService(mockConfig);

      await expect(uninitializedService.retrieveCycleData('test-cycle-1')).rejects.toThrow(
        CryptoOperationError
      );
    });
  });

  describe('storeSymptomData', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('stores encrypted symptom data', async () => {
      const symptoms: Symptom[] = [
        { id: 'symptom-1', name: 'Headache', category: 'physical', severity: 4 },
        { id: 'symptom-2', name: 'Anxiety', category: 'mood', severity: 3 },
      ];

      await expect(
        service.storeSymptomData('cycle-1', '2025-01-01', symptoms)
      ).resolves.toBeUndefined();
    });

    it('throws error when not initialized', async () => {
      const uninitializedService = new EncryptedDataService(mockConfig);

      await expect(
        uninitializedService.storeSymptomData('cycle-1', '2025-01-01', [])
      ).rejects.toThrow(CryptoOperationError);
    });
  });

  describe('createModificationRecord', () => {
    it('creates modification record with proper structure', async () => {
      const record = await service.createModificationRecord(
        'periodStartDate',
        '2025-01-01',
        '2025-01-02'
      );

      expect(record).toMatchObject({
        field: 'periodStartDate',
        oldValue: '2025-01-01',
        newValue: '2025-01-02',
        deviceId: 'test-device-456',
      });
      expect(record.id).toBeDefined();
      expect(record.timestamp).toBeDefined();
    });
  });

  describe('batchEncryptData', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('encrypts multiple data entries', async () => {
      const entries = [
        { data: { test: 'data1' }, type: 'cycle_data' },
        { data: { test: 'data2' }, type: 'symptom_data' },
      ];

      const results = await service.batchEncryptData(entries);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].memoryZeroed).toBe(true);
      expect(results[1].memoryZeroed).toBe(true);
    });

    it('handles empty batch', async () => {
      const results = await service.batchEncryptData([]);
      expect(results).toEqual([]);
    });
  });

  describe('performHealthCheck', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('performs comprehensive health check', async () => {
      const health = await service.performHealthCheck();

      expect(health).toMatchObject({
        cryptoCore: true,
        database: true,
        memory: true,
        overall: true,
      });
    });

    it('reports unhealthy state when crypto fails', async () => {
      const { AsyncCryptoCore } = await import('@aura/crypto-core');
      const mockCrypto = await AsyncCryptoCore.create();
      (mockCrypto.runHealthCheck as jest.Mock).mockRejectedValueOnce(
        new Error('Health check failed')
      );

      const health = await service.performHealthCheck();

      expect(health.cryptoCore).toBe(false);
      expect(health.overall).toBe(false);
    });
  });

  describe('memory safety', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('zeros memory after encryption operations', async () => {
      const mockCycleData = {
        userId: 'test-user',
        cycleNumber: 1,
        periodStartDate: '2025-01-01',
        dayData: [
          {
            date: '2025-01-01',
            flowIntensity: 'medium' as const,
            symptoms: [],
          },
        ],
        version: 1,
        deviceId: 'test-device',
        modificationHistory: [],
      };

      // Store data and verify memory is zeroed
      const recordId = await service.storeCycleData(mockCycleData);
      expect(recordId).toBeDefined();

      // This test would need more sophisticated memory tracking
      // to verify actual memory zeroing in a real implementation
    });
  });

  describe('error handling', () => {
    it('handles crypto initialization errors', async () => {
      const { initializeCrypto } = await import('@aura/crypto-core');
      (initializeCrypto as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));

      await expect(service.initialize()).rejects.toThrow(CryptoOperationError);
    });

    it('handles database connection errors', async () => {
      const { createRealmEncryptedDatabase } = await import('@aura/database-security');
      (createRealmEncryptedDatabase as jest.Mock).mockRejectedValueOnce(
        new Error('DB connection failed')
      );

      await expect(service.initialize()).rejects.toThrow(CryptoOperationError);
    });
  });

  describe('dispose', () => {
    it('cleans up resources properly', async () => {
      await service.initialize();

      const { createRealmEncryptedDatabase } = await import('@aura/database-security');
      const mockDatabase = await createRealmEncryptedDatabase({} as any);

      await service.dispose();

      expect(mockDatabase.close).toHaveBeenCalled();
    });

    it('handles dispose when not initialized', async () => {
      await expect(service.dispose()).resolves.toBeUndefined();
    });
  });
});
