import React, { useState, useEffect } from 'react';
import { Button, Text, XStack, YStack, ScrollView, View, Slider } from '@tamagui/core';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Phone,
  Smartphone,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Bell,
} from '@tamagui/lucide-icons';
import {
  useEmergencyRotation,
  EmergencyIncident,
  EmergencyResponse,
  EmergencyNotification,
} from '../hooks/useEmergencyRotation';

export interface EmergencySettings {
  auto_response_enabled: boolean;
  notification_enabled: boolean;
  user_confirmation_required: boolean;
  escalation_threshold: number;
}

interface EmergencyRotationPanelProps {
  onEmergencyTriggered?: (incidentId: string) => void;
  onSettingsChanged?: (settings: EmergencySettings) => void;
  showSettings?: boolean;
  compact?: boolean;
}

const EmergencyRotationPanel: React.FC<EmergencyRotationPanelProps> = ({
  onEmergencyTriggered,
  onSettingsChanged,
  showSettings = true,
  compact = false,
}) => {
  const {
    activeIncidents,
    activeResponses,
    notifications,
    isProcessingEmergency,
    triggerEmergencyRotation,
    acknowledgeIncident,
    authorizeEmergencyResponse,
    isolateDevice,
    restoreDeviceAccess,
    invalidateKey,
    executeEmergencyRotation,
    initiateRecovery,
    dismissNotification,
    clearAllNotifications,
    isDeviceIsolated,
    isKeyInvalidated,
    updateEmergencySettings,
  } = useEmergencyRotation();

  const [showNotifications, setShowNotifications] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualTriggerOpen, setManualTriggerOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);

  // Settings state
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [userConfirmationRequired, setUserConfirmationRequired] = useState(true);
  const [escalationThreshold, setEscalationThreshold] = useState(7);

  // Manual trigger form state
  const [triggerType, setTriggerType] = useState('manual_trigger');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(5);
  const [affectedDevices, setAffectedDevices] = useState<string[]>(['current_device']);

  const getSeverityColor = (severity: number) => {
    if (severity >= 9) return '$red10';
    if (severity >= 7) return '$orange9';
    if (severity >= 5) return '$yellow9';
    return '$blue9';
  };

  const getSeverityIcon = (severity: number) => {
    if (severity >= 8) return ShieldAlert;
    if (severity >= 6) return AlertTriangle;
    return Info;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return '$green9';
      case 'failed':
        return '$red9';
      case 'responding':
      case 'rotating':
      case 'recovering':
        return '$orange9';
      case 'detected':
        return '$yellow9';
      default:
        return '$gray9';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return CheckCircle;
      case 'failed':
        return XCircle;
      case 'responding':
      case 'rotating':
      case 'recovering':
        return RefreshCw;
      case 'detected':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const handleManualTrigger = async () => {
    try {
      const incidentId = await triggerEmergencyRotation(
        triggerType,
        description || `Manual emergency trigger (Severity: ${severity})`,
        affectedDevices,
        severity
      );

      onEmergencyTriggered?.(incidentId);
      setManualTriggerOpen(false);

      // Reset form
      setDescription('');
      setSeverity(5);
      setTriggerType('manual_trigger');
    } catch (error) {
      // Error handling without logging sensitive information
      // Silently fail to avoid PII exposure in logs
    }
  };

  const handleSettingsChange = () => {
    const settings = {
      auto_response_enabled: autoResponseEnabled,
      notification_enabled: notificationEnabled,
      user_confirmation_required: userConfirmationRequired,
      escalation_threshold: escalationThreshold,
    };

    updateEmergencySettings(settings);
    onSettingsChanged?.(settings);
  };

  useEffect(() => {
    handleSettingsChange();
  }, [autoResponseEnabled, notificationEnabled, userConfirmationRequired, escalationThreshold]);

  const criticalNotifications = notifications.filter(
    n => n.severity === 'critical' || n.severity === 'high'
  );
  const hasActiveEmergencies = activeIncidents.some(i =>
    ['Detected', 'Responding', 'Rotating', 'Recovering'].includes(i.status)
  );

  if (compact) {
    return (
      <View bordered padding="$3" backgroundColor={hasActiveEmergencies ? '$red2' : '$background'}>
        <XStack alignItems="center" space="$2">
          <Shield size={20} color={hasActiveEmergencies ? '$red10' : '$green10'} />
          <YStack flex={1}>
            <Text fontSize="$3" fontWeight="600">
              Emergency Status
            </Text>
            <Text fontSize="$2" color="$color10">
              {hasActiveEmergencies
                ? `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''}`
                : 'All systems secure'}
            </Text>
          </YStack>
          {criticalNotifications.length > 0 && (
            <View
              backgroundColor="$red9"
              borderRadius="$2"
              paddingHorizontal="$2"
              paddingVertical="$1"
            >
              <Text color="white" fontSize="$2">
                {criticalNotifications.length}
              </Text>
            </View>
          )}
        </XStack>
      </View>
    );
  }

  return (
    <YStack space="$4" padding="$4">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" space="$3">
          <Shield size={24} color={hasActiveEmergencies ? '$red10' : '$green10'} />
          <Text fontSize="$6" fontWeight="700">
            Emergency Security
          </Text>
        </XStack>
        <XStack space="$2">
          {showSettings && (
            <Button
              size="$3"
              variant="outlined"
              icon={Settings}
              onPress={() => setSettingsOpen(true)}
            >
              Settings
            </Button>
          )}
          <Button
            size="$3"
            variant="outlined"
            theme="red"
            icon={ShieldAlert}
            onPress={() => setManualTriggerOpen(true)}
          >
            Manual Trigger
          </Button>
        </XStack>
      </XStack>

      {/* Status Overview */}
      <View padding="$4" backgroundColor={hasActiveEmergencies ? '$red2' : '$green2'}>
        <XStack alignItems="center" space="$3">
          {hasActiveEmergencies ? (
            <AlertTriangle size={32} color="$red10" />
          ) : (
            <CheckCircle size={32} color="$green10" />
          )}
          <YStack flex={1}>
            <Text
              fontSize="$5"
              fontWeight="600"
              color={hasActiveEmergencies ? '$red11' : '$green11'}
            >
              {hasActiveEmergencies ? 'Emergency Active' : 'Systems Secure'}
            </Text>
            <Text color="$color10">
              {hasActiveEmergencies
                ? `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''} require attention`
                : 'No security incidents detected. All systems operating normally.'}
            </Text>
          </YStack>
        </XStack>
      </View>

      {/* Critical Notifications */}
      {criticalNotifications.length > 0 && (
        <View padding="$4" backgroundColor="$red3" borderColor="$red6">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <XStack alignItems="center" space="$2">
              <Bell size={20} color="$red10" />
              <Text fontSize="$4" fontWeight="600" color="$red11">
                Critical Alerts ({criticalNotifications.length})
              </Text>
            </XStack>
            <Button size="$2" variant="ghost" onPress={clearAllNotifications}>
              Clear All
            </Button>
          </XStack>
          <YStack space="$2">
            {criticalNotifications.slice(0, 3).map(notification => (
              <View key={notification.id} padding="$3" backgroundColor="$red4">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1} space="$1">
                    <Text fontSize="$3" fontWeight="600" color="$red12">
                      {notification.title}
                    </Text>
                    <Text fontSize="$2" color="$red11">
                      {notification.message}
                    </Text>
                  </YStack>
                  <XStack space="$2">
                    {notification.actions?.map(action => (
                      <Button
                        key={action.label}
                        size="$2"
                        variant={action.variant === 'primary' ? 'outlined' : 'ghost'}
                        onPress={() => {
                          if (action.action === 'authorize_rotation' && notification.incident_id) {
                            authorizeEmergencyResponse(notification.incident_id);
                          }
                          dismissNotification(notification.id);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      size="$2"
                      variant="ghost"
                      icon={XCircle}
                      onPress={() => dismissNotification(notification.id)}
                    />
                  </XStack>
                </XStack>
              </View>
            ))}
          </YStack>
        </View>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <View padding="$4">
          <Text fontSize="$4" fontWeight="600" marginBottom="$3">
            Active Incidents ({activeIncidents.length})
          </Text>
          <ScrollView maxHeight={300}>
            <YStack space="$3">
              {activeIncidents.map(incident => {
                const response = activeResponses.find(r => r.incident_id === incident.id);
                const StatusIcon = getStatusIcon(incident.status);

                return (
                  <View
                    key={incident.id}
                    padding="$3"
                    backgroundColor="$gray2"
                    pressStyle={{ backgroundColor: '$gray3' }}
                    onPress={() =>
                      setSelectedIncident(selectedIncident === incident.id ? null : incident.id)
                    }
                  >
                    <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                      <XStack alignItems="center" space="$2">
                        <StatusIcon size={20} color={getStatusColor(incident.status)} />
                        <View
                          borderRadius="$2"
                          paddingHorizontal="$2"
                          paddingVertical="$1"
                          backgroundColor={getSeverityColor(incident.severity)}
                        >
                          <Text color="white" fontSize="$2">
                            Severity {incident.severity}
                          </Text>
                        </View>
                        <View
                          borderRadius="$2"
                          paddingHorizontal="$2"
                          paddingVertical="$1"
                          backgroundColor={getStatusColor(incident.status)}
                        >
                          <Text color="white" fontSize="$2">
                            {incident.status}
                          </Text>
                        </View>
                      </XStack>
                      <Text fontSize="$2" color="$color10">
                        {new Date(incident.detected_at).toLocaleTimeString()}
                      </Text>
                    </XStack>

                    <Text fontSize="$3" fontWeight="500" marginBottom="$2">
                      {incident.description}
                    </Text>

                    <Text fontSize="$2" color="$color10" marginBottom="$2">
                      Trigger: {incident.trigger_type.replace(/_/g, ' ')} • Devices:{' '}
                      {incident.affected_devices.length}
                    </Text>

                    {/* Expanded Details */}
                    {selectedIncident === incident.id && (
                      <YStack
                        space="$3"
                        marginTop="$3"
                        paddingTop="$3"
                        borderTopWidth={1}
                        borderTopColor="$gray6"
                      >
                        <YStack space="$2">
                          <Text fontSize="$4" fontWeight="600">
                            Response Actions
                          </Text>
                          {response ? (
                            <YStack space="$2">
                              <XStack justifyContent="space-between">
                                <Text>Devices Isolated:</Text>
                                <View
                                  borderRadius="$2"
                                  paddingHorizontal="$2"
                                  paddingVertical="$1"
                                  backgroundColor="$gray6"
                                >
                                  <Text fontSize="$2">{response.devices_isolated.length}</Text>
                                </View>
                              </XStack>
                              <XStack justifyContent="space-between">
                                <Text>Keys Invalidated:</Text>
                                <View
                                  borderRadius="$2"
                                  paddingHorizontal="$2"
                                  paddingVertical="$1"
                                  backgroundColor="$gray6"
                                >
                                  <Text fontSize="$2">{response.keys_invalidated.length}</Text>
                                </View>
                              </XStack>
                              <XStack justifyContent="space-between">
                                <Text>Success Rate:</Text>
                                <View
                                  borderRadius="$2"
                                  paddingHorizontal="$2"
                                  paddingVertical="$1"
                                  backgroundColor="$green8"
                                >
                                  <Text color="white" fontSize="$2">
                                    {Math.round(response.success_rate * 100)}%
                                  </Text>
                                </View>
                              </XStack>
                            </YStack>
                          ) : (
                            <Text color="$color10">No response initiated</Text>
                          )}
                        </YStack>

                        <XStack space="$2" flexWrap="wrap">
                          {incident.status === 'Detected' && (
                            <>
                              <Button
                                size="$3"
                                theme="blue"
                                onPress={() => acknowledgeIncident(incident.id)}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                size="$3"
                                theme="orange"
                                onPress={() => authorizeEmergencyResponse(incident.id)}
                              >
                                Start Response
                              </Button>
                            </>
                          )}

                          {['Responding', 'Rotating'].includes(incident.status) && (
                            <>
                              <Button
                                size="$3"
                                theme="red"
                                onPress={() =>
                                  executeEmergencyRotation(incident.id, incident.affected_devices)
                                }
                              >
                                Rotate Keys
                              </Button>
                              <Button
                                size="$3"
                                theme="green"
                                onPress={() => initiateRecovery(incident.id)}
                              >
                                Start Recovery
                              </Button>
                            </>
                          )}

                          {incident.affected_devices.map(deviceId => (
                            <XStack key={deviceId} space="$1">
                              <Button
                                size="$2"
                                variant="outlined"
                                icon={isDeviceIsolated(deviceId) ? EyeOff : Eye}
                                onPress={() =>
                                  isDeviceIsolated(deviceId)
                                    ? restoreDeviceAccess(deviceId, incident.id)
                                    : isolateDevice(deviceId, incident.id)
                                }
                              >
                                {isDeviceIsolated(deviceId) ? 'Restore' : 'Isolate'} {deviceId}
                              </Button>
                            </XStack>
                          ))}
                        </XStack>
                      </YStack>
                    )}
                  </View>
                );
              })}
            </YStack>
          </ScrollView>
        </View>
      )}

      {/* Notifications Panel */}
      {showNotifications && notifications.length > 0 && (
        <View padding="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text fontSize="$4" fontWeight="600">
              Recent Notifications ({notifications.length})
            </Text>
            <Button size="$2" variant="ghost" onPress={() => setShowNotifications(false)}>
              Hide
            </Button>
          </XStack>
          <ScrollView maxHeight={200}>
            <YStack space="$2">
              {notifications.slice(0, 5).map(notification => (
                <XStack
                  key={notification.id}
                  justifyContent="space-between"
                  alignItems="center"
                  padding="$2"
                  backgroundColor="$gray2"
                  borderRadius="$3"
                >
                  <YStack flex={1} space="$1">
                    <Text fontSize="$2" fontWeight="500">
                      {notification.title}
                    </Text>
                    <Text fontSize="$1" color="$color10">
                      {new Date(notification.timestamp).toLocaleString()}
                    </Text>
                  </YStack>
                  <View
                    borderRadius="$2"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    backgroundColor={getSeverityColor(
                      notification.severity === 'critical'
                        ? 9
                        : notification.severity === 'high'
                          ? 7
                          : 5
                    )}
                  >
                    <Text color="white" fontSize="$2">
                      {notification.severity}
                    </Text>
                  </View>
                  <Button
                    size="$2"
                    variant="ghost"
                    icon={XCircle}
                    onPress={() => dismissNotification(notification.id)}
                  />
                </XStack>
              ))}
            </YStack>
          </ScrollView>
        </View>
      )}

      {/* Manual Trigger Modal */}
      {manualTriggerOpen && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.5)"
          justifyContent="center"
          alignItems="center"
        >
          <View backgroundColor="white" padding="$4" borderRadius="$4" width="90%" maxWidth={400}>
            <Text fontSize="$5" fontWeight="600" marginBottom="$4">
              Manual Emergency Trigger
            </Text>

            <YStack space="$4">
              <YStack space="$2">
                <Text fontSize="$3" fontWeight="500">
                  Trigger Type
                </Text>
                {/* Add trigger type selection UI here */}
              </YStack>

              <YStack space="$2">
                <Text fontSize="$3" fontWeight="500">
                  Description
                </Text>
                {/* Add description input here */}
              </YStack>

              <YStack space="$2">
                <Text fontSize="$3" fontWeight="500">
                  Severity: {severity}
                </Text>
                <Slider
                  value={[severity]}
                  onValueChange={([value]: number[]) => setSeverity(Math.round(value))}
                  min={1}
                  max={10}
                  step={1}
                >
                  <Slider.Track backgroundColor="$gray6">
                    <Slider.TrackActive backgroundColor={getSeverityColor(severity)} />
                  </Slider.Track>
                  <Slider.Thumb circular backgroundColor={getSeverityColor(severity)} />
                </Slider>
              </YStack>

              <XStack space="$3" justifyContent="flex-end">
                <Button variant="outlined" onPress={() => setManualTriggerOpen(false)}>
                  Cancel
                </Button>
                <Button theme="red" onPress={handleManualTrigger} disabled={isProcessingEmergency}>
                  {isProcessingEmergency ? 'Triggering...' : 'Trigger Emergency'}
                </Button>
              </XStack>
            </YStack>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.5)"
          justifyContent="center"
          alignItems="center"
        >
          <View backgroundColor="white" padding="$4" borderRadius="$4" width="90%" maxWidth={400}>
            <Text fontSize="$5" fontWeight="600" marginBottom="$4">
              Emergency Settings
            </Text>

            <YStack space="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="500">
                    Auto Response
                  </Text>
                  <Text fontSize="$2" color="$color10">
                    Automatically respond to high-severity incidents
                  </Text>
                </YStack>
                <Button
                  size="$2"
                  backgroundColor={autoResponseEnabled ? '$green9' : '$gray6'}
                  onPress={() => setAutoResponseEnabled(!autoResponseEnabled)}
                >
                  {autoResponseEnabled ? 'ON' : 'OFF'}
                </Button>
              </XStack>

              <View height={1} backgroundColor="$gray6" marginVertical="$2" />

              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="500">
                    Notifications
                  </Text>
                  <Text fontSize="$2" color="$color10">
                    Show system notifications for incidents
                  </Text>
                </YStack>
                <Button
                  size="$2"
                  backgroundColor={notificationEnabled ? '$green9' : '$gray6'}
                  onPress={() => setNotificationEnabled(!notificationEnabled)}
                >
                  {notificationEnabled ? 'ON' : 'OFF'}
                </Button>
              </XStack>

              <View height={1} backgroundColor="$gray6" marginVertical="$2" />

              <XStack justifyContent="space-between" alignItems="center">
                <YStack flex={1}>
                  <Text fontSize="$3" fontWeight="500">
                    User Confirmation
                  </Text>
                  <Text fontSize="$2" color="$color10">
                    Require user approval before emergency response
                  </Text>
                </YStack>
                <Button
                  size="$2"
                  backgroundColor={userConfirmationRequired ? '$green9' : '$gray6'}
                  onPress={() => setUserConfirmationRequired(!userConfirmationRequired)}
                >
                  {userConfirmationRequired ? 'ON' : 'OFF'}
                </Button>
              </XStack>

              <View height={1} backgroundColor="$gray6" marginVertical="$2" />

              <YStack space="$2">
                <Text fontSize="$3" fontWeight="500">
                  Escalation Threshold: {escalationThreshold}
                </Text>
                <Text fontSize="$2" color="$color10">
                  Minimum severity for automatic escalation
                </Text>
                <Slider
                  value={[escalationThreshold]}
                  onValueChange={([value]: number[]) => setEscalationThreshold(Math.round(value))}
                  min={1}
                  max={10}
                  step={1}
                >
                  <Slider.Track backgroundColor="$gray6">
                    <Slider.TrackActive backgroundColor={getSeverityColor(escalationThreshold)} />
                  </Slider.Track>
                  <Slider.Thumb circular backgroundColor={getSeverityColor(escalationThreshold)} />
                </Slider>
              </YStack>
            </YStack>

            <Button onPress={() => setSettingsOpen(false)}>Done</Button>
          </View>
        </View>
      )}
    </YStack>
  );
};

export default EmergencyRotationPanel;
