import { AuthSession, AuthState, User, StoredSession, SessionConfig, AuthEvent } from './types';
import { SessionSecureStorage } from './storage';
export declare class SessionManager {
  private tokenManager;
  private sessionStorage;
  private config;
  private refreshTimer;
  private eventListeners;
  private lastActivityTime;
  constructor(storage: SessionSecureStorage, config?: SessionConfig);
  createSession(user: User, authMethod: 'passkey' | 'opaque'): Promise<AuthSession>;
  restoreSession(): Promise<AuthSession | null>;
  refreshSession(storedSession?: StoredSession): Promise<AuthSession>;
  validateToken(token: string): Promise<User | null>;
  logout(): Promise<void>;
  clearSession(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  shouldRefreshToken(session: AuthSession): boolean;
  onAuthEvent(listener: (event: AuthEvent) => void): () => void;
  updateLastActivity(): void;
  isSessionActive(): boolean;
  private persistSession;
  private scheduleTokenRefresh;
  private startInactivityTimer;
  private emitEvent;
}
export declare class AuthStateManager {
  private sessionManager;
  private state;
  private stateListeners;
  constructor(sessionManager: SessionManager);
  initialize(): Promise<void>;
  getState(): AuthState;
  onStateChange(listener: (state: AuthState) => void): () => void;
  syncState(): Promise<void>;
  private updateState;
  private handleAuthEvent;
}
