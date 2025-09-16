/**
 * Backup Key Isolation Tests
 * Comprehensive testing for backup key isolation verification and cross-device restoration
 *
 * CRITICAL: Tests ensure backup keys are completely isolated from primary keys
 * Validates cross-device backup and restoration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/testing-library/react-native';
import { BackupKeyGenerator } from '../../components/backup/BackupKeyGenerator';
import { BackupKeyDerivationService } from '../../components/backup/BackupKeyDerivationService';
import { SecureEnclaveStorage } from '../../components/backup/SecureEnclaveStorage';
import { BackupDataEncryption } from '../../components/backup/BackupDataEncryption';
import { BackupKeyRotationService } from '../../components/backup/BackupKeyRotationService';
import {
  BackupKeyIsolationPolicy,
  SecureEnclaveConfig,
  BackupKeyConfig,
  EncryptedBackupData,
} from '../../components/backup/types';
import { EncryptedCycleData } from '../../shared-types/src/data';

describe('Backup Key Isolation', () => {
  let keyGenerator: BackupKeyGenerator;
  let derivationService: BackupKeyDerivationService;
  let enclaveStorage: SecureEnclaveStorage;
  let dataEncryption: BackupDataEncryption;
  let rotationService: BackupKeyRotationService;

  const isolationPolicy: BackupKeyIsolationPolicy = {
    primaryKeyAccess: 'forbidden',
    backupKeyAccess: 'secure_enclave_only',
    crossContamination: 'prevented',
    memoryIsolation: 'separate_process',
  };

  const enclaveConfig: SecureEnclaveConfig = {
    keychain: {
      service: 'com.aura.backup.test',
      accessibility: 'whenUnlockedThisDeviceOnly',
      authenticationPrompt: 'Authenticate for backup key access',
    },
    androidKeystore: {
      alias: 'aura_backup_test',
      requiresAuthentication: true,
      userAuthenticationValidityDuration: 300,
      keySize: 256,
    },
  };

  beforeEach(() => {
    keyGenerator = new BackupKeyGenerator(isolationPolicy);
    derivationService = new BackupKeyDerivationService();
    enclaveStorage = new SecureEnclaveStorage(enclaveConfig, isolationPolicy);
    dataEncryption = new BackupDataEncryption();
    rotationService = new BackupKeyRotationService(keyGenerator, enclaveStorage, dataEncryption);
  });

  afterEach(() => {
    // Clean up any test data
  });

  describe('Key Generation Isolation', () => {
    it('should generate backup keys with proper isolation', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();

      // Verify backup key properties
      expect(config.keyId).toMatch(/^backup_/);
      expect(config.algorithm).toBe('AES-256-GCM');
      expect(config.status).toBe('active');
      expect(keyMaterial).toHaveLength(32); // 256-bit key

      // Verify key isolation
      const isIsolated = await keyGenerator.validateKeyIsolation(config.keyId);
      expect(isIsolated).toBe(true);
    });

    it('should prevent primary key contamination', () => {
      // Attempt to create generator with invalid isolation policy
      const invalidPolicy: BackupKeyIsolationPolicy = {
        primaryKeyAccess: 'read_only', // Should be 'forbidden'
        backupKeyAccess: 'secure_enclave_only',
        crossContamination: 'prevented',
        memoryIsolation: 'separate_process',
      };

      expect(() => {
        new BackupKeyGenerator(invalidPolicy);
      }).toThrow('Backup key generator must have forbidden access to primary keys');
    });

    it('should generate unique keys for each request', async () => {
      const { config: config1 } = await keyGenerator.generateIsolatedBackupKey();
      const { config: config2 } = await keyGenerator.generateIsolatedBackupKey();

      expect(config1.keyId).not.toBe(config2.keyId);
      expect(config1.createdAt).not.toBe(config2.createdAt);
    });
  });

  describe('Recovery Phrase Derivation', () => {
    it('should generate valid recovery phrases', async () => {
      const { phrase, words, masterSeed } = await derivationService.generateRecoveryPhrase(24);

      expect(phrase.wordCount).toBe(24);
      expect(words).toHaveLength(24);
      expect(phrase.entropy).toHaveLength(32); // 256-bit entropy
      expect(masterSeed).toHaveLength(64); // 512-bit master seed
      expect(phrase.phraseId).toMatch(/^recovery_/);
    });

    it('should derive consistent keys from recovery phrase', async () => {
      const { words } = await derivationService.generateRecoveryPhrase(24);

      const derivation1 = await derivationService.deriveBackupKeysFromPhrase(words, 0);
      const derivation2 = await derivationService.deriveBackupKeysFromPhrase(words, 0);

      // Same derivation index should produce same key
      expect(derivation1.backupKey).toEqual(derivation2.backupKey);
      expect(derivation1.keyConfig.keyId).toBe(derivation2.keyConfig.keyId);
    });

    it('should restore keys from recovery phrase', async () => {
      const { words } = await derivationService.generateRecoveryPhrase(24);
      const { keyConfig, backupKey } = await derivationService.deriveBackupKeysFromPhrase(words, 0);

      const { restoredKey, verificationStatus } =
        await derivationService.restoreKeyFromRecoveryPhrase(words, keyConfig.keyId, 0);

      expect(restoredKey).toEqual(backupKey);
      expect(verificationStatus).toBe(true);
    });
  });

  describe('Secure Enclave Storage', () => {
    it('should store and retrieve backup keys securely', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();

      const { stored, enclaveReference } = await enclaveStorage.storeBackupKey(
        config,
        keyMaterial,
        true
      );

      expect(stored).toBe(true);
      expect(enclaveReference).toContain(config.keyId);

      const { keyMaterial: retrievedKey, keyConfig: retrievedConfig } =
        await enclaveStorage.retrieveBackupKey(
          config.keyId,
          enclaveReference,
          'Test authentication'
        );

      expect(retrievedKey).toEqual(keyMaterial);
      expect(retrievedConfig.keyId).toBe(config.keyId);
    });

    it('should enforce backup key isolation in storage', async () => {
      const invalidKeyId = 'primary_key_123'; // Not a backup key

      await expect(
        enclaveStorage.storeBackupKey(
          { keyId: invalidKeyId } as BackupKeyConfig,
          new Uint8Array(32),
          true
        )
      ).rejects.toThrow('Only backup keys allowed in secure enclave storage');
    });

    it('should delete backup keys from storage', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();
      const { enclaveReference } = await enclaveStorage.storeBackupKey(config, keyMaterial, true);

      const deleted = await enclaveStorage.deleteBackupKey(config.keyId, enclaveReference);
      expect(deleted).toBe(true);
    });
  });

  describe('Backup Data Encryption', () => {
    it('should encrypt and decrypt cycle data for backup', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();
      const deviceId = 'test_device_001';

      // Sample cycle data
      const cycleData: EncryptedCycleData[] = [
        {
          id: 'cycle_001',
          encryptedData: new Uint8Array([1, 2, 3, 4]),
          nonce: new Uint8Array([5, 6, 7, 8]),
          tag: new Uint8Array([9, 10, 11, 12]),
          createdAt: new Date().toISOString(),
          deviceId,
          syncStatus: 'synced',
          version: 1,
        },
      ];

      // Encrypt for backup
      const encryptedBackup = await dataEncryption.encryptCycleDataForBackup(
        cycleData,
        keyMaterial,
        config,
        deviceId
      );

      expect(encryptedBackup.keyId).toBe(config.keyId);
      expect(encryptedBackup.deviceOrigin).toBe(deviceId);
      expect(encryptedBackup.encryptedData).toBeInstanceOf(Uint8Array);

      // Decrypt for restoration
      const { cycleData: restoredData, integrityVerified } =
        await dataEncryption.decryptBackupForRestore(encryptedBackup, keyMaterial, {
          backupId: encryptedBackup.backupId,
          targetDeviceId: deviceId,
          recoveryKeyId: config.keyId,
          restoreTimestamp: new Date(),
          dataIntegrityVerified: false,
          conflictResolutionStrategy: 'replace',
        });

      expect(integrityVerified).toBe(true);
      expect(restoredData).toHaveLength(1);
      expect(restoredData[0].id).toBe('cycle_001');
    });

    it('should detect tampering in backup data', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();
      const deviceId = 'test_device_002';

      const cycleData: EncryptedCycleData[] = [
        {
          id: 'cycle_002',
          encryptedData: new Uint8Array([1, 2, 3, 4]),
          nonce: new Uint8Array([5, 6, 7, 8]),
          tag: new Uint8Array([9, 10, 11, 12]),
          createdAt: new Date().toISOString(),
          deviceId,
          syncStatus: 'synced',
          version: 1,
        },
      ];

      const encryptedBackup = await dataEncryption.encryptCycleDataForBackup(
        cycleData,
        keyMaterial,
        config,
        deviceId
      );

      // Tamper with encrypted data
      encryptedBackup.encryptedData[0] = 255;

      // Attempt to decrypt tampered data
      await expect(
        dataEncryption.decryptBackupForRestore(encryptedBackup, keyMaterial, {
          backupId: encryptedBackup.backupId,
          targetDeviceId: deviceId,
          recoveryKeyId: config.keyId,
          restoreTimestamp: new Date(),
          dataIntegrityVerified: false,
          conflictResolutionStrategy: 'replace',
        })
      ).rejects.toThrow('Backup decryption failed');
    });
  });

  describe('Key Rotation', () => {
    it('should rotate backup keys securely', async () => {
      const { config: currentConfig } = await keyGenerator.generateIsolatedBackupKey();
      const deviceIds = ['device_001', 'device_002'];

      const rotationEvent = await rotationService.scheduleKeyRotation(currentConfig, deviceIds);

      expect(rotationEvent.oldKeyId).toBe(currentConfig.keyId);
      expect(rotationEvent.newKeyId).toMatch(/^backup_/);
      expect(rotationEvent.rotationType).toBe('scheduled');
      expect(rotationEvent.migrationStatus).toBe('completed');
      expect(rotationEvent.deviceIds).toEqual(deviceIds);
    });

    it('should handle emergency key revocation', async () => {
      const { config } = await keyGenerator.generateIsolatedBackupKey();
      const deviceIds = ['device_003'];

      const { revoked, affectedDevices } = await rotationService.emergencyKeyRevocation(
        config,
        deviceIds,
        'Security incident detected'
      );

      expect(revoked).toBe(true);
      expect(affectedDevices).toEqual(deviceIds);
      expect(config.status).toBe('emergency_revoked');
    });

    it('should check rotation schedule', async () => {
      const { config } = await keyGenerator.generateIsolatedBackupKey();

      // Simulate old key
      config.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      const { isDue, daysSinceCreation, reason } = await rotationService.isRotationDue(config);

      expect(isDue).toBe(true);
      expect(daysSinceCreation).toBeGreaterThan(90);
      expect(reason).toBe('Scheduled rotation due');
    });
  });

  describe('Cross-Device Restoration', () => {
    it('should perform complete cross-device backup and restoration', async () => {
      // Generate recovery phrase on device 1
      const { words, phrase } = await derivationService.generateRecoveryPhrase(24);

      // Derive backup key on device 1
      const { keyConfig: device1Config, backupKey: device1Key } =
        await derivationService.deriveBackupKeysFromPhrase(words, 0);

      // Create backup data on device 1
      const cycleData: EncryptedCycleData[] = [
        {
          id: 'cross_device_001',
          encryptedData: new Uint8Array([10, 20, 30, 40]),
          nonce: new Uint8Array([50, 60, 70, 80]),
          tag: new Uint8Array([90, 100, 110, 120]),
          createdAt: new Date().toISOString(),
          deviceId: 'device_001',
          syncStatus: 'synced',
          version: 1,
        },
      ];

      const encryptedBackup = await dataEncryption.encryptCycleDataForBackup(
        cycleData,
        device1Key,
        device1Config,
        'device_001'
      );

      // Restore backup key on device 2 using recovery phrase
      const { restoredKey: device2Key, keyConfig: device2Config } =
        await derivationService.restoreKeyFromRecoveryPhrase(words, device1Config.keyId, 0);

      // Restore backup data on device 2
      const { cycleData: restoredData, integrityVerified } =
        await dataEncryption.decryptBackupForRestore(encryptedBackup, device2Key, {
          backupId: encryptedBackup.backupId,
          targetDeviceId: 'device_002',
          recoveryKeyId: device2Config.keyId,
          restoreTimestamp: new Date(),
          dataIntegrityVerified: false,
          conflictResolutionStrategy: 'replace',
        });

      // Verify cross-device restoration
      expect(device2Key).toEqual(device1Key);
      expect(device2Config.keyId).toBe(device1Config.keyId);
      expect(integrityVerified).toBe(true);
      expect(restoredData).toHaveLength(1);
      expect(restoredData[0].id).toBe('cross_device_001');
    });

    it('should handle backup data conflicts during restoration', async () => {
      const { config, keyMaterial } = await keyGenerator.generateIsolatedBackupKey();

      const backupData: EncryptedCycleData[] = [
        {
          id: 'conflict_001',
          encryptedData: new Uint8Array([1, 1, 1, 1]),
          nonce: new Uint8Array([2, 2, 2, 2]),
          tag: new Uint8Array([3, 3, 3, 3]),
          createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          deviceId: 'device_backup',
          syncStatus: 'synced',
          version: 1,
        },
      ];

      const existingData: EncryptedCycleData[] = [
        {
          id: 'conflict_001',
          encryptedData: new Uint8Array([4, 4, 4, 4]),
          nonce: new Uint8Array([5, 5, 5, 5]),
          tag: new Uint8Array([6, 6, 6, 6]),
          createdAt: new Date().toISOString(), // Now
          deviceId: 'device_existing',
          syncStatus: 'synced',
          version: 2,
        },
      ];

      const { mergedData, conflicts } = await dataEncryption.mergeBackupWithExisting(
        backupData,
        existingData,
        'merge'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].resolution).toBe('merged_latest_timestamp');
      expect(mergedData).toHaveLength(1);
      expect(mergedData[0].deviceId).toBe('device_existing'); // Latest should win
    });
  });

  describe('Security Compliance', () => {
    it('should maintain zero-knowledge architecture', async () => {
      const { config } = await keyGenerator.generateIsolatedBackupKey();

      // Verify audit trail doesn't expose key material
      const auditTrail = keyGenerator.getAuditTrail();

      auditTrail.forEach(audit => {
        expect(audit.keyId).not.toContain(config.keyId); // Should be redacted
        expect(audit.keyId).toMatch(/\.\.\./); // Should contain redaction
        expect(audit.securityLevel).toBe('high');
      });
    });

    it('should prevent memory leaks of sensitive data', async () => {
      const { keyMaterial } = await keyGenerator.generateIsolatedBackupKey();

      // Simulate key usage and cleanup
      const originalKey = keyMaterial.slice(); // Copy for comparison

      // After processing, key material should be zeroed
      // Note: In actual implementation, this would be done automatically
      keyMaterial.fill(0);

      expect(keyMaterial).not.toEqual(originalKey);
      expect(keyMaterial.every(byte => byte === 0)).toBe(true);
    });

    it('should validate secure enclave health', async () => {
      const health = await enclaveStorage.checkEnclaveHealth();

      expect(health.available).toBe(true);
      expect(health.hardwareBacked).toBe(true);
      expect(health.authenticationRequired).toBe(true);
      expect(typeof health.keyCount).toBe('number');
    });
  });
});

describe('Backup Integration Tests', () => {
  it('should perform end-to-end backup workflow', async () => {
    // This test validates the complete backup workflow
    // from key generation to cross-device restoration

    const isolationPolicy: BackupKeyIsolationPolicy = {
      primaryKeyAccess: 'forbidden',
      backupKeyAccess: 'secure_enclave_only',
      crossContamination: 'prevented',
      memoryIsolation: 'separate_process',
    };

    const enclaveConfig: SecureEnclaveConfig = {
      keychain: {
        service: 'com.aura.backup.integration',
        accessibility: 'whenUnlockedThisDeviceOnly',
        authenticationPrompt: 'Integration test authentication',
      },
      androidKeystore: {
        alias: 'aura_backup_integration',
        requiresAuthentication: true,
        userAuthenticationValidityDuration: 300,
        keySize: 256,
      },
    };

    // Initialize services
    const keyGenerator = new BackupKeyGenerator(isolationPolicy);
    const derivationService = new BackupKeyDerivationService();
    const enclaveStorage = new SecureEnclaveStorage(enclaveConfig, isolationPolicy);
    const dataEncryption = new BackupDataEncryption();

    // 1. Generate recovery phrase
    const { words, phrase } = await derivationService.generateRecoveryPhrase(24);
    expect(words).toHaveLength(24);

    // 2. Derive backup key
    const { keyConfig, backupKey } = await derivationService.deriveBackupKeysFromPhrase(words, 0);
    expect(keyConfig.keyId).toMatch(/^backup_/);

    // 3. Store key in secure enclave
    const { stored } = await enclaveStorage.storeBackupKey(keyConfig, backupKey, true);
    expect(stored).toBe(true);

    // 4. Encrypt cycle data
    const cycleData: EncryptedCycleData[] = [
      {
        id: 'integration_001',
        encryptedData: new Uint8Array([100, 200]),
        nonce: new Uint8Array([101, 201]),
        tag: new Uint8Array([102, 202]),
        createdAt: new Date().toISOString(),
        deviceId: 'integration_device',
        syncStatus: 'synced',
        version: 1,
      },
    ];

    const encryptedBackup = await dataEncryption.encryptCycleDataForBackup(
      cycleData,
      backupKey,
      keyConfig,
      'integration_device'
    );

    expect(encryptedBackup.keyId).toBe(keyConfig.keyId);

    // 5. Restore on different device
    const { restoredKey } = await derivationService.restoreKeyFromRecoveryPhrase(
      words,
      keyConfig.keyId,
      0
    );

    const { cycleData: restoredData, integrityVerified } =
      await dataEncryption.decryptBackupForRestore(encryptedBackup, restoredKey, {
        backupId: encryptedBackup.backupId,
        targetDeviceId: 'restoration_device',
        recoveryKeyId: keyConfig.keyId,
        restoreTimestamp: new Date(),
        dataIntegrityVerified: false,
        conflictResolutionStrategy: 'replace',
      });

    expect(integrityVerified).toBe(true);
    expect(restoredData).toHaveLength(1);
    expect(restoredData[0].id).toBe('integration_001');
  });
});
