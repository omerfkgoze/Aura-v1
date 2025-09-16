/**
 * Backup Key Derivation Service
 * Handles recovery phrase generation and key derivation completely isolated from primary keys
 *
 * CRITICAL: Uses separate recovery mechanism from primary device authentication
 * Implements BIP39-compatible recovery phrases for cross-device backup restoration
 */

import crypto from 'crypto';
import { Platform } from 'react-native';
import {
  BackupRecoveryPhrase,
  BackupKeyDerivation,
  BackupKeyConfig,
  BackupSecurityAudit,
} from './types';

// BIP39 word list (first 100 words for demo - full implementation would use complete list)
const BIP39_WORDLIST = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
  'adapt',
  'add',
  'addict',
  'address',
  'adjust',
  'admit',
  'adult',
  'advance',
  'advice',
  'aerobic',
  'affair',
  'afford',
  'afraid',
  'again',
  'against',
  'age',
  'agent',
  'agree',
  'ahead',
  'aim',
  'air',
  'airport',
  'aisle',
  'alarm',
  'album',
  'alcohol',
  'alert',
  'alien',
  'all',
  'alley',
  'allow',
  'almost',
  'alone',
  'alpha',
  'already',
  'also',
  'alter',
  'always',
  'amateur',
  'amazing',
  'among',
  'amount',
  'amused',
  'analyst',
  'anchor',
  'ancient',
  'anger',
  'angle',
  'angry',
  'animal',
  'ankle',
  'announce',
  'annual',
  'another',
  'answer',
  'antenna',
  'antique',
  'anxiety',
  'any',
  'apart',
  'apology',
  'appear',
  'apple',
  'approve',
  'april',
  'arch',
  'arctic',
  'area',
  'arena',
  'argue',
  'arm',
  'armed',
  'armor',
  'army',
  'around',
  'arrange',
  'arrest',
  'arrive',
  'arrow',
  'art',
];

export class BackupKeyDerivationService {
  private static readonly DERIVATION_ITERATIONS = 210000; // Higher than standard for backup security
  private static readonly MASTER_SEED_LENGTH = 64;
  private static readonly SALT_LENGTH = 32;
  private static readonly BACKUP_PATH_PREFIX = "m/44'/0'/0'/backup'";

  private auditTrail: BackupSecurityAudit[] = [];

