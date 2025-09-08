import { NextRequest, NextResponse } from 'next/server';

export interface SecurityHeadersConfig {
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  contentTypeOptions?: boolean;
  referrerPolicy?: string;
  xssProtection?: boolean;
  permissionsPolicy?: string[];
}

export class SecurityHeaders {
  private config: Required<SecurityHeadersConfig>;
  private isDevelopment: boolean;

  constructor(config: SecurityHeadersConfig = {}) {
    this.isDevelopment = process.env['NODE_ENV'] === 'development';
    this.config = {
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
        ...config.hsts,
      },
      frameOptions: config.frameOptions || 'DENY',
      contentTypeOptions: config.contentTypeOptions !== false,
      referrerPolicy: config.referrerPolicy || 'strict-origin-when-cross-origin',
      xssProtection: config.xssProtection !== false,
      permissionsPolicy: config.permissionsPolicy || [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'serial=()',
        'bluetooth=()',
      ],
    };
  }

  applyHeaders(request: NextRequest, response: NextResponse): void {
    // HTTP Strict Transport Security (HSTS)
    if (!this.isDevelopment) {
      const hstsValue = this.buildHSTSHeader();
      response.headers.set('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options for clickjacking protection
    response.headers.set('X-Frame-Options', this.config.frameOptions);

    // X-Content-Type-Options for MIME type sniffing protection
    if (this.config.contentTypeOptions) {
      response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // Referrer Policy for privacy protection
    response.headers.set('Referrer-Policy', this.config.referrerPolicy);

    // X-XSS-Protection (legacy but still useful)
    if (this.config.xssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block');
    }

    // Permissions Policy for capability restriction
    if (this.config.permissionsPolicy.length > 0) {
      const permissionsValue = this.config.permissionsPolicy.join(', ');
      response.headers.set('Permissions-Policy', permissionsValue);
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off');
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
  }

  private buildHSTSHeader(): string {
    const parts = [`max-age=${this.config.hsts.maxAge}`];

    if (this.config.hsts.includeSubDomains) {
      parts.push('includeSubDomains');
    }

    if (this.config.hsts.preload) {
      parts.push('preload');
    }

    return parts.join('; ');
  }
}

export function createSecurityHeadersMiddleware(config?: SecurityHeadersConfig) {
  const securityHeaders = new SecurityHeaders(config);

  return (request: NextRequest, response: NextResponse) => {
    securityHeaders.applyHeaders(request, response);
    return response;
  };
}
