import { __awaiter } from 'tslib';
import { IOSWebAuthnManager } from './ios';
import { AndroidWebAuthnManager } from './android';
import { WebWebAuthnManager } from './web';
import { PlatformDetectionManager } from './detection';
import { OpaqueManager } from '../opaque/manager';
/**
 * Unified authentication API across all platforms
 * Provides seamless cross-platform authentication with automatic platform detection
 * and graceful degradation to fallback methods
 */
export class UnifiedAuthenticationManager {
  constructor(rpId, rpName) {
    // Initialize detection manager first
    this.detectionManager = new PlatformDetectionManager(rpId, rpName);
    this.currentPlatform = this.detectionManager.detectPlatform();
    // Initialize all platform managers
    this.iosManager = new IOSWebAuthnManager(rpId, rpName);
    this.androidManager = new AndroidWebAuthnManager(rpId, rpName);
    this.webManager = new WebWebAuthnManager(rpId, rpName);
    this.opaqueManager = new OpaqueManager();
  }
  /**
   * Auto-detect platform and register with optimal authentication method
   */
  register(userId, username, displayName, options) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Get platform capabilities
        const capabilities = yield this.detectionManager.detectPlatformCapabilities();
        // Try primary authentication methods first
        if (capabilities.isSupported && capabilities.capabilities.webAuthn) {
          try {
            const credential = yield this.registerWithWebAuthn(
              userId,
              username,
              displayName,
              options
            );
            return {
              success: true,
              credential,
              method: `webauthn-${capabilities.platform}`,
              fallbackUsed: false,
            };
          } catch (error) {
            console.warn('WebAuthn registration failed, trying fallback:', error);
            // Continue to fallback methods
          }
        }
        // Fallback to OPAQUE authentication
        try {
          yield this.opaqueManager.registerUser(username, '', userId); // Password will be collected separately
          return {
            success: true,
            method: 'opaque-password',
            fallbackUsed: true,
          };
        } catch (error) {
          return {
            success: false,
            method: 'none',
            fallbackUsed: true,
            error: `All registration methods failed: ${error.message}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          method: 'none',
          fallbackUsed: true,
          error: `Registration failed: ${error.message}`,
        };
      }
    });
  }
  /**
   * Auto-detect platform and authenticate with optimal method
   */
  authenticate(
    identifier, // username or credentialId
    options
  ) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Get platform capabilities
        const capabilities = yield this.detectionManager.detectPlatformCapabilities();
        // Try primary authentication methods first
        if (capabilities.isSupported && capabilities.capabilities.webAuthn) {
          try {
            const result = yield this.authenticateWithWebAuthn(identifier, options);
            return {
              success: true,
              result,
              method: `webauthn-${capabilities.platform}`,
              fallbackUsed: false,
            };
          } catch (error) {
            console.warn('WebAuthn authentication failed, trying fallback:', error);
            // Continue to fallback methods
          }
        }
        // Fallback to OPAQUE authentication
        // Note: In real implementation, password would be collected from user
        try {
          const authResult = yield this.opaqueManager.authenticateUser(identifier, '');
          return {
            success: true,
            result: authResult, // Cast for compatibility
            method: 'opaque-password',
            fallbackUsed: true,
          };
        } catch (error) {
          return {
            success: false,
            method: 'none',
            fallbackUsed: true,
            error: `All authentication methods failed: ${error.message}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          method: 'none',
          fallbackUsed: true,
          error: `Authentication failed: ${error.message}`,
        };
      }
    });
  }
  /**
   * Check platform compatibility and return optimal authentication methods
   */
  getPlatformSupport() {
    return __awaiter(this, void 0, void 0, function* () {
      const capabilities = yield this.detectionManager.detectPlatformCapabilities();
      const optimalMethods = yield this.detectionManager.getOptimalAuthMethods();
      return {
        platform: this.currentPlatform,
        isSupported: capabilities.isSupported,
        optimalMethods,
        capabilities,
      };
    });
  }
  /**
   * Register credential with platform-specific WebAuthn manager
   */
  registerWithWebAuthn(userId, username, displayName, options) {
    return __awaiter(this, void 0, void 0, function* () {
      switch (this.currentPlatform) {
        case 'ios':
          return this.iosManager.registerWithIOSBiometrics(userId, username, displayName, options);
        case 'android':
          return this.androidManager.registerWithAndroidBiometrics(
            userId,
            username,
            displayName,
            options
          );
        case 'web':
          return this.webManager.registerWithWebAuthn(userId, username, displayName, options);
        default:
          throw new Error(`Unsupported platform: ${this.currentPlatform}`);
      }
    });
  }
  /**
   * Authenticate with platform-specific WebAuthn manager
   */
  authenticateWithWebAuthn(credentialId, options) {
    return __awaiter(this, void 0, void 0, function* () {
      switch (this.currentPlatform) {
        case 'ios':
          return this.iosManager.authenticateWithIOSBiometrics([credentialId], options);
        case 'android':
          return this.androidManager.authenticateWithAndroidBiometrics([credentialId], options);
        case 'web':
          return this.webManager.authenticateWithWebAuthn([credentialId], options);
        default:
          throw new Error(`Unsupported platform: ${this.currentPlatform}`);
      }
    });
  }
  /**
   * Get current platform information
   */
  getPlatformInfo() {
    const capabilities = this.detectionManager['getUnsupportedCapabilities'](); // Default capabilities
    return {
      platform: this.currentPlatform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      isWebAuthnSupported: capabilities.supportsWebAuthn,
      isPasskeysSupported: capabilities.supportsPasskeys,
      isBiometricsSupported: capabilities.supportsBiometrics,
    };
  }
  /**
   * Force platform detection refresh (useful for testing)
   */
  refreshPlatformDetection() {
    this.currentPlatform = this.detectionManager.detectPlatform();
  }
  /**
   * Override platform detection (useful for testing)
   */
  setPlatformOverride(platform) {
    this.currentPlatform = platform;
  }
}
/**
 * Cross-platform authentication factory
 * Provides simple factory pattern for creating authentication managers
 */
