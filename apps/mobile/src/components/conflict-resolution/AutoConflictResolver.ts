import {
  DataConflict,
  ConflictResolution,
  ResolutionStrategy,
  ConflictDetectionConfig,
  FieldChange,
  ConflictableData,
  ConflictType,
} from './types';
import { EncryptedCycleData, EncryptedUserPrefs } from '@aura/shared-types';

export class AutoConflictResolver {
  private config: ConflictDetectionConfig;

  constructor(config: ConflictDetectionConfig) {
    this.config = config;
  }

  async resolveNonCompetingConflicts(conflicts: DataConflict[]): Promise<{
    autoResolved: ConflictResolution[];
    requiresUserInput: DataConflict[];
  }> {
    const autoResolved: ConflictResolution[] = [];
    const requiresUserInput: DataConflict[] = [];

    for (const conflict of conflicts) {
      if (conflict.autoResolvable && this.canAutoResolve(conflict)) {
        try {
          const resolution = await this.createAutoResolution(conflict);
          autoResolved.push(resolution);
        } catch (error) {
          console.warn(`Auto-resolution failed for conflict ${conflict.id}:`, error);
          requiresUserInput.push(conflict);
        }
      } else {
        requiresUserInput.push(conflict);
      }
    }

    return { autoResolved, requiresUserInput };
  }

  private canAutoResolve(conflict: DataConflict): boolean {
    // Never auto-resolve high severity conflicts
    if (conflict.severity === 'high' || conflict.severity === 'critical') {
      return false;
    }

    // Check if all conflicting fields can be auto-resolved
    return conflict.conflictFields.every(field => this.canFieldBeAutoResolved(field, conflict));
  }

  private canFieldBeAutoResolved(field: string, conflict: DataConflict): boolean {
    const priority = this.config.fieldPriorities[field];

    // Field must be configured for auto-resolution
    if (!priority || priority.alwaysUserDecision) {
      return false;
    }

    // Special rules for different conflict types
    switch (conflict.type) {
      case 'cycle-data-edit':
        return this.canCycleDataFieldBeAutoResolved(field, conflict);
      case 'user-preferences-edit':
        return this.canUserPrefsFieldBeAutoResolved(field, conflict);
      case 'concurrent-creation':
        return true; // Can usually auto-resolve duplicate creation
      default:
        return false;
    }
  }

  private canCycleDataFieldBeAutoResolved(field: string, conflict: DataConflict): boolean {
    const localData = conflict.localData as EncryptedCycleData;
    const remoteData = conflict.remoteData as EncryptedCycleData;

    // Critical health fields should never be auto-resolved
    const criticalFields = ['flowIntensity', 'medications', 'temperature', 'symptoms'];
    if (criticalFields.includes(field)) {
      return false;
    }

    // Non-competing changes that can be safely merged
    const safeAutoFields = ['notes', 'mood', 'activities', 'tags'];
    if (safeAutoFields.includes(field)) {
      return this.isNonCompetingChange(localData, remoteData, field);
    }

    return false;
  }

  private canUserPrefsFieldBeAutoResolved(field: string, conflict: DataConflict): boolean {
    // User preferences can often be auto-resolved using latest timestamp
    const autoResolvablePrefs = ['theme', 'language', 'dateFormat', 'units'];
    return autoResolvablePrefs.includes(field);
  }

  private isNonCompetingChange(
    localData: EncryptedCycleData,
    remoteData: EncryptedCycleData,
    field: string
  ): boolean {
    const localValue = (localData as any)[field];
    const remoteValue = (remoteData as any)[field];

    // Check if one is additive change (e.g., adding to notes)
    if (field === 'notes') {
      return this.isAdditiveTextChange(localValue, remoteValue);
    }

    // For array fields, check if changes don't overlap
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return this.isNonCompetingArrayChange(localValue, remoteValue);
    }

