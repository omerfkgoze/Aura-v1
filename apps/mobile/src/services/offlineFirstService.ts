import { NetInfo, NetInfoState } from '@react-native-async-storage/async-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

export interface OfflineOperation {
  id: string;
  type: 'sync' | 'backup' | 'update';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

export interface OfflineFirstConfig {
  enableOfflineMode: boolean;
  enableBackgroundSync: boolean;
  maxRetryAttempts: number;
  retryBackoffMs: number;
  syncIntervalMs: number;
  offlineStorageKey: string;
}

/**
 * Offline-First Service Layer
 * Provides abstractions for network operations with graceful offline degradation
 * Queues operations when offline and executes when connectivity is restored
 */
export class OfflineFirstService {
  private networkStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown',
    details: null,
  };

  private operationQueue: OfflineOperation[] = [];
  private isProcessingQueue = false;
  private config: OfflineFirstConfig;
  private listeners: Map<string, (status: NetworkStatus) => void> = new Map();

  constructor(config: Partial<OfflineFirstConfig> = {}) {
    this.config = {
      enableOfflineMode: true,
      enableBackgroundSync: true,
      maxRetryAttempts: 3,
      retryBackoffMs: 5000,
      syncIntervalMs: 30000,
      offlineStorageKey: 'aura_offline_operations',
      ...config,
    };

    this.initializeNetworkMonitoring();
    this.loadOfflineOperations();
  }

  /**
   * Initialize network status monitoring
   */
  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Get initial network state
      const netInfoState = await NetInfo.fetch();
      this.updateNetworkStatus(netInfoState);

      // Subscribe to network changes
      NetInfo.addEventListener(this.handleNetworkChange.bind(this));

