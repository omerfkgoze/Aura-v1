import { __awaiter } from 'tslib';
import { IOSWebAuthnManager } from './ios';
import { AndroidWebAuthnManager } from './android';
import { WebWebAuthnManager } from './web';
/**
 * Cross-platform detection and capability checking system
 * Provides comprehensive platform detection and feature availability assessment
 */
export class PlatformDetectionManager {
  constructor(rpId, rpName) {
    // Initialize platform-specific managers
    this.iosManager = new IOSWebAuthnManager(rpId, rpName);
    this.androidManager = new AndroidWebAuthnManager(rpId, rpName);
    this.webManager = new WebWebAuthnManager(rpId, rpName);
  }
  /**
   * Detect current platform with enhanced accuracy
   */
  detectPlatform() {
    var _a, _b;
    if (typeof navigator === 'undefined') {
      return 'web'; // Server-side default
    }
    const userAgent = navigator.userAgent.toLowerCase();
    const platform =
      ((_a = navigator.platform) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const vendor =
      ((_b = navigator.vendor) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
    // iOS detection with enhanced checks
    if (this.isIOSDevice(userAgent, platform, vendor)) {
      return 'ios';
    }
    // Android detection with enhanced checks
    if (this.isAndroidDevice(userAgent, platform, vendor)) {
      return 'android';
    }
    // Default to web for all other platforms
    return 'web';
  }
  /**
   * Comprehensive platform capability assessment
   */
  detectPlatformCapabilities(platform) {
    return __awaiter(this, void 0, void 0, function* () {
      const detectedPlatform = platform || this.detectPlatform();
      try {
        let capabilities;
        let fallbackOptions = [];
        switch (detectedPlatform) {
          case 'ios':
            capabilities = yield this.getIOSCapabilities();
            fallbackOptions = yield this.getIOSFallbacks();
            break;
          case 'android':
            capabilities = yield this.getAndroidCapabilities();
            fallbackOptions = yield this.getAndroidFallbacks();
            break;
          case 'web':
            capabilities = yield this.getWebCapabilities();
            fallbackOptions = yield this.getWebFallbacks();
            break;
          default:
            capabilities = this.getUnsupportedCapabilities();
            fallbackOptions = ['opaque-password'];
        }
        return {
          platform: detectedPlatform,
          isSupported: capabilities.supportsWebAuthn || capabilities.supportsBiometrics,
          capabilities: {
            webAuthn: capabilities.supportsWebAuthn,
            passkeys: capabilities.supportsPasskeys,
            biometrics: capabilities.supportsBiometrics,
            hardwareBacked: yield this.isHardwareBacked(detectedPlatform),
          },
          fallbackOptions,
        };
      } catch (error) {
        console.warn('Platform capability detection failed:', error);
        return this.getFallbackDetectionResult(detectedPlatform);
      }
    });
  }
  /**
   * Check if current environment supports WebAuthn at all
   */
  isWebAuthnAvailable() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
      const platform = this.detectPlatform();
      switch (platform) {
        case 'ios':
          return (
            ((_a = this.iosManager) === null || _a === void 0
              ? void 0
              : _a.isIOSBiometricAvailable()) || false
          );
        case 'android':
          return (
            ((_b = this.androidManager) === null || _b === void 0
              ? void 0
              : _b.isAndroidBiometricAvailable()) || false
          );
        case 'web':
          return (
            ((_c = this.webManager) === null || _c === void 0
              ? void 0
              : _c.isWebAuthnSupported()) || false
          );
        default:
          return false;
      }
    });
  }
  /**
   * Get optimal authentication methods for current platform
   */
  getOptimalAuthMethods() {
    return __awaiter(this, void 0, void 0, function* () {
      const platform = this.detectPlatform();
      const capabilities = yield this.detectPlatformCapabilities(platform);
      if (!capabilities.isSupported) {
        return {
          primary: [],
          secondary: ['opaque-password'],
          fallback: ['recovery-phrase', 'email-reset'],
        };
      }
      switch (platform) {
        case 'ios':
          return this.getIOSOptimalMethods(capabilities);
        case 'android':
          return this.getAndroidOptimalMethods(capabilities);
        case 'web':
          return this.getWebOptimalMethods(capabilities);
        default:
          return {
            primary: [],
            secondary: ['opaque-password'],
            fallback: ['recovery-phrase'],
          };
      }
    });
  }
  /**
   * Check hardware security backing availability
   */
  isHardwareBacked(platform) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
      const detectedPlatform = platform || this.detectPlatform();
      try {
        switch (detectedPlatform) {
          case 'ios':
            return (
              ((_a = this.iosManager) === null || _a === void 0
                ? void 0
                : _a.isSecureEnclaveAvailable()) || false
            );
          case 'android':
            return (
              ((_b = this.androidManager) === null || _b === void 0
                ? void 0
                : _b.isStrongBoxAvailable()) || false
            );
          case 'web':
            return (
              ((_c = this.webManager) === null || _c === void 0
                ? void 0
                : _c.isPlatformAuthenticatorAvailable()) || false
            );
          default:
            return false;
        }
      } catch (error) {
        console.warn('Hardware backing check failed:', error);
        return false;
      }
    });
  }
  /**
   * Get device-specific security features
   */
  getSecurityFeatures() {
    return __awaiter(this, void 0, void 0, function* () {
      const platform = this.detectPlatform();
      switch (platform) {
        case 'ios':
          return this.getIOSSecurityFeatures();
        case 'android':
          return this.getAndroidSecurityFeatures();
        case 'web':
          return this.getWebSecurityFeatures();
        default:
          return {
            hardwareBacked: false,
            biometricTypes: [],
            attestationSupport: false,
            secureStorage: false,
            tamperDetection: false,
          };
      }
    });
  }
  isIOSDevice(userAgent, platform, vendor) {
    // Enhanced iOS detection
    const iosIndicators = [/iphone/, /ipad/, /ipod/, /macintosh.*mobile/];
    const platformIndicators = [/iphone/, /ipad/, /ipod/];
    const vendorIndicators = [/apple/];
    // Check user agent
    if (iosIndicators.some(pattern => pattern.test(userAgent))) return true;
    // Check platform
    if (platformIndicators.some(pattern => pattern.test(platform))) return true;
    // Check vendor for macOS Safari mobile mode
    if (vendorIndicators.some(pattern => pattern.test(vendor)) && /mobile/.test(userAgent))
      return true;
    // Check for iOS-specific APIs
    if (typeof window !== 'undefined') {
      // Check for iOS-specific objects
      if ('MSStream' in window || 'safari' in window) {
        if (/mobile/.test(userAgent)) return true;
      }
    }
    return false;
  }
  isAndroidDevice(userAgent, platform, _vendor) {
    // Enhanced Android detection
    const androidIndicators = [/android/, /linux.*mobile/, /mobile.*linux/];
    const platformIndicators = [/android/, /linux arm/];
    // Check user agent
    if (androidIndicators.some(pattern => pattern.test(userAgent))) return true;
    // Check platform
    if (platformIndicators.some(pattern => pattern.test(platform))) return true;
    // Check for Android-specific APIs
    if (typeof window !== 'undefined') {
      // Check for Android WebView
      if (userAgent.includes('wv') && userAgent.includes('chrome')) return true;
    }
    return false;
  }
  getIOSCapabilities() {
    return __awaiter(this, void 0, void 0, function* () {
      const iosManager = this.iosManager;
      return {
        supportsWebAuthn: yield iosManager.isIOSBiometricAvailable(),
        supportsPasskeys: yield iosManager.isSecureEnclaveAvailable(),
        supportsBiometrics:
          (yield iosManager.isFaceIdAvailable()) || (yield iosManager.isTouchIdAvailable()),
        platform: 'ios',
      };
    });
  }
  getAndroidCapabilities() {
    return __awaiter(this, void 0, void 0, function* () {
      const androidManager = this.androidManager;
      return {
        supportsWebAuthn: yield androidManager.isAndroidBiometricAvailable(),
        supportsPasskeys: yield androidManager.isStrongBoxAvailable(),
        supportsBiometrics: yield androidManager.isBiometricAuthenticationAvailable(),
        platform: 'android',
      };
    });
  }
  getWebCapabilities() {
    return __awaiter(this, void 0, void 0, function* () {
      const webManager = this.webManager;
      return {
        supportsWebAuthn: yield webManager.isWebAuthnSupported(),
        supportsPasskeys: yield webManager.isConditionalMediationSupported(),
        supportsBiometrics: yield webManager.isPlatformAuthenticatorAvailable(),
        platform: 'web',
      };
    });
  }
  getUnsupportedCapabilities() {
    return {
      supportsWebAuthn: false,
      supportsPasskeys: false,
      supportsBiometrics: false,
      platform: 'web',
    };
  }
  getIOSFallbacks() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const fallbacks = ['opaque-password'];
      if (
        yield (_a = this.iosManager) === null || _a === void 0
          ? void 0
          : _a.isSecureEnclaveAvailable()
      ) {
        fallbacks.unshift('webauthn-platform');
      }
      return fallbacks;
    });
  }
  getAndroidFallbacks() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const fallbacks = ['opaque-password'];
      if (
        yield (_a = this.androidManager) === null || _a === void 0
          ? void 0
          : _a.isStrongBoxAvailable()
      ) {
        fallbacks.unshift('webauthn-platform');
      } else if (
        yield (_b = this.androidManager) === null || _b === void 0
          ? void 0
          : _b.isBiometricAuthenticationAvailable()
      ) {
        fallbacks.unshift('webauthn-basic');
      }
      return fallbacks;
    });
  }
  getWebFallbacks() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      const fallbacks = ['opaque-password'];
      if (
        yield (_a = this.webManager) === null || _a === void 0
          ? void 0
          : _a.isPlatformAuthenticatorAvailable()
      ) {
        fallbacks.unshift('webauthn-platform');
      } else if (
        yield (_b = this.webManager) === null || _b === void 0 ? void 0 : _b.isWebAuthnSupported()
      ) {
        fallbacks.unshift('webauthn-roaming');
      }
      return fallbacks;
    });
  }
  getIOSOptimalMethods(capabilities) {
    const methods = {
      primary: [],
      secondary: [],
      fallback: ['recovery-phrase', 'emergency-code'],
    };
    if (capabilities.capabilities.passkeys) {
      methods.primary.push('passkeys-faceid', 'passkeys-touchid');
    }
    if (capabilities.capabilities.webAuthn) {
      methods.secondary.push('webauthn-platform');
    }
    methods.secondary.push('opaque-password');
    return methods;
  }
  getAndroidOptimalMethods(capabilities) {
    const methods = {
      primary: [],
      secondary: [],
      fallback: ['recovery-phrase', 'emergency-code'],
    };
    if (capabilities.capabilities.passkeys) {
      methods.primary.push('passkeys-fingerprint', 'passkeys-face', 'passkeys-iris');
    }
    if (capabilities.capabilities.webAuthn) {
      methods.secondary.push('webauthn-platform');
    }
    methods.secondary.push('opaque-password');
    return methods;
  }
  getWebOptimalMethods(capabilities) {
    const methods = {
      primary: [],
      secondary: [],
      fallback: ['recovery-phrase', 'emergency-code'],
    };
    if (capabilities.capabilities.passkeys) {
      methods.primary.push('passkeys-platform');
    }
    if (capabilities.capabilities.webAuthn) {
      methods.primary.push('webauthn-platform');
      methods.secondary.push('webauthn-roaming');
    }
    methods.secondary.push('opaque-password');
    return methods;
  }
  getIOSSecurityFeatures() {
    return __awaiter(this, void 0, void 0, function* () {
      const iosManager = this.iosManager;
      const biometricTypes = [];
      if (yield iosManager.isFaceIdAvailable()) biometricTypes.push('faceId');
      if (yield iosManager.isTouchIdAvailable()) biometricTypes.push('touchId');
      return {
        hardwareBacked: yield iosManager.isSecureEnclaveAvailable(),
        biometricTypes,
        attestationSupport: true, // iOS supports Apple attestation
        secureStorage: true, // iOS Keychain
        tamperDetection: true, // iOS secure boot chain
      };
    });
  }
  getAndroidSecurityFeatures() {
    return __awaiter(this, void 0, void 0, function* () {
      const androidManager = this.androidManager;
      const biometricTypes = [];
      if (yield androidManager.isFingerprintAvailable()) biometricTypes.push('fingerprint');
      if (yield androidManager.isFaceUnlockAvailable()) biometricTypes.push('face');
      if (yield androidManager.isIrisAvailable()) biometricTypes.push('iris');
      return {
        hardwareBacked: yield androidManager.isStrongBoxAvailable(),
        biometricTypes,
        attestationSupport: yield androidManager.isSafetyNetAvailable(),
        secureStorage: true, // Android Keystore
        tamperDetection: yield androidManager.isSafetyNetAvailable(),
      };
    });
  }
  getWebSecurityFeatures() {
    return __awaiter(this, void 0, void 0, function* () {
      const webManager = this.webManager;
      const features = yield webManager.getWebAuthnFeatures();
      return {
        hardwareBacked: features.platformAuthenticator,
        biometricTypes: features.platformAuthenticator ? ['platform'] : [],
        attestationSupport: false, // Limited for web
        secureStorage: false, // Limited for web
        tamperDetection: false, // Limited for web
      };
    });
  }
  getFallbackDetectionResult(platform) {
    return {
      platform,
      isSupported: false,
      capabilities: {
        webAuthn: false,
        passkeys: false,
        biometrics: false,
        hardwareBacked: false,
      },
      fallbackOptions: ['opaque-password', 'recovery-phrase'],
    };
  }
}
//# sourceMappingURL=detection.js.map
