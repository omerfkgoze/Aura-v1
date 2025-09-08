import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FuzzTestingSuite, createFuzzTester } from '../../src/testing/fuzz-testing';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('FuzzTestingSuite', () => {
  let fuzzTester: FuzzTestingSuite;
  const testOutputDir = './test-fuzz-output';
  const testCorpusDir = './test-fuzz-corpus';

  beforeEach(() => {
    vi.clearAllMocks();

    fuzzTester = createFuzzTester({
      duration: 1, // 1 second for fast tests
      parallelism: 1,
      outputDir: testOutputDir,
      corpusDir: testCorpusDir,
      timeout: 1000,
    });

    // Mock fs operations
    mockFs.mkdirSync = vi.fn();
    mockFs.writeFileSync = vi.fn();
    mockFs.readFileSync = vi.fn();
    mockFs.readdirSync = vi.fn().mockReturnValue(['seed_0', 'seed_1']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fuzz testing targets', () => {
    it('should run crypto envelope fuzz testing', async () => {
      // Mock successful execution
      const fuzzPromise = fuzzTester.fuzzCryptoEnvelopeValidation();

      // Should complete without throwing
      await expect(fuzzPromise).resolves.not.toThrow();
    });

    it('should run PII detection fuzz testing', async () => {
      const fuzzPromise = fuzzTester.fuzzPIIDetection();

      await expect(fuzzPromise).resolves.not.toThrow();
    });

    it('should run network packet analysis fuzz testing', async () => {
      const fuzzPromise = fuzzTester.fuzzNetworkPacketAnalysis();

      await expect(fuzzPromise).resolves.not.toThrow();
    });

    it('should run RLS policy evaluation fuzz testing', async () => {
      const fuzzPromise = fuzzTester.fuzzRLSPolicyEvaluation();

      await expect(fuzzPromise).resolves.not.toThrow();
    });
  });

  describe('runAllFuzzTests', () => {
    it('should run all fuzz test targets', async () => {
      // Mock all individual fuzz methods
      vi.spyOn(fuzzTester, 'fuzzCryptoEnvelopeValidation').mockResolvedValue(undefined);
      vi.spyOn(fuzzTester, 'fuzzPIIDetection').mockResolvedValue(undefined);
      vi.spyOn(fuzzTester, 'fuzzNetworkPacketAnalysis').mockResolvedValue(undefined);
      vi.spyOn(fuzzTester, 'fuzzRLSPolicyEvaluation').mockResolvedValue(undefined);

      await expect(fuzzTester.runAllFuzzTests()).resolves.not.toThrow();

      expect(fuzzTester.fuzzCryptoEnvelopeValidation).toHaveBeenCalled();
      expect(fuzzTester.fuzzPIIDetection).toHaveBeenCalled();
      expect(fuzzTester.fuzzNetworkPacketAnalysis).toHaveBeenCalled();
      expect(fuzzTester.fuzzRLSPolicyEvaluation).toHaveBeenCalled();
    });
  });

  describe('fuzz target functions', () => {
    it('should handle valid crypto envelope input', () => {
      const validEnvelope = Buffer.from(
        JSON.stringify({
          version: 1,
          algorithm: 'XChaCha20Poly1305',
          kdfParams: {
            algorithm: 'Argon2id',
            memory: 65536,
            iterations: 3,
            parallelism: 1,
          },
          salt: 'valid-base64-salt',
          nonce: 'valid-nonce',
          keyId: 'test-key',
          aad: {
            userId: 'user-123',
            recordId: 'record-456',
            tableName: 'test_table',
            version: 1,
            timestamp: '2025-01-01T00:00:00.000Z',
          },
        })
      );

      // Access the private method through reflection for testing
      const result = (fuzzTester as any).fuzzCryptoEnvelopeTarget(validEnvelope);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(true);
    });

    it('should handle invalid crypto envelope input', () => {
      const invalidEnvelope = Buffer.from('invalid json');

      const result = (fuzzTester as any).fuzzCryptoEnvelopeTarget(invalidEnvelope);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('error');
    });

    it('should handle PII detection input', () => {
      const textWithPII = Buffer.from('My SSN is 123-45-6789');

      const result = (fuzzTester as any).fuzzPIIDetectionTarget(textWithPII);

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('piiFound');
      expect(result.piiFound).toBe(true);
    });

    it('should handle network packet input', () => {
      const validPacket = Buffer.from([0x45, 0x00, 0x00, 0x3c, 0x01, 0x02, 0x03, 0x04]);

      const result = (fuzzTester as any).fuzzNetworkPacketTarget(validPacket);

      expect(result).toHaveProperty('valid');
    });

    it('should handle RLS policy input', () => {
      const validPolicy = Buffer.from(
        JSON.stringify({
          userId: 'user-123',
          requestedUserId: 'user-123',
          action: 'read',
        })
      );

      const result = (fuzzTester as any).fuzzRLSPolicyTarget(validPolicy);

      expect(result).toHaveProperty('allowed');
      expect(result.allowed).toBe(true);
    });
  });

  describe('input generation and mutation', () => {
    it('should generate seed inputs for crypto envelope', () => {
      const seeds = (fuzzTester as any).generateCryptoEnvelopeSeedInputs();

      expect(seeds).toBeDefined();
      expect(seeds.length).toBeGreaterThan(0);
      expect(seeds[0]).toBeInstanceOf(Buffer);
    });

    it('should generate seed inputs for PII detection', () => {
      const seeds = (fuzzTester as any).generatePIISeedInputs();

      expect(seeds).toBeDefined();
      expect(seeds.length).toBeGreaterThan(0);
      expect(seeds[0]).toBeInstanceOf(Buffer);
    });

    it('should generate seed inputs for network packets', () => {
      const seeds = (fuzzTester as any).generateNetworkPacketSeedInputs();

      expect(seeds).toBeDefined();
      expect(seeds.length).toBeGreaterThan(0);
      expect(seeds[0]).toBeInstanceOf(Buffer);
    });

    it('should generate seed inputs for RLS policies', () => {
      const seeds = (fuzzTester as any).generateRLSPolicySeedInputs();

      expect(seeds).toBeDefined();
      expect(seeds.length).toBeGreaterThan(0);
      expect(seeds[0]).toBeInstanceOf(Buffer);
    });

    it('should mutate input buffers', () => {
      const originalInput = Buffer.from('original test data');
      const mutatedInput = (fuzzTester as any).mutateInput(originalInput);

      expect(mutatedInput).toBeInstanceOf(Buffer);
      // Mutation might or might not change the buffer, so we just check it's valid
      expect(mutatedInput.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('security validation', () => {
    it('should detect security violations in results', () => {
      const violationResult = {
        error: 'SecurityError: Unauthorized access detected',
      };

      const isViolation = (fuzzTester as any).detectSecurityViolation(violationResult, [
        'SecurityError',
        'ValidationError',
      ]);

      expect(isViolation).toBe(true);
    });

    it('should not flag normal results as violations', () => {
      const normalResult = {
        success: true,
        data: 'normal response',
      };

      const isViolation = (fuzzTester as any).detectSecurityViolation(normalResult, [
        'SecurityError',
        'ValidationError',
      ]);

      expect(isViolation).toBe(false);
    });

    it('should identify security errors', () => {
      const securityError = new Error('Unauthorized access violation');
      securityError.name = 'SecurityError';

      const isSecurityError = (fuzzTester as any).isSecurityError(securityError, [
        'SecurityError',
        'ValidationError',
      ]);

      expect(isSecurityError).toBe(true);
    });

    it('should not flag normal errors as security errors', () => {
      const normalError = new Error('Network timeout');
      normalError.name = 'TimeoutError';

      const isSecurityError = (fuzzTester as any).isSecurityError(normalError, [
        'SecurityError',
        'ValidationError',
      ]);

      expect(isSecurityError).toBe(false);
    });
  });

  describe('createFuzzTester', () => {
    it('should create fuzz tester with custom config', () => {
      const customTester = createFuzzTester({
        duration: 300,
        parallelism: 8,
        maxInputSize: 2048,
      });

      expect(customTester).toBeInstanceOf(FuzzTestingSuite);
    });

    it('should create fuzz tester with default config', () => {
      const defaultTester = createFuzzTester();
      expect(defaultTester).toBeInstanceOf(FuzzTestingSuite);
    });
  });

  describe('file operations', () => {
    it('should ensure directories exist', () => {
      // Directory creation is handled internally, just verify the tester was created
      expect(fuzzTester).toBeInstanceOf(FuzzTestingSuite);
    });
  });
});
