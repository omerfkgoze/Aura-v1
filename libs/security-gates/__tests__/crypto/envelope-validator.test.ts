import { describe, it, expect } from 'vitest';
import { CryptoEnvelopeValidator } from '../../src/crypto/envelope-validator';
import { CryptoEnvelope } from '../../src/crypto/crypto-envelope.types';

describe('CryptoEnvelopeValidator', () => {
  let validator: CryptoEnvelopeValidator;

  beforeEach(() => {
    validator = new CryptoEnvelopeValidator();
  });

  describe('validateSchema', () => {
    it('should validate a correct crypto envelope', () => {
      const envelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=', // 48 chars = 36 bytes (32+)
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi', // 32 chars = 24 bytes for XChaCha20
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateSchema(envelope);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject envelope with missing fields', () => {
      const envelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        // Missing required fields
      };

      const result = validator.validateSchema(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject envelope with invalid UUID in AAD', () => {
      const envelope = {
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
          userId: 'invalid-uuid',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateSchema(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('UUID'))).toBe(true);
    });

    it('should reject envelope with invalid base64 salt', () => {
      const envelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'invalid-base64!@#',
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateSchema(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('base64'))).toBe(true);
    });
  });

  describe('validateStructure', () => {
    it('should validate salt length', () => {
      const envelope: CryptoEnvelope = {
        version: 1,
        algorithm: 'XChaCha20Poly1305',
        kdfParams: {
          algorithm: 'Argon2id',
          memory: 65536,
          iterations: 3,
          parallelism: 1,
        },
        salt: 'c2hvcnQ=', // Too short (4 bytes)
        nonce: 'YmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJi',
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateStructure(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Salt too short'))).toBe(true);
    });

    it('should validate nonce length for XChaCha20Poly1305', () => {
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
        nonce: 'c2hvcnQ=', // Too short for XChaCha20
        keyId: 'v1_20231201_abc123',
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateStructure(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Nonce length mismatch'))).toBe(true);
    });

    it('should validate keyId length', () => {
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
        keyId: 'short', // Too short
        aad: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateStructure(envelope);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('KeyId too short'))).toBe(true);
    });

    it('should warn about old timestamps', () => {
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago

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
          timestamp: oldTimestamp,
        },
      };

      const result = validator.validateStructure(envelope);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('hours old'))).toBe(true);
    });
  });

  describe('validateComplete', () => {
    it('should perform both schema and structure validation', () => {
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
          recordId: 'record123',
          tableName: 'encrypted_cycle_data',
          version: 1,
          timestamp: '2023-12-01T12:00:00.000Z',
        },
      };

      const result = validator.validateComplete(validEnvelope);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail on schema validation before structure validation', () => {
      const invalidEnvelope = {
        version: 'invalid', // Should be number
        algorithm: 'XChaCha20Poly1305',
      };

      const result = validator.validateComplete(invalidEnvelope);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
