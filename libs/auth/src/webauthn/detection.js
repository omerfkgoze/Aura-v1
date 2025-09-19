import { IOSWebAuthnManager } from './ios';
import { AndroidWebAuthnManager } from './android';
import { WebWebAuthnManager } from './web';
/**
 * Cross-platform detection and capability checking system
 * Provides comprehensive platform detection and feature availability assessment
 */
export class PlatformDetectionManager {
  iosManager;
  androidManager;
  webManager;
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
    if (typeof navigator === 'undefined') {
      return 'web'; // Server-side default
    }
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    const vendor = navigator.vendor?.toLowerCase() || '';
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
  async detectPlatformCapabilities(platform) {
    const detectedPlatform = platform || this.detectPlatform();
    try {
      let capabilities;
      let fallbackOptions = [];
      switch (detectedPlatform) {
        case 'ios':
          capabilities = await this.getIOSCapabilities();
          fallbackOptions = await this.getIOSFallbacks();
          break;
        case 'android':
          capabilities = await this.getAndroidCapabilities();
          fallbackOptions = await this.getAndroidFallbacks();
          break;
        case 'web':
          capabilities = await this.getWebCapabilities();
          fallbackOptions = await this.getWebFallbacks();
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
          hardwareBacked: await this.isHardwareBacked(detectedPlatform),
        },
        fallbackOptions,
      };
    } catch (error) {
      console.warn('Platform capability detection failed:', error);
      return this.getFallbackDetectionResult(detectedPlatform);
    }
  }
  /**
   * Check if current environment supports WebAuthn at all
   */
  async isWebAuthnAvailable() {
    const platform = this.detectPlatform();
    switch (platform) {
      case 'ios':
        return this.iosManager?.isIOSBiometricAvailable() || false;
      case 'android':
        return this.androidManager?.isAndroidBiometricAvailable() || false;
      case 'web':
        return this.webManager?.isWebAuthnSupported() || false;
      default:
        return false;
    }
  }
  /**
   * Get optimal authentication methods for current platform
   */
  async getOptimalAuthMethods() {
    const platform = this.detectPlatform();
    const capabilities = await this.detectPlatformCapabilities(platform);
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
  }
  /**
   * Check hardware security backing availability
   */
  async isHardwareBacked(platform) {
    const detectedPlatform = platform || this.detectPlatform();
    try {
      switch (detectedPlatform) {
        case 'ios':
          return this.iosManager?.isSecureEnclaveAvailable() || false;
        case 'android':
          return this.androidManager?.isStrongBoxAvailable() || false;
        case 'web':
          return this.webManager?.isPlatformAuthenticatorAvailable() || false;
        default:
          return false;
      }
    } catch (error) {
      console.warn('Hardware backing check failed:', error);
      return false;
    }
  }
  /**
   * Get device-specific security features
   */
  async getSecurityFeatures() {
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
  async getIOSCapabilities() {
    const iosManager = this.iosManager;
    return {
      supportsWebAuthn: await iosManager.isIOSBiometricAvailable(),
      supportsPasskeys: await iosManager.isSecureEnclaveAvailable(),
      supportsBiometrics:
        (await iosManager.isFaceIdAvailable()) || (await iosManager.isTouchIdAvailable()),
      platform: 'ios',
    };
  }
  async getAndroidCapabilities() {
    const androidManager = this.androidManager;
    return {
      supportsWebAuthn: await androidManager.isAndroidBiometricAvailable(),
      supportsPasskeys: await androidManager.isStrongBoxAvailable(),
      supportsBiometrics: await androidManager.isBiometricAuthenticationAvailable(),
      platform: 'android',
    };
  }
  async getWebCapabilities() {
    const webManager = this.webManager;
    return {
      supportsWebAuthn: await webManager.isWebAuthnSupported(),
      supportsPasskeys: await webManager.isConditionalMediationSupported(),
      supportsBiometrics: await webManager.isPlatformAuthenticatorAvailable(),
      platform: 'web',
    };
  }
  getUnsupportedCapabilities() {
    return {
      supportsWebAuthn: false,
      supportsPasskeys: false,
      supportsBiometrics: false,
      platform: 'web',
    };
  }
  async getIOSFallbacks() {
    const fallbacks = ['opaque-password'];
    if (await this.iosManager?.isSecureEnclaveAvailable()) {
      fallbacks.unshift('webauthn-platform');
    }
    return fallbacks;
  }
  async getAndroidFallbacks() {
    const fallbacks = ['opaque-password'];
    if (await this.androidManager?.isStrongBoxAvailable()) {
      fallbacks.unshift('webauthn-platform');
    } else if (await this.androidManager?.isBiometricAuthenticationAvailable()) {
      fallbacks.unshift('webauthn-basic');
    }
    return fallbacks;
  }
  async getWebFallbacks() {
    const fallbacks = ['opaque-password'];
    if (await this.webManager?.isPlatformAuthenticatorAvailable()) {
      fallbacks.unshift('webauthn-platform');
    } else if (await this.webManager?.isWebAuthnSupported()) {
      fallbacks.unshift('webauthn-roaming');
    }
    return fallbacks;
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
  async getIOSSecurityFeatures() {
    const iosManager = this.iosManager;
    const biometricTypes = [];
    if (await iosManager.isFaceIdAvailable()) biometricTypes.push('faceId');
    if (await iosManager.isTouchIdAvailable()) biometricTypes.push('touchId');
    return {
      hardwareBacked: await iosManager.isSecureEnclaveAvailable(),
      biometricTypes,
      attestationSupport: true, // iOS supports Apple attestation
      secureStorage: true, // iOS Keychain
      tamperDetection: true, // iOS secure boot chain
    };
  }
  async getAndroidSecurityFeatures() {
    const androidManager = this.androidManager;
    const biometricTypes = [];
    if (await androidManager.isFingerprintAvailable()) biometricTypes.push('fingerprint');
    if (await androidManager.isFaceUnlockAvailable()) biometricTypes.push('face');
    if (await androidManager.isIrisAvailable()) biometricTypes.push('iris');
    return {
      hardwareBacked: await androidManager.isStrongBoxAvailable(),
      biometricTypes,
      attestationSupport: await androidManager.isSafetyNetAvailable(),
      secureStorage: true, // Android Keystore
      tamperDetection: await androidManager.isSafetyNetAvailable(),
    };
  }
  async getWebSecurityFeatures() {
    const webManager = this.webManager;
    const features = await webManager.getWebAuthnFeatures();
    return {
      hardwareBacked: features.platformAuthenticator,
      biometricTypes: features.platformAuthenticator ? ['platform'] : [],
      attestationSupport: false, // Limited for web
      secureStorage: false, // Limited for web
      tamperDetection: false, // Limited for web
    };
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
