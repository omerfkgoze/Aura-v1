// WebAuthn Core Components
export { WebAuthnRegistration } from './registration';
export { WebAuthnAuthentication } from './authentication';
export { WebAuthnManager } from './manager';

// Platform Support
export { PlatformWebAuthnManager } from './platform';
export type {
  PlatformConfig,
  PlatformSpecificOptions,
  IOSWebAuthnOptions,
  AndroidWebAuthnOptions,
  WebWebAuthnOptions,
} from './platform';

// Cross-Platform Implementations (Task 5)
export { IOSWebAuthnManager } from './ios';
export { AndroidWebAuthnManager } from './android';
export { WebWebAuthnManager } from './web';

// Platform Detection and Unified API (Task 5)
export { PlatformDetectionManager } from './detection';
export {
  UnifiedAuthenticationManager,
  CrossPlatformAuthFactory,
  AuthenticationService,
} from './unified';
export { FallbackAuthenticationManager } from './fallback';
export type { FallbackMethod, FallbackResult } from './fallback';

// Secure Storage
export {
  SecureStorage,
  IOSSecureStorage,
  AndroidSecureStorage,
  WebSecureStorage,
  SecureStorageFactory,
} from './storage';
export type { SecureStorageConfig, SecureStorageItem, StorageCapabilities } from './storage';

// Challenge Management
export { ChallengeManager, ServerChallengeManager, SupabaseChallengeAdapter } from './challenge';
export type {
  ChallengeConfig,
  ChallengeValidationResult,
  ChallengeStorageAdapter,
} from './challenge';

// Types
export type {
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
  WebAuthnCredential,
  PublicKeyData,
  Platform,
  RegistrationResult,
  AuthenticationResult,
  WebAuthnChallenge,
  PlatformCapabilities,
  WebAuthnRegistrationRequest,
  WebAuthnAuthenticationRequest,
  // Cross-Platform Types (Task 5)
  BiometricAuthenticationOptions,
  IOSBiometricResult,
  AndroidBiometricResult,
  WebBrowserResult,
  CrossPlatformAuthResult,
  PlatformDetectionResult,
} from './types';

// Configuration Types
export type { WebAuthnManagerConfig } from './manager';
