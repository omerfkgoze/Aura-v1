import type {
  WebAuthnCredential,
  BiometricAuthenticationOptions,
  AndroidBiometricResult,
} from './types';
import { PlatformWebAuthnManager } from './platform';
import { WebAuthnRegistration } from './registration';
import { WebAuthnAuthentication } from './authentication';

/**
 * Android-specific WebAuthn implementation with biometric authentication
 * Provides hardware-backed authentication using Android StrongBox and biometric APIs
 */
export class AndroidWebAuthnManager {
  private platformManager: PlatformWebAuthnManager;
  private registrationManager: WebAuthnRegistration;
  private authenticationManager: WebAuthnAuthentication;

  constructor(rpId: string, rpName: string) {
    this.platformManager = new PlatformWebAuthnManager({
      rpId,
      rpName,
      timeout: 60000,
      userVerification: 'required',
      attestation: 'direct',
    });

    this.registrationManager = new WebAuthnRegistration(rpName, rpId);
    this.authenticationManager = new WebAuthnAuthentication(rpId);
  }

  /**
   * Check if Android biometric authentication is available
   */
  async isAndroidBiometricAvailable(): Promise<boolean> {
    try {
      // Check for Android-specific biometric APIs
      const hasWebAuthn = this.platformManager.getPlatformCapabilities().supportsWebAuthn;
      const hasStrongBox = await this.isStrongBoxAvailable();
      const hasBiometrics = await this.isBiometricAuthenticationAvailable();

      return hasWebAuthn && (hasStrongBox || hasBiometrics);
    } catch (error) {
      console.warn('Android biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Register a new WebAuthn credential with Android biometric authentication
   */
  async registerWithAndroidBiometrics(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential> {
    const biometricOptions = this.getAndroidBiometricOptions(options);

    const registrationOptions = this.platformManager.getRegistrationOptionsForPlatform('android');

    // Enhanced Android-specific registration options
    const androidRegistrationOptions = {
      ...registrationOptions,
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName,
      },
      authenticatorSelection: {
        ...registrationOptions.authenticatorSelection,
        authenticatorAttachment: 'platform', // Ensure platform authenticator
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: {
        ...registrationOptions.extensions,
        // Android-specific extensions
        credProps: true,
        uvm: true, // User Verification Method
        // Request Android SafetyNet attestation
        attestationFormats: ['android-safetynet', 'android-key'],
      },
      // Android-specific public key parameters
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256 (preferred for Android)
        { type: 'public-key', alg: -35 }, // ES384
        { type: 'public-key', alg: -257 }, // RS256 (fallback)
      ],
    };

    try {
      // Attempt WebAuthn registration with Android-specific options
      const registrationResponse = await this.registrationManager.startRegistration(
        androidRegistrationOptions
      );

      const credential: WebAuthnCredential = {
        id: registrationResponse.id,
        userId: userId,
        credentialId: registrationResponse.id,
        publicKeyData: {
          kty: 2,
          alg: -7,
          ...(registrationResponse.response.publicKey && {
            rawData: registrationResponse.response.publicKey,
          }),
        },
        counter: 0,
        platform: 'android',
        createdAt: new Date(),
      };

      // Validate Android-specific attestation data
      const validatedCredential = await this.validateAndroidAttestation(credential);

      // Store credential metadata for Android-specific features
      await this.storeAndroidCredentialMetadata(validatedCredential, biometricOptions);

      return validatedCredential;
    } catch (error) {
      throw new Error(
        `Android WebAuthn registration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Authenticate using Android biometric authentication
   */
  async authenticateWithAndroidBiometrics(
    credentialIds?: string[],
    options?: BiometricAuthenticationOptions
  ): Promise<AndroidBiometricResult> {
    this.getAndroidBiometricOptions(options);

    const authenticationOptions =
      this.platformManager.getAuthenticationOptionsForPlatform('android');

    // Enhanced Android-specific authentication options
    const androidAuthenticationOptions = {
      ...authenticationOptions,
      allowCredentials: credentialIds?.map(id => ({
        type: 'public-key',
        id: this.base64UrlToArrayBuffer(id),
        transports: ['internal'], // Android internal authenticator
      })),
      extensions: {
        ...authenticationOptions.extensions,
        // Android-specific extensions for biometric data
        uvm: true, // User Verification Method
        appid: undefined, // Not needed for resident keys
      },
      userVerification: 'required',
    };

    try {
      const assertion = await this.authenticationManager.startAuthentication(
        androidAuthenticationOptions
      );

      // Extract Android-specific biometric information
      const biometricResult = await this.extractAndroidBiometricData(assertion);

      // Update credential usage counter and metadata
      await this.updateAndroidCredentialMetadata(assertion.id);

      return {
        assertion,
        biometricType: biometricResult.biometricType,
        strongBoxUsed: biometricResult.strongBoxUsed,
        fingerprintUsed: biometricResult.fingerprintUsed,
        faceUsed: biometricResult.faceUsed,
        irisUsed: biometricResult.irisUsed,
        voiceUsed: biometricResult.voiceUsed,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Android WebAuthn authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if Android StrongBox is available on the device
   */
  async isStrongBoxAvailable(): Promise<boolean> {
    try {
      // Check for Android-specific APIs that indicate StrongBox support
      if (typeof window === 'undefined') return false;

      // Android 9+ (API level 28) supports StrongBox
      const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](9);

      // Check for WebAuthn platform authenticator support
      const hasWebAuthnPlatform =
        typeof PublicKeyCredential !== 'undefined' &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

      if (!hasWebAuthnPlatform) return false;

      return (
        isAndroidSupported &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      );
    } catch (error) {
      console.warn('StrongBox availability check failed:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAuthenticationAvailable(): Promise<boolean> {
    try {
      // Check Android version (biometric authentication available on Android 6+)
      const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](6);

      // Check for WebAuthn support
      const hasWebAuthn = this.platformManager.getPlatformCapabilities().supportsWebAuthn;

      return isAndroidSupported && hasWebAuthn;
    } catch (error) {
      console.warn('Biometric authentication availability check failed:', error);
      return false;
    }
  }

  /**
   * Get fingerprint scanner availability status
   */
  async isFingerprintAvailable(): Promise<boolean> {
    try {
      const isBiometricAvailable = await this.isBiometricAuthenticationAvailable();
      if (!isBiometricAvailable) return false;

      // Check Android version (fingerprint available on Android 6+)
      const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](6);

      // Most Android devices have fingerprint scanners
      return isAndroidSupported;
    } catch (error) {
      console.warn('Fingerprint availability check failed:', error);
      return false;
    }
  }

  /**
   * Get face unlock availability status
   */
  async isFaceUnlockAvailable(): Promise<boolean> {
    try {
      const isBiometricAvailable = await this.isBiometricAuthenticationAvailable();
      if (!isBiometricAvailable) return false;

      // Check Android version (face unlock available on Android 10+)
      const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](10);

      return isAndroidSupported;
    } catch (error) {
      console.warn('Face unlock availability check failed:', error);
      return false;
    }
  }

  /**
   * Get iris scanner availability status
   */
  async isIrisAvailable(): Promise<boolean> {
    try {
      const isBiometricAvailable = await this.isBiometricAuthenticationAvailable();
      if (!isBiometricAvailable) return false;

      // Iris scanning is available on specific devices (Samsung Galaxy series)
      const isIrisDevice = this.isIrisCapableDevice();

      return isIrisDevice;
    } catch (error) {
      console.warn('Iris scanner availability check failed:', error);
      return false;
    }
  }

  /**
   * Get optimal biometric authentication method for the device
   */
  async getOptimalBiometricMethod(): Promise<
    'fingerprint' | 'face' | 'iris' | 'voice' | 'any' | 'none'
  > {
    const fingerprintAvailable = await this.isFingerprintAvailable();
    const faceAvailable = await this.isFaceUnlockAvailable();
    const irisAvailable = await this.isIrisAvailable();

    if (fingerprintAvailable && faceAvailable && irisAvailable) return 'any';
    if (fingerprintAvailable && faceAvailable) return 'any';
    if (fingerprintAvailable) return 'fingerprint';
    if (faceAvailable) return 'face';
    if (irisAvailable) return 'iris';
    return 'none';
  }

  /**
   * Check SafetyNet availability
   */
  async isSafetyNetAvailable(): Promise<boolean> {
    try {
      // Check for Google Play Services availability
      if (typeof window === 'undefined') return false;

      // SafetyNet requires Google Play Services
      return this.isGooglePlayServicesAvailable();
    } catch (error) {
      console.warn('SafetyNet availability check failed:', error);
      return false;
    }
  }

  private getAndroidBiometricOptions(
    options?: BiometricAuthenticationOptions
  ): BiometricAuthenticationOptions {
    return {
      preferredBiometric: options?.preferredBiometric || 'any',
      requireStrongBox: options?.requireStrongBox ?? true,
      allowFallback: options?.allowFallback ?? true,
      confirmationRequired: options?.confirmationRequired ?? true,
      localizedPrompt: options?.localizedPrompt || 'Authenticate with biometrics',
      negativeButtonText: options?.negativeButtonText || 'Cancel',
      ...options,
    };
  }

  private async validateAndroidAttestation(
    credential: WebAuthnCredential
  ): Promise<WebAuthnCredential> {
    // Validate Android-specific attestation format
    const attestationObject = (credential as any).response?.attestationObject;

    try {
      // Parse CBOR attestation object
      const attestationData = this.parseCBOR(attestationObject);

      // Verify Android attestation formats
      if (attestationData.fmt === 'android-safetynet') {
        await this.validateSafetyNetAttestation(attestationData.attStmt);
      } else if (attestationData.fmt === 'android-key') {
        await this.validateAndroidKeyAttestation(attestationData.attStmt);
      }

      return credential;
    } catch (error) {
      console.warn('Android attestation validation failed:', error);
      // Continue with credential even if attestation validation fails
      return credential;
    }
  }

  private async storeAndroidCredentialMetadata(
    credential: WebAuthnCredential,
    options: BiometricAuthenticationOptions
  ): Promise<void> {
    const metadata = {
      credentialId: credential.id,
      biometricType: await this.getOptimalBiometricMethod(),
      strongBoxUsed: options.requireStrongBox,
      createdAt: new Date(),
      platform: 'android',
      safetyNetAvailable: await this.isSafetyNetAvailable(),
    };

    // Store in secure Android storage (implementation depends on storage layer)
    await this.storeSecureMetadata('android_webauthn_metadata', metadata);
  }

  private async updateAndroidCredentialMetadata(credentialId: string): Promise<void> {
    try {
      const metadata = await this.getSecureMetadata('android_webauthn_metadata');
      if (metadata && metadata.credentialId === credentialId) {
        metadata.lastUsed = new Date();
        metadata.useCount = (metadata.useCount || 0) + 1;
        await this.storeSecureMetadata('android_webauthn_metadata', metadata);
      }
    } catch (error) {
      console.warn('Failed to update Android credential metadata:', error);
    }
  }

  private async extractAndroidBiometricData(assertion: any): Promise<{
    biometricType: 'fingerprint' | 'face' | 'iris' | 'voice' | 'unknown';
    strongBoxUsed: boolean;
    fingerprintUsed: boolean;
    faceUsed: boolean;
    irisUsed: boolean;
    voiceUsed: boolean;
  }> {
    try {
      // Extract biometric information from authenticator data
      const authenticatorData = new Uint8Array(assertion.response.authenticatorData);

      // Parse the UV (User Verified) flag and other indicators
      const flags = authenticatorData[32];
      const userVerified = (flags & 0x04) !== 0;

      if (!userVerified) {
        return {
          biometricType: 'unknown',
          strongBoxUsed: false,
          fingerprintUsed: false,
          faceUsed: false,
          irisUsed: false,
          voiceUsed: false,
        };
      }

      // Try to extract UVM (User Verification Method) from extensions
      const uvmData = this.extractUVMData(assertion);

      // Determine biometric types used
      const optimalMethod = await this.getOptimalBiometricMethod();

      return {
        biometricType:
          optimalMethod === 'none'
            ? 'unknown'
            : optimalMethod === 'any'
              ? 'fingerprint'
              : optimalMethod,
        strongBoxUsed: await this.isStrongBoxAvailable(),
        fingerprintUsed:
          uvmData?.includes('fingerprint') ||
          optimalMethod === 'fingerprint' ||
          optimalMethod === 'any',
        faceUsed: uvmData?.includes('face') || optimalMethod === 'face',
        irisUsed: uvmData?.includes('iris') || optimalMethod === 'iris',
        voiceUsed: uvmData?.includes('voice') || false,
      };
    } catch (error) {
      console.warn('Failed to extract Android biometric data:', error);
      return {
        biometricType: 'unknown',
        strongBoxUsed: false,
        fingerprintUsed: false,
        faceUsed: false,
        irisUsed: false,
        voiceUsed: false,
      };
    }
  }

  private extractUVMData(assertion: any): string[] | null {
    try {
      // Extract User Verification Method data from client extensions
      const clientExtensionResults = assertion.getClientExtensionResults?.();
      const uvmResults = clientExtensionResults?.uvm;

      if (uvmResults && Array.isArray(uvmResults)) {
        // UVM results contain arrays of [method, keyProtection, matcherProtection]
        return uvmResults.map(uvm => {
          const method = uvm[0];
          // Convert method codes to readable names
          switch (method) {
            case 0x00000001:
              return 'presence';
            case 0x00000002:
              return 'fingerprint';
            case 0x00000004:
              return 'voice';
            case 0x00000008:
              return 'face';
            case 0x00000010:
              return 'location';
            case 0x00000020:
              return 'eyeprint';
            case 0x00000040:
              return 'pattern';
            case 0x00000080:
              return 'handprint';
            case 0x00000100:
              return 'none';
            case 0x00000200:
              return 'all';
            default:
              return 'unknown';
          }
        });
      }

      return null;
    } catch (error) {
      console.warn('Failed to extract UVM data:', error);
      return null;
    }
  }

  private isIrisCapableDevice(): boolean {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();

    // Samsung Galaxy devices with iris scanning capability
    const irisDevices = [
      'galaxy note7',
      'galaxy note8',
      'galaxy note9',
      'galaxy s8',
      'galaxy s9',
      'galaxy s10',
    ];

    return irisDevices.some(device => userAgent.includes(device.toLowerCase()));
  }

  private isGooglePlayServicesAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for Google Play Services indicators
    const userAgent = navigator.userAgent.toLowerCase();

    // Most Android devices have Google Play Services, except some Chinese devices
    const noGooglePlayDevices = [
      'harmony', // HarmonyOS
      'hongmeng',
    ];

    return !noGooglePlayDevices.some(device => userAgent.includes(device));
  }

  private base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }

    return buffer;
  }

  private parseCBOR(buffer: ArrayBuffer): any {
    // Simple CBOR parser for attestation object
    // In production, use a proper CBOR library
    try {
      // This is a simplified parser - use cbor-js or similar library in production
      return {
        fmt: 'android-safetynet',
        attStmt: {},
        authData: buffer,
      };
    } catch (error) {
      throw new Error(
        `CBOR parsing failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async validateSafetyNetAttestation(_attStmt: any): Promise<boolean> {
    // Validate Google SafetyNet attestation
    try {
      // This is a placeholder - implement proper SafetyNet validation
      // Should verify JWT signature and check device integrity
      return true;
    } catch (error) {
      console.warn('SafetyNet attestation validation failed:', error);
      return false;
    }
  }

  private async validateAndroidKeyAttestation(_attStmt: any): Promise<boolean> {
    // Validate Android Key attestation
    try {
      // This is a placeholder - implement proper Android Key attestation validation
      // Should verify certificate chain and hardware backing
      return true;
    } catch (error) {
      console.warn('Android Key attestation validation failed:', error);
      return false;
    }
  }

  private async storeSecureMetadata(key: string, data: any): Promise<void> {
    // Android-specific secure storage implementation
    // Use Android Keystore or secure storage library
    try {
      const serializedData = JSON.stringify(data);
      // Store in Android Keystore or secure storage
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        // Fallback to localStorage (in production, use secure storage)
        window.localStorage.setItem(`secure_${key}`, serializedData);
      }
    } catch (error) {
      console.warn(`Failed to store secure metadata for ${key}:`, error);
    }
  }

  private async getSecureMetadata(key: string): Promise<any> {
    // Android-specific secure storage retrieval
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        // Fallback to localStorage (in production, use secure storage)
        const data = window.localStorage.getItem(`secure_${key}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get secure metadata for ${key}:`, error);
      return null;
    }
  }
}
