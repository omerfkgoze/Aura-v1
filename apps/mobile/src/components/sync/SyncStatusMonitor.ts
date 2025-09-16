/**
 * Real-Time Synchronization Status Monitor
 *
 * Provides comprehensive monitoring for device synchronization status,
 * data consistency, network conditions, and user notifications.
 *
 * Features:
 * - Real-time sync status tracking
 * - Device connectivity monitoring
 * - Data consistency verification
 * - Error handling and retry mechanisms
 * - User notification system
 */

import { EventEmitter } from 'events';
import {
  SyncStatusDetails,
  DeviceSyncState,
  SyncProgress,
  SyncNotification,
  NetworkCondition,
  ConsistencyState,
  SyncEvent,
  SyncStatusListener,
  DeviceStateListener,
  SyncProgressListener,
  SyncNotificationListener,
  NetworkConditionListener,
  SyncMonitoringConfig,
  SyncOperationResult,
  SyncErrorDetails,
  RetryConfig,
} from './types';

export class SyncStatusMonitor extends EventEmitter {
  private config: SyncMonitoringConfig;
  private deviceStates: Map<string, DeviceSyncState> = new Map();
  private currentProgress: SyncProgress | null = null;
  private notifications: SyncNotification[] = [];
  private networkCondition: NetworkCondition | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private consistencyTimer: NodeJS.Timeout | null = null;
  private networkTimer: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  constructor(config: SyncMonitoringConfig) {
    super();
    this.config = config;
    this.setupConfiguration();
  }

  /**
   * Start monitoring synchronization status
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Start periodic status updates
    this.updateTimer = setInterval(() => {
      this.updateAllDeviceStates();
    }, this.config.updateInterval);

    // Start periodic consistency checks
    this.consistencyTimer = setInterval(() => {
      this.performConsistencyCheck();
    }, this.config.consistencyCheckInterval);

    // Start network condition monitoring
    this.networkTimer = setInterval(() => {
      this.checkNetworkCondition();
    }, this.config.networkCheckInterval);

    // Initial state updates
    this.updateAllDeviceStates();
    this.checkNetworkCondition();

    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring synchronization status
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.consistencyTimer) {
      clearInterval(this.consistencyTimer);
      this.consistencyTimer = null;
    }

    if (this.networkTimer) {
      clearInterval(this.networkTimer);
      this.networkTimer = null;
    }

    this.emit('monitoring_stopped');
  }

  /**
   * Update sync status for a specific device
   */
  public updateDeviceStatus(deviceId: string, status: Partial<SyncStatusDetails>): void {
    const currentState = this.deviceStates.get(deviceId);

    if (!currentState) {
      // Create new device state if it doesn't exist
      const newState = this.createDefaultDeviceState(deviceId);
      newState.syncStatus = { ...newState.syncStatus, ...status };
      this.deviceStates.set(deviceId, newState);
    } else {
      // Update existing device state
      const updatedState: DeviceSyncState = {
        ...currentState,
        syncStatus: { ...currentState.syncStatus, ...status },
        lastSeen: new Date(),
      };
      this.deviceStates.set(deviceId, updatedState);
    }

    this.emit('device_status_updated', deviceId, status);
    this.notifyListeners();
  }

  /**
   * Update sync progress for active synchronization
   */
  public updateSyncProgress(progress: SyncProgress): void {
    this.currentProgress = progress;

    // Update device status to reflect progress
    const deviceState = this.deviceStates.get(progress.sessionId);
    if (deviceState) {
      this.updateDeviceStatus(progress.sessionId, {
        status: 'syncing',
        progress: Math.round((progress.completedOperations / progress.totalOperations) * 100),
        pendingOperations: progress.totalOperations - progress.completedOperations,
      });
    }

    this.emit('sync_progress_updated', progress);
    this.notifyProgressListeners(progress);
  }

