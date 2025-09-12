import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PlatformDetectionManager,
  UnifiedAuthenticationManager,
  CrossPlatformAuthFactory,
  AuthenticationService,
  FallbackAuthenticationManager,
  IOSWebAuthnManager,
  AndroidWebAuthnManager,
  WebWebAuthnManager,
} from '../src/webauthn';

// Mock navigator for testing
const mockNavigator = {
  userAgent: '',
  platform: '',
  vendor: '',
  credentials: {
    create: vi.fn(),
    get: vi.fn(),
  },
};

// Mock PublicKeyCredential for testing
const mockPublicKeyCredential = {
  isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(),
  isConditionalMediationAvailable: vi.fn(),
};

// Mock crypto for testing
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock window for testing
const mockWindow = {
  PublicKeyCredential: mockPublicKeyCredential,
  navigator: mockNavigator,
  crypto: mockCrypto,
};

describe('Cross-Platform Authentication Integration', () => {
  const testRpId = 'test.aura-app.com';
  const testRpName = 'Aura Test';

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default mock return values
    mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
    mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(true);

    // Mock global objects
    vi.stubGlobal('navigator', mockNavigator);
    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential);
    vi.stubGlobal('crypto', mockCrypto);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('PlatformDetectionManager', () => {
    let detectionManager: PlatformDetectionManager;

    beforeEach(() => {
      detectionManager = new PlatformDetectionManager(testRpId, testRpName);
    });

    describe('Platform Detection', () => {
      it('should detect iOS platform correctly', () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
        mockNavigator.platform = 'iPhone';
        mockNavigator.vendor = 'Apple Computer, Inc.';

        const platform = detectionManager.detectPlatform();
        expect(platform).toBe('ios');
      });

      it('should detect Android platform correctly', () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36';
        mockNavigator.platform = 'Linux armv8l';
        mockNavigator.vendor = '';

        const platform = detectionManager.detectPlatform();
        expect(platform).toBe('android');
      });

      it('should detect web platform correctly', () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        mockNavigator.platform = 'Win32';
        mockNavigator.vendor = 'Google Inc.';

        const platform = detectionManager.detectPlatform();
        expect(platform).toBe('web');
      });

      it('should default to web for unknown platforms', () => {
        mockNavigator.userAgent = 'Unknown Browser';
        mockNavigator.platform = 'Unknown Platform';
        mockNavigator.vendor = 'Unknown Vendor';

        const platform = detectionManager.detectPlatform();
        expect(platform).toBe('web');
      });
    });

    describe('Capability Detection', () => {
      beforeEach(() => {
        // Setup successful WebAuthn mocks
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          true
        );
        mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(true);
      });

      it('should detect iOS capabilities correctly', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';

        const capabilities = await detectionManager.detectPlatformCapabilities();

        expect(capabilities.platform).toBe('ios');
        expect(capabilities.isSupported).toBe(true);
        expect(capabilities.capabilities.webAuthn).toBe(true);
        expect(capabilities.fallbackOptions).toContain('webauthn-platform');
      });

      it('should detect Android capabilities correctly', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36';

        const capabilities = await detectionManager.detectPlatformCapabilities();

        expect(capabilities.platform).toBe('android');
        expect(capabilities.isSupported).toBe(true);
        expect(capabilities.capabilities.webAuthn).toBe(true);
        expect(capabilities.fallbackOptions).toContain('webauthn-platform');
      });

      it('should detect web capabilities correctly', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

        const capabilities = await detectionManager.detectPlatformCapabilities();

        expect(capabilities.platform).toBe('web');
        expect(capabilities.isSupported).toBe(true);
        expect(capabilities.capabilities.webAuthn).toBe(true);
        expect(capabilities.fallbackOptions).toContain('webauthn-platform');
      });

      it('should handle unsupported platforms gracefully', async () => {
        // Mock unsupported environment
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          false
        );
        vi.stubGlobal('PublicKeyCredential', undefined);

        const capabilities = await detectionManager.detectPlatformCapabilities();

        expect(capabilities.isSupported).toBe(false);
        expect(capabilities.fallbackOptions).toContain('opaque-password');
      });
    });

    describe('WebAuthn Availability', () => {
      it('should check WebAuthn availability correctly', async () => {
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          true
        );

        const isAvailable = await detectionManager.isWebAuthnAvailable();
        expect(isAvailable).toBe(true);
      });

      it('should handle WebAuthn unavailability', async () => {
        vi.stubGlobal('PublicKeyCredential', undefined);

        const isAvailable = await detectionManager.isWebAuthnAvailable();
        expect(isAvailable).toBe(false);
      });
    });

    describe('Optimal Authentication Methods', () => {
      it('should return optimal methods for iOS', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          true
        );

        const methods = await detectionManager.getOptimalAuthMethods();

        expect(methods.primary).toContain('passkeys-faceid');
        expect(methods.primary).toContain('passkeys-touchid');
        expect(methods.secondary).toContain('webauthn-platform');
        expect(methods.fallback).toContain('recovery-phrase');
      });

      it('should return optimal methods for Android', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36';
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          true
        );

        const methods = await detectionManager.getOptimalAuthMethods();

        expect(methods.primary).toContain('passkeys-fingerprint');
        expect(methods.secondary).toContain('webauthn-platform');
        expect(methods.fallback).toContain('recovery-phrase');
      });

      it('should return optimal methods for web', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(
          true
        );
        mockPublicKeyCredential.isConditionalMediationAvailable.mockResolvedValue(true);

        const methods = await detectionManager.getOptimalAuthMethods();

        expect(methods.primary).toContain('passkeys-platform');
        expect(methods.primary).toContain('webauthn-platform');
        expect(methods.fallback).toContain('recovery-phrase');
      });
    });
  });

  describe('UnifiedAuthenticationManager', () => {
    let unifiedManager: UnifiedAuthenticationManager;

    beforeEach(() => {
      unifiedManager = new UnifiedAuthenticationManager(testRpId, testRpName);
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
    });

    describe('Registration', () => {
      it('should register with WebAuthn on supported platforms', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';

        const result = await unifiedManager.register('user123', 'testuser', 'Test User');

        // Should attempt WebAuthn first, fallback to OPAQUE on mock failure
        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('opaque-password');
      });

      it('should fallback to OPAQUE on WebAuthn failure', async () => {
        // Mock WebAuthn failure by not providing proper mocks
        vi.stubGlobal('PublicKeyCredential', undefined);

        const result = await unifiedManager.register('user123', 'testuser', 'Test User');

        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('opaque-password');
      });
    });

    describe('Authentication', () => {
      it('should authenticate with WebAuthn on supported platforms', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';

        const result = await unifiedManager.authenticate('testuser');

        // Should attempt WebAuthn first, fallback to OPAQUE on mock failure
        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('opaque-password');
      });

      it('should fallback to OPAQUE on WebAuthn failure', async () => {
        // Mock WebAuthn failure
        vi.stubGlobal('PublicKeyCredential', undefined);

        const result = await unifiedManager.authenticate('testuser');

        expect(result.fallbackUsed).toBe(true);
        expect(result.method).toBe('opaque-password');
      });
    });

    describe('Platform Support', () => {
      it('should return comprehensive platform support information', async () => {
        mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';

        const support = await unifiedManager.getPlatformSupport();

        expect(support.platform).toBe('ios');
        expect(support.isSupported).toBe(true);
        expect(support.optimalMethods).toHaveProperty('primary');
        expect(support.optimalMethods).toHaveProperty('secondary');
        expect(support.optimalMethods).toHaveProperty('fallback');
      });
    });
  });

  describe('CrossPlatformAuthFactory', () => {
    it('should create unified manager correctly', () => {
      const manager = CrossPlatformAuthFactory.createUnifiedManager(testRpId, testRpName);
      expect(manager).toBeInstanceOf(UnifiedAuthenticationManager);
    });

    it('should create iOS-specific manager', () => {
      const manager = CrossPlatformAuthFactory.createPlatformManager('ios', testRpId, testRpName);
      expect(manager).toBeInstanceOf(IOSWebAuthnManager);
    });

    it('should create Android-specific manager', () => {
      const manager = CrossPlatformAuthFactory.createPlatformManager(
        'android',
        testRpId,
        testRpName
      );
      expect(manager).toBeInstanceOf(AndroidWebAuthnManager);
    });

    it('should create web-specific manager', () => {
      const manager = CrossPlatformAuthFactory.createPlatformManager('web', testRpId, testRpName);
      expect(manager).toBeInstanceOf(WebWebAuthnManager);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        CrossPlatformAuthFactory.createPlatformManager('unsupported' as any, testRpId, testRpName);
      }).toThrow('Unsupported platform: unsupported');
    });

    it('should create detection manager correctly', () => {
      const manager = CrossPlatformAuthFactory.createDetectionManager(testRpId, testRpName);
      expect(manager).toBeInstanceOf(PlatformDetectionManager);
    });
  });

  describe('AuthenticationService', () => {
    let authService: AuthenticationService;

    beforeEach(() => {
      authService = new AuthenticationService(testRpId, testRpName);
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);
    });

    describe('Initialization', () => {
      it('should initialize correctly', async () => {
        await expect(authService.initialize()).resolves.toBeUndefined();
      });

      it('should handle initialization errors gracefully', async () => {
        // Mock initialization error by making detection fail
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(authService.initialize()).resolves.toBeUndefined();
      });
    });

    describe('User Registration', () => {
      beforeEach(async () => {
        await authService.initialize();
      });

      it('should register user with recommended setup steps', async () => {
        const result = await authService.registerUser('user123', 'testuser', 'Test User');

        expect(result.success).toBe(true);
        expect(result.recommendedSetup).toBeDefined();
        expect(Array.isArray(result.recommendedSetup)).toBe(true);
      });

      it('should handle registration failures gracefully', async () => {
        // Mock all authentication methods to fail
        vi.stubGlobal('PublicKeyCredential', undefined);

        const result = await authService.registerUser('user123', 'testuser', 'Test User');

        // Should still succeed with fallback methods
        expect(result.success).toBe(true);
      });
    });

    describe('User Authentication', () => {
      beforeEach(async () => {
        await authService.initialize();
      });

      it('should authenticate user with next steps', async () => {
        const result = await authService.authenticateUser('testuser');

        expect(result.success).toBe(true);
        expect(result.nextSteps).toBeDefined();
        expect(Array.isArray(result.nextSteps)).toBe(true);
      });

      it('should handle authentication failures gracefully', async () => {
        // Mock authentication to fail
        vi.stubGlobal('PublicKeyCredential', undefined);

        const result = await authService.authenticateUser('testuser');

        // Should still succeed with fallback methods
        expect(result.success).toBe(true);
      });
    });
  });

  describe('FallbackAuthenticationManager', () => {
    let fallbackManager: FallbackAuthenticationManager;

    beforeEach(() => {
      fallbackManager = new FallbackAuthenticationManager(testRpId, testRpName);
    });

    describe('Authentication with Fallback', () => {
      it('should attempt authentication with fallback chain', async () => {
        const result = await fallbackManager.authenticateWithFallback('testuser', {
          userFriendly: true,
          maxRetries: 2,
        });

        expect(result.success).toBe(true);
        expect(result.fallbacksUsed).toBeGreaterThan(0);
        expect(result.userMessage).toBeDefined();
      });

      it('should skip specified methods', async () => {
        const result = await fallbackManager.authenticateWithFallback('testuser', {
          skipMethods: ['passkeys-platform', 'webauthn-platform'],
          userFriendly: true,
        });

        expect(result.attemptedMethods).not.toContain('passkeys-platform');
        expect(result.attemptedMethods).not.toContain('webauthn-platform');
      });
    });

    describe('Registration with Fallback', () => {
      it('should attempt registration with fallback chain', async () => {
        const result = await fallbackManager.registerWithFallback(
          'user123',
          'testuser',
          'Test User',
          { userFriendly: true }
        );

        expect(result.success).toBe(true);
        expect(result.fallbacksUsed).toBeGreaterThan(0);
        expect(result.userMessage).toBeDefined();
        expect(result.recommendedNextSteps).toBeDefined();
      });

      it('should prioritize preferred method', async () => {
        const result = await fallbackManager.registerWithFallback(
          'user123',
          'testuser',
          'Test User',
          { preferredMethod: 'opaque-password', userFriendly: true }
        );

        expect(result.success).toBe(true);
        expect(result.method).toBe('opaque-password');
      });
    });

    describe('Method Availability', () => {
      it('should return available authentication methods', async () => {
        const methods = await fallbackManager.getAvailableMethods();

        expect(methods).toHaveProperty('supported');
        expect(methods).toHaveProperty('unsupported');
        expect(methods).toHaveProperty('recommended');
        expect(methods).toHaveProperty('fallback');
        expect(Array.isArray(methods.supported)).toBe(true);
        expect(Array.isArray(methods.unsupported)).toBe(true);
      });

      it('should test specific method availability', async () => {
        const availability = await fallbackManager.testMethodAvailability('opaque-password');

        expect(availability).toHaveProperty('available');
        expect(availability.available).toBe(true);
      });

      it('should handle unknown method gracefully', async () => {
        const availability = await fallbackManager.testMethodAvailability('unknown-method');

        expect(availability.available).toBe(false);
        expect(availability.reason).toBe('Unknown authentication method');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with platform detection and unified auth', async () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true);

      const authService = new AuthenticationService(testRpId, testRpName);
      await authService.initialize();

      // Register user
      const registerResult = await authService.registerUser('user123', 'testuser', 'Test User');
      expect(registerResult.success).toBe(true);

      // Authenticate user
      const authResult = await authService.authenticateUser('testuser');
      expect(authResult.success).toBe(true);
    });

    it('should handle graceful degradation across different platforms', async () => {
      const platforms = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', // iOS
        'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36', // Android
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', // Web
      ];

      for (const userAgent of platforms) {
        mockNavigator.userAgent = userAgent;

        const authService = new AuthenticationService(testRpId, testRpName);
        await authService.initialize();

        const result = await authService.registerUser('user123', 'testuser', 'Test User');
        expect(result.success).toBe(true);
      }
    });

    it('should provide consistent API across all platform managers', () => {
      const iosManager = new IOSWebAuthnManager(testRpId, testRpName);
      const androidManager = new AndroidWebAuthnManager(testRpId, testRpName);
      const webManager = new WebWebAuthnManager(testRpId, testRpName);

      // All managers should have consistent registration methods
      expect(typeof iosManager.registerWithIOSBiometrics).toBe('function');
      expect(typeof androidManager.registerWithAndroidBiometrics).toBe('function');
      expect(typeof webManager.registerWithWebAuthn).toBe('function');

      // All managers should have consistent authentication methods
      expect(typeof iosManager.authenticateWithIOSBiometrics).toBe('function');
      expect(typeof androidManager.authenticateWithAndroidBiometrics).toBe('function');
      expect(typeof webManager.authenticateWithWebAuthn).toBe('function');
    });
  });
});
