import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useAuditTrail } from '../../hooks/useAuditTrail';
import { auditTrailService } from '../../services/auditTrailService';
import { ModificationRecord, AuditSummary } from '@aura/shared-types/data';

// Mock the audit trail service
jest.mock('../../services/auditTrailService');
const mockAuditTrailService = auditTrailService as jest.Mocked<typeof auditTrailService>;

describe('useAuditTrail', () => {
  const mockUserId = 'user-123';

  const mockModifications: ModificationRecord[] = [
    {
      id: 'mod-1',
      timestamp: '2024-01-01T10:00:00Z',
      entityType: 'cycle',
      entityId: 'cycle-1',
      field: 'periodStartDate',
      oldValue: '2024-01-01',
      newValue: '2024-01-02',
      deviceId: 'device-456',
      userId: mockUserId,
      action: 'update',
    },
  ];

  const mockSummary: AuditSummary = {
    totalModifications: 10,
    recentModifications: mockModifications,
    modificationsByType: { cycle_update: 5 },
    modificationsByDate: { '2024-01-01': 3 },
    dataIntegrityStatus: 'valid',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockAuditTrailService.queryAuditLog.mockResolvedValue(mockModifications);
    mockAuditTrailService.getAuditSummary.mockResolvedValue(mockSummary);
    mockAuditTrailService.recordModification.mockResolvedValue();
    mockAuditTrailService.recordBatchModifications.mockResolvedValue();
    mockAuditTrailService.restoreFromAudit.mockResolvedValue({ restored: true });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      expect(result.current.modifications).toEqual([]);
      expect(result.current.summary).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load initial data on mount', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith({
        userId: mockUserId,
        limit: 100,
      });
      expect(mockAuditTrailService.getAuditSummary).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('recordModification', () => {
    it('should record single modification', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'periodStartDate',
          '2024-01-01',
          '2024-01-02',
          'update',
          'User correction'
        );
      });

      expect(mockAuditTrailService.recordModification).toHaveBeenCalledWith(
        mockUserId,
        'cycle',
        'cycle-1',
        'periodStartDate',
        '2024-01-01',
        '2024-01-02',
        'update',
        'User correction'
      );
    });

    it('should refresh summary after recording when autoTrack is enabled', async () => {
      const { result } = renderHook(() =>
        useAuditTrail({
          userId: mockUserId,
          autoTrack: true,
        })
      );

      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'field',
          'old',
          'new',
          'update'
        );
      });

      expect(mockAuditTrailService.getAuditSummary).toHaveBeenCalled();
    });

    it('should not refresh summary when autoTrack is disabled', async () => {
      const { result } = renderHook(() =>
        useAuditTrail({
          userId: mockUserId,
          autoTrack: false,
        })
      );

      jest.clearAllMocks(); // Clear the initial load calls

      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'field',
          'old',
          'new',
          'update'
        );
      });

      expect(mockAuditTrailService.getAuditSummary).not.toHaveBeenCalled();
    });

    it('should handle recording errors gracefully', async () => {
      mockAuditTrailService.recordModification.mockRejectedValue(new Error('Recording failed'));

      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'field',
          'old',
          'new',
          'update'
        );
      });

      expect(result.current.error).toBe('Recording failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('batch operations', () => {
    it('should handle batch mode correctly', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      // Start batch mode
      act(() => {
        result.current.startBatch();
      });

      // Record modifications in batch mode
      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'field1',
          'old1',
          'new1',
          'update'
        );
        await result.current.recordModification(
          'cycle',
          'cycle-2',
          'field2',
          'old2',
          'new2',
          'update'
        );
      });

      // Should not call service yet
      expect(mockAuditTrailService.recordModification).not.toHaveBeenCalled();

      // Commit batch
      await act(async () => {
        await result.current.commitBatch();
      });

      // Should call batch service
      expect(mockAuditTrailService.recordBatchModifications).toHaveBeenCalledWith(
        mockUserId,
        expect.arrayContaining([
          expect.objectContaining({
            entityType: 'cycle',
            entityId: 'cycle-1',
            field: 'field1',
            action: 'update',
          }),
          expect.objectContaining({
            entityType: 'cycle',
            entityId: 'cycle-2',
            field: 'field2',
            action: 'update',
          }),
        ])
      );
    });

    it('should cancel batch operations', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      // Start batch mode
      act(() => {
        result.current.startBatch();
      });

      // Record modification in batch mode
      await act(async () => {
        await result.current.recordModification(
          'cycle',
          'cycle-1',
          'field',
          'old',
          'new',
          'update'
        );
      });

      // Cancel batch
      act(() => {
        result.current.cancelBatch();
      });

      // Should not have called any service methods
      expect(mockAuditTrailService.recordModification).not.toHaveBeenCalled();
      expect(mockAuditTrailService.recordBatchModifications).not.toHaveBeenCalled();
    });

    it('should handle empty batch commit', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      act(() => {
        result.current.startBatch();
      });

      await act(async () => {
        await result.current.commitBatch();
      });

      expect(mockAuditTrailService.recordBatchModifications).not.toHaveBeenCalled();
    });
  });

  describe('queryAuditLog', () => {
    it('should query audit log with custom options', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      const queryOptions = {
        entityType: 'cycle' as const,
        limit: 50,
      };

      await act(async () => {
        await result.current.queryAuditLog(queryOptions);
      });

      expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith({
        userId: mockUserId,
        limit: 100, // Should override with batchSize if not provided
        ...queryOptions,
      });

      expect(result.current.modifications).toEqual(mockModifications);
    });

    it('should set loading state during query', async () => {
      let resolveQuery: () => void;
      const queryPromise = new Promise<ModificationRecord[]>(resolve => {
        resolveQuery = () => resolve(mockModifications);
      });

      mockAuditTrailService.queryAuditLog.mockReturnValue(queryPromise);

      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      act(() => {
        result.current.queryAuditLog();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveQuery!();
        await queryPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('restoreFromAudit', () => {
    it('should restore data and refresh logs', async () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      const restoredData = await act(async () => {
        return await result.current.restoreFromAudit('cycle', 'cycle-1', '2024-01-01T10:00:00Z');
      });

      expect(mockAuditTrailService.restoreFromAudit).toHaveBeenCalledWith(
        mockUserId,
        'cycle',
        'cycle-1',
        '2024-01-01T10:00:00Z'
      );

      expect(restoredData).toEqual({ restored: true });

      // Should refresh both query and summary
      expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalled();
      expect(mockAuditTrailService.getAuditSummary).toHaveBeenCalled();
    });

    it('should handle restoration errors', async () => {
      mockAuditTrailService.restoreFromAudit.mockRejectedValue(new Error('Restoration failed'));

      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      await expect(
        act(async () => {
          await result.current.restoreFromAudit('cycle', 'cycle-1', '2024-01-01T10:00:00Z');
        })
      ).rejects.toThrow('Restoration failed');

      expect(result.current.error).toBe('Restoration failed');
    });
  });

  describe('error handling', () => {
    it('should clear errors', () => {
      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      // Simulate error
      act(() => {
        (result.current as any).error = 'Some error';
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error when starting new operation', async () => {
      mockAuditTrailService.queryAuditLog.mockRejectedValue(new Error('Query failed'));

      const { result } = renderHook(() => useAuditTrail({ userId: mockUserId }));

      await act(async () => {
        await result.current.queryAuditLog();
      });

      expect(result.current.error).toBe('Query failed');

      // Clear the mock error for next call
      mockAuditTrailService.queryAuditLog.mockResolvedValue(mockModifications);

      // Start new operation should clear error
      await act(async () => {
        await result.current.queryAuditLog();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('custom batch size', () => {
    it('should use custom batch size for queries', async () => {
      const { result } = renderHook(() =>
        useAuditTrail({
          userId: mockUserId,
          batchSize: 200,
        })
      );

      await act(async () => {
        await result.current.queryAuditLog();
      });

      expect(mockAuditTrailService.queryAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 200,
        })
      );
    });
  });
});
