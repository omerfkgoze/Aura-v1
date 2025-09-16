/**
 * Secure Enclave Storage
 * Device-specific secure storage for backup keys using platform secure enclaves
 *
 * CRITICAL: Backup keys stored in device-specific secure enclaves
 * iOS: Keychain with Secure Enclave hardware protection
 * Android: Android Keystore with hardware-backed keys
 */

import { Platform } from 'react-native';
import {
  BackupKeyConfig,
  SecureEnclaveConfig,
  BackupSecurityAudit,
  BackupKeyIsolationPolicy,
} from './types';

// Mock implementations for React Native secure storage
// In production, would use @react-native-keychain and @react-native-android-keystore
interface KeychainResult {
  service: string;
  username: string;
  password: string;
}

interface AndroidKeystoreResult {
  alias: string;
  encryptedData: string;
}

export class SecureEnclaveStorage {
  private static readonly IOS_SERVICE_PREFIX = 'com.aura.backup.';
  private static readonly ANDROID_ALIAS_PREFIX = 'aura_backup_';
  private static readonly MAX_KEY_AGE_DAYS = 365;

  private enclaveConfig: SecureEnclaveConfig;
  private isolationPolicy: BackupKeyIsolationPolicy;
  private auditTrail: BackupSecurityAudit[] = [];

  constructor(enclaveConfig: SecureEnclaveConfig, isolationPolicy: BackupKeyIsolationPolicy) {
    this.enclaveConfig = enclaveConfig;
    this.isolationPolicy = isolationPolicy;
    this.validateEnclaveSupport();
  }

  /**
   * Store backup key in device-specific secure enclave
   * iOS: Keychain with hardware protection
   * Android: Android Keystore with hardware backing
   */
  async storeBackupKey(
    keyConfig: BackupKeyConfig,
    keyMaterial: Uint8Array,
    requiresAuthentication: boolean = true
  ): Promise<{ stored: boolean; enclaveReference: string }> {
    try {
      this.validateKeyIsolation(keyConfig.keyId);

      let enclaveReference: string;
      let stored: boolean;

      if (Platform.OS === 'ios') {
        const result = await this.storeInIOSKeychain(
          keyConfig,
          keyMaterial,
          requiresAuthentication
        );
        stored = result.stored;
        enclaveReference = result.reference;
      } else if (Platform.OS === 'android') {
        const result = await this.storeInAndroidKeystore(
          keyConfig,
          keyMaterial,
          requiresAuthentication
        );
        stored = result.stored;
        enclaveReference = result.reference;
      } else {
        throw new Error(`Unsupported platform: ${Platform.OS}`);
      }

      // Zero out key material after storage
      this.secureZeroize(keyMaterial);

      await this.auditOperation('encrypt', keyConfig.keyId, stored);

      return { stored, enclaveReference };
    } catch (error) {
      await this.auditOperation('encrypt', keyConfig.keyId, false, error.message);
      throw new Error(`Failed to store backup key: ${error.message}`);
    }
  }

  /**
   * Retrieve backup key from secure enclave
   * Requires user authentication for hardware-protected keys
   */
  async retrieveBackupKey(
    keyId: string,
    enclaveReference: string,
    authenticationPrompt?: string
  ): Promise<{ keyMaterial: Uint8Array; keyConfig: BackupKeyConfig }> {
    try {
      this.validateKeyIsolation(keyId);

      let keyMaterial: Uint8Array;
      let keyConfig: BackupKeyConfig;

      if (Platform.OS === 'ios') {
        const result = await this.retrieveFromIOSKeychain(enclaveReference, authenticationPrompt);
        keyMaterial = result.keyMaterial;
        keyConfig = result.keyConfig;
      } else if (Platform.OS === 'android') {
        const result = await this.retrieveFromAndroidKeystore(
          enclaveReference,
          authenticationPrompt
        );
        keyMaterial = result.keyMaterial;
        keyConfig = result.keyConfig;
      } else {
        throw new Error(`Unsupported platform: ${Platform.OS}`);
      }

      await this.auditOperation('decrypt', keyId, true);

      return { keyMaterial, keyConfig };
    } catch (error) {
      await this.auditOperation('decrypt', keyId, false, error.message);
      throw new Error(`Failed to retrieve backup key: ${error.message}`);
    }
  }

