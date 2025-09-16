/**
 * Backup Key Management Types
 * Isolated backup encryption completely separate from primary device keys
 */

export interface BackupKeyConfig {
  keyId: string;
  version: number;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'rotating' | 'revoked' | 'emergency_revoked';
  deviceId?: string; // Only for device-specific keys
}

export interface BackupRecoveryPhrase {
  phraseId: string;
  entropy: Uint8Array; // 256-bit entropy for recovery phrase
  wordCount: 12 | 24; // BIP39 word count
  checksum: string;
  createdAt: Date;
  usedForRecovery: boolean;
}

export interface BackupKeyDerivation {
  masterSeed: Uint8Array;
  derivationPath: string; // m/44'/0'/0'/backup'/index'
  salt: Uint8Array;
  iterations: number;
  algorithm: 'PBKDF2-SHA512' | 'Argon2id';
}

export interface EncryptedBackupData {
  backupId: string;
  keyId: string;
  encryptedData: Uint8Array;
  nonce: Uint8Array;
  aad: Uint8Array; // Additional authenticated data
  tag: Uint8Array; // Authentication tag
  timestamp: Date;
  deviceOrigin: string;
  dataChecksum: string;
}

export interface BackupRestoreContext {
  backupId: string;
  targetDeviceId: string;
  recoveryKeyId: string;
  restoreTimestamp: Date;
  dataIntegrityVerified: boolean;
  conflictResolutionStrategy: 'merge' | 'replace' | 'user_choice';
}

export interface BackupKeyRotationEvent {
  eventId: string;
  oldKeyId: string;
  newKeyId: string;
  rotationType: 'scheduled' | 'emergency' | 'security_incident';
  timestamp: Date;
  deviceIds: string[]; // Affected devices
  migrationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface BackupSecurityAudit {
  auditId: string;
  keyId: string;
  operation: 'generate' | 'derive' | 'encrypt' | 'decrypt' | 'rotate' | 'revoke';
  timestamp: Date;
  deviceId: string;
  success: boolean;
  failureReason?: string;
  securityLevel: 'high' | 'medium' | 'low';
}

// Interfaces for secure enclave integration
export interface SecureEnclaveConfig {
  keychain: {
    service: string;
    accessGroup?: string;
    accessibility: 'whenUnlockedThisDeviceOnly' | 'whenPasscodeSetThisDeviceOnly';
    authenticationPrompt: string;
  };
  androidKeystore: {
    alias: string;
    requiresAuthentication: boolean;
    userAuthenticationValidityDuration: number;
    keySize: 256;
  };
}

export interface BackupKeyIsolationPolicy {
  primaryKeyAccess: 'forbidden' | 'read_only' | 'isolated_process';
  backupKeyAccess: 'secure_enclave_only' | 'authenticated_access';
  crossContamination: 'prevented' | 'monitored' | 'audit_only';
  memoryIsolation: 'separate_process' | 'protected_memory' | 'secure_heap';
}
