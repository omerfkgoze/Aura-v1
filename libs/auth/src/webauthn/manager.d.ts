import type {
  WebAuthnRegistrationRequest,
  WebAuthnAuthenticationRequest,
  WebAuthnCredential,
  RegistrationResult,
  AuthenticationResult,
  PlatformCapabilities,
} from './types';
import type { SecureStorageConfig } from './storage';
export interface WebAuthnManagerConfig {
  rpName: string;
  rpId: string;
  expectedOrigin: string;
  storage?: SecureStorageConfig;
  timeout?: number;
  userVerification?: UserVerificationRequirement;
  attestation?: AttestationConveyancePreference;
}
export declare class WebAuthnManager {
  private registration;
  private authentication;
  private platformManager;
  private secureStorage;
  private config;
  private platform;
  constructor(config: WebAuthnManagerConfig);
  startRegistration(request: WebAuthnRegistrationRequest): Promise<{
    options: any;
    challenge: string;
  }>;
  completeRegistration(
    response: any,
    userId: string,
    expectedChallenge?: string
  ): Promise<RegistrationResult>;
  startAuthentication(request: WebAuthnAuthenticationRequest): Promise<{
    options: any;
    challenge: string;
  }>;
  completeAuthentication(response: any, expectedChallenge?: string): Promise<AuthenticationResult>;
  startConditionalAuthentication(): Promise<any>;
  getPlatformCapabilities(): PlatformCapabilities;
  getUserCredentials(userId: string): Promise<WebAuthnCredential[]>;
  removeCredential(credentialId: string): Promise<void>;
  private storeCredential;
  private getCredential;
  private updateCredential;
  private storeChallenge;
  private retrieveChallenge;
  private removeChallenge;
  private detectPlatform;
}
