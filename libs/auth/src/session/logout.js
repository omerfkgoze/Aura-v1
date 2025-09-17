import { __awaiter } from 'tslib';
export class LogoutManager {
  constructor(sessionManager, persistenceManager) {
    this.sessionManager = sessionManager;
    this.persistenceManager = persistenceManager;
  }
  performLogout(options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
      const startTime = new Date();
      let clearedSessions = 0;
      try {
        // Default options
        const config = Object.assign(
          {
            clearAllSessions: false,
            clearLocalData: true,
            revokeTokens: true,
            clearCrypto: false,
            reason: 'user',
          },
          options
        );
        // Step 1: Revoke tokens on server (if requested)
        if (config.revokeTokens) {
          yield this.revokeServerTokens();
        }
        // Step 2: Clear local session
        yield this.sessionManager.clearSession();
        clearedSessions++;
        // Step 3: Clear all sessions across devices (if requested)
        if (config.clearAllSessions) {
          const additionalSessions = yield this.clearAllUserSessions();
          clearedSessions += additionalSessions;
        }
        // Step 4: Clear local persistent data (if requested)
        if (config.clearLocalData && this.persistenceManager) {
          yield this.persistenceManager.clearPersistedData();
        }
        // Step 5: Clear sensitive data from memory
        yield this.clearSensitiveMemoryData();
        // Step 6: Log logout event
        this.logLogoutEvent({
          type: 'logout',
          method: 'passkey', // This should come from current session
          timestamp: startTime,
          success: true,
          deviceInfo: Object.assign(
            { platform: this.getPlatform() },
            this.getUserAgent() ? { userAgent: this.getUserAgent() } : {}
          ),
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
          deviceInfo: Object.assign(
            { platform: this.getPlatform() },
            this.getUserAgent() ? { userAgent: this.getUserAgent() } : {}
          ),
        });
        return {
          success: false,
          error: errorMessage,
          clearedSessions,
          timestamp: startTime,
        };
      }
    });
  }
  performSecurityLogout(_reason) {
    return __awaiter(this, void 0, void 0, function* () {
      // Security logout clears everything
      return yield this.performLogout({
        clearAllSessions: true,
        clearLocalData: true,
        revokeTokens: true,
        clearCrypto: false, // This should be handled by crypto core
        reason: 'security',
      });
    });
  }
  performTimeoutLogout() {
    return __awaiter(this, void 0, void 0, function* () {
      // Timeout logout is less aggressive
      return yield this.performLogout({
        clearAllSessions: false,
        clearLocalData: false,
        revokeTokens: true,
        clearCrypto: false,
        reason: 'timeout',
      });
    });
  }
  performEmergencyLogout() {
    return __awaiter(this, void 0, void 0, function* () {
      // Emergency logout clears everything immediately
      try {
        // Clear local session immediately without waiting for server
        yield this.sessionManager.clearSession();
        if (this.persistenceManager) {
          yield this.persistenceManager.clearPersistedData();
        }
        yield this.clearSensitiveMemoryData();
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
    });
  }
  revokeServerTokens() {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock implementation - in real app, this would call server API
      try {
        // Get current session tokens
        const storedSession = yield this.sessionManager['sessionStorage'].getStoredSession();
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
    });
  }
  clearAllUserSessions() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
  }
  clearSensitiveMemoryData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Clear any cached sensitive data
        // This would integrate with crypto core to clear keys
        // Clear browser cache if available
        if (typeof caches !== 'undefined') {
          const cacheNames = yield caches.keys();
          yield Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }
        // Clear session storage
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
        // Force garbage collection if available (not standard)
        if (typeof window !== 'undefined' && 'gc' in window) {
          window.gc();
        }
      } catch (error) {
        console.error('Failed to clear sensitive memory data:', error);
        // Don't throw - this is best effort cleanup
      }
    });
  }
  logLogoutEvent(event) {
    try {
      if (this.persistenceManager) {
        this.persistenceManager.logAuthEvent(event);
      }
    } catch (error) {
      console.error('Failed to log logout event:', error);
    }
  }
  getPlatform() {
    if (typeof navigator !== 'undefined') {
      return navigator.platform || 'web';
    } else if (typeof process !== 'undefined') {
      return process.platform || 'node';
    }
    return 'unknown';
  }
  getUserAgent() {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return undefined;
  }
}
export class SessionInvalidator {
  constructor(sessionManager) {
    this.inactivityTimer = undefined;
    this.securityCheckTimer = undefined;
    this.sessionManager = sessionManager;
  }
  startInactivityMonitoring(_timeoutMinutes = 30) {
    this.stopInactivityMonitoring();
    this.inactivityTimer = setInterval(() => {
      if (!this.sessionManager.isSessionActive()) {
        this.invalidateSession('inactivity_timeout');
      }
    }, 60000); // Check every minute
  }
  stopInactivityMonitoring() {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }
  startSecurityMonitoring(checkIntervalMinutes = 5) {
    this.stopSecurityMonitoring();
    this.securityCheckTimer = setInterval(() => {
      this.performSecurityCheck();
    }, checkIntervalMinutes * 60000);
  }
  stopSecurityMonitoring() {
    if (this.securityCheckTimer) {
      clearInterval(this.securityCheckTimer);
      this.securityCheckTimer = undefined;
    }
  }
  invalidateSession(reason) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        console.log(`Invalidating session due to: ${reason}`);
        const logoutManager = new LogoutManager(this.sessionManager);
        if (reason === 'security_threat') {
          yield logoutManager.performSecurityLogout(reason);
        } else {
          yield logoutManager.performTimeoutLogout();
        }
      } catch (error) {
        console.error('Failed to invalidate session:', error);
      }
    });
  }
  performSecurityCheck() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check for suspicious activity
        const suspiciousActivity = yield this.detectSuspiciousActivity();
        if (suspiciousActivity) {
          yield this.invalidateSession('security_threat');
        }
      } catch (error) {
        console.error('Security check failed:', error);
      }
    });
  }
  detectSuspiciousActivity() {
    return __awaiter(this, void 0, void 0, function* () {
      // Mock security checks - in real implementation:
      // - Check for multiple failed auth attempts
      // - Monitor for unusual access patterns
      // - Validate token integrity
      // - Check for concurrent sessions from different locations
      return false; // Mock: no suspicious activity detected
    });
  }
  dispose() {
    this.stopInactivityMonitoring();
    this.stopSecurityMonitoring();
  }
}
//# sourceMappingURL=logout.js.map
