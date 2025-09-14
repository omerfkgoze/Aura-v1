// Temporary stub for useEmergencyRotation to avoid TypeScript errors during CI
// This will be replaced with proper implementation later

export interface EmergencyRotationState {
  isActive: boolean;
  currentIncident: string | null;
  rotationProgress: number;
  affectedDevices: string[];
  isolatedDevices: string[];
  invalidatedKeys: string[];
  recoveryInProgress: boolean;
}

export interface IncidentDetails {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  affectedDevices: string[];
  status: 'active' | 'resolved' | 'escalated';
  response: string[];
}

export interface UseEmergencyRotationReturn {
  state: EmergencyRotationState;
  currentIncident: IncidentDetails | null;
  isLoading: boolean;
  error: string | null;

  // Emergency actions
  triggerEmergencyRotation: (
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => Promise<string>;
  initiateEmergencyResponse: (incidentId: string) => Promise<void>;
  isolateDevice: (deviceId: string, reason: string) => Promise<void>;
  restoreDeviceAccess: (deviceId: string) => Promise<void>;
  invalidateKey: (keyId: string, reason: string) => Promise<void>;
  executeEmergencyRotation: (devices: string[], newKeys: string[]) => Promise<boolean>;
  initiateRecovery: (incidentId: string) => Promise<void>;

  // Status checks
  getIncidentStatus: (incidentId: string) => Promise<IncidentDetails | null>;
  isDeviceIsolated: (deviceId: string) => boolean;
  isKeyInvalidated: (keyId: string) => boolean;

  // Utils
  clearError: () => void;
  refreshStatus: () => Promise<void>;
}

export const useEmergencyRotation = (): UseEmergencyRotationReturn => {
  return {
    state: {
      isActive: false,
      currentIncident: null,
      rotationProgress: 0,
      affectedDevices: [],
      isolatedDevices: [],
      invalidatedKeys: [],
      recoveryInProgress: false,
    },
    currentIncident: null,
    isLoading: false,
    error: null,

    triggerEmergencyRotation: async () => 'stub-incident-id',
    initiateEmergencyResponse: async () => {},
    isolateDevice: async () => {},
    restoreDeviceAccess: async () => {},
    invalidateKey: async () => {},
    executeEmergencyRotation: async () => true,
    initiateRecovery: async () => {},

    getIncidentStatus: async () => null,
    isDeviceIsolated: () => false,
    isKeyInvalidated: () => false,

    clearError: () => {},
    refreshStatus: async () => {},
  };
};
