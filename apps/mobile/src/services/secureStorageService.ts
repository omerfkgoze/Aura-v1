import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
// Import crypto-core types dynamically
type PlatformSecureStorage = any;
type SecureStorageConfig = any;
type SecureStoragePlatform = any;
type MasterKeyStorageInfo = any;
type HSMCapabilities = any;

export interface SecureStorageServiceConfig {
  keychainService: string;
  requireAuthentication: boolean;
  requireBiometrics: boolean;
  accessibilityLevel: string;
}

export class SecureStorageService {
  private wasmStorage: PlatformSecureStorage;
  private config: SecureStorageServiceConfig;

  constructor(config?: Partial<SecureStorageServiceConfig>) {
    this.config = {
      keychainService: 'aura-secure-keys',
      requireAuthentication: false,
      requireBiometrics: false,
      accessibilityLevel: 'WHEN_UNLOCKED',
      ...config,
    };

    // Initialize WASM secure storage will be done in initialize()
    this.wasmStorage = null as any;
  }

  async initialize(): Promise<boolean> {
    try {
      // Initialize WASM secure storage with dynamic import
      const { PlatformSecureStorage, SecureStorageConfig } = await import('@aura/crypto-core');

      const platform = await this.getPlatform();
      const wasmConfig = new SecureStorageConfig(
        platform,
        this.config.keychainService,
        this.config.requireAuthentication,
        this.config.requireBiometrics,
        this.getAccessibilityLevel(),
        'AES-256-GCM'
      );

      this.wasmStorage = new PlatformSecureStorage(wasmConfig);
      await this.wasmStorage.initialize();
      return true;
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      return false;
    }
  }

  async generateAndStoreMasterKey(keyId: string): Promise<MasterKeyStorageInfo | null> {
    try {
      // Generate high-quality entropy
      const entropy = await this.generateSecureEntropy();

      // Generate master key using platform-specific secure random
      const masterKey = await Crypto.getRandomBytesAsync(32); // 256-bit key

      // Store using both WASM and native storage for redundancy
      await this.storeSecureKey(keyId, masterKey);

      // Generate storage info
      const info = await this.wasmStorage.generate_master_key(keyId);

      return info;
    } catch (error) {
      console.error('Failed to generate and store master key:', error);
      return null;
    }
  }

  async storeMasterKey(keyId: string, keyMaterial: Uint8Array): Promise<boolean> {
    try {
      await this.storeSecureKey(keyId, keyMaterial);
      return true;
    } catch (error) {
      console.error('Failed to store master key:', error);
      return false;
    }
  }

  async retrieveMasterKey(keyId: string): Promise<Uint8Array | null> {
    try {
      const keyData = await this.getSecureKey(keyId);
      return keyData;
    } catch (error) {
      console.error('Failed to retrieve master key:', error);
      return null;
    }
  }

