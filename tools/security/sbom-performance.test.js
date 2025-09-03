/**
 * SBOM Aggregation Performance Tests
 *
 * Performance validation for large-scale SBOM processing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { SBOMAggregator } from './sbom-aggregate.js';

// Mock fs for controlled testing
vi.mock('fs');

describe('SBOM Aggregation Performance', () => {
  let mockFs;

  beforeEach(() => {
    mockFs = vi.mocked(fs);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Generate mock SBOM with specified number of components
   * @param {number} componentCount - Number of components to generate
   * @param {string} ecosystem - Ecosystem type (npm, cargo, etc.)
   * @returns {object} Mock SBOM object
   */
  const generateMockSBOM = (componentCount, ecosystem = 'npm') => {
    const purl =
      ecosystem === 'npm' ? 'pkg:npm/' : ecosystem === 'cargo' ? 'pkg:cargo/' : 'pkg:generic/';

    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          type: 'application',
          name: `test-${ecosystem}-app`,
          version: '1.0.0',
        },
      },
      components: Array.from({ length: componentCount }, (_unused, i) => ({
        type: 'library',
        'bom-ref': `${ecosystem}:component-${i}@1.${Math.floor(i / 100)}.${i % 100}`,
        name: `component-${i}`,
        version: `1.${Math.floor(i / 100)}.${i % 100}`,
        purl: `${purl}component-${i}@1.${Math.floor(i / 100)}.${i % 100}`,
        description: `Test component ${i} for ${ecosystem} ecosystem`,
        licenses: i % 5 === 0 ? [{ license: { name: 'MIT' } }] : undefined,
        scope: i % 10 === 0 ? 'required' : 'optional',
        properties: i % 3 === 0 ? [{ name: 'test:property', value: `value-${i}` }] : undefined,
      })),
      vulnerabilities:
        componentCount > 500
          ? Array.from({ length: Math.floor(componentCount / 100) }, (_, index) => ({
              // eslint-disable-line no-unused-vars
              id: `CVE-2023-${1000 + index}`,
              source: { name: 'NVD', url: 'https://nvd.nist.gov/' },
              ratings: [{ severity: index % 3 === 0 ? 'high' : 'medium', method: 'CVSSv3' }],
              affects: [{ ref: `${ecosystem}:component-${index * 10}@1.0.0` }],
            }))
          : undefined,
    };
  };

  describe('Large-Scale Component Processing', () => {
    it('should handle 1000+ components within acceptable time limits', async () => {
      const componentCount = 1500;
      const mockSBOM = generateMockSBOM(componentCount, 'npm');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator({
        projectName: 'large-scale-test',
        deduplication: true,
      });

      const startTime = performance.now();

      await aggregator.aggregate({
        npm: 'large-npm-sbom.json',
      });

      const duration = performance.now() - startTime;
      const stats = aggregator.getStats();

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(stats.totalComponents).toBe(componentCount);
      expect(stats.npmComponents).toBe(componentCount);
      expect(aggregator.aggregatedSBOM.components).toHaveLength(componentCount);
    });

    it('should efficiently process multiple large SBOMs', async () => {
      const npmComponents = 800;
      const cargoComponents = 600;
      const comprehensiveComponents = 400;

      const mockNpmSBOM = generateMockSBOM(npmComponents, 'npm');
      const mockCargoSBOM = generateMockSBOM(cargoComponents, 'cargo');
      const mockComprehensiveSBOM = generateMockSBOM(comprehensiveComponents, 'generic');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(path => {
        if (path.includes('npm')) return JSON.stringify(mockNpmSBOM);
        if (path.includes('cargo')) return JSON.stringify(mockCargoSBOM);
        if (path.includes('comprehensive')) return JSON.stringify(mockComprehensiveSBOM);
        return '{}';
      });
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator({
        projectName: 'multi-ecosystem-test',
        deduplication: true,
      });

      const startTime = performance.now();

      await aggregator.aggregate({
        npm: 'npm-large.json',
        cargo: 'cargo-large.json',
        comprehensive: 'comprehensive-large.json',
      });

      const duration = performance.now() - startTime;
      const stats = aggregator.getStats();

      // Performance assertions
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
      expect(stats.totalComponents).toBe(npmComponents + cargoComponents + comprehensiveComponents);
      expect(stats.npmComponents).toBe(npmComponents);
      expect(stats.cargoComponents).toBe(cargoComponents);
      expect(stats.comprehensiveComponents).toBe(comprehensiveComponents);
    });

    it('should maintain performance with extensive vulnerability data', async () => {
      const componentCount = 1000;
      const mockSBOMWithVulns = generateMockSBOM(componentCount, 'npm');

      // Add extensive vulnerability data
      mockSBOMWithVulns.vulnerabilities = Array.from({ length: 200 }, (_, i) => ({
        id: `CVE-2023-${10000 + i}`,
        source: { name: 'OSV', url: 'https://osv.dev/' },
        ratings: [
          {
            severity: ['critical', 'high', 'medium', 'low'][i % 4],
            method: 'CVSSv3',
            score: 9.0 - (i % 4) * 2,
          },
        ],
        description: `Vulnerability ${i} affecting multiple components`,
        affects: Array.from({ length: Math.min(5, componentCount - i) }, (_, j) => ({
          ref: `npm:component-${i + j}@1.0.0`,
        })),
        published: new Date(Date.now() - i * 86400000).toISOString(),
      }));

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOMWithVulns));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator();

      const startTime = performance.now();
      await aggregator.aggregate({ npm: 'vuln-heavy-sbom.json' });
      const duration = performance.now() - startTime;

      // Should handle vulnerabilities without significant performance impact
      expect(duration).toBeLessThan(6000);
      expect(aggregator.aggregatedSBOM.vulnerabilities).toHaveLength(200);
    });
  });

  describe('Deduplication Performance', () => {
    it('should efficiently deduplicate components across large datasets', async () => {
      const uniqueComponents = 500;
      const duplicateMultiplier = 3; // Each component appears 3 times

      // Create SBOM with intentional duplicates
      const createSBOMWithDuplicates = (ecosystem, offset = 0) => ({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: Array.from({ length: uniqueComponents }, (_, i) => ({
          type: 'library',
          name: `component-${i + offset}`,
          version: '1.0.0',
          purl: `pkg:${ecosystem}/component-${i + offset}@1.0.0`,
          description: `Duplicate test component ${i + offset}`,
        })),
      });

      const sboms = Array.from(
        { length: duplicateMultiplier },
        () => createSBOMWithDuplicates('npm', 0) // Same components in each SBOM
      );

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(path => {
        const index = parseInt(path.match(/\d+/)?.[0] || '0');
        return JSON.stringify(sboms[index] || sboms[0]);
      });
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator({ deduplication: true });

      const startTime = performance.now();

      await aggregator.aggregate({
        npm1: 'sbom-1.json',
        npm2: 'sbom-2.json',
        npm3: 'sbom-3.json',
      });

      const duration = performance.now() - startTime;
      const stats = aggregator.getStats();

      // Performance and deduplication validation
      expect(duration).toBeLessThan(4000);
      expect(stats.totalComponents).toBe(uniqueComponents);
      expect(stats.duplicatesRemoved).toBe((duplicateMultiplier - 1) * uniqueComponents);
    });

    it('should scale deduplication performance with large component sets', async () => {
      const scales = [100, 500, 1000, 2000];
      const results = [];

      for (const scale of scales) {
        const mockSBOM = generateMockSBOM(scale, 'npm');

        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
        mockFs.writeFileSync.mockImplementation(() => {});

        const aggregator = new SBOMAggregator();

        const startTime = performance.now();
        await aggregator.aggregate({ npm: `test-${scale}.json` });
        const duration = performance.now() - startTime;

        results.push({ scale, duration });

        // Verify linear or sub-linear scaling
        if (results.length > 1) {
          const prevResult = results[results.length - 2];
          const scaleRatio = scale / prevResult.scale;
          const timeRatio = duration / prevResult.duration;

          // Time should not grow faster than O(n log n)
          expect(timeRatio).toBeLessThan(scaleRatio * Math.log(scaleRatio) * 1.5);
        }
      }
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should handle large SBOMs without excessive memory usage', async () => {
      const componentCount = 2000;
      const mockSBOM = generateMockSBOM(componentCount, 'npm');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator();

      // Monitor memory usage
      const initialMemory = process.memoryUsage();

      await aggregator.aggregate({
        npm: 'large-memory-test.json',
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 2k components)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Verify data integrity wasn't compromised
      const stats = aggregator.getStats();
      expect(stats.totalComponents).toBe(componentCount);
    });

    it('should properly clean up temporary data structures', async () => {
      const mockSBOM = generateMockSBOM(1000, 'npm');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      // Process multiple aggregations to test cleanup
      for (let i = 0; i < 5; i++) {
        const aggregator = new SBOMAggregator();
        await aggregator.aggregate({ npm: `test-${i}.json` });

        // Verify internal maps are properly sized
        expect(aggregator.componentMap.size).toBe(1000);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Output Format Performance', () => {
    it('should efficiently convert between CycloneDX and SPDX formats', async () => {
      const componentCount = 1000;
      const mockSBOM = generateMockSBOM(componentCount, 'npm');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      // Test CycloneDX output
      const cyclonDxAggregator = new SBOMAggregator({ outputFormat: 'cyclonedx' });
      const cyclonStartTime = performance.now();
      await cyclonDxAggregator.aggregate({ npm: 'test-cyclondx.json' });
      const cyclonDuration = performance.now() - cyclonStartTime;

      // Test SPDX output
      const spdxAggregator = new SBOMAggregator({ outputFormat: 'spdx' });
      const spdxStartTime = performance.now();
      await spdxAggregator.aggregate({ npm: 'test-spdx.json' });
      const spdxDuration = performance.now() - spdxStartTime;

      // Both formats should be processed efficiently
      expect(cyclonDuration).toBeLessThan(4000);
      expect(spdxDuration).toBeLessThan(4000);

      // Format conversion shouldn't add significant overhead
      expect(Math.abs(cyclonDuration - spdxDuration)).toBeLessThan(1000);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent SBOM processing efficiently', async () => {
      const sbomCount = 5;
      const componentsPerSBOM = 400;

      const promises = Array.from({ length: sbomCount }, async (_, i) => {
        const mockSBOM = generateMockSBOM(componentsPerSBOM, 'npm');

        // Mock unique file paths for each concurrent operation
        mockFs.existsSync.mockImplementation(path => path.includes(`concurrent-${i}`));
        mockFs.readFileSync.mockImplementation(path =>
          path.includes(`concurrent-${i}`) ? JSON.stringify(mockSBOM) : '{}'
        );
        mockFs.writeFileSync.mockImplementation(() => {});

        const aggregator = new SBOMAggregator();
        return aggregator.aggregate({ npm: `concurrent-${i}.json` });
      });

      const startTime = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Concurrent processing should be efficient
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle SBOMs with extremely long component names efficiently', async () => {
      const componentCount = 500;
      const longNameSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: Array.from({ length: componentCount }, (_, i) => ({
          type: 'library',
          name: `extremely-long-component-name-that-simulates-real-world-packages-with-verbose-naming-conventions-${i}`,
          version: '1.0.0',
          purl: `pkg:npm/extremely-long-component-name-that-simulates-real-world-packages-with-verbose-naming-conventions-${i}@1.0.0`,
          description: 'A' + 'very '.repeat(100) + `long description for component ${i}`,
          properties: Array.from({ length: 10 }, (_, j) => ({
            name: `property-with-long-name-${j}`,
            value: 'x'.repeat(200),
          })),
        })),
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(longNameSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator();

      const startTime = performance.now();
      await aggregator.aggregate({ npm: 'long-names.json' });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(6000);
      expect(aggregator.getStats().totalComponents).toBe(componentCount);
    });

    it('should handle empty and malformed SBOM sections gracefully', async () => {
      const edgeCaseSBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [
          { type: 'library', name: 'valid-component', version: '1.0.0' },
          {
            /* missing required fields */
          },
          { type: 'library', name: '', version: '1.0.0' }, // empty name
          { type: 'library', name: 'no-version' }, // missing version
          { type: 'library', name: 'null-fields', version: null }, // null values
          ...Array.from({ length: 995 }, (_, i) => ({
            // bulk valid components
            type: 'library',
            name: `bulk-component-${i}`,
            version: '1.0.0',
          })),
        ],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(edgeCaseSBOM));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aggregator = new SBOMAggregator();

      const startTime = performance.now();
      await aggregator.aggregate({ npm: 'edge-cases.json' });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(4000);
      // Should process valid components and handle invalid ones gracefully
      expect(aggregator.getStats().totalComponents).toBeGreaterThan(995);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain baseline performance across different SBOM structures', async () => {
      const baselineTests = [
        { name: 'simple', components: 1000, complexity: 'low' },
        { name: 'complex', components: 1000, complexity: 'high' },
        { name: 'mixed', components: 1000, complexity: 'mixed' },
      ];

      const results = [];

      for (const test of baselineTests) {
        let mockSBOM;

        if (test.complexity === 'high') {
          mockSBOM = generateMockSBOM(test.components, 'npm');
          // Add complexity
          mockSBOM.components.forEach((comp, i) => {
            comp.properties = Array.from({ length: 20 }, (_, j) => ({
              name: `complex-property-${j}`,
              value: `complex-value-${j}`,
            }));
            comp.externalReferences = Array.from({ length: 5 }, (_, j) => ({
              type: 'distribution',
              url: `https://example.com/ref-${i}-${j}`,
            }));
          });
        } else if (test.complexity === 'mixed') {
          mockSBOM = generateMockSBOM(test.components, 'npm');
          mockSBOM.components.forEach((comp, i) => {
            if (i % 3 === 0) {
              comp.properties = [{ name: 'simple', value: 'value' }];
            } else if (i % 3 === 1) {
              comp.properties = Array.from({ length: 10 }, (_, j) => ({
                name: `prop-${j}`,
                value: `val-${j}`,
              }));
            }
            // Some components have no extra properties (i % 3 === 2)
          });
        } else {
          mockSBOM = generateMockSBOM(test.components, 'npm');
        }

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSBOM));
        mockFs.writeFileSync.mockImplementation(() => {});

        const aggregator = new SBOMAggregator();

        const startTime = performance.now();
        await aggregator.aggregate({ npm: `${test.name}.json` });
        const duration = performance.now() - startTime;

        results.push({ ...test, duration });
      }

      // All tests should complete within reasonable time bounds
      results.forEach(result => {
        expect(result.duration).toBeLessThan(5000);
      });

      // High complexity shouldn't be more than 3x slower than simple
      const simple = results.find(r => r.name === 'simple');
      const complex = results.find(r => r.name === 'complex');
      expect(complex.duration / simple.duration).toBeLessThan(3);
    });
  });
});
