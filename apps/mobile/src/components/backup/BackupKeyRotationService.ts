/**
 * Backup Key Rotation Service
 * Handles backup key rotation and emergency revocation procedures
 *
 * CRITICAL: Maintains backup key isolation during rotation
 * Provides emergency revocation for security incidents
 */

import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  BackupKeyConfig,
  BackupKeyRotationEvent,
  BackupSecurityAudit,
  EncryptedBackupData,
} from './types';
import { BackupKeyGenerator } from './BackupKeyGenerator';
import { SecureEnclaveStorage } from './SecureEnclaveStorage';
import { BackupDataEncryption } from './BackupDataEncryption';

export class BackupKeyRotationService {
  private static readonly ROTATION_SCHEDULE_DAYS = 90; // Rotate every 90 days
  private static readonly EMERGENCY_ROTATION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_ROTATION_RETRIES = 3;

  private keyGenerator: BackupKeyGenerator;
  private enclaveStorage: SecureEnclaveStorage;
  private dataEncryption: BackupDataEncryption;
  private auditTrail: BackupSecurityAudit[] = [];
  private rotationEvents: BackupKeyRotationEvent[] = [];

  constructor(
    keyGenerator: BackupKeyGenerator,
    enclaveStorage: SecureEnclaveStorage,
    dataEncryption: BackupDataEncryption
  ) {
    this.keyGenerator = keyGenerator;
    this.enclaveStorage = enclaveStorage;
    this.dataEncryption = dataEncryption;
  }

  /**
   * Schedule backup key rotation
   * Rotates backup keys on a regular schedule for security
   */
  async scheduleKeyRotation(
    currentKeyConfig: BackupKeyConfig,
    deviceIds: string[]
  ): Promise<BackupKeyRotationEvent> {
    try {
      return this.performKeyRotation(
        currentKeyConfig,
        deviceIds,
        'scheduled',
        `Scheduled rotation after ${BackupKeyRotationService.ROTATION_SCHEDULE_DAYS} days`
      );
    } catch (error) {
      throw new Error(`Failed to schedule key rotation: ${(error as Error).message}`);
    }
  }

  /**
   * Emergency backup key rotation
   * Immediate key rotation in case of security incident
   */
  async emergencyKeyRotation(
    currentKeyConfig: BackupKeyConfig,
    deviceIds: string[],
    reason: string
  ): Promise<BackupKeyRotationEvent> {
    try {
      return this.performKeyRotation(
        currentKeyConfig,
        deviceIds,
        'emergency',
        `Emergency rotation: ${reason}`
      );
    } catch (error) {
      throw new Error(`Failed to perform emergency key rotation: ${(error as Error).message}`);
    }
  }

  /**
   * Security incident key rotation
   * Rotation triggered by detected security incident
   */
  async securityIncidentRotation(
    currentKeyConfig: BackupKeyConfig,
    deviceIds: string[],
    incidentDetails: string
  ): Promise<BackupKeyRotationEvent> {
    try {
      // Mark current key as compromised
      currentKeyConfig.status = 'emergency_revoked';

      return this.performKeyRotation(
        currentKeyConfig,
        deviceIds,
        'security_incident',
        `Security incident rotation: ${incidentDetails}`
      );
    } catch (error) {
      throw new Error(`Failed to perform security incident rotation: ${(error as Error).message}`);
    }
  }

  /**
   * Revoke backup key immediately
   * Emergency revocation without rotation
   */
  async emergencyKeyRevocation(
    keyConfig: BackupKeyConfig,
    deviceIds: string[],
    reason: string
  ): Promise<{
    revoked: boolean;
    affectedDevices: string[];
    revocationTimestamp: Date;
  }> {
    try {
      const revocationTimestamp = new Date();
      const affectedDevices: string[] = [];

      // Mark key as emergency revoked
      keyConfig.status = 'emergency_revoked';

      // Revoke key from all devices
      for (const deviceId of deviceIds) {
        try {
          const enclaveReference = `backup_${keyConfig.keyId}_${deviceId}`;
          const deleted = await this.enclaveStorage.deleteBackupKey(
            keyConfig.keyId,
            enclaveReference
          );

          if (deleted) {
            affectedDevices.push(deviceId);
          }
        } catch (error) {
          // Log but continue with other devices
          await this.auditOperation(
            'revoke',
            keyConfig.keyId,
            false,
            `Failed to revoke from device ${deviceId}: ${(error as Error).message}`
          );
        }
      }

      // Create revocation event
      const revocationEvent: BackupKeyRotationEvent = {
        eventId: `revocation_${Date.now()}_${Array.from(await Crypto.getRandomBytesAsync(8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')}`,
        oldKeyId: keyConfig.keyId,
        newKeyId: 'REVOKED',
        rotationType: 'emergency',
        timestamp: revocationTimestamp,
        deviceIds: affectedDevices,
        migrationStatus: 'completed',
      };

      this.rotationEvents.push(revocationEvent);
      await this.auditOperation('revoke', keyConfig.keyId, true, reason);

      return {
        revoked: affectedDevices.length > 0,
        affectedDevices,
        revocationTimestamp,
      };
    } catch (error) {
      await this.auditOperation('revoke', keyConfig.keyId, false, (error as Error).message);
      throw new Error(`Failed to perform emergency revocation: ${(error as Error).message}`);
    }
  }

