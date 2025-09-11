import type { WebAuthnCredential, BiometricAuthenticationOptions, WebBrowserResult } from './types';
import { PlatformWebAuthnManager } from './platform';
import { WebAuthnRegistrationManager } from './registration';
import { WebAuthnAuthenticationManager } from './authentication';

/**
 * Web platform WebAuthn implementation with browser compatibility
 * Provides cross-browser WebAuthn support with feature detection and fallbacks
 */
export class WebWebAuthnManager {
  private platformManager: PlatformWebAuthnManager;
  private registrationManager: WebAuthnRegistrationManager;
  private authenticationManager: WebAuthnAuthenticationManager;

  constructor(rpId: string, rpName: string) {
    this.platformManager = new PlatformWebAuthnManager({
      rpId,
      rpName,
      timeout: 120000, // Longer timeout for web
      userVerification: 'preferred',
      attestation: 'none', // Less stringent for web
    });

    this.registrationManager = new WebAuthnRegistrationManager();
    this.authenticationManager = new WebAuthnAuthenticationManager();
  }

  /**
   * Check comprehensive WebAuthn browser support
   */
  async isWebAuthnSupported(): Promise<boolean> {
    try {
      // Basic WebAuthn API support
      const hasBasicSupport = this.platformManager.getPlatformCapabilities().supportsWebAuthn;

      // Check for PublicKeyCredential constructor
      const hasPublicKeyCredential = typeof PublicKeyCredential !== 'undefined';

      // Check for navigator.credentials API
      const hasCredentialsApi =
        typeof navigator.credentials !== 'undefined' &&
        typeof navigator.credentials.create === 'function' &&
        typeof navigator.credentials.get === 'function';

      return hasBasicSupport && hasPublicKeyCredential && hasCredentialsApi;
    } catch (error) {
      console.warn('WebAuthn support check failed:', error);
      return false;
    }
  }

