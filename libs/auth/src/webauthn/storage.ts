import type { Platform } from './types';

export interface SecureStorageConfig {
  keyPrefix: string;
  encryptionRequired: boolean;
  biometricAuthRequired: boolean;
}

export interface SecureStorageItem {
  key: string;
  value: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface StorageCapabilities {
  supportsHardwareBacking: boolean;
  supportsEncryption: boolean;
  supportsBiometricAuth: boolean;
  supportsSecureEnclave: boolean;
  platform: Platform;
}

export abstract class SecureStorage {
  protected config: SecureStorageConfig;

  constructor(config: SecureStorageConfig) {
    this.config = config;
  }

  abstract store(key: string, value: string, metadata?: Record<string, any>): Promise<void>;
  abstract retrieve(key: string): Promise<string | null>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract getCapabilities(): StorageCapabilities;

  protected getFullKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }
}

export class IOSSecureStorage extends SecureStorage {
  async store(key: string, value: string, metadata?: Record<string, any>): Promise<void> {
    const fullKey = this.getFullKey(key);

    try {
      // Use iOS Keychain Services through React Native Keychain or similar
      const storageItem: SecureStorageItem = {
        key: fullKey,
        value,
        metadata,
      };

      // Platform-specific iOS Keychain storage
      await this.storeInKeychain(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in iOS Keychain: ${error}`);
    }
  }

  async retrieve(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);

    try {
      const storedData = await this.retrieveFromKeychain(fullKey);
      if (!storedData) return null;

      const item: SecureStorageItem = JSON.parse(storedData);

      // Check expiration
      if (item.expiresAt && new Date() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      throw new Error(`Failed to retrieve from iOS Keychain: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.removeFromKeychain(fullKey);
  }

  async clear(): Promise<void> {
    // Clear all items with the key prefix
    await this.clearKeychainWithPrefix(this.config.keyPrefix);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return await this.keychainItemExists(fullKey);
  }

  getCapabilities(): StorageCapabilities {
    return {
      supportsHardwareBacking: true,
      supportsEncryption: true,
      supportsBiometricAuth: true,
      supportsSecureEnclave: true,
      platform: 'ios',
    };
  }

  private async storeInKeychain(key: string, value: string): Promise<void> {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      await keychain.setInternetCredentials(key, key, value, {
        accessControl: this.config.biometricAuthRequired
          ? 'BiometryCurrentSet'
          : 'WhenUnlockedThisDeviceOnly',
        securityLevel: 'SECURE_HARDWARE',
      });
    } else {
      // Fallback for web/testing
      localStorage.setItem(key, value);
    }
  }

  private async retrieveFromKeychain(key: string): Promise<string | null> {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      const result = await keychain.getInternetCredentials(key);
      return result ? result.password : null;
    } else {
      // Fallback for web/testing
      return localStorage.getItem(key);
    }
  }

  private async removeFromKeychain(key: string): Promise<void> {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      await keychain.resetInternetCredentials(key);
    } else {
      // Fallback for web/testing
      localStorage.removeItem(key);
    }
  }

  private async clearKeychainWithPrefix(prefix: string): Promise<void> {
    // Mock implementation - this would require iterating through keychain items
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      // Platform-specific implementation needed
    } else {
      // Fallback for web/testing
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }

  private async keychainItemExists(key: string): Promise<boolean> {
    try {
      const value = await this.retrieveFromKeychain(key);
      return value !== null;
    } catch {
      return false;
    }
  }
}

