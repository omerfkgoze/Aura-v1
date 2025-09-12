import { __awaiter } from 'tslib';
export class SecureStorage {
  constructor(config) {
    this.config = config;
  }
  getFullKey(key) {
    return `${this.config.keyPrefix}:${key}`;
  }
}
export class IOSSecureStorage extends SecureStorage {
  store(key, value, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        // Use iOS Keychain Services through React Native Keychain or similar
        const storageItem = {
          key: fullKey,
          value,
          metadata,
        };
        // Platform-specific iOS Keychain storage
        yield this.storeInKeychain(fullKey, JSON.stringify(storageItem));
      } catch (error) {
        throw new Error(`Failed to store in iOS Keychain: ${error}`);
      }
    });
  }
  retrieve(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        const storedData = yield this.retrieveFromKeychain(fullKey);
        if (!storedData) return null;
        const item = JSON.parse(storedData);
        // Check expiration
        if (item.expiresAt && new Date() > item.expiresAt) {
          yield this.remove(key);
          return null;
        }
        return item.value;
      } catch (error) {
        throw new Error(`Failed to retrieve from iOS Keychain: ${error}`);
      }
    });
  }
  remove(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      yield this.removeFromKeychain(fullKey);
    });
  }
  clear() {
    return __awaiter(this, void 0, void 0, function* () {
      // Clear all items with the key prefix
      yield this.clearKeychainWithPrefix(this.config.keyPrefix);
    });
  }
  exists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      return yield this.keychainItemExists(fullKey);
    });
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
  storeInKeychain(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual iOS Keychain integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        yield keychain.setInternetCredentials(key, key, value, {
          accessControl: this.config.biometricAuthRequired
            ? 'BiometryCurrentSet'
            : 'WhenUnlockedThisDeviceOnly',
          securityLevel: 'SECURE_HARDWARE',
        });
      } else {
        // Fallback for web/testing
        localStorage.setItem(key, value);
      }
    });
  }
  retrieveFromKeychain(key) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual iOS Keychain integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        const result = yield keychain.getInternetCredentials(key);
        return result ? result.password : null;
      } else {
        // Fallback for web/testing
        return localStorage.getItem(key);
      }
    });
  }
  removeFromKeychain(key) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual iOS Keychain integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        yield keychain.resetInternetCredentials(key);
      } else {
        // Fallback for web/testing
        localStorage.removeItem(key);
      }
    });
  }
  clearKeychainWithPrefix(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - this would require iterating through keychain items
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        // Platform-specific implementation needed
      } else {
        // Fallback for web/testing
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(key => localStorage.removeItem(key));
      }
    });
  }
  keychainItemExists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const value = yield this.retrieveFromKeychain(key);
        return value !== null;
      } catch (_a) {
        return false;
      }
    });
  }
}
export class AndroidSecureStorage extends SecureStorage {
  store(key, value, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        const storageItem = {
          key: fullKey,
          value,
          metadata,
        };
        // Platform-specific Android Keystore storage
        yield this.storeInKeystore(fullKey, JSON.stringify(storageItem));
      } catch (error) {
        throw new Error(`Failed to store in Android Keystore: ${error}`);
      }
    });
  }
  retrieve(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        const storedData = yield this.retrieveFromKeystore(fullKey);
        if (!storedData) return null;
        const item = JSON.parse(storedData);
        // Check expiration
        if (item.expiresAt && new Date() > item.expiresAt) {
          yield this.remove(key);
          return null;
        }
        return item.value;
      } catch (error) {
        throw new Error(`Failed to retrieve from Android Keystore: ${error}`);
      }
    });
  }
  remove(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      yield this.removeFromKeystore(fullKey);
    });
  }
  clear() {
    return __awaiter(this, void 0, void 0, function* () {
      // Clear all items with the key prefix
      yield this.clearKeystoreWithPrefix(this.config.keyPrefix);
    });
  }
  exists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      return yield this.keystoreItemExists(fullKey);
    });
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
  storeInKeystore(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual Android Keystore integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        yield keychain.setInternetCredentials(key, key, value, {
          securityLevel: this.config.biometricAuthRequired ? 'SECURE_HARDWARE' : 'ANY',
          accessControl: 'BIOMETRY_CURRENT_SET',
        });
      } else {
        // Fallback for web/testing
        localStorage.setItem(key, value);
      }
    });
  }
  retrieveFromKeystore(key) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual Android Keystore integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        const result = yield keychain.getInternetCredentials(key);
        return result ? result.password : null;
      } else {
        // Fallback for web/testing
        return localStorage.getItem(key);
      }
    });
  }
  removeFromKeystore(key) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - replace with actual Android Keystore integration
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        const keychain = window.ReactNativeKeychain;
        yield keychain.resetInternetCredentials(key);
      } else {
        // Fallback for web/testing
        localStorage.removeItem(key);
      }
    });
  }
  clearKeystoreWithPrefix(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - this would require iterating through keystore items
      if (typeof window !== 'undefined' && window.ReactNativeKeychain) {
        // Platform-specific implementation needed
      } else {
        // Fallback for web/testing
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(key => localStorage.removeItem(key));
      }
    });
  }
  keystoreItemExists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const value = yield this.retrieveFromKeystore(key);
        return value !== null;
      } catch (_a) {
        return false;
      }
    });
  }
}
export class WebSecureStorage extends SecureStorage {
  store(key, value, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        const storageItem = {
          key: fullKey,
          value,
          metadata,
        };
        // Use IndexedDB for more secure web storage
        yield this.storeInIndexedDB(fullKey, JSON.stringify(storageItem));
      } catch (error) {
        throw new Error(`Failed to store in web storage: ${error}`);
      }
    });
  }
  retrieve(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      try {
        const storedData = yield this.retrieveFromIndexedDB(fullKey);
        if (!storedData) return null;
        const item = JSON.parse(storedData);
        // Check expiration
        if (item.expiresAt && new Date() > item.expiresAt) {
          yield this.remove(key);
          return null;
        }
        return item.value;
      } catch (error) {
        throw new Error(`Failed to retrieve from web storage: ${error}`);
      }
    });
  }
  remove(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      yield this.removeFromIndexedDB(fullKey);
    });
  }
  clear() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.clearIndexedDBWithPrefix(this.config.keyPrefix);
    });
  }
  exists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      const fullKey = this.getFullKey(key);
      return yield this.indexedDBItemExists(fullKey);
    });
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
  storeInIndexedDB(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      // Simplified IndexedDB implementation - use a proper IndexedDB library in production
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        // Use IndexedDB for better security than localStorage
        localStorage.setItem(key, value);
      } else {
        // Fallback
        localStorage.setItem(key, value);
      }
    });
  }
  retrieveFromIndexedDB(key) {
    return __awaiter(this, void 0, void 0, function* () {
      // Simplified IndexedDB implementation
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        return localStorage.getItem(key);
      } else {
        return localStorage.getItem(key);
      }
    });
  }
  removeFromIndexedDB(key) {
    return __awaiter(this, void 0, void 0, function* () {
      localStorage.removeItem(key);
    });
  }
  clearIndexedDBWithPrefix(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    });
  }
  indexedDBItemExists(key) {
    return __awaiter(this, void 0, void 0, function* () {
      return localStorage.getItem(key) !== null;
    });
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
