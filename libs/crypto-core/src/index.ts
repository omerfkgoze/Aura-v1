// Re-export WASM bindings
export * from '../pkg/crypto_core';

// Export types for better TypeScript integration
export type { CryptoEnvelope, CryptoKey, AADValidator } from '../pkg/crypto_core';

// Default export for easier imports
export { default as init } from '../pkg/crypto_core';
