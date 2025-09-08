import { SecurityGateResult } from '../core/security-gate.interface';

export interface MetadataAnalysisResult {
  timingPatternsDetected: boolean;
  sizePatternsDetected: boolean;
  headerLeakageDetected: boolean;
  trackingSignalsFound: string[];
  riskScore: number;
  patterns: MetadataPattern[];
}

export interface MetadataPattern {
  type: 'TIMING' | 'SIZE' | 'HEADER' | 'SEQUENCE' | 'FINGERPRINT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  occurrences: number;
  examples: string[];
}

export interface RequestMetadata {
  timestamp: number;
  size: number;
  duration: number;
  headers: Record<string, string>;
  path: string;
  method: string;
  statusCode: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface MetadataViolation {
  type: 'TIMING_LEAK' | 'SIZE_LEAK' | 'HEADER_LEAK' | 'TRACKING_SIGNAL';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  pattern: MetadataPattern;
  recommendation: string;
}

export class MetadataDetector {
  private readonly suspiciousHeaders = [
    'x-real-ip',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-client-ip',
    'cf-connecting-ip',
    'x-device-id',
    'x-session-id',
    'x-user-id',
    'x-tracking-id',
    'x-correlation-id',
  ];

  private readonly trackingPatterns = [
    /utm_[a-z]+/i, // UTM tracking parameters
    /fbclid/i, // Facebook click identifier
    /gclid/i, // Google click identifier
    /_ga|_gid/i, // Google Analytics
    /session[_-]?id/i, // Session identifiers
    /device[_-]?id/i, // Device identifiers
    /user[_-]?id/i, // User identifiers
    /track[_-]?id/i, // Tracking identifiers
  ];

  private readonly sensitivePathPatterns = [
    /\/api\/health/i,
    /\/api\/cycle/i,
    /\/api\/symptoms/i,
    /\/api\/fertility/i,
    /\/api\/pregnancy/i,
    /\/api\/contraception/i,
  ];

