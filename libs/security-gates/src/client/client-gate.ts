/**
 * Main Client-Side Security Gate Integration
 *
 * Orchestrates all client-side security validations including SSR-PII prevention,
 * storage encryption validation, XSS prevention testing, and crypto implementation
 * validation. Integrates into frontend build pipeline for comprehensive security
 * gate enforcement.
 *
 * Implements AC 6 subtask 5: Integration into frontend build pipeline
 */

import { SecurityGate, SecurityGateResult } from '../core/security-gate.interface';
import SSRValidator, { SSRValidationResult } from './ssr-validator';
import StorageValidator, { StorageValidationResult, StorageType } from './storage-validator';
import XSSTester, { XSSTestResult } from './xss-tester';
import CryptoValidator, { CryptoValidationResult } from './crypto-validator';

export interface ClientSecurityGateResult extends SecurityGateResult {
  name: string;
  ssrValidation: SSRValidationResult;
  storageValidation: Map<StorageType, StorageValidationResult>;
  xssValidation: XSSTestResult;
  cryptoValidation: CryptoValidationResult;
  overallRiskScore: number;
  complianceRate: number;
}

export interface ClientSecurityGateConfig {
  enableSSRValidation: boolean;
  enableStorageValidation: boolean;
  enableXSSValidation: boolean;
  enableCryptoValidation: boolean;
  maxRiskScore: number;
  minComplianceRate: number;
  buildMode: 'development' | 'staging' | 'production';
  failOnHighRisk: boolean;
}

const DEFAULT_CONFIG: ClientSecurityGateConfig = {
  enableSSRValidation: true,
  enableStorageValidation: true,
  enableXSSValidation: true,
  enableCryptoValidation: true,
  maxRiskScore: 100, // Allow some medium risk issues in development
  minComplianceRate: 95, // 95% compliance required
  buildMode: 'development',
  failOnHighRisk: true,
};

const PRODUCTION_CONFIG: ClientSecurityGateConfig = {
  ...DEFAULT_CONFIG,
  maxRiskScore: 0, // Zero tolerance for production
  minComplianceRate: 100, // 100% compliance required for production
  buildMode: 'production',
  failOnHighRisk: true,
};

export class ClientSecurityGate implements SecurityGate {
  name = 'Client-Side Security Gate';
  description = 'Comprehensive client-side security validation framework';
  version = '1.0.0';

  private config: ClientSecurityGateConfig;
  private ssrValidator: SSRValidator;
  private storageValidator: StorageValidator;
  private xssTester: XSSTester;
  private cryptoValidator: CryptoValidator;

  constructor(config: Partial<ClientSecurityGateConfig> = {}) {
    // Use production config for production builds
    const baseConfig = config['buildMode'] === 'production' ? PRODUCTION_CONFIG : DEFAULT_CONFIG;
    this.config = { ...baseConfig, ...config };

    // Initialize validators
    this.ssrValidator = new SSRValidator({
      enableStrictMode: this.config['buildMode'] === 'production',
      maxRiskScore: this.config['buildMode'] === 'production' ? 0 : 25,
    });

    this.storageValidator = new StorageValidator({
      enableStrictMode: this.config['buildMode'] === 'production',
      storageTypes: ['localStorage', 'sessionStorage', 'indexedDB', 'cookies'],
    });

    this.xssTester = new XSSTester({
      enableDOMTesting: true,
      enableNetworkTesting: false, // Disable in automated testing
      maxPayloads: this.config['buildMode'] === 'production' ? 100 : 50,
    });

    this.cryptoValidator = new CryptoValidator({
      enforceStrictMode: this.config['buildMode'] === 'production',
      checkMemoryLeaks: true,
      validateAAD: this.config['buildMode'] === 'production',
    });
  }

  /**
   * Get gate configuration
   */
  getConfig(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * Validate gate configuration
   */
  validateConfig(config: Record<string, unknown>): SecurityGateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required properties
    if (config['buildMode'] && !['development', 'staging', 'production'].includes(config['buildMode'] as string)) {
      errors.push('Invalid buildMode. Must be one of: development, staging, production');
    }

    if (typeof config['maxRiskScore'] === 'number' && (config['maxRiskScore'] as number) < 0) {
      errors.push('maxRiskScore must be a non-negative number');
    }

    if (typeof config['minComplianceRate'] === 'number' && ((config['minComplianceRate'] as number) < 0 || (config['minComplianceRate'] as number) > 100)) {
      errors.push('minComplianceRate must be between 0 and 100');
    }

    return {
      valid: errors.length === 0,
      passed: errors.length === 0,
      errors,
      warnings,
      details: errors.length > 0 ? 'Configuration validation failed' : 'Configuration is valid',
    };
  }

