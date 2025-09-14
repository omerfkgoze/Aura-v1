import { EncryptedBackupManager } from '../encrypted-backup-manager';
import { CryptoCore } from '@aura/crypto-core';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-file-system');
jest.mock('expo-secure-store');
jest.mock('@aura/crypto-core');

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockCryptoCore = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  generateKey: jest.fn(),
  zeroize: jest.fn(),
} as jest.Mocked<CryptoCore>;

describe('EncryptedBackupManager', () => {
  let backupManager: EncryptedBackupManager;

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(FileSystem, 'documentDirectory', {
      value: '/mock/document/directory/',
      writable: true,
    });

    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: true,
      size: 1024,
      modificationTime: Date.now(),
      uri: '/mock/backup/directory/',
    });

    mockFileSystem.makeDirectoryAsync.mockResolvedValue();
    mockFileSystem.writeAsStringAsync.mockResolvedValue();
    mockFileSystem.readAsStringAsync.mockResolvedValue('');
    mockFileSystem.deleteAsync.mockResolvedValue();
    mockFileSystem.readDirectoryAsync.mockResolvedValue([]);

    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.deleteItemAsync.mockResolvedValue();

    mockCryptoCore.encrypt.mockResolvedValue({
      version: '1.0',
      algorithm: 'AES-256-GCM',
      ciphertext: 'encrypted-data',
      nonce: 'test-nonce',
      tag: 'test-tag',
      keyId: 'test-key-id',
      aad: 'test-aad',
    });

    mockCryptoCore.decrypt.mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          version: '1.0',
          data: { testData: 'mock-data' },
          timestamp: new Date().toISOString(),
          checksum: 'test-checksum',
        })
      )
    );

    backupManager = new EncryptedBackupManager(mockCryptoCore);
  });

  describe('Initialization', () => {
    test('should initialize backup directory and key management', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      await backupManager.initialize();

      expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        expect.stringContaining('encrypted_backups'),
        { intermediates: true }
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringMatching(/aura\.backup\.key\./),
        expect.any(String),
        expect.objectContaining({
          keychainService: 'AuraBackupKeystore',
          requireAuthentication: true,
        })
      );
    });

    test('should handle initialization failure gracefully', async () => {
      mockFileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(backupManager.initialize()).rejects.toThrow(
        'Backup manager initialization failed: Permission denied'
      );
    });
  });

  describe('Backup Key Generation', () => {
    beforeEach(async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      await backupManager.initialize();
    });

    test('should generate separate backup key isolated from primary encryption', async () => {
      const keyMetadata = await backupManager.generateBackupKey('v2');

      expect(keyMetadata).toEqual({
        keyId: expect.any(String),
        algorithm: 'AES-256-GCM',
        keyVersion: 'v2',
        createdAt: expect.any(String),
        isActive: true,
        keyStorePath: expect.stringMatching(/aura\.backup\.key\./),
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringMatching(/aura\.backup\.key\./),
        expect.any(String),
        expect.objectContaining({
          keychainService: 'AuraBackupKeystore',
        })
      );
    });

    test('should list backup keys from isolated storage', async () => {
      const mockKeys = [
        {
          keyId: 'key1',
          algorithm: 'AES-256-GCM',
          keyVersion: 'v1',
          createdAt: '2023-01-01T00:00:00.000Z',
          isActive: true,
        },
      ];

      mockSecureStore.getItemAsync.mockResolvedValueOnce(
        JSON.stringify({
          keys: mockKeys,
          lastUpdated: new Date().toISOString(),
        })
      );

      const keys = await backupManager.listBackupKeys();

      expect(keys).toEqual(mockKeys);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('aura.backup.metadata.keys', {
        keychainService: 'AuraBackupKeystore',
      });
    });
  });

  describe('Memory Safety', () => {
    test('should dispose and clear sensitive data', () => {
      backupManager.dispose();

      expect(backupManager['isInitialized']).toBe(false);
    });
  });
});
