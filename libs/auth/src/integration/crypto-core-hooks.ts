/**
 * Crypto Core Integration Hooks
 *
 * Integration interfaces for authentication system with crypto core (Story 1.2):
 * - Authentication-derived key management
 * - User identity for crypto key derivation
 * - Session-based encryption contexts
 * - Hardware-backed key storage integration
 * - Cross-device key synchronization
 * - Recovery and key rotation workflows
 */

import type {
  AuthenticationContext,
  KeyDerivationContext,
  DeviceKeyManagementInfo,
  HardwareBackingInfo,
  SessionSecurityContext,
  DeviceKeyInfo,
  AuthenticationMethod,
  RiskLevel,
} from './types.js';

// Core Crypto Integration Interfaces
export interface CryptoCoreAuthIntegration {
  // User identity and key derivation
  deriveUserMasterKey(authContext: AuthenticationContext): Promise<UserMasterKey>;
  deriveSessionKey(
    sessionContext: SessionSecurityContext,
    purpose: KeyPurpose
  ): Promise<SessionKey>;
  deriveDeviceKey(
    deviceContext: DeviceKeyManagementInfo,
    keyType: DeviceKeyType
  ): Promise<DeviceKey>;

  // Authentication-based key management
  createAuthenticationKeyPair(authContext: AuthenticationContext): Promise<AuthenticationKeyPair>;
  rotateUserKeys(userId: string, reason: KeyRotationReason): Promise<KeyRotationResult>;

  // Hardware security integration
  validateHardwareBacking(hardwareInfo: HardwareBackingInfo): Promise<HardwareValidationResult>;
  storeKeyInHardware(
    key: CryptoKey,
    storageInfo: HardwareStorageInfo
  ): Promise<HardwareKeyReference>;
  retrieveKeyFromHardware(keyReference: HardwareKeyReference): Promise<CryptoKey>;

  // Cross-device key synchronization
  synchronizeKeysAcrossDevices(userId: string, deviceIds: string[]): Promise<KeySyncResult>;
  transferKeysToNewDevice(
    fromDeviceId: string,
    toDeviceId: string,
    keyTypes: KeyType[]
  ): Promise<KeyTransferResult>;

  // Recovery workflows
  initializeRecoveryKeys(
    authContext: AuthenticationContext,
    recoveryPhrase: string
  ): Promise<RecoveryKeySet>;
  recoverKeysFromPhrase(
    recoveryPhrase: string,
    newDeviceContext: DeviceKeyManagementInfo
  ): Promise<KeyRecoveryResult>;

  // Key lifecycle management
  validateKeyIntegrity(keyId: string): Promise<KeyIntegrityResult>;
  auditKeyUsage(keyId: string, timeRange: TimeRange): Promise<KeyUsageAudit>;
  purgeExpiredKeys(userId: string): Promise<KeyPurgeResult>;
}

export interface AuthenticationKeyDerivation {
  // User-specific key derivation
  deriveUserRootKey(
    userId: string,
    authMethod: AuthenticationMethod,
    deviceSalt: string
  ): Promise<UserRootKey>;

  // Authentication-context key derivation
  deriveAuthContextKey(rootKey: UserRootKey, contextInfo: AuthContextInfo): Promise<ContextKey>;

  // Session-bound key derivation
  deriveSessionBoundKey(
    parentKey: CryptoKey,
    sessionId: string,
    keyPurpose: KeyPurpose
  ): Promise<SessionBoundKey>;

  // Device-specific key derivation
  deriveDeviceSpecificKey(
    userKey: UserRootKey,
    deviceInfo: DeviceKeyManagementInfo,
    keyType: DeviceKeyType
  ): Promise<DeviceSpecificKey>;

  // Hierarchical key derivation
  deriveChildKey(
    parentKey: CryptoKey,
    derivationPath: KeyDerivationPath,
    purpose: KeyPurpose
  ): Promise<ChildKey>;
}

export interface HardwareSecurityIntegration {
  // Hardware capability assessment
  assessHardwareCapabilities(deviceInfo: DeviceKeyManagementInfo): Promise<HardwareCapabilities>;

  // Secure enclave operations
  createSecureEnclaveKey(keySpec: SecureEnclaveKeySpec): Promise<SecureEnclaveKey>;
  signWithSecureEnclave(keyRef: SecureEnclaveKeyRef, data: ArrayBuffer): Promise<ArrayBuffer>;

