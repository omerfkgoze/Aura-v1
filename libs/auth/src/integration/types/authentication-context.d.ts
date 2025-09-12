/**
 * Authentication Context Types
 * Core authentication context for device key management integration
 */
export interface AuthenticationContext {
  userId: string;
  deviceId: string;
  sessionId: string;
  authMethod: AuthenticationMethod;
  authTimestamp: Date;
  deviceInfo: DeviceKeyManagementInfo;
  hardwareBacking: HardwareBackingInfo;
  keyDerivationContext: KeyDerivationContext;
  securityContext: SessionSecurityContext;
  auditContext: AuditContext;
}
export interface DeviceKeyManagementInfo {
  deviceId: string;
  deviceFingerprint: string;
  platform: 'ios' | 'android' | 'web';
  hardwareSecurityModule: boolean;
  secureEnclave: boolean;
  strongbox: boolean;
  keyStorageMethod: 'secure_enclave' | 'keychain' | 'strongbox' | 'browser_crypto';
  keyDerivationSupported: boolean;
  biometricKeyProtection: boolean;
  deviceSalt: string;
  deviceKeyId?: string;
  supportsKeyRotation: boolean;
  lastKeyRotation?: Date;
}
export interface HardwareBackingInfo {
  available: boolean;
  type: 'secure_enclave' | 'tpm' | 'strongbox' | 'none';
  attestationSupported: boolean;
  keyProtectionLevel: 'software' | 'tee' | 'strongbox' | 'secure_enclave';
  attestationChain?: ArrayBuffer[];
  hardwareAttestation?: HardwareAttestation;
}
export interface HardwareAttestation {
  format: 'packed' | 'tpm' | 'android-key' | 'android-safetynet' | 'fido-u2f';
  attStmt: Record<string, any>;
  verified: boolean;
  trustPath: string[];
}
export interface KeyDerivationContext {
  userId: string;
  userKeyId: string;
  deviceId: string;
  deviceSalt: string;
  deviceKeyId?: string;
  authMethod: AuthenticationMethod;
  authTimestamp: Date;
  sessionId: string;
  keyDerivationFunction: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations?: number;
  memoryKiB?: number;
  parallelism?: number;
  masterSalt: string;
  userSalt: string;
  contextSalt: string;
  keyVersion: number;
  derivationVersion: string;
}
export interface SessionSecurityContext {
  sessionId: string;
  securityLevel: SecurityLevel;
  authStrength: number;
  mfaCompleted: boolean;
  mfaMethods: AuthenticationMethod[];
  mfaTimestamp?: Date;
  hardwareVerified: boolean;
  biometricVerified: boolean;
  deviceTrusted: boolean;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  geolocation?: GeolocationData;
  networkInfo: NetworkSecurityInfo;
}
export interface AuditContext {
  auditTrailId: string;
  complianceFrameworks: ComplianceFramework[];
  dataMinimization: boolean;
  pseudonymizationApplied: boolean;
  anonymizationLevel: AnonymizationLevel;
  gdprApplicable: boolean;
  hipaaApplicable: boolean;
  dataResidency: string[];
  integrityHash: string;
  tamperEvidence: boolean;
  auditChainVerified: boolean;
}
export type AuthenticationMethod =
  | 'passkey_webauthn'
  | 'opaque_password'
  | 'biometric_faceId'
  | 'biometric_touchId'
  | 'biometric_fingerprint'
  | 'hardware_key'
  | 'smart_card'
  | 'recovery_phrase';
export type SecurityLevel = 'low' | 'standard' | 'high' | 'critical';
export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';
export type ComplianceFramework = 'gdpr' | 'hipaa' | 'ccpa' | 'pipeda';
export type AnonymizationLevel = 'none' | 'pseudonymized' | 'anonymized' | 'fully_anonymous';
export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigated: boolean;
}
export interface GeolocationData {
  country: string;
  region?: string;
  city?: string;
  timezone: string;
  accuracy: 'country' | 'region' | 'city' | 'precise';
}
export interface NetworkSecurityInfo {
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'vpn' | 'unknown';
  encrypted: boolean;
  vpnDetected: boolean;
  torDetected: boolean;
  publicNetwork: boolean;
  networkTrustLevel: number;
}
