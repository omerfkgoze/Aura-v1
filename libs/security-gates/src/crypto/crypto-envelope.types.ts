export interface CryptoEnvelope {
  version: number;
  algorithm: string;
  kdfParams: {
    algorithm: string;
    memory: number;
    iterations: number;
    parallelism: number;
  };
  salt: string;
  nonce: string;
  keyId: string;
  aad: {
    userId: string;
    recordId: string;
    tableName: string;
    version: number;
    timestamp: string;
  };
}

export interface KdfValidationConfig {
  minMemoryKB: number;
  maxMemoryKB: number;
  minIterations: number;
  maxIterations: number;
  minParallelism: number;
  maxParallelism: number;
  allowedAlgorithms: string[];
}

export interface EncryptionValidationConfig {
  allowedAlgorithms: string[];
  minSaltLength: number;
  algorithmNonceLengths: Record<string, number>;
  minKeyIdLength: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
