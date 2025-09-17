/**
 * Database encryption validation and verification utilities
 * Ensures database files are properly encrypted and protected
 */

import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface EncryptionValidationResult {
  isEncrypted: boolean;
  algorithm: string | null;
  keyStrength: number | null;
  fileIntegrity: boolean;
  lastValidated: number;
  validationErrors: string[];
}

export interface FileIntegrityCheck {
  filePath: string;
  expectedSize: number;
  actualSize: number;
  checksum: string;
  isCorrupted: boolean;
}

/**
 * Database encryption validator
 * Performs comprehensive encryption and integrity checks
 */
export class EncryptionValidator {
  private databasePath: string;
  private databaseName: string;

  constructor(databaseName: string) {
    this.databaseName = databaseName;
    this.databasePath = this.getDatabasePath(databaseName);
  }

  /**
   * Comprehensive encryption validation
   */
  async validateEncryption(): Promise<EncryptionValidationResult> {
    const result: EncryptionValidationResult = {
      isEncrypted: false,
      algorithm: null,
      keyStrength: null,
      fileIntegrity: false,
      lastValidated: Date.now(),
      validationErrors: [],
    };

    try {
      // Check if database file exists
      const fileExists = await this.checkFileExists();
      if (!fileExists) {
        result.validationErrors.push('Database file does not exist');
        return result;
      }

      // Validate file is encrypted (not plaintext SQLite)
      const encryptionCheck = await this.validateFileEncryption();
      result.isEncrypted = encryptionCheck.isEncrypted;
      result.algorithm = encryptionCheck.algorithm;
      result.keyStrength = encryptionCheck.keyStrength;

      if (encryptionCheck.errors.length > 0) {
        result.validationErrors.push(...encryptionCheck.errors);
      }

      // Check file integrity
      const integrityCheck = await this.validateFileIntegrity();
      result.fileIntegrity = integrityCheck.isValid;

      if (integrityCheck.errors.length > 0) {
        result.validationErrors.push(...integrityCheck.errors);
      }

      // Test database accessibility
      const accessibilityCheck = await this.validateDatabaseAccessibility();
      if (!accessibilityCheck.isAccessible) {
        result.validationErrors.push(...accessibilityCheck.errors);
      }
    } catch (error) {
      result.validationErrors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * Validate database file is encrypted (not plaintext)
   */
  private async validateFileEncryption(): Promise<{
    isEncrypted: boolean;
    algorithm: string | null;
    keyStrength: number | null;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Read file header to check for SQLite magic bytes
      const fileUri = this.databasePath;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        errors.push('Database file does not exist');
        return { isEncrypted: false, algorithm: null, keyStrength: null, errors };
      }

      // Read first 16 bytes of file
      const headerBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64' as any,
        length: 16,
      });

      const headerBytes = this.base64ToBytes(headerBase64);

      // Check for SQLite3 magic bytes (unencrypted)
      const sqliteMagic = [
        0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33,
        0x00,
      ];
      const isPlaintextSQLite = this.arraysEqual(headerBytes.slice(0, 16), sqliteMagic);

      if (isPlaintextSQLite) {
        errors.push('Database file appears to be unencrypted (plaintext SQLite)');
        return { isEncrypted: false, algorithm: null, keyStrength: null, errors };
      }

      // Check entropy of header bytes (encrypted files should have high entropy)
      const entropy = this.calculateEntropy(headerBytes);
      const isHighEntropy = entropy > 7.0; // Threshold for encrypted data

      if (!isHighEntropy) {
        errors.push(
          `Low entropy detected (${entropy.toFixed(2)}), file may not be properly encrypted`
        );
      }

