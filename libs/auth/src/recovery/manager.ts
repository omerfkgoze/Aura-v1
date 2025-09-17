/**
 * Recovery Manager
 *
 * Main interface for the account recovery system.
 * Integrates all recovery methods and provides a unified API.
 */

import {
  RecoveryPhrase,
  ShamirShare,
  ShamirSecretConfig,
  EmergencyAccessCode,
  RecoveryValidationRequest,
  RecoveryValidationResult,
  RecoveryManagerConfig,
  RecoveryStorage,
  RecoveryEvents,
} from './types';

import { generateRecoveryPhrase, validateRecoveryPhrase } from './phrases';
import { createShamirShares, reconstructSecret } from './shamir';
import { generateEmergencyCode, generateEmergencyCodeSet } from './emergency';
import { RecoveryValidator } from './validation';
import {
  getRecoveryPhraseGuidance,
  getShamirSharingGuidance,
  getEmergencyCodeGuidance,
  getRecoverySecurityChecklist,
  getPersonalizedRecoveryStrategy,
} from './guidance';

/**
 * Main Recovery Manager class
 */
export class RecoveryManager {
  private config: RecoveryManagerConfig;
  private validator: RecoveryValidator;

  constructor(config: RecoveryManagerConfig) {
    this.config = config;
    this.validator = new RecoveryValidator(config.storage, config.events, config.rateLimiting);
  }

  // ========== Recovery Phrase Operations ==========

  /**
   * Generate a new recovery phrase
   */
  async generatePhrase(wordCount?: RecoveryPhrase['wordCount']): Promise<RecoveryPhrase> {
    const phrase = await generateRecoveryPhrase(wordCount || this.config.defaultWordCount);

    this.config.events?.onPhraseGenerated?.(
      'user', // In practice, get actual user ID
      phrase.wordCount
    );

    return phrase;
  }

  /**
   * Store recovery phrase for a user
   */
  async storeRecoveryPhrase(userId: string, phrase: RecoveryPhrase): Promise<void> {
    await this.config.storage.storeRecoveryPhrase(userId, phrase);
  }

  /**
   * Validate recovery phrase format
   */
  async validatePhraseFormat(phrase: string[]): Promise<boolean> {
    return await validateRecoveryPhrase(phrase);
  }

  // ========== Shamir Secret Sharing Operations ==========

  /**
   * Create Shamir shares from a secret
   */
  createShamirShares(secret: string, config?: Partial<ShamirSecretConfig>): ShamirShare[] {
    const finalConfig: ShamirSecretConfig = {
      totalShares: this.config.defaultShamirConfig.totalShares,
      threshold: this.config.defaultShamirConfig.threshold,
      secret,
      ...config,
    };

    const shares = createShamirShares(finalConfig);

    this.config.events?.onShamirSharesCreated?.('user', finalConfig);

    return shares;
  }

  /**
   * Reconstruct secret from Shamir shares
   */
  reconstructFromShares(shares: ShamirShare[]): string {
    return reconstructSecret(shares);
  }

  /**
   * Store Shamir shares for a user
   */
  async storeShamirShares(userId: string, shares: ShamirShare[]): Promise<void> {
    await this.config.storage.storeShamirShares(userId, shares);
  }

  // ========== Emergency Code Operations ==========

  /**
   * Generate a single emergency code
   */
  async generateEmergencyCode(
    userId: string,
    type: EmergencyAccessCode['type'] = 'emergency'
  ): Promise<{ code: EmergencyAccessCode; plainTextCode: string }> {
    const result = await generateEmergencyCode(userId, {
      ...this.config.emergencyCodeConfig,
      type,
    });

    this.config.events?.onEmergencyCodeGenerated?.(
      userId,
      result.code.codeId,
      result.code.expiresAt
    );

    return result;
  }

  /**
   * Generate a complete set of emergency codes
   */
  async generateEmergencyCodeSet(userId: string): Promise<{
    emergency: { code: EmergencyAccessCode; plainTextCode: string };
    recovery: { code: EmergencyAccessCode; plainTextCode: string };
    backup: { code: EmergencyAccessCode; plainTextCode: string };
  }> {
    const codeSet = await generateEmergencyCodeSet(userId, {
      emergency: { ...this.config.emergencyCodeConfig, type: 'emergency' },
      recovery: { ...this.config.emergencyCodeConfig, type: 'recovery' },
      backup: { ...this.config.emergencyCodeConfig, type: 'backup' },
    });

    // Emit events for each code
    this.config.events?.onEmergencyCodeGenerated?.(
      userId,
      codeSet.emergency.code.codeId,
      codeSet.emergency.code.expiresAt
    );
    this.config.events?.onEmergencyCodeGenerated?.(
      userId,
      codeSet.recovery.code.codeId,
      codeSet.recovery.code.expiresAt
    );
    this.config.events?.onEmergencyCodeGenerated?.(
      userId,
      codeSet.backup.code.codeId,
      codeSet.backup.code.expiresAt
    );

    return codeSet;
  }

