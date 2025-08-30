import { vi } from 'vitest';

// Mock crypto for testing environment
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      // Deterministic "random" values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i % 256;
      }
      return arr;
    }),
  },
});

// Mock require for Node.js crypto module
vi.mock('crypto', () => ({
  randomBytes: vi.fn((size: number) => {
    const buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = i % 256;
    }
    return buffer;
  }),
}));