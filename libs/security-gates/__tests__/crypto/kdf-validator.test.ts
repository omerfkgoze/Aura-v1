import { describe, it, expect } from 'vitest';
import { KdfValidator } from '../../src/crypto/kdf-validator';

describe('KdfValidator', () => {
  let validator: KdfValidator;

  beforeEach(() => {
    validator = new KdfValidator();
  });

  describe('validateKdfParams', () => {
    it('should validate correct Argon2id parameters', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536, // 64MB
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported KDF algorithm', () => {
      const kdfParams = {
        algorithm: 'PBKDF2',
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });

    it('should reject memory below minimum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 1024, // Too low
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('memory too low'))).toBe(true);
    });

    it('should reject memory above maximum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 3000000, // Too high
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('memory too high'))).toBe(true);
    });

    it('should reject iterations below minimum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 1, // Too low
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('iterations too low'))).toBe(true);
    });

    it('should reject iterations above maximum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 150, // Too high
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('iterations too high'))).toBe(true);
    });

    it('should reject parallelism below minimum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 3,
        parallelism: 0, // Too low
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('parallelism too low'))).toBe(true);
    });

    it('should reject parallelism above maximum', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 3,
        parallelism: 50, // Too high
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('parallelism too high'))).toBe(true);
    });

    it('should warn about non-Argon2id algorithms', () => {
      const kdfParams = {
        algorithm: 'Argon2i',
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('Consider using Argon2id'))).toBe(
        true
      );
    });

    it('should warn about low memory settings', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 65536, // Minimum but low
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('may be too low'))).toBe(true);
    });

    it('should warn about high memory settings', () => {
      const kdfParams = {
        algorithm: 'Argon2id',
        memory: 600000, // High but valid
        iterations: 3,
        parallelism: 1,
      };

      const result = validator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('performance issues'))).toBe(true);
    });
  });

  describe('validateTimingAttackResistance', () => {
    it('should warn about fast KDF parameters', () => {
      const fastParams = {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 1, // Will be too fast
        parallelism: 8,
      };

      const result = validator.validateTimingAttackResistance(fastParams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('too quickly'))).toBe(true);
    });

    it('should warn about slow KDF parameters', () => {
      const slowParams = {
        algorithm: 'Argon2id',
        memory: 1048576, // 1GB
        iterations: 10,
        parallelism: 1,
      };

      const result = validator.validateTimingAttackResistance(slowParams);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('too long'))).toBe(true);
    });

    it('should accept reasonable timing parameters', () => {
      const reasonableParams = {
        algorithm: 'Argon2id',
        memory: 131072, // 128MB
        iterations: 3,
        parallelism: 2,
      };

      const result = validator.validateTimingAttackResistance(reasonableParams);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('custom configuration', () => {
    it('should accept custom configuration', () => {
      const customValidator = new KdfValidator({
        minMemoryKB: 32768, // 32MB
        allowedAlgorithms: ['Argon2id'],
      });

      const kdfParams = {
        algorithm: 'Argon2i', // Not allowed in custom config
        memory: 32768,
        iterations: 3,
        parallelism: 1,
      };

      const result = customValidator.validateKdfParams(kdfParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('not allowed'))).toBe(true);
    });

    it('should use custom memory limits', () => {
      const customValidator = new KdfValidator({
        minMemoryKB: 100000, // Higher minimum
        maxMemoryKB: 500000, // Lower maximum
      });

      const lowMemoryParams = {
        algorithm: 'Argon2id',
        memory: 65536, // Below custom minimum
        iterations: 3,
        parallelism: 1,
      };

      const result = customValidator.validateKdfParams(lowMemoryParams);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('memory too low'))).toBe(true);
    });
  });
});
