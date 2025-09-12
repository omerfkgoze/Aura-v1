/**
 * Shamir Secret Sharing Implementation
 *
 * Implements Shamir's Secret Sharing algorithm for advanced account recovery.
 * Allows splitting a secret into multiple shares where a threshold number
 * of shares is required to reconstruct the original secret.
 */
import { ShamirShare, ShamirSecretConfig } from './types';
/**
 * Create Shamir secret shares from a secret
 */
export declare function createShamirShares(config: ShamirSecretConfig): ShamirShare[];
/**
 * Reconstruct secret from Shamir shares
 */
export declare function reconstructSecret(shares: ShamirShare[]): string;
/**
 * Validate Shamir shares without reconstructing the secret
 */
export declare function validateShamirShares(shares: ShamirShare[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
};
/**
 * Create a test configuration for Shamir sharing
 */
export declare function createTestShamirConfig(
  secret?: string,
  totalShares?: number,
  threshold?: number
): ShamirSecretConfig;
/**
 * Get recommendations for Shamir share distribution
 */
export declare function getShamirDistributionRecommendations(
  totalShares: number,
  threshold: number
): {
  distribution: string[];
  security: string[];
  accessibility: string[];
  warnings: string[];
};