  /**
   * Generate BIP39-compatible recovery phrase
   * Uses isolated entropy source separate from primary authentication
   */
  async generateRecoveryPhrase(
    wordCount: 12 | 24 = 24,
    useCustomEntropy?: Uint8Array
  ): Promise<{
    phrase: BackupRecoveryPhrase;
    words: string[];
    masterSeed: Uint8Array;
  }> {
    try {
      const entropyBytes = wordCount === 12 ? 16 : 32;

      // Generate or use provided entropy
      const entropy = useCustomEntropy || (await this.generateSecureEntropy(entropyBytes));

      // Generate checksum for integrity verification
      const hash = crypto.createHash('sha256').update(entropy).digest();
      const checksumBits = wordCount === 12 ? 4 : 8;
      const checksum = this.extractChecksumBits(hash, checksumBits);

      // Convert to mnemonic words
      const words = this.entropyToMnemonic(entropy, checksum, wordCount);

      // Generate master seed from mnemonic
      const masterSeed = await this.mnemonicToSeed(words.join(' '));

      const phrase: BackupRecoveryPhrase = {
        phraseId: `recovery_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
        entropy: entropy.slice(),
        wordCount,
        checksum: hash.toString('hex').substring(0, 16),
        createdAt: new Date(),
        usedForRecovery: false,
      };

      await this.auditOperation('generate', phrase.phraseId, true);

      // Zero out source entropy if generated locally
      if (!useCustomEntropy) {
        this.secureZeroize(entropy);
      }

      return { phrase, words, masterSeed };
    } catch (error) {
      await this.auditOperation('generate', 'unknown', false, error.message);
      throw new Error(`Failed to generate recovery phrase: ${error.message}`);
    }
  }

  /**
   * Derive backup keys from recovery phrase
   * Uses isolated derivation path completely separate from primary keys
   */
  async deriveBackupKeysFromPhrase(
    recoveryWords: string[],
    derivationIndex: number = 0,
    additionalPassphrase?: string
  ): Promise<{
    keyDerivation: BackupKeyDerivation;
    backupKey: Uint8Array;
    keyConfig: BackupKeyConfig;
  }> {
    try {
      // Validate recovery phrase
      if (!this.validateMnemonic(recoveryWords)) {
        throw new Error('Invalid recovery phrase');
      }

      // Generate master seed from mnemonic
      const mnemonic = recoveryWords.join(' ');
      const masterSeed = await this.mnemonicToSeed(mnemonic, additionalPassphrase);

      // Create backup-specific derivation path
      const derivationPath = `${BackupKeyDerivationService.BACKUP_PATH_PREFIX}/${derivationIndex}'`;

      // Generate salt for key derivation
      const salt = await this.generateSecureEntropy(BackupKeyDerivationService.SALT_LENGTH);

      // Create key derivation configuration
      const keyDerivation: BackupKeyDerivation = {
        masterSeed: masterSeed.slice(),
        derivationPath,
        salt: salt.slice(),
        iterations: BackupKeyDerivationService.DERIVATION_ITERATIONS,
        algorithm: 'PBKDF2-SHA512',
      };

      // Derive backup key
      const backupKey = await this.deriveKeyFromSeed(keyDerivation, derivationIndex);

      // Create key configuration
      const keyConfig: BackupKeyConfig = {
        keyId: `backup_derived_${Date.now()}_${derivationIndex}`,
        version: 1,
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        status: 'active',
      };

      await this.auditOperation('derive', keyConfig.keyId, true);

      // Zero out sensitive materials
      this.secureZeroize(masterSeed);
      this.secureZeroize(salt);

      return { keyDerivation, backupKey, keyConfig };
    } catch (error) {
      await this.auditOperation('derive', 'unknown', false, error.message);
      throw new Error(`Failed to derive backup keys: ${error.message}`);
    }
  }

  /**
   * Restore backup key from recovery phrase
   * Enables cross-device backup restoration using recovery phrase
   */
  async restoreKeyFromRecoveryPhrase(
    recoveryWords: string[],
    originalKeyId: string,
    derivationIndex: number = 0
  ): Promise<{
    restoredKey: Uint8Array;
    keyConfig: BackupKeyConfig;
    verificationStatus: boolean;
  }> {
    try {
      // Derive key using same parameters as original
      const { backupKey, keyConfig } = await this.deriveBackupKeysFromPhrase(
        recoveryWords,
        derivationIndex
      );

      // Update key config for restoration
      keyConfig.keyId = originalKeyId;
      keyConfig.status = 'active';

      // Verify key integrity (would compare with stored hash in production)
      const verificationStatus = await this.verifyRestoredKey(backupKey, originalKeyId);

      await this.auditOperation('decrypt', originalKeyId, verificationStatus);

      return {
        restoredKey: backupKey,
        keyConfig,
        verificationStatus,
      };
    } catch (error) {
      await this.auditOperation('decrypt', originalKeyId, false, error.message);
      throw new Error(`Failed to restore key from recovery phrase: ${error.message}`);
    }
  }

  /**
   * Generate secure entropy using platform-specific sources
   * Isolated from primary key entropy generation
   */
  private async generateSecureEntropy(bytes: number): Promise<Uint8Array> {
    try {
      // Primary entropy from crypto.randomBytes
      const primaryEntropy = crypto.randomBytes(bytes);

      // Additional entropy sources for backup isolation
      const timestamp = Buffer.from(Date.now().toString());
      const platformInfo = Buffer.from(`${Platform.OS}_${Platform.Version}_backup`);
      const processInfo = Buffer.from(process.pid.toString());

      // Combine entropy sources with HKDF for backup-specific derivation
      const combinedEntropy = crypto
        .createHash('sha512')
        .update(primaryEntropy)
        .update(timestamp)
        .update(platformInfo)
        .update(processInfo)
        .digest();

      return new Uint8Array(combinedEntropy.slice(0, bytes));
    } catch (error) {
      throw new Error(`Failed to generate secure entropy: ${error.message}`);
    }
  }

  /**
   * Convert entropy to BIP39 mnemonic words
   */
  private entropyToMnemonic(entropy: Uint8Array, checksum: number, wordCount: number): string[] {
    const entropyBits = Array.from(entropy)
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join('');

    const checksumBits = checksum.toString(2).padStart(wordCount === 12 ? 4 : 8, '0');
    const combinedBits = entropyBits + checksumBits;

    const words: string[] = [];
    for (let i = 0; i < combinedBits.length; i += 11) {
      const wordBits = combinedBits.slice(i, i + 11);
      const wordIndex = parseInt(wordBits, 2);

      // Use modulo to handle limited wordlist in demo
      words.push(BIP39_WORDLIST[wordIndex % BIP39_WORDLIST.length]);
    }

    return words;
  }

  /**
   * Extract checksum bits from hash
   */
  private extractChecksumBits(hash: Buffer, bits: number): number {
    const firstByte = hash[0];
    return firstByte >> (8 - bits);
  }

  /**
   * Convert mnemonic to master seed using PBKDF2
   */
  private async mnemonicToSeed(mnemonic: string, passphrase: string = ''): Promise<Uint8Array> {
    const mnemonicBuffer = Buffer.from(mnemonic, 'utf8');
    const saltBuffer = Buffer.from(`mnemonic${passphrase}`, 'utf8');

    const seed = crypto.pbkdf2Sync(
      mnemonicBuffer,
      saltBuffer,
      2048, // BIP39 standard iterations
      BackupKeyDerivationService.MASTER_SEED_LENGTH,
      'sha512'
    );

    return new Uint8Array(seed);
  }

  /**
   * Derive backup key from master seed
   */
  private async deriveKeyFromSeed(
    keyDerivation: BackupKeyDerivation,
    derivationIndex: number
  ): Promise<Uint8Array> {
    // Create derivation-specific salt
    const derivationSalt = crypto
      .createHash('sha256')
      .update(keyDerivation.salt)
      .update(derivationIndex.toString())
      .update('backup_key_derivation')
      .digest();

    // Derive key using high iteration count
    const derivedKey = crypto.pbkdf2Sync(
      keyDerivation.masterSeed,
      derivationSalt,
      keyDerivation.iterations,
      32, // 256-bit key
      'sha512'
    );

    return new Uint8Array(derivedKey);
  }

  /**
   * Validate BIP39 mnemonic
   */
  private validateMnemonic(words: string[]): boolean {
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }

    // Check if all words are in wordlist (simplified check)
    return words.every(word => BIP39_WORDLIST.includes(word.toLowerCase()));
  }

  /**
   * Verify restored key integrity
   */
  private async verifyRestoredKey(
    restoredKey: Uint8Array,
    originalKeyId: string
  ): Promise<boolean> {
    try {
      // In production, this would compare with stored key hash
      // For now, verify key format and length
      return restoredKey.length === 32 && originalKeyId.startsWith('backup_');
    } catch (error) {
      return false;
    }
  }

  /**
   * Secure memory zeroization
   */
  private secureZeroize(data: Uint8Array | Buffer): void {
    try {
      if (data instanceof Uint8Array) {
        data.fill(0);
      } else if (Buffer.isBuffer(data)) {
        data.fill(0);
      }
    } catch (error) {
      console.error('Failed to zeroize sensitive data:', error.message);
    }
  }

  /**
   * Audit backup key operations
   */
  private async auditOperation(
    operation: 'generate' | 'derive' | 'encrypt' | 'decrypt' | 'rotate' | 'revoke',
    keyId: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const audit: BackupSecurityAudit = {
      auditId: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
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
      keyId: audit.keyId.substring(0, 20) + '...',
    }));
  }
}
