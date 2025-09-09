import { SecurityGate, SecurityGateResult } from '../core/security-gate.interface';
import { PcapAnalyzer, PcapAnalysisResult /*, PcapPacket */ } from './pcap-analyzer';
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
  pcapResults?: PcapAnalysisResult | undefined;
  tlsResults?: TlsInspectionResult[];
  metadataResults?: MetadataAnalysisResult | undefined;
  overallRiskScore: number;
  totalViolations: number;
  highSeverityViolations: number;
}

export class NetworkGate implements SecurityGate {
  name = 'Network Security Gate';
  description = 'Network traffic analysis and security validation';
  version = '1.0.0';

  private readonly pcapAnalyzer: PcapAnalyzer;
  private readonly tlsInspector: TlsInspector;
  private readonly metadataDetector: MetadataDetector;

  constructor() {
    this.pcapAnalyzer = new PcapAnalyzer();
    this.tlsInspector = new TlsInspector();
    this.metadataDetector = new MetadataDetector();
  }

  getConfig(): Record<string, unknown> {
    return {
      enablePcapAnalysis: true,
      enableTlsInspection: true,
      enableMetadataDetection: true,
      pcapFilePaths: [],
      tlsEndpoints: [],
      metadataTimeWindow: 3600000,
      failOnHighSeverity: true,
      maxRiskScore: 100,
    };
  }

  validateConfig(config: Record<string, unknown>): SecurityGateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (Array.isArray(config['pcapFilePaths'])) {
      (config['pcapFilePaths'] as unknown[]).forEach((path, index) => {
        if (typeof path !== 'string') {
          errors.push(`pcapFilePaths[${index}] must be a string`);
        }
      });
    }

    if (typeof config['maxRiskScore'] === 'number' && (config['maxRiskScore'] as number) < 0) {
      errors.push('maxRiskScore must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      passed: errors.length === 0,
      errors,
      warnings,
      details: errors.length > 0 ? 'Network gate configuration validation failed' : 'Configuration is valid',
    };
  }

  async execute(input: unknown): Promise<SecurityGateResult> {
    const config = input as NetworkGateConfig;
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
        results.pcapResults = pcapResults.metadata as PcapAnalysisResult | undefined;

        if (!pcapResults.passed) {
          overallPassed = false;
        }

        // Add errors and warnings to violations list
        pcapResults.errors.forEach(error => {
          allViolations.push({ type: 'ERROR', severity: 'HIGH', description: error });
        });
        pcapResults.warnings.forEach(warning => {
          allViolations.push({ type: 'WARNING', severity: 'MEDIUM', description: warning });
        });
      }

