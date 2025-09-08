/**
 * Client-Side Storage Encryption Validation Tests
 *
 * Comprehensive tests for storage validator ensuring all sensitive data
 * is properly encrypted before storage in client-side storage mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import StorageValidator from '../../src/client/storage-validator';

// Mock localStorage and sessionStorage
const mockStorage = () => {
  let store: Record<string, string> = {};
  let _length: number = 0;

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return _length > 0 ? _length : Object.keys(store).length;
    },
    set length(value: number) {
      _length = value;
    },
  };
};

// Mock document.cookie
const mockCookie = {
  value: '',
  get cookie() {
    return this.value;
  },
  set cookie(val: string) {
    this.value = val;
  },
};

describe('StorageValidator', () => {
  let validator: StorageValidator;
  let mockLocalStorage: ReturnType<typeof mockStorage>;
  let mockSessionStorage: ReturnType<typeof mockStorage>;

  beforeEach(() => {
    validator = new StorageValidator();
    mockLocalStorage = mockStorage();
    mockSessionStorage = mockStorage();

    // Mock global storage objects
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      get: () => mockCookie.cookie,
      set: (val: string) => {
        mockCookie.cookie = val;
      },
      configurable: true,
    });

    // Reset cookie
    mockCookie.value = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockCookie.value = '';
  });

  describe('localStorage Validation', () => {
    it('should pass for encrypted storage items', async () => {
      const encryptedData = JSON.stringify({
        version: 1,
        algorithm: 'XChaCha20-Poly1305',
        iv: 'dGVzdGl2MTIzNDU2NzhhYmNkZWY=',
        encryptedData: 'ZW5jcnlwdGVkVGVzdERhdGFIZXJl',
        timestamp: new Date().toISOString(),
      });

      mockLocalStorage.setItem('encryptedCycleData', encryptedData);
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.isValid).toBe(true);
      expect(result.encryptedItems).toBe(1);
      expect(result.unencryptedItems).toBe(0);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail for unencrypted health data', async () => {
      mockLocalStorage.setItem('cycleData', 'period started today');
      mockLocalStorage.setItem('fertilityWindow', 'ovulation detected');
      mockLocalStorage.length = 2;

      const result = await validator.validateStorage('localStorage');

      expect(result.isValid).toBe(false);
      expect(result.unencryptedItems).toBe(2);
      expect(result.violations.length).toBeGreaterThan(0);

      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    it('should allow unencrypted UI preferences', async () => {
      mockLocalStorage.setItem('theme', 'dark');
      mockLocalStorage.setItem('language', 'en');
      mockLocalStorage.length = 2;

      const result = await validator.validateStorage('localStorage');

      expect(result.isValid).toBe(true);
      expect(result.unencryptedItems).toBe(2);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect weak encryption algorithms', async () => {
      const weakEncryptedData = JSON.stringify({
        version: 1,
        algorithm: 'AES-ECB', // Weak algorithm
        iv: 'dGVzdGl2',
        encryptedData: 'ZW5jcnlwdGVkVGVzdERhdGE=',
      });

      mockLocalStorage.setItem('weakData', weakEncryptedData);
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.violationType === 'weak_encryption')).toBe(true);
    });

    it('should detect missing IV/nonce', async () => {
      const noIVData = JSON.stringify({
        version: 1,
        algorithm: 'XChaCha20-Poly1305',
        iv: '', // Missing IV
        encryptedData: 'ZW5jcnlwdGVkVGVzdERhdGE=',
      });

      mockLocalStorage.setItem('noIVData', noIVData);
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.isValid).toBe(false);
      const criticalViolations = result.violations.filter(
        v => v.violationType === 'weak_encryption' && v.severity === 'critical'
      );
      expect(criticalViolations.length).toBeGreaterThan(0);
    });
  });

  describe('sessionStorage Validation', () => {
    it('should validate sessionStorage similarly to localStorage', async () => {
      const sensitiveData = 'user birth date: 1990-01-01';
      mockSessionStorage.setItem('birthdate', sensitiveData);
      mockSessionStorage.length = 1;

      const result = await validator.validateStorage('sessionStorage');

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.violationType === 'unencrypted_sensitive')).toBe(true);
    });

    it('should allow temporary UI state', async () => {
      mockSessionStorage.setItem('activeTab', 'dashboard');
      mockSessionStorage.length = 1;

      const result = await validator.validateStorage('sessionStorage');

      expect(result.isValid).toBe(true);
    });
  });

  describe('Cookie Validation', () => {
    it('should detect sensitive data in cookies', async () => {
      mockCookie.value = 'cycleData=period-active; theme=dark; userEmail=test@example.com';

      const result = await validator.validateStorage('cookies');

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      // Should detect both cycle data and email
      const sensitiveViolations = result.violations.filter(
        v => v.violationType === 'unencrypted_sensitive'
      );
      expect(sensitiveViolations.length).toBeGreaterThan(0);
    });

    it('should allow safe cookies', async () => {
      mockCookie.value = 'theme=dark; language=en; preferences=minimal';

      const result = await validator.validateStorage('cookies');

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should validate encrypted cookie values', async () => {
      const encryptedValue = JSON.stringify({
        version: 1,
        algorithm: 'XChaCha20-Poly1305',
        iv: 'dGVzdGl2MTIzNDU2NzhhYmNkZWY=',
        encryptedData: 'ZW5jcnlwdGVkVGVzdERhdGE=',
      });

      mockCookie.value = `userData=${encodeURIComponent(encryptedValue)}`;

      const result = await validator.validateStorage('cookies');

      expect(result.isValid).toBe(true);
      expect(result.encryptedItems).toBe(1);
    });
  });

  describe('IndexedDB Validation', () => {
    it('should handle IndexedDB validation gracefully', async () => {
      // Mock IndexedDB not being available
      Object.defineProperty(window, 'indexedDB', {
        value: undefined,
        writable: true,
      });

      const result = await validator.validateStorage('indexedDB');

      expect(result.totalItems).toBe(0);
      // Should not fail completely, just indicate IndexedDB unavailable
    });
  });

  describe('All Storage Validation', () => {
    it('should validate all storage types and return results map', async () => {
      // Set up data in different storage types
      mockLocalStorage.setItem('theme', 'dark');
      mockLocalStorage.length = 1;

      mockSessionStorage.setItem('cycleData', 'sensitive health data');
      mockSessionStorage.length = 1;

      mockCookie.value = 'preferences=safe';

      const results = await validator.validateAllStorage();

      expect(results.size).toBeGreaterThan(0);
      expect(results.has('localStorage')).toBe(true);
      expect(results.has('sessionStorage')).toBe(true);
      expect(results.has('cookies')).toBe(true);

      // localStorage should pass (safe theme data)
      expect(results.get('localStorage')?.isValid).toBe(true);

      // sessionStorage should fail (unencrypted sensitive data)
      expect(results.get('sessionStorage')?.isValid).toBe(false);

      // cookies should pass (safe preferences)
      expect(results.get('cookies')?.isValid).toBe(true);
    });
  });

  describe('Risk Scoring', () => {
    it('should assign higher risk to health data violations', async () => {
      mockLocalStorage.setItem('menstrualCycle', 'period data');
      mockLocalStorage.setItem('fertility', 'ovulation tracking');
      mockLocalStorage.length = 2;

      const result = await validator.validateStorage('localStorage');

      expect(result.riskScore).toBeGreaterThan(100); // Should be high risk

      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    it('should assign medium risk to general PII', async () => {
      mockLocalStorage.setItem('email', 'user@example.com');
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThan(200); // Should be less than health data
    });
  });

  describe('Recommendations Generation', () => {
    it('should provide encryption recommendations for unencrypted sensitive data', async () => {
      mockLocalStorage.setItem('cycleData', 'period information');
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.recommendations).toContain(
        'Encrypt all sensitive data before storing in localStorage'
      );
      expect(result.recommendations).toContain(
        'Use crypto-core library for consistent encryption across the application'
      );
    });

    it('should provide algorithm recommendations for weak encryption', async () => {
      const weakData = JSON.stringify({
        version: 1,
        algorithm: 'DES', // Deprecated algorithm
        iv: 'test',
        encryptedData: 'data',
      });

      mockLocalStorage.setItem('weakEncryption', weakData);
      mockLocalStorage.length = 1;

      const result = await validator.validateStorage('localStorage');

      expect(result.recommendations.some(r => r.includes('approved encryption algorithms'))).toBe(
        true
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive storage validation report', async () => {
      // Set up mixed storage scenario
      mockLocalStorage.setItem('theme', 'dark'); // Safe
      mockLocalStorage.setItem('cycleData', 'sensitive'); // Unsafe
      mockLocalStorage.length = 2;

      const results = await validator.validateAllStorage();
      const report = validator.generateReport(results);

      expect(report).toContain('Client-Side Storage Encryption Validation Report');
      expect(report).toContain('Storage Types Validated:');
      expect(report).toContain('Total Storage Items:');
      expect(report).toContain('Encryption Rate:');
      expect(report).toMatch(/✅ PASS|❌ FAIL/);
    });

    it('should show detailed breakdown by storage type', async () => {
      mockLocalStorage.setItem('safe', 'theme');
      mockLocalStorage.setItem('unsafe', 'cycle data here');
      mockLocalStorage.length = 2;

      const results = await validator.validateAllStorage();
      const report = validator.generateReport(results);

      expect(report).toContain('LOCALSTORAGE Storage');
      expect(report).toContain('Items: 2');
      expect(report).toContain('Encrypted:');
      expect(report).toContain('Unencrypted:');
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom allowed patterns', async () => {
      const customValidator = new StorageValidator({
        allowedUnencryptedPatterns: [/customSafe/gi],
        maxUnencryptedSize: 50,
      });

      mockLocalStorage.setItem('customSafeData', 'this should be allowed');
      mockLocalStorage.length = 1;

      const result = await customValidator.validateStorage('localStorage');

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should respect custom storage types', async () => {
      const customValidator = new StorageValidator({
        storageTypes: ['localStorage'], // Only validate localStorage
      });

      const results = await customValidator.validateAllStorage();

      expect(results.size).toBe(1);
      expect(results.has('localStorage')).toBe(true);
      expect(results.has('sessionStorage')).toBe(false);
    });
  });
});
