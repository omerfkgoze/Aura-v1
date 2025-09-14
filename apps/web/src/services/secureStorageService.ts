// Import crypto-core types dynamically
type PlatformSecureStorage = any;
type SecureStorageConfig = any;
type SecureStoragePlatform = any;
type MasterKeyStorageInfo = any;
type HSMCapabilities = any;

export interface WebSecureStorageConfig {
  indexedDBName: string;
  indexedDBVersion: number;
  objectStoreName: string;
  requireSecureContext: boolean;
}

export class WebSecureStorageService {
  private wasmStorage: PlatformSecureStorage;
  private config: WebSecureStorageConfig;
  private db: IDBDatabase | null = null;

  constructor(config?: Partial<WebSecureStorageConfig>) {
    this.config = {
      indexedDBName: 'aura-secure-storage',
      indexedDBVersion: 1,
      objectStoreName: 'keys',
      requireSecureContext: true,
      ...config,
    };

    // Initialize WASM secure storage will be done in initialize()
    this.wasmStorage = null as any;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check security prerequisites
      if (this.config.requireSecureContext && !this.isSecureContext()) {
        throw new Error('Secure context (HTTPS) required for secure storage');
      }

      // Initialize IndexedDB
      await this.initializeIndexedDB();

      // Initialize WASM storage with dynamic import
      const { PlatformSecureStorage, SecureStorageConfig, SecureStoragePlatform } = await import(
        '@aura/crypto-core'
      );

      const platform = this.supportsWebCrypto()
        ? SecureStoragePlatform.WebCryptoAPI
        : SecureStoragePlatform.WebIndexedDB;

      const wasmConfig = new SecureStorageConfig(
        platform,
        'aura-web-keys',
        false,
        false,
        'WhenUnlocked',
        'AES-256-GCM'
      );

      this.wasmStorage = new PlatformSecureStorage(wasmConfig);
      await this.wasmStorage.initialize();

      return true;
    } catch (error) {
      console.error('Failed to initialize web secure storage:', error);
      return false;
    }
  }

  private supportsWebCrypto(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.crypto !== 'undefined' &&
      typeof window.crypto.subtle !== 'undefined' &&
      this.isSecureContext()
    );
  }

  private supportsIndexedDB(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private isSecureContext(): boolean {
    return (
      typeof window !== 'undefined' &&
      (window.isSecureContext ||
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost')
    );
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.indexedDBName, this.config.indexedDBVersion);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.config.objectStoreName)) {
          db.createObjectStore(this.config.objectStoreName, { keyPath: 'id' });
        }
      };
    });
  }
}

// Singleton instance for app-wide use
export const webSecureStorageService = new WebSecureStorageService();

// Hook for React components
export function useWebSecureStorage() {
  return webSecureStorageService;
}
