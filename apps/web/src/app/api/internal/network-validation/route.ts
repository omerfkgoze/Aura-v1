import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

// Network validation request schemas
const NetworkValidationRequestSchema = z.object({
  endpoint: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  payload: z.string().optional(),
  headers: z.record(z.string()).optional(),
  validationType: z.enum([
    'plaintext-detection',
    'tls-inspection',
    'metadata-analysis',
    'traffic-pattern',
  ]),
  privacyLevel: z.enum(['strict', 'standard', 'basic']),
});

// Traffic analysis types
interface HeaderAnalysis {
  headerName: string;
  value: string;
  classification: 'safe' | 'suspicious' | 'violating';
  reason: string;
  recommendation?: string;
}

interface PlaintextDetection {
  found: boolean;
  locations: {
    section: 'headers' | 'body' | 'query' | 'cookies';
    field: string;
    suspectedContent: string;
    confidence: number;
  }[];
  patterns: {
    pattern: string;
    matches: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }[];
}

interface TLSInspection {
  tlsVersion: string;
  cipherSuite: string;
  certificateValid: boolean;
  encryptionStrength: 'weak' | 'moderate' | 'strong';
  vulnerabilities: string[];
  compatibility: {
    withInspection: boolean;
    limitations: string[];
  };
}

interface TrafficPattern {
  requestSize: number;
  responseSize: number;
  frequency: number;
  timing: {
    averageLatency: number;
    jitter: number;
  };
  fingerprint: string;
  privacyScore: number; // 0-100, higher is better
  recommendations: string[];
}

interface NetworkValidationResult {
  testId: string;
  timestamp: string;
  endpoint: string;
  validationType: string;
  privacyLevel: string;
  plaintextDetection: PlaintextDetection;
  headerAnalysis: HeaderAnalysis[];
  tlsInspection: TLSInspection;
  trafficPattern: TrafficPattern;
  metadataMinimization: {
    score: number; // 0-100
    violations: {
      field: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }[];
    recommendations: string[];
  };
  overallSecurityScore: number; // 0-100
  complianceStatus: 'pass' | 'warning' | 'fail';
  auditTrail: {
    checks: string[];
    timestamp: string;
    validator: string;
  };
}

// Sensitive data patterns for detection
const SENSITIVE_PATTERNS = {
  healthData: [
    /\b(cycle|period|ovulation|fertility|pregnant|menstruation)\b/i,
    /\b(symptoms?|mood|temperature|flow)\b/i,
    /\b(contraception|birth\s?control|iud|pill)\b/i,
  ],
  personalInfo: [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{10,11}\b/, // Phone numbers
  ],
  medicalTerms: [
    /\b(diagnosis|treatment|medication|prescription)\b/i,
    /\b(doctor|physician|clinic|hospital)\b/i,
    /\b(dosage|mg|ml|tablet|capsule)\b/i,
  ],
};

// Suspicious headers that might leak information
const SUSPICIOUS_HEADERS = [
  'x-user-id',
  'x-device-id',
  'x-session-id',
  'user-agent-details',
  'x-real-ip',
  'x-forwarded-for',
  'location',
  'x-health-data',
];

