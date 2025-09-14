/**
 * Data Access Event Types and Structures
 * Defines data access, processing, and privacy-related events
 */

import type { BaseEvent, LoggedEvent } from './types.js';

// Data Event Logger Interface
export interface DataEventLogger {
  logDataEvent(event: DataEvent): Promise<LoggedEvent>;
  logDataAccessEvent(event: DataAccessEvent): Promise<LoggedEvent>;
  logDataModificationEvent(event: DataModificationEvent): Promise<LoggedEvent>;
  getDataEvents(filters?: DataEventFilters): Promise<DataEvent[]>;
}

// Data Event Interface
export interface DataEvent extends BaseEvent {
  eventType: 'data_created' | 'data_updated' | 'data_deleted' | 'data_accessed';
  dataType: string;
  dataId: string;
  operation: string;
}

// Data Modification Event Interface
export interface DataModificationEvent extends BaseEvent {
  eventType: 'data_write' | 'data_delete' | 'data_update';
  dataType: string;
  dataId: string;
  oldValue?: any;
  newValue?: any;
  changeReason: string;
}

// Data Event Filters
export interface DataEventFilters {
  dataType?: string;
  timeRange?: { start: Date; end: Date };
  operations?: string[];
}

export interface DataAccessEvent extends BaseEvent {
  eventType:
    | 'data_read'
    | 'data_write'
    | 'data_delete'
    | 'data_share'
    | 'data_export'
    | 'data_sync'
    | 'data_backup'
    | 'data_restore'
    | 'data_migration'
    | 'data_purge';

  // Data access details
  dataType: DataType;
  dataCategory: DataCategory;
  resourceId: string;

  // Access context
  accessPurpose: DataAccessPurpose;
  accessLevel: DataAccessLevel;
  accessDuration: number;

  // Data sensitivity
  sensitivityLevel: SensitivityLevel;
  encryptionRequired: boolean;
  encryptionApplied: boolean;

  // Legal basis and consent
  legalBasis: LegalBasis;
  consentId?: string;
  consentValid: boolean;

  // Data sharing (if applicable)
  sharedWith?: string[];
  sharingPurpose?: string;
  sharingDuration?: number;

  // Compliance flags
  gdprRelevant: boolean;
  hipaaRelevant: boolean;
  ccpaRelevant: boolean;
}

// Data Type Definitions
export type DataType =
  | 'health_data'
  | 'cycle_data'
  | 'symptoms'
  | 'medications'
  | 'appointments'
  | 'test_results'
  | 'user_preferences'
  | 'device_data';

export type DataCategory =
  | 'personal_data'
  | 'sensitive_data'
  | 'special_category'
  | 'health_data'
  | 'biometric_data'
  | 'location_data';

export type DataAccessPurpose =
  | 'read_display'
  | 'edit_update'
  | 'analytics'
  | 'sharing'
  | 'backup'
  | 'sync'
  | 'export'
  | 'healthcare_provider_access';

export type DataAccessLevel = 'restricted' | 'standard' | 'full' | 'administrative';

export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';
