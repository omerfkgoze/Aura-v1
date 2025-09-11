import type { Platform, PlatformDetectionResult, BiometricAuthenticationOptions } from './types';
import { PlatformDetectionManager } from './detection';
import { OPAQUEManager } from '../opaque/manager';
import { RecoveryManager } from '../recovery/manager';

/**
 * Graceful degradation system for unsupported platforms and failed authentication
 * Provides comprehensive fallback mechanisms with user-friendly error handling
 */
export class FallbackAuthenticationManager {
  private detectionManager: PlatformDetectionManager;
  private opaqueManager: OPAQUEManager;
  private recoveryManager: RecoveryManager;
  private fallbackChain: FallbackMethod[];

  constructor(rpId: string, rpName: string) {
    this.detectionManager = new PlatformDetectionManager(rpId, rpName);
    this.opaqueManager = new OPAQUEManager();
    this.recoveryManager = new RecoveryManager();

    // Initialize fallback chain
    this.fallbackChain = this.buildFallbackChain();
  }

  /**
   * Attempt authentication with automatic fallback through the chain
   */
  async authenticateWithFallback(
    identifier: string,
    options?: {
      skipMethods?: string[];
      maxRetries?: number;
      userFriendly?: boolean;
    }
  ): Promise<FallbackResult> {
    const config = {
      skipMethods: options?.skipMethods || [],
      maxRetries: options?.maxRetries || 3,
      userFriendly: options?.userFriendly ?? true,
    };

    const attemptedMethods: string[] = [];
    const errors: string[] = [];

    // Get platform capabilities for intelligent fallback ordering
    const capabilities = await this.detectionManager.detectPlatformCapabilities();
    const orderedChain = this.orderFallbackChain(this.fallbackChain, capabilities);

    for (const method of orderedChain) {
      if (config.skipMethods.includes(method.name)) {
        continue;
      }

      try {
        const result = await this.attemptMethod(method, identifier, capabilities);

        if (result.success) {
          return {
            success: true,
            method: method.name,
            result: result.data,
            attemptedMethods: [...attemptedMethods, method.name],
            fallbacksUsed: attemptedMethods.length,
            userMessage: config.userFriendly
              ? this.getUserFriendlySuccessMessage(method.name)
              : undefined,
          };
        } else {
          attemptedMethods.push(method.name);
          errors.push(`${method.name}: ${result.error}`);

          // Check if this is a recoverable error
          if (!method.allowRetry || attemptedMethods.length >= config.maxRetries) {
            continue;
          }
        }
      } catch (error) {
        attemptedMethods.push(method.name);
        errors.push(`${method.name}: ${error.message}`);
      }
    }

    // All methods failed
    return {
      success: false,
      method: 'none',
      error: 'All authentication methods failed',
      attemptedMethods,
      errors,
      fallbacksUsed: attemptedMethods.length,
      userMessage: config.userFriendly
        ? this.getUserFriendlyFailureMessage(attemptedMethods)
        : undefined,
      recoveryOptions: await this.getRecoveryOptions(capabilities),
    };
  }

  /**
   * Register with automatic fallback through the chain
   */
  async registerWithFallback(
    userId: string,
    username: string,
    displayName: string,
    options?: {
      skipMethods?: string[];
      preferredMethod?: string;
      userFriendly?: boolean;
    }
  ): Promise<FallbackResult> {
    const config = {
      skipMethods: options?.skipMethods || [],
      preferredMethod: options?.preferredMethod,
      userFriendly: options?.userFriendly ?? true,
    };

    const attemptedMethods: string[] = [];
    const errors: string[] = [];

    // Get platform capabilities
    const capabilities = await this.detectionManager.detectPlatformCapabilities();
    let orderedChain = this.orderFallbackChain(this.fallbackChain, capabilities);

    // Prioritize preferred method if specified
    if (config.preferredMethod) {
      orderedChain = this.prioritizePreferredMethod(orderedChain, config.preferredMethod);
    }

    for (const method of orderedChain) {
      if (config.skipMethods.includes(method.name)) {
        continue;
      }

      try {
        const result = await this.attemptRegistration(
          method,
          userId,
          username,
          displayName,
          capabilities
        );

        if (result.success) {
          return {
            success: true,
            method: method.name,
            result: result.data,
            attemptedMethods: [...attemptedMethods, method.name],
            fallbacksUsed: attemptedMethods.length,
            userMessage: config.userFriendly
              ? this.getUserFriendlyRegistrationMessage(method.name)
              : undefined,
            recommendedNextSteps: this.getRecommendedNextSteps(method.name, capabilities),
          };
        } else {
          attemptedMethods.push(method.name);
          errors.push(`${method.name}: ${result.error}`);
        }
      } catch (error) {
        attemptedMethods.push(method.name);
        errors.push(`${method.name}: ${error.message}`);
      }
    }

    // All methods failed
    return {
      success: false,
      method: 'none',
      error: 'All registration methods failed',
      attemptedMethods,
      errors,
      fallbacksUsed: attemptedMethods.length,
      userMessage: config.userFriendly
        ? 'Unable to set up authentication. Please try again or contact support.'
        : undefined,
    };
  }

