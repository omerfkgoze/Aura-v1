/**
 * Secure database connection manager with automatic cleanup
 * Handles SQLCipher database initialization, connection pooling, and lifecycle management
 */

import { SQLCipherManager, SQLCipherConfig } from './sqlite-cipher';
import * as SQLite from 'expo-sqlite';

export interface ConnectionConfig extends SQLCipherConfig {
  maxConnections?: number;
  connectionTimeoutMs?: number;
  idleTimeoutMs?: number;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
}

export interface DatabaseSchema {
  version: number;
  tables: TableSchema[];
  indexes: IndexSchema[];
  triggers?: TriggerSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  constraints?: string[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  constraints?: string;
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
}

export interface TriggerSchema {
  name: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  condition?: string;
  action: string;
}

/**
 * Connection pool entry with metadata
 */
interface PooledConnection {
  id: string;
  manager: SQLCipherManager;
  database: SQLite.SQLiteDatabase;
  createdAt: number;
  lastUsed: number;
  inUse: boolean;
}

/**
 * Database connection manager with encryption and security features
 */
export class DatabaseConnectionManager {
  private config: ConnectionConfig;
  private connectionPool: Map<string, PooledConnection> = new Map();
  private schema: DatabaseSchema | null = null;
  private initialized = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: ConnectionConfig) {
    this.config = {
      maxConnections: 5,
      connectionTimeoutMs: 30000,
      idleTimeoutMs: 300000, // 5 minutes
      enableWAL: true,
      enableForeignKeys: true,
      ...config,
    };
  }

