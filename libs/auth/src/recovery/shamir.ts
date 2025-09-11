/**
 * Shamir Secret Sharing Implementation
 *
 * Implements Shamir's Secret Sharing algorithm for advanced account recovery.
 * Allows splitting a secret into multiple shares where a threshold number
 * of shares is required to reconstruct the original secret.
 */

import { ShamirShare, ShamirSecretConfig } from './types';

/**
 * Galois Field GF(256) operations for Shamir Secret Sharing
 */
class GaloisField {
  private static readonly FIELD_SIZE = 256;
  private static readonly PRIMITIVE_POLYNOMIAL = 0x11d; // x^8 + x^4 + x^3 + x^2 + 1

  private static expTable: number[] = [];
  private static logTable: number[] = [];
  private static initialized = false;

  /**
   * Initialize lookup tables for efficient operations
   */
  private static initialize(): void {
    if (this.initialized) return;

    this.expTable = new Array(this.FIELD_SIZE * 2);
    this.logTable = new Array(this.FIELD_SIZE);

    let x = 1;
    for (let i = 0; i < this.FIELD_SIZE; i++) {
      this.expTable[i] = x;
      this.logTable[x] = i;
      x = this.multiply(x, 2);
    }

    // Extend exp table for easier computation
    for (let i = this.FIELD_SIZE; i < this.FIELD_SIZE * 2; i++) {
      this.expTable[i] = this.expTable[i - this.FIELD_SIZE];
    }

    this.initialized = true;
  }

  /**
   * Multiply two elements in GF(256)
   */
  private static multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;

    let result = 0;
    while (b > 0) {
      if (b & 1) {
        result ^= a;
      }
      a <<= 1;
      if (a & 0x100) {
        a ^= this.PRIMITIVE_POLYNOMIAL;
      }
      b >>= 1;
    }
    return result & 0xff;
  }

  /**
   * Fast multiplication using lookup tables
   */
  static fastMultiply(a: number, b: number): number {
    this.initialize();
    if (a === 0 || b === 0) return 0;
    return this.expTable[this.logTable[a] + this.logTable[b]];
  }

  /**
   * Division in GF(256)
   */
  static divide(a: number, b: number): number {
    this.initialize();
    if (a === 0) return 0;
    if (b === 0) throw new Error('Division by zero in Galois Field');
    return this.expTable[this.logTable[a] - this.logTable[b] + this.FIELD_SIZE];
  }

  /**
   * Calculate power in GF(256)
   */
  static power(base: number, exponent: number): number {
    this.initialize();
    if (base === 0) return 0;
    if (exponent === 0) return 1;
    return this.expTable[(this.logTable[base] * exponent) % (this.FIELD_SIZE - 1)];
  }
}

/**
 * Polynomial evaluation in GF(256)
 */
function evaluatePolynomial(coefficients: number[], x: number): number {
  let result = 0;
  let xPower = 1;

  for (const coefficient of coefficients) {
    result ^= GaloisField.fastMultiply(coefficient, xPower);
    xPower = GaloisField.fastMultiply(xPower, x);
  }

  return result;
}

/**
 * Lagrange interpolation to reconstruct secret
 */
function lagrangeInterpolation(shares: Array<{ x: number; y: number }>): number {
  let result = 0;

  for (let i = 0; i < shares.length; i++) {
    let numerator = 1;
    let denominator = 1;

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        numerator = GaloisField.fastMultiply(numerator, shares[j].x);
        denominator = GaloisField.fastMultiply(denominator, shares[i].x ^ shares[j].x);
      }
    }

    const lagrangeCoeff = GaloisField.divide(numerator, denominator);
    result ^= GaloisField.fastMultiply(shares[i].y, lagrangeCoeff);
  }

  return result;
}

/**
 * Generate cryptographically secure random bytes
 */
function getSecureRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  } else if (typeof require !== 'undefined') {
    try {
      const nodeCrypto = require('crypto');
      return new Uint8Array(nodeCrypto.randomBytes(length));
    } catch (error) {
      throw new Error('No secure random number generator available');
    }
  } else {
    throw new Error('No secure random number generator available');
  }
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Create Shamir secret shares from a secret
 */
export function createShamirShares(config: ShamirSecretConfig): ShamirShare[] {
  const { totalShares, threshold, secret, metadata } = config;

  // Validation
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be at least equal to threshold');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }
  if (!secret || secret.length === 0) {
    throw new Error('Secret cannot be empty');
  }

  const secretBytes = hexToBytes(secret);
  const shares: ShamirShare[] = [];

  // Process each byte of the secret separately
  const shareData: number[][] = Array(totalShares)
    .fill(null)
    .map(() => []);

  for (let byteIndex = 0; byteIndex < secretBytes.length; byteIndex++) {
    const secretByte = secretBytes[byteIndex];

    // Generate random coefficients for polynomial
    const coefficients = [secretByte]; // a0 = secret byte
    for (let i = 1; i < threshold; i++) {
      const randomBytes = getSecureRandomBytes(1);
      coefficients.push(randomBytes[0]);
    }

    // Evaluate polynomial at different x values to create shares
    for (let shareIndex = 0; shareIndex < totalShares; shareIndex++) {
      const x = shareIndex + 1; // x values from 1 to totalShares
      const y = evaluatePolynomial(coefficients, x);
      shareData[shareIndex].push(y);
    }
  }

  // Create share objects
  for (let i = 0; i < totalShares; i++) {
    const shareBytes = new Uint8Array(shareData[i]);
    shares.push({
      id: i + 1,
      data: bytesToHex(shareBytes),
      threshold,
      totalShares,
      metadata: {
        description: metadata?.description,
        createdAt: new Date(),
        expiresAt: metadata?.expiresAt,
      },
    });
  }

  return shares;
}

