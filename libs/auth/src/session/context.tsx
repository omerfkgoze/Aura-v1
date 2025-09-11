import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { AuthState, AuthActions, AuthSession, User, AuthEvent, SessionConfig } from './types';
import { SessionManager, AuthStateManager } from './manager';
import { AuthPersistenceManager } from './persistence';
import { SecureStorage, WebStorage, MockSecureStorage } from './storage';

interface AuthContextValue extends AuthState, AuthActions {
  sessionManager: SessionManager;
  eventHistory: AuthEvent[];
  isInitialized: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  storage?: SecureStorage;
  config?: Partial<SessionConfig>;
  enablePersistence?: boolean;
}

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth system
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
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
    async (username: string, password: string): Promise<AuthSession> => {
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

  const clearAuthData = useCallback((): void => {
    sessionManager.clearSession().catch(console.error);
    persistenceManager?.clearPersistedData().catch(console.error);
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
      persistenceManager?.dispose();
    };
  }, [persistenceManager]);

  const contextValue: AuthContextValue = {
    // State
    ...authState,
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
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Hook for using auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Hook for auth state only (no actions)
export function useAuthState(): Pick<
  AuthContextValue,
  keyof AuthState | 'isInitialized' | 'error'
> {
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
export function useAuthActions(): Pick<AuthContextValue, keyof AuthActions> {
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
export function withAuthProtection<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: React.ComponentType
): React.ComponentType<T> {
  const AuthProtectedComponent = (props: T) => {
    const { isAuthenticated, isInitialized, isLoading } = useAuthState();

    if (!isInitialized || isLoading) {
      return fallback ? <fallback /> : <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return fallback ? <fallback /> : <div>Please authenticate</div>;
    }

    return <WrappedComponent {...props} />;
  };

  AuthProtectedComponent.displayName = `withAuthProtection(${WrappedComponent.displayName || WrappedComponent.name})`;

  return AuthProtectedComponent;
}
