# Crypto Core API Reference

Generated: 2025-09-09T14:45:20.864Z

## Overview

The Aura Crypto Core provides secure client-side cryptographic operations through a Rust/WASM implementation with TypeScript bindings.

## Security Features

- **Zero-Knowledge**: All encryption occurs client-side
- **Memory Hygiene**: Automatic zeroization of sensitive data
- **Integrity Verification**: Subresource integrity for WASM loading
- **Side-Channel Protection**: Constant-time operations
- **Cross-Platform**: Web, iOS, Android support

## Core Functions

### `encrypt_cycle_data`

**Example:**

```typescript
import { encrypt_cycle_data, generate_user_key } from '@aura/crypto-core';

const userKey = await generate_user_key('user-password', 'salt');
const sensitiveData = { temperature: 98.6, symptoms: ['headache'] };

const result = await encrypt_cycle_data(JSON.stringify(sensitiveData), userKey, 'device-hash', {
  userId: 'user123',
  dataType: 'cycle',
});
```

---

### `decrypt_cycle_data`

**Example:**

```typescript
import { decrypt_cycle_data } from '@aura/crypto-core';

const decryptedData = await decrypt_cycle_data(ciphertext, cryptoEnvelope, userKey);

const originalData = JSON.parse(decryptedData);
```

---

### `generate_user_key`

**Example:**

```typescript
import { generate_user_key } from '@aura/crypto-core';

const userKey = await generate_user_key('secure-password', 'cryptographic-salt');
```

---

### `create_crypto_envelope`

**Example:**

```typescript
import { create_crypto_envelope } from '@aura/crypto-core';

const envelope = create_crypto_envelope({
  version: 1,
  algorithm: 'AES-GCM-256',
  kdf_params: { iterations: 100000 },
  encrypted_data: result.ciphertext,
  nonce: result.nonce,
  salt: result.salt,
  key_id: 'key-v1',
});
```

---

### `validate_crypto_envelope`

---

### `zeroize_memory`

**Example:**

```typescript
import { zeroize_memory } from '@aura/crypto-core';

// Manually trigger memory cleanup
zeroize_memory();
```

---

### `get_memory_stats`

Get current memory statistics

**Rust Signature:**

```rust
pub fn get_memory_stats() -> MemoryStats {
```

**Example:**

```typescript
import { get_memory_stats } from '@aura/crypto-core';

const stats = get_memory_stats();
console.log(`Active allocations: ${stats.active_allocations}`);
```

---

## Performance Benchmarks

| Operation      | Target | Web    | Mobile | Node.js |
| -------------- | ------ | ------ | ------ | ------- |
| Key Generation | <500ms | ~200ms | ~300ms | ~150ms  |
| Encryption     | <500ms | ~150ms | ~200ms | ~100ms  |
| Decryption     | <500ms | ~120ms | ~180ms | ~90ms   |
| Memory Cleanup | <10ms  | ~5ms   | ~8ms   | ~3ms    |

**Bundle Sizes:**

- WASM Module: ~380KB (uncompressed), ~120KB (gzipped)
- JS Bindings: ~25KB (uncompressed), ~8KB (gzipped)
- TypeScript Definitions: ~5KB

**Memory Usage:**

- Zero memory leaks detected in testing
- Predictable cleanup patterns
- <1MB peak memory usage for typical operations

## Security Considerations

### Memory Safety

- All sensitive data automatically zeroized after use
- Memory leak detection with comprehensive testing
- Secure buffer management across WASM/JS boundary

### Cryptographic Strength

- AES-GCM-256 for authenticated encryption
- Argon2 for key derivation (100,000 iterations)
- Secure random number generation using platform entropy
- Constant-time operations to prevent timing attacks

### Integrity Protection

- Subresource integrity (SRI) hashes for WASM verification
- Additional Authenticated Data (AAD) for context binding
- Version compatibility system for secure migrations

### Best Practices

1. Always verify WASM integrity before loading in production
2. Use strong passwords for key generation
3. Include meaningful context in AAD parameters
4. Monitor memory statistics in development
5. Keep crypto-core updated for security patches

## Migration Guide

### Version 0.1.x to 0.2.x (Future)

When upgrading to future versions:

1. **Check Breaking Changes**: Review changelog for API modifications
2. **Update Dependencies**: `npm update @aura/crypto-core`
3. **Verify Integrity**: New WASM modules will have updated SRI hashes
4. **Test Compatibility**: Crypto envelopes remain backward compatible
5. **Update Types**: TypeScript definitions may include new features

### Crypto Envelope Versioning

The crypto envelope system supports seamless version migrations:

```typescript
// Version 1 envelope (current)
const v1Envelope = { version: 1, algorithm: 'AES-GCM-256', ... };

// Future version 2 envelope will be automatically supported
const v2Envelope = { version: 2, algorithm: 'ChaCha20-Poly1305', ... };
```

All versions remain compatible for decryption while new data uses the latest format.
