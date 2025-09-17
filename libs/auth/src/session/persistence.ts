import { AuthState, AuthEvent } from './types';
import { SessionManager } from './manager';

export interface PersistenceConfig {
  enableAutoRestore: boolean;
  enableEventLogging: boolean;
  maxEventHistorySize: number;
  syncInterval: number; // milliseconds
}

export interface PersistedAuthData {
  lastAuthState: {
    isAuthenticated: boolean;
    authMethod: 'passkey' | 'opaque' | null;
    deviceRegistered: boolean;
    lastSyncAt: string;
  };
  eventHistory: AuthEvent[];
  deviceInfo: {
    deviceId: string;
    platform: string;
    firstSeen: string;
    lastSeen: string;
  };
}

export class AuthPersistenceManager {
  private sessionManager: SessionManager;
  private config: PersistenceConfig;
  private syncTimer: NodeJS.Timeout | undefined = undefined;
  private eventHistory: AuthEvent[] = [];
  private readonly PERSISTENCE_KEY = 'aura_auth_persistence';

  constructor(sessionManager: SessionManager, config: Partial<PersistenceConfig> = {}) {
    this.sessionManager = sessionManager;
    this.config = {
      enableAutoRestore: true,
      enableEventLogging: true,
      maxEventHistorySize: 100,
      syncInterval: 30000, // 30 seconds
      ...config,
    };

    if (this.config.enableEventLogging) {
      this.setupEventLogging();
    }

    if (this.config.syncInterval > 0) {
      this.startPeriodicSync();
    }
  }

  async initializePersistence(): Promise<void> {
    try {
      // Load persisted data
      const persistedData = await this.loadPersistedData();

      if (persistedData) {
        this.eventHistory = persistedData.eventHistory || [];

        // Update device info
        await this.updateDeviceInfo();
      }

      if (this.config.enableAutoRestore) {
        // Restore session state
        await this.restoreAuthState();
      }
    } catch (error) {
      console.error('Failed to initialize auth persistence:', error);
      // Continue without persistence rather than failing completely
    }
  }

  async saveAuthState(state: AuthState): Promise<void> {
    if (!this.config.enableAutoRestore) {
      return;
    }

    try {
      const persistedData = (await this.loadPersistedData()) || this.createEmptyPersistedData();

      persistedData.lastAuthState = {
        isAuthenticated: state.isAuthenticated,
        authMethod: state.authMethod,
        deviceRegistered: state.deviceRegistered,
        lastSyncAt: new Date().toISOString(),
      };

      await this.savePersistedData(persistedData);
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  }

  async restoreAuthState(): Promise<AuthState | null> {
    try {
      const session = await this.sessionManager.restoreSession();
      const persistedData = await this.loadPersistedData();

      if (session && persistedData) {
        const authState: AuthState = {
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          authMethod: persistedData.lastAuthState.authMethod,
          deviceRegistered: persistedData.lastAuthState.deviceRegistered,
        };

        if (persistedData.lastAuthState.lastSyncAt) {
          authState.lastSyncAt = new Date(persistedData.lastAuthState.lastSyncAt);
        }

        return authState;
      }

      return null;
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      return null;
    }
  }

  logAuthEvent(event: AuthEvent): void {
    if (!this.config.enableEventLogging) {
      return;
    }

    // Add to in-memory history
    this.eventHistory.unshift(event);

    // Trim history to max size
    if (this.eventHistory.length > this.config.maxEventHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.config.maxEventHistorySize);
    }

    // Persist the event
    this.persistEventHistory().catch(console.error);
  }

  getAuthEventHistory(): AuthEvent[] {
    return [...this.eventHistory];
  }

