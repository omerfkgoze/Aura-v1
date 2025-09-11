/**
 * Simple test to verify OPAQUE library loading
 */

import { describe, it, expect } from 'vitest';

describe('OPAQUE Library Test', () => {
  it('should import OPAQUE constants', async () => {
    const { OPAQUE_CONSTANTS } = await import('../src/opaque');

    expect(OPAQUE_CONSTANTS).toBeDefined();
    expect(OPAQUE_CONSTANTS.MIN_PASSWORD_LENGTH).toBe(8);
    expect(OPAQUE_CONSTANTS.MAX_PASSWORD_LENGTH).toBe(128);
  });

  it('should create OPAQUE auth system factory', async () => {
    const { createOpaqueAuthSystem } = await import('../src/opaque');

    expect(createOpaqueAuthSystem).toBeDefined();
    expect(typeof createOpaqueAuthSystem).toBe('function');
  });

  it('should validate registration inputs', async () => {
    const { validateRegistrationInputs } = await import('../src/opaque');

    const result = validateRegistrationInputs('testuser', 'StrongP@ss123');
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate authentication inputs', async () => {
    const { validateAuthenticationInputs } = await import('../src/opaque');

    const result = validateAuthenticationInputs('testuser', 'password');
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