  /**
   * Report sync operation completion
   */
  public reportSyncCompletion(deviceId: string, result: SyncOperationResult): void {
    const status: Partial<SyncStatusDetails> = {
      status: result.success ? 'synced' : 'error',
      lastSyncTime: new Date(),
      progress: result.success ? 100 : 0,
      pendingOperations: 0,
      error: result.error || null,
    };

    this.updateDeviceStatus(deviceId, status);

    // Create notification for completion
    const notification = this.createSyncCompletionNotification(deviceId, result);
    this.addNotification(notification);

    this.emit('sync_completed', deviceId, result);
  }

  /**
   * Report sync error
   */
  public reportSyncError(deviceId: string, error: SyncErrorDetails): void {
    this.updateDeviceStatus(deviceId, {
      status: 'error',
      error: error,
    });

    // Create error notification
    const notification = this.createErrorNotification(deviceId, error);
    this.addNotification(notification);

    this.emit('sync_error', deviceId, error);
  }

  /**
   * Get current device states
   */
  public getDeviceStates(): DeviceSyncState[] {
    return Array.from(this.deviceStates.values());
  }

  /**
   * Get current sync progress
   */
  public getCurrentProgress(): SyncProgress | null {
    return this.currentProgress;
  }

  /**
   * Get active notifications
   */
  public getNotifications(): SyncNotification[] {
    return [...this.notifications];
  }

  /**
   * Get current network condition
   */
  public getNetworkCondition(): NetworkCondition | null {
    return this.networkCondition;
  }

