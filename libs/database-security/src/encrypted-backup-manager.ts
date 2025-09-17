import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { createHash, randomBytes } from 'crypto';
// Types for crypto core - using any for now to fix build
type CryptoCore = any;
type CryptoEnvelope = any;
type EncryptedBackupMetadata = any;
type BackupKeyMetadata = any;

export class EncryptedBackupManager {
  private static readonly BACKUP_KEY_PREFIX = 'aura.backup.key';
  private static readonly BACKUP_METADATA_PREFIX = 'aura.backup.metadata';
  private static readonly BACKUP_DIRECTORY = `${(FileSystem as any).documentDirectory || ''}encrypted_backups/`;

  private cryptoCore: CryptoCore;
  private isInitialized = false;

  constructor(cryptoCore: CryptoCore) {
    this.cryptoCore = cryptoCore;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(EncryptedBackupManager.BACKUP_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(EncryptedBackupManager.BACKUP_DIRECTORY, {
          intermediates: true,
        });
      }

      await this.ensureBackupKeyExists();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Backup manager initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async generateBackupKey(keyVersion: string = 'v1'): Promise<BackupKeyMetadata> {
    if (!this.isInitialized) {
      throw new Error('Backup manager not initialized');
    }

    try {
      const backupKeyBytes = randomBytes(32);
      const keyId = createHash('sha256').update(backupKeyBytes).digest('hex').substring(0, 16);

      const salt = randomBytes(32);
      const backupKeyInfo = {
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256',
        iterations: 600000,
        salt: salt.toString('base64'),
        keyVersion,
        createdAt: new Date().toISOString(),
        keyId,
      };

      const backupKeyStoreKey = `${EncryptedBackupManager.BACKUP_KEY_PREFIX}.${keyId}`;
      await SecureStore.setItemAsync(
        backupKeyStoreKey,
        JSON.stringify({
          key: backupKeyBytes.toString('base64'),
          ...backupKeyInfo,
        }),
        {
          keychainService: 'AuraBackupKeystore',
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access backup keys',
        }
      );

      backupKeyBytes.fill(0);

      const metadata: BackupKeyMetadata = {
        keyId,
        algorithm: backupKeyInfo.algorithm,
        keyVersion,
        createdAt: backupKeyInfo.createdAt,
        isActive: true,
        keyStorePath: backupKeyStoreKey,
      };

      await this.storeBackupKeyMetadata(metadata);
      return metadata;
    } catch (error) {
      throw new Error(
        `Backup key generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async createBackup(
    databaseData: any,
    options: {
      backupType: 'full' | 'incremental';
      includePreferences?: boolean;
      compressionLevel?: number;
    } = { backupType: 'full' }
  ): Promise<EncryptedBackupMetadata> {
    if (!this.isInitialized) {
      throw new Error('Backup manager not initialized');
    }

    try {
      const backupId = `backup_${Date.now()}_${randomBytes(8).toString('hex')}`;
      const timestamp = new Date().toISOString();

      const backupKey = await this.getActiveBackupKey();
      if (!backupKey) {
        throw new Error('No active backup key found');
      }

      const backupPayload = {
        version: '1.0',
        backupType: options.backupType,
        timestamp,
        schemaVersion: databaseData.schemaVersion || '1.0',
        data: databaseData,
        preferences: options.includePreferences ? databaseData.preferences : null,
        checksum: this.calculateDataChecksum(databaseData),
      };

      const payloadJson = JSON.stringify(backupPayload);
      const payloadBuffer = Buffer.from(payloadJson, 'utf-8');

      const encryptedBackup = await this.cryptoCore.encrypt(payloadBuffer, {
        keyId: backupKey.keyId,
        aad: `backup:${backupId}:${timestamp}`,
        algorithm: 'AES-256-GCM',
      });

      const backupFileName = `${backupId}_encrypted.bak`;
      const backupFilePath = `${EncryptedBackupManager.BACKUP_DIRECTORY}${backupFileName}`;

      await FileSystem.writeAsStringAsync(backupFilePath, JSON.stringify(encryptedBackup), {
        encoding: 'utf8' as any,
      });

      const fileStats = await FileSystem.getInfoAsync(backupFilePath);
      const fileHash = await this.calculateFileHash(backupFilePath);

      const backupMetadata: EncryptedBackupMetadata = {
        backupId,
        backupType: options.backupType,
        timestamp,
        filePath: backupFilePath,
        fileName: backupFileName,
        fileSize: (fileStats as any).size || 0,
        fileHash,
        keyId: backupKey.keyId,
        schemaVersion: backupPayload.schemaVersion,
        dataChecksum: backupPayload.checksum,
        isCompressed: options.compressionLevel ? true : false,
        compressionLevel: options.compressionLevel,
        isValid: true,
        createdAt: timestamp,
      };

      await this.storeBackupMetadata(backupMetadata);
      return backupMetadata;
    } catch (error) {
      throw new Error(
        `Backup creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async verifyBackupIntegrity(backupId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    details: {
      fileIntegrity: boolean;
      encryptionIntegrity: boolean;
      dataIntegrity: boolean;
      keyAccessibility: boolean;
      structuralIntegrity: boolean;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const details = {
      fileIntegrity: false,
      encryptionIntegrity: false,
      dataIntegrity: false,
      keyAccessibility: false,
      structuralIntegrity: false,
    };

    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        errors.push('Backup metadata not found');
        return { isValid: false, errors, warnings, details };
      }

      const fileInfo = await FileSystem.getInfoAsync(metadata.filePath);
      if (!fileInfo.exists) {
        errors.push('Backup file does not exist');
      } else {
        if ((fileInfo as any).size !== metadata.fileSize) {
          errors.push(
            `File size mismatch: expected ${metadata.fileSize}, got ${(fileInfo as any).size}`
          );
        }

        const currentFileHash = await this.calculateFileHash(metadata.filePath);
        if (currentFileHash !== metadata.fileHash) {
          errors.push('File hash mismatch - possible corruption or tampering');
        } else {
          details.fileIntegrity = true;
        }
      }

      try {
        const backupKey = await this.getBackupKeyById(metadata.keyId);
        if (!backupKey) {
          errors.push('Backup key not accessible');
        } else {
          details.keyAccessibility = true;
        }
      } catch (error) {
        errors.push(
          `Key accessibility error: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      if (details.fileIntegrity && details.keyAccessibility) {
        try {
          const encryptedData = await FileSystem.readAsStringAsync(metadata.filePath);
          const envelope = JSON.parse(encryptedData) as CryptoEnvelope;

          if (!envelope.ciphertext || !envelope.nonce || !envelope.tag) {
            errors.push('Invalid encryption envelope structure');
          } else {
            details.encryptionIntegrity = true;
          }
        } catch (error) {
          errors.push(
            `Encryption envelope validation failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (details.encryptionIntegrity) {
        try {
          const decryptedData = await this.decryptBackupData(metadata);
          if (decryptedData) {
            const calculatedChecksum = this.calculateDataChecksum(decryptedData.data);
            if (calculatedChecksum !== metadata.dataChecksum) {
              errors.push('Data checksum mismatch - data integrity compromised');
            } else {
              details.dataIntegrity = true;
            }

            if (decryptedData.version && decryptedData.timestamp && decryptedData.data) {
              details.structuralIntegrity = true;
            } else {
              warnings.push('Backup structure incomplete but readable');
            }
          }
        } catch (error) {
          errors.push(
            `Data integrity verification failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const isValid = errors.length === 0 && Object.values(details).every(Boolean);
      return { isValid, errors, warnings, details };
    } catch (error) {
      errors.push(
        `Integrity verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { isValid: false, errors, warnings, details };
    }
  }

  async restoreBackup(
    backupId: string,
    options: {
      validateIntegrity?: boolean;
      createBackupBeforeRestore?: boolean;
      skipValidation?: boolean;
    } = { validateIntegrity: true, createBackupBeforeRestore: true }
  ): Promise<{
    success: boolean;
    restoredData: any;
    warnings: string[];
    backupMetadata: EncryptedBackupMetadata;
  }> {
    if (!this.isInitialized) {
      throw new Error('Backup manager not initialized');
    }

    const warnings: string[] = [];

    try {
      const metadata = await this.getBackupMetadata(backupId);
      if (!metadata) {
        throw new Error('Backup metadata not found');
      }

      if (options.validateIntegrity && !options.skipValidation) {
        const integrityResult = await this.verifyBackupIntegrity(backupId);
        if (!integrityResult.isValid) {
          throw new Error(
            `Backup integrity validation failed: ${integrityResult.errors.join(', ')}`
          );
        }
        warnings.push(...integrityResult.warnings);
      }

      if (options.createBackupBeforeRestore) {
        try {
          warnings.push(
            'Pre-restoration backup creation skipped - current database interface not available'
          );
        } catch (error) {
          warnings.push(
            `Pre-restoration backup failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const decryptedData = await this.decryptBackupData(metadata);
      if (!decryptedData) {
        throw new Error('Failed to decrypt backup data');
      }

      if (!decryptedData.data || !decryptedData.version) {
        throw new Error('Invalid backup data structure');
      }

      const calculatedChecksum = this.calculateDataChecksum(decryptedData.data);
      if (calculatedChecksum !== metadata.dataChecksum) {
        throw new Error('Data checksum validation failed during restoration');
      }

      await this.logRestorationActivity({
        backupId,
        timestamp: new Date().toISOString(),
        backupTimestamp: metadata.timestamp,
        backupType: metadata.backupType,
        success: true,
      });

      return {
        success: true,
        restoredData: decryptedData.data,
        warnings,
        backupMetadata: metadata,
      };
    } catch (error) {
      await this.logRestorationActivity({
        backupId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        `Backup restoration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listBackups(): Promise<EncryptedBackupMetadata[]> {
    try {
      const backupMetadataList: EncryptedBackupMetadata[] = [];

      const backupDir = await FileSystem.readDirectoryAsync(
        EncryptedBackupManager.BACKUP_DIRECTORY
      );

      for (const fileName of backupDir) {
        if (fileName.endsWith('_encrypted.bak')) {
          const backupId = fileName.replace('_encrypted.bak', '');
          const metadata = await this.getBackupMetadata(backupId);
          if (metadata) {
            backupMetadataList.push(metadata);
          }
        }
      }

      return backupMetadataList.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }

  async listBackupKeys(): Promise<BackupKeyMetadata[]> {
    try {
      const metadataKey = `${EncryptedBackupManager.BACKUP_METADATA_PREFIX}.keys`;
      const metadataJson = await SecureStore.getItemAsync(metadataKey, {
        keychainService: 'AuraBackupKeystore',
      });

      if (!metadataJson) {
        return [];
      }

      const metadata = JSON.parse(metadataJson);
      return metadata.keys || [];
    } catch (error) {
      return [];
    }
  }

  private async ensureBackupKeyExists(): Promise<void> {
    try {
      const existingKeys = await this.listBackupKeys();

      if (existingKeys.length === 0) {
        await this.generateBackupKey('v1');
      }
    } catch (error) {
      await this.generateBackupKey('v1');
    }
  }

  private async getActiveBackupKey(): Promise<BackupKeyMetadata | null> {
    try {
      const backupKeys = await this.listBackupKeys();
      const activeKey = backupKeys.find(key => key.isActive);
      return activeKey || null;
    } catch (error) {
      throw new Error(
        `Failed to retrieve active backup key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async storeBackupKeyMetadata(metadata: BackupKeyMetadata): Promise<void> {
    try {
      const existingKeys = await this.listBackupKeys();

      if (metadata.isActive) {
        existingKeys.forEach(key => (key.isActive = false));
      }

      const updatedKeys = [...existingKeys, metadata];
      const metadataKey = `${EncryptedBackupManager.BACKUP_METADATA_PREFIX}.keys`;

      await SecureStore.setItemAsync(
        metadataKey,
        JSON.stringify({
          keys: updatedKeys,
          lastUpdated: new Date().toISOString(),
        }),
        {
          keychainService: 'AuraBackupKeystore',
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to store backup key metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async storeBackupMetadata(metadata: EncryptedBackupMetadata): Promise<void> {
    try {
      const metadataKey = `${EncryptedBackupManager.BACKUP_METADATA_PREFIX}.${metadata.backupId}`;

      await SecureStore.setItemAsync(metadataKey, JSON.stringify(metadata), {
        keychainService: 'AuraBackupKeystore',
      });
    } catch (error) {
      throw new Error(
        `Failed to store backup metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private calculateDataChecksum(data: any): string {
    const dataString = JSON.stringify(data, null, 0);
    return createHash('sha256').update(dataString, 'utf8').digest('hex');
  }

  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      return createHash('sha256').update(fileContent, 'utf8').digest('hex');
    } catch (error) {
      throw new Error(
        `Failed to calculate file hash: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getBackupMetadata(backupId: string): Promise<EncryptedBackupMetadata | null> {
    try {
      const metadataKey = `${EncryptedBackupManager.BACKUP_METADATA_PREFIX}.${backupId}`;
      const metadataJson = await SecureStore.getItemAsync(metadataKey, {
        keychainService: 'AuraBackupKeystore',
      });

      if (!metadataJson) {
        return null;
      }

      return JSON.parse(metadataJson) as EncryptedBackupMetadata;
    } catch (error) {
      return null;
    }
  }

  private async getBackupKeyById(keyId: string): Promise<any | null> {
    try {
      const backupKeyStoreKey = `${EncryptedBackupManager.BACKUP_KEY_PREFIX}.${keyId}`;
      const keyDataJson = await SecureStore.getItemAsync(backupKeyStoreKey, {
        keychainService: 'AuraBackupKeystore',
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access backup keys',
      });

      if (!keyDataJson) {
        return null;
      }

      return JSON.parse(keyDataJson);
    } catch (error) {
      return null;
    }
  }

  private async decryptBackupData(metadata: EncryptedBackupMetadata): Promise<any | null> {
    try {
      const encryptedData = await FileSystem.readAsStringAsync(metadata.filePath);
      const envelope = JSON.parse(encryptedData) as CryptoEnvelope;

      const backupKey = await this.getBackupKeyById(metadata.keyId);
      if (!backupKey) {
        throw new Error('Backup key not accessible');
      }

      const keyBuffer = Buffer.from(backupKey.key, 'base64');
      const decryptedBuffer = await this.cryptoCore.decrypt(envelope, {
        keyId: metadata.keyId,
        key: keyBuffer,
      });

      keyBuffer.fill(0);

      const decryptedJson = decryptedBuffer.toString('utf-8');
      return JSON.parse(decryptedJson);
    } catch (error) {
      throw new Error(
        `Backup decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async logRestorationActivity(activity: {
    backupId: string;
    timestamp: string;
    backupTimestamp?: string;
    backupType?: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    try {
      const logKey = `${EncryptedBackupManager.BACKUP_METADATA_PREFIX}.restoration_log`;

      let existingLogs: any[] = [];
      try {
        const existingLogJson = await SecureStore.getItemAsync(logKey, {
          keychainService: 'AuraBackupKeystore',
        });
        if (existingLogJson) {
          const logData = JSON.parse(existingLogJson);
          existingLogs = logData.activities || [];
        }
      } catch (error) {
        // Start with empty log if none exists
      }

      existingLogs.push(activity);
      if (existingLogs.length > 100) {
        existingLogs = existingLogs.slice(-100);
      }

      await SecureStore.setItemAsync(
        logKey,
        JSON.stringify({
          activities: existingLogs,
          lastUpdated: new Date().toISOString(),
        }),
        {
          keychainService: 'AuraBackupKeystore',
        }
      );
    } catch (error) {
      // Log errors are non-critical
    }
  }

  dispose(): void {
    this.isInitialized = false;
  }
}
