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
} from './types';
/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  maxAttemptsPerHour: number;
  lockoutDuration: number;
  slidingWindowSize: number;
}
/**
 * Recovery validation manager
 */
export declare class RecoveryValidator {
  private storage;
  private events?;
  private rateLimiter;
  constructor(
    storage: RecoveryStorage,
    events?: Partial<RecoveryEvents>,
    rateLimitConfig?: Partial<RateLimitConfig>
  );
  /**
   * Validate recovery phrase
   */
  private validatePhraseRecovery;
  /**
   * Validate Shamir shares recovery
   */
  private validateShamirRecovery;
  /**
   * Validate emergency code recovery
   */
  private validateEmergencyRecovery;
  /**
   * Main recovery validation method
   */
  validateRecovery(request: RecoveryValidationRequest): Promise<RecoveryValidationResult>;
  /**
   * Test recovery without performing actual recovery
   */
  testRecovery(request: RecoveryValidationRequest): Promise<{
    canRecover: boolean;
    issues: string[];
    warnings: string[];
  }>;
  /**
   * Clean up expired recovery data
   */
  cleanupExpiredData(): Promise<{
    cleaned: number;
    errors: string[];
  }>;
}
export {};
