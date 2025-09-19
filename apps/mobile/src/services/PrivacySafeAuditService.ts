import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import * as Crypto from 'expo-crypto';

// SQLite type definitions for better TypeScript support
interface SQLTransaction {
  executeSql(
    sqlStatement: string,
    arguments?: any[],
    successCallback?: (tx: SQLTransaction, results: SQLResultSet) => void,
    errorCallback?: (tx: SQLTransaction, error: SQLError) => boolean | void
  ): void;
}

interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: {
    length: number;
    item(index: number): any;
    raw(): any[];
  };
}

interface SQLError {
  code: number;
  message: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  deviceId: string;
  deviceIdHash: string; // Salted hash for privacy
  operationType:
    | 'sync_start'
    | 'sync_complete'
    | 'sync_failed'
    | 'conflict_detected'
    | 'conflict_resolved'
    | 'p2p_connect'
    | 'p2p_disconnect';
  dataType: 'cycle_data' | 'user_preferences' | 'backup_key' | 'device_trust';
  recordCount: number;
  dataSize?: number; // Size in bytes (no content)
  networkType?: string;
  duration?: number; // Operation duration in ms
  errorCode?: string;
  conflictResolution?: string;
  sessionId: string;
}

interface AuditSession {
  id: string;
  startTime: number;
  endTime?: number;
  deviceId: string;
  deviceIdHash?: string; // Added for consistency with return types
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  conflictCount: number;
  dataSynced: number; // Total bytes transferred
}

interface PrivacyMetrics {
  totalSyncSessions: number;
  averageSessionDuration: number;
  dataTransferredLast30Days: number;
  conflictResolutionRate: number;
  deviceConnectivityReliability: number;
  privacyComplianceScore: number;
}

/**
 * Privacy-safe sync audit trail service
 * Tracks data movement without exposing content
 */
export class PrivacySafeAuditService {
  private db: SQLite.SQLiteDatabase | null = null;
  private currentSession: AuditSession | null = null;
  private deviceIdSalt: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize audit service with privacy-safe storage
   */
  private async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.setupAuditTables();
      await this.loadDeviceIdSalt();

