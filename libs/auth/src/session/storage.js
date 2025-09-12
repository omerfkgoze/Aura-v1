import { __awaiter } from 'tslib';
export class SessionStorage {
  constructor(storage) {
    this.SESSION_KEY = 'aura_auth_session';
    this.DEVICE_ID_KEY = 'aura_device_id';
    this.storage = storage;
  }
  storeSession(session) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const encryptedSession = yield this.encryptSession(session);
        yield this.storage.setItem(this.SESSION_KEY, encryptedSession);
      } catch (error) {
        throw new Error(
          `Failed to store session: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  getStoredSession() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const encryptedSession = yield this.storage.getItem(this.SESSION_KEY);
        if (!encryptedSession) {
          return null;
        }
        return yield this.decryptSession(encryptedSession);
      } catch (error) {
        // If decryption fails, clear corrupted session
        yield this.clearSession();
        return null;
      }
    });
  }
  clearSession() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this.storage.removeItem(this.SESSION_KEY);
      } catch (error) {
        throw new Error(
          `Failed to clear session: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  getDeviceId() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        let deviceId = yield this.storage.getItem(this.DEVICE_ID_KEY);
        if (!deviceId) {
          deviceId = yield this.generateDeviceId();
          yield this.storage.setItem(this.DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
      } catch (error) {
        throw new Error(
          `Failed to get device ID: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  clearAllAuthData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield Promise.all([
          this.storage.removeItem(this.SESSION_KEY),
          // Keep device ID for analytics but clear session data
        ]);
      } catch (error) {
        throw new Error(
          `Failed to clear auth data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  encryptSession(session) {
    return __awaiter(this, void 0, void 0, function* () {
      // TODO: Integrate with crypto core for actual encryption
      // For now, using base64 encoding as placeholder
      const jsonString = JSON.stringify(session);
      return btoa(jsonString);
    });
  }
  decryptSession(encryptedSession) {
    return __awaiter(this, void 0, void 0, function* () {
      // TODO: Integrate with crypto core for actual decryption
      // For now, using base64 decoding as placeholder
      try {
        const jsonString = atob(encryptedSession);
        const session = JSON.parse(jsonString);
        // Validate session structure
        this.validateStoredSession(session);
        return session;
      } catch (error) {
        throw new Error('Invalid session data');
      }
    });
  }
  validateStoredSession(session) {
    if (!session || typeof session !== 'object') {
      throw new Error('Invalid session object');
    }
    const required = ['accessToken', 'refreshToken', 'expiresAt', 'user', 'authMethod'];
    for (const field of required) {
      if (!(field in session)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    if (typeof session.user !== 'object' || !session.user.id) {
      throw new Error('Invalid user data in session');
    }
  }
  generateDeviceId() {
    return __awaiter(this, void 0, void 0, function* () {
      // Generate cryptographically secure device ID
      const array = new Uint8Array(16);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array);
      } else {
        // Fallback for Node.js environment
        const crypto = yield import('crypto');
        const buffer = crypto.randomBytes(16);
        array.set(buffer);
      }
      // Convert to hex string
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    });
  }
}
// Platform-specific storage implementations
export class WebStorage {
  constructor(storage = localStorage) {
    this.storage = storage;
  }
  setItem(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        this.storage.setItem(key, value);
      } catch (error) {
        throw new Error(
          `Failed to store item: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  getItem(key) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        return this.storage.getItem(key);
      } catch (error) {
        throw new Error(
          `Failed to get item: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  removeItem(key) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        throw new Error(
          `Failed to remove item: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
  clear() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        this.storage.clear();
      } catch (error) {
        throw new Error(
          `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }
}
// Mock storage for React Native (would be replaced with actual secure storage)
export class MockSecureStorage {
  constructor() {
    this.data = new Map();
  }
  setItem(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
      this.data.set(key, value);
    });
  }
  getItem(key) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      return (_a = this.data.get(key)) !== null && _a !== void 0 ? _a : null;
    });
  }
  removeItem(key) {
    return __awaiter(this, void 0, void 0, function* () {
      this.data.delete(key);
    });
  }
  clear() {
    return __awaiter(this, void 0, void 0, function* () {
      this.data.clear();
    });
  }
}
//# sourceMappingURL=storage.js.map
