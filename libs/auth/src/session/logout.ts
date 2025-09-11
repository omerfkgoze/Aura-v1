import { AuthEvent } from './types';
import { SessionManager } from './manager';
import { AuthPersistenceManager } from './persistence';

export interface LogoutOptions {
  clearAllSessions?: boolean; // Clear all sessions across devices
  clearLocalData?: boolean; // Clear local storage/cache
  revokeTokens?: boolean; // Revoke tokens on server
  clearCrypto?: boolean; // Clear crypto keys (should be handled by crypto core)
  reason?: 'user' | 'timeout' | 'security' | 'error';
}

export interface LogoutResult {
  success: boolean;
  error?: string;
  clearedSessions: number;
  timestamp: Date;
}

export class LogoutManager {
  private sessionManager: SessionManager;
  private persistenceManager?: AuthPersistenceManager;

  constructor(sessionManager: SessionManager, persistenceManager?: AuthPersistenceManager) {
    this.sessionManager = sessionManager;
    this.persistenceManager = persistenceManager;
  }

  async performLogout(options: LogoutOptions = {}): Promise<LogoutResult> {
    const startTime = new Date();
    let clearedSessions = 0;

    try {
      // Default options
      const config = {
        clearAllSessions: false,
        clearLocalData: true,
        revokeTokens: true,
        clearCrypto: false,
        reason: 'user',
        ...options,
      } as Required<LogoutOptions>;

      // Step 1: Revoke tokens on server (if requested)
      if (config.revokeTokens) {
        await this.revokeServerTokens();
      }

      // Step 2: Clear local session
      await this.sessionManager.clearSession();
      clearedSessions++;

      // Step 3: Clear all sessions across devices (if requested)
      if (config.clearAllSessions) {
        const additionalSessions = await this.clearAllUserSessions();
        clearedSessions += additionalSessions;
      }

      // Step 4: Clear local persistent data (if requested)
      if (config.clearLocalData && this.persistenceManager) {
        await this.persistenceManager.clearPersistedData();
      }

      // Step 5: Clear sensitive data from memory
      await this.clearSensitiveMemoryData();

      // Step 6: Log logout event
      this.logLogoutEvent({
        type: 'logout',
        method: 'passkey', // This should come from current session
        timestamp: startTime,
        success: true,
        deviceInfo: {
          platform: this.getPlatform(),
          userAgent: this.getUserAgent(),
        },
      });

      return {
        success: true,
        clearedSessions,
        timestamp: startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown logout error';

      // Log failed logout event
      this.logLogoutEvent({
        type: 'logout',
        method: 'passkey',
        timestamp: startTime,
        success: false,
        error: errorMessage,
        deviceInfo: {
          platform: this.getPlatform(),
          userAgent: this.getUserAgent(),
        },
      });

      return {
        success: false,
        error: errorMessage,
        clearedSessions,
        timestamp: startTime,
      };
    }
  }

  async performSecurityLogout(reason: string): Promise<LogoutResult> {
    // Security logout clears everything
    return await this.performLogout({
      clearAllSessions: true,
      clearLocalData: true,
      revokeTokens: true,
      clearCrypto: false, // This should be handled by crypto core
      reason: 'security',
    });
  }

  async performTimeoutLogout(): Promise<LogoutResult> {
    // Timeout logout is less aggressive
    return await this.performLogout({
      clearAllSessions: false,
      clearLocalData: false,
      revokeTokens: true,
      clearCrypto: false,
      reason: 'timeout',
    });
  }

  async performEmergencyLogout(): Promise<LogoutResult> {
    // Emergency logout clears everything immediately
    try {
      // Clear local session immediately without waiting for server
      await this.sessionManager.clearSession();

      if (this.persistenceManager) {
        await this.persistenceManager.clearPersistedData();
      }

      await this.clearSensitiveMemoryData();

      // Try to revoke server tokens in background (don't wait)
      this.revokeServerTokens().catch(console.error);

      return {
        success: true,
        clearedSessions: 1,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency logout failed',
        clearedSessions: 0,
        timestamp: new Date(),
      };
    }
  }

  private async revokeServerTokens(): Promise<void> {
    // Mock implementation - in real app, this would call server API
    try {
      // Get current session tokens
      const storedSession = await this.sessionManager['sessionStorage'].getStoredSession();

      if (storedSession) {
        // Make API call to revoke tokens
        // await fetch('/api/auth/revoke', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${storedSession.accessToken}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     refreshToken: storedSession.refreshToken,
        //   }),
        // });

        console.log('Tokens revoked on server (mock)');
      }
    } catch (error) {
      console.error('Failed to revoke server tokens:', error);
      // Don't throw - we still want to clear local data
    }
  }

  private async clearAllUserSessions(): Promise<number> {
    // Mock implementation - in real app, this would call server API
    try {
      // Make API call to clear all user sessions
      // const response = await fetch('/api/auth/clear-all-sessions', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`,
      //   },
      // });
      //
      // const result = await response.json();
      // return result.clearedSessions;

      console.log('All user sessions cleared on server (mock)');
      return 0; // Mock: no additional sessions cleared
    } catch (error) {
      console.error('Failed to clear all user sessions:', error);
      return 0;
    }
  }

  private async clearSensitiveMemoryData(): Promise<void> {
    try {
      // Clear any cached sensitive data
      // This would integrate with crypto core to clear keys

      // Clear browser cache if available
      if (typeof caches !== 'undefined') {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      // Clear session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Force garbage collection if available (not standard)
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
    } catch (error) {
      console.error('Failed to clear sensitive memory data:', error);
      // Don't throw - this is best effort cleanup
    }
  }

  private logLogoutEvent(event: AuthEvent): void {
    try {
      if (this.persistenceManager) {
        this.persistenceManager.logAuthEvent(event);
      }
    } catch (error) {
      console.error('Failed to log logout event:', error);
    }
  }

  private getPlatform(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.platform || 'web';
    } else if (typeof process !== 'undefined') {
      return process.platform || 'node';
    }
    return 'unknown';
  }

  private getUserAgent(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return undefined;
  }
}

export class SessionInvalidator {
  private sessionManager: SessionManager;
  private inactivityTimer?: NodeJS.Timeout;
  private securityCheckTimer?: NodeJS.Timeout;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  startInactivityMonitoring(timeoutMinutes: number = 30): void {
    this.stopInactivityMonitoring();

    this.inactivityTimer = setInterval(() => {
      if (!this.sessionManager.isSessionActive()) {
        this.invalidateSession('inactivity_timeout');
      }
    }, 60000); // Check every minute
  }

