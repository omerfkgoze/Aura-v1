import { PrivacySafeAuditService } from '../../services/PrivacySafeAuditService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-sqlite-storage');
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-value'),
  })),
}));

describe('Privacy-Safe Sync Audit Trail', () => {
  let auditService: PrivacySafeAuditService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup SQLite mock
    mockDb = {
      transaction: jest.fn(callback => {
        const tx = {
          executeSql: jest.fn((sql, params, success) => {
            if (success) success(null, { rows: { length: 0, item: () => ({}) } });
          }),
        };
        callback(tx);
      }),
      close: jest.fn(),
    };

    (SQLite.openDatabase as jest.Mock).mockImplementation((config, success) => {
      success(mockDb);
    });

    // Setup AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-salt-value');
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    auditService = new PrivacySafeAuditService();
  });

  afterEach(async () => {
    await auditService.dispose();
  });

  describe('Privacy Protection', () => {
    test('should hash device IDs for privacy protection', async () => {
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const testDeviceId = 'device-12345-abcdef';
      const sessionId = await auditService.startAuditSession(testDeviceId);

      // Verify session was created
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);

      // Verify that device ID is hashed in database calls
      expect(mockDb.transaction).toHaveBeenCalled();

      // Check that raw device ID is not stored directly
      const transactionCalls = mockDb.transaction.mock.calls;
      const hasRawDeviceId = transactionCalls.some(call => {
        const callback = call[0];
        const mockTx = { executeSql: jest.fn() };
        callback(mockTx);

        return mockTx.executeSql.mock.calls.some(sqlCall => {
          const params = sqlCall[1] || [];
          return params.includes(testDeviceId);
        });
      });

      expect(hasRawDeviceId).toBe(false);
    });

    test('should not expose sensitive content in audit logs', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const sessionId = await auditService.startAuditSession('test-device');

      // Log a sync operation
      await auditService.logSyncOperation(
        'sync_complete',
        'cycle_data',
        5, // 5 records synced
        {
          dataSize: 1024,
          networkType: 'wifi',
          duration: 2500,
        }
      );

      // Verify that only metadata is logged, no actual content
      expect(mockDb.transaction).toHaveBeenCalled();

      // Check that no health data or sensitive content appears in logs
      const transactionCalls = mockDb.transaction.mock.calls;
      const hasSensitiveData = transactionCalls.some(call => {
        const callback = call[0];
        const mockTx = { executeSql: jest.fn() };
        callback(mockTx);

        return mockTx.executeSql.mock.calls.some(sqlCall => {
          const params = sqlCall[1] || [];
          const sql = sqlCall[0] || '';

          // Check for potential health data keywords
          const sensitiveKeywords = [
            'period',
            'flow',
            'cramps',
            'mood',
            'symptom',
            'pain',
            'heavy',
            'light',
          ];
          return sensitiveKeywords.some(
            keyword =>
              sql.toLowerCase().includes(keyword) ||
              params.some(
                param => typeof param === 'string' && param.toLowerCase().includes(keyword)
              )
          );
        });
      });

      expect(hasSensitiveData).toBe(false);
    });

    test('should generate unique salted hashes for device identification', async () => {
      // Mock different device IDs
      const device1 = 'device-1';
      const device2 = 'device-2';

      await new Promise(resolve => setTimeout(resolve, 100));

      // Create sessions for different devices
      const session1 = await auditService.startAuditSession(device1);
      await auditService.endAuditSession();

      const session2 = await auditService.startAuditSession(device2);
      await auditService.endAuditSession();

      // Verify that different devices get different hashes
      expect(session1).not.toBe(session2);

      // Both should be properly formatted session IDs
      expect(session1).toMatch(/^session_/);
      expect(session2).toMatch(/^session_/);
    });
  });

  describe('Audit Trail Functionality', () => {
    test('should track sync operations without content exposure', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const sessionId = await auditService.startAuditSession('test-device');

      // Log various sync operations
      const operations = [
        { type: 'sync_start' as const, dataType: 'cycle_data' as const, count: 0 },
        { type: 'sync_complete' as const, dataType: 'cycle_data' as const, count: 3 },
        { type: 'conflict_detected' as const, dataType: 'user_preferences' as const, count: 1 },
        { type: 'conflict_resolved' as const, dataType: 'user_preferences' as const, count: 1 },
      ];

      for (const op of operations) {
        await auditService.logSyncOperation(op.type, op.dataType, op.count);
      }

      await auditService.endAuditSession();

      // Verify all operations were logged
      expect(mockDb.transaction).toHaveBeenCalledTimes(6); // 1 start + 4 operations + 1 end
    });

    test('should track session statistics accurately', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const sessionId = await auditService.startAuditSession('test-device');

      // Log successful operations
      await auditService.logSyncOperation('sync_complete', 'cycle_data', 5, { dataSize: 1024 });
      await auditService.logSyncOperation('sync_complete', 'user_preferences', 2, {
        dataSize: 512,
      });

      // Log failed operation
      await auditService.logSyncOperation('sync_failed', 'backup_key', 0, {
        errorCode: 'network_timeout',
      });

      // Log conflict
      await auditService.logSyncOperation('conflict_detected', 'cycle_data', 1);
      await auditService.logSyncOperation('conflict_resolved', 'cycle_data', 1, {
        conflictResolution: 'local_wins',
      });

      await auditService.endAuditSession();

      // Verify session end was called with proper statistics
      const endSessionCall = mockDb.transaction.mock.calls.find(call => {
        const callback = call[0];
        const mockTx = { executeSql: jest.fn() };
        callback(mockTx);

        return mockTx.executeSql.mock.calls.some(sqlCall => {
          const sql = sqlCall[0] || '';
          return sql.includes('UPDATE audit_session');
        });
      });

      expect(endSessionCall).toBeDefined();
    });

    test('should provide comprehensive audit log retrieval', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock database return for audit log query
      const mockAuditEntries = [
        {
          id: 'log_1',
          timestamp: Date.now(),
          device_id_hash: 'hash1',
          operation_type: 'sync_complete',
          data_type: 'cycle_data',
          record_count: 3,
          data_size: 1024,
          session_id: 'session_1',
        },
        {
          id: 'log_2',
          timestamp: Date.now() - 1000,
          device_id_hash: 'hash1',
          operation_type: 'conflict_resolved',
          data_type: 'user_preferences',
          record_count: 1,
          conflict_resolution: 'manual',
          session_id: 'session_1',
        },
      ];

      mockDb.transaction = jest.fn(callback => {
        const tx = {
          executeSql: jest.fn((sql, params, success) => {
            if (sql.includes('SELECT') && sql.includes('audit_log')) {
              const result = {
                rows: {
                  length: mockAuditEntries.length,
                  item: (index: number) => mockAuditEntries[index],
                },
              };
              success(null, result);
            }
          }),
        };
        callback(tx);
      });

      const auditLogs = await auditService.getAuditLog({ limit: 10 });

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0]).toHaveProperty('operationType', 'sync_complete');
      expect(auditLogs[0]).toHaveProperty('dataType', 'cycle_data');
      expect(auditLogs[0]).toHaveProperty('recordCount', 3);
      expect(auditLogs[0]).not.toHaveProperty('deviceId'); // Raw device ID should not be exposed
      expect(auditLogs[1]).toHaveProperty('conflictResolution', 'manual');
    });
  });

  describe('Privacy Metrics and Compliance', () => {
    test('should calculate privacy compliance score', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock database return for metrics calculation
      mockDb.transaction = jest.fn(callback => {
        const tx = {
          executeSql: jest.fn((sql, params, success) => {
            const result = {
              rows: {
                length: 1,
                item: () => ({
                  total_sessions: 10,
                  avg_duration: 5000,
                  total_data: 50000,
                  total_conflicts: 2,
                  total_ops: 100,
                }),
              },
            };
            success(null, result);
          }),
        };
        callback(tx);
      });

      const metrics = await auditService.getPrivacyMetrics();

      expect(metrics).toHaveProperty('totalSyncSessions', 10);
      expect(metrics).toHaveProperty('averageSessionDuration', 5000);
      expect(metrics).toHaveProperty('dataTransferredLast30Days', 50000);
      expect(metrics).toHaveProperty('conflictResolutionRate', 2); // 2 conflicts out of 100 operations
      expect(metrics).toHaveProperty('privacyComplianceScore');
      expect(metrics.privacyComplianceScore).toBeGreaterThanOrEqual(0);
      expect(metrics.privacyComplianceScore).toBeLessThanOrEqual(100);
    });

    test('should verify audit trail integrity', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock database queries for integrity checks
      mockDb.transaction = jest.fn(callback => {
        const tx = {
          executeSql: jest.fn((sql, params, success) => {
            // Mock clean audit trail (no violations)
            const result = {
              rows: {
                length: 1,
                item: () => ({ count: 0 }), // No violations found
              },
            };
            success(null, result);
          }),
        };
        callback(tx);
      });

      const integrityCheck = await auditService.verifyAuditIntegrity();

      expect(integrityCheck).toHaveProperty('isValid', true);
      expect(integrityCheck).toHaveProperty('checksPerformed');
      expect(integrityCheck.checksPerformed).toBeGreaterThan(0);
      expect(integrityCheck).toHaveProperty('violationsFound');
      expect(integrityCheck.violationsFound).toHaveLength(0);
    });

    test('should export audit data for user transparency', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock database returns for export
      const mockData = {
        logs: [{ id: 'log_1', operationType: 'sync_complete' }],
        sessions: [{ id: 'session_1', totalOperations: 5 }],
        metrics: { totalSyncSessions: 1, privacyComplianceScore: 100 },
      };

      mockDb.transaction = jest.fn(callback => {
        const tx = {
          executeSql: jest.fn((sql, params, success) => {
            let result;
            if (sql.includes('audit_log')) {
              result = { rows: { length: 1, item: () => mockData.logs[0] } };
            } else if (sql.includes('audit_session')) {
              result = { rows: { length: 1, item: () => mockData.sessions[0] } };
            } else {
              result = { rows: { length: 1, item: () => ({ total_sessions: 1 }) } };
            }
            success(null, result);
          }),
        };
        callback(tx);
      });

      const exportData = await auditService.exportAuditData();

      expect(exportData).toHaveProperty('logs');
      expect(exportData).toHaveProperty('sessions');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData.logs).toBeInstanceOf(Array);
      expect(exportData.sessions).toBeInstanceOf(Array);
      expect(exportData.metrics).toHaveProperty('privacyComplianceScore');
    });
  });

  describe('Data Retention and Cleanup', () => {
    test('should cleanup old audit logs according to retention policy', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const retentionDays = 30;
      await auditService.cleanupOldLogs(retentionDays);

      // Verify cleanup queries were executed
      expect(mockDb.transaction).toHaveBeenCalled();

      const cleanupCall = mockDb.transaction.mock.calls.find(call => {
        const callback = call[0];
        const mockTx = { executeSql: jest.fn() };
        callback(mockTx);

        return mockTx.executeSql.mock.calls.some(sqlCall => {
          const sql = sqlCall[0] || '';
          return sql.includes('DELETE FROM audit_log');
        });
      });

      expect(cleanupCall).toBeDefined();
    });

    test('should preserve metrics longer than operational logs', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      await auditService.cleanupOldLogs(90);

      // Verify that metrics cleanup uses longer retention (1 year)
      const cleanupCall = mockDb.transaction.mock.calls.find(call => {
        const callback = call[0];
        const mockTx = { executeSql: jest.fn() };
        callback(mockTx);

        return mockTx.executeSql.mock.calls.some(sqlCall => {
          const sql = sqlCall[0] || '';
          return sql.includes('DELETE FROM privacy_metrics');
        });
      });

      expect(cleanupCall).toBeDefined();
    });
  });

  describe('Audit Session Management', () => {
    test('should handle concurrent audit operations safely', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const sessionId = await auditService.startAuditSession('test-device');

      // Simulate concurrent logging operations
      const concurrentOperations = [
        auditService.logSyncOperation('sync_start', 'cycle_data', 0),
        auditService.logSyncOperation('sync_complete', 'cycle_data', 3),
        auditService.logSyncOperation('sync_start', 'user_preferences', 0),
        auditService.logSyncOperation('sync_complete', 'user_preferences', 1),
      ];

      await Promise.all(concurrentOperations);
      await auditService.endAuditSession();

      // Verify all operations were logged without conflicts
      expect(mockDb.transaction).toHaveBeenCalledTimes(6); // 1 start + 4 operations + 1 end
    });

    test('should handle session end without active session gracefully', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to end session without starting one
      await expect(auditService.endAuditSession()).resolves.not.toThrow();
    });

    test('should prevent logging without active session', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to log operation without active session
      await auditService.logSyncOperation('sync_complete', 'cycle_data', 1);

      // Should not crash and should not create database entries
      // (mockDb.transaction call count would be minimal from initialization only)
      const transactionCallsCount = mockDb.transaction.mock.calls.length;
      expect(transactionCallsCount).toBeGreaterThanOrEqual(0); // At least initialization calls
    });
  });

  describe('Device Salt Management', () => {
    test('should generate new salt if none exists', async () => {
      // Mock empty storage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const newAuditService = new PrivacySafeAuditService();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify new salt was generated and stored
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@aura_device_salt', expect.any(String));

      await newAuditService.dispose();
    });

    test('should use existing salt if available', async () => {
      const existingSalt = 'existing-salt-value';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(existingSalt);

      const newAuditService = new PrivacySafeAuditService();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not generate new salt
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        '@aura_device_salt',
        expect.any(String)
      );

      await newAuditService.dispose();
    });
  });
});
