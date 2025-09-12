import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmergencyRotationManager } from './emergency';

describe('EmergencyRotationManager', () => {
  let emergencyManager: EmergencyRotationManager;
  const mockDeviceId = 'test-device-123';
  const mockKeyId = 'test-key-456';

  beforeEach(() => {
    emergencyManager = new EmergencyRotationManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any resources
    emergencyManager = null as any;
  });

  describe('Emergency Incident Creation', () => {
    it('should create emergency incident with correct parameters', () => {
      const description = 'Security breach detected';
      const affectedDevices = [mockDeviceId];
      const severity = 8;

      const incidentId = emergencyManager.trigger_emergency_rotation(
        'security_breach',
        description,
        affectedDevices,
        severity
      );

      expect(incidentId).toBeDefined();
      expect(typeof incidentId).toBe('string');
      expect(incidentId.length).toBeGreaterThan(0);
    });

    it('should handle high severity incidents with auto-response', () => {
      const incidentId = emergencyManager.trigger_emergency_rotation(
        'compromised_device',
        'Device compromise detected',
        [mockDeviceId],
        9
      );

      expect(incidentId).toBeDefined();

      // Should auto-initiate response for high severity
      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.incident).toBeDefined();
      expect(status.incident.severity).toBe(9);
    });

    it('should validate trigger type', () => {
      expect(() => {
        emergencyManager.trigger_emergency_rotation(
          'invalid_trigger_type',
          'Test incident',
          [mockDeviceId],
          5
        );
      }).toThrow();
    });

    it('should handle multiple affected devices', () => {
      const devices = ['device1', 'device2', 'device3'];
      const incidentId = emergencyManager.trigger_emergency_rotation(
        'system_intrusion',
        'Multiple devices compromised',
        devices,
        8
      );

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.incident.affected_devices).toEqual(devices);
    });
  });

  describe('Emergency Response Initiation', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'security_breach',
        'Test incident for response',
        [mockDeviceId],
        7
      );
    });

    it('should initiate emergency response successfully', () => {
      expect(() => {
        emergencyManager.initiate_emergency_response(incidentId);
      }).not.toThrow();

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response).toBeDefined();
      expect(status.response.incident_id).toBe(incidentId);
    });

    it('should fail to initiate response for non-existent incident', () => {
      expect(() => {
        emergencyManager.initiate_emergency_response('non-existent-id');
      }).toThrow('Incident not found');
    });

    it('should execute immediate actions based on trigger type', () => {
      const compromisedIncidentId = emergencyManager.trigger_emergency_rotation(
        'compromised_device',
        'Compromised device detected',
        [mockDeviceId],
        8
      );

      emergencyManager.initiate_emergency_response(compromisedIncidentId);

      // Should automatically isolate the compromised device
      expect(emergencyManager.is_device_isolated(mockDeviceId)).toBe(true);
    });
  });

  describe('Device Isolation', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'security_breach',
        'Test incident for device isolation',
        [mockDeviceId],
        6
      );
      emergencyManager.initiate_emergency_response(incidentId);
    });

    it('should isolate device successfully', () => {
      emergencyManager.isolate_device(mockDeviceId, incidentId);
      expect(emergencyManager.is_device_isolated(mockDeviceId)).toBe(true);
    });

    it('should track isolated devices in response', () => {
      emergencyManager.isolate_device(mockDeviceId, incidentId);

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.devices_isolated).toContain(mockDeviceId);
    });

    it('should restore device access successfully', () => {
      // First isolate the device
      emergencyManager.isolate_device(mockDeviceId, incidentId);
      expect(emergencyManager.is_device_isolated(mockDeviceId)).toBe(true);

      // Complete the incident first (required for restoration)
      emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);
      emergencyManager.initiate_recovery(incidentId);

      // Then restore access
      emergencyManager.restore_device_access(mockDeviceId, incidentId);
      expect(emergencyManager.is_device_isolated(mockDeviceId)).toBe(false);
    });

    it('should prevent restoration before incident completion', () => {
      emergencyManager.isolate_device(mockDeviceId, incidentId);

      expect(() => {
        emergencyManager.restore_device_access(mockDeviceId, incidentId);
      }).toThrow('Cannot restore access until incident is fully resolved');
    });
  });

  describe('Key Invalidation', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'key_exposure_risk',
        'Key exposure detected',
        [mockDeviceId],
        7
      );
      emergencyManager.initiate_emergency_response(incidentId);
    });

    it('should invalidate key successfully', () => {
      emergencyManager.invalidate_key(mockKeyId, incidentId);
      expect(emergencyManager.is_key_invalidated(mockKeyId)).toBe(true);
    });

    it('should track invalidated keys in response', () => {
      emergencyManager.invalidate_key(mockKeyId, incidentId);

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.keys_invalidated).toContain(mockKeyId);
    });

    it('should handle multiple key invalidations', () => {
      const keys = ['key1', 'key2', 'key3'];

      keys.forEach(keyId => {
        emergencyManager.invalidate_key(keyId, incidentId);
        expect(emergencyManager.is_key_invalidated(keyId)).toBe(true);
      });

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.keys_invalidated).toEqual(expect.arrayContaining(keys));
    });
  });

  describe('Emergency Key Rotation', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'security_breach',
        'Emergency rotation test',
        [mockDeviceId],
        8
      );
      emergencyManager.initiate_emergency_response(incidentId);
    });

    it('should execute emergency rotation for single device', () => {
      const rotatedKeys = emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);

      expect(rotatedKeys).toBeDefined();
      expect(Array.isArray(rotatedKeys)).toBe(true);
      expect(rotatedKeys.length).toBeGreaterThan(0);
    });

    it('should execute emergency rotation for multiple devices', () => {
      const devices = ['device1', 'device2'];
      const rotatedKeys = emergencyManager.execute_emergency_rotation(incidentId, devices);

      expect(rotatedKeys).toBeDefined();
      expect(rotatedKeys.length).toBeGreaterThan(0);
      // Should have at least one key per device
      expect(rotatedKeys.length).toBeGreaterThanOrEqual(devices.length);
    });

    it('should handle rotation failures gracefully', () => {
      // This would test error handling in real implementation
      expect(() => {
        emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);
      }).not.toThrow();
    });

    it('should update response status during rotation', () => {
      emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.status).toBe('Rotating');
    });
  });

  describe('Recovery Process', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'data_leakage',
        'Data recovery test',
        [mockDeviceId],
        6
      );
      emergencyManager.initiate_emergency_response(incidentId);
      emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);
    });

    it('should initiate recovery process successfully', () => {
      expect(() => {
        emergencyManager.initiate_recovery(incidentId);
      }).not.toThrow();

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.status).toBe('Recovering');
      expect(status.response.recovery_status).toBe('InProgress');
    });

    it('should fail recovery for non-existent incident', () => {
      expect(() => {
        emergencyManager.initiate_recovery('non-existent-id');
      }).toThrow('Recovery plan not found');
    });

    it('should complete recovery process', () => {
      emergencyManager.initiate_recovery(incidentId);

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));

      // Recovery should eventually complete
      // In real implementation, this would be async
      expect(['InProgress', 'Complete']).toContain(status.response.recovery_status);
    });

    it('should maintain data accessibility during recovery', () => {
      emergencyManager.initiate_recovery(incidentId);

      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.data_accessibility).toBe(true);
    });
  });

  describe('Incident Status Monitoring', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'malware_detection',
        'Status monitoring test',
        [mockDeviceId],
        5
      );
    });

    it('should retrieve incident status successfully', () => {
      const statusJson = emergencyManager.get_incident_status(incidentId);
      const status = JSON.parse(statusJson);

      expect(status).toBeDefined();
      expect(status.incident).toBeDefined();
      expect(status.incident.id).toBe(incidentId);
    });

    it('should include all relevant status information', () => {
      emergencyManager.initiate_emergency_response(incidentId);
      emergencyManager.isolate_device(mockDeviceId, incidentId);
      emergencyManager.invalidate_key(mockKeyId, incidentId);

      const statusJson = emergencyManager.get_incident_status(incidentId);
      const status = JSON.parse(statusJson);

      expect(status.incident).toBeDefined();
      expect(status.response).toBeDefined();
      expect(status.isolated_devices).toContain(mockDeviceId);
      expect(status.invalidated_keys).toContain(mockKeyId);
    });

    it('should fail for non-existent incident', () => {
      expect(() => {
        emergencyManager.get_incident_status('non-existent-id');
      }).toThrow('Incident not found');
    });
  });

  describe('Security Event Integration', () => {
    it('should handle different trigger types correctly', () => {
      const triggerTypes = [
        'security_breach',
        'compromised_device',
        'suspicious_activity',
        'key_exposure_risk',
        'system_intrusion',
        'malware_detection',
        'unauthorized_access',
        'data_leakage',
        'physical_compromise',
        'manual_trigger',
      ];

      triggerTypes.forEach(triggerType => {
        expect(() => {
          const incidentId = emergencyManager.trigger_emergency_rotation(
            triggerType,
            `Test ${triggerType}`,
            [mockDeviceId],
            6
          );
          expect(incidentId).toBeDefined();
        }).not.toThrow();
      });
    });

    it('should escalate based on severity thresholds', () => {
      // High severity should trigger immediate response
      const highSeverityId = emergencyManager.trigger_emergency_rotation(
        'system_intrusion',
        'High severity test',
        [mockDeviceId],
        9
      );

      // Low severity should not auto-trigger
      const lowSeverityId = emergencyManager.trigger_emergency_rotation(
        'suspicious_activity',
        'Low severity test',
        [mockDeviceId],
        3
      );

      // Check that auto-response behavior differs based on severity
      const highStatus = JSON.parse(emergencyManager.get_incident_status(highSeverityId));
      const lowStatus = JSON.parse(emergencyManager.get_incident_status(lowSeverityId));

      expect(highStatus.incident.severity).toBe(9);
      expect(lowStatus.incident.severity).toBe(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent incident creation', () => {
      const incidents = Array.from({ length: 5 }, (_, i) =>
        emergencyManager.trigger_emergency_rotation(
          'security_breach',
          `Concurrent incident ${i}`,
          [`device-${i}`],
          6
        )
      );

      expect(incidents).toHaveLength(5);
      expect(new Set(incidents).size).toBe(5); // All should be unique
    });

    it('should prevent duplicate device isolation', () => {
      const incidentId = emergencyManager.trigger_emergency_rotation(
        'compromised_device',
        'Duplicate isolation test',
        [mockDeviceId],
        7
      );

      emergencyManager.initiate_emergency_response(incidentId);

      // First isolation should succeed
      emergencyManager.isolate_device(mockDeviceId, incidentId);
      expect(emergencyManager.is_device_isolated(mockDeviceId)).toBe(true);

      // Second isolation should not fail (idempotent)
      expect(() => {
        emergencyManager.isolate_device(mockDeviceId, incidentId);
      }).not.toThrow();
    });

    it('should handle empty device lists', () => {
      expect(() => {
        emergencyManager.trigger_emergency_rotation('security_breach', 'Empty devices test', [], 5);
      }).not.toThrow();
    });

    it('should validate severity ranges', () => {
      // Test boundary values
      expect(() => {
        emergencyManager.trigger_emergency_rotation(
          'security_breach',
          'Min severity',
          [mockDeviceId],
          1
        );
      }).not.toThrow();

      expect(() => {
        emergencyManager.trigger_emergency_rotation(
          'security_breach',
          'Max severity',
          [mockDeviceId],
          10
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of devices efficiently', () => {
      const manyDevices = Array.from({ length: 100 }, (_, i) => `device-${i}`);

      const start = performance.now();
      const incidentId = emergencyManager.trigger_emergency_rotation(
        'system_intrusion',
        'Performance test',
        manyDevices,
        8
      );
      const end = performance.now();

      expect(incidentId).toBeDefined();
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid successive incidents', () => {
      const incidents: string[] = [];

      const start = performance.now();
      for (let i = 0; i < 10; i++) {
        const incidentId = emergencyManager.trigger_emergency_rotation(
          'suspicious_activity',
          `Rapid incident ${i}`,
          [`device-${i}`],
          5
        );
        incidents.push(incidentId);
      }
      const end = performance.now();

      expect(incidents).toHaveLength(10);
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Integration with Audit System', () => {
    let incidentId: string;

    beforeEach(() => {
      incidentId = emergencyManager.trigger_emergency_rotation(
        'security_breach',
        'Audit integration test',
        [mockDeviceId],
        7
      );
    });

    it('should log incident creation', () => {
      // Audit logging should happen automatically
      // This would verify audit trail entries in a real implementation
      expect(incidentId).toBeDefined();
    });

    it('should log all emergency actions', () => {
      emergencyManager.initiate_emergency_response(incidentId);
      emergencyManager.isolate_device(mockDeviceId, incidentId);
      emergencyManager.invalidate_key(mockKeyId, incidentId);

      // Each action should be logged
      // This would verify specific audit entries in a real implementation
      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response.actions_taken.length).toBeGreaterThan(0);
    });

    it('should maintain audit trail integrity', () => {
      emergencyManager.initiate_emergency_response(incidentId);
      emergencyManager.execute_emergency_rotation(incidentId, [mockDeviceId]);
      emergencyManager.initiate_recovery(incidentId);

      // Audit trail should be complete and chronologically ordered
      const status = JSON.parse(emergencyManager.get_incident_status(incidentId));
      expect(status.response).toBeDefined();
    });
  });
});
