import { StoredSession } from './types';

export interface SecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class SessionStorage {
  private storage: SecureStorage;
  private readonly SESSION_KEY = 'aura_auth_session';
  private readonly DEVICE_ID_KEY = 'aura_device_id';

  constructor(storage: SecureStorage) {
    this.storage = storage;
  }

  async storeSession(session: StoredSession): Promise<void> {
    try {
      const encryptedSession = await this.encryptSession(session);
      await this.storage.setItem(this.SESSION_KEY, encryptedSession);
    } catch (error) {
      throw new Error(
        `Failed to store session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getStoredSession(): Promise<StoredSession | null> {
    try {
      const encryptedSession = await this.storage.getItem(this.SESSION_KEY);
      if (!encryptedSession) {
        return null;
      }

      return await this.decryptSession(encryptedSession);
    } catch (error) {
      // If decryption fails, clear corrupted session
      await this.clearSession();
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      await this.storage.removeItem(this.SESSION_KEY);
    } catch (error) {
      throw new Error(
        `Failed to clear session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await this.storage.getItem(this.DEVICE_ID_KEY);

      if (!deviceId) {
        deviceId = await this.generateDeviceId();
        await this.storage.setItem(this.DEVICE_ID_KEY, deviceId);
      }

      return deviceId;
    } catch (error) {
      throw new Error(
        `Failed to get device ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async clearAllAuthData(): Promise<void> {
    try {
      await Promise.all([
        this.storage.removeItem(this.SESSION_KEY),
        // Keep device ID for analytics but clear session data
      ]);
    } catch (error) {
      throw new Error(
        `Failed to clear auth data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async encryptSession(session: StoredSession): Promise<string> {
    // TODO: Integrate with crypto core for actual encryption
    // For now, using base64 encoding as placeholder
    const jsonString = JSON.stringify(session);
    return btoa(jsonString);
  }

  private async decryptSession(encryptedSession: string): Promise<StoredSession> {
    // TODO: Integrate with crypto core for actual decryption
    // For now, using base64 decoding as placeholder
    try {
      const jsonString = atob(encryptedSession);
      const session = JSON.parse(jsonString) as StoredSession;

      // Validate session structure
      this.validateStoredSession(session);

      return session;
    } catch (error) {
      throw new Error('Invalid session data');
    }
  }

  private validateStoredSession(session: any): asserts session is StoredSession {
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

  private async generateDeviceId(): Promise<string> {
    // Generate cryptographically secure device ID
    const array = new Uint8Array(16);

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for Node.js environment
      const crypto = await import('crypto');
      const buffer = crypto.randomBytes(16);
      array.set(buffer);
    }

    // Convert to hex string
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// Platform-specific storage implementations
export class WebStorage implements SecureStorage {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.storage.setItem(key, value);
    } catch (error) {
      throw new Error(
        `Failed to store item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return this.storage.getItem(key);
    } catch (error) {
      throw new Error(
        `Failed to get item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      throw new Error(
        `Failed to remove item: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clear();
    } catch (error) {
      throw new Error(
        `Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Mock storage for React Native (would be replaced with actual secure storage)
export class MockSecureStorage implements SecureStorage {
  private data: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}
