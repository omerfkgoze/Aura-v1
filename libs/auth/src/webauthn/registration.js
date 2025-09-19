import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { startRegistration } from '@simplewebauthn/browser';
export class WebAuthnRegistration {
  rpName;
  rpId;
  constructor(rpName, rpId) {
    this.rpName = rpName;
    this.rpId = rpId;
  }
  async generateRegistrationOptions(request) {
    const options = {
      rpName: this.rpName,
      rpID: this.rpId,
      userID: request.userId,
      userName: request.username,
      userDisplayName: request.displayName,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: this.getAuthenticatorSelection(request.platform),
      supportedAlgorithmIDs: [-7, -257],
    };
    return await generateRegistrationOptions(options);
  }
  async verifyRegistrationResponse(response, expectedChallenge, expectedOrigin, expectedRPID) {
    try {
      const opts = {
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserVerification: true,
      };
      const verification = await verifyRegistrationResponse(opts);
      if (!verification.verified || !verification.registrationInfo) {
        return {
          success: false,
          error: 'Registration verification failed',
        };
      }
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
      const credential = {
        id: crypto.randomUUID(),
        userId: '', // Will be set by calling code
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKeyData: this.parsePublicKey(credentialPublicKey),
        counter,
        platform: this.detectPlatform(),
        createdAt: new Date(),
      };
      return {
        success: true,
        credential,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  async startRegistration(options) {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn not supported on this platform');
    }
    return await startRegistration(options);
  }
  getPlatformCapabilities() {
    const platform = this.detectPlatform();
    return {
      supportsWebAuthn: this.isWebAuthnSupported(),
      supportsPasskeys: this.isPasskeysSupported(),
      supportsBiometrics: this.isBiometricsSupported(),
      platform,
    };
  }
  getAuthenticatorSelection(platform) {
    const base = {
      requireResidentKey: true,
      residentKey: 'required',
      userVerification: 'required',
    };
    switch (platform) {
      case 'ios':
      case 'android':
        return {
          ...base,
          authenticatorAttachment: 'platform',
        };
      case 'web':
        return base;
      default:
        return base;
    }
  }
  parsePublicKey(publicKeyBytes) {
    // CBOR decoding for WebAuthn public key
    // This is a simplified implementation - in production, use a proper CBOR library
    try {
      const publicKeyString = Buffer.from(publicKeyBytes).toString('base64');
      return {
        kty: 2, // EC2 key type
        alg: -7, // ES256
        crv: 1, // P-256
        data: publicKeyString,
      };
    } catch (error) {
      throw new Error('Failed to parse public key');
    }
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
  isWebAuthnSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials?.create === 'function'
    );
  }
  isPasskeysSupported() {
    return (
      this.isWebAuthnSupported() &&
      typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
    );
  }
  isBiometricsSupported() {
    const platform = this.detectPlatform();
    switch (platform) {
      case 'ios':
        return 'TouchID' in window || 'FaceID' in window;
      case 'android':
        return 'BiometricManager' in window;
      case 'web':
        return this.isWebAuthnSupported();
      default:
        return false;
    }
  }
}
//# sourceMappingURL=registration.js.map
