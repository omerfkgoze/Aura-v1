import { KdfValidationConfig, ValidationResult } from './crypto-envelope.types';

export class KdfValidator {
  private config: KdfValidationConfig = {
    minMemoryKB: 65536, // 64MB minimum for Argon2id
    maxMemoryKB: 2097152, // 2GB maximum
    minIterations: 3,
    maxIterations: 100,
    minParallelism: 1,
    maxParallelism: 32,
    allowedAlgorithms: ['Argon2id', 'Argon2i', 'Argon2d'],
  };

  constructor(config?: Partial<KdfValidationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  validateKdfParams(kdfParams: {
    algorithm: string;
    memory: number;
    iterations: number;
    parallelism: number;
  }): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Validate algorithm
    if (!this.config.allowedAlgorithms.includes(kdfParams.algorithm)) {
      result.errors.push(
        `KDF algorithm '${kdfParams.algorithm}' not allowed. Allowed: ${this.config.allowedAlgorithms.join(', ')}`
      );
      result.valid = false;
    }

    // Validate memory parameter
    if (kdfParams.memory < this.config.minMemoryKB) {
      result.errors.push(
        `KDF memory too low: ${kdfParams.memory}KB, minimum ${this.config.minMemoryKB}KB required for security`
      );
      result.valid = false;
    }

    if (kdfParams.memory > this.config.maxMemoryKB) {
      result.errors.push(
        `KDF memory too high: ${kdfParams.memory}KB, maximum ${this.config.maxMemoryKB}KB allowed`
      );
      result.valid = false;
    }

    // Validate iterations
    if (kdfParams.iterations < this.config.minIterations) {
      result.errors.push(
        `KDF iterations too low: ${kdfParams.iterations}, minimum ${this.config.minIterations} required`
      );
      result.valid = false;
    }

    if (kdfParams.iterations > this.config.maxIterations) {
      result.errors.push(
        `KDF iterations too high: ${kdfParams.iterations}, maximum ${this.config.maxIterations} allowed`
      );
      result.valid = false;
    }

    // Validate parallelism
    if (kdfParams.parallelism < this.config.minParallelism) {
      result.errors.push(
        `KDF parallelism too low: ${kdfParams.parallelism}, minimum ${this.config.minParallelism} required`
      );
      result.valid = false;
    }

    if (kdfParams.parallelism > this.config.maxParallelism) {
      result.errors.push(
        `KDF parallelism too high: ${kdfParams.parallelism}, maximum ${this.config.maxParallelism} allowed`
      );
      result.valid = false;
    }

    // Security recommendations
    this.addSecurityWarnings(kdfParams, result);

    return result;
  }

  private addSecurityWarnings(
    kdfParams: {
      algorithm: string;
      memory: number;
      iterations: number;
      parallelism: number;
    },
    result: ValidationResult
  ): void {
    // Recommend Argon2id over other variants
    if (kdfParams.algorithm !== 'Argon2id') {
      result.warnings.push(
        `Consider using Argon2id instead of ${kdfParams.algorithm} for better security`
      );
    }

    // Warn about low memory for mobile devices
    if (kdfParams.memory < 131072) {
      // 128MB
      result.warnings.push(
        `Memory setting ${kdfParams.memory}KB may be too low for optimal security on modern devices`
      );
    }

    // Warn about high memory that may cause mobile issues
    if (kdfParams.memory > 524288) {
      // 512MB
      result.warnings.push(
        `Memory setting ${kdfParams.memory}KB may cause performance issues on low-memory devices`
      );
    }

    // Recommend higher iterations for lower memory settings
    const memoryIterationsRatio = kdfParams.memory / kdfParams.iterations;
    if (memoryIterationsRatio > 50000) {
      result.warnings.push(
        'Consider increasing iterations relative to memory for better time-memory tradeoff'
      );
    }

    // Recommend parallelism based on typical CPU cores
    if (kdfParams.parallelism === 1 && kdfParams.memory > 262144) {
      // 256MB
      result.warnings.push(
        'Consider increasing parallelism for better performance with high memory settings'
      );
    }
  }

  validateTimingAttackResistance(kdfParams: {
    algorithm: string;
    memory: number;
    iterations: number;
    parallelism: number;
  }): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // Calculate minimum time target (should take at least 100ms)
    const estimatedTimeMs = this.estimateKdfTime(kdfParams);

    if (estimatedTimeMs < 100) {
      result.warnings.push(
        `KDF parameters may complete too quickly (${estimatedTimeMs}ms), consider increasing for timing attack resistance`
      );
    }

    if (estimatedTimeMs > 5000) {
      result.warnings.push(
        `KDF parameters may take too long (${estimatedTimeMs}ms), consider optimizing for user experience`
      );
    }

    return result;
  }

  private estimateKdfTime(kdfParams: {
    algorithm: string;
    memory: number;
    iterations: number;
    parallelism: number;
  }): number {
    // Rough estimation based on typical performance
    // This is a simplified model and actual times will vary by device
    const baseTimePerIteration = 100; // ms - further increased
    const memoryFactor = kdfParams.memory / 65536; // Linear scaling for memory
    const parallelismFactor = Math.max(0.5, 1 / kdfParams.parallelism);

    return Math.round(
      kdfParams.iterations * baseTimePerIteration * memoryFactor * parallelismFactor
    );
  }
}