  /**
   * Migrate backup data to new key
   * Re-encrypts existing backup data with new key during rotation
   */
  async migrateBackupDataToNewKey(
    encryptedBackups: EncryptedBackupData[],
    oldKey: Uint8Array,
    newKey: Uint8Array,
    newKeyConfig: BackupKeyConfig
  ): Promise<{
    migratedBackups: EncryptedBackupData[];
    migrationSuccess: boolean;
    failedMigrations: string[];
  }> {
    try {
      const migratedBackups: EncryptedBackupData[] = [];
      const failedMigrations: string[] = [];

      for (const backup of encryptedBackups) {
        try {
          // Decrypt with old key
          const { cycleData } = await this.dataEncryption.decryptBackupForRestore(backup, oldKey, {
            backupId: backup.backupId,
            targetDeviceId: backup.deviceOrigin,
            recoveryKeyId: newKeyConfig.keyId,
            restoreTimestamp: new Date(),
            dataIntegrityVerified: false,
            conflictResolutionStrategy: 'replace',
          });

          // Re-encrypt with new key
          const newBackup = await this.dataEncryption.encryptCycleDataForBackup(
            cycleData,
            newKey,
            newKeyConfig,
            backup.deviceOrigin
          );

          migratedBackups.push(newBackup);
        } catch (error) {
          failedMigrations.push(`${backup.backupId}: ${(error as Error).message}`);
        }
      }

      // Zero out old key after migration
      this.secureZeroize(oldKey);

      const migrationSuccess = failedMigrations.length === 0;
      await this.auditOperation(
        'rotate',
        newKeyConfig.keyId,
        migrationSuccess,
        migrationSuccess
          ? 'Data migration completed'
          : `${failedMigrations.length} migrations failed`
      );

      return {
        migratedBackups,
        migrationSuccess,
        failedMigrations,
      };
    } catch (error) {
      await this.auditOperation('rotate', newKeyConfig.keyId, false, (error as Error).message);
      throw new Error(`Failed to migrate backup data: ${(error as Error).message}`);
    }
  }

