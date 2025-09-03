/**
 * SBOM Aggregator Tests
 *
 * Tests for multi-ecosystem SBOM aggregation functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { SBOMAggregator } from './sbom-aggregate.js';

// Mock fs
vi.mock('fs');

describe('SBOM Aggregator', () => {
  let aggregator;
  let mockFs;

  const mockNpmSBOM = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    components: [
      {
        type: 'library',
        'bom-ref': 'react@18.2.0',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
        description: 'React library for building user interfaces',
        licenses: [{ license: { name: 'MIT' } }],
      },
      {
        type: 'library',
        'bom-ref': 'crypto-js@4.1.1',
        name: 'crypto-js',
        version: '4.1.1',
        purl: 'pkg:npm/crypto-js@4.1.1',
        description: 'JavaScript implementations of standard cryptographic algorithms',
      },
    ],
  };

  const mockCargoSBOM = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    components: [
      {
        type: 'library',
        'bom-ref': 'serde@1.0.152',
        name: 'serde',
        version: '1.0.152',
        purl: 'pkg:cargo/serde@1.0.152',
        description: 'A generic serialization/deserialization framework',
      },
      {
        type: 'library',
        'bom-ref': 'libsodium-sys@0.2.7',
        name: 'libsodium-sys',
        version: '0.2.7',
        purl: 'pkg:cargo/libsodium-sys@0.2.7',
        description: 'Low-level bindings to libsodium',
      },
    ],
  };

  const mockSpdxSBOM = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    packages: [
      {
        SPDXID: 'SPDXRef-Package-openssl',
        name: 'openssl',
        versionInfo: '1.1.1',
        downloadLocation: 'https://www.openssl.org/',
        licenseConcluded: 'Apache-2.0',
        description: 'OpenSSL cryptography library',
      },
    ],
  };

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    aggregator = new SBOMAggregator({
      projectName: 'test-project',
      projectVersion: '1.0.0',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultAggregator = new SBOMAggregator();

      expect(defaultAggregator.options.projectName).toBe('aura-app');
      expect(defaultAggregator.options.outputFormat).toBe('cyclonedx');
      expect(defaultAggregator.options.deduplication).toBe(true);
    });

    it('should initialize CycloneDX base SBOM structure', () => {
      const baseSBOM = aggregator.aggregatedSBOM;

      expect(baseSBOM.bomFormat).toBe('CycloneDX');
      expect(baseSBOM.specVersion).toBe('1.5');
      expect(baseSBOM.components).toEqual([]);
      expect(baseSBOM.metadata.component.name).toBe('test-project');
    });

    it('should initialize SPDX base SBOM structure', () => {
      const spdxAggregator = new SBOMAggregator({ outputFormat: 'spdx' });
      const baseSBOM = spdxAggregator.aggregatedSBOM;

      expect(baseSBOM.spdxVersion).toBe('SPDX-2.3');
      expect(baseSBOM.packages).toEqual([]);
      expect(baseSBOM.documentName).toBe('aura-app-sbom');
    });
  });

  describe('Component Enhancement', () => {
    it('should enhance component with ecosystem information', () => {
      const component = {
        name: 'test-component',
        version: '1.0.0',
      };

      const enhanced = aggregator.enhanceComponent(component, 'npm');

      expect(enhanced.properties).toContainEqual({
        name: 'aura:ecosystem',
        value: 'npm',
      });

      expect(enhanced['bom-ref']).toBe('npm:test-component@1.0.0');
      expect(enhanced.properties.some(p => p.name === 'aura:processed')).toBe(true);
    });

    it('should mark security-critical components', () => {
      const cryptoComponent = {
        name: 'crypto-js',
        version: '4.1.1',
        description: 'Cryptographic algorithms',
      };

      const enhanced = aggregator.enhanceComponent(cryptoComponent, 'npm');

      expect(enhanced.properties).toContainEqual({
        name: 'aura:security-critical',
        value: 'true',
      });
    });

    it('should not mark non-security components as critical', () => {
      const regularComponent = {
        name: 'lodash',
        version: '4.17.21',
        description: 'Utility library',
      };

      const enhanced = aggregator.enhanceComponent(regularComponent, 'npm');

      const isSecurityCritical = enhanced.properties.some(
        p => p.name === 'aura:security-critical' && p.value === 'true'
      );

      expect(isSecurityCritical).toBe(false);
    });
  });

  describe('Component Deduplication', () => {
    it('should add unique components', () => {
      const component1 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
      };

      const result = aggregator.addComponent(component1);

      expect(result).toBe(true);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(1);
      expect(aggregator.componentMap.size).toBe(1);
    });

    it('should deduplicate components with same purl', () => {
      const component1 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
      };

      const component2 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
        description: 'Additional description',
      };

      aggregator.addComponent(component1);
      const result = aggregator.addComponent(component2);

      expect(result).toBe(false);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(1);
      expect(aggregator.stats.duplicatesRemoved).toBe(1);
    });

    it('should merge properties during deduplication', () => {
      const component1 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
        properties: [{ name: 'prop1', value: 'value1' }],
      };

      const component2 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
        properties: [{ name: 'prop2', value: 'value2' }],
      };

      aggregator.addComponent(component1);
      aggregator.addComponent(component2);

      const storedComponent = aggregator.componentMap.get('pkg:npm/react@18.2.0');
      expect(storedComponent.properties).toHaveLength(2);
      expect(storedComponent.properties).toContainEqual({ name: 'prop1', value: 'value1' });
      expect(storedComponent.properties).toContainEqual({ name: 'prop2', value: 'value2' });
    });

    it('should allow duplicates when deduplication is disabled', () => {
      const noDedupAggregator = new SBOMAggregator({ deduplication: false });

      const component1 = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
      };

      const component2 = { ...component1 };

      noDedupAggregator.addComponent(component1);
      const result = noDedupAggregator.addComponent(component2);

      expect(result).toBe(true);
      expect(noDedupAggregator.aggregatedSBOM.components).toHaveLength(2);
    });
  });

  describe('Format Detection and Processing', () => {
    it('should detect CycloneDX format', () => {
      expect(aggregator.isCycloneDXFormat(mockNpmSBOM)).toBe(true);
      expect(aggregator.isCycloneDXFormat({ specVersion: '1.5' })).toBe(true);
    });

    it('should detect SPDX format', () => {
      expect(aggregator.isSPDXFormat(mockSpdxSBOM)).toBe(true);
      expect(aggregator.isSPDXFormat({ SPDXID: 'test' })).toBe(true);
    });

    it('should process CycloneDX SBOM correctly', () => {
      aggregator.processCycloneDXSBOM(mockNpmSBOM, 'npm');

      expect(aggregator.stats.npmComponents).toBe(2);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(2);

      const reactComponent = aggregator.aggregatedSBOM.components.find(c => c.name === 'react');
      expect(reactComponent).toBeDefined();
      expect(reactComponent['bom-ref']).toBe('npm:react@18.2.0');
    });

    it('should process SPDX SBOM correctly', () => {
      aggregator.processSPDXSBOM(mockSpdxSBOM, 'comprehensive');

      expect(aggregator.stats.comprehensiveComponents).toBe(1);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(1);

      const opensslComponent = aggregator.aggregatedSBOM.components.find(c => c.name === 'openssl');
      expect(opensslComponent).toBeDefined();
      expect(opensslComponent.version).toBe('1.1.1');
    });
  });

  describe('SPDX to CycloneDX Conversion', () => {
    it('should convert SPDX package to CycloneDX component', () => {
      const spdxPackage = {
        name: 'openssl',
        versionInfo: '1.1.1',
        description: 'OpenSSL library',
        licenseConcluded: 'Apache-2.0',
        downloadLocation: 'https://www.openssl.org/',
      };

      const component = aggregator.convertSPDXToCycloneDX(spdxPackage, 'comprehensive');

      expect(component.name).toBe('openssl');
      expect(component.version).toBe('1.1.1');
      expect(component.description).toBe('OpenSSL library');
      expect(component.licenses[0].license.name).toBe('Apache-2.0');
      expect(component.externalReferences[0].url).toBe('https://www.openssl.org/');
      expect(component.purl).toBe('pkg:generic/openssl@1.1.1');
    });

    it('should handle missing SPDX fields gracefully', () => {
      const minimalSpdxPackage = {
        name: 'test-package',
      };

      const component = aggregator.convertSPDXToCycloneDX(minimalSpdxPackage, 'npm');

      expect(component.name).toBe('test-package');
      expect(component.version).toBe('unknown');
      expect(component.purl).toBe('pkg:npm/test-package@');
    });
  });

  describe('CycloneDX to SPDX Conversion', () => {
    it('should convert CycloneDX component to SPDX package', () => {
      const component = {
        name: 'react',
        version: '18.2.0',
        description: 'React library',
        licenses: [{ license: { name: 'MIT' } }],
        externalReferences: [{ type: 'distribution', url: 'https://npmjs.com/react' }],
      };

      const spdxPackage = aggregator.convertCycloneDXToSPDX(component);

      expect(spdxPackage.name).toBe('react');
      expect(spdxPackage.versionInfo).toBe('18.2.0');
      expect(spdxPackage.description).toBe('React library');
      expect(spdxPackage.licenseConcluded).toBe('MIT');
      expect(spdxPackage.downloadLocation).toBe('https://npmjs.com/react');
      expect(spdxPackage.SPDXID).toBe('SPDXRef-Package-react');
    });
  });

  describe('Purl Generation', () => {
    it('should generate purl for npm component', () => {
      const component = { name: 'react', version: '18.2.0' };
      const purl = aggregator.generatePurl(component, 'npm');

      expect(purl).toBe('pkg:npm/react@18.2.0');
    });

    it('should generate purl for cargo component', () => {
      const component = { name: 'serde', version: '1.0.152' };
      const purl = aggregator.generatePurl(component, 'cargo');

      expect(purl).toBe('pkg:cargo/serde@1.0.152');
    });

    it('should use existing purl if available', () => {
      const component = {
        name: 'test',
        version: '1.0.0',
        purl: 'pkg:custom/test@1.0.0',
      };
      const purl = aggregator.generatePurl(component, 'npm');

      expect(purl).toBe('pkg:custom/test@1.0.0');
    });
  });

  describe('Vulnerability Merging', () => {
    beforeEach(() => {
      aggregator = new SBOMAggregator({ outputFormat: 'cyclonedx' });
    });

    it('should merge vulnerabilities from different SBOMs', () => {
      const vulnerabilities1 = [
        { id: 'CVE-2023-1234', source: { name: 'NVD', url: 'https://nvd.nist.gov/' } },
      ];

      const vulnerabilities2 = [
        { id: 'CVE-2023-5678', source: { name: 'OSV', url: 'https://osv.dev/' } },
      ];

      aggregator.mergeVulnerabilities(vulnerabilities1);
      aggregator.mergeVulnerabilities(vulnerabilities2);

      expect(aggregator.aggregatedSBOM.vulnerabilities).toHaveLength(2);
      expect(aggregator.aggregatedSBOM.vulnerabilities.map(v => v.id)).toContain('CVE-2023-1234');
      expect(aggregator.aggregatedSBOM.vulnerabilities.map(v => v.id)).toContain('CVE-2023-5678');
    });

    it('should not duplicate vulnerabilities', () => {
      const vulnerability = { id: 'CVE-2023-1234', source: { name: 'NVD' } };

      aggregator.mergeVulnerabilities([vulnerability]);
      aggregator.mergeVulnerabilities([vulnerability]);

      expect(aggregator.aggregatedSBOM.vulnerabilities).toHaveLength(1);
    });

    it('should not merge vulnerabilities in SPDX format', () => {
      const spdxAggregator = new SBOMAggregator({ outputFormat: 'spdx' });
      const vulnerabilities = [{ id: 'CVE-2023-1234' }];

      spdxAggregator.mergeVulnerabilities(vulnerabilities);

      expect(spdxAggregator.aggregatedSBOM.packages).toBeDefined();
      expect(spdxAggregator.aggregatedSBOM.vulnerabilities).toBeUndefined();
    });
  });

  describe('File I/O Operations', () => {
    it('should aggregate multiple SBOM files', async () => {
      mockFs.existsSync.mockImplementation(path => {
        return path.includes('npm-sbom.json') || path.includes('cargo-sbom.json');
      });

      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('npm-sbom.json')) {
          return JSON.stringify(mockNpmSBOM);
        } else if (path.includes('cargo-sbom.json')) {
          return JSON.stringify(mockCargoSBOM);
        }
        return '{}';
      });

      const inputFiles = {
        npm: 'npm-sbom.json',
        cargo: 'cargo-sbom.json',
      };

      await aggregator.aggregate(inputFiles);

      expect(aggregator.stats.npmComponents).toBe(2);
      expect(aggregator.stats.cargoComponents).toBe(2);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(4);
    });

    it('should handle missing SBOM files gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const inputFiles = {
        npm: 'nonexistent-npm-sbom.json',
      };

      await aggregator.aggregate(inputFiles);

      expect(aggregator.stats.npmComponents).toBe(0);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const inputFiles = {
        npm: 'invalid-sbom.json',
      };

      await expect(aggregator.aggregate(inputFiles)).rejects.toThrow();
    });
  });

  describe('Statistics and Finalization', () => {
    it('should track aggregation statistics', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('npm')) return JSON.stringify(mockNpmSBOM);
        if (path.includes('cargo')) return JSON.stringify(mockCargoSBOM);
        return '{}';
      });

      await aggregator.aggregate({
        npm: 'npm-sbom.json',
        cargo: 'cargo-sbom.json',
      });

      const stats = aggregator.getStats();

      expect(stats.npmComponents).toBe(2);
      expect(stats.cargoComponents).toBe(2);
      expect(stats.totalComponents).toBe(4);
      expect(stats.duplicatesRemoved).toBe(0);
      expect(stats.deduplicationEnabled).toBe(true);
      expect(stats.outputFormat).toBe('cyclonedx');
    });

    it('should sort components by name in final SBOM', async () => {
      const unsortedSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          { name: 'zebra', version: '1.0.0' },
          { name: 'alpha', version: '1.0.0' },
          { name: 'beta', version: '1.0.0' },
        ],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(unsortedSBOM));

      await aggregator.aggregate({ test: 'test-sbom.json' });

      const componentNames = aggregator.aggregatedSBOM.components.map(c => c.name);
      expect(componentNames).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should add aggregation metadata to final SBOM', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockNpmSBOM));

      await aggregator.aggregate({ npm: 'npm-sbom.json' });

      expect(aggregator.aggregatedSBOM.metadata.properties).toBeDefined();

      const statsProperty = aggregator.aggregatedSBOM.metadata.properties.find(
        p => p.name === 'aura:aggregation-stats'
      );
      expect(statsProperty).toBeDefined();

      const stats = JSON.parse(statsProperty.value);
      expect(stats.npmComponents).toBe(2);
    });
  });

  describe('Component Key Generation', () => {
    it('should use purl as component key when available', () => {
      const component = {
        name: 'react',
        version: '18.2.0',
        purl: 'pkg:npm/react@18.2.0',
      };

      const key = aggregator.generateComponentKey(component);
      expect(key).toBe('pkg:npm/react@18.2.0');
    });

    it('should generate key from name and version when purl unavailable', () => {
      const component = {
        type: 'library',
        name: 'react',
        version: '18.2.0',
      };

      const key = aggregator.generateComponentKey(component);
      expect(key).toBe('library:react@18.2.0');
    });

    it('should handle missing type and version', () => {
      const component = { name: 'react' };

      const key = aggregator.generateComponentKey(component);
      expect(key).toBe('unknown:react@unknown');
    });
  });

  describe('Security Critical Component Detection', () => {
    it('should identify crypto-related components', () => {
      expect(aggregator.isSecurityCriticalComponent({ name: 'crypto-js' })).toBe(true);
      expect(aggregator.isSecurityCriticalComponent({ name: 'libsodium' })).toBe(true);
      expect(aggregator.isSecurityCriticalComponent({ description: 'encryption library' })).toBe(
        true
      );
    });

    it('should identify auth-related components', () => {
      expect(aggregator.isSecurityCriticalComponent({ name: 'passport' })).toBe(true);
      expect(aggregator.isSecurityCriticalComponent({ name: 'jsonwebtoken' })).toBe(true);
      expect(aggregator.isSecurityCriticalComponent({ description: 'OAuth implementation' })).toBe(
        true
      );
    });

    it('should not flag regular components', () => {
      expect(aggregator.isSecurityCriticalComponent({ name: 'lodash' })).toBe(false);
      expect(aggregator.isSecurityCriticalComponent({ name: 'react' })).toBe(false);
      expect(aggregator.isSecurityCriticalComponent({ description: 'utility library' })).toBe(
        false
      );
    });
  });

  describe('Component Type Inference', () => {
    it('should infer library type for npm ecosystem', () => {
      expect(aggregator.inferComponentType('react', 'npm')).toBe('library');
    });

    it('should infer library type for cargo ecosystem', () => {
      expect(aggregator.inferComponentType('serde', 'cargo')).toBe('library');
    });

    it('should infer operating-system type for system components', () => {
      expect(aggregator.inferComponentType('ubuntu-base', 'comprehensive')).toBe(
        'operating-system'
      );
    });

    it('should infer container type for container components', () => {
      expect(aggregator.inferComponentType('docker-image', 'comprehensive')).toBe('container');
    });

    it('should default to library type', () => {
      expect(aggregator.inferComponentType('unknown-component', 'comprehensive')).toBe('library');
    });
  });
});

// Integration tests
describe('SBOM Aggregator Integration', () => {
  it.skip('should aggregate real SBOM files', async () => {
    // This test would require real SBOM files and would be run in CI
    const aggregator = new SBOMAggregator();

    const inputFiles = {
      npm: process.env.TEST_NPM_SBOM_PATH,
      cargo: process.env.TEST_CARGO_SBOM_PATH,
    };

    await aggregator.aggregate(inputFiles);

    expect(aggregator.stats.totalComponents).toBeGreaterThan(0);
  });
});
