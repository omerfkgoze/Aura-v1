import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CSPPolicy } from '../../../middleware/csp';

describe('CSP Policy Enforcement', () => {
  let cspPolicy: CSPPolicy;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Production Configuration', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      cspPolicy = new CSPPolicy({
        reportUri: '/api/security/csp-report',
        enableTrustedTypes: true,
        enableWasm: true,
      });
    });

    it('should generate strict CSP policy for production', () => {
      const policy = cspPolicy.generatePolicy();

      // Should include nonce-based script execution
      expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);

      // Should include WASM support
      expect(policy).toContain("'wasm-unsafe-eval'");

      // Should not allow unsafe-inline or unsafe-eval in production
      expect(policy).not.toContain("'unsafe-inline'");
      expect(policy).not.toContain("'unsafe-eval'");

      // Should include upgrade-insecure-requests
      expect(policy).toContain('upgrade-insecure-requests');

      // Should include Trusted Types
      expect(policy).toContain("require-trusted-types-for 'script'");
      expect(policy).toContain("trusted-types default 'allow-duplicates'");

      // Should include reporting
      expect(policy).toContain('report-uri /api/security/csp-report');
      expect(policy).toContain('report-to csp-endpoint');
    });

    it('should include Supabase domains in connect-src', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain('https://*.supabase.co');
      expect(policy).toContain('wss://*.supabase.co');
    });

    it('should block object-src completely', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("object-src 'none'");
    });

    it('should prevent framing', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("frame-ancestors 'none'");
    });
  });

  describe('Development Configuration', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      cspPolicy = new CSPPolicy({
        reportUri: '/api/security/csp-report',
        enableTrustedTypes: false,
        enableWasm: true,
      });
    });

    it('should allow unsafe-eval and unsafe-inline for development', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("'unsafe-eval'");
      expect(policy).toContain("'unsafe-inline'");
    });

    it('should allow localhost connections', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain('http://localhost:*');
      expect(policy).toContain('ws://localhost:*');
      expect(policy).toContain('http://127.0.0.1:*');
    });

    it('should not include upgrade-insecure-requests in development', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).not.toContain('upgrade-insecure-requests');
    });

    it('should not include Trusted Types when disabled', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).not.toContain("require-trusted-types-for 'script'");
      expect(policy).not.toContain('trusted-types');
    });
  });

  describe('Nonce Generation', () => {
    beforeEach(() => {
      cspPolicy = new CSPPolicy();
    });

    it('should generate unique nonces', () => {
      const policy1 = new CSPPolicy();
      const policy2 = new CSPPolicy();

      expect(policy1.getNonce()).not.toBe(policy2.getNonce());
    });

    it('should generate base64 encoded nonces', () => {
      const nonce = cspPolicy.getNonce();
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should include nonce in script-src directive', () => {
      const nonce = cspPolicy.getNonce();
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain(`'nonce-${nonce}'`);
    });
  });

  describe('WASM Support', () => {
    it('should include wasm-unsafe-eval when enabled', () => {
      const policy = new CSPPolicy({ enableWasm: true });
      expect(policy.generatePolicy()).toContain("'wasm-unsafe-eval'");
    });

    it('should not include wasm-unsafe-eval when disabled', () => {
      const policy = new CSPPolicy({ enableWasm: false });
      expect(policy.generatePolicy()).not.toContain("'wasm-unsafe-eval'");
    });
  });

  describe('Style Source Configuration', () => {
    it('should allow unsafe-inline for styles (Tamagui compatibility)', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    });
  });

  describe('Image and Media Sources', () => {
    it('should allow data: and https: for images', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("img-src 'self' data: https:");
    });

    it('should allow self and data: for fonts', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("font-src 'self' data:");
    });

    it('should allow self for media', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("media-src 'self'");
    });
  });

  describe('Worker and Manifest Support', () => {
    it('should allow self and blob: for workers', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("worker-src 'self' blob:");
    });

    it('should allow self for manifests', () => {
      const policy = cspPolicy.generatePolicy();
      expect(policy).toContain("manifest-src 'self'");
    });
  });
});
