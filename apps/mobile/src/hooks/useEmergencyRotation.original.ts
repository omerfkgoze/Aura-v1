import { useState, useEffect, useCallback, useRef } from 'react';
import { useCryptoCore } from './useCryptoCore';
import { useNotifications } from './useNotifications';
import { EmergencyRotationManager } from '@aura/crypto-core/src/key_rotation/emergency';

export interface EmergencyIncident {
  id: string;
  trigger_type: string;
  severity: number;
  detected_at: string;
  status: string;
  affected_devices: string[];
  description: string;
  auto_triggered: boolean;
  response_time_limit: number;
  escalation_contacts: string[];
}

export interface EmergencyResponse {
  incident_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  actions_taken: EmergencyAction[];
  devices_isolated: string[];
  keys_invalidated: string[];
  recovery_status: string;
  data_accessibility: boolean;
  success_rate: number;
}

export interface EmergencyAction {
  id: string;
  action_type: string;
  target: string;
  executed_at: string;
  success: boolean;
  details: string;
  rollback_available: boolean;
}

export interface EmergencyNotification {
  id: string;
  type: 'incident_detected' | 'response_started' | 'recovery_complete' | 'user_action_required';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actions?: EmergencyNotificationAction[];
  auto_dismiss: boolean;
  incident_id?: string;
}

export interface EmergencyNotificationAction {
  label: string;
  action: 'acknowledge' | 'authorize_rotation' | 'view_details' | 'contact_support';
  variant: 'primary' | 'secondary' | 'destructive';
}

export interface UseEmergencyRotationOptions {
  auto_response_enabled?: boolean;
  notification_enabled?: boolean;
  user_confirmation_required?: boolean;
  escalation_threshold?: number;
}

export interface UseEmergencyRotationReturn {
  // State
  activeIncidents: EmergencyIncident[];
  activeResponses: EmergencyResponse[];
  notifications: EmergencyNotification[];
  isProcessingEmergency: boolean;
  lastIncidentId: string | null;

  // Actions
  triggerEmergencyRotation: (
    triggerType: string,
    description: string,
    affectedDevices: string[],
    severity: number
  ) => Promise<string>;

  acknowledgeIncident: (incidentId: string) => Promise<void>;
  authorizeEmergencyResponse: (incidentId: string) => Promise<void>;
  monitorIncidentStatus: (incidentId: string) => Promise<EmergencyResponse | null>;

  // Device management
  isolateDevice: (deviceId: string, incidentId: string) => Promise<void>;
  restoreDeviceAccess: (deviceId: string, incidentId: string) => Promise<void>;

  // Key management
  invalidateKey: (keyId: string, incidentId: string) => Promise<void>;
  executeEmergencyRotation: (incidentId: string, deviceIds: string[]) => Promise<string[]>;

  // Recovery
  initiateRecovery: (incidentId: string) => Promise<void>;

  // Notifications
  dismissNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;

  // Status
  getIncidentStatus: (incidentId: string) => Promise<any>;
  isDeviceIsolated: (deviceId: string) => boolean;
  isKeyInvalidated: (keyId: string) => boolean;

  // Configuration
  updateEmergencySettings: (settings: UseEmergencyRotationOptions) => void;
}