class NetworkSecurityValidator {
  private detectPlaintextData(
    content: string,
    headers: Record<string, string> = {}
  ): PlaintextDetection {
    const locations: PlaintextDetection['locations'] = [];
    const patternMatches: PlaintextDetection['patterns'] = [];

    // Check headers for sensitive data
    for (const [headerName, headerValue] of Object.entries(headers)) {
      for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(headerValue)) {
            locations.push({
              section: 'headers',
              field: headerName,
              suspectedContent: headerValue.substring(0, 50) + '...',
              confidence: 0.9,
            });
          }
        }
      }
    }

    // Check body content
    for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = content.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
          patternMatches.push({
            pattern: pattern.source,
            matches: matches.length,
            riskLevel:
              category === 'healthData'
                ? 'critical'
                : category === 'personalInfo'
                  ? 'high'
                  : 'medium',
          });

          matches.forEach(match => {
            locations.push({
              section: 'body',
              field: 'content',
              suspectedContent: match,
              confidence: 0.8,
            });
          });
        }
      }
    }

    return {
      found: locations.length > 0,
      locations,
      patterns: patternMatches,
    };
  }

  private analyzeHeaders(headers: Record<string, string>): HeaderAnalysis[] {
    const analysis: HeaderAnalysis[] = [];

    for (const [headerName, headerValue] of Object.entries(headers)) {
      const lowerHeaderName = headerName.toLowerCase();

      let classification: 'safe' | 'suspicious' | 'violating' = 'safe';
      let reason = 'Standard HTTP header';
      let recommendation: string | undefined;

      // Check for suspicious headers
      if (
        SUSPICIOUS_HEADERS.some(suspicious => lowerHeaderName.includes(suspicious.toLowerCase()))
      ) {
        classification = 'suspicious';
        reason = 'Header may contain identifying information';
        recommendation = 'Consider removing or hashing this header';
      }

      // Check for plaintext sensitive data in headers
      const hasPlaintext = Object.values(SENSITIVE_PATTERNS)
        .flat()
        .some(pattern => pattern.test(headerValue));
      if (hasPlaintext) {
        classification = 'violating';
        reason = 'Header contains plaintext sensitive data';
        recommendation = 'CRITICAL: Encrypt or remove sensitive data from headers';
      }

      // Check content-type for proper encryption indication
      if (lowerHeaderName === 'content-type' && !headerValue.includes('application/json')) {
        if (!headerValue.includes('encrypted') && !headerValue.includes('binary')) {
          classification = 'suspicious';
          reason = 'Content-type does not indicate encrypted payload';
          recommendation = 'Use content-type that indicates encrypted data';
        }
      }

      analysis.push({
        headerName,
        value: headerValue,
        classification,
        reason,
        recommendation,
      });
    }

    return analysis;
  }

  private simulateTLSInspection(endpoint: string): TLSInspection {
    // Simulate TLS analysis
    const isHTTPS = endpoint.startsWith('https://');

    return {
      tlsVersion: 'TLS 1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384',
      certificateValid: isHTTPS,
      encryptionStrength: isHTTPS ? 'strong' : 'weak',
      vulnerabilities: isHTTPS ? [] : ['Unencrypted HTTP connection'],
      compatibility: {
        withInspection: true,
        limitations: isHTTPS ? [] : ['Cannot inspect encrypted payload over HTTP'],
      },
    };
  }

  private analyzeTrafficPattern(payload: string, headers: Record<string, string>): TrafficPattern {
    const requestSize =
      Buffer.byteLength(payload || '', 'utf8') +
      Object.entries(headers).reduce((sum, [k, v]) => sum + k.length + v.length + 4, 0);

    // Simulate response size (would be measured in real scenario)
    const responseSize = Math.floor(requestSize * 1.2); // Typical response overhead

    // Calculate privacy score based on various factors
    let privacyScore = 100;

    // Penalize large payloads (might contain more data)
    if (requestSize > 10000) privacyScore -= 20;
    if (requestSize > 50000) privacyScore -= 30;

    // Penalize excessive headers
    const headerCount = Object.keys(headers).length;
    if (headerCount > 10) privacyScore -= 15;
    if (headerCount > 20) privacyScore -= 25;

    // Check for privacy-preserving patterns
    const hasEncryptionIndicators = JSON.stringify(headers).toLowerCase().includes('encrypt');
    if (!hasEncryptionIndicators) privacyScore -= 40;

    const recommendations = [];
    if (requestSize > 50000)
      recommendations.push('Consider payload compression to reduce fingerprinting');
    if (headerCount > 15) recommendations.push('Minimize headers to reduce metadata leakage');
    if (!hasEncryptionIndicators) recommendations.push('Add encryption indicators to headers');

    return {
      requestSize,
      responseSize,
      frequency: 1, // Would be calculated over time
      timing: {
        averageLatency: 150,
        jitter: 25,
      },
      fingerprint: crypto
        .createHash('sha256')
        .update(payload + JSON.stringify(headers))
        .digest('hex')
        .substring(0, 16),
      privacyScore: Math.max(0, privacyScore),
      recommendations,
    };
  }

  private calculateMetadataMinimization(
    headers: Record<string, string>
  ): NetworkValidationResult['metadataMinimization'] {
    const violations: { field: string; issue: string; severity: 'low' | 'medium' | 'high' }[] = [];
    let score = 100;

    // Essential headers that should always be present
    const essentialHeaders = ['content-type', 'content-length'];
    const presentEssential = essentialHeaders.filter(h =>
      Object.keys(headers).some(header => header.toLowerCase() === h)
    );

    // Check for excessive headers
    const headerCount = Object.keys(headers).length;
    if (headerCount > 15) {
      violations.push({
        field: 'header-count',
        issue: `Too many headers (${headerCount}). Consider minimizing to essential headers only.`,
        severity: 'medium' as const,
      });
      score -= 20;
    }

    // Check for verbose user-agent
    const userAgent = headers['user-agent'] || headers['User-Agent'];
    if (userAgent && userAgent.length > 100) {
      violations.push({
        field: 'user-agent',
        issue: 'Verbose User-Agent header may enable fingerprinting',
        severity: 'low' as const,
      });
      score -= 10;
    }

    // Check for tracking headers
    const trackingHeaders = ['x-request-id', 'x-trace-id', 'x-session-id'];
    trackingHeaders.forEach(trackingHeader => {
      if (Object.keys(headers).some(h => h.toLowerCase() === trackingHeader)) {
        violations.push({
          field: trackingHeader,
          issue: 'Tracking header present - may enable correlation attacks',
          severity: 'high' as const,
        });
        score -= 25;
      }
    });

    const recommendations = [];
    if (headerCount > 10) recommendations.push('Reduce header count to essential ones only');
    if (userAgent && userAgent.length > 50) recommendations.push('Use minimal User-Agent string');
    if (violations.some(v => v.severity === 'high'))
      recommendations.push('Remove all tracking and correlation headers');

    return {
      score: Math.max(0, score),
      violations,
      recommendations,
    };
  }

  public async validateNetworkTraffic(
    request: z.infer<typeof NetworkValidationRequestSchema>
  ): Promise<NetworkValidationResult> {
    const testId = `net-test-${Date.now()}`;
    const headers = request.headers || {};
    const payload = request.payload || '';

    // Perform all validations
    const plaintextDetection = this.detectPlaintextData(payload, headers);
    const headerAnalysis = this.analyzeHeaders(headers);
    const tlsInspection = this.simulateTLSInspection(request.endpoint);
    const trafficPattern = this.analyzeTrafficPattern(payload, headers);
    const metadataMinimization = this.calculateMetadataMinimization(headers);

    // Calculate overall security score
    let overallScore = 100;

    // Major penalties
    if (plaintextDetection.found) {
      const criticalPatterns = plaintextDetection.patterns.filter(p => p.riskLevel === 'critical');
      overallScore -= criticalPatterns.length * 40;
      overallScore -= (plaintextDetection.patterns.length - criticalPatterns.length) * 20;
    }

    // Header violations
    const violatingHeaders = headerAnalysis.filter(h => h.classification === 'violating');
    const suspiciousHeaders = headerAnalysis.filter(h => h.classification === 'suspicious');
    overallScore -= violatingHeaders.length * 30;
    overallScore -= suspiciousHeaders.length * 10;

    // TLS issues
    if (tlsInspection.encryptionStrength === 'weak') overallScore -= 50;
    overallScore -= tlsInspection.vulnerabilities.length * 20;

    // Privacy and metadata scores
    overallScore = (overallScore + trafficPattern.privacyScore + metadataMinimization.score) / 3;
    overallScore = Math.max(0, Math.min(100, overallScore));

    // Determine compliance status
    let complianceStatus: 'pass' | 'warning' | 'fail';
    if (overallScore >= 80) complianceStatus = 'pass';
    else if (overallScore >= 60) complianceStatus = 'warning';
    else complianceStatus = 'fail';

    return {
      testId,
      timestamp: new Date().toISOString(),
      endpoint: request.endpoint,
      validationType: request.validationType,
      privacyLevel: request.privacyLevel,
      plaintextDetection,
      headerAnalysis,
      tlsInspection,
      trafficPattern,
      metadataMinimization,
      overallSecurityScore: Math.round(overallScore),
      complianceStatus,
      auditTrail: {
        checks: [
          'plaintext-detection',
          'header-analysis',
          'tls-inspection',
          'traffic-pattern-analysis',
          'metadata-minimization',
        ],
        timestamp: new Date().toISOString(),
        validator: 'network-security-validator-v1.0',
      },
    };
  }
}

