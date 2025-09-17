import type {
  Platform,
  WebAuthnCredential,
  BiometricAuthenticationOptions,
  CrossPlatformAuthResult,
  PlatformDetectionResult,
} from './types';
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
  private detectionManager: PlatformDetectionManager;
  private iosManager: IOSWebAuthnManager;
  private androidManager: AndroidWebAuthnManager;
  private webManager: WebWebAuthnManager;
  private opaqueManager: OpaqueManager;
  private currentPlatform: Platform;

  constructor(rpId: string, rpName: string) {
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
  async register(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<{
    success: boolean;
    credential?: WebAuthnCredential;
    method: string;
    fallbackUsed: boolean;
    error?: string;
  }> {
    try {
      // Get platform capabilities
      const capabilities = await this.detectionManager.detectPlatformCapabilities();

      // Try primary authentication methods first
      if (capabilities.isSupported && capabilities.capabilities.webAuthn) {
        try {
          const credential = await this.registerWithWebAuthn(
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
        await this.opaqueManager.registerUser(username, '', userId); // Password will be collected separately
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
          error: `All registration methods failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        method: 'none',
        fallbackUsed: true,
        error: `Registration failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Auto-detect platform and authenticate with optimal method
   */
  async authenticate(
    identifier: string, // username or credentialId
    options?: BiometricAuthenticationOptions
  ): Promise<{
    success: boolean;
    result?: CrossPlatformAuthResult;
    method: string;
    fallbackUsed: boolean;
    error?: string;
  }> {
    try {
      // Get platform capabilities
      const capabilities = await this.detectionManager.detectPlatformCapabilities();

      // Try primary authentication methods first
      if (capabilities.isSupported && capabilities.capabilities.webAuthn) {
        try {
          const result = await this.authenticateWithWebAuthn(identifier, options);
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
        const authResult = await this.opaqueManager.authenticateUser(identifier, '');
        return {
          success: true,
          result: authResult as any, // Cast for compatibility
          method: 'opaque-password',
          fallbackUsed: true,
        };
      } catch (error) {
        return {
          success: false,
          method: 'none',
          fallbackUsed: true,
          error: `All authentication methods failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        method: 'none',
        fallbackUsed: true,
        error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check platform compatibility and return optimal authentication methods
   */
  async getPlatformSupport(): Promise<{
    platform: Platform;
    isSupported: boolean;
    optimalMethods: {
      primary: string[];
      secondary: string[];
      fallback: string[];
    };
    capabilities: PlatformDetectionResult;
  }> {
    const capabilities = await this.detectionManager.detectPlatformCapabilities();
    const optimalMethods = await this.detectionManager.getOptimalAuthMethods();

    return {
      platform: this.currentPlatform,
      isSupported: capabilities.isSupported,
      optimalMethods,
      capabilities,
    };
  }

  /**
   * Register credential with platform-specific WebAuthn manager
   */
  private async registerWithWebAuthn(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential> {
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
  }

  /**
   * Authenticate with platform-specific WebAuthn manager
   */
  private async authenticateWithWebAuthn(
    credentialId: string,
    options?: BiometricAuthenticationOptions
  ): Promise<CrossPlatformAuthResult> {
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
  }

  /**
   * Get current platform information
   */
  getPlatformInfo(): {
    platform: Platform;
    userAgent: string;
    isWebAuthnSupported: boolean;
    isPasskeysSupported: boolean;
    isBiometricsSupported: boolean;
  } {
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
  refreshPlatformDetection(): void {
    this.currentPlatform = this.detectionManager.detectPlatform();
  }

  /**
   * Override platform detection (useful for testing)
   */
  setPlatformOverride(platform: Platform): void {
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
  static createUnifiedManager(rpId: string, rpName: string): UnifiedAuthenticationManager {
    return new UnifiedAuthenticationManager(rpId, rpName);
  }

  /**
   * Create platform-specific manager
   */
  static createPlatformManager(
    platform: Platform,
    rpId: string,
    rpName: string
  ): IOSWebAuthnManager | AndroidWebAuthnManager | WebWebAuthnManager {
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
  static createDetectionManager(rpId: string, rpName: string): PlatformDetectionManager {
    return new PlatformDetectionManager(rpId, rpName);
  }
}

/**
 * High-level authentication service
 * Provides business logic layer on top of unified authentication
 */
export class AuthenticationService {
  private unifiedManager: UnifiedAuthenticationManager;
  private isInitialized: boolean = false;

  constructor(rpId: string, rpName: string) {
    this.unifiedManager = new UnifiedAuthenticationManager(rpId, rpName);
  }

  /**
   * Initialize authentication service with platform detection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Warm up platform detection
      await this.unifiedManager.getPlatformSupport();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Authentication service initialization failed:', error);
      // Continue with limited functionality
      this.isInitialized = true;
    }
  }

  /**
   * User-friendly registration with automatic method selection
   */
  async registerUser(
    userId: string,
    username: string,
    displayName: string,
    preferredMethod?: string
  ): Promise<{
    success: boolean;
    credential?: WebAuthnCredential;
    recommendedSetup?: string[];
    error?: string;
  }> {
    await this.initialize();

    try {
      const support = await this.unifiedManager.getPlatformSupport();

      // Determine optimal options based on platform and user preference
      const options = this.getOptimalRegistrationOptions(support, preferredMethod);

      const result = await this.unifiedManager.register(userId, username, displayName, options);

      if (result.success) {
        return {
          success: true,
          recommendedSetup: this.getRecommendedSetupSteps(support),
          ...(result.credential && { credential: result.credential }),
        };
      } else {
        return {
          success: false,
          ...(result.error && { error: result.error }),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Registration failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * User-friendly authentication with automatic method selection
   */
  async authenticateUser(
    identifier: string,
    preferredMethod?: string
  ): Promise<{
    success: boolean;
    result?: CrossPlatformAuthResult;
    nextSteps?: string[];
    error?: string;
  }> {
    await this.initialize();

    try {
      const support = await this.unifiedManager.getPlatformSupport();

      // Determine optimal options based on platform and user preference
      const options = this.getOptimalAuthenticationOptions(support, preferredMethod);

      const result = await this.unifiedManager.authenticate(identifier, options);

      if (result.success) {
        return {
          success: true,
          nextSteps: this.getRecommendedNextSteps(support, result.method),
          ...(result.result && { result: result.result }),
        };
      } else {
        return {
          success: false,
          ...(result.error && { error: result.error }),
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private getOptimalRegistrationOptions(
    support: any,
    preferredMethod?: string
  ): BiometricAuthenticationOptions {
    const baseOptions: BiometricAuthenticationOptions = {
      allowFallback: true,
      timeout: 120000,
    };

    // Platform-specific optimizations
    switch (support.platform) {
      case 'ios':
        return {
          ...baseOptions,
          preferredBiometric:
            preferredMethod === 'face' ? 'faceId' : preferredMethod === 'touch' ? 'touchId' : 'any',
          requireSecureEnclave: true,
        };
      case 'android':
        return {
          ...baseOptions,
          preferredBiometric:
            preferredMethod === 'face'
              ? 'face'
              : preferredMethod === 'fingerprint'
                ? 'fingerprint'
                : 'any',
          requireStrongBox: true,
          confirmationRequired: true,
        };
      case 'web':
        return {
          ...baseOptions,
          preferPlatformAuthenticator: true,
          conditionalMediation: true,
          requireUserVerification: false, // More lenient for web
        };
      default:
        return baseOptions;
    }
  }

  private getOptimalAuthenticationOptions(
    support: any,
    preferredMethod?: string
  ): BiometricAuthenticationOptions {
    return this.getOptimalRegistrationOptions(support, preferredMethod);
  }

  private getRecommendedSetupSteps(support: any): string[] {
    const steps: string[] = [];

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

  private getRecommendedNextSteps(support: any, method: string): string[] {
    const steps: string[] = [];

    if (method.includes('fallback')) {
      steps.push('Consider setting up biometric authentication');
    }

    if (support.capabilities.capabilities.passkeys && !method.includes('passkeys')) {
      steps.push('Upgrade to passkeys for improved security');
    }

    return steps;
  }
}