  // TPM operations
  createTPMKey(keySpec: TPMKeySpec): Promise<TPMKey>;
  sealDataToTPM(data: ArrayBuffer, policy: TPMSealingPolicy): Promise<TPMSealedData>;
  unsealDataFromTPM(sealedData: TPMSealedData): Promise<ArrayBuffer>;

  // Android StrongBox operations
  createStrongBoxKey(keySpec: StrongBoxKeySpec): Promise<StrongBoxKey>;
  attestStrongBoxKey(keyRef: StrongBoxKeyRef): Promise<StrongBoxAttestation>;

  // Hardware attestation
  generateHardwareAttestation(keyRef: HardwareKeyReference): Promise<HardwareAttestation>;
  validateHardwareAttestation(
    attestation: HardwareAttestation
  ): Promise<AttestationValidationResult>;

  // Biometric-protected keys
  createBiometricProtectedKey(
    keySpec: BiometricKeySpec,
    biometricInfo: BiometricProtectionInfo
  ): Promise<BiometricProtectedKey>;

  unlockBiometricProtectedKey(
    keyRef: BiometricKeyRef,
    biometricChallenge: BiometricChallenge
  ): Promise<UnlockedKey>;
}

export interface SessionCryptoManager {
  // Session-based encryption
  createSessionEncryptionContext(
    sessionContext: SessionSecurityContext
  ): Promise<SessionEncryptionContext>;
  encryptSessionData(
    data: ArrayBuffer,
    context: SessionEncryptionContext
  ): Promise<EncryptedSessionData>;
  decryptSessionData(
    encryptedData: EncryptedSessionData,
    context: SessionEncryptionContext
  ): Promise<ArrayBuffer>;

  // Session key management
  rotateSessionKeys(
    sessionId: string,
    reason: SessionKeyRotationReason
  ): Promise<SessionKeyRotationResult>;
  validateSessionKeyIntegrity(sessionId: string): Promise<SessionKeyIntegrityResult>;

  // Cross-session data protection
  migrationSessionKeys(
    oldSessionId: string,
    newSessionId: string
  ): Promise<SessionKeyMigrationResult>;
  shareDataBetweenSessions(
    sourceSessionId: string,
    targetSessionId: string,
    dataId: string
  ): Promise<CrossSessionDataResult>;

  // Session-bound cryptographic operations
  signWithSessionKey(sessionId: string, data: ArrayBuffer): Promise<ArrayBuffer>;
  verifySessionSignature(
    sessionId: string,
    data: ArrayBuffer,
    signature: ArrayBuffer
  ): Promise<boolean>;

  // Forward secrecy
  enableForwardSecrecy(sessionId: string): Promise<ForwardSecrecyContext>;
  advanceForwardSecrecy(sessionId: string): Promise<ForwardSecrecyAdvancementResult>;
}

export interface DeviceCryptoManager {
  // Device key lifecycle
  initializeDeviceKeys(deviceInfo: DeviceKeyManagementInfo): Promise<DeviceKeyInitializationResult>;
  synchronizeDeviceKeys(deviceId: string, masterDeviceId: string): Promise<DeviceKeySyncResult>;

  // Device-specific encryption
  encryptForDevice(data: ArrayBuffer, deviceId: string): Promise<DeviceEncryptedData>;
  decryptFromDevice(encryptedData: DeviceEncryptedData, deviceId: string): Promise<ArrayBuffer>;

  // Cross-device operations
  establishSecureChannel(fromDeviceId: string, toDeviceId: string): Promise<SecureDeviceChannel>;
  transferSecureData(
    channel: SecureDeviceChannel,
    data: ArrayBuffer
  ): Promise<SecureDataTransferResult>;

  // Device trust management
  establishDeviceTrust(
    deviceId: string,
    trustMethod: DeviceTrustMethod
  ): Promise<DeviceTrustResult>;
  validateDeviceTrust(deviceId: string): Promise<DeviceTrustValidationResult>;
  revokeDeviceTrust(
    deviceId: string,
    reason: TrustRevocationReason
  ): Promise<TrustRevocationResult>;

  // Device key attestation
  generateDeviceKeyAttestation(deviceId: string, keyId: string): Promise<DeviceKeyAttestation>;
  validateDeviceKeyAttestation(
    attestation: DeviceKeyAttestation
  ): Promise<AttestationValidationResult>;
}

// Core Data Types
export interface UserMasterKey {
  keyId: string;
  userId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;

  // Key derivation context
  derivationContext: KeyDerivationContext;
  hardwareDerived: boolean;

