/**
 * Recovery Module Exports
 *
 * Main exports for the account recovery system.
 * Provides all necessary functions and types for implementing
 * comprehensive account recovery functionality.
 */
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
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  phraseToSeed,
  getStorageRecommendations,
} from './phrases';
export { generateRecoveryPhrase, validateRecoveryPhrase, phraseToSeed, getStorageRecommendations };
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
export type { EmergencyCodeConfig } from './emergency';
import { RecoveryValidator } from './validation';
export { RecoveryValidator };
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
import { RecoveryManager, createDefaultRecoveryConfig, createRecoveryManager } from './manager';
export { RecoveryManager, createDefaultRecoveryConfig, createRecoveryManager };
export declare const RecoverySystem: {
  generatePhrase: typeof generateRecoveryPhrase;
  validatePhrase: typeof validateRecoveryPhrase;
  phraseToSeed: typeof phraseToSeed;
  createShares: typeof createShamirShares;
  reconstructSecret: typeof reconstructSecret;
  validateShares: typeof validateShamirShares;
  generateCode: typeof generateEmergencyCode;
  generateCodeSet: typeof generateEmergencyCodeSet;
  validateCode: typeof validateEmergencyCode;
  getGuidance: typeof getRecoveryPhraseGuidance;
  getShamirGuidance: typeof getShamirSharingGuidance;
  getEmergencyGuidance: typeof getEmergencyCodeGuidance;
  getChecklist: typeof getRecoverySecurityChecklist;
  createManager: typeof createRecoveryManager;
};
export declare const RECOVERY_DEFAULTS: {
  readonly WORD_COUNT: 12;
  readonly SHAMIR_CONFIG: {
    readonly totalShares: 5;
    readonly threshold: 3;
  };
  readonly EMERGENCY_CODE: {
    readonly codeLength: 12;
    readonly validityDuration: number;
    readonly maxAttempts: 3;
  };
  readonly RATE_LIMITING: {
    readonly maxAttemptsPerHour: 5;
    readonly lockoutDuration: number;
  };
};
