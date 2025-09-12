import { describe, it, expect, beforeEach } from 'vitest';
import {
  HierarchicalKeyDerivation,
  ExtendedKey,
  DerivationPath,
  create_derivation_path,
  create_master_key_from_seed,
} from '../pkg';

// Data categories as strings
const DataCategory = {
  CycleData: 'cycle_data',
  Preferences: 'preferences',
  HealthcareSharing: 'healthcare_sharing',
  DeviceSync: 'device_sync',
} as const;

describe('Hierarchical Key Derivation', () => {
  let keyDerivation: HierarchicalKeyDerivation;
  const testSeed = new Uint8Array(32);
  const deviceId = 'test-device-123';

  beforeEach(() => {
    keyDerivation = new HierarchicalKeyDerivation();
    // Fill with deterministic test data
    for (let i = 0; i < testSeed.length; i++) {
      testSeed[i] = i;
    }
  });

  describe('DerivationPath', () => {
    it('should create derivation path from string', () => {
      const path = create_derivation_path("m/44'/0'/0'/0");
      expect(path).toBeDefined();
      expect(path.toString()).toBe("m/44'/0'/0'/0");
    });

    it('should handle hardened and non-hardened paths', () => {
      const hardened = create_derivation_path("m/44'/0'");
      const mixed = create_derivation_path("m/44'/0'/0/1");

      expect(hardened.toString()).toBe("m/44'/0'");
      expect(mixed.toString()).toBe("m/44'/0'/0/1");
    });

    it('should create child paths', () => {
      const parent = create_derivation_path("m/44'");
      const child = parent.child(0);
      const hardenedChild = parent.hardenedChild(0);

      expect(child.toString()).toBe("m/44'/0");
      expect(hardenedChild.toString()).toBe("m/44'/0'");
    });

    it('should reject invalid path formats', () => {
      expect(() => create_derivation_path('invalid')).toThrow();
      expect(() => create_derivation_path("44'/0'")).toThrow();
    });
  });

  describe('ExtendedKey', () => {
    it('should create master key from seed', () => {
      const masterKey = create_master_key_from_seed(testSeed);
      expect(masterKey).toBeDefined();
      expect(masterKey.depth()).toBe(0);
    });

    it('should derive child keys', () => {
      const masterKey = create_master_key_from_seed(testSeed);
      const childKey = masterKey.deriveChild(0x80000000); // Hardened

      expect(childKey.depth()).toBe(1);

      const keyBytes = childKey.getKeyBytes();
      expect(keyBytes).toHaveLength(32);
    });

    it('should produce different keys for different indices', () => {
      const masterKey = create_master_key_from_seed(testSeed);
      const child1 = masterKey.deriveChild(0);
      const child2 = masterKey.deriveChild(1);

      const key1Bytes = child1.getKeyBytes();
      const key2Bytes = child2.getKeyBytes();

      expect(key1Bytes).not.toEqual(key2Bytes);
    });

    it('should reject invalid seed lengths', () => {
      const shortSeed = new Uint8Array(8);
      const longSeed = new Uint8Array(128);

      expect(() => create_master_key_from_seed(shortSeed)).toThrow();
      expect(() => create_master_key_from_seed(longSeed)).toThrow();
    });
  });

  describe('HierarchicalKeyDerivation', () => {
    beforeEach(() => {
      keyDerivation.initializeWithSeed(testSeed);
    });

    describe('Data Category Key Derivation', () => {
      it('should derive different keys for different categories', () => {
        const cycleKey = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);
        const prefKey = keyDerivation.deriveDataCategoryKey(DataCategory.Preferences, deviceId);
        const shareKey = keyDerivation.deriveDataCategoryKey(
          DataCategory.HealthcareSharing,
          deviceId
        );
        const syncKey = keyDerivation.deriveDataCategoryKey(DataCategory.DeviceSync, deviceId);

        // All keys should be different
        expect(cycleKey).not.toEqual(prefKey);
        expect(cycleKey).not.toEqual(shareKey);
        expect(cycleKey).not.toEqual(syncKey);
        expect(prefKey).not.toEqual(shareKey);
        expect(prefKey).not.toEqual(syncKey);
        expect(shareKey).not.toEqual(syncKey);
      });

      it('should derive same key for same category and device', () => {
        const key1 = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);
        const key2 = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);

        expect(key1).toEqual(key2);
      });

      it('should derive different keys for different devices', () => {
        const device1Key = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, 'device-1');
        const device2Key = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, 'device-2');

        expect(device1Key).not.toEqual(device2Key);
      });

      it('should produce 32-byte keys', () => {
        const key = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);
        expect(key).toHaveLength(32);
      });
    });

    describe('Custom Path Derivation', () => {
      it('should derive keys at custom paths', () => {
        const key1 = keyDerivation.deriveKeyAtPath("m/44'/0'/0'/0");
        const key2 = keyDerivation.deriveKeyAtPath("m/44'/0'/0'/1");

        expect(key1).not.toEqual(key2);
        expect(key1).toHaveLength(32);
        expect(key2).toHaveLength(32);
      });

      it('should cache derived keys', () => {
        const path = "m/44'/0'/0'/0";
        const key1 = keyDerivation.deriveKeyAtPath(path);
        const key2 = keyDerivation.deriveKeyAtPath(path);

        expect(key1).toEqual(key2);
      });
    });

    describe('Key Rotation and Forward Secrecy', () => {
      it('should increment key version on rotation', () => {
        const initialVersion = keyDerivation.keyVersion;
        keyDerivation.rotateKeys();
        const newVersion = keyDerivation.keyVersion;

        expect(newVersion).toBe(initialVersion + 1);
      });

      it('should derive different keys after rotation', () => {
        const keyBeforeRotation = keyDerivation.deriveDataCategoryKey(
          DataCategory.CycleData,
          deviceId
        );

        keyDerivation.rotateKeys();
        keyDerivation.initializeWithSeed(testSeed); // Re-initialize with same seed

        const keyAfterRotation = keyDerivation.deriveDataCategoryKey(
          DataCategory.CycleData,
          deviceId
        );

        expect(keyBeforeRotation).not.toEqual(keyAfterRotation);
      });
    });

    describe('Key Isolation Verification', () => {
      it('should verify key isolation between categories', () => {
        const isIsolated = keyDerivation.verifyKeyIsolation(deviceId);
        expect(isIsolated).toBe(true);
      });

      it('should handle single category verification', () => {
        // Derive only one key and verify it doesn't conflict with others
        const cycleKey = keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);
        expect(cycleKey).toHaveLength(32);

        const isIsolated = keyDerivation.verifyKeyIsolation(deviceId);
        expect(isIsolated).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle uninitialized master key', () => {
        const uninitializedDerivation = new HierarchicalKeyDerivation();

        expect(() => {
          uninitializedDerivation.deriveDataCategoryKey(DataCategory.CycleData, deviceId);
        }).toThrow('Master key not initialized');
      });

      it('should handle invalid derivation paths', () => {
        expect(() => {
          keyDerivation.deriveKeyAtPath('invalid-path');
        }).toThrow();
      });
    });
  });

  describe('Purpose-Specific Derivation Paths', () => {
    beforeEach(() => {
      keyDerivation.initializeWithSeed(testSeed);
    });

    it('should use correct purpose values for each category', () => {
      // Test that different categories use different BIP44 purpose values
      const testDevice = 'test-device';

      // Derive keys for all categories
      const keys = {
        cycle: keyDerivation.deriveDataCategoryKey(DataCategory.CycleData, testDevice),
        prefs: keyDerivation.deriveDataCategoryKey(DataCategory.Preferences, testDevice),
        share: keyDerivation.deriveDataCategoryKey(DataCategory.HealthcareSharing, testDevice),
        sync: keyDerivation.deriveDataCategoryKey(DataCategory.DeviceSync, testDevice),
      };

      // All should be unique (different purpose values)
      const keyArray = Object.values(keys);
      const uniqueKeys = new Set(keyArray.map(k => k.toString()));
      expect(uniqueKeys.size).toBe(keyArray.length);
    });
  });

  describe('BIP32 Compliance', () => {
    it('should follow BIP32 deterministic derivation', () => {
      const masterKey1 = create_master_key_from_seed(testSeed);
      const masterKey2 = create_master_key_from_seed(testSeed);

      // Same seed should produce same master key
      const key1Bytes = masterKey1.getKeyBytes();
      const key2Bytes = masterKey2.getKeyBytes();
      expect(key1Bytes).toEqual(key2Bytes);

      // Same derivation path should produce same child keys
      const child1 = masterKey1.deriveChild(0x80000000);
      const child2 = masterKey2.deriveChild(0x80000000);

      const childKey1 = child1.getKeyBytes();
      const childKey2 = child2.getKeyBytes();
      expect(childKey1).toEqual(childKey2);
    });
  });
});
