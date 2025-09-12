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
