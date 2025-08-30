# Data Models

Core business entities for menstrual cycle tracking with end-to-end encryption:

## User (Minimal Metadata Only)

**Purpose:** Minimal user identity with zero personal information stored in plaintext

```typescript
interface User {
  id: string; // Supabase UUID only
  createdAt: Date; // UTC ISO string
  lastActiveAt: Date; // UTC ISO string
  // All preferences moved to encrypted UserPrefs blob
}
```

## EncryptedUserPrefs

**Purpose:** All user preferences and cultural settings stored as encrypted blob

```typescript
interface EncryptedUserPrefs {
  id: string;
  userId: string; // RLS: auth.uid()
  encryptedPayload: string; // Client-encrypted preferences
  cryptoEnvelope: CryptoEnvelope;
  version: number; // Conflict resolution
  deviceId: string; // For conflict tracking
  syncedAt: Date; // UTC ISO
}

// Decrypted payload structure:
interface UserPrefsPayload {
  culturalPreset: 'open' | 'discrete' | 'stealth' | 'invisible';
  stealthMode: boolean;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  onboardingComplete: boolean;
  recoverySetup: boolean;
}
```

## EncryptedCycleData (Enhanced with Sync Support)

```typescript
interface EncryptedCycleData {
  id: string;
  userId: string; // RLS: auth.uid()
  encryptedPayload: string;
  cryptoEnvelope: CryptoEnvelope;

  // Sync and conflict resolution
  version: number; // Increment on each edit
  deviceId: string; // Hash of device ID for conflicts
  localTimestamp: Date; // UTC ISO - client timestamp
  syncedAt: Date; // UTC ISO - server sync time
  syncStatus: 'pending' | 'synced' | 'conflict';

  // NO PLAINTEXT HEALTH DATA
  createdAt: Date; // UTC ISO
  updatedAt: Date; // UTC ISO
}
```

## ClientOnlyPredictionCache

**Purpose:** Predictions calculated and stored entirely on device

```typescript
// This is NEVER stored on server - client-only
interface ClientPredictionCache {
  userId: string; // Local reference only
  predictionType: 'next_period' | 'ovulation' | 'fertile_window';
  confidenceIntervals: {
    p50: { start: Date; end: Date };
    p80: { start: Date; end: Date };
    p95: { start: Date; end: Date };
  };
  accuracy: {
    brierScore: number;
    calibration: number;
  };
  generatedAt: Date; // UTC ISO
  validUntil: Date; // Cache expiration

  // Stored in encrypted SQLite only
}
```

## HealthcareShare (Privacy-Hardened)

```typescript
interface HealthcareShare {
  id: string;
  userId: string; // RLS: auth.uid()

  // Encrypted share details
  encryptedShareData: string; // Provider info + scope encrypted
  cryptoEnvelope: CryptoEnvelope;

  // Minimal metadata only
  shareToken: string; // libsignal encrypted access token
  status: 'active' | 'expired' | 'revoked';
  expiresAt: Date; // UTC ISO

  // Privacy-safe access logging
  accessCount: number; // Simple counter
  lastAccessedAt?: Date; // UTC ISO
  deviceType?: 'mobile' | 'desktop' | 'unknown'; // Coarse categorization

  createdAt: Date; // UTC ISO
}

// Decrypted share data payload:
interface ShareDataPayload {
  providerInfo: {
    name: string;
    organization: string;
    email: string;
  };
  scopeFilter: {
    dateRange: { start: Date; end: Date };
    categories: ('periods' | 'symptoms' | 'predictions')[];
    format: 'pdf' | 'csv' | 'fhir';
  };
}
```

## ShareToken (Separate Table for RLS)

```typescript
interface ShareToken {
  token: string; // Primary key - libsignal token
  shareId: string; // Reference to HealthcareShare
  expiresAt: Date; // UTC ISO

  // RLS policy: Allow access if token matches AND not expired
}
```

## DeviceKey (Secure Key Management)

```typescript
interface DeviceKey {
  id: string;
  userId: string; // RLS: auth.uid()

  deviceIdHash: string; // SHA-256 hash of device ID
  encryptedMasterKey: string; // Encrypted with recovery phrase
  keyDerivationPath: string; // HD wallet-style derivation

  // Rotation and revocation
  keyVersion: number;
  nextRotationAt: Date; // UTC ISO
  status: 'active' | 'revoked' | 'suspended';

  // Minimal device metadata
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  lastActiveAt: Date; // UTC ISO

  createdAt: Date; // UTC ISO
}
```

## CryptoEnvelope (Standardized)

```typescript
interface CryptoEnvelope {
  version: number; // Schema version
  algorithm: string; // e.g., "XChaCha20Poly1305"
  kdfParams: {
    algorithm: string; // e.g., "Argon2id"
    memory: number; // KB
    iterations: number;
    parallelism: number;
  };
  salt: string; // Base64 encoded
  nonce: string; // Base64 encoded
  keyId: string; // Key rotation identifier

  // Additional Authenticated Data for integrity
  aad: {
    userId: string;
    recordId: string;
    tableName: string;
    version: number;
    timestamp: string; // ISO string
  };
}
```
