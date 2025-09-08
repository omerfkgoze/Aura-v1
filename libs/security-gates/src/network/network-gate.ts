import { SecurityGate, SecurityGateResult } from '../core/security-gate.interface';
import { PcapAnalyzer, PcapAnalysisResult, PcapPacket } from './pcap-analyzer';
import { TlsInspector, TlsInspectionResult } from './tls-inspector';
import { MetadataDetector, MetadataAnalysisResult, RequestMetadata } from './metadata-detector';

export interface NetworkGateConfig {
  enablePcapAnalysis: boolean;
  enableTlsInspection: boolean;
  enableMetadataDetection: boolean;
  pcapFilePaths: string[];
  tlsEndpoints: Array<{ hostname: string; port: number }>;
  metadataTimeWindow: number;
  failOnHighSeverity: boolean;
  maxRiskScore: number;
}

export interface NetworkAnalysisResult {
  pcapResults?: PcapAnalysisResult;
  tlsResults?: TlsInspectionResult[];
  metadataResults?: MetadataAnalysisResult;
  overallRiskScore: number;
  totalViolations: number;
  highSeverityViolations: number;
}

export class NetworkGate implements SecurityGate {
  private readonly pcapAnalyzer: PcapAnalyzer;
  private readonly tlsInspector: TlsInspector;
  private readonly metadataDetector: MetadataDetector;

  constructor() {
    this.pcapAnalyzer = new PcapAnalyzer();
    this.tlsInspector = new TlsInspector();
    this.metadataDetector = new MetadataDetector();
  }

  async execute(config: NetworkGateConfig): Promise<SecurityGateResult<NetworkAnalysisResult>> {
    try {
      const results: NetworkAnalysisResult = {
        overallRiskScore: 0,
        totalViolations: 0,
        highSeverityViolations: 0,
      };

      const allViolations: any[] = [];
      let overallPassed = true;

      // Execute PCAP analysis if enabled
      if (config.enablePcapAnalysis) {
        const pcapResults = await this.executePcapAnalysis(config.pcapFilePaths);
        results.pcapResults = pcapResults.details;

        if (!pcapResults.passed) {
          overallPassed = false;
        }

        if (pcapResults.violations) {
          allViolations.push(...pcapResults.violations);
        }
      }

      // Execute TLS inspection if enabled
      if (config.enableTlsInspection) {
        const tlsResults = await this.executeTlsInspection(config.tlsEndpoints);
        results.tlsResults = tlsResults
          .map(r => r.details)
          .filter(Boolean) as TlsInspectionResult[];

        const failedTlsInspections = tlsResults.filter(r => !r.passed);
        if (failedTlsInspections.length > 0) {
          overallPassed = false;
        }

        for (const tlsResult of tlsResults) {
          if (tlsResult.violations) {
            allViolations.push(...tlsResult.violations);
          }
        }
      }

      // Execute metadata detection if enabled
      if (config.enableMetadataDetection) {
        // In a real implementation, this would collect actual request metadata
        // For now, we'll use a placeholder
        const mockRequestMetadata = this.generateMockRequestMetadata();
        const metadataResult = await this.metadataDetector.analyzeRequestBatch(
          mockRequestMetadata,
          config.metadataTimeWindow
        );

        results.metadataResults = metadataResult.details;

        if (!metadataResult.passed) {
          overallPassed = false;
        }

        if (metadataResult.violations) {
          allViolations.push(...metadataResult.violations);
        }
      }

      // Calculate overall metrics
      results.totalViolations = allViolations.length;
      results.highSeverityViolations = allViolations.filter(v => v.severity === 'HIGH').length;
      results.overallRiskScore = this.calculateOverallRiskScore(results);

      // Apply fail conditions
      const shouldFail = config.failOnHighSeverity && results.highSeverityViolations > 0;
      const exceedsRiskThreshold = results.overallRiskScore > config.maxRiskScore;

      if (shouldFail || exceedsRiskThreshold) {
        overallPassed = false;
      }

      return {
        passed: overallPassed,
        message: overallPassed
          ? `Network security gate passed - ${results.totalViolations} total violations, risk score: ${results.overallRiskScore}`
          : `Network security gate failed - ${results.highSeverityViolations} high severity violations, risk score: ${results.overallRiskScore}`,
        details: results,
        violations: allViolations,
      };
    } catch (error) {
      return {
        passed: false,
        message: `Network security gate execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          overallRiskScore: 100,
          totalViolations: 0,
          highSeverityViolations: 0,
        },
        violations: [],
      };
    }
  }

  async executePcapAnalysisForFiles(
    filePaths: string[]
  ): Promise<SecurityGateResult<PcapAnalysisResult[]>> {
    try {
      const results: PcapAnalysisResult[] = [];
      const violations: any[] = [];
      let overallPassed = true;

      for (const filePath of filePaths) {
        const result = await this.pcapAnalyzer.analyzePcapFile(filePath);

        if (result.details) {
          results.push(result.details);
        }

        if (!result.passed) {
          overallPassed = false;
        }

        if (result.violations) {
          violations.push(...result.violations);
        }
      }

      return {
        passed: overallPassed,
        message: overallPassed
          ? `PCAP analysis passed for ${filePaths.length} files`
          : `PCAP analysis failed for ${filePaths.length} files`,
        details: results,
        violations,
      };
    } catch (error) {
      return {
        passed: false,
        message: `PCAP analysis execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [],
        violations: [],
      };
    }
  }