  /**
   * Get available authentication methods for current platform
   */
  async getAvailableMethods(): Promise<{
    supported: string[];
    unsupported: string[];
    recommended: string[];
    fallback: string[];
  }> {
    const capabilities = await this.detectionManager.detectPlatformCapabilities();
    const optimalMethods = await this.detectionManager.getOptimalAuthMethods();

    const supported: string[] = [];
    const unsupported: string[] = [];

    for (const method of this.fallbackChain) {
      const isSupported = await this.isMethodSupported(method, capabilities);
      if (isSupported) {
        supported.push(method.name);
      } else {
        unsupported.push(method.name);
      }
    }

    return {
      supported,
      unsupported,
      recommended: optimalMethods.primary,
      fallback: optimalMethods.fallback,
    };
  }

  /**
   * Test authentication method availability without attempting authentication
   */
  async testMethodAvailability(methodName: string): Promise<{
    available: boolean;
    reason?: string;
    requirements?: string[];
    canEnable?: boolean;
  }> {
    const method = this.fallbackChain.find(m => m.name === methodName);
    if (!method) {
      return {
        available: false,
        reason: 'Unknown authentication method',
      };
    }

    const capabilities = await this.detectionManager.detectPlatformCapabilities();

    try {
      const isSupported = await this.isMethodSupported(method, capabilities);

      if (isSupported) {
        return { available: true };
      } else {
        return {
          available: false,
          reason: this.getUnavailabilityReason(method, capabilities),
          requirements: this.getMethodRequirements(method),
          canEnable: this.canMethodBeEnabled(method, capabilities),
        };
      }
    } catch (error) {
      return {
        available: false,
        reason: `Availability check failed: ${error.message}`,
      };
    }
  }

  private buildFallbackChain(): FallbackMethod[] {
    return [
      {
        name: 'passkeys-platform',
        priority: 1,
        allowRetry: false,
        requiresSupport: ['passkeys', 'webAuthn'],
        handler: 'webauthn-platform',
      },
      {
        name: 'webauthn-platform',
        priority: 2,
        allowRetry: true,
        requiresSupport: ['webAuthn', 'biometrics'],
        handler: 'webauthn-platform',
      },
      {
        name: 'webauthn-roaming',
        priority: 3,
        allowRetry: true,
        requiresSupport: ['webAuthn'],
        handler: 'webauthn-roaming',
      },
      {
        name: 'opaque-password',
        priority: 4,
        allowRetry: true,
        requiresSupport: [],
        handler: 'opaque',
      },
      {
        name: 'recovery-phrase',
        priority: 5,
        allowRetry: false,
        requiresSupport: [],
        handler: 'recovery',
      },
      {
        name: 'emergency-code',
        priority: 6,
        allowRetry: false,
        requiresSupport: [],
        handler: 'recovery',
      },
    ];
  }

  private orderFallbackChain(
    chain: FallbackMethod[],
    capabilities: PlatformDetectionResult
  ): FallbackMethod[] {
    return chain
      .filter(method => this.isMethodRelevant(method, capabilities))
      .sort((a, b) => a.priority - b.priority);
  }

  private prioritizePreferredMethod(
    chain: FallbackMethod[],
    preferredMethod: string
  ): FallbackMethod[] {
    const preferred = chain.find(m => m.name === preferredMethod);
    const others = chain.filter(m => m.name !== preferredMethod);

    return preferred ? [preferred, ...others] : chain;
  }

