import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { startAuthentication } from '@simplewebauthn/browser';
export class WebAuthnAuthentication {
  rpId;
  constructor(rpId) {
    this.rpId = rpId;
  }
  async generateAuthenticationOptions(_request, allowedCredentials) {
    const allowCredentials = allowedCredentials?.map(cred => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: this.getTransportsForPlatform(cred.platform),
    }));
    const options = {
      rpID: this.rpId,
      timeout: 60000,
      userVerification: 'required',
      ...(allowCredentials && { allowCredentials }),
    };
    return await generateAuthenticationOptions(options);
  }
  async verifyAuthenticationResponse(
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    credential
  ) {
    try {
      const opts = {
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64url'),
          credentialPublicKey: this.reconstructPublicKey(credential.publicKeyData),
          counter: credential.counter,
        },
        requireUserVerification: true,
      };
      const verification = await verifyAuthenticationResponse(opts);
      if (!verification.verified) {
        return {
          success: false,
          error: 'Authentication verification failed',
        };
      }
      return {
        success: true,
        userId: credential.userId,
        credentialId: credential.credentialId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  async startAuthentication(options, useBrowserAutofill = false) {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn not supported on this platform');
    }
    return await startAuthentication(options, useBrowserAutofill);
  }
  async isConditionalMediationAvailable() {
    if (!this.isWebAuthnSupported()) {
      return false;
    }
    try {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    } catch {
      return false;
    }
  }
  async startConditionalAuthentication(options) {
    const isAvailable = await this.isConditionalMediationAvailable();
    if (!isAvailable) {
      throw new Error('Conditional mediation not available');
    }
    return await startAuthentication(options, true);
  }
  getTransportsForPlatform(platform) {
    switch (platform) {
      case 'ios':
      case 'android':
        return ['internal', 'hybrid'];
      case 'web':
        return ['usb', 'nfc', 'ble', 'internal', 'hybrid'];
      default:
        return ['usb', 'nfc', 'ble', 'internal'];
    }
  }
  reconstructPublicKey(publicKeyData) {
    // Reconstruct the public key from stored data
    // This is a simplified implementation - in production, use proper CBOR encoding
    try {
      if (publicKeyData.data) {
        return Buffer.from(publicKeyData.data, 'base64');
      }
      // Fallback: create a minimal CBOR-encoded public key
      const keyData = {
        1: publicKeyData.kty, // kty
        3: publicKeyData.alg, // alg
        '-1': publicKeyData.crv, // crv
        '-2': publicKeyData.x ? Buffer.from(publicKeyData.x, 'base64') : undefined, // x
        '-3': publicKeyData.y ? Buffer.from(publicKeyData.y, 'base64') : undefined, // y
      };
      // This is a simplified CBOR encoding - use a proper CBOR library in production
      return new Uint8Array(Buffer.from(JSON.stringify(keyData)));
    } catch (error) {
      throw new Error('Failed to reconstruct public key');
    }
  }
  isWebAuthnSupported() {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials?.get === 'function'
    );
  }
}
//# sourceMappingURL=authentication.js.map
