/**
 * Main PII Prevention Security Gate
 *
 * Comprehensive PII and data leakage prevention gate that orchestrates
 * log analysis, error sanitization, debug filtering, and memory analysis
 * to ensure zero PII exposure across all application components.
 */

import { LogAnalyzer, LogAnalysisResult, analyzeLogsForPII } from './log-analyzer';
import { ErrorSanitizer, ErrorSanitizationResult, sanitizeErrorMessage } from './error-sanitizer';
import { DebugFilter, DebugFilterResult, scanForDebugInfo } from './debug-filter';
import {
  MemoryAnalyzer,
  MemoryAnalysisResult,
  analyzeMemoryForSensitiveData,
} from './memory-analyzer';

export interface PIIGateResult {
  passed: boolean;
  results: {
    logAnalysis: LogAnalysisResult;
    errorSanitization: ErrorSanitizationResult;
    debugFilter: DebugFilterResult;
    memoryAnalysis: MemoryAnalysisResult;
  };
  summary: {
    totalViolations: number;
    criticalViolations: number;
    healthDataViolations: number;
    cryptoViolations: number;
  };
  recommendations: string[];
  errors: string[];
}

export interface PIIGateConfig {
  enableLogAnalysis: boolean;
  enableErrorSanitization: boolean;
  enableDebugFilter: boolean;
  enableMemoryAnalysis: boolean;
  logPaths: string[];
  errorSamples: string[];
  targetEnvironment: 'development' | 'staging' | 'production';
  failOnCritical: boolean;
  reportingLevel: 'summary' | 'detailed' | 'verbose';
}

export class PIIPreventionGate {
  private config: PIIGateConfig;
  private logAnalyzer: LogAnalyzer;
  private errorSanitizer: ErrorSanitizer;
  private debugFilter: DebugFilter;
  private memoryAnalyzer: MemoryAnalyzer;

  constructor(config: Partial<PIIGateConfig> = {}) {
    this.config = {
      enableLogAnalysis: config.enableLogAnalysis !== false,
      enableErrorSanitization: config.enableErrorSanitization !== false,
      enableDebugFilter: config.enableDebugFilter !== false,
      enableMemoryAnalysis: config.enableMemoryAnalysis !== false,
      logPaths: config.logPaths || ['.next/server.log', 'logs/*.log', 'app.log'],
      errorSamples: config.errorSamples || [],
      targetEnvironment: config.targetEnvironment || 'production',
      failOnCritical: config.failOnCritical !== false,
      reportingLevel: config.reportingLevel || 'detailed',
    };

    this.logAnalyzer = new LogAnalyzer({
      logPaths: this.config.logPaths,
      reportingLevel: 'violations-only',
    });

    this.errorSanitizer = new ErrorSanitizer({
      environments: [this.config.targetEnvironment],
      preserveStackTrace: this.config.targetEnvironment !== 'production',
    });

    this.debugFilter = new DebugFilter({
      targetEnvironment: this.config.targetEnvironment,
      reportLevel: 'violations-only',
    });

    this.memoryAnalyzer = new MemoryAnalyzer({
      reportingLevel: 'violations-only',
    });
  }

