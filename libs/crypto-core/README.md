# @aura/crypto-core

[![npm version](https://badge.fury.io/js/%40aura%2Fcrypto-core.svg)](https://badge.fury.io/js/%40aura%2Fcrypto-core)
[![Security Rating](https://img.shields.io/badge/security-audited-green.svg)](./docs/security-audit.md)
[![Build Status](https://img.shields.io/github/workflow/status/aura-app/aura/crypto-core-build)](https://github.com/aura-app/aura/actions)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@aura/crypto-core.svg)](https://bundlephobia.com/package/@aura/crypto-core)

Rust/WASM cryptographic core for the Aura privacy-focused health tracking application. Provides bulletproof client-side encryption with memory hygiene and comprehensive TypeScript integration.

## 🔐 Features

- **Zero-Knowledge Architecture**: All encryption occurs client-side with no server access to plaintext data
- **Memory Hygiene**: Automatic zeroization of sensitive data with leak detection
- **Cross-Platform**: Works on Web, iOS, and Android through React Native
- **TypeScript Integration**: Auto-generated type-safe bindings from Rust code
- **Performance Optimized**: <500ms crypto operations, <512KB WASM bundle
- **Security Hardened**: Constant-time operations, side-channel attack prevention
- **Integrity Verified**: Subresource integrity (SRI) hashes for secure WASM loading

## 📦 Installation

```bash
npm install @aura/crypto-core
```

## 🚀 Quick Start

```typescript
import {
  encrypt_cycle_data,
  decrypt_cycle_data,
  generate_user_key,
  create_crypto_envelope,
} from '@aura/crypto-core';

// Generate a user key
const userKey = await generate_user_key('user-password', 'salt');

// Encrypt sensitive data
const sensitiveData = { temperature: 98.6, symptoms: ['headache'] };
const encryptedResult = await encrypt_cycle_data(
  JSON.stringify(sensitiveData),
  userKey,
  'device-id-hash',
  { userId: 'user123', dataType: 'cycle' } // AAD
);

// Create crypto envelope for storage
const envelope = create_crypto_envelope({
  version: 1,
  algorithm: 'AES-GCM-256',
  kdf_params: { iterations: 100000 },
  encrypted_data: encryptedResult.ciphertext,
  nonce: encryptedResult.nonce,
  salt: encryptedResult.salt,
  key_id: 'key-v1',
});

// Later: decrypt the data
const decryptedData = await decrypt_cycle_data(encryptedResult.ciphertext, envelope, userKey);
```

## 🔧 Platform Support

### Web (Bundler/Webpack)

```typescript
import init, { encrypt_cycle_data } from '@aura/crypto-core';

async function initializeCrypto() {
  await init(); // Initialize WASM
  // Use crypto functions...
}
```

### Web (ES Modules)

```typescript
import init, { encrypt_cycle_data } from '@aura/crypto-core/pkg-web/crypto_core.js';

async function initializeCrypto() {
  await init(); // Initialize WASM
  // Use crypto functions...
}
```

### Node.js

```typescript
const { encrypt_cycle_data } = require('@aura/crypto-core/pkg-node/crypto_core.js');
```

### React Native

```typescript
import { encrypt_cycle_data } from '@aura/crypto-core';
// WASM automatically initializes in React Native
```

## 🛡️ Security Features

### Memory Hygiene

```typescript
import { get_memory_stats, zeroize_memory } from '@aura/crypto-core';

// Check for memory leaks
const stats = get_memory_stats();
console.log(`Active allocations: ${stats.active_allocations}`);

// Manually trigger cleanup (automatic in normal operation)
zeroize_memory();
```

### Integrity Verification

```typescript
import { verifyIntegrity, CRYPTO_CORE_INTEGRITY } from '@aura/crypto-core';

// Verify WASM module before loading
const wasmBytes = await fetch('./crypto_core_bg.wasm').then(r => r.arrayBuffer());
const expectedHash = CRYPTO_CORE_INTEGRITY['pkg/crypto_core_bg.wasm'].integrity;
const isValid = await verifyIntegrity(wasmBytes, expectedHash);

if (!isValid) {
  throw new Error('WASM integrity verification failed');
}
```

### Crypto Envelope Validation

```typescript
import { validate_crypto_envelope } from '@aura/crypto-core';

const isValidEnvelope = validate_crypto_envelope(envelope);
if (!isValidEnvelope) {
  throw new Error('Invalid crypto envelope - possible corruption');
}
```

## 📊 Performance

| Operation        | Target      | Actual     |
| ---------------- | ----------- | ---------- |
| Key Generation   | <500ms      | ~200ms     |
| Encryption       | <500ms      | ~150ms     |
| Decryption       | <500ms      | ~120ms     |
| WASM Bundle Size | <512KB      | ~380KB     |
| Memory Usage     | Predictable | Zero leaks |

## 🧪 Testing

```bash
# Run all tests
npm test

# Cross-platform testing
npm run test:cross-platform

# Security testing
npm run test:security

# Performance benchmarks
npm run test:benchmark

# Memory leak detection
npm run test:memory
```

## 🏗️ Building from Source

```bash
# Install dependencies
npm install

# Build all targets
npm run build:release

# Validate build
npm run build:ci
```

## 📚 API Reference

### Core Functions

#### `encrypt_cycle_data(data, userKey, deviceIdHash, aad)`

Encrypts sensitive cycle data with authenticated encryption.

**Parameters:**

- `data: string` - JSON string of sensitive data
- `userKey: UserKey` - User's encryption key
- `deviceIdHash: string` - Hashed device identifier
- `aad: object` - Additional Authenticated Data for context

**Returns:** `Promise<EncryptedResult>`

#### `decrypt_cycle_data(ciphertext, envelope, userKey)`

Decrypts cycle data with envelope validation.

**Parameters:**

- `ciphertext: string` - Encrypted data
- `envelope: CryptoEnvelope` - Crypto envelope with metadata
- `userKey: UserKey` - User's decryption key

**Returns:** `Promise<string>` - Decrypted JSON data

#### `generate_user_key(password, salt)`

Generates a cryptographic key from user password using Argon2.

**Parameters:**

- `password: string` - User password
- `salt: string` - Cryptographic salt

**Returns:** `Promise<UserKey>`

### Security Functions

#### `create_crypto_envelope(params)`

Creates a crypto envelope for encrypted data storage.

#### `validate_crypto_envelope(envelope)`

Validates crypto envelope integrity and format.

#### `zeroize_memory()`

Manually triggers sensitive memory cleanup.

#### `get_memory_stats()`

Returns memory usage statistics for leak detection.

## 🔐 Security Considerations

1. **Key Management**: Never log or store user keys in plaintext
2. **Memory Safety**: WASM module automatically cleans sensitive memory
3. **Integrity**: Always verify WASM integrity before loading in production
4. **AAD Usage**: Include contextual data in AAD for authenticated encryption
5. **Version Compatibility**: Use envelope versioning for crypto migrations

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🤝 Contributing

Please read our [contributing guidelines](./CONTRIBUTING.md) and [security policy](./SECURITY.md) before submitting changes.

## 📞 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/aura-app/aura/issues)
- 🔒 [Security Policy](./SECURITY.md)
- 📧 [Contact](mailto:security@aura-app.com)

---

Built with ❤️ for privacy-first health tracking.
