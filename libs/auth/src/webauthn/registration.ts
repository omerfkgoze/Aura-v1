import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/types';
import { startRegistration } from '@simplewebauthn/browser';
import type {
  WebAuthnRegistrationRequest,
  WebAuthnCredential,
  RegistrationResult,
  Platform,
  PlatformCapabilities,
} from './types';

export class WebAuthnRegistration {
  private rpName: string;
  private rpId: string;

  constructor(rpName: string, rpId: string) {
    this.rpName = rpName;
    this.rpId = rpId;
  }

  async generateRegistrationOptions(
    request: WebAuthnRegistrationRequest
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const options: GenerateRegistrationOptionsOpts = {
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

  async verifyRegistrationResponse(
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    expectedOrigin: string,
    expectedRPID: string
  ): Promise<RegistrationResult> {
    try {
      const opts: VerifyRegistrationResponseOpts = {
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

      const credential: WebAuthnCredential = {
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

  async startRegistration(
    options: PublicKeyCredentialCreationOptionsJSON
  ): Promise<RegistrationResponseJSON> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn not supported on this platform');
    }

    return await startRegistration(options);
  }

  getPlatformCapabilities(): PlatformCapabilities {
    const platform = this.detectPlatform();

    return {
      supportsWebAuthn: this.isWebAuthnSupported(),
      supportsPasskeys: this.isPasskeysSupported(),
      supportsBiometrics: this.isBiometricsSupported(),
      platform,
    };
  }

  private getAuthenticatorSelection(platform: Platform): AuthenticatorSelectionCriteria {
    const base: AuthenticatorSelectionCriteria = {
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

  private parsePublicKey(publicKeyBytes: Uint8Array): any {
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

  private detectPlatform(): Platform {
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

  private isWebAuthnSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials?.create === 'function'
    );
  }

  private isPasskeysSupported(): boolean {
    return (
      this.isWebAuthnSupported() &&
      typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
    );
  }

  private isBiometricsSupported(): boolean {
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
