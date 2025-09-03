import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware, config } from '../middleware';

// Mock Next.js server components
const mockResponse = {
  headers: new Map<string, string>(),
};

const mockRequest = (
  url: string,
  options: Partial<{
    method: string;
    headers: Record<string, string>;
  }> = {}
) => ({
  method: options.method || 'GET',
  nextUrl: new URL(url),
  headers: {
    get: vi.fn((key: string) => options.headers?.[key.toLowerCase()] || null),
  },
});

// Mock NextResponse.next()
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => {
      const response = {
        headers: new Map<string, string>(),
      };

      // Add headers.set method
      response.headers.set = function (key: string, value: string) {
        this.set(key, value);
        return this;
      };

      return response;
    }),
    redirect: vi.fn((url: string, status?: number) => ({
      url,
      status: status || 302,
      headers: new Map(),
    })),
  },
}));

describe('Security Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.NODE_ENV = 'test';
    process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:19006';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CORS Configuration', () => {
    it('should allow configured origins', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:3000' },
      });

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
    });

    it('should allow second configured origin', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:19006' },
      });

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:19006'
      );
    });

    it('should allow localhost with any port in development', () => {
      process.env.NODE_ENV = 'development';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:8080' },
      });

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:8080'
      );
    });

    it('should not allow non-localhost origins in development', () => {
      process.env.NODE_ENV = 'development';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'https://malicious-site.com' },
      });

      middleware(request as any);

      // Should not set Access-Control-Allow-Origin for non-localhost
      expect(mockResponseInstance.headers.set).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://malicious-site.com'
      );
    });

    it('should set CORS credentials and methods', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token'
      );
    });
  });

  describe('Security Headers', () => {
    it('should set standard security headers', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'X-DNS-Prefetch-Control',
        'off'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should set HSTS header in production only', () => {
      process.env.NODE_ENV = 'production';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('https://example.com/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'X-Permitted-Cross-Domain-Policies',
        'none'
      );
    });

    it('should not set HSTS header in development', () => {
      process.env.NODE_ENV = 'development';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );
    });
  });

  describe('Content Security Policy', () => {
    it('should set CSP header with development configuration', () => {
      process.env.NODE_ENV = 'development';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      const cspCall = mockResponseInstance.headers.set.mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall).toBeTruthy();

      const cspValue = cspCall[1];
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      expect(cspValue).toContain("connect-src 'self' http://localhost:*");
      expect(cspValue).toContain("frame-ancestors 'none'");
      expect(cspValue).not.toContain('upgrade-insecure-requests'); // Should be removed in development
    });

    it('should set CSP header with production configuration', () => {
      process.env.NODE_ENV = 'production';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('https://example.com/api/test');

      middleware(request as any);

      const cspCall = mockResponseInstance.headers.set.mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall).toBeTruthy();

      const cspValue = cspCall[1];
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain('upgrade-insecure-requests'); // Should be present in production
    });

    it('should include Supabase domains in connect-src', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      const cspCall = mockResponseInstance.headers.set.mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );

      const cspValue = cspCall[1];
      expect(cspValue).toContain('https://*.supabase.co');
      expect(cspValue).toContain('wss://*.supabase.co');
    });
  });

  describe('HTTPS Redirect', () => {
    it('should redirect HTTP to HTTPS in production', () => {
      process.env.NODE_ENV = 'production';

      const { NextResponse } = require('next/server');
      NextResponse.redirect.mockReturnValue({ redirected: true });

      const request = mockRequest('http://example.com/api/test');

      const result = middleware(request as any);

      expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/api/test', 301);
    });

    it('should not redirect HTTPS in production', () => {
      process.env.NODE_ENV = 'production';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('https://example.com/api/test');

      middleware(request as any);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('should not redirect in development', () => {
      process.env.NODE_ENV = 'development';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('OPTIONS Request Handling', () => {
    it('should handle preflight OPTIONS requests', () => {
      const request = mockRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
      });

      const result = middleware(request as any);

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(200);
    });

    it('should not handle non-OPTIONS requests as preflight', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);

      const request = mockRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      const result = middleware(request as any);

      expect(result).toBe(mockResponseInstance);
    });
  });

  describe('Middleware Configuration', () => {
    it('should have correct matcher configuration', () => {
      expect(config.matcher).toEqual([
        '/api/:path*',
        '/auth/:path*',
        '/((?!_next/static|_next/image|favicon.ico|certificates).*)',
      ]);
    });
  });

  describe('Custom CORS_ORIGIN Environment Variable', () => {
    it('should respect custom CORS_ORIGIN configuration', () => {
      process.env.CORS_ORIGIN = 'https://app.example.com,https://admin.example.com';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'https://app.example.com' },
      });

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://app.example.com'
      );
    });

    it('should trim whitespace from CORS origins', () => {
      process.env.CORS_ORIGIN = ' https://app.example.com , https://admin.example.com ';

      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test', {
        headers: { origin: 'https://admin.example.com' },
      });

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://admin.example.com'
      );
    });
  });

  describe('Security Header Values', () => {
    it('should set X-Frame-Options to DENY', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should prevent MIME type sniffing', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });

    it('should set strict referrer policy', () => {
      const { NextResponse } = require('next/server');
      const mockResponseInstance = { headers: new Map() };
      NextResponse.next.mockReturnValue(mockResponseInstance);
      mockResponseInstance.headers.set = vi.fn();

      const request = mockRequest('http://localhost:3000/api/test');

      middleware(request as any);

      expect(mockResponseInstance.headers.set).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });
  });
});
