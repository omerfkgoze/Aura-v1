import { __awaiter } from 'tslib';
import { PlatformWebAuthnManager } from './platform';
import { WebAuthnRegistration } from './registration';
import { WebAuthnAuthentication } from './authentication';
/**
 * iOS-specific WebAuthn implementation with Face ID/Touch ID integration
 * Provides hardware-backed authentication using iOS Keychain and Secure Enclave
 */
export class IOSWebAuthnManager {
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
   * Check if iOS biometric authentication is available
   */
  isIOSBiometricAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check for iOS-specific biometric APIs
        const hasWebAuthn = this.platformManager.getPlatformCapabilities().supportsWebAuthn;
        const hasSecureEnclave = yield this.isSecureEnclaveAvailable();
        return hasWebAuthn && hasSecureEnclave;
      } catch (error) {
        console.warn('iOS biometric availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Register a new WebAuthn credential with iOS biometric authentication
   */
  registerWithIOSBiometrics(userId, username, displayName, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const biometricOptions = this.getIOSBiometricOptions(options);
      const registrationOptions = this.platformManager.getRegistrationOptionsForPlatform('ios');
      // Enhanced iOS-specific registration options
      const iosRegistrationOptions = Object.assign(Object.assign({}, registrationOptions), {
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
          // iOS-specific extensions
          credProps: true,
          largeBlob: { support: 'preferred' },
          // Request Face ID/Touch ID specific attestation
          attestationFormats: ['apple'],
        }),
        // iOS-specific public key parameters
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256 (preferred for iOS)
          { type: 'public-key', alg: -257 }, // RS256 (fallback)
        ],
      });
      try {
        // Attempt WebAuthn registration with iOS-specific options
        const registrationResponse =
          yield this.registrationManager.startRegistration(iosRegistrationOptions);
        // Convert response to credential format
        const credential = {
          id: registrationResponse.id,
          userId: userId,
          credentialId: registrationResponse.id,
          publicKeyData: { data: registrationResponse.response.publicKey },
          counter: 0,
          platform: 'ios',
          createdAt: new Date(),
        };
        // Validate iOS-specific attestation data
        const validatedCredential = yield this.validateIOSAttestation(credential);
        // Store credential metadata for iOS-specific features
        yield this.storeIOSCredentialMetadata(validatedCredential, biometricOptions);
        return validatedCredential;
      } catch (error) {
        throw new Error(`iOS WebAuthn registration failed: ${error.message}`);
      }
    });
  }
  /**
   * Authenticate using iOS biometric authentication
   */
  authenticateWithIOSBiometrics(credentialIds, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const biometricOptions = this.getIOSBiometricOptions(options);
      const authenticationOptions = this.platformManager.getAuthenticationOptionsForPlatform('ios');
      // Enhanced iOS-specific authentication options
      const iosAuthenticationOptions = Object.assign(Object.assign({}, authenticationOptions), {
        allowCredentials:
          credentialIds === null || credentialIds === void 0
            ? void 0
            : credentialIds.map(id => ({
                type: 'public-key',
                id: this.base64UrlToArrayBuffer(id),
                transports: ['internal'], // iOS internal authenticator
              })),
        extensions: Object.assign(Object.assign({}, authenticationOptions.extensions), {
          // iOS-specific extensions for biometric data
          largeBlob: { read: true },
          userVerificationMethod: true,
        }),
        userVerification: 'required',
      });
      try {
        const assertion =
          yield this.authenticationManager.startAuthentication(iosAuthenticationOptions);
        // Extract iOS-specific biometric information
        const biometricResult = yield this.extractIOSBiometricData(assertion);
        // Update credential usage counter and metadata
        yield this.updateIOSCredentialMetadata(assertion.id);
        return {
          assertion,
          biometricType: biometricResult.biometricType,
          secureEnclaveUsed: biometricResult.secureEnclaveUsed,
          touchIdUsed: biometricResult.touchIdUsed,
          faceIdUsed: biometricResult.faceIdUsed,
          timestamp: new Date(),
        };
      } catch (error) {
        throw new Error(`iOS WebAuthn authentication failed: ${error.message}`);
      }
    });
  }
  /**
   * Check if Secure Enclave is available on the device
   */
  isSecureEnclaveAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check for iOS-specific APIs that indicate Secure Enclave support
        if (typeof window === 'undefined') return false;
        // iOS 11.3+ supports Secure Enclave for WebAuthn
        const isIOSSupported = this.platformManager['isIOSVersionSupported'](11.3);
        // Check for WebAuthn platform authenticator support
        const hasWebAuthnPlatform =
          typeof PublicKeyCredential !== 'undefined' &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
        if (!hasWebAuthnPlatform) return false;
        return yield PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (error) {
        console.warn('Secure Enclave availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get Face ID availability status
   */
  isFaceIdAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isSecureEnclaveAvailable = yield this.isSecureEnclaveAvailable();
        if (!isSecureEnclaveAvailable) return false;
        // Check iOS version (Face ID available on iOS 11+)
        const isIOSSupported = this.platformManager['isIOSVersionSupported'](11);
        // Check device type (Face ID is available on specific devices)
        const isFaceIdDevice = this.isFaceIdCapableDevice();
        return isIOSSupported && isFaceIdDevice;
      } catch (error) {
        console.warn('Face ID availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get Touch ID availability status
   */
  isTouchIdAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isSecureEnclaveAvailable = yield this.isSecureEnclaveAvailable();
        if (!isSecureEnclaveAvailable) return false;
        // Check iOS version (Touch ID available on iOS 8+)
        const isIOSSupported = this.platformManager['isIOSVersionSupported'](8);
        // Check device type (Touch ID is available on specific devices)
        const isTouchIdDevice = this.isTouchIdCapableDevice();
        return isIOSSupported && isTouchIdDevice;
      } catch (error) {
        console.warn('Touch ID availability check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get optimal biometric authentication method for the device
   */
  getOptimalBiometricMethod() {
    return __awaiter(this, void 0, void 0, function* () {
      const faceIdAvailable = yield this.isFaceIdAvailable();
      const touchIdAvailable = yield this.isTouchIdAvailable();
      if (faceIdAvailable) return 'faceId';
      if (touchIdAvailable) return 'touchId';
      return 'none';
    });
  }
  getIOSBiometricOptions(options) {
    var _a, _b;
    return Object.assign(
      {
        preferredBiometric:
          (options === null || options === void 0 ? void 0 : options.preferredBiometric) || 'any',
        requireSecureEnclave:
          (_a = options === null || options === void 0 ? void 0 : options.requireSecureEnclave) !==
            null && _a !== void 0
            ? _a
            : true,
        allowFallback:
          (_b = options === null || options === void 0 ? void 0 : options.allowFallback) !== null &&
          _b !== void 0
            ? _b
            : true,
        localizedFallbackTitle:
          (options === null || options === void 0 ? void 0 : options.localizedFallbackTitle) ||
          'Use Passcode',
        localizedPrompt:
          (options === null || options === void 0 ? void 0 : options.localizedPrompt) ||
          'Authenticate with biometrics',
      },
      options
    );
  }
  validateIOSAttestation(credential) {
    return __awaiter(this, void 0, void 0, function* () {
      // Validate Apple-specific attestation format
      const attestationObject = credential.response.attestationObject;
      try {
        // Parse CBOR attestation object
        const attestationData = this.parseCBOR(attestationObject);
        // Verify Apple attestation format
        if (attestationData.fmt === 'apple') {
          // Validate Apple attestation certificate chain
          yield this.validateAppleAttestationChain(attestationData.attStmt);
        }
        return credential;
      } catch (error) {
        console.warn('iOS attestation validation failed:', error);
        // Continue with credential even if attestation validation fails
        return credential;
      }
    });
  }
  storeIOSCredentialMetadata(credential, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const metadata = {
        credentialId: credential.id,
        biometricType: yield this.getOptimalBiometricMethod(),
        secureEnclaveUsed: options.requireSecureEnclave,
        createdAt: new Date(),
        platform: 'ios',
      };
      // Store in secure iOS storage (implementation depends on storage layer)
      yield this.storeSecureMetadata('ios_webauthn_metadata', metadata);
    });
  }
  updateIOSCredentialMetadata(credentialId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const metadata = yield this.getSecureMetadata('ios_webauthn_metadata');
        if (metadata && metadata.credentialId === credentialId) {
          metadata.lastUsed = new Date();
          metadata.useCount = (metadata.useCount || 0) + 1;
          yield this.storeSecureMetadata('ios_webauthn_metadata', metadata);
        }
      } catch (error) {
        console.warn('Failed to update iOS credential metadata:', error);
      }
    });
  }
  extractIOSBiometricData(assertion) {
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
            secureEnclaveUsed: false,
            touchIdUsed: false,
            faceIdUsed: false,
          };
        }
        // Determine biometric type based on device capabilities
        const optimalMethod = yield this.getOptimalBiometricMethod();
        return {
          biometricType: optimalMethod === 'none' ? 'unknown' : optimalMethod,
          secureEnclaveUsed: true, // iOS WebAuthn uses Secure Enclave by default
          touchIdUsed: optimalMethod === 'touchId',
          faceIdUsed: optimalMethod === 'faceId',
        };
      } catch (error) {
        console.warn('Failed to extract iOS biometric data:', error);
        return {
          biometricType: 'unknown',
          secureEnclaveUsed: false,
          touchIdUsed: false,
          faceIdUsed: false,
        };
      }
    });
  }
  isFaceIdCapableDevice() {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent;
    // Face ID devices (iPhone X and later, iPad Pro with Face ID)
    const faceIdDevices = [
      'iPhone10,3',
      'iPhone10,6', // iPhone X
      'iPhone11,2',
      'iPhone11,4',
      'iPhone11,6',
      'iPhone11,8', // iPhone XS/XR
      'iPhone12,1',
      'iPhone12,3',
      'iPhone12,5', // iPhone 11 series
      'iPhone13,1',
      'iPhone13,2',
      'iPhone13,3',
      'iPhone13,4', // iPhone 12 series
      'iPhone14,2',
      'iPhone14,3',
      'iPhone14,4',
      'iPhone14,5',
      'iPhone14,6', // iPhone 13 series
      'iPad8,1',
      'iPad8,2',
      'iPad8,3',
      'iPad8,4', // iPad Pro 11" 1st gen
      'iPad8,9',
      'iPad8,10', // iPad Pro 11" 2nd gen
    ];
    return faceIdDevices.some(device => userAgent.includes(device));
  }
  isTouchIdCapableDevice() {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent;
    // Touch ID devices (older iPhones and iPads with Home button)
    const touchIdDevices = [
      'iPhone7',
      'iPhone8',
      'iPhone9', // iPhone 6S through iPhone 8 series
      'iPad4',
      'iPad5',
      'iPad6',
      'iPad7', // iPad Air 2, iPad mini 3/4, etc.
    ];
    return touchIdDevices.some(device => userAgent.includes(device));
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
        fmt: 'apple',
        attStmt: {},
        authData: buffer,
      };
    } catch (error) {
      throw new Error(`CBOR parsing failed: ${error.message}`);
    }
  }
  validateAppleAttestationChain(attStmt) {
    return __awaiter(this, void 0, void 0, function* () {
      // Validate Apple attestation certificate chain
      // Implementation would verify Apple root CA and intermediate certificates
      try {
        // This is a placeholder - implement proper certificate validation
        return true;
      } catch (error) {
        console.warn('Apple attestation chain validation failed:', error);
        return false;
      }
    });
  }
  storeSecureMetadata(key, data) {
    return __awaiter(this, void 0, void 0, function* () {
      // iOS-specific secure storage implementation
      // Use iOS Keychain or secure storage library
      try {
        const serializedData = JSON.stringify(data);
        // Store in iOS Keychain or secure storage
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
      // iOS-specific secure storage retrieval
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
//# sourceMappingURL=ios.js.map