    return false;
  }

  private isAdditiveTextChange(localText: string, remoteText: string): boolean {
    if (!localText || !remoteText) return true;

    // Check if one text contains the other (indicating additive change)
    return localText.includes(remoteText) || remoteText.includes(localText);
  }

  private isNonCompetingArrayChange(localArray: any[], remoteArray: any[]): boolean {
    // Check if arrays have non-overlapping additions
    const localSet = new Set(localArray.map(item => JSON.stringify(item)));
    const remoteSet = new Set(remoteArray.map(item => JSON.stringify(item)));

    // If one is subset of the other, it's additive
    return this.isSubset(localSet, remoteSet) || this.isSubset(remoteSet, localSet);
  }

  private isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
    for (const item of subset) {
      if (!superset.has(item)) {
        return false;
      }
    }
    return true;
  }

  private async createAutoResolution(conflict: DataConflict): Promise<ConflictResolution> {
    const strategy = this.determineAutoResolutionStrategy(conflict);
    const resolvedData = await this.applyAutoResolutionStrategy(conflict, strategy);
    const appliedChanges = this.generateFieldChanges(conflict, resolvedData);

    return {
      strategy,
      resolvedData,
      appliedChanges,
      metadata: {
        resolvedAt: Date.now(),
        resolvedBy: 'system',
        deviceId: conflict.localData.deviceId,
        resolutionVersion: 1,
        conflictHash: this.generateConflictHash(conflict),
      },
    };
  }

  private determineAutoResolutionStrategy(conflict: DataConflict): ResolutionStrategy {
    const strategies = this.config.autoResolutionStrategies[conflict.type];

    if (!strategies || strategies.length === 0) {
      return 'merge-automatic';
    }

    // Choose strategy based on conflict characteristics
    switch (conflict.type) {
      case 'concurrent-creation':
        return 'take-local'; // Prefer local device for concurrent creation

      case 'user-preferences-edit':
        // Use latest timestamp for preferences
        const localTime = conflict.localData.updatedAt || conflict.localData.createdAt;
        const remoteTime = conflict.remoteData.updatedAt || conflict.remoteData.createdAt;
        return localTime > remoteTime ? 'take-local' : 'take-remote';

      case 'cycle-data-edit':
        // Intelligent merge for cycle data
        return this.canIntelligentlyMerge(conflict) ? 'merge-automatic' : 'take-local';

      default:
        return strategies[0];
    }
  }

  private canIntelligentlyMerge(conflict: DataConflict): boolean {
    // Check if changes are in different field categories
    const localChanges = this.categorizeFieldChanges(conflict.conflictFields, conflict.localData);
    const remoteChanges = this.categorizeFieldChanges(conflict.conflictFields, conflict.remoteData);

    // If changes are in different categories, they can be merged
    const hasOverlappingCategories = Object.keys(localChanges).some(
      category =>
        remoteChanges[category] &&
        localChanges[category].length > 0 &&
        remoteChanges[category].length > 0
    );

    return !hasOverlappingCategories;
  }

  private categorizeFieldChanges(
    fields: string[],
    data: ConflictableData
  ): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      symptoms: [],
      flow: [],
      mood: [],
      notes: [],
      activities: [],
      other: [],
    };

    for (const field of fields) {
      if (field.includes('symptom') || field === 'symptoms') {
        categories.symptoms.push(field);
      } else if (field.includes('flow') || field === 'flowIntensity') {
        categories.flow.push(field);
      } else if (field.includes('mood')) {
        categories.mood.push(field);
      } else if (field.includes('note')) {
        categories.notes.push(field);
      } else if (field.includes('activit')) {
        categories.activities.push(field);
      } else {
        categories.other.push(field);
      }
    }

    return categories;
  }

  private async applyAutoResolutionStrategy(
    conflict: DataConflict,
    strategy: ResolutionStrategy
  ): Promise<ConflictableData> {
    const { localData, remoteData } = conflict;

    switch (strategy) {
      case 'take-local':
        return {
          ...localData,
          version: Math.max(localData.version || 1, remoteData.version || 1) + 1,
          updatedAt: Date.now(),
        };

      case 'take-remote':
        return {
          ...remoteData,
          version: Math.max(localData.version || 1, remoteData.version || 1) + 1,
          updatedAt: Date.now(),
        };

      case 'merge-automatic':
        return this.performIntelligentMerge(localData, remoteData, conflict.conflictFields);

      default:
        throw new Error(`Unsupported auto-resolution strategy: ${strategy}`);
    }
  }

  private performIntelligentMerge(
    localData: ConflictableData,
    remoteData: ConflictableData,
    conflictFields: string[]
  ): ConflictableData {
    const merged = { ...remoteData };

    for (const field of conflictFields) {
      const priority = this.config.fieldPriorities[field];
      const localValue = (localData as any)[field];
      const remoteValue = (remoteData as any)[field];

      if (priority?.defaultResolution === 'take-local') {
        (merged as any)[field] = localValue;
      } else if (this.canMergeFieldValues(localValue, remoteValue, field)) {
        (merged as any)[field] = this.mergeFieldValues(localValue, remoteValue, field);
      } else {
        // Use timestamp to decide
        const localTime = localData.updatedAt || localData.createdAt;
        const remoteTime = remoteData.updatedAt || remoteData.createdAt;
        (merged as any)[field] = localTime > remoteTime ? localValue : remoteValue;
      }
    }

    // Update metadata
    merged.version = Math.max(localData.version || 1, remoteData.version || 1) + 1;
    merged.updatedAt = Date.now();
    merged.deviceId = localData.deviceId; // Keep local device as primary

    return merged;
  }

  private canMergeFieldValues(localValue: any, remoteValue: any, field: string): boolean {
    // Text fields that can be concatenated
    if (field === 'notes' && typeof localValue === 'string' && typeof remoteValue === 'string') {
      return true;
    }

    // Array fields that can be combined
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return true;
    }

    return false;
  }

  private mergeFieldValues(localValue: any, remoteValue: any, field: string): any {
    if (field === 'notes' && typeof localValue === 'string' && typeof remoteValue === 'string') {
      // Merge notes intelligently
      if (localValue.includes(remoteValue)) return localValue;
      if (remoteValue.includes(localValue)) return remoteValue;
      return `${localValue}\n\n${remoteValue}`;
    }

    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      // Merge arrays, removing duplicates
      const combined = [...localValue, ...remoteValue];
      return Array.from(new Set(combined.map(item => JSON.stringify(item)))).map(item =>
        JSON.parse(item)
      );
    }

    return localValue; // Fallback to local value
  }

  private generateFieldChanges(
    conflict: DataConflict,
    resolvedData: ConflictableData
  ): FieldChange[] {
    return conflict.conflictFields.map(field => {
      const localValue = (conflict.localData as any)[field];
      const remoteValue = (conflict.remoteData as any)[field];
      const resolvedValue = (resolvedData as any)[field];

      let source: 'local' | 'remote' | 'merged';
      if (this.deepEqual(resolvedValue, localValue)) {
        source = 'local';
      } else if (this.deepEqual(resolvedValue, remoteValue)) {
        source = 'remote';
      } else {
        source = 'merged';
      }

      return {
        field,
        oldValue: localValue,
        newValue: resolvedValue,
        source,
        timestamp: Date.now(),
      };
    });
  }

  private generateConflictHash(conflict: DataConflict): string {
    const hashSource = `${conflict.localData.id}_${conflict.localData.version}_${conflict.remoteData.version}_${conflict.timestamp}`;
    return btoa(hashSource).slice(0, 16);
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
}