  private isMethodRelevant(method: FallbackMethod, capabilities: PlatformDetectionResult): boolean {
    // Always include basic methods
    if (method.requiresSupport.length === 0) return true;

    // Check if platform supports required features
    return method.requiresSupport.every(requirement => {
      switch (requirement) {
        case 'passkeys':
          return capabilities.capabilities.passkeys;
        case 'webAuthn':
          return capabilities.capabilities.webAuthn;
        case 'biometrics':
          return capabilities.capabilities.biometrics;
        case 'hardwareBacked':
          return capabilities.capabilities.hardwareBacked;
        default:
          return true;
      }
    });
  }

  private async isMethodSupported(
    method: FallbackMethod,
    capabilities: PlatformDetectionResult
  ): Promise<boolean> {
    // Check basic relevance first
    if (!this.isMethodRelevant(method, capabilities)) return false;

    // Perform deeper capability check based on handler
    switch (method.handler) {
      case 'webauthn-platform':
        return await this.detectionManager.isWebAuthnAvailable();
      case 'webauthn-roaming':
        return await this.detectionManager.isWebAuthnAvailable();
      case 'opaque':
        return true; // OPAQUE is always supported
      case 'recovery':
        return true; // Recovery methods are always supported
      default:
        return false;
    }
  }

  private async attemptMethod(
    method: FallbackMethod,
    identifier: string,
    capabilities: PlatformDetectionResult
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    switch (method.handler) {
      case 'webauthn-platform':
      case 'webauthn-roaming':
        // This would integrate with the unified WebAuthn manager
        return { success: false, error: 'WebAuthn integration pending' };

      case 'opaque':
        try {
          const result = await this.opaqueManager.authenticate(identifier, '');
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: error.message };
        }

      case 'recovery':
        if (method.name === 'recovery-phrase') {
          try {
            // This would integrate with recovery phrase validation
            const isValid = await this.recoveryManager.validateRecoveryPhrase('', identifier);
            return { success: isValid, data: { method: 'recovery-phrase' } };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else if (method.name === 'emergency-code') {
          try {
            // This would integrate with emergency code validation
            const isValid = await this.recoveryManager.validateEmergencyCode('', identifier);
            return { success: isValid, data: { method: 'emergency-code' } };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
        return { success: false, error: 'Unknown recovery method' };

      default:
        return { success: false, error: 'Unknown authentication handler' };
    }
  }

  private async attemptRegistration(
    method: FallbackMethod,
    userId: string,
    username: string,
    displayName: string,
    capabilities: PlatformDetectionResult
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    switch (method.handler) {
      case 'webauthn-platform':
      case 'webauthn-roaming':
        // This would integrate with the unified WebAuthn manager
        return { success: false, error: 'WebAuthn registration integration pending' };

      case 'opaque':
        try {
          const result = await this.opaqueManager.register(username, '');
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: error.message };
        }

      case 'recovery':
        if (method.name === 'recovery-phrase') {
          try {
            const phrase = await this.recoveryManager.generateRecoveryPhrase();
            return { success: true, data: { recoveryPhrase: phrase.words } };
          } catch (error) {
            return { success: false, error: error.message };
          }
        }
        return { success: false, error: 'Recovery methods are set up during account creation' };

      default:
        return { success: false, error: 'Unknown registration handler' };
    }
  }

  private getUserFriendlySuccessMessage(method: string): string {
    const messages = {
      'passkeys-platform': 'Successfully authenticated with passkeys!',
      'webauthn-platform': 'Successfully authenticated with biometrics!',
      'webauthn-roaming': 'Successfully authenticated with security key!',
      'opaque-password': 'Successfully authenticated with password!',
      'recovery-phrase': 'Successfully recovered account with recovery phrase!',
      'emergency-code': 'Successfully recovered account with emergency code!',
    };

    return messages[method] || 'Authentication successful!';
  }

  private getUserFriendlyFailureMessage(attemptedMethods: string[]): string {
    if (attemptedMethods.length === 0) {
      return 'No authentication methods are available on this device.';
    }

    if (
      attemptedMethods.includes('passkeys-platform') ||
      attemptedMethods.includes('webauthn-platform')
    ) {
      return 'Biometric authentication failed. Try using your password or recovery methods.';
    }

    if (attemptedMethods.includes('opaque-password')) {
      return 'Password authentication failed. Check your credentials or try account recovery.';
    }

    return 'Authentication failed. Please try again or contact support.';
  }

  private getUserFriendlyRegistrationMessage(method: string): string {
    const messages = {
      'passkeys-platform': 'Passkeys set up successfully! Your device will remember you securely.',
      'webauthn-platform': 'Biometric authentication set up successfully!',
      'webauthn-roaming': 'Security key authentication set up successfully!',
      'opaque-password': 'Password authentication set up successfully!',
      'recovery-phrase': 'Recovery phrase generated! Please store it securely.',
    };

    return messages[method] || 'Registration successful!';
  }

  private getUnavailabilityReason(
    method: FallbackMethod,
    capabilities: PlatformDetectionResult
  ): string {
    if (!capabilities.isSupported) {
      return 'This device does not support secure authentication methods';
    }

    const missingRequirements = method.requiresSupport.filter(req => {
      switch (req) {
        case 'passkeys':
          return !capabilities.capabilities.passkeys;
        case 'webAuthn':
          return !capabilities.capabilities.webAuthn;
        case 'biometrics':
          return !capabilities.capabilities.biometrics;
        case 'hardwareBacked':
          return !capabilities.capabilities.hardwareBacked;
        default:
          return false;
      }
    });

    if (missingRequirements.length > 0) {
      return `Missing required features: ${missingRequirements.join(', ')}`;
    }

    return 'Method not available on this platform';
  }

  private getMethodRequirements(method: FallbackMethod): string[] {
    const requirements: string[] = [];

    if (method.requiresSupport.includes('passkeys')) {
      requirements.push('Passkeys support (iOS 16+, Android 13+, or modern browser)');
    }

    if (method.requiresSupport.includes('webAuthn')) {
      requirements.push('WebAuthn support');
    }

    if (method.requiresSupport.includes('biometrics')) {
      requirements.push('Biometric authentication (Face ID, Touch ID, fingerprint, etc.)');
    }

    if (method.requiresSupport.includes('hardwareBacked')) {
      requirements.push('Hardware security module (Secure Enclave, StrongBox, etc.)');
    }

    return requirements;
  }

  private canMethodBeEnabled(
    method: FallbackMethod,
    capabilities: PlatformDetectionResult
  ): boolean {
    // Check if the method could potentially be enabled with user action
    switch (method.name) {
      case 'passkeys-platform':
      case 'webauthn-platform':
        return capabilities.capabilities.webAuthn && !capabilities.capabilities.biometrics;
      case 'webauthn-roaming':
        return capabilities.capabilities.webAuthn;
      default:
        return false;
    }
  }

  private getRecommendedNextSteps(method: string, capabilities: PlatformDetectionResult): string[] {
    const steps: string[] = [];

    if (method === 'opaque-password') {
      if (capabilities.capabilities.webAuthn) {
        steps.push('Set up biometric authentication for improved security');
      }
      steps.push('Create a recovery phrase as backup');
    } else if (method.startsWith('webauthn')) {
      steps.push('Set up additional authentication methods as backup');
      steps.push('Create a recovery phrase');
    }

    steps.push('Test authentication on all your devices');

    return steps;
  }

  private async getRecoveryOptions(capabilities: PlatformDetectionResult): Promise<string[]> {
    const options: string[] = [];

    // Always available recovery options
    options.push('recovery-phrase');
    options.push('emergency-code');
    options.push('account-reset');

    // Platform-specific recovery options
    if (capabilities.capabilities.webAuthn) {
      options.push('backup-authenticator');
    }

    return options;
  }
}

// Type definitions for fallback system
interface FallbackMethod {
  name: string;
  priority: number;
  allowRetry: boolean;
  requiresSupport: string[];
  handler: string;
}

interface FallbackResult {
  success: boolean;
  method: string;
  result?: any;
  error?: string;
  attemptedMethods?: string[];
  errors?: string[];
  fallbacksUsed?: number;
  userMessage?: string;
  recoveryOptions?: string[];
  recommendedNextSteps?: string[];
}

export type { FallbackMethod, FallbackResult };
