/**
 * Recovery Validation and Restoration Flow
 *
 * Implements comprehensive validation and restoration flows for all recovery methods.
 * Handles recovery phrase validation, Shamir reconstruction, and emergency code validation
 * with proper security controls and audit logging.
 */
import { __awaiter } from 'tslib';
import { validateRecoveryPhrase, phraseToSeed } from './phrases';
import { reconstructSecret, validateShamirShares } from './shamir';
import {
  validateEmergencyCode,
  incrementAttempts,
  markCodeAsUsed,
  parseUserInputCode,
} from './emergency';
/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT = {
  maxAttemptsPerHour: 5,
  lockoutDuration: 60 * 60 * 1000, // 1 hour
  slidingWindowSize: 60 * 60 * 1000, // 1 hour
};
/**
 * Rate limiter for recovery attempts
 */
class RecoveryRateLimiter {
  constructor(config = {}) {
    this.attempts = new Map();
    this.config = Object.assign(Object.assign({}, DEFAULT_RATE_LIMIT), config);
  }
  /**
   * Check if user is within rate limits
   */
  checkRateLimit(userId, type) {
    const key = `${userId}:${type}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.slidingWindowSize);
    // Get attempts within the sliding window
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(attempt => attempt.timestamp >= windowStart);
    // Update the stored attempts (remove old ones)
    this.attempts.set(key, recentAttempts);
    if (recentAttempts.length >= this.config.maxAttemptsPerHour) {
      const oldestAttempt = recentAttempts[0];
      const retryAfter =
        oldestAttempt.timestamp.getTime() + this.config.lockoutDuration - now.getTime();
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: Math.max(0, retryAfter),
      };
    }
    return {
      allowed: true,
      remainingAttempts: this.config.maxAttemptsPerHour - recentAttempts.length,
    };
  }
  /**
   * Record a recovery attempt
   */
  recordAttempt(userId, type, success, context) {
    const key = `${userId}:${type}`;
    const attempt = {
      userId,
      type,
      timestamp: new Date(),
      success,
      ipAddress: context === null || context === void 0 ? void 0 : context.ipAddress,
      userAgent: context === null || context === void 0 ? void 0 : context.userAgent,
    };
    const userAttempts = this.attempts.get(key) || [];
    userAttempts.push(attempt);
    this.attempts.set(key, userAttempts);
  }
  /**
   * Clear rate limit for user (e.g., after successful recovery)
   */
  clearRateLimit(userId, type) {
    if (type) {
      const key = `${userId}:${type}`;
      this.attempts.delete(key);
    } else {
      // Clear all types for user
      const keysToDelete = Array.from(this.attempts.keys()).filter(key =>
        key.startsWith(userId + ':')
      );
      keysToDelete.forEach(key => this.attempts.delete(key));
    }
  }
}
/**
 * Recovery validation manager
 */
export class RecoveryValidator {
  constructor(storage, events, rateLimitConfig) {
    this.storage = storage;
    this.events = events;
    this.rateLimiter = new RecoveryRateLimiter(rateLimitConfig);
  }
  /**
   * Validate recovery phrase
   */
  validatePhraseRecovery(phrase, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Basic phrase validation
        const isValidFormat = yield validateRecoveryPhrase(phrase);
        if (!isValidFormat) {
          return {
            success: false,
            error: 'Invalid recovery phrase format or checksum',
            errorCode: 'INVALID_PHRASE',
          };
        }
        // If userId provided, verify against stored phrase
        if (userId) {
          const storedPhrase = yield this.storage.getRecoveryPhrase(userId);
          if (!storedPhrase) {
            return {
              success: false,
              error: 'No recovery phrase found for user',
              errorCode: 'INVALID_PHRASE',
            };
          }
          // Compare phrases
          if (storedPhrase.words.length !== phrase.length) {
            return {
              success: false,
              error: 'Recovery phrase length mismatch',
              errorCode: 'INVALID_PHRASE',
            };
          }
          for (let i = 0; i < phrase.length; i++) {
            if (storedPhrase.words[i].toLowerCase() !== phrase[i].toLowerCase()) {
              return {
                success: false,
                error: 'Recovery phrase does not match',
                errorCode: 'INVALID_PHRASE',
              };
            }
          }
          // Generate master seed from phrase
          const masterSeed = yield phraseToSeed(storedPhrase);
          const masterKey = Array.from(masterSeed)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
          return {
            success: true,
            recoveredData: {
              userId,
              masterKey,
            },
          };
        } else {
          // Just format validation without user verification
          return {
            success: true,
            recoveredData: {
              userId: 'unknown', // Will need to be resolved elsewhere
            },
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Phrase validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'INVALID_PHRASE',
        };
      }
    });
  }
  /**
   * Validate Shamir shares recovery
   */
  validateShamirRecovery(shares, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Validate share format and consistency
        const validation = validateShamirShares(shares);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.errors.join(', '),
            errorCode: 'INVALID_SHARES',
          };
        }
        // Check if we have enough shares
        if (shares.length < shares[0].threshold) {
          return {
            success: false,
            error: `Insufficient shares. Need ${shares[0].threshold}, got ${shares.length}`,
            errorCode: 'INSUFFICIENT_SHARES',
          };
        }
        // Reconstruct secret
        const reconstructedSecret = reconstructSecret(shares);
        // If userId provided, verify against stored shares
        if (userId) {
          const storedShares = yield this.storage.getShamirShares(userId);
          if (!storedShares || storedShares.length === 0) {
            return {
              success: false,
              error: 'No Shamir shares found for user',
              errorCode: 'INVALID_SHARES',
            };
          }
          // Verify share configuration matches
          const storedConfig = storedShares[0];
          const providedConfig = shares[0];
          if (
            storedConfig.threshold !== providedConfig.threshold ||
            storedConfig.totalShares !== providedConfig.totalShares
          ) {
            return {
              success: false,
              error: 'Share configuration mismatch',
              errorCode: 'INVALID_SHARES',
            };
          }
        }
        return {
          success: true,
          recoveredData: {
            userId: userId || 'unknown',
            masterKey: reconstructedSecret,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: `Shamir validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'INVALID_SHARES',
        };
      }
    });
  }
  /**
   * Validate emergency code recovery
   */
  validateEmergencyRecovery(emergencyCode, userId) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const cleanCode = parseUserInputCode(emergencyCode);
        if (!userId) {
          return {
            success: false,
            error: 'User ID required for emergency code validation',
            errorCode: 'INVALID_CODE',
          };
        }
        // Find the emergency code by trying all stored codes for the user
        // In a real implementation, you'd have a more efficient lookup
        let storedCode = null;
        try {
          // This is a simplified approach - in practice, you'd have a proper database query
          storedCode = yield this.storage.validateEmergencyCode(userId, cleanCode);
        } catch (error) {
          return {
            success: false,
            error: 'Error retrieving emergency code',
            errorCode: 'INVALID_CODE',
          };
        }
        if (!storedCode) {
          return {
            success: false,
            error: 'Emergency code not found',
            errorCode: 'INVALID_CODE',
          };
        }
        // Validate the code
        const validation = yield validateEmergencyCode(cleanCode, storedCode);
        if (!validation.valid) {
          // Update attempt counter
          const updatedCode = incrementAttempts(storedCode);
          yield this.storage.storeEmergencyCode(updatedCode);
          let errorCode = 'INVALID_CODE';
          if ((_a = validation.error) === null || _a === void 0 ? void 0 : _a.includes('expired')) {
            errorCode = 'EXPIRED_CODE';
          } else if (
            (_b = validation.error) === null || _b === void 0 ? void 0 : _b.includes('attempts')
          ) {
            errorCode = 'TOO_MANY_ATTEMPTS';
          }
          return {
            success: false,
            error: validation.error || 'Invalid emergency code',
            errorCode,
            remainingAttempts: validation.remainingAttempts,
          };
        }
        // Mark code as used
        const usedCode = markCodeAsUsed(storedCode);
        yield this.storage.markCodeAsUsed(storedCode.codeId);
        return {
          success: true,
          recoveredData: {
            userId,
            sessionToken: `emergency_session_${Date.now()}`,
          },
          remainingAttempts: validation.remainingAttempts,
        };
      } catch (error) {
        return {
          success: false,
          error: `Emergency code validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'INVALID_CODE',
        };
      }
    });
  }
  /**
   * Main recovery validation method
   */
  validateRecovery(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check rate limits
        if (request.userId) {
          const rateLimitCheck = this.rateLimiter.checkRateLimit(request.userId, request.type);
          if (!rateLimitCheck.allowed) {
            const result = {
              success: false,
              error: 'Too many recovery attempts. Please try again later.',
              errorCode: 'TOO_MANY_ATTEMPTS',
              remainingAttempts: rateLimitCheck.remainingAttempts,
              retryAfter: rateLimitCheck.retryAfter,
            };
            (_b = (_a = this.events) === null || _a === void 0 ? void 0 : _a.onRecoveryFailed) ===
              null || _b === void 0
              ? void 0
              : _b.call(_a, request.userId, request.type, 'Rate limit exceeded');
            return result;
          }
        }
        // Record attempt start
        (_d = (_c = this.events) === null || _c === void 0 ? void 0 : _c.onRecoveryAttempted) ===
          null || _d === void 0
          ? void 0
          : _d.call(_c, request, {
              success: false,
              error: 'Validation in progress',
            });
        let result;
        // Validate based on recovery type
        switch (request.type) {
          case 'phrase':
            if (!request.phrase) {
              result = {
                success: false,
                error: 'Recovery phrase is required',
                errorCode: 'INVALID_PHRASE',
              };
              break;
            }
            result = yield this.validatePhraseRecovery(request.phrase, request.userId);
            break;
          case 'shamir':
            if (!request.shamirShares) {
              result = {
                success: false,
                error: 'Shamir shares are required',
                errorCode: 'INVALID_SHARES',
              };
              break;
            }
            result = yield this.validateShamirRecovery(request.shamirShares, request.userId);
            break;
          case 'emergency':
            if (!request.emergencyCode) {
              result = {
                success: false,
                error: 'Emergency code is required',
                errorCode: 'INVALID_CODE',
              };
              break;
            }
            result = yield this.validateEmergencyRecovery(request.emergencyCode, request.userId);
            break;
          default:
            result = {
              success: false,
              error: 'Unknown recovery type',
              errorCode: 'INVALID_PHRASE',
            };
        }
        // Record attempt result
        if (request.userId) {
          this.rateLimiter.recordAttempt(
            request.userId,
            request.type,
            result.success,
            request.context
          );
          if (result.success) {
            // Clear rate limits on successful recovery
            this.rateLimiter.clearRateLimit(request.userId, request.type);
            (_f =
              (_e = this.events) === null || _e === void 0 ? void 0 : _e.onRecoverySuccessful) ===
              null || _f === void 0
              ? void 0
              : _f.call(_e, request.userId, request.type);
          } else {
            (_h = (_g = this.events) === null || _g === void 0 ? void 0 : _g.onRecoveryFailed) ===
              null || _h === void 0
              ? void 0
              : _h.call(_g, request.userId, request.type, result.error || 'Unknown error');
          }
        }
        // Final attempt notification
        (_k = (_j = this.events) === null || _j === void 0 ? void 0 : _j.onRecoveryAttempted) ===
          null || _k === void 0
          ? void 0
          : _k.call(_j, request, result);
        return result;
      } catch (error) {
        const result = {
          success: false,
          error: `Recovery validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          errorCode: 'INVALID_PHRASE',
        };
        if (request.userId) {
          (_m = (_l = this.events) === null || _l === void 0 ? void 0 : _l.onRecoveryFailed) ===
            null || _m === void 0
            ? void 0
            : _m.call(_l, request.userId, request.type, result.error);
        }
        return result;
      }
    });
  }
  /**
   * Test recovery without performing actual recovery
   */
  testRecovery(request) {
    return __awaiter(this, void 0, void 0, function* () {
      const issues = [];
      const warnings = [];
      try {
        switch (request.type) {
          case 'phrase':
            if (!request.phrase) {
              issues.push('No recovery phrase provided');
              break;
            }
            const isValid = yield validateRecoveryPhrase(request.phrase);
            if (!isValid) {
              issues.push('Invalid recovery phrase format or checksum');
            }
            if (request.phrase.length < 12) {
              warnings.push('Short recovery phrases are less secure');
            }
            break;
          case 'shamir':
            if (!request.shamirShares) {
              issues.push('No Shamir shares provided');
              break;
            }
            const validation = validateShamirShares(request.shamirShares);
            issues.push(...validation.errors);
            warnings.push(...validation.warnings);
            break;
          case 'emergency':
            if (!request.emergencyCode) {
              issues.push('No emergency code provided');
              break;
            }
            const cleanCode = parseUserInputCode(request.emergencyCode);
            if (cleanCode.length < 8) {
              issues.push('Emergency code too short');
            }
            break;
        }
        return {
          canRecover: issues.length === 0,
          issues,
          warnings,
        };
      } catch (error) {
        return {
          canRecover: false,
          issues: [`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings,
        };
      }
    });
  }
  /**
   * Clean up expired recovery data
   */
  cleanupExpiredData() {
    return __awaiter(this, void 0, void 0, function* () {
      const errors = [];
      let cleaned = 0;
      try {
        // Clean up expired emergency codes
        const expiredCodes = yield this.storage.cleanupExpiredCodes();
        cleaned += expiredCodes;
      } catch (error) {
        errors.push(
          `Error cleaning emergency codes: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      return { cleaned, errors };
    });
  }
}
//# sourceMappingURL=validation.js.map
