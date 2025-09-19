/**
 * OPAQUE to Passkeys Migration Utility
 *
 * This module provides utilities for migrating users from OPAQUE authentication
 * to Passkeys when hardware support becomes available.
 */
/**
 * Default migration configuration
 */
const DEFAULT_MIGRATION_CONFIG = {
  autoMigrate: false,
  requireUserConsent: true,
  migrationWindowDays: 30,
  fallbackRetentionDays: 90,
};
/**
 * OPAQUE to Passkeys Migration Manager
 */
export class AuthMigrationManager {
  opaqueManager;
  webauthnManager;
  config;
  migrationStatus = new Map();
  constructor(opaqueManager, webauthnManager, config) {
    this.opaqueManager = opaqueManager;
    this.webauthnManager = webauthnManager;
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
  }
  /**
   * Check if user is eligible for migration to Passkeys
   */
  async checkMigrationEligibility(userId) {
    try {
      const userContext = this.opaqueManager.getUserContext(userId);
      if (!userContext) {
        return {
          eligible: false,
          reason: 'User not found',
          requirements: ['User must be registered'],
        };
      }
      if (!userContext.hasOpaqueRegistration) {
        return {
          eligible: false,
          reason: 'User does not have OPAQUE registration',
          requirements: ['User must have OPAQUE authentication enabled'],
        };
      }
      if (userContext.hasPasskey) {
        return {
          eligible: false,
          reason: 'User already has Passkey',
          requirements: [],
        };
      }
      // Check hardware capability
      const hasWebAuthnSupport = await this.checkWebAuthnSupport();
      if (!hasWebAuthnSupport) {
        return {
          eligible: false,
          reason: 'Device does not support WebAuthn/Passkeys',
          requirements: ['Device must support WebAuthn', 'Modern browser required'],
        };
      }
      return {
        eligible: true,
        reason: 'User is eligible for Passkey migration',
        requirements: [],
      };
    } catch (error) {
      return {
        eligible: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        requirements: ['System must be functional'],
      };
    }
  }
  /**
   * Offer migration to user
   */
  async offerMigration(userId) {
    try {
      const eligibility = await this.checkMigrationEligibility(userId);
      if (!eligibility.eligible) {
        return {
          offered: false,
          error: eligibility.reason,
        };
      }
      const userContext = this.opaqueManager.getUserContext(userId);
      if (!userContext) {
        return {
          offered: false,
          error: 'User context not found',
        };
      }
      const status = {
        userId,
        username: userContext.username,
        currentAuthMethod: 'opaque',
        canMigrate: true,
        migrationOfferedAt: new Date(),
      };
      this.migrationStatus.set(userId, status);
      return {
        offered: true,
        status,
      };
    } catch (error) {
      return {
        offered: false,
        error: error instanceof Error ? error.message : 'Failed to offer migration',
      };
    }
  }
  /**
   * Execute migration from OPAQUE to Passkeys
   */
  async executeMigration(userId, userConsent = false) {
    try {
      if (this.config.requireUserConsent && !userConsent) {
        return {
          success: false,
          userId,
          oldAuthMethod: 'opaque',
          newAuthMethod: 'both',
          fallbackRetained: true,
          error: 'User consent required for migration',
        };
      }
      const userContext = this.opaqueManager.getUserContext(userId);
      if (!userContext) {
        return {
          success: false,
          userId,
          oldAuthMethod: 'opaque',
          newAuthMethod: 'both',
          fallbackRetained: true,
          error: 'User context not found',
        };
      }
      // Step 1: Register Passkey for user
      const passkeyRegistration = await this.webauthnManager.startRegistration({
        userId,
        username: userContext.username,
        displayName: userContext.username,
        platform: 'web',
      });
      if (!passkeyRegistration.options) {
        return {
          success: false,
          userId,
          oldAuthMethod: 'opaque',
          newAuthMethod: 'both',
          fallbackRetained: true,
          error: 'Passkey registration failed: Unable to generate registration options',
        };
      }
      // Step 2: Update user context to indicate Passkey is available
      const updated = this.opaqueManager.updateUserContext(userId, {
        hasPasskey: true,
        preferredAuthMethod: 'passkey',
        lastAuthMethod: 'passkey',
      });
      if (!updated) {
        return {
          success: false,
          userId,
          oldAuthMethod: 'opaque',
          newAuthMethod: 'both',
          fallbackRetained: true,
          error: 'Failed to update user context',
        };
      }
      // Step 3: Determine fallback retention
      const retainFallback = this.config.fallbackRetentionDays > 0;
      const fallbackRetainedUntil = retainFallback
        ? new Date(Date.now() + this.config.fallbackRetentionDays * 24 * 60 * 60 * 1000)
        : undefined;
      // Step 4: Update migration status
      const migrationStatus = {
        userId,
        username: userContext.username,
        currentAuthMethod: retainFallback ? 'both' : 'passkey',
        canMigrate: false,
        migrationCompletedAt: new Date(),
        fallbackRetainedUntil,
      };
      this.migrationStatus.set(userId, migrationStatus);
      return {
        success: true,
        userId,
        oldAuthMethod: 'opaque',
        newAuthMethod: retainFallback ? 'both' : 'passkey',
        fallbackRetained: retainFallback,
      };
    } catch (error) {
      return {
        success: false,
        userId,
        oldAuthMethod: 'opaque',
        newAuthMethod: 'both',
        fallbackRetained: true,
        error: error instanceof Error ? error.message : 'Migration failed',
      };
    }
  }
  /**
   * Remove OPAQUE fallback after migration period
   */
  async removeFallback(userId) {
    try {
      const status = this.migrationStatus.get(userId);
      if (!status) {
        return {
          success: false,
          error: 'Migration status not found',
        };
      }
      if (status.currentAuthMethod !== 'both') {
        return {
          success: false,
          error: 'User does not have OPAQUE fallback to remove',
        };
      }
      // Check if retention period has expired
      if (status.fallbackRetainedUntil && status.fallbackRetainedUntil > new Date()) {
        return {
          success: false,
          error: `Fallback retention period active until ${status.fallbackRetainedUntil.toISOString()}`,
        };
      }
      // Update user context to remove OPAQUE
      const updated = this.opaqueManager.updateUserContext(userId, {
        hasOpaqueRegistration: false,
        preferredAuthMethod: 'passkey',
      });
      if (!updated) {
        return {
          success: false,
          error: 'Failed to update user context',
        };
      }
      // Update migration status
      status.currentAuthMethod = 'passkey';
      delete status.fallbackRetainedUntil;
      this.migrationStatus.set(userId, status);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove fallback',
      };
    }
  }
  /**
   * Get migration status for user
   */
  getMigrationStatus(userId) {
    return this.migrationStatus.get(userId);
  }
  /**
   * Get all users eligible for migration
   */
  async getEligibleUsers() {
    const eligibleUsers = [];
    // This would typically query from a database in production
    // For now, we'll iterate through known user contexts
    // Implementation would depend on how user contexts are stored
    // This is a simplified version
    return eligibleUsers;
  }
  /**
   * Cleanup expired migration statuses
   */
  cleanup() {
    const now = new Date();
    const expiredThreshold = new Date(
      now.getTime() - this.config.migrationWindowDays * 24 * 60 * 60 * 1000
    );
    for (const [userId, status] of this.migrationStatus.entries()) {
      // Remove expired migration offers
      if (
        status.migrationOfferedAt &&
        status.migrationOfferedAt < expiredThreshold &&
        !status.migrationCompletedAt
      ) {
        this.migrationStatus.delete(userId);
      }
      // Remove completed migrations after retention period
      if (status.fallbackRetainedUntil && status.fallbackRetainedUntil < now) {
        // Auto-remove fallback if configured
        if (this.config.autoMigrate) {
          this.removeFallback(userId).catch(console.error);
        }
      }
    }
  }
  /**
   * Check if WebAuthn is supported in current environment
   */
  async checkWebAuthnSupport() {
    if (typeof window === 'undefined') {
      return false; // Server-side environment
    }
    try {
      return !!(
        window.navigator &&
        window.navigator.credentials &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === 'function'
      );
    } catch {
      return false;
    }
  }
}
/**
 * Create migration manager with OPAQUE and WebAuthn managers
 */
