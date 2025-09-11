/**
 * Recovery Module Exports
 *
 * Main exports for the account recovery system.
 * Provides all necessary functions and types for implementing
 * comprehensive account recovery functionality.
 */

// Type definitions
export type {
  RecoveryPhrase,
  ShamirShare,
  ShamirSecretConfig,
  EmergencyAccessCode,
  RecoveryValidationRequest,
  RecoveryValidationResult,
  RecoveryStorage,
  RecoveryEvents,
  RecoveryManagerConfig,
  RecoveryGuidance,
} from './types';

// Recovery phrase operations
export {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  phraseToSeed,
  getStorageRecommendations,
} from './phrases';

// Shamir secret sharing operations
export {
  createShamirShares,
  reconstructSecret,
  validateShamirShares,
  createTestShamirConfig,
  getShamirDistributionRecommendations,
} from './shamir';

// Emergency access codes
export {
  generateEmergencyCode,
  validateEmergencyCode,
  markCodeAsUsed,
  incrementAttempts,
  isCodeValid,
  getTimeRemaining,
  generateEmergencyCodeSet,
  formatCodeForDisplay,
  parseUserInputCode,
  getEmergencyCodeRecommendations,
  DEFAULT_EMERGENCY_CONFIG,
} from './emergency';

export type { EmergencyCodeConfig } from './emergency';

// Recovery validation system
export { RecoveryValidator } from './validation';

// User guidance system
export {
  getRecoveryPhraseGuidance,
  getShamirSharingGuidance,
  getEmergencyCodeGuidance,
  getRecoverySecurityChecklist,
  getPersonalizedRecoveryStrategy,
  getRecoverySetupGuide,
} from './guidance';

// Main recovery manager
export { RecoveryManager, createDefaultRecoveryConfig, createRecoveryManager } from './manager';

// Convenience re-exports for common operations
export const RecoverySystem = {
  // Phrase operations
  generatePhrase: generateRecoveryPhrase,
  validatePhrase: validateRecoveryPhrase,
  phraseToSeed,

  // Shamir operations
  createShares: createShamirShares,
  reconstructSecret,
  validateShares: validateShamirShares,

  // Emergency codes
  generateCode: generateEmergencyCode,
  generateCodeSet: generateEmergencyCodeSet,
  validateCode: validateEmergencyCode,

  // Guidance
  getGuidance: getRecoveryPhraseGuidance,
  getShamirGuidance: getShamirSharingGuidance,
  getEmergencyGuidance: getEmergencyCodeGuidance,
  getChecklist: getRecoverySecurityChecklist,

  // Manager factory
  createManager: createRecoveryManager,
};

// Default configurations
export const RECOVERY_DEFAULTS = {
  WORD_COUNT: 12 as const,
  SHAMIR_CONFIG: {
    totalShares: 5,
    threshold: 3,
  },
  EMERGENCY_CODE: {
    codeLength: 12,
    validityDuration: 24 * 60 * 60 * 1000, // 24 hours
    maxAttempts: 3,
  },
  RATE_LIMITING: {
    maxAttemptsPerHour: 5,
    lockoutDuration: 60 * 60 * 1000, // 1 hour
  },
} as const;