// Default configuration for auto-conflict resolution
export const createDefaultAutoResolutionConfig = (): ConflictDetectionConfig => ({
  enableAutoResolution: true,
  timestampToleranceMs: 5000, // 5 seconds
  maxConflictAge: 24 * 60 * 60 * 1000, // 24 hours
  fieldPriorities: {
    // Critical health data - always user decision
    flowIntensity: { weight: 10, alwaysUserDecision: true, defaultResolution: 'take-local' },
    symptoms: { weight: 10, alwaysUserDecision: true, defaultResolution: 'take-local' },
    medications: { weight: 10, alwaysUserDecision: true, defaultResolution: 'take-local' },
    temperature: { weight: 9, alwaysUserDecision: true, defaultResolution: 'take-local' },

    // Medium priority - can be auto-resolved with care
    mood: { weight: 6, alwaysUserDecision: false, defaultResolution: 'merge-automatic' },
    activities: { weight: 5, alwaysUserDecision: false, defaultResolution: 'merge-automatic' },
    notes: { weight: 4, alwaysUserDecision: false, defaultResolution: 'merge-automatic' },

    // Low priority - safe to auto-resolve
    tags: { weight: 3, alwaysUserDecision: false, defaultResolution: 'merge-automatic' },
    theme: { weight: 2, alwaysUserDecision: false, defaultResolution: 'take-local' },
    language: { weight: 2, alwaysUserDecision: false, defaultResolution: 'take-local' },
    dateFormat: { weight: 1, alwaysUserDecision: false, defaultResolution: 'take-local' },
    units: { weight: 1, alwaysUserDecision: false, defaultResolution: 'take-local' },
  },
  autoResolutionStrategies: {
    'cycle-data-edit': ['merge-automatic', 'take-local'],
    'user-preferences-edit': ['take-local', 'take-remote'],
    'concurrent-creation': ['take-local'],
    'deletion-edit-conflict': ['take-local'],
    'version-mismatch': ['merge-automatic'],
  },
});
