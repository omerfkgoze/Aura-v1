import { vi } from 'vitest';

// Mock pino for testing environment
vi.mock('pino', () => ({
  default: vi.fn((config: any) => ({
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock os module for hostname
vi.mock('os', () => ({
  hostname: vi.fn(() => 'test-hostname'),
}));

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.APP_VERSION = '1.0.0-test';
