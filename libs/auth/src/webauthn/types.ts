// Note: These types would typically come from @simplewebauthn/types
// For now, we define minimal interfaces for cross-platform compatibility

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  attestation?: AttestationConveyancePreference;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  timeout?: number;
  userVerification?: UserVerificationRequirement;
}

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKeyData: PublicKeyData;
  counter: number;
  platform: Platform;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface PublicKeyData {
  kty: number;
  alg: number;
  crv?: number;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export type Platform = 'ios' | 'android' | 'web';

export interface RegistrationResult {
  success: boolean;
  credential?: WebAuthnCredential;
  error?: string;
}

export interface AuthenticationResult {
  success: boolean;
  userId?: string;
  credentialId?: string;
  error?: string;
}

export interface WebAuthnChallenge {
  challenge: string;
  userId?: string;
  expiresAt: Date;
}

export interface PlatformCapabilities {
  supportsWebAuthn: boolean;
  supportsPasskeys: boolean;
  supportsBiometrics: boolean;
  platform: Platform;
}

export interface WebAuthnRegistrationRequest {
  userId: string;
  username: string;
  displayName: string;
  platform: Platform;
}

export interface WebAuthnAuthenticationRequest {
  credentialId?: string;
  platform: Platform;
}

// Platform-specific biometric authentication options
export interface BiometricAuthenticationOptions {
  preferredBiometric?: 'faceId' | 'touchId' | 'fingerprint' | 'face' | 'iris' | 'voice' | 'any';
  requireSecureEnclave?: boolean;
  requireStrongBox?: boolean;
  allowFallback?: boolean;
  confirmationRequired?: boolean;
  localizedFallbackTitle?: string;
  localizedPrompt?: string;
  negativeButtonText?: string;
  timeout?: number;
  // Web-specific options
  preferPlatformAuthenticator?: boolean;
  requireResidentKey?: boolean;
  requireUserVerification?: boolean;
  conditionalMediation?: boolean;
  allowedTransports?: AuthenticatorTransport[];
  hmacSecret?: Uint8Array;
  legacyAppId?: string;
}

// iOS-specific biometric result
export interface IOSBiometricResult {
  assertion: any;
  biometricType: 'faceId' | 'touchId' | 'unknown';
  secureEnclaveUsed: boolean;
  touchIdUsed: boolean;
  faceIdUsed: boolean;
  timestamp: Date;
}

// Android-specific biometric result
export interface AndroidBiometricResult {
  assertion: any;
  biometricType: 'fingerprint' | 'face' | 'iris' | 'voice' | 'unknown';
  strongBoxUsed: boolean;
  fingerprintUsed: boolean;
  faceUsed: boolean;
  irisUsed: boolean;
  voiceUsed: boolean;
  timestamp: Date;
}

// Web browser authentication result
export interface WebBrowserResult {
  assertion: any;
  browserInfo: {
    name: string;
    version: string;
    webAuthnSupport: string;
    platformSupport: boolean;
    conditionalSupport: boolean;
  };
  authenticatorType: 'platform' | 'roaming' | 'unknown';
  userVerified: boolean;
  platformAuthenticator: boolean;
  timestamp: Date;
}

// Cross-platform authentication result union
export type CrossPlatformAuthResult =
  | IOSBiometricResult
  | AndroidBiometricResult
  | WebBrowserResult;

// Platform detection capabilities
export interface PlatformDetectionResult {
  platform: Platform;
  isSupported: boolean;
  capabilities: {
    webAuthn: boolean;
    passkeys: boolean;
    biometrics: boolean;
    hardwareBacked: boolean;
  };
  fallbackOptions: string[];
}
