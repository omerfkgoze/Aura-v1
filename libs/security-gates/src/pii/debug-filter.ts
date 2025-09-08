/**
 * Debug Information Filtering for Production Builds
 *
 * Validates and filters debug information in production builds to prevent
 * exposure of sensitive data, source code, and internal system details.
 */

export interface DebugPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  category: 'source-maps' | 'console-logs' | 'debug-vars' | 'comments' | 'error-details';
  allowedEnvironments: ('development' | 'staging' | 'production')[];
}

export interface DebugFilterResult {
  passed: boolean;
  violations: DebugViolation[];
  summary: {
    totalFiles: number;
    violationsFound: number;
    criticalViolations: number;
    filesWithViolations: number;
  };
  errors: string[];
}

export interface DebugViolation {
  pattern: DebugPattern;
  match: string;
  file: string;
  line: number;
  context: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface DebugFilterConfig {
  patterns: DebugPattern[];
  targetEnvironment: 'development' | 'staging' | 'production';
  scanPaths: string[];
  excludePaths: string[];
  maxFileSize: number;
  reportLevel: 'all' | 'violations-only';
}

/**
 * Comprehensive debug filtering patterns for healthcare applications
 */
export const DEFAULT_DEBUG_PATTERNS: DebugPattern[] = [
  // Source Maps - Critical in Production
  {
    name: 'source-map-reference',
    pattern: /\/\/[@#]\s*sourceMappingURL\s*=\s*[^\s]+/g,
    severity: 'critical',
    description: 'Source map references in production builds',
    category: 'source-maps',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'inline-source-maps',
    pattern: /\/\/[@#]\s*sourceMappingURL\s*=\s*data:application\/json/g,
    severity: 'critical',
    description: 'Inline source maps in production builds',
    category: 'source-maps',
    allowedEnvironments: ['development'],
  },

  // Console Logging - High in Production
  {
    name: 'console-debug',
    pattern: /console\.(debug|log|info)\s*\(/g,
    severity: 'high',
    description: 'Console debug statements in production',
    category: 'console-logs',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'console-sensitive-data',
    pattern: /console\.[a-z]+\s*\([^)]*(?:password|token|key|secret|health|cycle|period)[^)]*\)/gi,
    severity: 'critical',
    description: 'Console logs with sensitive data references',
    category: 'console-logs',
    allowedEnvironments: [],
  },

  // Debug Variables and Flags - High
  {
    name: 'debug-flags',
    pattern: /\b(?:DEBUG|__DEV__|process\.env\.NODE_ENV\s*===?\s*['"](development|debug)['"])\b/g,
    severity: 'medium',
    description: 'Debug flags and environment checks',
    category: 'debug-vars',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'debug-variables',
    pattern: /\b(?:debugMode|isDebug|verbose|traceEnabled)\s*=\s*true/gi,
    severity: 'medium',
    description: 'Debug variables set to true',
    category: 'debug-vars',
    allowedEnvironments: ['development', 'staging'],
  },

  // Development Comments - Medium
  {
    name: 'todo-comments',
    pattern: /\/\*\s*(?:TODO|FIXME|HACK|XXX|BUG)[^*]*\*\//gi,
    severity: 'medium',
    description: 'Development TODO/FIXME comments',
    category: 'comments',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'debug-comments',
    pattern: /\/\*\s*DEBUG[^*]*\*\/|\/\/\s*DEBUG[^\n\r]*/gi,
    severity: 'medium',
    description: 'Debug comments in production',
    category: 'comments',
    allowedEnvironments: ['development', 'staging'],
  },

  // Sensitive Information in Comments - Critical
  {
    name: 'credentials-in-comments',
    pattern: /\/[*/]\s*(?:password|token|key|secret|api_key)[^*\n]*[*\/]?/gi,
    severity: 'critical',
    description: 'Credential information in comments',
    category: 'comments',
    allowedEnvironments: [],
  },
  {
    name: 'health-data-comments',
    pattern: /\/[*/]\s*(?:period|menstrual|cycle|fertility|pregnancy)[^*\n]*[*\/]?/gi,
    severity: 'critical',
    description: 'Health data references in comments',
    category: 'comments',
    allowedEnvironments: [],
  },

  // Error Details - High
  {
    name: 'detailed-stack-traces',
    pattern: /\.stack\s*\|\|\s*[^;]+|Error\s*:\s*[^;]{50,}/g,
    severity: 'high',
    description: 'Detailed error stack traces in production',
    category: 'error-details',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'error-with-sensitive-data',
    pattern: /throw\s+new\s+Error\s*\([^)]*(?:password|token|key|secret|health|cycle)[^)]*\)/gi,
    severity: 'critical',
    description: 'Error messages containing sensitive data',
    category: 'error-details',
    allowedEnvironments: [],
  },

  // Development Utilities - Medium
  {
    name: 'testing-utilities',
    pattern: /\b(?:describe|it|test|expect|jest|mocha|chai)\s*\(/g,
    severity: 'high',
    description: 'Testing framework code in production',
    category: 'debug-vars',
    allowedEnvironments: ['development'],
  },
  {
    name: 'dev-server-references',
    pattern: /localhost:\d+|127\.0\.0\.1:\d+|0\.0\.0\.0:\d+/g,
    severity: 'medium',
    description: 'Development server references',
    category: 'debug-vars',
    allowedEnvironments: ['development'],
  },

  // Performance Debugging - Medium
  {
    name: 'performance-marks',
    pattern: /performance\.(?:mark|measure|now)\s*\(/g,
    severity: 'medium',
    description: 'Performance debugging code',
    category: 'debug-vars',
    allowedEnvironments: ['development', 'staging'],
  },
  {
    name: 'console-time',
    pattern: /console\.(?:time|timeEnd|profile|profileEnd)\s*\(/g,
    severity: 'medium',
    description: 'Console timing/profiling code',
    category: 'console-logs',
    allowedEnvironments: ['development', 'staging'],
  },
];

export class DebugFilter {
  private config: DebugFilterConfig;

  constructor(config: Partial<DebugFilterConfig> = {}) {
    this.config = {
      patterns: config.patterns || DEFAULT_DEBUG_PATTERNS,
      targetEnvironment: config.targetEnvironment || 'production',
      scanPaths: config.scanPaths || ['dist', 'build', '.next'],
      excludePaths: config.excludePaths || ['node_modules', '.git', 'test', '__tests__'],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      reportLevel: config.reportLevel || 'violations-only',
    };
  }

  /**
   * Scan production builds for debug information
   */
  async scanBuildFiles(): Promise<DebugFilterResult> {
    const result: DebugFilterResult = {
      passed: true,
      violations: [],
      summary: {
        totalFiles: 0,
        violationsFound: 0,
        criticalViolations: 0,
        filesWithViolations: 0,
      },
      errors: [],
    };

    try {
      const files = await this.findBuildFiles();
      result.summary.totalFiles = files.length;

      const filesWithViolations = new Set<string>();

      for (const file of files) {
        try {
          const violations = await this.scanFile(file);
          result.violations.push(...violations);

          if (violations.length > 0) {
            filesWithViolations.add(file);
          }
        } catch (error) {
          result.errors.push(
            `Failed to scan ${file}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      result.summary.violationsFound = result.violations.length;
      result.summary.criticalViolations = result.violations.filter(
        v => v.severity === 'critical'
      ).length;
      result.summary.filesWithViolations = filesWithViolations.size;
      result.passed = result.violations.length === 0;
    } catch (error) {
      result.errors.push(
        `Build scan failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.passed = false;
    }

    return result;
  }

  /**
   * Find build files to scan
   */
  private async findBuildFiles(): Promise<string[]> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const glob = await import('glob');

    const files: string[] = [];

    for (const scanPath of this.config.scanPaths) {
      try {
        // Scan for JavaScript, TypeScript, CSS, and map files
        const patterns = [
          `${scanPath}/**/*.js`,
          `${scanPath}/**/*.ts`,
          `${scanPath}/**/*.jsx`,
          `${scanPath}/**/*.tsx`,
          `${scanPath}/**/*.css`,
          `${scanPath}/**/*.html`,
          `${scanPath}/**/*.map`,
        ];

        for (const pattern of patterns) {
          const matchedFiles = await glob.glob(pattern);

          for (const file of matchedFiles) {
            // Skip excluded paths
            if (this.shouldExcludeFile(file)) {
              continue;
            }

            try {
              const stats = await fs.stat(file);
              if (stats.size > this.config.maxFileSize) {
                console.warn(`Skipping large file: ${file} (${stats.size} bytes)`);
                continue;
              }

              files.push(file);
            } catch (statError) {
              console.warn(`Could not stat file ${file}:`, statError);
            }
          }
        }
      } catch (globError) {
        console.warn(`Could not glob scan path ${scanPath}:`, globError);
      }
    }

    return files;
  }

  /**
   * Check if file should be excluded from scanning
   */
  private shouldExcludeFile(filePath: string): boolean {
    return this.config.excludePaths.some(excludePath => filePath.includes(excludePath));
  }

  /**
   * Scan individual file for debug patterns
   */
  private async scanFile(filePath: string): Promise<DebugViolation[]> {
    const fs = await import('fs/promises');
    const violations: DebugViolation[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const pattern of this.config.patterns) {
        // Skip patterns allowed in current environment
        if (pattern.allowedEnvironments.includes(this.config.targetEnvironment)) {
          continue;
        }

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          const matches = line.matchAll(pattern.pattern);

          for (const match of matches) {
            const violation: DebugViolation = {
              pattern,
              match: match[0],
              file: filePath,
              line: lineIndex + 1,
              context: this.extractContext(lines, lineIndex),
              severity: pattern.severity,
              suggestion: this.generateSuggestion(pattern),
            };

            violations.push(violation);
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Could not read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return violations;
  }

  /**
   * Extract context around a violation
   */
  private extractContext(lines: string[], lineIndex: number): string {
    const contextStart = Math.max(0, lineIndex - 2);
    const contextEnd = Math.min(lines.length, lineIndex + 3);
    const contextLines = lines.slice(contextStart, contextEnd);

    return contextLines
      .map((line, index) => {
        const actualLineNum = contextStart + index + 1;
        const marker = actualLineNum === lineIndex + 1 ? '> ' : '  ';
        return `${marker}${actualLineNum}: ${line}`;
      })
      .join('\n');
  }

  /**
   * Generate remediation suggestion for violation
   */
  private generateSuggestion(pattern: DebugPattern): string {
    switch (pattern.category) {
      case 'source-maps':
        return 'Remove source map references or configure build to exclude them in production';
      case 'console-logs':
        return 'Remove console statements or use a logger that filters by environment';
      case 'debug-vars':
        return 'Remove debug variables or ensure they are properly configured for production';
      case 'comments':
        return 'Remove development comments or move sensitive information to documentation';
      case 'error-details':
        return 'Use sanitized error messages in production builds';
      default:
        return 'Review and remove debug information before production deployment';
    }
  }

  /**
   * Remove debug information from build files
   */
  async cleanBuildFiles(): Promise<{ cleaned: number; errors: string[] }> {
    const result = { cleaned: 0, errors: [] };

    try {
      const files = await this.findBuildFiles();

      for (const file of files) {
        try {
          let modified = false;
          const fs = await import('fs/promises');
          let content = await fs.readFile(file, 'utf-8');

          for (const pattern of this.config.patterns) {
            if (!pattern.allowedEnvironments.includes(this.config.targetEnvironment)) {
              const originalContent = content;
              content = content.replace(pattern.pattern, '');
              if (content !== originalContent) {
                modified = true;
              }
            }
          }

          if (modified) {
            await fs.writeFile(file, content, 'utf-8');
            result.cleaned++;
          }
        } catch (error) {
          result.errors.push(
            `Failed to clean ${file}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Clean operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * Generate report of debug filter violations
   */
  generateReport(result: DebugFilterResult): string {
    if (result.passed) {
      return `✅ Debug Filter Validation PASSED - No violations detected in ${this.config.targetEnvironment}`;
    }

    let report = `❌ Debug Filter Validation FAILED for ${this.config.targetEnvironment}\n\n`;

    report += `Summary:\n`;
    report += `- Total files scanned: ${result.summary.totalFiles}\n`;
    report += `- Files with violations: ${result.summary.filesWithViolations}\n`;
    report += `- Total violations: ${result.summary.violationsFound}\n`;
    report += `- Critical violations: ${result.summary.criticalViolations}\n\n`;

    if (result.violations.length > 0) {
      report += 'Violations by Category:\n';

      const byCategory = result.violations.reduce(
        (acc, violation) => {
          acc[violation.pattern.category] = (acc[violation.pattern.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(byCategory).forEach(([category, count]) => {
        report += `- ${category.replace('-', ' ').toUpperCase()}: ${count}\n`;
      });

      report += '\nTop Violations:\n';
      result.violations.slice(0, 10).forEach((violation, index) => {
        report += `\n${index + 1}. ${violation.pattern.name} (${violation.severity})\n`;
        report += `   File: ${violation.file}:${violation.line}\n`;
        report += `   Description: ${violation.pattern.description}\n`;
        report += `   Match: ${violation.match}\n`;
        report += `   Suggestion: ${violation.suggestion}\n`;
      });

      if (result.violations.length > 10) {
        report += `\n... and ${result.violations.length - 10} more violations\n`;
      }
    }

    if (result.errors.length > 0) {
      report += '\nScan Errors:\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    return report;
  }

  /**
   * Validate debug filter configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.patterns || this.config.patterns.length === 0) {
      errors.push('Debug patterns must be specified');
    }

    if (!this.config.scanPaths || this.config.scanPaths.length === 0) {
      errors.push('Scan paths must be specified');
    }

    if (this.config.maxFileSize <= 0) {
      errors.push('Max file size must be positive');
    }

    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(this.config.targetEnvironment)) {
      errors.push(`Invalid target environment: ${this.config.targetEnvironment}`);
    }

    // Validate patterns
    for (const pattern of this.config.patterns) {
      try {
        new RegExp(pattern.pattern);
      } catch (regexError) {
        errors.push(`Invalid regex pattern for ${pattern.name}: ${regexError}`);
      }

      for (const env of pattern.allowedEnvironments) {
        if (!validEnvironments.includes(env)) {
          errors.push(`Invalid environment for pattern ${pattern.name}: ${env}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Default debug filter instance for production builds
 */
export const productionDebugFilter = new DebugFilter({
  patterns: DEFAULT_DEBUG_PATTERNS,
  targetEnvironment: 'production',
  scanPaths: ['dist', 'build', '.next'],
  excludePaths: ['node_modules', '.git', 'test', '__tests__'],
  maxFileSize: 10 * 1024 * 1024,
  reportLevel: 'violations-only',
});

/**
 * Quick debug scan function for CI/CD integration
 */
export async function scanForDebugInfo(
  environment: 'development' | 'staging' | 'production' = 'production'
): Promise<DebugFilterResult> {
  const filter = new DebugFilter({ targetEnvironment: environment });
  return await filter.scanBuildFiles();
}