      // Execute TLS inspection if enabled
      if (config.enableTlsInspection) {
        const tlsResults = await this.executeTlsInspection(config.tlsEndpoints);
        results.tlsResults = tlsResults
          .map(r => r.metadata as TlsInspectionResult | undefined)
          .filter(Boolean) as TlsInspectionResult[];

        const failedTlsInspections = tlsResults.filter(r => !r.passed);
        if (failedTlsInspections.length > 0) {
          overallPassed = false;
        }

        for (const tlsResult of tlsResults) {
          // Add errors and warnings to violations list
          tlsResult.errors.forEach(error => {
            allViolations.push({ type: 'ERROR', severity: 'HIGH', description: error });
          });
          tlsResult.warnings.forEach(warning => {
            allViolations.push({ type: 'WARNING', severity: 'MEDIUM', description: warning });
          });
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

        results.metadataResults = metadataResult.metadata as MetadataAnalysisResult | undefined;

        if (!metadataResult.passed) {
          overallPassed = false;
        }

        // Add errors and warnings to violations list
        metadataResult.errors.forEach(error => {
          allViolations.push({ type: 'ERROR', severity: 'HIGH', description: error });
        });
        metadataResult.warnings.forEach(warning => {
          allViolations.push({ type: 'WARNING', severity: 'MEDIUM', description: warning });
        });
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

      const errors: string[] = [];
      const warnings: string[] = [];
      
      allViolations.forEach((v: any) => {
        if (v.severity === 'HIGH') {
          errors.push(v.description || v.type);
        } else {
          warnings.push(v.description || v.type);
        }
      });
      
      return {
        valid: overallPassed,
        passed: overallPassed,
        errors,
        warnings,
        details: overallPassed
          ? `Network security gate passed - ${results.totalViolations} total violations, risk score: ${results.overallRiskScore}`
          : `Network security gate failed - ${results.highSeverityViolations} high severity violations, risk score: ${results.overallRiskScore}`,
        metadata: results as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [`Network security gate execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        details: 'Network security gate execution failed due to an error',
        metadata: {
          overallRiskScore: 100,
          totalViolations: 0,
          highSeverityViolations: 0,
        } as unknown as Record<string, unknown>,
      };
    }
  }

  async executePcapAnalysisForFiles(
    filePaths: string[]
  ): Promise<SecurityGateResult> {
    try {
      const results: PcapAnalysisResult[] = [];
      const violations: any[] = [];
      let overallPassed = true;

      for (const filePath of filePaths) {
        const result = await this.pcapAnalyzer.analyzePcapFile(filePath);

        if (result.metadata) {
          results.push(result.metadata as unknown as PcapAnalysisResult);
        }

        if (!result.passed) {
          overallPassed = false;
        }

        // Add errors and warnings to violations list
        result.errors.forEach(error => {
          violations.push({ type: 'ERROR', severity: 'HIGH', description: error });
        });
        result.warnings.forEach(warning => {
          violations.push({ type: 'WARNING', severity: 'MEDIUM', description: warning });
        });
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      
      violations.forEach((v: any) => {
        if (v.severity === 'HIGH') {
          errors.push(v.description || v.type);
        } else {
          warnings.push(v.description || v.type);
        }
      });
      
      return {
        valid: overallPassed,
        passed: overallPassed,
        errors,
        warnings,
        details: overallPassed
          ? `PCAP analysis passed for ${filePaths.length} files`
          : `PCAP analysis failed for ${filePaths.length} files`,
        metadata: { results } as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [`PCAP analysis execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        details: 'PCAP analysis execution failed due to an error',
        metadata: [] as unknown as Record<string, unknown>,
      };
    }
  }

  async executeTlsInspectionForEndpoints(
    endpoints: Array<{ hostname: string; port: number }>
  ): Promise<SecurityGateResult> {
    try {
      const results: TlsInspectionResult[] = [];
      const violations: any[] = [];
      let overallPassed = true;

      for (const endpoint of endpoints) {
        const result = await this.tlsInspector.inspectTlsConnection(
          endpoint.hostname,
          endpoint.port
        );

        if (result.metadata) {
          results.push(result.metadata as unknown as TlsInspectionResult);
        }

        if (!result.passed) {
          overallPassed = false;
        }

        // Add errors and warnings to violations list
        result.errors.forEach(error => {
          violations.push({ type: 'ERROR', severity: 'HIGH', description: error });
        });
        result.warnings.forEach(warning => {
          violations.push({ type: 'WARNING', severity: 'MEDIUM', description: warning });
        });
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      
      violations.forEach((v: any) => {
        if (v.severity === 'HIGH') {
          errors.push(v.description || v.type);
        } else {
          warnings.push(v.description || v.type);
        }
      });
      
      return {
        valid: overallPassed,
        passed: overallPassed,
        errors,
        warnings,
        details: overallPassed
          ? `TLS inspection passed for ${endpoints.length} endpoints`
          : `TLS inspection failed for ${endpoints.length} endpoints`,
        metadata: { results } as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [`TLS inspection execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        details: 'TLS inspection execution failed due to an error',
        metadata: [] as unknown as Record<string, unknown>,
      };
    }
  }

  async executeMetadataAnalysisForRequests(
    requests: RequestMetadata[],
    timeWindow: number = 60000
  ): Promise<SecurityGateResult> {
    try {
      return await this.metadataDetector.analyzeRequestBatch(requests, timeWindow);
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [`Metadata analysis execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        details: 'Metadata analysis execution failed due to an error',
        metadata: {
          timingPatternsDetected: true,
          sizePatternsDetected: true,
          headerLeakageDetected: true,
          trackingSignalsFound: [],
          riskScore: 100,
          patterns: [],
        },
      };
    }
  }

  private async executePcapAnalysis(
    filePaths: string[]
  ): Promise<SecurityGateResult> {
    if (filePaths.length === 0) {
      return {
        valid: true,
        passed: true,
        errors: [],
        warnings: [],
        details: 'No PCAP files to analyze',
        metadata: {
          encryptedPayloadsOnly: true,
          piiExposureDetected: false,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
      };
    }

    // For multiple files, analyze each and aggregate results
    const allResults: SecurityGateResult[] = [];

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
  ): Promise<SecurityGateResult[]> {
    const results: SecurityGateResult[] = [];

    for (const endpoint of endpoints) {
      const result = await this.tlsInspector.inspectTlsConnection(endpoint.hostname, endpoint.port);
      results.push(result);
    }

    return results;
  }

  private aggregatePcapResults(
    results: SecurityGateResult[]
  ): SecurityGateResult {
    if (results.length === 0) {
      return {
        valid: true,
        passed: true,
        errors: [],
        warnings: [],
        details: 'No results to aggregate',
        metadata: {
          encryptedPayloadsOnly: true,
          piiExposureDetected: false,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
      };
    }

    const allErrors = results.flatMap(r => r.errors || []);
    const allWarnings = results.flatMap(r => r.warnings || []);
    const allDetails = results.map(r => r.metadata as unknown as PcapAnalysisResult).filter(Boolean);

    const aggregatedDetails: PcapAnalysisResult = {
      encryptedPayloadsOnly: allDetails.every(d => d.encryptedPayloadsOnly),
      piiExposureDetected: allDetails.some(d => d.piiExposureDetected),
      suspiciousPackets: allDetails.flatMap(d => d.suspiciousPackets),
      totalPackets: allDetails.reduce((sum, d) => sum + d.totalPackets, 0),
      encryptedPackets: allDetails.reduce((sum, d) => sum + d.encryptedPackets, 0),
    };

    const overallPassed = results.every(r => r.passed);
    
    return {
      valid: overallPassed,
      passed: overallPassed,
      errors: allErrors,
      warnings: allWarnings,
      details: overallPassed
        ? `Aggregated PCAP analysis passed for ${results.length} files`
        : `Aggregated PCAP analysis failed for ${results.length} files`,
      metadata: aggregatedDetails as unknown as Record<string, unknown>,
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
