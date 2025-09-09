import { describe, it, expect } from 'vitest';
import { initializeDatabaseSecurity } from '../index';

describe('Database Security', () => {
  it('should export main initialization function', () => {
    expect(typeof initializeDatabaseSecurity).toBe('function');
  });

  it('should initialize with default configuration', async () => {
    const result = await initializeDatabaseSecurity({
      environment: 'development',
    });

    expect(result).toHaveProperty('certificatePinning');
    expect(result).toHaveProperty('connectionSecurity');
    expect(result).toHaveProperty('rlsEnforcement');
    expect(result).toHaveProperty('securityLogger');
  });

  it('should allow disabling security features', async () => {
    const result = await initializeDatabaseSecurity({
      enableCertificatePinning: false,
      enableConnectionSecurity: false,
      enableRLSEnforcement: false,
      enableSecurityLogging: false,
      environment: 'development',
    });

    expect(result.certificatePinning).toBeNull();
    expect(result.connectionSecurity).toBeNull();
    expect(result.rlsEnforcement).toBeNull();
    expect(result.securityLogger).toBeNull();
  });
});