  // Key lifecycle
  createdAt: Date;
  expiresAt?: Date;
  rotationSchedule?: KeyRotationSchedule;

  // Security properties
  strength: KeyStrength;
  protectionLevel: KeyProtectionLevel;

  // Usage constraints
  allowedPurposes: KeyPurpose[];
  deviceRestrictions?: string[];
  locationRestrictions?: string[];
}

export interface SessionKey {
  keyId: string;
  sessionId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;

  // Session binding
  sessionBound: true;
  sessionContext: SessionSecurityContext;

  // Key properties
  purpose: KeyPurpose;
  strength: KeyStrength;
  ephemeral: boolean;

  // Lifecycle
  createdAt: Date;
  expiresAt: Date;
  autoRotate: boolean;

  // Forward secrecy
  forwardSecure: boolean;
  advancementCounter?: number;
}

export interface DeviceKey {
  keyId: string;
  deviceId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;

  // Device binding
  deviceBound: true;
  hardwareBacked: boolean;

  // Key type and purpose
  keyType: DeviceKeyType;
  purposes: KeyPurpose[];

  // Hardware integration
  hardwareKeyRef?: HardwareKeyReference;
  biometricProtected: boolean;

  // Trust and verification
  attestation?: DeviceKeyAttestation;
  trustLevel: number;

  // Lifecycle
  createdAt: Date;
  lastUsedAt?: Date;
  rotationRequired: boolean;
}

export interface AuthenticationKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;

  // Key pair properties
  algorithm: AsymmetricCryptoAlgorithm;
  keySize: number;
  purposes: KeyPurpose[];

  // Authentication context
  authMethod: AuthenticationMethod;
  userId: string;
  deviceId: string;

  // Hardware integration
  hardwareBacked: boolean;
  hardwareKeyRef?: HardwareKeyReference;

  // Lifecycle and rotation
  createdAt: Date;
  expiresAt?: Date;
  rotationSchedule?: KeyRotationSchedule;
}

export interface RecoveryKeySet {
  masterRecoveryKey: RecoveryKey;
  deviceRecoveryKeys: DeviceRecoveryKey[];
  recoveryMetadata: RecoveryMetadata;

  // Recovery method info
  recoveryPhrase: string;
  shamirShares?: string[];
  emergencyKeys?: EmergencyKey[];

  // Security properties
  encrypted: boolean;
  hardwareBacked: boolean;

  // Lifecycle
  createdAt: Date;
  validUntil?: Date;
  usageCount: number;
  maxUsage: number;
}

// Hardware Security Types
export interface HardwareCapabilities {
  // Available hardware security
  secureEnclave: boolean;
  tpm: boolean;
  strongBox: boolean;
  hsm: boolean;

  // Supported algorithms
  supportedAlgorithms: CryptoAlgorithm[];
  supportedKeySizes: number[];

  // Key storage capabilities
  keyStorageCapacity: number;
  keyTypes: HardwareKeyType[];

  // Attestation support
  attestationSupported: boolean;
  attestationFormats: AttestationFormat[];

  // Biometric integration
  biometricKeyProtection: boolean;
  supportedBiometrics: BiometricType[];

  // Performance characteristics
  performanceMetrics: HardwarePerformanceMetrics;
}

export interface SecureEnclaveKey {
  keyRef: SecureEnclaveKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;
  purposes: KeyPurpose[];

  // Secure Enclave specific
  accessControl: SecureEnclaveAccessControl;
  userPresenceRequired: boolean;
  biometricRequired: boolean;

  // Key properties
  createdAt: Date;
  usageCount: number;
  maxUsage?: number;
}

export interface TPMKey {
  keyRef: TPMKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;

  // TPM-specific properties
  tpmHandle: number;
  keyUsagePolicy: TPMKeyUsagePolicy;
  sealingPolicy?: TPMSealingPolicy;

  // PCR bindings
  pcrBindings?: TPMPCRBinding[];

  // Key lifecycle
  createdAt: Date;
  persistent: boolean;
}

export interface StrongBoxKey {
  keyRef: StrongBoxKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;

  // StrongBox-specific
  strongBoxLevel: StrongBoxSecurityLevel;
  rollbackResistant: boolean;

  // Attestation
  attestation: StrongBoxAttestation;
  attestationVerified: boolean;

  // Usage constraints
  maxUsageCount?: number;
  usageCounterProtected: boolean;
}

export interface BiometricProtectedKey {
  keyRef: BiometricKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;

  // Biometric protection
  requiredBiometrics: BiometricType[];
  fallbackAuth: BiometricFallback;

