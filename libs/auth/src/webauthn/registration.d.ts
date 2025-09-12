import type {
  RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/types';
import type {
  WebAuthnRegistrationRequest,
  RegistrationResult,
  PlatformCapabilities,
} from './types';
export declare class WebAuthnRegistration {
  private rpName;
  private rpId;
  constructor(rpName: string, rpId: string);
  generateRegistrationOptions(
    request: WebAuthnRegistrationRequest
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistrationResponse(
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    expectedOrigin: string,
    expectedRPID: string
  ): Promise<RegistrationResult>;
  startRegistration(
    options: PublicKeyCredentialCreationOptionsJSON
  ): Promise<RegistrationResponseJSON>;
  getPlatformCapabilities(): PlatformCapabilities;
  private getAuthenticatorSelection;
  private parsePublicKey;
  private detectPlatform;
  private isWebAuthnSupported;
  private isPasskeysSupported;
  private isBiometricsSupported;
}