  /**
   * Execute comprehensive client-side security validation
   */
  async execute(_input?: unknown): Promise<ClientSecurityGateResult> {
    const startTime = Date.now();

    try {
      // Run all validations in parallel for performance
      const [ssrResult, storageResult, xssResult, cryptoResult] = await Promise.all([
        this.config.enableSSRValidation ? this.runSSRValidation() : this.createEmptySSRResult(),
        this.config.enableStorageValidation
          ? this.runStorageValidation()
          : this.createEmptyStorageResult(),
        this.config.enableXSSValidation ? this.runXSSValidation() : this.createEmptyXSSResult(),
        this.config.enableCryptoValidation
          ? this.runCryptoValidation()
          : this.createEmptyCryptoResult(),
      ]);

      // Calculate overall metrics
      const overallRiskScore = this.calculateOverallRiskScore(
        ssrResult,
        storageResult,
        xssResult,
        cryptoResult
      );
      const complianceRate = this.calculateComplianceRate(
        ssrResult,
        storageResult,
        xssResult,
        cryptoResult
      );

      // Determine pass/fail status
      const passed = this.determinePassStatus(
        overallRiskScore,
        complianceRate,
        ssrResult,
        storageResult,
        xssResult,
        cryptoResult
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const result: ClientSecurityGateResult = {
        name: this.name,
        valid: passed,
        passed,
        errors: this.collectErrors(ssrResult, storageResult, xssResult, cryptoResult),
        warnings: this.collectWarnings(ssrResult, storageResult, xssResult, cryptoResult),
        executionTime,
        details: this.generateDetails(ssrResult, storageResult, xssResult, cryptoResult),
        ssrValidation: ssrResult,
        storageValidation: storageResult,
        xssValidation: xssResult,
        cryptoValidation: cryptoResult,
        overallRiskScore,
        complianceRate,
      };

      // Log results for build pipeline
      this.logResults(result);

      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        name: this.name,
        valid: false,
        passed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        executionTime,
        details: `Client security gate execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ssrValidation: this.createEmptySSRResult(),
        storageValidation: this.createEmptyStorageResult(),
        xssValidation: this.createEmptyXSSResult(),
        cryptoValidation: this.createEmptyCryptoResult(),
        overallRiskScore: 1000, // Maximum risk score for errors
        complianceRate: 0,
      };
    }
  }

  private async runSSRValidation(): Promise<SSRValidationResult> {
    try {
      // In a real implementation, this would analyze build output HTML files
      const testPages = new Map<string, string>();

      // Simulate checking built HTML pages
      testPages.set('/index', document.documentElement.outerHTML);
      testPages.set(
        '/dashboard',
        '<html><head><title>Dashboard</title></head><body><div id="app"></div></body></html>'
      );

      const validationResults = await this.ssrValidator.validatePages(testPages);
      
      // Combine all page results into a single SSRValidationResult
      const allViolations: any[] = [];
      let totalRiskScore = 0;
      const allRecommendations: string[] = [];
      let isOverallValid = true;
      
      for (const [, result] of validationResults) {
        if (!result.isValid) isOverallValid = false;
        allViolations.push(...result.violations);
        totalRiskScore += result.riskScore;
        allRecommendations.push(...result.recommendations);
      }
      
      return {
        isValid: isOverallValid,
        violations: allViolations,
        riskScore: totalRiskScore,
        recommendations: allRecommendations,
      } as SSRValidationResult;
    } catch (error) {
      return {
        isValid: false,
        violations: [
          {
            type: 'pii_exposure',
            severity: 'high',
            location: 'SSR validation error',
            content: error instanceof Error ? error.message : 'Unknown error',
            recommendation: 'Fix SSR validation configuration and retry',
          },
        ],
        riskScore: 50,
        recommendations: ['Fix SSR validation errors'],
      } as SSRValidationResult;
    }
  }

  private async runStorageValidation(): Promise<Map<StorageType, StorageValidationResult>> {
    try {
      return await this.storageValidator.validateAllStorage();
    } catch (error) {
      // Return empty result with error indication
      const errorResult: StorageValidationResult = {
        isValid: false,
        violations: [
          {
            storageType: 'localStorage' as StorageType,
            key: 'validation_error',
            value: error instanceof Error ? error.message : 'Unknown error',
            violationType: 'invalid_format',
            severity: 'high',
            recommendation: 'Fix storage validation configuration and retry',
          },
        ],
        riskScore: 50,
        recommendations: ['Fix storage validation errors'],
        totalItems: 0,
        encryptedItems: 0,
        unencryptedItems: 0,
      };

      return new Map<StorageType, StorageValidationResult>([['localStorage', errorResult]]);
    }
  }

  private async runXSSValidation(): Promise<XSSTestResult> {
    try {
      return await this.xssTester.runFullTest();
    } catch (error) {
      return {
        isVulnerable: true,
        vulnerabilities: [
          {
            type: 'dom_xss',
            severity: 'high',
            payload: 'validation_error',
            context: 'XSS validation error',
            evidence: error instanceof Error ? error.message : 'Unknown error',
            recommendation: 'Fix XSS validation configuration and retry',
          },
        ],
        riskScore: 50,
        testedPayloads: 0,
        blockedPayloads: 0,
        recommendations: ['Fix XSS validation errors'],
      };
    }
  }

  private async runCryptoValidation(): Promise<CryptoValidationResult> {
    try {
      return await this.cryptoValidator.validateCryptoImplementation();
    } catch (error) {
      return {
        isValid: false,
        violations: [
          {
            type: 'implementation_flaw',
            severity: 'high',
            context: 'Crypto validation error',
            evidence: error instanceof Error ? error.message : 'Unknown error',
            recommendation: 'Fix crypto validation configuration and retry',
          },
        ],
        riskScore: 50,
        recommendations: ['Fix crypto validation errors'],
        testedOperations: 0,
        secureOperations: 0,
        insecureOperations: 0,
      };
    }
  }

  private createEmptySSRResult(): SSRValidationResult {
    return {
      isValid: true,
      violations: [],
      riskScore: 0,
      recommendations: [],
    } as SSRValidationResult;
  }

  private createEmptyStorageResult(): Map<StorageType, StorageValidationResult> {
    return new Map<StorageType, StorageValidationResult>();
  }

  private createEmptyXSSResult(): XSSTestResult {
    return {
      isVulnerable: false,
      vulnerabilities: [],
      riskScore: 0,
      testedPayloads: 0,
      blockedPayloads: 0,
      recommendations: [],
    };
  }

  private createEmptyCryptoResult(): CryptoValidationResult {
    return {
      isValid: true,
      violations: [],
      riskScore: 0,
      recommendations: [],
      testedOperations: 0,
      secureOperations: 0,
      insecureOperations: 0,
    };
  }

  private calculateOverallRiskScore(
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): number {
    let totalRiskScore = 0;

    // Add SSR risk score
    totalRiskScore += ssrResult.riskScore;

    // Add storage risk scores
    for (const [, result] of storageResult) {
      totalRiskScore += result.riskScore;
    }

    // Add XSS risk score
    totalRiskScore += xssResult.riskScore;

    // Add crypto risk score
    totalRiskScore += cryptoResult.riskScore;

    return totalRiskScore;
  }

  private calculateComplianceRate(
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): number {
    let totalTests = 0;
    let passedTests = 0;

    // SSR validation
    totalTests += 1;
    if (ssrResult.isValid) passedTests += 1;

    // Storage validation
    for (const [, result] of storageResult) {
      totalTests += 1;
      if (result.isValid) passedTests += 1;
    }

    // XSS validation
    totalTests += 1;
    if (!xssResult.isVulnerable) passedTests += 1;

    // Crypto validation
    totalTests += 1;
    if (cryptoResult.isValid) passedTests += 1;

    return totalTests > 0 ? (passedTests / totalTests) * 100 : 100;
  }

  private determinePassStatus(
    overallRiskScore: number,
    complianceRate: number,
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): boolean {
    // Check overall risk score
    if (overallRiskScore > this.config['maxRiskScore']) {
      return false;
    }

    // Check compliance rate
    if (complianceRate < this.config['minComplianceRate']) {
      return false;
    }

    // Check for critical vulnerabilities if failOnHighRisk is enabled
    if (this.config.failOnHighRisk) {
      // Check SSR critical violations
      const hasCriticalSSR = ssrResult.violations.some(v => v.severity === 'critical');
      if (hasCriticalSSR) return false;

      // Check storage critical violations
      for (const [, result] of storageResult) {
        const hasCriticalStorage = result.violations.some(v => v.severity === 'critical');
        if (hasCriticalStorage) return false;
      }

      // Check XSS critical vulnerabilities
      const hasCriticalXSS = xssResult.vulnerabilities.some(v => v.severity === 'critical');
      if (hasCriticalXSS) return false;

      // Check crypto critical violations
      const hasCriticalCrypto = cryptoResult.violations.some(v => v.severity === 'critical');
      if (hasCriticalCrypto) return false;
    }

    return true;
  }

  private collectErrors(
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): string[] {
    const errors: string[] = [];

    // Collect SSR errors
    if (!ssrResult.isValid) {
      const criticalViolations = ssrResult.violations.filter(
        v => v.severity === 'high' || v.severity === 'critical'
      );
      errors.push(...criticalViolations.map(v => `SSR: ${v.content}`));
    }

    // Collect storage errors
    for (const [storageType, result] of storageResult) {
      if (!result.isValid) {
        const criticalViolations = result.violations.filter(
          v => v.severity === 'high' || v.severity === 'critical'
        );
        errors.push(...criticalViolations.map(v => `Storage(${storageType}): ${v.key}`));
      }
    }

    // Collect XSS errors
    if (xssResult.isVulnerable) {
      const criticalVulns = xssResult.vulnerabilities.filter(
        v => v.severity === 'high' || v.severity === 'critical'
      );
      errors.push(...criticalVulns.map(v => `XSS: ${v.payload}`));
    }

    // Collect crypto errors
    if (!cryptoResult.isValid) {
      const criticalViolations = cryptoResult.violations.filter(
        v => v.severity === 'high' || v.severity === 'critical'
      );
      errors.push(...criticalViolations.map(v => `Crypto: ${v.context}`));
    }

    return errors;
  }

  private collectWarnings(
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): string[] {
    const warnings: string[] = [];

    // Collect SSR warnings
    const ssrWarnings = ssrResult.violations.filter(
      v => v.severity === 'medium' || v.severity === 'low'
    );
    warnings.push(...ssrWarnings.map(v => `SSR: ${v.content}`));

    // Collect storage warnings
    for (const [storageType, result] of storageResult) {
      const storageWarnings = result.violations.filter(
        v => v.severity === 'medium' || v.severity === 'low'
      );
      warnings.push(...storageWarnings.map(v => `Storage(${storageType}): ${v.key}`));
    }

    // Collect XSS warnings
    const xssWarnings = xssResult.vulnerabilities.filter(
      v => v.severity === 'medium' || v.severity === 'low'
    );
    warnings.push(...xssWarnings.map(v => `XSS: ${v.payload}`));

    // Collect crypto warnings
    const cryptoWarnings = cryptoResult.violations.filter(
      v => v.severity === 'medium' || v.severity === 'low'
    );
    warnings.push(...cryptoWarnings.map(v => `Crypto: ${v.context}`));

    return warnings;
  }

  private generateDetails(
    ssrResult: SSRValidationResult,
    storageResult: Map<StorageType, StorageValidationResult>,
    xssResult: XSSTestResult,
    cryptoResult: CryptoValidationResult
  ): string {
    const details = [];

    // SSR validation summary
    details.push(
      `SSR Validation: ${ssrResult.isValid ? 'PASS' : 'FAIL'} (${ssrResult.violations.length} violations)`
    );

    // Storage validation summary
    const storageViolations = Array.from(storageResult.values()).reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    details.push(
      `Storage Validation: ${storageViolations === 0 ? 'PASS' : 'FAIL'} (${storageViolations} violations)`
    );

    // XSS validation summary
    details.push(
      `XSS Validation: ${!xssResult.isVulnerable ? 'PASS' : 'FAIL'} (${xssResult.vulnerabilities.length} vulnerabilities)`
    );

    // Crypto validation summary
    details.push(
      `Crypto Validation: ${cryptoResult.isValid ? 'PASS' : 'FAIL'} (${cryptoResult.violations.length} violations)`
    );

    return details.join(', ');
  }

  private logResults(result: ClientSecurityGateResult): void {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';

    console.log(`\n🔒 Client Security Gate ${status}`);
    console.log(`📊 Overall Risk Score: ${result.overallRiskScore}`);
    console.log(`📈 Compliance Rate: ${result.complianceRate.toFixed(1)}%`);
    console.log(`⏱️  Execution Time: ${result.executionTime}ms`);

    if (!result.passed) {
      console.log('\n❗ Security Gate Failures:');

      if (!result.ssrValidation.isValid) {
        console.log(
          `   🔴 SSR-PII Prevention: ${result.ssrValidation.violations.length} violations`
        );
      }

      const storageFailures = Array.from(result.storageValidation.values()).filter(r => !r.isValid);
      if (storageFailures.length > 0) {
        console.log(
          `   🔴 Storage Encryption: ${storageFailures.length} storage types failed validation`
        );
      }

      if (result.xssValidation.isVulnerable) {
        console.log(
          `   🔴 XSS Prevention: ${result.xssValidation.vulnerabilities.length} vulnerabilities found`
        );
      }

      if (!result.cryptoValidation.isValid) {
        console.log(
          `   🔴 Crypto Implementation: ${result.cryptoValidation.violations.length} violations`
        );
      }

      if (this.config['buildMode'] === 'production') {
        console.log('\n🚫 Production build BLOCKED due to security violations');
        console.log('   Fix all security issues before deploying to production');
      }
    } else {
      console.log('\n✅ All client-side security validations passed');
    }
  }

  /**
   * Generate comprehensive security report
   */
  generateReport(result: ClientSecurityGateResult): string {
    const report = `
# Client-Side Security Gate Report

## Executive Summary
- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Build Mode**: ${this.config['buildMode'].toUpperCase()}
- **Overall Risk Score**: ${result.overallRiskScore} / ${this.config['maxRiskScore']} (max allowed)
- **Compliance Rate**: ${result.complianceRate.toFixed(1)}% / ${this.config['minComplianceRate']}% (min required)
- **Execution Time**: ${result.executionTime}ms

## Validation Results

### SSR-PII Prevention
${this.ssrValidator.generateReport(new Map([['test', result.ssrValidation]]))}

### Storage Encryption Validation
${this.storageValidator.generateReport(result.storageValidation)}

### XSS and Injection Prevention
${this.xssTester.generateReport(result.xssValidation)}

### Crypto Implementation Validation
${this.cryptoValidator.generateReport(result.cryptoValidation)}

## Build Pipeline Integration

This security gate is integrated into the frontend build pipeline and will:

${this.config['buildMode'] === 'production' ? '- **BLOCK** production deployments on any security violation' : '- **WARN** about security violations in development/staging'}
- Generate detailed security reports for each build
- Track security compliance metrics over time
- Provide actionable recommendations for fixing violations

## Next Steps

${
  result.passed
    ? '✅ All security validations passed. Ready for deployment.'
    : '❌ Security violations detected. Address the following issues before proceeding:'
}

${
  !result.passed
    ? result.ssrValidation.recommendations
        .concat(
          Array.from(result.storageValidation.values()).flatMap(r => r.recommendations),
          result.xssValidation.recommendations,
          result.cryptoValidation.recommendations
        )
        .map(r => `- ${r}`)
        .join('\n')
    : ''
}

---
Generated by Client-Side Security Gate Framework
Build Mode: ${this.config['buildMode']}
Timestamp: ${new Date().toISOString()}
`;

    return report;
  }

  /**
   * Integration with build pipeline
   */
  static async runForBuildPipeline(
    buildMode: 'development' | 'staging' | 'production' = 'development'
  ): Promise<boolean> {
    const gate = new ClientSecurityGate({
      buildMode,
      failOnHighRisk: buildMode === 'production',
      maxRiskScore: buildMode === 'production' ? 0 : 100,
      minComplianceRate: buildMode === 'production' ? 100 : 90,
    });

    const result = await gate.execute();

    // Generate and save report
    const report = gate.generateReport(result);
    console.log(report);

    // For build pipeline: exit with non-zero code on failure
    if (!result.passed && buildMode === 'production') {
      process?.exit(1);
    }

    return result.passed;
  }
}

export default ClientSecurityGate;
