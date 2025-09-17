/**
 * Recovery Manager
 *
 * Main interface for the account recovery system.
 * Integrates all recovery methods and provides a unified API.
 */
import { __awaiter } from 'tslib';
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
  constructor(config) {
    this.config = config;
    this.validator = new RecoveryValidator(config.storage, config.events, config.rateLimiting);
  }
  // ========== Recovery Phrase Operations ==========
  /**
   * Generate a new recovery phrase
   */
  generatePhrase(wordCount) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const phrase = yield generateRecoveryPhrase(wordCount || this.config.defaultWordCount);
      (_b = (_a = this.config.events) === null || _a === void 0 ? void 0 : _a.onPhraseGenerated) ===
        null || _b === void 0
        ? void 0
        : _b.call(
            _a,
            'user', // In practice, get actual user ID
            phrase.wordCount
          );
      return phrase;
    });
  }
  /**
   * Store recovery phrase for a user
   */
  storeRecoveryPhrase(userId, phrase) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.config.storage.storeRecoveryPhrase(userId, phrase);
    });
  }
  /**
   * Validate recovery phrase format
   */
  validatePhraseFormat(phrase) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield validateRecoveryPhrase(phrase);
    });
  }
  // ========== Shamir Secret Sharing Operations ==========
  /**
   * Create Shamir shares from a secret
   */
  createShamirShares(secret, config) {
    var _a, _b;
    const finalConfig = Object.assign(
      {
        totalShares: this.config.defaultShamirConfig.totalShares,
        threshold: this.config.defaultShamirConfig.threshold,
        secret,
      },
      config
    );
    const shares = createShamirShares(finalConfig);
    (_b =
      (_a = this.config.events) === null || _a === void 0 ? void 0 : _a.onShamirSharesCreated) ===
      null || _b === void 0
      ? void 0
      : _b.call(_a, 'user', finalConfig);
    return shares;
  }
  /**
   * Reconstruct secret from Shamir shares
   */
  reconstructFromShares(shares) {
    return reconstructSecret(shares);
  }
  /**
   * Store Shamir shares for a user
   */
  storeShamirShares(userId, shares) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.config.storage.storeShamirShares(userId, shares);
    });
  }
  // ========== Emergency Code Operations ==========
  /**
   * Generate a single emergency code
   */
  generateEmergencyCode(userId, type = 'emergency') {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const result = yield generateEmergencyCode(
        userId,
        Object.assign(Object.assign({}, this.config.emergencyCodeConfig), { type })
      );
      (_b =
        (_a = this.config.events) === null || _a === void 0
          ? void 0
          : _a.onEmergencyCodeGenerated) === null || _b === void 0
        ? void 0
        : _b.call(_a, userId, result.code.codeId, result.code.expiresAt);
      return result;
    });
  }
  /**
   * Generate a complete set of emergency codes
   */
  generateEmergencyCodeSet(userId) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
      const codeSet = yield generateEmergencyCodeSet(userId, {
        emergency: Object.assign(Object.assign({}, this.config.emergencyCodeConfig), {
          type: 'emergency',
        }),
        recovery: Object.assign(Object.assign({}, this.config.emergencyCodeConfig), {
          type: 'recovery',
        }),
        backup: Object.assign(Object.assign({}, this.config.emergencyCodeConfig), {
          type: 'backup',
        }),
      });
      // Emit events for each code
      (_b =
        (_a = this.config.events) === null || _a === void 0
          ? void 0
          : _a.onEmergencyCodeGenerated) === null || _b === void 0
        ? void 0
        : _b.call(_a, userId, codeSet.emergency.code.codeId, codeSet.emergency.code.expiresAt);
      (_d =
        (_c = this.config.events) === null || _c === void 0
          ? void 0
          : _c.onEmergencyCodeGenerated) === null || _d === void 0
        ? void 0
        : _d.call(_c, userId, codeSet.recovery.code.codeId, codeSet.recovery.code.expiresAt);
      (_f =
        (_e = this.config.events) === null || _e === void 0
          ? void 0
          : _e.onEmergencyCodeGenerated) === null || _f === void 0
        ? void 0
        : _f.call(_e, userId, codeSet.backup.code.codeId, codeSet.backup.code.expiresAt);
      return codeSet;
    });
  }
  /**
   * Store emergency code for a user
   */
  storeEmergencyCode(code) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.config.storage.storeEmergencyCode(code);
    });
  }
  // ========== Recovery Validation Operations ==========
  /**
   * Validate recovery request
   */
  validateRecovery(request) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.validator.validateRecovery(request);
    });
  }
  /**
   * Test recovery without performing actual recovery
   */
  testRecovery(request) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.validator.testRecovery(request);
    });
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
  getShamirGuidance(totalShares, threshold) {
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
  getPersonalizedStrategy(profile) {
    return getPersonalizedRecoveryStrategy(profile);
  }
  // ========== Maintenance Operations ==========
  /**
   * Clean up expired recovery data
   */
  cleanupExpiredData() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.validator.cleanupExpiredData();
    });
  }
  /**
   * Health check for recovery system
   */
  healthCheck(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const issues = [];
      const recommendations = [];
      try {
        // Check recovery phrase
        const phrase = yield this.config.storage.getRecoveryPhrase(userId);
        const phraseStored = phrase !== null;
        if (!phraseStored) {
          issues.push('No recovery phrase stored');
          recommendations.push('Generate and securely store a recovery phrase');
        }
        // Check Shamir shares
        const shares = yield this.config.storage.getShamirShares(userId);
        const shamirSharesAvailable =
          (shares === null || shares === void 0 ? void 0 : shares.length) || 0;
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
          recommendations: [
            'Unable to perform complete health check - verify recovery system setup',
          ],
        };
      }
    });
  }
}
/**
 * Create a default recovery manager configuration
 */
export function createDefaultRecoveryConfig(storage, events) {
  const config = {
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
export function createRecoveryManager(storage, events, config) {
  const defaultConfig = createDefaultRecoveryConfig(storage, events);
  const finalConfig = Object.assign(Object.assign({}, defaultConfig), config);
  return new RecoveryManager(finalConfig);
}
//# sourceMappingURL=manager.js.map
