// Promise-based async interface for TypeScript integration
import init_wasm, * as wasm from '../pkg/crypto_core';
import type {
  CryptoEnvelope,
  CryptoKey,
  AADValidator,
  ModuleIntegrity,
  HealthCheck,
} from '../pkg/crypto_core';

// Re-export all WASM bindings
export * from '../pkg/crypto_core';

// Export types for better TypeScript integration
export type { CryptoEnvelope, CryptoKey, AADValidator, ModuleIntegrity, HealthCheck };

// Custom error types for better TypeScript error handling
export class CryptoInitializationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CryptoInitializationError';
  }
}

export class CryptoOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CryptoOperationError';
  }
}

export class IntegrityVerificationError extends Error {
  constructor(
    message: string,
    public readonly checksum?: string
  ) {
    super(message);
    this.name = 'IntegrityVerificationError';
  }
}

// Promise-based initialization with integrity verification
let wasmInitialized = false;
let initPromise: Promise<ModuleIntegrity> | null = null;

export async function initializeCrypto(): Promise<ModuleIntegrity> {
  if (wasmInitialized && initPromise) {
    return initPromise;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        // Initialize WASM module
        await init_wasm();

        // Perform integrity verification
        const integrity = wasm.init_crypto_core_with_verification();

        if (!integrity.verified) {
          throw new IntegrityVerificationError(
            'WASM module integrity verification failed',
            integrity.checksum
          );
        }

        wasmInitialized = true;
        return integrity;
      } catch (error) {
        initPromise = null; // Reset so we can retry
        if (error instanceof IntegrityVerificationError) {
          throw error;
        }
        throw new CryptoInitializationError(
          'Failed to initialize crypto core',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    })();
  }

  return initPromise;
}

// Promise-based crypto operations with proper error handling
export class AsyncCryptoCore {
  private initialized = false;

  constructor() {
    // Private constructor to ensure proper initialization
  }

  static async create(): Promise<AsyncCryptoCore> {
    const instance = new AsyncCryptoCore();
    await instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    await initializeCrypto();
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CryptoOperationError(
        'Crypto core not initialized. Call AsyncCryptoCore.create() first.',
        'initialization_check'
      );
    }
  }

  // Async envelope creation
  async createEnvelope(
    encryptedData: Uint8Array,
    nonce: Uint8Array,
    tag: Uint8Array
  ): Promise<CryptoEnvelope> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const envelope = wasm.create_envelope(encryptedData, nonce, tag);
        resolve(envelope);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to create crypto envelope',
            'create_envelope',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }

  // Async key generation
  async generateEncryptionKey(): Promise<CryptoKey> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const key = wasm.generate_encryption_key();
        resolve(key);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to generate encryption key',
            'generate_encryption_key',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }

  // Async signing key generation
  async generateSigningKey(): Promise<CryptoKey> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const key = wasm.generate_signing_key();
        resolve(key);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to generate signing key',
            'generate_signing_key',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }

  // Async AAD creation for cycle data
  async createCycleDataAAD(userId: string, timestamp: bigint): Promise<Uint8Array> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const aad = wasm.create_cycle_data_aad(userId, timestamp);
        resolve(aad);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to create cycle data AAD',
            'create_cycle_data_aad',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }

  // Async AAD creation for healthcare sharing
  async createHealthcareShareAAD(userId: string, shareToken: string): Promise<Uint8Array> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const aad = wasm.create_healthcare_share_aad(userId, shareToken);
        resolve(aad);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to create healthcare share AAD',
            'create_healthcare_share_aad',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }

  // Health check
  async runHealthCheck(): Promise<HealthCheck> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      try {
        const healthCheck = wasm.HealthCheck.run_health_check();
        resolve(healthCheck);
      } catch (error) {
        reject(
          new CryptoOperationError(
            'Failed to run health check',
            'run_health_check',
            error instanceof Error ? error : new Error(String(error))
          )
        );
      }
    });
  }
}

// Utility functions for easier usage
export async function isWasmSupported(): Promise<boolean> {
  try {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  } catch {
    return false;
  }
}

export async function getCryptoVersion(): Promise<string> {
  await initializeCrypto();
  return wasm.get_crypto_core_version();
}

export async function getBuildInfo(): Promise<Record<string, unknown>> {
  await initializeCrypto();
  const buildInfo = wasm.get_build_info();
  return JSON.parse(buildInfo) as Record<string, unknown>;
}

// Export integration interfaces and utilities
export * from './integration';

// Default export for easier imports
export default {
  initializeCrypto,
  AsyncCryptoCore,
  isWasmSupported,
  getCryptoVersion,
  getBuildInfo,
};
