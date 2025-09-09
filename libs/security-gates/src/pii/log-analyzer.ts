/**
 * Log Analysis for PII Exposure Detection
 *
 * Automated detection of Personally Identifiable Information (PII) and health data
 * exposure in application logs across all environments.
 */

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  healthDataRelated: boolean;
}

export interface LogAnalysisResult {
  passed: boolean;
  violations: PIIViolation[];
  summary: {
    totalLogs: number;
    violationsFound: number;
    criticalViolations: number;
    healthDataViolations: number;
  };
  errors: string[];
}

export interface PIIViolation {
  pattern: PIIPattern;
  match: string;
  redactedMatch: string;
  context: string;
  location: {
    file?: string;
    line?: number;
    timestamp?: string;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface LogAnalyzerConfig {
  logPaths: string[];
  patterns: PIIPattern[];
  contextLines: number;
  maxFileSize: number; // bytes
  excludePatterns: RegExp[];
  reportingLevel: 'all' | 'violations-only';
}

/**
 * Comprehensive PII detection patterns for healthcare application
 */
export const DEFAULT_PII_PATTERNS: PIIPattern[] = [
  // Health Data Patterns - Critical
  {
    name: 'cycle-data-json',
    pattern: /\b(?:cycleLength|periodFlow|symptoms|temperature|mood|notes)\s*[:=]\s*[^\s,}]+/gi,
    severity: 'critical',
    description: 'Cycle tracking data in JSON format',
    healthDataRelated: true,
  },
  {
    name: 'health-terms',
    pattern:
      /\b(?:period|menstrual|ovulation|fertility|pregnancy|contraception|cramps|pms|spotting)\b/gi,
    severity: 'critical',
    description: 'Healthcare-related terminology',
    healthDataRelated: true,
  },
  {
    name: 'medical-data',
    pattern: /\b(?:temperature|basal|bbt|cervical|mucus|luteal|follicular)\b/gi,
    severity: 'critical',
    description: 'Medical measurement terminology',
    healthDataRelated: true,
  },

  // Personal Identifiers - Critical
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'critical',
    description: 'Email addresses',
    healthDataRelated: false,
  },
  {
    name: 'phone-number',
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    severity: 'critical',
    description: 'Phone numbers',
    healthDataRelated: false,
  },
  {
    name: 'social-security',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'critical',
    description: 'Social Security Numbers',
    healthDataRelated: false,
  },
  {
    name: 'uuid-personal',
    pattern: /user[_-]?id\s*[:=]\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    severity: 'high',
    description: 'User ID UUIDs in logs',
    healthDataRelated: false,
  },

  // Crypto Data Exposure - Critical
  {
    name: 'plaintext-crypto-keys',
    pattern: /\b(?:private[_-]?key|secret[_-]?key|api[_-]?key)\s*[:=]\s*[A-Za-z0-9+/]{20,}/gi,
    severity: 'critical',
    description: 'Plaintext cryptographic keys',
    healthDataRelated: false,
  },
  {
    name: 'unencrypted-passwords',
    pattern: /\bpassword\s*[:=]\s*[^\s,}]+/gi,
    severity: 'critical',
    description: 'Plaintext passwords',
    healthDataRelated: false,
  },
  {
    name: 'jwt-tokens',
    pattern: /\beyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/g,
    severity: 'high',
    description: 'JWT tokens in logs',
    healthDataRelated: false,
  },

  // Financial Data - High
  {
    name: 'credit-card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    severity: 'high',
    description: 'Credit card numbers',
    healthDataRelated: false,
  },

  // IP and Network Info - Medium
  {
    name: 'ip-address',
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    severity: 'medium',
    description: 'IP addresses',
    healthDataRelated: false,
  },

  // Device Identifiers - Medium
  {
    name: 'device-id',
    pattern: /\bdevice[_-]?id\s*[:=]\s*[A-Za-z0-9-]+/gi,
    severity: 'medium',
    description: 'Device identifiers',
    healthDataRelated: false,
  },
];

export class LogAnalyzer {
  private config: LogAnalyzerConfig;

  constructor(config: Partial<LogAnalyzerConfig> = {}) {
    this.config = {
      logPaths: config.logPaths || ['.next/server.log', 'logs/*.log', 'app.log'],
      patterns: config.patterns || DEFAULT_PII_PATTERNS,
      contextLines: config.contextLines || 3,
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      excludePatterns: config.excludePatterns || [
        /test[_-]?data/gi,
        /example[_-]?data/gi,
        /mock[_-]?data/gi,
      ],
      reportingLevel: config.reportingLevel || 'violations-only',
    };
  }

