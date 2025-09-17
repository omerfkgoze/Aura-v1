import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  PublicKeyCredentialDescriptor,
} from '@simplewebauthn/types';
import { startAuthentication } from '@simplewebauthn/browser';
import type {
  WebAuthnAuthenticationRequest,
  WebAuthnCredential,
  AuthenticationResult,
  Platform,
} from './types';

export class WebAuthnAuthentication {
  private rpId: string;

  constructor(rpId: string) {
    this.rpId = rpId;
  }

  async generateAuthenticationOptions(
    _request: WebAuthnAuthenticationRequest,
    allowedCredentials?: WebAuthnCredential[]
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const allowCredentials = allowedCredentials?.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
      transports: this.getTransportsForPlatform(cred.platform),
    })) as PublicKeyCredentialDescriptor[] | undefined;

    const options: GenerateAuthenticationOptionsOpts = {
      rpID: this.rpId,
      timeout: 60000,
      userVerification: 'required',
      ...(allowCredentials && { allowCredentials }),
    };

    return await generateAuthenticationOptions(options);
  }

  async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    expectedOrigin: string,
    expectedRPID: string,
    credential: WebAuthnCredential
  ): Promise<AuthenticationResult> {
    try {
      const opts: VerifyAuthenticationResponseOpts = {
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

  async startAuthentication(
    options: PublicKeyCredentialRequestOptionsJSON,
    useBrowserAutofill = false
  ): Promise<AuthenticationResponseJSON> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn not supported on this platform');
    }

    return await startAuthentication(options, useBrowserAutofill);
  }

  async isConditionalMediationAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false;
    }

    try {
      return await PublicKeyCredential.isConditionalMediationAvailable();
    } catch {
      return false;
    }
  }

  async startConditionalAuthentication(
    options: PublicKeyCredentialRequestOptionsJSON
  ): Promise<AuthenticationResponseJSON> {
    const isAvailable = await this.isConditionalMediationAvailable();

    if (!isAvailable) {
      throw new Error('Conditional mediation not available');
    }

    return await startAuthentication(options, true);
  }

  private getTransportsForPlatform(platform: Platform): AuthenticatorTransport[] {
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

  private reconstructPublicKey(publicKeyData: any): Uint8Array {
    // Reconstruct the public key from stored data
    // This is a simplified implementation - in production, use proper CBOR encoding
    try {
      if (publicKeyData.data) {
        return Buffer.from(publicKeyData.data, 'base64');
      }

      // Fallback: create a minimal CBOR-encoded public key
      const keyData = {
        '1': publicKeyData.kty, // kty
        '3': publicKeyData.alg, // alg
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

  private isWebAuthnSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials?.get === 'function'
    );
  }
}
