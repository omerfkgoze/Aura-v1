import { StoredSession } from './types';
export interface SessionSecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
export declare class SessionStorage {
  private storage;
  private readonly SESSION_KEY;
  private readonly DEVICE_ID_KEY;
  constructor(storage: SessionSecureStorage);
  storeSession(session: StoredSession): Promise<void>;
  getStoredSession(): Promise<StoredSession | null>;
  clearSession(): Promise<void>;
  getDeviceId(): Promise<string>;
  clearAllAuthData(): Promise<void>;
  private encryptSession;
  private decryptSession;
  private validateStoredSession;
  private generateDeviceId;
}
export declare class WebStorage implements SessionSecureStorage {
  private storage;
  constructor(storage?: Storage);
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
export declare class MockSecureStorage implements SessionSecureStorage {
  private data;
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
