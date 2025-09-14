import { auditTrailService } from '../../services/auditTrailService';
import { encryptedDataService } from '../../services/encryptedDataService';
import { ModificationRecord, AuditLogQueryOptions } from '@aura/shared-types/data';

// Mock the encrypted data service
jest.mock('../../services/encryptedDataService');
const mockEncryptedDataService = encryptedDataService as jest.Mocked<typeof encryptedDataService>;

// Mock crypto
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-checksum-hash'),
  })),
};

// @ts-ignore
global.crypto = mockCrypto;

describe('AuditTrailService', () => {
  const mockUserId = 'user-123';
  const mockDeviceId = 'device-456';
  const mockEntityId = 'entity-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockEncryptedDataService.encryptData.mockResolvedValue('encrypted-audit-data');
    mockEncryptedDataService.decryptData.mockResolvedValue('{"test": "decrypted-data"}');

    // Mock the private methods by spying on the service
    jest.spyOn(auditTrailService as any, 'getDeviceId').mockResolvedValue(mockDeviceId);
    jest.spyOn(auditTrailService as any, 'storeEncryptedAuditEntry').mockResolvedValue(undefined);
    jest.spyOn(auditTrailService as any, 'getAuditEntries').mockResolvedValue([]);
  });

  describe('recordModification', () => {
    it('should successfully record a single modification', async () => {
      const field = 'periodStartDate';
      const oldValue = '2024-01-01';
      const newValue = '2024-01-02';

      await auditTrailService.recordModification(
        mockUserId,
        'cycle',
        mockEntityId,
        field,
        oldValue,
        newValue,
        'update',
        'User correction'
      );

      expect(mockEncryptedDataService.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-123"'),
        'audit_user-123',
        mockUserId
      );
    });

    it('should sanitize email addresses in values', async () => {
      const emailValue = 'user@example.com';

      await auditTrailService.recordModification(
        mockUserId,
        'preference',
        mockEntityId,
        'email',
        emailValue,
        'test@newdomain.com',
        'update'
      );

      expect(mockEncryptedDataService.encryptData).toHaveBeenCalledWith(
        expect.stringContaining('***@example.com'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should handle null and undefined values', async () => {
      await auditTrailService.recordModification(
        mockUserId,
        'cycle',
        mockEntityId,
        'notes',
        null,
        undefined,
        'update'
      );

      expect(mockEncryptedDataService.encryptData).toHaveBeenCalled();
    });

    it('should not throw errors even if storage fails', async () => {
      mockEncryptedDataService.encryptData.mockRejectedValue(new Error('Encryption failed'));

      await expect(
        auditTrailService.recordModification(
          mockUserId,
          'cycle',
          mockEntityId,
          'field',
          'old',
          'new',
          'update'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('recordBatchModifications', () => {
    it('should record multiple modifications in a single audit entry', async () => {
      const modifications = [
        {
          entityType: 'cycle' as const,
          entityId: 'cycle-1',
          field: 'periodStartDate',
          oldValue: '2024-01-01',
          newValue: '2024-01-02',
          action: 'update' as const,
        },
        {
          entityType: 'symptom' as const,
          entityId: 'symptom-1',
          field: 'severity',
          oldValue: 3,
          newValue: 4,
          action: 'update' as const,
        },
      ];

      await auditTrailService.recordBatchModifications(mockUserId, modifications);

      expect(mockEncryptedDataService.encryptData).toHaveBeenCalledTimes(1);

      const encryptedData = mockEncryptedDataService.encryptData.mock.calls[0][0];
      expect(encryptedData).toContain('cycle-1');
      expect(encryptedData).toContain('symptom-1');
    });

    it('should assign same timestamp to all modifications in batch', async () => {
      const modifications = [
        {
          entityType: 'cycle' as const,
          entityId: 'cycle-1',
          field: 'field1',
          oldValue: 'old1',
          newValue: 'new1',
          action: 'update' as const,
        },
        {
          entityType: 'cycle' as const,
          entityId: 'cycle-2',
          field: 'field2',
          oldValue: 'old2',
          newValue: 'new2',
          action: 'update' as const,
        },
      ];

      await auditTrailService.recordBatchModifications(mockUserId, modifications);

      const encryptedData = mockEncryptedDataService.encryptData.mock.calls[0][0];
      const auditEntry = JSON.parse(encryptedData);

      const timestamps = auditEntry.modifications.map((mod: any) => mod.timestamp);
      expect(timestamps[0]).toBe(timestamps[1]);
    });
  });

  describe('queryAuditLog', () => {
    const mockModifications: ModificationRecord[] = [
      {
        id: 'mod-1',
        timestamp: '2024-01-01T10:00:00Z',
        entityType: 'cycle',
        entityId: 'cycle-1',
        field: 'periodStartDate',
        oldValue: '2024-01-01',
        newValue: '2024-01-02',
        deviceId: mockDeviceId,
        userId: mockUserId,
        action: 'update',
      },
      {
        id: 'mod-2',
        timestamp: '2024-01-02T10:00:00Z',
        entityType: 'symptom',
        entityId: 'symptom-1',
        field: 'severity',
        oldValue: 3,
        newValue: 4,
        deviceId: mockDeviceId,
        userId: mockUserId,
        action: 'update',
      },
    ];

    beforeEach(() => {
      const mockAuditEntries = [
        {
          id: 'audit-1',
          encryptedEntry: 'encrypted-data-1',
        },
      ];

      jest.spyOn(auditTrailService as any, 'getAuditEntries').mockResolvedValue(mockAuditEntries);

      mockEncryptedDataService.decryptData.mockResolvedValue(
        JSON.stringify({
          modifications: mockModifications,
        })
      );

      jest.spyOn(auditTrailService as any, 'verifyAuditEntryIntegrity').mockResolvedValue(true);
    });

    it('should query and decrypt audit entries', async () => {
      const options: AuditLogQueryOptions = {
        userId: mockUserId,
        limit: 10,
      };

      const result = await auditTrailService.queryAuditLog(options);

      expect(result).toHaveLength(2);
      expect(result[0].entityType).toBe('cycle');
      expect(result[1].entityType).toBe('symptom');
    });

    it('should filter by entity type', async () => {
      const options: AuditLogQueryOptions = {
        userId: mockUserId,
        entityType: 'cycle',
      };

      const result = await auditTrailService.queryAuditLog(options);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('cycle');
    });

    it('should filter by action', async () => {
      const options: AuditLogQueryOptions = {
        userId: mockUserId,
        action: 'update',
      };

      const result = await auditTrailService.queryAuditLog(options);

      expect(result).toHaveLength(2);
      expect(result.every(mod => mod.action === 'update')).toBe(true);
    });

    it('should filter by date range', async () => {
      const options: AuditLogQueryOptions = {
        userId: mockUserId,
        startDate: '2024-01-01T09:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
      };

      const result = await auditTrailService.queryAuditLog(options);

      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe('2024-01-01T10:00:00Z');
    });

    it('should apply pagination', async () => {
      const options: AuditLogQueryOptions = {
        userId: mockUserId,
        limit: 1,
        offset: 1,
      };

      const result = await auditTrailService.queryAuditLog(options);

      expect(result).toHaveLength(1);
      expect(result[0].entityType).toBe('cycle'); // Second item after sorting
    });

    it('should return empty array on decryption failure', async () => {
      mockEncryptedDataService.decryptData.mockRejectedValue(new Error('Decryption failed'));

      const result = await auditTrailService.queryAuditLog({
        userId: mockUserId,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('getAuditSummary', () => {
    it('should generate audit summary with statistics', async () => {
      const mockModifications: ModificationRecord[] = [
        {
          id: 'mod-1',
          timestamp: '2024-01-01T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'field1',
          oldValue: 'old1',
          newValue: 'new1',
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'create',
        },
        {
          id: 'mod-2',
          timestamp: '2024-01-02T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'field2',
          oldValue: 'old2',
          newValue: 'new2',
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'update',
        },
      ];

      jest.spyOn(auditTrailService, 'queryAuditLog').mockResolvedValue(mockModifications);

      const summary = await auditTrailService.getAuditSummary(mockUserId, 30);

      expect(summary.totalModifications).toBe(2);
      expect(summary.modificationsByType['cycle_create']).toBe(1);
      expect(summary.modificationsByType['cycle_update']).toBe(1);
      expect(summary.modificationsByDate['2024-01-01']).toBe(1);
      expect(summary.modificationsByDate['2024-01-02']).toBe(1);
      expect(summary.recentModifications).toHaveLength(2);
      expect(summary.dataIntegrityStatus).toBe('valid');
    });

    it('should limit recent modifications to 10 items', async () => {
      const manyModifications = Array.from({ length: 15 }, (_, i) => ({
        id: `mod-${i}`,
        timestamp: `2024-01-01T${String(i).padStart(2, '0')}:00:00Z`,
        entityType: 'cycle' as const,
        entityId: 'cycle-1',
        field: 'field',
        oldValue: `old${i}`,
        newValue: `new${i}`,
        deviceId: mockDeviceId,
        userId: mockUserId,
        action: 'update' as const,
      }));

      jest.spyOn(auditTrailService, 'queryAuditLog').mockResolvedValue(manyModifications);

      const summary = await auditTrailService.getAuditSummary(mockUserId);

      expect(summary.totalModifications).toBe(15);
      expect(summary.recentModifications).toHaveLength(10);
    });
  });

  describe('restoreFromAudit', () => {
    it('should restore entity state from audit history', async () => {
      const mockModifications: ModificationRecord[] = [
        {
          id: 'mod-1',
          timestamp: '2024-01-01T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'periodStartDate',
          oldValue: null,
          newValue: '2024-01-01',
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'create',
        },
        {
          id: 'mod-2',
          timestamp: '2024-01-02T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'periodStartDate',
          oldValue: '2024-01-01',
          newValue: '2024-01-02',
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'update',
        },
      ];

      jest.spyOn(auditTrailService, 'queryAuditLog').mockResolvedValue(mockModifications);

      const restoredState = await auditTrailService.restoreFromAudit(
        mockUserId,
        'cycle',
        'cycle-1',
        '2024-01-01T12:00:00Z'
      );

      expect(restoredState).toEqual({
        periodStartDate: '2024-01-01',
      });
    });

    it('should return null if entity was deleted', async () => {
      const mockModifications: ModificationRecord[] = [
        {
          id: 'mod-1',
          timestamp: '2024-01-01T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'periodStartDate',
          oldValue: null,
          newValue: '2024-01-01',
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'create',
        },
        {
          id: 'mod-2',
          timestamp: '2024-01-02T10:00:00Z',
          entityType: 'cycle',
          entityId: 'cycle-1',
          field: 'deleted',
          oldValue: false,
          newValue: true,
          deviceId: mockDeviceId,
          userId: mockUserId,
          action: 'delete',
        },
      ];

      jest.spyOn(auditTrailService, 'queryAuditLog').mockResolvedValue(mockModifications);

      const restoredState = await auditTrailService.restoreFromAudit(
        mockUserId,
        'cycle',
        'cycle-1',
        '2024-01-03T10:00:00Z'
      );

      expect(restoredState).toBeNull();
    });

    it('should record the restoration action', async () => {
      jest.spyOn(auditTrailService, 'queryAuditLog').mockResolvedValue([]);

      const recordSpy = jest.spyOn(auditTrailService, 'recordModification').mockResolvedValue();

      await auditTrailService.restoreFromAudit(
        mockUserId,
        'cycle',
        'cycle-1',
        '2024-01-01T10:00:00Z'
      );

      expect(recordSpy).toHaveBeenCalledWith(
        mockUserId,
        'cycle',
        'cycle-1',
        'restored_from_audit',
        null,
        expect.objectContaining({
          timestamp: '2024-01-01T10:00:00Z',
        }),
        'restore',
        expect.stringContaining('Restored to state from')
      );
    });
  });

  describe('session management', () => {
    it('should generate new session ID on start', () => {
      const oldSessionId = auditTrailService.getCurrentSessionId();
      auditTrailService.startNewSession();
      const newSessionId = auditTrailService.getCurrentSessionId();

      expect(newSessionId).not.toBe(oldSessionId);
      expect(newSessionId).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should use consistent session ID for same session', () => {
      auditTrailService.startNewSession();
      const sessionId1 = auditTrailService.getCurrentSessionId();
      const sessionId2 = auditTrailService.getCurrentSessionId();

      expect(sessionId1).toBe(sessionId2);
    });
  });
});