  /**
   * Store backup key in iOS Keychain with Secure Enclave
   */
  private async storeInIOSKeychain(
    keyConfig: BackupKeyConfig,
    keyMaterial: Uint8Array,
    requiresAuthentication: boolean
  ): Promise<{ stored: boolean; reference: string }> {
    try {
      const service = `${SecureEnclaveStorage.IOS_SERVICE_PREFIX}${keyConfig.keyId}`;

      // Encode key material and config as base64
      const encodedKey = Buffer.from(keyMaterial).toString('base64');
      const encodedConfig = Buffer.from(JSON.stringify(keyConfig)).toString('base64');
      const combinedData = `${encodedKey}|${encodedConfig}`;

      // Mock Keychain storage (would use @react-native-keychain in production)
      const keychainOptions = {
        service,
        username: keyConfig.keyId,
        password: combinedData,
        accessGroup: this.enclaveConfig.keychain.accessGroup,
        accessibility: this.enclaveConfig.keychain.accessibility,
        authenticationType: requiresAuthentication ? 'biometrics' : 'none',
        authenticationPrompt: this.enclaveConfig.keychain.authenticationPrompt,
        secureHardware: true, // Require Secure Enclave
        touchID: requiresAuthentication,
        showModal: true,
      };

      // In production: await Keychain.setInternetCredentials(service, keyConfig.keyId, combinedData, keychainOptions);
      const mockStored = await this.mockKeychainStore(keychainOptions);

      return {
        stored: mockStored,
        reference: service,
      };
    } catch (error) {
      throw new Error(`iOS Keychain storage failed: ${error.message}`);
    }
  }

  /**
   * Store backup key in Android Keystore
   */
  private async storeInAndroidKeystore(
    keyConfig: BackupKeyConfig,
    keyMaterial: Uint8Array,
    requiresAuthentication: boolean
  ): Promise<{ stored: boolean; reference: string }> {
    try {
      const alias = `${SecureEnclaveStorage.ANDROID_ALIAS_PREFIX}${keyConfig.keyId}`;

      // Encode key material and config
      const encodedKey = Buffer.from(keyMaterial).toString('base64');
      const encodedConfig = Buffer.from(JSON.stringify(keyConfig)).toString('base64');
      const combinedData = `${encodedKey}|${encodedConfig}`;

      // Mock Android Keystore options (would use @react-native-android-keystore in production)
      const keystoreOptions = {
        alias,
        encryptedData: combinedData,
        requiresAuthentication:
          requiresAuthentication && this.enclaveConfig.androidKeystore.requiresAuthentication,
        userAuthenticationValidityDuration:
          this.enclaveConfig.androidKeystore.userAuthenticationValidityDuration,
        keySize: this.enclaveConfig.androidKeystore.keySize,
        hardwareBacked: true, // Require hardware backing
        strongBoxBacked: true, // Use StrongBox if available
        invalidatedByBiometricEnrollment: true,
      };

      // In production: await AndroidKeystore.encrypt(alias, combinedData, keystoreOptions);
      const mockStored = await this.mockAndroidKeystoreStore(keystoreOptions);

      return {
        stored: mockStored,
        reference: alias,
      };
    } catch (error) {
      throw new Error(`Android Keystore storage failed: ${error.message}`);
    }
  }

  /**
   * Retrieve backup key from iOS Keychain
   */
  private async retrieveFromIOSKeychain(
    reference: string,
    authenticationPrompt?: string
  ): Promise<{ keyMaterial: Uint8Array; keyConfig: BackupKeyConfig }> {
    try {
      // Mock Keychain retrieval (would use @react-native-keychain in production)
      const keychainOptions = {
        service: reference,
        authenticationPrompt:
          authenticationPrompt || this.enclaveConfig.keychain.authenticationPrompt,
        showModal: true,
      };

      // In production: const credentials = await Keychain.getInternetCredentials(reference, keychainOptions);
      const mockCredentials = await this.mockKeychainRetrieve(keychainOptions);

      if (!mockCredentials) {
        throw new Error('Backup key not found in Keychain');
      }

      // Decode combined data
      const [encodedKey, encodedConfig] = mockCredentials.password.split('|');
      const keyMaterial = new Uint8Array(Buffer.from(encodedKey, 'base64'));
      const keyConfig = JSON.parse(Buffer.from(encodedConfig, 'base64').toString());

      return { keyMaterial, keyConfig };
    } catch (error) {
      throw new Error(`iOS Keychain retrieval failed: ${error.message}`);
    }
  }

  /**
   * Retrieve backup key from Android Keystore
   */
  private async retrieveFromAndroidKeystore(
    reference: string,
    authenticationPrompt?: string
  ): Promise<{ keyMaterial: Uint8Array; keyConfig: BackupKeyConfig }> {
    try {
      // Mock Android Keystore retrieval (would use @react-native-android-keystore in production)
      const keystoreOptions = {
        alias: reference,
        authenticationPrompt: authenticationPrompt || 'Authenticate to access backup key',
      };

      // In production: const result = await AndroidKeystore.decrypt(reference, keystoreOptions);
      const mockResult = await this.mockAndroidKeystoreRetrieve(keystoreOptions);

      if (!mockResult) {
        throw new Error('Backup key not found in Android Keystore');
      }

      // Decode combined data
      const [encodedKey, encodedConfig] = mockResult.encryptedData.split('|');
      const keyMaterial = new Uint8Array(Buffer.from(encodedKey, 'base64'));
      const keyConfig = JSON.parse(Buffer.from(encodedConfig, 'base64').toString());

      return { keyMaterial, keyConfig };
    } catch (error) {
      throw new Error(`Android Keystore retrieval failed: ${error.message}`);
    }
  }

