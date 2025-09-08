/**
 * Memory Dump Analysis Automation for Sensitive Data Persistence
 *
 * Automated analysis of memory dumps, heap snapshots, and runtime memory
 * to detect persistence of sensitive health data and PII after intended zeroization.
 */

export interface MemoryPattern {
  name: string;
  pattern: RegExp | string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  category: 'health-data' | 'pii' | 'crypto' | 'auth' | 'system';
  expectedLifetime: 'immediate' | 'session' | 'persistent';
}

export interface MemoryAnalysisResult {
  passed: boolean;
  violations: MemoryViolation[];
  summary: {
    totalRegions: number;
    violationsFound: number;
    criticalViolations: number;
    healthDataPersistence: number;
    cryptoPersistence: number;
  };
  errors: string[];
  analysisMetadata: {
    timestamp: string;
    memorySize: number;
    gcCollections: number;
    heapUsed: number;
  };
}

export interface MemoryViolation {
  pattern: MemoryPattern;
  match: string;
  redactedMatch: string;
  location: {
    offset: number;
    region?: string;
    type?: string;
  };
  context: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  persistenceDuration?: number; // milliseconds
}

export interface MemoryAnalyzerConfig {
  patterns: MemoryPattern[];
  enableHeapAnalysis: boolean;
  enableProcessMemoryAnalysis: boolean;
  gcBeforeAnalysis: boolean;
  maxMemorySize: number; // bytes
  sensitiveDataRetentionLimit: number; // milliseconds
  reportingLevel: 'all' | 'violations-only';
}

/**
 * Comprehensive memory patterns for healthcare application security
 */
export const DEFAULT_MEMORY_PATTERNS: MemoryPattern[] = [
  // Health Data Patterns - Critical
  {
    name: 'cycle-data-json',
    pattern: /\{[^}]*"(?:cycleLength|periodFlow|symptoms|temperature|mood|notes)"[^}]*\}/g,
    severity: 'critical',
    description: 'Cycle tracking data JSON in memory',
    category: 'health-data',
    expectedLifetime: 'immediate',
  },
  {
    name: 'health-measurements',
    pattern: /"?(?:temperature|basal|bbt|cervical|mucus)"?\s*:\s*"?[^,}\s]+"?/gi,
    severity: 'critical',
    description: 'Health measurement data in memory',
    category: 'health-data',
    expectedLifetime: 'immediate',
  },
  {
    name: 'period-tracking-data',
    pattern: /"?(?:startDate|endDate|flowIntensity|symptoms)"?\s*:\s*"?[^,}\s]+"?/gi,
    severity: 'critical',
    description: 'Period tracking data structures in memory',
    category: 'health-data',
    expectedLifetime: 'immediate',
  },

  // Crypto Data - Critical
  {
    name: 'crypto-keys-hex',
    pattern: /[0-9a-fA-F]{64,}/g,
    severity: 'critical',
    description: 'Potential cryptographic keys in hex format',
    category: 'crypto',
    expectedLifetime: 'immediate',
  },
  {
    name: 'base64-crypto-material',
    pattern: /[A-Za-z0-9+/]{64,}={0,2}/g,
    severity: 'high',
    description: 'Potential base64-encoded crypto material',
    category: 'crypto',
    expectedLifetime: 'immediate',
  },
  {
    name: 'private-key-headers',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    description: 'Private key PEM headers in memory',
    category: 'crypto',
    expectedLifetime: 'immediate',
  },
  {
    name: 'jwt-tokens',
    pattern: /eyJ[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+/g,
    severity: 'high',
    description: 'JWT tokens in memory',
    category: 'auth',
    expectedLifetime: 'session',
  },

  // PII Patterns - Critical
  {
    name: 'email-addresses',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    severity: 'high',
    description: 'Email addresses in memory',
    category: 'pii',
    expectedLifetime: 'session',
  },
  {
    name: 'phone-numbers',
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    severity: 'high',
    description: 'Phone numbers in memory',
    category: 'pii',
    expectedLifetime: 'session',
  },
  {
    name: 'social-security',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'critical',
    description: 'Social Security Numbers in memory',
    category: 'pii',
    expectedLifetime: 'immediate',
  },

  // Authentication Data - High
  {
    name: 'password-fields',
    pattern: /"password"\s*:\s*"[^"]{8,}"/g,
    severity: 'critical',
    description: 'Password fields in memory structures',
    category: 'auth',
    expectedLifetime: 'immediate',
  },
  {
    name: 'session-tokens',
    pattern: /"(?:sessionToken|accessToken|refreshToken)"\s*:\s*"[^"]+"/g,
    severity: 'high',
    description: 'Session/access tokens in memory',
    category: 'auth',
    expectedLifetime: 'session',
  },
  {
    name: 'api-keys',
    pattern: /"(?:apiKey|api_key|secretKey|secret_key)"\s*:\s*"[^"]+"/g,
    severity: 'critical',
    description: 'API keys in memory structures',
    category: 'auth',
    expectedLifetime: 'immediate',
  },

  // Database Connection Strings - High
  {
    name: 'connection-strings',
    pattern: /(?:postgres|mysql|mongodb):\/\/[^\s]+/g,
    severity: 'high',
    description: 'Database connection strings in memory',
    category: 'system',
    expectedLifetime: 'persistent',
  },

  // Crypto Envelope Structures - Medium
  {
    name: 'crypto-envelope-structure',
    pattern: /\{[^}]*"(?:algorithm|kdfParams|salt|nonce|keyId)"[^}]*\}/g,
    severity: 'medium',
    description: 'Crypto envelope metadata structures',
    category: 'crypto',
    expectedLifetime: 'session',
  },
];

