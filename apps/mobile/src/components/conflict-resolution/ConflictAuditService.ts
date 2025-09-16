import {
  ConflictAuditEntry,
  ConflictAuditAction,
  ConflictHistory,
  DataConflict,
  ConflictResolution,
  ConflictType,
  ResolutionStrategy,
} from './types';

export interface ConflictAuditConfig {
  retentionDays: number;
  maxEntriesPerConflict: number;
  enableDetailedLogging: boolean;
  privacyMode: boolean; // Ensures no health data content is logged
}

export class ConflictAuditService {
  private config: ConflictAuditConfig;
  private auditEntries: Map<string, ConflictHistory> = new Map();
  private deviceId: string;

  constructor(config: ConflictAuditConfig, deviceId: string) {
    this.config = config;
    this.deviceId = deviceId;
    this.loadAuditHistory();
  }

  async logConflictDetected(conflict: DataConflict): Promise<void> {
    const entry: ConflictAuditEntry = {
      id: this.generateEntryId(),
      conflictId: conflict.id,
      timestamp: Date.now(),
      action: 'conflict-detected',
      deviceId: this.deviceId,
      metadata: {
        conflictType: conflict.type,
        resolutionStrategy: 'pending' as ResolutionStrategy,
        fieldsAffected: conflict.conflictFields,
        userInteractionRequired: !conflict.autoResolvable,
      },
    };

    await this.addAuditEntry(conflict.id, entry);

    if (this.config.enableDetailedLogging) {
      console.log(`[ConflictAudit] Conflict detected: ${conflict.id}`, {
        type: conflict.type,
        severity: conflict.severity,
        fields: conflict.conflictFields,
      });
    }
  }

  async logAutoResolution(conflictId: string, resolution: ConflictResolution): Promise<void> {
    const entry: ConflictAuditEntry = {
      id: this.generateEntryId(),
      conflictId,
      timestamp: Date.now(),
      action: 'auto-resolved',
      deviceId: this.deviceId,
      metadata: {
        conflictType: this.inferConflictTypeFromResolution(resolution),
        resolutionStrategy: resolution.strategy,
        fieldsAffected: resolution.appliedChanges.map(change => change.field),
        userInteractionRequired: false,
      },
    };

    await this.addAuditEntry(conflictId, entry);
    await this.markConflictResolved(conflictId, resolution);

    if (this.config.enableDetailedLogging) {
      console.log(`[ConflictAudit] Auto-resolved conflict: ${conflictId}`, {
        strategy: resolution.strategy,
        fields: resolution.appliedChanges.length,
      });
    }
  }

  async logUserResolution(conflictId: string, resolution: ConflictResolution): Promise<void> {
    const entry: ConflictAuditEntry = {
      id: this.generateEntryId(),
      conflictId,
      timestamp: Date.now(),
      action: 'user-resolved',
      deviceId: this.deviceId,
      metadata: {
        conflictType: this.inferConflictTypeFromResolution(resolution),
        resolutionStrategy: resolution.strategy,
        fieldsAffected: resolution.appliedChanges.map(change => change.field),
        userInteractionRequired: true,
      },
    };

    await this.addAuditEntry(conflictId, entry);
    await this.markConflictResolved(conflictId, resolution);

    if (this.config.enableDetailedLogging) {
      console.log(`[ConflictAudit] User resolved conflict: ${conflictId}`, {
        strategy: resolution.strategy,
        fields: resolution.appliedChanges.length,
      });
    }
  }

  async logResolutionApplied(conflictId: string, resolution: ConflictResolution): Promise<void> {
    const entry: ConflictAuditEntry = {
      id: this.generateEntryId(),
      conflictId,
      timestamp: Date.now(),
      action: 'resolution-applied',
      deviceId: this.deviceId,
      metadata: {
        conflictType: this.inferConflictTypeFromResolution(resolution),
        resolutionStrategy: resolution.strategy,
        fieldsAffected: resolution.appliedChanges.map(change => change.field),
        userInteractionRequired: resolution.metadata.resolvedBy === 'user',
      },
    };

    await this.addAuditEntry(conflictId, entry);

    if (this.config.enableDetailedLogging) {
      console.log(`[ConflictAudit] Resolution applied: ${conflictId}`, {
        resolvedBy: resolution.metadata.resolvedBy,
        version: resolution.metadata.resolutionVersion,
      });
    }
  }

