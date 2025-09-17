import React from 'react';
import { SessionManager } from './manager';
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
export declare function AuthProvider({
  children,
  storage,
  config,
  enablePersistence,
}: AuthProviderProps): import('react/jsx-runtime').JSX.Element;
export declare function useAuth(): AuthContextValue;
export declare function useAuthState(): {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMethod: 'passkey' | 'opaque' | null;
  deviceRegistered: boolean;
  lastSyncAt: Date | undefined;
  isInitialized: boolean;
  error: string | null;
};
export declare function useAuthActions(): {
  authenticateWithPasskey: () => Promise<AuthSession>;
  authenticateWithOpaque: (username: string, password: string) => Promise<AuthSession>;
  registerDevice: () => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
  logout: () => Promise<void>;
  validateRecovery: (phrase: string) => Promise<boolean>;
  clearAuthData: () => void;
  syncAuthState: () => Promise<void>;
};
export declare function withAuthProtection<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: React.ComponentType
): React.ComponentType<T>;
export {};
