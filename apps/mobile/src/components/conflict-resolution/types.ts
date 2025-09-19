import { EncryptedCycleData, EncryptedUserPrefs } from '@aura/shared-types';

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DataConflict[];
  autoResolvable: DataConflict[];
  requiresUserInput: DataConflict[];
}

export interface DataConflict {
  id: string;
  type: ConflictType;
  localData: ConflictableData;
  remoteData: ConflictableData;
  conflictFields: string[];
  severity: ConflictSeverity;
  timestamp: number;
  autoResolvable: boolean;
  suggestedResolution?: ConflictResolution;
}

export type ConflictType =
  | 'cycle-data-edit'
  | 'user-preferences-edit'
  | 'concurrent-creation'
  | 'deletion-edit-conflict'
  | 'version-mismatch';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ConflictableData = EncryptedCycleData | EncryptedUserPrefs;

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  resolvedData: ConflictableData;
  appliedChanges: FieldChange[];
  metadata: ResolutionMetadata;
}

export type ResolutionStrategy =
  | 'take-local'
  | 'take-remote'
  | 'merge-automatic'
  | 'merge-user-guided'
  | 'create-both'
  | 'manual-edit';

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  source: 'local' | 'remote' | 'merged';
  timestamp: number;
}

export interface ResolutionMetadata {
  resolvedAt: number;
  resolvedBy: 'system' | 'user';
  deviceId: string;
  resolutionVersion: number;
  conflictHash: string;
  reason?: string;
}

export interface ConflictDetectionConfig {
  enableAutoResolution: boolean;
  fieldPriorities: Record<string, FieldPriority>;
  timestampToleranceMs: number;
  maxConflictAge: number;
  autoResolutionStrategies: Record<ConflictType, ResolutionStrategy[]>;
}

export interface FieldPriority {
  weight: number;
  alwaysUserDecision: boolean;
  defaultResolution: ResolutionStrategy;
}

export interface ConflictAuditEntry {
  id: string;
  conflictId: string;
  timestamp: number;
  action: ConflictAuditAction;
  deviceId: string;
  metadata: {
    conflictType: ConflictType;
    resolutionStrategy: ResolutionStrategy;
    fieldsAffected: string[];
    userInteractionRequired: boolean;
  };
}

export type ConflictAuditAction =
  | 'conflict-detected'
  | 'auto-resolved'
  | 'user-resolved'
  | 'resolution-applied'
  | 'conflict-escalated';

export interface ConflictHistory {
  conflictId: string;
  entries: ConflictAuditEntry[];
  finalResolution?: ConflictResolution;
  status: 'pending' | 'resolved' | 'escalated';
}

export interface VersionVector {
  deviceId: string;
  version: number;
  timestamp: number;
  checksum: string;
}

export interface ConflictDetectionContext {
  localVersion: VersionVector;
  remoteVersion: VersionVector;
  lastSyncTimestamp: number;
  deviceTrustLevel: number;
  networkLatency: number;
}