  /**
   * Analyze logs for PII exposure
   */
  async analyzeLogs(logContent?: string[]): Promise<LogAnalysisResult> {
    const result: LogAnalysisResult = {
      passed: true,
      violations: [],
      summary: {
        totalLogs: 0,
        violationsFound: 0,
        criticalViolations: 0,
        healthDataViolations: 0,
      },
      errors: [],
    };

    try {
      const logs = logContent || (await this.readLogFiles());
      result.summary.totalLogs = logs.length;

      for (let i = 0; i < logs.length; i++) {
        const logEntry = logs[i];

        // Skip if matches exclude patterns
        if (this.shouldExclude(logEntry)) {
          continue;
        }

        const violations = this.scanLogEntry(logEntry, i);
        result.violations.push(...violations);
      }

      result.summary.violationsFound = result.violations.length;
      result.summary.criticalViolations = result.violations.filter(
        v => v.severity === 'critical'
      ).length;
      result.summary.healthDataViolations = result.violations.filter(
        v => v.pattern.healthDataRelated
      ).length;
      result.passed = result.violations.length === 0;
    } catch (error) {
      result.errors.push(
        `Log analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.passed = false;
    }

    return result;
  }

  /**
   * Read log files from configured paths
   */
  private async readLogFiles(): Promise<string[]> {
    const logs: string[] = [];
    const fs = await import('fs/promises');
    // const path = await import('path'); // Currently unused
    const glob = await import('glob');

    for (const logPath of this.config.logPaths) {
      try {
        const files = glob.sync(logPath);
        const fileArray = Array.isArray(files) ? files : [files];

        for (const file of fileArray) {
          const filePath = String(file);
          try {
            const stats = await fs.stat(filePath);

            if (stats.size > this.config.maxFileSize) {
              console.warn(`Skipping large log file: ${filePath} (${stats.size} bytes)`);
              continue;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            logs.push(...lines);
          } catch (fileError) {
            console.warn(`Could not read log file ${filePath}:`, fileError);
          }
        }
      } catch (globError) {
        console.warn(`Could not glob pattern ${logPath}:`, globError);
      }
    }

    return logs;
  }

  /**
   * Check if log entry should be excluded from analysis
   */
  private shouldExclude(logEntry: string): boolean {
    return this.config.excludePatterns.some(pattern => pattern.test(logEntry));
  }

  /**
   * Scan individual log entry for PII patterns
   */
  private scanLogEntry(logEntry: string, lineNumber: number): PIIViolation[] {
    const violations: PIIViolation[] = [];

    for (const pattern of this.config.patterns) {
      const matches = logEntry.matchAll(pattern.pattern);

      for (const match of matches) {
        const violation: PIIViolation = {
          pattern,
          match: match[0],
          redactedMatch: this.redactMatch(match[0], pattern),
          context: this.extractContext(logEntry, match.index || 0),
          location: {
            line: lineNumber + 1,
          },
          severity: pattern.severity,
        };

        violations.push(violation);
      }
    }

    return violations;
  }

  /**
   * Redact sensitive information in matches for safe reporting
   */
  private redactMatch(match: string, pattern: PIIPattern): string {
    switch (pattern.name) {
      case 'email':
        return match.replace(/([^@]+)@/, '***@');
      case 'phone-number':
        return match.replace(/\d{3}/g, '***');
      case 'social-security':
        return '***-**-****';
      case 'credit-card':
        return '****-****-****-****';
      case 'plaintext-crypto-keys':
      case 'unencrypted-passwords':
      case 'jwt-tokens':
        return `[${pattern.name.toUpperCase()}_REDACTED]`;
      case 'cycle-data-json':
      case 'health-terms':
      case 'medical-data':
        return `[HEALTH_DATA_REDACTED]`;
      default:
        return match.length > 10
          ? `${match.substring(0, 3)}***${match.substring(match.length - 3)}`
          : '***';
    }
  }

  /**
   * Extract context around a match for violation reporting
   */
  private extractContext(logEntry: string, matchIndex: number): string {
    const contextStart = Math.max(0, matchIndex - 50);
    const contextEnd = Math.min(logEntry.length, matchIndex + 100);
    const context = logEntry.substring(contextStart, contextEnd);

    return context.length < logEntry.length ? `...${context}...` : context;
  }

  /**
   * Generate formatted report of PII violations
   */
  generateReport(result: LogAnalysisResult): string {
    if (result.passed) {
      return '✅ PII Analysis PASSED - No violations detected';
    }

    let report = '❌ PII Analysis FAILED\n\n';

    report += `Summary:\n`;
    report += `- Total logs analyzed: ${result.summary.totalLogs}\n`;
    report += `- Violations found: ${result.summary.violationsFound}\n`;
    report += `- Critical violations: ${result.summary.criticalViolations}\n`;
    report += `- Health data violations: ${result.summary.healthDataViolations}\n\n`;

    if (result.violations.length > 0) {
      report += 'Violations by Severity:\n';

      const bySeverity = result.violations.reduce(
        (acc, violation) => {
          acc[violation.severity] = (acc[violation.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(bySeverity).forEach(([severity, count]) => {
        report += `- ${severity.toUpperCase()}: ${count}\n`;
      });

      report += '\nDetailed Violations:\n';
      result.violations.forEach((violation, index) => {
        report += `\n${index + 1}. ${violation.pattern.name} (${violation.severity})\n`;
        report += `   Description: ${violation.pattern.description}\n`;
        report += `   Match: ${violation.redactedMatch}\n`;
        report += `   Context: ${violation.context}\n`;
        if (violation.location.line) {
          report += `   Line: ${violation.location.line}\n`;
        }
      });
    }

    if (result.errors.length > 0) {
      report += '\nErrors:\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    return report;
  }

  /**
   * Validate log analyzer configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.logPaths || this.config.logPaths.length === 0) {
      errors.push('Log paths must be specified');
    }

    if (!this.config.patterns || this.config.patterns.length === 0) {
      errors.push('PII patterns must be specified');
    }

    if (this.config.contextLines < 0) {
      errors.push('Context lines must be non-negative');
    }

    if (this.config.maxFileSize <= 0) {
      errors.push('Max file size must be positive');
    }

    // Validate patterns
    for (const pattern of this.config.patterns) {
      try {
        new RegExp(pattern.pattern);
      } catch (regexError) {
        errors.push(`Invalid regex pattern for ${pattern.name}: ${regexError}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Default log analyzer instance with healthcare-focused configuration
 */
export const defaultLogAnalyzer = new LogAnalyzer({
  patterns: DEFAULT_PII_PATTERNS,
  contextLines: 3,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  reportingLevel: 'violations-only',
});

/**
 * Quick analysis function for CI/CD integration
 */
export async function analyzeLogsForPII(logContent?: string[]): Promise<LogAnalysisResult> {
  return await defaultLogAnalyzer.analyzeLogs(logContent);
}
