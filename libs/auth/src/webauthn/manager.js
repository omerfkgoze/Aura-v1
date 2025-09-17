import { __awaiter } from 'tslib';
import { WebAuthnRegistration } from './registration';
import { WebAuthnAuthentication } from './authentication';
import { PlatformWebAuthnManager } from './platform';
import { SecureStorageFactory } from './storage';
export class WebAuthnManager {
  constructor(config) {
    this.config = config;
    this.platform = this.detectPlatform();
    // Initialize components
    this.registration = new WebAuthnRegistration(config.rpName, config.rpId);
    this.authentication = new WebAuthnAuthentication(config.rpId);
    const platformConfig = {
      rpName: config.rpName,
      rpId: config.rpId,
      timeout: config.timeout || 60000,
      userVerification: config.userVerification || 'required',
      attestation: config.attestation || 'none',
    };
    this.platformManager = new PlatformWebAuthnManager(platformConfig);
    // Initialize secure storage
    const storageConfig = config.storage || SecureStorageFactory.getDefaultConfig();
    this.secureStorage = SecureStorageFactory.create(this.platform, storageConfig);
  }
  // Registration Flow
  startRegistration(request) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check platform capabilities
        const capabilities = this.getPlatformCapabilities();
        if (!capabilities.supportsWebAuthn) {
          throw new Error('WebAuthn not supported on this platform');
        }
        // Generate platform-specific registration options
        const baseOptions = yield this.registration.generateRegistrationOptions(request);
        const platformOptions = this.platformManager.getRegistrationOptionsForPlatform(
          request.platform || this.platform
        );
        const options = Object.assign(Object.assign({}, baseOptions), platformOptions);
        // Store challenge securely
        const challenge = options.challenge;
        yield this.storeChallenge(challenge, request.userId);
        return { options, challenge };
      } catch (error) {
        throw new Error(`Failed to start registration: ${error}`);
      }
    });
  }
  completeRegistration(response, userId, expectedChallenge) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Retrieve and validate challenge
        const storedChallenge = expectedChallenge || (yield this.retrieveChallenge(userId));
        if (!storedChallenge) {
          throw new Error('Invalid or expired challenge');
        }
        // Verify registration response
        const result = yield this.registration.verifyRegistrationResponse(
          response,
          storedChallenge,
          this.config.expectedOrigin,
          this.config.rpId
        );
        if (result.success && result.credential) {
          // Set user ID and store credential
          result.credential.userId = userId;
          yield this.storeCredential(result.credential);
          // Clean up challenge
          yield this.removeChallenge(userId);
        }
        return result;
      } catch (error) {
        throw new Error(`Failed to complete registration: ${error}`);
      }
    });
  }
  // Authentication Flow
  startAuthentication(request) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Check platform capabilities
        const capabilities = this.getPlatformCapabilities();
        if (!capabilities.supportsWebAuthn) {
          throw new Error('WebAuthn not supported on this platform');
        }
        // Get user's credentials if credentialId not provided
        let allowedCredentials = [];
        if (request.credentialId) {
          const credential = yield this.getCredential(request.credentialId);
          if (credential) {
            allowedCredentials = [credential];
          }
        }
        // Generate platform-specific authentication options
        const baseOptions = yield this.authentication.generateAuthenticationOptions(
          request,
          allowedCredentials
        );
        const platformOptions = this.platformManager.getAuthenticationOptionsForPlatform(
          request.platform || this.platform
        );
        const options = Object.assign(Object.assign({}, baseOptions), platformOptions);
        // Store challenge securely
        const challenge = options.challenge;
        yield this.storeChallenge(challenge);
        return { options, challenge };
      } catch (error) {
        throw new Error(`Failed to start authentication: ${error}`);
      }
    });
  }
  completeAuthentication(response, expectedChallenge) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Retrieve and validate challenge
        const storedChallenge = expectedChallenge || (yield this.retrieveChallenge());
        if (!storedChallenge) {
          throw new Error('Invalid or expired challenge');
        }
        // Get credential for verification
        const credentialId = response.id;
        const credential = yield this.getCredential(credentialId);
        if (!credential) {
          throw new Error('Credential not found');
        }
        // Verify authentication response
        const result = yield this.authentication.verifyAuthenticationResponse(
          response,
          storedChallenge,
          this.config.expectedOrigin,
          this.config.rpId,
          credential
        );
        if (result.success) {
          // Update credential counter and last used time
          credential.counter = response.response.signature
            ? credential.counter + 1
            : credential.counter;
          credential.lastUsedAt = new Date();
          yield this.updateCredential(credential);
          // Clean up challenge
          yield this.removeChallenge();
        }
        return result;
      } catch (error) {
        throw new Error(`Failed to complete authentication: ${error}`);
      }
    });
  }
  // Conditional Authentication (Passkeys)
  startConditionalAuthentication() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const isAvailable = yield this.authentication.isConditionalMediationAvailable();
        if (!isAvailable) {
          throw new Error('Conditional mediation not available');
        }
        const request = {
          platform: this.platform,
        };
        const { options } = yield this.startAuthentication(request);
        return yield this.authentication.startConditionalAuthentication(options);
      } catch (error) {
        throw new Error(`Failed to start conditional authentication: ${error}`);
      }
    });
  }
  // Platform Capabilities
  getPlatformCapabilities() {
    return this.platformManager.getPlatformCapabilities();
  }
  // Credential Management
  getUserCredentials(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const credentialsKey = `credentials:${userId}`;
        const credentialsData = yield this.secureStorage.retrieve(credentialsKey);
        if (!credentialsData) {
          return [];
        }
        return JSON.parse(credentialsData);
      } catch (error) {
        throw new Error(`Failed to get user credentials: ${error}`);
      }
    });
  }
  removeCredential(credentialId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this.secureStorage.remove(`credential:${credentialId}`);
      } catch (error) {
        throw new Error(`Failed to remove credential: ${error}`);
      }
    });
  }
  // Private helper methods
  storeCredential(credential) {
    return __awaiter(this, void 0, void 0, function* () {
      const credentialKey = `credential:${credential.credentialId}`;
      yield this.secureStorage.store(credentialKey, JSON.stringify(credential));
      // Also update user's credential list
      const userCredentials = yield this.getUserCredentials(credential.userId);
      userCredentials.push(credential);
      const credentialsKey = `credentials:${credential.userId}`;
      yield this.secureStorage.store(credentialsKey, JSON.stringify(userCredentials));
    });
  }
  getCredential(credentialId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const credentialKey = `credential:${credentialId}`;
        const credentialData = yield this.secureStorage.retrieve(credentialKey);
        if (!credentialData) {
          return null;
        }
        return JSON.parse(credentialData);
      } catch (error) {
        return null;
      }
    });
  }
  updateCredential(credential) {
    return __awaiter(this, void 0, void 0, function* () {
      const credentialKey = `credential:${credential.credentialId}`;
      yield this.secureStorage.store(credentialKey, JSON.stringify(credential));
    });
  }
  storeChallenge(challenge, userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const challengeData = Object.assign(
        { challenge, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
        userId && { userId }
      );
      const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
      yield this.secureStorage.store(challengeKey, JSON.stringify(challengeData));
    });
  }
  retrieveChallenge(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
        const challengeData = yield this.secureStorage.retrieve(challengeKey);
        if (!challengeData) {
          return null;
        }
        const challenge = JSON.parse(challengeData);
        // Check expiration
        if (new Date() > challenge.expiresAt) {
          yield this.removeChallenge(userId);
          return null;
        }
        return challenge.challenge;
      } catch (error) {
        return null;
      }
    });
  }
  removeChallenge(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
      yield this.secureStorage.remove(challengeKey);
    });
  }
  detectPlatform() {
    if (typeof navigator === 'undefined') {
      return 'web'; // Server-side default
    }
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else {
      return 'web';
    }
  }
}
//# sourceMappingURL=manager.js.map