export function createAuthMigrationManager(opaqueManager, webauthnManager, config) {
  return new AuthMigrationManager(opaqueManager, webauthnManager, config);
}
/**
 * Utility function to check if migration is recommended
 */
export function shouldRecommendMigration(userContext) {
  if (userContext.hasPasskey) {
    return {
      recommend: false,
      reason: 'User already has Passkey',
      urgency: 'low',
    };
  }
  if (!userContext.hasOpaqueRegistration) {
    return {
      recommend: false,
      reason: 'User does not have OPAQUE registration',
      urgency: 'low',
    };
  }
  // Check how recently user authenticated
  const daysSinceAuth = userContext.lastAuthTime
    ? Math.floor((Date.now() - userContext.lastAuthTime.getTime()) / (24 * 60 * 60 * 1000))
    : Infinity;
  if (daysSinceAuth <= 7) {
    return {
      recommend: true,
      reason: 'Active user would benefit from Passkey convenience and security',
      urgency: 'medium',
    };
  }
  if (daysSinceAuth <= 30) {
    return {
      recommend: true,
      reason: 'Recent user should consider Passkey upgrade',
      urgency: 'low',
    };
  }
  return {
    recommend: false,
    reason: 'Inactive user - migration not priority',
    urgency: 'low',
  };
}
//# sourceMappingURL=migration.js.map
