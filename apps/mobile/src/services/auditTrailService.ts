import {
  ModificationRecord,
  AuditTrailEntry,
  AuditLogQueryOptions,
  AuditSummary,
} from '@aura/shared-types/data';
import { encryptedDataService } from './encryptedDataService';
import { generateId } from '../utils/idGenerator';
import crypto from 'crypto';

export class AuditTrailService {
  private currentSessionId: string = generateId();

  /**
   * Record a modification in the audit trail
   */
  async recordModification(
    userId: string,
    entityType: ModificationRecord['entityType'],
    entityId: string,
    field: string,
    oldValue: any,
    newValue: any,
    action: ModificationRecord['action'],
    reason?: string
  ): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();

      const modification: ModificationRecord = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        entityType,
        entityId,
        field,
        oldValue: this.sanitizeValue(oldValue),
        newValue: this.sanitizeValue(newValue),
        deviceId,
        userId,
        action,
        reason,
      };

      await this.storeAuditEntry(userId, [modification]);
    } catch (error) {
      console.error('Failed to record modification:', error);
      // In production, this should send to monitoring system
      // but never throw to avoid breaking user operations
    }
  }

  /**
   * Record multiple modifications in a single audit entry
   */
  async recordBatchModifications(
    userId: string,
    modifications: Omit<ModificationRecord, 'id' | 'timestamp' | 'deviceId' | 'userId'>[]
  ): Promise<void> {
    try {
      const deviceId = await this.getDeviceId();
      const timestamp = new Date().toISOString();

      const completeModifications: ModificationRecord[] = modifications.map(mod => ({
        ...mod,
        id: generateId(),
        timestamp,
        deviceId,
        userId,
        oldValue: this.sanitizeValue(mod.oldValue),
        newValue: this.sanitizeValue(mod.newValue),
      }));

      await this.storeAuditEntry(userId, completeModifications);
    } catch (error) {
      console.error('Failed to record batch modifications:', error);
    }
  }

  /**
   * Store encrypted audit entry in local database
   */
  private async storeAuditEntry(
    userId: string,
    modifications: ModificationRecord[]
  ): Promise<void> {
    const auditEntry: AuditTrailEntry = {
      id: generateId(),
      userId,
      timestamp: new Date().toISOString(),
      modifications,
      sessionId: this.currentSessionId,
      encryptedEntry: '', // Will be populated by encryption
      checksum: '',
      createdAt: new Date().toISOString(),
    };

    // Calculate checksum before encryption
    const dataForChecksum = JSON.stringify({
      userId,
      timestamp: auditEntry.timestamp,
      modifications,
      sessionId: this.currentSessionId,
    });
    auditEntry.checksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex');

    // Encrypt the audit entry
    const encryptedData = await encryptedDataService.encryptData(
      JSON.stringify(auditEntry),
      `audit_${userId}`,
      userId
    );

    auditEntry.encryptedEntry = encryptedData;

    // Store in SQLite with audit_trail table
    await this.storeEncryptedAuditEntry(auditEntry);
  }

  /**
   * Query audit log with filtering options
   */
  async queryAuditLog(options: AuditLogQueryOptions): Promise<ModificationRecord[]> {
    try {
      const auditEntries = await this.getAuditEntries(options);
      const modifications: ModificationRecord[] = [];

      for (const entry of auditEntries) {
        const decryptedData = await encryptedDataService.decryptData(
          entry.encryptedEntry,
          `audit_${options.userId}`,
          options.userId
        );

        const auditEntry: AuditTrailEntry = JSON.parse(decryptedData);

        // Verify data integrity
        if (await this.verifyAuditEntryIntegrity(auditEntry)) {
          modifications.push(...auditEntry.modifications);
        }
      }

      return this.filterModifications(modifications, options);
    } catch (error) {
      console.error('Failed to query audit log:', error);
      return [];
    }
  }

  /**
   * Get audit summary for dashboard
   */
  async getAuditSummary(userId: string, days: number = 30): Promise<AuditSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const options: AuditLogQueryOptions = {
      userId,
      startDate: startDate.toISOString(),
      limit: 1000,
    };

    const modifications = await this.queryAuditLog(options);

    const modificationsByType: Record<string, number> = {};
    const modificationsByDate: Record<string, number> = {};

    for (const mod of modifications) {
      // Count by entity type
      const typeKey = `${mod.entityType}_${mod.action}`;
      modificationsByType[typeKey] = (modificationsByType[typeKey] || 0) + 1;

      // Count by date
      const dateKey = mod.timestamp.split('T')[0];
      modificationsByDate[dateKey] = (modificationsByDate[dateKey] || 0) + 1;
    }

    return {
      totalModifications: modifications.length,
      recentModifications: modifications.slice(0, 10),
      modificationsByType,
      modificationsByDate,
      dataIntegrityStatus: 'valid', // Would check for integrity issues
    };
  }

  /**
   * Restore a previous version of data
   */
  async restoreFromAudit(
    userId: string,
    entityType: string,
    entityId: string,
    targetTimestamp: string
  ): Promise<any> {
    const modifications = await this.queryAuditLog({
      userId,
      entityType: entityType as any,
      entityId,
    });

    // Find the state at the target timestamp
    const relevantMods = modifications
      .filter(mod => mod.timestamp <= targetTimestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Build the entity state at the target time
    let restoredState: any = {};

    for (const mod of relevantMods) {
      if (mod.action === 'delete') {
        restoredState = null;
        break;
      }
      restoredState[mod.field] = mod.newValue;
    }

    // Record the restoration
    await this.recordModification(
      userId,
      entityType as any,
      entityId,
      'restored_from_audit',
      null,
      { timestamp: targetTimestamp, restoredState },
      'restore',
      `Restored to state from ${targetTimestamp}`
    );

    return restoredState;
  }

  /**
   * Private helper methods
   */
  private async getDeviceId(): Promise<string> {
    // Implementation would get device ID from secure storage
    return 'device_' + generateId().substring(0, 8);
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) return value;

    // Remove sensitive data patterns
    if (typeof value === 'string') {
      // Don't store full email addresses, just domain
      if (value.includes('@')) {
        const parts = value.split('@');
        return `***@${parts[1]}`;
      }
    }

    return value;
  }

  private async storeEncryptedAuditEntry(entry: AuditTrailEntry): Promise<void> {
    // Implementation would use SQLite to store audit entries
    // For now, this is a placeholder that would integrate with the database layer
    console.log('Storing audit entry:', entry.id);
  }

  private async getAuditEntries(options: AuditLogQueryOptions): Promise<AuditTrailEntry[]> {
    // Implementation would query SQLite audit_trail table
    // This is a placeholder that would return encrypted audit entries
    return [];
  }

  private async verifyAuditEntryIntegrity(entry: AuditTrailEntry): Promise<boolean> {
    const dataForChecksum = JSON.stringify({
      userId: entry.userId,
      timestamp: entry.timestamp,
      modifications: entry.modifications,
      sessionId: entry.sessionId,
    });

    const calculatedChecksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex');

    return calculatedChecksum === entry.checksum;
  }

  private filterModifications(
    modifications: ModificationRecord[],
    options: AuditLogQueryOptions
  ): ModificationRecord[] {
    let filtered = modifications;

    if (options.entityType) {
      filtered = filtered.filter(mod => mod.entityType === options.entityType);
    }

    if (options.entityId) {
      filtered = filtered.filter(mod => mod.entityId === options.entityId);
    }

    if (options.action) {
      filtered = filtered.filter(mod => mod.action === options.action);
    }

    if (options.startDate) {
      filtered = filtered.filter(mod => mod.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter(mod => mod.timestamp <= options.endDate!);
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Start a new session (called on app start/resume)
   */
  startNewSession(): void {
    this.currentSessionId = generateId();
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.currentSessionId;
  }
}

export const auditTrailService = new AuditTrailService();
