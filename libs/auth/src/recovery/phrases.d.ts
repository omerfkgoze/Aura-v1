/**
 * Recovery Phrase Generation
 *
 * Implements BIP39-compatible mnemonic phrase generation for account recovery.
 * Provides cryptographically secure phrase generation with proper entropy
 * and checksum validation for reliable account recovery.
 */
import { RecoveryPhrase } from './types';
/**
 * Validate a recovery phrase
 */
export declare function validateRecoveryPhrase(words: string[]): Promise<boolean>;
/**
 * Generate a cryptographically secure recovery phrase
 */
export declare function generateRecoveryPhrase(
  wordCount?: RecoveryPhrase['wordCount'],
  language?: string
): Promise<RecoveryPhrase>;
/**
 * Convert recovery phrase to master seed
 */
export declare function phraseToSeed(
  phrase: RecoveryPhrase,
  passphrase?: string
): Promise<Uint8Array>;
/**
 * Get storage recommendations for recovery phrases
 */
export declare function getStorageRecommendations(): {
  digital: string[];
  physical: string[];
  distributed: string[];
  warnings: string[];
};
