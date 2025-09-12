import type { Platform, PlatformDetectionResult } from './types';
/**
 * Cross-platform detection and capability checking system
 * Provides comprehensive platform detection and feature availability assessment
 */
export declare class PlatformDetectionManager {
  private iosManager?;
  private androidManager?;
  private webManager?;
  constructor(rpId: string, rpName: string);
  /**
   * Detect current platform with enhanced accuracy
   */
  detectPlatform(): Platform;
  /**
   * Comprehensive platform capability assessment
   */
  detectPlatformCapabilities(platform?: Platform): Promise<PlatformDetectionResult>;
  /**
   * Check if current environment supports WebAuthn at all
   */
  isWebAuthnAvailable(): Promise<boolean>;
  /**
   * Get optimal authentication methods for current platform
   */
  getOptimalAuthMethods(): Promise<{
    primary: string[];
    secondary: string[];
    fallback: string[];
  }>;
  /**
   * Check hardware security backing availability
   */
  isHardwareBacked(platform?: Platform): Promise<boolean>;
  /**
   * Get device-specific security features
   */
  getSecurityFeatures(): Promise<{
    hardwareBacked: boolean;
    biometricTypes: string[];
    attestationSupport: boolean;
    secureStorage: boolean;
    tamperDetection: boolean;
  }>;
  private isIOSDevice;
  private isAndroidDevice;
  private getIOSCapabilities;
  private getAndroidCapabilities;
  private getWebCapabilities;
  private getUnsupportedCapabilities;
  private getIOSFallbacks;
  private getAndroidFallbacks;
  private getWebFallbacks;
  private getIOSOptimalMethods;
  private getAndroidOptimalMethods;
  private getWebOptimalMethods;
  private getIOSSecurityFeatures;
  private getAndroidSecurityFeatures;
  private getWebSecurityFeatures;
  private getFallbackDetectionResult;
}