  /**
   * Register a new WebAuthn credential with web browser compatibility
   */
  async registerWithWebAuthn(
    userId: string,
    username: string,
    displayName: string,
    options?: BiometricAuthenticationOptions
  ): Promise<WebAuthnCredential> {
    if (!(await this.isWebAuthnSupported())) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    const webOptions = this.getWebAuthOptions(options);
    const registrationOptions = this.platformManager.getRegistrationOptionsForPlatform('web');

    // Enhanced web-specific registration options
    const webRegistrationOptions = {
      ...registrationOptions,
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName,
      },
      challenge: this.generateSecureChallenge(),
      authenticatorSelection: {
        ...registrationOptions.authenticatorSelection,
        authenticatorAttachment: webOptions.preferPlatformAuthenticator ? 'platform' : undefined,
        requireResidentKey: webOptions.requireResidentKey ?? false,
        residentKey: webOptions.requireResidentKey ? 'required' : 'preferred',
        userVerification: webOptions.requireUserVerification ? 'required' : 'preferred',
      },
      extensions: {
        ...registrationOptions.extensions,
        // Web-specific extensions
        credProps: true,
        largeBlob: { support: 'preferred' },
        hmacCreateSecret: true,
        // Conditional mediation support
        conditionalCreate: webOptions.conditionalMediation,
      },
      // Web-compatible public key parameters
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -35 }, // ES384
        { type: 'public-key', alg: -36 }, // ES512
        { type: 'public-key', alg: -257 }, // RS256
        { type: 'public-key', alg: -258 }, // RS384
        { type: 'public-key', alg: -259 }, // RS512
        { type: 'public-key', alg: -37 }, // PS256
        { type: 'public-key', alg: -38 }, // PS384
        { type: 'public-key', alg: -39 }, // PS512
      ],
      // Exclude existing credentials
      excludeCredentials: await this.getExistingCredentials(userId),
    };

    try {
      // Attempt WebAuthn registration with browser-specific handling
      const credential = await this.registrationManager.createCredential(
        webRegistrationOptions,
        webOptions
      );

      // Validate browser compatibility
      const validatedCredential = await this.validateWebCredential(credential);

      // Store credential metadata with browser information
      await this.storeWebCredentialMetadata(validatedCredential, webOptions);

      return validatedCredential;
    } catch (error) {
      // Handle browser-specific errors
      throw this.handleWebAuthnError(error, 'registration');
    }
  }

  /**
   * Authenticate using web browser WebAuthn
   */
  async authenticateWithWebAuthn(
    credentialIds?: string[],
    options?: BiometricAuthenticationOptions
  ): Promise<WebBrowserResult> {
    if (!(await this.isWebAuthnSupported())) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    const webOptions = this.getWebAuthOptions(options);
    const authenticationOptions = this.platformManager.getAuthenticationOptionsForPlatform('web');

    // Enhanced web-specific authentication options
    const webAuthenticationOptions = {
      ...authenticationOptions,
      challenge: this.generateSecureChallenge(),
      allowCredentials: credentialIds?.map(id => ({
        type: 'public-key',
        id: this.base64UrlToArrayBuffer(id),
        transports: webOptions.allowedTransports || ['usb', 'nfc', 'ble', 'internal', 'hybrid'],
      })),
      extensions: {
        ...authenticationOptions.extensions,
        // Web-specific extensions
        largeBlob: { read: true },
        hmacGetSecret: webOptions.hmacSecret ? { salt1: webOptions.hmacSecret } : undefined,
        appid: webOptions.legacyAppId, // For U2F migration
      },
      userVerification: webOptions.requireUserVerification ? 'required' : 'preferred',
      // Conditional mediation for passkeys
      mediation: webOptions.conditionalMediation ? 'conditional' : 'optional',
    };

    try {
      const assertion = await this.authenticationManager.getAssertion(
        webAuthenticationOptions,
        webOptions
      );

      // Extract browser-specific authentication information
      const browserResult = await this.extractWebAuthData(assertion);

      // Update credential usage metadata
      await this.updateWebCredentialMetadata(assertion.id);

      return {
        assertion,
        browserInfo: browserResult.browserInfo,
        authenticatorType: browserResult.authenticatorType,
        userVerified: browserResult.userVerified,
        platformAuthenticator: browserResult.platformAuthenticator,
        timestamp: new Date(),
      };
    } catch (error) {
      // Handle browser-specific errors
      throw this.handleWebAuthnError(error, 'authentication');
    }
  }

  /**
   * Check if conditional mediation (passkeys) is supported
   */
  async isConditionalMediationSupported(): Promise<boolean> {
    try {
      if (typeof PublicKeyCredential === 'undefined') return false;

      return (
        typeof PublicKeyCredential.isConditionalMediationAvailable === 'function' &&
        (await PublicKeyCredential.isConditionalMediationAvailable())
      );
    } catch (error) {
      console.warn('Conditional mediation support check failed:', error);
      return false;
    }
  }

  /**
   * Check if user verifying platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    try {
      if (typeof PublicKeyCredential === 'undefined') return false;

      return (
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      );
    } catch (error) {
      console.warn('Platform authenticator availability check failed:', error);
      return false;
    }
  }

  /**
   * Get browser information for WebAuthn compatibility
   */
  getBrowserInfo(): {
    name: string;
    version: string;
    webAuthnSupport: string;
    platformSupport: boolean;
    conditionalSupport: boolean;
  } {
    const userAgent = navigator.userAgent;
    const browserInfo = this.parseBrowserInfo(userAgent);

    return {
      name: browserInfo.name,
      version: browserInfo.version,
      webAuthnSupport: this.getWebAuthnSupportLevel(),
      platformSupport: false, // Will be updated async
      conditionalSupport: false, // Will be updated async
    };
  }

  /**
   * Get WebAuthn feature support matrix
   */
  async getWebAuthnFeatures(): Promise<{
    basicWebAuthn: boolean;
    platformAuthenticator: boolean;
    conditionalMediation: boolean;
    largeBlob: boolean;
    hmacSecret: boolean;
    credProps: boolean;
    residentKeys: boolean;
    userVerification: boolean;
  }> {
    return {
      basicWebAuthn: await this.isWebAuthnSupported(),
      platformAuthenticator: await this.isPlatformAuthenticatorAvailable(),
      conditionalMediation: await this.isConditionalMediationSupported(),
      largeBlob: this.isExtensionSupported('largeBlob'),
      hmacSecret: this.isExtensionSupported('hmacCreateSecret'),
      credProps: this.isExtensionSupported('credProps'),
      residentKeys: true, // Supported in modern browsers
      userVerification: true, // Supported in modern browsers
    };
  }

  private getWebAuthOptions(options?: BiometricAuthenticationOptions): any {
    return {
      preferPlatformAuthenticator: options?.preferPlatformAuthenticator ?? true,
      requireResidentKey: options?.requireResidentKey ?? false,
      requireUserVerification: options?.requireUserVerification ?? false,
      conditionalMediation: options?.conditionalMediation ?? true,
      allowedTransports: options?.allowedTransports || ['usb', 'nfc', 'ble', 'internal', 'hybrid'],
      hmacSecret: options?.hmacSecret,
      legacyAppId: options?.legacyAppId,
      timeout: options?.timeout || 120000,
      ...options,
    };
  }

  private generateSecureChallenge(): ArrayBuffer {
    // Generate cryptographically secure challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    return challenge.buffer;
  }

  private async getExistingCredentials(userId: string): Promise<PublicKeyCredentialDescriptor[]> {
    try {
      // Get existing credentials to exclude from registration
      const metadata = await this.getSecureMetadata(`web_credentials_${userId}`);
      if (!metadata || !Array.isArray(metadata.credentials)) return [];

      return metadata.credentials.map(cred => ({
        type: 'public-key',
        id: this.base64UrlToArrayBuffer(cred.id),
        transports: cred.transports || ['usb', 'nfc', 'ble', 'internal'],
      }));
    } catch (error) {
      console.warn('Failed to get existing credentials:', error);
      return [];
    }
  }

  private async validateWebCredential(credential: WebAuthnCredential): Promise<WebAuthnCredential> {
    try {
      // Validate credential structure
      if (!credential.id || !credential.response || !credential.type) {
        throw new Error('Invalid credential structure');
      }

      // Check for required response properties
      const response = credential.response as AuthenticatorAttestationResponse;
      if (!response.clientDataJSON || !response.attestationObject) {
        throw new Error('Missing required credential response data');
      }

      // Validate client data
      const clientData = JSON.parse(new TextDecoder().decode(response.clientDataJSON));
      if (clientData.type !== 'webauthn.create') {
        throw new Error('Invalid client data type');
      }

      return credential;
    } catch (error) {
      throw new Error(`Credential validation failed: ${error.message}`);
    }
  }

  private async storeWebCredentialMetadata(
    credential: WebAuthnCredential,
    options: any
  ): Promise<void> {
    try {
      const browserInfo = this.getBrowserInfo();
      const features = await this.getWebAuthnFeatures();

      const metadata = {
        credentialId: credential.id,
        createdAt: new Date(),
        platform: 'web',
        browserInfo,
        features,
        options,
        transports: credential.response?.getTransports?.() || [],
      };

      await this.storeSecureMetadata('web_webauthn_metadata', metadata);

      // Also store in user-specific list
      const userId = options.userId;
      if (userId) {
        const userCredentials = (await this.getSecureMetadata(`web_credentials_${userId}`)) || {
          credentials: [],
        };
        userCredentials.credentials.push({
          id: credential.id,
          transports: metadata.transports,
          createdAt: metadata.createdAt,
        });
        await this.storeSecureMetadata(`web_credentials_${userId}`, userCredentials);
      }
    } catch (error) {
      console.warn('Failed to store web credential metadata:', error);
    }
  }

  private async updateWebCredentialMetadata(credentialId: string): Promise<void> {
    try {
      const metadata = await this.getSecureMetadata('web_webauthn_metadata');
      if (metadata && metadata.credentialId === credentialId) {
        metadata.lastUsed = new Date();
        metadata.useCount = (metadata.useCount || 0) + 1;
        await this.storeSecureMetadata('web_webauthn_metadata', metadata);
      }
    } catch (error) {
      console.warn('Failed to update web credential metadata:', error);
    }
  }

  private async extractWebAuthData(assertion: any): Promise<{
    browserInfo: any;
    authenticatorType: 'platform' | 'roaming' | 'unknown';
    userVerified: boolean;
    platformAuthenticator: boolean;
  }> {
    try {
      // Extract information from authenticator data
      const authenticatorData = new Uint8Array(assertion.response.authenticatorData);
      const flags = authenticatorData[32];

      const userPresent = (flags & 0x01) !== 0;
      const userVerified = (flags & 0x04) !== 0;
      const attestedCredentialData = (flags & 0x40) !== 0;
      const extensionData = (flags & 0x80) !== 0;

      // Determine authenticator type
      let authenticatorType: 'platform' | 'roaming' | 'unknown' = 'unknown';
      const isPlatformAvailable = await this.isPlatformAuthenticatorAvailable();

      if (isPlatformAvailable && userVerified) {
        authenticatorType = 'platform';
      } else if (userPresent && !userVerified) {
        authenticatorType = 'roaming';
      }

      return {
        browserInfo: this.getBrowserInfo(),
        authenticatorType,
        userVerified,
        platformAuthenticator: authenticatorType === 'platform',
      };
    } catch (error) {
      console.warn('Failed to extract web auth data:', error);
      return {
        browserInfo: this.getBrowserInfo(),
        authenticatorType: 'unknown',
        userVerified: false,
        platformAuthenticator: false,
      };
    }
  }

  private parseBrowserInfo(userAgent: string): { name: string; version: string } {
    // Simple browser detection
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      return { name: 'Chrome', version: match ? match[1] : 'unknown' };
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      return { name: 'Firefox', version: match ? match[1] : 'unknown' };
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)/);
      return { name: 'Safari', version: match ? match[1] : 'unknown' };
    } else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+)/);
      return { name: 'Edge', version: match ? match[1] : 'unknown' };
    } else {
      return { name: 'Unknown', version: 'unknown' };
    }
  }

  private getWebAuthnSupportLevel(): string {
    if (typeof PublicKeyCredential === 'undefined') return 'none';
    if (typeof navigator.credentials?.create !== 'function') return 'partial';
    return 'full';
  }

  private isExtensionSupported(extension: string): boolean {
    // Check if specific WebAuthn extension is supported
    // This is a simplified check - in practice, support varies by browser
    const supportedExtensions = {
      largeBlob: true,
      hmacCreateSecret: true,
      credProps: true,
      appid: true,
    };

    return supportedExtensions[extension] || false;
  }

  private handleWebAuthnError(error: any, operation: 'registration' | 'authentication'): Error {
    // Handle browser-specific WebAuthn errors
    if (error.name === 'NotSupportedError') {
      return new Error(`WebAuthn ${operation} not supported in this browser`);
    } else if (error.name === 'SecurityError') {
      return new Error(`WebAuthn ${operation} failed due to security restrictions`);
    } else if (error.name === 'NotAllowedError') {
      return new Error(`WebAuthn ${operation} was cancelled or not allowed`);
    } else if (error.name === 'InvalidStateError') {
      return new Error(`WebAuthn ${operation} failed due to invalid state`);
    } else if (error.name === 'ConstraintError') {
      return new Error(`WebAuthn ${operation} constraints could not be satisfied`);
    } else if (error.name === 'UnknownError') {
      return new Error(`WebAuthn ${operation} failed with unknown error`);
    } else {
      return new Error(`WebAuthn ${operation} failed: ${error.message || 'Unknown error'}`);
    }
  }

  private base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }

    return buffer;
  }

  private async storeSecureMetadata(key: string, data: any): Promise<void> {
    // Web-specific storage implementation
    try {
      const serializedData = JSON.stringify(data);
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        window.localStorage.setItem(`secure_${key}`, serializedData);
      }
    } catch (error) {
      console.warn(`Failed to store secure metadata for ${key}:`, error);
    }
  }

  private async getSecureMetadata(key: string): Promise<any> {
    // Web-specific storage retrieval
    try {
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const data = window.localStorage.getItem(`secure_${key}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get secure metadata for ${key}:`, error);
      return null;
    }
  }
}
