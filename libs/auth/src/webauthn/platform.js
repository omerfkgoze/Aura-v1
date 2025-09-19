export class PlatformWebAuthnManager {
  config;
  platformOptions;
  constructor(config) {
    this.config = config;
    this.platformOptions = this.getDefaultPlatformOptions();
  }
  getPlatformCapabilities() {
    const platform = this.detectPlatform();
    return {
      supportsWebAuthn: this.isWebAuthnSupported(),
      supportsPasskeys: this.isPasskeysSupported(platform),
      supportsBiometrics: this.isBiometricsSupported(platform),
      platform,
    };
  }
  getRegistrationOptionsForPlatform(platform) {
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
  getAuthenticationOptionsForPlatform(platform) {
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
  getIOSRegistrationOptions(baseOptions) {
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
  getAndroidRegistrationOptions(baseOptions) {
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
  getWebRegistrationOptions(baseOptions) {
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
  getIOSAuthenticationOptions(baseOptions) {
    return {
      ...baseOptions,
      extensions: {
        largeBlob: { read: true },
      },
    };
  }
  getAndroidAuthenticationOptions(baseOptions) {
    return {
      ...baseOptions,
      extensions: {
        uvm: true,
      },
    };
  }
  getWebAuthenticationOptions(baseOptions) {
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
  getDefaultPlatformOptions() {
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
      typeof navigator.credentials?.create === 'function' &&
      typeof navigator.credentials?.get === 'function'
    );
  }
  isPasskeysSupported(platform) {
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
        return (
          typeof PublicKeyCredential !== 'undefined' &&
          typeof PublicKeyCredential.isConditionalMediationAvailable === 'function'
        );
      default:
        return false;
    }
  }
  isBiometricsSupported(platform) {
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
  isIOSVersionSupported(minVersion) {
    if (typeof navigator === 'undefined') return false;
    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (!match) return false;
    const version = parseInt(match[1], 10);
    return version >= minVersion;
  }
  isAndroidVersionSupported(minVersion) {
    if (typeof navigator === 'undefined') return false;
    const match = navigator.userAgent.match(/Android (\d+)/);
    if (!match) return false;
    const version = parseInt(match[1], 10);
    return version >= minVersion;
  }
}
//# sourceMappingURL=platform.js.map
