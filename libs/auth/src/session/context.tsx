import { __awaiter } from 'tslib';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SessionManager, AuthStateManager } from './manager';
import { AuthPersistenceManager } from './persistence';
import { WebStorage, MockSecureStorage } from './storage';
import { AuthState, AuthEvent, AuthSession, User } from './types';

interface AuthProviderProps {
  children: React.ReactNode;
  storage?: any;
  config?: any;
  enablePersistence?: boolean;
}

interface AuthContextValue extends AuthState {
  eventHistory: AuthEvent[];
  isInitialized: boolean;
  error: string | null;
  authenticateWithPasskey: () => Promise<AuthSession>;
  authenticateWithOpaque: (username: string, password: string) => Promise<AuthSession>;
  registerDevice: () => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
  logout: () => Promise<void>;
  validateRecovery: (phrase: string) => Promise<boolean>;
  clearAuthData: () => void;
  syncAuthState: () => Promise<void>;
  sessionManager: SessionManager;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({
  children,
  storage,
  config,
  enablePersistence = true,
}: AuthProviderProps) {
  // Initialize storage based on platform
  const defaultStorage =
    storage ||
    (typeof window !== 'undefined' ? new WebStorage(localStorage) : new MockSecureStorage());
  const [sessionManager] = useState(() => new SessionManager(defaultStorage, config));
  const [authStateManager] = useState(() => new AuthStateManager(sessionManager));
  const [persistenceManager] = useState(() =>
    enablePersistence ? new AuthPersistenceManager(sessionManager) : null
  );
  const [authState, setAuthState] = useState<AuthState>(() => authStateManager.getState());
  const [eventHistory, setEventHistory] = useState<AuthEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Initialize auth system
  useEffect(() => {
    let mounted = true;
    const initialize = async (): Promise<void> => {
      try {
        if (persistenceManager) {
          await persistenceManager.initializePersistence();
        }
        await authStateManager.initialize();
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize auth');
          setIsInitialized(true);
        }
      }
    };
    initialize();
    return () => {
      mounted = false;
    };
  }, [authStateManager, persistenceManager]);
  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authStateManager.onStateChange(newState => {
      setAuthState(newState);
      // Save state to persistence
      if (persistenceManager) {
        persistenceManager.saveAuthState(newState).catch(console.error);
      }
    });
    return unsubscribe;
  }, [authStateManager, persistenceManager]);
  // Subscribe to auth events
  useEffect(() => {
    const unsubscribe = sessionManager.onAuthEvent(event => {
      setEventHistory(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
    });
    return unsubscribe;
  }, [sessionManager]);
  // Auth action implementations
  const authenticateWithPasskey = useCallback(async (): Promise<AuthSession> => {
    try {
      setError(null);
      // This would integrate with WebAuthn manager
      // For now, creating a mock implementation
      const mockUser: User = {
        id: 'user-' + Date.now(),
        email: 'user@example.com',
        username: 'user',
        createdAt: new Date(),
        emailVerified: true,
      };
      const session = await sessionManager.createSession(mockUser, 'passkey');
      await authStateManager.syncState();
      return session;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Passkey authentication failed';
      setError(error);
      throw new Error(error);
    }
  }, [sessionManager, authStateManager]);
  const authenticateWithOpaque = useCallback(
    async (username: string, _password: string): Promise<AuthSession> => {
      try {
        setError(null);
        // This would integrate with OPAQUE manager
        // For now, creating a mock implementation
        const mockUser: User = {
          id: 'user-' + Date.now(),
          email: username,
          username,
          createdAt: new Date(),
          emailVerified: true,
        };
        const session = await sessionManager.createSession(mockUser, 'opaque');
        await authStateManager.syncState();
        return session;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'OPAQUE authentication failed';
        setError(error);
        throw new Error(error);
      }
    },
    [sessionManager, authStateManager]
  );
  const registerDevice = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      // Mock device registration
      // In real implementation, this would register WebAuthn credentials
      await new Promise(resolve => setTimeout(resolve, 1000));
      await authStateManager.syncState();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Device registration failed';
      setError(error);
      throw new Error(error);
    }
  }, [authStateManager]);
  const refreshSession = useCallback(async (): Promise<AuthSession> => {
    try {
      setError(null);
      const session = await sessionManager.refreshSession();
      await authStateManager.syncState();
      return session;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Session refresh failed';
      setError(error);
      throw new Error(error);
    }
  }, [sessionManager, authStateManager]);
  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await sessionManager.logout();
      await authStateManager.syncState();
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Logout failed';
      setError(error);
      throw new Error(error);
    }
  }, [sessionManager, authStateManager]);
  const validateRecovery = useCallback(async (phrase: string): Promise<boolean> => {
    try {
      setError(null);
      // Mock recovery validation
      // In real implementation, this would validate recovery phrase
      if (phrase.split(' ').length >= 12) {
        return true;
      }
      return false;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Recovery validation failed';
      setError(error);
      return false;
    }
  }, []);
  const clearAuthData = useCallback(() => {
    sessionManager.clearSession().catch(console.error);
    persistenceManager === null || persistenceManager === void 0
      ? void 0
      : persistenceManager.clearPersistedData().catch(console.error);
    setAuthState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      authMethod: null,
      deviceRegistered: false,
    });
    setEventHistory([]);
    setError(null);
  }, [sessionManager, persistenceManager]);
  const syncAuthState = useCallback(async (): Promise<void> => {
    try {
      await authStateManager.syncState();
    } catch (err) {
      console.error('Failed to sync auth state:', err);
    }
  }, [authStateManager]);
  // Activity tracking
  useEffect(() => {
    const handleActivity = () => {
      sessionManager.updateLastActivity();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      return () => {
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
      };
    }
    return () => {}; // Return empty cleanup function for server-side
  }, [sessionManager]);
  // Auto-refresh token before expiry
  useEffect(() => {
    if (authState.session && sessionManager.shouldRefreshToken(authState.session)) {
      refreshSession().catch(console.error);
    }
  }, [authState.session, sessionManager, refreshSession]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      persistenceManager === null || persistenceManager === void 0
        ? void 0
        : persistenceManager.dispose();
    };
  }, [persistenceManager]);
  const contextValue = Object.assign(Object.assign({}, authState), {
    eventHistory,
    isInitialized,
    error,
    // Actions
    authenticateWithPasskey,
    authenticateWithOpaque,
    registerDevice,
    refreshSession,
    logout,
    validateRecovery,
    clearAuthData,
    syncAuthState,
    // Managers
    sessionManager,
  });
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
// Hook for using auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
// Hook for auth state only (no actions)
export function useAuthState() {
  const context = useAuth();
  return {
    user: context.user,
    session: context.session,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    authMethod: context.authMethod,
    deviceRegistered: context.deviceRegistered,
    lastSyncAt: context.lastSyncAt,
    isInitialized: context.isInitialized,
    error: context.error,
  };
}
// Hook for auth actions only
export function useAuthActions() {
  const context = useAuth();
  return {
    authenticateWithPasskey: context.authenticateWithPasskey,
    authenticateWithOpaque: context.authenticateWithOpaque,
    registerDevice: context.registerDevice,
    refreshSession: context.refreshSession,
    logout: context.logout,
    validateRecovery: context.validateRecovery,
    clearAuthData: context.clearAuthData,
    syncAuthState: context.syncAuthState,
  };
}
// Higher-order component for auth protection
export function withAuthProtection<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: React.ComponentType
): React.ComponentType<T> {
  const AuthProtectedComponent = (props: T) => {
    const { isAuthenticated, isInitialized, isLoading } = useAuthState();
    if (!isInitialized || isLoading) {
      return fallback ? React.createElement(fallback) : <div>Loading...</div>;
    }
    if (!isAuthenticated) {
      return fallback ? React.createElement(fallback) : <div>Please authenticate</div>;
    }
    return <WrappedComponent {...props} />;
  };
  AuthProtectedComponent.displayName = `withAuthProtection(${WrappedComponent.displayName || WrappedComponent.name})`;
  return AuthProtectedComponent;
}
//# sourceMappingURL=context.js.map