  // Security properties
  templateProtected: boolean;
  livenesRequired: boolean;
  spoofingResistant: boolean;

  // Usage tracking
  unlockCount: number;
  lastUnlocked?: Date;
  consecutiveFailures: number;
}

// Session Crypto Types
export interface SessionEncryptionContext {
  sessionId: string;
  encryptionKey: CryptoKey;
  integrityKey: CryptoKey;

  // Encryption parameters
  algorithm: SymmetricCryptoAlgorithm;
  mode: CryptoMode;
  keyDerivationFunction: KDFAlgorithm;

  // Session binding
  sessionBound: true;
  contextSalt: ArrayBuffer;

  // Security properties
  forwardSecure: boolean;
  ephemeral: boolean;

  // Lifecycle
  createdAt: Date;
  expiresAt: Date;
  autoRotate: boolean;
}

export interface EncryptedSessionData {
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  tag: ArrayBuffer;

  // Encryption metadata
  algorithm: SymmetricCryptoAlgorithm;
  keyId: string;
  sessionId: string;

  // Integrity protection
  integrityProtected: boolean;
  mac?: ArrayBuffer;

  // Additional authenticated data
  aad?: ArrayBuffer;

  // Timestamps
  encryptedAt: Date;
  expiresAt?: Date;
}

export interface ForwardSecrecyContext {
  sessionId: string;
  currentEpoch: number;

  // Key chain
  rootKey: CryptoKey;
  chainKeys: ChainKey[];
  messageKeys: MessageKey[];

  // Forward secrecy properties
  deletionSchedule: KeyDeletionSchedule;
  advancementTriggers: AdvancementTrigger[];

  // Performance optimization
  keyCache: KeyCache;
  precomputedKeys: number;
}

// Device and Cross-Device Types
export interface SecureDeviceChannel {
  channelId: string;
  fromDeviceId: string;
  toDeviceId: string;

  // Channel security
  encryptionKey: CryptoKey;
  integrityKey: CryptoKey;
  sharedSecret: ArrayBuffer;

  // Channel properties
  algorithm: CryptoAlgorithm;
  authenticated: boolean;
  forwardSecure: boolean;

  // Channel lifecycle
  establishedAt: Date;
  expiresAt: Date;
  lastUsed: Date;

  // Trust context
  trustLevel: number;
  trustVerified: boolean;
  mutualAuthentication: boolean;
}

export interface DeviceTrustResult {
  trusted: boolean;
  trustLevel: number;
  trustMethod: DeviceTrustMethod;

  // Trust evidence
  attestation?: HardwareAttestation;
  trustChain: TrustChainElement[];
  verificationResults: TrustVerificationResult[];

  // Trust lifecycle
  establishedAt: Date;
  validUntil?: Date;
  requiresRenewal: boolean;

  // Risk assessment
  riskLevel: RiskLevel;
  riskFactors: string[];
}

// Key Management Results
export interface KeyRotationResult {
  success: boolean;
  newKeyId: string;
  oldKeyId: string;

  // Rotation details
  rotationReason: KeyRotationReason;
  rotatedAt: Date;

  // Key transition
  transitionPeriod: number; // milliseconds
  oldKeyExpiry: Date;

  // Impact assessment
  affectedSessions: string[];
  affectedDevices: string[];
  reEncryptionRequired: boolean;

  // Verification
  integrityVerified: boolean;
  backupCreated: boolean;
}

export interface KeySyncResult {
  synchronized: boolean;
  syncedDevices: string[];
  failedDevices: DeviceSyncFailure[];

  // Sync details
  syncedKeys: string[];
  conflictResolutions: KeyConflictResolution[];

  // Integrity verification
  integrityVerified: boolean;
  syncHash: string;

  // Performance metrics
  syncDuration: number;
  dataTransferred: number;
}

export interface KeyRecoveryResult {
  recovered: boolean;
  recoveredKeys: string[];
  failedKeys: string[];

  // Recovery details
  recoveryMethod: RecoveryMethod;
  newDeviceId: string;

  // Key restoration
  masterKeyRestored: boolean;
  deviceKeysGenerated: boolean;
  sessionKeysCreated: boolean;

  // Security validation
  integrityVerified: boolean;
  trustReestablished: boolean;

  // Next steps
  additionalSetupRequired: boolean;
  recommendedActions: string[];
}

