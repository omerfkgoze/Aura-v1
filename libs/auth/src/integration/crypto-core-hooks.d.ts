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
  AuthenticationMethod,
  RiskLevel,
} from './types/index';
export interface CryptoCoreAuthIntegration {
  deriveUserMasterKey(authContext: AuthenticationContext): Promise<UserMasterKey>;
  deriveSessionKey(
    sessionContext: SessionSecurityContext,
    purpose: KeyPurpose
  ): Promise<SessionKey>;
  deriveDeviceKey(
    deviceContext: DeviceKeyManagementInfo,
    keyType: DeviceKeyType
  ): Promise<DeviceKey>;
  createAuthenticationKeyPair(authContext: AuthenticationContext): Promise<AuthenticationKeyPair>;
  rotateUserKeys(userId: string, reason: KeyRotationReason): Promise<KeyRotationResult>;
  validateHardwareBacking(hardwareInfo: HardwareBackingInfo): Promise<HardwareValidationResult>;
  storeKeyInHardware(
    key: CryptoKey,
    storageInfo: HardwareStorageInfo
  ): Promise<HardwareKeyReference>;
  retrieveKeyFromHardware(keyReference: HardwareKeyReference): Promise<CryptoKey>;
  synchronizeKeysAcrossDevices(userId: string, deviceIds: string[]): Promise<KeySyncResult>;
  transferKeysToNewDevice(
    fromDeviceId: string,
    toDeviceId: string,
    keyTypes: KeyType[]
  ): Promise<KeyTransferResult>;
  initializeRecoveryKeys(
    authContext: AuthenticationContext,
    recoveryPhrase: string
  ): Promise<RecoveryKeySet>;
  recoverKeysFromPhrase(
    recoveryPhrase: string,
    newDeviceContext: DeviceKeyManagementInfo
  ): Promise<KeyRecoveryResult>;
  validateKeyIntegrity(keyId: string): Promise<KeyIntegrityResult>;
  auditKeyUsage(keyId: string, timeRange: TimeRange): Promise<KeyUsageAudit>;
  purgeExpiredKeys(userId: string): Promise<KeyPurgeResult>;
}
export interface AuthenticationKeyDerivation {
  deriveUserRootKey(
    userId: string,
    authMethod: AuthenticationMethod,
    deviceSalt: string
  ): Promise<UserRootKey>;
  deriveAuthContextKey(rootKey: UserRootKey, contextInfo: AuthContextInfo): Promise<ContextKey>;
  deriveSessionBoundKey(
    parentKey: CryptoKey,
    sessionId: string,
    keyPurpose: KeyPurpose
  ): Promise<SessionBoundKey>;
  deriveDeviceSpecificKey(
    userKey: UserRootKey,
    deviceInfo: DeviceKeyManagementInfo,
    keyType: DeviceKeyType
  ): Promise<DeviceSpecificKey>;
  deriveChildKey(
    parentKey: CryptoKey,
    derivationPath: KeyDerivationPath,
    purpose: KeyPurpose
  ): Promise<ChildKey>;
}
export interface HardwareSecurityIntegration {
  assessHardwareCapabilities(deviceInfo: DeviceKeyManagementInfo): Promise<HardwareCapabilities>;
  createSecureEnclaveKey(keySpec: SecureEnclaveKeySpec): Promise<SecureEnclaveKey>;
  signWithSecureEnclave(keyRef: SecureEnclaveKeyRef, data: ArrayBuffer): Promise<ArrayBuffer>;
  createTPMKey(keySpec: TPMKeySpec): Promise<TPMKey>;
  sealDataToTPM(data: ArrayBuffer, policy: TPMSealingPolicy): Promise<TPMSealedData>;
  unsealDataFromTPM(sealedData: TPMSealedData): Promise<ArrayBuffer>;
  createStrongBoxKey(keySpec: StrongBoxKeySpec): Promise<StrongBoxKey>;
  attestStrongBoxKey(keyRef: StrongBoxKeyRef): Promise<StrongBoxAttestation>;
  generateHardwareAttestation(keyRef: HardwareKeyReference): Promise<HardwareAttestation>;
  validateHardwareAttestation(
    attestation: HardwareAttestation
  ): Promise<AttestationValidationResult>;
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
  rotateSessionKeys(sessionId: string, reason: SessionKeyRotationReason): Promise<any>;
  validateSessionKeyIntegrity(sessionId: string): Promise<any>;
  migrationSessionKeys(oldSessionId: string, newSessionId: string): Promise<any>;
  shareDataBetweenSessions(
    sourceSessionId: string,
    targetSessionId: string,
    dataId: string
  ): Promise<any>;
  signWithSessionKey(sessionId: string, data: ArrayBuffer): Promise<ArrayBuffer>;
  verifySessionSignature(
    sessionId: string,
    data: ArrayBuffer,
    signature: ArrayBuffer
  ): Promise<boolean>;
  enableForwardSecrecy(sessionId: string): Promise<ForwardSecrecyContext>;
  advanceForwardSecrecy(sessionId: string): Promise<any>;
}
export interface DeviceCryptoManager {
  initializeDeviceKeys(deviceInfo: DeviceKeyManagementInfo): Promise<any>;
  synchronizeDeviceKeys(deviceId: string, masterDeviceId: string): Promise<any>;
  encryptForDevice(data: ArrayBuffer, deviceId: string): Promise<any>;
  decryptFromDevice(encryptedData: any, deviceId: string): Promise<ArrayBuffer>;
  establishSecureChannel(fromDeviceId: string, toDeviceId: string): Promise<SecureDeviceChannel>;
  transferSecureData(channel: SecureDeviceChannel, data: ArrayBuffer): Promise<any>;
  establishDeviceTrust(
    deviceId: string,
    trustMethod: DeviceTrustMethod
  ): Promise<DeviceTrustResult>;
  validateDeviceTrust(deviceId: string): Promise<any>;
  revokeDeviceTrust(deviceId: string, reason: TrustRevocationReason): Promise<any>;
  generateDeviceKeyAttestation(deviceId: string, keyId: string): Promise<any>;
  validateDeviceKeyAttestation(attestation: any): Promise<any>;
}
export interface UserMasterKey {
  keyId: string;
  userId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;
  derivationContext: KeyDerivationContext;
  hardwareDerived: boolean;
  createdAt: Date;
  expiresAt?: Date;
  rotationSchedule?: KeyRotationSchedule;
  strength: KeyStrength;
  protectionLevel: KeyProtectionLevel;
  allowedPurposes: KeyPurpose[];
  deviceRestrictions?: string[];
  locationRestrictions?: string[];
}
export interface SessionKey {
  keyId: string;
  sessionId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;
  sessionBound: true;
  sessionContext: SessionSecurityContext;
  purpose: KeyPurpose;
  strength: KeyStrength;
  ephemeral: boolean;
  createdAt: Date;
  expiresAt: Date;
  autoRotate: boolean;
  forwardSecure: boolean;
  advancementCounter?: number;
}
export interface DeviceKey {
  keyId: string;
  deviceId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;
  deviceBound: true;
  hardwareBacked: boolean;
  keyType: DeviceKeyType;
  purposes: KeyPurpose[];
  hardwareKeyRef?: HardwareKeyReference;
  biometricProtected: boolean;
  attestation?: any;
  trustLevel: number;
  createdAt: Date;
  lastUsedAt?: Date;
  rotationRequired: boolean;
}
export interface AuthenticationKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  keyId: string;
  algorithm: AsymmetricCryptoAlgorithm;
  keySize: number;
  purposes: KeyPurpose[];
  authMethod: AuthenticationMethod;
  userId: string;
  deviceId: string;
  hardwareBacked: boolean;
  hardwareKeyRef?: HardwareKeyReference;
  createdAt: Date;
  expiresAt?: Date;
  rotationSchedule?: KeyRotationSchedule;
}
export interface RecoveryKeySet {
  masterRecoveryKey: RecoveryKey;
  deviceRecoveryKeys: DeviceRecoveryKey[];
  recoveryMetadata: RecoveryMetadata;
  recoveryPhrase: string;
  shamirShares?: string[];
  emergencyKeys?: EmergencyKey[];
  encrypted: boolean;
  hardwareBacked: boolean;
  createdAt: Date;
  validUntil?: Date;
  usageCount: number;
  maxUsage: number;
}
export interface HardwareCapabilities {
  secureEnclave: boolean;
  tpm: boolean;
  strongBox: boolean;
  hsm: boolean;
  supportedAlgorithms: CryptoAlgorithm[];
  supportedKeySizes: number[];
  keyStorageCapacity: number;
  keyTypes: HardwareKeyType[];
  attestationSupported: boolean;
  attestationFormats: AttestationFormat[];
  biometricKeyProtection: boolean;
  supportedBiometrics: BiometricType[];
  performanceMetrics: HardwarePerformanceMetrics;
}
export interface SecureEnclaveKey {
  keyRef: SecureEnclaveKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;
  purposes: KeyPurpose[];
  accessControl: SecureEnclaveAccessControl;
  userPresenceRequired: boolean;
  biometricRequired: boolean;
  createdAt: Date;
  usageCount: number;
  maxUsage?: number;
}
export interface TPMKey {
  keyRef: TPMKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;
  tpmHandle: number;
  keyUsagePolicy: TPMKeyUsagePolicy;
  sealingPolicy?: TPMSealingPolicy;
  pcrBindings?: TPMPCRBinding[];
  createdAt: Date;
  persistent: boolean;
}
export interface StrongBoxKey {
  keyRef: StrongBoxKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;
  strongBoxLevel: StrongBoxSecurityLevel;
  rollbackResistant: boolean;
  attestation: StrongBoxAttestation;
  attestationVerified: boolean;
  maxUsageCount?: number;
  usageCounterProtected: boolean;
}
export interface BiometricProtectedKey {
  keyRef: BiometricKeyRef;
  keyId: string;
  algorithm: CryptoAlgorithm;
  requiredBiometrics: BiometricType[];
  fallbackAuth: BiometricFallback;
  templateProtected: boolean;
  livenesRequired: boolean;
  spoofingResistant: boolean;
  unlockCount: number;
  lastUnlocked?: Date;
  consecutiveFailures: number;
}
export interface SessionEncryptionContext {
  sessionId: string;
  encryptionKey: CryptoKey;
  integrityKey: CryptoKey;
  algorithm: SymmetricCryptoAlgorithm;
  mode: CryptoMode;
  keyDerivationFunction: KDFAlgorithm;
  sessionBound: true;
  contextSalt: ArrayBuffer;
  forwardSecure: boolean;
  ephemeral: boolean;
  createdAt: Date;
  expiresAt: Date;
  autoRotate: boolean;
}
export interface EncryptedSessionData {
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  tag: ArrayBuffer;
  algorithm: SymmetricCryptoAlgorithm;
  keyId: string;
  sessionId: string;
  integrityProtected: boolean;
  mac?: ArrayBuffer;
  aad?: ArrayBuffer;
  encryptedAt: Date;
  expiresAt?: Date;
}
export interface ForwardSecrecyContext {
  sessionId: string;
  currentEpoch: number;
  rootKey: CryptoKey;
  chainKeys: ChainKey[];
  messageKeys: MessageKey[];
  deletionSchedule: KeyDeletionSchedule;
  advancementTriggers: AdvancementTrigger[];
  keyCache: KeyCache;
  precomputedKeys: number;
}
export interface SecureDeviceChannel {
  channelId: string;
  fromDeviceId: string;
  toDeviceId: string;
  encryptionKey: CryptoKey;
  integrityKey: CryptoKey;
  sharedSecret: ArrayBuffer;
  algorithm: CryptoAlgorithm;
  authenticated: boolean;
  forwardSecure: boolean;
  establishedAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  trustLevel: number;
  trustVerified: boolean;
  mutualAuthentication: boolean;
}
export interface DeviceTrustResult {
  trusted: boolean;
  trustLevel: number;
  trustMethod: DeviceTrustMethod;
  attestation?: HardwareAttestation;
  trustChain: TrustChainElement[];
  verificationResults: TrustVerificationResult[];
  establishedAt: Date;
  validUntil?: Date;
  requiresRenewal: boolean;
  riskLevel: RiskLevel;
  riskFactors: string[];
}
export interface KeyRotationResult {
  success: boolean;
  newKeyId: string;
  oldKeyId: string;
  rotationReason: KeyRotationReason;
  rotatedAt: Date;
  transitionPeriod: number;
  oldKeyExpiry: Date;
  affectedSessions: string[];
  affectedDevices: string[];
  reEncryptionRequired: boolean;
  integrityVerified: boolean;
  backupCreated: boolean;
}
export interface KeySyncResult {
  synchronized: boolean;
  syncedDevices: string[];
  failedDevices: DeviceSyncFailure[];
  syncedKeys: string[];
  conflictResolutions: KeyConflictResolution[];
  integrityVerified: boolean;
  syncHash: string;
  syncDuration: number;
  dataTransferred: number;
}
export interface KeyRecoveryResult {
  recovered: boolean;
  recoveredKeys: string[];
  failedKeys: string[];
  recoveryMethod: RecoveryMethod;
  newDeviceId: string;
  masterKeyRestored: boolean;
  deviceKeysGenerated: boolean;
  sessionKeysCreated: boolean;
  integrityVerified: boolean;
  trustReestablished: boolean;
  additionalSetupRequired: boolean;
  recommendedActions: string[];
}
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
  salt: ArrayBuffer;
  iterations: number;
  algorithm: KDFAlgorithm;
  hardwareDerived: boolean;
  strength: KeyStrength;
}
export interface ContextKey {
  keyId: string;
  parentKeyId: string;
  keyMaterial: ArrayBuffer;
  contextInfo: AuthContextInfo;
  contextHash: ArrayBuffer;
  createdAt: Date;
  expiresAt?: Date;
  usageCount: number;
}
export interface SessionBoundKey {
  keyId: string;
  sessionId: string;
  keyMaterial: ArrayBuffer;
  sessionBound: true;
  purpose: KeyPurpose;
  createdAt: Date;
  expiresAt: Date;
  ephemeral: boolean;
}
export interface DeviceSpecificKey {
  keyId: string;
  deviceId: string;
  keyMaterial: ArrayBuffer;
  deviceBound: true;
  deviceFingerprint: string;
  keyType: DeviceKeyType;
  hardwareBacked: boolean;
}
export interface ChildKey {
  keyId: string;
  parentKeyId: string;
  keyMaterial: ArrayBuffer;
  derivationPath: KeyDerivationPath;
  purpose: KeyPurpose;
  depth: number;
  canDerive: boolean;
}
export interface TimeRange {
  start: Date;
  end: Date;
}
export interface KeyRotationSchedule {
  frequency: number;
  nextRotation: Date;
  autoRotate: boolean;
  notificationThreshold: number;
}
export interface RecoveryKey {
  keyId: string;
  keyMaterial: ArrayBuffer;
  algorithm: CryptoAlgorithm;
  recoveryPhrase: string;
  shamirThreshold?: number;
  shamirShares?: string[];
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
  createdFromDevice: string;
  hardwareBacked: boolean;
  biometricProtected: boolean;
  lastUsed?: Date;
  usageHistory: RecoveryUsageRecord[];
}
export interface EmergencyKey {
  keyId: string;
  emergencyCode: string;
  keyMaterial: ArrayBuffer;
  expiresAt: Date;
  singleUse: boolean;
  limitedAccess: boolean;
  requiresVerification: boolean;
  accessLevel: 'read_only' | 'limited' | 'full';
}
export interface HardwareValidationResult {
  valid: boolean;
  capabilities: HardwareCapabilities;
  attestation?: HardwareAttestation;
  trustLevel: number;
  verificationMethod: string;
  validationTime: Date;
  warnings: string[];
  recommendations: string[];
}
export interface HardwareStorageInfo {
  storageType: 'secure_enclave' | 'tpm' | 'strongbox' | 'hsm';
  accessPolicy: HardwareAccessPolicy;
  protectionLevel: KeyProtectionLevel;
  persistent: boolean;
  exportable: boolean;
  backupAllowed: boolean;
  userPresenceRequired: boolean;
  biometricRequired: boolean;
  passcodeRequired: boolean;
}
export interface HardwareKeyReference {
  keyId: string;
  storageType: 'secure_enclave' | 'tpm' | 'strongbox' | 'hsm';
  hardwareRef: string;
  accessPolicy: HardwareAccessPolicy;
  requiresAuth: boolean;
  algorithm: CryptoAlgorithm;
  purposes: KeyPurpose[];
  secureEnclaveRef?: SecureEnclaveKeyRef;
  tpmRef?: TPMKeyRef;
  strongBoxRef?: StrongBoxKeyRef;
}
export interface KeyTransferResult {
  success: boolean;
  transferredKeys: string[];
  failedKeys: KeyTransferFailure[];
  fromDeviceId: string;
  toDeviceId: string;
  transferMethod: KeyTransferMethod;
  integrityVerified: boolean;
  trustMaintained: boolean;
  transferTime: number;
  keyCount: number;
}
export interface KeyIntegrityResult {
  intact: boolean;
  keyId: string;
  hashMatch: boolean;
  signatureValid: boolean;
  timestampValid: boolean;
  tampering: boolean;
  corruption: boolean;
  unauthorized: boolean;
  recoverable: boolean;
  recommendedAction: string;
}
export interface KeyUsageAudit {
  keyId: string;
  auditPeriod: TimeRange;
  totalUsage: number;
  uniqueSessions: number;
  operationTypes: Record<string, number>;
  accessTimes: Date[];
  accessDevices: string[];
  accessLocations: string[];
  suspiciousAccess: SuspiciousAccessEvent[];
  policyViolations: PolicyViolation[];
  riskAssessment: KeyRiskAssessment;
}
export interface KeyPurgeResult {
  purged: boolean;
  purgedKeys: string[];
  preservedKeys: string[];
  purgeReason: string;
  purgedAt: Date;
  affectedSessions: string[];
  affectedDevices: string[];
  recoveryRequired: boolean;
}
export interface HardwarePerformanceMetrics {
  keyGenerationTime: number;
  signatureTime: number;
  verificationTime: number;
  encryptionThroughput: number;
  decryptionThroughput: number;
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
  unlockedAt: Date;
  unlockMethod: string;
  validFor: number;
  singleUse: boolean;
  operationLimit?: number;
}
export interface HardwareAttestation {
  format: AttestationFormat;
  attStmt: Record<string, any>;
  authData: ArrayBuffer;
  verified: boolean;
  trustChain: ArrayBuffer[];
  rootTrusted: boolean;
  hardwareModel: string;
  firmwareVersion: string;
  securityLevel: string;
}
export interface AttestationValidationResult {
  valid: boolean;
  trustLevel: number;
  signatureValid: boolean;
  chainValid: boolean;
  rootTrusted: boolean;
  revocationChecked: boolean;
  hardwareVerified: boolean;
  firmwareVerified: boolean;
  securityLevelVerified: boolean;
  warnings: string[];
  errors: string[];
}
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
  deleteAfterTime: number;
  maxRetentionTime: number;
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
  lockoutDuration: number;
}
export interface TPMPCRPolicy {
  pcrIndices: number[];
  expectedValues: ArrayBuffer[];
  operator: 'AND' | 'OR';
}
export interface TPMTimePolicy {
  validFrom?: Date;
  validUntil?: Date;
  timeWindow?: number;
}
export interface TPMLocalityPolicy {
  allowedLocalities: number[];
}
export interface TPMPCRSelection {
  pcrIndices: number[];
  hashAlgorithm: string;
}
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
  userAuthenticationValidityDuration: number;
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
  userAuthenticationValidityDuration: number;
}