  /**
   * Initialize database with schema and encryption
   */
  async initialize(schema: DatabaseSchema): Promise<void> {
    if (this.initialized) return;

    try {
      this.schema = schema;

      // Create initial connection
      const initialConnection = await this.createConnection();

      // Initialize schema
      await this.initializeSchema(initialConnection.database);

      // Configure database settings
      await this.configureDatabaseSettings(initialConnection.database);

      // Start cleanup interval
      this.startCleanupInterval();

      this.initialized = true;
      console.log('Database connection manager initialized successfully');
    } catch (error) {
      throw new Error(
        `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get database connection from pool or create new one
   */
  async getConnection(): Promise<SQLite.SQLiteDatabase> {
    if (!this.initialized) {
      throw new Error('Connection manager not initialized');
    }

    // Find available connection in pool
    for (const [id, connection] of this.connectionPool) {
      if (!connection.inUse) {
        connection.inUse = true;
        connection.lastUsed = Date.now();
        return connection.database;
      }
    }

    // Create new connection if pool not full
    if (this.connectionPool.size < this.config.maxConnections!) {
      const newConnection = await this.createConnection();
      return newConnection.database;
    }

    throw new Error('Connection pool exhausted');
  }

  /**
   * Release connection back to pool
   */
  async releaseConnection(database: SQLite.SQLiteDatabase): Promise<void> {
    for (const [id, connection] of this.connectionPool) {
      if (connection.database === database) {
        connection.inUse = false;
        connection.lastUsed = Date.now();
        return;
      }
    }
  }

  /**
   * Create new encrypted database connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create SQLCipher manager
    const manager = new SQLCipherManager(this.config);
    await manager.initialize();

    const database = manager.getDatabase();

    const connection: PooledConnection = {
      id: connectionId,
      manager,
      database,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: true,
    };

    this.connectionPool.set(connectionId, connection);
    return connection;
  }

  /**
   * Initialize database schema with encryption
   */
  private async initializeSchema(database: SQLite.SQLiteDatabase): Promise<void> {
    if (!this.schema) return;

    try {
      // Begin transaction for schema initialization
      await database.execAsync('BEGIN TRANSACTION');

      // Create tables
      for (const table of this.schema.tables) {
        const columns = table.columns
          .map(col => `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`)
          .join(', ');

        const constraints = table.constraints ? ', ' + table.constraints.join(', ') : '';

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS ${table.name} (
            ${columns}${constraints}
          )
        `;

        await database.execAsync(createTableSQL);
      }

      // Create indexes
      for (const index of this.schema.indexes) {
        const uniqueKeyword = index.unique ? 'UNIQUE ' : '';
        const createIndexSQL = `
          CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${index.name} 
          ON ${index.table} (${index.columns.join(', ')})
        `;

        await database.execAsync(createIndexSQL);
      }

      // Create triggers
      if (this.schema.triggers) {
        for (const trigger of this.schema.triggers) {
          const condition = trigger.condition ? `WHEN ${trigger.condition}` : '';
          const createTriggerSQL = `
            CREATE TRIGGER IF NOT EXISTS ${trigger.name}
            AFTER ${trigger.event} ON ${trigger.table}
            ${condition}
            BEGIN
              ${trigger.action};
            END
          `;

          await database.execAsync(createTriggerSQL);
        }
      }

      // Commit transaction
      await database.execAsync('COMMIT');

      console.log(`Schema v${this.schema.version} initialized successfully`);
    } catch (error) {
      await database.execAsync('ROLLBACK');
      throw new Error(
        `Schema initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Configure database performance and security settings
   */
  private async configureDatabaseSettings(database: SQLite.SQLiteDatabase): Promise<void> {
    const settings = [
      // Enable WAL mode for better performance
      ...(this.config.enableWAL ? ['PRAGMA journal_mode = WAL'] : []),

      // Enable foreign key constraints
      ...(this.config.enableForeignKeys ? ['PRAGMA foreign_keys = ON'] : []),

      // Set secure delete for complete data removal
      'PRAGMA secure_delete = ON',

      // Optimize for mobile devices
      'PRAGMA cache_size = -16384', // 16MB cache
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 134217728', // 128MB mmap

      // Security settings
      'PRAGMA auto_vacuum = FULL',
      'PRAGMA case_sensitive_like = ON',
    ];

    for (const setting of settings) {
      await database.execAsync(setting);
    }
  }

  /**
   * Execute query with automatic connection management
   */
  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    const database = await this.getConnection();

    try {
      const result = (await database.getAllAsync(query, params)) as T[];
      await this.releaseConnection(database);
      return result;
    } catch (error) {
      await this.releaseConnection(database);
      throw error;
    }
  }

  /**
   * Execute single row query
   */
  async executeQuerySingle<T = any>(query: string, params?: any[]): Promise<T | null> {
    const database = await this.getConnection();

    try {
      const result = (await database.getFirstAsync(query, params)) as T | null;
      await this.releaseConnection(database);
      return result;
    } catch (error) {
      await this.releaseConnection(database);
      throw error;
    }
  }

  /**
   * Execute non-query SQL (INSERT, UPDATE, DELETE)
   */
  async executeNonQuery(query: string, params?: any[]): Promise<SQLite.SQLiteRunResult> {
    const database = await this.getConnection();

    try {
      const result = await database.runAsync(query, params);
      await this.releaseConnection(database);
      return result;
    } catch (error) {
      await this.releaseConnection(database);
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async executeTransaction<T>(
    operations: (database: SQLite.SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    const database = await this.getConnection();

    try {
      await database.execAsync('BEGIN TRANSACTION');
      const result = await operations(database);
      await database.execAsync('COMMIT');
      await this.releaseConnection(database);
      return result;
    } catch (error) {
      await database.execAsync('ROLLBACK');
      await this.releaseConnection(database);
      throw error;
    }
  }

  /**
   * Start cleanup interval for idle connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Check every minute
  }

  /**
   * Cleanup idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const connectionsToClose: string[] = [];

    for (const [id, connection] of this.connectionPool) {
      if (!connection.inUse && now - connection.lastUsed > this.config.idleTimeoutMs!) {
        connectionsToClose.push(id);
      }
    }

    for (const id of connectionsToClose) {
      const connection = this.connectionPool.get(id);
      if (connection) {
        await connection.manager.close();
        this.connectionPool.delete(id);
      }
    }

    if (connectionsToClose.length > 0) {
      console.log(`Cleaned up ${connectionsToClose.length} idle connections`);
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): {
    total: number;
    inUse: number;
    idle: number;
    maxConnections: number;
  } {
    const total = this.connectionPool.size;
    const inUse = Array.from(this.connectionPool.values()).filter(c => c.inUse).length;

    return {
      total,
      inUse,
      idle: total - inUse,
      maxConnections: this.config.maxConnections!,
    };
  }

  /**
   * Validate all connections are healthy
   */
  async validateConnections(): Promise<boolean> {
    const validationPromises = Array.from(this.connectionPool.values()).map(async connection => {
      try {
        return await connection.manager.testConnection();
      } catch {
        return false;
      }
    });

    const results = await Promise.all(validationPromises);
    return results.every(result => result === true);
  }

  /**
   * Close all connections and cleanup resources
   */
  async close(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all connections
    for (const [id, connection] of this.connectionPool) {
      await connection.manager.close();
    }

    this.connectionPool.clear();
    this.initialized = false;

    console.log('Database connection manager closed');
  }
}
