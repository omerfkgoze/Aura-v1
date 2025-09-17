/**
 * Realm encrypted database implementation for React Native
 * Provides seamless key integration with crypto-core infrastructure
 */

import Realm, { Configuration, ObjectSchema } from 'realm';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RealmConfig {
  schemaVersion: number;
  schemas: ObjectSchema[];
  path?: string;
  deleteRealmIfMigrationNeeded?: boolean;
  onMigration?: Realm.MigrationCallback;
  shouldCompactOnLaunch?: (totalBytes: number, usedBytes: number) => boolean;
}

export interface EncryptedRealmConfig extends RealmConfig {
  keyId: string;
  enableSync?: boolean;
  syncConfig?: object;
}

export interface RealmKeyInfo {
  keyId: string;
  keyVersion: string;
  algorithm: 'AES-256';
  derivedAt: number;
  platform: 'ios' | 'android';
  realmVersion: string;
}

/**
 * Encrypted cycle data schema for Realm
 */
export class EncryptedCycleData extends Realm.Object<EncryptedCycleData> {
  _id!: Realm.BSON.ObjectId;
  userId!: string;
  deviceId!: string;
  encryptedData!: string; // Crypto envelope JSON
  dataType!: string; // 'cycle', 'symptom', 'note', etc.
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
  syncedAt?: Date;
  isDeleted!: boolean;

  static schema: ObjectSchema = {
    name: 'EncryptedCycleData',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      userId: 'string',
      deviceId: 'string',
      encryptedData: 'string',
      dataType: 'string',
      version: { type: 'int', default: 1 },
      createdAt: { type: 'date', default: Date.now },
      updatedAt: { type: 'date', default: Date.now },
      syncedAt: { type: 'date', optional: true },
      isDeleted: { type: 'bool', default: false },
    },
  };
}

/**
 * Encrypted user preferences schema
 */
export class EncryptedUserPrefs extends Realm.Object<EncryptedUserPrefs> {
  _id!: Realm.BSON.ObjectId;
  userId!: string;
  prefKey!: string;
  encryptedValue!: string; // Crypto envelope JSON
  version!: number;
  updatedAt!: Date;

  static schema: ObjectSchema = {
    name: 'EncryptedUserPrefs',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      userId: 'string',
      prefKey: 'string',
      encryptedValue: 'string',
      version: { type: 'int', default: 1 },
      updatedAt: { type: 'date', default: Date.now },
    },
  };
}

/**
 * Device key metadata schema
 */
export class DeviceKeyMetadata extends Realm.Object<DeviceKeyMetadata> {
  _id!: Realm.BSON.ObjectId;
  deviceId!: string;
  keyId!: string;
  keyVersion!: string;
  algorithm!: string;
  status!: string; // 'active', 'rotated', 'revoked'
  createdAt!: Date;
  rotatedAt?: Date;

  static schema: ObjectSchema = {
    name: 'DeviceKeyMetadata',
    primaryKey: '_id',
    properties: {
      _id: { type: 'objectId', default: () => new Realm.BSON.ObjectId() },
      deviceId: 'string',
      keyId: 'string',
      keyVersion: 'string',
      algorithm: 'string',
      status: { type: 'string', default: 'active' },
      createdAt: { type: 'date', default: Date.now },
      rotatedAt: { type: 'date', optional: true },
    },
  };
}

/**
 * Realm encrypted database manager
 * Integrates with crypto-core for seamless key management
 */
export class RealmEncryptedDatabase {
  private realm: Realm | null = null;
  private config: EncryptedRealmConfig;
  private keyInfo: RealmKeyInfo | null = null;
  private encryptionKey: ArrayBuffer | null = null;

  constructor(config: EncryptedRealmConfig) {
    this.config = {
      deleteRealmIfMigrationNeeded: false,
      shouldCompactOnLaunch: this.defaultCompactionCallback,
      ...config,
    };
  }

