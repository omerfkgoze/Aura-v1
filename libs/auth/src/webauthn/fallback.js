import { __awaiter } from 'tslib';
import { PlatformDetectionManager } from './detection';
import { OpaqueManager } from '../opaque/manager';
import { RecoveryManager } from '../recovery/manager';
/**
 * Graceful degradation system for unsupported platforms and failed authentication
 * Provides comprehensive fallback mechanisms with user-friendly error handling
 */
export class FallbackAuthenticationManager {
  constructor(rpId, rpName) {
    this.detectionManager = new PlatformDetectionManager(rpId, rpName);
    this.opaqueManager = new OpaqueManager();
    // Basic recovery manager config for fallback use
    const recoveryConfig = {
      storage: {
        store: () => __awaiter(this, void 0, void 0, function* () {}),
        retrieve: () =>
          __awaiter(this, void 0, void 0, function* () {
            return null;
          }),
        delete: () => __awaiter(this, void 0, void 0, function* () {}),
        list: () =>
          __awaiter(this, void 0, void 0, function* () {
            return [];
          }),
      },
      events: {
        onRecoveryAttempt: () => {},
        onRecoverySuccess: () => {},
        onRecoveryFailure: () => {},
      },
      rateLimiting: {
        maxAttempts: 5,
        windowMs: 900000, // 15 minutes
      },
    };
    this.recoveryManager = new RecoveryManager(recoveryConfig);
    // Initialize fallback chain
    this.fallbackChain = this.buildFallbackChain();
  }
  /**
   * Attempt authentication with automatic fallback through the chain
   */
  authenticateWithFallback(identifier, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const config = {
        skipMethods: (options === null || options === void 0 ? void 0 : options.skipMethods) || [],
        maxRetries: (options === null || options === void 0 ? void 0 : options.maxRetries) || 3,
        userFriendly:
          (_a = options === null || options === void 0 ? void 0 : options.userFriendly) !== null &&
          _a !== void 0
            ? _a
            : true,
      };
      const attemptedMethods = [];
      const errors = [];
      // Get platform capabilities for intelligent fallback ordering
      const capabilities = yield this.detectionManager.detectPlatformCapabilities();
      const orderedChain = this.orderFallbackChain(this.fallbackChain, capabilities);
      for (const method of orderedChain) {
        if (config.skipMethods.includes(method.name)) {
          continue;
        }
        try {
          const result = yield this.attemptMethod(method, identifier, capabilities);
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
        recoveryOptions: yield this.getRecoveryOptions(capabilities),
      };
    });
  }
  /**
   * Register with automatic fallback through the chain
   */
  registerWithFallback(userId, username, displayName, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const config = {
        skipMethods: (options === null || options === void 0 ? void 0 : options.skipMethods) || [],
        preferredMethod: options === null || options === void 0 ? void 0 : options.preferredMethod,
        userFriendly:
          (_a = options === null || options === void 0 ? void 0 : options.userFriendly) !== null &&
          _a !== void 0
            ? _a
            : true,
      };
      const attemptedMethods = [];
      const errors = [];
      // Get platform capabilities
      const capabilities = yield this.detectionManager.detectPlatformCapabilities();
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
          const result = yield this.attemptRegistration(
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
    });
  }
  /**
   * Get available authentication methods for current platform
   */
  getAvailableMethods() {
    return __awaiter(this, void 0, void 0, function* () {
      const capabilities = yield this.detectionManager.detectPlatformCapabilities();
      const optimalMethods = yield this.detectionManager.getOptimalAuthMethods();
      const supported = [];
      const unsupported = [];
      for (const method of this.fallbackChain) {
        const isSupported = yield this.isMethodSupported(method, capabilities);
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
    });
  }
  /**
   * Test authentication method availability without attempting authentication
   */
  testMethodAvailability(methodName) {
    return __awaiter(this, void 0, void 0, function* () {
      const method = this.fallbackChain.find(m => m.name === methodName);
      if (!method) {
        return {
          available: false,
          reason: 'Unknown authentication method',
        };
      }
      const capabilities = yield this.detectionManager.detectPlatformCapabilities();
      try {
        const isSupported = yield this.isMethodSupported(method, capabilities);
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
    });
  }
  buildFallbackChain() {
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
  orderFallbackChain(chain, capabilities) {
    return chain
      .filter(method => this.isMethodRelevant(method, capabilities))
      .sort((a, b) => a.priority - b.priority);
  }
  prioritizePreferredMethod(chain, preferredMethod) {
    const preferred = chain.find(m => m.name === preferredMethod);
    const others = chain.filter(m => m.name !== preferredMethod);
    return preferred ? [preferred, ...others] : chain;
  }
  isMethodRelevant(method, capabilities) {
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
  isMethodSupported(method, capabilities) {
    return __awaiter(this, void 0, void 0, function* () {
      // Check basic relevance first
      if (!this.isMethodRelevant(method, capabilities)) return false;
      // Perform deeper capability check based on handler
      switch (method.handler) {
        case 'webauthn-platform':
          return yield this.detectionManager.isWebAuthnAvailable();
        case 'webauthn-roaming':
          return yield this.detectionManager.isWebAuthnAvailable();
        case 'opaque':
          return true; // OPAQUE is always supported
        case 'recovery':
          return true; // Recovery methods are always supported
        default:
          return false;
      }
    });
  }
  attemptMethod(method, identifier, capabilities) {
    return __awaiter(this, void 0, void 0, function* () {
      switch (method.handler) {
        case 'webauthn-platform':
        case 'webauthn-roaming':
          // This would integrate with the unified WebAuthn manager
          return { success: false, error: 'WebAuthn integration pending' };
        case 'opaque':
          try {
            const result = yield this.opaqueManager.authenticate(identifier, '');
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        case 'recovery':
          if (method.name === 'recovery-phrase') {
            try {
              // This would integrate with recovery phrase validation
              const isValid = yield this.recoveryManager.validateRecoveryPhrase('', identifier);
              return { success: isValid, data: { method: 'recovery-phrase' } };
            } catch (error) {
              return { success: false, error: error.message };
            }
          } else if (method.name === 'emergency-code') {
            try {
              // This would integrate with emergency code validation
              const isValid = yield this.recoveryManager.validateEmergencyCode('', identifier);
              return { success: isValid, data: { method: 'emergency-code' } };
            } catch (error) {
              return { success: false, error: error.message };
            }
          }
          return { success: false, error: 'Unknown recovery method' };
        default:
          return { success: false, error: 'Unknown authentication handler' };
      }
    });
  }
  attemptRegistration(method, userId, username, displayName, capabilities) {
    return __awaiter(this, void 0, void 0, function* () {
      switch (method.handler) {
        case 'webauthn-platform':
        case 'webauthn-roaming':
          // This would integrate with the unified WebAuthn manager
          return { success: false, error: 'WebAuthn registration integration pending' };
        case 'opaque':
          try {
            const result = yield this.opaqueManager.register(username, '');
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error: error.message };
          }
        case 'recovery':
          if (method.name === 'recovery-phrase') {
            try {
              const phrase = yield this.recoveryManager.generateRecoveryPhrase();
              return { success: true, data: { recoveryPhrase: phrase.words } };
            } catch (error) {
              return { success: false, error: error.message };
            }
          }
          return { success: false, error: 'Recovery methods are set up during account creation' };
        default:
          return { success: false, error: 'Unknown registration handler' };
      }
    });
  }
  getUserFriendlySuccessMessage(method) {
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
  getUserFriendlyFailureMessage(attemptedMethods) {
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
  getUserFriendlyRegistrationMessage(method) {
    const messages = {
      'passkeys-platform': 'Passkeys set up successfully! Your device will remember you securely.',
      'webauthn-platform': 'Biometric authentication set up successfully!',
      'webauthn-roaming': 'Security key authentication set up successfully!',
      'opaque-password': 'Password authentication set up successfully!',
      'recovery-phrase': 'Recovery phrase generated! Please store it securely.',
    };
    return messages[method] || 'Registration successful!';
  }
  getUnavailabilityReason(method, capabilities) {
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
  getMethodRequirements(method) {
    const requirements = [];
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
  canMethodBeEnabled(method, capabilities) {
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
  getRecommendedNextSteps(method, capabilities) {
    const steps = [];
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
  getRecoveryOptions(capabilities) {
    return __awaiter(this, void 0, void 0, function* () {
      const options = [];
      // Always available recovery options
      options.push('recovery-phrase');
      options.push('emergency-code');
      options.push('account-reset');
      // Platform-specific recovery options
      if (capabilities.capabilities.webAuthn) {
        options.push('backup-authenticator');
      }
      return options;
    });
  }
}
//# sourceMappingURL=fallback.js.map