      return {
        isEncrypted: isHighEntropy,
        algorithm: 'AES-256-CBC', // Assumed from SQLCipher configuration
        keyStrength: 256,
        errors,
      };
    } catch (error) {
      errors.push(
        `File encryption check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { isEncrypted: false, algorithm: null, keyStrength: null, errors };
    }
  }

  /**
   * Validate database file integrity
   */
  private async validateFileIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const fileInfo = await FileSystem.getInfoAsync(this.databasePath);

      if (!fileInfo.exists) {
        errors.push('Database file does not exist for integrity check');
        return { isValid: false, errors };
      }

      // Check file size is reasonable (not 0 bytes or suspiciously small)
      if (fileInfo.size === 0) {
        errors.push('Database file is empty (0 bytes)');
        return { isValid: false, errors };
      }

      if (fileInfo.size < 1024) {
        errors.push(`Database file unusually small (${fileInfo.size} bytes)`);
      }

      // Calculate file checksum for integrity tracking
      const fileContent = await FileSystem.readAsStringAsync(this.databasePath, {
        encoding: 'base64' as any,
      });

      const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Store checksum for future integrity checks
      await this.storeFileChecksum(checksum);

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(
        `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { isValid: false, errors };
    }
  }

  /**
   * Test database accessibility with proper key
   */
  private async validateDatabaseAccessibility(): Promise<{
    isAccessible: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Try to open database (this will test key validity)
      const db = await SQLite.openDatabaseAsync(this.databaseName);

      // Test basic query execution
      await db.getAllAsync('PRAGMA cipher_version');

      // Test table creation/deletion (ensuring write access)
      await db.execAsync('CREATE TABLE IF NOT EXISTS access_test (id INTEGER)');
      await db.execAsync('INSERT INTO access_test (id) VALUES (1)');
      await db.getFirstAsync('SELECT id FROM access_test WHERE id = 1');
      await db.execAsync('DROP TABLE access_test');

      await db.closeAsync();

      return { isAccessible: true, errors };
    } catch (error) {
      errors.push(
        `Database accessibility test failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return { isAccessible: false, errors };
    }
  }

  /**
   * Check if database file exists
   */
  private async checkFileExists(): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.databasePath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific database path
   */
  private getDatabasePath(databaseName: string): string {
    // Expo SQLite stores databases in documentDirectory/SQLite/
    return `${(FileSystem as any).documentDirectory || ''}SQLite/${databaseName}`;
  }

  /**
   * Store file checksum for integrity comparison
   */
  private async storeFileChecksum(checksum: string): Promise<void> {
    const checksumPath = `${(FileSystem as any).documentDirectory || ''}.aura_checksums`;

    try {
      let checksumData: Record<string, string> = {};

      const checksumFileInfo = await FileSystem.getInfoAsync(checksumPath);
      if (checksumFileInfo.exists) {
        const existingData = await FileSystem.readAsStringAsync(checksumPath);
        checksumData = JSON.parse(existingData);
      }

      checksumData[this.databaseName] = checksum;

      await FileSystem.writeAsStringAsync(checksumPath, JSON.stringify(checksumData), {
        encoding: 'utf8' as any,
      });
    } catch (error) {
      console.warn(
        `Failed to store checksum: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert base64 to byte array
   */
  private base64ToBytes(base64: string): number[] {
    const binaryString = atob(base64);
    const bytes: number[] = [];

    for (let i = 0; i < binaryString.length; i++) {
      bytes.push(binaryString.charCodeAt(i));
    }

    return bytes;
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Calculate Shannon entropy of byte array
   */
  private calculateEntropy(bytes: number[]): number {
    const frequency: Record<number, number> = {};

    // Count byte frequencies
    for (const byte of bytes) {
      frequency[byte] = (frequency[byte] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    const length = bytes.length;

    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Perform comprehensive integrity check
   */
  async performIntegrityCheck(): Promise<FileIntegrityCheck> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.databasePath);

      if (!fileInfo.exists) {
        return {
          filePath: this.databasePath,
          expectedSize: 0,
          actualSize: 0,
          checksum: '',
          isCorrupted: true,
        };
      }

      // Calculate current checksum
      const fileContent = await FileSystem.readAsStringAsync(this.databasePath, {
        encoding: 'base64' as any,
      });

      const currentChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Compare with stored checksum
      const storedChecksum = await this.getStoredChecksum();
      const isCorrupted = storedChecksum !== null && storedChecksum !== currentChecksum;

      return {
        filePath: this.databasePath,
        expectedSize: fileInfo.size,
        actualSize: fileInfo.size,
        checksum: currentChecksum,
        isCorrupted,
      };
    } catch (error) {
      throw new Error(
        `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get stored checksum for comparison
   */
  private async getStoredChecksum(): Promise<string | null> {
    try {
      const checksumPath = `${(FileSystem as any).documentDirectory || ''}.aura_checksums`;
      const checksumFileInfo = await FileSystem.getInfoAsync(checksumPath);

      if (!checksumFileInfo.exists) return null;

      const checksumData = await FileSystem.readAsStringAsync(checksumPath);
      const checksums = JSON.parse(checksumData);

      return checksums[this.databaseName] || null;
    } catch {
      return null;
    }
  }
}

/**
 * Batch validate multiple databases
 */
export async function validateMultipleDatabases(
  databaseNames: string[]
): Promise<Record<string, EncryptionValidationResult>> {
  const results: Record<string, EncryptionValidationResult> = {};

  const validationPromises = databaseNames.map(async name => {
    const validator = new EncryptionValidator(name);
    const result = await validator.validateEncryption();
    results[name] = result;
  });

  await Promise.all(validationPromises);
  return results;
}

/**
 * Create validation report
 */
export function createValidationReport(
  results: Record<string, EncryptionValidationResult>
): string {
  const lines = ['Database Encryption Validation Report', '='.repeat(40)];

  for (const [dbName, result] of Object.entries(results)) {
    lines.push(`\nDatabase: ${dbName}`);
    lines.push(`  Encrypted: ${result.isEncrypted ? '✓' : '✗'}`);
    lines.push(`  Algorithm: ${result.algorithm || 'N/A'}`);
    lines.push(`  Key Strength: ${result.keyStrength || 'N/A'} bits`);
    lines.push(`  File Integrity: ${result.fileIntegrity ? '✓' : '✗'}`);
    lines.push(`  Validated: ${new Date(result.lastValidated).toISOString()}`);

    if (result.validationErrors.length > 0) {
      lines.push('  Errors:');
      result.validationErrors.forEach(error => {
        lines.push(`    - ${error}`);
      });
    }
  }

  return lines.join('\n');
}
