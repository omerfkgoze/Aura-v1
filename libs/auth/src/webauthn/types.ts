import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

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
