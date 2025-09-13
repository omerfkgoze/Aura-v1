import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Card, XStack, YStack, H3, H4, Badge, Progress, Separator } from '@my/ui';
import { useCrossDeviceSync, ConflictInfo } from '../hooks/useCrossDeviceSync';
import { useTheme } from '@tamagui/core';

interface CrossDeviceSyncPanelProps {
  onRotationComplete?: (rotationId: string) => void;
  onConflictResolved?: (conflictType: string) => void;
  showAdvancedOptions?: boolean;
}

export const CrossDeviceSyncPanel: React.FC<CrossDeviceSyncPanelProps> = ({
  onRotationComplete,
  onConflictResolved,
  showAdvancedOptions = false,
}) => {
  const theme = useTheme();
  const {
    syncState,
    currentRotation,
    detectedConflicts,
    isInitializing,
    initiateRotation,
    resolveConflict,
    syncOfflineDevice,
    refreshSyncStatus,
    getConnectedDevices,
    registerOfflineDevice,
    lastError,
    clearError,
  } = useCrossDeviceSync();

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [rotationType, setRotationType] = useState<'Scheduled' | 'Emergency'>('Scheduled');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (currentRotation?.phase === 'completed' && onRotationComplete) {
      onRotationComplete(currentRotation.rotationId);
    }
  }, [currentRotation, onRotationComplete]);

  useEffect(() => {
    if (lastError) {
      Alert.alert('Sync Error', lastError, [{ text: 'OK', onPress: clearError }]);
    }
  }, [lastError, clearError]);

  const handleInitiateRotation = async () => {
    if (selectedDevices.length === 0) {
      Alert.alert('No Devices Selected', 'Please select at least one device for rotation.');
      return;
    }

    setIsProcessing(true);
    try {
      const rotationId = await initiateRotation(selectedDevices, rotationType);
      Alert.alert(
        'Rotation Started',
        `Key rotation initiated with ID: ${rotationId.substring(0, 8)}...`
      );
    } catch (error) {
      Alert.alert('Rotation Failed', `Failed to start rotation: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConflictResolution = async (conflict: ConflictInfo, resolution: string) => {
    setIsProcessing(true);
    try {
      const success = await resolveConflict(conflict.conflictType, resolution);
      if (success) {
        Alert.alert(
          'Conflict Resolved',
          `${conflict.conflictType} has been resolved using ${resolution}.`
        );
        if (onConflictResolved) {
          onConflictResolved(conflict.conflictType);
        }
      }
    } catch (error) {
      Alert.alert('Resolution Failed', `Failed to resolve conflict: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOfflineDeviceSync = async (deviceId: string) => {
    setIsProcessing(true);
    try {
      await syncOfflineDevice(deviceId, 'immediate');
      Alert.alert('Sync Complete', `Device ${deviceId} has been synchronized.`);
    } catch (error) {
      Alert.alert('Sync Failed', `Failed to sync device: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSyncStatus = () => {
    const getStatusColor = () => {
      switch (syncState.syncStatus) {
        case 'synchronized':
          return '$green10';
        case 'synchronizing':
          return '$blue10';
        case 'out_of_sync':
          return '$orange10';
        case 'conflict_detected':
          return '$red10';
        case 'resolution_required':
          return '$purple10';
        default:
          return '$gray10';
      }
    };

    const getStatusText = () => {
      switch (syncState.syncStatus) {
        case 'synchronized':
          return 'All devices synchronized';
        case 'synchronizing':
          return 'Synchronization in progress';
        case 'out_of_sync':
          return 'Devices out of sync';
        case 'conflict_detected':
          return 'Conflicts detected';
        case 'resolution_required':
          return 'Manual resolution needed';
        default:
          return 'Unknown status';
      }
    };

    return (
      <Card padding="$4" marginBottom="$4">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack flex={1}>
            <H4>Synchronization Status</H4>
            <Text fontSize="$3" color="$gray11">
              {getStatusText()}
            </Text>
          </YStack>
          <Badge backgroundColor={getStatusColor()}>
            {syncState.syncStatus.replace('_', ' ').toUpperCase()}
          </Badge>
        </XStack>

        <Separator marginVertical="$3" />

        <XStack justifyContent="space-between">
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$green11">
              {syncState.connectedDevices.length}
            </Text>
            <Text fontSize="$2" color="$gray11">
              Online
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$orange11">
              {syncState.offlineDevices.length}
            </Text>
            <Text fontSize="$2" color="$gray11">
              Offline
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$blue11">
              {syncState.pendingRotations}
            </Text>
            <Text fontSize="$2" color="$gray11">
              Pending
            </Text>
          </YStack>
          <YStack alignItems="center">
            <Text fontSize="$6" fontWeight="bold" color="$red11">
              {syncState.conflictsDetected}
            </Text>
            <Text fontSize="$2" color="$gray11">
              Conflicts
            </Text>
          </YStack>
        </XStack>
      </Card>
    );
  };

  const renderCurrentRotation = () => {
    if (!currentRotation) return null;

    const getPhaseColor = () => {
      switch (currentRotation.phase) {
        case 'commitment':
          return '$blue10';
        case 'reveal':
          return '$yellow10';
        case 'verification':
          return '$purple10';
        case 'completed':
          return '$green10';
        case 'failed':
          return '$red10';
        default:
          return '$gray10';
      }
    };

    return (
      <Card padding="$4" marginBottom="$4">
        <H4>Active Rotation</H4>
        <Text fontSize="$3" color="$gray11" marginBottom="$3">
          ID: {currentRotation.rotationId.substring(0, 12)}...
        </Text>

        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <Text fontSize="$4">Phase: {currentRotation.phase.toUpperCase()}</Text>
          <Badge backgroundColor={getPhaseColor()}>{currentRotation.phase}</Badge>
        </XStack>

        <Progress value={currentRotation.progress} max={100} marginBottom="$3">
          <Progress.Indicator animation="bouncy" backgroundColor="$blue10" />
        </Progress>

        <Text fontSize="$3" color="$gray11" marginBottom="$2">
          Progress: {currentRotation.progress}%
        </Text>

        <Text fontSize="$3" color="$gray11">
          Devices: {currentRotation.completedDevices.length}/
          {currentRotation.participatingDevices.length} completed
        </Text>
      </Card>
    );
  };

  const renderConflicts = () => {
    if (detectedConflicts.length === 0) return null;

    return (
      <Card padding="$4" marginBottom="$4">
        <H4 color="$red11">Detected Conflicts ({detectedConflicts.length})</H4>

        {detectedConflicts.map((conflict, index) => (
          <View key={index} style={styles.conflictItem}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
              <Text fontSize="$4" fontWeight="bold">
                {conflict.conflictType.replace('_', ' ').toUpperCase()}
              </Text>
              <Badge
                backgroundColor={
                  conflict.severity === 'critical'
                    ? '$red10'
                    : conflict.severity === 'high'
                      ? '$orange10'
                      : conflict.severity === 'medium'
                        ? '$yellow10'
                        : '$blue10'
                }
              >
                {conflict.severity}
              </Badge>
            </XStack>

            <Text fontSize="$3" color="$gray11" marginBottom="$3">
              Affected devices: {conflict.affectedDevices.join(', ')}
            </Text>

            <Text fontSize="$3" marginBottom="$3">
              Suggested: {conflict.suggestedResolution.replace('_', ' ')}
            </Text>

            <XStack gap="$2">
              <Button
                size="$3"
                backgroundColor="$green10"
                onPress={() => handleConflictResolution(conflict, conflict.suggestedResolution)}
                disabled={isProcessing}
              >
                Apply Suggested
              </Button>
              <Button
                size="$3"
                backgroundColor="$blue10"
                onPress={() => handleConflictResolution(conflict, 'user_decision')}
                disabled={isProcessing}
              >
                Manual Review
              </Button>
            </XStack>
          </View>
        ))}
      </Card>
    );
  };

  const renderDeviceManagement = () => {
    const connectedDevices = getConnectedDevices();

    return (
      <Card padding="$4" marginBottom="$4">
        <H4>Device Management</H4>

        <YStack gap="$3" marginTop="$3">
          <Text fontSize="$4" fontWeight="bold">
            Connected Devices:
          </Text>
          {connectedDevices.length > 0 ? (
            connectedDevices.map((deviceId, index) => (
              <XStack key={index} justifyContent="space-between" alignItems="center">
                <Text fontSize="$3">{deviceId}</Text>
                <XStack gap="$2">
                  <Button
                    size="$2"
                    backgroundColor={selectedDevices.includes(deviceId) ? '$green10' : '$gray10'}
                    onPress={() => {
                      setSelectedDevices(prev =>
                        prev.includes(deviceId)
                          ? prev.filter(id => id !== deviceId)
                          : [...prev, deviceId]
                      );
                    }}
                  >
                    {selectedDevices.includes(deviceId) ? 'Selected' : 'Select'}
                  </Button>
                </XStack>
              </XStack>
            ))
          ) : (
            <Text fontSize="$3" color="$gray11">
              No connected devices
            </Text>
          )}
        </YStack>

        {syncState.offlineDevices.length > 0 && (
          <YStack gap="$3" marginTop="$4">
            <Text fontSize="$4" fontWeight="bold">
              Offline Devices:
            </Text>
            {syncState.offlineDevices.map((deviceId, index) => (
              <XStack key={index} justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$gray11">
                  {deviceId}
                </Text>
                <Button
                  size="$2"
                  backgroundColor="$orange10"
                  onPress={() => handleOfflineDeviceSync(deviceId)}
                  disabled={isProcessing}
                >
                  Sync Now
                </Button>
              </XStack>
            ))}
          </YStack>
        )}
      </Card>
    );
  };

  const renderRotationControls = () => {
    return (
      <Card padding="$4" marginBottom="$4">
        <H4>Initiate Key Rotation</H4>

        <YStack gap="$3" marginTop="$3">
          <XStack gap="$2">
            <Button
              size="$3"
              backgroundColor={rotationType === 'Scheduled' ? '$blue10' : '$gray8'}
              onPress={() => setRotationType('Scheduled')}
            >
              Scheduled
            </Button>
            <Button
              size="$3"
              backgroundColor={rotationType === 'Emergency' ? '$red10' : '$gray8'}
              onPress={() => setRotationType('Emergency')}
            >
              Emergency
            </Button>
          </XStack>

          <Text fontSize="$3" color="$gray11">
            Selected devices: {selectedDevices.length}
          </Text>

          <Button
            backgroundColor="$green10"
            onPress={handleInitiateRotation}
            disabled={isProcessing || selectedDevices.length === 0 || currentRotation !== null}
          >
            {isProcessing ? (
              <XStack alignItems="center" gap="$2">
                <ActivityIndicator size="small" color="white" />
                <Text color="white">Processing...</Text>
              </XStack>
            ) : (
              `Start ${rotationType} Rotation`
            )}
          </Button>
        </YStack>
      </Card>
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text marginTop="$4">Initializing cross-device sync...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <YStack padding="$4">
        <H3 marginBottom="$4">Cross-Device Key Rotation</H3>

        {renderSyncStatus()}
        {renderCurrentRotation()}
        {renderConflicts()}
        {renderDeviceManagement()}
        {renderRotationControls()}

        {showAdvancedOptions && (
          <Card padding="$4">
            <H4>Advanced Options</H4>
            <YStack gap="$3" marginTop="$3">
              <Button backgroundColor="$blue10" onPress={refreshSyncStatus} disabled={isProcessing}>
                Refresh Status
              </Button>
              <Button
                backgroundColor="$gray10"
                onPress={() => {
                  Alert.alert(
                    'Force Sync',
                    'This will attempt to synchronize all offline devices immediately.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Proceed',
                        onPress: async () => {
                          for (const deviceId of syncState.offlineDevices) {
                            try {
                              await syncOfflineDevice(deviceId, 'immediate');
                            } catch (error) {
                              console.warn(`Force sync failed for ${deviceId}:`, error);
                            }
                          }
                        },
                      },
                    ]
                  );
                }}
                disabled={isProcessing || syncState.offlineDevices.length === 0}
              >
                Force Sync All Offline
              </Button>
            </YStack>
          </Card>
        )}

        <Text fontSize="$2" color="$gray11" textAlign="center" marginTop="$4">
          Last sync: {syncState.lastSyncTime?.toLocaleTimeString() || 'Never'}
        </Text>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conflictItem: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff5f5',
  },
});
