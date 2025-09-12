// Crypto-related types for zero-knowledge encryption

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  aad: string; // Additional Authenticated Data
  version: string;
}

export interface CryptoKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface DeviceFingerprint {
  saltedHash: string;
  timestamp: number;
}

export interface EncryptionEnvelope {
  encryptedData: EncryptedData;
  keyId: string;
  algorithm: string;
}

// Device capability detection types
export type DeviceClass = 'MobileHigh' | 'MobileLow' | 'WebStandard' | 'WebLimited';

export interface DeviceCapabilities {
  deviceClass: DeviceClass;
  availableMemory: number; // bytes
  cpuCores: number;
  hasSecureEnclave: boolean;
  platform: string;
  performanceScore: number;
}

export interface Argon2Params {
  memoryKb: number;
  iterations: number;
  parallelism: number;
  saltLength: number;
  keyLength: number;
}

export interface BenchmarkResult {
  durationMs: number;
  memoryUsedMb: number;
  iterationsTested: number;
  success: boolean;
  errorMessage?: string;
}

// Device-specific key management types
export interface DeviceKeyInfo {
  deviceId: string;
  keyVersion: number;
  createdAt: Date;
  lastUsedAt: Date;
  platform: string;
  deviceClass: DeviceClass;
}

export interface KeyDerivationPath {
  purpose: number;
  category: number;
  account: number;
  change: number;
  index: number;
}

export interface MasterKeyMetadata {
  keyId: string;
  deviceId: string;
  createdAt: Date;
  version: number;
  derivationPath: KeyDerivationPath;
  algorithm: string;
}

export interface DeviceRegistrationInfo {
  deviceId: string;
  publicKey: string;
  platform: string;
  capabilities: DeviceCapabilities;
  timestamp: Date;
  signature: string;
}

export interface KeyExchangeRequest {
  requestId: string;
  requesterDeviceId: string;
  requesterPublicKey: string;
  targetDeviceId: string;
  timestamp: Date;
  signature: string;
}

export interface KeyExchangeResponse {
  requestId: string;
  approved: boolean;
  encryptedSharedSecret?: string;
  timestamp: Date;
  signature: string;
}

// Recovery and backup types
export interface RecoveryPhrase {
  words: string[];
  checksum: string;
  entropy: string; // hex encoded
  language: string;
}

export interface KeyBackupInfo {
  backupId: string;
  deviceId: string;
  encryptedMasterKey: string;
  recoveryPhraseHash: string;
  createdAt: Date;
  version: number;
}

// Key rotation types
export interface KeyRotationSchedule {
  keyId: string;
  currentVersion: number;
  nextRotationAt: Date;
  rotationInterval: number; // days
  maxVersionHistory: number;
}

export interface KeyVersionInfo {
  version: number;
  keyId: string;
  createdAt: Date;
  deprecatedAt?: Date;
  status: 'active' | 'deprecated' | 'revoked';
}

// Hierarchical key derivation types
export type DataCategory = 'cycle_data' | 'preferences' | 'healthcare_sharing' | 'device_sync';

export interface HierarchicalDerivationPath {
  pathString: string;
  purpose: number;
  coinType: number;
  account: number;
  change: number;
  addressIndex: number;
  isHardened: boolean;
}

export interface ExtendedKeyInfo {
  depth: number;
  parentFingerprint: string;
  childNumber: number;
  keyVersion: number;
  chainCode: string;
}

export interface KeyDerivationResult {
  keyBytes: Uint8Array;
  derivationPath: string;
  category: DataCategory;
  deviceId: string;
  keyVersion: number;
  extendedInfo: ExtendedKeyInfo;
}

export interface HierarchicalKeyConfig {
  masterSeed: Uint8Array;
  deviceId: string;
  keyVersion: number;
  supportedCategories: DataCategory[];
}

export interface KeyIsolationVerification {
  isIsolated: boolean;
  testedCategories: DataCategory[];
  deviceId: string;
  keyVersion: number;
  isolationMatrix: Record<string, boolean>;
}

export interface KeyRotationEvent {
  previousVersion: number;
  newVersion: number;
  rotatedAt: Date;
  deviceId: string;
  affectedCategories: DataCategory[];
}

// Multi-device key exchange types
export type DeviceStatus = 'Unknown' | 'Pending' | 'Trusted' | 'Revoked' | 'Expired';

