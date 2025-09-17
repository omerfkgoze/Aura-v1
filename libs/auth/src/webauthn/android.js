import { __awaiter } from 'tslib';
import { PlatformWebAuthnManager } from './platform';
import { WebAuthnRegistration } from './registration';
import { WebAuthnAuthentication } from './authentication';
/**
 * Android-specific WebAuthn implementation with biometric authentication
 * Provides hardware-backed authentication using Android StrongBox and biometric APIs
 */
export class AndroidWebAuthnManager {
  constructor(rpId, rpName) {
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
  isAndroidBiometricAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check for Android-specific biometric APIs
        const hasWebAuthn = this.platformManager.getPlatformCapabilities().supportsWebAuthn;
        const hasStrongBox = yield this.isStrongBoxAvailable();
        const hasBiometrics = yield this.isBiometricAuthenticationAvailable();
        return hasWebAuthn && (hasStrongBox || hasBiometrics);
      } catch (error) {
        console.warn('Android biometric availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Register a new WebAuthn credential with Android biometric authentication
   */
  registerWithAndroidBiometrics(userId, username, displayName, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const biometricOptions = this.getAndroidBiometricOptions(options);
      const registrationOptions = this.platformManager.getRegistrationOptionsForPlatform('android');
      // Enhanced Android-specific registration options
      const androidRegistrationOptions = Object.assign(Object.assign({}, registrationOptions), {
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName,
        },
        authenticatorSelection: Object.assign(
          Object.assign({}, registrationOptions.authenticatorSelection),
          {
            authenticatorAttachment: 'platform',
            requireResidentKey: true,
            residentKey: 'required',
            userVerification: 'required',
          }
        ),
        extensions: Object.assign(Object.assign({}, registrationOptions.extensions), {
          // Android-specific extensions
          credProps: true,
          uvm: true,
          // Request Android SafetyNet attestation
          attestationFormats: ['android-safetynet', 'android-key'],
        }),
        // Android-specific public key parameters
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256 (preferred for Android)
          { type: 'public-key', alg: -35 }, // ES384
          { type: 'public-key', alg: -257 }, // RS256 (fallback)
        ],
      });
      try {
        // Attempt WebAuthn registration with Android-specific options
        const registrationResponse = yield this.registrationManager.startRegistration(
          androidRegistrationOptions
        );
        const credential = {
          id: registrationResponse.id,
          userId: userId,
          credentialId: registrationResponse.id,
          publicKeyData: Object.assign(
            { kty: 2, alg: -7 },
            registrationResponse.response.publicKey && {
              rawData: registrationResponse.response.publicKey,
            }
          ),
          counter: 0,
          platform: 'android',
          createdAt: new Date(),
        };
        // Validate Android-specific attestation data
        const validatedCredential = yield this.validateAndroidAttestation(credential);
        // Store credential metadata for Android-specific features
        yield this.storeAndroidCredentialMetadata(validatedCredential, biometricOptions);
        return validatedCredential;
      } catch (error) {
        throw new Error(
          `Android WebAuthn registration failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
  /**
   * Authenticate using Android biometric authentication
   */
  authenticateWithAndroidBiometrics(credentialIds, options) {
    return __awaiter(this, void 0, void 0, function* () {
      this.getAndroidBiometricOptions(options);
      const authenticationOptions =
        this.platformManager.getAuthenticationOptionsForPlatform('android');
      // Enhanced Android-specific authentication options
      const androidAuthenticationOptions = Object.assign(Object.assign({}, authenticationOptions), {
        allowCredentials:
          credentialIds === null || credentialIds === void 0
            ? void 0
            : credentialIds.map(id => ({
                type: 'public-key',
                id: this.base64UrlToArrayBuffer(id),
                transports: ['internal'], // Android internal authenticator
              })),
        extensions: Object.assign(Object.assign({}, authenticationOptions.extensions), {
          // Android-specific extensions for biometric data
          uvm: true,
          appid: undefined,
        }),
        userVerification: 'required',
      });
      try {
        const assertion = yield this.authenticationManager.startAuthentication(
          androidAuthenticationOptions
        );
        // Extract Android-specific biometric information
        const biometricResult = yield this.extractAndroidBiometricData(assertion);
        // Update credential usage counter and metadata
        yield this.updateAndroidCredentialMetadata(assertion.id);
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
    });
  }
  /**
   * Check if Android StrongBox is available on the device
   */
  isStrongBoxAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
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
          (yield PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
        );
      } catch (error) {
        console.warn('StrongBox availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Check if biometric authentication is available
   */
  isBiometricAuthenticationAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
  }
  /**
   * Get fingerprint scanner availability status
   */
  isFingerprintAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isBiometricAvailable = yield this.isBiometricAuthenticationAvailable();
        if (!isBiometricAvailable) return false;
        // Check Android version (fingerprint available on Android 6+)
        const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](6);
        // Most Android devices have fingerprint scanners
        return isAndroidSupported;
      } catch (error) {
        console.warn('Fingerprint availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get face unlock availability status
   */
  isFaceUnlockAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isBiometricAvailable = yield this.isBiometricAuthenticationAvailable();
        if (!isBiometricAvailable) return false;
        // Check Android version (face unlock available on Android 10+)
        const isAndroidSupported = this.platformManager['isAndroidVersionSupported'](10);
        return isAndroidSupported;
      } catch (error) {
        console.warn('Face unlock availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get iris scanner availability status
   */
  isIrisAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isBiometricAvailable = yield this.isBiometricAuthenticationAvailable();
        if (!isBiometricAvailable) return false;
        // Iris scanning is available on specific devices (Samsung Galaxy series)
        const isIrisDevice = this.isIrisCapableDevice();
        return isIrisDevice;
      } catch (error) {
        console.warn('Iris scanner availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get optimal biometric authentication method for the device
   */
  getOptimalBiometricMethod() {
    return __awaiter(this, void 0, void 0, function* () {
      const fingerprintAvailable = yield this.isFingerprintAvailable();
      const faceAvailable = yield this.isFaceUnlockAvailable();
      const irisAvailable = yield this.isIrisAvailable();
      if (fingerprintAvailable && faceAvailable && irisAvailable) return 'any';
      if (fingerprintAvailable && faceAvailable) return 'any';
      if (fingerprintAvailable) return 'fingerprint';
      if (faceAvailable) return 'face';
      if (irisAvailable) return 'iris';
      return 'none';
    });
  }
  /**
   * Check SafetyNet availability
   */
  isSafetyNetAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check for Google Play Services availability
        if (typeof window === 'undefined') return false;
        // SafetyNet requires Google Play Services
        return this.isGooglePlayServicesAvailable();
      } catch (error) {
        console.warn('SafetyNet availability check failed:', error);
        return false;
      }
    });
  }
  getAndroidBiometricOptions(options) {
    var _a, _b, _c;
    return Object.assign(
      {
        preferredBiometric:
          (options === null || options === void 0 ? void 0 : options.preferredBiometric) || 'any',
        requireStrongBox:
          (_a = options === null || options === void 0 ? void 0 : options.requireStrongBox) !==
            null && _a !== void 0
            ? _a
            : true,
        allowFallback:
          (_b = options === null || options === void 0 ? void 0 : options.allowFallback) !== null &&
          _b !== void 0
            ? _b
            : true,
        confirmationRequired:
          (_c = options === null || options === void 0 ? void 0 : options.confirmationRequired) !==
            null && _c !== void 0
            ? _c
            : true,
        localizedPrompt:
          (options === null || options === void 0 ? void 0 : options.localizedPrompt) ||
          'Authenticate with biometrics',
        negativeButtonText:
          (options === null || options === void 0 ? void 0 : options.negativeButtonText) ||
          'Cancel',
      },
      options
    );
  }
  validateAndroidAttestation(credential) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      // Validate Android-specific attestation format
      const attestationObject =
        (_a = credential.response) === null || _a === void 0 ? void 0 : _a.attestationObject;
      try {
        // Parse CBOR attestation object
        const attestationData = this.parseCBOR(attestationObject);
        // Verify Android attestation formats
        if (attestationData.fmt === 'android-safetynet') {
          yield this.validateSafetyNetAttestation(attestationData.attStmt);
        } else if (attestationData.fmt === 'android-key') {
          yield this.validateAndroidKeyAttestation(attestationData.attStmt);
        }
        return credential;
      } catch (error) {
        console.warn('Android attestation validation failed:', error);
        // Continue with credential even if attestation validation fails
        return credential;
      }
    });
  }
  storeAndroidCredentialMetadata(credential, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const metadata = {
        credentialId: credential.id,
        biometricType: yield this.getOptimalBiometricMethod(),
        strongBoxUsed: options.requireStrongBox,
        createdAt: new Date(),
        platform: 'android',
        safetyNetAvailable: yield this.isSafetyNetAvailable(),
      };
      // Store in secure Android storage (implementation depends on storage layer)
      yield this.storeSecureMetadata('android_webauthn_metadata', metadata);
    });
  }
  updateAndroidCredentialMetadata(credentialId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const metadata = yield this.getSecureMetadata('android_webauthn_metadata');
        if (metadata && metadata.credentialId === credentialId) {
          metadata.lastUsed = new Date();
          metadata.useCount = (metadata.useCount || 0) + 1;
          yield this.storeSecureMetadata('android_webauthn_metadata', metadata);
        }
      } catch (error) {
        console.warn('Failed to update Android credential metadata:', error);
      }
    });
  }
  extractAndroidBiometricData(assertion) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const optimalMethod = yield this.getOptimalBiometricMethod();
        return {
          biometricType:
            optimalMethod === 'none'
              ? 'unknown'
              : optimalMethod === 'any'
                ? 'fingerprint'
                : optimalMethod,
          strongBoxUsed: yield this.isStrongBoxAvailable(),
          fingerprintUsed:
            (uvmData === null || uvmData === void 0 ? void 0 : uvmData.includes('fingerprint')) ||
            optimalMethod === 'fingerprint' ||
            optimalMethod === 'any',
          faceUsed:
            (uvmData === null || uvmData === void 0 ? void 0 : uvmData.includes('face')) ||
            optimalMethod === 'face',
          irisUsed:
            (uvmData === null || uvmData === void 0 ? void 0 : uvmData.includes('iris')) ||
            optimalMethod === 'iris',
          voiceUsed:
            (uvmData === null || uvmData === void 0 ? void 0 : uvmData.includes('voice')) || false,
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
    });
  }
  extractUVMData(assertion) {
    var _a;
    try {
      // Extract User Verification Method data from client extensions
      const clientExtensionResults =
        (_a = assertion.getClientExtensionResults) === null || _a === void 0
          ? void 0
          : _a.call(assertion);
      const uvmResults =
        clientExtensionResults === null || clientExtensionResults === void 0
          ? void 0
          : clientExtensionResults.uvm;
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
  isIrisCapableDevice() {
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
  isGooglePlayServicesAvailable() {
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
  base64UrlToArrayBuffer(base64Url) {
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
  parseCBOR(buffer) {
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
  validateSafetyNetAttestation(_attStmt) {
    return __awaiter(this, void 0, void 0, function* () {
      // Validate Google SafetyNet attestation
      try {
        // This is a placeholder - implement proper SafetyNet validation
        // Should verify JWT signature and check device integrity
        return true;
      } catch (error) {
        console.warn('SafetyNet attestation validation failed:', error);
        return false;
      }
    });
  }
  validateAndroidKeyAttestation(_attStmt) {
    return __awaiter(this, void 0, void 0, function* () {
      // Validate Android Key attestation
      try {
        // This is a placeholder - implement proper Android Key attestation validation
        // Should verify certificate chain and hardware backing
        return true;
      } catch (error) {
        console.warn('Android Key attestation validation failed:', error);
        return false;
      }
    });
  }
  storeSecureMetadata(key, data) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
  }
  getSecureMetadata(key) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
  }
}
//# sourceMappingURL=android.js.map
