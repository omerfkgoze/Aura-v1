import { CryptoEnvelopeValidator } from './envelope-validator';
import { KdfValidator } from './kdf-validator';
import { AlgorithmValidator } from './algorithm-validator';
import { CryptoEnvelope, ValidationResult } from './crypto-envelope.types';

export interface CryptoGateConfig {
  strictMode?: boolean;
  allowWarnings?: boolean;
  quantumResistanceCheck?: boolean;
  timingAttackCheck?: boolean;
}

export class CryptoGate {
  private envelopeValidator: CryptoEnvelopeValidator;
  private kdfValidator: KdfValidator;
  private algorithmValidator: AlgorithmValidator;
  private config: CryptoGateConfig;

  constructor(config: CryptoGateConfig = {}) {
    this.envelopeValidator = new CryptoEnvelopeValidator();
    this.kdfValidator = new KdfValidator();
    this.algorithmValidator = new AlgorithmValidator();
    this.config = {
      strictMode: false,
      allowWarnings: true,
      quantumResistanceCheck: false,
      timingAttackCheck: true,
      ...config,
    };
  }

  /**
   * Comprehensive validation of crypto envelope
   */
  async validateCryptoEnvelope(envelope: unknown): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Step 1: Schema and structure validation
    const envelopeResult = this.envelopeValidator.validateComplete(envelope);
    result.errors.push(...envelopeResult.errors);
    result.warnings.push(...envelopeResult.warnings);
    if (!envelopeResult.valid) {
      result.valid = false;
      return result; // Exit early if basic validation fails
    }

    const validEnvelope = envelope as CryptoEnvelope;

    // Step 2: KDF parameter validation
    const kdfResult = this.kdfValidator.validateKdfParams(validEnvelope.kdfParams);
    result.errors.push(...kdfResult.errors);
    result.warnings.push(...kdfResult.warnings);
    if (!kdfResult.valid) result.valid = false;

    // Step 3: Algorithm validation
    const algorithmResult = this.algorithmValidator.validateCryptoParameters({
      algorithm: validEnvelope.algorithm,
      salt: validEnvelope.salt,
      nonce: validEnvelope.nonce,
      keyId: validEnvelope.keyId,
    });
    result.errors.push(...algorithmResult.errors);
    result.warnings.push(...algorithmResult.warnings);
    if (!algorithmResult.valid) result.valid = false;

    // Step 4: Optional timing attack resistance check
    if (this.config.timingAttackCheck) {
      const timingResult = this.kdfValidator.validateTimingAttackResistance(
        validEnvelope.kdfParams
      );
      result.warnings.push(...timingResult.warnings);
      // Timing warnings don't fail validation unless in strict mode
      if (this.config.strictMode && timingResult.warnings.length > 0) {
        result.errors.push(...timingResult.warnings);
        result.valid = false;
      }
    }

    // Step 5: Optional quantum resistance check
    if (this.config.quantumResistanceCheck) {
      const quantumResult = this.algorithmValidator.validateQuantumResistance(
        validEnvelope.algorithm
      );
      result.warnings.push(...quantumResult.warnings);
      // Quantum warnings don't fail validation unless in strict mode
      if (this.config.strictMode && quantumResult.warnings.length > 0) {
        result.errors.push(...quantumResult.warnings);
        result.valid = false;
      }
    }

    // Step 6: Apply strict mode rules
    if (this.config.strictMode && !this.config.allowWarnings && result.warnings.length > 0) {
      result.errors.push('Strict mode: warnings not allowed');
      result.valid = false;
    }

    return result;
  }

  /**
   * Batch validation of multiple envelopes
   */
  async validateBatch(envelopes: unknown[]): Promise<{
    results: ValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    const results = await Promise.all(
      envelopes.map(envelope => this.validateCryptoEnvelope(envelope))
    );

    const summary = {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    };

    return { results, summary };
  }

  /**
   * Validate crypto envelope against security policies
   */
  async validateSecurityPolicy(
    envelope: CryptoEnvelope,
    policyName: string
  ): Promise<ValidationResult> {
    const policies = this.getSecurityPolicies();
    const policy = policies[policyName];

    if (!policy) {
      return {
        valid: false,
        errors: [`Unknown security policy: ${policyName}`],
        warnings: [],
      };
    }

    // Apply policy-specific validation
    const gateWithPolicy = new CryptoGate(policy.config);
    return await gateWithPolicy.validateCryptoEnvelope(envelope);
  }

  private getSecurityPolicies(): Record<string, { config: CryptoGateConfig }> {
    return {
      production: {
        config: {
          strictMode: true,
          allowWarnings: false,
          quantumResistanceCheck: false,
          timingAttackCheck: true,
        },
      },
      staging: {
        config: {
          strictMode: false,
          allowWarnings: true,
          quantumResistanceCheck: false,
          timingAttackCheck: true,
        },
      },
      development: {
        config: {
          strictMode: false,
          allowWarnings: true,
          quantumResistanceCheck: false,
          timingAttackCheck: false,
        },
      },
      'future-proof': {
        config: {
          strictMode: true,
          allowWarnings: false,
          quantumResistanceCheck: true,
          timingAttackCheck: true,
        },
      },
    };
  }

  /**
   * Generate crypto envelope validation report
   */
  generateReport(result: ValidationResult, envelope?: CryptoEnvelope): string {
    let report = '# Crypto Envelope Validation Report\n\n';

    report += `## Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    if (result.errors.length > 0) {
      report += '## Errors\n';
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## Warnings\n';
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (envelope) {
      report += '## Envelope Details\n';
      report += `- Algorithm: ${envelope.algorithm}\n`;
      report += `- KDF: ${envelope.kdfParams.algorithm} (${envelope.kdfParams.memory}KB, ${envelope.kdfParams.iterations} iterations)\n`;
      report += `- Version: ${envelope.version}\n`;
      report += `- Key ID: ${envelope.keyId}\n`;
      report += `- Table: ${envelope.aad.tableName}\n`;
    }

    return report;
  }
}