  async analyzeMetadata(
    requests: RequestMetadata[]
  ): Promise<SecurityGateResult<MetadataAnalysisResult>> {
    try {
      if (requests.length === 0) {
        return {
          passed: true,
          message: 'No requests to analyze',
          details: {
            timingPatternsDetected: false,
            sizePatternsDetected: false,
            headerLeakageDetected: false,
            trackingSignalsFound: [],
            riskScore: 0,
            patterns: [],
          },
          violations: [],
        };
      }

      const patterns = await this.detectPatterns(requests);
      const violations = await this.identifyViolations(patterns);
      const riskScore = this.calculateRiskScore(patterns);

      const timingPatternsDetected = patterns.some(p => p.type === 'TIMING');
      const sizePatternsDetected = patterns.some(p => p.type === 'SIZE');
      const headerLeakageDetected = patterns.some(p => p.type === 'HEADER');
      const trackingSignalsFound = this.extractTrackingSignals(requests);

      const highRiskViolations = violations.filter(v => v.severity === 'HIGH');
      const passed = highRiskViolations.length === 0 && riskScore < 70;

      return {
        passed,
        message: passed
          ? 'Metadata analysis passed - no significant leakage patterns detected'
          : `Metadata analysis failed - ${violations.length} violations found with risk score ${riskScore}`,
        details: {
          timingPatternsDetected,
          sizePatternsDetected,
          headerLeakageDetected,
          trackingSignalsFound,
          riskScore,
          patterns,
        },
        violations: violations.map(v => ({
          type: v.type,
          severity: v.severity,
          description: v.description,
          location: `Pattern: ${v.pattern.type}`,
        })),
      };
    } catch (error) {
      return {
        passed: false,
        message: `Metadata analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  async analyzeRequestBatch(
    requests: RequestMetadata[],
    timeWindow: number = 60000 // 1 minute
  ): Promise<SecurityGateResult<MetadataAnalysisResult>> {
    // Group requests by time windows for pattern analysis
    const timeGroups = this.groupRequestsByTime(requests, timeWindow);
    const allPatterns: MetadataPattern[] = [];
    const allViolations: MetadataViolation[] = [];

    for (const group of timeGroups) {
      const result = await this.analyzeMetadata(group);
      if (result.details) {
        allPatterns.push(...result.details.patterns);
      }
    }

    // Analyze cross-window patterns
    const crossWindowPatterns = await this.detectCrossWindowPatterns(timeGroups);
    allPatterns.push(...crossWindowPatterns);

    const violations = await this.identifyViolations(allPatterns);
    const riskScore = this.calculateRiskScore(allPatterns);

    const timingPatternsDetected = allPatterns.some(p => p.type === 'TIMING');
    const sizePatternsDetected = allPatterns.some(p => p.type === 'SIZE');
    const headerLeakageDetected = allPatterns.some(p => p.type === 'HEADER');
    const trackingSignalsFound = this.extractTrackingSignals(requests);

    const highRiskViolations = violations.filter(v => v.severity === 'HIGH');
    const passed = highRiskViolations.length === 0 && riskScore < 70;

    return {
      passed,
      message: passed
        ? 'Batch metadata analysis passed'
        : `Batch metadata analysis failed - ${violations.length} violations found`,
      details: {
        timingPatternsDetected,
        sizePatternsDetected,
        headerLeakageDetected,
        trackingSignalsFound,
        riskScore,
        patterns: allPatterns,
      },
      violations: violations.map(v => ({
        type: v.type,
        severity: v.severity,
        description: v.description,
        location: `Pattern: ${v.pattern.type}`,
      })),
    };
  }

  private async detectPatterns(requests: RequestMetadata[]): Promise<MetadataPattern[]> {
    const patterns: MetadataPattern[] = [];

    // Detect timing patterns
    patterns.push(...this.detectTimingPatterns(requests));

    // Detect size patterns
    patterns.push(...this.detectSizePatterns(requests));

    // Detect header leakage
    patterns.push(...this.detectHeaderLeakage(requests));

    // Detect sequence patterns
    patterns.push(...this.detectSequencePatterns(requests));

    // Detect fingerprinting attempts
    patterns.push(...this.detectFingerprintingPatterns(requests));

    return patterns;
  }

  private detectTimingPatterns(requests: RequestMetadata[]): MetadataPattern[] {
    const patterns: MetadataPattern[] = [];

    // Sort requests by timestamp
    const sortedRequests = [...requests].sort((a, b) => a.timestamp - b.timestamp);

    // Detect regular intervals (potential polling)
    const intervals: number[] = [];
    for (let i = 1; i < sortedRequests.length; i++) {
      const interval = sortedRequests[i].timestamp - sortedRequests[i - 1].timestamp;
      intervals.push(interval);
    }

    // Check for consistent intervals
    if (intervals.length > 5) {
      const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
      const consistentIntervals = intervals.filter(
        int => Math.abs(int - avgInterval) < avgInterval * 0.1
      ).length;

      if (consistentIntervals > intervals.length * 0.8) {
        patterns.push({
          type: 'TIMING',
          severity: 'MEDIUM',
          description: `Regular polling pattern detected (${Math.round(avgInterval)}ms intervals)`,
          occurrences: consistentIntervals,
          examples: [`Average interval: ${Math.round(avgInterval)}ms`],
        });
      }
    }

    // Detect response time correlations with sensitive paths
    const sensitiveRequests = requests.filter(req =>
      this.sensitivePathPatterns.some(pattern => pattern.test(req.path))
    );

    if (sensitiveRequests.length > 0) {
      const avgSensitiveDuration =
        sensitiveRequests.reduce((sum, req) => sum + req.duration, 0) / sensitiveRequests.length;
      const normalRequests = requests.filter(
        req => !this.sensitivePathPatterns.some(pattern => pattern.test(req.path))
      );

      if (normalRequests.length > 0) {
        const avgNormalDuration =
          normalRequests.reduce((sum, req) => sum + req.duration, 0) / normalRequests.length;

        if (Math.abs(avgSensitiveDuration - avgNormalDuration) > 100) {
          patterns.push({
            type: 'TIMING',
            severity: 'HIGH',
            description: 'Timing differences between sensitive and normal requests detected',
            occurrences: sensitiveRequests.length,
            examples: [
              `Sensitive requests: ${Math.round(avgSensitiveDuration)}ms avg`,
              `Normal requests: ${Math.round(avgNormalDuration)}ms avg`,
            ],
          });
        }
      }
    }

    return patterns;
  }

  private detectSizePatterns(requests: RequestMetadata[]): MetadataPattern[] {
    const patterns: MetadataPattern[] = [];

    // Group requests by path pattern
    const pathGroups = new Map<string, RequestMetadata[]>();

    for (const request of requests) {
      const pathPattern = this.normalizePathForGrouping(request.path);
      if (!pathGroups.has(pathPattern)) {
        pathGroups.set(pathPattern, []);
      }
      pathGroups.get(pathPattern)!.push(request);
    }

    // Analyze size patterns within each path group
    for (const [pathPattern, groupRequests] of pathGroups) {
      if (groupRequests.length < 5) continue;

      const sizes = groupRequests.map(req => req.size);
      const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
      const sizeVariance = this.calculateVariance(sizes);

      // Check for suspiciously consistent sizes
      if (sizeVariance < avgSize * 0.01 && avgSize > 100) {
        patterns.push({
          type: 'SIZE',
          severity: 'MEDIUM',
          description: `Consistent response sizes detected for ${pathPattern}`,
          occurrences: groupRequests.length,
          examples: [
            `Average size: ${Math.round(avgSize)} bytes`,
            `Variance: ${Math.round(sizeVariance)}`,
          ],
        });
      }

      // Check for size correlation with sensitive data
      if (this.sensitivePathPatterns.some(pattern => pattern.test(pathPattern))) {
        const distinctSizes = new Set(sizes).size;
        if (distinctSizes < sizes.length * 0.5) {
          patterns.push({
            type: 'SIZE',
            severity: 'HIGH',
            description: `Limited response size variation for sensitive endpoint ${pathPattern}`,
            occurrences: distinctSizes,
            examples: [`Distinct sizes: ${distinctSizes}/${sizes.length}`],
          });
        }
      }
    }

    return patterns;
  }

  private detectHeaderLeakage(requests: RequestMetadata[]): MetadataPattern[] {
    const patterns: MetadataPattern[] = [];

    // Check for suspicious headers
    const suspiciousHeaderCounts = new Map<string, number>();
    const headerExamples = new Map<string, Set<string>>();

    for (const request of requests) {
      for (const [headerName, headerValue] of Object.entries(request.headers)) {
        const lowerHeaderName = headerName.toLowerCase();

        if (this.suspiciousHeaders.includes(lowerHeaderName)) {
          suspiciousHeaderCounts.set(
            lowerHeaderName,
            (suspiciousHeaderCounts.get(lowerHeaderName) || 0) + 1
          );

          if (!headerExamples.has(lowerHeaderName)) {
            headerExamples.set(lowerHeaderName, new Set());
          }
          headerExamples
            .get(lowerHeaderName)!
            .add(`${headerName}: ${headerValue.substring(0, 50)}`);
        }

        // Check for tracking patterns in header values
        if (this.trackingPatterns.some(pattern => pattern.test(headerValue))) {
          patterns.push({
            type: 'HEADER',
            severity: 'MEDIUM',
            description: `Tracking pattern detected in header ${headerName}`,
            occurrences: 1,
            examples: [`${headerName}: ${headerValue.substring(0, 50)}`],
          });
        }
      }

      // Check User-Agent variations
      if (request.userAgent) {
        const uniqueUserAgents = new Set(requests.map(req => req.userAgent).filter(Boolean));
        if (uniqueUserAgents.size === 1 && requests.length > 10) {
          patterns.push({
            type: 'FINGERPRINT',
            severity: 'LOW',
            description: 'Consistent User-Agent across all requests (potential bot)',
            occurrences: requests.length,
            examples: [Array.from(uniqueUserAgents)[0]!.substring(0, 100)],
          });
        }
      }
    }

    // Add patterns for suspicious headers
    for (const [headerName, count] of suspiciousHeaderCounts) {
      patterns.push({
        type: 'HEADER',
        severity: 'HIGH',
        description: `Suspicious header ${headerName} detected`,
        occurrences: count,
        examples: Array.from(headerExamples.get(headerName) || []).slice(0, 3),
      });
    }

    return patterns;
  }

  private detectSequencePatterns(requests: RequestMetadata[]): MetadataPattern[] {
    const patterns: MetadataPattern[] = [];

    // Sort requests by timestamp
    const sortedRequests = [...requests].sort((a, b) => a.timestamp - b.timestamp);

    // Detect sequential path patterns
    const pathSequences: string[][] = [];
    let currentSequence: string[] = [];

    for (const request of sortedRequests) {
      if (currentSequence.length === 0) {
        currentSequence.push(request.path);
      } else {
        const lastPath = currentSequence[currentSequence.length - 1];
        const timeDiff =
          request.timestamp - sortedRequests.find(r => r.path === lastPath)!.timestamp;

        if (timeDiff < 5000) {
          // 5 second window
          currentSequence.push(request.path);
        } else {
          if (currentSequence.length > 3) {
            pathSequences.push([...currentSequence]);
          }
          currentSequence = [request.path];
        }
      }
    }

    // Add final sequence
    if (currentSequence.length > 3) {
      pathSequences.push(currentSequence);
    }

    // Analyze sequences for patterns
    for (const sequence of pathSequences) {
      const sensitiveInSequence = sequence.filter(path =>
        this.sensitivePathPatterns.some(pattern => pattern.test(path))
      );

      if (sensitiveInSequence.length > 1) {
        patterns.push({
          type: 'SEQUENCE',
          severity: 'MEDIUM',
          description: 'Sequential access to sensitive endpoints detected',
          occurrences: sensitiveInSequence.length,
          examples: sensitiveInSequence.slice(0, 3),
        });
      }
    }

    return patterns;
  }

  private detectFingerprintingPatterns(requests: RequestMetadata[]): MetadataPattern[] {
    const patterns: MetadataPattern[] = [];

    // Check for browser fingerprinting attempts
    const fingerprintingEndpoints = [
      '/api/fingerprint',
      '/api/device',
      '/api/browser',
      '/api/capabilities',
    ];

    const fingerprintingRequests = requests.filter(req =>
      fingerprintingEndpoints.some(endpoint => req.path.includes(endpoint))
    );

    if (fingerprintingRequests.length > 0) {
      patterns.push({
        type: 'FINGERPRINT',
        severity: 'MEDIUM',
        description: 'Browser fingerprinting attempts detected',
        occurrences: fingerprintingRequests.length,
        examples: fingerprintingRequests.map(req => req.path).slice(0, 3),
      });
    }

    // Check for canvas fingerprinting indicators
    const canvasRequests = requests.filter(
      req =>
        req.headers['content-type']?.includes('image/') ||
        req.path.includes('canvas') ||
        req.path.includes('webgl')
    );

    if (canvasRequests.length > 5) {
      patterns.push({
        type: 'FINGERPRINT',
        severity: 'HIGH',
        description: 'Potential canvas fingerprinting detected',
        occurrences: canvasRequests.length,
        examples: canvasRequests.map(req => req.path).slice(0, 3),
      });
    }

    return patterns;
  }

  private detectCrossWindowPatterns(timeGroups: RequestMetadata[][]): Promise<MetadataPattern[]> {
    return Promise.resolve([]);
    // Cross-window pattern detection would be implemented here
    // This is a placeholder for more complex temporal analysis
  }

  private groupRequestsByTime(
    requests: RequestMetadata[],
    windowSize: number
  ): RequestMetadata[][] {
    if (requests.length === 0) return [];

    const sortedRequests = [...requests].sort((a, b) => a.timestamp - b.timestamp);
    const groups: RequestMetadata[][] = [];
    let currentGroup: RequestMetadata[] = [];
    let windowStart = sortedRequests[0].timestamp;

    for (const request of sortedRequests) {
      if (request.timestamp - windowStart <= windowSize) {
        currentGroup.push(request);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [request];
        windowStart = request.timestamp;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private async identifyViolations(patterns: MetadataPattern[]): Promise<MetadataViolation[]> {
    const violations: MetadataViolation[] = [];

    for (const pattern of patterns) {
      let violationType: MetadataViolation['type'];
      let recommendation: string;

      switch (pattern.type) {
        case 'TIMING':
          violationType = 'TIMING_LEAK';
          recommendation =
            'Implement constant-time operations and request padding to prevent timing analysis';
          break;
        case 'SIZE':
          violationType = 'SIZE_LEAK';
          recommendation =
            'Add response padding to normalize payload sizes and prevent size-based inference';
          break;
        case 'HEADER':
          violationType = 'HEADER_LEAK';
          recommendation = 'Remove or sanitize sensitive headers, implement header normalization';
          break;
        case 'SEQUENCE':
        case 'FINGERPRINT':
          violationType = 'TRACKING_SIGNAL';
          recommendation = 'Implement anti-fingerprinting measures and request pattern obfuscation';
          break;
        default:
          continue;
      }

      violations.push({
        type: violationType,
        severity: pattern.severity,
        description: pattern.description,
        pattern,
        recommendation,
      });
    }

    return violations;
  }

  private extractTrackingSignals(requests: RequestMetadata[]): string[] {
    const signals = new Set<string>();

    for (const request of requests) {
      // Check URL parameters for tracking
      const url = new URL(request.path, 'https://example.com');
      for (const [param, value] of url.searchParams) {
        if (this.trackingPatterns.some(pattern => pattern.test(param) || pattern.test(value))) {
          signals.add(`${param}=${value}`);
        }
      }

      // Check headers for tracking
      for (const [headerName, headerValue] of Object.entries(request.headers)) {
        if (
          this.trackingPatterns.some(
            pattern => pattern.test(headerName) || pattern.test(headerValue)
          )
        ) {
          signals.add(`${headerName}: ${headerValue}`);
        }
      }
    }

    return Array.from(signals);
  }

  private calculateRiskScore(patterns: MetadataPattern[]): number {
    let score = 0;

    for (const pattern of patterns) {
      const baseScore = pattern.occurrences;
      const severityMultiplier =
        pattern.severity === 'HIGH' ? 3 : pattern.severity === 'MEDIUM' ? 2 : 1;
      const typeMultiplier = pattern.type === 'TIMING' || pattern.type === 'SIZE' ? 2 : 1;

      score += baseScore * severityMultiplier * typeMultiplier;
    }

    return Math.min(100, score);
  }

  private normalizePathForGrouping(path: string): string {
    // Remove query parameters
    const basePath = path.split('?')[0];

    // Replace UUIDs first (more specific), then numeric IDs
    return basePath
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{uuid}')
      .replace(/\/\d+/g, '/{id}');
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));

    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  // Utility methods for testing
  createMockRequestMetadata(
    path: string,
    timestamp: number = Date.now(),
    size: number = 1024,
    duration: number = 100
  ): RequestMetadata {
    return {
      timestamp,
      size,
      duration,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Aura-App)',
      },
      path,
      method: 'GET',
      statusCode: 200,
    };
  }
}