  async logConflictEscalated(conflictId: string, reason: string): Promise<void> {
    const entry: ConflictAuditEntry = {
      id: this.generateEntryId(),
      conflictId,
      timestamp: Date.now(),
      action: 'conflict-escalated',
      deviceId: this.deviceId,
      metadata: {
        conflictType: 'version-mismatch' as ConflictType, // Default for escalated conflicts
        resolutionStrategy: 'manual-edit' as ResolutionStrategy,
        fieldsAffected: [],
        userInteractionRequired: true,
      },
    };

    await this.addAuditEntry(conflictId, entry);
    await this.markConflictEscalated(conflictId, reason);

    if (this.config.enableDetailedLogging) {
      console.log(`[ConflictAudit] Conflict escalated: ${conflictId}`, { reason });
    }
  }

  async getConflictHistory(conflictId: string): Promise<ConflictHistory | null> {
    return this.auditEntries.get(conflictId) || null;
  }

  async getAllConflictHistories(): Promise<ConflictHistory[]> {
    return Array.from(this.auditEntries.values());
  }

  async getConflictStatistics(): Promise<{
    totalConflicts: number;
    autoResolved: number;
    userResolved: number;
    escalated: number;
    byType: Record<ConflictType, number>;
    byStrategy: Record<ResolutionStrategy, number>;
    averageResolutionTime: number;
  }> {
    const histories = Array.from(this.auditEntries.values());

    const stats = {
      totalConflicts: histories.length,
      autoResolved: 0,
      userResolved: 0,
      escalated: 0,
      byType: {} as Record<ConflictType, number>,
      byStrategy: {} as Record<ResolutionStrategy, number>,
      averageResolutionTime: 0,
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const history of histories) {
      // Count by status
      if (history.status === 'resolved' && history.finalResolution) {
        if (history.finalResolution.metadata.resolvedBy === 'system') {
          stats.autoResolved++;
        } else {
          stats.userResolved++;
        }
        resolvedCount++;

        // Calculate resolution time
        const detectedEntry = history.entries.find(e => e.action === 'conflict-detected');
        const resolvedEntry = history.entries.find(
          e => e.action === 'auto-resolved' || e.action === 'user-resolved'
        );

        if (detectedEntry && resolvedEntry) {
          totalResolutionTime += resolvedEntry.timestamp - detectedEntry.timestamp;
        }

        // Count by strategy
        const strategy = history.finalResolution.strategy;
        stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1;
      } else if (history.status === 'escalated') {
        stats.escalated++;
      }

      // Count by type
      const conflictType = this.getConflictTypeFromHistory(history);
      if (conflictType) {
        stats.byType[conflictType] = (stats.byType[conflictType] || 0) + 1;
      }
    }

    stats.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

    return stats;
  }

  async cleanupOldEntries(): Promise<void> {
    const cutoffTime = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    const entriesToRemove: string[] = [];

    for (const [conflictId, history] of this.auditEntries) {
      // Remove entries older than retention period
      const oldestEntry = Math.min(...history.entries.map(e => e.timestamp));

      if (oldestEntry < cutoffTime) {
        entriesToRemove.push(conflictId);
      }
    }

    for (const conflictId of entriesToRemove) {
      this.auditEntries.delete(conflictId);
    }

    await this.persistAuditHistory();

    if (this.config.enableDetailedLogging && entriesToRemove.length > 0) {
      console.log(`[ConflictAudit] Cleaned up ${entriesToRemove.length} old conflict histories`);
    }
  }

  async exportAuditTrail(): Promise<{
    exportedAt: number;
    deviceId: string;
    totalConflicts: number;
    conflicts: ConflictAuditExport[];
  }> {
    const conflicts: ConflictAuditExport[] = [];

    for (const history of this.auditEntries.values()) {
      conflicts.push({
        conflictId: history.conflictId,
        status: history.status,
        timeline: history.entries.map(entry => ({
          timestamp: entry.timestamp,
          action: entry.action,
          deviceId: entry.deviceId,
          conflictType: entry.metadata.conflictType,
          resolutionStrategy: entry.metadata.resolutionStrategy,
          fieldsCount: entry.metadata.fieldsAffected.length,
          userInteractionRequired: entry.metadata.userInteractionRequired,
        })),
        finalResolution: history.finalResolution
          ? {
              strategy: history.finalResolution.strategy,
              resolvedBy: history.finalResolution.metadata.resolvedBy,
              resolutionTime: history.finalResolution.metadata.resolvedAt,
              fieldsChanged: history.finalResolution.appliedChanges.length,
            }
          : undefined,
      });
    }

    return {
      exportedAt: Date.now(),
      deviceId: this.deviceId,
      totalConflicts: conflicts.length,
      conflicts,
    };
  }