      console.log('[OfflineFirstService] Network monitoring initialized');
    } catch (error) {
      console.warn('[OfflineFirstService] Failed to initialize network monitoring:', error);
      // Assume offline mode if NetInfo fails
      this.networkStatus = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      };
    }
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const wasOffline = !this.networkStatus.isConnected;
    this.updateNetworkStatus(state);
    const isNowOnline = this.networkStatus.isConnected;

    // Notify listeners
    this.listeners.forEach(listener => {
      listener(this.networkStatus);
    });

    // Process offline queue if we just came online
    if (wasOffline && isNowOnline && this.config.enableBackgroundSync) {
      this.processOfflineQueue();
    }

    console.log('[OfflineFirstService] Network status changed:', this.networkStatus);
  }

  /**
   * Update internal network status
   */
  private updateNetworkStatus(state: NetInfoState): void {
    this.networkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details,
    };
  }

  /**
   * Execute operation with offline-first strategy
   */
  async executeOperation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    options: {
      requiresNetwork?: boolean;
      priority?: 'low' | 'medium' | 'high';
      retryOnFailure?: boolean;
      operationType?: string;
    } = {}
  ): Promise<T> {
    const {
      requiresNetwork = false,
      priority = 'medium',
      retryOnFailure = true,
      operationType = 'unknown',
    } = options;

    // If offline mode is disabled, always try the operation
    if (!this.config.enableOfflineMode) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`[OfflineFirstService] Operation ${operationType} failed:`, error);
        return await fallback();
      }
    }

    // If we're offline or operation requires network but we're not connected
    if (!this.networkStatus.isConnected || (requiresNetwork && !this.isNetworkAvailable())) {
      console.log(`[OfflineFirstService] Executing ${operationType} in offline mode`);

      try {
        return await fallback();
      } catch (error) {
        console.error(`[OfflineFirstService] Offline fallback failed for ${operationType}:`, error);
        throw new Error(`Operation ${operationType} failed in offline mode`);
      }
    }

    // Try online operation first
    try {
      const result = await operation();
      console.log(`[OfflineFirstService] Online operation ${operationType} succeeded`);
      return result;
    } catch (error) {
      console.warn(`[OfflineFirstService] Online operation ${operationType} failed:`, error);

      // Queue for retry if enabled
      if (retryOnFailure && requiresNetwork) {
        await this.queueOperation({
          type: 'sync',
          data: { operationType, error: error.message },
          priority,
        });
      }

      // Fall back to offline operation
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error(`[OfflineFirstService] Fallback failed for ${operationType}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Queue operation for later execution when online
   */
  async queueOperation(
    operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>
  ): Promise<void> {
    const queuedOperation: OfflineOperation = {
      id: this.generateOperationId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.config.maxRetryAttempts,
      ...operation,
    };

    this.operationQueue.push(queuedOperation);
    await this.saveOfflineOperations();

    console.log(
      `[OfflineFirstService] Queued operation: ${queuedOperation.type}`,
      queuedOperation.id
    );
  }

  /**
   * Process offline operation queue
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    if (!this.isNetworkAvailable()) {
      console.log('[OfflineFirstService] Network not available, skipping queue processing');
      return;
    }

    this.isProcessingQueue = true;
    console.log(`[OfflineFirstService] Processing ${this.operationQueue.length} queued operations`);

    // Sort by priority (high -> medium -> low) and timestamp
    const sortedOperations = [...this.operationQueue].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const processedIds: string[] = [];

    for (const operation of sortedOperations) {
      try {
        await this.executeQueuedOperation(operation);
        processedIds.push(operation.id);
        console.log(`[OfflineFirstService] Successfully processed operation: ${operation.id}`);
      } catch (error) {
        console.warn(`[OfflineFirstService] Failed to process operation ${operation.id}:`, error);

        // Increment retry count
        operation.retryCount += 1;

        if (operation.retryCount >= operation.maxRetries) {
          console.error(
            `[OfflineFirstService] Max retries exceeded for operation: ${operation.id}`
          );
          processedIds.push(operation.id); // Remove from queue
        }

        // Add exponential backoff delay
        await this.delay(this.config.retryBackoffMs * Math.pow(2, operation.retryCount));
      }

      // Check if we went offline during processing
      if (!this.isNetworkAvailable()) {
        console.log('[OfflineFirstService] Network lost during queue processing, stopping');
        break;
      }
    }

    // Remove processed operations
    this.operationQueue = this.operationQueue.filter(op => !processedIds.includes(op.id));
    await this.saveOfflineOperations();

    this.isProcessingQueue = false;
    console.log(
      `[OfflineFirstService] Queue processing completed. ${this.operationQueue.length} operations remaining`
    );
  }

  /**
   * Execute a queued operation
   */
  private async executeQueuedOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.type) {
      case 'sync':
        await this.executeSyncOperation(operation);
        break;
      case 'backup':
        await this.executeBackupOperation(operation);
        break;
      case 'update':
        await this.executeUpdateOperation(operation);
        break;
      default:
        console.warn(`[OfflineFirstService] Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Execute sync operation
   */
  private async executeSyncOperation(operation: OfflineOperation): Promise<void> {
    // Implementation would depend on specific sync requirements
    console.log(`[OfflineFirstService] Executing sync operation: ${operation.id}`);
    // This would typically involve API calls to sync local data with server
  }

  /**
   * Execute backup operation
   */
  private async executeBackupOperation(operation: OfflineOperation): Promise<void> {
    console.log(`[OfflineFirstService] Executing backup operation: ${operation.id}`);
    // This would typically involve uploading encrypted backup data
  }

  /**
   * Execute update operation
   */
  private async executeUpdateOperation(operation: OfflineOperation): Promise<void> {
    console.log(`[OfflineFirstService] Executing update operation: ${operation.id}`);
    // This would typically involve sending updates to remote services
  }

  /**
   * Check if network is available for operations
   */
  private isNetworkAvailable(): boolean {
    return (
      this.networkStatus.isConnected &&
      (this.networkStatus.isInternetReachable === true ||
        this.networkStatus.isInternetReachable === null)
    );
  }

  /**
   * Load offline operations from storage
   */
  private async loadOfflineOperations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.config.offlineStorageKey);
      if (stored) {
        this.operationQueue = JSON.parse(stored);
        console.log(
          `[OfflineFirstService] Loaded ${this.operationQueue.length} offline operations`
        );
      }
    } catch (error) {
      console.warn('[OfflineFirstService] Failed to load offline operations:', error);
      this.operationQueue = [];
    }
  }

  /**
   * Save offline operations to storage
   */
  private async saveOfflineOperations(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.config.offlineStorageKey,
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.warn('[OfflineFirstService] Failed to save offline operations:', error);
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API Methods
   */

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.isNetworkAvailable();
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.isNetworkAvailable();
  }

  /**
   * Subscribe to network status changes
   */
  onNetworkStatusChange(listenerId: string, listener: (status: NetworkStatus) => void): void {
    this.listeners.set(listenerId, listener);
  }

  /**
   * Unsubscribe from network status changes
   */
  offNetworkStatusChange(listenerId: string): void {
    this.listeners.delete(listenerId);
  }

  /**
   * Force process offline queue (for manual sync)
   */
  async syncNow(): Promise<void> {
    if (!this.isNetworkAvailable()) {
      throw new Error('Cannot sync: no network connection available');
    }

    await this.processOfflineQueue();
  }

  /**
   * Clear offline operation queue
   */
  async clearQueue(): Promise<void> {
    this.operationQueue = [];
    await this.saveOfflineOperations();
    console.log('[OfflineFirstService] Offline queue cleared');
  }

  /**
   * Get offline queue status
   */
  getQueueStatus(): {
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByPriority: Record<string, number>;
    oldestOperation?: string;
  } {
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let oldestTimestamp: string | undefined;

    this.operationQueue.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + 1;
      byPriority[op.priority] = (byPriority[op.priority] || 0) + 1;

      if (!oldestTimestamp || op.timestamp < oldestTimestamp) {
        oldestTimestamp = op.timestamp;
      }
    });

    return {
      totalOperations: this.operationQueue.length,
      operationsByType: byType,
      operationsByPriority: byPriority,
      oldestOperation: oldestTimestamp,
    };
  }

  /**
   * Health check for offline first service
   */
  async performHealthCheck(): Promise<{
    networkMonitoring: boolean;
    queuePersistence: boolean;
    operationalStatus: 'healthy' | 'degraded' | 'offline';
    queueSize: number;
  }> {
    let networkMonitoring = true;
    let queuePersistence = true;

    // Test network monitoring
    try {
      await NetInfo.fetch();
    } catch {
      networkMonitoring = false;
    }

    // Test queue persistence
    try {
      await this.saveOfflineOperations();
      await this.loadOfflineOperations();
    } catch {
      queuePersistence = false;
    }

    // Determine operational status
    let operationalStatus: 'healthy' | 'degraded' | 'offline';
    if (networkMonitoring && queuePersistence) {
      operationalStatus = 'healthy';
    } else if (queuePersistence) {
      operationalStatus = 'degraded'; // Can still work offline
    } else {
      operationalStatus = 'offline';
    }

    return {
      networkMonitoring,
      queuePersistence,
      operationalStatus,
      queueSize: this.operationQueue.length,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.listeners.clear();
    console.log('[OfflineFirstService] Service disposed');
  }
}

// Export singleton instance
export const offlineFirstService = new OfflineFirstService();
