/**
 * Recovery Module Exports
 *
 * Main exports for the account recovery system.
 * Provides all necessary functions and types for implementing
 * comprehensive account recovery functionality.
 */
// Recovery phrase operations
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  phraseToSeed,
  getStorageRecommendations,
} from './phrases';
export { generateRecoveryPhrase, validateRecoveryPhrase, phraseToSeed, getStorageRecommendations };
// Shamir secret sharing operations
import {
  createShamirShares,
  reconstructSecret,
  validateShamirShares,
  createTestShamirConfig,
  getShamirDistributionRecommendations,
} from './shamir';
export {
  createShamirShares,
  reconstructSecret,
  validateShamirShares,
  createTestShamirConfig,
  getShamirDistributionRecommendations,
};
// Emergency access codes
import {
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
};
// Recovery validation system
import { RecoveryValidator } from './validation';
export { RecoveryValidator };
// User guidance system
import {
  getRecoveryPhraseGuidance,
  getShamirSharingGuidance,
  getEmergencyCodeGuidance,
  getRecoverySecurityChecklist,
  getPersonalizedRecoveryStrategy,
  getRecoverySetupGuide,
} from './guidance';
export {
  getRecoveryPhraseGuidance,
  getShamirSharingGuidance,
  getEmergencyCodeGuidance,
  getRecoverySecurityChecklist,
  getPersonalizedRecoveryStrategy,
  getRecoverySetupGuide,
};
// Main recovery manager
import { RecoveryManager, createDefaultRecoveryConfig, createRecoveryManager } from './manager';
export { RecoveryManager, createDefaultRecoveryConfig, createRecoveryManager };
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
  WORD_COUNT: 12,
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
};
//# sourceMappingURL=index.js.map
