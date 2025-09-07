import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SRIHashGenerator } from '../../../security/sri-hash-generator';
import { createHash } from 'crypto';

describe('SRI Hash Generation', () => {
  let generator: SRIHashGenerator;
  const testOutputDir = '/tmp/test-build';

  beforeEach(() => {
    generator = new SRIHashGenerator(testOutputDir);
  });

  describe('Hash Generation', () => {
    it('should generate SHA384 hash for string content', async () => {
      const content = 'console.log("Hello, World!");';
      const hash = await generator.generateHash(content, 'sha384');

      // Verify hash format
      expect(hash).toMatch(/^sha384-[A-Za-z0-9+\/]+=*$/);

      // Verify hash correctness
      const expectedHash = createHash('sha384').update(content).digest('base64');
      expect(hash).toBe(`sha384-${expectedHash}`);
    });

    it('should generate SHA256 hash for string content', async () => {
      const content = 'body { margin: 0; }';
      const hash = await generator.generateHash(content, 'sha256');

      expect(hash).toMatch(/^sha256-[A-Za-z0-9+\/]+=*$/);

      const expectedHash = createHash('sha256').update(content).digest('base64');
      expect(hash).toBe(`sha256-${expectedHash}`);
    });

    it('should generate SHA512 hash for string content', async () => {
      const content = 'function test() { return true; }';
      const hash = await generator.generateHash(content, 'sha512');

      expect(hash).toMatch(/^sha512-[A-Za-z0-9+\/]+=*$/);

      const expectedHash = createHash('sha512').update(content).digest('base64');
      expect(hash).toBe(`sha512-${expectedHash}`);
    });

    it('should generate hash for Buffer content', async () => {
      const buffer = Buffer.from('test content', 'utf8');
      const hash = await generator.generateHash(buffer, 'sha384');

      expect(hash).toMatch(/^sha384-[A-Za-z0-9+\/]+=*$/);

      const expectedHash = createHash('sha384').update(buffer).digest('base64');
      expect(hash).toBe(`sha384-${expectedHash}`);
    });

    it('should generate consistent hashes for same content', async () => {
      const content = 'consistent content test';

      const hash1 = await generator.generateHash(content);
      const hash2 = await generator.generateHash(content);
      const hash3 = await generator.generateHash(Buffer.from(content));

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
    });

    it('should generate different hashes for different content', async () => {
      const content1 = 'first content';
      const content2 = 'second content';

      const hash1 = await generator.generateHash(content1);
      const hash2 = await generator.generateHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different algorithms', async () => {
      const content = 'algorithm test content';

      const sha256Hash = await generator.generateHash(content, 'sha256');
      const sha384Hash = await generator.generateHash(content, 'sha384');
      const sha512Hash = await generator.generateHash(content, 'sha512');

      expect(sha256Hash).toMatch(/^sha256-/);
      expect(sha384Hash).toMatch(/^sha384-/);
      expect(sha512Hash).toMatch(/^sha512-/);

      expect(sha256Hash).not.toBe(sha384Hash);
      expect(sha384Hash).not.toBe(sha512Hash);
      expect(sha256Hash).not.toBe(sha512Hash);
    });
  });

  describe('Hash Validation', () => {
    it('should validate correct hash', async () => {
      const content = 'validation test content';
      const hash = await generator.generateHash(content, 'sha384');

      const isValid = generator.validateHash(content, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect hash', async () => {
      const content = 'validation test content';
      const wrongHash = 'sha384-incorrectHashValue123';

      const isValid = generator.validateHash(content, wrongHash);
      expect(isValid).toBe(false);
    });

    it('should reject hash with wrong algorithm', async () => {
      const content = 'validation test content';
      const sha256Hash = await generator.generateHash(content, 'sha256');

      // Try to validate with different algorithm prefix
      const wrongAlgorithmHash = sha256Hash.replace('sha256', 'sha384');
      const isValid = generator.validateHash(content, wrongAlgorithmHash);
      expect(isValid).toBe(false);
    });

    it('should reject malformed hash', async () => {
      const content = 'validation test content';
      const malformedHashes = ['invalid-hash', 'sha384', 'sha384-', 'notsha384-validhash', ''];

      malformedHashes.forEach(hash => {
        const isValid = generator.validateHash(content, hash);
        expect(isValid).toBe(false);
      });
    });

    it('should handle buffer and string content consistently', async () => {
      const stringContent = 'consistent validation test';
      const bufferContent = Buffer.from(stringContent);
      const hash = await generator.generateHash(stringContent, 'sha384');

      const stringValid = generator.validateHash(stringContent, hash);
      const bufferValid = generator.validateHash(bufferContent, hash);

      expect(stringValid).toBe(true);
      expect(bufferValid).toBe(true);
    });
  });

  describe('Resource Verification', () => {
    beforeEach(() => {
      // Mock the manifest with test resources
      const mockManifest = {
        version: '1.0',
        buildTimestamp: new Date().toISOString(),
        resources: [
          {
            url: '/test.js',
            algorithm: 'sha384' as const,
            hash: 'sha384-testHashValue',
            crossorigin: 'anonymous' as const,
          },
        ],
      };

      // Set the manifest directly
      (generator as any).manifest = mockManifest;
    });

    it('should verify resource with correct hash', async () => {
      const content = 'test content';
      const correctHash = await generator.generateHash(content, 'sha384');

      // Update manifest with correct hash
      (generator as any).manifest.resources[0].hash = correctHash;

      const result = await generator.verifyResource('/test.js', content);

      expect(result.valid).toBe(true);
      expect(result.expectedHash).toBe(correctHash);
      expect(result.error).toBeUndefined();
    });

    it('should reject resource with incorrect hash', async () => {
      const content = 'test content';
      const correctHash = await generator.generateHash(content, 'sha384');
      const wrongHash = await generator.generateHash('wrong content', 'sha384');

      // Set wrong hash in manifest
      (generator as any).manifest.resources[0].hash = wrongHash;

      const result = await generator.verifyResource('/test.js', content);

      expect(result.valid).toBe(false);
      expect(result.expectedHash).toBe(wrongHash);
      expect(result.actualHash).toBe(correctHash);
      expect(result.error).toBe('Hash mismatch');
    });

    it('should handle missing resource in manifest', async () => {
      const result = await generator.verifyResource('/missing.js', 'content');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No SRI hash found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const hash = await generator.generateHash('', 'sha384');
      expect(hash).toMatch(/^sha384-/);

      const isValid = generator.validateHash('', hash);
      expect(isValid).toBe(true);
    });

    it('should handle very large content', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of 'x'
      const hash = await generator.generateHash(largeContent, 'sha384');

      expect(hash).toMatch(/^sha384-/);

      const isValid = generator.validateHash(largeContent, hash);
      expect(isValid).toBe(true);
    });

    it('should handle unicode content', async () => {
      const unicodeContent = '🚀 Unicode test content with émojis and spëcial chars 中文';
      const hash = await generator.generateHash(unicodeContent, 'sha384');

      expect(hash).toMatch(/^sha384-/);

      const isValid = generator.validateHash(unicodeContent, hash);
      expect(isValid).toBe(true);
    });

    it('should handle binary content', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);
      const hash = await generator.generateHash(binaryContent, 'sha384');

      expect(hash).toMatch(/^sha384-/);

      const isValid = generator.validateHash(binaryContent, hash);
      expect(isValid).toBe(true);
    });
  });
});
