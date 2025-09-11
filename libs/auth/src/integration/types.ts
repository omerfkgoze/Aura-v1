/**
 * Integration Types for Future Stories
 *
 * Type definitions for authentication system integration with:
 * - Device-specific key management (Story 1.4)
 * - Crypto core integration (Story 1.2)
 * - User session management for encrypted data access
 * - Security audit trail systems
 * - Multi-device scenarios
 */

// Authentication Context for Device Key Management (Story 1.4 Integration)
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

// Key Derivation Context for Crypto Core Integration (Story 1.2)
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
  contextSalt: string;

  // Key hierarchy context
  keyLevel: 'root' | 'device' | 'session' | 'data';
  parentKeyId?: string;

  // Purpose-specific context
  keyPurpose: 'encryption' | 'signing' | 'derivation' | 'authentication';
  algorithm: string;
  keyLength: number;
}

// Session Security Context
export interface SessionSecurityContext {
  sessionId: string;
  securityLevel: 'standard' | 'high' | 'critical';

  // Authentication strength
  authenticationStrength: AuthenticationStrength;
  multiFactorComplete: boolean;
  biometricVerified: boolean;
  hardwareVerified: boolean;

  // Session protection
  sessionToken: string;
  tokenType: 'jwt' | 'opaque' | 'encrypted';
  encryptionKey?: string;
  integrityKey?: string;

  // Expiration and refresh
  expiresAt: Date;
  refreshToken?: string;
  maxLifetime: number;

  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];

  // Concurrent session management
  maxConcurrentSessions: number;
  currentSessionCount: number;
  otherSessionIds: string[];
}

export interface AuthenticationStrength {
  factor1: AuthenticationFactor; // Something you know/have
  factor2?: AuthenticationFactor; // Something you are
  factor3?: AuthenticationFactor; // Something you do

  overallStrength: 'weak' | 'medium' | 'strong' | 'very_strong';
  nistLevel: 'aal1' | 'aal2' | 'aal3';

  // Method-specific strengths
  passkeyStrength?: PasskeyStrength;
  biometricStrength?: BiometricStrength;
  opaqueStrength?: OpaqueStrength;
}

export interface AuthenticationFactor {
  type: 'knowledge' | 'possession' | 'biometric' | 'behavior';
  method: string;
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  hardwareBacked: boolean;
  verifiedAt: Date;
}

export interface PasskeyStrength {
  algorithmStrength: 'weak' | 'medium' | 'strong' | 'very_strong';
  userVerificationMethod: 'none' | 'presence' | 'biometric' | 'pin';
  hardwareBacking: boolean;
  attestationType: 'none' | 'basic' | 'attca' | 'ecdaa';
}

export interface BiometricStrength {
  modalityType: 'fingerprint' | 'face' | 'iris' | 'voice' | 'behavioral';
  spoofingResistance: 'low' | 'medium' | 'high' | 'very_high';
  hardwareBacking: boolean;
  templateProtection: boolean;
  falseAcceptRate: number;
  falseRejectRate: number;
}

export interface OpaqueStrength {
  passwordEntropy: number;
  saltStrength: 'weak' | 'medium' | 'strong' | 'very_strong';
  kdfIterations: number;
  protocolCompliance: boolean;
}

// Audit Context for Security Trail Integration
export interface AuditContext {
  // Event identification
  eventId: string;
  correlationId: string;

  // User and session context
  userId: string;
  sessionId: string;
  deviceId: string;

  // Request context
  ipAddress: string;
  userAgent: string;
  location?: GeolocationData;

  // Security context
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  // Compliance context
  gdprRelevant: boolean;
  hipaaRelevant: boolean;
  dataProcessingBasis?: string;
  consentLevel?: string;

  // Audit trail context
  auditChainId: string;
  previousEventId?: string;
  integrityHash: string;

  // Privacy protection
  piiSanitized: boolean;
  pseudonymizationApplied: boolean;
  retentionPeriod: number; // days
}

export interface GeolocationData {
  country: string;
  region?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timezone: string;
  isp?: string;
  asn?: number;
}

// Multi-Device Scenario Support
export interface MultiDeviceContext {
  // Primary device context
  primaryDeviceId: string;
  primaryDeviceAuth: AuthenticationContext;

  // All user devices
  userDevices: DeviceRegistration[];
  trustedDevices: DeviceRegistration[];

  // Cross-device synchronization
  syncEnabled: boolean;
  syncEncryptionKey?: string;
  lastSyncAt?: Date;

  // Device handoff context
  handoffEnabled: boolean;
  handoffToken?: string;
  handoffExpiresAt?: Date;

  // Device recovery context
  recoveryDevices: DeviceRegistration[];
  emergencyDevices: DeviceRegistration[];
}

export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  deviceType: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'wearable';
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';

  // Registration context
  registeredAt: Date;
  lastSeenAt: Date;
  registrationMethod: AuthenticationMethod;

  // Device capabilities
  capabilities: DeviceCapabilities;

  // Trust and security
  trustLevel: 'unknown' | 'basic' | 'trusted' | 'verified';
  securityLevel: 'low' | 'medium' | 'high' | 'critical';

  // Key management
  deviceKeys: DeviceKeyInfo[];

  // Status
  status: 'active' | 'inactive' | 'suspended' | 'revoked' | 'lost';
}

export interface DeviceCapabilities {
  webauthnSupported: boolean;
  biometricAvailable: boolean;
  hardwareBacked: boolean;
  secureStorage: boolean;
  encryptionSupported: boolean;

  // Platform-specific
  secureEnclave?: boolean; // iOS
  strongbox?: boolean; // Android
  tpm?: boolean; // Windows/Linux

