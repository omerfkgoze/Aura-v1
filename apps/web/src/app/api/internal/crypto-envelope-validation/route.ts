import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Crypto envelope validation schemas
const CryptoEnvelopeSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  algorithm: z.enum(['AES-256-GCM', 'ChaCha20-Poly1305', 'AES-128-GCM']),
  kdfParams: z.object({
    name: z.enum(['Argon2id', 'PBKDF2', 'scrypt']),
    iterations: z.number().min(1),
    memory: z.number().min(1024),
    parallelism: z.number().min(1).max(16),
  }),
  salt: z.string().min(16),
  nonce: z.string().min(12),
  keyId: z.string().min(1),
  aad: z.string().min(1),
});

const ValidationRequestSchema = z.object({
  envelopes: z.array(CryptoEnvelopeSchema).min(1).max(10),
  validationType: z.enum(['structure', 'compatibility', 'security', 'performance']),
  deviceContext: z
    .object({
      platform: z.enum(['iOS', 'Android', 'Web']),
      capabilities: z.object({
        maxMemory: z.number(),
        hardwareAcceleration: z.boolean(),
        secureEnclaveAvailable: z.boolean(),
      }),
    })
    .optional(),
});

interface ValidationResult {
  testId: string;
  timestamp: string;
  validationType: string;
  envelopeResults: {
    index: number;
    envelope: z.infer<typeof CryptoEnvelopeSchema>;
    structureValidation: {
      valid: boolean;
      issues: string[];
      recommendations: string[];
    };
    securityValidation: {
      algorithmStrength: 'weak' | 'moderate' | 'strong';
      kdfSecurity: 'weak' | 'moderate' | 'strong';
      saltEntropy: number;
      nonceUniqueness: boolean;
      aadIntegrity: boolean;
      issues: string[];
    };
    compatibilityValidation: {
      crossPlatform: boolean;
      versionCompatible: boolean;
      hardwareOptimized: boolean;
      limitations: string[];
    };
    performanceValidation: {
      estimatedEncryptionTime: number;
      estimatedDecryptionTime: number;
      memoryRequirement: number;
      batteryImpact: 'minimal' | 'moderate' | 'high';
      optimizationSuggestions: string[];
    };
  }[];
  overallAssessment: {
    consistencyScore: number;
    securityScore: number;
    performanceScore: number;
    complianceStatus: 'compliant' | 'warning' | 'non-compliant';
    criticalIssues: string[];
    recommendations: string[];
  };
}

