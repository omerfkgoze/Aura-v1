import { AuthState, AuthEvent } from './types';
import { SessionManager } from './manager';
export interface PersistenceConfig {
  enableAutoRestore: boolean;
  enableEventLogging: boolean;
  maxEventHistorySize: number;
  syncInterval: number;
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
export declare class AuthPersistenceManager {
  private sessionManager;
  private config;
  private syncTimer;
  private eventHistory;
  private readonly PERSISTENCE_KEY;
  constructor(sessionManager: SessionManager, config?: Partial<PersistenceConfig>);
  initializePersistence(): Promise<void>;
  saveAuthState(state: AuthState): Promise<void>;
  restoreAuthState(): Promise<AuthState | null>;
  logAuthEvent(event: AuthEvent): void;
  getAuthEventHistory(): AuthEvent[];
  clearPersistedData(): Promise<void>;
  getSecurityAuditLog(): Promise<AuthEvent[]>;
  exportAuthData(): Promise<PersistedAuthData | null>;
  dispose(): void;
  private setupEventLogging;
  private startPeriodicSync;
  protected loadPersistedData(): Promise<PersistedAuthData | null>;
  protected savePersistedData(data: PersistedAuthData): Promise<void>;
  private persistEventHistory;
  private createEmptyPersistedData;
  private validatePersistedData;
  private updateDeviceInfo;
  private detectPlatform;
}
export declare class ReactNativeAuthPersistence extends AuthPersistenceManager {
  private AsyncStorage;
  constructor(
    sessionManager: SessionManager,
    AsyncStorage: any,
    config?: Partial<PersistenceConfig>
  );
  protected loadPersistedData(): Promise<PersistedAuthData | null>;
  protected savePersistedData(data: PersistedAuthData): Promise<void>;
  clearPersistedData(): Promise<void>;
}