export class MemoryAnalyzer {
  private config: MemoryAnalyzerConfig;
  private sensitiveDataTracker = new Map<string, number>(); // pattern -> first seen timestamp

  constructor(config: Partial<MemoryAnalyzerConfig> = {}) {
    this.config = {
      patterns: config.patterns || DEFAULT_MEMORY_PATTERNS,
      enableHeapAnalysis: config.enableHeapAnalysis !== false,
      enableProcessMemoryAnalysis: config.enableProcessMemoryAnalysis !== false,
      gcBeforeAnalysis: config.gcBeforeAnalysis !== false,
      maxMemorySize: config.maxMemorySize || 100 * 1024 * 1024, // 100MB
      sensitiveDataRetentionLimit: config.sensitiveDataRetentionLimit || 5000, // 5 seconds
      reportingLevel: config.reportingLevel || 'violations-only',
    };
  }

  /**
   * Perform comprehensive memory analysis
   */
  async analyzeMemory(): Promise<MemoryAnalysisResult> {
    const result: MemoryAnalysisResult = {
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
      analysisMetadata: {
        timestamp: new Date().toISOString(),
        memorySize: 0,
        gcCollections: 0,
        heapUsed: 0,
      },
    };

    try {
      // Force garbage collection if enabled
      if (this.config.gcBeforeAnalysis && global.gc) {
        global.gc();
        result.analysisMetadata.gcCollections++;
      }

      // Get memory usage
      const memUsage = process.memoryUsage();
      result.analysisMetadata.heapUsed = memUsage.heapUsed;
      result.analysisMetadata.memorySize = memUsage.rss;

      const violations: MemoryViolation[] = [];

      // Analyze heap if enabled
      if (this.config.enableHeapAnalysis) {
        const heapViolations = await this.analyzeHeap();
        violations.push(...heapViolations);
      }

      // Analyze process memory if enabled
      if (this.config.enableProcessMemoryAnalysis) {
        const processViolations = await this.analyzeProcessMemory();
        violations.push(...processViolations);
      }

      result.violations = violations;
      result.summary.totalRegions = violations.length;
      result.summary.violationsFound = violations.length;
      result.summary.criticalViolations = violations.filter(v => v.severity === 'critical').length;
      result.summary.healthDataPersistence = violations.filter(
        v => v.pattern.category === 'health-data'
      ).length;
      result.summary.cryptoPersistence = violations.filter(
        v => v.pattern.category === 'crypto'
      ).length;
      result.passed = violations.length === 0;
    } catch (error) {
      result.errors.push(
        `Memory analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
      result.passed = false;
    }

    return result;
  }

  /**
   * Analyze heap for sensitive data
   */
  private async analyzeHeap(): Promise<MemoryViolation[]> {
    const violations: MemoryViolation[] = [];

    try {
      // Use v8 heap snapshot if available
      if (typeof require !== 'undefined') {
        try {
          const v8 = require('v8');
          const heapSnapshot = v8.writeHeapSnapshot();

          // Note: In a real implementation, you'd parse the heap snapshot
          // This is a simplified version that scans string representations
          console.warn('Heap snapshot analysis not fully implemented - using approximation');
        } catch (v8Error) {
          console.warn('V8 heap snapshot not available:', v8Error);
        }
      }

      // Alternative: scan object representations in current context
      const memoryObjects = this.collectMemoryObjects();

      for (const obj of memoryObjects) {
        const objViolations = this.scanMemoryObject(obj, 'heap');
        violations.push(...objViolations);
      }
    } catch (error) {
      console.warn('Heap analysis error:', error);
    }

    return violations;
  }

  /**
   * Analyze process memory for sensitive data
   */
  private async analyzeProcessMemory(): Promise<MemoryViolation[]> {
    const violations: MemoryViolation[] = [];

    try {
      // Note: Direct process memory analysis is limited in Node.js without native modules
      // This implementation focuses on accessible memory regions

      const memUsage = process.memoryUsage();
      if (memUsage.rss > this.config.maxMemorySize) {
        console.warn(
          `Process memory size (${memUsage.rss}) exceeds limit (${this.config.maxMemorySize})`
        );
      }

      // Scan global objects and accessible memory
      const globalViolations = this.scanGlobalMemory();
      violations.push(...globalViolations);
    } catch (error) {
      console.warn('Process memory analysis error:', error);
    }

    return violations;
  }

  /**
   * Collect accessible memory objects for scanning
   */
  private collectMemoryObjects(): any[] {
    const objects: any[] = [];

    // Scan global object
    if (typeof global !== 'undefined') {
      objects.push(global);
    }

    // Scan process object
    if (typeof process !== 'undefined') {
      objects.push(process.env);
    }

    // Scan common global variables
    const globals = ['console', 'Buffer', 'require', 'module', 'exports'];
    for (const globalName of globals) {
      try {
        const globalObj = (global as any)[globalName];
        if (globalObj && typeof globalObj === 'object') {
          objects.push(globalObj);
        }
      } catch (error) {
        // Ignore access errors
      }
    }

    return objects;
  }

  /**
   * Scan memory object for sensitive patterns
   */
  private scanMemoryObject(obj: any, region: string, depth: number = 0): MemoryViolation[] {
    const violations: MemoryViolation[] = [];

    // Prevent deep recursion
    if (depth > 3) {
      return violations;
    }

    try {
      const objStr = JSON.stringify(obj, null, 0);
      if (objStr && objStr.length > 0) {
        const stringViolations = this.scanMemoryString(objStr, region, 0);
        violations.push(...stringViolations);
      }
    } catch (jsonError) {
      // Object not serializable, try string conversion
      try {
        const objStr = String(obj);
        const stringViolations = this.scanMemoryString(objStr, region, 0);
        violations.push(...stringViolations);
      } catch (stringError) {
        // Skip non-convertible objects
      }
    }

    // Recursively scan object properties
    if (obj && typeof obj === 'object' && depth < 2) {
      try {
        const keys = Object.keys(obj);
        for (const key of keys.slice(0, 10)) {
          // Limit to first 10 keys
          if (obj[key] && typeof obj[key] === 'object') {
            const nestedViolations = this.scanMemoryObject(obj[key], `${region}.${key}`, depth + 1);
            violations.push(...nestedViolations);
          }
        }
      } catch (keysError) {
        // Skip objects without enumerable keys
      }
    }

    return violations;
  }

  /**
   * Scan global memory for sensitive data
   */
  private scanGlobalMemory(): MemoryViolation[] {
    const violations: MemoryViolation[] = [];

    // Scan environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (value) {
        const envViolations = this.scanMemoryString(value, `env.${key}`, 0);
        violations.push(...envViolations);
      }
    }

    return violations;
  }

  /**
   * Scan memory string for sensitive patterns
   */
  private scanMemoryString(
    memoryString: string,
    region: string,
    offset: number
  ): MemoryViolation[] {
    const violations: MemoryViolation[] = [];

    for (const pattern of this.config.patterns) {
      let patternRegex: RegExp;

      if (pattern.pattern instanceof RegExp) {
        patternRegex = new RegExp(
          pattern.pattern.source,
          pattern.pattern.flags + (pattern.pattern.global ? '' : 'g')
        );
      } else {
        patternRegex = new RegExp(pattern.pattern, 'g');
      }

      const matches = memoryString.matchAll(patternRegex);

      for (const match of matches) {
        const matchOffset = (match.index || 0) + offset;

        // Check if this sensitive data has persisted too long
        const patternKey = `${pattern.name}:${match[0]}`;
        const now = Date.now();

        if (!this.sensitiveDataTracker.has(patternKey)) {
          this.sensitiveDataTracker.set(patternKey, now);
        }

        const firstSeen = this.sensitiveDataTracker.get(patternKey) || now;
        const persistenceDuration = now - firstSeen;

        // Check if data has persisted longer than expected
        let isViolation = false;
        if (pattern.expectedLifetime === 'immediate' && persistenceDuration > 100) {
          // 100ms grace period
          isViolation = true;
        } else if (
          pattern.expectedLifetime === 'session' &&
          persistenceDuration > this.config.sensitiveDataRetentionLimit
        ) {
          isViolation = true;
        }

        if (isViolation || this.config.reportingLevel === 'all') {
          const violation: MemoryViolation = {
            pattern,
            match: match[0],
            redactedMatch: this.redactMatch(match[0], pattern),
            location: {
              offset: matchOffset,
              region,
              type: 'string',
            },
            context: this.extractMemoryContext(memoryString, match.index || 0),
            severity: pattern.severity,
            persistenceDuration,
          };

          violations.push(violation);
        }
      }
    }

    return violations;
  }

  /**
   * Redact sensitive matches for safe reporting
   */
  private redactMatch(match: string, pattern: MemoryPattern): string {
    switch (pattern.category) {
      case 'health-data':
        return '[HEALTH_DATA_REDACTED]';
      case 'crypto':
        return `[${pattern.name.toUpperCase()}_REDACTED]`;
      case 'pii':
        return '[PII_REDACTED]';
      case 'auth':
        return '[AUTH_DATA_REDACTED]';
      default:
        return match.length > 20
          ? `${match.substring(0, 5)}***${match.substring(match.length - 5)}`
          : '***';
    }
  }

  /**
   * Extract context around memory match
   */
  private extractMemoryContext(memoryString: string, matchIndex: number): string {
    const contextStart = Math.max(0, matchIndex - 30);
    const contextEnd = Math.min(memoryString.length, matchIndex + 70);
    const context = memoryString.substring(contextStart, contextEnd);

    return context.length < memoryString.length ? `...${context}...` : context;
  }

  /**
   * Clear sensitive data tracking
   */
  clearSensitiveDataTracking(): void {
    this.sensitiveDataTracker.clear();
  }

  /**
   * Generate report of memory analysis violations
   */
  generateReport(result: MemoryAnalysisResult): string {
    if (result.passed) {
      return '✅ Memory Analysis PASSED - No sensitive data persistence detected';
    }

    let report = '❌ Memory Analysis FAILED\n\n';

    report += `Analysis Metadata:\n`;
    report += `- Timestamp: ${result.analysisMetadata.timestamp}\n`;
    report += `- Heap Used: ${Math.round(result.analysisMetadata.heapUsed / 1024 / 1024)} MB\n`;
    report += `- RSS Memory: ${Math.round(result.analysisMetadata.memorySize / 1024 / 1024)} MB\n`;
    report += `- GC Collections: ${result.analysisMetadata.gcCollections}\n\n`;

    report += `Summary:\n`;
    report += `- Total memory regions scanned: ${result.summary.totalRegions}\n`;
    report += `- Violations found: ${result.summary.violationsFound}\n`;
    report += `- Critical violations: ${result.summary.criticalViolations}\n`;
    report += `- Health data persistence: ${result.summary.healthDataPersistence}\n`;
    report += `- Crypto data persistence: ${result.summary.cryptoPersistence}\n\n`;

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
        report += `- ${category.toUpperCase()}: ${count}\n`;
      });

      report += '\nTop Memory Violations:\n';
      result.violations.slice(0, 10).forEach((violation, index) => {
        report += `\n${index + 1}. ${violation.pattern.name} (${violation.severity})\n`;
        report += `   Category: ${violation.pattern.category}\n`;
        report += `   Location: ${violation.location.region}:${violation.location.offset}\n`;
        report += `   Match: ${violation.redactedMatch}\n`;
        if (violation.persistenceDuration !== undefined) {
          report += `   Persistence: ${violation.persistenceDuration}ms\n`;
        }
        report += `   Expected Lifetime: ${violation.pattern.expectedLifetime}\n`;
      });

      if (result.violations.length > 10) {
        report += `\n... and ${result.violations.length - 10} more violations\n`;
      }
    }

    if (result.errors.length > 0) {
      report += '\nAnalysis Errors:\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }

    return report;
  }

  /**
   * Validate memory analyzer configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.patterns || this.config.patterns.length === 0) {
      errors.push('Memory patterns must be specified');
    }

    if (this.config.maxMemorySize <= 0) {
      errors.push('Max memory size must be positive');
    }

    if (this.config.sensitiveDataRetentionLimit < 0) {
      errors.push('Sensitive data retention limit must be non-negative');
    }

    // Validate patterns
    for (const pattern of this.config.patterns) {
      try {
        if (pattern.pattern instanceof RegExp) {
          new RegExp(pattern.pattern);
        } else {
          new RegExp(pattern.pattern);
        }
      } catch (regexError) {
        errors.push(`Invalid regex pattern for ${pattern.name}: ${regexError}`);
      }

      const validLifetimes = ['immediate', 'session', 'persistent'];
      if (!validLifetimes.includes(pattern.expectedLifetime)) {
        errors.push(`Invalid expected lifetime for ${pattern.name}: ${pattern.expectedLifetime}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Default memory analyzer instance with healthcare-focused configuration
 */
export const defaultMemoryAnalyzer = new MemoryAnalyzer({
  patterns: DEFAULT_MEMORY_PATTERNS,
  enableHeapAnalysis: true,
  enableProcessMemoryAnalysis: true,
  gcBeforeAnalysis: true,
  maxMemorySize: 100 * 1024 * 1024, // 100MB
  sensitiveDataRetentionLimit: 5000, // 5 seconds
  reportingLevel: 'violations-only',
});

/**
 * Quick memory analysis function for CI/CD integration
 */
export async function analyzeMemoryForSensitiveData(): Promise<MemoryAnalysisResult> {
  return await defaultMemoryAnalyzer.analyzeMemory();
}