  async executeTlsInspectionForEndpoints(
    endpoints: Array<{ hostname: string; port: number }>
  ): Promise<SecurityGateResult<TlsInspectionResult[]>> {
    try {
      const results: TlsInspectionResult[] = [];
      const violations: any[] = [];
      let overallPassed = true;

      for (const endpoint of endpoints) {
        const result = await this.tlsInspector.inspectTlsConnection(
          endpoint.hostname,
          endpoint.port
        );

        if (result.details) {
          results.push(result.details);
        }

        if (!result.passed) {
          overallPassed = false;
        }

        if (result.violations) {
          violations.push(...result.violations);
        }
      }

      return {
        passed: overallPassed,
        message: overallPassed
          ? `TLS inspection passed for ${endpoints.length} endpoints`
          : `TLS inspection failed for ${endpoints.length} endpoints`,
        details: results,
        violations,
      };
    } catch (error) {
      return {
        passed: false,
        message: `TLS inspection execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: [],
        violations: [],
      };
    }
  }

  async executeMetadataAnalysisForRequests(
    requests: RequestMetadata[],
    timeWindow: number = 60000
  ): Promise<SecurityGateResult<MetadataAnalysisResult>> {
    try {
      return await this.metadataDetector.analyzeRequestBatch(requests, timeWindow);
    } catch (error) {
      return {
        passed: false,
        message: `Metadata analysis execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          timingPatternsDetected: true,
          sizePatternsDetected: true,
          headerLeakageDetected: true,
          trackingSignalsFound: [],
          riskScore: 100,
          patterns: [],
        },
        violations: [],
      };
    }
  }

  private async executePcapAnalysis(
    filePaths: string[]
  ): Promise<SecurityGateResult<PcapAnalysisResult>> {
    if (filePaths.length === 0) {
      return {
        passed: true,
        message: 'No PCAP files to analyze',
        details: {
          encryptedPayloadsOnly: true,
          piiExposureDetected: false,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
        violations: [],
      };
    }

    // For multiple files, analyze each and aggregate results
    const allResults: SecurityGateResult<PcapAnalysisResult>[] = [];

    for (const filePath of filePaths) {
      const result = await this.pcapAnalyzer.analyzePcapFile(filePath);
      allResults.push(result);
    }

    // Aggregate results
    const aggregatedResult = this.aggregatePcapResults(allResults);
    return aggregatedResult;
  }

  private async executeTlsInspection(
    endpoints: Array<{ hostname: string; port: number }>
  ): Promise<SecurityGateResult<TlsInspectionResult>[]> {
    const results: SecurityGateResult<TlsInspectionResult>[] = [];

    for (const endpoint of endpoints) {
      const result = await this.tlsInspector.inspectTlsConnection(endpoint.hostname, endpoint.port);
      results.push(result);
    }

    return results;
  }

  private aggregatePcapResults(
    results: SecurityGateResult<PcapAnalysisResult>[]
  ): SecurityGateResult<PcapAnalysisResult> {
    if (results.length === 0) {
      return {
        passed: true,
        message: 'No results to aggregate',
        details: {
          encryptedPayloadsOnly: true,
          piiExposureDetected: false,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
        violations: [],
      };
    }

    const allViolations = results.flatMap(r => r.violations || []);
    const allDetails = results.map(r => r.details).filter(Boolean) as PcapAnalysisResult[];

    const aggregatedDetails: PcapAnalysisResult = {
      encryptedPayloadsOnly: allDetails.every(d => d.encryptedPayloadsOnly),
      piiExposureDetected: allDetails.some(d => d.piiExposureDetected),
      suspiciousPackets: allDetails.flatMap(d => d.suspiciousPackets),
      totalPackets: allDetails.reduce((sum, d) => sum + d.totalPackets, 0),
      encryptedPackets: allDetails.reduce((sum, d) => sum + d.encryptedPackets, 0),
    };

    const overallPassed = results.every(r => r.passed);

    return {
      passed: overallPassed,
      message: overallPassed
        ? `Aggregated PCAP analysis passed for ${results.length} files`
        : `Aggregated PCAP analysis failed for ${results.length} files`,
      details: aggregatedDetails,
      violations: allViolations,
    };
  }

  private calculateOverallRiskScore(results: NetworkAnalysisResult): number {
    let totalScore = 0;
    let componentCount = 0;

    // PCAP analysis risk score
    if (results.pcapResults) {
      const pcapScore = results.pcapResults.piiExposureDetected ? 50 : 0;
      const encryptionScore = results.pcapResults.encryptedPayloadsOnly ? 0 : 30;
      const suspiciousScore = Math.min(results.pcapResults.suspiciousPackets.length * 5, 20);

      totalScore += pcapScore + encryptionScore + suspiciousScore;
      componentCount++;
    }

    // TLS inspection risk score
    if (results.tlsResults && results.tlsResults.length > 0) {
      let tlsScore = 0;

      for (const tlsResult of results.tlsResults) {
        if (!tlsResult.certificateValid) tlsScore += 30;
        if (!tlsResult.certificatePinned) tlsScore += 10;
        if (!tlsResult.cipherSuiteSecure) tlsScore += 25;
        if (!tlsResult.tlsVersionSecure) tlsScore += 25;
        tlsScore += tlsResult.vulnerabilities.length * 5;
      }

      totalScore += tlsScore / results.tlsResults.length;
      componentCount++;
    }

    // Metadata analysis risk score
    if (results.metadataResults) {
      totalScore += results.metadataResults.riskScore;
      componentCount++;
    }

    return componentCount > 0 ? Math.min(100, totalScore / componentCount) : 0;
  }

  private generateMockRequestMetadata(): RequestMetadata[] {
    // This is a placeholder for demonstration
    // In a real implementation, this would collect actual request metadata
    // from network monitoring or logging systems

    const now = Date.now();
    const requests: RequestMetadata[] = [];

    // Generate mock requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        this.metadataDetector.createMockRequestMetadata(
          `/api/health/data/${i}`,
          now + i * 1000,
          Math.floor(Math.random() * 1000) + 500,
          Math.floor(Math.random() * 200) + 50
        )
      );
    }

    return requests;
  }

  // Utility methods for testing
  createMockNetworkConfig(): NetworkGateConfig {
    return {
      enablePcapAnalysis: true,
      enableTlsInspection: true,
      enableMetadataDetection: true,
      pcapFilePaths: [],
      tlsEndpoints: [
        { hostname: 'api.aura-app.com', port: 443 },
        { hostname: 'localhost', port: 3000 },
      ],
      metadataTimeWindow: 60000,
      failOnHighSeverity: true,
      maxRiskScore: 70,
    };
  }

  getPcapAnalyzer(): PcapAnalyzer {
    return this.pcapAnalyzer;
  }

  getTlsInspector(): TlsInspector {
    return this.tlsInspector;
  }

  getMetadataDetector(): MetadataDetector {
    return this.metadataDetector;
  }
}
