import type {
  WebAuthnCredential,
  BiometricAuthenticationOptions,
  IOSBiometricResult,
} from './types';
/**
 * iOS-specific WebAuthn implementation with Face ID/Touch ID integration
 * Provides hardware-backed authentication using iOS Keychain and Secure Enclave
 */
export declare class IOSWebAuthnManager {
  private platformManager;
  private registrationManager;
  private authenticationManager;
  constructor(rpId: string, rpName: string);
  /**
   * Check if iOS biometric authentication is available
   */
  isIOSBiometricAvailable(): Promise<boolean>;
  /**
   * Register a new WebAuthn credential with iOS biometric authentication
   */
  registerWithIOSBiometrics(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential>;
  /**
   * Authenticate using iOS biometric authentication
   */
  authenticateWithIOSBiometrics(
    credentialIds?: string[],
    options?: BiometricAuthenticationOptions
  ): Promise<IOSBiometricResult>;
  /**
   * Check if Secure Enclave is available on the device
   */
  isSecureEnclaveAvailable(): Promise<boolean>;
  /**
   * Get Face ID availability status
   */
  isFaceIdAvailable(): Promise<boolean>;
  /**
   * Get Touch ID availability status
   */
  isTouchIdAvailable(): Promise<boolean>;
  /**
   * Get optimal biometric authentication method for the device
   */
  getOptimalBiometricMethod(): Promise<'faceId' | 'touchId' | 'none'>;
  private getIOSBiometricOptions;
  private validateIOSAttestation;
  private storeIOSCredentialMetadata;
  private updateIOSCredentialMetadata;
  private extractIOSBiometricData;
  private isFaceIdCapableDevice;
  private isTouchIdCapableDevice;
  private base64UrlToArrayBuffer;
  private storeSecureMetadata;
  private getSecureMetadata;
  private parsePublicKeyData;
}
