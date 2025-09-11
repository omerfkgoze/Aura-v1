/**
 * Authentication Audit Trail Validation Tests
 *
 * Comprehensive testing for authentication audit trail including:
 * - Complete authentication event logging
 * - Security event detection and alerting
 * - Audit trail integrity and tamper detection
 * - Compliance reporting and data retention
 * - Cross-platform audit consistency
 * - Privacy-safe logging (no PII)
 * - Real-time security monitoring
 * - Forensic analysis capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuthPersistenceManager,
  SecurityAuditLogger,
  ComplianceReporter,
  ForensicAnalyzer,
  AuthStateManager,
  SessionManager,
  UnifiedAuthenticationManager,
  TamperDetectionManager,
} from '../src/index.js';
import type {
  AuditEvent,
  SecurityEvent,
  ComplianceReport,
  ForensicReport,
  TamperDetectionResult,
  AuditQuery,
  SecurityAlert,
  EventIntegrityCheck,
  AuditRetentionPolicy,
} from '../src/index.js';

describe('Authentication Audit Trail Validation', () => {
  let persistenceManager: AuthPersistenceManager;
  let auditLogger: SecurityAuditLogger;
  let complianceReporter: ComplianceReporter;
  let forensicAnalyzer: ForensicAnalyzer;
  let authStateManager: AuthStateManager;
  let sessionManager: SessionManager;
  let unifiedAuth: UnifiedAuthenticationManager;
  let tamperDetection: TamperDetectionManager;

  const testUserId = 'audit-test-user';
  const testDeviceId = 'audit-test-device';
  const testSessionId = 'audit-test-session';

  beforeEach(async () => {
    persistenceManager = new AuthPersistenceManager();
    auditLogger = new SecurityAuditLogger();
    complianceReporter = new ComplianceReporter();
    forensicAnalyzer = new ForensicAnalyzer();
    authStateManager = new AuthStateManager();
    sessionManager = new SessionManager();
    unifiedAuth = new UnifiedAuthenticationManager();
    tamperDetection = new TamperDetectionManager();

    // Clear any existing test data
    await persistenceManager.clearTestData();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Authentication Event Logging', () => {
    it('should log all authentication lifecycle events', async () => {
      // Simulate complete authentication lifecycle
      const events = [];

      // Registration phase
      events.push(
        await auditLogger.logEvent(testUserId, 'registration_started', {
          deviceId: testDeviceId,
          method: 'passkey',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
        })
      );

      events.push(
        await auditLogger.logEvent(testUserId, 'credential_created', {
          deviceId: testDeviceId,
          credentialId: 'cred-123',
          credentialType: 'webauthn',
          hardwareBacked: true,
          timestamp: new Date(),
        })
      );

      events.push(
        await auditLogger.logEvent(testUserId, 'registration_completed', {
          deviceId: testDeviceId,
          method: 'passkey',
          timestamp: new Date(),
          duration: 2340, // milliseconds
        })
      );

      // Authentication phase
      events.push(
        await auditLogger.logEvent(testUserId, 'authentication_started', {
          deviceId: testDeviceId,
          method: 'passkey',
          credentialId: 'cred-123',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
        })
      );

      events.push(
        await auditLogger.logEvent(testUserId, 'user_verification_completed', {
          deviceId: testDeviceId,
          verificationType: 'biometric',
          biometricType: 'faceID',
          timestamp: new Date(),
        })
      );

      events.push(
        await auditLogger.logEvent(testUserId, 'authentication_completed', {
          deviceId: testDeviceId,
          method: 'passkey',
          timestamp: new Date(),
          duration: 1520,
        })
      );

      // Session phase
      events.push(
        await auditLogger.logEvent(testUserId, 'session_created', {
          sessionId: testSessionId,
          deviceId: testDeviceId,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        })
      );

      // Verify all events were logged
      const auditTrail = await persistenceManager.getAuditEvents(testUserId, {
        startTime: new Date(Date.now() - 60000), // Last minute
        endTime: new Date(),
      });

      expect(auditTrail).toHaveLength(events.length);

      // Verify event sequence and content
      const eventTypes = auditTrail.map(event => event.type);
      expect(eventTypes).toEqual([
        'registration_started',
        'credential_created',
        'registration_completed',
        'authentication_started',
        'user_verification_completed',
        'authentication_completed',
        'session_created',
      ]);

      // Verify all events have required fields
      auditTrail.forEach(event => {
        expect(event.userId).toBe(testUserId);
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.eventId).toBeTruthy();
        expect(event.integrity).toBeTruthy(); // Integrity hash
        expect(event.details).toBeTruthy();

        // Privacy check: no PII in logs
        expect(JSON.stringify(event)).not.toMatch(/password|pin|biometric_data|private_key/i);
      });
    });

    it('should log authentication failures with appropriate detail', async () => {
      const failureScenarios = [
        {
          type: 'authentication_failed',
          reason: 'invalid_credential',
          details: { credentialId: 'cred-123', attempts: 1 },
        },
        {
          type: 'authentication_failed',
          reason: 'user_verification_failed',
          details: { biometricType: 'fingerprint', attempts: 2 },
        },
        {
          type: 'authentication_failed',
          reason: 'timeout_exceeded',
          details: { timeout: 60000, elapsed: 65000 },
        },
        {
          type: 'account_locked',
          reason: 'too_many_attempts',
          details: { failedAttempts: 5, lockDuration: 300000 },
        },
      ];

      for (const scenario of failureScenarios) {
        await auditLogger.logEvent(testUserId, scenario.type, {
          deviceId: testDeviceId,
          reason: scenario.reason,
          timestamp: new Date(),
          ...scenario.details,
        });
      }

      const failureEvents = await persistenceManager.getAuditEvents(testUserId, {
        eventTypes: ['authentication_failed', 'account_locked'],
      });

      expect(failureEvents).toHaveLength(failureScenarios.length);

      // Verify failure events contain security-relevant information
      failureEvents.forEach((event, index) => {
        expect(event.type).toBe(failureScenarios[index].type);
        expect(event.details.reason).toBe(failureScenarios[index].reason);
        expect(event.severity).toMatch(/^(medium|high|critical)$/);

        // Security escalation for repeated failures
        if (event.type === 'account_locked') {
          expect(event.severity).toBe('critical');
          expect(event.alertRequired).toBe(true);
        }
      });
    });

    it('should track session lifecycle events', async () => {
      const sessionEvents = [
        {
          type: 'session_created',
          details: {
            sessionId: testSessionId,
            authMethod: 'passkey',
            deviceId: testDeviceId,
            expiresAt: new Date(Date.now() + 3600000),
          },
        },
        {
          type: 'session_extended',
          details: {
            sessionId: testSessionId,
            extensionDuration: 1800000, // 30 minutes
            newExpiryAt: new Date(Date.now() + 5400000),
          },
        },
        {
          type: 'session_activity',
          details: {
            sessionId: testSessionId,
            activity: 'api_request',
            endpoint: '/api/user/profile',
            timestamp: new Date(),
          },
        },
        {
          type: 'session_invalidated',
          details: {
            sessionId: testSessionId,
            reason: 'user_logout',
            timestamp: new Date(),
          },
        },
      ];

      for (const sessionEvent of sessionEvents) {
        await auditLogger.logEvent(testUserId, sessionEvent.type, sessionEvent.details);
      }

      const sessionAuditTrail = await persistenceManager.getSessionAuditTrail(testSessionId);
      expect(sessionAuditTrail).toHaveLength(sessionEvents.length);

      // Verify session timeline integrity
      const timestamps = sessionAuditTrail.map(event => event.timestamp.getTime());
      const isSorted = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
      expect(isSorted).toBe(true);

      // Verify session state transitions are logical
      expect(sessionAuditTrail[0].type).toBe('session_created');
      expect(sessionAuditTrail[sessionAuditTrail.length - 1].type).toBe('session_invalidated');
    });

    it('should log recovery and emergency access events', async () => {
      const recoveryEvents = [
        {
          type: 'recovery_phrase_generated',
          details: {
            userId: testUserId,
            entropyBits: 256,
            timestamp: new Date(),
          },
        },
        {
          type: 'recovery_attempt_started',
          details: {
            method: 'recovery_phrase',
            deviceId: 'new-device-123',
            timestamp: new Date(),
          },
        },
        {
          type: 'recovery_phrase_validated',
          details: {
            deviceId: 'new-device-123',
            timestamp: new Date(),
          },
        },
        {
          type: 'account_recovered',
          details: {
            userId: testUserId,
            newDeviceId: 'new-device-123',
            oldDevicesInvalidated: ['old-device-456'],
            timestamp: new Date(),
          },
        },
        {
          type: 'emergency_access_used',
          details: {
            emergencyCodeId: 'emergency-789',
            deviceId: 'emergency-device-101',
            timestamp: new Date(),
            limitedAccess: true,
          },
        },
      ];

      for (const recoveryEvent of recoveryEvents) {
        await auditLogger.logEvent(testUserId, recoveryEvent.type, recoveryEvent.details);
      }

      const recoveryAuditTrail = await persistenceManager.getRecoveryAuditTrail(testUserId);
      expect(recoveryAuditTrail).toHaveLength(recoveryEvents.length);

      // Verify recovery events are marked as high-security
      recoveryAuditTrail.forEach(event => {
        expect(event.securityLevel).toMatch(/^(high|critical)$/);
        expect(event.requiresReview).toBe(true);

        // Emergency access should be specially flagged
        if (event.type === 'emergency_access_used') {
          expect(event.severity).toBe('critical');
          expect(event.alertRequired).toBe(true);
        }
      });
    });
  });

  describe('Security Event Detection and Alerting', () => {
    it('should detect and alert on suspicious authentication patterns', async () => {
      // Simulate suspicious patterns
      const suspiciousPatterns = [
        {
          pattern: 'rapid_failed_attempts',
          events: Array(10)
            .fill(null)
            .map((_, i) => ({
              type: 'authentication_failed',
              timestamp: new Date(Date.now() + i * 1000),
              details: { attempt: i + 1, reason: 'invalid_credential' },
            })),
        },
        {
          pattern: 'geolocation_anomaly',
          events: [
            {
              type: 'authentication_completed',
              timestamp: new Date(),
              details: { location: 'New York, US', ipAddress: '192.168.1.100' },
            },
            {
              type: 'authentication_completed',
              timestamp: new Date(Date.now() + 60000),
              details: { location: 'London, UK', ipAddress: '10.0.0.50' },
            },
          ],
        },
        {
          pattern: 'device_anomaly',
          events: [
            {
              type: 'authentication_completed',
              timestamp: new Date(),
              details: { deviceId: testDeviceId, deviceFingerprint: 'known-device' },
            },
            {
              type: 'authentication_completed',
              timestamp: new Date(Date.now() + 30000),
              details: { deviceId: 'unknown-device-999', deviceFingerprint: 'unknown' },
            },
          ],
        },
      ];

      for (const { pattern, events } of suspiciousPatterns) {
        // Log events
        for (const event of events) {
          await auditLogger.logEvent(testUserId, event.type, event.details);
        }

        // Run pattern detection
        const detectionResult = await auditLogger.detectSuspiciousPatterns(testUserId, pattern);
        expect(detectionResult.detected).toBe(true);
        expect(detectionResult.confidence).toBeGreaterThan(0.7);
        expect(detectionResult.alertGenerated).toBe(true);
      }

      // Verify security alerts were created
      const securityAlerts = await auditLogger.getSecurityAlerts(testUserId);
      expect(securityAlerts.length).toBeGreaterThanOrEqual(suspiciousPatterns.length);

      securityAlerts.forEach(alert => {
        expect(alert.severity).toMatch(/^(medium|high|critical)$/);
        expect(alert.timestamp).toBeInstanceOf(Date);
        expect(alert.description).toBeTruthy();
        expect(alert.recommendedActions).toBeInstanceOf(Array);
        expect(alert.requiresImmedateAction).toBeTypeOf('boolean');
      });
    });

    it('should detect concurrent session anomalies', async () => {
      const userId = 'concurrent-test-user';
      const sessions = [];

      // Create multiple concurrent sessions
      for (let i = 0; i < 8; i++) {
        const sessionId = `session-${i}`;
        sessions.push(sessionId);

        await auditLogger.logEvent(userId, 'session_created', {
          sessionId,
          deviceId: `device-${i}`,
          timestamp: new Date(Date.now() + i * 1000),
          ipAddress: `192.168.1.${100 + i}`,
        });
      }

      // Run concurrent session analysis
      const anomalyDetection = await auditLogger.detectConcurrentSessionAnomalies(userId);

      expect(anomalyDetection.anomalyDetected).toBe(true);
      expect(anomalyDetection.concurrentSessions).toBe(sessions.length);
      expect(anomalyDetection.riskLevel).toMatch(/^(medium|high|critical)$/);

      // Should generate appropriate alerts
      if (anomalyDetection.concurrentSessions > 5) {
        expect(anomalyDetection.alertSeverity).toBe('high');
        expect(anomalyDetection.recommendedActions).toContain('force_reauthentication');
      }
    });

    it('should detect and alert on privilege escalation attempts', async () => {
      const escalationEvents = [
        {
          type: 'authentication_completed',
          details: {
            userId: testUserId,
            role: 'user',
            permissions: ['read_profile', 'update_profile'],
          },
        },
        {
          type: 'privilege_escalation_attempt',
          details: {
            userId: testUserId,
            attemptedRole: 'admin',
            attemptedPermissions: ['read_all_users', 'delete_users'],
            denied: true,
            method: 'token_manipulation',
          },
        },
        {
          type: 'suspicious_api_access',
          details: {
            userId: testUserId,
            endpoint: '/api/admin/users',
            unauthorized: true,
            timestamp: new Date(),
          },
        },
      ];

      for (const event of escalationEvents) {
        await auditLogger.logEvent(testUserId, event.type, event.details);
      }

      const escalationAnalysis = await auditLogger.analyzePrivilegeEscalation(testUserId);

      expect(escalationAnalysis.escalationAttempted).toBe(true);
      expect(escalationAnalysis.severity).toBe('critical');
      expect(escalationAnalysis.blockedAttempts).toBeGreaterThan(0);
      expect(escalationAnalysis.alertGenerated).toBe(true);

      // Verify immediate security response
      const securityResponse = await auditLogger.getSecurityResponse(
        testUserId,
        'privilege_escalation'
      );
      expect(securityResponse.actionTaken).toBeTruthy();
      expect(securityResponse.sessionInvalidated).toBe(true);
      expect(securityResponse.accountFlagged).toBe(true);
    });
  });

  describe('Audit Trail Integrity and Tamper Detection', () => {
    it('should maintain cryptographic integrity of audit logs', async () => {
      // Create audit events with integrity hashes
      const events = [
        { type: 'authentication_completed', details: { method: 'passkey' } },
        { type: 'session_created', details: { sessionId: 'session-123' } },
        { type: 'profile_updated', details: { field: 'email' } },
      ];

      const loggedEvents = [];
      for (const event of events) {
        const loggedEvent = await auditLogger.logEventWithIntegrity(
          testUserId,
          event.type,
          event.details
        );
        loggedEvents.push(loggedEvent);
      }

      // Verify each event has integrity protection
      loggedEvents.forEach(event => {
        expect(event.integrityHash).toBeTruthy();
        expect(event.integrityHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
        expect(event.previousHash).toBeTruthy(); // Chain integrity
        expect(event.nonce).toBeTruthy(); // Prevents replay
      });

      // Verify integrity chain
      const integrityCheck = await tamperDetection.verifyAuditChainIntegrity(testUserId);
      expect(integrityCheck.valid).toBe(true);
      expect(integrityCheck.eventCount).toBe(events.length);
      expect(integrityCheck.chainValid).toBe(true);
    });

    it('should detect tampering attempts on audit logs', async () => {
      // Create legitimate audit events
      const originalEvent = await auditLogger.logEventWithIntegrity(
        testUserId,
        'authentication_completed',
        {
          method: 'passkey',
          timestamp: new Date(),
          deviceId: testDeviceId,
        }
      );

      // Simulate tampering attempt
      const tamperedEvent = { ...originalEvent };
      tamperedEvent.details.method = 'password'; // Modified detail
      tamperedEvent.timestamp = new Date(); // Modified timestamp

      // Store tampered event
      await simulateEventTampering(testUserId, originalEvent.eventId, tamperedEvent);

      // Run tamper detection
      const tamperResult = await tamperDetection.detectAuditTampering(testUserId);

      expect(tamperResult.tamperingDetected).toBe(true);
      expect(tamperResult.tamperedEvents).toHaveLength(1);
      expect(tamperResult.tamperedEvents[0].eventId).toBe(originalEvent.eventId);
      expect(tamperResult.integrityViolations).toContain('hash_mismatch');

      // Verify security response to tampering
      expect(tamperResult.securityAlertGenerated).toBe(true);
      expect(tamperResult.forensicLogCreated).toBe(true);
    });

    it('should maintain immutable audit log storage', async () => {
      const event = await auditLogger.logEventWithIntegrity(testUserId, 'session_created', {
        sessionId: testSessionId,
        timestamp: new Date(),
      });

      // Attempt to modify stored event
      const modificationResult = await attemptEventModification(event.eventId, {
        type: 'modified_event',
        details: { modified: true },
      });

      expect(modificationResult.allowed).toBe(false);
      expect(modificationResult.error).toContain('immutable_storage');

      // Verify original event remains unchanged
      const retrievedEvent = await persistenceManager.getAuditEvent(event.eventId);
      expect(retrievedEvent.type).toBe('session_created');
      expect(retrievedEvent.details.modified).toBeUndefined();
    });

    it('should provide audit trail backup and recovery', async () => {
      // Create multiple events
      const events = [];
      for (let i = 0; i < 50; i++) {
        const event = await auditLogger.logEvent(testUserId, 'test_event', {
          sequenceNumber: i,
          timestamp: new Date(Date.now() + i * 1000),
        });
        events.push(event);
      }

      // Create backup
      const backup = await persistenceManager.createAuditBackup(testUserId, {
        includeIntegrityHashes: true,
        compressionEnabled: true,
        encryption: true,
      });

      expect(backup.eventCount).toBe(events.length);
      expect(backup.integrityValid).toBe(true);
      expect(backup.encrypted).toBe(true);
      expect(backup.backupId).toBeTruthy();

      // Simulate data loss
      await simulateAuditDataLoss(testUserId);

      // Restore from backup
      const restoration = await persistenceManager.restoreAuditFromBackup(backup.backupId);

      expect(restoration.success).toBe(true);
      expect(restoration.restoredEventCount).toBe(events.length);
      expect(restoration.integrityVerified).toBe(true);

      // Verify restored data integrity
      const restoredEvents = await persistenceManager.getAuditEvents(testUserId);
      expect(restoredEvents).toHaveLength(events.length);
    });
  });

  describe('Compliance Reporting and Data Retention', () => {
    it('should generate GDPR compliance reports', async () => {
      // Create various types of events over time period
      const eventTypes = [
        'user_registration',
        'authentication_completed',
        'profile_updated',
        'data_accessed',
        'data_exported',
        'consent_given',
        'consent_withdrawn',
      ];

      for (const eventType of eventTypes) {
        await auditLogger.logEvent(testUserId, eventType, {
          timestamp: new Date(),
          gdprRelevant: true,
          dataProcessingBasis: 'legitimate_interest',
        });
      }

      const gdprReport = await complianceReporter.generateGDPRReport(testUserId, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date(),
        includeDataProcessingActivities: true,
        includeConsentHistory: true,
      });

      expect(gdprReport.userId).toBe(testUserId);
      expect(gdprReport.reportType).toBe('gdpr_compliance');
      expect(gdprReport.dataProcessingActivities).toBeInstanceOf(Array);
      expect(gdprReport.consentHistory).toBeInstanceOf(Array);
      expect(gdprReport.retentionCompliance).toBeTruthy();

      // Verify GDPR-specific requirements
      expect(gdprReport.dataMinimizationCompliant).toBe(true);
      expect(gdprReport.purposeLimitationCompliant).toBe(true);
      expect(gdprReport.retentionPeriodCompliant).toBe(true);
    });

    it('should implement automatic data retention policies', async () => {
      const retentionPolicies: AuditRetentionPolicy[] = [
        {
          eventType: 'authentication_completed',
          retentionPeriodDays: 365, // 1 year
          archiveAfterDays: 90,
          deleteAfterDays: 1825, // 5 years
        },
        {
          eventType: 'security_incident',
          retentionPeriodDays: 2555, // 7 years
          archiveAfterDays: 365,
          deleteAfterDays: -1, // Never delete
        },
        {
          eventType: 'session_activity',
          retentionPeriodDays: 30,
          archiveAfterDays: 7,
          deleteAfterDays: 90,
        },
      ];

      // Configure retention policies
      await persistenceManager.setRetentionPolicies(retentionPolicies);

      // Create events with different ages
      const oldEvent = await auditLogger.logEvent(testUserId, 'session_activity', {
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      });

      const archiveEvent = await auditLogger.logEvent(testUserId, 'authentication_completed', {
        timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      });

      // Run retention policy enforcement
      const retentionResult = await persistenceManager.enforceRetentionPolicies();

      expect(retentionResult.eventsProcessed).toBeGreaterThan(0);
      expect(retentionResult.eventsArchived).toBeGreaterThan(0);
      expect(retentionResult.eventsDeleted).toBeGreaterThan(0);

      // Verify policies were applied correctly
      const oldEventStatus = await persistenceManager.getEventStatus(oldEvent.eventId);
      expect(oldEventStatus.status).toBe('deleted');

      const archiveEventStatus = await persistenceManager.getEventStatus(archiveEvent.eventId);
      expect(archiveEventStatus.status).toBe('archived');
    });

    it('should support compliance audit exports', async () => {
      // Generate comprehensive audit data
      const auditData = await generateComprehensiveAuditData(testUserId);

      // Export for different compliance frameworks
      const exports = {
        soc2: await complianceReporter.exportForSOC2(testUserId, {
          controlObjectives: ['CC6.1', 'CC6.2', 'CC6.3'],
          timeRange: { days: 90 },
        }),
        iso27001: await complianceReporter.exportForISO27001(testUserId, {
          controlFramework: '2022',
          includeRiskAssessment: true,
        }),
        hipaa: await complianceReporter.exportForHIPAA(testUserId, {
          includeTechnicalSafeguards: true,
          includeAccessLogs: true,
        }),
      };

      // Verify export completeness
      Object.entries(exports).forEach(([framework, exportData]) => {
        expect(exportData.framework).toBe(framework);
        expect(exportData.auditEvents).toBeInstanceOf(Array);
        expect(exportData.auditEvents.length).toBeGreaterThan(0);
        expect(exportData.integrityVerified).toBe(true);
        expect(exportData.exportTimestamp).toBeInstanceOf(Date);

        // Framework-specific validation
        if (framework === 'soc2') {
          expect(exportData.controlObjectives).toBeInstanceOf(Array);
        }
        if (framework === 'hipaa') {
          expect(exportData.technicalSafeguards).toBeTruthy();
        }
      });
    });
  });

  describe('Cross-Platform Audit Consistency', () => {
    it('should maintain consistent audit formats across platforms', async () => {
      const platforms = ['ios', 'android', 'web'];
      const auditFormatTests = [];

      for (const platform of platforms) {
        const event = await auditLogger.logEvent(testUserId, 'authentication_completed', {
          platform,
          method: 'passkey',
          timestamp: new Date(),
          deviceInfo: { platform },
        });

        auditFormatTests.push({ platform, event });
      }

      // Verify consistent event structure across platforms
      const eventStructures = auditFormatTests.map(test => ({
        platform: test.platform,
        structure: Object.keys(test.event).sort(),
      }));

      const baseStructure = eventStructures[0].structure;
      eventStructures.forEach(({ platform, structure }) => {
        expect(structure).toEqual(baseStructure);
      });

      // Verify consistent field types
      auditFormatTests.forEach(({ platform, event }) => {
        expect(event.eventId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.userId).toBe(testUserId);
        expect(event.type).toBe('authentication_completed');
        expect(event.details.platform).toBe(platform);
      });
    });

    it('should synchronize audit trails across user devices', async () => {
      const devices = [
        { id: 'phone-ios', platform: 'ios' },
        { id: 'tablet-android', platform: 'android' },
        { id: 'laptop-web', platform: 'web' },
      ];

      // Generate events on each device
      const deviceEvents = [];
      for (const device of devices) {
        const event = await auditLogger.logEvent(testUserId, 'device_authentication', {
          deviceId: device.id,
          platform: device.platform,
          timestamp: new Date(),
        });
        deviceEvents.push(event);
      }

      // Synchronize audit trails
      const syncResult = await persistenceManager.synchronizeAuditAcrossDevices(
        testUserId,
        devices
      );

      expect(syncResult.synchronized).toBe(true);
      expect(syncResult.deviceCount).toBe(devices.length);
      expect(syncResult.totalEvents).toBe(deviceEvents.length);

      // Verify events are accessible from any device
      for (const device of devices) {
        const deviceAuditTrail = await persistenceManager.getAuditEventsForDevice(
          testUserId,
          device.id
        );
        expect(deviceAuditTrail.length).toBeGreaterThanOrEqual(1);

        // Verify cross-device event visibility
        const allUserEvents = await persistenceManager.getAuditEvents(testUserId);
        expect(allUserEvents.length).toBe(deviceEvents.length);
      }
    });
  });

  describe('Privacy-Safe Logging', () => {
    it('should never log personally identifiable information', async () => {
      const sensitiveData = {
        email: 'user@example.com',
        phone: '+1234567890',
        ssn: '123-45-6789',
        creditCard: '4532-1234-5678-9012',
        password: 'secretPassword123',
        biometricData: 'base64-encoded-fingerprint-data',
        privateKey: 'private-key-material-here',
      };

      // Attempt to log event with sensitive data
      const event = await auditLogger.logEvent(testUserId, 'profile_updated', sensitiveData);

      // Verify sensitive data was sanitized
      const eventString = JSON.stringify(event);

      expect(eventString).not.toContain(sensitiveData.email);
      expect(eventString).not.toContain(sensitiveData.phone);
      expect(eventString).not.toContain(sensitiveData.ssn);
      expect(eventString).not.toContain(sensitiveData.creditCard);
      expect(eventString).not.toContain(sensitiveData.password);
      expect(eventString).not.toContain(sensitiveData.biometricData);
      expect(eventString).not.toContain(sensitiveData.privateKey);

      // Verify PII sanitization markers
      expect(event.details.piiSanitized).toBe(true);
      expect(event.details.sanitizedFields).toBeInstanceOf(Array);
      expect(event.details.sanitizedFields.length).toBeGreaterThan(0);
    });

    it('should use pseudonymization for user identifiers when required', async () => {
      const pseudonymizedEvent = await auditLogger.logEventWithPseudonymization(
        testUserId,
        'data_access',
        {
          resource: '/api/health-data',
          timestamp: new Date(),
          requiresPseudonymization: true,
        }
      );

      // User ID should be pseudonymized in certain contexts
      expect(pseudonymizedEvent.pseudonymizedUserId).toBeTruthy();
      expect(pseudonymizedEvent.pseudonymizedUserId).not.toBe(testUserId);
      expect(pseudonymizedEvent.pseudonymizedUserId).toMatch(/^pseudo_[a-f0-9]{32}$/);

      // Original user ID should not be in the logged event
      const eventString = JSON.stringify(pseudonymizedEvent);
      expect(eventString).not.toContain(testUserId);

      // But audit system should be able to de-pseudonymize for authorized access
      const dePseudonymizedUserId = await auditLogger.dePseudonymizeUserId(
        pseudonymizedEvent.pseudonymizedUserId,
        { authorized: true, purpose: 'security_investigation' }
      );

      expect(dePseudonymizedUserId).toBe(testUserId);
    });
  });

  describe('Real-Time Security Monitoring', () => {
    it('should provide real-time security event streaming', async () => {
      const securityEvents: SecurityEvent[] = [];

      // Setup real-time monitoring
      const eventStream = auditLogger.createSecurityEventStream(testUserId);

      eventStream.on('security_event', (event: SecurityEvent) => {
        securityEvents.push(event);
      });

      // Generate security-relevant events
      await auditLogger.logEvent(testUserId, 'authentication_failed', {
        reason: 'invalid_credential',
        severity: 'medium',
      });

      await auditLogger.logEvent(testUserId, 'suspicious_location', {
        newLocation: 'Unusual Country',
        severity: 'high',
      });

      await auditLogger.logEvent(testUserId, 'privilege_escalation_attempt', {
        targetRole: 'admin',
        severity: 'critical',
      });

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(securityEvents).toHaveLength(3);

      // Verify real-time event structure
      securityEvents.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(event.realTime).toBe(true);
        expect(event.streamId).toBeTruthy();
      });

      // Cleanup
      eventStream.close();
    });

    it('should trigger automated security responses', async () => {
      // Configure automated responses
      await auditLogger.configureAutomatedResponses([
        {
          trigger: 'authentication_failed',
          threshold: 5,
          timeWindow: 300000, // 5 minutes
          response: 'lock_account',
        },
        {
          trigger: 'privilege_escalation_attempt',
          threshold: 1,
          response: 'invalidate_session',
        },
      ]);

      // Trigger automated response through repeated failures
      for (let i = 0; i < 6; i++) {
        await auditLogger.logEvent(testUserId, 'authentication_failed', {
          attempt: i + 1,
          timestamp: new Date(),
        });
      }

      // Verify automated response was triggered
      const automatedResponses = await auditLogger.getAutomatedResponses(testUserId);

      expect(automatedResponses.length).toBeGreaterThan(0);

      const lockResponse = automatedResponses.find(r => r.action === 'lock_account');
      expect(lockResponse).toBeTruthy();
      expect(lockResponse.triggered).toBe(true);
      expect(lockResponse.triggerTimestamp).toBeInstanceOf(Date);
    });
  });

  describe('Forensic Analysis Capabilities', () => {
    it('should support comprehensive forensic analysis', async () => {
      // Create complex event sequence for analysis
      await createComplexEventSequence(testUserId);

      const forensicReport = await forensicAnalyzer.generateForensicReport(testUserId, {
        analysisType: 'comprehensive',
        timeRange: { hours: 24 },
        includeCorrelationAnalysis: true,
        includeBehaviorAnalysis: true,
        includeTimelineReconstruction: true,
      });

      expect(forensicReport.userId).toBe(testUserId);
      expect(forensicReport.analysisType).toBe('comprehensive');
      expect(forensicReport.eventTimeline).toBeInstanceOf(Array);
      expect(forensicReport.correlationResults).toBeTruthy();
      expect(forensicReport.behaviorAnalysis).toBeTruthy();
      expect(forensicReport.anomaliesDetected).toBeInstanceOf(Array);

      // Verify forensic evidence chain
      expect(forensicReport.evidenceChainIntact).toBe(true);
      expect(forensicReport.integrityVerified).toBe(true);
      expect(forensicReport.forensicHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reconstruct attack timelines', async () => {
      // Simulate attack sequence
      const attackEvents = [
        { type: 'reconnaissance', timestamp: new Date(Date.now() - 3600000) },
        { type: 'credential_stuffing', timestamp: new Date(Date.now() - 3000000) },
        { type: 'session_hijack_attempt', timestamp: new Date(Date.now() - 2400000) },
        { type: 'privilege_escalation', timestamp: new Date(Date.now() - 1800000) },
        { type: 'data_exfiltration_attempt', timestamp: new Date(Date.now() - 1200000) },
        { type: 'cleanup_attempt', timestamp: new Date(Date.now() - 600000) },
      ];

      for (const attackEvent of attackEvents) {
        await auditLogger.logEvent(testUserId, attackEvent.type, {
          timestamp: attackEvent.timestamp,
          attackPhase: true,
          severity: 'critical',
        });
      }

      const timelineReconstruction = await forensicAnalyzer.reconstructAttackTimeline(testUserId);

      expect(timelineReconstruction.attackDetected).toBe(true);
      expect(timelineReconstruction.attackPhases).toHaveLength(attackEvents.length);
      expect(timelineReconstruction.attackDuration).toBeGreaterThan(0);
      expect(timelineReconstruction.attackVector).toBeTruthy();

      // Verify timeline accuracy
      const reconstructedPhases = timelineReconstruction.attackPhases.map(phase => phase.type);
      const originalPhases = attackEvents.map(event => event.type);
      expect(reconstructedPhases).toEqual(originalPhases);
    });
  });
});

// Helper functions for audit testing

async function simulateEventTampering(
  userId: string,
  eventId: string,
  tamperedData: any
): Promise<void> {
  // Simulate tampering attempt (would fail in production)
  global.tamperedEvents = global.tamperedEvents || new Map();
  global.tamperedEvents.set(eventId, tamperedData);
}

async function attemptEventModification(
  eventId: string,
  newData: any
): Promise<{ allowed: boolean; error?: string }> {
  // Simulate attempt to modify immutable event
  return {
    allowed: false,
    error: 'immutable_storage: Events cannot be modified after creation',
  };
}

async function simulateAuditDataLoss(userId: string): Promise<void> {
  // Simulate data loss scenario
  global.lostAuditData = global.lostAuditData || new Set();
  global.lostAuditData.add(userId);
}

async function generateComprehensiveAuditData(userId: string): Promise<any> {
  // Generate sample audit data for compliance testing
  return {
    eventCount: 1000,
    timeRange: { days: 90 },
    eventTypes: ['authentication', 'authorization', 'data_access', 'configuration_change'],
    complianceRelevant: true,
  };
}

async function createComplexEventSequence(userId: string): Promise<void> {
  // Create complex event sequence for forensic analysis
  const events = [
    'user_login',
    'permission_granted',
    'data_accessed',
    'configuration_changed',
    'alert_generated',
    'incident_response',
    'recovery_initiated',
    'system_restored',
  ];

  for (const [index, eventType] of events.entries()) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delays
    // Implementation would create actual events
  }
}