  /**
   * Store emergency code for a user
   */
  async storeEmergencyCode(code: EmergencyAccessCode): Promise<void> {
    await this.config.storage.storeEmergencyCode(code);
  }

  // ========== Recovery Validation Operations ==========

  /**
   * Validate recovery request
   */
  async validateRecovery(request: RecoveryValidationRequest): Promise<RecoveryValidationResult> {
    return await this.validator.validateRecovery(request);
  }

  /**
   * Test recovery without performing actual recovery
   */
  async testRecovery(request: RecoveryValidationRequest): Promise<{
    canRecover: boolean;
    issues: string[];
    warnings: string[];
  }> {
    return await this.validator.testRecovery(request);
  }

  // ========== Guidance and Recommendations ==========

  /**
   * Get storage recommendations for recovery phrases
   */
  getStorageGuidance() {
    return getRecoveryPhraseGuidance();
  }

  /**
   * Get Shamir sharing distribution guidance
   */
  getShamirGuidance(totalShares: number, threshold: number) {
    return getShamirSharingGuidance(totalShares, threshold);
  }

  /**
   * Get emergency code guidance
   */
  getEmergencyGuidance() {
    return getEmergencyCodeGuidance();
  }

  /**
   * Get security checklist
   */
  getSecurityChecklist() {
    return getRecoverySecurityChecklist();
  }

  /**
   * Get personalized recovery strategy
   */
  getPersonalizedStrategy(profile: {
    techSavvy: boolean;
    hasFamily: boolean;
    travels: boolean;
    riskTolerance: 'low' | 'medium' | 'high';
  }) {
    return getPersonalizedRecoveryStrategy(profile);
  }

  // ========== Maintenance Operations ==========

  /**
   * Clean up expired recovery data
   */
  async cleanupExpiredData(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    return await this.validator.cleanupExpiredData();
  }

  /**
   * Health check for recovery system
   */
  async healthCheck(userId: string): Promise<{
    phraseStored: boolean;
    shamirSharesAvailable: number;
    emergencyCodesValid: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check recovery phrase
      const phrase = await this.config.storage.getRecoveryPhrase(userId);
      const phraseStored = phrase !== null;

      if (!phraseStored) {
        issues.push('No recovery phrase stored');
        recommendations.push('Generate and securely store a recovery phrase');
      }

      // Check Shamir shares
      const shares = await this.config.storage.getShamirShares(userId);
      const shamirSharesAvailable = shares?.length || 0;

      if (shamirSharesAvailable === 0) {
        recommendations.push('Consider setting up Shamir Secret Sharing for enhanced security');
      } else if (shares && shamirSharesAvailable < shares[0].threshold) {
        issues.push(
          `Insufficient Shamir shares available (${shamirSharesAvailable}/${shares[0].threshold})`
        );
        recommendations.push('Ensure you have access to enough Shamir shares for recovery');
      }

      // Check emergency codes (this would need to be implemented in storage)
      const emergencyCodesValid = 0;
      // const codes = await this.config.storage.getEmergencyCodes(userId);
      // emergencyCodesValid = codes.filter(code => isCodeValid(code)).length;

      if (emergencyCodesValid === 0) {
        recommendations.push('Generate emergency access codes for immediate recovery scenarios');
      }

      return {
        phraseStored,
        shamirSharesAvailable,
        emergencyCodesValid,
        issues,
        recommendations,
      };
    } catch (error) {
      issues.push(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        phraseStored: false,
        shamirSharesAvailable: 0,
        emergencyCodesValid: 0,
        issues,
        recommendations: ['Unable to perform complete health check - verify recovery system setup'],
      };
    }
  }

  /**
   * Alias for generatePhrase - for backward compatibility
   */
  async generateRecoveryPhrase(wordCount?: RecoveryPhrase['wordCount']): Promise<RecoveryPhrase> {
    return await this.generatePhrase(wordCount);
  }
}

/**
 * Create a default recovery manager configuration
 */
export function createDefaultRecoveryConfig(
  storage: RecoveryStorage,
  events?: Partial<RecoveryEvents>
): RecoveryManagerConfig {
  const config: RecoveryManagerConfig = {
    defaultWordCount: 12,
    defaultShamirConfig: {
      totalShares: 5,
      threshold: 3,
    },
    emergencyCodeConfig: {
      codeLength: 12,
      validityDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxAttempts: 3,
    },
    rateLimiting: {
      maxAttemptsPerHour: 5,
      lockoutDuration: 60 * 60 * 1000, // 1 hour
    },
    storage,
  };

  if (events !== undefined) {
    config.events = events;
  }

  return config;
}

/**
 * Factory function to create a recovery manager with default configuration
 */
export function createRecoveryManager(
  storage: RecoveryStorage,
  events?: Partial<RecoveryEvents>,
  config?: Partial<RecoveryManagerConfig>
): RecoveryManager {
  const defaultConfig = createDefaultRecoveryConfig(storage, events);
  const finalConfig = { ...defaultConfig, ...config };
  return new RecoveryManager(finalConfig);
}
