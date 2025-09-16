import React, { useState, useEffect, useCallback } from 'react';
import { YStack, XStack, Text, Button, Progress, Card, Circle } from '@tamagui/core';
import { AlertCircle, Wifi, WifiOff, Sync, CheckCircle, Clock, X } from '@tamagui/lucide-icons';
import { offlineFirstService, NetworkStatus } from '../services/offlineFirstService';
import { useAccessibility } from '../utils/accessibility';

interface OfflineStatusMonitorProps {
  showDetailedStatus?: boolean;
  position?: 'top' | 'bottom';
  stealthMode?: boolean;
  onStatusTap?: () => void;
}

export interface SyncStatus {
  isActive: boolean;
  progress: number;
  currentOperation?: string;
  pendingOperations: number;
  lastSyncTime?: string;
  errors: string[];
}

/**
 * Offline Status Monitor Component
 * Provides real-time feedback about network connectivity and sync status
 * Shows sync progress and offline operation queue status
 */
export const OfflineStatusMonitor: React.FC<OfflineStatusMonitorProps> = ({
  showDetailedStatus = false,
  position = 'top',
  stealthMode = false,
  onStatusTap,
}) => {
  const { getAccessibilityLabel } = useAccessibility();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineFirstService.getNetworkStatus()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    progress: 0,
    pendingOperations: 0,
    errors: [],
  });
  const [showDetails, setShowDetails] = useState(showDetailedStatus);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'offline'>('healthy');

  // Monitor network status changes
  useEffect(() => {
    const listenerId = 'offline-status-monitor';

    offlineFirstService.onNetworkStatusChange(listenerId, status => {
      setNetworkStatus(status);
      updateSyncStatus();
    });

    // Initial status update
    updateSyncStatus();
    performHealthCheck();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(performHealthCheck, 30000); // Every 30 seconds

    return () => {
      offlineFirstService.offNetworkStatusChange(listenerId);
      clearInterval(healthCheckInterval);
    };
  }, []);

  /**
   * Update sync status from offline service
   */
  const updateSyncStatus = useCallback(async () => {
    try {
      const queueStatus = offlineFirstService.getQueueStatus();

      setSyncStatus(prev => ({
        ...prev,
        pendingOperations: queueStatus.totalOperations,
        lastSyncTime: queueStatus.oldestOperation ? new Date().toISOString() : prev.lastSyncTime,
      }));
    } catch (error) {
      console.warn('[OfflineStatusMonitor] Failed to update sync status:', error);
    }
  }, []);

  /**
   * Perform health check on offline service
   */
  const performHealthCheck = useCallback(async () => {
    try {
      const health = await offlineFirstService.performHealthCheck();
      setHealthStatus(health.operationalStatus);
    } catch (error) {
      console.warn('[OfflineStatusMonitor] Health check failed:', error);
      setHealthStatus('offline');
    }
  }, []);

  /**
   * Handle manual sync trigger
   */
  const handleManualSync = useCallback(async () => {
    if (!networkStatus.isConnected) {
      return;
    }

    try {
      setSyncStatus(prev => ({ ...prev, isActive: true, progress: 0 }));

      // Simulate sync progress
      const progressInterval = setInterval(() => {
        setSyncStatus(prev => {
          const newProgress = prev.progress + 10;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return { ...prev, progress: 100, isActive: false };
          }
          return { ...prev, progress: newProgress };
        });
      }, 100);

      await offlineFirstService.syncNow();
      await updateSyncStatus();
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isActive: false,
        progress: 0,
        errors: [...prev.errors, error.message],
      }));
    }
  }, [networkStatus.isConnected, updateSyncStatus]);

  /**
   * Get status indicator color
   */
  const getStatusColor = () => {
    if (!networkStatus.isConnected) {
      return stealthMode ? '#6B7280' : '#EF4444'; // Red for offline
    }

    if (syncStatus.pendingOperations > 0) {
      return stealthMode ? '#9CA3AF' : '#F59E0B'; // Yellow for pending sync
    }

    if (healthStatus === 'degraded') {
      return stealthMode ? '#9CA3AF' : '#F59E0B'; // Yellow for degraded
    }

    return stealthMode ? '#6B7280' : '#10B981'; // Green for healthy
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    if (stealthMode) {
      if (!networkStatus.isConnected) return 'Çevrimdışı';
      if (syncStatus.isActive) return 'Senkronize ediliyor';
      if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} bekliyor`;
      return 'Çevrimiçi';
    }

    if (!networkStatus.isConnected) return 'Offline Mode';
    if (syncStatus.isActive) return 'Synchronizing...';
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} pending`;
    return 'Connected';
  };

  /**
   * Get appropriate icon
   */
  const getStatusIcon = () => {
    if (!networkStatus.isConnected) {
      return <WifiOff size="$1" color={getStatusColor()} />;
    }

    if (syncStatus.isActive) {
      return <Sync size="$1" color={getStatusColor()} />;
    }

    if (syncStatus.pendingOperations > 0) {
      return <Clock size="$1" color={getStatusColor()} />;
    }

    if (healthStatus === 'degraded') {
      return <AlertCircle size="$1" color={getStatusColor()} />;
    }

    return <CheckCircle size="$1" color={getStatusColor()} />;
  };

  /**
   * Render compact status indicator
   */
  const renderCompactStatus = () => (
    <XStack
      alignItems="center"
      space="$2"
      backgroundColor="$background"
      paddingHorizontal="$3"
      paddingVertical="$2"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ opacity: 0.8 }}
      onPress={() => {
        setShowDetails(!showDetails);
        onStatusTap?.();
      }}
      accessibilityLabel={getAccessibilityLabel(
        `Network status: ${getStatusText()}. Tap for details.`
      )}
    >
      {getStatusIcon()}
      <Text fontSize="$3" color="$color11">
        {getStatusText()}
      </Text>

      {syncStatus.isActive && (
        <Circle size="$1" backgroundColor={getStatusColor()}>
          <Circle size="$0.5" backgroundColor="$background" />
        </Circle>
      )}
    </XStack>
  );

  /**
   * Render detailed status panel
   */
  const renderDetailedStatus = () => (
    <Card padding="$4" borderWidth={1} borderColor="$borderColor" backgroundColor="$background">
      <YStack space="$3">
        {/* Header */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontSize="$4" fontWeight="600" color="$color12">
              {stealthMode ? 'Bağlantı Durumu' : 'Connection Status'}
            </Text>
            <Text fontSize="$2" color="$color11">
              {getStatusText()}
            </Text>
          </YStack>

          <XStack space="$2" alignItems="center">
            {getStatusIcon()}
            <Button
              size="$2"
              variant="ghost"
              icon={<X size="$1" />}
              onPress={() => setShowDetails(false)}
              accessibilityLabel="Close status details"
            />
          </XStack>
        </XStack>

        {/* Network Details */}
        <YStack space="$2">
          <Text fontSize="$3" fontWeight="500" color="$color12">
            {stealthMode ? 'Ağ Bilgileri' : 'Network Details'}
          </Text>

          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$color11">
              Connection Type:
            </Text>
            <Text fontSize="$3" color="$color12" textTransform="capitalize">
              {networkStatus.type}
            </Text>
          </XStack>

          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$color11">
              Internet Access:
            </Text>
            <Text fontSize="$3" color="$color12">
              {networkStatus.isInternetReachable === null
                ? 'Unknown'
                : networkStatus.isInternetReachable
                  ? 'Available'
                  : 'Limited'}
            </Text>
          </XStack>
        </YStack>

        {/* Sync Status */}
        <YStack space="$2">
          <Text fontSize="$3" fontWeight="500" color="$color12">
            {stealthMode ? 'Senkronizasyon' : 'Synchronization'}
          </Text>

          {syncStatus.isActive && (
            <YStack space="$1">
              <XStack justifyContent="space-between">
                <Text fontSize="$3" color="$color11">
                  Progress:
                </Text>
                <Text fontSize="$3" color="$color12">
                  {syncStatus.progress}%
                </Text>
              </XStack>
              <Progress value={syncStatus.progress} backgroundColor="$gray4">
                <Progress.Indicator backgroundColor={getStatusColor()} />
              </Progress>
            </YStack>
          )}

          <XStack justifyContent="space-between">
            <Text fontSize="$3" color="$color11">
              Pending Operations:
            </Text>
            <Text fontSize="$3" color="$color12">
              {syncStatus.pendingOperations}
            </Text>
          </XStack>

          {syncStatus.lastSyncTime && (
            <XStack justifyContent="space-between">
              <Text fontSize="$3" color="$color11">
                Last Sync:
              </Text>
              <Text fontSize="$3" color="$color12">
                {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Action Buttons */}
        <XStack space="$2" justifyContent="flex-end">
          {networkStatus.isConnected && syncStatus.pendingOperations > 0 && (
            <Button
              size="$3"
              variant="outlined"
              onPress={handleManualSync}
              disabled={syncStatus.isActive}
              icon={<Sync size="$1" />}
            >
              {stealthMode ? 'Senkronize Et' : 'Sync Now'}
            </Button>
          )}

          <Button
            size="$3"
            variant="outlined"
            onPress={performHealthCheck}
            icon={<CheckCircle size="$1" />}
          >
            {stealthMode ? 'Durumu Kontrol Et' : 'Check Status'}
          </Button>
        </XStack>

        {/* Error Messages */}
        {syncStatus.errors.length > 0 && (
          <YStack space="$2">
            <Text fontSize="$3" fontWeight="500" color="$red11">
              {stealthMode ? 'Hatalar' : 'Errors'}
            </Text>
            {syncStatus.errors.slice(-3).map((error, index) => (
              <XStack key={index} space="$2" alignItems="flex-start">
                <AlertCircle size="$1" color="$red10" marginTop="$0.5" />
                <Text fontSize="$2" color="$red11" flex={1} lineHeight="$1">
                  {error}
                </Text>
              </XStack>
            ))}
            <Button
              size="$2"
              variant="ghost"
              onPress={() => setSyncStatus(prev => ({ ...prev, errors: [] }))}
            >
              Clear Errors
            </Button>
          </YStack>
        )}

        {/* Offline Mode Information */}
        {!networkStatus.isConnected && (
          <Card backgroundColor="$blue2" padding="$3" borderColor="$blue8" borderWidth={1}>
            <YStack space="$2">
              <XStack space="$2" alignItems="center">
                <WifiOff size="$1" color="$blue11" />
                <Text fontSize="$3" fontWeight="500" color="$blue11">
                  {stealthMode ? 'Çevrimdışı Mod' : 'Offline Mode Active'}
                </Text>
              </XStack>
              <Text fontSize="$2" color="$blue11" lineHeight="$1">
                {stealthMode
                  ? 'Tüm ana özellikler çevrimdışı çalışıyor. Bağlantı kurulduğunda veriler senkronize edilecek.'
                  : 'All core features are working offline. Data will sync when connection is restored.'}
              </Text>
            </YStack>
          </Card>
        )}
      </YStack>
    </Card>
  );

  return (
    <YStack
      position={position === 'top' ? 'absolute' : 'relative'}
      top={position === 'top' ? '$2' : undefined}
      left="$2"
      right="$2"
      zIndex={1000}
      space="$2"
    >
      {showDetails ? renderDetailedStatus() : renderCompactStatus()}
    </YStack>
  );
};

export default OfflineStatusMonitor;
