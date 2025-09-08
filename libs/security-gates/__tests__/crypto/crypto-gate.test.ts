import { describe, it, expect } from 'vitest';
import { CryptoGate } from '../../src/crypto/crypto-gate';
import { CryptoEnvelope } from '../../src/crypto/crypto-envelope.types';

describe('CryptoGate', () => {
  let cryptoGate: CryptoGate;

  beforeEach(() => {
    cryptoGate = new CryptoGate();
  });

  describe('validateCryptoEnvelope', () => {
    it('should validate a complete valid envelope', async () => {
      const validEnvelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 131072, // 128MB
          iterations: 3,
          parallelism: 2,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await cryptoGate.validateCryptoEnvelope(validEnvelope);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on invalid schema', async () => {
      const invalidEnvelope = {
        version: 'invalid', // Should be number
        algorithm: 'XChaCha20Poly1305',
      };

      const result = await cryptoGate.validateCryptoEnvelope(invalidEnvelope);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail on invalid KDF parameters', async () => {
      const envelopeWithBadKdf: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'PBKDF2', // Not allowed
          memory: 65536, // Valid
          iterations: 3, // Valid
          parallelism: 1, // Valid
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await cryptoGate.validateCryptoEnvelope(envelopeWithBadKdf);

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });

    it('should fail on invalid algorithm', async () => {
      const envelopeWithBadAlgorithm: CryptoEnvelope = {
        version: 1,
        algorithm: 'AES-128-CBC', // Not allowed
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await cryptoGate.validateCryptoEnvelope(envelopeWithBadAlgorithm);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple envelopes', async () => {
      const validEnvelope1: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record1',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const validEnvelope2: CryptoEnvelope = {
        ...validEnvelope1,
        aad: {
          ...validEnvelope1.aad,
          recordId: 'record2',
        },
      };

      const result = await cryptoGate.validateBatch([validEnvelope1, validEnvelope2]);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);
    });

    it('should handle mixed valid/invalid envelopes', async () => {
      const validEnvelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record1',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const invalidEnvelope = {
        version: 'invalid',
      };

      const result = await cryptoGate.validateBatch([validEnvelope, invalidEnvelope]);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(1);
      expect(result.summary.invalid).toBe(1);
    });
  });

  describe('validateSecurityPolicy', () => {
    it('should validate against production policy', async () => {
      const envelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 131072,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await cryptoGate.validateSecurityPolicy(envelope, 'production');
      expect(result.valid).toBe(true);
    });

    it('should fail for unknown policy', async () => {
      const envelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await cryptoGate.validateSecurityPolicy(envelope, 'unknown');
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unknown security policy'))).toBe(true);
    });
  });

  describe('strict mode', () => {
    it('should fail on warnings in strict mode', async () => {
      const strictGate = new CryptoGate({
        strictMode: true,
        allowWarnings: false,
      });

      const envelopeWithWarnings: CryptoEnvelope = {
        version: 1,
        algorithm: 'AES-256-GCM', // Will generate warnings
        kdfParams: {
          algorithm: 'Argon2i', // Will generate warnings
          memory: 65536, // Will generate warnings
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
        nonce: 'Y2NjY2NjY2NjY2Nj',
        keyId: 'non-standard-format',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await strictGate.validateCryptoEnvelope(envelopeWithWarnings);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('warnings not allowed'))).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate a markdown report for valid envelope', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: ['Some warning'],
      };

      const envelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'test-salt',
        nonce: 'test-nonce',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const report = cryptoGate.generateReport(result, envelope);
      expect(report).toContain('✅ VALID');
      expect(report).toContain('XChaCha20Poly1305');
      expect(report).toContain('Some warning');
    });

    it('should generate a markdown report for invalid envelope', () => {
      const result = {
        valid: false,
        errors: ['Some error'],
        warnings: [],
      };

      const report = cryptoGate.generateReport(result);
      expect(report).toContain('❌ INVALID');
      expect(report).toContain('Some error');
    });
  });
});