  // Biometric types
  biometricTypes: string[];

  // Network capabilities
  networkCapabilities: {
    online: boolean;
    backgroundSync: boolean;
    pushNotifications: boolean;
  };
}

export interface DeviceKeyInfo {
  keyId: string;
  keyPurpose: 'authentication' | 'encryption' | 'signing';
  keyAlgorithm: string;
  keyLength: number;

  // Key lifecycle
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;

  // Key protection
  hardwareBacked: boolean;
  biometricProtected: boolean;

  // Key status
  status: 'active' | 'inactive' | 'revoked' | 'expired';
}

// Integration Hooks and Callbacks
export interface AuthenticationIntegrationHooks {
  // Pre-authentication hooks
  onPreAuthentication?: (context: AuthenticationContext) => Promise<void>;
  onAuthenticationStart?: (
    method: AuthenticationMethod,
    context: AuthenticationContext
  ) => Promise<void>;

  // Authentication process hooks
  onCredentialValidation?: (credential: any, context: AuthenticationContext) => Promise<boolean>;
  onBiometricVerification?: (
    result: BiometricVerificationResult,
    context: AuthenticationContext
  ) => Promise<void>;
  onHardwareAttestation?: (
    attestation: HardwareAttestation,
    context: AuthenticationContext
  ) => Promise<void>;

  // Post-authentication hooks
  onAuthenticationSuccess?: (context: AuthenticationContext) => Promise<void>;
  onAuthenticationFailure?: (
    error: AuthenticationError,
    context: AuthenticationContext
  ) => Promise<void>;
  onSessionCreated?: (sessionContext: SessionSecurityContext) => Promise<void>;

  // Key management hooks
  onKeyDerivationRequest?: (derivationContext: KeyDerivationContext) => Promise<string>;
  onDeviceKeyGeneration?: (deviceContext: DeviceKeyManagementInfo) => Promise<DeviceKeyInfo>;
  onKeyRotation?: (oldKeyId: string, newKeyInfo: DeviceKeyInfo) => Promise<void>;

  // Audit hooks
  onAuditEvent?: (auditContext: AuditContext) => Promise<void>;
  onSecurityEvent?: (securityEvent: SecurityEvent) => Promise<void>;
  onRiskAssessment?: (riskContext: RiskAssessmentContext) => Promise<RiskLevel>;

  // Multi-device hooks
  onDeviceRegistration?: (deviceRegistration: DeviceRegistration) => Promise<void>;
  onDeviceHandoff?: (handoffContext: DeviceHandoffContext) => Promise<void>;
  onDeviceSync?: (syncContext: DeviceSyncContext) => Promise<void>;
}

export interface BiometricVerificationResult {
  success: boolean;
  biometricType: string;
  confidence: number;
  hardwareBacked: boolean;
  spoofingDetected: boolean;
  templateMatched: boolean;
}

export interface SecurityEvent {
  eventId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  context: AuthenticationContext;
  requiresAction: boolean;
}

export interface RiskAssessmentContext {
  userContext: {
    userId: string;
    userBehaviorBaseline: UserBehaviorBaseline;
    recentActivity: RecentActivity[];
  };

  deviceContext: {
    deviceId: string;
    deviceTrust: number;
    deviceAnomaly: boolean;
  };

  locationContext: {
    currentLocation: GeolocationData;
    usualLocations: GeolocationData[];
    locationAnomaly: boolean;
  };

  timeContext: {
    authTime: Date;
    usualAuthTimes: TimePattern[];
    timeAnomaly: boolean;
  };

  networkContext: {
    ipAddress: string;
    networkType: 'trusted' | 'public' | 'vpn' | 'tor';
    networkAnomaly: boolean;
  };
}

export interface UserBehaviorBaseline {
  typingPattern?: TypingPattern;
  authenticationPattern: AuthenticationPattern;
  deviceUsagePattern: DeviceUsagePattern;
  locationPattern: LocationPattern;
  timePattern: TimePattern;
}

export interface TypingPattern {
  keystrokeDynamics: number[];
  typingSpeed: number;
  pausePatterns: number[];
  confidence: number;
}

export interface AuthenticationPattern {
  preferredMethods: AuthenticationMethod[];
  authenticationTimes: TimePattern[];
  sessionDuration: number;
  failureRate: number;
}

export interface DeviceUsagePattern {
  primaryDevices: string[];
  deviceSwitchFrequency: number;
  concurrentSessions: number;
  offlineUsage: number;
}

export interface LocationPattern {
  homeLocation: GeolocationData;
  workLocation: GeolocationData;
  frequentLocations: GeolocationData[];
  travelFrequency: number;
}

export interface TimePattern {
  preferredHours: number[];
  timezone: string;
  weekdayPattern: number[];
  activityPattern: string;
}

export interface RecentActivity {
  timestamp: Date;
  activityType: string;
  deviceId: string;
  location: GeolocationData;
  riskLevel: RiskLevel;
}

export interface DeviceHandoffContext {
  sourceDeviceId: string;
  targetDeviceId: string;
  handoffToken: string;
  handoffType: 'session_transfer' | 'credential_share' | 'key_sync';
  securityLevel: 'standard' | 'high' | 'critical';
}

export interface DeviceSyncContext {
  deviceIds: string[];
  syncType: 'auth_state' | 'credentials' | 'keys' | 'settings';
  encryptionKey: string;
  syncTimestamp: Date;
}

// Common Types
export type AuthenticationMethod =
  | 'passkey'
  | 'biometric'
  | 'opaque'
  | 'recovery_phrase'
  | 'emergency_code';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuthenticationError {
  code: string;
  message: string;
  type: 'user_error' | 'system_error' | 'security_error' | 'network_error';
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
}
