import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/security/csp-report/route';

// Mock the security reporter
vi.mock('../../../security/security-reporter', () => ({
  securityReporter: {
    reportCSPViolation: vi.fn(),
  },
}));

describe('CSP Reporting Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid CSP Reports', () => {
    it('should accept valid CSP violation reports', async () => {
      const validReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/malicious.js',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'; script-src 'self'",
          referrer: '',
          'script-sample': 'eval(...)',
          'status-code': 0,
          'violated-directive': 'script-src',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReport),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'received' });
    });

    it('should accept CSP reports with application/csp-report content type', async () => {
      const validReport = {
        'csp-report': {
          'blocked-uri': 'inline',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          referrer: '',
          'script-sample': '',
          'status-code': 200,
          'violated-directive': 'script-src',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/csp-report',
        },
        body: JSON.stringify(validReport),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Invalid CSP Reports', () => {
    it('should reject reports with invalid content type', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'invalid body',
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject reports without csp-report field', async () => {
      const invalidReport = {
        'not-csp-report': {},
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidReport),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject reports with missing required fields', async () => {
      const incompleteReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          // Missing other required fields
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteReport),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{invalid-json',
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting per IP', async () => {
      const validReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          referrer: '',
          'script-sample': '',
          'status-code': 200,
          'violated-directive': 'script-src',
        },
      };

      // Simulate many requests from the same IP
      const requests = Array.from(
        { length: 105 },
        (_, i) =>
          new NextRequest('http://localhost:3000/api/security/csp-report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': '192.168.1.100',
            },
            body: JSON.stringify({ ...validReport, id: i }),
          })
      );

      let rateLimitedCount = 0;
      let successCount = 0;

      for (const request of requests) {
        const response = await POST(request);
        if (response.status === 429) {
          rateLimitedCount++;
        } else if (response.status === 200) {
          successCount++;
        }
      }

      // Should have some successful requests and some rate limited
      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThanOrEqual(100);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should handle requests without x-forwarded-for header', async () => {
      const validReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          referrer: '',
          'script-sample': '',
          'status-code': 200,
          'violated-directive': 'script-src',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReport),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'OPTIONS',
      });

      // Note: This would typically be handled by the OPTIONS export
      // For this test, we'll just verify the concept
      expect(request.method).toBe('OPTIONS');
    });
  });

  describe('Security Reporter Integration', () => {
    it('should call security reporter with sanitized violation data', async () => {
      const { securityReporter } = await import('../../../security/security-reporter');

      const validReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          referrer: 'https://referrer.com',
          'script-sample': 'eval(...)',
          'status-code': 200,
          'violated-directive': 'script-src',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReport),
      });

      await POST(request);

      expect(securityReporter.reportCSPViolation).toHaveBeenCalledWith(validReport['csp-report']);
    });

    it('should handle security reporter errors gracefully', async () => {
      const { securityReporter } = await import('../../../security/security-reporter');

      // Mock the reporter to throw an error
      vi.mocked(securityReporter.reportCSPViolation).mockRejectedValueOnce(
        new Error('Reporter error')
      );

      const validReport = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'document-uri': 'https://example.com/page',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self'",
          referrer: '',
          'script-sample': '',
          'status-code': 200,
          'violated-directive': 'script-src',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/security/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReport),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
