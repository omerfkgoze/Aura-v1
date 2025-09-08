import { NextRequest, NextResponse } from 'next/server';
import { generateSecureNonce } from '../security/csp-nonce-manager';

export interface CSPConfig {
  reportUri?: string;
  enableTrustedTypes?: boolean;
  enableWasm?: boolean;
  isDevelopment?: boolean;
}

export class CSPPolicy {
  private nonce: string;
  private config: CSPConfig;

  constructor(config: CSPConfig = {}) {
    this.nonce = generateSecureNonce();
    this.config = {
      enableWasm: true,
      enableTrustedTypes: true,
      isDevelopment: process.env['NODE_ENV'] === 'development',
      ...config,
    };
  }

  getNonce(): string {
    return this.nonce;
  }

  generatePolicy(): string {
    const directives = [
      "default-src 'self'",
      this.getScriptSrc(),
      this.getStyleSrc(),
      this.getConnectSrc(),
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
      "media-src 'self'",
      "worker-src 'self' blob:",
    ];

    if (this.config.enableTrustedTypes) {
      directives.push("require-trusted-types-for 'script'");
      directives.push("trusted-types default 'allow-duplicates'");
    }

    if (this.config.reportUri) {
      directives.push(`report-uri ${this.config.reportUri}`);
      directives.push(`report-to csp-endpoint`);
    }

    if (!this.config.isDevelopment) {
      directives.push('upgrade-insecure-requests');
    }

    return directives.join('; ');
  }

  private getScriptSrc(): string {
    const sources = ["'self'", `'nonce-${this.nonce}'`];

    if (this.config.enableWasm) {
      sources.push("'wasm-unsafe-eval'");
    }

    if (this.config.isDevelopment) {
      sources.push("'unsafe-eval'", "'unsafe-inline'");
    }

    return `script-src ${sources.join(' ')}`;
  }

  private getStyleSrc(): string {
    const sources = ["'self'"];

    // Allow inline styles for Tamagui and development
    sources.push("'unsafe-inline'");

    return `style-src ${sources.join(' ')}`;
  }

  private getConnectSrc(): string {
    const sources = ["'self'"];

    // Add Supabase endpoints
    sources.push('https://*.supabase.co', 'wss://*.supabase.co');

    if (this.config.isDevelopment) {
      sources.push('http://localhost:*', 'ws://localhost:*', 'http://127.0.0.1:*');
    }

    if (this.config.reportUri) {
      sources.push(this.config.reportUri);
    }

    return `connect-src ${sources.join(' ')}`;
  }
}

export function createCSPMiddleware(config?: CSPConfig) {
  return (request: NextRequest, response: NextResponse) => {
    const cspPolicy = new CSPPolicy(config);
    const nonce = cspPolicy.getNonce();

    // Set CSP header
    response.headers.set('Content-Security-Policy', cspPolicy.generatePolicy());

    // Add nonce to request headers for use in components
    response.headers.set('X-CSP-Nonce', nonce);

    // Set Report-To header for CSP reporting
    if (config?.reportUri) {
      const reportTo = JSON.stringify({
        group: 'csp-endpoint',
        max_age: 86400,
        endpoints: [{ url: config.reportUri }],
        include_subdomains: true,
      });
      response.headers.set('Report-To', reportTo);
    }

    return response;
  };
}
