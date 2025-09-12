import { __awaiter } from 'tslib';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { startAuthentication } from '@simplewebauthn/browser';
export class WebAuthnAuthentication {
  constructor(rpId) {
    this.rpId = rpId;
  }
  generateAuthenticationOptions(request, allowedCredentials) {
    return __awaiter(this, void 0, void 0, function* () {
      const allowCredentials =
        allowedCredentials === null || allowedCredentials === void 0
          ? void 0
          : allowedCredentials.map(cred => ({
              id: cred.credentialId,
              type: 'public-key',
              transports: this.getTransportsForPlatform(cred.platform),
            }));
      const options = {
        rpID: this.rpId,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials,
      };
      return yield generateAuthenticationOptions(options);
    });
  }
  verifyAuthenticationResponse(
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    credential
  ) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const verification = yield verifyAuthenticationResponse(opts);
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
    });
  }
  startAuthentication(options, useBrowserAutofill = false) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.isWebAuthnSupported()) {
        throw new Error('WebAuthn not supported on this platform');
      }
      return yield startAuthentication(options, useBrowserAutofill);
    });
  }
  isConditionalMediationAvailable() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.isWebAuthnSupported()) {
        return false;
      }
      try {
        return yield PublicKeyCredential.isConditionalMediationAvailable();
      } catch (_a) {
        return false;
      }
    });
  }
  startConditionalAuthentication(options) {
    return __awaiter(this, void 0, void 0, function* () {
      const isAvailable = yield this.isConditionalMediationAvailable();
      if (!isAvailable) {
        throw new Error('Conditional mediation not available');
      }
      return yield startAuthentication(options, true);
    });
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
    var _a;
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof ((_a = navigator.credentials) === null || _a === void 0 ? void 0 : _a.get) ===
        'function'
    );
  }
}
//# sourceMappingURL=authentication.js.map
