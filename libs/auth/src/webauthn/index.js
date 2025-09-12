// WebAuthn Core Components
export { WebAuthnRegistration } from './registration';
export { WebAuthnAuthentication } from './authentication';
export { WebAuthnManager } from './manager';
// Platform Support
export { PlatformWebAuthnManager } from './platform';
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
// Secure Storage
export {
  SecureStorage,
  IOSSecureStorage,
  AndroidSecureStorage,
  WebSecureStorage,
  SecureStorageFactory,
} from './storage';
// Challenge Management
export { ChallengeManager, ServerChallengeManager, SupabaseChallengeAdapter } from './challenge';
//# sourceMappingURL=index.js.map
