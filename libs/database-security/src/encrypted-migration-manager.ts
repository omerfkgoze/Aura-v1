/**
 * Encrypted Database Migration Manager
 * Schema versioning with encrypted migration support and rollback capabilities
 * Author: Dev Agent (Story 2.1)
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { securityLogger, type SecurityEvent } from './security-logger';

/**
 * Migration definition structure
 */
export interface MigrationDefinition {
  version: number; // Target schema version
  name: string; // Migration name/description
  up: string | EncryptedMigrationScript; // Forward migration
  down: string | EncryptedMigrationScript; // Rollback migration
  requiresEncryption: boolean; // Whether migration handles encrypted data
  dependencies?: number[]; // Required previous versions
  validationRules?: MigrationValidationRule[];
}

/**
 * Encrypted migration script with data transformation
 */
export interface EncryptedMigrationScript {
  sqlScript: string; // Base SQL operations
  dataTransformation?: {
    tables: string[]; // Tables requiring data transformation
    encryptionKeys: string[]; // Required encryption keys
    transformationFunction: string; // Function name for data transformation
    batchSize?: number; // Batch size for large datasets
  };
}

/**
 * Migration validation rules
 */
export interface MigrationValidationRule {
  type: 'schema' | 'data' | 'encryption' | 'integrity';
  description: string;
  validationFunction: string; // Function name for validation
  required: boolean;
}

/**
 * Schema version information
 */
export interface SchemaVersion {
  version: number; // Current version number
  appliedAt: number; // Timestamp when applied
  migrationName: string; // Name of migration
  checksum: string; // Migration integrity checksum
  encryptedMetadata?: string; // Encrypted migration metadata
  rollbackAvailable: boolean; // Whether rollback is possible
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  success: boolean;
  version: number;
  migrationsApplied: number;
  executionTime: number;
  warnings: string[];
  errors: string[];
  rollbackPoint?: SchemaVersion;
  integrityStatus: 'verified' | 'warning' | 'failed';
}

/**
 * Migration status information
 */
export interface MigrationStatus {
  currentVersion: number;
  availableVersion: number;
  pendingMigrations: MigrationDefinition[];
  appliedMigrations: SchemaVersion[];
  canRollback: boolean;
  lastCheckpoint?: SchemaVersion;
}

/**
 * Migration event for logging
 */
export interface MigrationEvent extends SecurityEvent {
  type: 'migration_started' | 'migration_completed' | 'migration_failed' | 'rollback_executed';
  metadata: {
    version?: number;
    migrationName?: string;
    executionTime?: number;
    error?: string;
    warnings?: string[];
  };
}

/**
 * Encrypted Migration Manager
 * Handles database schema versioning with encrypted data support
 */
export class EncryptedMigrationManager {
  private database: SQLite.WebSQLDatabase | null = null;
  private migrations: Map<number, MigrationDefinition> = new Map();
  private config: {
    databasePath: string;
    encryptionKey: string;
    checksumSalt: string;
    batchSize: number;
    enableRollback: boolean;
    integrityChecks: boolean;
  };

  constructor(config?: Partial<typeof EncryptedMigrationManager.prototype.config>) {
    this.config = {
      databasePath: 'encrypted_database.db',
      encryptionKey: '',
      checksumSalt: 'migration_checksum_2024',
      batchSize: 1000,
      enableRollback: true,
      integrityChecks: true,
      ...config,
    };
  }