  /**
   * Dismiss notification
   */
  public dismissNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.emit('notification_dismissed', notificationId);
  }

  /**
   * Clear all notifications
   */
  public clearNotifications(): void {
    this.notifications = [];
    this.emit('notifications_cleared');
  }

  /**
   * Register sync status listener
   */
  public onSyncStatus(listener: SyncStatusListener): void {
    this.on('sync_status', listener);
  }

  /**
   * Register device state listener
   */
  public onDeviceState(listener: DeviceStateListener): void {
    this.on('device_state', listener);
  }

  /**
   * Register sync progress listener
   */
  public onSyncProgress(listener: SyncProgressListener): void {
    this.on('sync_progress', listener);
  }

  /**
   * Register notification listener
   */
  public onNotification(listener: SyncNotificationListener): void {
    this.on('notification', listener);
  }

  /**
   * Register network condition listener
   */
  public onNetworkCondition(listener: NetworkConditionListener): void {
    this.on('network_condition', listener);
  }

  // Private methods

  private setupConfiguration(): void {
    // Validate configuration
    if (this.config.updateInterval < 1000) {
      throw new Error('Update interval must be at least 1000ms');
    }

    if (this.config.maxNotifications < 1) {
      throw new Error('Max notifications must be at least 1');
    }
  }

  private createDefaultDeviceState(deviceId: string): DeviceSyncState {
    return {
      deviceId,
      deviceName: `Device ${deviceId.slice(-4)}`,
      platform: 'ios', // Will be updated when device info is available
      isOnline: false,
      lastSeen: new Date(),
      syncStatus: {
        deviceId,
        status: 'offline',
        lastSyncTime: null,
        progress: 0,
        pendingOperations: 0,
        error: null,
      },
      dataConsistency: {
        isConsistent: true,
        lastVerified: new Date(),
        inconsistencies: [],
        verificationProgress: 0,
        recordsChecked: 0,
        totalRecords: 0,
      },
      networkCondition: {
        type: 'offline',
        quality: 'unusable',
        bandwidth: 0,
        latency: 0,
        isMetered: false,
        isReachable: false,
        lastChecked: new Date(),
      },
    };
  }

  private async updateAllDeviceStates(): Promise<void> {
    try {
      // Update status for all known devices
      for (const [deviceId, state] of this.deviceStates) {
        const updatedState = await this.refreshDeviceState(state);
        this.deviceStates.set(deviceId, updatedState);
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error updating device states:', error);
    }
  }

  private async refreshDeviceState(state: DeviceSyncState): Promise<DeviceSyncState> {
    // In a real implementation, this would check device connectivity,
    // sync status, and other relevant information

    // For now, we'll simulate some updates
    const timeSinceLastSeen = Date.now() - state.lastSeen.getTime();
    const isOnline = timeSinceLastSeen < 30000; // 30 seconds threshold

    return {
      ...state,
      isOnline,
      syncStatus: {
        ...state.syncStatus,
        status: isOnline ? state.syncStatus.status : 'offline',
      },
    };
  }

  private async performConsistencyCheck(): Promise<void> {
    try {
      // Perform consistency check across all devices
      for (const [deviceId, state] of this.deviceStates) {
        if (state.isOnline) {
          const consistencyState = await this.checkDeviceConsistency(deviceId);
          const updatedState: DeviceSyncState = {
            ...state,
            dataConsistency: consistencyState,
          };
          this.deviceStates.set(deviceId, updatedState);
        }
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error performing consistency check:', error);
    }
  }

  private async checkDeviceConsistency(deviceId: string): Promise<ConsistencyState> {
    // In a real implementation, this would perform actual data consistency checks
    // For now, we'll simulate a consistency check result

    return {
      isConsistent: true,
      lastVerified: new Date(),
      inconsistencies: [],
      verificationProgress: 100,
      recordsChecked: 100,
      totalRecords: 100,
    };
  }

  private async checkNetworkCondition(): Promise<void> {
    try {
      // In a real implementation, this would check actual network conditions
      // For now, we'll simulate network condition detection

      const condition: NetworkCondition = {
        type: 'wifi',
        quality: 'good',
        bandwidth: 50, // Mbps
        latency: 25, // ms
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      };

      this.networkCondition = condition;
      this.emit('network_condition', condition);
    } catch (error) {
      console.error('Error checking network condition:', error);
    }
  }

  private createSyncCompletionNotification(
    deviceId: string,
    result: SyncOperationResult
  ): SyncNotification {
    const deviceName = this.deviceStates.get(deviceId)?.deviceName || deviceId;

    return {
      id: `sync_complete_${deviceId}_${Date.now()}`,
      type: result.success ? 'success' : 'error',
      title: result.success ? 'Sync Completed' : 'Sync Failed',
      message: result.success
        ? `Successfully synced ${result.syncedRecords} records with ${deviceName}`
        : `Failed to sync with ${deviceName}: ${result.error?.message || 'Unknown error'}`,
      timestamp: new Date(),
      deviceId,
      dismissible: true,
      autoHide: result.success,
      priority: result.success ? 'medium' : 'high',
      category: 'sync',
    };
  }

  private createErrorNotification(deviceId: string, error: SyncErrorDetails): SyncNotification {
    const deviceName = this.deviceStates.get(deviceId)?.deviceName || deviceId;

    return {
      id: `sync_error_${deviceId}_${Date.now()}`,
      type: 'error',
      title: 'Sync Error',
      message: `Error syncing with ${deviceName}: ${error.message}`,
      timestamp: new Date(),
      deviceId,
      dismissible: true,
      autoHide: false,
      priority: error.recoverable ? 'medium' : 'high',
      category: 'sync',
      action: error.recoverable
        ? {
            label: 'Retry',
            handler: () => this.retrySyncForDevice(deviceId),
          }
        : undefined,
    };
  }

  private addNotification(notification: SyncNotification): void {
    this.notifications.unshift(notification);

    // Limit number of notifications
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.config.maxNotifications);
    }

    // Auto-hide notifications if configured
    if (notification.autoHide) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, 5000); // 5 second auto-hide
    }

    this.emit('notification', notification);
  }

  private notifyListeners(): void {
    const deviceStates = this.getDeviceStates();
    this.emit('device_state', deviceStates);
  }

  private notifyProgressListeners(progress: SyncProgress): void {
    this.emit('sync_progress', progress);
  }

  private retrySyncForDevice(deviceId: string): void {
    // Implementation would trigger a sync retry for the specified device
    this.emit('retry_sync_requested', deviceId);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.deviceStates.clear();
    this.notifications = [];
    this.currentProgress = null;
    this.networkCondition = null;
  }
}
