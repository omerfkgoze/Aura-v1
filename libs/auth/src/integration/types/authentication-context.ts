/**
 * Authentication Context Types
 * Core authentication context for device key management integration
 */

export interface AuthenticationContext {
  // User identity and authentication state
  userId: string;
  deviceId: string;
  sessionId: string;
  authMethod: AuthenticationMethod;
  authTimestamp: Date;

  // Device-specific information
  deviceInfo: DeviceKeyManagementInfo;
  hardwareBacking: HardwareBackingInfo;

  // Key derivation context
  keyDerivationContext: KeyDerivationContext;

  // Session security context
  securityContext: SessionSecurityContext;

  // Audit context
  auditContext: AuditContext;
}

export interface DeviceKeyManagementInfo {
  deviceId: string;
  deviceFingerprint: string;
  platform: 'ios' | 'android' | 'web';

  // Hardware security capabilities
  hardwareSecurityModule: boolean;
  secureEnclave: boolean;
  strongbox: boolean;

  // Key storage capabilities
  keyStorageMethod: 'secure_enclave' | 'keychain' | 'strongbox' | 'browser_crypto';
  keyDerivationSupported: boolean;
  biometricKeyProtection: boolean;

  // Device-specific key material
  deviceSalt: string; // Unique per device
  deviceKeyId?: string; // If device-specific keys exist

  // Key rotation support
  supportsKeyRotation: boolean;
  lastKeyRotation?: Date;
}

export interface HardwareBackingInfo {
  available: boolean;
  type: 'secure_enclave' | 'tpm' | 'strongbox' | 'none';
  attestationSupported: boolean;
  keyProtectionLevel: 'software' | 'tee' | 'strongbox' | 'secure_enclave';

  // Hardware attestation data
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
  // User-specific context
  userId: string;
  userKeyId: string;

  // Device-specific context
  deviceId: string;
  deviceSalt: string;
  deviceKeyId?: string;

  // Authentication-derived context
  authMethod: AuthenticationMethod;
  authTimestamp: Date;
  sessionId: string;

  // Key derivation parameters
  keyDerivationFunction: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations?: number;
  memoryKiB?: number;
  parallelism?: number;

  // Salt management
  masterSalt: string;
  userSalt: string;
  contextSalt: string;

  // Key versioning
  keyVersion: number;
  derivationVersion: string;
}

export interface SessionSecurityContext {
  sessionId: string;
  securityLevel: SecurityLevel;
  authStrength: number;

  // Multi-factor authentication
  mfaCompleted: boolean;
  mfaMethods: AuthenticationMethod[];
  mfaTimestamp?: Date;

  // Hardware verification
  hardwareVerified: boolean;
  biometricVerified: boolean;
  deviceTrusted: boolean;

  // Risk assessment
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];

  // Location and network
  geolocation?: GeolocationData;
  networkInfo: NetworkSecurityInfo;
}

export interface AuditContext {
  auditTrailId: string;
  complianceFrameworks: ComplianceFramework[];

  // Privacy settings
  dataMinimization: boolean;
  pseudonymizationApplied: boolean;
  anonymizationLevel: AnonymizationLevel;

  // Data handling requirements
  gdprApplicable: boolean;
  hipaaApplicable: boolean;
  dataResidency: string[];

  // Audit trail integrity
  integrityHash: string;
  tamperEvidence: boolean;
  auditChainVerified: boolean;
}

// Supporting Types
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
  networkTrustLevel: number; // 0-100
}
