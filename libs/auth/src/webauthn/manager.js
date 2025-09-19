import { WebAuthnRegistration } from './registration';
import { WebAuthnAuthentication } from './authentication';
import { PlatformWebAuthnManager } from './platform';
import { SecureStorageFactory } from './storage';
export class WebAuthnManager {
  registration;
  authentication;
  platformManager;
  secureStorage;
  config;
  platform;
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
  async startRegistration(request) {
    try {
      // Check platform capabilities
      const capabilities = this.getPlatformCapabilities();
      if (!capabilities.supportsWebAuthn) {
        throw new Error('WebAuthn not supported on this platform');
      }
      // Generate platform-specific registration options
      const baseOptions = await this.registration.generateRegistrationOptions(request);
      const platformOptions = this.platformManager.getRegistrationOptionsForPlatform(
        request.platform || this.platform
      );
      const options = {
        ...baseOptions,
        ...platformOptions,
      };
      // Store challenge securely
      const challenge = options.challenge;
      await this.storeChallenge(challenge, request.userId);
      return { options, challenge };
    } catch (error) {
      throw new Error(`Failed to start registration: ${error}`);
    }
  }
  async completeRegistration(response, userId, expectedChallenge) {
    try {
      // Retrieve and validate challenge
      const storedChallenge = expectedChallenge || (await this.retrieveChallenge(userId));
      if (!storedChallenge) {
        throw new Error('Invalid or expired challenge');
      }
      // Verify registration response
      const result = await this.registration.verifyRegistrationResponse(
        response,
        storedChallenge,
        this.config.expectedOrigin,
        this.config.rpId
      );
      if (result.success && result.credential) {
        // Set user ID and store credential
        result.credential.userId = userId;
        await this.storeCredential(result.credential);
        // Clean up challenge
        await this.removeChallenge(userId);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to complete registration: ${error}`);
    }
  }
  // Authentication Flow
  async startAuthentication(request) {
    try {
      // Check platform capabilities
      const capabilities = this.getPlatformCapabilities();
      if (!capabilities.supportsWebAuthn) {
        throw new Error('WebAuthn not supported on this platform');
      }
      // Get user's credentials if credentialId not provided
      let allowedCredentials = [];
      if (request.credentialId) {
        const credential = await this.getCredential(request.credentialId);
        if (credential) {
          allowedCredentials = [credential];
        }
      }
      // Generate platform-specific authentication options
      const baseOptions = await this.authentication.generateAuthenticationOptions(
        request,
        allowedCredentials
      );
      const platformOptions = this.platformManager.getAuthenticationOptionsForPlatform(
        request.platform || this.platform
      );
      const options = {
        ...baseOptions,
        ...platformOptions,
      };
      // Store challenge securely
      const challenge = options.challenge;
      await this.storeChallenge(challenge);
      return { options, challenge };
    } catch (error) {
      throw new Error(`Failed to start authentication: ${error}`);
    }
  }
  async completeAuthentication(response, expectedChallenge) {
    try {
      // Retrieve and validate challenge
      const storedChallenge = expectedChallenge || (await this.retrieveChallenge());
      if (!storedChallenge) {
        throw new Error('Invalid or expired challenge');
      }
      // Get credential for verification
      const credentialId = response.id;
      const credential = await this.getCredential(credentialId);
      if (!credential) {
        throw new Error('Credential not found');
      }
      // Verify authentication response
      const result = await this.authentication.verifyAuthenticationResponse(
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
        await this.updateCredential(credential);
        // Clean up challenge
        await this.removeChallenge();
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to complete authentication: ${error}`);
    }
  }
  // Conditional Authentication (Passkeys)
  async startConditionalAuthentication() {
    try {
      const isAvailable = await this.authentication.isConditionalMediationAvailable();
      if (!isAvailable) {
        throw new Error('Conditional mediation not available');
      }
      const request = {
        platform: this.platform,
      };
      const { options } = await this.startAuthentication(request);
      return await this.authentication.startConditionalAuthentication(options);
    } catch (error) {
      throw new Error(`Failed to start conditional authentication: ${error}`);
    }
  }
  // Platform Capabilities
  getPlatformCapabilities() {
    return this.platformManager.getPlatformCapabilities();
  }
  // Credential Management
  async getUserCredentials(userId) {
    try {
      const credentialsKey = `credentials:${userId}`;
      const credentialsData = await this.secureStorage.retrieve(credentialsKey);
      if (!credentialsData) {
        return [];
      }
      return JSON.parse(credentialsData);
    } catch (error) {
      throw new Error(`Failed to get user credentials: ${error}`);
    }
  }
  async removeCredential(credentialId) {
    try {
      await this.secureStorage.remove(`credential:${credentialId}`);
    } catch (error) {
      throw new Error(`Failed to remove credential: ${error}`);
    }
  }
  // Private helper methods
  async storeCredential(credential) {
    const credentialKey = `credential:${credential.credentialId}`;
    await this.secureStorage.store(credentialKey, JSON.stringify(credential));
    // Also update user's credential list
    const userCredentials = await this.getUserCredentials(credential.userId);
    userCredentials.push(credential);
    const credentialsKey = `credentials:${credential.userId}`;
    await this.secureStorage.store(credentialsKey, JSON.stringify(userCredentials));
  }
  async getCredential(credentialId) {
    try {
      const credentialKey = `credential:${credentialId}`;
      const credentialData = await this.secureStorage.retrieve(credentialKey);
      if (!credentialData) {
        return null;
      }
      return JSON.parse(credentialData);
    } catch (error) {
      return null;
    }
  }
  async updateCredential(credential) {
    const credentialKey = `credential:${credential.credentialId}`;
    await this.secureStorage.store(credentialKey, JSON.stringify(credential));
  }
  async storeChallenge(challenge, userId) {
    const challengeData = {
      challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      ...(userId && { userId }),
    };
    const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
    await this.secureStorage.store(challengeKey, JSON.stringify(challengeData));
  }
  async retrieveChallenge(userId) {
    try {
      const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
      const challengeData = await this.secureStorage.retrieve(challengeKey);
      if (!challengeData) {
        return null;
      }
      const challenge = JSON.parse(challengeData);
      // Check expiration
      if (new Date() > challenge.expiresAt) {
        await this.removeChallenge(userId);
        return null;
      }
      return challenge.challenge;
    } catch (error) {
      return null;
    }
  }
  async removeChallenge(userId) {
    const challengeKey = userId ? `challenge:${userId}` : 'challenge:anonymous';
    await this.secureStorage.remove(challengeKey);
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
