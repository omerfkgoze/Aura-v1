# Components

Aura application'ı modular components ile organize edilmiş, her component'ın clear boundaries ve responsibilities var:

## Frontend Crypto Core (Rust/WASM)

**Responsibility:** Client-side encryption, key management, ve cryptographic operations

**Key Interfaces:**

- `encryptCycleData(payload, masterKey): EncryptedBlob`
- `decryptCycleData(encryptedBlob, masterKey): CycleData`
- `generateMasterKey(recoveryPhrase): MasterKey`
- `deriveDeviceKey(masterKey, deviceId, purpose): DeviceKey`
- `rotateKeys(oldKey, newSalt): NewKeyPair`

**Dependencies:** libsodium-wasm, platform secure storage APIs

**Technology Stack:** Rust compiled to WASM, WebAssembly System Interface (WASI), memory-safe crypto operations

## Privacy-Adaptive UI Controller

**Responsibility:** Cultural stealth mode management ve UI adaptation

**Key Interfaces:**

- `setCulturalPreset(preset): void`
- `activateStealthMode(level): StealthInterface`
- `handleEmergencyPrivacy(): void`
- `adaptUIForCulture(culture): UIConfig`

**Dependencies:** React Context, AsyncStorage, Biometric APIs

**Technology Stack:** React Native/React, Tamagui components, platform-specific UI adaptations

## Offline Data Synchronizer

**Responsibility:** Local SQLite ile Supabase sync, conflict resolution

**Key Interfaces:**

- `syncCycleData(): SyncResult`
- `handleConflict(localData, remoteData): ConflictResolution`
- `scheduleBackgroundSync(): void`
- `validateDataIntegrity(): ValidationResult`

**Dependencies:** SQLite (Expo), TanStack Query, Supabase client

**Technology Stack:** SQLite with encryption, React Query for caching, background tasks

## Prediction Engine (Client-Side)

**Responsibility:** Menstrual cycle predictions with uncertainty quantification

**Key Interfaces:**

- `calculatePredictions(cycleHistory): PredictionResult`
- `getConfidenceIntervals(prediction): ConfidenceIntervals`
- `calibrateModel(predictions, actuals): CalibrationMetrics`
- `explainPrediction(factors): ExplanationData`

**Dependencies:** Cycle data from local storage, statistical computation libraries

**Technology Stack:** TypeScript with statistical functions, Web Workers for heavy computation

## Healthcare Sharing Manager

**Responsibility:** Secure healthcare provider data sharing with libsignal

**Key Interfaces:**

- `createShareLink(scope, expiration): ShareToken`
- `generateEncryptedReport(data, format): EncryptedReport`
- `revokeAccess(shareId): void`
- `auditSharing(): AccessLog`

**Dependencies:** libsignal-js, crypto core, report generation utilities

**Technology Stack:** libsignal protocol, PDF/CSV generation libraries, secure token management

## Authentication & Recovery Manager

**Responsibility:** Passkeys, recovery phrases, ve multi-device authentication

**Key Interfaces:**

- `authenticateWithPasskey(): AuthResult`
- `generateRecoveryPhrase(): RecoveryPhrase`
- `restoreFromPhrase(phrase): RestoreResult`
- `manageDeviceKeys(): DeviceKeyList`

**Dependencies:** WebAuthn APIs, platform biometric APIs, secure storage

**Technology Stack:** WebAuthn/Passkeys, platform keychain integration, BIP39 mnemonic generation
