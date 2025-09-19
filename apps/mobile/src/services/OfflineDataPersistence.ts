import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import SQLite from 'react-native-sqlite-storage';
import { EncryptedDataService } from './EncryptedDataService';

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  deviceId: string;
  conflictResolution?: 'last_write_wins' | 'merge' | 'manual';
}

interface SyncMetadata {
  lastSyncTimestamp: number;
  deviceLastSeen: { [deviceId: string]: number };
  conflictCount: number;
  totalOperations: number;
}

/**
 * Offline-first data persistence service with sync queue management
 * Ensures data integrity and consistency during offline periods
 */
export class OfflineDataPersistence {
  private encryptedService: EncryptedDataService;
  private db: SQLite.SQLiteDatabase | null = null;
  private operationQueue: OfflineOperation[] = [];
  private syncMetadata: SyncMetadata;
  private isInitialized: boolean = false;

  constructor(encryptedService: EncryptedDataService) {
    this.encryptedService = encryptedService;
    this.syncMetadata = {
      lastSyncTimestamp: 0,
      deviceLastSeen: {},
      conflictCount: 0,
      totalOperations: 0,
    };
  }

  /**
   * Initialize offline persistence with database setup
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize encrypted database connection
      await this.initializeDatabase();

      // Load operation queue from storage
      await this.loadOperationQueue();

      // Load sync metadata
      await this.loadSyncMetadata();

      // Setup offline operation tables
      await this.setupOfflineOperationTables();

      this.isInitialized = true;
      console.log('[OfflineDataPersistence] Initialized successfully');
    } catch (error) {
      console.error('[OfflineDataPersistence] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database with encryption
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      SQLite.openDatabase(
        {
          name: 'aura_offline.db',
          location: 'default',
          createFromLocation: '~aura_offline.db',
        },
        (database: any) => {
          this.db = database;
          console.log('[OfflineDataPersistence] Database opened successfully');
          resolve();
        },
        (error: any) => {
          console.error('[OfflineDataPersistence] Database open failed:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Setup tables for offline operation tracking
   */
  private async setupOfflineOperationTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createOfflineOpsTable = `
      CREATE TABLE IF NOT EXISTS offline_operations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        conflict_resolution TEXT,
        synced INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0
      );
    `;

    const createSyncMetadataTable = `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `;