// Enums and Constants
export type KeyPurpose =
  | 'encryption'
  | 'decryption'
  | 'signing'
  | 'verification'
  | 'key_derivation'
  | 'key_agreement'
  | 'authentication'
  | 'data_integrity'
  | 'forward_secrecy';

export type DeviceKeyType =
  | 'device_identity'
  | 'data_encryption'
  | 'transport_encryption'
  | 'signing'
  | 'authentication'
  | 'key_derivation'
  | 'biometric_unlock'
  | 'recovery_assistance';

export type KeyType =
  | 'symmetric'
  | 'asymmetric_public'
  | 'asymmetric_private'
  | 'key_derivation'
  | 'master'
  | 'session'
  | 'device'
  | 'recovery';

export type KeyRotationReason =
  | 'scheduled'
  | 'compromise_suspected'
  | 'device_lost'
  | 'policy_change'
  | 'manual_request'
  | 'emergency'
  | 'compliance_requirement';

export type KeyStrength = 'weak' | 'medium' | 'strong' | 'very_strong';

export type KeyProtectionLevel =
  | 'software'
  | 'hardware_backed'
  | 'secure_enclave'
  | 'hsm'
  | 'quantum_resistant';

export type CryptoAlgorithm =
  | 'AES-256-GCM'
  | 'ChaCha20-Poly1305'
  | 'RSA-4096'
  | 'ECDSA-P256'
  | 'ECDSA-P384'
  | 'EdDSA-Ed25519'
  | 'X25519'
  | 'HKDF-SHA256'
  | 'Argon2id'
  | 'scrypt';

export type AsymmetricCryptoAlgorithm =
  | 'RSA-2048'
  | 'RSA-4096'
  | 'ECDSA-P256'
  | 'ECDSA-P384'
  | 'EdDSA-Ed25519'
  | 'ECDH-P256'
  | 'ECDH-P384'
  | 'X25519';

export type SymmetricCryptoAlgorithm =
  | 'AES-128-GCM'
  | 'AES-256-GCM'
  | 'ChaCha20-Poly1305'
  | 'XChaCha20-Poly1305';

export type CryptoMode = 'GCM' | 'CBC' | 'CTR' | 'EAX' | 'OCB' | 'Poly1305';

export type KDFAlgorithm = 'HKDF-SHA256' | 'PBKDF2-SHA256' | 'scrypt' | 'Argon2id';

export type SessionKeyRotationReason =
  | 'scheduled'
  | 'security_event'
  | 'session_handoff'
  | 'policy_violation'
  | 'manual_rotation';

export type DeviceTrustMethod =
  | 'hardware_attestation'
  | 'certificate_chain'
  | 'biometric_verification'
  | 'shared_secret'
  | 'mutual_authentication'
  | 'zero_knowledge_proof';

export type TrustRevocationReason =
  | 'device_compromise'
  | 'policy_violation'
  | 'user_request'
  | 'expired_certificate'
  | 'failed_attestation'
  | 'suspicious_activity';

export type RecoveryMethod =
  | 'recovery_phrase'
  | 'shamir_secret_sharing'
  | 'emergency_code'
  | 'trusted_device'
  | 'backup_keys'
  | 'external_recovery_service';

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'voice' | 'palm' | 'behavioral';

export type BiometricFallback =
  | 'device_passcode'
  | 'recovery_phrase'
  | 'alternative_biometric'
  | 'hardware_key';

export type HardwareKeyType = 'RSA' | 'ECDSA' | 'ECDH' | 'EdDSA' | 'AES' | 'ChaCha20' | 'HMAC';

export type AttestationFormat =
  | 'packed'
  | 'tpm'
  | 'android-key'
  | 'android-safetynet'
  | 'fido-u2f'
  | 'apple-anonymous'
  | 'apple-appattest';

export type StrongBoxSecurityLevel = 'software' | 'trusted_environment' | 'strongbox';

// Supporting Interfaces
export interface AuthContextInfo {
  authMethod: AuthenticationMethod;
  timestamp: Date;
  deviceId: string;
  sessionId: string;
  riskLevel: RiskLevel;
}

export interface KeyDerivationPath {
  segments: KeyDerivationSegment[];
  hardenedPath: boolean;
}

export interface KeyDerivationSegment {
  index: number;
  hardened: boolean;
  purpose?: string;
}

export interface UserRootKey {
  keyId: string;
  userId: string;
  keyMaterial: ArrayBuffer;

  // Derivation context
  salt: ArrayBuffer;
  iterations: number;
  algorithm: KDFAlgorithm;

  // Security properties
  hardwareDerived: boolean;
  strength: KeyStrength;
}

