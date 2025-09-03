/**
 * SLSA Verification Tests
 *
 * Tests for SLSA Level 2 provenance verification script
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { execSync } from 'child_process';
import { SLSAVerifier } from './slsa-verify.js';

// Mock fs and execSync for testing
vi.mock('fs');
vi.mock('child_process');

describe('SLSA Verifier', () => {
  let verifier;
  let mockFs;
  let mockExecSync;

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    mockExecSync = vi.mocked(execSync);

    verifier = new SLSAVerifier({
      strictMode: true,
      allowedSourceRepo: 'https://github.com/test/repo',
      requiredSLSALevel: 2,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Artifact Verification', () => {
    it('should verify artifact exists and calculate hash', async () => {
      const testContent = Buffer.from('test artifact content');
      const expectedHash = 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: testContent.length,
      });
      mockFs.readFileSync.mockReturnValue(testContent);

      await verifier.verifyArtifactExists('/test/artifact.wasm');

      expect(verifier.results.details.artifactHash).toBe(expectedHash);
      expect(verifier.results.details.artifactSize).toBe(testContent.length);
    });

    it('should fail if artifact does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(verifier.verifyArtifactExists('/nonexistent/artifact.wasm')).rejects.toThrow(
        'Artifact not found'
      );
    });

    it('should fail if artifact is not a file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
      });

      await expect(verifier.verifyArtifactExists('/test/directory')).rejects.toThrow(
        'Artifact is not a file'
      );
    });
  });

  describe('Provenance Verification', () => {
    const mockProvenance = {
      predicateType: 'https://slsa.dev/provenance/v0.2',
      predicate: {
        builder: {
          id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
        },
        buildType: 'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
        invocation: {
          configSource: {
            uri: 'https://github.com/test/repo',
          },
        },
        metadata: {
          buildStartedOn: new Date().toISOString(),
          reproducible: true,
        },
      },
      subject: [
        {
          name: 'test.wasm',
          digest: {
            sha256: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
          },
        },
      ],
    };

    it('should verify valid SLSA provenance', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyProvenance('/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toHaveLength(0);
      expect(verifier.results.details.provenance).toBeDefined();
      expect(verifier.results.details.provenance.builderVersion).toContain('slsa-github-generator');
    });

    it('should fail with invalid predicate type', async () => {
      const invalidProvenance = {
        ...mockProvenance,
        predicateType: 'invalid-type',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidProvenance));

      await verifier.verifyProvenance('/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual(
        expect.stringContaining('Invalid predicate type')
      );
    });

    it('should fail with unauthorized source repository', async () => {
      const unauthorizedProvenance = {
        ...mockProvenance,
        predicate: {
          ...mockProvenance.predicate,
          invocation: {
            configSource: {
              uri: 'https://github.com/malicious/repo',
            },
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(unauthorizedProvenance));

      await verifier.verifyProvenance('/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual(
        expect.stringContaining('Unauthorized source repository')
      );
    });

    it('should warn about old build timestamp', async () => {
      const oldBuildTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const oldProvenance = {
        ...mockProvenance,
        predicate: {
          ...mockProvenance.predicate,
          metadata: {
            ...mockProvenance.predicate.metadata,
            buildStartedOn: oldBuildTime.toISOString(),
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(oldProvenance));

      await verifier.verifyProvenance('/test/provenance.intoto.jsonl');

      expect(verifier.results.warnings).toContainEqual(
        expect.stringContaining('Artifact age exceeds maximum')
      );
    });

    it('should fail with future build timestamp', async () => {
      const futureBuildTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const futureProvenance = {
        ...mockProvenance,
        predicate: {
          ...mockProvenance.predicate,
          metadata: {
            ...mockProvenance.predicate.metadata,
            buildStartedOn: futureBuildTime.toISOString(),
          },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(futureProvenance));

      await verifier.verifyProvenance('/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual('Build timestamp is in the future');
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid Sigstore signature', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // signature file
        .mockReturnValueOnce(true); // certificate file
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cosign verify-blob')) {
          return Buffer.from('Verification successful');
        }
        if (cmd.includes('cosign version')) {
          return Buffer.from('cosign version v2.0.0');
        }
        throw new Error('Command not found');
      });

      await verifier.verifySignature('/test/artifact.wasm', '/test/artifact.wasm.sig');

      expect(verifier.results.details.signatureVerified).toBe(true);
      expect(verifier.results.errors).toHaveLength(0);
    });

    it('should fail with invalid signature', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // signature file
        .mockReturnValueOnce(true); // certificate file
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cosign verify-blob')) {
          throw new Error('Signature verification failed');
        }
        if (cmd.includes('cosign version')) {
          return Buffer.from('cosign version v2.0.0');
        }
        throw new Error('Command not found');
      });

      await verifier.verifySignature('/test/artifact.wasm', '/test/artifact.wasm.sig');

      expect(verifier.results.errors).toContainEqual(
        expect.stringContaining('Signature verification failed')
      );
    });

    it('should warn when cosign is not installed', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // signature file
        .mockReturnValueOnce(true); // certificate file
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      await verifier.verifySignature('/test/artifact.wasm', '/test/artifact.wasm.sig');

      expect(verifier.results.warnings).toContainEqual(
        'cosign not installed - signature verification skipped'
      );
    });

    it('should fail if signature file not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(
        verifier.verifySignature('/test/artifact.wasm', '/test/nonexistent.sig')
      ).rejects.toThrow('Signature file not found');
    });

    it('should fail if certificate file not found', async () => {
      mockFs.existsSync
        .mockReturnValueOnce(true) // signature file exists
        .mockReturnValueOnce(false); // certificate file doesn't exist

      await expect(
        verifier.verifySignature('/test/artifact.wasm', '/test/artifact.wasm.sig')
      ).rejects.toThrow('Certificate file not found');
    });
  });

  describe('Hash Cross-Verification', () => {
    it('should pass when artifact hash matches provenance', async () => {
      const mockProvenance = {
        subject: [
          {
            name: 'artifact.wasm',
            digest: {
              sha256: 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78',
            },
          },
        ],
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));
      verifier.results.details.artifactHash =
        'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78';

      await verifier.crossVerifyHashes('/test/artifact.wasm', '/test/provenance.intoto.jsonl');

      expect(verifier.results.details.hashVerified).toBe(true);
      expect(verifier.results.errors).toHaveLength(0);
    });

    it('should fail when artifact hash does not match provenance', async () => {
      const mockProvenance = {
        subject: [
          {
            name: 'artifact.wasm',
            digest: {
              sha256: 'different_hash',
            },
          },
        ],
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));
      verifier.results.details.artifactHash =
        'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78';

      await verifier.crossVerifyHashes('/test/artifact.wasm', '/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual(expect.stringContaining('Hash mismatch'));
    });

    it('should fail when artifact not found in provenance subjects', async () => {
      const mockProvenance = {
        subject: [
          {
            name: 'different_artifact.wasm',
            digest: {
              sha256: 'some_hash',
            },
          },
        ],
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.crossVerifyHashes('/test/artifact.wasm', '/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual(
        'Artifact not found in provenance subjects: artifact.wasm'
      );
    });
  });

  describe('Build Environment Verification', () => {
    it('should verify GitHub Actions build environment', async () => {
      const mockProvenance = {
        predicate: {
          builder: {
            id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
          },
          invocation: {
            parameters: ['--frozen-lockfile'],
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyBuildEnvironment('/test/provenance.intoto.jsonl');

      expect(verifier.results.details.buildIsolation).toBe(true);
      expect(verifier.results.errors).toHaveLength(0);
    });

    it('should fail with non-GitHub Actions builder', async () => {
      const mockProvenance = {
        predicate: {
          builder: {
            id: 'https://suspicious-builder.com/builder',
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyBuildEnvironment('/test/provenance.intoto.jsonl');

      expect(verifier.results.errors).toContainEqual(
        'Build environment is not GitHub Actions (required for isolation)'
      );
    });

    it('should warn about potentially non-hermetic builds', async () => {
      const mockProvenance = {
        predicate: {
          builder: {
            id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
          },
          invocation: {
            parameters: ['--some-other-param'], // No frozen-lockfile
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyBuildEnvironment('/test/provenance.intoto.jsonl');

      expect(verifier.results.warnings).toContainEqual(
        'Build may not be fully hermetic (dependencies not frozen)'
      );
    });
  });

  describe('Reproducible Build Verification', () => {
    it('should verify reproducible build requirements', async () => {
      const mockProvenance = {
        predicate: {
          invocation: {
            environment: {
              SOURCE_DATE_EPOCH: '1234567890',
              DETERMINISTIC_BUILD: '1',
            },
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyReproducibleBuild('/test/provenance.intoto.jsonl');

      expect(verifier.results.details.reproducibleBuild).toBe(true);
      expect(verifier.results.warnings).toHaveLength(0);
    });

    it('should warn about missing SOURCE_DATE_EPOCH', async () => {
      const mockProvenance = {
        predicate: {
          invocation: {
            environment: {
              DETERMINISTIC_BUILD: '1',
              // Missing SOURCE_DATE_EPOCH
            },
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyReproducibleBuild('/test/provenance.intoto.jsonl');

      expect(verifier.results.warnings).toContainEqual(
        'SOURCE_DATE_EPOCH not set (may affect build reproducibility)'
      );
    });

    it('should warn about missing DETERMINISTIC_BUILD flag', async () => {
      const mockProvenance = {
        predicate: {
          invocation: {
            environment: {
              SOURCE_DATE_EPOCH: '1234567890',
              // Missing DETERMINISTIC_BUILD
            },
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      await verifier.verifyReproducibleBuild('/test/provenance.intoto.jsonl');

      expect(verifier.results.warnings).toContainEqual('DETERMINISTIC_BUILD flag not set');
    });
  });

  describe('End-to-End Verification', () => {
    it('should pass full SLSA Level 2 verification', async () => {
      // Mock all file operations
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 1024,
      });

      const testContent = Buffer.from('test content');
      const expectedHash = 'b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78';

      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('provenance')) {
          return JSON.stringify({
            predicateType: 'https://slsa.dev/provenance/v0.2',
            predicate: {
              builder: {
                id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
              },
              buildType: 'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
              invocation: {
                configSource: {
                  uri: 'https://github.com/test/repo',
                },
                environment: {
                  SOURCE_DATE_EPOCH: '1234567890',
                  DETERMINISTIC_BUILD: '1',
                },
                parameters: ['--frozen-lockfile'],
              },
              metadata: {
                buildStartedOn: new Date().toISOString(),
                reproducible: true,
              },
            },
            subject: [
              {
                name: 'artifact.wasm',
                digest: {
                  sha256: expectedHash,
                },
              },
            ],
          });
        }
        return testContent;
      });

      // Mock cosign success
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cosign verify-blob')) {
          return Buffer.from('Verification successful');
        }
        if (cmd.includes('cosign version')) {
          return Buffer.from('cosign version v2.0.0');
        }
        throw new Error('Command not found');
      });

      const result = await verifier.verify(
        '/test/artifact.wasm',
        '/test/provenance.intoto.jsonl',
        '/test/artifact.wasm.sig'
      );

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.details.artifactHash).toBe(expectedHash);
      expect(result.details.signatureVerified).toBe(true);
      expect(result.details.hashVerified).toBe(true);
      expect(result.details.buildIsolation).toBe(true);
      expect(result.details.reproducibleBuild).toBe(true);
    });

    it('should fail verification with critical errors', async () => {
      mockFs.existsSync.mockReturnValue(false); // Artifact not found

      const result = await verifier.verify(
        '/test/nonexistent.wasm',
        '/test/provenance.intoto.jsonl',
        '/test/artifact.wasm.sig'
      );

      expect(result.verified).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive verification report', () => {
      // Set up mock results
      verifier.results = {
        verified: true,
        errors: [],
        warnings: ['Test warning'],
        details: {
          artifactHash: 'test_hash',
          signatureVerified: true,
          hashVerified: true,
          buildIsolation: true,
          reproducibleBuild: true,
        },
      };

      const report = verifier.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('verified', true);
      expect(report).toHaveProperty('slsaLevel', 2);
      expect(report.summary).toHaveProperty('errors', 0);
      expect(report.summary).toHaveProperty('warnings', 1);
      expect(report.summary.checks).toHaveProperty('artifactExists', true);
      expect(report.summary.checks).toHaveProperty('provenanceValid', true);
      expect(report.summary.checks).toHaveProperty('signatureVerified', true);
      expect(report.summary.checks).toHaveProperty('hashMatches', true);
      expect(report.summary.checks).toHaveProperty('buildIsolated', true);
      expect(report.summary.checks).toHaveProperty('reproducible', true);
    });

    it('should generate failed verification report', () => {
      // Set up mock results with errors
      verifier.results = {
        verified: false,
        errors: ['Critical error', 'Another error'],
        warnings: [],
        details: {},
      };

      const report = verifier.generateReport();

      expect(report.verified).toBe(false);
      expect(report.summary.errors).toBe(2);
      expect(report.summary.warnings).toBe(0);
      expect(report.errors).toEqual(['Critical error', 'Another error']);
    });
  });

  describe('Utility Functions', () => {
    it('should get nested object properties correctly', () => {
      const testObj = {
        level1: {
          level2: {
            level3: 'value',
          },
        },
      };

      expect(verifier.getNestedProperty(testObj, 'level1.level2.level3')).toBe('value');
      expect(verifier.getNestedProperty(testObj, 'level1.level2.nonexistent')).toBeUndefined();
      expect(verifier.getNestedProperty(testObj, 'nonexistent.level2.level3')).toBeUndefined();
    });
  });
});

// Integration tests (require real environment setup)
describe('SLSA Verifier Integration', () => {
  it.skip('should verify real SLSA artifacts (requires setup)', async () => {
    // This test would require real SLSA artifacts and would be run in CI
    const verifier = new SLSAVerifier();

    const result = await verifier.verify(
      process.env.TEST_ARTIFACT_PATH,
      process.env.TEST_PROVENANCE_PATH,
      process.env.TEST_SIGNATURE_PATH
    );

    expect(result.verified).toBe(true);
  });
});
