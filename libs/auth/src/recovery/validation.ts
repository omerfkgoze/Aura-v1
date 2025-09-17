/**
 * Recovery Validation and Restoration Flow
 *
 * Implements comprehensive validation and restoration flows for all recovery methods.
 * Handles recovery phrase validation, Shamir reconstruction, and emergency code validation
 * with proper security controls and audit logging.
 */

import {
  RecoveryValidationRequest,
  RecoveryValidationResult,
  RecoveryStorage,
  RecoveryEvents,
  EmergencyAccessCode,
} from './types';
import { validateRecoveryPhrase, phraseToSeed } from './phrases';
import { reconstructSecret, validateShamirShares } from './shamir';
import {
  validateEmergencyCode,
  incrementAttempts,
  markCodeAsUsed,
  parseUserInputCode,
} from './emergency';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  maxAttemptsPerHour: number;
  lockoutDuration: number; // milliseconds
  slidingWindowSize: number; // milliseconds
}

/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxAttemptsPerHour: 5,
  lockoutDuration: 60 * 60 * 1000, // 1 hour
  slidingWindowSize: 60 * 60 * 1000, // 1 hour
};

/**
 * Recovery attempt tracking
 */
interface RecoveryAttempt {
  userId: string;
  type: RecoveryValidationRequest['type'];
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Rate limiter for recovery attempts
 */
class RecoveryRateLimiter {
  private attempts: Map<string, RecoveryAttempt[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config };
  }

