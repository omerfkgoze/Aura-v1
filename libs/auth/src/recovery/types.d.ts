/**
 * Recovery System Types
 *
 * Type definitions for the account recovery system including:
 * - Recovery phrases (BIP39-compatible)
 * - Shamir secret sharing
 * - Emergency access codes
 * - Recovery validation flows
 */
export interface RecoveryPhrase {
  /** The mnemonic phrase words */
  words: string[];
  /** Number of words in the phrase (12, 15, 18, 21, or 24) */
  wordCount: 12 | 15 | 18 | 21 | 24;
  /** Entropy used to generate the phrase (in hex) */
  entropy: string;
  /** Checksum for phrase validation */
  checksum: string;
  /** Language of the phrase */
  language: string;
  /** Timestamp when phrase was generated */
  createdAt: Date;
}
export interface ShamirShare {
  /** Share identifier */
  id: number;
  /** The actual share data (hex encoded) */
  data: string;
  /** Threshold required to reconstruct secret */
  threshold: number;
  /** Total number of shares created */
  totalShares: number;
  /** Metadata for the share */
  metadata: {
    description?: string;
    createdAt: Date;
    expiresAt?: Date;
  };
}
export interface ShamirSecretConfig {
  /** Number of shares to create */
  totalShares: number;
  /** Minimum shares needed to reconstruct */
  threshold: number;
  /** Secret to be shared (hex encoded) */
  secret: string;
  /** Optional metadata */
  metadata?: {
    description?: string;
    expiresAt?: Date;
  };
}
export interface EmergencyAccessCode {
  /** Unique code identifier */
  codeId: string;
  /** The emergency code */
  code: string;
  /** User ID this code belongs to */
  userId: string;
  /** Code type */
  type: 'emergency' | 'recovery' | 'backup';
  /** When the code expires */
  expiresAt: Date;
  /** When the code was created */
  createdAt: Date;
  /** Whether the code has been used */
  used: boolean;
  /** When the code was used (if applicable) */
  usedAt?: Date;
  /** IP address when code was used */
  usedFromIp?: string;
  /** Number of attempts made with this code */
  attempts: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
}
export interface RecoveryValidationRequest {
  /** Type of recovery being attempted */
  type: 'phrase' | 'shamir' | 'emergency';
  /** Recovery phrase words (for phrase recovery) */
  phrase?: string[];
  /** Shamir shares (for Shamir recovery) */
  shamirShares?: ShamirShare[];
  /** Emergency code (for emergency recovery) */
  emergencyCode?: string;
  /** User identifier */
  userId?: string;
  /** Additional context for validation */
  context?: {
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}
export interface RecoveryValidationResult {
  /** Whether validation was successful */
  success: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?:
    | 'INVALID_CODE'
    | 'INVALID_PHRASE'
    | 'INVALID_SHARES'
    | 'EXPIRED_CODE'
    | 'TOO_MANY_ATTEMPTS'
    | 'INSUFFICIENT_SHARES';
  /** Recovered data (if successful) */
  recoveredData?: {
    userId: string;
    masterKey?: string;
    sessionToken?: string;
  };
  /** Remaining attempts for this recovery method */
  remainingAttempts?: number;
  /** Time until next attempt allowed */
  retryAfter?: number;
}
export interface RecoveryStorage {
  /** Store recovery phrase securely */
  storeRecoveryPhrase(userId: string, phrase: RecoveryPhrase): Promise<void>;
  /** Retrieve recovery phrase for validation */
  getRecoveryPhrase(userId: string): Promise<RecoveryPhrase | null>;
  /** Store Shamir shares */
  storeShamirShares(userId: string, shares: ShamirShare[]): Promise<void>;
  /** Retrieve Shamir shares for reconstruction */
  getShamirShares(userId: string): Promise<ShamirShare[]>;
  /** Store emergency access code */
  storeEmergencyCode(code: EmergencyAccessCode): Promise<void>;
  /** Retrieve and validate emergency code */
  validateEmergencyCode(codeId: string, code: string): Promise<EmergencyAccessCode | null>;
  /** Mark emergency code as used */
  markCodeAsUsed(codeId: string, usedFromIp?: string): Promise<void>;
  /** Clean up expired codes */
  cleanupExpiredCodes(): Promise<number>;
}
export interface RecoveryEvents {
  /** Recovery phrase generated */
  onPhraseGenerated: (userId: string, wordCount: number) => void;
  /** Shamir shares created */
  onShamirSharesCreated: (userId: string, config: ShamirSecretConfig) => void;
  /** Emergency code generated */
  onEmergencyCodeGenerated: (userId: string, codeId: string, expiresAt: Date) => void;
  /** Recovery attempted */
  onRecoveryAttempted: (
    request: RecoveryValidationRequest,
    result: RecoveryValidationResult
  ) => void;
  /** Recovery successful */
  onRecoverySuccessful: (userId: string, type: RecoveryValidationRequest['type']) => void;
  /** Recovery failed */
  onRecoveryFailed: (
    userId: string,
    type: RecoveryValidationRequest['type'],
    error: string
  ) => void;
}
export interface RecoveryManagerConfig {
  /** Default word count for recovery phrases */
  defaultWordCount: RecoveryPhrase['wordCount'];
  /** Default Shamir configuration */
  defaultShamirConfig: {
    totalShares: number;
    threshold: number;
  };
  /** Emergency code configuration */
  emergencyCodeConfig: {
    codeLength: number;
    validityDuration: number;
    maxAttempts: number;
  };
  /** Rate limiting configuration */
  rateLimiting: {
    maxAttemptsPerHour: number;
    lockoutDuration: number;
  };
  /** Storage implementation */
  storage: RecoveryStorage;
  /** Event handlers */
  events?: Partial<RecoveryEvents>;
}
export interface RecoveryGuidance {
  /** Storage recommendations */
  storageRecommendations: {
    digital: string[];
    physical: string[];
    distributed: string[];
  };
  /** Security warnings */
  securityWarnings: string[];
  /** Best practices */
  bestPractices: string[];
  /** Common mistakes to avoid */
  commonMistakes: string[];
  /** Testing instructions */
  testingInstructions: string[];
}