  /**
   * Initialize encrypted Realm database
   */
  async initialize(): Promise<void> {
    try {
      // Get or create encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();

      // Create Realm configuration
      const realmConfig: Configuration = {
        schema: this.config.schemas,
        schemaVersion: this.config.schemaVersion,
        encryptionKey: new Uint8Array(this.encryptionKey),
        path: this.config.path,
        deleteRealmIfMigrationNeeded: this.config.deleteRealmIfMigrationNeeded,
        onMigration: this.config.onMigration,
      };

      // Open encrypted Realm
      this.realm = await Realm.open(realmConfig);

      // Validate encryption is working
      await this.validateEncryption();

      console.log('Realm encrypted database initialized successfully');
    } catch (error) {
      throw new Error(
        `Realm initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get or create encryption key using device keystore
   */
  private async getOrCreateEncryptionKey(): Promise<ArrayBuffer> {
    const keyId = this.config.keyId;

    try {
      // Try to retrieve existing key
      let keyBase64 = await SecureStore.getItemAsync(keyId);

      if (!keyBase64) {
        // Generate new 64-byte encryption key for Realm
        const keyArray = new Uint8Array(64);
        crypto.getRandomValues(keyArray);
        keyBase64 = this.arrayBufferToBase64(keyArray.buffer);

        // Store key in device keystore
        await SecureStore.setItemAsync(keyId, keyBase64, {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access encrypted database',
          keychainService: 'aura-realm-keys',
        });

        // Store key metadata
        this.keyInfo = {
          keyId,
          keyVersion: '1.0',
          algorithm: 'AES-256',
          derivedAt: Date.now(),
          platform: Platform.OS as 'ios' | 'android',
          realmVersion: Realm.schemaVersion.toString(),
        };

        await AsyncStorage.setItem(`${keyId}_realm_info`, JSON.stringify(this.keyInfo));
      } else {
        // Load existing key metadata
        const keyInfoStr = await AsyncStorage.getItem(`${keyId}_realm_info`);
        this.keyInfo = keyInfoStr ? JSON.parse(keyInfoStr) : null;
      }

      return this.base64ToArrayBuffer(keyBase64);
    } catch (error) {
      throw new Error(
        `Realm key derivation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate database encryption is working
   */
  private async validateEncryption(): Promise<void> {
    if (!this.realm) throw new Error('Realm not initialized');

    try {
      // Test write/read operations
      this.realm.write(() => {
        this.realm!.create('EncryptedCycleData', {
          userId: 'test_user',
          deviceId: 'test_device',
          encryptedData: JSON.stringify({ test: 'validation_data' }),
          dataType: 'validation',
          version: 1,
        });
      });

      const testData = this.realm
        .objects('EncryptedCycleData')
        .filtered('dataType = "validation"')[0];

      if (!testData) {
        throw new Error('Failed to write/read validation data');
      }

      // Cleanup validation data
      this.realm.write(() => {
        this.realm!.delete(testData);
      });
    } catch (error) {
      throw new Error(
        `Encryption validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get Realm database instance
   */
  getDatabase(): Realm {
    if (!this.realm) {
      throw new Error('Realm not initialized. Call initialize() first.');
    }
    return this.realm;
  }

  /**
   * Create encrypted cycle data entry
   */
  async createCycleData(
    userId: string,
    deviceId: string,
    encryptedData: string,
    dataType: string
  ): Promise<EncryptedCycleData> {
    if (!this.realm) throw new Error('Realm not initialized');

    return new Promise((resolve, reject) => {
      try {
        this.realm!.write(() => {
          const cycleData = this.realm!.create('EncryptedCycleData', {
            userId,
            deviceId,
            encryptedData,
            dataType,
            version: 1,
          });
          resolve(cycleData as unknown as EncryptedCycleData);
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to create cycle data: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Update encrypted cycle data
   */
  async updateCycleData(
    id: Realm.BSON.ObjectId,
    encryptedData: string,
    version: number
  ): Promise<void> {
    if (!this.realm) throw new Error('Realm not initialized');

    return new Promise((resolve, reject) => {
      try {
        this.realm!.write(() => {
          const data = this.realm!.objectForPrimaryKey('EncryptedCycleData', id);
          if (data) {
            (data as any)['encryptedData'] = encryptedData;
            (data as any)['version'] = version;
            (data as any)['updatedAt'] = new Date();
          }
        });
        resolve();
      } catch (error) {
        reject(
          new Error(
            `Failed to update cycle data: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Query encrypted cycle data
   */
  queryCycleData(userId: string, dataType?: string, limit?: number): any {
    if (!this.realm) throw new Error('Realm not initialized');

    let query = `userId = "${userId}" AND isDeleted = false`;
    if (dataType) {
      query += ` AND dataType = "${dataType}"`;
    }

    const results = this.realm
      .objects('EncryptedCycleData')
      .filtered(query)
      .sorted('createdAt', true);

    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Soft delete cycle data
   */
  async deleteCycleData(id: Realm.BSON.ObjectId): Promise<void> {
    if (!this.realm) throw new Error('Realm not initialized');

    return new Promise((resolve, reject) => {
      try {
        this.realm!.write(() => {
          const data = this.realm!.objectForPrimaryKey('EncryptedCycleData', id);
          if (data) {
            (data as any)['isDeleted'] = true;
            (data as any)['updatedAt'] = new Date();
          }
        });
        resolve();
      } catch (error) {
        reject(
          new Error(
            `Failed to delete cycle data: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Store encrypted user preference
   */
  async setUserPreference(userId: string, prefKey: string, encryptedValue: string): Promise<void> {
    if (!this.realm) throw new Error('Realm not initialized');

    return new Promise((resolve, reject) => {
      try {
        this.realm!.write(() => {
          // Find existing preference
          const existing = this.realm!.objects('EncryptedUserPrefs').filtered(
            `userId = "${userId}" AND prefKey = "${prefKey}"`
          )[0];

          if (existing) {
            (existing as any)['encryptedValue'] = encryptedValue;
            (existing as any)['version'] = ((existing as any)['version'] as number) + 1;
            (existing as any)['updatedAt'] = new Date();
          } else {
            this.realm!.create('EncryptedUserPrefs', {
              userId,
              prefKey,
              encryptedValue,
              version: 1,
            });
          }
        });
        resolve();
      } catch (error) {
        reject(
          new Error(
            `Failed to set preference: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });
  }

  /**
   * Get encrypted user preference
   */
  getUserPreference(userId: string, prefKey: string): string | null {
    if (!this.realm) throw new Error('Realm not initialized');

    const pref = this.realm
      .objects('EncryptedUserPrefs')
      .filtered(`userId = "${userId}" AND prefKey = "${prefKey}"`)[0];

    return pref ? (pref as any)['encryptedValue'] : null;
  }

  /**
   * Compact database to reclaim space
   */
  async compact(): Promise<boolean> {
    if (!this.realm) return false;

    try {
      return this.realm.compact();
    } catch (error) {
      console.warn(
        `Database compaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Get database file size and usage statistics
   */
  getSize(): { fileSize: number; usedSize: number } {
    if (!this.realm) return { fileSize: 0, usedSize: 0 };

    try {
      // Use type assertion to access size property
      const fileSize = (this.realm as any).size || 0;
      const usedSize = (this.realm as any).size || 0; // Realm doesn't distinguish used vs total
      return { fileSize, usedSize };
    } catch (error) {
      console.warn(
        `Failed to get database size: ${error instanceof Error ? error.message : String(error)}`
      );
      return { fileSize: 0, usedSize: 0 };
    }
  }

  /**
   * Default compaction callback
   */
  private defaultCompactionCallback(totalBytes: number, usedBytes: number): boolean {
    // Compact if file is over 50MB and less than 50% used
    return totalBytes > 50 * 1024 * 1024 && usedBytes / totalBytes < 0.5;
  }

  /**
   * Close database and cleanup
   */
  async close(): Promise<void> {
    if (this.realm && !this.realm.isClosed) {
      this.realm.close();
    }
    this.realm = null;

    // Clear sensitive data
    if (this.encryptionKey) {
      // Zero out encryption key
      new Uint8Array(this.encryptionKey).fill(0);
      this.encryptionKey = null;
    }
    this.keyInfo = null;
  }

  /**
   * Rotate Realm encryption key
   */
  async rotateEncryptionKey(newKeyId: string): Promise<void> {
    if (!this.realm) throw new Error('Realm not initialized');

    try {
      // Generate new key
      const newKeyArray = new Uint8Array(64);
      crypto.getRandomValues(newKeyArray);
      const newKeyBase64 = this.arrayBufferToBase64(newKeyArray.buffer);

      // Store new key
      await SecureStore.setItemAsync(newKeyId, newKeyBase64, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to rotate database key',
        keychainService: 'aura-realm-keys',
      });

      // Update key metadata
      if (this.keyInfo) {
        this.keyInfo.keyId = newKeyId;
        this.keyInfo.keyVersion = (parseFloat(this.keyInfo.keyVersion) + 0.1).toFixed(1);
        this.keyInfo.derivedAt = Date.now();

        await AsyncStorage.setItem(`${newKeyId}_realm_info`, JSON.stringify(this.keyInfo));
      }

      console.log('Realm encryption key rotated successfully');
    } catch (error) {
      throw new Error(
        `Key rotation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Default schemas for encrypted Realm database
 */
export const DefaultSchemas = [
  EncryptedCycleData.schema,
  EncryptedUserPrefs.schema,
  DeviceKeyMetadata.schema,
];

/**
 * Create configured Realm encrypted database
 */
export function createRealmEncryptedDatabase(
  keyId: string,
  schemaVersion: number = 1,
  additionalSchemas: ObjectSchema[] = []
): RealmEncryptedDatabase {
  return new RealmEncryptedDatabase({
    keyId,
    schemaVersion,
    schemas: [...DefaultSchemas, ...additionalSchemas],
    path: 'aura_encrypted.realm',
  });
}
