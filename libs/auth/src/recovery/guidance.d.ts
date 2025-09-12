/**
 * User Guidance for Secure Recovery Phrase Storage
 *
 * Provides comprehensive guidance and recommendations for users
 * on how to securely store and manage their recovery data.
 */
import { RecoveryGuidance } from './types';
/**
 * Comprehensive storage recommendations for recovery phrases
 */
export declare function getRecoveryPhraseGuidance(): RecoveryGuidance;
/**
 * Guidance for Shamir Secret Sharing storage
 */
export declare function getShamirSharingGuidance(
  totalShares: number,
  threshold: number
): {
  distribution: string[];
  shareHolders: string[];
  communication: string[];
  maintenance: string[];
};
/**
 * Emergency code storage guidance
 */
export declare function getEmergencyCodeGuidance(): {
  generation: string[];
  storage: string[];
  usage: string[];
  renewal: string[];
};
/**
 * Security checklist for recovery setup
 */
export declare function getRecoverySecurityChecklist(): {
  setup: {
    task: string;
    critical: boolean;
  }[];
  storage: {
    task: string;
    critical: boolean;
  }[];
  testing: {
    task: string;
    critical: boolean;
  }[];
  maintenance: {
    task: string;
    critical: boolean;
  }[];
};
/**
 * Recovery strategy recommendations based on user profile
 */
export declare function getPersonalizedRecoveryStrategy(profile: {
  techSavvy: boolean;
  hasFamily: boolean;
  travels: boolean;
  riskTolerance: 'low' | 'medium' | 'high';
}): {
  primaryMethod: string;
  backupMethods: string[];
  storageStrategy: string[];
  warnings: string[];
};
/**
 * Interactive recovery setup guide
 */
export declare function getRecoverySetupGuide(): {
  steps: {
    step: number;
    title: string;
    description: string;
    actions: string[];
  }[];
  tips: string[];
  troubleshooting: {
    problem: string;
    solution: string;
  }[];
};
