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
