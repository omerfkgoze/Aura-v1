import { useState, useEffect, useCallback, useRef } from 'react';
import { ModificationRecord, AuditLogQueryOptions, AuditSummary } from '@aura/shared-types/data';
import { auditTrailService } from '../services/auditTrailService';

export interface UseAuditTrailOptions {
  userId: string;
  autoTrack?: boolean; // Automatically track modifications
  batchSize?: number; // For batch modification tracking
}

export interface UseAuditTrailReturn {
  // Data
  modifications: ModificationRecord[];
  summary: AuditSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  recordModification: (
    entityType: ModificationRecord['entityType'],
    entityId: string,
    field: string,
    oldValue: any,
    newValue: any,
    action: ModificationRecord['action'],
    reason?: string
  ) => Promise<void>;

  recordBatchModifications: (
    modifications: Omit<ModificationRecord, 'id' | 'timestamp' | 'deviceId' | 'userId'>[]
  ) => Promise<void>;

  queryAuditLog: (options?: Partial<AuditLogQueryOptions>) => Promise<void>;
  refreshSummary: () => Promise<void>;
  restoreFromAudit: (entityType: string, entityId: string, timestamp: string) => Promise<any>;
  clearError: () => void;

  // Batch tracking
  startBatch: () => void;
  commitBatch: () => Promise<void>;
  cancelBatch: () => void;
}

export const useAuditTrail = ({
  userId,
  autoTrack = true,
  batchSize = 100,
}: UseAuditTrailOptions): UseAuditTrailReturn => {
  const [modifications, setModifications] = useState<ModificationRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch tracking state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const batchModifications = useRef<
    Omit<ModificationRecord, 'id' | 'timestamp' | 'deviceId' | 'userId'>[]
  >([]);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) setError(null);
  }, []);

  const handleError = useCallback((err: any, context: string) => {
    console.error(`Audit trail error in ${context}:`, err);
    setError(err.message || 'An unexpected error occurred');
    setIsLoading(false);
  }, []);

  // Record a single modification
  const recordModification = useCallback(
    async (
      entityType: ModificationRecord['entityType'],
      entityId: string,
      field: string,
      oldValue: any,
      newValue: any,
      action: ModificationRecord['action'],
      reason?: string
    ) => {
      try {
        if (isBatchMode) {
          // Add to batch instead of immediate recording
          batchModifications.current.push({
            entityType,
            entityId,
            field,
            oldValue,
            newValue,
            action,
            reason,
          });
          return;
        }

        await auditTrailService.recordModification(
          userId,
          entityType,
          entityId,
          field,
          oldValue,
          newValue,
          action,
          reason
        );

        // Optionally refresh data after recording
        if (autoTrack) {
          await refreshSummary();
        }
      } catch (err) {
        handleError(err, 'recordModification');
      }
    },
    [userId, autoTrack, isBatchMode, refreshSummary, handleError]
  );

  // Record multiple modifications
  const recordBatchModifications = useCallback(
    async (mods: Omit<ModificationRecord, 'id' | 'timestamp' | 'deviceId' | 'userId'>[]) => {
      try {
        setLoadingState(true);

        await auditTrailService.recordBatchModifications(userId, mods);

        if (autoTrack) {
          await refreshSummary();
        }
      } catch (err) {
        handleError(err, 'recordBatchModifications');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, autoTrack, setLoadingState, handleError, refreshSummary]
  );

  // Query audit log
  const queryAuditLog = useCallback(
    async (options: Partial<AuditLogQueryOptions> = {}) => {
      try {
        setLoadingState(true);

        const queryOptions: AuditLogQueryOptions = {
          userId,
          limit: batchSize,
          ...options,
        };

        const results = await auditTrailService.queryAuditLog(queryOptions);
        setModifications(results);
      } catch (err) {
        handleError(err, 'queryAuditLog');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, batchSize, setLoadingState, handleError]
  );

  // Refresh summary
  const refreshSummary = useCallback(async () => {
    try {
      const auditSummary = await auditTrailService.getAuditSummary(userId);
      setSummary(auditSummary);
    } catch (err) {
      handleError(err, 'refreshSummary');
    }
  }, [userId, handleError]);

  // Restore from audit
  const restoreFromAudit = useCallback(
    async (entityType: string, entityId: string, timestamp: string) => {
      try {
        setLoadingState(true);

        const restoredState = await auditTrailService.restoreFromAudit(
          userId,
          entityType,
          entityId,
          timestamp
        );

        // Refresh data after restoration
        await Promise.all([queryAuditLog(), refreshSummary()]);

        return restoredState;
      } catch (err) {
        handleError(err, 'restoreFromAudit');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, setLoadingState, handleError, queryAuditLog, refreshSummary]
  );

  // Batch operations
  const startBatch = useCallback(() => {
    setIsBatchMode(true);
    batchModifications.current = [];
  }, []);

  const commitBatch = useCallback(async () => {
    try {
      if (batchModifications.current.length > 0) {
        await recordBatchModifications(batchModifications.current);
      }
    } finally {
      setIsBatchMode(false);
      batchModifications.current = [];
    }
  }, [recordBatchModifications]);

  const cancelBatch = useCallback(() => {
    setIsBatchMode(false);
    batchModifications.current = [];
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    if (userId) {
      Promise.all([queryAuditLog(), refreshSummary()]);
    }
  }, [userId]); // Only depend on userId for initial load

  return {
    // Data
    modifications,
    summary,
    isLoading,
    error,

    // Actions
    recordModification,
    recordBatchModifications,
    queryAuditLog,
    refreshSummary,
    restoreFromAudit,
    clearError,

    // Batch operations
    startBatch,
    commitBatch,
    cancelBatch,
  };
};

export default useAuditTrail;