    const createConflictLogTable = `
      CREATE TABLE IF NOT EXISTS conflict_log (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        resolved_by TEXT,
        resolution_strategy TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (operation_id) REFERENCES offline_operations (id)
      );
    `;

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        (tx: any) => {
          tx.executeSql(createOfflineOpsTable);
          tx.executeSql(createSyncMetadataTable);
          tx.executeSql(createConflictLogTable);
        },
        reject,
        resolve
      );
    });
  }

  /**
   * Store data with offline-first approach
   */
  public async storeData(
    table: string,
    data: any,
    operation: 'create' | 'update' | 'delete' = 'create'
  ): Promise<string> {
    try {
      // Generate operation ID
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Encrypt sensitive data before storage
      const encryptedData = await this.encryptedService.encrypt(JSON.stringify(data));

      // Store in encrypted local database first (offline-first)
      await this.storeLocalData(table, encryptedData, operationId);

      // Queue operation for sync when online
      const offlineOperation: OfflineOperation = {
        id: operationId,
        type: operation,
        table,
        data: encryptedData,
        timestamp: Date.now(),
        deviceId: await this.getDeviceId(),
        conflictResolution: 'last_write_wins',
      };

      await this.queueOfflineOperation(offlineOperation);

      console.log(`[OfflineDataPersistence] Stored data offline: ${operationId}`);
      return operationId;
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to store data:', error);
      throw error;
    }
  }

  /**
   * Retrieve data with fallback to local storage
   */
  public async retrieveData(table: string, id?: string): Promise<any[]> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      let query = `SELECT * FROM ${table}`;
      let params: any[] = [];

      if (id) {
        query += ' WHERE id = ?';
        params = [id];
      }

      query += ' ORDER BY timestamp DESC';

      return new Promise((resolve, reject) => {
        this.db!.transaction(tx => {
          tx.executeSql(
            query,
            params,
            async (_, result) => {
              const rows = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                try {
                  // Decrypt data before returning
                  const decryptedData = await this.encryptedService.decrypt(row.data);
                  rows.push({
                    ...JSON.parse(decryptedData),
                    id: row.id,
                    timestamp: row.timestamp,
                  });
                } catch (decryptError) {
                  console.error(
                    `[OfflineDataPersistence] Failed to decrypt row ${row.id}:`,
                    decryptError
                  );
                }
              }
              resolve(rows);
            },
            (_, error) => reject(error)
          );
        });
      });
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to retrieve data:', error);
      throw error;
    }
  }

  /**
   * Store data locally in SQLite
   */
  private async storeLocalData(
    table: string,
    encryptedData: string,
    operationId: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Ensure table exists
    await this.ensureTableExists(table);

    const insertQuery = `
      INSERT OR REPLACE INTO ${table} (id, data, timestamp, device_id)
      VALUES (?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          insertQuery,
          [operationId, encryptedData, Date.now(), this.getDeviceId()],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Ensure table exists for data storage
   */
  private async ensureTableExists(table: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        device_id TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        version INTEGER DEFAULT 1
      );
    `;

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          createTableQuery,
          [],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Queue offline operation for sync
   */
  private async queueOfflineOperation(operation: OfflineOperation): Promise<void> {
    try {
      // Add to in-memory queue
      this.operationQueue.push(operation);

      // Persist to database
      if (this.db) {
        const insertQuery = `
          INSERT INTO offline_operations 
          (id, type, table_name, data, timestamp, device_id, conflict_resolution)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
          this.db!.transaction(tx => {
            tx.executeSql(
              insertQuery,
              [
                operation.id,
                operation.type,
                operation.table,
                operation.data,
                operation.timestamp,
                operation.deviceId,
                operation.conflictResolution || 'last_write_wins',
              ],
              () => {
                this.syncMetadata.totalOperations++;
                resolve();
              },
              (_, error) => reject(error)
            );
          });
        });
      }

      // Also persist to AsyncStorage as backup
      await this.persistOperationQueueToStorage();
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to queue operation:', error);
      throw error;
    }
  }

  /**
   * Get pending operations for sync
   */
  public async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) return this.operationQueue.filter(op => !op.conflictResolution);

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM offline_operations WHERE synced = 0 ORDER BY timestamp ASC',
          [],
          (_, result) => {
            const operations: OfflineOperation[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              operations.push({
                id: row.id,
                type: row.type,
                table: row.table_name,
                data: row.data,
                timestamp: row.timestamp,
                deviceId: row.device_id,
                conflictResolution: row.conflict_resolution,
              });
            }
            resolve(operations);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Mark operation as synced
   */
  public async markOperationSynced(operationId: string): Promise<void> {
    if (!this.db) {
      // Remove from in-memory queue
      this.operationQueue = this.operationQueue.filter(op => op.id !== operationId);
      await this.persistOperationQueueToStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'UPDATE offline_operations SET synced = 1 WHERE id = ?',
          [operationId],
          () => {
            console.log(`[OfflineDataPersistence] Marked operation ${operationId} as synced`);
            resolve();
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Handle sync conflicts
   */
  public async handleSyncConflict(
    localOperation: OfflineOperation,
    remoteOperation: any,
    resolutionStrategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual'
  ): Promise<void> {
    try {
      const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Log conflict for audit trail
      await this.logConflict(conflictId, localOperation.id, resolutionStrategy);

      switch (resolutionStrategy) {
        case 'local_wins':
          // Keep local operation, ignore remote
          console.log(
            `[OfflineDataPersistence] Conflict resolved: local wins for ${localOperation.id}`
          );
          break;

        case 'remote_wins':
          // Apply remote operation, mark local as resolved
          await this.applyRemoteOperation(remoteOperation);
          await this.markOperationSynced(localOperation.id);
          console.log(
            `[OfflineDataPersistence] Conflict resolved: remote wins for ${localOperation.id}`
          );
          break;

        case 'merge':
          // Attempt automatic merge
          const mergedData = await this.mergeOperations(localOperation, remoteOperation);
          await this.storeData(localOperation.table, mergedData, 'update');
          await this.markOperationSynced(localOperation.id);
          console.log(
            `[OfflineDataPersistence] Conflict resolved: merged for ${localOperation.id}`
          );
          break;

        case 'manual':
          // Requires user intervention
          console.log(
            `[OfflineDataPersistence] Conflict requires manual resolution: ${localOperation.id}`
          );
          throw new Error('Manual conflict resolution required');
      }

      this.syncMetadata.conflictCount++;
      await this.persistSyncMetadata();
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to handle sync conflict:', error);
      throw error;
    }
  }

  /**
   * Apply remote operation to local storage
   */
  private async applyRemoteOperation(remoteOperation: any): Promise<void> {
    // Decrypt and apply remote data
    const decryptedData = JSON.parse(remoteOperation.data);
    await this.storeLocalData(remoteOperation.table, remoteOperation.data, remoteOperation.id);
  }

  /**
   * Merge two conflicting operations
   */
  private async mergeOperations(local: OfflineOperation, remote: any): Promise<any> {
    try {
      const localData = JSON.parse(await this.encryptedService.decrypt(local.data));
      const remoteData = JSON.parse(remote.data);

      // Simple merge strategy: take most recent field values
      const merged = { ...localData };

      for (const [key, value] of Object.entries(remoteData)) {
        if (key === 'timestamp' || key === 'version') continue;

        // Take remote value if it's more recent or local doesn't have it
        if (!merged[key] || remoteData.timestamp > localData.timestamp) {
          merged[key] = value;
        }
      }

      // Update metadata
      merged.timestamp = Math.max(localData.timestamp, remoteData.timestamp);
      merged.version = Math.max(localData.version || 1, remoteData.version || 1) + 1;

      return merged;
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to merge operations:', error);
      throw error;
    }
  }

  /**
   * Log conflict for audit trail
   */
  private async logConflict(
    conflictId: string,
    operationId: string,
    resolutionStrategy: string
  ): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          `INSERT INTO conflict_log 
           (id, operation_id, conflict_type, resolution_strategy, timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [conflictId, operationId, 'sync_conflict', resolutionStrategy, Date.now()],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  }

  /**
   * Get offline data statistics
   */
  public getOfflineStats(): {
    pendingOperations: number;
    totalOperations: number;
    conflictCount: number;
    lastSync: number;
    storageSize: number;
  } {
    return {
      pendingOperations: this.operationQueue.length,
      totalOperations: this.syncMetadata.totalOperations,
      conflictCount: this.syncMetadata.conflictCount,
      lastSync: this.syncMetadata.lastSyncTimestamp,
      storageSize: 0, // TODO: Calculate actual storage size
    };
  }

  /**
   * Cleanup old operations and logs
   */
  public async cleanup(olderThanDays: number = 30): Promise<void> {
    if (!this.db) return;

    const cutoffTimestamp = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      this.db!.transaction(
        tx => {
          // Clean up synced operations older than cutoff
          tx.executeSql('DELETE FROM offline_operations WHERE synced = 1 AND timestamp < ?', [
            cutoffTimestamp,
          ]);

          // Clean up old conflict logs
          tx.executeSql('DELETE FROM conflict_log WHERE timestamp < ?', [cutoffTimestamp]);
        },
        reject,
        () => {
          console.log(
            `[OfflineDataPersistence] Cleaned up operations older than ${olderThanDays} days`
          );
          resolve();
        }
      );
    });
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('@aura_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('@aura_device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Persist operation queue to AsyncStorage
   */
  private async persistOperationQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('@aura_operation_queue', JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to persist operation queue:', error);
    }
  }

  /**
   * Load operation queue from AsyncStorage
   */
  private async loadOperationQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('@aura_operation_queue');
      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
        console.log(
          `[OfflineDataPersistence] Loaded ${this.operationQueue.length} operations from storage`
        );
      }
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to load operation queue:', error);
    }
  }

  /**
   * Persist sync metadata
   */
  private async persistSyncMetadata(): Promise<void> {
    try {
      await AsyncStorage.setItem('@aura_sync_metadata', JSON.stringify(this.syncMetadata));
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to persist sync metadata:', error);
    }
  }

  /**
   * Load sync metadata
   */
  private async loadSyncMetadata(): Promise<void> {
    try {
      const metadataString = await AsyncStorage.getItem('@aura_sync_metadata');
      if (metadataString) {
        this.syncMetadata = { ...this.syncMetadata, ...JSON.parse(metadataString) };
        console.log('[OfflineDataPersistence] Loaded sync metadata from storage');
      }
    } catch (error) {
      console.error('[OfflineDataPersistence] Failed to load sync metadata:', error);
    }
  }

  /**
   * Dispose and cleanup resources
   */
  public async dispose(): Promise<void> {
    // Persist any pending data
    await this.persistOperationQueueToStorage();
    await this.persistSyncMetadata();

    // Close database connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[OfflineDataPersistence] Disposed successfully');
  }
}
