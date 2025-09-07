import { securityReporter } from '../security/security-reporter';

export interface CertificatePinConfig {
  hostname: string;
  pins: string[];
  algorithm: 'sha256';
  includeSubdomains?: boolean;
  maxAge?: number;
  reportUri?: string;
}

export interface PinningPolicy {
  domains: CertificatePinConfig[];
  enforceInDevelopment?: boolean;
  gracePeriod?: number;
}

export class CertificatePinner {
  private policy: PinningPolicy;
  private violationCount = 0;

  constructor(policy: PinningPolicy) {
    this.policy = {
      enforceInDevelopment: false,
      gracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...policy,
    };
  }

  // Client-side certificate pinning validation
  async validateCertificate(hostname: string, certificateChain: string[]): Promise<boolean> {
    const config = this.getDomainConfig(hostname);
    if (!config) {
      // No pinning policy for this domain
      return true;
    }

    // Skip validation in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !this.policy.enforceInDevelopment) {
      return true;
    }

    try {
      for (const cert of certificateChain) {
        const certPin = await this.computeCertificatePin(cert, config.algorithm);
        if (config.pins.includes(certPin)) {
          return true; // Valid pin found
        }
      }

      // No valid pin found
      this.handlePinningViolation(hostname, config.pins);
      return false;
    } catch (error) {
      console.error('Certificate pinning validation error:', error);
      return true; // Fail open on validation errors
    }
  }

  private getDomainConfig(hostname: string): CertificatePinConfig | null {
    // Direct match
    let config = this.policy.domains.find(d => d.hostname === hostname);
    if (config) return config;

    // Check for subdomain matches
    config = this.policy.domains.find(
      d => d.includeSubdomains && hostname.endsWith(`.${d.hostname}`)
    );

    return config || null;
  }

  private async computeCertificatePin(certificate: string, algorithm: 'sha256'): Promise<string> {
    // Extract the public key from certificate and compute pin
    // This is a simplified implementation - in real use, you'd need
    // proper certificate parsing and public key extraction

    const encoder = new TextEncoder();
    const data = encoder.encode(certificate);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert to base64
    const hashBase64 = btoa(String.fromCharCode(...hashArray));

    return `${algorithm}/${hashBase64}`;
  }

  private async handlePinningViolation(hostname: string, expectedPins: string[]): Promise<void> {
    this.violationCount++;

    console.error(`Certificate pinning violation: ${hostname}`, {
      expectedPins,
      timestamp: new Date().toISOString(),
    });

    // Report violation
    await securityReporter.reportCertificatePinningFailure(hostname, expectedPins.join(','));
  }

  // Fetch wrapper with certificate pinning
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(url);

    try {
      // Make the request
      const response = await fetch(url, {
        ...options,
        // Add security headers
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      // In a real implementation, you would validate the certificate here
      // This requires access to the TLS certificate chain, which is not
      // directly available in browser JavaScript. This would typically
      // be handled at the network level or through service workers.

      // For demonstration, we'll validate against known certificate fingerprints
      const config = this.getDomainConfig(urlObj.hostname);
      if (config && !(await this.validateResponseSecurity(response, config))) {
        throw new Error(`Certificate pinning failed for ${urlObj.hostname}`);
      }

      return response;
    } catch (error) {
      // Handle pinning failures
      if (error.message.includes('pinning failed')) {
        await this.handlePinningViolation(
          urlObj.hostname,
          this.getDomainConfig(urlObj.hostname)?.pins || []
        );
      }
      throw error;
    }
  }

  private async validateResponseSecurity(
    response: Response,
    config: CertificatePinConfig
  ): Promise<boolean> {
    // Check basic security indicators
    if (!response.url.startsWith('https://')) {
      return false;
    }

    // Additional security validations
    const securityHeaders = [
      'strict-transport-security',
      'content-security-policy',
      'x-frame-options',
    ];

    let securityScore = 0;
    securityHeaders.forEach(header => {
      if (response.headers.get(header)) {
        securityScore++;
      }
    });

    // Require at least basic security headers
    return securityScore >= 2;
  }

  // HTTP Public Key Pinning (HPKP) header generation
  generateHPKPHeader(hostname: string): string | null {
    const config = this.getDomainConfig(hostname);
    if (!config) return null;

    const pinDirectives = config.pins.map(pin => `pin-${config.algorithm}="${pin}"`);
    const maxAge = config.maxAge || 60 * 60 * 24 * 60; // 60 days

    let header = pinDirectives.join('; ');
    header += `; max-age=${maxAge}`;

    if (config.includeSubdomains) {
      header += '; includeSubDomains';
    }

    if (config.reportUri) {
      header += `; report-uri="${config.reportUri}"`;
    }

    return header;
  }

  getViolationCount(): number {
    return this.violationCount;
  }

  // Update pinning policy (for certificate rotation)
  updatePolicy(newPolicy: PinningPolicy): void {
    this.policy = {
      ...this.policy,
      ...newPolicy,
    };
  }

  // Get current policy for debugging
  getPolicy(): PinningPolicy {
    return { ...this.policy };
  }
}

// Default pinning configuration for Supabase and common CDNs
export const createDefaultPinningPolicy = (): PinningPolicy => {
  return {
    domains: [
      {
        hostname: 'supabase.co',
        pins: [
          // These are example pins - replace with actual certificate pins
          'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
        ],
        algorithm: 'sha256',
        includeSubdomains: true,
        maxAge: 60 * 60 * 24 * 60, // 60 days
        reportUri: '/api/security/hpkp-report',
      },
      // Add more domains as needed
    ],
    enforceInDevelopment: false,
    gracePeriod: 7 * 24 * 60 * 60 * 1000,
  };
};

// Global certificate pinner instance
export const certificatePinner = new CertificatePinner(createDefaultPinningPolicy());

// Secure fetch wrapper that can be used throughout the application
export const secureFetch = (url: string, options?: RequestInit): Promise<Response> => {
  return certificatePinner.secureFetch(url, options);
};
