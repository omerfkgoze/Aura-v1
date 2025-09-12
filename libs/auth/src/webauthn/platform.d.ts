import type { Platform, PlatformCapabilities } from './types';
export interface PlatformConfig {
  rpName: string;
  rpId: string;
  timeout: number;
  userVerification: UserVerificationRequirement;
  attestation: AttestationConveyancePreference;
}
export interface PlatformSpecificOptions {
  ios: IOSWebAuthnOptions;
  android: AndroidWebAuthnOptions;
  web: WebWebAuthnOptions;
}
export interface IOSWebAuthnOptions {
  requiresPlatformAttachment: boolean;
  preferredBiometric: 'faceId' | 'touchId' | 'any';
  keychainAccessGroup?: string;
  secureEnclaveRequired: boolean;
}
export interface AndroidWebAuthnOptions {
  requiresPlatformAttachment: boolean;
  preferredBiometric: 'fingerprint' | 'face' | 'iris' | 'any';
  strongBoxRequired: boolean;
  confirmationRequired: boolean;
}
export interface WebWebAuthnOptions {
  preferredAuthenticatorTypes: ('platform' | 'cross-platform')[];
  allowedTransports: AuthenticatorTransport[];
  requireUserVerification: boolean;
  conditionalMediation: boolean;
}
export declare class PlatformWebAuthnManager {
  private config;
  private platformOptions;
  constructor(config: PlatformConfig);
  getPlatformCapabilities(): PlatformCapabilities;
  getRegistrationOptionsForPlatform(platform: Platform): any;
  getAuthenticationOptionsForPlatform(platform: Platform): any;
  private getIOSRegistrationOptions;
  private getAndroidRegistrationOptions;
  private getWebRegistrationOptions;
  private getIOSAuthenticationOptions;
  private getAndroidAuthenticationOptions;
  private getWebAuthenticationOptions;
  private getDefaultPlatformOptions;
  private detectPlatform;
  private isWebAuthnSupported;
  private isPasskeysSupported;
  private isBiometricsSupported;
  private isIOSVersionSupported;
  private isAndroidVersionSupported;
}
