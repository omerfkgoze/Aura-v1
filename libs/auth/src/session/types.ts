export interface User {
  id: string;
  email?: string;
  username?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  expiresIn: number;
  tokenType: 'Bearer';
  user: User;
}

export interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMethod: 'passkey' | 'opaque' | null;
  deviceRegistered: boolean;
  lastSyncAt?: Date;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO string for storage
  user: User;
  authMethod: 'passkey' | 'opaque';
  deviceRegistered: boolean;
  createdAt: string;
}

export interface AuthEvent {
  type: 'login' | 'logout' | 'refresh' | 'registration' | 'recovery';
  method: 'passkey' | 'opaque' | 'recovery';
  timestamp: Date;
  deviceInfo?: {
    platform: string;
    userAgent?: string;
    ipAddress?: string;
  };
  success: boolean;
  error?: string;
}

export interface SessionConfig {
  accessTokenExpiry: number; // minutes
  refreshTokenExpiry: number; // days
  autoRefreshThreshold: number; // minutes before expiry
  maxConcurrentSessions: number;
  sessionTimeout: number; // minutes of inactivity
}

export interface AuthActions {
  authenticateWithPasskey: () => Promise<AuthSession>;
  authenticateWithOpaque: (username: string, password: string) => Promise<AuthSession>;
  registerDevice: () => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
  logout: () => Promise<void>;
  validateRecovery: (phrase: string) => Promise<boolean>;
  clearAuthData: () => void;
  syncAuthState: () => Promise<void>;
}

export type AuthStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'expired'
  | 'error';