export interface ContextKey {
  keyId: string;
  parentKeyId: string;
  keyMaterial: ArrayBuffer;

  // Context binding
  contextInfo: AuthContextInfo;
  contextHash: ArrayBuffer;

  // Lifecycle
  createdAt: Date;
  expiresAt?: Date;
  usageCount: number;
}

export interface SessionBoundKey {
  keyId: string;
  sessionId: string;
  keyMaterial: ArrayBuffer;

  // Session binding
  sessionBound: true;
  purpose: KeyPurpose;

  // Lifecycle
  createdAt: Date;
  expiresAt: Date;
  ephemeral: boolean;
}

export interface DeviceSpecificKey {
  keyId: string;
  deviceId: string;
  keyMaterial: ArrayBuffer;

  // Device binding
  deviceBound: true;
  deviceFingerprint: string;

  // Key properties
  keyType: DeviceKeyType;
  hardwareBacked: boolean;
}

export interface ChildKey {
  keyId: string;
  parentKeyId: string;
  keyMaterial: ArrayBuffer;

  // Derivation context
  derivationPath: KeyDerivationPath;
  purpose: KeyPurpose;

  // Hierarchy properties
  depth: number;
  canDerive: boolean;
}

// Additional supporting types
export interface TimeRange {
  start: Date;
  end: Date;
}

export interface KeyRotationSchedule {
  frequency: number; // days
  nextRotation: Date;
  autoRotate: boolean;
  notificationThreshold: number; // days before rotation
}

export interface RecoveryKey {
  keyId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;

  // Recovery properties
  recoveryPhrase: string;
  shamirThreshold?: number;
  shamirShares?: string[];

  // Usage constraints
  maxUsage: number;
  usageCount: number;
  validUntil?: Date;
}

export interface DeviceRecoveryKey {
  deviceId: string;
  recoveryKey: RecoveryKey;
  deviceSpecificData: ArrayBuffer;
}

export interface RecoveryMetadata {
  createdAt: Date;
  userId: string;
  recoveryMethod: RecoveryMethod;

  // Security context
  createdFromDevice: string;
  hardwareBacked: boolean;
  biometricProtected: boolean;

  // Usage tracking
  lastUsed?: Date;
  usageHistory: RecoveryUsageRecord[];
}

export interface EmergencyKey {
  keyId: string;
  emergencyCode: string;
  keyMaterial: ArrayBuffer;

  // Emergency properties
  expiresAt: Date;
  singleUse: boolean;
  limitedAccess: boolean;

  // Security constraints
  requiresVerification: boolean;
  accessLevel: 'read_only' | 'limited' | 'full';
}

export interface HardwareValidationResult {
  valid: boolean;
  capabilities: HardwareCapabilities;
  attestation?: HardwareAttestation;

  // Validation details
  trustLevel: number;
  verificationMethod: string;
  validationTime: Date;

  // Issues and warnings
  warnings: string[];
  recommendations: string[];
}

export interface HardwareStorageInfo {
  storageType: 'secure_enclave' | 'tpm' | 'strongbox' | 'hsm';
  accessPolicy: HardwareAccessPolicy;
  protectionLevel: KeyProtectionLevel;

  // Storage constraints
  persistent: boolean;
  exportable: boolean;
  backupAllowed: boolean;

  // Authentication requirements
  userPresenceRequired: boolean;
  biometricRequired: boolean;
  passcodeRequired: boolean;
}

export interface HardwareKeyReference {
  keyId: string;
  storageType: 'secure_enclave' | 'tpm' | 'strongbox' | 'hsm';
  hardwareRef: string;

  // Access context
  accessPolicy: HardwareAccessPolicy;
  requiresAuth: boolean;

  // Key properties
  algorithm: CryptoAlgorithm;
  purposes: KeyPurpose[];

  // Hardware-specific references
  secureEnclaveRef?: SecureEnclaveKeyRef;
  tpmRef?: TPMKeyRef;
  strongBoxRef?: StrongBoxKeyRef;
}

export interface KeyTransferResult {
  success: boolean;
  transferredKeys: string[];
  failedKeys: KeyTransferFailure[];

  // Transfer details
  fromDeviceId: string;
  toDeviceId: string;
  transferMethod: KeyTransferMethod;

  // Security verification
  integrityVerified: boolean;
  trustMaintained: boolean;

  // Performance metrics
  transferTime: number;
  keyCount: number;
}

export interface KeyIntegrityResult {
  intact: boolean;
  keyId: string;