  private async addAuditEntry(conflictId: string, entry: ConflictAuditEntry): Promise<void> {
    let history = this.auditEntries.get(conflictId);

    if (!history) {
      history = {
        conflictId,
        entries: [],
        status: 'pending',
      };
      this.auditEntries.set(conflictId, history);
    }

    history.entries.push(entry);

    // Limit entries per conflict
    if (history.entries.length > this.config.maxEntriesPerConflict) {
      history.entries = history.entries.slice(-this.config.maxEntriesPerConflict);
    }

    await this.persistAuditHistory();
  }

  private async markConflictResolved(
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> {
    const history = this.auditEntries.get(conflictId);
    if (history) {
      history.status = 'resolved';
      history.finalResolution = resolution;
      await this.persistAuditHistory();
    }
  }

  private async markConflictEscalated(conflictId: string, reason: string): Promise<void> {
    const history = this.auditEntries.get(conflictId);
    if (history) {
      history.status = 'escalated';
      // Store escalation reason in a privacy-safe way
      await this.persistAuditHistory();
    }
  }

  private inferConflictTypeFromResolution(resolution: ConflictResolution): ConflictType {
    // Infer conflict type from the fields that were changed
    const fields = resolution.appliedChanges.map(change => change.field);

    if (fields.some(f => ['flowIntensity', 'symptoms', 'medications'].includes(f))) {
      return 'cycle-data-edit';
    } else if (fields.some(f => ['theme', 'language', 'notifications'].includes(f))) {
      return 'user-preferences-edit';
    } else {
      return 'version-mismatch';
    }
  }

  private getConflictTypeFromHistory(history: ConflictHistory): ConflictType | null {
    const detectedEntry = history.entries.find(e => e.action === 'conflict-detected');
    return detectedEntry?.metadata.conflictType || null;
  }

  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadAuditHistory(): Promise<void> {
    try {
      // Load from secure storage (implementation depends on platform)
      const stored = await this.getStoredAuditHistory();
      if (stored) {
        this.auditEntries = new Map(Object.entries(stored));
      }
    } catch (error) {
      console.warn('[ConflictAudit] Failed to load audit history:', error);
    }
  }

  private async persistAuditHistory(): Promise<void> {
    try {
      // Persist to secure storage (implementation depends on platform)
      const data = Object.fromEntries(this.auditEntries);
      await this.storeAuditHistory(data);
    } catch (error) {
      console.error('[ConflictAudit] Failed to persist audit history:', error);
    }
  }

  private async getStoredAuditHistory(): Promise<Record<string, ConflictHistory> | null> {
    // Platform-specific secure storage implementation
    // This would use Expo SecureStore, iOS Keychain, or Android Keystore
    return null; // Placeholder
  }

  private async storeAuditHistory(data: Record<string, ConflictHistory>): Promise<void> {
    // Platform-specific secure storage implementation
    // This would use Expo SecureStore, iOS Keychain, or Android Keystore
  }
}

// Types for audit trail export
interface ConflictAuditExport {
  conflictId: string;
  status: 'pending' | 'resolved' | 'escalated';
  timeline: {
    timestamp: number;
    action: ConflictAuditAction;
    deviceId: string;
    conflictType: ConflictType;
    resolutionStrategy: ResolutionStrategy;
    fieldsCount: number;
    userInteractionRequired: boolean;
  }[];
  finalResolution?: {
    strategy: ResolutionStrategy;
    resolvedBy: 'system' | 'user';
    resolutionTime: number;
    fieldsChanged: number;
  };
}

// Default configuration for conflict audit
export const createDefaultAuditConfig = (): ConflictAuditConfig => ({
  retentionDays: 90, // Keep audit trails for 3 months
  maxEntriesPerConflict: 20, // Limit entries per conflict
  enableDetailedLogging: false, // Disable in production
  privacyMode: true, // Always maintain privacy
});

// Audit trail viewer component interface
export interface AuditTrailViewerProps {
  auditService: ConflictAuditService;
  onExport: (trail: any) => Promise<void>;
  onCleanup: () => Promise<void>;
}