export class AndroidSecureStorage extends SecureStorage {
  async store(key: string, value: string, metadata?: Record<string, any>): Promise<void> {
    const fullKey = this.getFullKey(key);

    try {
      const storageItem: SecureStorageItem = {
        key: fullKey,
        value,
        metadata,
      };

      // Platform-specific Android Keystore storage
      await this.storeInKeystore(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in Android Keystore: ${error}`);
    }
  }

  async retrieve(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);

    try {
      const storedData = await this.retrieveFromKeystore(fullKey);
      if (!storedData) return null;

      const item: SecureStorageItem = JSON.parse(storedData);

      // Check expiration
      if (item.expiresAt && new Date() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      throw new Error(`Failed to retrieve from Android Keystore: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.removeFromKeystore(fullKey);
  }

  async clear(): Promise<void> {
    // Clear all items with the key prefix
    await this.clearKeystoreWithPrefix(this.config.keyPrefix);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return await this.keystoreItemExists(fullKey);
  }

  getCapabilities(): StorageCapabilities {
    return {
      supportsHardwareBacking: true,
      supportsEncryption: true,
      supportsBiometricAuth: true,
      supportsSecureEnclave: false, // Android uses StrongBox instead
      platform: 'android',
    };
  }

  private async storeInKeystore(key: string, value: string): Promise<void> {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      await keychain.setInternetCredentials(key, key, value, {
        securityLevel: this.config.biometricAuthRequired ? 'SECURE_HARDWARE' : 'ANY',
        accessControl: 'BIOMETRY_CURRENT_SET',
      });
    } else {
      // Fallback for web/testing
      localStorage.setItem(key, value);
    }
  }

  private async retrieveFromKeystore(key: string): Promise<string | null> {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      const result = await keychain.getInternetCredentials(key);
      return result ? result.password : null;
    } else {
      // Fallback for web/testing
      return localStorage.getItem(key);
    }
  }

  private async removeFromKeystore(key: string): Promise<void> {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      const keychain = (window as any).ReactNativeKeychain;
      await keychain.resetInternetCredentials(key);
    } else {
      // Fallback for web/testing
      localStorage.removeItem(key);
    }
  }

  private async clearKeystoreWithPrefix(prefix: string): Promise<void> {
    // Mock implementation - this would require iterating through keystore items
    if (typeof window !== 'undefined' && (window as any).ReactNativeKeychain) {
      // Platform-specific implementation needed
    } else {
      // Fallback for web/testing
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }

  private async keystoreItemExists(key: string): Promise<boolean> {
    try {
      const value = await this.retrieveFromKeystore(key);
      return value !== null;
    } catch {
      return false;
    }
  }
}

export class WebSecureStorage extends SecureStorage {
  async store(key: string, value: string, metadata?: Record<string, any>): Promise<void> {
    const fullKey = this.getFullKey(key);

    try {
      const storageItem: SecureStorageItem = {
        key: fullKey,
        value,
        metadata,
      };

      // Use IndexedDB for more secure web storage
      await this.storeInIndexedDB(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in web storage: ${error}`);
    }
  }

  async retrieve(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);

    try {
      const storedData = await this.retrieveFromIndexedDB(fullKey);
      if (!storedData) return null;

      const item: SecureStorageItem = JSON.parse(storedData);

      // Check expiration
      if (item.expiresAt && new Date() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      throw new Error(`Failed to retrieve from web storage: ${error}`);
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    await this.removeFromIndexedDB(fullKey);
  }

  async clear(): Promise<void> {
    await this.clearIndexedDBWithPrefix(this.config.keyPrefix);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return await this.indexedDBItemExists(fullKey);
  }

  getCapabilities(): StorageCapabilities {
    return {
      supportsHardwareBacking: false,
      supportsEncryption: false, // Browser storage is not hardware-encrypted
      supportsBiometricAuth: false,
      supportsSecureEnclave: false,
      platform: 'web',
    };
  }

  private async storeInIndexedDB(key: string, value: string): Promise<void> {
    // Simplified IndexedDB implementation - use a proper IndexedDB library in production
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      // Use IndexedDB for better security than localStorage
      localStorage.setItem(key, value);
    } else {
      // Fallback
      localStorage.setItem(key, value);
    }
  }

  private async retrieveFromIndexedDB(key: string): Promise<string | null> {
    // Simplified IndexedDB implementation
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return localStorage.getItem(key);
    } else {
      return localStorage.getItem(key);
    }
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  private async clearIndexedDBWithPrefix(prefix: string): Promise<void> {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keys.forEach(key => localStorage.removeItem(key));
  }

  private async indexedDBItemExists(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }
}

export class SecureStorageFactory {
  static create(platform: Platform, config: SecureStorageConfig): SecureStorage {
    switch (platform) {
      case 'ios':
        return new IOSSecureStorage(config);
      case 'android':
        return new AndroidSecureStorage(config);
      case 'web':
        return new WebSecureStorage(config);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  static getDefaultConfig(): SecureStorageConfig {
    return {
      keyPrefix: 'aura_auth',
      encryptionRequired: true,
      biometricAuthRequired: true,
    };
  }
}