  /**
   * Check if user is within rate limits
   */
  checkRateLimit(
    userId: string,
    type: RecoveryValidationRequest['type']
  ): {
    allowed: boolean;
    remainingAttempts: number;
    retryAfter?: number;
  } {
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
  recordAttempt(
    userId: string,
    type: RecoveryValidationRequest['type'],
    success: boolean,
    context?: { ipAddress?: string; userAgent?: string }
  ): void {
    const key = `${userId}:${type}`;
    const attempt: RecoveryAttempt = {
      userId,
      type,
      timestamp: new Date(),
      success,
    };

    if (context?.ipAddress) {
      attempt.ipAddress = context.ipAddress;
    }
    if (context?.userAgent) {
      attempt.userAgent = context.userAgent;
    }

    const userAttempts = this.attempts.get(key) || [];
    userAttempts.push(attempt);
    this.attempts.set(key, userAttempts);
  }

  /**
   * Clear rate limit for user (e.g., after successful recovery)
   */
  clearRateLimit(userId: string, type?: RecoveryValidationRequest['type']): void {
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
  private storage: RecoveryStorage;
  private events?: Partial<RecoveryEvents>;
  private rateLimiter: RecoveryRateLimiter;

  constructor(
    storage: RecoveryStorage,
    events?: Partial<RecoveryEvents>,
    rateLimitConfig?: Partial<RateLimitConfig>
  ) {
    this.storage = storage;
    if (events) {
      this.events = events;
    }
    this.rateLimiter = new RecoveryRateLimiter(rateLimitConfig);
  }

  /**
   * Validate recovery phrase
   */
  private async validatePhraseRecovery(
    phrase: string[],
    userId?: string
  ): Promise<RecoveryValidationResult> {
    try {
      // Basic phrase validation
      const isValidFormat = await validateRecoveryPhrase(phrase);
      if (!isValidFormat) {
        return {
          success: false,
          error: 'Invalid recovery phrase format or checksum',
          errorCode: 'INVALID_PHRASE',
        };
      }

      // If userId provided, verify against stored phrase
      if (userId) {
        const storedPhrase = await this.storage.getRecoveryPhrase(userId);
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
        const masterSeed = await phraseToSeed(storedPhrase);
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
  }

  /**
   * Validate Shamir shares recovery
   */
  private async validateShamirRecovery(
    shares: any[],
    userId?: string
  ): Promise<RecoveryValidationResult> {
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
        const storedShares = await this.storage.getShamirShares(userId);
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
  }

  /**
   * Validate emergency code recovery
   */
  private async validateEmergencyRecovery(
    emergencyCode: string,
    userId?: string
  ): Promise<RecoveryValidationResult> {
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
      let storedCode: EmergencyAccessCode | null = null;

      try {
        // This is a simplified approach - in practice, you'd have a proper database query
        storedCode = await this.storage.validateEmergencyCode(userId, cleanCode);
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
      const validation = await validateEmergencyCode(cleanCode, storedCode);

      if (!validation.valid) {
        // Update attempt counter
        const updatedCode = incrementAttempts(storedCode);
        await this.storage.storeEmergencyCode(updatedCode);

        let errorCode: RecoveryValidationResult['errorCode'] = 'INVALID_CODE';
        if (validation.error?.includes('expired')) {
          errorCode = 'EXPIRED_CODE';
        } else if (validation.error?.includes('attempts')) {
          errorCode = 'TOO_MANY_ATTEMPTS';
        }

        const result: any = {
          success: false,
          error: validation.error || 'Invalid emergency code',
          errorCode,
        };

        if (validation.remainingAttempts !== undefined) {
          result.remainingAttempts = validation.remainingAttempts;
        }

        return result;
      }

      // Mark code as used
      markCodeAsUsed(storedCode);
      await this.storage.markCodeAsUsed(storedCode.codeId);

      const result: any = {
        success: true,
        recoveredData: {
          userId,
          sessionToken: `emergency_session_${Date.now()}`,
        },
      };

      if (validation.remainingAttempts !== undefined) {
        result.remainingAttempts = validation.remainingAttempts;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Emergency code validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INVALID_CODE',
      };
    }
  }

  /**
   * Main recovery validation method
   */
  async validateRecovery(request: RecoveryValidationRequest): Promise<RecoveryValidationResult> {
    try {
      // Check rate limits
      if (request.userId) {
        const rateLimitCheck = this.rateLimiter.checkRateLimit(request.userId, request.type);
        if (!rateLimitCheck.allowed) {
          const result: any = {
            success: false,
            error: 'Too many recovery attempts. Please try again later.',
            errorCode: 'TOO_MANY_ATTEMPTS',
            remainingAttempts: rateLimitCheck.remainingAttempts,
          };

          if (rateLimitCheck.retryAfter !== undefined) {
            result.retryAfter = rateLimitCheck.retryAfter;
          }

          this.events?.onRecoveryFailed?.(request.userId, request.type, 'Rate limit exceeded');

          return result;
        }
      }

      // Record attempt start
      this.events?.onRecoveryAttempted?.(request, {
        success: false,
        error: 'Validation in progress',
      });

      let result: RecoveryValidationResult;

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
          result = await this.validatePhraseRecovery(request.phrase, request.userId);
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
          result = await this.validateShamirRecovery(request.shamirShares, request.userId);
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
          result = await this.validateEmergencyRecovery(request.emergencyCode, request.userId);
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
          this.events?.onRecoverySuccessful?.(request.userId, request.type);
        } else {
          if (request.userId) {
            this.events?.onRecoveryFailed?.(
              request.userId,
              request.type,
              result.error || 'Unknown error'
            );
          }
        }
      }

      // Final attempt notification
      this.events?.onRecoveryAttempted?.(request, result);

      return result;
    } catch (error) {
      const result: RecoveryValidationResult = {
        success: false,
        error: `Recovery validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'INVALID_PHRASE',
      };

      if (request.userId) {
        this.events?.onRecoveryFailed?.(
          request.userId,
          request.type,
          result.error || 'Unknown error'
        );
      }

      return result;
    }
  }

  /**
   * Test recovery without performing actual recovery
   */
  async testRecovery(request: RecoveryValidationRequest): Promise<{
    canRecover: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      switch (request.type) {
        case 'phrase':
          if (!request.phrase) {
            issues.push('No recovery phrase provided');
            break;
          }

          const isValid = await validateRecoveryPhrase(request.phrase);
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
  }

  /**
   * Clean up expired recovery data
   */
  async cleanupExpiredData(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // Clean up expired emergency codes
      const expiredCodes = await this.storage.cleanupExpiredCodes();
      cleaned += expiredCodes;
    } catch (error) {
      errors.push(
        `Error cleaning emergency codes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return { cleaned, errors };
  }
}
