import {
  ConflictDetectionResult,
  DataConflict,
  ConflictableData,
  ConflictDetectionConfig,
  ConflictType,
  ConflictSeverity,
  VersionVector,
  ConflictDetectionContext,
  ResolutionStrategy,
} from './types';
import { EncryptedCycleData, EncryptedUserPrefs } from '@aura/shared-types';

export class ConflictDetectionService {
  private config: ConflictDetectionConfig;

  constructor(config: ConflictDetectionConfig) {
    this.config = config;
  }

  async detectConflicts(
    localData: ConflictableData[],
    remoteData: ConflictableData[],
    context: ConflictDetectionContext
  ): Promise<ConflictDetectionResult> {
    const conflicts: DataConflict[] = [];

    // Create maps for efficient lookup
    const localDataMap = new Map(localData.map(item => [item.id, item]));
    const remoteDataMap = new Map(remoteData.map(item => [item.id, item]));

    // Detect conflicts for existing data
    for (const [id, localItem] of localDataMap) {
      const remoteItem = remoteDataMap.get(id);

      if (remoteItem) {
        const conflict = await this.detectItemConflict(localItem, remoteItem, context);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Detect creation conflicts
    const localOnlyIds = new Set(
      localData.map(item => item.id).filter(id => !remoteDataMap.has(id))
    );
    const remoteOnlyIds = new Set(
      remoteData.map(item => item.id).filter(id => !localDataMap.has(id))
    );

    // Check for concurrent creation conflicts (same timestamp, different content)
    for (const localId of localOnlyIds) {
      for (const remoteId of remoteOnlyIds) {
        const localItem = localDataMap.get(localId)!;
        const remoteItem = remoteDataMap.get(remoteId)!;

        const conflict = await this.detectConcurrentCreation(localItem, remoteItem, context);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    const autoResolvable = conflicts.filter(c => c.autoResolvable);
    const requiresUserInput = conflicts.filter(c => !c.autoResolvable);

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      autoResolvable,
      requiresUserInput,
    };
  }

  private async detectItemConflict(
    localData: ConflictableData,
    remoteData: ConflictableData,
    context: ConflictDetectionContext
  ): Promise<DataConflict | null> {
    // Check version vectors first
    const versionConflict = this.checkVersionConflict(localData, remoteData, context);
    if (!versionConflict) {
      return null; // No conflict detected
    }

    const conflictFields = this.identifyConflictingFields(localData, remoteData);
    if (conflictFields.length === 0) {
      return null; // No actual field conflicts
    }

    const conflictType = this.determineConflictType(localData, remoteData);
    const severity = this.calculateConflictSeverity(conflictFields, localData);
    const autoResolvable = this.isAutoResolvable(conflictType, conflictFields, severity);

    const conflict: DataConflict = {
      id: `conflict_${localData.id}_${Date.now()}`,
      type: conflictType,
      localData,
      remoteData,
      conflictFields,
      severity,
      timestamp: Date.now(),
      autoResolvable,
      suggestedResolution: autoResolvable
        ? this.suggestAutoResolution(localData, remoteData, conflictFields)
        : undefined,
    };

    return conflict;
  }

  private checkVersionConflict(
    localData: ConflictableData,
    remoteData: ConflictableData,
    context: ConflictDetectionContext
  ): boolean {
    // Version-based conflict detection using EncryptedCycleData versioning
    if (localData.version === remoteData.version) {
      return false; // Same version, no conflict
    }

    // Check if versions are in valid sequence
    const localVersion = localData.version || 1;
    const remoteVersion = remoteData.version || 1;

    // If one version is clearly newer and contains the other's changes, no conflict
    if (Math.abs(localVersion - remoteVersion) === 1) {
      const newerData = localVersion > remoteVersion ? localData : remoteData;
      const olderData = localVersion > remoteVersion ? remoteData : localData;

      // Check if newer version's timestamp is reasonable
      const timeDiff =
        (newerData.updatedAt || newerData.createdAt) - (olderData.updatedAt || olderData.createdAt);
      if (timeDiff > 0 && timeDiff < this.config.timestampToleranceMs) {
        return false; // Sequential update, no conflict
      }
    }

    // Check for concurrent edits based on deviceId and timestamp
    const localDeviceId = localData.deviceId;
    const remoteDeviceId = remoteData.deviceId;

    if (localDeviceId !== remoteDeviceId) {
      const localTime = localData.updatedAt || localData.createdAt;
      const remoteTime = remoteData.updatedAt || remoteData.createdAt;

      // Concurrent edits from different devices within tolerance window
      if (Math.abs(localTime - remoteTime) < this.config.timestampToleranceMs) {
        return true; // Conflict detected
      }
    }

    return localVersion !== remoteVersion;
  }

  private identifyConflictingFields(
    localData: ConflictableData,
    remoteData: ConflictableData
  ): string[] {
    const conflictFields: string[] = [];

    // Compare all fields except metadata
    const excludedFields = [
      'id',
      'version',
      'deviceId',
      'createdAt',
      'updatedAt',
      'syncedAt',
      'syncStatus',
    ];

    for (const key of Object.keys(localData)) {
      if (excludedFields.includes(key)) continue;

      const localValue = (localData as any)[key];
      const remoteValue = (remoteData as any)[key];

      if (!this.deepEqual(localValue, remoteValue)) {
        conflictFields.push(key);
      }
    }

    return conflictFields;
  }

  private determineConflictType(
    localData: ConflictableData,
    remoteData: ConflictableData
  ): ConflictType {
    // Determine conflict type based on data structure
    if (this.isEncryptedCycleData(localData)) {
      return 'cycle-data-edit';
    } else if (this.isEncryptedUserPrefs(localData)) {
      return 'user-preferences-edit';
    }

    return 'version-mismatch';
  }

  private calculateConflictSeverity(
    conflictFields: string[],
    data: ConflictableData
  ): ConflictSeverity {
    const highPriorityFields = ['flowIntensity', 'symptoms', 'medications', 'temperature'];
    const mediumPriorityFields = ['mood', 'notes', 'activities'];

    const hasHighPriority = conflictFields.some(field => highPriorityFields.includes(field));
    const hasMediumPriority = conflictFields.some(field => mediumPriorityFields.includes(field));

    if (hasHighPriority) {
      return 'high';
    } else if (hasMediumPriority) {
      return 'medium';
    } else if (conflictFields.length > 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private isAutoResolvable(
    conflictType: ConflictType,
    conflictFields: string[],
    severity: ConflictSeverity
  ): boolean {
    // Never auto-resolve high severity conflicts
    if (severity === 'high' || severity === 'critical') {
      return false;
    }

    // Check if all conflicting fields have auto-resolution strategies
    return conflictFields.every(field => {
      const priority = this.config.fieldPriorities[field];
      return priority && !priority.alwaysUserDecision;
    });
  }

  private suggestAutoResolution(
    localData: ConflictableData,
    remoteData: ConflictableData,
    conflictFields: string[]
  ): any {
    const strategies = this.config.autoResolutionStrategies;
    const conflictType = this.determineConflictType(localData, remoteData);

    const availableStrategies = strategies[conflictType] || ['take-local'];
    const strategy = availableStrategies[0]; // Use first available strategy

    return {
      strategy,
      reason: `Auto-resolution for ${conflictType} using ${strategy} strategy`,
      confidence: this.calculateResolutionConfidence(conflictFields, strategy),
    };
  }

  private calculateResolutionConfidence(
    conflictFields: string[],
    strategy: ResolutionStrategy
  ): number {
    // Calculate confidence based on field priorities and strategy
    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const field of conflictFields) {
      const priority = this.config.fieldPriorities[field];
      if (priority) {
        totalWeight += priority.weight;
        const fieldConfidence = priority.defaultResolution === strategy ? 0.9 : 0.6;
        weightedConfidence += priority.weight * fieldConfidence;
      }
    }

    return totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
  }

  private async detectConcurrentCreation(
    localData: ConflictableData,
    remoteData: ConflictableData,
    context: ConflictDetectionContext
  ): Promise<DataConflict | null> {
    // Check for concurrent creation conflicts
    const localTime = localData.createdAt;
    const remoteTime = remoteData.createdAt;

    // If created within tolerance window, might be concurrent creation
    if (Math.abs(localTime - remoteTime) < this.config.timestampToleranceMs) {
      const similarity = this.calculateDataSimilarity(localData, remoteData);

      // If data is very similar, likely duplicate creation
      if (similarity > 0.8) {
        return {
          id: `concurrent_${localData.id}_${remoteData.id}_${Date.now()}`,
          type: 'concurrent-creation',
          localData,
          remoteData,
          conflictFields: ['id', 'createdAt'],
          severity: 'medium',
          timestamp: Date.now(),
          autoResolvable: true,
          suggestedResolution: {
            strategy: 'take-local', // Prefer local data for concurrent creation
            reason: 'Local device preference for concurrent creation',
            confidence: similarity,
          },
        };
      }
    }

    return null;
  }

  private calculateDataSimilarity(data1: ConflictableData, data2: ConflictableData): number {
    const excludedFields = [
      'id',
      'version',
      'deviceId',
      'createdAt',
      'updatedAt',
      'syncedAt',
      'syncStatus',
    ];
    const fields1 = Object.keys(data1).filter(key => !excludedFields.includes(key));
    const fields2 = Object.keys(data2).filter(key => !excludedFields.includes(key));

    const allFields = new Set([...fields1, ...fields2]);
    let similarFields = 0;

    for (const field of allFields) {
      const value1 = (data1 as any)[field];
      const value2 = (data2 as any)[field];

      if (this.deepEqual(value1, value2)) {
        similarFields++;
      }
    }

    return allFields.size > 0 ? similarFields / allFields.size : 0;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  private isEncryptedCycleData(data: ConflictableData): data is EncryptedCycleData {
    return 'flowIntensity' in data || 'symptoms' in data;
  }

  private isEncryptedUserPrefs(data: ConflictableData): data is EncryptedUserPrefs {
    return 'theme' in data || 'language' in data || 'notifications' in data;
  }
}
