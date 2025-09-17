/**
 * OPAQUE to Passkeys Migration Utility
 *
 * This module provides utilities for migrating users from OPAQUE authentication
 * to Passkeys when hardware support becomes available.
 */
import type { OpaqueManager } from './manager';
import type { WebAuthnManager } from '../webauthn/manager';
/**
 * Migration configuration options
 */
export interface MigrationConfig {
  autoMigrate: boolean;
  requireUserConsent: boolean;
  migrationWindowDays: number;
  fallbackRetentionDays: number;
}
/**
 * Migration status for a user
 */
export interface UserMigrationStatus {
  userId: string;
  username: string;
  currentAuthMethod: 'opaque' | 'passkey' | 'both';
  canMigrate: boolean;
  migrationOfferedAt?: Date;
  migrationCompletedAt?: Date;
  fallbackRetainedUntil?: Date | undefined;
  migrationErrors?: string[];
}
/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  userId: string;
  oldAuthMethod: 'opaque';
  newAuthMethod: 'passkey' | 'both';
  fallbackRetained: boolean;
  error?: string;
}
/**
 * OPAQUE to Passkeys Migration Manager
 */
export declare class AuthMigrationManager {
  private opaqueManager;
  private webauthnManager;
  private config;
  private migrationStatus;
  constructor(
    opaqueManager: OpaqueManager,
    webauthnManager: WebAuthnManager,
    config?: Partial<MigrationConfig>
  );
  /**
   * Check if user is eligible for migration to Passkeys
   */
  checkMigrationEligibility(userId: string): Promise<{
    eligible: boolean;
    reason: string;
    requirements: string[];
  }>;
  /**
   * Offer migration to user
   */
  offerMigration(userId: string): Promise<{
    offered: boolean;
    status?: UserMigrationStatus;
    error?: string;
  }>;
  /**
   * Execute migration from OPAQUE to Passkeys
   */
  executeMigration(userId: string, userConsent?: boolean): Promise<MigrationResult>;
  /**
   * Remove OPAQUE fallback after migration period
   */
  removeFallback(userId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  /**
   * Get migration status for user
   */
  getMigrationStatus(userId: string): UserMigrationStatus | undefined;
  /**
   * Get all users eligible for migration
   */
  getEligibleUsers(): Promise<UserMigrationStatus[]>;
  /**
   * Cleanup expired migration statuses
   */
  cleanup(): void;
  /**
   * Check if WebAuthn is supported in current environment
   */
  private checkWebAuthnSupport;
}
/**
 * Create migration manager with OPAQUE and WebAuthn managers
 */
export declare function createAuthMigrationManager(
  opaqueManager: OpaqueManager,
  webauthnManager: WebAuthnManager,
  config?: Partial<MigrationConfig>
): AuthMigrationManager;
/**
 * Utility function to check if migration is recommended
 */
export declare function shouldRecommendMigration(userContext: {
  hasPasskey: boolean;
  hasOpaqueRegistration: boolean;
  lastAuthTime?: Date;
  preferredAuthMethod: string;
}): {
  recommend: boolean;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
};