/**
 * Reconstruct secret from Shamir shares
 */
export function reconstructSecret(shares: ShamirShare[]): string {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided');
  }

  const threshold = shares[0].threshold;

  // Validation
  if (shares.length < threshold) {
    throw new Error(`Insufficient shares. Need ${threshold}, got ${shares.length}`);
  }

  // Check that all shares have the same configuration
  const firstShare = shares[0];
  for (const share of shares) {
    if (share.threshold !== firstShare.threshold || share.totalShares !== firstShare.totalShares) {
      throw new Error('Inconsistent share configuration');
    }
  }

  // Check for expired shares
  const now = new Date();
  for (const share of shares) {
    if (share.metadata.expiresAt && share.metadata.expiresAt < now) {
      throw new Error(`Share ${share.id} has expired`);
    }
  }

  // Convert share data to bytes
  const shareBytes = shares.map(share => {
    try {
      return {
        id: share.id,
        data: hexToBytes(share.data),
      };
    } catch (error) {
      throw new Error(`Invalid share data for share ${share.id}`);
    }
  });

  // Ensure all shares have the same length
  const secretLength = shareBytes[0].data.length;
  for (const share of shareBytes) {
    if (share.data.length !== secretLength) {
      throw new Error('Shares have different lengths');
    }
  }

  // Reconstruct each byte of the secret
  const reconstructedBytes = new Uint8Array(secretLength);

  for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
    const points = shareBytes.slice(0, threshold).map(share => ({
      x: share.id,
      y: share.data[byteIndex],
    }));

    reconstructedBytes[byteIndex] = lagrangeInterpolation(points);
  }

  return bytesToHex(reconstructedBytes);
}

/**
 * Validate Shamir shares without reconstructing the secret
 */
export function validateShamirShares(shares: ShamirShare[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (!shares || shares.length === 0) {
      errors.push('No shares provided');
      return { valid: false, errors, warnings };
    }

    // Check minimum requirements
    const firstShare = shares[0];
    if (shares.length < firstShare.threshold) {
      errors.push(`Insufficient shares. Need ${firstShare.threshold}, got ${shares.length}`);
    }

    // Check consistency
    for (let i = 1; i < shares.length; i++) {
      if (shares[i].threshold !== firstShare.threshold) {
        errors.push(
          `Inconsistent threshold values: ${firstShare.threshold} vs ${shares[i].threshold}`
        );
      }
      if (shares[i].totalShares !== firstShare.totalShares) {
        errors.push(
          `Inconsistent total shares: ${firstShare.totalShares} vs ${shares[i].totalShares}`
        );
      }
    }

    // Check for duplicate share IDs
    const shareIds = new Set();
    for (const share of shares) {
      if (shareIds.has(share.id)) {
        errors.push(`Duplicate share ID: ${share.id}`);
      }
      shareIds.add(share.id);
    }

    // Check expiration
    const now = new Date();
    for (const share of shares) {
      if (share.metadata.expiresAt) {
        if (share.metadata.expiresAt < now) {
          errors.push(`Share ${share.id} has expired`);
        } else {
          const daysUntilExpiry = Math.ceil(
            (share.metadata.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilExpiry <= 30) {
            warnings.push(`Share ${share.id} expires in ${daysUntilExpiry} days`);
          }
        }
      }
    }

    // Validate share data format
    for (const share of shares) {
      try {
        hexToBytes(share.data);
      } catch (error) {
        errors.push(`Invalid hex data in share ${share.id}`);
      }
    }

    // Check data length consistency
    if (shares.length > 0) {
      const expectedLength = shares[0].data.length;
      for (const share of shares) {
        if (share.data.length !== expectedLength) {
          errors.push(`Inconsistent data length in share ${share.id}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Create a test configuration for Shamir sharing
 */
export function createTestShamirConfig(
  secret: string = 'deadbeef',
  totalShares: number = 5,
  threshold: number = 3
): ShamirSecretConfig {
  return {
    totalShares,
    threshold,
    secret,
    metadata: {
      description: 'Test configuration for Shamir Secret Sharing',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  };
}

/**
 * Get recommendations for Shamir share distribution
 */
export function getShamirDistributionRecommendations(
  totalShares: number,
  threshold: number
): {
  distribution: string[];
  security: string[];
  accessibility: string[];
  warnings: string[];
} {
  return {
    distribution: [
      `Store ${totalShares - threshold + 1} shares yourself for easy access`,
      `Distribute remaining ${threshold - 1} shares to trusted individuals`,
      'Use different storage methods for different shares',
      'Consider geographic distribution for disaster recovery',
    ],
    security: [
      'Never store threshold number of shares in the same location',
      'Use different communication channels to distribute shares',
      'Consider encrypting individual shares with recipient-specific passwords',
      'Document share distribution without revealing share content',
    ],
    accessibility: [
      'Ensure share holders understand the importance of their share',
      'Provide clear instructions for share reconstruction',
      'Test the reconstruction process before relying on it',
      'Have a backup plan if share holders become unavailable',
    ],
    warnings: [
      `If ${threshold} or more shares are compromised, your secret is compromised`,
      'Lost shares cannot be recovered - plan for share holder unavailability',
      'Share metadata might reveal information about your security setup',
      'Consider the long-term availability of share holders',
    ],
  };
}
