import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@tamagui/alert-dialog';
import {
  Button,
  Card,
  H3,
  H4,
  H5,
  Paragraph,
  XStack,
  YStack,
  Badge,
  Separator,
  ScrollView,
  Sheet,
  Switch,
  Slider,
} from 'tamagui';
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

interface EmergencyRotationPanelProps {
  onEmergencyTriggered?: (incidentId: string) => void;
  onSettingsChanged?: (settings: any) => void;
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
      console.error('Failed to trigger emergency rotation:', error);
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
      <Card bordered padding="$3" backgroundColor={hasActiveEmergencies ? '$red2' : '$background'}>
        <XStack alignItems="center" space="$2">
          <Shield size={20} color={hasActiveEmergencies ? '$red10' : '$green10'} />
          <YStack flex={1}>
            <Paragraph fontSize="$3" fontWeight="600">
              Emergency Status
            </Paragraph>
            <Paragraph fontSize="$2" color="$color10">
              {hasActiveEmergencies
                ? `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''}`
                : 'All systems secure'}
            </Paragraph>
          </YStack>
          {criticalNotifications.length > 0 && (
            <Badge backgroundColor="$red9" color="white">
              {criticalNotifications.length}
            </Badge>
          )}
        </XStack>
      </Card>
    );
  }

  return (
    <YStack space="$4" padding="$4">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" space="$3">
          <Shield size={24} color={hasActiveEmergencies ? '$red10' : '$green10'} />
          <H3>Emergency Security</H3>
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
      <Card padding="$4" backgroundColor={hasActiveEmergencies ? '$red2' : '$green2'}>
        <XStack alignItems="center" space="$3">
          {hasActiveEmergencies ? (
            <AlertTriangle size={32} color="$red10" />
          ) : (
            <CheckCircle size={32} color="$green10" />
          )}
          <YStack flex={1}>
            <H4 color={hasActiveEmergencies ? '$red11' : '$green11'}>
              {hasActiveEmergencies ? 'Emergency Active' : 'Systems Secure'}
            </H4>
            <Paragraph color="$color10">
              {hasActiveEmergencies
                ? `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''} require attention`
                : 'No security incidents detected. All systems operating normally.'}
            </Paragraph>
          </YStack>
        </XStack>
      </Card>

      {/* Critical Notifications */}
      {criticalNotifications.length > 0 && (
        <Card padding="$4" backgroundColor="$red3" borderColor="$red6">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <XStack alignItems="center" space="$2">
              <Bell size={20} color="$red10" />
              <H5 color="$red11">Critical Alerts ({criticalNotifications.length})</H5>
            </XStack>
            <Button size="$2" variant="ghost" onPress={clearAllNotifications}>
              Clear All
            </Button>
          </XStack>
          <YStack space="$2">
            {criticalNotifications.slice(0, 3).map(notification => (
              <Card key={notification.id} padding="$3" backgroundColor="$red4">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1} space="$1">
                    <Paragraph fontSize="$3" fontWeight="600" color="$red12">
                      {notification.title}
                    </Paragraph>
                    <Paragraph fontSize="$2" color="$red11">
                      {notification.message}
                    </Paragraph>
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
              </Card>
            ))}
          </YStack>
        </Card>
      )}

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <Card padding="$4">
          <H5 marginBottom="$3">Active Incidents ({activeIncidents.length})</H5>
          <ScrollView maxHeight={300}>
            <YStack space="$3">
              {activeIncidents.map(incident => {
                const response = activeResponses.find(r => r.incident_id === incident.id);
                const StatusIcon = getStatusIcon(incident.status);

                return (
                  <Card
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
                        <Badge backgroundColor={getSeverityColor(incident.severity)} color="white">
                          Severity {incident.severity}
                        </Badge>
                        <Badge backgroundColor={getStatusColor(incident.status)} color="white">
                          {incident.status}
                        </Badge>
                      </XStack>
                      <Paragraph fontSize="$2" color="$color10">
                        {new Date(incident.detected_at).toLocaleTimeString()}
                      </Paragraph>
                    </XStack>

                    <Paragraph fontSize="$3" fontWeight="500" marginBottom="$2">
                      {incident.description}
                    </Paragraph>

                    <Paragraph fontSize="$2" color="$color10" marginBottom="$2">
                      Trigger: {incident.trigger_type.replace(/_/g, ' ')} • Devices:{' '}
                      {incident.affected_devices.length}
                    </Paragraph>

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
                          <H5>Response Actions</H5>
                          {response ? (
                            <YStack space="$2">
                              <XStack justifyContent="space-between">
                                <Paragraph>Devices Isolated:</Paragraph>
                                <Badge>{response.devices_isolated.length}</Badge>
                              </XStack>
                              <XStack justifyContent="space-between">
                                <Paragraph>Keys Invalidated:</Paragraph>
                                <Badge>{response.keys_invalidated.length}</Badge>
                              </XStack>
                              <XStack justifyContent="space-between">
                                <Paragraph>Success Rate:</Paragraph>
                                <Badge backgroundColor="$green8">
                                  {Math.round(response.success_rate * 100)}%
                                </Badge>
                              </XStack>
                            </YStack>
                          ) : (
                            <Paragraph color="$color10">No response initiated</Paragraph>
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
                  </Card>
                );
              })}
            </YStack>
          </ScrollView>
        </Card>
      )}

      {/* Notifications Panel */}
      {showNotifications && notifications.length > 0 && (
        <Card padding="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <H5>Recent Notifications ({notifications.length})</H5>
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
                    <Paragraph fontSize="$2" fontWeight="500">
                      {notification.title}
                    </Paragraph>
                    <Paragraph fontSize="$1" color="$color10">
                      {new Date(notification.timestamp).toLocaleString()}
                    </Paragraph>
                  </YStack>
                  <Badge
                    backgroundColor={getSeverityColor(
                      notification.severity === 'critical'
                        ? 9
                        : notification.severity === 'high'
                          ? 7
                          : 5
                    )}
                  >
                    {notification.severity}
                  </Badge>
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
        </Card>
      )}

      {/* Manual Trigger Sheet */}
      <Sheet open={manualTriggerOpen} onOpenChange={setManualTriggerOpen} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" space="$4">
          <Sheet.Handle />
          <H4>Manual Emergency Trigger</H4>

          <YStack space="$4">
            <YStack space="$2">
              <Paragraph fontSize="$3" fontWeight="500">
                Trigger Type
              </Paragraph>
              {/* Add trigger type selection UI here */}
            </YStack>

            <YStack space="$2">
              <Paragraph fontSize="$3" fontWeight="500">
                Description
              </Paragraph>
              {/* Add description input here */}
            </YStack>

            <YStack space="$2">
              <Paragraph fontSize="$3" fontWeight="500">
                Severity: {severity}
              </Paragraph>
              <Slider
                value={[severity]}
                onValueChange={([value]) => setSeverity(Math.round(value))}
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
        </Sheet.Frame>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame padding="$4" space="$4">
          <Sheet.Handle />
          <H4>Emergency Settings</H4>

          <YStack space="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack flex={1}>
                <Paragraph fontSize="$3" fontWeight="500">
                  Auto Response
                </Paragraph>
                <Paragraph fontSize="$2" color="$color10">
                  Automatically respond to high-severity incidents
                </Paragraph>
              </YStack>
              <Switch checked={autoResponseEnabled} onCheckedChange={setAutoResponseEnabled} />
            </XStack>

            <Separator />

            <XStack justifyContent="space-between" alignItems="center">
              <YStack flex={1}>
                <Paragraph fontSize="$3" fontWeight="500">
                  Notifications
                </Paragraph>
                <Paragraph fontSize="$2" color="$color10">
                  Show system notifications for incidents
                </Paragraph>
              </YStack>
              <Switch checked={notificationEnabled} onCheckedChange={setNotificationEnabled} />
            </XStack>

            <Separator />

            <XStack justifyContent="space-between" alignItems="center">
              <YStack flex={1}>
                <Paragraph fontSize="$3" fontWeight="500">
                  User Confirmation
                </Paragraph>
                <Paragraph fontSize="$2" color="$color10">
                  Require user approval before emergency response
                </Paragraph>
              </YStack>
              <Switch
                checked={userConfirmationRequired}
                onCheckedChange={setUserConfirmationRequired}
              />
            </XStack>

            <Separator />

            <YStack space="$2">
              <Paragraph fontSize="$3" fontWeight="500">
                Escalation Threshold: {escalationThreshold}
              </Paragraph>
              <Paragraph fontSize="$2" color="$color10">
                Minimum severity for automatic escalation
              </Paragraph>
              <Slider
                value={[escalationThreshold]}
                onValueChange={([value]) => setEscalationThreshold(Math.round(value))}
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
        </Sheet.Frame>
      </Sheet>
    </YStack>
  );
};

export default EmergencyRotationPanel;
