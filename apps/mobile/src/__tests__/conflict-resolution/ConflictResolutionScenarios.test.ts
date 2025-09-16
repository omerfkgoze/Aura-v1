import { ConflictDetectionService } from '../../components/conflict-resolution/ConflictDetectionService';
import {
  AutoConflictResolver,
  createDefaultAutoResolutionConfig,
} from '../../components/conflict-resolution/AutoConflictResolver';
import {
  ConflictAuditService,
  createDefaultAuditConfig,
} from '../../components/conflict-resolution/ConflictAuditService';
import {
  DataConflict,
  ConflictDetectionResult,
  ConflictDetectionConfig,
  ConflictDetectionContext,
  ConflictableData,
} from '../../components/conflict-resolution/types';
import { EncryptedCycleData, EncryptedUserPrefs } from '@aura/shared-types';

describe('Complex Multi-Device Conflict Resolution Scenarios', () => {
  let conflictDetectionService: ConflictDetectionService;
  let autoResolver: AutoConflictResolver;
  let auditService: ConflictAuditService;
  let config: ConflictDetectionConfig;

  beforeEach(() => {
    config = createDefaultAutoResolutionConfig();
    conflictDetectionService = new ConflictDetectionService(config);
    autoResolver = new AutoConflictResolver(config);
    auditService = new ConflictAuditService(createDefaultAuditConfig(), 'test-device');
  });

  describe('Scenario 1: Simultaneous Cycle Data Edits', () => {
    it('should detect conflicts when both devices edit flow intensity', async () => {
      const baseData: EncryptedCycleData = {
        id: 'cycle-001',
        userId: 'user-123',
        date: '2024-01-15',
        flowIntensity: 3,
        symptoms: ['cramps'],
        mood: 'normal',
        notes: 'Initial entry',
        version: 1,
        deviceId: 'device-A',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        syncStatus: 'synced',
      };

      const localEdit: EncryptedCycleData = {
        ...baseData,
        flowIntensity: 4,
        notes: 'Updated from device A',
        version: 2,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const remoteEdit: EncryptedCycleData = {
        ...baseData,
        flowIntensity: 2,
        symptoms: ['cramps', 'headache'],
        notes: 'Updated from device B',
        version: 2,
        deviceId: 'device-B',
        updatedAt: Date.now() - 500,
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 2,
          timestamp: localEdit.updatedAt,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 2,
          timestamp: remoteEdit.updatedAt,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 7200000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(
        [localEdit],
        [remoteEdit],
        context
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);

      const conflict = result.conflicts[0];
      expect(conflict.type).toBe('cycle-data-edit');
      expect(conflict.severity).toBe('high'); // Flow intensity is critical
      expect(conflict.conflictFields).toContain('flowIntensity');
      expect(conflict.conflictFields).toContain('symptoms');
      expect(conflict.conflictFields).toContain('notes');
      expect(conflict.autoResolvable).toBe(false); // High severity conflicts not auto-resolvable

      // Log the conflict for audit
      await auditService.logConflictDetected(conflict);

      const history = await auditService.getConflictHistory(conflict.id);
      expect(history).toBeTruthy();
      expect(history?.entries).toHaveLength(1);
      expect(history?.entries[0].action).toBe('conflict-detected');
    });

    it('should auto-resolve when edits are in different non-critical fields', async () => {
      const baseData: EncryptedCycleData = {
        id: 'cycle-002',
        userId: 'user-123',
        date: '2024-01-16',
        flowIntensity: 3,
        symptoms: ['cramps'],
        mood: 'normal',
        notes: 'Base notes',
        activities: ['exercise'],
        version: 1,
        deviceId: 'device-A',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        syncStatus: 'synced',
      };

      const localEdit: EncryptedCycleData = {
        ...baseData,
        mood: 'good',
        notes: 'Base notes\nAdded from device A',
        version: 2,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const remoteEdit: EncryptedCycleData = {
        ...baseData,
        activities: ['exercise', 'yoga'],
        version: 2,
        deviceId: 'device-B',
        updatedAt: Date.now() - 500,
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 2,
          timestamp: localEdit.updatedAt,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 2,
          timestamp: remoteEdit.updatedAt,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 7200000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(
        [localEdit],
        [remoteEdit],
        context
      );

      expect(result.hasConflicts).toBe(true);
      const conflict = result.conflicts[0];
      expect(conflict.severity).toBe('medium'); // Non-critical fields
      expect(conflict.autoResolvable).toBe(true);

      // Auto-resolve the conflict
      const { autoResolved } = await autoResolver.resolveNonCompetingConflicts([conflict]);

      expect(autoResolved).toHaveLength(1);
      const resolution = autoResolved[0];
      expect(resolution.strategy).toBe('merge-automatic');

      // Verify merged data contains both changes
      const resolvedData = resolution.resolvedData as EncryptedCycleData;
      expect(resolvedData.mood).toBe('good'); // From local
      expect(resolvedData.activities).toEqual(['exercise', 'yoga']); // From remote
      expect(resolvedData.notes).toContain('Added from device A'); // Merged notes

      await auditService.logAutoResolution(conflict.id, resolution);
    });
  });

  describe('Scenario 2: Concurrent Creation Conflicts', () => {
    it('should detect and resolve duplicate entries created simultaneously', async () => {
      const localEntry: EncryptedCycleData = {
        id: 'cycle-local-001',
        userId: 'user-123',
        date: '2024-01-17',
        flowIntensity: 3,
        symptoms: ['cramps'],
        mood: 'normal',
        notes: 'Morning entry',
        version: 1,
        deviceId: 'device-A',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const remoteEntry: EncryptedCycleData = {
        id: 'cycle-remote-001',
        userId: 'user-123',
        date: '2024-01-17',
        flowIntensity: 3,
        symptoms: ['cramps'],
        mood: 'normal',
        notes: 'Morning entry',
        version: 1,
        deviceId: 'device-B',
        createdAt: Date.now() - 800, // Created within tolerance window
        updatedAt: Date.now() - 800,
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 1,
          timestamp: localEntry.createdAt,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 1,
          timestamp: remoteEntry.createdAt,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 7200000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(
        [localEntry],
        [remoteEntry],
        context
      );

      expect(result.hasConflicts).toBe(true);
      const conflict = result.conflicts[0];
      expect(conflict.type).toBe('concurrent-creation');
      expect(conflict.autoResolvable).toBe(true);

      const { autoResolved } = await autoResolver.resolveNonCompetingConflicts([conflict]);
      expect(autoResolved).toHaveLength(1);
      expect(autoResolved[0].strategy).toBe('take-local'); // Prefer local for concurrent creation
    });
  });

  describe('Scenario 3: Complex Multi-Field Conflicts', () => {
    it('should handle conflicts with mixed auto-resolvable and manual fields', async () => {
      const baseData: EncryptedCycleData = {
        id: 'cycle-003',
        userId: 'user-123',
        date: '2024-01-18',
        flowIntensity: 2,
        symptoms: ['bloating'],
        mood: 'normal',
        notes: 'Base entry',
        activities: ['work'],
        temperature: 98.6,
        medications: ['ibuprofen'],
        version: 1,
        deviceId: 'device-A',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        syncStatus: 'synced',
      };

      const localEdit: EncryptedCycleData = {
        ...baseData,
        flowIntensity: 4, // Critical field - requires user decision
        mood: 'tired', // Auto-resolvable
        notes: 'Base entry\nDevice A update',
        activities: ['work', 'exercise'],
        temperature: 99.1, // Critical field - requires user decision
        version: 2,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const remoteEdit: EncryptedCycleData = {
        ...baseData,
        symptoms: ['bloating', 'headache'], // Auto-resolvable
        mood: 'anxious', // Conflicts with local
        notes: 'Base entry\nDevice B update',
        medications: ['ibuprofen', 'acetaminophen'], // Critical field - requires user decision
        version: 2,
        deviceId: 'device-B',
        updatedAt: Date.now() - 500,
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 2,
          timestamp: localEdit.updatedAt,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 2,
          timestamp: remoteEdit.updatedAt,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 7200000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(
        [localEdit],
        [remoteEdit],
        context
      );

      expect(result.hasConflicts).toBe(true);
      const conflict = result.conflicts[0];
      expect(conflict.severity).toBe('high'); // Due to critical fields
      expect(conflict.autoResolvable).toBe(false); // Has critical fields

      // Verify specific fields in conflict
      expect(conflict.conflictFields).toContain('flowIntensity');
      expect(conflict.conflictFields).toContain('mood');
      expect(conflict.conflictFields).toContain('notes');
      expect(conflict.conflictFields).toContain('medications');
      expect(conflict.conflictFields).toContain('temperature');

      await auditService.logConflictDetected(conflict);
    });
  });

  describe('Scenario 4: User Preferences Synchronization', () => {
    it('should auto-resolve most recent preference changes', async () => {
      const localPrefs: EncryptedUserPrefs = {
        id: 'prefs-001',
        userId: 'user-123',
        theme: 'dark',
        language: 'en',
        notifications: {
          cycleReminders: true,
          pillReminders: false,
          insights: true,
        },
        dateFormat: 'MM/DD/YYYY',
        units: 'imperial',
        version: 2,
        deviceId: 'device-A',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const remotePrefs: EncryptedUserPrefs = {
        id: 'prefs-001',
        userId: 'user-123',
        theme: 'light', // Different from local
        language: 'es', // Different from local
        notifications: {
          cycleReminders: true,
          pillReminders: true, // Different from local
          insights: true,
        },
        dateFormat: 'DD/MM/YYYY', // Different from local
        units: 'imperial',
        version: 2,
        deviceId: 'device-B',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 2000, // Older than local
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 2,
          timestamp: localPrefs.updatedAt,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 2,
          timestamp: remotePrefs.updatedAt,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 172800000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(
        [localPrefs],
        [remotePrefs],
        context
      );

      expect(result.hasConflicts).toBe(true);
      const conflict = result.conflicts[0];
      expect(conflict.type).toBe('user-preferences-edit');
      expect(conflict.autoResolvable).toBe(true);

      const { autoResolved } = await autoResolver.resolveNonCompetingConflicts([conflict]);
      expect(autoResolved).toHaveLength(1);

      const resolution = autoResolved[0];
      expect(resolution.strategy).toBe('take-local'); // Local is more recent

      const resolvedData = resolution.resolvedData as EncryptedUserPrefs;
      expect(resolvedData.theme).toBe('dark'); // Local preference
      expect(resolvedData.language).toBe('en'); // Local preference
    });
  });

  describe('Scenario 5: Network Partition and Merge', () => {
    it('should handle complex scenarios after network partition', async () => {
      // Simulate data created during network partition
      const localData: EncryptedCycleData[] = [
        {
          id: 'cycle-local-1',
          userId: 'user-123',
          date: '2024-01-19',
          flowIntensity: 3,
          symptoms: ['cramps'],
          mood: 'normal',
          notes: 'Local entry 1',
          version: 1,
          deviceId: 'device-A',
          createdAt: Date.now() - 3600000,
          updatedAt: Date.now() - 3600000,
          syncStatus: 'pending',
        },
        {
          id: 'cycle-local-2',
          userId: 'user-123',
          date: '2024-01-20',
          flowIntensity: 2,
          symptoms: ['bloating'],
          mood: 'tired',
          notes: 'Local entry 2',
          version: 1,
          deviceId: 'device-A',
          createdAt: Date.now() - 1800000,
          updatedAt: Date.now() - 1800000,
          syncStatus: 'pending',
        },
      ];

      const remoteData: EncryptedCycleData[] = [
        {
          id: 'cycle-remote-1',
          userId: 'user-123',
          date: '2024-01-19',
          flowIntensity: 4,
          symptoms: ['cramps', 'headache'],
          mood: 'anxious',
          notes: 'Remote entry 1',
          version: 1,
          deviceId: 'device-B',
          createdAt: Date.now() - 3000000,
          updatedAt: Date.now() - 3000000,
          syncStatus: 'pending',
        },
        {
          id: 'cycle-remote-2',
          userId: 'user-123',
          date: '2024-01-21',
          flowIntensity: 1,
          symptoms: ['light'],
          mood: 'good',
          notes: 'Remote entry 2',
          version: 1,
          deviceId: 'device-B',
          createdAt: Date.now() - 900000,
          updatedAt: Date.now() - 900000,
          syncStatus: 'pending',
        },
      ];

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 1,
          timestamp: Date.now() - 1800000,
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 1,
          timestamp: Date.now() - 900000,
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 7200000, // 2 hours ago - network partition
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      const result = await conflictDetectionService.detectConflicts(localData, remoteData, context);

      // Expect potential conflicts for same-date entries
      expect(result.hasConflicts).toBe(true);

      // Process conflicts
      const { autoResolved, requiresUserInput } = await autoResolver.resolveNonCompetingConflicts(
        result.conflicts
      );

      // Log all conflicts for audit
      for (const conflict of result.conflicts) {
        await auditService.logConflictDetected(conflict);
      }

      for (const resolution of autoResolved) {
        await auditService.logAutoResolution(
          result.conflicts.find(c => c.localData.id === resolution.resolvedData.id)?.id || '',
          resolution
        );
      }

      // Verify statistics
      const stats = await auditService.getConflictStatistics();
      expect(stats.totalConflicts).toBeGreaterThan(0);
      expect(stats.autoResolved + stats.userResolved + stats.escalated).toBeLessThanOrEqual(
        stats.totalConflicts
      );
    });
  });

  describe('Scenario 6: Stress Testing with Multiple Conflicts', () => {
    it('should handle high volume of conflicts efficiently', async () => {
      const conflicts: DataConflict[] = [];

      // Generate 50 conflicts
      for (let i = 0; i < 50; i++) {
        const baseId = `stress-test-${i}`;

        const localData: EncryptedCycleData = {
          id: baseId,
          userId: 'user-123',
          date: `2024-01-${String((i % 30) + 1).padStart(2, '0')}`,
          flowIntensity: (i % 5) + 1,
          symptoms: i % 2 === 0 ? ['cramps'] : ['bloating'],
          mood: 'normal',
          notes: `Local entry ${i}`,
          version: 2,
          deviceId: 'device-A',
          createdAt: Date.now() - i * 60000,
          updatedAt: Date.now() - i * 60000,
          syncStatus: 'pending',
        };

        const remoteData: EncryptedCycleData = {
          ...localData,
          flowIntensity: ((i + 1) % 5) + 1,
          symptoms: i % 3 === 0 ? ['headache'] : ['nausea'],
          notes: `Remote entry ${i}`,
          deviceId: 'device-B',
          updatedAt: Date.now() - i * 60000 + 1000,
        };

        conflicts.push({
          id: `conflict-${i}`,
          type: 'cycle-data-edit',
          localData,
          remoteData,
          conflictFields: ['flowIntensity', 'symptoms', 'notes'],
          severity: i % 4 === 0 ? 'high' : 'medium',
          timestamp: Date.now(),
          autoResolvable: i % 4 !== 0, // 75% auto-resolvable
        });
      }

      const startTime = Date.now();
      const { autoResolved, requiresUserInput } =
        await autoResolver.resolveNonCompetingConflicts(conflicts);
      const processTime = Date.now() - startTime;

      expect(processTime).toBeLessThan(5000); // Should process in under 5 seconds
      expect(autoResolved.length + requiresUserInput.length).toBe(conflicts.length);
      expect(autoResolved.length).toBeGreaterThan(30); // Most should be auto-resolved

      // Verify audit trail can handle volume
      for (let i = 0; i < Math.min(10, conflicts.length); i++) {
        await auditService.logConflictDetected(conflicts[i]);
      }

      const stats = await auditService.getConflictStatistics();
      expect(stats.totalConflicts).toBe(Math.min(10, conflicts.length));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed data gracefully', async () => {
      const malformedLocal = {
        id: 'malformed-1',
        // Missing required fields
        version: 1,
        deviceId: 'device-A',
      } as any;

      const normalRemote: EncryptedCycleData = {
        id: 'malformed-1',
        userId: 'user-123',
        date: '2024-01-22',
        flowIntensity: 3,
        symptoms: ['cramps'],
        mood: 'normal',
        version: 2,
        deviceId: 'device-B',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        syncStatus: 'pending',
      };

      const context: ConflictDetectionContext = {
        localVersion: {
          deviceId: 'device-A',
          version: 1,
          timestamp: Date.now(),
          checksum: 'abc123',
        },
        remoteVersion: {
          deviceId: 'device-B',
          version: 2,
          timestamp: Date.now(),
          checksum: 'def456',
        },
        lastSyncTimestamp: Date.now() - 3600000,
        deviceTrustLevel: 0.9,
        networkLatency: 100,
      };

      // Should not throw errors
      expect(async () => {
        await conflictDetectionService.detectConflicts([malformedLocal], [normalRemote], context);
      }).not.toThrow();
    });

    it('should handle empty conflict lists', async () => {
      const result = await autoResolver.resolveNonCompetingConflicts([]);
      expect(result.autoResolved).toHaveLength(0);
      expect(result.requiresUserInput).toHaveLength(0);
    });

    it('should cleanup old audit entries', async () => {
      // Create old audit entries
      const oldConflict: DataConflict = {
        id: 'old-conflict',
        type: 'cycle-data-edit',
        localData: {} as any,
        remoteData: {} as any,
        conflictFields: ['test'],
        severity: 'low',
        timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days ago
        autoResolvable: true,
      };

      await auditService.logConflictDetected(oldConflict);
      await auditService.cleanupOldEntries();

      const history = await auditService.getConflictHistory(oldConflict.id);
      expect(history).toBeNull(); // Should be cleaned up
    });
  });
});
