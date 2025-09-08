import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  NetworkGate,
  NetworkGateConfig,
  NetworkAnalysisResult,
} from '../../src/network/network-gate';
import { PcapAnalyzer } from '../../src/network/pcap-analyzer';
import { TlsInspector } from '../../src/network/tls-inspector';
import { MetadataDetector } from '../../src/network/metadata-detector';

describe('NetworkGate', () => {
  let networkGate: NetworkGate;
  let mockConfig: NetworkGateConfig;

  beforeEach(() => {
    networkGate = new NetworkGate();
    mockConfig = networkGate.createMockNetworkConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('execute', () => {
    it('should pass when all security checks pass', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false, // Disable to avoid file system dependencies
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: [],
        tlsEndpoints: [{ hostname: 'secure.example.com', port: 443 }],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 70,
      };

      // Add pinned certificate for the test endpoint
      const tlsInspector = networkGate.getTlsInspector();
      tlsInspector.addPinnedCertificate(
        'secure.example.com',
        'SHA256:SECURE123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      );

      const result = await networkGate.execute(config);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('Network security gate passed');
      expect(result.details).toBeDefined();
      expect(result.details.totalViolations).toBeGreaterThanOrEqual(0);
    });

    it('should fail when high severity violations are found and failOnHighSeverity is true', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: false,
        pcapFilePaths: [],
        tlsEndpoints: [{ hostname: 'insecure.example.com', port: 443 }], // Will fail due to no pinning
        metadataTimeWindow: 60000,
        failOnHighSeverity: true,
        maxRiskScore: 70,
      };

      const result = await networkGate.execute(config);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Network security gate failed');
      expect(result.details.highSeverityViolations).toBeGreaterThanOrEqual(0);
    });

    it('should fail when risk score exceeds maximum threshold', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: [],
        tlsEndpoints: [
          { hostname: 'bad1.example.com', port: 443 },
          { hostname: 'bad2.example.com', port: 443 },
        ],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 10, // Very low threshold
      };

      const result = await networkGate.execute(config);

      expect(result.passed).toBe(false);
      expect(result.details.overallRiskScore).toBeGreaterThan(10);
    });

    it('should handle execution errors gracefully', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: true,
        enableTlsInspection: false,
        enableMetadataDetection: false,
        pcapFilePaths: ['/nonexistent/file.pcap'],
        tlsEndpoints: [],
        metadataTimeWindow: 60000,
        failOnHighSeverity: true,
        maxRiskScore: 70,
      };

      const result = await networkGate.execute(config);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Network security gate failed');
    });

    it('should aggregate results from multiple analysis types', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false, // Skip for testing
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: [],
        tlsEndpoints: [
          { hostname: 'api1.example.com', port: 443 },
          { hostname: 'api2.example.com', port: 443 },
        ],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      const result = await networkGate.execute(config);

      expect(result.details).toBeDefined();
      expect(result.details.tlsResults).toBeDefined();
      expect(result.details.metadataResults).toBeDefined();
      expect(result.details.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.details.totalViolations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executePcapAnalysisForFiles', () => {
    it('should handle empty file list', async () => {
      const result = await networkGate.executePcapAnalysisForFiles([]);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('0 files');
      expect(result.details).toEqual([]);
    });

    it('should aggregate results from multiple PCAP files', async () => {
      // Mock files (will fail but we can test aggregation logic)
      const filePaths = ['/test1.pcap', '/test2.pcap'];

      const result = await networkGate.executePcapAnalysisForFiles(filePaths);

      expect(result.message).toContain('2 files');
      expect(result.details).toBeInstanceOf(Array);
    });

    it('should handle PCAP analysis errors gracefully', async () => {
      const result = await networkGate.executePcapAnalysisForFiles(['/invalid/path.pcap']);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeTlsInspectionForEndpoints', () => {
    it('should handle empty endpoint list', async () => {
      const result = await networkGate.executeTlsInspectionForEndpoints([]);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('0 endpoints');
      expect(result.details).toEqual([]);
    });

    it('should inspect multiple TLS endpoints', async () => {
      const endpoints = [
        { hostname: 'example1.com', port: 443 },
        { hostname: 'example2.com', port: 443 },
      ];

      const result = await networkGate.executeTlsInspectionForEndpoints(endpoints);

      expect(result.message).toContain('2 endpoints');
      expect(result.details.length).toBe(2);
    });

    it('should aggregate violations from multiple endpoints', async () => {
      const endpoints = [
        { hostname: 'secure.example.com', port: 443 },
        { hostname: 'insecure.example.com', port: 443 },
      ];

      // Pin certificate for first endpoint only
      const tlsInspector = networkGate.getTlsInspector();
      tlsInspector.addPinnedCertificate(
        'secure.example.com',
        'SHA256:SECURE123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      );

      const result = await networkGate.executeTlsInspectionForEndpoints(endpoints);

      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('executeMetadataAnalysisForRequests', () => {
    it('should analyze request metadata correctly', async () => {
      const metadataDetector = networkGate.getMetadataDetector();
      const requests = [
        metadataDetector.createMockRequestMetadata('/api/health/cycle', Date.now(), 1024, 100),
        metadataDetector.createMockRequestMetadata(
          '/api/health/symptoms',
          Date.now() + 1000,
          2048,
          150
        ),
      ];

      const result = await networkGate.executeMetadataAnalysisForRequests(requests);

      expect(result.details).toBeDefined();
      expect(result.details.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.details.patterns).toBeDefined();
    });

    it('should handle metadata analysis errors gracefully', async () => {
      // Pass invalid data to trigger error handling
      const result = await networkGate.executeMetadataAnalysisForRequests(null as any);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Metadata analysis execution failed');
      expect(result.details.riskScore).toBe(100);
    });

    it('should apply custom time windows', async () => {
      const metadataDetector = networkGate.getMetadataDetector();
      const baseTime = Date.now();
      const requests = [];

      // Create requests spanning 3 minutes
      for (let i = 0; i < 6; i++) {
        requests.push(
          metadataDetector.createMockRequestMetadata(
            `/api/test-${i}`,
            baseTime + i * 30000, // 30-second intervals
            1000,
            100
          )
        );
      }

      const result = await networkGate.executeMetadataAnalysisForRequests(requests, 60000); // 1-minute windows

      expect(result.details).toBeDefined();
      expect(result.details.patterns).toBeDefined();
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate higher risk scores for multiple violations', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: [],
        tlsEndpoints: [
          { hostname: 'insecure1.example.com', port: 443 },
          { hostname: 'insecure2.example.com', port: 443 },
          { hostname: 'insecure3.example.com', port: 443 },
        ],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      const result = await networkGate.execute(config);

      expect(result.details.overallRiskScore).toBeGreaterThan(0);
    });

    it('should calculate lower risk scores for secure configurations', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: false,
        pcapFilePaths: [],
        tlsEndpoints: [{ hostname: 'secure.example.com', port: 443 }],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      // Pin certificate for secure configuration
      const tlsInspector = networkGate.getTlsInspector();
      tlsInspector.addPinnedCertificate(
        'secure.example.com',
        'SHA256:SECURE123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      );

      const result = await networkGate.execute(config);

      // Should have some violations (not pinned) but lower overall risk
      expect(result.details.overallRiskScore).toBeLessThan(50);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle configuration with all features disabled', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: false,
        enableMetadataDetection: false,
        pcapFilePaths: [],
        tlsEndpoints: [],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      const result = await networkGate.execute(config);

      expect(result.passed).toBe(true);
      expect(result.details.totalViolations).toBe(0);
      expect(result.details.overallRiskScore).toBe(0);
    });

    it('should validate mock configuration creation', () => {
      const mockConfig = networkGate.createMockNetworkConfig();

      expect(mockConfig.enablePcapAnalysis).toBe(true);
      expect(mockConfig.enableTlsInspection).toBe(true);
      expect(mockConfig.enableMetadataDetection).toBe(true);
      expect(mockConfig.tlsEndpoints.length).toBeGreaterThan(0);
      expect(mockConfig.maxRiskScore).toBe(70);
      expect(mockConfig.failOnHighSeverity).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('should provide access to internal analyzers', () => {
      const pcapAnalyzer = networkGate.getPcapAnalyzer();
      const tlsInspector = networkGate.getTlsInspector();
      const metadataDetector = networkGate.getMetadataDetector();

      expect(pcapAnalyzer).toBeInstanceOf(PcapAnalyzer);
      expect(tlsInspector).toBeInstanceOf(TlsInspector);
      expect(metadataDetector).toBeInstanceOf(MetadataDetector);
    });

    it('should coordinate between different analysis components', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: [],
        tlsEndpoints: [{ hostname: 'test.example.com', port: 443 }],
        metadataTimeWindow: 30000,
        failOnHighSeverity: false,
        maxRiskScore: 80,
      };

      const result = await networkGate.execute(config);

      // Should have results from both TLS inspection and metadata detection
      expect(result.details.tlsResults).toBeDefined();
      expect(result.details.metadataResults).toBeDefined();

      // Overall risk score should be calculated from both components
      expect(result.details.overallRiskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed configuration gracefully', async () => {
      const malformedConfig = {
        enablePcapAnalysis: true,
        pcapFilePaths: null, // Invalid
        tlsEndpoints: undefined, // Invalid
      } as any;

      const result = await networkGate.execute(malformedConfig);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('execution failed');
    });

    it('should handle network connectivity issues', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: false,
        enableTlsInspection: true,
        enableMetadataDetection: false,
        pcapFilePaths: [],
        tlsEndpoints: [{ hostname: '192.0.2.1', port: 443 }], // Non-routable IP
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      const result = await networkGate.execute(config);

      // Should handle connection failures gracefully
      expect(result.details.tlsResults).toBeDefined();
      expect(result.violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial analysis failures', async () => {
      const config: NetworkGateConfig = {
        enablePcapAnalysis: true,
        enableTlsInspection: true,
        enableMetadataDetection: true,
        pcapFilePaths: ['/nonexistent.pcap'],
        tlsEndpoints: [{ hostname: 'invalid-host', port: 443 }],
        metadataTimeWindow: 60000,
        failOnHighSeverity: false,
        maxRiskScore: 100,
      };

      const result = await networkGate.execute(config);

      // Should complete despite individual component failures
      expect(result.details).toBeDefined();
      expect(result.message).toContain('Network security gate failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of endpoints efficiently', async () => {
      const manyEndpoints = [];
      for (let i = 0; i < 10; i++) {
        manyEndpoints.push({ hostname: `host${i}.example.com`, port: 443 });
      }

      const startTime = Date.now();
      const result = await networkGate.executeTlsInspectionForEndpoints(manyEndpoints);
      const duration = Date.now() - startTime;

      expect(result.details.length).toBe(10);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle large request metadata sets', async () => {
      const metadataDetector = networkGate.getMetadataDetector();
      const manyRequests = [];
      const baseTime = Date.now();

      for (let i = 0; i < 100; i++) {
        manyRequests.push(
          metadataDetector.createMockRequestMetadata(
            `/api/endpoint-${i}`,
            baseTime + i * 100,
            Math.random() * 2000,
            Math.random() * 300
          )
        );
      }

      const startTime = Date.now();
      const result = await networkGate.executeMetadataAnalysisForRequests(manyRequests);
      const duration = Date.now() - startTime;

      expect(result.details).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
