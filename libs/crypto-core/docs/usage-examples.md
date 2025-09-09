# Usage Examples

## Web Application Integration

### Next.js Setup

```typescript
// pages/_app.tsx
import { useEffect } from 'react';
import { loadCryptoCoreSecurely } from '@aura/crypto-core';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    loadCryptoCoreSecurely().catch(console.error);
  }, []);

  return <Component {...pageProps} />;
}
```

### React Hook

```typescript
// hooks/useCrypto.ts
import { useState, useCallback } from 'react';
import { encrypt_cycle_data, decrypt_cycle_data } from '@aura/crypto-core';

export function useCrypto(userKey) {
  const [isLoading, setIsLoading] = useState(false);

  const encrypt = useCallback(
    async data => {
      setIsLoading(true);
      try {
        return await encrypt_cycle_data(JSON.stringify(data), userKey, getDeviceHash(), {
          userId: getCurrentUserId(),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [userKey]
  );

  return { encrypt, isLoading };
}
```

## React Native Integration

### Setup

```typescript
// App.tsx
import { encrypt_cycle_data } from '@aura/crypto-core';

export default function App() {
  // WASM automatically initializes in React Native
  // No manual initialization required
}
```

### Secure Storage

```typescript
// utils/secureStorage.ts
import * as SecureStore from 'expo-secure-store';
import { generate_user_key } from '@aura/crypto-core';

export async function initializeUserKey(password: string) {
  const salt = await SecureStore.getItemAsync('crypto-salt');
  return generate_user_key(password, salt);
}
```

## Node.js Server Integration

### API Endpoint

```typescript
// api/decrypt-backup.ts
import { decrypt_cycle_data } from '@aura/crypto-core/node';

export default async function handler(req, res) {
  // Server-side decryption for backup recovery only
  // User provides their key - server never stores it
  const { encryptedData, userKey } = req.body;

  try {
    const decrypted = await decrypt_cycle_data(encryptedData, envelope, userKey);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Decryption failed' });
  }
}
```