  async clearPersistedData(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.PERSISTENCE_KEY);
      }
      this.eventHistory = [];
    } catch (error) {
      console.error('Failed to clear persisted data:', error);
    }
  }

  async getSecurityAuditLog(): Promise<AuthEvent[]> {
    const persistedData = await this.loadPersistedData();
    return persistedData?.eventHistory || [];
  }

  async exportAuthData(): Promise<PersistedAuthData | null> {
    return await this.loadPersistedData();
  }

  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  private setupEventLogging(): void {
    this.sessionManager.onAuthEvent(event => {
      this.logAuthEvent(event);
    });
  }

  private startPeriodicSync(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.persistEventHistory();
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  protected async loadPersistedData(): Promise<PersistedAuthData | null> {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }

      const stored = localStorage.getItem(this.PERSISTENCE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as PersistedAuthData;

      // Validate and migrate data if needed
      return this.validatePersistedData(parsed);
    } catch (error) {
      console.error('Failed to load persisted data:', error);
      return null;
    }
  }

  protected async savePersistedData(data: PersistedAuthData): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }

      const serialized = JSON.stringify(data);
      localStorage.setItem(this.PERSISTENCE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save persisted data:', error);
      throw error;
    }
  }

  private async persistEventHistory(): Promise<void> {
    const persistedData = (await this.loadPersistedData()) || this.createEmptyPersistedData();

    persistedData.eventHistory = this.eventHistory;

    await this.savePersistedData(persistedData);
  }

  private createEmptyPersistedData(): PersistedAuthData {
    return {
      lastAuthState: {
        isAuthenticated: false,
        authMethod: null,
        deviceRegistered: false,
        lastSyncAt: new Date().toISOString(),
      },
      eventHistory: [],
      deviceInfo: {
        deviceId: '',
        platform: this.detectPlatform(),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      },
    };
  }

  private validatePersistedData(data: any): PersistedAuthData | null {
    try {
      // Basic validation
      if (!data || typeof data !== 'object') {
        return null;
      }

      // Ensure required structure exists
      const validated: PersistedAuthData = {
        lastAuthState: data.lastAuthState || {
          isAuthenticated: false,
          authMethod: null,
          deviceRegistered: false,
          lastSyncAt: new Date().toISOString(),
        },
        eventHistory: Array.isArray(data.eventHistory) ? data.eventHistory : [],
        deviceInfo: data.deviceInfo || {
          deviceId: '',
          platform: this.detectPlatform(),
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        },
      };

      // Update last seen
      validated.deviceInfo.lastSeen = new Date().toISOString();

      return validated;
    } catch (error) {
      console.error('Failed to validate persisted data:', error);
      return null;
    }
  }

  private async updateDeviceInfo(): Promise<void> {
    try {
      const deviceId = await this.sessionManager['sessionStorage'].getDeviceId();
      const persistedData = (await this.loadPersistedData()) || this.createEmptyPersistedData();

      persistedData.deviceInfo.deviceId = deviceId;
      persistedData.deviceInfo.lastSeen = new Date().toISOString();
      persistedData.deviceInfo.platform = this.detectPlatform();

      await this.savePersistedData(persistedData);
    } catch (error) {
      console.error('Failed to update device info:', error);
    }
  }

  private detectPlatform(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.platform || 'web';
    } else if (typeof process !== 'undefined') {
      return process.platform || 'node';
    }
    return 'unknown';
  }
}

// Cross-platform storage adapter for React Native
export class ReactNativeAuthPersistence extends AuthPersistenceManager {
  private AsyncStorage: any;

  constructor(
    sessionManager: SessionManager,
    AsyncStorage: any,
    config?: Partial<PersistenceConfig>
  ) {
    super(sessionManager, config);
    this.AsyncStorage = AsyncStorage;
  }

  protected override async loadPersistedData(): Promise<PersistedAuthData | null> {
    try {
      if (!this.AsyncStorage) {
        return null;
      }

      const stored = await this.AsyncStorage.getItem(this['PERSISTENCE_KEY']);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as PersistedAuthData;
      return this['validatePersistedData'](parsed);
    } catch (error) {
      console.error('Failed to load persisted data from AsyncStorage:', error);
      return null;
    }
  }

  protected override async savePersistedData(data: PersistedAuthData): Promise<void> {
    try {
      if (!this.AsyncStorage) {
        return;
      }

      const serialized = JSON.stringify(data);
      await this.AsyncStorage.setItem(this['PERSISTENCE_KEY'], serialized);
    } catch (error) {
      console.error('Failed to save persisted data to AsyncStorage:', error);
      throw error;
    }
  }

  override async clearPersistedData(): Promise<void> {
    try {
      if (this.AsyncStorage) {
        await this.AsyncStorage.removeItem(this['PERSISTENCE_KEY']);
      }
      this['eventHistory'] = [];
    } catch (error) {
      console.error('Failed to clear persisted data from AsyncStorage:', error);
    }
  }
}
