import { EncryptionValidationConfig, ValidationResult } from './crypto-envelope.types';

export class AlgorithmValidator {
  private config: EncryptionValidationConfig = {
    allowedAlgorithms: [
      'XChaCha20Poly1305',
      'ChaCha20Poly1305',
      'AES-256-GCM',
      'AES-256-GCM-96',
      'AES-256-GCM-128',
    ],
    minSaltLength: 32,
    algorithmNonceLengths: {
      XChaCha20Poly1305: 24,
      ChaCha20Poly1305: 12,
      'AES-256-GCM': 12,
      'AES-256-GCM-96': 12,
      'AES-256-GCM-128': 16,
    },
    minKeyIdLength: 8,
  };

  constructor(config?: Partial<EncryptionValidationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  validateAlgorithm(algorithm: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!this.config.allowedAlgorithms.includes(algorithm)) {
      result.errors.push(
        `Encryption algorithm '${algorithm}' not allowed. Allowed: ${this.config.allowedAlgorithms.join(', ')}`
      );
      result.valid = false;
      return result;
    }

    // Add security recommendations
    this.addAlgorithmWarnings(algorithm, result);

    return result;
  }

  validateEncryptionMode(algorithm: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate that algorithms use authenticated encryption
    const authenticatedAlgorithms = [
      'XChaCha20Poly1305',
      'ChaCha20Poly1305',
      'AES-256-GCM',
      'AES-256-GCM-96',
      'AES-256-GCM-128',
    ];

    if (!authenticatedAlgorithms.includes(algorithm)) {
      result.errors.push(`Algorithm '${algorithm}' does not provide authenticated encryption`);
      result.valid = false;
    }

    // Check for deprecated or weak modes
    const deprecatedModes = ['AES-256-CBC', 'AES-256-ECB', 'DES', '3DES'];
    if (deprecatedModes.some(mode => algorithm.includes(mode))) {
      result.errors.push(`Algorithm '${algorithm}' uses deprecated or insecure encryption mode`);
      result.valid = false;
    }

    return result;
  }

  validateCryptoParameters(params: {
    algorithm: string;
    salt: string;
    nonce: string;
    keyId: string;
  }): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate algorithm
    const algorithmResult = this.validateAlgorithm(params.algorithm);
    result.errors.push(...algorithmResult.errors);
    result.warnings.push(...algorithmResult.warnings);
    if (!algorithmResult.valid) result.valid = false;

    // Validate encryption mode
    const modeResult = this.validateEncryptionMode(params.algorithm);
    result.errors.push(...modeResult.errors);
    result.warnings.push(...modeResult.warnings);
    if (!modeResult.valid) result.valid = false;

    // Validate salt length
    const saltBytes = this.getBase64Length(params.salt);
    if (saltBytes < this.config.minSaltLength) {
      result.errors.push(
        `Salt too short: ${saltBytes} bytes, minimum ${this.config.minSaltLength} bytes required`
      );
      result.valid = false;
    }

    // Validate nonce length for algorithm
    const expectedNonceLength = this.config.algorithmNonceLengths[params.algorithm];
    if (expectedNonceLength) {
      const nonceBytes = this.getBase64Length(params.nonce);
      if (nonceBytes !== expectedNonceLength) {
        result.errors.push(
          `Nonce length mismatch for ${params.algorithm}: got ${nonceBytes} bytes, expected ${expectedNonceLength} bytes`
        );
        result.valid = false;
      }
    } else {
      result.warnings.push(`Unknown nonce length requirement for algorithm '${params.algorithm}'`);
    }

    // Validate keyId
    if (params.keyId.length < this.config.minKeyIdLength) {
      result.errors.push(
        `KeyId too short: ${params.keyId.length} characters, minimum ${this.config.minKeyIdLength} required`
      );
      result.valid = false;
    }

    // Check for key rotation indicators
    if (!this.isValidKeyId(params.keyId)) {
      result.warnings.push('KeyId format does not follow recommended key rotation pattern');
    }

    return result;
  }

  private addAlgorithmWarnings(algorithm: string, result: ValidationResult): void {
    // Recommend XChaCha20Poly1305 for best performance and security
    if (algorithm !== 'XChaCha20Poly1305') {
      result.warnings.push(
        'Consider XChaCha20Poly1305 for optimal performance and large nonce space'
      );
    }

    // Warn about AES on devices without hardware acceleration
    if (algorithm.startsWith('AES-256')) {
      result.warnings.push('AES-256 performance depends on hardware acceleration availability');
    }

    // Note about GCM nonce reuse vulnerabilities
    if (algorithm.includes('GCM')) {
      result.warnings.push('Ensure GCM nonces are never reused with the same key');
    }
  }

  private getBase64Length(base64String: string): number {
    const padding = (base64String.match(/=/g) || []).length;
    return Math.floor((base64String.length * 3) / 4) - padding;
  }

  private isValidKeyId(keyId: string): boolean {
    // Check if keyId follows pattern: version_timestamp_hash (e.g., v1_20231201_abc123)
    const keyIdPattern = /^v\d+_\d{8}_[a-fA-F0-9]{6,}$/;
    return keyIdPattern.test(keyId);
  }

  validateQuantumResistance(algorithm: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Current algorithms are not quantum-resistant
    const quantumVulnerable = [
      'XChaCha20Poly1305',
      'ChaCha20Poly1305',
      'AES-256-GCM',
      'AES-256-GCM-96',
      'AES-256-GCM-128',
    ];

    if (quantumVulnerable.includes(algorithm)) {
      result.warnings.push(
        `Algorithm '${algorithm}' is not quantum-resistant. Consider post-quantum alternatives when available.`
      );
    }

    return result;
  }
}
