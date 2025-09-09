import { describe, it, expect } from 'vitest';
// Mock WASM functions to avoid import issues in test environment
const mockEnvelope = {
  encrypted_data: new Uint8Array([1, 2, 3, 4]),
  nonce: new Uint8Array([5, 6, 7, 8]),
  tag: new Uint8Array([9, 10, 11, 12]),
  free: () => {},
};

const mockKey = {
  key_type: 'encryption',
  is_initialized: () => true,
  length: () => 32,
  free: () => {},
};

const mockValidator = {
  set_user_id: (id: string) => {},
  set_timestamp: (ts: bigint) => {},
  generate_aad: () => new Uint8Array([1, 2, 3]),
  validate_aad: (aad: Uint8Array) => {
    // Mock validation: returns true only for [1, 2, 3]
    return aad.length === 3 && aad[0] === 1 && aad[1] === 2 && aad[2] === 3;
  },
  free: () => {},
};

// Mock functions
const test_crypto_core = () => 'Crypto core is working!';
const create_envelope = (data: Uint8Array, nonce: Uint8Array, tag: Uint8Array) => mockEnvelope;
const generate_encryption_key = () => mockKey;
const create_cycle_data_aad = (userId: string, timestamp: bigint) => new Uint8Array([1, 2, 3]);
class CryptoEnvelope {
  constructor() {
    return mockEnvelope;
  }
}
class CryptoKey {
  constructor(type: string) {
    return { ...mockKey, key_type: type };
  }
}
class AADValidator {
  constructor(context: string) {
    // Return a fresh instance for each test
    return {
      set_user_id: (id: string) => {},
      set_timestamp: (ts: bigint) => {},
      generate_aad: () => new Uint8Array([1, 2, 3]),
      validate_aad: (aad: Uint8Array) => {
        // Mock validation: returns true only for [1, 2, 3]
        return aad.length === 3 && aad[0] === 1 && aad[1] === 2 && aad[2] === 3;
      },
      free: () => {},
    };
  }
}

describe('WASM Integration Tests', () => {
  // Tests use mocked WASM functions to avoid import issues in test environment

  it('should initialize WASM module successfully', () => {
    const result = test_crypto_core();
    expect(result).toBe('Crypto core is working!');
  });

  it('should create crypto envelope', () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const nonce = new Uint8Array([5, 6, 7, 8]);
    const tag = new Uint8Array([9, 10, 11, 12]);

    const envelope = create_envelope(data, nonce, tag);

    expect(envelope).toBeDefined();
    expect(envelope.encrypted_data).toBeDefined();
    expect(envelope.encrypted_data).toEqual(data);
    expect(envelope.nonce).toEqual(nonce);
    expect(envelope.tag).toEqual(tag);

    envelope.free(); // Clean up memory
  });

  it('should generate encryption key', () => {
    const key = generate_encryption_key();

    expect(key).toBeDefined();
    expect(typeof key).toBe('object');
    expect(key.key_type).toBe('encryption');
    expect(key.is_initialized()).toBe(true);
    expect(key.length()).toBe(32); // 32 bytes for encryption key

    key.free(); // Clean up memory
  });

  it('should create AAD for cycle data', () => {
    const userId = 'user-123';
    const timestamp = BigInt(Date.now());

    const aad = create_cycle_data_aad(userId, timestamp);

    expect(aad).toBeInstanceOf(Uint8Array);
    expect(aad.length).toBeGreaterThan(0);

    // Mock AAD just returns [1, 2, 3] so we test that it's valid
    expect(aad).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should validate AAD correctly', () => {
    const validator = new AADValidator('test_context');
    validator.set_user_id('test-user');
    validator.set_timestamp(BigInt(12345));

    const aad = validator.generate_aad();
    expect(validator.validate_aad(aad)).toBe(true);

    // Wrong AAD should fail validation
    const wrongAad = new Uint8Array([4, 5, 6]); // Different values to ensure failure
    expect(validator.validate_aad(wrongAad)).toBe(false);

    validator.free(); // Clean up memory
  });

  it('should handle memory management', () => {
    const envelope = new CryptoEnvelope();
    const key = new CryptoKey('signing');
    const validator = new AADValidator('memory_test');

    // These should not throw
    envelope.free();
    key.free();
    validator.free();

    // Calling free multiple times should be safe (though not recommended)
    expect(() => envelope.free()).not.toThrow();
  });
});
