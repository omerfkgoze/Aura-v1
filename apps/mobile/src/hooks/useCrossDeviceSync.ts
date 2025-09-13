import { useState, useEffect, useCallback, useRef } from 'react';
import { CrossDeviceRotationSync } from '@aura/crypto-core/key_rotation/sync';
import { useDeviceId } from './useDeviceId';
import { useNetworkStatus } from './useNetworkStatus';
import { useCryptoCore } from './useCryptoCore';

export interface CrossDeviceSyncState {
  isOnline: boolean;
  syncStatus:
    | 'synchronized'
    | 'synchronizing'
    | 'out_of_sync'
    | 'conflict_detected'
    | 'resolution_required';
  connectedDevices: string[];
  offlineDevices: string[];
  pendingRotations: number;
  lastSyncTime: Date | null;
  conflictsDetected: number;
}

export interface RotationProgress {
  rotationId: string;
  phase: 'commitment' | 'reveal' | 'verification' | 'completed' | 'failed';
  participatingDevices: string[];
  completedDevices: string[];
  progress: number; // 0-100
}

export interface ConflictInfo {
  conflictType:
    | 'concurrent_rotation'
    | 'version_mismatch'
    | 'timing_conflict'
    | 'device_state_conflict'
    | 'key_version_conflict';
  affectedDevices: string[];
  suggestedResolution:
    | 'most_recent_wins'
    | 'device_priority_based'
    | 'user_decision'
    | 'safest_option'
    | 'rollback';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface UseCrossDeviceSyncReturn {
  // State
  syncState: CrossDeviceSyncState;
  currentRotation: RotationProgress | null;
  detectedConflicts: ConflictInfo[];
  isInitializing: boolean;

  // Actions
  initiateRotation: (devices: string[], rotationType: 'Scheduled' | 'Emergency') => Promise<string>;
  resolveConflict: (conflictType: string, resolution: string) => Promise<boolean>;
  syncOfflineDevice: (deviceId: string, strategy?: string) => Promise<void>;
  refreshSyncStatus: () => Promise<void>;

  // Device Management
  getConnectedDevices: () => string[];
  registerOfflineDevice: (deviceId: string) => Promise<void>;

  // Error handling
  lastError: string | null;
  clearError: () => void;
}

export const useCrossDeviceSync = (): UseCrossDeviceSyncReturn => {
  const { deviceId } = useDeviceId();
  const { isOnline } = useNetworkStatus();
  const { isInitialized } = useCryptoCore();

  const [syncManager] = useState<CrossDeviceRotationSync>(
    () => new CrossDeviceRotationSync(deviceId)
  );

  const [syncState, setSyncState] = useState<CrossDeviceSyncState>({
    isOnline: false,
    syncStatus: 'synchronized',
    connectedDevices: [],
    offlineDevices: [],
    pendingRotations: 0,
    lastSyncTime: null,
    conflictsDetected: 0,
  });

  const [currentRotation, setCurrentRotation] = useState<RotationProgress | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictInfo[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const rotationTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize sync manager
  useEffect(() => {
    if (isInitialized && deviceId) {
      setIsInitializing(false);
      refreshSyncStatus();
    }
  }, [isInitialized, deviceId]);

  // Auto-refresh sync status
  useEffect(() => {
    if (!isInitializing && isOnline) {
      syncIntervalRef.current = setInterval(() => {
        refreshSyncStatus();
      }, 30000); // Refresh every 30 seconds

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [isInitializing, isOnline]);

  // Handle network status changes
  useEffect(() => {
    setSyncState(prev => ({
      ...prev,
      isOnline,
    }));

    if (isOnline && !isInitializing) {
      // When coming back online, check for pending syncs
      handleOnlineRecovery();
    }
  }, [isOnline, isInitializing]);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const statusJson = syncManager.get_sync_status();
      const status = JSON.parse(statusJson);

      setSyncState(prev => ({
        ...prev,
        syncStatus: status.current_state,
        connectedDevices: status.online_devices || [],
        offlineDevices: status.offline_devices || [],
        pendingRotations: status.pending_rotations || 0,
        lastSyncTime: new Date(status.last_sync),
        conflictsDetected: status.conflicts_detected || 0,
      }));

      // Check for conflicts
      if (status.conflicts_detected > 0) {
        await detectAndLoadConflicts();
      }

      setLastError(null);
    } catch (error) {
      setLastError(`Failed to refresh sync status: ${error}`);
    }
  }, [syncManager]);

  const initiateRotation = useCallback(
    async (devices: string[], rotationType: 'Scheduled' | 'Emergency'): Promise<string> => {
      try {
        setLastError(null);

        const rotationId = await syncManager.initiate_cross_device_rotation(devices, rotationType);

        setCurrentRotation({
          rotationId,
          phase: 'commitment',
          participatingDevices: devices,
          completedDevices: [],
          progress: 0,
        });

        // Start monitoring rotation progress
        startRotationMonitoring(rotationId, devices);

        await refreshSyncStatus();
        return rotationId;
      } catch (error) {
        setLastError(`Failed to initiate rotation: ${error}`);
        throw error;
      }
    },
    [syncManager, refreshSyncStatus]
  );

  const resolveConflict = useCallback(
    async (conflictType: string, resolution: string): Promise<boolean> => {
      try {
        setLastError(null);

        const resultJson = await syncManager.resolve_rotation_conflict(conflictType, resolution);
        const result = JSON.parse(resultJson);

        if (result.success) {
          // Remove resolved conflict from list
          setDetectedConflicts(prev =>
            prev.filter(conflict => conflict.conflictType !== conflictType)
          );

          await refreshSyncStatus();
          return true;
        } else {
          setLastError(`Conflict resolution failed: ${result.error || 'Unknown error'}`);
          return false;
        }
      } catch (error) {
        setLastError(`Failed to resolve conflict: ${error}`);
        return false;
      }
    },
    [syncManager, refreshSyncStatus]
  );

  const syncOfflineDevice = useCallback(
    async (deviceId: string, strategy: string = 'background'): Promise<void> => {
      try {
        setLastError(null);

        await syncManager.handle_offline_device_sync(deviceId, strategy);
        await refreshSyncStatus();
      } catch (error) {
        setLastError(`Failed to sync offline device: ${error}`);
        throw error;
      }
    },
    [syncManager, refreshSyncStatus]
  );

  const registerOfflineDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      await syncOfflineDevice(deviceId, 'background');
    },
    [syncOfflineDevice]
  );

  const getConnectedDevices = useCallback((): string[] => {
    return syncState.connectedDevices;
  }, [syncState.connectedDevices]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Helper functions
  const startRotationMonitoring = useCallback(
    (rotationId: string, devices: string[]) => {
      let progress = 0;
      let phase: RotationProgress['phase'] = 'commitment';

      rotationTimeoutRef.current = setInterval(async () => {
        try {
          // Simulate rotation progress monitoring
          progress += 25;

          if (progress >= 25 && phase === 'commitment') {
            phase = 'reveal';
          } else if (progress >= 50 && phase === 'reveal') {
            phase = 'verification';
          } else if (progress >= 100) {
            phase = 'completed';
            clearInterval(rotationTimeoutRef.current!);
            setCurrentRotation(null);
            await refreshSyncStatus();
            return;
          }

          setCurrentRotation(prev =>
            prev
              ? {
                  ...prev,
                  phase,
                  progress: Math.min(progress, 100),
                  completedDevices: devices.slice(0, Math.floor((progress / 100) * devices.length)),
                }
              : null
          );
        } catch (error) {
          clearInterval(rotationTimeoutRef.current!);
          setCurrentRotation(prev => (prev ? { ...prev, phase: 'failed' } : null));
          setLastError(`Rotation monitoring failed: ${error}`);
        }
      }, 2000); // Check every 2 seconds
    },
    [refreshSyncStatus]
  );

  const handleOnlineRecovery = useCallback(async () => {
    try {
      // Process any offline devices that came back online
      const offlineDeviceIds = syncState.offlineDevices;

      for (const deviceId of offlineDeviceIds) {
        try {
          const syncResultJson = await syncManager.process_delayed_sync(deviceId);
          const syncResult = JSON.parse(syncResultJson);

          if (!syncResult.sync_success && syncResult.conflicts_detected?.length > 0) {
            // Handle conflicts detected during delayed sync
            await detectAndLoadConflicts();
          }
        } catch (error) {
          console.warn(`Failed to process delayed sync for device ${deviceId}:`, error);
        }
      }

      await refreshSyncStatus();
    } catch (error) {
      setLastError(`Online recovery failed: ${error}`);
    }
  }, [syncManager, syncState.offlineDevices, refreshSyncStatus]);

  const detectAndLoadConflicts = useCallback(async () => {
    // In a real implementation, this would query the sync manager for specific conflicts
    // For now, we'll create mock conflicts based on the conflicts count
    const mockConflicts: ConflictInfo[] = [
      {
        conflictType: 'concurrent_rotation',
        affectedDevices: ['device-001', 'device-002'],
        suggestedResolution: 'most_recent_wins',
        severity: 'medium',
      },
    ];

    setDetectedConflicts(mockConflicts);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (rotationTimeoutRef.current) {
        clearInterval(rotationTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    syncState,
    currentRotation,
    detectedConflicts,
    isInitializing,

    // Actions
    initiateRotation,
    resolveConflict,
    syncOfflineDevice,
    refreshSyncStatus,

    // Device Management
    getConnectedDevices,
    registerOfflineDevice,

    // Error handling
    lastError,
    clearError,
  };
};