  stopInactivityMonitoring(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  startSecurityMonitoring(checkIntervalMinutes: number = 5): void {
    this.stopSecurityMonitoring();

    this.securityCheckTimer = setInterval(() => {
      this.performSecurityCheck();
    }, checkIntervalMinutes * 60000);
  }

  stopSecurityMonitoring(): void {
    if (this.securityCheckTimer) {
      clearInterval(this.securityCheckTimer);
      this.securityCheckTimer = undefined;
    }
  }

  async invalidateSession(reason: string): Promise<void> {
    try {
      console.log(`Invalidating session due to: ${reason}`);

      const logoutManager = new LogoutManager(this.sessionManager);

      if (reason === 'security_threat') {
        await logoutManager.performSecurityLogout(reason);
      } else {
        await logoutManager.performTimeoutLogout();
      }
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }

  private async performSecurityCheck(): Promise<void> {
    try {
      // Check for suspicious activity
      const suspiciousActivity = await this.detectSuspiciousActivity();

      if (suspiciousActivity) {
        await this.invalidateSession('security_threat');
      }
    } catch (error) {
      console.error('Security check failed:', error);
    }
  }

  private async detectSuspiciousActivity(): Promise<boolean> {
    // Mock security checks - in real implementation:
    // - Check for multiple failed auth attempts
    // - Monitor for unusual access patterns
    // - Validate token integrity
    // - Check for concurrent sessions from different locations

    return false; // Mock: no suspicious activity detected
  }

  dispose(): void {
    this.stopInactivityMonitoring();
    this.stopSecurityMonitoring();
  }
}
