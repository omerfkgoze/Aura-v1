export { WebAuthnRegistration } from './registration';
export { WebAuthnAuthentication } from './authentication';
export { WebAuthnManager } from './manager';
export { PlatformWebAuthnManager } from './platform';
export type {
  PlatformConfig,
  PlatformSpecificOptions,
  IOSWebAuthnOptions,
  AndroidWebAuthnOptions,
  WebWebAuthnOptions,
} from './platform';
export { IOSWebAuthnManager } from './ios';
export { AndroidWebAuthnManager } from './android';
export { WebWebAuthnManager } from './web';
export { PlatformDetectionManager } from './detection';
export {
  UnifiedAuthenticationManager,
  CrossPlatformAuthFactory,
  AuthenticationService,
} from './unified';
export { FallbackAuthenticationManager } from './fallback';
export type { FallbackMethod, FallbackResult } from './fallback';
export {
  SecureStorage,
  IOSSecureStorage,
  AndroidSecureStorage,
  WebSecureStorage,
  SecureStorageFactory,
} from './storage';
export type { SecureStorageConfig, SecureStorageItem, StorageCapabilities } from './storage';
export { ChallengeManager, ServerChallengeManager, SupabaseChallengeAdapter } from './challenge';
export type {
  ChallengeConfig,
  ChallengeValidationResult,
  ChallengeStorageAdapter,
} from './challenge';
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
  BiometricAuthenticationOptions,
  IOSBiometricResult,
  AndroidBiometricResult,
  WebBrowserResult,
  CrossPlatformAuthResult,
  PlatformDetectionResult,
} from './types';
export type { WebAuthnManagerConfig } from './manager';
