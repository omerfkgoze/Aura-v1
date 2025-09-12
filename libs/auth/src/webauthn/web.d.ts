import type { WebAuthnCredential, BiometricAuthenticationOptions, WebBrowserResult } from './types';
/**
 * Web platform WebAuthn implementation with browser compatibility
 * Provides cross-browser WebAuthn support with feature detection and fallbacks
 */
export declare class WebWebAuthnManager {
  private platformManager;
  private registrationManager;
  private authenticationManager;
  constructor(rpId: string, rpName: string);
  /**
   * Check comprehensive WebAuthn browser support
   */
  isWebAuthnSupported(): Promise<boolean>;
  /**
   * Register a new WebAuthn credential with web browser compatibility
   */
  registerWithWebAuthn(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential>;
  /**
   * Authenticate using web browser WebAuthn
   */
  authenticateWithWebAuthn(
    credentialIds?: string[],
    options?: BiometricAuthenticationOptions
  ): Promise<WebBrowserResult>;
  /**
   * Check if conditional mediation (passkeys) is supported
   */
  isConditionalMediationSupported(): Promise<boolean>;
  /**
   * Check if user verifying platform authenticator is available
   */
  isPlatformAuthenticatorAvailable(): Promise<boolean>;
  /**
   * Get browser information for WebAuthn compatibility
   */
  getBrowserInfo(): {
    name: string;
    version: string;
    webAuthnSupport: string;
    platformSupport: boolean;
    conditionalSupport: boolean;
  };
  /**
   * Get WebAuthn feature support matrix
   */
  getWebAuthnFeatures(): Promise<{
    basicWebAuthn: boolean;
    platformAuthenticator: boolean;
    conditionalMediation: boolean;
    largeBlob: boolean;
    hmacSecret: boolean;
    credProps: boolean;
    residentKeys: boolean;
    userVerification: boolean;
  }>;
  private getWebAuthOptions;
  private generateSecureChallenge;
  private getExistingCredentials;
  private validateWebCredential;
  private storeWebCredentialMetadata;
  private updateWebCredentialMetadata;
  private extractWebAuthData;
  private parseBrowserInfo;
  private getWebAuthnSupportLevel;
  private isExtensionSupported;
  private handleWebAuthnError;
  private base64UrlToArrayBuffer;
  private storeSecureMetadata;
  private getSecureMetadata;
}
