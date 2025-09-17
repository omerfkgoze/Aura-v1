import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import type {
  WebAuthnAuthenticationRequest,
  WebAuthnCredential,
  AuthenticationResult,
} from './types';
export declare class WebAuthnAuthentication {
  private rpId;
  constructor(rpId: string);
  generateAuthenticationOptions(
    _request: WebAuthnAuthenticationRequest,
    allowedCredentials?: WebAuthnCredential[]
  ): Promise<PublicKeyCredentialRequestOptionsJSON>;
  verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    expectedOrigin: string,
    expectedRPID: string,
    credential: WebAuthnCredential
  ): Promise<AuthenticationResult>;
  startAuthentication(
    options: PublicKeyCredentialRequestOptionsJSON,
    useBrowserAutofill?: boolean
  ): Promise<AuthenticationResponseJSON>;
  isConditionalMediationAvailable(): Promise<boolean>;
  startConditionalAuthentication(
    options: PublicKeyCredentialRequestOptionsJSON
  ): Promise<AuthenticationResponseJSON>;
  private getTransportsForPlatform;
  private reconstructPublicKey;
  private isWebAuthnSupported;
}
