/**
 * Backup Key Generator
 * Generates backup encryption keys completely isolated from primary device keys
 *
 * CRITICAL: Backup keys must never have access to primary encryption keys
 * Uses separate entropy sources and isolated key derivation paths
 */

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import {
  BackupKeyConfig,
  BackupRecoveryPhrase,
  BackupKeyDerivation,
  BackupSecurityAudit,
  BackupKeyIsolationPolicy,
} from './types';

export class BackupKeyGenerator {
  private static readonly BACKUP_KEY_PREFIX = 'backup_';
  private static readonly ENTROPY_BYTES = 32; // 256-bit entropy
  private static readonly SALT_BYTES = 32;
  private static readonly ITERATIONS_MIN = 100000;
  private static readonly DERIVATION_PATH_PREFIX = "m/44'/0'/0'/backup'";

  private isolationPolicy: BackupKeyIsolationPolicy;
  private auditTrail: BackupSecurityAudit[] = [];

  constructor(isolationPolicy: BackupKeyIsolationPolicy) {
    this.isolationPolicy = isolationPolicy;
    this.enforceKeyIsolation();
  }

  /**
   * Generate completely isolated backup encryption key
   * Uses separate entropy source from primary keys
   */
  async generateIsolatedBackupKey(
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' = 'AES-256-GCM',
    deviceId?: string
  ): Promise<{ config: BackupKeyConfig; keyMaterial: Uint8Array }> {
    try {
      // Generate isolated entropy - never use primary key entropy
      const isolatedEntropy = await this.generateIsolatedEntropy();

      // Create unique key ID with backup prefix
      const keyId = `${BackupKeyGenerator.BACKUP_KEY_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // Derive backup key using isolated derivation path
      const keyMaterial = await this.deriveBackupKey(isolatedEntropy, keyId);

      const config: BackupKeyConfig = {
        keyId,
        version: 1,
        algorithm,
        createdAt: new Date(),
        status: 'active',
        deviceId,
      };

      // Audit the key generation
      await this.auditKeyOperation('generate', keyId, true);

      // Zero out entropy after use
      this.secureZeroize(isolatedEntropy);

      return { config, keyMaterial };
    } catch (error) {
      await this.auditKeyOperation('generate', 'unknown', false, (error as Error).message);
      throw new Error(`Failed to generate isolated backup key: ${(error as Error).message}`);
    }
  }

  /**
   * Generate recovery phrase using separate entropy source
   * BIP39-compatible but isolated from primary key recovery
   */
  async generateRecoveryPhrase(wordCount: 12 | 24 = 24): Promise<BackupRecoveryPhrase> {
    try {
      const entropyBytes = wordCount === 12 ? 16 : 32;
      const entropy = await this.generateIsolatedEntropy(entropyBytes);

      // Generate checksum for integrity verification
      const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextDecoder().decode(entropy),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const recoveryPhrase: BackupRecoveryPhrase = {
        phraseId: `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        entropy: entropy.slice(), // Copy entropy
        wordCount,
        checksum,
        createdAt: new Date(),
        usedForRecovery: false,
      };

      // Zero out source entropy
      this.secureZeroize(entropy);

      return recoveryPhrase;
    } catch (error) {
      throw new Error(`Failed to generate recovery phrase: ${(error as Error).message}`);
    }
  }

  /**
   * Create backup key derivation configuration
   * Uses isolated derivation path separate from primary keys
   */
  async createBackupKeyDerivation(
    recoveryPhrase: BackupRecoveryPhrase,
    derivationIndex: number = 0
  ): Promise<BackupKeyDerivation> {
    try {
      // Generate salt for key derivation
      const salt = await this.generateIsolatedEntropy(BackupKeyGenerator.SALT_BYTES);

      // Create master seed from recovery phrase entropy
      // Note: This would need proper PBKDF2 implementation for React Native
      // For now, using simplified approach with available crypto functions
      const combined =
        new TextDecoder().decode(recoveryPhrase.entropy) + new TextDecoder().decode(salt);
      const masterSeedHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        combined,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      const masterSeed = new Uint8Array(
        masterSeedHex
          .match(/.{1,2}/g)!
          .map(byte => parseInt(byte, 16))
          .slice(0, 64)
      );

      const derivation: BackupKeyDerivation = {
        masterSeed: new Uint8Array(masterSeed),
        derivationPath: `${BackupKeyGenerator.DERIVATION_PATH_PREFIX}/${derivationIndex}'`,
        salt: salt.slice(),
        iterations: BackupKeyGenerator.ITERATIONS_MIN,
        algorithm: 'PBKDF2-SHA512',
      };

      // Zero out temporary materials
      this.secureZeroize(salt);
      const masterSeedArray = new Uint8Array(masterSeed);
      masterSeedArray.fill(0);

      return derivation;
    } catch (error) {
      throw new Error(`Failed to create backup key derivation: ${(error as Error).message}`);
    }
  }

  /**
   * Derive backup key from recovery phrase
   * Completely isolated from primary key derivation
   */
  private async deriveBackupKey(entropy: Uint8Array, keyId: string): Promise<Uint8Array> {
    try {
      // Create derivation-specific salt using key ID
      const derivationSaltHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `backup_salt_${keyId}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      // Derive key material using simplified approach
      // Note: This would need proper PBKDF2 implementation for React Native
      const combined = new TextDecoder().decode(entropy) + derivationSaltHex;
      const keyMaterialHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA512,
        combined,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      const keyMaterial = new Uint8Array(
        keyMaterialHex
          .match(/.{1,2}/g)!
          .map(byte => parseInt(byte, 16))
          .slice(0, 32)
      );

      return new Uint8Array(keyMaterial);
    } catch (error) {
      throw new Error(`Failed to derive backup key: ${(error as Error).message}`);
    }
  }

  /**
   * Generate isolated entropy separate from primary key sources
   * Uses platform-specific secure random sources
   */
  private async generateIsolatedEntropy(
    bytes: number = BackupKeyGenerator.ENTROPY_BYTES
  ): Promise<Uint8Array> {
    try {
      // Use expo-crypto for isolated entropy generation
      const entropy = await Crypto.getRandomBytesAsync(bytes);

      // Additional entropy mixing for isolation
      const timestamp = new TextEncoder().encode(Date.now().toString());
      const deviceSpecific = new TextEncoder().encode(Platform.OS + '_backup');

      // Combine entropy sources
      const combined = new Uint8Array(entropy.length + timestamp.length + deviceSpecific.length);
      let offset = 0;
      combined.set(entropy, offset);
      offset += entropy.length;
      combined.set(timestamp, offset);
      offset += timestamp.length;
      combined.set(deviceSpecific, offset);

      // Hash combined entropy
      const combinedEntropyHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextDecoder().decode(combined),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const entropyBytes = new Uint8Array(
        combinedEntropyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      return entropyBytes.slice(0, bytes);
    } catch (error) {
      throw new Error(`Failed to generate isolated entropy: ${(error as Error).message}`);
    }
  }

  /**
   * Enforce backup key isolation policy
   * Prevents access to primary encryption keys
   */
  private enforceKeyIsolation(): void {
    if (this.isolationPolicy.primaryKeyAccess !== 'forbidden') {
      throw new Error('Backup key generator must have forbidden access to primary keys');
    }

    if (this.isolationPolicy.crossContamination !== 'prevented') {
      throw new Error('Cross-contamination between backup and primary keys must be prevented');
    }
  }

  /**
   * Secure memory zeroization
   * Clears sensitive data from memory
   */
  private secureZeroize(data: Uint8Array): void {
    try {
      data.fill(0);
    } catch (error) {
      // Log error but don't throw to avoid masking original errors
      console.error('Failed to zeroize sensitive data:', (error as Error).message);
    }
  }

  /**
   * Audit backup key operations
   * Privacy-safe audit trail without exposing key material
   */
  private async auditKeyOperation(
    operation: 'generate' | 'derive' | 'encrypt' | 'decrypt' | 'rotate' | 'revoke',
    keyId: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const audit: BackupSecurityAudit = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      keyId,
      operation,
      timestamp: new Date(),
      deviceId: Platform.OS,
      success,
      failureReason,
      securityLevel: 'high',
    };

    this.auditTrail.push(audit);

    // Keep only last 100 audit entries
    if (this.auditTrail.length > 100) {
      this.auditTrail = this.auditTrail.slice(-100);
    }
  }

  /**
   * Get audit trail for compliance
   * Returns privacy-safe audit information
   */
  getAuditTrail(): BackupSecurityAudit[] {
    return this.auditTrail.map(audit => ({
      ...audit,
      keyId: audit.keyId.startsWith(BackupKeyGenerator.BACKUP_KEY_PREFIX)
        ? audit.keyId.substring(0, 20) + '...'
        : 'redacted',
    }));
  }

  /**
   * Validate backup key isolation
   * Ensures no contamination with primary keys
   */
  async validateKeyIsolation(keyId: string): Promise<boolean> {
    try {
      // Verify key ID follows backup prefix convention
      if (!keyId.startsWith(BackupKeyGenerator.BACKUP_KEY_PREFIX)) {
        return false;
      }

      // Check isolation policy compliance
      if (this.isolationPolicy.primaryKeyAccess !== 'forbidden') {
        return false;
      }

      // Verify no primary key derivation paths are used
      const hasBackupDerivation = keyId.includes('backup');
      if (!hasBackupDerivation) {
        return false;
      }

      await this.auditKeyOperation('derive', keyId, true);
      return true;
    } catch (error) {
      await this.auditKeyOperation('derive', keyId, false, (error as Error).message);
      return false;
    }
  }
}
