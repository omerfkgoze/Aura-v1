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
} from './types';

// Configuration Types
export type { WebAuthnManagerConfig } from './manager';