  /**
   * Delete backup key from secure enclave
   */
  async deleteBackupKey(keyId: string, enclaveReference: string): Promise<boolean> {
    try {
      let deleted: boolean;

      if (Platform.OS === 'ios') {
        // In production: await Keychain.resetInternetCredentials(enclaveReference);
        deleted = await this.mockKeychainDelete(enclaveReference);
      } else if (Platform.OS === 'android') {
        // In production: await AndroidKeystore.deleteKey(enclaveReference);
        deleted = await this.mockAndroidKeystoreDelete(enclaveReference);
      } else {
        throw new Error(`Unsupported platform: ${Platform.OS}`);
      }

      await this.auditOperation('revoke', keyId, deleted);
      return deleted;
    } catch (error) {
      await this.auditOperation('revoke', keyId, false, error.message);
      throw new Error(`Failed to delete backup key: ${error.message}`);
    }
  }

  /**
   * Validate secure enclave support
   */
  private validateEnclaveSupport(): void {
    if (Platform.OS === 'ios') {
      // In production: check for Secure Enclave availability
      // const hasSecureEnclave = await KeychainUtils.hasSecureEnclaveSupport();
      // if (!hasSecureEnclave) throw new Error('Secure Enclave not available');
    } else if (Platform.OS === 'android') {
      // In production: check for hardware-backed keystore
      // const hasHardwareKeystore = await AndroidKeystoreUtils.hasHardwareSupport();
      // if (!hasHardwareKeystore) throw new Error('Hardware-backed keystore not available');
    }
  }

  /**
   * Validate backup key isolation
   */
  private validateKeyIsolation(keyId: string): void {
    if (!keyId.startsWith('backup_')) {
      throw new Error('Only backup keys allowed in secure enclave storage');
    }

    if (this.isolationPolicy.backupKeyAccess !== 'secure_enclave_only') {
      throw new Error('Backup keys must use secure enclave only access');
    }
  }

  /**
   * Secure memory zeroization
   */
  private secureZeroize(data: Uint8Array): void {
    try {
      data.fill(0);
    } catch (error) {
      console.error('Failed to zeroize sensitive data:', error.message);
    }
  }

  /**
   * Mock Keychain operations (for development)
   */
  private async mockKeychainStore(options: any): Promise<boolean> {
    // Mock successful storage
    return true;
  }

  private async mockKeychainRetrieve(options: any): Promise<KeychainResult | null> {
    // Mock retrieval with test data
    return {
      service: options.service,
      username: 'backup_test_key',
      password: 'dGVzdEtleU1hdGVyaWFs|eyJrZXlJZCI6ImJhY2t1cF90ZXN0X2tleSJ9',
    };
  }

  private async mockKeychainDelete(service: string): Promise<boolean> {
    return true;
  }

  private async mockAndroidKeystoreStore(options: any): Promise<boolean> {
    return true;
  }

  private async mockAndroidKeystoreRetrieve(options: any): Promise<AndroidKeystoreResult | null> {
    return {
      alias: options.alias,
      encryptedData: 'dGVzdEtleU1hdGVyaWFs|eyJrZXlJZCI6ImJhY2t1cF90ZXN0X2tleSJ9',
    };
  }

  private async mockAndroidKeystoreDelete(alias: string): Promise<boolean> {
    return true;
  }

  /**
   * Audit secure enclave operations
   */
  private async auditOperation(
    operation: 'encrypt' | 'decrypt' | 'revoke',
    keyId: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const audit: BackupSecurityAudit = {
      auditId: `enclave_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
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

  /**
   * Check secure enclave health
   */
  async checkEnclaveHealth(): Promise<{
    available: boolean;
    hardwareBacked: boolean;
    authenticationRequired: boolean;
    keyCount: number;
  }> {
    try {
      return {
        available: true,
        hardwareBacked: Platform.OS === 'ios' || Platform.OS === 'android',
        authenticationRequired: this.enclaveConfig.keychain.accessibility.includes('whenUnlocked'),
        keyCount: this.auditTrail.filter(a => a.operation === 'encrypt' && a.success).length,
      };
    } catch (error) {
      return {
        available: false,
        hardwareBacked: false,
        authenticationRequired: false,
        keyCount: 0,
      };
    }
  }
}
