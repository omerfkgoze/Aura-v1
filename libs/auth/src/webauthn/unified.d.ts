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
/**
 * Unified authentication API across all platforms
 * Provides seamless cross-platform authentication with automatic platform detection
 * and graceful degradation to fallback methods
 */
export declare class UnifiedAuthenticationManager {
  private detectionManager;
  private iosManager;
  private androidManager;
  private webManager;
  private opaqueManager;
  private currentPlatform;
  constructor(rpId: string, rpName: string);
  /**
   * Auto-detect platform and register with optimal authentication method
   */
  register(
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
  }>;
  /**
   * Auto-detect platform and authenticate with optimal method
   */
  authenticate(
    identifier: string, // username or credentialId
    options?: BiometricAuthenticationOptions
  ): Promise<{
    success: boolean;
    result?: CrossPlatformAuthResult;
    method: string;
    fallbackUsed: boolean;
    error?: string;
  }>;
  /**
   * Check platform compatibility and return optimal authentication methods
   */
  getPlatformSupport(): Promise<{
    platform: Platform;
    isSupported: boolean;
    optimalMethods: {
      primary: string[];
      secondary: string[];
      fallback: string[];
    };
    capabilities: PlatformDetectionResult;
  }>;
  /**
   * Register credential with platform-specific WebAuthn manager
   */
  private registerWithWebAuthn;
  /**
   * Authenticate with platform-specific WebAuthn manager
   */
  private authenticateWithWebAuthn;
  /**
   * Get current platform information
   */
  getPlatformInfo(): {
    platform: Platform;
    userAgent: string;
    isWebAuthnSupported: boolean;
    isPasskeysSupported: boolean;
    isBiometricsSupported: boolean;
  };
  /**
   * Force platform detection refresh (useful for testing)
   */
  refreshPlatformDetection(): void;
  /**
   * Override platform detection (useful for testing)
   */
  setPlatformOverride(platform: Platform): void;
}
/**
 * Cross-platform authentication factory
 * Provides simple factory pattern for creating authentication managers
 */
export declare class CrossPlatformAuthFactory {
  /**
   * Create unified authentication manager with automatic platform detection
   */
  static createUnifiedManager(rpId: string, rpName: string): UnifiedAuthenticationManager;
  /**
   * Create platform-specific manager
   */
  static createPlatformManager(
    platform: Platform,
    rpId: string,
    rpName: string
  ): IOSWebAuthnManager | AndroidWebAuthnManager | WebWebAuthnManager;
  /**
   * Create detection manager
   */
  static createDetectionManager(rpId: string, rpName: string): PlatformDetectionManager;
}
/**
 * High-level authentication service
 * Provides business logic layer on top of unified authentication
 */
export declare class AuthenticationService {
  private unifiedManager;
  private isInitialized;
  constructor(rpId: string, rpName: string);
  /**
   * Initialize authentication service with platform detection
   */
  initialize(): Promise<void>;
  /**
   * User-friendly registration with automatic method selection
   */
  registerUser(
    userId: string,
    username: string,
    displayName: string,
    preferredMethod?: string
  ): Promise<{
    success: boolean;
    credential?: WebAuthnCredential;
    recommendedSetup?: string[];
    error?: string;
  }>;
  /**
   * User-friendly authentication with automatic method selection
   */
  authenticateUser(
    identifier: string,
    preferredMethod?: string
  ): Promise<{
    success: boolean;
    result?: CrossPlatformAuthResult;
    nextSteps?: string[];
    error?: string;
  }>;
  private getOptimalRegistrationOptions;
  private getOptimalAuthenticationOptions;
  private getRecommendedSetupSteps;
  private getRecommendedNextSteps;
}
