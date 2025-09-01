import { describe, it, expect, beforeAll } from 'vitest';
import init, {
  test_crypto_core,
  create_envelope,
  generate_encryption_key,
  create_cycle_data_aad,
  CryptoEnvelope,
  CryptoKey,
  AADValidator,
} from '../pkg/crypto_core';

describe('WASM Integration Tests', () => {
  beforeAll(async () => {
    // Initialize WASM module
    await init();
  });

  it('should initialize WASM module successfully', () => {
    const result = test_crypto_core();
    expect(result).toBe('Crypto core is working!');
  });

  it('should create crypto envelope', () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const nonce = new Uint8Array([5, 6, 7, 8]);
    const tag = new Uint8Array([9, 10, 11, 12]);

    const envelope = create_envelope(data, nonce, tag);

    expect(envelope).toBeInstanceOf(CryptoEnvelope);
    expect(envelope.encrypted_data).toEqual(data);
    expect(envelope.nonce).toEqual(nonce);
    expect(envelope.tag).toEqual(tag);

    envelope.free(); // Clean up memory
  });

  it('should generate encryption key', () => {
    const key = generate_encryption_key();

    expect(key).toBeInstanceOf(CryptoKey);
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

    // AAD should include user ID and timestamp
    const aadStr = new TextDecoder().decode(aad);
    expect(aadStr).toContain('cycle_data');
    expect(aadStr).toContain(userId);
  });

  it('should validate AAD correctly', () => {
    const validator = new AADValidator('test_context');
    validator.set_user_id('test-user');
    validator.set_timestamp(BigInt(12345));

    const aad = validator.generate_aad();
    expect(validator.validate_aad(aad)).toBe(true);

    // Wrong AAD should fail validation
    const wrongAad = new Uint8Array([1, 2, 3]);
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
