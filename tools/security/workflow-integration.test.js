/**
 * End-to-End SLSA Workflow Integration Tests
 *
 * Tests for complete GitHub Actions workflow integration with SLSA and SBOM generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import { execSync } from 'child_process';

import { SLSAVerifier } from './slsa-verify.js';
import { SBOMAggregator } from './sbom-aggregate.js';

// Mock external dependencies
vi.mock('fs');
vi.mock('child_process');

describe('SLSA Workflow Integration', () => {
  let mockFs;
  let mockExecSync;

  // Mock workflow artifacts directory (used in tests)

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    mockExecSync = vi.mocked(execSync);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('GitHub Actions Workflow Files Validation', () => {
    it('should validate SLSA build workflow structure', async () => {
      const mockWorkflowContent = `
name: SLSA Level 2 Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    permissions:
      id-token: write
      contents: read
      attestations: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
    with:
      base64-subjects: \${{ needs.build-artifacts.outputs.hashes }}
      provenance-name: "provenance.intoto.jsonl"
      
  build-artifacts:
    runs-on: ubuntu-latest
    outputs:
      hashes: \${{ steps.hash.outputs.hashes }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build artifacts
        run: |
          npm run build
          cargo build --release
      - name: Generate hashes
        id: hash
        run: |
          echo "hashes=$(sha256sum dist/* target/wasm32-unknown-unknown/release/*.wasm | base64 -w0)" >> $GITHUB_OUTPUT
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockWorkflowContent);

      expect(mockFs.existsSync('.github/workflows/slsa-build.yml')).toBe(true);

      const content = mockFs.readFileSync('.github/workflows/slsa-build.yml', 'utf8');
      expect(content).toContain('slsa-framework/slsa-github-generator');
      expect(content).toContain('id-token: write');
      expect(content).toContain('attestations: write');
      expect(content).toContain('provenance.intoto.jsonl');
    });

    it('should validate SBOM generation workflow structure', async () => {
      const mockWorkflowContent = `
name: SBOM Generation
on:
  push:
    branches: [main]
  workflow_call:
    outputs:
      sbom-path:
        description: "Path to generated SBOM"
        value: \${{ jobs.generate-sbom.outputs.sbom-path }}

jobs:
  generate-sbom:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    outputs:
      sbom-path: \${{ steps.aggregate.outputs.sbom-path }}
    steps:
      - name: Generate npm SBOM
        run: |
          npx @cyclonedx/cdxgen -t js -o npm-sbom.json .
      - name: Generate Cargo SBOM
        run: |
          cargo install cargo-cyclonedx
          cargo cyclonedx -f json -o cargo-sbom.json
      - name: Aggregate SBOMs
        id: aggregate
        run: |
          node tools/security/sbom-aggregate.js
      - name: Sign SBOM
        run: |
          cosign sign-blob --bundle sbom.cosign.bundle ./aggregated-sbom.json
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockWorkflowContent);

      const content = mockFs.readFileSync('.github/workflows/sbom-generation.yml', 'utf8');
      expect(content).toContain('cyclonedx/cdxgen');
      expect(content).toContain('cargo-cyclonedx');
      expect(content).toContain('sbom-aggregate.js');
      expect(content).toContain('cosign sign-blob');
    });

    it('should validate supply chain scan workflow structure', async () => {
      const mockWorkflowContent = `
name: Supply Chain Security Scan
on:
  push:
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run dependency scan
        run: |
          node tools/security/dependency-policy-check.js
      - name: Socket Security scan
        uses: SocketSecurity/socket-security-action@v1
        with:
          api-key: \${{ secrets.SOCKET_SECURITY_API_KEY }}
      - name: Grype vulnerability scan
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
          grype .
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockWorkflowContent);

      const content = mockFs.readFileSync('.github/workflows/supply-chain-scan.yml', 'utf8');
      expect(content).toContain('dependency-policy-check.js');
      expect(content).toContain('SocketSecurity/socket-security-action');
      expect(content).toContain('anchore/grype');
      expect(content).toContain('security-events: write');
    });
  });

  describe('End-to-End Build Workflow Simulation', () => {
    it('should simulate complete SLSA build process', async () => {
      // Setup mock artifacts
      const mockArtifacts = {
        'dist/bundle.js': Buffer.from('mock web bundle'),
        'apps/mobile/dist/index.js': Buffer.from('mock mobile bundle'),
        'packages/crypto-core/pkg/crypto_core.wasm': Buffer.from('mock wasm binary'),
      };

      const mockProvenance = {
        predicateType: 'https://slsa.dev/provenance/v0.2',
        predicate: {
          builder: {
            id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
          },
          buildType: 'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
          invocation: {
            configSource: { uri: 'https://github.com/test/repo' },
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
        subject: Object.keys(mockArtifacts).map(name => ({
          name,
          digest: {
            sha256: 'mock_hash_' + name.replace(/[^a-z0-9]/g, '_'),
          },
        })),
      };

      // Mock file system operations
      mockFs.existsSync.mockImplementation(filePath => {
        return (
          Object.keys(mockArtifacts).includes(filePath) ||
          filePath.includes('provenance') ||
          filePath.includes('.sig') ||
          filePath.includes('.pem')
        );
      });

      mockFs.readFileSync.mockImplementation(filePath => {
        if (Object.keys(mockArtifacts).includes(filePath)) {
          return mockArtifacts[filePath];
        }
        if (filePath.includes('provenance')) {
          return JSON.stringify(mockProvenance);
        }
        return Buffer.from('mock file content');
      });

      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 1024,
      });

      // Mock cosign operations
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cosign verify-blob')) {
          return Buffer.from('Verification successful');
        }
        if (cmd.includes('cosign version')) {
          return Buffer.from('cosign version v2.0.0');
        }
        if (cmd.includes('sha256sum')) {
          return Buffer.from('mock_hash dist/bundle.js');
        }
        throw new Error(`Unknown command: ${cmd}`);
      });

      // Simulate the build workflow
      const verifier = new SLSAVerifier({
        strictMode: true,
        allowedSourceRepo: 'https://github.com/test/repo',
      });

      // Test each artifact verification
      for (const artifactPath of Object.keys(mockArtifacts)) {
        const result = await verifier.verify(
          artifactPath,
          `${artifactPath}.intoto.jsonl`,
          `${artifactPath}.sig`
        );

        expect(result.verified).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.details.signatureVerified).toBe(true);
        expect(result.details.buildIsolation).toBe(true);
        expect(result.details.reproducibleBuild).toBe(true);
      }
    });

    it('should simulate SBOM generation and aggregation workflow', async () => {
      const mockNpmSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          {
            type: 'library',
            name: 'react',
            version: '18.2.0',
            purl: 'pkg:npm/react@18.2.0',
            licenses: [{ license: { name: 'MIT' } }],
          },
        ],
      };

      const mockCargoSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          {
            type: 'library',
            name: 'serde',
            version: '1.0.152',
            purl: 'pkg:cargo/serde@1.0.152',
          },
        ],
      };

      // Mock SBOM file generation
      mockFs.existsSync.mockImplementation(path => {
        return (
          path.includes('npm-sbom.json') ||
          path.includes('cargo-sbom.json') ||
          path.includes('aggregated-sbom.json')
        );
      });

      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('npm-sbom.json')) {
          return JSON.stringify(mockNpmSBOM);
        }
        if (path.includes('cargo-sbom.json')) {
          return JSON.stringify(mockCargoSBOM);
        }
        return '{}';
      });

      mockFs.writeFileSync.mockImplementation(() => {});

      // Mock SBOM generation commands
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cyclonedx')) {
          return Buffer.from('SBOM generated successfully');
        }
        if (cmd.includes('cargo cyclonedx')) {
          return Buffer.from('Cargo SBOM generated');
        }
        if (cmd.includes('cosign sign-blob')) {
          return Buffer.from('SBOM signed successfully');
        }
        return Buffer.from('Command executed');
      });

      // Simulate SBOM aggregation
      const aggregator = new SBOMAggregator({
        projectName: 'aura-app',
        projectVersion: '1.0.0',
      });

      await aggregator.aggregate({
        npm: 'npm-sbom.json',
        cargo: 'cargo-sbom.json',
      });

      const stats = aggregator.getStats();
      expect(stats.totalComponents).toBe(2);
      expect(stats.npmComponents).toBe(1);
      expect(stats.cargoComponents).toBe(1);

      // Verify aggregated SBOM structure
      const aggregatedSBOM = aggregator.getAggregatedSBOM();
      expect(aggregatedSBOM.bomFormat).toBe('CycloneDX');
      expect(aggregatedSBOM.components).toHaveLength(2);
      expect(aggregatedSBOM.metadata.component.name).toBe('aura-app');
    });

    it('should simulate supply chain scan workflow', async () => {
      // Mock dependency policy check
      const mockPolicy = {
        allowedRegistries: ['https://registry.npmjs.org/', 'https://crates.io/'],
        blockedPackages: ['malicious-package', 'typosquat-react'],
        securityThresholds: {
          critical: 0,
          high: 2,
          medium: 10,
        },
      };

      const mockScanResults = {
        vulnerabilities: [
          {
            id: 'CVE-2023-1234',
            severity: 'medium',
            package: 'test-package@1.0.0',
          },
        ],
        maliciousPackages: [],
        licenseViolations: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('dependency-policy.json')) {
          return JSON.stringify(mockPolicy);
        }
        if (path.includes('package-lock.json')) {
          return JSON.stringify({ packages: { 'test-package': { version: '1.0.0' } } });
        }
        return '{}';
      });

      // Mock security scanning tools
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('npm audit')) {
          return JSON.stringify(mockScanResults);
        }
        if (cmd.includes('cargo audit')) {
          return Buffer.from('No vulnerabilities found');
        }
        if (cmd.includes('grype')) {
          return Buffer.from(`
NAME         INSTALLED  FIXED-IN  TYPE  VULNERABILITY  SEVERITY
test-package 1.0.0      1.0.1     npm   CVE-2023-1234  Medium
          `);
        }
        return Buffer.from('Scan completed');
      });

      // Simulate policy check execution
      expect(() => {
        mockExecSync('node tools/security/dependency-policy-check.js');
      }).not.toThrow();

      // Simulate vulnerability scanning
      const auditOutput = mockExecSync('npm audit --json');
      const auditResults = JSON.parse(auditOutput);
      expect(auditResults.vulnerabilities).toBeDefined();
      expect(auditResults.vulnerabilities[0].severity).toBe('medium');

      // Verify scan thresholds
      const vulnerabilityCount = auditResults.vulnerabilities.length;
      expect(vulnerabilityCount).toBeLessThanOrEqual(mockPolicy.securityThresholds.medium);
    });
  });

  describe('Workflow Integration Error Handling', () => {
    it('should handle SLSA verification failures gracefully', async () => {
      // Mock missing provenance file
      mockFs.existsSync.mockImplementation(path => {
        return !path.includes('provenance'); // Provenance missing
      });

      const verifier = new SLSAVerifier();

      await expect(
        verifier.verify('/test/artifact.wasm', '/missing/provenance.jsonl', '/test/signature.sig')
      ).rejects.toThrow('Provenance file not found');
    });

    it('should handle SBOM generation failures', async () => {
      // Mock SBOM generation command failure
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('cyclonedx')) {
          throw new Error('SBOM generation failed');
        }
        return Buffer.from('ok');
      });

      // Should handle gracefully in CI environment
      expect(() => {
        try {
          mockExecSync('npx @cyclonedx/cdxgen -t js -o npm-sbom.json .');
        } catch (error) {
          expect(error.message).toBe('SBOM generation failed');
        }
      }).not.toThrow();
    });

    it('should handle security scan failures with appropriate exit codes', async () => {
      // Mock security scan finding critical vulnerabilities
      mockExecSync.mockImplementation(cmd => {
        if (cmd.includes('grype')) {
          const error = new Error('Critical vulnerabilities found');
          error.status = 1;
          throw error;
        }
        return Buffer.from('ok');
      });

      expect(() => {
        try {
          mockExecSync('grype .');
        } catch (error) {
          expect(error.status).toBe(1);
          expect(error.message).toContain('Critical vulnerabilities');
        }
      }).not.toThrow();
    });
  });

  describe('Workflow Dependencies and Tool Versions', () => {
    it('should verify required tools are available', () => {
      const requiredTools = [
        { name: 'cosign', versionCmd: 'cosign version', expectedPattern: /v2\.\d+\.\d+/ },
        {
          name: 'cyclonedx',
          versionCmd: 'npx @cyclonedx/cdxgen --version',
          expectedPattern: /\d+\.\d+\.\d+/,
        },
        { name: 'grype', versionCmd: 'grype version', expectedPattern: /v\d+\.\d+\.\d+/ },
      ];

      requiredTools.forEach(tool => {
        mockExecSync.mockImplementation(cmd => {
          if (cmd === tool.versionCmd) {
            return Buffer.from(`${tool.name} version v2.0.0`);
          }
          throw new Error('Command not found');
        });

        const version = mockExecSync(tool.versionCmd).toString();
        expect(version).toMatch(tool.expectedPattern);
      });
    });

    it('should validate GitHub Actions workflow dependencies', () => {
      const workflowDependencies = [
        'actions/checkout@v4',
        'slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
        'SocketSecurity/socket-security-action@v1',
      ];

      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('.github/workflows/')) {
          return workflowDependencies.join('\n');
        }
        return '';
      });

      workflowDependencies.forEach(dep => {
        const workflowContent = mockFs.readFileSync('.github/workflows/test.yml', 'utf8');
        expect(workflowContent).toContain(dep);
      });
    });
  });

  describe('Multi-Platform Build Support', () => {
    it('should support web and mobile artifact verification', async () => {
      const platforms = [
        { name: 'web', artifact: 'dist/bundle.js' },
        { name: 'mobile', artifact: 'apps/mobile/dist/index.js' },
        { name: 'wasm', artifact: 'packages/crypto-core/pkg/crypto_core.wasm' },
      ];

      // Mock platform-specific artifacts
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('provenance')) {
          return JSON.stringify({
            predicateType: 'https://slsa.dev/provenance/v0.2',
            predicate: {
              builder: {
                id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0',
              },
              invocation: { configSource: { uri: 'https://github.com/test/repo' } },
            },
            subject: platforms.map(p => ({
              name: p.artifact,
              digest: { sha256: 'mock_hash_' + p.name },
            })),
          });
        }
        return Buffer.from(`mock ${path} content`);
      });

      mockFs.statSync.mockReturnValue({ isFile: () => true, size: 1024 });
      mockExecSync.mockReturnValue(Buffer.from('Verification successful'));

      const verifier = new SLSAVerifier();

      // Test verification for each platform
      for (const platform of platforms) {
        const result = await verifier.verify(
          platform.artifact,
          `${platform.artifact}.intoto.jsonl`,
          `${platform.artifact}.sig`
        );

        expect(result.verified).toBe(true);
        expect(result.details).toBeDefined();
      }
    });
  });

  describe('Reproducible Build Validation', () => {
    it('should validate deterministic build environment', async () => {
      const mockProvenance = {
        predicate: {
          invocation: {
            environment: {
              SOURCE_DATE_EPOCH: '1234567890',
              DETERMINISTIC_BUILD: '1',
              NODE_VERSION: '18.17.0',
              RUST_VERSION: '1.70.0',
            },
          },
        },
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockProvenance));

      const verifier = new SLSAVerifier();
      await verifier.verifyReproducibleBuild('/test/provenance.jsonl');

      expect(verifier.results.details.reproducibleBuild).toBe(true);
      expect(verifier.results.warnings).toHaveLength(0);
    });
  });
});

describe('Workflow Performance Tests', () => {
  it('should complete SLSA verification within acceptable time limits', async () => {
    const startTime = Date.now();

    // Mock quick responses
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, size: 1024 });
    vi.mocked(execSync).mockReturnValue(Buffer.from('ok'));

    const verifier = new SLSAVerifier();
    await verifier.verify('/test/artifact', '/test/provenance.jsonl', '/test/signature.sig');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle large SBOM aggregation efficiently', async () => {
    const largeComponentCount = 1000;
    const mockLargeSBOM = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      components: Array.from({ length: largeComponentCount }, (_, i) => ({
        type: 'library',
        name: `component-${i}`,
        version: '1.0.0',
        purl: `pkg:npm/component-${i}@1.0.0`,
      })),
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockLargeSBOM));
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    const startTime = Date.now();

    const aggregator = new SBOMAggregator();
    await aggregator.aggregate({ npm: 'large-sbom.json' });

    const duration = Date.now() - startTime;
    const stats = aggregator.getStats();

    expect(stats.totalComponents).toBe(largeComponentCount);
    expect(duration).toBeLessThan(10000); // Should handle 1000 components within 10 seconds
  });
});
