import { vi } from 'vitest';

// Mock Next.js server imports
vi.mock('next/server', () => {
  const mockHeaders = new Map();
  mockHeaders.set = vi.fn();
  mockHeaders.get = vi.fn();

  const mockResponse = {
    headers: mockHeaders,
  };

  return {
    NextRequest: vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const request = {
        url,
        method: init?.method || 'GET',
        headers: new Map(Object.entries(init?.headers || {})),
        nextUrl: new URL(url),
      };

      // Add headers.get method
      request.headers.get = function (key: string) {
        return this.get(key) || null;
      };

      return request;
    }),
    NextResponse: {
      next: vi.fn(() => mockResponse),
      redirect: vi.fn((url: string, status?: number) => ({
        url,
        status: status || 302,
        headers: new Map(),
      })),
    },
  };
});

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['CORS_ORIGIN'] = 'http://localhost:3000,http://localhost:19006';

// Mock console methods to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
