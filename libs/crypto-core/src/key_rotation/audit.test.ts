import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock WASM module for audit trail
const mockWasmModule = {
  AuditTrailManager: class {
    private auditEntries: Map<string, any[]> = new Map();
    private complianceRules: any[] = [];
    private entryCounter = 0;

    constructor() {
      this.initializeDefaultComplianceRules();
    }

    record_rotation_started(
      keyId: string,
      fromVersion: any,
      toVersion: any,
      triggerReason: string,
      deviceId: string,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const entry = {
        entryId,
        timestamp,
        eventType: 'RotationStarted',
        keyVersionFrom: fromVersion,
        keyVersionTo: toVersion,
        triggerReason,
        success: true,
        errorDetails: null,
        deviceId,
        userId,
        metadata: {
          operation: 'key_rotation',
          phase: 'start',
        },
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, 'RotationStarted'),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    record_rotation_completed(
      keyId: string,
      fromVersion: any,
      toVersion: any,
      durationMs: number,
      deviceId: string,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const entry = {
        entryId,
        timestamp,
        eventType: 'RotationCompleted',
        keyVersionFrom: fromVersion,
        keyVersionTo: toVersion,
        triggerReason: 'scheduled_completion',
        success: true,
        errorDetails: null,
        deviceId,
        userId,
        metadata: {
          operation: 'key_rotation',
          phase: 'complete',
          duration_ms: durationMs.toString(),
        },
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, 'RotationCompleted'),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    record_rotation_failed(
      keyId: string,
      fromVersion: any,
      errorDetails: string,
      deviceId: string,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const entry = {
        entryId,
        timestamp,
        eventType: 'RotationFailed',
        keyVersionFrom: fromVersion,
        keyVersionTo: null,
        triggerReason: 'rotation_error',
        success: false,
        errorDetails,
        deviceId,
        userId,
        metadata: {
          operation: 'key_rotation',
          phase: 'failed',
        },
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, 'RotationFailed'),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    record_emergency_rotation(
      keyId: string,
      securityEvent: string,
      severity: string,
      responseActions: string[],
      deviceId: string,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const metadata: any = {
        operation: 'emergency_rotation',
        security_event: securityEvent,
        severity,
      };

      responseActions.forEach((action, i) => {
        metadata[`response_action_${i}`] = action;
      });

      const entry = {
        entryId,
        timestamp,
        eventType: 'EmergencyRotation',
        keyVersionFrom: null,
        keyVersionTo: null,
        triggerReason: `security_incident: ${securityEvent}`,
        success: true,
        errorDetails: null,
        deviceId,
        userId,
        metadata,
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, 'EmergencyRotation'),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    record_migration_event(
      keyId: string,
      migrationId: string,
      eventType: string,
      recordsAffected: number,
      success: boolean,
      errorDetails: string | null,
      deviceId: string,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const auditEventType =
        eventType === 'started'
          ? 'MigrationStarted'
          : eventType === 'completed'
            ? 'MigrationCompleted'
            : 'MigrationFailed';

      const entry = {
        entryId,
        timestamp,
        eventType: auditEventType,
        keyVersionFrom: null,
        keyVersionTo: null,
        triggerReason: `data_migration: ${migrationId}`,
        success,
        errorDetails,
        deviceId,
        userId,
        metadata: {
          operation: 'data_migration',
          migration_id: migrationId,
          records_affected: recordsAffected.toString(),
        },
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, eventType),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    record_cross_device_sync(
      keyId: string,
      sourceDevice: string,
      targetDevices: string[],
      syncSuccess: boolean,
      userId: string
    ): string {
      const entryId = this.generateEntryId();
      const timestamp = Date.now();

      const metadata: any = {
        operation: 'cross_device_sync',
        source_device: sourceDevice,
        target_device_count: targetDevices.length.toString(),
      };

      targetDevices.forEach((device, i) => {
        metadata[`target_device_${i}`] = device;
      });

      const entry = {
        entryId,
        timestamp,
        eventType: 'CrossDeviceSync',
        keyVersionFrom: null,
        keyVersionTo: null,
        triggerReason: 'cross_device_synchronization',
        success: syncSuccess,
        errorDetails: syncSuccess ? null : 'Sync failed',
        deviceId: sourceDevice,
        userId,
        metadata,
        integrityHash: this.calculateIntegrityHash(entryId, timestamp, 'CrossDeviceSync'),
      };

      this.addAuditEntry(keyId, entry);
      return entryId;
    }

    get_audit_trail(keyId: string): any[] {
      return this.auditEntries.get(keyId) || [];
    }

    validate_audit_integrity(keyId: string) {
      const entries = this.auditEntries.get(keyId) || [];
      let isValid = true;
      const issues: string[] = [];

      // Check integrity hashes
      for (const entry of entries) {
        const expectedHash = this.calculateIntegrityHash(
          entry.entryId,
          entry.timestamp,
          entry.eventType
        );

        if (entry.integrityHash !== expectedHash) {
          isValid = false;
          issues.push(`Integrity mismatch for entry ${entry.entryId}`);
        }
      }

      // Check chronological ordering
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].timestamp < entries[i - 1].timestamp) {
          isValid = false;
          issues.push(
            `Chronological order violation between entries ${entries[i - 1].entryId} and ${entries[i].entryId}`
          );
        }
      }

      return {
        isValid,
        issues,
        totalEntries: entries.length,
      };
    }

    generate_compliance_report(periodStart: number, periodEnd: number) {
      const reportId = this.generateEntryId();
      const generatedAt = Date.now();

      let totalEvents = 0;
      let violationCount = 0;
      let incidentCount = 0;
      const rotationStatistics: any = {};

      for (const [keyId, entries] of this.auditEntries) {
        const periodEntries = entries.filter(
          entry => entry.timestamp >= periodStart && entry.timestamp <= periodEnd
        );

        totalEvents += periodEntries.length;

        // Count violations (simplified logic)
        const rotationStarts = periodEntries.filter(e => e.eventType === 'RotationStarted').length;
        const rotationCompletions = periodEntries.filter(
          e => e.eventType === 'RotationCompleted' || e.eventType === 'RotationFailed'
        ).length;

        if (rotationStarts > rotationCompletions) {
          violationCount++;
        }

        // Count incidents
        incidentCount += periodEntries.filter(
          e => e.eventType === 'EmergencyRotation' || e.eventType === 'SecurityIncident'
        ).length;

        // Rotation statistics
        rotationStatistics[`${keyId}_successful`] = periodEntries.filter(
          e => e.eventType === 'RotationCompleted'
        ).length;
        rotationStatistics[`${keyId}_failed`] = periodEntries.filter(
          e => e.eventType === 'RotationFailed'
        ).length;
      }

      return {
        reportId,
        generatedAt,
        periodStart,
        periodEnd,
        totalEvents,
        violationCount,
        incidentCount,
        rotationStatistics,
      };
    }

    add_compliance_rule(
      ruleId: string,
      ruleName: string,
      requiredEvents: string[],
      maxTimeBetweenEvents: number,
      severity: string
    ): boolean {
      const rule = {
        ruleId,
        ruleName,
        requiredEvents,
        maxTimeBetweenEvents,
        severity,
      };

      this.complianceRules.push(rule);
      return true;
    }

    private addAuditEntry(keyId: string, entry: any) {
      if (!this.auditEntries.has(keyId)) {
        this.auditEntries.set(keyId, []);
      }
      this.auditEntries.get(keyId)!.push(entry);
    }

    private generateEntryId(): string {
      return `audit_${Date.now()}_${++this.entryCounter}`;
    }

    private calculateIntegrityHash(entryId: string, timestamp: number, eventType: string): string {
      return `hash_${entryId}_${Math.floor(timestamp)}_${eventType}_integrity_salt`;
    }

    private initializeDefaultComplianceRules() {
      this.complianceRules.push({
        ruleId: 'rotation_completion',
        ruleName: 'Rotation Completion Requirement',
        requiredEvents: ['RotationStarted', 'RotationCompleted'],
        maxTimeBetweenEvents: 300000, // 5 minutes
        severity: 'high',
      });

      this.complianceRules.push({
        ruleId: 'emergency_documentation',
        ruleName: 'Emergency Rotation Documentation',
        requiredEvents: ['EmergencyRotation'],
        maxTimeBetweenEvents: 0,
        severity: 'critical',
      });
    }
  },
};

describe('Comprehensive Audit Trail and Compliance', () => {
  let auditManager: any;
  const mockKeyVersion = { major: 1, minor: 0, patch: 0 };
  const mockDevice = 'device-123';
  const mockUser = 'user-456';

  beforeEach(() => {
    auditManager = new mockWasmModule.AuditTrailManager();
    vi.clearAllMocks();
  });

  describe('AuditTrailManager', () => {
    describe('record_rotation_started', () => {
      it('should record rotation start event with correct details', () => {
        const entryId = auditManager.record_rotation_started(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          'scheduled_rotation',
          mockDevice,
          mockUser
        );

        expect(entryId).toBeDefined();
        expect(entryId).toMatch(/^audit_\d+_\d+$/);

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('RotationStarted');
        expect(trail[0].triggerReason).toBe('scheduled_rotation');
        expect(trail[0].success).toBe(true);
        expect(trail[0].deviceId).toBe(mockDevice);
        expect(trail[0].userId).toBe(mockUser);
      });

      it('should include proper metadata for rotation start', () => {
        auditManager.record_rotation_started(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          'scheduled_rotation',
          mockDevice,
          mockUser
        );

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail[0].metadata.operation).toBe('key_rotation');
        expect(trail[0].metadata.phase).toBe('start');
      });
    });

    describe('record_rotation_completed', () => {
      it('should record successful rotation completion', () => {
        const entryId = auditManager.record_rotation_completed(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          5000, // 5 seconds duration
          mockDevice,
          mockUser
        );

        expect(entryId).toBeDefined();

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('RotationCompleted');
        expect(trail[0].success).toBe(true);
        expect(trail[0].metadata.duration_ms).toBe('5000');
      });
    });

    describe('record_rotation_failed', () => {
      it('should record rotation failure with error details', () => {
        const errorMessage = 'Key generation failed';
        const entryId = auditManager.record_rotation_failed(
          'key-1',
          mockKeyVersion,
          errorMessage,
          mockDevice,
          mockUser
        );

        expect(entryId).toBeDefined();

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('RotationFailed');
        expect(trail[0].success).toBe(false);
        expect(trail[0].errorDetails).toBe(errorMessage);
        expect(trail[0].triggerReason).toBe('rotation_error');
      });
    });

    describe('record_emergency_rotation', () => {
      it('should record emergency rotation with security event details', () => {
        const securityEvent = 'device_compromise_detected';
        const responseActions = ['immediate_rotation', 'revoke_old_keys', 'notify_user'];

        const entryId = auditManager.record_emergency_rotation(
          'key-1',
          securityEvent,
          'critical',
          responseActions,
          mockDevice,
          mockUser
        );

        expect(entryId).toBeDefined();

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('EmergencyRotation');
        expect(trail[0].triggerReason).toBe(`security_incident: ${securityEvent}`);
        expect(trail[0].metadata.security_event).toBe(securityEvent);
        expect(trail[0].metadata.severity).toBe('critical');
        expect(trail[0].metadata.response_action_0).toBe('immediate_rotation');
        expect(trail[0].metadata.response_action_1).toBe('revoke_old_keys');
        expect(trail[0].metadata.response_action_2).toBe('notify_user');
      });
    });

    describe('record_migration_event', () => {
      it('should record migration start event', () => {
        const migrationId = 'migration-123';
        const entryId = auditManager.record_migration_event(
          'key-1',
          migrationId,
          'started',
          10000,
          true,
          null,
          mockDevice,
          mockUser
        );

        expect(entryId).toBeDefined();

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('MigrationStarted');
        expect(trail[0].metadata.migration_id).toBe(migrationId);
        expect(trail[0].metadata.records_affected).toBe('10000');
      });

      it('should record migration failure with error details', () => {
        const migrationId = 'migration-456';
        const errorDetails = 'Database connection lost';

        auditManager.record_migration_event(
          'key-1',
          migrationId,
          'failed',
          5000,
          false,
          errorDetails,
          mockDevice,
          mockUser
        );

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail[0].eventType).toBe('MigrationFailed');
        expect(trail[0].success).toBe(false);
        expect(trail[0].errorDetails).toBe(errorDetails);
      });
    });

    describe('record_cross_device_sync', () => {
      it('should record successful cross-device synchronization', () => {
        const sourceDevice = 'device-primary';
        const targetDevices = ['device-mobile', 'device-tablet'];

        const entryId = auditManager.record_cross_device_sync(
          'key-1',
          sourceDevice,
          targetDevices,
          true,
          mockUser
        );

        expect(entryId).toBeDefined();

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail).toHaveLength(1);
        expect(trail[0].eventType).toBe('CrossDeviceSync');
        expect(trail[0].success).toBe(true);
        expect(trail[0].deviceId).toBe(sourceDevice);
        expect(trail[0].metadata.target_device_count).toBe('2');
        expect(trail[0].metadata.target_device_0).toBe('device-mobile');
        expect(trail[0].metadata.target_device_1).toBe('device-tablet');
      });

      it('should record failed cross-device synchronization', () => {
        const sourceDevice = 'device-primary';
        const targetDevices = ['device-offline'];

        auditManager.record_cross_device_sync(
          'key-1',
          sourceDevice,
          targetDevices,
          false,
          mockUser
        );

        const trail = auditManager.get_audit_trail('key-1');
        expect(trail[0].success).toBe(false);
        expect(trail[0].errorDetails).toBe('Sync failed');
      });
    });

    describe('validate_audit_integrity', () => {
      beforeEach(() => {
        // Add some audit entries
        auditManager.record_rotation_started(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          'test',
          mockDevice,
          mockUser
        );
        auditManager.record_rotation_completed(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          1000,
          mockDevice,
          mockUser
        );
      });

      it('should validate intact audit trail', () => {
        const validation = auditManager.validate_audit_integrity('key-1');

        expect(validation.isValid).toBe(true);
        expect(validation.issues).toHaveLength(0);
        expect(validation.totalEntries).toBe(2);
      });

      it('should detect integrity violations', () => {
        // Manually corrupt an entry's integrity hash
        const trail = auditManager.get_audit_trail('key-1');
        if (trail.length > 0) {
          trail[0].integrityHash = 'corrupted_hash';
        }

        const validation = auditManager.validate_audit_integrity('key-1');

        expect(validation.isValid).toBe(false);
        expect(validation.issues.length).toBeGreaterThan(0);
        expect(validation.issues[0]).toContain('Integrity mismatch');
      });

      it('should detect chronological order violations', () => {
        // Manually corrupt timestamps
        const trail = auditManager.get_audit_trail('key-1');
        if (trail.length >= 2) {
          // Make second entry older than first
          trail[1].timestamp = trail[0].timestamp - 1000;
        }

        const validation = auditManager.validate_audit_integrity('key-1');

        expect(validation.isValid).toBe(false);
        expect(
          validation.issues.some(issue => issue.includes('Chronological order violation'))
        ).toBe(true);
      });
    });

    describe('generate_compliance_report', () => {
      const periodStart = Date.now() - 86400000; // 24 hours ago
      const periodEnd = Date.now();

      beforeEach(() => {
        // Add various audit events
        auditManager.record_rotation_started(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          'scheduled',
          mockDevice,
          mockUser
        );
        auditManager.record_rotation_completed(
          'key-1',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          2000,
          mockDevice,
          mockUser
        );
        auditManager.record_emergency_rotation(
          'key-2',
          'device_compromise',
          'high',
          ['immediate_rotation'],
          mockDevice,
          mockUser
        );
        auditManager.record_rotation_failed(
          'key-3',
          mockKeyVersion,
          'Network timeout',
          mockDevice,
          mockUser
        );
      });

      it('should generate comprehensive compliance report', () => {
        const report = auditManager.generate_compliance_report(periodStart, periodEnd);

        expect(report.reportId).toBeDefined();
        expect(report.generatedAt).toBeGreaterThan(periodStart);
        expect(report.periodStart).toBe(periodStart);
        expect(report.periodEnd).toBe(periodEnd);
        expect(report.totalEvents).toBe(4);
        expect(report.incidentCount).toBe(1); // Emergency rotation
        expect(typeof report.rotationStatistics).toBe('object');
      });

      it('should include rotation statistics', () => {
        const report = auditManager.generate_compliance_report(periodStart, periodEnd);

        expect(report.rotationStatistics['key-1_successful']).toBe(1);
        expect(report.rotationStatistics['key-3_failed']).toBe(1);
      });

      it('should detect compliance violations', () => {
        // Add incomplete rotation (start without completion)
        auditManager.record_rotation_started(
          'key-incomplete',
          mockKeyVersion,
          { major: 2, minor: 0, patch: 0 },
          'test',
          mockDevice,
          mockUser
        );

        const report = auditManager.generate_compliance_report(periodStart, periodEnd);

        expect(report.violationCount).toBeGreaterThan(0);
      });
    });

    describe('add_compliance_rule', () => {
      it('should add new compliance rule successfully', () => {
        const success = auditManager.add_compliance_rule(
          'custom_rule_1',
          'Custom Migration Rule',
          ['MigrationStarted', 'MigrationCompleted'],
          600000, // 10 minutes
          'medium'
        );

        expect(success).toBe(true);
      });

      it('should handle various event types and severities', () => {
        const success1 = auditManager.add_compliance_rule(
          'emergency_rule',
          'Emergency Response Rule',
          ['EmergencyRotation'],
          0,
          'critical'
        );

        const success2 = auditManager.add_compliance_rule(
          'sync_rule',
          'Cross-Device Sync Rule',
          ['CrossDeviceSync'],
          30000,
          'low'
        );

        expect(success1).toBe(true);
        expect(success2).toBe(true);
      });
    });
  });

  describe('Comprehensive Audit Scenarios', () => {
    it('should maintain complete audit trail for full rotation lifecycle', () => {
      const keyId = 'lifecycle-key';
      const fromVersion = mockKeyVersion;
      const toVersion = { major: 2, minor: 0, patch: 0 };

      // Complete rotation lifecycle
      const startId = auditManager.record_rotation_started(
        keyId,
        fromVersion,
        toVersion,
        'scheduled',
        mockDevice,
        mockUser
      );
      const migrationId = auditManager.record_migration_event(
        keyId,
        'migration-1',
        'started',
        5000,
        true,
        null,
        mockDevice,
        mockUser
      );
      const completionId = auditManager.record_migration_event(
        keyId,
        'migration-1',
        'completed',
        5000,
        true,
        null,
        mockDevice,
        mockUser
      );
      const rotationId = auditManager.record_rotation_completed(
        keyId,
        fromVersion,
        toVersion,
        10000,
        mockDevice,
        mockUser
      );

      const trail = auditManager.get_audit_trail(keyId);
      expect(trail).toHaveLength(4);

      // Verify chronological order
      expect(trail[0].eventType).toBe('RotationStarted');
      expect(trail[1].eventType).toBe('MigrationStarted');
      expect(trail[2].eventType).toBe('MigrationCompleted');
      expect(trail[3].eventType).toBe('RotationCompleted');

      // Verify integrity
      const validation = auditManager.validate_audit_integrity(keyId);
      expect(validation.isValid).toBe(true);
    });

    it('should handle emergency rotation with proper audit trail', () => {
      const keyId = 'emergency-key';
      const securityEvent = 'suspicious_access_detected';
      const responseActions = ['immediate_rotation', 'user_notification', 'security_log'];

      // Emergency rotation scenario
      const emergencyId = auditManager.record_emergency_rotation(
        keyId,
        securityEvent,
        'critical',
        responseActions,
        mockDevice,
        mockUser
      );
      const rotationId = auditManager.record_rotation_started(
        keyId,
        mockKeyVersion,
        { major: 2, minor: 0, patch: 0 },
        'emergency_trigger',
        mockDevice,
        mockUser
      );
      const completionId = auditManager.record_rotation_completed(
        keyId,
        mockKeyVersion,
        { major: 2, minor: 0, patch: 0 },
        3000,
        mockDevice,
        mockUser
      );

      const trail = auditManager.get_audit_trail(keyId);
      expect(trail).toHaveLength(3);
      expect(trail[0].eventType).toBe('EmergencyRotation');
      expect(trail[0].metadata.severity).toBe('critical');
      expect(trail[0].metadata.response_action_0).toBe('immediate_rotation');

      // Generate compliance report to check incident reporting
      const report = auditManager.generate_compliance_report(Date.now() - 3600000, Date.now());
      expect(report.incidentCount).toBe(1);
    });

    it('should detect and report compliance violations in audit trail', () => {
      const keyId = 'violation-key';

      // Create violation: rotation start without completion
      auditManager.record_rotation_started(
        keyId,
        mockKeyVersion,
        { major: 2, minor: 0, patch: 0 },
        'test',
        mockDevice,
        mockUser
      );
      // Intentionally omit rotation completion

      // Add another key with complete rotation for comparison
      auditManager.record_rotation_started(
        'complete-key',
        mockKeyVersion,
        { major: 2, minor: 0, patch: 0 },
        'test',
        mockDevice,
        mockUser
      );
      auditManager.record_rotation_completed(
        'complete-key',
        mockKeyVersion,
        { major: 2, minor: 0, patch: 0 },
        1000,
        mockDevice,
        mockUser
      );

      const report = auditManager.generate_compliance_report(Date.now() - 3600000, Date.now());
      expect(report.totalEvents).toBe(3);
      expect(report.violationCount).toBe(1); // One incomplete rotation
    });

    it('should maintain audit trail integrity across multiple operations', () => {
      const keyId = 'integrity-key';
      const operations = [
        () =>
          auditManager.record_rotation_started(
            keyId,
            mockKeyVersion,
            { major: 2, minor: 0, patch: 0 },
            'test1',
            mockDevice,
            mockUser
          ),
        () =>
          auditManager.record_migration_event(
            keyId,
            'mig-1',
            'started',
            1000,
            true,
            null,
            mockDevice,
            mockUser
          ),
        () =>
          auditManager.record_cross_device_sync(keyId, mockDevice, ['device-2'], true, mockUser),
        () =>
          auditManager.record_migration_event(
            keyId,
            'mig-1',
            'completed',
            1000,
            true,
            null,
            mockDevice,
            mockUser
          ),
        () =>
          auditManager.record_rotation_completed(
            keyId,
            mockKeyVersion,
            { major: 2, minor: 0, patch: 0 },
            5000,
            mockDevice,
            mockUser
          ),
      ];

      // Execute operations with slight delays to ensure proper ordering
      operations.forEach((operation, index) => {
        // Small delay to ensure different timestamps
        vi.advanceTimersByTime(10);
        operation();
      });

      const trail = auditManager.get_audit_trail(keyId);
      expect(trail).toHaveLength(5);

      // Verify chronological ordering
      for (let i = 1; i < trail.length; i++) {
        expect(trail[i].timestamp).toBeGreaterThanOrEqual(trail[i - 1].timestamp);
      }

      // Verify integrity
      const validation = auditManager.validate_audit_integrity(keyId);
      expect(validation.isValid).toBe(true);
      expect(validation.totalEntries).toBe(5);
    });
  });
});
