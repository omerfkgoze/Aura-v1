import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SessionManager,
  AuthStateManager,
  TokenManager,
  SessionStorage,
  MockSecureStorage,
  LogoutManager,
  AuthAuditLogger,
  AuthPersistenceManager,
  defaultSessionConfig,
} from '../src/session';
import type { User, AuthSession, AuthEvent } from '../src/session/types';

describe('Session Management', () => {
  let mockStorage: MockSecureStorage;
  let sessionManager: SessionManager;
  let authStateManager: AuthStateManager;
  let tokenManager: TokenManager;
  let auditLogger: AuthAuditLogger;

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();

    mockStorage = new MockSecureStorage();
    sessionManager = new SessionManager(mockStorage, defaultSessionConfig);
    authStateManager = new AuthStateManager(sessionManager);
    tokenManager = new TokenManager(defaultSessionConfig);
    auditLogger = new AuthAuditLogger();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('TokenManager', () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
      emailVerified: true,
    };

    it('should create a valid session with access and refresh tokens', async () => {
      const session = await tokenManager.createSession(mockUser, 'device-123', 'passkey');

      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
      expect(session.user).toEqual(mockUser);
      expect(session.tokenType).toBe('Bearer');
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresIn).toBeGreaterThan(0);
    });

    it('should verify valid access tokens', async () => {
      const session = await tokenManager.createSession(mockUser, 'device-123', 'passkey');
      const payload = await tokenManager.verifyAccessToken(session.accessToken);

      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.device_id).toBe('device-123');
      expect(payload.auth_method).toBe('passkey');
    });

    it('should reject expired tokens', async () => {
      const session = await tokenManager.createSession(mockUser, 'device-123', 'passkey');

      // Fast-forward time to expire token
      vi.advanceTimersByTime((defaultSessionConfig.accessTokenExpiry + 1) * 60 * 1000);

      await expect(tokenManager.verifyAccessToken(session.accessToken)).rejects.toThrow(
        'Token expired'
      );
    });

    it('should refresh sessions with valid refresh tokens', async () => {
      const originalSession = await tokenManager.createSession(mockUser, 'device-123', 'passkey');
      const refreshedSession = await tokenManager.refreshSession(
        originalSession.refreshToken,
        mockUser
      );

      expect(refreshedSession.accessToken).not.toBe(originalSession.accessToken);
      expect(refreshedSession.refreshToken).not.toBe(originalSession.refreshToken);
      expect(refreshedSession.user).toEqual(mockUser);
    });

    it('should detect when tokens should be refreshed', async () => {
      const session = await tokenManager.createSession(mockUser, 'device-123', 'passkey');

      // Initially, token should not need refresh
      expect(tokenManager.shouldRefreshToken(session.accessToken)).toBe(false);

      // Fast-forward to refresh threshold
      const thresholdTime =
        (defaultSessionConfig.accessTokenExpiry - defaultSessionConfig.autoRefreshThreshold + 1) *
        60 *
        1000;
      vi.advanceTimersByTime(thresholdTime);

      expect(tokenManager.shouldRefreshToken(session.accessToken)).toBe(true);
    });
  });

  describe('SessionStorage', () => {
    let sessionStorage: SessionStorage;

    beforeEach(() => {
      sessionStorage = new SessionStorage(mockStorage);
    });

    it('should store and retrieve sessions', async () => {
      const storedSession = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'test',
          createdAt: new Date(),
          emailVerified: true,
        },
        authMethod: 'passkey' as const,
        deviceRegistered: true,
        createdAt: new Date().toISOString(),
      };

      await sessionStorage.storeSession(storedSession);
      const retrieved = await sessionStorage.getStoredSession();

      expect(retrieved).toEqual(storedSession);
    });

    it('should return null for non-existent sessions', async () => {
      const retrieved = await sessionStorage.getStoredSession();
      expect(retrieved).toBeNull();
    });

    it('should clear sessions', async () => {
      const storedSession = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'test',
          createdAt: new Date(),
          emailVerified: true,
        },
        authMethod: 'passkey' as const,
        deviceRegistered: true,
        createdAt: new Date().toISOString(),
      };

      await sessionStorage.storeSession(storedSession);
      await sessionStorage.clearSession();

      const retrieved = await sessionStorage.getStoredSession();
      expect(retrieved).toBeNull();
    });

    it('should generate and persist device IDs', async () => {
      const deviceId1 = await sessionStorage.getDeviceId();
      const deviceId2 = await sessionStorage.getDeviceId();

      expect(deviceId1).toBeDefined();
      expect(deviceId1).toBe(deviceId2); // Should be consistent
      expect(deviceId1).toHaveLength(32); // 16 bytes as hex
    });
  });

  describe('SessionManager', () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
      emailVerified: true,
    };

    it('should create and persist sessions', async () => {
      const session = await sessionManager.createSession(mockUser, 'passkey');

      expect(session.user).toEqual(mockUser);
      expect(session.accessToken).toBeDefined();
      expect(session.refreshToken).toBeDefined();
    });

    it('should restore valid sessions', async () => {
      // Create a session
      await sessionManager.createSession(mockUser, 'passkey');

      // Create a new session manager to test restoration
      const newSessionManager = new SessionManager(mockStorage, defaultSessionConfig);
      const restoredSession = await newSessionManager.restoreSession();

      expect(restoredSession).toBeDefined();
      expect(restoredSession?.user).toEqual(mockUser);
    });

    it('should return null for non-existent sessions', async () => {
      const restoredSession = await sessionManager.restoreSession();
      expect(restoredSession).toBeNull();
    });

    it('should auto-refresh expired access tokens', async () => {
      const originalSession = await sessionManager.createSession(mockUser, 'passkey');

      // Fast-forward to make access token expired but refresh token valid
      vi.advanceTimersByTime((defaultSessionConfig.accessTokenExpiry + 1) * 60 * 1000);

      const restoredSession = await sessionManager.restoreSession();

      expect(restoredSession).toBeDefined();
      expect(restoredSession?.accessToken).not.toBe(originalSession.accessToken);
    });

    it('should clear sessions on logout', async () => {
      await sessionManager.createSession(mockUser, 'passkey');
      await sessionManager.logout();

      const restoredSession = await sessionManager.restoreSession();
      expect(restoredSession).toBeNull();
    });

    it('should validate session activity', async () => {
      await sessionManager.createSession(mockUser, 'passkey');

      expect(sessionManager.isSessionActive()).toBe(true);

      // Fast-forward past session timeout
      vi.advanceTimersByTime((defaultSessionConfig.sessionTimeout + 1) * 60 * 1000);

      expect(sessionManager.isSessionActive()).toBe(false);
    });
  });

  describe('AuthStateManager', () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
      emailVerified: true,
    };

    it('should initialize with unauthenticated state', async () => {
      await authStateManager.initialize();
      const state = authStateManager.getState();

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should update state after session creation', async () => {
      await authStateManager.initialize();
      await sessionManager.createSession(mockUser, 'passkey');
      await authStateManager.syncState();

      const state = authStateManager.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.session).toBeDefined();
    });

    it('should notify state change listeners', async () => {
      const stateChanges: any[] = [];
      const unsubscribe = authStateManager.onStateChange(state => {
        stateChanges.push({ ...state });
      });

      await authStateManager.initialize();
      await sessionManager.createSession(mockUser, 'passkey');
      await authStateManager.syncState();

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].isAuthenticated).toBe(true);

      unsubscribe();
    });
  });

  describe('LogoutManager', () => {
    const mockUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
      emailVerified: true,
    };

    it('should perform standard logout', async () => {
      const logoutManager = new LogoutManager(sessionManager);

      await sessionManager.createSession(mockUser, 'passkey');
      const result = await logoutManager.performLogout();

      expect(result.success).toBe(true);
      expect(result.clearedSessions).toBe(1);

      const restoredSession = await sessionManager.restoreSession();
      expect(restoredSession).toBeNull();
    });

    it('should perform security logout', async () => {
      const logoutManager = new LogoutManager(sessionManager);

      await sessionManager.createSession(mockUser, 'passkey');
      const result = await logoutManager.performSecurityLogout('suspicious activity');

      expect(result.success).toBe(true);
      expect(result.clearedSessions).toBe(1);
    });

    it('should perform emergency logout', async () => {
      const logoutManager = new LogoutManager(sessionManager);

      await sessionManager.createSession(mockUser, 'passkey');
      const result = await logoutManager.performEmergencyLogout();

      expect(result.success).toBe(true);
      expect(result.clearedSessions).toBe(1);
    });
  });

  describe('AuthAuditLogger', () => {
    it('should log authentication events', () => {
      const event: AuthEvent = {
        type: 'login',
        method: 'passkey',
        timestamp: new Date(),
        success: true,
      };

      auditLogger.logAuthEvent(event);
      const history = auditLogger.getAuditHistory(10);

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('login');
      expect(history[0].success).toBe(true);
    });

    it('should generate audit summaries', () => {
      // Log some events
      const events: AuthEvent[] = [
        { type: 'login', method: 'passkey', timestamp: new Date(), success: true },
        { type: 'login', method: 'opaque', timestamp: new Date(), success: false },
        { type: 'logout', method: 'passkey', timestamp: new Date(), success: true },
      ];

      events.forEach(event => auditLogger.logAuthEvent(event));

      const summary = auditLogger.generateAuditSummary(24);

      expect(summary.totalEvents).toBe(3);
      expect(summary.successfulLogins).toBe(1);
      expect(summary.failedLogins).toBe(1);
      expect(summary.logouts).toBe(1);
    });

    it('should export audit logs', () => {
      const event: AuthEvent = {
        type: 'login',
        method: 'passkey',
        timestamp: new Date(),
        success: true,
      };

      auditLogger.logAuthEvent(event);

      const jsonExport = auditLogger.exportAuditLog('json');
      expect(jsonExport).toContain('"type":"login"');

      const csvExport = auditLogger.exportAuditLog('csv');
      expect(csvExport).toContain('timestamp,type,method');
    });

    it('should detect security anomalies', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate multiple failed login attempts
      for (let i = 0; i < 4; i++) {
        auditLogger.logAuthEvent({
          type: 'login',
          method: 'passkey',
          timestamp: new Date(),
          success: false,
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple failed login attempts detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('AuthPersistenceManager', () => {
    it('should initialize without errors', async () => {
      const persistenceManager = new AuthPersistenceManager(sessionManager);
      await expect(persistenceManager.initializePersistence()).resolves.not.toThrow();
    });

    it('should save and restore auth state', async () => {
      const persistenceManager = new AuthPersistenceManager(sessionManager);
      const mockAuthState = {
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        authMethod: null as const,
        deviceRegistered: false,
      };

      await persistenceManager.saveAuthState(mockAuthState);
      const restored = await persistenceManager.restoreAuthState();

      // Should return null for unauthenticated state
      expect(restored).toBeNull();
    });

    it('should maintain event history', () => {
      const persistenceManager = new AuthPersistenceManager(sessionManager);
      const event: AuthEvent = {
        type: 'login',
        method: 'passkey',
        timestamp: new Date(),
        success: true,
      };

      persistenceManager.logAuthEvent(event);
      const history = persistenceManager.getAuthEventHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(event);
    });
  });
});
