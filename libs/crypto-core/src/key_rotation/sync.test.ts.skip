import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CrossDeviceRotationSync } from './sync.rs';

describe('CrossDeviceRotationSync', () => {
  let syncManager: CrossDeviceRotationSync;
  const testDeviceId = 'test-device-001';
  const participatingDevices = ['device-002', 'device-003', 'device-004'];

  beforeEach(() => {
    syncManager = new CrossDeviceRotationSync(testDeviceId);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup any resources
    vi.restoreAllMocks();
  });

  describe('Cross-Device Rotation Initiation', () => {
    it('should initiate cross-device rotation with zero-knowledge protocol', async () => {
      const rotationId = await syncManager.initiate_cross_device_rotation(
        participatingDevices,
        'Scheduled'
      );

      expect(rotationId).toBeDefined();
      expect(typeof rotationId).toBe('string');
      expect(rotationId.length).toBeGreaterThan(0);
    });

    it('should handle empty participating devices list', async () => {
      await expect(syncManager.initiate_cross_device_rotation([], 'Emergency')).rejects.toThrow();
    });

    it('should create unique rotation IDs for concurrent initiations', async () => {
      const rotationId1 = await syncManager.initiate_cross_device_rotation(
        participatingDevices,
        'Scheduled'
      );

      const syncManager2 = new CrossDeviceRotationSync('device-005');
      const rotationId2 = await syncManager2.initiate_cross_device_rotation(
        participatingDevices,
        'Scheduled'
      );

      expect(rotationId1).not.toBe(rotationId2);
    });
  });

  describe('Zero-Knowledge Protocol Implementation', () => {
    let rotationId: string;

    beforeEach(async () => {
      rotationId = await syncManager.initiate_cross_device_rotation(
        participatingDevices,
        'Scheduled'
      );
    });

    it('should process device commitments correctly', async () => {
      const commitmentHash = 'hash_device_002_commitment';
      const nonce = 'nonce_123456';

      await expect(
        syncManager.process_device_commitment('device-002', commitmentHash, nonce)
      ).resolves.toBeUndefined();
    });

    it('should verify commitments before accepting reveals', async () => {
      // First commit
      await syncManager.process_device_commitment('device-002', 'commitment_hash_002', 'nonce_002');

      // Then reveal with valid proof
      await expect(
        syncManager.process_device_reveal(
          'device-002',
          'valid_rotation_proof',
          'integrity_hash_002'
        )
      ).resolves.toBeUndefined();
    });

    it('should reject reveals with invalid commitments', async () => {
      // Reveal without prior commitment
      await expect(
        syncManager.process_device_reveal('device-999', 'invalid_proof', 'invalid_hash')
      ).rejects.toThrow('Invalid commitment verification');
    });

    it('should complete verification phase when all devices verified', async () => {
      // Complete commitment phase for all devices
      for (const deviceId of participatingDevices) {
        await syncManager.process_device_commitment(
          deviceId,
          `commitment_${deviceId}`,
          `nonce_${deviceId}`
        );
      }

      // Complete reveal phase for all devices
      for (const deviceId of participatingDevices) {
        await syncManager.process_device_reveal(deviceId, `proof_${deviceId}`, `hash_${deviceId}`);
      }

      // Complete verification
      const success = await syncManager.complete_verification_phase();
      expect(success).toBe(true);
    });
  });

  describe('Offline Device Handling', () => {
    it('should handle offline device registration', async () => {
      await expect(
        syncManager.handle_offline_device_sync('offline-device-001', 'immediate')
      ).resolves.toBeUndefined();
    });

    it('should support different sync strategies', async () => {
      const strategies = ['immediate', 'scheduled', 'background', 'on_demand'];

      for (const strategy of strategies) {
        await expect(
          syncManager.handle_offline_device_sync(`device-${strategy}`, strategy)
        ).resolves.toBeUndefined();
      }
    });

    it('should process delayed synchronization when device comes online', async () => {
      // Register offline device
      await syncManager.handle_offline_device_sync('offline-device-001', 'background');

      // Process delayed sync
      const syncResult = await syncManager.process_delayed_sync('offline-device-001');
      expect(syncResult).toBeDefined();

      const result = JSON.parse(syncResult);
      expect(result).toHaveProperty('device_id');
      expect(result).toHaveProperty('sync_success');
      expect(result.device_id).toBe('offline-device-001');
    });

    it('should handle sync failures for offline devices', async () => {
      // Try to sync device that was never registered
      await expect(syncManager.process_delayed_sync('non-existent-device')).rejects.toThrow(
        'Device not found in offline devices'
      );
    });
  });

  describe('Conflict Detection and Resolution', () => {
    beforeEach(async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Scheduled');
    });

    it('should resolve concurrent rotation conflicts', async () => {
      const result = await syncManager.resolve_rotation_conflict(
        'concurrent_rotation',
        'most_recent_wins'
      );

      const resolution = JSON.parse(result);
      expect(resolution).toHaveProperty('success');
      expect(resolution).toHaveProperty('resolution_type');
      expect(resolution.success).toBe(true);
    });

    it('should handle version mismatch conflicts', async () => {
      const result = await syncManager.resolve_rotation_conflict(
        'version_mismatch',
        'device_priority_based'
      );

      const resolution = JSON.parse(result);
      expect(resolution.success).toBe(true);
      expect(resolution.resolution_type).toContain('DevicePriorityBased');
    });

    it('should support rollback strategy for critical conflicts', async () => {
      const result = await syncManager.resolve_rotation_conflict(
        'key_version_conflict',
        'rollback'
      );

      const resolution = JSON.parse(result);
      expect(resolution.rollback_required).toBe(true);
    });

    it('should reject invalid conflict types', async () => {
      await expect(
        syncManager.resolve_rotation_conflict('invalid_conflict', 'most_recent_wins')
      ).rejects.toThrow('Invalid conflict type');
    });

    it('should reject invalid resolution strategies', async () => {
      await expect(
        syncManager.resolve_rotation_conflict('concurrent_rotation', 'invalid_strategy')
      ).rejects.toThrow('Invalid resolution strategy');
    });
  });

  describe('Synchronization Status Monitoring', () => {
    it('should provide current sync status', () => {
      const status = syncManager.get_sync_status();
      expect(status).toBeDefined();

      const statusObj = JSON.parse(status);
      expect(statusObj).toHaveProperty('current_state');
      expect(statusObj).toHaveProperty('online_devices');
      expect(statusObj).toHaveProperty('offline_devices');
      expect(statusObj).toHaveProperty('pending_rotations');
      expect(statusObj).toHaveProperty('last_sync');
      expect(statusObj).toHaveProperty('conflicts_detected');
    });

    it('should track offline devices in status', async () => {
      await syncManager.handle_offline_device_sync('offline-1', 'background');
      await syncManager.handle_offline_device_sync('offline-2', 'scheduled');

      const status = JSON.parse(syncManager.get_sync_status());
      expect(status.offline_devices).toBe(2);
    });

    it('should update status after successful sync', async () => {
      // Register offline device
      await syncManager.handle_offline_device_sync('offline-device', 'immediate');

      // Check initial status
      let status = JSON.parse(syncManager.get_sync_status());
      expect(status.offline_devices).toBe(1);

      // Process sync
      await syncManager.process_delayed_sync('offline-device');

      // Check updated status
      status = JSON.parse(syncManager.get_sync_status());
      expect(status.offline_devices).toBe(0);
    });
  });

  describe('Cross-Device Security Validation', () => {
    it('should maintain zero-knowledge property throughout rotation', async () => {
      const rotationId = await syncManager.initiate_cross_device_rotation(
        participatingDevices,
        'Scheduled'
      );

      // Simulate commitment phase - no keys should be exposed
      for (const deviceId of participatingDevices) {
        await syncManager.process_device_commitment(
          deviceId,
          `secure_commitment_${deviceId}`,
          `secure_nonce_${deviceId}`
        );
      }

      // Verify that no actual key material is stored in memory
      const status = JSON.parse(syncManager.get_sync_status());
      expect(status).not.toHaveProperty('keys');
      expect(status).not.toHaveProperty('key_material');
    });

    it('should validate device participation tracking', async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Scheduled');

      // All devices should be tracked
      const status = JSON.parse(syncManager.get_sync_status());
      expect(status.online_devices).toBe(participatingDevices.length);
    });

    it('should handle device isolation during security incidents', async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Emergency');

      // Emergency rotation should handle device isolation
      const result = await syncManager.resolve_rotation_conflict(
        'device_state_conflict',
        'safest_option'
      );

      const resolution = JSON.parse(result);
      expect(resolution.success).toBe(true);
      expect(resolution.resolution_type).toContain('SafestOption');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of participating devices', async () => {
      const manyDevices = Array.from({ length: 50 }, (_, i) => `device-${i}`);

      const rotationId = await syncManager.initiate_cross_device_rotation(manyDevices, 'Scheduled');

      expect(rotationId).toBeDefined();

      const status = JSON.parse(syncManager.get_sync_status());
      expect(status.online_devices).toBe(50);
    });

    it('should efficiently process batch device commitments', async () => {
      const devices = Array.from({ length: 20 }, (_, i) => `device-${i}`);
      await syncManager.initiate_cross_device_rotation(devices, 'Scheduled');

      const startTime = Date.now();

      // Process all commitments
      for (const deviceId of devices) {
        await syncManager.process_device_commitment(
          deviceId,
          `commitment_${deviceId}`,
          `nonce_${deviceId}`
        );
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance during conflict resolution', async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Scheduled');

      const startTime = Date.now();

      await syncManager.resolve_rotation_conflict('concurrent_rotation', 'most_recent_wins');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should resolve within 1 second
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle protocol failures gracefully', async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Scheduled');

      // Simulate protocol failure
      await syncManager.process_device_commitment('device-002', 'valid_hash', 'valid_nonce');

      // Invalid reveal should be handled gracefully
      await expect(
        syncManager.process_device_reveal('device-002', '', 'invalid_hash')
      ).rejects.toThrow();
    });

    it('should recover from network partition scenarios', async () => {
      await syncManager.handle_offline_device_sync('partitioned-device', 'conflict_aware');

      // Device should be able to sync after partition
      const result = await syncManager.process_delayed_sync('partitioned-device');
      const syncResult = JSON.parse(result);
      expect(syncResult.sync_success).toBe(true);
    });

    it('should validate rotation completion across all devices', async () => {
      await syncManager.initiate_cross_device_rotation(participatingDevices, 'Scheduled');

      // Complete all phases
      for (const deviceId of participatingDevices) {
        await syncManager.process_device_commitment(
          deviceId,
          `commitment_${deviceId}`,
          `nonce_${deviceId}`
        );
      }

      for (const deviceId of participatingDevices) {
        await syncManager.process_device_reveal(deviceId, `proof_${deviceId}`, `hash_${deviceId}`);
      }

      const completed = await syncManager.complete_verification_phase();
      expect(completed).toBe(true);
    });
  });
});

