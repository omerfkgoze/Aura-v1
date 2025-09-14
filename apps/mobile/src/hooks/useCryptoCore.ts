import { useState, useEffect, useCallback } from 'react';

export interface CryptoCapabilities {
  supportsWebAuthn: boolean;
  supportsSecureStorage: boolean;
  supportsHardwareCrypto: boolean;
  supportsBiometrics: boolean;
  wasmLoaded: boolean;
}

export interface CryptoOperations {
  encrypt: (data: string, key?: string) => Promise<string>;
  decrypt: (encryptedData: string, key?: string) => Promise<string>;
  generateKey: () => Promise<string>;
  hash: (data: string) => Promise<string>;
  sign: (data: string, privateKey?: string) => Promise<string>;
  verify: (data: string, signature: string, publicKey?: string) => Promise<boolean>;
}

export interface UseCryptoCoreReturn {
  capabilities: CryptoCapabilities;
  operations: CryptoOperations;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  cleanup: () => void;
  cryptoCore: CryptoOperations; // Alias for operations for backward compatibility
}

export const useCryptoCore = (): UseCryptoCoreReturn => {
  const [capabilities, setCapabilities] = useState<CryptoCapabilities>({
    supportsWebAuthn: false,
    supportsSecureStorage: true,
    supportsHardwareCrypto: false,
    supportsBiometrics: false,
    wasmLoaded: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simulate crypto core initialization
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check capabilities
      const caps: CryptoCapabilities = {
        supportsWebAuthn: typeof window !== 'undefined' && 'credentials' in navigator,
        supportsSecureStorage: true, // Always available in mobile
        supportsHardwareCrypto: false, // Would check device capabilities
        supportsBiometrics: false, // Would check for TouchID/FaceID
        wasmLoaded: false, // Would check if WASM module loaded
      };

      setCapabilities(caps);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize crypto core');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cleanup = useCallback(() => {
    setIsInitialized(false);
    setCapabilities({
      supportsWebAuthn: false,
      supportsSecureStorage: false,
      supportsHardwareCrypto: false,
      supportsBiometrics: false,
      wasmLoaded: false,
    });
  }, []);

  const operations: CryptoOperations = {
    encrypt: async (data: string, key?: string): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Simulate encryption
      return btoa(data);
    },

    decrypt: async (encryptedData: string, key?: string): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Simulate decryption
      try {
        return atob(encryptedData);
      } catch {
        throw new Error('Failed to decrypt data');
      }
    },

    generateKey: async (): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Generate a simple key
      return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    },

    hash: async (data: string): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Simple hash simulation
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    },

    sign: async (data: string, privateKey?: string): Promise<string> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Simulate signing
      const hash = await operations.hash(data);
      return `sig_${hash}`;
    },

    verify: async (data: string, signature: string, publicKey?: string): Promise<boolean> => {
      if (!isInitialized) {
        throw new Error('Crypto core not initialized');
      }
      // Simulate verification
      const hash = await operations.hash(data);
      return signature === `sig_${hash}`;
    },
  };

  useEffect(() => {
    // Auto-initialize on mount
    initialize();

    return cleanup;
  }, [initialize, cleanup]);

  return {
    capabilities,
    operations,
    isInitialized,
    isLoading,
    error,
    initialize,
    cleanup,
    cryptoCore: operations, // Alias for operations for backward compatibility
  };
};