export class CrossPlatformAuthFactory {
  /**
   * Create unified authentication manager with automatic platform detection
   */
  static createUnifiedManager(rpId, rpName) {
    return new UnifiedAuthenticationManager(rpId, rpName);
  }
  /**
   * Create platform-specific manager
   */
  static createPlatformManager(platform, rpId, rpName) {
    switch (platform) {
      case 'ios':
        return new IOSWebAuthnManager(rpId, rpName);
      case 'android':
        return new AndroidWebAuthnManager(rpId, rpName);
      case 'web':
        return new WebWebAuthnManager(rpId, rpName);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  /**
   * Create detection manager
   */
  static createDetectionManager(rpId, rpName) {
    return new PlatformDetectionManager(rpId, rpName);
  }
}
/**
 * High-level authentication service
 * Provides business logic layer on top of unified authentication
 */
export class AuthenticationService {
  constructor(rpId, rpName) {
    this.isInitialized = false;
    this.unifiedManager = new UnifiedAuthenticationManager(rpId, rpName);
  }
  /**
   * Initialize authentication service with platform detection
   */
  initialize() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.isInitialized) return;
      try {
        // Warm up platform detection
        yield this.unifiedManager.getPlatformSupport();
        this.isInitialized = true;
      } catch (error) {
        console.warn('Authentication service initialization failed:', error);
        // Continue with limited functionality
        this.isInitialized = true;
      }
    });
  }
  /**
   * User-friendly registration with automatic method selection
   */
  registerUser(userId, username, displayName, preferredMethod) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.initialize();
      try {
        const support = yield this.unifiedManager.getPlatformSupport();
        // Determine optimal options based on platform and user preference
        const options = this.getOptimalRegistrationOptions(support, preferredMethod);
        const result = yield this.unifiedManager.register(userId, username, displayName, options);
        if (result.success) {
          return {
            success: true,
            credential: result.credential,
            recommendedSetup: this.getRecommendedSetupSteps(support),
          };
        } else {
          return {
            success: false,
            error: result.error,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Registration failed: ${error.message}`,
        };
      }
    });
  }
  /**
   * User-friendly authentication with automatic method selection
   */
  authenticateUser(identifier, preferredMethod) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.initialize();
      try {
        const support = yield this.unifiedManager.getPlatformSupport();
        // Determine optimal options based on platform and user preference
        const options = this.getOptimalAuthenticationOptions(support, preferredMethod);
        const result = yield this.unifiedManager.authenticate(identifier, options);
        if (result.success) {
          return {
            success: true,
            result: result.result,
            nextSteps: this.getRecommendedNextSteps(support, result.method),
          };
        } else {
          return {
            success: false,
            error: result.error,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: `Authentication failed: ${error.message}`,
        };
      }
    });
  }
  getOptimalRegistrationOptions(support, preferredMethod) {
    const baseOptions = {
      allowFallback: true,
      timeout: 120000,
    };
    // Platform-specific optimizations
    switch (support.platform) {
      case 'ios':
        return Object.assign(Object.assign({}, baseOptions), {
          preferredBiometric:
            preferredMethod === 'face' ? 'faceId' : preferredMethod === 'touch' ? 'touchId' : 'any',
          requireSecureEnclave: true,
        });
      case 'android':
        return Object.assign(Object.assign({}, baseOptions), {
          preferredBiometric:
            preferredMethod === 'face'
              ? 'face'
              : preferredMethod === 'fingerprint'
                ? 'fingerprint'
                : 'any',
          requireStrongBox: true,
          confirmationRequired: true,
        });
      case 'web':
        return Object.assign(Object.assign({}, baseOptions), {
          preferPlatformAuthenticator: true,
          conditionalMediation: true,
          requireUserVerification: false,
        });
      default:
        return baseOptions;
    }
  }
  getOptimalAuthenticationOptions(support, preferredMethod) {
    return this.getOptimalRegistrationOptions(support, preferredMethod);
  }
  getRecommendedSetupSteps(support) {
    const steps = [];
    if (support.capabilities.capabilities.passkeys) {
      steps.push('Enable additional passkeys for backup');
    }
    if (!support.capabilities.capabilities.hardwareBacked) {
      steps.push('Consider upgrading to a device with hardware security');
    }
    steps.push('Set up recovery methods');
    steps.push('Test authentication on all your devices');
    return steps;
  }
  getRecommendedNextSteps(support, method) {
    const steps = [];
    if (method.includes('fallback')) {
      steps.push('Consider setting up biometric authentication');
    }
    if (support.capabilities.capabilities.passkeys && !method.includes('passkeys')) {
      steps.push('Upgrade to passkeys for improved security');
    }
    return steps;
  }
}
//# sourceMappingURL=unified.js.map
