import {
  DatabaseIntegrityVerifier,
  DatabaseIntegrityResult,
  IntegrityViolation,
} from '../database-integrity-verifier';
import { CryptoCore } from '@aura/crypto-core';
import { SQLCipherManager } from '../sqlite-cipher';
import { RealmEncryptedDatabase } from '../realm-encrypted-db';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-file-system');
jest.mock('expo-secure-store');
jest.mock('@aura/crypto-core');
jest.mock('../sqlite-cipher');
jest.mock('../realm-encrypted-db');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockCryptoCore = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  generateKey: jest.fn(),
  zeroize: jest.fn(),
} as jest.Mocked<CryptoCore>;

const mockSQLCipherManager = {
  validateStructure: jest.fn(),
  getDbPath: jest.fn(),
} as jest.Mocked<SQLCipherManager>;

const mockRealmDatabase = {
  validateSchema: jest.fn(),
  getPath: jest.fn(),
} as jest.Mocked<RealmEncryptedDatabase>;

describe('DatabaseIntegrityVerifier', () => {
  let integrityVerifier: DatabaseIntegrityVerifier;
  let violationCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(FileSystem, 'documentDirectory', {
      value: '/mock/document/directory/',
      writable: true,
    });

    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 1024,
      modificationTime: Date.now(),
      uri: '/mock/file/path',
    });

    mockFileSystem.readAsStringAsync.mockResolvedValue('mock-file-content');

    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.deleteItemAsync.mockResolvedValue();

    integrityVerifier = new DatabaseIntegrityVerifier(
      mockCryptoCore,
      mockSQLCipherManager,
      mockRealmDatabase
    );

    violationCallback = jest.fn();
    integrityVerifier.onViolationDetected(violationCallback);
  });

  describe('Initialization', () => {
    test('should initialize with integrity key generation', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      await integrityVerifier.initialize();

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'aura.integrity.key.master',
        expect.any(String),
        expect.objectContaining({
          keychainService: 'AuraIntegritySystem',
          requireAuthentication: true,
        })
      );

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'aura.integrity.monitoring',
        expect.stringContaining('"enabled":true'),
        expect.objectContaining({
          keychainService: 'AuraIntegritySystem',
        })
      );
    });

    test('should use existing integrity key if available', async () => {
      const existingKey = Buffer.from('existing-integrity-key').toString('base64');
      mockSecureStore.getItemAsync.mockResolvedValueOnce(existingKey);

      await integrityVerifier.initialize();

      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalledWith(
        'aura.integrity.key.master',
        expect.any(String),
        expect.any(Object)
      );
    });

    test('should handle initialization failure', async () => {
      mockSecureStore.setItemAsync.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(integrityVerifier.initialize()).rejects.toThrow(
        'Integrity verifier initialization failed: Storage failed'
      );
    });
  });

  describe('Cryptographic Integrity Validation', () => {
    beforeEach(async () => {
      const mockKey = Buffer.from('test-integrity-key').toString('base64');
      mockSecureStore.getItemAsync.mockResolvedValueOnce(mockKey);
      await integrityVerifier.initialize();
    });

    test('should perform comprehensive database integrity validation', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        modificationTime: Date.now(),
      });

      const testChecksum = 'mock-checksum-hash';
      mockSecureStore.getItemAsync.mockImplementation(key => {
        if (key.includes('checksum')) {
          return Promise.resolve(testChecksum);
        }
        return Promise.resolve(null);
      });

      const mockCalculateFileChecksum = jest.fn().mockResolvedValue(testChecksum);
      (integrityVerifier as any).calculateFileChecksum = mockCalculateFileChecksum;

      const result = await integrityVerifier.validateDatabaseIntegrity();

      expect(result.overallStatus).toBe('valid');
      expect(result.violations).toHaveLength(0);
      expect(result.details.fileIntegrity.status).toBe('valid');
      expect(result.details.databaseIntegrity.status).toBe('valid');
      expect(result.details.recordIntegrity.status).toBe('valid');
      expect(result.details.crossReferenceIntegrity.status).toBe('valid');
    });

    test('should detect file tampering through checksum mismatch', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        modificationTime: Date.now(),
      });

      const storedChecksum = 'original-checksum';
      const currentChecksum = 'tampered-checksum';

      mockSecureStore.getItemAsync.mockImplementation(key => {
        if (key.includes('checksum')) {
          return Promise.resolve(storedChecksum);
        }
        return Promise.resolve(null);
      });

      const mockCalculateFileChecksum = jest.fn().mockResolvedValue(currentChecksum);
      (integrityVerifier as any).calculateFileChecksum = mockCalculateFileChecksum;

      const result = await integrityVerifier.validateDatabaseIntegrity();

      expect(result.overallStatus).toBe('violated');
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'file_tampered',
          severity: 'critical',
          evidence: expect.objectContaining({
            expectedChecksum: storedChecksum,
            actualChecksum: currentChecksum,
          }),
        })
      );

      expect(violationCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'file_tampered',
          severity: 'critical',
        })
      );
    });

    test('should detect missing database files', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
      });

      const result = await integrityVerifier.validateDatabaseIntegrity();

      expect(result.overallStatus).toBe('violated');
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'file_missing',
          severity: 'critical',
          evidence: expect.objectContaining({
            expectedExists: true,
            actualExists: false,
          }),
        })
      );
    });
  });

  describe('Memory Safety and Cleanup', () => {
    test('should properly dispose and clear sensitive data', () => {
      const mockInterval = {};
      (integrityVerifier as any).monitoringInterval = mockInterval;

      const mockKey = Buffer.alloc(32, 'test-key');
      (integrityVerifier as any).integrityKey = mockKey;

      global.clearInterval = jest.fn();

      integrityVerifier.dispose();

      expect(global.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect((integrityVerifier as any).integrityKey).toBeNull();
      expect((integrityVerifier as any).isInitialized).toBe(false);
      expect((integrityVerifier as any).violationListeners).toHaveLength(0);
      expect((integrityVerifier as any).recoveryListeners).toHaveLength(0);
    });

    test('should handle dispose when not initialized', () => {
      expect(() => integrityVerifier.dispose()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      const mockKey = Buffer.from('test-integrity-key').toString('base64');
      mockSecureStore.getItemAsync.mockResolvedValueOnce(mockKey);
      await integrityVerifier.initialize();

      mockFileSystem.getInfoAsync.mockRejectedValueOnce(new Error('File system error'));

      const result = await integrityVerifier.validateDatabaseIntegrity();

      expect(result.overallStatus).toBe('error');
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: expect.stringContaining('error'),
          severity: 'critical',
        })
      );
    });
  });
});
