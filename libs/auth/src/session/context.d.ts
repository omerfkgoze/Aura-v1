import React, { ReactNode } from 'react';
import { AuthState, AuthActions, AuthEvent, SessionConfig } from './types';
import { SessionManager } from './manager';
import { SecureStorage } from './storage';
interface AuthContextValue extends AuthState, AuthActions {
  sessionManager: SessionManager;
  eventHistory: AuthEvent[];
  isInitialized: boolean;
  error: string | null;
}
interface AuthProviderProps {
  children: ReactNode;
  storage?: SecureStorage;
  config?: Partial<SessionConfig>;
  enablePersistence?: boolean;
}
export declare function AuthProvider({
  children,
  storage,
  config,
  enablePersistence,
}: AuthProviderProps): any;
export declare function useAuth(): AuthContextValue;
export declare function useAuthState(): Pick<
  AuthContextValue,
  keyof AuthState | 'isInitialized' | 'error'
>;
export declare function useAuthActions(): Pick<AuthContextValue, keyof AuthActions>;
export declare function withAuthProtection<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  fallback?: React.ComponentType
): React.ComponentType<T>;
export {};
