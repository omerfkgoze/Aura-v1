# Integration Guides

## Platform-Specific Setup

### Web Bundlers

#### Webpack

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    fallback: {
      crypto: false,
      buffer: false,
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
};
```

#### Vite

```javascript
// vite.config.js
export default {
  server: {
    fs: {
      allow: ['..'],
    },
  },
};
```

### Content Security Policy

Add WASM support to your CSP:

```
Content-Security-Policy: script-src 'self' 'wasm-unsafe-eval';
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@aura/crypto-core"]
  }
}
```

## Error Handling

### Common Error Patterns

```typescript
import { encrypt_cycle_data } from '@aura/crypto-core';

try {
  const result = await encrypt_cycle_data(data, key, device, aad);
} catch (error) {
  if (error.message.includes('WASM not initialized')) {
    // Handle initialization error
  } else if (error.message.includes('Invalid key')) {
    // Handle key validation error
  } else if (error.message.includes('Memory allocation')) {
    // Handle memory error
  }
}
```

### Memory Monitoring

```typescript
import { get_memory_stats } from '@aura/crypto-core';

// Monitor in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = get_memory_stats();
    if (stats.active_allocations > 100) {
      console.warn('High memory usage detected');
    }
  }, 10000);
}
```

## Testing Integration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
};
```

### Test Setup

```javascript
// test-setup.js
import { jest } from '@jest/globals';

// Mock crypto-core for unit tests
jest.mock('@aura/crypto-core', () => ({
  encrypt_cycle_data: jest.fn(),
  decrypt_cycle_data: jest.fn(),
  generate_user_key: jest.fn(),
}));
```

### Integration Tests

```typescript
// tests/crypto.integration.test.ts
import { encrypt_cycle_data, decrypt_cycle_data } from '@aura/crypto-core';

describe('Crypto Integration', () => {
  test('roundtrip encryption/decryption', async () => {
    const originalData = { test: 'data' };
    const userKey = await generate_user_key('password', 'salt');

    const encrypted = await encrypt_cycle_data(
      JSON.stringify(originalData),
      userKey,
      'device-hash',
      { test: true }
    );

    const decrypted = await decrypt_cycle_data(encrypted.ciphertext, encrypted.envelope, userKey);

    expect(JSON.parse(decrypted)).toEqual(originalData);
  });
});
```
