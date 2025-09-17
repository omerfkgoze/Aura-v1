import { AuthSession, AuthState, User, StoredSession, SessionConfig, AuthEvent } from './types';
import { TokenManager, defaultSessionConfig } from './tokens';
import { SessionStorage, SessionSecureStorage } from './storage';

export class SessionManager {
  private tokenManager: TokenManager;
  private sessionStorage: SessionStorage;
  private config: SessionConfig;
  private refreshTimer: NodeJS.Timeout | undefined = undefined;
  private eventListeners: ((event: AuthEvent) => void)[] = [];
  private lastActivityTime: Date = new Date();

  constructor(storage: SessionSecureStorage, config: SessionConfig = defaultSessionConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
    this.sessionStorage = new SessionStorage(storage);
    this.startInactivityTimer();
  }

  async createSession(user: User, authMethod: 'passkey' | 'opaque'): Promise<AuthSession> {
    try {
      const deviceId = await this.sessionStorage.getDeviceId();
      const session = await this.tokenManager.createSession(user, deviceId, authMethod);

      await this.persistSession(session, authMethod);
      this.scheduleTokenRefresh(session);

      this.emitEvent({
        type: 'login',
        method: authMethod,
        timestamp: new Date(),
        success: true,
      });

      this.updateLastActivity();

      return session;
    } catch (error) {
      this.emitEvent({
        type: 'login',
        method: authMethod,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async restoreSession(): Promise<AuthSession | null> {
    try {
      const storedSession = await this.sessionStorage.getStoredSession();
      if (!storedSession) {
        return null;
      }

      // Check if access token is expired
      if (this.tokenManager.isTokenExpired(storedSession.accessToken)) {
        // Try to refresh using refresh token
        if (this.tokenManager.isTokenExpired(storedSession.refreshToken)) {
          // Both tokens expired, clear session
          await this.clearSession();
          return null;
        }

        // Refresh the session
        return await this.refreshSession(storedSession);
      }

      // Verify access token
      await this.tokenManager.verifyAccessToken(storedSession.accessToken);

      const session: AuthSession = {
        accessToken: storedSession.accessToken,
        refreshToken: storedSession.refreshToken,
        expiresAt: new Date(storedSession.expiresAt),
        expiresIn: Math.floor((new Date(storedSession.expiresAt).getTime() - Date.now()) / 1000),
        tokenType: 'Bearer',
        user: storedSession.user,
      };

      this.scheduleTokenRefresh(session);
      this.updateLastActivity();

      return session;
    } catch (error) {
      // If restore fails, clear corrupted session
      await this.clearSession();
      return null;
    }
  }

  async refreshSession(storedSession?: StoredSession): Promise<AuthSession> {
    try {
      let sessionToRefresh = storedSession;

      if (!sessionToRefresh) {
        const retrievedSession = await this.sessionStorage.getStoredSession();
        if (!retrievedSession) {
          throw new Error('No session to refresh');
        }
        sessionToRefresh = retrievedSession;
      }

      const newSession = await this.tokenManager.refreshSession(
        sessionToRefresh.refreshToken,
        sessionToRefresh.user
      );

      await this.persistSession(newSession, sessionToRefresh.authMethod);
      this.scheduleTokenRefresh(newSession);

      this.emitEvent({
        type: 'refresh',
        method: sessionToRefresh.authMethod,
        timestamp: new Date(),
        success: true,
      });

      this.updateLastActivity();

      return newSession;
    } catch (error) {
      this.emitEvent({
        type: 'refresh',
        method: 'passkey', // Default
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear session on refresh failure
      await this.clearSession();
      throw error;
    }
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      await this.tokenManager.verifyAccessToken(token);
      return this.tokenManager.extractUserFromToken(token);
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      const storedSession = await this.sessionStorage.getStoredSession();
      const authMethod = storedSession?.authMethod || 'passkey';

      await this.clearSession();

      this.emitEvent({
        type: 'logout',
        method: authMethod,
        timestamp: new Date(),
        success: true,
      });
    } catch (error) {
      this.emitEvent({
        type: 'logout',
        method: 'passkey',
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async clearSession(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    await this.sessionStorage.clearSession();
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.restoreSession();
    return session !== null;
  }

  shouldRefreshToken(session: AuthSession): boolean {
    return this.tokenManager.shouldRefreshToken(session.accessToken);
  }

  onAuthEvent(listener: (event: AuthEvent) => void): () => void {
    this.eventListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  updateLastActivity(): void {
    this.lastActivityTime = new Date();
  }

  isSessionActive(): boolean {
    const now = new Date();
    const inactiveTime = now.getTime() - this.lastActivityTime.getTime();
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;

    return inactiveTime < timeoutMs;
  }

  private async persistSession(
    session: AuthSession,
    authMethod: 'passkey' | 'opaque'
  ): Promise<void> {
    const storedSession: StoredSession = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt.toISOString(),
      user: session.user,
      authMethod,
      deviceRegistered: true, // Assuming device is registered if we have a session
      createdAt: new Date().toISOString(),
    };

    await this.sessionStorage.storeSession(storedSession);
  }

  private scheduleTokenRefresh(session: AuthSession): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const expiresAt = session.expiresAt.getTime();
    const refreshThreshold = this.config.autoRefreshThreshold * 60 * 1000;
    const timeToRefresh = expiresAt - now - refreshThreshold;

    if (timeToRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        try {
          await this.refreshSession();
        } catch (error) {
          // Refresh failed, session will be cleared
          console.error('Auto-refresh failed:', error);
        }
      }, timeToRefresh);
    }
  }

  private startInactivityTimer(): void {
    setInterval(() => {
      if (!this.isSessionActive()) {
        this.logout().catch(console.error);
      }
    }, 60000); // Check every minute
  }

  private emitEvent(event: AuthEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    }
  }
}

export class AuthStateManager {
  private sessionManager: SessionManager;
  private state: AuthState;
  private stateListeners: ((state: AuthState) => void)[] = [];

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.state = {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      authMethod: null,
      deviceRegistered: false,
    };

    // Listen to auth events to update state
    this.sessionManager.onAuthEvent(event => {
      this.handleAuthEvent(event);
    });
  }

  async initialize(): Promise<void> {
    this.updateState({ isLoading: true });

    try {
      const session = await this.sessionManager.restoreSession();

      if (session) {
        const storedSession = await this.sessionManager['sessionStorage'].getStoredSession();
        this.updateState({
          user: session.user,
          session,
          isAuthenticated: true,
          authMethod: storedSession?.authMethod || 'passkey',
          deviceRegistered: storedSession?.deviceRegistered || false,
          lastSyncAt: new Date(),
          isLoading: false,
        });
      } else {
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          authMethod: null,
          deviceRegistered: false,
          isLoading: false,
        });
      }
    } catch (error) {
      this.updateState({
        user: null,
        session: null,
        isAuthenticated: false,
        authMethod: null,
        deviceRegistered: false,
        isLoading: false,
      });
    }
  }

  getState(): AuthState {
    return { ...this.state };
  }

  onStateChange(listener: (state: AuthState) => void): () => void {
    this.stateListeners.push(listener);

    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  async syncState(): Promise<void> {
    const session = await this.sessionManager.restoreSession();
    const storedSession = await this.sessionManager['sessionStorage'].getStoredSession();

    this.updateState({
      user: session?.user || null,
      session,
      isAuthenticated: session !== null,
      authMethod: storedSession?.authMethod || null,
      deviceRegistered: storedSession?.deviceRegistered || false,
      lastSyncAt: new Date(),
    });
  }

  private updateState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };

    for (const listener of this.stateListeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    }
  }

  private handleAuthEvent(event: AuthEvent): void {
    switch (event.type) {
      case 'login':
        if (event.success) {
          // State will be updated by session creation
          this.syncState();
        }
        break;

      case 'logout':
        this.updateState({
          user: null,
          session: null,
          isAuthenticated: false,
          authMethod: null,
          deviceRegistered: false,
          lastSyncAt: new Date(),
        });
        break;

      case 'refresh':
        if (event.success) {
          this.syncState();
        }
        break;
    }
  }
}
