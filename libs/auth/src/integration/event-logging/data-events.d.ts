/**
 * Data Access Event Types and Structures
 * Defines data access, processing, and privacy-related events
 */
import type { BaseEvent, LoggedEvent } from './types.js';
export interface DataEventLogger {
  logDataEvent(event: DataEvent): Promise<LoggedEvent>;
  logDataAccessEvent(event: DataAccessEvent): Promise<LoggedEvent>;
  logDataModificationEvent(event: DataModificationEvent): Promise<LoggedEvent>;
  getDataEvents(filters?: DataEventFilters): Promise<DataEvent[]>;
}
export interface DataEvent extends BaseEvent {
  eventType: 'data_created' | 'data_updated' | 'data_deleted' | 'data_accessed';
  dataType: string;
  dataId: string;
  operation: string;
}
export interface DataModificationEvent extends BaseEvent {
  eventType: 'data_write' | 'data_delete' | 'data_update';
  dataType: string;
  dataId: string;
  oldValue?: any;
  newValue?: any;
  changeReason: string;
}
export interface DataEventFilters {
  dataType?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
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
  dataType: DataType;
  dataCategory: DataCategory;
  resourceId: string;
  accessPurpose: DataAccessPurpose;
  accessLevel: DataAccessLevel;
  accessDuration: number;
  sensitivityLevel: SensitivityLevel;
  encryptionRequired: boolean;
  encryptionApplied: boolean;
  legalBasis: LegalBasis;
  consentId?: string;
  consentValid: boolean;
  sharedWith?: string[];
  sharingPurpose?: string;
  sharingDuration?: number;
  gdprRelevant: boolean;
  hipaaRelevant: boolean;
  ccpaRelevant: boolean;
}
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
