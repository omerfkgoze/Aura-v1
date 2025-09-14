/**
 * Encrypted Migration Manager Tests
 * Comprehensive testing of schema versioning with encrypted migration support
 * Author: Dev Agent (Story 2.1)
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import {
  EncryptedMigrationManager,
  encryptedMigrationManager,
  type MigrationDefinition,
  type SchemaVersion,
  type MigrationResult,
  type MigrationStatus,
} from '../encrypted-migration-manager';

// Mock external dependencies
jest.mock('expo-sqlite');
jest.mock('expo-file-system');
jest.mock('expo-secure-store');
jest.mock('../security-logger', () => ({
  securityLogger: {
    logEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockSQLite = SQLite as jest.Mocked<typeof SQLite>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('EncryptedMigrationManager', () => {
  let manager: EncryptedMigrationManager;
  let mockDatabase: jest.Mocked<SQLite.WebSQLDatabase>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database
    mockDatabase = {
      transaction: jest.fn(),
      readTransaction: jest.fn(),
      exec: jest.fn(),
    } as unknown as jest.Mocked<SQLite.WebSQLDatabase>;

    // Setup database transaction mocks
    mockDatabase.transaction.mockImplementation((callback, errorCallback, successCallback) => {
      const mockTx = {
        executeSql: jest.fn((sql, params, success, error) => {
          if (success) success({} as any, {} as any);
        }),
      };
      try {
        callback(mockTx as any);
        if (successCallback) successCallback();
      } catch (err) {
        if (errorCallback) errorCallback(err as any);
      }
    });

    mockDatabase.readTransaction.mockImplementation(callback => {
      const mockTx = {
        executeSql: jest.fn((sql, params, success, error) => {
          // Mock schema_migrations table responses
          if (sql.includes('MAX(version)')) {
            if (success) success({} as any, { rows: { _array: [{ version: 0 }] } } as any);
          } else if (sql.includes('SELECT * FROM schema_migrations')) {
            if (success) success({} as any, { rows: { _array: [] } } as any);
          } else {
            if (success) success({} as any, { rows: { _array: [] } } as any);
          }
        }),
      };
      callback(mockTx as any);
    });

    manager = new EncryptedMigrationManager({
      databasePath: 'test.db',
      encryptionKey: 'test-key',
      enableRollback: true,
      integrityChecks: true,
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(manager.initialize(mockDatabase)).resolves.not.toThrow();

      // Should create migration metadata table
      expect(mockDatabase.transaction).toHaveBeenCalled();
    });

    it('should load encryption key from secure store', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('stored-encryption-key');

      await manager.initialize(mockDatabase);

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('migration_encryption_key');
    });

    it('should handle missing encryption key gracefully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      await expect(manager.initialize(mockDatabase)).resolves.not.toThrow();
    });
  });

  describe('Migration Registration', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);
    });

    it('should register valid migration', () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'initial_schema',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY)',
        down: 'DROP TABLE users',
        requiresEncryption: false,
      };

      expect(() => manager.registerMigration(migration)).not.toThrow();
    });

    it('should reject migration with invalid version', () => {
      const migration: MigrationDefinition = {
        version: 0,
        name: 'invalid',
        up: 'CREATE TABLE test (id INTEGER)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      expect(() => manager.registerMigration(migration)).toThrow(
        'Migration version must be a positive integer'
      );
    });

    it('should reject migration without name', () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: '',
        up: 'CREATE TABLE test (id INTEGER)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      expect(() => manager.registerMigration(migration)).toThrow('Migration name is required');
    });

    it('should reject migration without up script', () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'test',
        up: '',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      expect(() => manager.registerMigration(migration)).toThrow('Migration up script is required');
    });

    it('should reject migration without down script', () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'test',
        up: 'CREATE TABLE test (id INTEGER)',
        down: '',
        requiresEncryption: false,
      };

      expect(() => manager.registerMigration(migration)).toThrow(
        'Migration down script is required for rollback support'
      );
    });

    it('should reject duplicate migration versions', () => {
      const migration1: MigrationDefinition = {
        version: 1,
        name: 'first',
        up: 'CREATE TABLE test1 (id INTEGER)',
        down: 'DROP TABLE test1',
        requiresEncryption: false,
      };

      const migration2: MigrationDefinition = {
        version: 1,
        name: 'second',
        up: 'CREATE TABLE test2 (id INTEGER)',
        down: 'DROP TABLE test2',
        requiresEncryption: false,
      };

      manager.registerMigration(migration1);

      expect(() => manager.registerMigration(migration2)).toThrow(
        'Migration version 1 already registered'
      );
    });

    it('should register multiple migrations in correct order', () => {
      const migrations: MigrationDefinition[] = [
        {
          version: 3,
          name: 'third',
          up: 'CREATE TABLE test3 (id INTEGER)',
          down: 'DROP TABLE test3',
          requiresEncryption: false,
        },
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
      ];

      expect(() => manager.registerMigrations(migrations)).not.toThrow();
    });
  });

  describe('Migration Status', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);
    });

    it('should return correct migration status for fresh database', async () => {
      // Mock empty migrations table
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 0 }] } } as any);
            } else {
              success({} as any, { rows: { _array: [] } } as any);
            }
          }),
        };
        callback(mockTx as any);
      });

      const migration: MigrationDefinition = {
        version: 1,
        name: 'initial',
        up: 'CREATE TABLE test (id INTEGER)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      manager.registerMigration(migration);

      const status = await manager.getMigrationStatus();

      expect(status.currentVersion).toBe(0);
      expect(status.availableVersion).toBe(1);
      expect(status.pendingMigrations).toHaveLength(1);
      expect(status.appliedMigrations).toHaveLength(0);
      expect(status.canRollback).toBe(false);
    });

    it('should return correct status with applied migrations', async () => {
      // Mock applied migrations
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 2 }] } } as any);
            } else if (sql.includes('SELECT * FROM schema_migrations')) {
              success(
                {} as any,
                {
                  rows: {
                    _array: [
                      {
                        version: 1,
                        name: 'first',
                        applied_at: Date.now() - 1000,
                        checksum: 'hash1',
                        rollback_available: 1,
                      },
                      {
                        version: 2,
                        name: 'second',
                        applied_at: Date.now(),
                        checksum: 'hash2',
                        rollback_available: 1,
                      },
                    ],
                  },
                } as any
              );
            }
          }),
        };
        callback(mockTx as any);
      });

      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
        {
          version: 3,
          name: 'third',
          up: 'CREATE TABLE test3 (id INTEGER)',
          down: 'DROP TABLE test3',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const status = await manager.getMigrationStatus();

      expect(status.currentVersion).toBe(2);
      expect(status.availableVersion).toBe(3);
      expect(status.pendingMigrations).toHaveLength(1);
      expect(status.appliedMigrations).toHaveLength(2);
      expect(status.canRollback).toBe(true);
    });
  });

  describe('Migration Execution', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);
    });

    it('should execute single migration successfully', async () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'initial',
        up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
        down: 'DROP TABLE users',
        requiresEncryption: false,
      };

      manager.registerMigration(migration);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
      expect(result.migrationsApplied).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute multiple migrations in order', async () => {
      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'users',
          up: 'CREATE TABLE users (id INTEGER PRIMARY KEY)',
          down: 'DROP TABLE users',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'posts',
          up: 'CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER)',
          down: 'DROP TABLE posts',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(result.migrationsApplied).toBe(2);
    });

    it('should execute migration to specific target version', async () => {
      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
        {
          version: 3,
          name: 'third',
          up: 'CREATE TABLE test3 (id INTEGER)',
          down: 'DROP TABLE test3',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const result = await manager.migrate(2);

      expect(result.success).toBe(true);
      expect(result.version).toBe(2);
      expect(result.migrationsApplied).toBe(2);
    });

    it('should handle migration with encrypted data transformation', async () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'encrypted_data',
        up: {
          sqlScript: 'CREATE TABLE encrypted_data (id INTEGER PRIMARY KEY, data BLOB)',
          dataTransformation: {
            tables: ['encrypted_data'],
            encryptionKeys: ['data_key'],
            transformationFunction: 'encryptUserData',
            batchSize: 100,
          },
        },
        down: 'DROP TABLE encrypted_data',
        requiresEncryption: true,
      };

      manager.registerMigration(migration);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
    });

    it('should skip migrations when already at target version', async () => {
      // Mock current version as 2
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 2 }] } } as any);
            } else {
              success({} as any, { rows: { _array: [] } } as any);
            }
          }),
        };
        callback(mockTx as any);
      });

      const migration: MigrationDefinition = {
        version: 1,
        name: 'old_migration',
        up: 'CREATE TABLE test (id INTEGER)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      manager.registerMigration(migration);

      const result = await manager.migrate(1);

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toBe(0);
      expect(result.warnings).toContain('No migrations to apply');
    });

    it('should handle migration execution errors', async () => {
      // Mock database transaction to fail
      mockDatabase.transaction.mockImplementation((callback, errorCallback) => {
        if (errorCallback) {
          errorCallback(new Error('SQL execution failed') as any);
        }
      });

      const migration: MigrationDefinition = {
        version: 1,
        name: 'failing_migration',
        up: 'INVALID SQL SYNTAX',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      manager.registerMigration(migration);

      const result = await manager.migrate();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Migration Rollback', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);

      // Mock applied migrations
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 2 }] } } as any);
            } else if (sql.includes('SELECT * FROM schema_migrations')) {
              success(
                {} as any,
                {
                  rows: {
                    _array: [
                      {
                        version: 1,
                        name: 'first',
                        applied_at: Date.now() - 1000,
                        checksum: 'hash1',
                        rollback_available: 1,
                      },
                      {
                        version: 2,
                        name: 'second',
                        applied_at: Date.now(),
                        checksum: 'hash2',
                        rollback_available: 1,
                      },
                    ],
                  },
                } as any
              );
            }
          }),
        };
        callback(mockTx as any);
      });
    });

    it('should rollback single migration successfully', async () => {
      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const result = await manager.rollback(1);

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
      expect(result.migrationsApplied).toBe(-1); // Negative indicates rollback
    });

    it('should rollback multiple migrations to target version', async () => {
      // Mock 3 applied migrations
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 3 }] } } as any);
            } else if (sql.includes('SELECT * FROM schema_migrations')) {
              success(
                {} as any,
                {
                  rows: {
                    _array: [
                      {
                        version: 1,
                        name: 'first',
                        applied_at: Date.now() - 2000,
                        checksum: 'hash1',
                        rollback_available: 1,
                      },
                      {
                        version: 2,
                        name: 'second',
                        applied_at: Date.now() - 1000,
                        checksum: 'hash2',
                        rollback_available: 1,
                      },
                      {
                        version: 3,
                        name: 'third',
                        applied_at: Date.now(),
                        checksum: 'hash3',
                        rollback_available: 1,
                      },
                    ],
                  },
                } as any
              );
            }
          }),
        };
        callback(mockTx as any);
      });

      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
        {
          version: 3,
          name: 'third',
          up: 'CREATE TABLE test3 (id INTEGER)',
          down: 'DROP TABLE test3',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const result = await manager.rollback(1);

      expect(result.success).toBe(true);
      expect(result.version).toBe(1);
      expect(result.migrationsApplied).toBe(-2); // Rolled back 2 migrations
    });

    it('should reject rollback when disabled', async () => {
      const disabledManager = new EncryptedMigrationManager({
        enableRollback: false,
      });

      await disabledManager.initialize(mockDatabase);

      await expect(disabledManager.rollback()).rejects.toThrow('Rollback is disabled');
    });

    it('should reject rollback when no rollback available', async () => {
      // Mock no applied migrations
      mockDatabase.readTransaction.mockImplementation(callback => {
        const mockTx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('MAX(version)')) {
              success({} as any, { rows: { _array: [{ version: 0 }] } } as any);
            } else {
              success({} as any, { rows: { _array: [] } } as any);
            }
          }),
        };
        callback(mockTx as any);
      });

      const migration: MigrationDefinition = {
        version: 1,
        name: 'test',
        up: 'CREATE TABLE test (id INTEGER)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
      };

      manager.registerMigration(migration);

      await expect(manager.rollback()).rejects.toThrow('No rollback available');
    });

    it('should handle rollback execution errors', async () => {
      // Mock database transaction to fail on rollback
      mockDatabase.transaction.mockImplementation((callback, errorCallback) => {
        if (errorCallback) {
          errorCallback(new Error('Rollback SQL failed') as any);
        }
      });

      const migrations: MigrationDefinition[] = [
        {
          version: 1,
          name: 'first',
          up: 'CREATE TABLE test1 (id INTEGER)',
          down: 'DROP TABLE test1',
          requiresEncryption: false,
        },
        {
          version: 2,
          name: 'second',
          up: 'CREATE TABLE test2 (id INTEGER)',
          down: 'DROP TABLE test2',
          requiresEncryption: false,
        },
      ];

      manager.registerMigrations(migrations);

      const result = await manager.rollback(1);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);
      mockFileSystem.documentDirectory = '/mock/documents/';
    });

    it('should create backup successfully', async () => {
      mockFileSystem.copyAsync.mockResolvedValue();

      const backupPath = await manager.createBackup();

      expect(backupPath).toMatch(/\/mock\/documents\/backup_.*\.db/);
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: '/mock/documents/test.db',
        to: backupPath,
      });
    });

    it('should restore from backup successfully', async () => {
      const backupPath = '/mock/documents/backup_test.db';
      mockFileSystem.copyAsync.mockResolvedValue();

      await manager.restoreFromBackup(backupPath);

      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: backupPath,
        to: '/mock/documents/test.db',
      });
    });

    it('should handle backup creation errors', async () => {
      mockFileSystem.copyAsync.mockRejectedValue(new Error('File system error'));

      await expect(manager.createBackup()).rejects.toThrow('Failed to create backup');
    });

    it('should handle restore errors', async () => {
      const backupPath = '/mock/documents/backup_test.db';
      mockFileSystem.copyAsync.mockRejectedValue(new Error('File system error'));

      await expect(manager.restoreFromBackup(backupPath)).rejects.toThrow(
        'Failed to restore from backup'
      );
    });
  });

  describe('Migration Validation', () => {
    beforeEach(async () => {
      await manager.initialize(mockDatabase);
    });

    it('should execute validation rules successfully', async () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'validated_migration',
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
        validationRules: [
          {
            type: 'schema',
            description: 'Validate table creation',
            validationFunction: 'validateTableExists',
            required: true,
          },
        ],
      };

      manager.registerMigration(migration);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
    });

    it('should handle validation warnings', async () => {
      const migration: MigrationDefinition = {
        version: 1,
        name: 'migration_with_warnings',
        up: 'CREATE TABLE test (id INTEGER PRIMARY KEY)',
        down: 'DROP TABLE test',
        requiresEncryption: false,
        validationRules: [
          {
            type: 'data',
            description: 'Optional data validation',
            validationFunction: 'validateData',
            required: false,
          },
        ],
      };

      manager.registerMigration(migration);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
      // Would have warnings in actual implementation
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      mockDatabase.transaction.mockImplementation((callback, errorCallback) => {
        if (errorCallback) {
          errorCallback(new Error('Database connection failed') as any);
        }
      });

      await expect(manager.initialize(mockDatabase)).rejects.toThrow();
    });

    it('should handle missing database error', async () => {
      await expect(manager.getMigrationStatus()).rejects.toThrow(
        'Migration manager not initialized'
      );
    });

    it('should handle SecureStore errors gracefully', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));

      // Should not throw, should continue without encryption key
      await expect(manager.initialize(mockDatabase)).resolves.not.toThrow();
    });
  });
});

describe('Global encrypted migration manager', () => {
  it('should provide singleton instance', () => {
    expect(encryptedMigrationManager).toBeInstanceOf(EncryptedMigrationManager);
  });
});
