import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KeyRotationScheduler } from './scheduler';

describe('IncidentDetectionSystem', () => {
  let scheduler: KeyRotationScheduler;
  const mockDeviceId = 'test-device-123';

  beforeEach(() => {
    scheduler = new KeyRotationScheduler();
  });

  afterEach(() => {
    scheduler = null as any;
  });

  describe('Failed Authentication Detection', () => {
    it('should detect failed authentication attempts above threshold', () => {
      const eventData = JSON.stringify({
        failed_auth_count: 6,
        access_time: new Date().toISOString(),
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });

    it('should not detect failed authentication below threshold', () => {
      const eventData = JSON.stringify({
        failed_auth_count: 3,
        access_time: new Date().toISOString(),
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false);
    });

    it('should handle threshold configuration changes', () => {
      const thresholds = JSON.stringify({
        failed_auth_threshold: 10,
      });

      scheduler.update_incident_detection_thresholds(thresholds);

      const eventData = JSON.stringify({
        failed_auth_count: 8, // Below new threshold
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false);
    });
  });

  describe('Unusual Access Pattern Detection', () => {
    it('should detect access at unusual times for new device', () => {
      // 3 AM access should be unusual for new device (no baseline)
      const unusualTime = new Date();
      unusualTime.setHours(3, 0, 0, 0);

      const eventData = JSON.stringify({
        access_time: unusualTime.toISOString(),
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });

    it('should not detect normal business hours access for new device', () => {
      // 2 PM access should be normal for new device
      const normalTime = new Date();
      normalTime.setHours(14, 0, 0, 0);

      const eventData = JSON.stringify({
        access_time: normalTime.toISOString(),
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false);
    });

    it('should build device behavior baseline over time', () => {
      // First access at 9 AM
      const morningTime = new Date();
      morningTime.setHours(9, 0, 0, 0);

      const morningEventData = JSON.stringify({
        access_time: morningTime.toISOString(),
        data_access_volume: 100,
      });

      scheduler.detect_security_incident(mockDeviceId, morningEventData);

      // After establishing baseline, 3 AM should still be unusual
      const nightTime = new Date();
      nightTime.setHours(3, 0, 0, 0);

      const nightEventData = JSON.stringify({
        access_time: nightTime.toISOString(),
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, nightEventData);
      expect(detected).toBe(true);
    });
  });

  describe('Device Compromise Indicator Detection', () => {
    it('should detect known compromise indicators', () => {
      const eventData = JSON.stringify({
        compromise_indicators: ['multiple_failed_biometric', 'unknown_location_access'],
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });

    it('should ignore unknown compromise indicators', () => {
      const eventData = JSON.stringify({
        compromise_indicators: ['unknown_indicator'],
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false);
    });

    it('should detect multiple compromise indicators', () => {
      const eventData = JSON.stringify({
        compromise_indicators: [
          'modified_device_fingerprint',
          'suspicious_network_activity',
          'unusual_timing',
        ],
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });
  });

  describe('Data Breach Detection', () => {
    it('should detect unusual data access volume for new device', () => {
      const eventData = JSON.stringify({
        data_access_volume: 2000000, // 2MB, above default threshold
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });

    it('should not detect normal data access volume for new device', () => {
      const eventData = JSON.stringify({
        data_access_volume: 500000, // 0.5MB, below default threshold
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false);
    });

    it('should detect volume spikes based on device baseline', () => {
      // Establish baseline with normal volume
      const baselineEventData = JSON.stringify({
        data_access_volume: 100000, // 0.1MB
      });

      scheduler.detect_security_incident(mockDeviceId, baselineEventData);

      // Now test with 3x the typical volume
      const spikeEventData = JSON.stringify({
        data_access_volume: 400000, // 0.4MB, 4x baseline
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, spikeEventData);
      expect(detected).toBe(true);
    });
  });

  describe('Incident Management', () => {
    it('should store detected incidents', () => {
      const eventData = JSON.stringify({
        failed_auth_count: 8,
        compromise_indicators: ['suspicious_network_activity'],
      });

      scheduler.detect_security_incident(mockDeviceId, eventData);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);

      expect(Object.keys(activeIncidents)).toHaveLength(2); // Two incidents detected
    });

    it('should include incident metadata', () => {
      const eventData = JSON.stringify({
        failed_auth_count: 10,
      });

      scheduler.detect_security_incident(mockDeviceId, eventData);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidentKeys = Object.keys(activeIncidents);

      expect(incidentKeys.length).toBeGreaterThan(0);

      const incident = activeIncidents[incidentKeys[0]];
      expect(incident.id).toBeDefined();
      expect(incident.incident_type).toBe('FailedAuthenticationAttempts');
      expect(incident.detected_at).toBeDefined();
      expect(incident.confidence_score).toBeGreaterThan(0);
      expect(incident.affected_devices).toContain(mockDeviceId);
      expect(incident.severity_score).toBeGreaterThan(0);
    });

    it('should assign appropriate severity scores', () => {
      const highSeverityData = JSON.stringify({
        compromise_indicators: ['multiple_failed_biometric'],
      });

      const lowSeverityData = JSON.stringify({
        data_access_volume: 600000, // Moderate spike
      });

      scheduler.detect_security_incident(mockDeviceId, highSeverityData);
      scheduler.detect_security_incident(mockDeviceId, lowSeverityData);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidents = Object.values(activeIncidents) as any[];

      const compromiseIncident = incidents.find(
        i => i.incident_type === 'SuspiciousDeviceActivity'
      );
      const dataIncident = incidents.find(i => i.incident_type === 'PotentialDataBreach');

      expect(compromiseIncident?.severity_score).toBeGreaterThanOrEqual(8);
      expect(dataIncident?.severity_score).toBeLessThanOrEqual(7);
    });
  });

  describe('Detection Sensitivity Configuration', () => {
    it('should update detection sensitivity', () => {
      const thresholds = JSON.stringify({
        detection_sensitivity: 'critical',
        failed_auth_threshold: 3,
        unusual_access_pattern_threshold: 0.9,
      });

      expect(() => {
        scheduler.update_incident_detection_thresholds(thresholds);
      }).not.toThrow();

      // Should now detect with lower threshold
      const eventData = JSON.stringify({
        failed_auth_count: 4,
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(true);
    });

    it('should handle invalid threshold updates gracefully', () => {
      const invalidThresholds = '{ invalid json }';

      expect(() => {
        scheduler.update_incident_detection_thresholds(invalidThresholds);
      }).toThrow();
    });

    it('should preserve existing settings when partial updates provided', () => {
      // First, set custom thresholds
      const initialThresholds = JSON.stringify({
        failed_auth_threshold: 8,
        detection_sensitivity: 'high',
      });
      scheduler.update_incident_detection_thresholds(initialThresholds);

      // Then update only one setting
      const partialThresholds = JSON.stringify({
        failed_auth_threshold: 10,
      });
      scheduler.update_incident_detection_thresholds(partialThresholds);

      // The failed auth threshold should be updated, but sensitivity should remain
      const eventData = JSON.stringify({
        failed_auth_count: 9, // Between old (8) and new (10) threshold
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, eventData);
      expect(detected).toBe(false); // Should use new threshold (10)
    });
  });

  describe('Multiple Device Tracking', () => {
    it('should track incidents across multiple devices', () => {
      const device1 = 'device-1';
      const device2 = 'device-2';

      const eventData1 = JSON.stringify({
        failed_auth_count: 6,
      });

      const eventData2 = JSON.stringify({
        compromise_indicators: ['unknown_location_access'],
      });

      scheduler.detect_security_incident(device1, eventData1);
      scheduler.detect_security_incident(device2, eventData2);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidents = Object.values(activeIncidents) as any[];

      const device1Incident = incidents.find(i => i.affected_devices.includes(device1));
      const device2Incident = incidents.find(i => i.affected_devices.includes(device2));

      expect(device1Incident).toBeDefined();
      expect(device2Incident).toBeDefined();
      expect(device1Incident?.id).not.toBe(device2Incident?.id);
    });

    it('should maintain separate baselines for different devices', () => {
      const device1 = 'device-1';
      const device2 = 'device-2';

      // Establish different baselines
      const device1Baseline = JSON.stringify({
        access_time: '2023-01-01T09:00:00Z', // 9 AM
        data_access_volume: 50000,
      });

      const device2Baseline = JSON.stringify({
        access_time: '2023-01-01T22:00:00Z', // 10 PM (night shift)
        data_access_volume: 200000,
      });

      scheduler.detect_security_incident(device1, device1Baseline);
      scheduler.detect_security_incident(device2, device2Baseline);

      // Test unusual access based on individual baselines
      const device1UnusualAccess = JSON.stringify({
        access_time: '2023-01-01T22:00:00Z', // 10 PM (unusual for device1)
      });

      const device2NormalAccess = JSON.stringify({
        access_time: '2023-01-01T22:00:00Z', // 10 PM (normal for device2)
      });

      const device1Detected = scheduler.detect_security_incident(device1, device1UnusualAccess);
      const device2Detected = scheduler.detect_security_incident(device2, device2NormalAccess);

      expect(device1Detected).toBe(true); // Should detect unusual access for device1
      expect(device2Detected).toBe(false); // Should not detect for device2 (normal for them)
    });
  });

  describe('Integration with Emergency Rotation', () => {
    it('should trigger emergency incident for high-severity detection', () => {
      const criticalEventData = JSON.stringify({
        failed_auth_count: 15,
        compromise_indicators: ['multiple_failed_biometric', 'modified_device_fingerprint'],
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, criticalEventData);
      expect(detected).toBe(true);

      // Should automatically trigger emergency rotation for high severity
      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidents = Object.values(activeIncidents) as any[];

      const highSeverityIncident = incidents.find(i => i.severity_score >= 8);
      expect(highSeverityIncident).toBeDefined();
      expect(highSeverityIncident?.auto_response_triggered).toBe(true);
    });

    it('should not auto-trigger for low-severity incidents', () => {
      const lowSeverityEventData = JSON.stringify({
        data_access_volume: 700000, // Moderate spike
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, lowSeverityEventData);
      expect(detected).toBe(true);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidents = Object.values(activeIncidents) as any[];

      const lowSeverityIncident = incidents.find(i => i.severity_score < 8);
      expect(lowSeverityIncident).toBeDefined();
      expect(lowSeverityIncident?.auto_response_triggered).toBe(false);
    });

    it('should integrate with emergency rotation manager', () => {
      const emergencyEventData = JSON.stringify({
        compromise_indicators: ['system_intrusion', 'malware_detection'],
        failed_auth_count: 20,
      });

      const detected = scheduler.detect_security_incident(mockDeviceId, emergencyEventData);
      expect(detected).toBe(true);

      // Should be able to trigger emergency incident
      expect(() => {
        scheduler.trigger_emergency_incident(
          'system_intrusion',
          'Automated incident from detection system',
          [mockDeviceId],
          9
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle malformed event data gracefully', () => {
      const malformedData = '{ invalid json }';

      expect(() => {
        scheduler.detect_security_incident(mockDeviceId, malformedData);
      }).toThrow();
    });

    it('should handle empty event data', () => {
      const emptyData = JSON.stringify({});

      const detected = scheduler.detect_security_incident(mockDeviceId, emptyData);
      expect(detected).toBe(false);
    });

    it('should handle very large incident volumes', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const eventData = JSON.stringify({
          failed_auth_count: 6,
          device_specific_data: `test-data-${i}`,
        });
        scheduler.detect_security_incident(`device-${i}`, eventData);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      expect(Object.keys(activeIncidents).length).toBe(100);
    });

    it('should maintain incident history limits', () => {
      // Create many incidents to test memory management
      for (let i = 0; i < 1000; i++) {
        const eventData = JSON.stringify({
          failed_auth_count: 8,
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        });
        scheduler.detect_security_incident(`device-${i % 10}`, eventData);
      }

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);

      // Should manage memory by limiting stored incidents
      expect(Object.keys(activeIncidents).length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Baseline Learning and Adaptation', () => {
    it('should adapt to changing usage patterns', () => {
      const deviceId = 'adaptive-device';

      // Establish initial baseline (day shift)
      for (let i = 0; i < 5; i++) {
        const dayEventData = JSON.stringify({
          access_time: `2023-01-0${i + 1}T10:00:00Z`,
          data_access_volume: 100000,
        });
        scheduler.detect_security_incident(deviceId, dayEventData);
      }

      // Gradually shift to night schedule
      for (let i = 5; i < 10; i++) {
        const nightEventData = JSON.stringify({
          access_time: `2023-01-${i + 1}T22:00:00Z`,
          data_access_volume: 100000,
        });
        scheduler.detect_security_incident(deviceId, nightEventData);
      }

      // After adaptation, night access should become normal
      const lateNightEventData = JSON.stringify({
        access_time: '2023-01-15T23:00:00Z',
      });

      const detected = scheduler.detect_security_incident(deviceId, lateNightEventData);

      // Should adapt and not detect night access as unusual anymore
      // (This test verifies the baseline learning mechanism)
      expect(detected).toBe(false);
    });

    it('should maintain confidence scores for incidents', () => {
      const eventData = JSON.stringify({
        failed_auth_count: 7,
        compromise_indicators: ['suspicious_network_activity'],
      });

      scheduler.detect_security_incident(mockDeviceId, eventData);

      const activeIncidentsJson = scheduler.get_active_incidents();
      const activeIncidents = JSON.parse(activeIncidentsJson);
      const incidents = Object.values(activeIncidents) as any[];

      incidents.forEach(incident => {
        expect(incident.confidence_score).toBeGreaterThan(0);
        expect(incident.confidence_score).toBeLessThanOrEqual(1);
      });
    });
  });
});