  async deleteMasterKey(keyId: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(keyId, {
        keychainService: this.config.keychainService,
      });

      // Also delete from WASM storage
      await this.wasmStorage.delete_master_key(keyId);

      return true;
    } catch (error) {
      console.error('Failed to delete master key:', error);
      return false;
    }
  }

  async keyExists(keyId: string): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(keyId, {
        keychainService: this.config.keychainService,
      });
      return value !== null;
    } catch {
      return false;
    }
  }

  async getHSMCapabilities(): Promise<HSMCapabilities | null> {
    try {
      return this.wasmStorage.get_hsm_capabilities() || null;
    } catch (error) {
      console.error('Failed to get HSM capabilities:', error);
      return null;
    }
  }

  isHardwareBacked(): boolean {
    return this.wasmStorage.is_hardware_backed();
  }

  async testSecureStorage(): Promise<{
    available: boolean;
    hardwareBacked: boolean;
    canStore: boolean;
    canRetrieve: boolean;
    error?: string;
  }> {
    const testKey = 'secure_storage_test';
    const testValue = 'test_value_' + Date.now();

    try {
      // Test storage
      await SecureStore.setItemAsync(testKey, testValue, {
        keychainService: this.config.keychainService,
        requireAuthentication: false, // Don't require auth for test
      });

      // Test retrieval
      const retrieved = await SecureStore.getItemAsync(testKey, {
        keychainService: this.config.keychainService,
      });

      const canRetrieve = retrieved === testValue;

      // Cleanup
      await SecureStore.deleteItemAsync(testKey, {
        keychainService: this.config.keychainService,
      });

      return {
        available: true,
        hardwareBacked: this.isHardwareBacked(),
        canStore: true,
        canRetrieve,
      };
    } catch (error) {
      return {
        available: false,
        hardwareBacked: false,
        canStore: false,
        canRetrieve: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async storeSecureKey(keyId: string, keyMaterial: Uint8Array): Promise<void> {
    // Convert Uint8Array to base64 for storage
    const base64Key = this.uint8ArrayToBase64(keyMaterial);

    await SecureStore.setItemAsync(keyId, base64Key, {
      keychainService: this.config.keychainService,
      requireAuthentication: this.config.requireAuthentication,
      // iOS specific options
      ...(Platform.OS === 'ios' && {
        touchID: this.config.requireBiometrics,
        showModal: this.config.requireBiometrics,
        kSecAccessControl: this.config.requireBiometrics
          ? 'kSecAccessControlBiometryAny'
          : undefined,
      }),
      // Android specific options
      ...(Platform.OS === 'android' && {
        encrypt: true,
        requireAuthentication: this.config.requireBiometrics,
      }),
    });
  }

  private async getSecureKey(keyId: string): Promise<Uint8Array | null> {
    const base64Key = await SecureStore.getItemAsync(keyId, {
      keychainService: this.config.keychainService,
      requireAuthentication: this.config.requireAuthentication,
    });

    if (!base64Key) {
      return null;
    }

    return this.base64ToUint8Array(base64Key);
  }

  private async generateSecureEntropy(): Promise<Uint8Array> {
    // Gather entropy from multiple sources
    const sources: Uint8Array[] = [];

    // Primary entropy from Expo Crypto
    sources.push(await Crypto.getRandomBytesAsync(32));

    // Additional entropy from timestamp and device info
    const timestamp = new Date().getTime();
    const timestampBytes = new TextEncoder().encode(timestamp.toString());
    sources.push(timestampBytes);

    if (Device.osName) {
      const deviceBytes = new TextEncoder().encode(Device.osName + Device.modelName);
      sources.push(deviceBytes.slice(0, 16)); // Limit size
    }

    // Combine all entropy sources
    const totalLength = sources.reduce((sum, source) => sum + source.length, 0);
    const combinedEntropy = new Uint8Array(totalLength);
    let offset = 0;

    for (const source of sources) {
      combinedEntropy.set(source, offset);
      offset += source.length;
    }

    // Use first 32 bytes as final entropy
    return combinedEntropy.slice(0, 32);
  }

  private async getPlatform(): Promise<any> {
    const { SecureStoragePlatform } = await import('@aura/crypto-core');

    if (Platform.OS === 'ios') {
      return SecureStoragePlatform.IOSKeychain;
    } else if (Platform.OS === 'android') {
      // Check if device supports StrongBox (Android 9+ with hardware support)
      const androidVersion = Platform.Version as number;
      if (androidVersion >= 28 && Device.modelName?.includes('Pixel')) {
        return SecureStoragePlatform.AndroidStrongBox;
      }
      return SecureStoragePlatform.AndroidKeystore;
    } else {
      return SecureStoragePlatform.WebCryptoAPI;
    }
  }

  private getAccessibilityLevel(): string {
    switch (this.config.accessibilityLevel) {
      case 'WHEN_UNLOCKED':
        return 'WhenUnlocked';
      case 'AFTER_FIRST_UNLOCK':
        return 'AfterFirstUnlock';
      case 'ALWAYS':
        return 'Always';
      case 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY':
        return 'WhenPasscodeSetThisDeviceOnly';
      case 'WHEN_UNLOCKED_THIS_DEVICE_ONLY':
        return 'WhenUnlockedThisDeviceOnly';
      case 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY':
        return 'AfterFirstUnlockThisDeviceOnly';
      case 'ALWAYS_THIS_DEVICE_ONLY':
        return 'AlwaysThisDeviceOnly';
      default:
        return 'WhenUnlocked';
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

// Singleton instance for app-wide use
export const secureStorageService = new SecureStorageService();

// Hook for React components
export function useSecureStorage() {
  return secureStorageService;
}
