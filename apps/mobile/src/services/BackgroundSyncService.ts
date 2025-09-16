import { NetworkStatusService } from './NetworkStatusService';
import { P2PCommunicationProtocol } from '../components/sync/P2PCommunicationProtocol';
import { ConflictDetectionService } from '../components/conflict-resolution/ConflictDetectionService';
import BackgroundJob from 'react-native-background-job';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncOperation {
  id: string;
  type: 'upload' | 'download' | 'conflict_resolution';
  deviceId: string;
  dataType: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  data?: any;
}

interface SyncQueue {
  pending: SyncOperation[];
  inProgress: SyncOperation[];
  completed: SyncOperation[];
  failed: SyncOperation[];
}

/**
 * Background synchronization service for network-optional design
 * Handles intelligent sync resume when connectivity is restored
 */
export class BackgroundSyncService {
  private networkService: NetworkStatusService;
  private p2pProtocol: P2PCommunicationProtocol;
  private conflictService: ConflictDetectionService;
  private syncQueue: SyncQueue;
  private isBackgroundJobActive: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    networkService: NetworkStatusService,
    p2pProtocol: P2PCommunicationProtocol,
    conflictService: ConflictDetectionService
  ) {
    this.networkService = networkService;
    this.p2pProtocol = p2pProtocol;
    this.conflictService = conflictService;
    this.syncQueue = {
      pending: [],
      inProgress: [],
      completed: [],
      failed: [],
    };

    this.initializeService();
  }

  /**
   * Initialize background sync service with network monitoring
   */
  private async initializeService(): Promise<void> {
    try {
      // Load persisted sync queue
      await this.loadSyncQueue();

      // Listen for network connectivity changes
      this.networkService.on('online', this.handleNetworkOnline.bind(this));
      this.networkService.on('offline', this.handleNetworkOffline.bind(this));

      // Start background sync monitoring
      this.startBackgroundMonitoring();

      console.log('[BackgroundSyncService] Initialized successfully');
    } catch (error) {
      console.error('[BackgroundSyncService] Initialization failed:', error);
    }
  }

  /**
   * Handle network connectivity restored
   */
  private async handleNetworkOnline(event: any): Promise<void> {
    console.log('[BackgroundSyncService] Network connectivity restored', {
      downtime: event.downtime,
      connectivityRestored: event.connectivityRestored,
    });

    // Check connectivity reliability before starting sync
    const reliability = this.networkService.getConnectivityReliability();
    if (reliability < 30) {
      console.log('[BackgroundSyncService] Low connectivity reliability, delaying sync');
      setTimeout(() => this.resumeBackgroundSync(), 10000);
      return;
    }

    // Resume background sync immediately for high reliability connections
    await this.resumeBackgroundSync();
  }

  /**
   * Handle network connectivity lost
   */
  private handleNetworkOffline(): void {
    console.log('[BackgroundSyncService] Network connectivity lost, pausing sync');
    this.pauseBackgroundSync();
  }

  /**
   * Start background monitoring for sync operations
   */
  private startBackgroundMonitoring(): void {
    // Monitor sync queue every 30 seconds
    this.syncInterval = setInterval(async () => {
      await this.processSyncQueue();
    }, 30000);

    // Start background job for app backgrounding scenarios
    this.startBackgroundJob();
  }

  /**
   * Start React Native background job
   */
  private startBackgroundJob(): void {
    if (this.isBackgroundJobActive) return;

    try {
      BackgroundJob.start({
        jobKey: 'backgroundSync',
        period: 60000, // Run every minute when app is backgrounded
      });

      BackgroundJob.start({
        jobKey: 'backgroundSync',
        period: 60000,
      }).then(() => {
        console.log('[BackgroundSyncService] Background job started');
        this.isBackgroundJobActive = true;
      });
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to start background job:', error);
    }
  }

  /**
   * Resume background sync when connectivity is restored
   */
  private async resumeBackgroundSync(): Promise<void> {
    const networkStatus = this.networkService.getNetworkStatus();

    if (!networkStatus.isOnline) {
      console.log('[BackgroundSyncService] Cannot resume sync - network offline');
      return;
    }

    console.log('[BackgroundSyncService] Resuming background sync');

    // Process high priority operations first
    await this.processPriorityOperations();

    // Continue with regular sync queue processing
    await this.processSyncQueue();

    // Schedule intelligent sync based on network conditions
    this.scheduleIntelligentSync();
  }

  /**
   * Pause background sync during offline periods
   */
  private pauseBackgroundSync(): void {
    // Stop regular sync processing
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Cancel retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Move in-progress operations back to pending
    this.syncQueue.pending.unshift(...this.syncQueue.inProgress);
    this.syncQueue.inProgress = [];

    console.log('[BackgroundSyncService] Background sync paused');
  }

  /**
   * Process priority operations when connectivity is restored
   */
  private async processPriorityOperations(): Promise<void> {
    const highPriorityOps = this.syncQueue.pending.filter(op => op.priority === 'high');

    for (const operation of highPriorityOps.slice(0, 3)) {
      // Process max 3 at once
      try {
        await this.processOperation(operation);
      } catch (error) {
        console.error('[BackgroundSyncService] Priority operation failed:', error);
        this.handleOperationFailure(operation, error);
      }
    }
  }

  /**
   * Process sync queue with intelligent batching
   */
  private async processSyncQueue(): Promise<void> {
    const networkStatus = this.networkService.getNetworkStatus();

    if (!networkStatus.isOnline) {
      return; // Skip processing when offline
    }

    // Determine batch size based on network conditions
    const batchSize = this.determineBatchSize();
    const pendingOps = this.syncQueue.pending.slice(0, batchSize);

    for (const operation of pendingOps) {
      try {
        // Move to in-progress
        this.moveToInProgress(operation);

        // Process the operation
        await this.processOperation(operation);

        // Move to completed
        this.moveToCompleted(operation);
      } catch (error) {
        this.handleOperationFailure(operation, error);
      }
    }

    // Persist queue state
    await this.persistSyncQueue();
  }

  /**
   * Determine optimal batch size based on network conditions
   */
  private determineBatchSize(): number {
    const networkStatus = this.networkService.getNetworkStatus();
    const reliability = this.networkService.getConnectivityReliability();

    // High reliability WiFi: larger batches
    if (networkStatus.connectionType === 'wifi' && reliability > 80) {
      return 5;
    }

    // Good cellular connection: medium batches
    if (networkStatus.connectionType === 'cellular' && reliability > 60) {
      return 3;
    }

    // Poor connection: small batches
    return 1;
  }

  /**
   * Process individual sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    console.log(`[BackgroundSyncService] Processing operation ${operation.id}`, {
      type: operation.type,
      priority: operation.priority,
    });

    switch (operation.type) {
      case 'upload':
        await this.processUploadOperation(operation);
        break;
      case 'download':
        await this.processDownloadOperation(operation);
        break;
      case 'conflict_resolution':
        await this.processConflictResolution(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Process upload operation
   */
  private async processUploadOperation(operation: SyncOperation): Promise<void> {
    if (!operation.data) {
      throw new Error('Upload operation missing data');
    }

    await this.p2pProtocol.sendData(operation.deviceId, operation.data);
    console.log(`[BackgroundSyncService] Upload completed for operation ${operation.id}`);
  }

  /**
   * Process download operation
   */
  private async processDownloadOperation(operation: SyncOperation): Promise<void> {
    const data = await this.p2pProtocol.requestData(operation.deviceId, {
      dataType: operation.dataType,
      timestamp: operation.timestamp,
    });

    // Check for conflicts after download
    if (data) {
      const conflicts = await this.conflictService.detectConflicts(data);
      if (conflicts.length > 0) {
        // Schedule conflict resolution
        this.queueConflictResolution(conflicts);
      }
    }

    console.log(`[BackgroundSyncService] Download completed for operation ${operation.id}`);
  }

  /**
   * Process conflict resolution operation
   */
  private async processConflictResolution(operation: SyncOperation): Promise<void> {
    if (!operation.data?.conflicts) {
      throw new Error('Conflict resolution operation missing conflict data');
    }

    // Attempt automatic resolution first
    const autoResolved = await this.conflictService.attemptAutoResolution(operation.data.conflicts);

    if (!autoResolved) {
      // Requires user intervention - notify and keep in queue
      console.log(`[BackgroundSyncService] Conflict ${operation.id} requires user intervention`);
      throw new Error('Manual conflict resolution required');
    }

    console.log(
      `[BackgroundSyncService] Conflict resolution completed for operation ${operation.id}`
    );
  }

  /**
   * Handle operation failure with intelligent retry
   */
  private handleOperationFailure(operation: SyncOperation, error: any): void {
    console.error(`[BackgroundSyncService] Operation ${operation.id} failed:`, error);

    // Move from in-progress back to pending or failed
    this.moveFromInProgress(operation);

    if (operation.retryCount < operation.maxRetries) {
      // Calculate exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, operation.retryCount), 300000); // Max 5 minutes

      operation.retryCount++;

      // Schedule retry
      const retryTimeout = setTimeout(async () => {
        this.syncQueue.pending.unshift(operation);
        this.retryTimeouts.delete(operation.id);
        console.log(
          `[BackgroundSyncService] Retrying operation ${operation.id} (attempt ${operation.retryCount})`
        );
      }, delay);

      this.retryTimeouts.set(operation.id, retryTimeout);
    } else {
      // Max retries exceeded, move to failed
      this.syncQueue.failed.push(operation);
      console.error(`[BackgroundSyncService] Operation ${operation.id} failed permanently`);
    }
  }

  /**
   * Schedule intelligent sync based on network conditions
   */
  private scheduleIntelligentSync(): void {
    const networkStatus = this.networkService.getNetworkStatus();
    const suitableForLarge = this.networkService.isSuitableForLargeTransfers();

    let syncInterval = 60000; // Default 1 minute

    if (suitableForLarge && networkStatus.connectionType === 'wifi') {
      syncInterval = 30000; // 30 seconds for WiFi
    } else if (networkStatus.connectionType === 'cellular') {
      syncInterval = 120000; // 2 minutes for cellular
    }

    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set new interval
    this.syncInterval = setInterval(async () => {
      await this.processSyncQueue();
    }, syncInterval);

    console.log(`[BackgroundSyncService] Scheduled sync interval: ${syncInterval}ms`);
  }

  /**
   * Queue operations for background sync
   */
  public queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const fullOperation: SyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
    };

    // Insert based on priority
    if (fullOperation.priority === 'high') {
      this.syncQueue.pending.unshift(fullOperation);
    } else {
      this.syncQueue.pending.push(fullOperation);
    }

    console.log(`[BackgroundSyncService] Queued operation ${fullOperation.id}`);
    return fullOperation.id;
  }

  /**
   * Queue conflict resolution
   */
  private queueConflictResolution(conflicts: any[]): void {
    for (const conflict of conflicts) {
      this.queueOperation({
        type: 'conflict_resolution',
        deviceId: conflict.deviceId,
        dataType: 'conflict',
        priority: 'high',
        maxRetries: 1,
        data: { conflicts: [conflict] },
      });
    }
  }

  /**
   * Get sync queue status
   */
  public getSyncStatus(): {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    totalQueued: number;
  } {
    return {
      pending: this.syncQueue.pending.length,
      inProgress: this.syncQueue.inProgress.length,
      completed: this.syncQueue.completed.length,
      failed: this.syncQueue.failed.length,
      totalQueued: this.syncQueue.pending.length + this.syncQueue.inProgress.length,
    };
  }

  /**
   * Clear completed and failed operations
   */
  public async clearHistory(): Promise<void> {
    this.syncQueue.completed = [];
    this.syncQueue.failed = [];
    await this.persistSyncQueue();
  }

  /**
   * Move operation to in-progress
   */
  private moveToInProgress(operation: SyncOperation): void {
    const index = this.syncQueue.pending.indexOf(operation);
    if (index > -1) {
      this.syncQueue.pending.splice(index, 1);
      this.syncQueue.inProgress.push(operation);
    }
  }

  /**
   * Move operation to completed
   */
  private moveToCompleted(operation: SyncOperation): void {
    const index = this.syncQueue.inProgress.indexOf(operation);
    if (index > -1) {
      this.syncQueue.inProgress.splice(index, 1);
      this.syncQueue.completed.push(operation);
    }
  }

  /**
   * Move operation from in-progress (back to pending or failed)
   */
  private moveFromInProgress(operation: SyncOperation): void {
    const index = this.syncQueue.inProgress.indexOf(operation);
    if (index > -1) {
      this.syncQueue.inProgress.splice(index, 1);
    }
  }

  /**
   * Persist sync queue to storage
   */
  private async persistSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        '@aura_sync_queue',
        JSON.stringify({
          pending: this.syncQueue.pending,
          failed: this.syncQueue.failed,
        })
      );
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to persist sync queue:', error);
    }
  }

  /**
   * Load sync queue from storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('@aura_sync_queue');
      if (queueData) {
        const parsed = JSON.parse(queueData);
        this.syncQueue.pending = parsed.pending || [];
        this.syncQueue.failed = parsed.failed || [];
        console.log(
          `[BackgroundSyncService] Loaded ${this.syncQueue.pending.length} pending operations`
        );
      }
    } catch (error) {
      console.error('[BackgroundSyncService] Failed to load sync queue:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Clear intervals and timeouts
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();

    // Stop background job
    if (this.isBackgroundJobActive) {
      BackgroundJob.stop({ jobKey: 'backgroundSync' });
      this.isBackgroundJobActive = false;
    }

    // Remove network listeners
    this.networkService.removeAllListeners();

    console.log('[BackgroundSyncService] Disposed successfully');
  }
}