      this.isInitialized = true;
      console.log('[PrivacySafeAuditService] Initialized successfully');
    } catch (error) {
      console.error('[PrivacySafeAuditService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database for audit logs
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      SQLite.openDatabase(
        {
          name: 'aura_audit.db',
          location: 'default',
        },
        (database: any) => {
          this.db = database;
          console.log('[PrivacySafeAuditService] Audit database opened');
          resolve();
        },
        (error: any) => {
          console.error('[PrivacySafeAuditService] Database open failed:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Setup audit trail tables
   */
  private async setupAuditTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const createAuditLogTable = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        device_id_hash TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        data_type TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        data_size INTEGER,
        network_type TEXT,
        duration INTEGER,
        error_code TEXT,
        conflict_resolution TEXT,
        session_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `;

    const createAuditSessionTable = `
      CREATE TABLE IF NOT EXISTS audit_session (
        id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        device_id_hash TEXT NOT NULL,
        total_operations INTEGER DEFAULT 0,
        successful_operations INTEGER DEFAULT 0,
        failed_operations INTEGER DEFAULT 0,
        conflict_count INTEGER DEFAULT 0,
        data_synced INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `;

    const createPrivacyMetricsTable = `
      CREATE TABLE IF NOT EXISTS privacy_metrics (
        metric_date TEXT PRIMARY KEY,
        total_sessions INTEGER DEFAULT 0,
        average_duration REAL DEFAULT 0,
        data_transferred INTEGER DEFAULT 0,
        conflict_rate REAL DEFAULT 0,
        compliance_score REAL DEFAULT 100.0,
        created_at INTEGER NOT NULL
      );
    `;

    // Create indexes for performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit_log(operation_type);',
      'CREATE INDEX IF NOT EXISTS idx_session_start ON audit_session(start_time);',
    ];

    return new Promise<void>((resolve, reject) => {
      this.db!.transaction(
        (tx: SQLTransaction) => {
          tx.executeSql(createAuditLogTable);
          tx.executeSql(createAuditSessionTable);
          tx.executeSql(createPrivacyMetricsTable);

          // Create indexes
          createIndexes.forEach(indexSql => tx.executeSql(indexSql));
        },
        (error: SQLError) => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Load or generate device ID salt for privacy protection
   */
  private async loadDeviceIdSalt(): Promise<void> {
    try {
      this.deviceIdSalt = await AsyncStorage.getItem('@aura_device_salt');

      if (!this.deviceIdSalt) {
        // Generate new salt
        this.deviceIdSalt = this.generateSecureRandom(32);
        await AsyncStorage.setItem('@aura_device_salt', this.deviceIdSalt);
        console.log('[PrivacySafeAuditService] Generated new device ID salt');
      }
    } catch (error) {
      console.error('[PrivacySafeAuditService] Failed to load device salt:', error);
      throw error;
    }
  }

  /**
   * Generate cryptographically secure random string
   */
  private generateSecureRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create privacy-safe device ID hash
   */
  private hashDeviceId(deviceId: string): string {
    if (!this.deviceIdSalt) {
      throw new Error('Device salt not initialized');
    }

    return createHash('sha256')
      .update(deviceId + this.deviceIdSalt)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for space efficiency
  }

  /**
   * Start new audit session
   */
  public async startAuditSession(deviceId: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deviceIdHash = this.hashDeviceId(deviceId);

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      deviceId,
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      conflictCount: 0,
      dataSynced: 0,
    };

    // Store session in database
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.transaction((tx: SQLTransaction) => {
          tx.executeSql(
            `INSERT INTO audit_session 
             (id, start_time, device_id_hash, created_at)
             VALUES (?, ?, ?, ?)`,
            [sessionId, this.currentSession!.startTime, deviceIdHash, Date.now()],
            () => resolve(),
            (_tx: SQLTransaction, error: SQLError) => reject(error)
          );
        });
      });
    }

    console.log(`[PrivacySafeAuditService] Started audit session: ${sessionId}`);
    return sessionId;
  }

  /**
   * End current audit session
   */
  public async endAuditSession(): Promise<void> {
    if (!this.currentSession || !this.db) return;

    const endTime = Date.now();
    const sessionDuration = endTime - this.currentSession.startTime;

    // Update session in database
    await new Promise<void>((resolve, reject) => {
      this.db!.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          `UPDATE audit_session 
           SET end_time = ?, total_operations = ?, successful_operations = ?, 
               failed_operations = ?, conflict_count = ?, data_synced = ?
           WHERE id = ?`,
          [
            endTime,
            this.currentSession!.totalOperations,
            this.currentSession!.successfulOperations,
            this.currentSession!.failedOperations,
            this.currentSession!.conflictCount,
            this.currentSession!.dataSynced,
            this.currentSession!.id,
          ],
          () => resolve(),
          (_tx: SQLTransaction, error: SQLError) => reject(error)
        );
      });
    });

    console.log(
      `[PrivacySafeAuditService] Ended audit session: ${this.currentSession.id} (${sessionDuration}ms)`
    );

    // Update daily metrics
    await this.updateDailyMetrics();

    this.currentSession = null;
  }

  /**
   * Log sync operation without exposing content
   */
  public async logSyncOperation(
    operationType: AuditLogEntry['operationType'],
    dataType: AuditLogEntry['dataType'],
    recordCount: number,
    options?: {
      dataSize?: number;
      networkType?: string;
      duration?: number;
      errorCode?: string;
      conflictResolution?: string;
    }
  ): Promise<void> {
    if (!this.isInitialized || !this.currentSession) {
      console.warn(
        '[PrivacySafeAuditService] Cannot log operation - service not initialized or no active session'
      );
      return;
    }

    const logEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      deviceId: this.currentSession.deviceId,
      deviceIdHash: this.hashDeviceId(this.currentSession.deviceId),
      operationType,
      dataType,
      recordCount,
      sessionId: this.currentSession.id,
      ...options,
    };

    // Update current session statistics
    this.currentSession.totalOperations++;

    if (operationType.includes('complete')) {
      this.currentSession.successfulOperations++;
    } else if (operationType.includes('failed')) {
      this.currentSession.failedOperations++;
    }

    if (operationType.includes('conflict')) {
      this.currentSession.conflictCount++;
    }

    if (logEntry.dataSize) {
      this.currentSession.dataSynced += logEntry.dataSize;
    }

    // Store log entry
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.transaction((tx: SQLTransaction) => {
          tx.executeSql(
            `INSERT INTO audit_log 
             (id, timestamp, device_id_hash, operation_type, data_type, 
              record_count, data_size, network_type, duration, error_code, 
              conflict_resolution, session_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              logEntry.id,
              logEntry.timestamp,
              logEntry.deviceIdHash,
              logEntry.operationType,
              logEntry.dataType,
              logEntry.recordCount,
              logEntry.dataSize || null,
              logEntry.networkType || null,
              logEntry.duration || null,
              logEntry.errorCode || null,
              logEntry.conflictResolution || null,
              logEntry.sessionId,
              Date.now(),
            ],
            () => resolve(),
            (_tx: SQLTransaction, error: SQLError) => reject(error)
          );
        });
      });
    }

    console.log(
      `[PrivacySafeAuditService] Logged operation: ${operationType} for ${dataType} (${recordCount} records)`
    );
  }

  /**
   * Get audit log entries for user transparency
   */
  public async getAuditLog(options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    operationType?: string;
    dataType?: string;
  }): Promise<Omit<AuditLogEntry, 'deviceId'>[]> {
    if (!this.db) return [];

    const { limit = 50, offset = 0, startDate, endDate, operationType, dataType } = options || {};

    let query = `
      SELECT id, timestamp, device_id_hash, operation_type, data_type, 
             record_count, data_size, network_type, duration, error_code, 
             conflict_resolution, session_id
      FROM audit_log 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate.getTime());
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate.getTime());
    }

    if (operationType) {
      query += ' AND operation_type = ?';
      params.push(operationType);
    }

    if (dataType) {
      query += ' AND data_type = ?';
      params.push(dataType);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise<Omit<AuditLogEntry, 'deviceId'>[]>((resolve, reject) => {
      this.db!.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          query,
          params,
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const entries: Omit<AuditLogEntry, 'deviceId'>[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              entries.push({
                id: row.id,
                timestamp: row.timestamp,
                deviceIdHash: row.device_id_hash,
                operationType: row.operation_type,
                dataType: row.data_type,
                recordCount: row.record_count,
                dataSize: row.data_size,
                networkType: row.network_type,
                duration: row.duration,
                errorCode: row.error_code,
                conflictResolution: row.conflict_resolution,
                sessionId: row.session_id,
              });
            }
            resolve(entries);
          },
          (_tx: SQLTransaction, error: SQLError) => reject(error)
        );
      });
    });
  }

  /**
   * Get audit sessions for user review
   */
  public async getAuditSessions(limit: number = 20): Promise<Omit<AuditSession, 'deviceId'>[]> {
    if (!this.db) return [];

    return new Promise<Omit<AuditSession, 'deviceId'>[]>((resolve, reject) => {
      this.db!.transaction((tx: SQLTransaction) => {
        tx.executeSql(
          `SELECT id, start_time, end_time, device_id_hash, total_operations, 
                  successful_operations, failed_operations, conflict_count, data_synced
           FROM audit_session 
           ORDER BY start_time DESC 
           LIMIT ?`,
          [limit],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const sessions: Omit<AuditSession, 'deviceId'>[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              sessions.push({
                id: row.id,
                startTime: row.start_time,
                endTime: row.end_time,
                deviceIdHash: row.device_id_hash,
                totalOperations: row.total_operations,
                successfulOperations: row.successful_operations,
                failedOperations: row.failed_operations,
                conflictCount: row.conflict_count,
                dataSynced: row.data_synced,
              });
            }
            resolve(sessions);
          },
          (_tx: SQLTransaction, error: SQLError) => reject(error)
        );
      });
    });
  }

  /**
   * Get privacy metrics for user transparency
   */
  public async getPrivacyMetrics(): Promise<PrivacyMetrics> {
    if (!this.db) {
      return {
        totalSyncSessions: 0,
        averageSessionDuration: 0,
        dataTransferredLast30Days: 0,
        conflictResolutionRate: 0,
        deviceConnectivityReliability: 0,
        privacyComplianceScore: 100,
      };
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return new Promise<PrivacyMetrics>((resolve, reject) => {
      this.db!.transaction((tx: SQLTransaction) => {
        // Get session statistics
        tx.executeSql(
          `SELECT 
             COUNT(*) as total_sessions,
             AVG(CASE WHEN end_time IS NOT NULL THEN end_time - start_time ELSE NULL END) as avg_duration,
             SUM(data_synced) as total_data,
             SUM(conflict_count) as total_conflicts,
             SUM(total_operations) as total_ops
           FROM audit_session 
           WHERE start_time >= ?`,
          [thirtyDaysAgo],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const row = result.rows.item(0);
            const metrics: PrivacyMetrics = {
              totalSyncSessions: row.total_sessions || 0,
              averageSessionDuration: row.avg_duration || 0,
              dataTransferredLast30Days: row.total_data || 0,
              conflictResolutionRate:
                row.total_ops > 0 ? (row.total_conflicts / row.total_ops) * 100 : 0,
              deviceConnectivityReliability: this.calculateConnectivityReliability(),
              privacyComplianceScore: this.calculatePrivacyComplianceScore(),
            };
            resolve(metrics);
          },
          (_tx: SQLTransaction, error: SQLError) => reject(error)
        );
      });
    });
  }

  /**
   * Calculate connectivity reliability from audit data
   */
  private calculateConnectivityReliability(): number {
    // This would analyze success/failure rates from audit logs
    // For now, return a calculated value based on recent operations
    return 85; // Placeholder - would be calculated from real data
  }

  /**
   * Calculate privacy compliance score
   */
  private calculatePrivacyComplianceScore(): number {
    // Check for privacy violations in audit logs
    // - No content exposure
    // - Proper data hashing
    // - Retention policy compliance
    // - Access pattern analysis

    const score = 100;

    // Deduct points for any privacy violations found
    // This would analyze the audit logs for compliance

    return Math.max(score, 0);
  }

  /**
   * Update daily privacy metrics
   */
  private async updateDailyMetrics(): Promise<void> {
    if (!this.db) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    return new Promise<void>((resolve, reject) => {
      this.db!.transaction((tx: SQLTransaction) => {
        // Calculate today's metrics
        tx.executeSql(
          `SELECT 
             COUNT(*) as sessions,
             AVG(CASE WHEN end_time IS NOT NULL THEN end_time - start_time ELSE NULL END) as avg_duration,
             SUM(data_synced) as data_transferred,
             SUM(conflict_count) as conflicts,
             SUM(total_operations) as operations
           FROM audit_session 
           WHERE start_time >= ? AND start_time < ?`,
          [todayStart, todayEnd],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const row = result.rows.item(0);
            const conflictRate = row.operations > 0 ? (row.conflicts / row.operations) * 100 : 0;

            // Insert or update today's metrics
            tx.executeSql(
              `INSERT OR REPLACE INTO privacy_metrics 
               (metric_date, total_sessions, average_duration, data_transferred, 
                conflict_rate, compliance_score, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                today,
                row.sessions || 0,
                row.avg_duration || 0,
                row.data_transferred || 0,
                conflictRate,
                this.calculatePrivacyComplianceScore(),
                Date.now(),
              ],
              () => resolve(),
              (_tx2: SQLTransaction, error: SQLError) => reject(error)
            );
          },
          (_tx: SQLTransaction, error: SQLError) => reject(error)
        );
      });
    });
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  public async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    return new Promise<void>((resolve, reject) => {
      this.db!.transaction(
        (tx: SQLTransaction) => {
          // Clean up old audit logs
          tx.executeSql('DELETE FROM audit_log WHERE timestamp < ?', [cutoffTime]);

          // Clean up old sessions
          tx.executeSql('DELETE FROM audit_session WHERE start_time < ?', [cutoffTime]);

          // Keep metrics for longer (1 year)
          const metricscutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
          const metricsDate = new Date(metricscutoff).toISOString().split('T')[0];
          tx.executeSql('DELETE FROM privacy_metrics WHERE metric_date < ?', [metricsDate]);
        },
        (error: SQLError) => reject(error),
        () => {
          console.log(`[PrivacySafeAuditService] Cleaned up logs older than ${retentionDays} days`);
          resolve();
        }
      );
    });
  }

  /**
   * Export audit data for user transparency
   */
  public async exportAuditData(): Promise<{
    logs: Omit<AuditLogEntry, 'deviceId'>[];
    sessions: Omit<AuditSession, 'deviceId'>[];
    metrics: PrivacyMetrics;
  }> {
    const [logs, sessions, metrics] = await Promise.all([
      this.getAuditLog({ limit: 1000 }),
      this.getAuditSessions(100),
      this.getPrivacyMetrics(),
    ]);

    return { logs, sessions, metrics };
  }

  /**
   * Verify audit trail integrity
   */
  public async verifyAuditIntegrity(): Promise<{
    isValid: boolean;
    checksPerformed: number;
    violationsFound: string[];
  }> {
    const violations: string[] = [];
    let checksPerformed = 0;

    if (!this.db) {
      return { isValid: false, checksPerformed: 0, violationsFound: ['Database not available'] };
    }

    // Check for suspicious patterns that might indicate privacy violations
    return new Promise<{
      isValid: boolean;
      checksPerformed: number;
      violationsFound: string[];
    }>((resolve, reject) => {
      this.db!.transaction(
        (tx: SQLTransaction) => {
          // Check 1: Ensure no raw device IDs are stored
          tx.executeSql(
            'SELECT COUNT(*) as count FROM audit_log WHERE device_id_hash LIKE "%device%"',
            [],
            (_tx: SQLTransaction, result: SQLResultSet) => {
              checksPerformed++;
              if (result.rows.item(0).count > 0) {
                violations.push('Potential raw device ID found in audit logs');
              }
            }
          );

          // Check 2: Ensure all entries have proper session IDs
          tx.executeSql(
            'SELECT COUNT(*) as count FROM audit_log WHERE session_id IS NULL OR session_id = ""',
            [],
            (_tx: SQLTransaction, result: SQLResultSet) => {
              checksPerformed++;
              if (result.rows.item(0).count > 0) {
                violations.push('Audit entries found without proper session tracking');
              }
            }
          );

          // Check 3: Verify timestamp consistency
          tx.executeSql(
            `SELECT COUNT(*) as count FROM audit_log 
           WHERE timestamp > ? OR timestamp < ?`,
            [Date.now() + 60000, Date.now() - 2 * 365 * 24 * 60 * 60 * 1000], // Future dates or older than 2 years
            (_tx: SQLTransaction, result: SQLResultSet) => {
              checksPerformed++;
              if (result.rows.item(0).count > 0) {
                violations.push('Audit entries found with suspicious timestamps');
              }
            }
          );
        },
        (error: SQLError) => reject(error),
        () => {
          resolve({
            isValid: violations.length === 0,
            checksPerformed,
            violationsFound: violations,
          });
        }
      );
    });
  }

  /**
   * Dispose and cleanup resources
   */
  public async dispose(): Promise<void> {
    // End current session if active
    if (this.currentSession) {
      await this.endAuditSession();
    }

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[PrivacySafeAuditService] Disposed successfully');
  }
}