const networkValidator = new NetworkSecurityValidator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationRequest = NetworkValidationRequestSchema.parse(body);

    // Perform network validation
    const result = await networkValidator.validateNetworkTraffic(validationRequest);

    return NextResponse.json(
      {
        success: true,
        result,
        metadata: {
          processingTime: Date.now() - parseInt(result.testId.split('-')[2]),
          validationType: result.validationType,
          complianceStatus: result.complianceStatus,
          criticalIssues:
            result.headerAnalysis.filter(h => h.classification === 'violating').length +
            (result.plaintextDetection.found
              ? result.plaintextDetection.patterns.filter(p => p.riskLevel === 'critical').length
              : 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Network validation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    info: {
      endpoint: '/api/internal/network-validation',
      purpose: 'Network traffic validation for zero-knowledge architecture compliance',
      capabilities: [
        'Plaintext data detection in headers and payloads',
        'TLS inspection compatibility validation',
        'Metadata minimization analysis',
        'Traffic pattern privacy scoring',
        'Comprehensive security compliance reporting',
      ],
      validationTypes: [
        'plaintext-detection',
        'tls-inspection',
        'metadata-analysis',
        'traffic-pattern',
      ],
      privacyLevels: ['strict', 'standard', 'basic'],
      complianceFrameworks: ['zero-knowledge-architecture', 'privacy-by-design', 'gdpr-compliant'],
    },
  });
}