export const useEmergencyRotation = (
  options: UseEmergencyRotationOptions = {}
): UseEmergencyRotationReturn => {
  const [activeIncidents, setActiveIncidents] = useState<EmergencyIncident[]>([]);
  const [activeResponses, setActiveResponses] = useState<EmergencyResponse[]>([]);
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([]);
  const [isProcessingEmergency, setIsProcessingEmergency] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UseEmergencyRotationOptions>({
    auto_response_enabled: true,
    notification_enabled: true,
    user_confirmation_required: true,
    escalation_threshold: 7,
    ...options,
  });

  const emergencyManagerRef = useRef<EmergencyRotationManager>();
  const { cryptoCore } = useCryptoCore();
  const { showNotification, showToast } = useNotifications();

  // Initialize emergency manager
  useEffect(() => {
    if (cryptoCore) {
      emergencyManagerRef.current = new EmergencyRotationManager();
    }
  }, [cryptoCore]);

  // Add notification when incident is detected
  const addNotification = useCallback(
    (notification: EmergencyNotification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications

      if (settings.notification_enabled) {
        // Show system notification for high severity incidents
        if (notification.severity === 'high' || notification.severity === 'critical') {
          showNotification({
            title: notification.title,
            body: notification.message,
            data: { incident_id: notification.incident_id },
          });
        }

        // Show toast for all notifications
        showToast(notification.title, notification.message, notification.severity);
      }
    },
    [settings.notification_enabled, showNotification, showToast]
  );

  const triggerEmergencyRotation = useCallback(
    async (
      triggerType: string,
      description: string,
      affectedDevices: string[],
      severity: number
    ): Promise<string> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      setIsProcessingEmergency(true);

      try {
        const incidentId = emergencyManagerRef.current.trigger_emergency_rotation(
          triggerType,
          description,
          affectedDevices,
          severity
        );

        setLastIncidentId(incidentId);

        // Add to active incidents (this would normally come from the manager)
        const incident: EmergencyIncident = {
          id: incidentId,
          trigger_type: triggerType,
          severity,
          detected_at: new Date().toISOString(),
          status: 'Detected',
          affected_devices: affectedDevices,
          description,
          auto_triggered: false,
          response_time_limit: severity >= (settings.escalation_threshold || 7) ? 300000 : 900000, // 5 or 15 minutes
          escalation_contacts: [],
        };

        setActiveIncidents(prev => [incident, ...prev]);

        // Create notification
        const notification: EmergencyNotification = {
          id: `notification-${incidentId}`,
          type: 'incident_detected',
          title: 'Security Incident Detected',
          message: `${description} (Severity: ${severity}/10)`,
          severity: severity >= 8 ? 'critical' : severity >= 6 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          auto_dismiss: false,
          incident_id: incidentId,
          actions: settings.user_confirmation_required
            ? [
                { label: 'Authorize Response', action: 'authorize_rotation', variant: 'primary' },
                { label: 'View Details', action: 'view_details', variant: 'secondary' },
              ]
            : [{ label: 'View Details', action: 'view_details', variant: 'secondary' }],
        };

        addNotification(notification);

        // Auto-initiate response if settings allow and severity is high
        if (
          !settings.user_confirmation_required &&
          severity >= (settings.escalation_threshold || 7)
        ) {
          await authorizeEmergencyResponse(incidentId);
        }

        return incidentId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addNotification({
          id: `error-${Date.now()}`,
          type: 'incident_detected',
          title: 'Emergency Rotation Failed',
          message: `Failed to trigger emergency rotation: ${errorMessage}`,
          severity: 'critical',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          actions: [{ label: 'Contact Support', action: 'contact_support', variant: 'primary' }],
        });
        throw error;
      } finally {
        setIsProcessingEmergency(false);
      }
    },
    [settings, addNotification]
  );

  const acknowledgeIncident = useCallback(async (incidentId: string): Promise<void> => {
    // Update incident status to acknowledged
    setActiveIncidents(prev =>
      prev.map(incident =>
        incident.id === incidentId ? { ...incident, status: 'Acknowledged' } : incident
      )
    );

    // Remove related notifications that require acknowledgment
    setNotifications(prev =>
      prev.filter(
        notification =>
          !(notification.incident_id === incidentId && notification.type === 'incident_detected')
      )
    );
  }, []);

  const authorizeEmergencyResponse = useCallback(
    async (incidentId: string): Promise<void> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        await emergencyManagerRef.current.initiate_emergency_response(incidentId);

        // Update incident status
        setActiveIncidents(prev =>
          prev.map(incident =>
            incident.id === incidentId ? { ...incident, status: 'Responding' } : incident
          )
        );

        // Add response tracking
        const response: EmergencyResponse = {
          incident_id: incidentId,
          started_at: new Date().toISOString(),
          status: 'Responding',
          actions_taken: [],
          devices_isolated: [],
          keys_invalidated: [],
          recovery_status: 'NotStarted',
          data_accessibility: true,
          success_rate: 0,
        };

        setActiveResponses(prev => [response, ...prev]);

        // Add notification
        addNotification({
          id: `response-${incidentId}`,
          type: 'response_started',
          title: 'Emergency Response Started',
          message: 'Automated emergency response has been initiated',
          severity: 'high',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          incident_id: incidentId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addNotification({
          id: `response-error-${incidentId}`,
          type: 'incident_detected',
          title: 'Emergency Response Failed',
          message: `Failed to initiate emergency response: ${errorMessage}`,
          severity: 'critical',
          timestamp: new Date().toISOString(),
          auto_dismiss: false,
          incident_id: incidentId,
          actions: [{ label: 'Contact Support', action: 'contact_support', variant: 'primary' }],
        });
        throw error;
      }
    },
    [addNotification]
  );

  const isolateDevice = useCallback(
    async (deviceId: string, incidentId: string): Promise<void> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        await emergencyManagerRef.current.isolate_device(deviceId, incidentId);

        // Update response state
        setActiveResponses(prev =>
          prev.map(response =>
            response.incident_id === incidentId
              ? {
                  ...response,
                  devices_isolated: [...response.devices_isolated, deviceId],
                  actions_taken: [
                    ...response.actions_taken,
                    {
                      id: `isolate-${deviceId}-${Date.now()}`,
                      action_type: 'IsolateDevice',
                      target: deviceId,
                      executed_at: new Date().toISOString(),
                      success: true,
                      details: `Device ${deviceId} isolated for security`,
                      rollback_available: true,
                    },
                  ],
                }
              : response
          )
        );

        addNotification({
          id: `device-isolated-${deviceId}`,
          type: 'user_action_required',
          title: 'Device Isolated',
          message: `Device ${deviceId} has been isolated for security`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          incident_id: incidentId,
        });
      } catch (error) {
        throw new Error(`Failed to isolate device: ${error}`);
      }
    },
    [addNotification]
  );

  const restoreDeviceAccess = useCallback(
    async (deviceId: string, incidentId: string): Promise<void> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        await emergencyManagerRef.current.restore_device_access(deviceId, incidentId);

        // Update response state
        setActiveResponses(prev =>
          prev.map(response =>
            response.incident_id === incidentId
              ? {
                  ...response,
                  devices_isolated: response.devices_isolated.filter(id => id !== deviceId),
                }
              : response
          )
        );

        addNotification({
          id: `device-restored-${deviceId}`,
          type: 'recovery_complete',
          title: 'Device Access Restored',
          message: `Access to device ${deviceId} has been restored`,
          severity: 'low',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          incident_id: incidentId,
        });
      } catch (error) {
        throw new Error(`Failed to restore device access: ${error}`);
      }
    },
    [addNotification]
  );

  const invalidateKey = useCallback(
    async (keyId: string, incidentId: string): Promise<void> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        await emergencyManagerRef.current.invalidate_key(keyId, incidentId);

        // Update response state
        setActiveResponses(prev =>
          prev.map(response =>
            response.incident_id === incidentId
              ? {
                  ...response,
                  keys_invalidated: [...response.keys_invalidated, keyId],
                  actions_taken: [
                    ...response.actions_taken,
                    {
                      id: `invalidate-${keyId}-${Date.now()}`,
                      action_type: 'InvalidateKey',
                      target: keyId,
                      executed_at: new Date().toISOString(),
                      success: true,
                      details: `Key ${keyId} invalidated for security`,
                      rollback_available: false,
                    },
                  ],
                }
              : response
          )
        );

        addNotification({
          id: `key-invalidated-${keyId}`,
          type: 'user_action_required',
          title: 'Key Invalidated',
          message: `Encryption key has been invalidated for security. New key rotation required.`,
          severity: 'high',
          timestamp: new Date().toISOString(),
          auto_dismiss: false,
          incident_id: incidentId,
          actions: [
            { label: 'Start Key Rotation', action: 'authorize_rotation', variant: 'primary' },
          ],
        });
      } catch (error) {
        throw new Error(`Failed to invalidate key: ${error}`);
      }
    },
    [addNotification]
  );

  const executeEmergencyRotation = useCallback(
    async (incidentId: string, deviceIds: string[]): Promise<string[]> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        const newKeyIds = await emergencyManagerRef.current.execute_emergency_rotation(
          incidentId,
          deviceIds
        );

        // Update response state
        setActiveResponses(prev =>
          prev.map(response =>
            response.incident_id === incidentId ? { ...response, status: 'Rotating' } : response
          )
        );

        addNotification({
          id: `rotation-complete-${incidentId}`,
          type: 'recovery_complete',
          title: 'Emergency Key Rotation Complete',
          message: `${newKeyIds.length} keys rotated successfully`,
          severity: 'medium',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          incident_id: incidentId,
        });

        return newKeyIds;
      } catch (error) {
        throw new Error(`Failed to execute emergency rotation: ${error}`);
      }
    },
    [addNotification]
  );

  const initiateRecovery = useCallback(
    async (incidentId: string): Promise<void> => {
      if (!emergencyManagerRef.current) {
        throw new Error('Emergency manager not initialized');
      }

      try {
        await emergencyManagerRef.current.initiate_recovery(incidentId);

        // Update statuses
        setActiveResponses(prev =>
          prev.map(response =>
            response.incident_id === incidentId
              ? {
                  ...response,
                  status: 'Recovering',
                  recovery_status: 'InProgress',
                }
              : response
          )
        );

        setActiveIncidents(prev =>
          prev.map(incident =>
            incident.id === incidentId ? { ...incident, status: 'Recovering' } : incident
          )
        );

        addNotification({
          id: `recovery-started-${incidentId}`,
          type: 'recovery_complete',
          title: 'Recovery Process Started',
          message: 'Data recovery and system restoration is in progress',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          auto_dismiss: true,
          incident_id: incidentId,
        });
      } catch (error) {
        throw new Error(`Failed to initiate recovery: ${error}`);
      }
    },
    [addNotification]
  );

  const monitorIncidentStatus = useCallback(
    async (incidentId: string): Promise<EmergencyResponse | null> => {
      if (!emergencyManagerRef.current) {
        return null;
      }

      try {
        const statusJson = await emergencyManagerRef.current.get_incident_status(incidentId);
        const status = JSON.parse(statusJson);

        if (status.response) {
          // Update local state with latest status
          setActiveResponses(prev =>
            prev.map(response =>
              response.incident_id === incidentId ? { ...response, ...status.response } : response
            )
          );

          return status.response;
        }

        return null;
      } catch (error) {
        console.error('Failed to monitor incident status:', error);
        return null;
      }
    },
    []
  );

  const getIncidentStatus = useCallback(async (incidentId: string): Promise<any> => {
    if (!emergencyManagerRef.current) {
      throw new Error('Emergency manager not initialized');
    }

    try {
      const statusJson = await emergencyManagerRef.current.get_incident_status(incidentId);
      return JSON.parse(statusJson);
    } catch (error) {
      throw new Error(`Failed to get incident status: ${error}`);
    }
  }, []);

  const isDeviceIsolated = useCallback((deviceId: string): boolean => {
    if (!emergencyManagerRef.current) {
      return false;
    }
    return emergencyManagerRef.current.is_device_isolated(deviceId);
  }, []);

  const isKeyInvalidated = useCallback((keyId: string): boolean => {
    if (!emergencyManagerRef.current) {
      return false;
    }
    return emergencyManagerRef.current.is_key_invalidated(keyId);
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateEmergencySettings = useCallback((newSettings: UseEmergencyRotationOptions) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Poll for incident status updates
  useEffect(() => {
    if (activeIncidents.length === 0) return;

    const interval = setInterval(async () => {
      for (const incident of activeIncidents) {
        if (incident.status !== 'Complete' && incident.status !== 'Failed') {
          await monitorIncidentStatus(incident.id);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [activeIncidents, monitorIncidentStatus]);

  return {
    // State
    activeIncidents,
    activeResponses,
    notifications,
    isProcessingEmergency,
    lastIncidentId,

    // Actions
    triggerEmergencyRotation,
    acknowledgeIncident,
    authorizeEmergencyResponse,
    monitorIncidentStatus,

    // Device management
    isolateDevice,
    restoreDeviceAccess,

    // Key management
    invalidateKey,
    executeEmergencyRotation,

    // Recovery
    initiateRecovery,

    // Notifications
    dismissNotification,
    clearAllNotifications,

    // Status
    getIncidentStatus,
    isDeviceIsolated,
    isKeyInvalidated,

    // Configuration
    updateEmergencySettings,
  };
};
