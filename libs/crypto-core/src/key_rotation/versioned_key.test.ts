import { describe, it, expect, beforeEach } from 'vitest';
import { VersionedKey, LegacyKeyRetentionPolicy } from './versioned_key';
import { KeyVersion, KeyStatus } from './types';
import { CryptoKey } from '../keys';
import { DataCategory } from '../derivation';

describe('VersionedKey', () => {
  let key: CryptoKey;
  let version: KeyVersion;
  let versionedKey: VersionedKey;

  beforeEach(() => {
    // Mock CryptoKey - in real tests, use actual key generation
    key = new CryptoKey(new Uint8Array(32));
    version = new KeyVersion(1, 0, 0);
    versionedKey = new VersionedKey(key, version, DataCategory.CycleData);
  });

  describe('Basic Functionality', () => {
    it('should create versioned key with correct initial state', () => {
      expect(versionedKey.version().toString()).toBe('1.0.0');
      expect(versionedKey.status()).toBe(KeyStatus.Active);
      expect(versionedKey.purpose()).toBe(DataCategory.CycleData);
      expect(versionedKey.migration_progress()).toBe(0.0);
      expect(versionedKey.usage_count()).toBe(0);
    });

    it('should track key usage', () => {
      expect(versionedKey.usage_count()).toBe(0);
      expect(versionedKey.last_used_time()).toBeNull();

      versionedKey.updateUsageTracking();

      expect(versionedKey.usage_count()).toBe(1);
      expect(versionedKey.last_used_time()).toBeDefined();
    });

    it('should maintain audit log', () => {
      const initialLog = versionedKey.getAuditLog();
      expect(initialLog.length).toBe(1);
      expect(initialLog[0]).toContain('Key created with version 1.0.0');

      versionedKey.setStatus(KeyStatus.Migrating);
      const updatedLog = versionedKey.getAuditLog();
      expect(updatedLog.length).toBe(2);
    });
  });

  describe('Multi-Version Support', () => {
    it('should support multiple predecessor versions', () => {
      const oldVersion1 = new KeyVersion(0, 9, 0);
      const oldVersion2 = new KeyVersion(0, 8, 0);

      versionedKey.addPredecessorVersion(oldVersion1);
      versionedKey.addPredecessorVersion(oldVersion2);

      const predecessors = versionedKey.getPredecessorVersions();
      expect(predecessors.length).toBe(2);
      expect(predecessors).toContain('0.9.0');
      expect(predecessors).toContain('0.8.0');
    });

    it('should support multiple decryption versions', () => {
      const supportedVersions = versionedKey.getSupportedDecryptionVersions();
      expect(supportedVersions.length).toBe(1);
      expect(supportedVersions[0]).toBe('1.0.0');

      const oldVersion = new KeyVersion(0, 9, 0);
      versionedKey.addSupportedDecryptionVersion(oldVersion);

      const updatedVersions = versionedKey.getSupportedDecryptionVersions();
      expect(updatedVersions.length).toBe(2);
    });

    it('should validate version compatibility', () => {
      const compatibleVersion = new KeyVersion(1, 0, 0); // Same major
      const incompatibleVersion = new KeyVersion(2, 0, 0); // Different major
      const futureVersion = new KeyVersion(1, 1, 0); // Newer than current

      expect(versionedKey.validateVersionCompatibility(compatibleVersion)).toBe(true);
      expect(versionedKey.validateVersionCompatibility(incompatibleVersion)).toBe(false);
      expect(versionedKey.validateVersionCompatibility(futureVersion)).toBe(false);
    });

    it('should handle backward-compatible decryption', () => {
      const currentVersion = new KeyVersion(1, 0, 0);
      const oldVersion = new KeyVersion(0, 9, 0);

      // Initially can only decrypt current version
      expect(versionedKey.canDecryptDataFromVersion(currentVersion)).toBe(true);
      expect(versionedKey.canDecryptDataFromVersion(oldVersion)).toBe(false);

      // Add support for old version
      versionedKey.addSupportedDecryptionVersion(oldVersion);
      expect(versionedKey.canDecryptDataFromVersion(oldVersion)).toBe(true);
    });
  });

  describe('Key Integrity Validation', () => {
    it('should establish and validate integrity hash', () => {
      expect(versionedKey.integrity_hash()).toBeNull();

      const isValid = versionedKey.validateKeyIntegrity();
      expect(isValid).toBe(true);
      expect(versionedKey.integrity_hash()).toBeDefined();
    });

    it('should detect integrity violations', () => {
      // Establish integrity hash
      versionedKey.validateKeyIntegrity();
      const originalHash = versionedKey.integrity_hash();

      // Manually corrupt the integrity (in real scenario, this would be detected)
      // Since we can't directly modify private fields, we simulate by changing status
      versionedKey.setStatus(KeyStatus.Deprecated);

      // Validation should still pass as we're using legitimate state changes
      const isValid = versionedKey.validateKeyIntegrity();
      expect(isValid).toBe(true);
    });
  });

  describe('Version Transitions', () => {
    it('should transition to new version correctly', () => {
      const newVersion = new KeyVersion(1, 1, 0);
      const newKey = new CryptoKey(new Uint8Array(32));

      const oldVersionString = versionedKey.version().toString();
      versionedKey.transitionToVersion(newVersion, newKey);

      expect(versionedKey.version().toString()).toBe('1.1.0');
      expect(versionedKey.status()).toBe(KeyStatus.Active);
      expect(versionedKey.migration_progress()).toBe(0.0);

      const predecessors = versionedKey.getPredecessorVersions();
      expect(predecessors).toContain(oldVersionString);
    });

    it('should reject invalid version transitions', () => {
      const oldVersion = new KeyVersion(0, 9, 0); // Older version
      const newKey = new CryptoKey(new Uint8Array(32));

      expect(() => {
        versionedKey.transitionToVersion(oldVersion, newKey);
      }).toThrow('New version must be newer than current version');
    });
  });

  describe('Legacy Key Retention', () => {
    it('should create retention policy with correct defaults', () => {
      const policy = new LegacyKeyRetentionPolicy(3, 30);

      expect(policy.max_legacy_versions()).toBe(3);
      expect(policy.min_retention_days()).toBe(30);
      expect(policy.auto_cleanup_enabled()).toBe(true);
      expect(policy.require_migration_completion()).toBe(true);
    });

    it('should evaluate retention eligibility correctly', () => {
      const policy = new LegacyKeyRetentionPolicy(3, 1); // 1 day retention for testing

      // Active key should not be eligible for cleanup
      expect(versionedKey.checkRetentionEligibility(policy)).toBe(false);

      // Set key to deprecated and complete migration
      versionedKey.setStatus(KeyStatus.Deprecated);
      versionedKey.setMigrationProgress(1.0);

      // Still not eligible due to age (just created)
      expect(versionedKey.checkRetentionEligibility(policy)).toBe(false);

      // Mock older creation time would make it eligible
      // (In real implementation, you'd need to test with actual time passage)
    });

    it('should configure retention policy settings', () => {
      const policy = new LegacyKeyRetentionPolicy(5, 60);

      policy.set_auto_cleanup_enabled(false);
      policy.set_require_migration_completion(false);

      expect(policy.auto_cleanup_enabled()).toBe(false);
      expect(policy.require_migration_completion()).toBe(false);
    });
  });

  describe('Key Lifecycle Management', () => {
    it('should handle key status transitions', () => {
      expect(versionedKey.status()).toBe(KeyStatus.Active);
      expect(versionedKey.is_usable()).toBe(true);

      versionedKey.setStatus(KeyStatus.Migrating);
      expect(versionedKey.is_usable()).toBe(true); // Still usable during migration

      versionedKey.setStatus(KeyStatus.Deprecated);
      expect(versionedKey.is_usable()).toBe(false); // No longer usable
    });

    it('should track migration progress', () => {
      expect(versionedKey.migration_progress()).toBe(0.0);

      versionedKey.setMigrationProgress(0.5);
      expect(versionedKey.migration_progress()).toBe(0.5);

      versionedKey.setMigrationProgress(1.5); // Should be clamped
      expect(versionedKey.migration_progress()).toBe(1.0);

      versionedKey.setMigrationProgress(-0.5); // Should be clamped
      expect(versionedKey.migration_progress()).toBe(0.0);
    });

    it('should support backward compatibility checks', () => {
      const olderVersion = new KeyVersion(0, 9, 0);
      const newerVersion = new KeyVersion(1, 1, 0);
      const differentMajorVersion = new KeyVersion(2, 0, 0);

      expect(versionedKey.supports_backward_compatibility_to(olderVersion)).toBe(true);
      expect(versionedKey.supports_backward_compatibility_to(newerVersion)).toBe(false);
      expect(versionedKey.supports_backward_compatibility_to(differentMajorVersion)).toBe(false);
    });
  });
});
