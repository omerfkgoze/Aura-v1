import type { Platform, PlatformCapabilities } from './types';

export interface PlatformConfig {
  rpName: string;
  rpId: string;
  timeout: number;
  userVerification: UserVerificationRequirement;
  attestation: AttestationConveyancePreference;
}

export interface PlatformSpecificOptions {
  ios: IOSWebAuthnOptions;
  android: AndroidWebAuthnOptions;
  web: WebWebAuthnOptions;
}

export interface IOSWebAuthnOptions {
  requiresPlatformAttachment: boolean;
  preferredBiometric: 'faceId' | 'touchId' | 'any';
  keychainAccessGroup?: string;
  secureEnclaveRequired: boolean;
}

export interface AndroidWebAuthnOptions {
  requiresPlatformAttachment: boolean;
  preferredBiometric: 'fingerprint' | 'face' | 'iris' | 'any';
  strongBoxRequired: boolean;
  confirmationRequired: boolean;
}

export interface WebWebAuthnOptions {
  preferredAuthenticatorTypes: ('platform' | 'cross-platform')[];
  allowedTransports: AuthenticatorTransport[];
  requireUserVerification: boolean;
  conditionalMediation: boolean;
}

export class PlatformWebAuthnManager {
  private config: PlatformConfig;
  private platformOptions: PlatformSpecificOptions;

  constructor(config: PlatformConfig) {
    this.config = config;
    this.platformOptions = this.getDefaultPlatformOptions();
  }

  getPlatformCapabilities(): PlatformCapabilities {
    const platform = this.detectPlatform();

    return {
      supportsWebAuthn: this.isWebAuthnSupported(),
      supportsPasskeys: this.isPasskeysSupported(platform),
      supportsBiometrics: this.isBiometricsSupported(platform),
      platform,
    };
  }

  getRegistrationOptionsForPlatform(platform: Platform): any {
    const baseOptions = {
      rpName: this.config.rpName,
      rpID: this.config.rpId,
      timeout: this.config.timeout,
      attestation: this.config.attestation,
      userVerification: this.config.userVerification,
    };

    switch (platform) {
      case 'ios':
        return this.getIOSRegistrationOptions(baseOptions);
      case 'android':
        return this.getAndroidRegistrationOptions(baseOptions);
      case 'web':
        return this.getWebRegistrationOptions(baseOptions);
      default:
        return baseOptions;
    }
  }

  getAuthenticationOptionsForPlatform(platform: Platform): any {
    const baseOptions = {
      rpID: this.config.rpId,
      timeout: this.config.timeout,
      userVerification: this.config.userVerification,
    };

    switch (platform) {
      case 'ios':
        return this.getIOSAuthenticationOptions(baseOptions);
      case 'android':
        return this.getAndroidAuthenticationOptions(baseOptions);
      case 'web':
        return this.getWebAuthenticationOptions(baseOptions);
      default:
        return baseOptions;
    }
  }

  private getIOSRegistrationOptions(baseOptions: any): any {
    const iosOptions = this.platformOptions.ios;

    return {
      ...baseOptions,
      authenticatorSelection: {
        authenticatorAttachment: iosOptions.requiresPlatformAttachment ? 'platform' : undefined,
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: {
        credProps: true,
        largeBlob: { support: 'preferred' },
      },
    };
  }

  private getAndroidRegistrationOptions(baseOptions: any): any {
    const androidOptions = this.platformOptions.android;

    return {
      ...baseOptions,
      authenticatorSelection: {
        authenticatorAttachment: androidOptions.requiresPlatformAttachment ? 'platform' : undefined,
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'required',
      },
      extensions: {
        credProps: true,
        uvm: true,
      },
    };
  }

  private getWebRegistrationOptions(baseOptions: any): any {
    const webOptions = this.platformOptions.web;

    return {
      ...baseOptions,
      authenticatorSelection: {
        authenticatorAttachment: webOptions.preferredAuthenticatorTypes.includes('platform')
          ? 'platform'
          : undefined,
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: webOptions.requireUserVerification ? 'required' : 'preferred',
      },
      extensions: {
        credProps: true,
        largeBlob: { support: 'preferred' },
        hmacCreateSecret: true,
      },
    };
  }

  private getIOSAuthenticationOptions(baseOptions: any): any {
    return {
      ...baseOptions,
      extensions: {
        largeBlob: { read: true },
      },
    };
  }

  private getAndroidAuthenticationOptions(baseOptions: any): any {
    return {
      ...baseOptions,
      extensions: {
        uvm: true,
      },
    };
  }

  private getWebAuthenticationOptions(baseOptions: any): any {
    const webOptions = this.platformOptions.web;

    return {
      ...baseOptions,
      extensions: {
        largeBlob: { read: true },
        hmacGetSecret: { salt1: new Uint8Array(32) },
      },
      mediation: webOptions.conditionalMediation ? 'conditional' : 'optional',
    };
  }

  private getDefaultPlatformOptions(): PlatformSpecificOptions {
    return {
      ios: {
        requiresPlatformAttachment: true,
        preferredBiometric: 'any',
        secureEnclaveRequired: true,
      },
      android: {
        requiresPlatformAttachment: true,
        preferredBiometric: 'any',
        strongBoxRequired: true,
        confirmationRequired: true,
      },
      web: {
        preferredAuthenticatorTypes: ['platform', 'cross-platform'],
        allowedTransports: ['usb', 'nfc', 'ble', 'internal', 'hybrid'],
        requireUserVerification: true,
        conditionalMediation: true,
      },
    };
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
      typeof navigator.credentials?.create === 'function' &&
      typeof navigator.credentials?.get === 'function'
    );
  }

  private isPasskeysSupported(platform: Platform): boolean {
    if (!this.isWebAuthnSupported()) {
      return false;
    }

    switch (platform) {
      case 'ios':
        // iOS 16+ supports passkeys
        return this.isIOSVersionSupported(16);
      case 'android':
        // Android 13+ supports passkeys
        return this.isAndroidVersionSupported(13);
      case 'web':
        return typeof PublicKeyCredential.isConditionalMediationAvailable === 'function';
      default:
        return false;
    }
  }

  private isBiometricsSupported(platform: Platform): boolean {
    switch (platform) {
      case 'ios':
        return 'TouchID' in window || 'FaceID' in window || this.isWebAuthnSupported();
      case 'android':
        return 'BiometricManager' in window || this.isWebAuthnSupported();
      case 'web':
        return this.isWebAuthnSupported();
      default:
        return false;
    }
  }

  private isIOSVersionSupported(minVersion: number): boolean {
    if (typeof navigator === 'undefined') return false;

    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (!match) return false;

    const version = parseInt(match[1], 10);
    return version >= minVersion;
  }

  private isAndroidVersionSupported(minVersion: number): boolean {
    if (typeof navigator === 'undefined') return false;

    const match = navigator.userAgent.match(/Android (\d+)/);
    if (!match) return false;

    const version = parseInt(match[1], 10);
    return version >= minVersion;
  }
}