  /**
   * Check if key rotation is due
   * Determines if scheduled rotation should be performed
   */
  async isRotationDue(keyConfig: BackupKeyConfig): Promise<{
    isDue: boolean;
    daysSinceCreation: number;
    daysUntilRotation: number;
    reason: string;
  }> {
    try {
      const now = new Date();
      const keyAge = now.getTime() - keyConfig.createdAt.getTime();
      const daysSinceCreation = Math.floor(keyAge / (24 * 60 * 60 * 1000));
      const daysUntilRotation = BackupKeyRotationService.ROTATION_SCHEDULE_DAYS - daysSinceCreation;

      let isDue = false;
      let reason = '';

      if (daysSinceCreation >= BackupKeyRotationService.ROTATION_SCHEDULE_DAYS) {
        isDue = true;
        reason = 'Scheduled rotation due';
      } else if (keyConfig.status === 'rotating') {
        isDue = true;
        reason = 'Rotation in progress';
      } else if (keyConfig.status === 'revoked' || keyConfig.status === 'emergency_revoked') {
        isDue = true;
        reason = 'Key revoked - rotation required';
      }

      return {
        isDue,
        daysSinceCreation,
        daysUntilRotation: Math.max(0, daysUntilRotation),
        reason,
      };
    } catch (error) {
      return {
        isDue: true,
        daysSinceCreation: 0,
        daysUntilRotation: 0,
        reason: `Error checking rotation status: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Perform key rotation with retry logic
   */
  private async performKeyRotation(
    currentKeyConfig: BackupKeyConfig,
    deviceIds: string[],
    rotationType: 'scheduled' | 'emergency' | 'security_incident',
    reason: string
  ): Promise<BackupKeyRotationEvent> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < BackupKeyRotationService.MAX_ROTATION_RETRIES) {
      try {
        return await this.executeKeyRotation(currentKeyConfig, deviceIds, rotationType, reason);
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount < BackupKeyRotationService.MAX_ROTATION_RETRIES) {
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, retryCount) * 1000);
        }
      }
    }

    throw new Error(
      `Key rotation failed after ${BackupKeyRotationService.MAX_ROTATION_RETRIES} retries: ${lastError?.message}`
    );
  }

  /**
   * Execute the key rotation process
   */
  private async executeKeyRotation(
    currentKeyConfig: BackupKeyConfig,
    deviceIds: string[],
    rotationType: 'scheduled' | 'emergency' | 'security_incident',
    reason: string
  ): Promise<BackupKeyRotationEvent> {
    const rotationEvent: BackupKeyRotationEvent = {
      eventId: `rotation_${Date.now()}_${Array.from(await Crypto.getRandomBytesAsync(8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`,
      oldKeyId: currentKeyConfig.keyId,
      newKeyId: '',
      rotationType,
      timestamp: new Date(),
      deviceIds,
      migrationStatus: 'pending',
    };

    try {
      // Mark current key as rotating
      currentKeyConfig.status = 'rotating';
      rotationEvent.migrationStatus = 'in_progress';

      // Generate new backup key
      const { config: newKeyConfig, keyMaterial: newKeyMaterial } =
        await this.keyGenerator.generateIsolatedBackupKey(currentKeyConfig.algorithm);

      rotationEvent.newKeyId = newKeyConfig.keyId;

      // Store new key in secure enclave for each device
      for (const deviceId of deviceIds) {
        const enclaveReference = `backup_${newKeyConfig.keyId}_${deviceId}`;
        await this.enclaveStorage.storeBackupKey(
          newKeyConfig,
          newKeyMaterial,
          true // Require authentication
        );
      }

      // Mark old key as revoked
      currentKeyConfig.status = 'revoked';

      // Mark rotation as completed
      rotationEvent.migrationStatus = 'completed';
      newKeyConfig.status = 'active';

      this.rotationEvents.push(rotationEvent);
      await this.auditOperation('rotate', newKeyConfig.keyId, true, reason);

      // Zero out new key material after storage
      this.secureZeroize(newKeyMaterial);

      return rotationEvent;
    } catch (error) {
      rotationEvent.migrationStatus = 'failed';
      this.rotationEvents.push(rotationEvent);
      await this.auditOperation('rotate', currentKeyConfig.keyId, false, (error as Error).message);
      throw error;
    }
  }

  /**
   * Get rotation history
   */
  getRotationHistory(): BackupKeyRotationEvent[] {
    return this.rotationEvents.map(event => ({
      ...event,
      oldKeyId: event.oldKeyId.substring(0, 20) + '...',
      newKeyId: event.newKeyId === 'REVOKED' ? 'REVOKED' : event.newKeyId.substring(0, 20) + '...',
    }));
  }

  /**
   * Clean up old rotation events
   */
  async cleanupOldRotationEvents(maxAge: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    const initialCount = this.rotationEvents.length;

    this.rotationEvents = this.rotationEvents.filter(event => event.timestamp > cutoffDate);

    return initialCount - this.rotationEvents.length;
  }

  /**
   * Utility: Secure memory zeroization
   */
  private secureZeroize(data: Uint8Array): void {
    try {
      data.fill(0);
    } catch (error) {
      console.error('Failed to zeroize sensitive data:', (error as Error).message);
    }
  }

  /**
   * Utility: Delay function for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Audit backup key operations
   */
  private async auditOperation(
    operation: 'rotate' | 'revoke',
    keyId: string,
    success: boolean,
    reason?: string
  ): Promise<void> {
    const audit: BackupSecurityAudit = {
      auditId: `rotation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      keyId,
      operation,
      timestamp: new Date(),
      deviceId: Platform.OS,
      success,
      failureReason: reason,
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
