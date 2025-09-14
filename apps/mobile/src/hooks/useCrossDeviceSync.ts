// Temporary stub for useCrossDeviceSync to avoid TypeScript errors during CI
// This will be replaced with proper implementation later

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
  progress: number;
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
  syncState: CrossDeviceSyncState;
  currentRotation: RotationProgress | null;
  detectedConflicts: ConflictInfo[];
  isInitializing: boolean;
  initiateRotation: (devices: string[], rotationType: 'Scheduled' | 'Emergency') => Promise<string>;
  resolveConflict: (conflictType: string, resolution: string) => Promise<boolean>;
  syncOfflineDevice: (deviceId: string, strategy?: string) => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  getConnectedDevices: () => string[];
  registerOfflineDevice: (deviceId: string) => Promise<void>;
  lastError: string | null;
  clearError: () => void;
}

export const useCrossDeviceSync = (): UseCrossDeviceSyncReturn => {
  return {
    syncState: {
      isOnline: true,
      syncStatus: 'synchronized',
      connectedDevices: [],
      offlineDevices: [],
      pendingRotations: 0,
      lastSyncTime: null,
      conflictsDetected: 0,
    },
    currentRotation: null,
    detectedConflicts: [],
    isInitializing: false,
    initiateRotation: async () => 'stub-rotation-id',
    resolveConflict: async () => true,
    syncOfflineDevice: async () => {},
    refreshSyncStatus: async () => {},
    getConnectedDevices: () => [],
    registerOfflineDevice: async () => {},
    lastError: null,
    clearError: () => {},
  };
};
