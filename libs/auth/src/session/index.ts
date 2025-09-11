// Types
export type {
  User,
  AuthSession,
  AuthState,
  StoredSession,
  AuthEvent,
  SessionConfig,
  AuthActions,
  AuthStatus,
} from './types';

// Storage
export { SessionStorage, WebStorage, MockSecureStorage } from './storage';
export type { SecureStorage } from './storage';

// Token Management
export { TokenManager, defaultSessionConfig } from './tokens';
export type { TokenPayload, RefreshTokenPayload } from './tokens';

// Session Management
export { SessionManager, AuthStateManager } from './manager';

// Persistence
export { AuthPersistenceManager, ReactNativeAuthPersistence } from './persistence';
export type { PersistenceConfig, PersistedAuthData } from './persistence';

// React Context
export { AuthProvider, useAuth, useAuthState, useAuthActions, withAuthProtection } from './context';

// Logout & Session Invalidation
export { LogoutManager, SessionInvalidator } from './logout';
export type { LogoutOptions, LogoutResult } from './logout';

// Audit & Logging
export { AuthAuditLogger, globalAuditLogger, useAuthAudit } from './audit';
export type { AuditConfig, SecurityAuditEvent, AuditSummary } from './audit';