  // Integrity details
  hashMatch: boolean;
  signatureValid: boolean;
  timestampValid: boolean;

  // Detected issues
  tampering: boolean;
  corruption: boolean;
  unauthorized: boolean;

  // Remediation
  recoverable: boolean;
  recommendedAction: string;
}

export interface KeyUsageAudit {
  keyId: string;
  auditPeriod: TimeRange;

  // Usage statistics
  totalUsage: number;
  uniqueSessions: number;
  operationTypes: Record<string, number>;

  // Access patterns
  accessTimes: Date[];
  accessDevices: string[];
  accessLocations: string[];

  // Security analysis
  suspiciousAccess: SuspiciousAccessEvent[];
  policyViolations: PolicyViolation[];
  riskAssessment: KeyRiskAssessment;
}

export interface KeyPurgeResult {
  purged: boolean;
  purgedKeys: string[];
  preservedKeys: string[];

  // Purge details
  purgeReason: string;
  purgedAt: Date;

  // Impact analysis
  affectedSessions: string[];
  affectedDevices: string[];
  recoveryRequired: boolean;
}

// Additional complex supporting types
export interface HardwarePerformanceMetrics {
  keyGenerationTime: number; // milliseconds
  signatureTime: number; // milliseconds
  verificationTime: number; // milliseconds
  encryptionThroughput: number; // MB/s
  decryptionThroughput: number; // MB/s
}

export interface SecureEnclaveKeyRef {
  applicationTag: string;
  accessGroup?: string;
  keyClass: string;
}

export interface SecureEnclaveAccessControl {
  accessibility: string;
  authenticationRequired: boolean;
  biometryRequired: boolean;
  userPresenceRequired: boolean;
}

export interface TPMKeyRef {
  handle: number;
  keyAuth?: ArrayBuffer;
  parentHandle?: number;
}

export interface TPMKeyUsagePolicy {
  authPolicy?: ArrayBuffer;
  pcrPolicy?: TPMPCRPolicy;
  timePolicy?: TPMTimePolicy;
  localityPolicy?: TPMLocalityPolicy;
}

export interface TPMSealingPolicy {
  pcrSelection: TPMPCRSelection;
  authPolicy?: ArrayBuffer;
  keyAuth?: ArrayBuffer;
}

export interface TPMPCRBinding {
  pcrIndex: number;
  expectedValue: ArrayBuffer;
}

export interface TPMSealedData {
  encryptedData: ArrayBuffer;
  keyBlob: ArrayBuffer;
  policy: TPMSealingPolicy;
  creationData: ArrayBuffer;
}

export interface StrongBoxKeyRef {
  alias: string;
  uid?: number;
}

export interface StrongBoxAttestation {
  attestationChain: ArrayBuffer[];
  attestationChallenge: ArrayBuffer;
  keyDescription: StrongBoxKeyDescription;
  verificationStatus: AttestationVerificationStatus;
}

export interface BiometricKeyRef {
  identifier: string;
  biometricType: BiometricType;
}

export interface BiometricProtectionInfo {
  requiredBiometrics: BiometricType[];
  fallbackMethods: BiometricFallback[];
  livenesRequired: boolean;
  spoofingResistance: 'low' | 'medium' | 'high';
}

export interface BiometricChallenge {
  challengeId: string;
  biometricType: BiometricType;
  challengeData?: ArrayBuffer;
  timeout: number;
}

export interface UnlockedKey {
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;

  // Unlock context
  unlockedAt: Date;
  unlockMethod: string;
  validFor: number; // milliseconds

  // Usage constraints
  singleUse: boolean;
  operationLimit?: number;
}

export interface HardwareAttestation {
  format: AttestationFormat;
  attStmt: Record<string, any>;
  authData: ArrayBuffer;

  // Attestation validation
  verified: boolean;
  trustChain: ArrayBuffer[];
  rootTrusted: boolean;

  // Hardware properties
  hardwareModel: string;
  firmwareVersion: string;
  securityLevel: string;
}

export interface AttestationValidationResult {
  valid: boolean;
  trustLevel: number;

  // Validation details
  signatureValid: boolean;
  chainValid: boolean;
  rootTrusted: boolean;
  revocationChecked: boolean;

  // Hardware verification
  hardwareVerified: boolean;
  firmwareVerified: boolean;
  securityLevelVerified: boolean;

  // Issues
  warnings: string[];
  errors: string[];
}