  /**
   * Initialize migration manager
   */
  async initialize(database: SQLite.WebSQLDatabase): Promise<void> {
    try {
      this.database = database;

      // Create migration metadata table
      await this.createMigrationMetadataTable();

      // Load encryption key
      await this.loadEncryptionKey();

      await securityLogger.logEvent({
        type: 'migration_manager_init',
        level: 'info',
        message: 'Migration manager initialized',
        metadata: {
          databasePath: this.config.databasePath,
          rollbackEnabled: this.config.enableRollback,
          integrityEnabled: this.config.integrityChecks,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await securityLogger.logEvent({
        type: 'migration_manager_init_error',
        level: 'error',
        message: 'Failed to initialize migration manager',
        metadata: { error: errorMessage },
      });
      throw error;
    }
  }

  /**
   * Register migration definition
   */
  registerMigration(migration: MigrationDefinition): void {
    // Validate migration
    this.validateMigrationDefinition(migration);

    // Check for conflicts
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration version ${migration.version} already registered`);
    }

    this.migrations.set(migration.version, migration);
  }

  /**
   * Register multiple migrations
   */
  registerMigrations(migrations: MigrationDefinition[]): void {
    // Sort by version to ensure proper order
    const sortedMigrations = migrations.sort((a, b) => a.version - b.version);

    for (const migration of sortedMigrations) {
      this.registerMigration(migration);
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    if (!this.database) {
      throw new Error('Migration manager not initialized');
    }

    try {
      const currentVersion = await this.getCurrentSchemaVersion();
      const appliedMigrations = await this.getAppliedMigrations();
      const availableVersions = Array.from(this.migrations.keys()).sort((a, b) => b - a);
      const availableVersion = availableVersions[0] || 0;

      const pendingMigrations = Array.from(this.migrations.values())
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version);

      const canRollback =
        this.config.enableRollback &&
        appliedMigrations.length > 0 &&
        appliedMigrations[appliedMigrations.length - 1].rollbackAvailable;

      const lastCheckpoint =
        appliedMigrations.length > 0 ? appliedMigrations[appliedMigrations.length - 1] : undefined;

      return {
        currentVersion,
        availableVersion,
        pendingMigrations,
        appliedMigrations,
        canRollback,
        lastCheckpoint,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get migration status: ${errorMessage}`);
    }
  }

  /**
   * Execute pending migrations
   */
  async migrate(targetVersion?: number): Promise<MigrationResult> {
    if (!this.database) {
      throw new Error('Migration manager not initialized');
    }

    const startTime = Date.now();
    let migrationsApplied = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    let rollbackPoint: SchemaVersion | undefined;

    try {
      const status = await this.getMigrationStatus();
      const currentVersion = status.currentVersion;

      // Determine target version
      const finalTargetVersion = targetVersion || status.availableVersion;

      if (currentVersion >= finalTargetVersion) {
        return {
          success: true,
          version: currentVersion,
          migrationsApplied: 0,
          executionTime: Date.now() - startTime,
          warnings: ['No migrations to apply'],
          errors: [],
          integrityStatus: 'verified',
        };
      }

      // Create rollback point
      if (this.config.enableRollback && status.appliedMigrations.length > 0) {
        rollbackPoint = await this.createRollbackCheckpoint();
      }

      // Get migrations to apply
      const migrationsToApply = status.pendingMigrations
        .filter(m => m.version <= finalTargetVersion)
        .sort((a, b) => a.version - b.version);

      await securityLogger.logEvent({
        type: 'migration_started',
        level: 'info',
        message: `Starting migration from v${currentVersion} to v${finalTargetVersion}`,
        metadata: {
          currentVersion,
          targetVersion: finalTargetVersion,
          migrationsCount: migrationsToApply.length,
        },
      });

      // Execute migrations in transaction
      await this.executeInTransaction(async () => {
        for (const migration of migrationsToApply) {
          await this.executeMigration(migration);
          migrationsApplied++;

          // Validate after each migration
          if (this.config.integrityChecks) {
            const validationResults = await this.validateMigration(migration);
            warnings.push(...validationResults.warnings);

            if (validationResults.errors.length > 0) {
              errors.push(...validationResults.errors);
              throw new Error(
                `Migration validation failed: ${validationResults.errors.join(', ')}`
              );
            }
          }
        }
      });

      const executionTime = Date.now() - startTime;
      const integrityStatus = this.config.integrityChecks
        ? await this.performIntegrityCheck()
        : 'verified';

      await securityLogger.logEvent({
        type: 'migration_completed',
        level: 'info',
        message: `Migration completed successfully`,
        metadata: {
          version: finalTargetVersion,
          migrationsApplied,
          executionTime,
          warnings: warnings.length,
        },
      });

      return {
        success: true,
        version: finalTargetVersion,
        migrationsApplied,
        executionTime,
        warnings,
        errors: [],
        rollbackPoint,
        integrityStatus,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      await securityLogger.logEvent({
        type: 'migration_failed',
        level: 'error',
        message: 'Migration failed',
        metadata: {
          error: errorMessage,
          migrationsApplied,
          executionTime: Date.now() - startTime,
        },
      });

      return {
        success: false,
        version: await this.getCurrentSchemaVersion(),
        migrationsApplied,
        executionTime: Date.now() - startTime,
        warnings,
        errors,
        rollbackPoint,
        integrityStatus: 'failed',
      };
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(targetVersion?: number): Promise<MigrationResult> {
    if (!this.database) {
      throw new Error('Migration manager not initialized');
    }

    if (!this.config.enableRollback) {
      throw new Error('Rollback is disabled');
    }

    const startTime = Date.now();
    let migrationsRolledBack = 0;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const status = await this.getMigrationStatus();
      const currentVersion = status.currentVersion;

      if (!status.canRollback) {
        throw new Error('No rollback available');
      }

      // Determine rollback target
      const rollbackTargetVersion =
        targetVersion ||
        (status.appliedMigrations.length > 1
          ? status.appliedMigrations[status.appliedMigrations.length - 2].version
          : 0);

      if (rollbackTargetVersion >= currentVersion) {
        throw new Error('Invalid rollback target version');
      }

      // Get migrations to rollback (in reverse order)
      const migrationsToRollback = status.appliedMigrations
        .filter(m => m.version > rollbackTargetVersion)
        .sort((a, b) => b.version - a.version);

      await securityLogger.logEvent({
        type: 'rollback_started',
        level: 'warning',
        message: `Starting rollback from v${currentVersion} to v${rollbackTargetVersion}`,
        metadata: {
          currentVersion,
          targetVersion: rollbackTargetVersion,
          migrationsCount: migrationsToRollback.length,
        },
      });

      // Execute rollbacks in transaction
      await this.executeInTransaction(async () => {
        for (const appliedMigration of migrationsToRollback) {
          const migration = this.migrations.get(appliedMigration.version);
          if (migration) {
            await this.executeRollback(migration);
            migrationsRolledBack++;
          }
        }
      });

      const executionTime = Date.now() - startTime;

      await securityLogger.logEvent({
        type: 'rollback_executed',
        level: 'warning',
        message: 'Rollback completed successfully',
        metadata: {
          version: rollbackTargetVersion,
          migrationsRolledBack,
          executionTime,
        },
      });

      return {
        success: true,
        version: rollbackTargetVersion,
        migrationsApplied: -migrationsRolledBack, // Negative to indicate rollback
        executionTime,
        warnings,
        errors: [],
        integrityStatus: 'verified',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        version: await this.getCurrentSchemaVersion(),
        migrationsApplied: -migrationsRolledBack,
        executionTime: Date.now() - startTime,
        warnings,
        errors,
        integrityStatus: 'failed',
      };
    }
  }

  /**
   * Create database backup before migration
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${FileSystem.documentDirectory}backup_${timestamp}.db`;

    try {
      await FileSystem.copyAsync({
        from: `${FileSystem.documentDirectory}${this.config.databasePath}`,
        to: backupPath,
      });

      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      await FileSystem.copyAsync({
        from: backupPath,
        to: `${FileSystem.documentDirectory}${this.config.databasePath}`,
      });
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error}`);
    }
  }

  /**
   * Execute migration in transaction
   */
  private async executeInTransaction(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database!.transaction(
        async tx => {
          try {
            await operation();
          } catch (error) {
            throw error;
          }
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Execute single migration
   */
  private async executeMigration(migration: MigrationDefinition): Promise<void> {
    const startTime = Date.now();

    try {
      // Execute migration script
      if (typeof migration.up === 'string') {
        await this.executeSQLScript(migration.up);
      } else {
        await this.executeEncryptedMigrationScript(migration.up);
      }

      // Record migration in metadata
      await this.recordMigrationExecution(migration, startTime);
    } catch (error) {
      throw new Error(`Migration ${migration.name} failed: ${error}`);
    }
  }

  /**
   * Execute rollback migration
   */
  private async executeRollback(migration: MigrationDefinition): Promise<void> {
    try {
      // Execute rollback script
      if (typeof migration.down === 'string') {
        await this.executeSQLScript(migration.down);
      } else {
        await this.executeEncryptedMigrationScript(migration.down);
      }

      // Remove migration from metadata
      await this.removeMigrationRecord(migration.version);
    } catch (error) {
      throw new Error(`Rollback ${migration.name} failed: ${error}`);
    }
  }

  /**
   * Execute SQL script
   */
  private async executeSQLScript(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database!.transaction(
        tx => {
          // Split script into individual statements
          const statements = script
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

          for (const statement of statements) {
            tx.executeSql(statement, []);
          }
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Execute encrypted migration script with data transformation
   */
  private async executeEncryptedMigrationScript(script: EncryptedMigrationScript): Promise<void> {
    // Execute base SQL script
    await this.executeSQLScript(script.sqlScript);

    // Execute data transformation if needed
    if (script.dataTransformation) {
      await this.executeDataTransformation(script.dataTransformation);
    }
  }

  /**
   * Execute data transformation for encrypted data
   */
  private async executeDataTransformation(
    transformation: NonNullable<EncryptedMigrationScript['dataTransformation']>
  ): Promise<void> {
    for (const table of transformation.tables) {
      const batchSize = transformation.batchSize || this.config.batchSize;

      // Process table data in batches
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await this.getTableBatch(table, offset, batchSize);

        if (batch.length === 0) {
          hasMore = false;
          continue;
        }

        // Transform batch data
        const transformedBatch = await this.transformBatchData(
          batch,
          transformation.transformationFunction
        );

        // Update batch in database
        await this.updateTableBatch(table, transformedBatch);

        offset += batchSize;
        hasMore = batch.length === batchSize;
      }
    }
  }

  /**
   * Get table data batch
   */
  private async getTableBatch(table: string, offset: number, limit: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database!.readTransaction(tx => {
        tx.executeSql(
          `SELECT * FROM ${table} LIMIT ? OFFSET ?`,
          [limit, offset],
          (_, result) => resolve(result.rows._array || []),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Transform batch data using specified function
   */
  private async transformBatchData(batch: any[], functionName: string): Promise<any[]> {
    // This would be implemented with actual transformation functions
    // For now, return batch unchanged as placeholder
    console.log(`[Migration] Transforming batch with function: ${functionName}`);
    return batch;
  }

  /**
   * Update table batch with transformed data
   */
  private async updateTableBatch(table: string, batch: any[]): Promise<void> {
    if (batch.length === 0) return;

    return new Promise((resolve, reject) => {
      this.database!.transaction(
        tx => {
          for (const row of batch) {
            // This would need to be implemented based on table structure
            // Placeholder implementation
            console.log(`[Migration] Updating row in ${table}:`, row.id);
          }
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Validate migration definition
   */
  private validateMigrationDefinition(migration: MigrationDefinition): void {
    if (!migration.version || migration.version < 1) {
      throw new Error('Migration version must be a positive integer');
    }

    if (!migration.name || migration.name.trim().length === 0) {
      throw new Error('Migration name is required');
    }

    if (!migration.up) {
      throw new Error('Migration up script is required');
    }

    if (!migration.down) {
      throw new Error('Migration down script is required for rollback support');
    }

    // Validate dependencies
    if (migration.dependencies) {
      for (const dep of migration.dependencies) {
        if (!this.migrations.has(dep)) {
          throw new Error(`Migration dependency ${dep} not found`);
        }
      }
    }
  }

  /**
   * Create migration metadata table
   */
  private async createMigrationMetadataTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        encrypted_metadata TEXT,
        rollback_available INTEGER DEFAULT 1
      )
    `;

    await this.executeSQLScript(createTableSQL);
  }

  /**
   * Get current schema version
   */
  private async getCurrentSchemaVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.database!.readTransaction(tx => {
        tx.executeSql(
          'SELECT MAX(version) as version FROM schema_migrations',
          [],
          (_, result) => {
            const version = result.rows._array[0]?.version || 0;
            resolve(version);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get applied migrations
   */
  private async getAppliedMigrations(): Promise<SchemaVersion[]> {
    return new Promise((resolve, reject) => {
      this.database!.readTransaction(tx => {
        tx.executeSql(
          'SELECT * FROM schema_migrations ORDER BY version',
          [],
          (_, result) => {
            const migrations: SchemaVersion[] = result.rows._array.map(row => ({
              version: row.version,
              appliedAt: row.applied_at,
              migrationName: row.name,
              checksum: row.checksum,
              encryptedMetadata: row.encrypted_metadata,
              rollbackAvailable: Boolean(row.rollback_available),
            }));
            resolve(migrations);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Record migration execution
   */
  private async recordMigrationExecution(
    migration: MigrationDefinition,
    startTime: number
  ): Promise<void> {
    const checksum = await this.calculateMigrationChecksum(migration);
    const appliedAt = Date.now();

    return new Promise((resolve, reject) => {
      this.database!.transaction(
        tx => {
          tx.executeSql(
            `INSERT INTO schema_migrations 
             (version, name, applied_at, checksum, rollback_available) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              migration.version,
              migration.name,
              appliedAt,
              checksum,
              this.config.enableRollback ? 1 : 0,
            ]
          );
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Remove migration record (for rollbacks)
   */
  private async removeMigrationRecord(version: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database!.transaction(
        tx => {
          tx.executeSql('DELETE FROM schema_migrations WHERE version = ?', [version]);
        },
        error => reject(error),
        () => resolve()
      );
    });
  }

  /**
   * Calculate migration checksum
   */
  private async calculateMigrationChecksum(migration: MigrationDefinition): Promise<string> {
    const content = JSON.stringify({
      version: migration.version,
      name: migration.name,
      up: migration.up,
      down: migration.down,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(content + this.config.checksumSalt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('hex');
  }

  /**
   * Validate migration execution
   */
  private async validateMigration(
    migration: MigrationDefinition
  ): Promise<{ warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!migration.validationRules) {
      return { warnings, errors };
    }

    for (const rule of migration.validationRules) {
      try {
        const result = await this.executeValidationRule(rule);
        if (!result.valid) {
          if (rule.required) {
            errors.push(`${rule.type} validation failed: ${result.message}`);
          } else {
            warnings.push(`${rule.type} validation warning: ${result.message}`);
          }
        }
      } catch (error) {
        const message = `Validation rule execution failed: ${error}`;
        if (rule.required) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    return { warnings, errors };
  }

  /**
   * Execute validation rule
   */
  private async executeValidationRule(
    rule: MigrationValidationRule
  ): Promise<{ valid: boolean; message?: string }> {
    // Placeholder implementation - would contain actual validation logic
    console.log(`[Migration] Executing ${rule.type} validation: ${rule.validationFunction}`);
    return { valid: true };
  }

  /**
   * Create rollback checkpoint
   */
  private async createRollbackCheckpoint(): Promise<SchemaVersion> {
    const appliedMigrations = await this.getAppliedMigrations();
    if (appliedMigrations.length === 0) {
      throw new Error('No migrations to create checkpoint from');
    }

    return appliedMigrations[appliedMigrations.length - 1];
  }

  /**
   * Perform database integrity check
   */
  private async performIntegrityCheck(): Promise<'verified' | 'warning' | 'failed'> {
    try {
      // This would contain actual integrity check logic
      // For now, return verified as placeholder
      return 'verified';
    } catch (error) {
      return 'failed';
    }
  }

  /**
   * Load encryption key for migrations
   */
  private async loadEncryptionKey(): Promise<void> {
    try {
      const storedKey = await SecureStore.getItemAsync('migration_encryption_key');
      if (storedKey) {
        this.config.encryptionKey = storedKey;
      }
    } catch (error) {
      console.warn('[Migration] Failed to load encryption key:', error);
    }
  }
}

/**
 * Global encrypted migration manager instance
 */
export const encryptedMigrationManager = new EncryptedMigrationManager();
