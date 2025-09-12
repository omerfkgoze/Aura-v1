import type { Platform } from './types';
export interface SecureStorageConfig {
  keyPrefix: string;
  encryptionRequired: boolean;
  biometricAuthRequired: boolean;
}
export interface SecureStorageItem {
  key: string;
  value: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}
export interface StorageCapabilities {
  supportsHardwareBacking: boolean;
  supportsEncryption: boolean;
  supportsBiometricAuth: boolean;
  supportsSecureEnclave: boolean;
  platform: Platform;
}
export declare abstract class SecureStorage {
  protected config: SecureStorageConfig;
  constructor(config: SecureStorageConfig);
  abstract store(key: string, value: string, metadata?: Record<string, any>): Promise<void>;
  abstract retrieve(key: string): Promise<string | null>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract exists(key: string): Promise<boolean>;
  abstract getCapabilities(): StorageCapabilities;
  protected getFullKey(key: string): string;
}
export declare class IOSSecureStorage extends SecureStorage {
  store(key: string, value: string, metadata?: Record<string, any>): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getCapabilities(): StorageCapabilities;
  private storeInKeychain;
  private retrieveFromKeychain;
  private removeFromKeychain;
  private clearKeychainWithPrefix;
  private keychainItemExists;
}
export declare class AndroidSecureStorage extends SecureStorage {
  store(key: string, value: string, metadata?: Record<string, any>): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getCapabilities(): StorageCapabilities;
  private storeInKeystore;
  private retrieveFromKeystore;
  private removeFromKeystore;
  private clearKeystoreWithPrefix;
  private keystoreItemExists;
}
export declare class WebSecureStorage extends SecureStorage {
  store(key: string, value: string, metadata?: Record<string, any>): Promise<void>;
  retrieve(key: string): Promise<string | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getCapabilities(): StorageCapabilities;
  private storeInIndexedDB;
  private retrieveFromIndexedDB;
  private removeFromIndexedDB;
  private clearIndexedDBWithPrefix;
  private indexedDBItemExists;
}
export declare class SecureStorageFactory {
  static create(platform: Platform, config: SecureStorageConfig): SecureStorage;
  static getDefaultConfig(): SecureStorageConfig;
}
