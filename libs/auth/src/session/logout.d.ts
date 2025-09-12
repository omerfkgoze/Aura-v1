import { SessionManager } from './manager';
import { AuthPersistenceManager } from './persistence';
export interface LogoutOptions {
  clearAllSessions?: boolean;
  clearLocalData?: boolean;
  revokeTokens?: boolean;
  clearCrypto?: boolean;
  reason?: 'user' | 'timeout' | 'security' | 'error';
}
export interface LogoutResult {
  success: boolean;
  error?: string;
  clearedSessions: number;
  timestamp: Date;
}
export declare class LogoutManager {
  private sessionManager;
  private persistenceManager?;
  constructor(sessionManager: SessionManager, persistenceManager?: AuthPersistenceManager);
  performLogout(options?: LogoutOptions): Promise<LogoutResult>;
  performSecurityLogout(reason: string): Promise<LogoutResult>;
  performTimeoutLogout(): Promise<LogoutResult>;
  performEmergencyLogout(): Promise<LogoutResult>;
  private revokeServerTokens;
  private clearAllUserSessions;
  private clearSensitiveMemoryData;
  private logLogoutEvent;
  private getPlatform;
  private getUserAgent;
}
export declare class SessionInvalidator {
  private sessionManager;
  private inactivityTimer?;
  private securityCheckTimer?;
  constructor(sessionManager: SessionManager);
  startInactivityMonitoring(timeoutMinutes?: number): void;
  stopInactivityMonitoring(): void;
  startSecurityMonitoring(checkIntervalMinutes?: number): void;
  stopSecurityMonitoring(): void;
  invalidateSession(reason: string): Promise<void>;
  private performSecurityCheck;
  private detectSuspiciousActivity;
  dispose(): void;
}
