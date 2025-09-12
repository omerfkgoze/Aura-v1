/**
 * Data Access Event Types and Structures
 * Defines data access, processing, and privacy-related events
 */
import type { BaseEvent } from './types.js';
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
