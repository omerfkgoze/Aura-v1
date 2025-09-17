/**
 * OPAQUE Protocol Mock Implementation
 *
 * This module provides mock implementations for testing OPAQUE protocol
 * when the actual @cloudflare/opaque-ts library is not available in Node.js environment.
 */
import { __awaiter } from 'tslib';
/**
 * Mock crypto random generator
 */
function generateRandomBytes(length) {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array.buffer;
}
/**
 * Mock client registration creation
 */
export const createClientRegistration = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation - generates fake data for testing
    const mockRequest = new Uint8Array(generateRandomBytes(32));
    const mockState = new Uint8Array(generateRandomBytes(64));
    return {
      request: mockRequest,
      state: mockState,
    };
  });
/**
 * Mock client registration completion
 */
export const finishClientRegistration = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    return {
      record: generateRandomBytes(128),
      exportKey: generateRandomBytes(32),
    };
  });
/**
 * Mock client login creation
 */
export const createClientLogin = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    const mockRequest = new Uint8Array(generateRandomBytes(32));
    const mockState = new Uint8Array(generateRandomBytes(64));
    return {
      request: mockRequest,
      state: mockState,
    };
  });
/**
 * Mock client login completion
 */
export const finishClientLogin = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    return {
      sessionKey: generateRandomBytes(32),
      exportKey: generateRandomBytes(32),
    };
  });
/**
 * Mock server registration creation
 */
export const createServerRegistration = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    const mockResponse = new Uint8Array(generateRandomBytes(128));
    const mockState = new Uint8Array(generateRandomBytes(96));
    return {
      response: mockResponse,
      state: mockState,
    };
  });
/**
 * Mock server registration completion
 */
export const finishServerRegistration = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    return generateRandomBytes(256);
  });
/**
 * Mock server login creation
 */
export const createServerLogin = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    const mockResponse = new Uint8Array(generateRandomBytes(128));
    const mockState = new Uint8Array(generateRandomBytes(96));
    return {
      response: mockResponse,
      state: mockState,
    };
  });
/**
 * Mock server login completion
 */
export const finishServerLogin = _options =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mock implementation
    return generateRandomBytes(32);
  });
/**
 * Check if we're running in a test environment
 */
export function isTestEnvironment() {
  return (
    typeof process !== 'undefined' &&
    process.env &&
    (process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true')
  );
}
//# sourceMappingURL=mock.js.map
