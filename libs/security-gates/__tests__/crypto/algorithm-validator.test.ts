import { describe, it, expect } from 'vitest';
import { AlgorithmValidator } from '../../src/crypto/algorithm-validator';

describe('AlgorithmValidator', () => {
  let validator: AlgorithmValidator;

  beforeEach(() => {
    validator = new AlgorithmValidator();
  });

  describe('validateAlgorithm', () => {
    it('should validate allowed algorithms', () => {
      const allowedAlgorithms = [
        'XChaCha20Poly1305',
        'ChaCha20Poly1305',
        'AES-256-GCM',
        'AES-256-GCM-96',
        'AES-256-GCM-128',
      ];

      allowedAlgorithms.forEach(algorithm => {
        const result = validator.validateAlgorithm(algorithm);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject disallowed algorithms', () => {
      const disallowedAlgorithms = [
        'AES-128-GCM',
        'AES-256-CBC',
        'AES-256-ECB',
        'DES',
        '3DES',
        'RC4',
      ];

      disallowedAlgorithms.forEach(algorithm => {
        const result = validator.validateAlgorithm(algorithm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
      });
    });

    it('should recommend XChaCha20Poly1305 for other algorithms', () => {
      const result = validator.validateAlgorithm('AES-256-GCM');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('XChaCha20Poly1305'))).toBe(true);
    });

    it('should warn about AES hardware acceleration dependency', () => {
      const result = validator.validateAlgorithm('AES-256-GCM');
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('hardware acceleration'))).toBe(true);
    });
  });

  describe('validateEncryptionMode', () => {
    it('should validate authenticated encryption algorithms', () => {
      const authenticatedAlgorithms = ['XChaCha20Poly1305', 'ChaCha20Poly1305', 'AES-256-GCM'];

      authenticatedAlgorithms.forEach(algorithm => {
        const result = validator.validateEncryptionMode(algorithm);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject non-authenticated encryption modes', () => {
      const nonAuthenticatedModes = ['AES-256-CBC', 'AES-256-ECB', 'DES-CBC'];

      nonAuthenticatedModes.forEach(algorithm => {
        const result = validator.validateEncryptionMode(algorithm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('authenticated encryption'))).toBe(true);
      });
    });

    it('should reject deprecated encryption modes', () => {
      const deprecatedModes = ['AES-256-ECB', 'DES-CBC', '3DES-CBC'];

      deprecatedModes.forEach(algorithm => {
        const result = validator.validateEncryptionMode(algorithm);
        expect(result.valid).toBe(false);
        expect(result.errors.some(error => error.includes('deprecated or insecure'))).toBe(true);
      });
    });
  });

  describe('validateCryptoParameters', () => {
    it('should validate correct crypto parameters', () => {
      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=', // 36 bytes
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi', // 24 bytes for XChaCha20
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(true);
    });

    it('should reject short salt', () => {
      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'c2hvcnQ=', // Too short
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Salt too short'))).toBe(true);
    });

    it('should validate nonce length for XChaCha20Poly1305', () => {
      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'c2hvcnROb25jZQ==', // Wrong length
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Nonce length mismatch'))).toBe(true);
    });

    it('should validate nonce length for ChaCha20Poly1305', () => {
      const params = {
        algorithm: 'ChaCha20Poly1305',
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'Y2NjY2NjY2NjY2Nj', // 12 bytes for ChaCha20
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(true);
    });

    it('should validate nonce length for AES-256-GCM', () => {
      const params = {
        algorithm: 'AES-256-GCM',
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'Y2NjY2NjY2NjY2Nj', // 12 bytes for AES-GCM
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(true);
    });

    it('should reject short keyId', () => {
      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'dGVzdC1zYWx0LTMyLWJ5dGVzLW1pbmltdW0tZm9yLXNlY3VyaXR5',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'short', // Too short
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('KeyId too short'))).toBe(true);
    });

    it('should warn about non-standard keyId format', () => {
      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'dGVzdC1zYWx0LTMyLWJ5dGVzLW1pbmltdW0tZm9yLXNlY3VyaXR5',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'non-standard-format-key-id',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('key rotation pattern'))).toBe(true);
    });

    it('should warn about GCM nonce reuse', () => {
      const params = {
        algorithm: 'AES-256-GCM',
        salt: 'dGVzdC1zYWx0LTMyLWJ5dGVzLW1pbmltdW0tZm9yLXNlY3VyaXR5',
        nonce: 'Y2NjY2NjY2NjY2Nj',
        keyId: 'v1_20231201_abc123',
      };

      const result = validator.validateCryptoParameters(params);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('never reused'))).toBe(true);
    });
  });

  describe('validateQuantumResistance', () => {
    it('should warn about quantum vulnerability for current algorithms', () => {
      const algorithms = ['XChaCha20Poly1305', 'ChaCha20Poly1305', 'AES-256-GCM'];

      algorithms.forEach(algorithm => {
        const result = validator.validateQuantumResistance(algorithm);
        expect(result.valid).toBe(true);
        expect(result.warnings.some(warning => warning.includes('not quantum-resistant'))).toBe(
          true
        );
      });
    });
  });

  describe('custom configuration', () => {
    it('should accept custom algorithm list', () => {
      const customValidator = new AlgorithmValidator({
        allowedAlgorithms: ['XChaCha20Poly1305'], // Only allow one
      });

      const result = customValidator.validateAlgorithm('AES-256-GCM');
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });

    it('should use custom salt length requirement', () => {
      const customValidator = new AlgorithmValidator({
        minSaltLength: 64, // Higher requirement
      });

      const params = {
        algorithm: 'XChaCha20Poly1305',
        salt: 'dGVzdC1zYWx0LTMyLWJ5dGVzLW1pbmltdW0tZm9yLXNlY3VyaXR5', // 32 bytes
        nonce: 'dGVzdC1ub25jZS0yNC1ieXRlcw==',
        keyId: 'v1_20231201_abc123',
      };

      const result = customValidator.validateCryptoParameters(params);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Salt too short'))).toBe(true);
    });
  });
});