// Additional supporting types for comprehensive integration
export interface DeviceSyncFailure {
  deviceId: string;
  error: string;
  retryable: boolean;
  lastAttempt: Date;
}

export interface KeyConflictResolution {
  keyId: string;
  conflictType: 'version' | 'algorithm' | 'permissions';
  resolution: 'newer_wins' | 'manual_merge' | 'user_choice';
  resolvedAt: Date;
}

export interface ChainKey {
  keyMaterial: ArrayBuffer;
  generation: number;
  createdAt: Date;
  nextKey?: ChainKey;
}

export interface MessageKey {
  keyMaterial: ArrayBuffer;
  messageIndex: number;
  createdAt: Date;
  usedAt?: Date;
}

export interface KeyDeletionSchedule {
  deleteAfterUse: boolean;
  deleteAfterTime: number; // milliseconds
  maxRetentionTime: number; // milliseconds
}

export interface AdvancementTrigger {
  triggerType: 'time' | 'usage' | 'event';
  threshold: number;
  lastTriggered?: Date;
}

export interface KeyCache {
  maxSize: number;
  currentSize: number;
  hitRate: number;
  evictionPolicy: 'lru' | 'fifo' | 'random';
}

export interface TrustChainElement {
  element: 'root_ca' | 'intermediate_ca' | 'device_cert' | 'attestation';
  certificate: ArrayBuffer;
  verified: boolean;
  trustLevel: number;
}

export interface TrustVerificationResult {
  verificationType: string;
  result: boolean;
  confidence: number;
  evidence: string[];
}

export interface KeyTransferFailure {
  keyId: string;
  error: string;
  retryable: boolean;
}

export type KeyTransferMethod =
  | 'secure_channel'
  | 'qr_code'
  | 'nfc'
  | 'bluetooth'
  | 'recovery_phrase'
  | 'cloud_backup';

export interface SuspiciousAccessEvent {
  timestamp: Date;
  suspicionType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  riskScore: number;
}

export interface PolicyViolation {
  policyId: string;
  violationType: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  remediation: string;
}

export interface KeyRiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: string[];
  mitigations: string[];
  recommendedActions: string[];
  nextAssessment: Date;
}

export interface RecoveryUsageRecord {
  usedAt: Date;
  deviceId: string;
  purpose: string;
  successful: boolean;
}

export interface HardwareAccessPolicy {
  userPresenceRequired: boolean;
  biometricRequired: boolean;
  passcodeRequired: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number; // seconds
}

// Additional TPM-specific types
export interface TPMPCRPolicy {
  pcrIndices: number[];
  expectedValues: ArrayBuffer[];
  operator: 'AND' | 'OR';
}

export interface TPMTimePolicy {
  validFrom?: Date;
  validUntil?: Date;
  timeWindow?: number; // seconds
}

export interface TPMLocalityPolicy {
  allowedLocalities: number[];
}

export interface TPMPCRSelection {
  pcrIndices: number[];
  hashAlgorithm: string;
}

// StrongBox-specific types
export interface StrongBoxKeyDescription {
  keySize: number;
  algorithm: string;
  purpose: string[];
  attestationSecurityLevel: StrongBoxSecurityLevel;
  keyMintSecurityLevel: StrongBoxSecurityLevel;
}

export interface AttestationVerificationStatus {
  verified: boolean;
  securityLevel: StrongBoxSecurityLevel;
  verificationErrors: string[];
}

export interface BiometricKeySpec {
  algorithm: CryptoAlgorithm;
  keySize: number;
  purposes: KeyPurpose[];
  biometricTypes: BiometricType[];
  userAuthenticationRequired: boolean;
  userAuthenticationValidityDuration: number; // seconds
  invalidatedByBiometricEnrollment: boolean;
}

export interface SecureEnclaveKeySpec {
  algorithm: CryptoAlgorithm;
  keySize: number;
  purposes: KeyPurpose[];
  accessControl: SecureEnclaveAccessControl;
  applicationTag: string;
  permanent: boolean;
}

export interface TPMKeySpec {
  algorithm: CryptoAlgorithm;
  keySize: number;
  usagePolicy: TPMKeyUsagePolicy;
  parentHandle?: number;
  keyAuth?: ArrayBuffer;
  sensitive: boolean;
}

export interface StrongBoxKeySpec {
  algorithm: CryptoAlgorithm;
  keySize: number;
  purposes: KeyPurpose[];
  attestationChallenge: ArrayBuffer;
  userAuthenticationRequired: boolean;
  userAuthenticationValidityDuration: number; // seconds
}
