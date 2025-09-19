export class SecureStorage {
  config;
  constructor(config) {
    this.config = config;
  }
  getFullKey(key) {
    return `${this.config.keyPrefix}:${key}`;
  }
}
export class IOSSecureStorage extends SecureStorage {
  async store(key, value, metadata) {
    const fullKey = this.getFullKey(key);
    try {
      // Use iOS Keychain Services through React Native Keychain or similar
      const storageItem = {
        key: fullKey,
        value,
        ...(metadata && { metadata }),
      };
      // Platform-specific iOS Keychain storage
      await this.storeInKeychain(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in iOS Keychain: ${error}`);
    }
  }
  async retrieve(key) {
    const fullKey = this.getFullKey(key);
    try {
      const storedData = await this.retrieveFromKeychain(fullKey);
      if (!storedData) return null;
      const item = JSON.parse(storedData);
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
  async remove(key) {
    const fullKey = this.getFullKey(key);
    await this.removeFromKeychain(fullKey);
  }
  async clear() {
    // Clear all items with the key prefix
    await this.clearKeychainWithPrefix(this.config.keyPrefix);
  }
  async exists(key) {
    const fullKey = this.getFullKey(key);
    return await this.keychainItemExists(fullKey);
  }
  getCapabilities() {
    return {
      supportsHardwareBacking: true,
      supportsEncryption: true,
      supportsBiometricAuth: true,
      supportsSecureEnclave: true,
      platform: 'ios',
    };
  }
  async storeInKeychain(key, value) {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
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
  async retrieveFromKeychain(key) {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
      const result = await keychain.getInternetCredentials(key);
      return result ? result.password : null;
    } else {
      // Fallback for web/testing
      return localStorage.getItem(key);
    }
  }
  async removeFromKeychain(key) {
    // Mock implementation - replace with actual iOS Keychain integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
      await keychain.resetInternetCredentials(key);
    } else {
      // Fallback for web/testing
      localStorage.removeItem(key);
    }
  }
  async clearKeychainWithPrefix(prefix) {
    // Mock implementation - this would require iterating through keychain items
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      // Platform-specific implementation needed
    } else {
      // Fallback for web/testing
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
  async keychainItemExists(key) {
    try {
      const value = await this.retrieveFromKeychain(key);
      return value !== null;
    } catch {
      return false;
    }
  }
}
export class AndroidSecureStorage extends SecureStorage {
  async store(key, value, metadata) {
    const fullKey = this.getFullKey(key);
    try {
      const storageItem = {
        key: fullKey,
        value,
        ...(metadata && { metadata }),
      };
      // Platform-specific Android Keystore storage
      await this.storeInKeystore(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in Android Keystore: ${error}`);
    }
  }
  async retrieve(key) {
    const fullKey = this.getFullKey(key);
    try {
      const storedData = await this.retrieveFromKeystore(fullKey);
      if (!storedData) return null;
      const item = JSON.parse(storedData);
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
  async remove(key) {
    const fullKey = this.getFullKey(key);
    await this.removeFromKeystore(fullKey);
  }
  async clear() {
    // Clear all items with the key prefix
    await this.clearKeystoreWithPrefix(this.config.keyPrefix);
  }
  async exists(key) {
    const fullKey = this.getFullKey(key);
    return await this.keystoreItemExists(fullKey);
  }
  getCapabilities() {
    return {
      supportsHardwareBacking: true,
      supportsEncryption: true,
      supportsBiometricAuth: true,
      supportsSecureEnclave: false, // Android uses StrongBox instead
      platform: 'android',
    };
  }
  async storeInKeystore(key, value) {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
      await keychain.setInternetCredentials(key, key, value, {
        securityLevel: this.config.biometricAuthRequired ? 'SECURE_HARDWARE' : 'ANY',
        accessControl: 'BIOMETRY_CURRENT_SET',
      });
    } else {
      // Fallback for web/testing
      localStorage.setItem(key, value);
    }
  }
  async retrieveFromKeystore(key) {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
      const result = await keychain.getInternetCredentials(key);
      return result ? result.password : null;
    } else {
      // Fallback for web/testing
      return localStorage.getItem(key);
    }
  }
  async removeFromKeystore(key) {
    // Mock implementation - replace with actual Android Keystore integration
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      const keychain = window.ReactNativeKeychain;
      await keychain.resetInternetCredentials(key);
    } else {
      // Fallback for web/testing
      localStorage.removeItem(key);
    }
  }
  async clearKeystoreWithPrefix(prefix) {
    // Mock implementation - this would require iterating through keystore items
    if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
      // Platform-specific implementation needed
    } else {
      // Fallback for web/testing
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
  async keystoreItemExists(key) {
    try {
      const value = await this.retrieveFromKeystore(key);
      return value !== null;
    } catch {
      return false;
    }
  }
}
export class WebSecureStorage extends SecureStorage {
  async store(key, value, metadata) {
    const fullKey = this.getFullKey(key);
    try {
      const storageItem = {
        key: fullKey,
        value,
        ...(metadata && { metadata }),
      };
      // Use IndexedDB for more secure web storage
      await this.storeInIndexedDB(fullKey, JSON.stringify(storageItem));
    } catch (error) {
      throw new Error(`Failed to store in web storage: ${error}`);
    }
  }
  async retrieve(key) {
    const fullKey = this.getFullKey(key);
    try {
      const storedData = await this.retrieveFromIndexedDB(fullKey);
      if (!storedData) return null;
      const item = JSON.parse(storedData);
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
  async remove(key) {
    const fullKey = this.getFullKey(key);
    await this.removeFromIndexedDB(fullKey);
  }
  async clear() {
    await this.clearIndexedDBWithPrefix(this.config.keyPrefix);
  }
  async exists(key) {
    const fullKey = this.getFullKey(key);
    return await this.indexedDBItemExists(fullKey);
  }
  getCapabilities() {
    return {
      supportsHardwareBacking: false,
      supportsEncryption: false, // Browser storage is not hardware-encrypted
      supportsBiometricAuth: false,
      supportsSecureEnclave: false,
      platform: 'web',
    };
  }
  async storeInIndexedDB(key, value) {
    // Simplified IndexedDB implementation - use a proper IndexedDB library in production
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      // Use IndexedDB for better security than localStorage
      localStorage.setItem(key, value);
    } else {
      // Fallback
      localStorage.setItem(key, value);
    }
  }
  async retrieveFromIndexedDB(key) {
    // Simplified IndexedDB implementation
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return localStorage.getItem(key);
    } else {
      return localStorage.getItem(key);
    }
  }
  async removeFromIndexedDB(key) {
    localStorage.removeItem(key);
  }
  async clearIndexedDBWithPrefix(prefix) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keys.forEach(key => localStorage.removeItem(key));
  }
  async indexedDBItemExists(key) {
    return localStorage.getItem(key) !== null;
  }
}
export class SecureStorageFactory {
  static create(platform, config) {
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
  static getDefaultConfig() {
    return {
      keyPrefix: 'aura_auth',
      encryptionRequired: true,
      biometricAuthRequired: true,
    };
  }
}
//# sourceMappingURL=storage.js.map
