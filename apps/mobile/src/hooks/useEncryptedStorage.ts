import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EncryptedDataService, LocalStorageConfig } from '../services/encryptedDataService';
import type { EncryptedCycleData, PeriodDayData, Symptom } from '@aura/shared-types';

// Lazy import for crypto core to avoid static import issues
class CryptoOperationError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CryptoOperationError';
    this.code = code;
  }
}

export interface UseEncryptedStorageConfig extends LocalStorageConfig {
  autoInitialize?: boolean;
  enableBackgroundSync?: boolean;
}

export interface EncryptedStorageState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  healthStatus: {
    cryptoCore: boolean;
    database: boolean;
    memory: boolean;
    overall: boolean;
  } | null;
}

export interface EncryptedStorageActions {
  initialize: () => Promise<void>;
  storeCycleData: (
    data: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  retrieveCycleData: (cycleId: string) => Promise<EncryptedCycleData | null>;
  storeSymptomData: (cycleId: string, date: string, symptoms: Symptom[]) => Promise<void>;
  batchStoreData: (entries: Array<{ data: any; type: string }>) => Promise<boolean[]>;
  performHealthCheck: () => Promise<void>;
  clearError: () => void;
  dispose: () => Promise<void>;
}

/**
 * React Native hook for encrypted local storage
 * Provides secure data persistence with client-side encryption
 */
export function useEncryptedStorage(
  config: UseEncryptedStorageConfig
): EncryptedStorageState & EncryptedStorageActions {
  const [state, setState] = useState<EncryptedStorageState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    healthStatus: null,
  });

  const serviceRef = useRef<EncryptedDataService | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  // Initialize the encrypted data service
  const initialize = useCallback(async () => {
    if (serviceRef.current?.isInitialized || initializationRef.current) {
      return initializationRef.current || Promise.resolve();
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    initializationRef.current = (async () => {
      try {
        serviceRef.current = new EncryptedDataService({
          userId: config.userId,
          deviceId: config.deviceId,
          enableAAD: config.enableAAD,
          enableAuditTrail: config.enableAuditTrail,
        });

        await serviceRef.current.initialize();

        setState(prev => ({
          ...prev,
          isInitialized: true,
          isLoading: false,
          error: null,
        }));

        console.log('[useEncryptedStorage] Service initialized successfully');
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to initialize encrypted storage';

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        throw error;
      }
    })();

    return initializationRef.current;
  }, [config.userId, config.deviceId, config.enableAAD, config.enableAuditTrail]);

  // Store encrypted cycle data
  const storeCycleData = useCallback(
    async (data: Omit<EncryptedCycleData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
      if (!serviceRef.current) {
        throw new CryptoOperationError(
          'Encrypted storage not initialized',
          'storage_not_initialized'
        );
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const recordId = await serviceRef.current.storeCycleData(data);

        setState(prev => ({ ...prev, isLoading: false }));
        return recordId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to store cycle data';
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  // Retrieve encrypted cycle data
  const retrieveCycleData = useCallback(
    async (cycleId: string): Promise<EncryptedCycleData | null> => {
      if (!serviceRef.current) {
        throw new CryptoOperationError(
          'Encrypted storage not initialized',
          'storage_not_initialized'
        );
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await serviceRef.current.retrieveCycleData(cycleId);

        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to retrieve cycle data';
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  // Store encrypted symptom data
  const storeSymptomData = useCallback(
    async (cycleId: string, date: string, symptoms: Symptom[]): Promise<void> => {
      if (!serviceRef.current) {
        throw new CryptoOperationError(
          'Encrypted storage not initialized',
          'storage_not_initialized'
        );
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await serviceRef.current.storeSymptomData(cycleId, date, symptoms);

        setState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to store symptom data';
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  // Batch store multiple data entries
  const batchStoreData = useCallback(
    async (entries: Array<{ data: any; type: string }>): Promise<boolean[]> => {
      if (!serviceRef.current) {
        throw new CryptoOperationError(
          'Encrypted storage not initialized',
          'storage_not_initialized'
        );
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const results = await serviceRef.current.batchEncryptData(entries);
        const successFlags = results.map(result => result.success);

        setState(prev => ({ ...prev, isLoading: false }));
        return successFlags;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to batch store data';
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  // Perform health check
  const performHealthCheck = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      setState(prev => ({
        ...prev,
        healthStatus: {
          cryptoCore: false,
          database: false,
          memory: false,
          overall: false,
        },
      }));
      return;
    }

    try {
      const healthStatus = await serviceRef.current.performHealthCheck();

      setState(prev => ({ ...prev, healthStatus }));

      if (!healthStatus.overall) {
        setState(prev => ({
          ...prev,
          error: 'Health check failed - encryption system not operating correctly',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        healthStatus: {
          cryptoCore: false,
          database: false,
          memory: false,
          overall: false,
        },
        error: 'Health check failed',
      }));
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Dispose of resources
  const dispose = useCallback(async (): Promise<void> => {
    if (serviceRef.current) {
      await serviceRef.current.dispose();
      serviceRef.current = null;
    }

    setState({
      isInitialized: false,
      isLoading: false,
      error: null,
      healthStatus: null,
    });

    initializationRef.current = null;
  }, []);

  // Auto-initialize if configured
  useEffect(() => {
    if (config.autoInitialize && !state.isInitialized && !state.isLoading) {
      initialize().catch(error => {
        console.error('[useEncryptedStorage] Auto-initialization failed:', error);
      });
    }
  }, [config.autoInitialize, state.isInitialized, state.isLoading, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.dispose().catch(error => {
          console.error('[useEncryptedStorage] Cleanup failed:', error);
        });
      }
    };
  }, []);

  // Background health checks
  useEffect(() => {
    if (!state.isInitialized) return;

    const healthCheckInterval = setInterval(() => {
      performHealthCheck().catch(error => {
        console.warn('[useEncryptedStorage] Background health check failed:', error);
      });
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [state.isInitialized, performHealthCheck]);

  return {
    // State
    ...state,

    // Actions
    initialize,
    storeCycleData,
    retrieveCycleData,
    storeSymptomData,
    batchStoreData,
    performHealthCheck,
    clearError,
    dispose,
  };
}

export default useEncryptedStorage;
