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

export interface EmergencyIncident {
  id: string;
  detected_at: string;
  description: string;
  severity: number;
  status: string;
  trigger_type: string;
  affected_devices: string[];
}

export interface EmergencyResponse {
  incident_id: string;
  devices_isolated: string[];
  keys_invalidated: string[];
  success_rate: number;
}

export interface EmergencyNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  incident_id?: string;
  actions?: Array<{
    label: string;
    action: string;
    variant?: 'primary' | 'secondary';
  }>;
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

  // Data arrays
  activeIncidents: EmergencyIncident[];
  activeResponses: EmergencyResponse[];
  notifications: EmergencyNotification[];
  isProcessingEmergency: boolean;

  // Emergency actions
  triggerEmergencyRotation: (
    triggerType: string,
    description: string,
    affectedDevices: string[],
    severity: number
  ) => Promise<string>;
  initiateEmergencyResponse: (incidentId: string) => Promise<void>;
  isolateDevice: (deviceId: string, reason: string) => Promise<void>;
  restoreDeviceAccess: (deviceId: string) => Promise<void>;
  invalidateKey: (keyId: string, reason: string) => Promise<void>;
  executeEmergencyRotation: (incidentId: string, devices: string[]) => Promise<boolean>;
  initiateRecovery: (incidentId: string) => Promise<void>;

  // Incident management
  acknowledgeIncident: (incidentId: string) => Promise<void>;
  authorizeEmergencyResponse: (incidentId: string) => Promise<void>;

  // Notification management
  dismissNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;

  // Settings management
  updateEmergencySettings: (settings: any) => void;

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

    // Data arrays
    activeIncidents: [],
    activeResponses: [],
    notifications: [],
    isProcessingEmergency: false,

    // Emergency actions
    triggerEmergencyRotation: async () => 'stub-incident-id',
    initiateEmergencyResponse: async () => {},
    isolateDevice: async () => {},
    restoreDeviceAccess: async () => {},
    invalidateKey: async () => {},
    executeEmergencyRotation: async () => true,
    initiateRecovery: async () => {},

    // Incident management
    acknowledgeIncident: async () => {},
    authorizeEmergencyResponse: async () => {},

    // Notification management
    dismissNotification: () => {},
    clearAllNotifications: () => {},

    // Settings management
    updateEmergencySettings: () => {},

    // Status checks
    getIncidentStatus: async () => null,
    isDeviceIsolated: () => false,
    isKeyInvalidated: () => false,

    // Utils
    clearError: () => {},
    refreshStatus: async () => {},
  };
};