describe('CrossDeviceRotationSync Integration Tests', () => {
  it('should complete full cross-device rotation workflow', async () => {
    const devices = ['device-A', 'device-B', 'device-C'];
    const coordinator = new CrossDeviceRotationSync('coordinator-device');

    // 1. Initiate rotation
    const rotationId = await coordinator.initiate_cross_device_rotation(devices, 'Scheduled');
    expect(rotationId).toBeDefined();

    // 2. Commitment phase
    for (const deviceId of devices) {
      await coordinator.process_device_commitment(
        deviceId,
        `commit_${deviceId}_${rotationId}`,
        `nonce_${deviceId}_${Date.now()}`
      );
    }

    // 3. Reveal phase
    for (const deviceId of devices) {
      await coordinator.process_device_reveal(
        deviceId,
        `proof_${deviceId}_${rotationId}`,
        `integrity_${deviceId}_${Date.now()}`
      );
    }

    // 4. Verification phase
    const success = await coordinator.complete_verification_phase();
    expect(success).toBe(true);

    // 5. Verify final state
    const status = JSON.parse(coordinator.get_sync_status());
    expect(status.current_state).toBe('Synchronized');
  });

  it('should handle mixed online/offline device scenarios', async () => {
    const onlineDevices = ['device-1', 'device-2'];
    const offlineDevices = ['device-3', 'device-4'];
    const coordinator = new CrossDeviceRotationSync('main-coordinator');

    // Start rotation with online devices
    await coordinator.initiate_cross_device_rotation(onlineDevices, 'Scheduled');

    // Register offline devices
    for (const deviceId of offlineDevices) {
      await coordinator.handle_offline_device_sync(deviceId, 'background');
    }

    // Complete rotation for online devices
    for (const deviceId of onlineDevices) {
      await coordinator.process_device_commitment(
        deviceId,
        `commit_${deviceId}`,
        `nonce_${deviceId}`
      );
      await coordinator.process_device_reveal(deviceId, `proof_${deviceId}`, `hash_${deviceId}`);
    }

    // Simulate offline devices coming back online
    for (const deviceId of offlineDevices) {
      const syncResult = await coordinator.process_delayed_sync(deviceId);
      const result = JSON.parse(syncResult);
      expect(result.sync_success).toBe(true);
    }

    const finalStatus = JSON.parse(coordinator.get_sync_status());
    expect(finalStatus.offline_devices).toBe(0);
  });
});
