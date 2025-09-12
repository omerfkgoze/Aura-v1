import type {
  WebAuthnCredential,
  BiometricAuthenticationOptions,
  AndroidBiometricResult,
} from './types';
/**
 * Android-specific WebAuthn implementation with biometric authentication
 * Provides hardware-backed authentication using Android StrongBox and biometric APIs
 */
export declare class AndroidWebAuthnManager {
  private platformManager;
  private registrationManager;
  private authenticationManager;
  constructor(rpId: string, rpName: string);
  /**
   * Check if Android biometric authentication is available
   */
  isAndroidBiometricAvailable(): Promise<boolean>;
  /**
   * Register a new WebAuthn credential with Android biometric authentication
   */
  registerWithAndroidBiometrics(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential>;
  /**
   * Authenticate using Android biometric authentication
   */
  authenticateWithAndroidBiometrics(
    credentialIds?: string[],
    options?: BiometricAuthenticationOptions
  ): Promise<AndroidBiometricResult>;
  /**
   * Check if Android StrongBox is available on the device
   */
  isStrongBoxAvailable(): Promise<boolean>;
  /**
   * Check if biometric authentication is available
   */
  isBiometricAuthenticationAvailable(): Promise<boolean>;
  /**
   * Get fingerprint scanner availability status
   */
  isFingerprintAvailable(): Promise<boolean>;
  /**
   * Get face unlock availability status
   */
  isFaceUnlockAvailable(): Promise<boolean>;
  /**
   * Get iris scanner availability status
   */
  isIrisAvailable(): Promise<boolean>;
  /**
   * Get optimal biometric authentication method for the device
   */
  getOptimalBiometricMethod(): Promise<'fingerprint' | 'face' | 'iris' | 'voice' | 'any' | 'none'>;
  /**
   * Check SafetyNet availability
   */
  isSafetyNetAvailable(): Promise<boolean>;
  private getAndroidBiometricOptions;
  private validateAndroidAttestation;
  private storeAndroidCredentialMetadata;
  private updateAndroidCredentialMetadata;
  private extractAndroidBiometricData;
  private extractUVMData;
  private isIrisCapableDevice;
  private isGooglePlayServicesAvailable;
  private base64UrlToArrayBuffer;
  private parseCBOR;
  private validateSafetyNetAttestation;
  private validateAndroidKeyAttestation;
  private storeSecureMetadata;
  private getSecureMetadata;
}