export interface DevicePairingRequest {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  publicKey: Uint8Array;
  challengeNonce: Uint8Array;
  timestamp: number;
}

export interface DevicePairingResponse {
  deviceId: string;
  responseSignature: Uint8Array;
  sharedSecretHash: Uint8Array;
  deviceTrustToken: string;
  timestamp: number;
}

export interface DeviceRegistryEntry {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  status: DeviceStatus;
  trustToken: string;
  publicKey: Uint8Array;
  lastSync: number;
  trustScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface MultiDeviceConfig {
  currentDeviceId: string;
  trustThreshold: number;
  maxDevices: number;
  deviceTtlSeconds: number;
}

export interface DeviceAuthValidation {
  deviceId: string;
  authToken: string;
  isValid: boolean;
  trustScore: number;
  lastValidated: number;
}

export interface DeviceRegistryStats {
  total: number;
  trusted: number;
  revoked: number;
  pending: number;
  expired: number;
  maxDevices: number;
}

export interface CrossDeviceOperation {
  operationId: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  operationType: 'sync' | 'auth' | 'revoke' | 'pair';
  payload: any;
  signature: string;
  timestamp: number;
}

export interface DeviceSyncStatus {
  deviceId: string;
  lastSyncAttempt: number;
  lastSuccessfulSync: number;
  syncStatus: 'success' | 'pending' | 'failed' | 'never';
  errorMessage?: string;
  conflictCount: number;
}

export interface MultiDeviceKeyExchange {
  exchangeId: string;
  initiatingDeviceId: string;
  targetDeviceIds: string[];
  exchangeType: 'initial_pairing' | 'key_rotation' | 'device_trust_update';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
}

// Recovery and backup system types
export type WordlistLanguage = 'English' | 'Japanese' | 'Korean' | 'Spanish' | 'Chinese' | 'French';

export interface RecoveryPhrase {
  words: string[];
  entropyHex: string;
  checksum: string;
  language: WordlistLanguage;
  wordCount: number;
}

export interface KeyBackup {
  backupId: string;
  deviceId: string;
  encryptedMasterKey: Uint8Array;
  recoveryPhraseHash: Uint8Array;
  passkeyChallenge: Uint8Array;
  backupTimestamp: number;
  version: number;
  metadata: string;
}

export type RecoveryValidationLevel = 'Basic' | 'Standard' | 'Enhanced' | 'Emergency';

export interface RecoverySystemConfig {
  deviceId: string;
  validationLevel: RecoveryValidationLevel;
  maxAttempts: number;
  lockoutDurationMs: number;
}

export interface RecoveryAttempt {
  backupId: string;
  attemptCount: number;
  lastAttempt: number;
  isLocked: boolean;
  unlockTime?: number;
}

export interface RecoveryInitiation {
  recoveryToken: string;
  backupId: string;
  initiatedAt: number;
  validationLevel: RecoveryValidationLevel;
  expiresAt: number;
}

export interface EmergencyRecovery {
  delayToken: string;
  backupId: string;
  emergencyCode: string;
  unlockTime: number;
  requiredFactors: string[];
}

export interface RecoveryStats {
  totalBackups: number;
  lockedBackups: number;
  validationLevel: RecoveryValidationLevel;
  maxAttempts: number;
  deviceId: string;
}

export interface PasskeyRecoveryChallenge {
  challengeId: string;
  challenge: Uint8Array;
  deviceId: string;
  backupId: string;
  timestamp: number;
  validationLevel: RecoveryValidationLevel;
}

export interface PasskeyRecoveryResponse {
  challengeId: string;
  response: Uint8Array;
  authenticatorData: Uint8Array;
  clientDataJSON: string;
  signature: Uint8Array;
  userHandle?: Uint8Array;
}

export interface RecoveryValidation {
  isValid: boolean;
  validationLevel: RecoveryValidationLevel;
  factors: {
    recoveryPhrase: boolean;
    passkeyAuth: boolean;
    emergencyCode?: boolean;
    timeDelay?: boolean;
  };
  errorMessage?: string;
}

export interface KeyRestoration {
  restoredKeyBytes: Uint8Array;
  deviceId: string;
  backupId: string;
  restorationTimestamp: number;
  validationLevel: RecoveryValidationLevel;
  hierarchicalKeyVersion: number;
}