  /**
   * Execute comprehensive PII prevention validation
   */
  async execute(): Promise<PIIGateResult> {
    const result: PIIGateResult = {
      passed: true,
      results: {
        logAnalysis: {
          passed: true,
          violations: [],
          summary: {
            totalLogs: 0,
            violationsFound: 0,
            criticalViolations: 0,
            healthDataViolations: 0,
          },
          errors: [],
        },
        errorSanitization: {
          passed: true,
          violations: [],
          summary: {
            totalErrors: 0,
            violationsFound: 0,
            criticalViolations: 0,
            healthDataViolations: 0,
          },
          errors: [],
        },
        debugFilter: {
          passed: true,
          violations: [],
          summary: {
            totalFiles: 0,
            violationsFound: 0,
            criticalViolations: 0,
            filesWithViolations: 0,
          },
          errors: [],
        },
        memoryAnalysis: {
          passed: true,
          violations: [],
          summary: {
            totalRegions: 0,
            violationsFound: 0,
            criticalViolations: 0,
            healthDataPersistence: 0,
            cryptoPersistence: 0,
          },
          errors: [],
          analysisMetadata: { timestamp: '', memorySize: 0, gcCollections: 0, heapUsed: 0 },
        },
      },
      summary: {
        totalViolations: 0,
        criticalViolations: 0,
        healthDataViolations: 0,
        cryptoViolations: 0,
      },
      recommendations: [],
      errors: [],
    };

    try {
      // Execute log analysis
      if (this.config.enableLogAnalysis) {
        try {
          result.results.logAnalysis = await this.logAnalyzer.analyzeLogs();
          if (!result.results.logAnalysis.passed) {
            result.passed = false;
          }
        } catch (error) {
          result.errors.push(
            `Log analysis failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Execute error sanitization validation
      if (this.config.enableErrorSanitization && this.config.errorSamples.length > 0) {
        try {
          result.results.errorSanitization = this.errorSanitizer.validateErrorMessages(
            this.config.errorSamples
          );
          if (!result.results.errorSanitization.passed) {
            result.passed = false;
          }
        } catch (error) {
          result.errors.push(
            `Error sanitization validation failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Execute debug filter validation
      if (this.config.enableDebugFilter) {
        try {
          result.results.debugFilter = await this.debugFilter.scanBuildFiles();
          if (!result.results.debugFilter.passed) {
            result.passed = false;
          }
        } catch (error) {
          result.errors.push(
            `Debug filter validation failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Execute memory analysis
      if (this.config.enableMemoryAnalysis) {
        try {
          result.results.memoryAnalysis = await this.memoryAnalyzer.analyzeMemory();
          if (!result.results.memoryAnalysis.passed) {
            result.passed = false;
          }
        } catch (error) {
          result.errors.push(
            `Memory analysis failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Calculate summary statistics
      result.summary = this.calculateSummary(result.results);

      // Generate recommendations
      result.recommendations = this.generateRecommendations(result.results);

      // Apply failure criteria
      if (this.config.failOnCritical && result.summary.criticalViolations > 0) {
        result.passed = false;
      }
    } catch (error) {
      result.errors.push(
        `PII gate execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.passed = false;
    }

    return result;
  }

  /**
   * Calculate summary statistics from all validation results
   */
  private calculateSummary(results: PIIGateResult['results']) {
    return {
      totalViolations:
        results.logAnalysis.violations.length +
        results.errorSanitization.violations.length +
        results.debugFilter.violations.length +
        results.memoryAnalysis.violations.length,

      criticalViolations:
        results.logAnalysis.violations.filter(v => v.severity === 'critical').length +
        results.errorSanitization.violations.filter(v => v.severity === 'critical').length +
        results.debugFilter.violations.filter(v => v.severity === 'critical').length +
        results.memoryAnalysis.violations.filter(v => v.severity === 'critical').length,

      healthDataViolations:
        results.logAnalysis.violations.filter(v => v.pattern.healthDataRelated).length +
        results.errorSanitization.violations.filter(v => v.rule.category === 'health-data').length +
        results.memoryAnalysis.violations.filter(v => v.pattern.category === 'health-data').length,

      cryptoViolations:
        results.errorSanitization.violations.filter(v => v.rule.category === 'crypto').length +
        results.memoryAnalysis.violations.filter(v => v.pattern.category === 'crypto').length,
    };
  }

  /**
   * Generate security recommendations based on validation results
   */
  private generateRecommendations(results: PIIGateResult['results']): string[] {
    const recommendations: string[] = [];

    // Log analysis recommendations
    if (results.logAnalysis.violations.length > 0) {
      recommendations.push(
        '🔍 Log Analysis: Remove PII from application logs and implement structured logging with data sanitization'
      );

      if (results.logAnalysis.summary.healthDataViolations > 0) {
        recommendations.push(
          '🏥 Health Data: Implement client-side encryption for all health data before any logging or processing'
        );
      }
    }

    // Error sanitization recommendations
    if (results.errorSanitization.violations.length > 0) {
      recommendations.push(
        '⚠️ Error Handling: Implement error message sanitization middleware to prevent PII exposure in error responses'
      );

      if (results.errorSanitization.summary.criticalViolations > 0) {
        recommendations.push(
          '🚨 Critical Errors: Replace all error messages containing sensitive data with generic error codes'
        );
      }
    }

    // Debug filter recommendations
    if (results.debugFilter.violations.length > 0) {
      recommendations.push(
        '🛠️ Debug Information: Configure build process to remove debug information in production builds'
      );

      if (results.debugFilter.summary.criticalViolations > 0) {
        recommendations.push(
          '📋 Source Maps: Disable source map generation for production builds and remove any debug console statements'
        );
      }
    }

    // Memory analysis recommendations
    if (results.memoryAnalysis.violations.length > 0) {
      recommendations.push(
        '💾 Memory Security: Implement proper zeroization of sensitive data after use'
      );

      if (results.memoryAnalysis.summary.healthDataPersistence > 0) {
        recommendations.push(
          '🔒 Health Data Memory: Ensure health data is encrypted in memory and properly cleared after processing'
        );
      }

      if (results.memoryAnalysis.summary.cryptoPersistence > 0) {
        recommendations.push(
          '🗝️ Crypto Material: Implement secure memory handling for cryptographic keys with immediate zeroization'
        );
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push(
        '✅ PII Prevention: All validation checks passed - maintain current security practices'
      );
    } else {
      recommendations.push(
        '📚 Documentation: Update security documentation to reflect current PII prevention measures'
      );
      recommendations.push('🔄 Testing: Add automated PII detection tests to CI/CD pipeline');
      recommendations.push(
        '📊 Monitoring: Implement runtime PII detection monitoring for production environments'
      );
    }

    return recommendations;
  }

  /**
   * Generate comprehensive security gate report
   */
  generateReport(result: PIIGateResult): string {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    let report = `🛡️ PII Prevention Security Gate: ${status}\n`;
    report += `Environment: ${this.config.targetEnvironment}\n`;
    report += `Timestamp: ${new Date().toISOString()}\n\n`;

    // Executive Summary
    report += `📊 Executive Summary:\n`;
    report += `- Total Violations: ${result.summary.totalViolations}\n`;
    report += `- Critical Violations: ${result.summary.criticalViolations}\n`;
    report += `- Health Data Violations: ${result.summary.healthDataViolations}\n`;
    report += `- Crypto Violations: ${result.summary.cryptoViolations}\n\n`;

    // Validation Results
    if (this.config.reportingLevel !== 'summary') {
      report += `📋 Validation Results:\n\n`;

      // Log Analysis Results
      if (this.config.enableLogAnalysis) {
        const logStatus = result.results.logAnalysis.passed ? '✅' : '❌';
        report += `${logStatus} Log Analysis:\n`;
        report += `  - Logs scanned: ${result.results.logAnalysis.summary.totalLogs}\n`;
        report += `  - Violations: ${result.results.logAnalysis.summary.violationsFound}\n`;
        if (result.results.logAnalysis.summary.violationsFound > 0) {
          report += `  - Critical: ${result.results.logAnalysis.summary.criticalViolations}\n`;
          report += `  - Health data: ${result.results.logAnalysis.summary.healthDataViolations}\n`;
        }
        report += '\n';
      }

      // Error Sanitization Results
      if (this.config.enableErrorSanitization) {
        const errorStatus = result.results.errorSanitization.passed ? '✅' : '❌';
        report += `${errorStatus} Error Sanitization:\n`;
        report += `  - Errors tested: ${result.results.errorSanitization.summary.totalErrors}\n`;
        report += `  - Violations: ${result.results.errorSanitization.summary.violationsFound}\n`;
        if (result.results.errorSanitization.summary.violationsFound > 0) {
          report += `  - Critical: ${result.results.errorSanitization.summary.criticalViolations}\n`;
          report += `  - Health data: ${result.results.errorSanitization.summary.healthDataViolations}\n`;
        }
        report += '\n';
      }

      // Debug Filter Results
      if (this.config.enableDebugFilter) {
        const debugStatus = result.results.debugFilter.passed ? '✅' : '❌';
        report += `${debugStatus} Debug Information Filter:\n`;
        report += `  - Files scanned: ${result.results.debugFilter.summary.totalFiles}\n`;
        report += `  - Files with violations: ${result.results.debugFilter.summary.filesWithViolations}\n`;
        report += `  - Total violations: ${result.results.debugFilter.summary.violationsFound}\n`;
        if (result.results.debugFilter.summary.violationsFound > 0) {
          report += `  - Critical: ${result.results.debugFilter.summary.criticalViolations}\n`;
        }
        report += '\n';
      }

      // Memory Analysis Results
      if (this.config.enableMemoryAnalysis) {
        const memoryStatus = result.results.memoryAnalysis.passed ? '✅' : '❌';
        report += `${memoryStatus} Memory Analysis:\n`;
        report += `  - Memory regions: ${result.results.memoryAnalysis.summary.totalRegions}\n`;
        report += `  - Violations: ${result.results.memoryAnalysis.summary.violationsFound}\n`;
        if (result.results.memoryAnalysis.summary.violationsFound > 0) {
          report += `  - Critical: ${result.results.memoryAnalysis.summary.criticalViolations}\n`;
          report += `  - Health data: ${result.results.memoryAnalysis.summary.healthDataPersistence}\n`;
          report += `  - Crypto data: ${result.results.memoryAnalysis.summary.cryptoPersistence}\n`;
        }
        report += '\n';
      }
    }

    // Security Recommendations
    if (result.recommendations.length > 0) {
      report += `💡 Security Recommendations:\n`;
      result.recommendations.forEach(rec => {
        report += `${rec}\n`;
      });
      report += '\n';
    }

    // Detailed Violations (verbose mode only)
    if (this.config.reportingLevel === 'verbose' && result.summary.totalViolations > 0) {
      report += `🔍 Detailed Violations:\n\n`;

      if (result.results.logAnalysis.violations.length > 0) {
        report += this.logAnalyzer.generateReport(result.results.logAnalysis) + '\n\n';
      }

      if (result.results.errorSanitization.violations.length > 0) {
        report += this.errorSanitizer.generateReport(result.results.errorSanitization) + '\n\n';
      }

      if (result.results.debugFilter.violations.length > 0) {
        report += this.debugFilter.generateReport(result.results.debugFilter) + '\n\n';
      }

      if (result.results.memoryAnalysis.violations.length > 0) {
        report += this.memoryAnalyzer.generateReport(result.results.memoryAnalysis) + '\n\n';
      }
    }

    // Errors
    if (result.errors.length > 0) {
      report += `🚨 Gate Execution Errors:\n`;
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    // Next Steps
    report += `📋 Next Steps:\n`;
    if (result.passed) {
      report += `- ✅ Gate passed - deployment can proceed\n`;
      report += `- 📊 Review recommendations for continuous improvement\n`;
      report += `- 🔄 Schedule regular PII prevention audits\n`;
    } else {
      report += `- 🚫 Gate failed - fix violations before deployment\n`;
      report += `- 🔧 Address critical violations immediately\n`;
      report += `- ♻️ Re-run gate validation after fixes\n`;
    }

    return report;
  }

  /**
   * Quick validation function for CI/CD integration
   */
  static async quickValidation(config: Partial<PIIGateConfig> = {}): Promise<boolean> {
    const gate = new PIIPreventionGate(config);
    const result = await gate.execute();
    return result.passed;
  }

  /**
   * Validate gate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(this.config.targetEnvironment)) {
      errors.push(`Invalid target environment: ${this.config.targetEnvironment}`);
    }

    const validReportingLevels = ['summary', 'detailed', 'verbose'];
    if (!validReportingLevels.includes(this.config.reportingLevel)) {
      errors.push(`Invalid reporting level: ${this.config.reportingLevel}`);
    }

    if (!this.config.logPaths || this.config.logPaths.length === 0) {
      errors.push('Log paths must be specified for log analysis');
    }

    // Validate component configurations
    const logValidation = this.logAnalyzer.validateConfig();
    if (!logValidation.valid) {
      errors.push(...logValidation.errors.map(e => `Log analyzer: ${e}`));
    }

    const errorValidation = this.errorSanitizer.validateConfig();
    if (!errorValidation.valid) {
      errors.push(...errorValidation.errors.map(e => `Error sanitizer: ${e}`));
    }

    const debugValidation = this.debugFilter.validateConfig();
    if (!debugValidation.valid) {
      errors.push(...debugValidation.errors.map(e => `Debug filter: ${e}`));
    }

    const memoryValidation = this.memoryAnalyzer.validateConfig();
    if (!memoryValidation.valid) {
      errors.push(...memoryValidation.errors.map(e => `Memory analyzer: ${e}`));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Default PII prevention gate with healthcare-focused configuration
 */
export const defaultPIIGate = new PIIPreventionGate({
  enableLogAnalysis: true,
  enableErrorSanitization: true,
  enableDebugFilter: true,
  enableMemoryAnalysis: true,
  targetEnvironment: 'production',
  failOnCritical: true,
  reportingLevel: 'detailed',
});

/**
 * Quick PII validation function for immediate use
 */
export async function validatePIIPrevention(
  config: Partial<PIIGateConfig> = {}
): Promise<PIIGateResult> {
  const gate = new PIIPreventionGate(config);
  return await gate.execute();
}

/**
 * Export all PII prevention components
 */
export {
  LogAnalyzer,
  ErrorSanitizer,
  DebugFilter,
  MemoryAnalyzer,
  analyzeLogsForPII,
  sanitizeErrorMessage,
  scanForDebugInfo,
  analyzeMemoryForSensitiveData,
};
