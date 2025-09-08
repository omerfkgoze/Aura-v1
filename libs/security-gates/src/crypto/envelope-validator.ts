import { z } from 'zod';
import { CryptoEnvelope, ValidationResult } from './crypto-envelope.types';

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

const CryptoEnvelopeSchema = z.object({
  version: z.number().int().positive(),
  algorithm: z.string().min(1),
  kdfParams: z.object({
    algorithm: z.string().min(1),
    memory: z.number().int().positive(),
    iterations: z.number().int().positive(),
    parallelism: z.number().int().positive(),
  }),
  salt: z.string().regex(BASE64_REGEX, 'Salt must be valid base64'),
  nonce: z.string().regex(BASE64_REGEX, 'Nonce must be valid base64'),
  keyId: z.string().min(1),
  aad: z.object({
    userId: z.string().uuid('AAD userId must be valid UUID'),
    recordId: z.string().min(1),
    tableName: z.string().min(1),
    version: z.number().int().nonnegative(),
    timestamp: z.string().datetime('AAD timestamp must be valid ISO datetime'),
  }),
});

export class CryptoEnvelopeValidator {
  validateSchema(envelope: unknown): ValidationResult {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
    };

    try {
      CryptoEnvelopeSchema.parse(envelope);
      result.valid = true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      } else {
        result.errors = ['Unknown validation error'];
      }
    }

    return result;
  }

  validateStructure(envelope: CryptoEnvelope): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate base64 salt length (minimum 32 bytes = 44 chars base64)
    const saltBytes = this.getBase64Length(envelope.salt);
    if (saltBytes < 32) {
      result.errors.push(`Salt too short: ${saltBytes} bytes, minimum 32 bytes required`);
      result.valid = false;
    }

    // Validate nonce length based on algorithm
    const expectedNonceLength = this.getExpectedNonceLength(envelope.algorithm);
    const nonceBytes = this.getBase64Length(envelope.nonce);
    if (expectedNonceLength && nonceBytes !== expectedNonceLength) {
      result.errors.push(
        `Nonce length mismatch for ${envelope.algorithm}: got ${nonceBytes} bytes, expected ${expectedNonceLength} bytes`
      );
      result.valid = false;
    }

    // Validate keyId is not empty and has minimum length
    if (envelope.keyId.length < 8) {
      result.errors.push(
        `KeyId too short: ${envelope.keyId.length} characters, minimum 8 required`
      );
      result.valid = false;
    }

    // Validate AAD completeness
    if (!envelope.aad.userId || !envelope.aad.recordId || !envelope.aad.tableName) {
      result.errors.push('AAD must contain userId, recordId, and tableName');
      result.valid = false;
    }

    // Validate timestamp is recent (within last 24 hours for security)
    const timestamp = new Date(envelope.aad.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      result.warnings.push(`AAD timestamp is ${Math.round(hoursDiff)} hours old`);
    }

    return result;
  }

  private getBase64Length(base64String: string): number {
    const padding = (base64String.match(/=/g) || []).length;
    return Math.floor((base64String.length * 3) / 4) - padding;
  }

  private getExpectedNonceLength(algorithm: string): number | null {
    const nonceLengths: Record<string, number> = {
      XChaCha20Poly1305: 24,
      ChaCha20Poly1305: 12,
      'AES-256-GCM': 12,
      'AES-256-GCM-96': 12,
      'AES-256-GCM-128': 16,
    };

    return nonceLengths[algorithm] || null;
  }

  validateComplete(envelope: unknown): ValidationResult {
    // First validate schema
    const schemaResult = this.validateSchema(envelope);
    if (!schemaResult.valid) {
      return schemaResult;
    }

    // Then validate structure
    const structureResult = this.validateStructure(envelope as CryptoEnvelope);

    return {
      valid: schemaResult.valid && structureResult.valid,
      errors: [...schemaResult.errors, ...structureResult.errors],
      warnings: [...schemaResult.warnings, ...structureResult.warnings],
    };
  }
}
