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
/**
 * Main Recovery Manager class
 */
export declare class RecoveryManager {
  private config;
  private validator;
  constructor(config: RecoveryManagerConfig);
  /**
   * Generate a new recovery phrase
   */
  generatePhrase(wordCount?: RecoveryPhrase['wordCount']): Promise<RecoveryPhrase>;
  /**
   * Store recovery phrase for a user
   */
  storeRecoveryPhrase(userId: string, phrase: RecoveryPhrase): Promise<void>;
  /**
   * Validate recovery phrase format
   */
  validatePhraseFormat(phrase: string[]): Promise<boolean>;
  /**
   * Create Shamir shares from a secret
   */
  createShamirShares(secret: string, config?: Partial<ShamirSecretConfig>): ShamirShare[];
  /**
   * Reconstruct secret from Shamir shares
   */
  reconstructFromShares(shares: ShamirShare[]): string;
  /**
   * Store Shamir shares for a user
   */
  storeShamirShares(userId: string, shares: ShamirShare[]): Promise<void>;
  /**
   * Generate a single emergency code
   */
  generateEmergencyCode(
    userId: string,
    type?: EmergencyAccessCode['type']
  ): Promise<{
    code: EmergencyAccessCode;
    plainTextCode: string;
  }>;
  /**
   * Generate a complete set of emergency codes
   */
  generateEmergencyCodeSet(userId: string): Promise<{
    emergency: {
      code: EmergencyAccessCode;
      plainTextCode: string;
    };
    recovery: {
      code: EmergencyAccessCode;
      plainTextCode: string;
    };
    backup: {
      code: EmergencyAccessCode;
      plainTextCode: string;
    };
  }>;
  /**
   * Store emergency code for a user
   */
  storeEmergencyCode(code: EmergencyAccessCode): Promise<void>;
  /**
   * Validate recovery request
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
   * Get storage recommendations for recovery phrases
   */
  getStorageGuidance(): import('./types').RecoveryGuidance;
  /**
   * Get Shamir sharing distribution guidance
   */
  getShamirGuidance(
    totalShares: number,
    threshold: number
  ): {
    distribution: string[];
    shareHolders: string[];
    communication: string[];
    maintenance: string[];
  };
  /**
   * Get emergency code guidance
   */
  getEmergencyGuidance(): {
    generation: string[];
    storage: string[];
    usage: string[];
    renewal: string[];
  };
  /**
   * Get security checklist
   */
  getSecurityChecklist(): {
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
   * Get personalized recovery strategy
   */
  getPersonalizedStrategy(profile: {
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
   * Clean up expired recovery data
   */
  cleanupExpiredData(): Promise<{
    cleaned: number;
    errors: string[];
  }>;
  /**
   * Health check for recovery system
   */
  healthCheck(userId: string): Promise<{
    phraseStored: boolean;
    shamirSharesAvailable: number;
    emergencyCodesValid: number;
    issues: string[];
    recommendations: string[];
  }>;
}
/**
 * Create a default recovery manager configuration
 */
export declare function createDefaultRecoveryConfig(
  storage: RecoveryStorage,
  events?: Partial<RecoveryEvents>
): RecoveryManagerConfig;
/**
 * Factory function to create a recovery manager with default configuration
 */
export declare function createRecoveryManager(
  storage: RecoveryStorage,
  events?: Partial<RecoveryEvents>,
  config?: Partial<RecoveryManagerConfig>
): RecoveryManager;