class CryptoEnvelopeValidator {
  private validateStructure(envelope: z.infer<typeof CryptoEnvelopeSchema>) {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Version validation
    const versionParts = envelope.version.split('.').map(Number);
    if (versionParts[0] === 0) {
      issues.push('Major version 0 indicates unstable format');
      recommendations.push('Use stable version format (1.0.0 or higher)');
    }

    // Salt length validation
    const saltBytes = Buffer.from(envelope.salt, 'base64').length;
    if (saltBytes < 32) {
      issues.push(`Salt too short (${saltBytes} bytes, minimum 32 recommended)`);
      recommendations.push('Use at least 32-byte salt for security');
    }

    // Nonce length validation
    const nonceBytes = Buffer.from(envelope.nonce, 'base64').length;
    const expectedNonceLength = envelope.algorithm === 'ChaCha20-Poly1305' ? 12 : 12;
    if (nonceBytes !== expectedNonceLength) {
      issues.push(`Incorrect nonce length for ${envelope.algorithm}: ${nonceBytes} bytes`);
      recommendations.push(`Use ${expectedNonceLength}-byte nonce for ${envelope.algorithm}`);
    }

    // AAD validation
    const aadBytes = Buffer.from(envelope.aad, 'base64').length;
    if (aadBytes < 16) {
      issues.push('AAD too short, may not provide adequate authentication context');
      recommendations.push('Include more authentication context in AAD');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  private validateSecurity(envelope: z.infer<typeof CryptoEnvelopeSchema>) {
    const issues: string[] = [];

    // Algorithm strength assessment
    let algorithmStrength: 'weak' | 'moderate' | 'strong' = 'strong';
    if (envelope.algorithm === 'AES-128-GCM') {
      algorithmStrength = 'moderate';
      issues.push('AES-128 provides moderate security; consider AES-256 for sensitive health data');
    }

    // KDF security assessment
    let kdfSecurity: 'weak' | 'moderate' | 'strong' = 'strong';
    if (envelope.kdfParams.name === 'PBKDF2') {
      if (envelope.kdfParams.iterations < 100000) {
        kdfSecurity = 'weak';
        issues.push(`PBKDF2 iterations too low: ${envelope.kdfParams.iterations}`);
      } else {
        kdfSecurity = 'moderate';
        issues.push('PBKDF2 is acceptable but Argon2id is preferred for new implementations');
      }
    } else if (envelope.kdfParams.name === 'Argon2id') {
      if (envelope.kdfParams.memory < 32768) {
        kdfSecurity = 'moderate';
        issues.push(`Argon2id memory parameter too low: ${envelope.kdfParams.memory} KB`);
      }
      if (envelope.kdfParams.iterations < 2) {
        kdfSecurity = 'moderate';
        issues.push(`Argon2id iterations too low: ${envelope.kdfParams.iterations}`);
      }
    }

    // Salt entropy estimation
    const saltBuffer = Buffer.from(envelope.salt, 'base64');
    const saltEntropy = this.estimateEntropy(saltBuffer);

    // Nonce uniqueness (simulated check)
    const nonceUniqueness = true; // Would check against database in real implementation

    // AAD integrity check
    const aadIntegrity = envelope.aad.length > 0;
    if (!aadIntegrity) {
      issues.push('Empty AAD reduces authentication security');
    }

    return {
      algorithmStrength,
      kdfSecurity,
      saltEntropy,
      nonceUniqueness,
      aadIntegrity,
      issues,
    };
  }

  private validateCompatibility(
    envelope: z.infer<typeof CryptoEnvelopeSchema>,
    deviceContext?: z.infer<typeof ValidationRequestSchema>['deviceContext']
  ) {
    const limitations: string[] = [];

    let crossPlatform = true;
    let hardwareOptimized = false;

    // Platform-specific checks
    if (deviceContext) {
      const { platform, capabilities } = deviceContext;

      // Check memory requirements
      if (envelope.kdfParams.memory > capabilities.maxMemory) {
        crossPlatform = false;
        limitations.push(
          `Memory requirement (${envelope.kdfParams.memory} KB) exceeds device capability`
        );
      }

      // Hardware acceleration availability
      if (capabilities.hardwareAcceleration) {
        hardwareOptimized =
          envelope.algorithm === 'AES-256-GCM' || envelope.algorithm === 'AES-128-GCM';
        if (!hardwareOptimized) {
          limitations.push(`${envelope.algorithm} may not utilize available hardware acceleration`);
        }
      }

      // Secure Enclave compatibility (iOS)
      if (platform === 'iOS' && capabilities.secureEnclaveAvailable) {
        if (envelope.kdfParams.name !== 'Argon2id' || envelope.kdfParams.memory > 65536) {
          limitations.push('Configuration may not be optimal for iOS Secure Enclave');
        }
      }

      // Web platform limitations
      if (platform === 'Web') {
        if (envelope.kdfParams.memory > 131072) {
          // 128MB limit for web
          crossPlatform = false;
          limitations.push('Memory requirement too high for web browser environment');
        }
      }
    }

    // Version compatibility
    const versionCompatible = envelope.version.startsWith('1.'); // Compatible with v1.x.x

    return {
      crossPlatform,
      versionCompatible,
      hardwareOptimized,
      limitations,
    };
  }

  private validatePerformance(
    envelope: z.infer<typeof CryptoEnvelopeSchema>,
    deviceContext?: z.infer<typeof ValidationRequestSchema>['deviceContext']
  ) {
    const optimizationSuggestions: string[] = [];

    // Estimate performance based on algorithm and parameters
    let baseEncryptionTime = 10; // milliseconds
    let baseDecryptionTime = 12;
    const memoryRequirement = envelope.kdfParams.memory;

    // Adjust for algorithm
    switch (envelope.algorithm) {
      case 'AES-256-GCM':
        if (deviceContext?.capabilities.hardwareAcceleration) {
          baseEncryptionTime *= 0.5;
          baseDecryptionTime *= 0.5;
        }
        break;
      case 'ChaCha20-Poly1305':
        baseEncryptionTime *= 1.2;
        baseDecryptionTime *= 1.2;
        if (!deviceContext?.capabilities.hardwareAcceleration) {
          optimizationSuggestions.push('Consider AES-256-GCM for better software performance');
        }
        break;
    }

    // Adjust for KDF
    let kdfTime = 0;
    switch (envelope.kdfParams.name) {
      case 'Argon2id':
        kdfTime = (envelope.kdfParams.iterations * envelope.kdfParams.memory) / 1000;
        break;
      case 'PBKDF2':
        kdfTime = envelope.kdfParams.iterations / 10000;
        break;
      case 'scrypt':
        kdfTime = envelope.kdfParams.memory / 1000;
        break;
    }

    const estimatedEncryptionTime = baseEncryptionTime + kdfTime;
    const estimatedDecryptionTime = baseDecryptionTime + kdfTime;

    // Battery impact assessment
    let batteryImpact: 'minimal' | 'moderate' | 'high' = 'minimal';
    if (estimatedEncryptionTime > 100) {
      batteryImpact = 'high';
      optimizationSuggestions.push('Consider reducing KDF parameters for better battery life');
    } else if (estimatedEncryptionTime > 50) {
      batteryImpact = 'moderate';
      optimizationSuggestions.push('Monitor battery usage during extended crypto operations');
    }

    // Memory optimization suggestions
    if (memoryRequirement > 65536) {
      optimizationSuggestions.push('High memory usage may cause issues on low-end devices');
    }

    // Platform-specific optimizations
    if (deviceContext) {
      if (deviceContext.platform === 'Web' && envelope.kdfParams.name === 'Argon2id') {
        optimizationSuggestions.push('Consider Web Workers for Argon2id to avoid blocking UI');
      }
    }

    return {
      estimatedEncryptionTime: Math.round(estimatedEncryptionTime),
      estimatedDecryptionTime: Math.round(estimatedDecryptionTime),
      memoryRequirement,
      batteryImpact,
      optimizationSuggestions,
    };
  }

  private estimateEntropy(buffer: Buffer): number {
    // Simple entropy estimation using Shannon entropy
    const frequency = new Map<number, number>();

    for (const byte of buffer) {
      frequency.set(byte, (frequency.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const length = buffer.length;

    for (const count of frequency.values()) {
      const p = count / length;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  public async validateEnvelopes(
    request: z.infer<typeof ValidationRequestSchema>
  ): Promise<ValidationResult> {
    const testId = `envelope-test-${Date.now()}`;

    const envelopeResults = request.envelopes.map((envelope, index) => ({
      index,
      envelope,
      structureValidation: this.validateStructure(envelope),
      securityValidation: this.validateSecurity(envelope),
      compatibilityValidation: this.validateCompatibility(envelope, request.deviceContext),
      performanceValidation: this.validatePerformance(envelope, request.deviceContext),
    }));

    // Calculate overall assessment
    const allIssues = envelopeResults.flatMap(r => [
      ...r.structureValidation.issues,
      ...r.securityValidation.issues,
      ...r.compatibilityValidation.limitations,
    ]);

    const criticalIssues = allIssues.filter(
      issue =>
        issue.toLowerCase().includes('security') ||
        issue.toLowerCase().includes('weak') ||
        issue.toLowerCase().includes('too low')
    );

    // Scoring
    const consistencyScore =
      envelopeResults.length > 1
        ? envelopeResults.every(r => r.envelope.version === envelopeResults[0].envelope.version)
          ? 100
          : 70
        : 100;

    const securityScore = Math.max(
      0,
      100 - criticalIssues.length * 20 - (allIssues.length - criticalIssues.length) * 5
    );

    const performanceScore = Math.max(
      0,
      100 -
        envelopeResults.filter(r => r.performanceValidation.batteryImpact === 'high').length * 30
    );

    let complianceStatus: 'compliant' | 'warning' | 'non-compliant';
    if (criticalIssues.length > 0) complianceStatus = 'non-compliant';
    else if (allIssues.length > 0) complianceStatus = 'warning';
    else complianceStatus = 'compliant';

    const recommendations = [
      ...new Set([
        ...envelopeResults.flatMap(r => r.structureValidation.recommendations),
        ...envelopeResults.flatMap(r => r.performanceValidation.optimizationSuggestions),
      ]),
    ];

    return {
      testId,
      timestamp: new Date().toISOString(),
      validationType: request.validationType,
      envelopeResults,
      overallAssessment: {
        consistencyScore,
        securityScore,
        performanceScore,
        complianceStatus,
        criticalIssues,
        recommendations,
      },
    };
  }
}

const envelopeValidator = new CryptoEnvelopeValidator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationRequest = ValidationRequestSchema.parse(body);

    const result = await envelopeValidator.validateEnvelopes(validationRequest);

    return NextResponse.json(
      {
        success: true,
        result,
        metadata: {
          processingTime: Date.now() - parseInt(result.testId.split('-')[2]),
          envelopesValidated: validationRequest.envelopes.length,
          complianceStatus: result.overallAssessment.complianceStatus,
          criticalIssueCount: result.overallAssessment.criticalIssues.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Crypto envelope validation error:', error);

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
      endpoint: '/api/internal/crypto-envelope-validation',
      purpose: 'Comprehensive crypto envelope validation for zero-knowledge architecture',
      capabilities: [
        'Structure validation with format compliance',
        'Security assessment with algorithm strength analysis',
        'Cross-platform compatibility verification',
        'Performance impact estimation',
        'Compliance reporting with recommendations',
      ],
      validationTypes: ['structure', 'compatibility', 'security', 'performance'],
      supportedAlgorithms: ['AES-256-GCM', 'ChaCha20-Poly1305', 'AES-128-GCM'],
      supportedKDFs: ['Argon2id', 'PBKDF2', 'scrypt'],
      platforms: ['iOS', 'Android', 'Web'],
    },
  });
}
