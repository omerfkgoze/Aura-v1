/**
 * Backup Data Encryption Service
 * Encrypts cycle data using isolated backup keys for cross-device restoration
 *
 * CRITICAL: Uses only isolated backup keys, never primary encryption keys
 * Supports cross-device restoration with integrity verification
 */

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  BackupKeyConfig,
  EncryptedBackupData,
  BackupRestoreContext,
  BackupSecurityAudit,
} from './types';

// Local type definition for EncryptedCycleData
interface EncryptedCycleData {
  id: string;
  encryptedData: string;
  createdAt: string;
  updatedAt?: string;
  version: number;
}

export class BackupDataEncryption {
  private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private static readonly NONCE_LENGTH = 12; // 96-bit nonce for GCM
  private static readonly TAG_LENGTH = 16; // 128-bit authentication tag
  private static readonly AAD_VERSION = 'backup_v1';
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks for large data

  private auditTrail: BackupSecurityAudit[] = [];

  /**
   * Encrypt cycle data for backup using isolated backup keys
   * Creates encrypted backup data that can be restored on any device
   */
  async encryptCycleDataForBackup(
    cycleData: EncryptedCycleData[],
    backupKey: Uint8Array,
    keyConfig: BackupKeyConfig,
    deviceId: string
  ): Promise<EncryptedBackupData> {
    try {
      // Validate backup key isolation
      this.validateBackupKeyIsolation(keyConfig.keyId);

      // Serialize cycle data for backup
      const serializedData = this.serializeCycleData(cycleData);

      // Generate nonce and AAD for encryption
      const nonce = await Crypto.getRandomBytesAsync(BackupDataEncryption.NONCE_LENGTH);
      const aad = this.createAAD(keyConfig, deviceId);

      // Encrypt data using backup key
      const { encryptedData, tag } = await this.encryptWithBackupKey(
        serializedData,
        backupKey,
        nonce,
        aad
      );

      // Calculate data checksum for integrity verification
      const dataChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextDecoder().decode(serializedData),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const randomBytes = await Crypto.getRandomBytesAsync(8);
      const randomHex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const encryptedBackup: EncryptedBackupData = {
        backupId: `backup_${Date.now()}_${randomHex}`,
        keyId: keyConfig.keyId,
        encryptedData,
        nonce,
        aad,
        tag,
        timestamp: new Date(),
        deviceOrigin: deviceId,
        dataChecksum,
      };

      await this.auditOperation('encrypt', keyConfig.keyId, true);

      // Zero out sensitive materials
      this.secureZeroize(serializedData);

      return encryptedBackup;
    } catch (error) {
      await this.auditOperation('encrypt', keyConfig.keyId, false, (error as Error).message);
      throw new Error(`Failed to encrypt cycle data for backup: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt backup data for cross-device restoration
   * Verifies integrity and restores cycle data using backup key
   */
  async decryptBackupForRestore(
    encryptedBackup: EncryptedBackupData,
    backupKey: Uint8Array,
    restoreContext: BackupRestoreContext
  ): Promise<{
    cycleData: EncryptedCycleData[];
    integrityVerified: boolean;
    conflictDetected: boolean;
  }> {
    try {
      // Validate backup key isolation
      this.validateBackupKeyIsolation(encryptedBackup.keyId);

      // Verify AAD matches backup
      const expectedAAD = this.createAAD(
        { keyId: encryptedBackup.keyId } as BackupKeyConfig,
        encryptedBackup.deviceOrigin
      );

      if (!this.compareUint8Arrays(encryptedBackup.aad, expectedAAD)) {
        throw new Error('AAD verification failed - backup data may be tampered');
      }

      // Decrypt backup data
      const decryptedData = await this.decryptWithBackupKey(
        encryptedBackup.encryptedData,
        backupKey,
        encryptedBackup.nonce,
        encryptedBackup.aad,
        encryptedBackup.tag
      );

      // Verify data integrity using checksum
      const actualChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextDecoder().decode(decryptedData),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const integrityVerified = actualChecksum === encryptedBackup.dataChecksum;

      if (!integrityVerified) {
        throw new Error('Data integrity verification failed');
      }

      // Deserialize cycle data
      const cycleData = this.deserializeCycleData(decryptedData);

      // Check for conflicts with existing data
      const conflictDetected = await this.detectRestoreConflicts(cycleData, restoreContext);

      await this.auditOperation('decrypt', encryptedBackup.keyId, true);

      // Zero out decrypted data
      this.secureZeroize(decryptedData);

      return {
        cycleData,
        integrityVerified,
        conflictDetected,
      };
    } catch (error) {
      await this.auditOperation('decrypt', encryptedBackup.keyId, false, (error as Error).message);
      throw new Error(`Failed to decrypt backup for restore: ${(error as Error).message}`);
    }
  }

  /**
   * Create incremental backup with only changed data
   * Efficient backup for regular synchronization
   */
  async createIncrementalBackup(
    newCycleData: EncryptedCycleData[],
    lastBackupTimestamp: Date,
    backupKey: Uint8Array,
    keyConfig: BackupKeyConfig,
    deviceId: string
  ): Promise<EncryptedBackupData> {
    try {
      // Filter data changed since last backup
      const changedData = newCycleData.filter(
        data =>
          new Date(data.createdAt) > lastBackupTimestamp ||
          (data.updatedAt && new Date(data.updatedAt) > lastBackupTimestamp)
      );

      if (changedData.length === 0) {
        throw new Error('No changes detected since last backup');
      }

      // Create incremental backup
      return this.encryptCycleDataForBackup(changedData, backupKey, keyConfig, deviceId);
    } catch (error) {
      throw new Error(`Failed to create incremental backup: ${(error as Error).message}`);
    }
  }

  /**
   * Merge backup data with existing data
   * Handles conflicts and maintains data consistency
   */
  async mergeBackupWithExisting(
    backupData: EncryptedCycleData[],
    existingData: EncryptedCycleData[],
    conflictResolution: 'merge' | 'replace' | 'user_choice'
  ): Promise<{
    mergedData: EncryptedCycleData[];
    conflicts: Array<{
      backupItem: EncryptedCycleData;
      existingItem: EncryptedCycleData;
      resolution: string;
    }>;
  }> {
    try {
      const mergedData: EncryptedCycleData[] = [...existingData];
      const conflicts: Array<{
        backupItem: EncryptedCycleData;
        existingItem: EncryptedCycleData;
        resolution: string;
      }> = [];

      for (const backupItem of backupData) {
        const existingIndex = existingData.findIndex(existing => existing.id === backupItem.id);

        if (existingIndex === -1) {
          // New item from backup - add directly
          mergedData.push(backupItem);
        } else {
          // Conflict detected - handle based on resolution strategy
          const existingItem = existingData[existingIndex];
          const resolution = await this.resolveDataConflict(
            backupItem,
            existingItem,
            conflictResolution
          );

          conflicts.push({
            backupItem,
            existingItem,
            resolution: resolution.strategy,
          });

          mergedData[existingIndex] = resolution.resolvedData;
        }
      }

      return { mergedData, conflicts };
    } catch (error) {
      throw new Error(`Failed to merge backup with existing data: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypt data using backup key with AES-256-GCM
   */
  private async encryptWithBackupKey(
    data: Uint8Array,
    backupKey: Uint8Array,
    nonce: Uint8Array,
    aad: Uint8Array
  ): Promise<{ encryptedData: Uint8Array; tag: Uint8Array }> {
    try {
      // Note: This would need to be implemented with a proper crypto library for React Native
      // For now, throwing error as crypto module is not available
      throw new Error('Native crypto operations not implemented for React Native');
    } catch (error) {
      throw new Error(`Backup encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypt data using backup key with AES-256-GCM
   */
  private async decryptWithBackupKey(
    encryptedData: Uint8Array,
    backupKey: Uint8Array,
    nonce: Uint8Array,
    aad: Uint8Array,
    tag: Uint8Array
  ): Promise<Uint8Array> {
    try {
      // Note: This would need to be implemented with a proper crypto library for React Native
      // For now, throwing error as crypto module is not available
      throw new Error('Native crypto operations not implemented for React Native');
    } catch (error) {
      throw new Error(`Backup decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Serialize cycle data for backup storage
   */
  private serializeCycleData(cycleData: EncryptedCycleData[]): Uint8Array {
    try {
      const serialized = JSON.stringify(cycleData);
      return new Uint8Array(new TextEncoder().encode(serialized));
    } catch (error) {
      throw new Error(`Failed to serialize cycle data: ${(error as Error).message}`);
    }
  }

  /**
   * Deserialize cycle data from backup
   */
  private deserializeCycleData(serializedData: Uint8Array): EncryptedCycleData[] {
    try {
      const jsonString = new TextDecoder().decode(serializedData);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to deserialize cycle data: ${(error as Error).message}`);
    }
  }

  /**
   * Create Additional Authenticated Data (AAD) for backup
   */
  private createAAD(keyConfig: BackupKeyConfig, deviceId: string): Uint8Array {
    const aadString = `${BackupDataEncryption.AAD_VERSION}|${keyConfig.keyId}|${deviceId}`;
    return new Uint8Array(new TextEncoder().encode(aadString));
  }

  /**
   * Detect restore conflicts with existing data
   */
  private async detectRestoreConflicts(
    backupData: EncryptedCycleData[],
    restoreContext: BackupRestoreContext
  ): Promise<boolean> {
    try {
      // In production, would check against existing local data
      // For now, simulate conflict detection based on timestamp differences
      const hasConflicts = backupData.some(data => {
        const dataTime = new Date(data.createdAt).getTime();
        const restoreTime = restoreContext.restoreTimestamp.getTime();
        const timeDiff = Math.abs(dataTime - restoreTime);

        // Consider conflict if data is from a different time window
        return timeDiff > 24 * 60 * 60 * 1000; // 24 hours
      });

      return hasConflicts;
    } catch (error) {
      return true; // Assume conflict on error for safety
    }
  }

  /**
   * Resolve data conflicts during merge
   */
  private async resolveDataConflict(
    backupItem: EncryptedCycleData,
    existingItem: EncryptedCycleData,
    strategy: 'merge' | 'replace' | 'user_choice'
  ): Promise<{ resolvedData: EncryptedCycleData; strategy: string }> {
    try {
      switch (strategy) {
        case 'replace':
          return {
            resolvedData: backupItem,
            strategy: 'replaced_with_backup',
          };

        case 'merge':
          // Merge strategy: use latest timestamp
          const backupTime = new Date(backupItem.updatedAt || backupItem.createdAt);
          const existingTime = new Date(existingItem.updatedAt || existingItem.createdAt);

          return {
            resolvedData: backupTime > existingTime ? backupItem : existingItem,
            strategy: 'merged_latest_timestamp',
          };

        case 'user_choice':
          // In production, would prompt user for choice
          // For now, default to existing data
          return {
            resolvedData: existingItem,
            strategy: 'user_choice_existing',
          };

        default:
          throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
      }
    } catch (error) {
      // Default to existing data on error
      return {
        resolvedData: existingItem,
        strategy: 'error_default_existing',
      };
    }
  }

  /**
   * Validate backup key isolation
   */
  private validateBackupKeyIsolation(keyId: string): void {
    if (!keyId.startsWith('backup_')) {
      throw new Error('Only isolated backup keys allowed for backup encryption');
    }
  }

  /**
   * Compare Uint8Arrays for equality
   */
  private compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }

    return true;
  }

  /**
   * Secure memory zeroization
   */
  private secureZeroize(data: Uint8Array): void {
    try {
      data.fill(0);
    } catch (error) {
      console.error('Failed to zeroize sensitive data:', (error as Error).message);
    }
  }

  /**
   * Audit backup operations
   */
  private async auditOperation(
    operation: 'encrypt' | 'decrypt',
    keyId: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const audit: BackupSecurityAudit = {
      auditId: `backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      keyId,
      operation,
      timestamp: new Date(),
      deviceId: Platform.OS,
      success,
      failureReason,
      securityLevel: 'high',
    };

    this.auditTrail.push(audit);
  }

  /**
   * Get privacy-safe audit trail
   */
  getAuditTrail(): BackupSecurityAudit[] {
    return this.auditTrail.map(audit => ({
      ...audit,
      keyId: audit.keyId.substring(0, 15) + '...',
    }));
  }
}
