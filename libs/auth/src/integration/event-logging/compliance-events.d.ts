/**
 * Compliance Event Types and Structures
 * Defines GDPR, HIPAA, and other compliance-related events
 */
import type { BaseEvent } from './types.js';
import type { DataCategory, LegalBasis } from './data-events.js';
export interface GDPREvent extends BaseEvent {
  eventType:
    | 'consent_given'
    | 'consent_withdrawn'
    | 'data_subject_request'
    | 'right_to_be_forgotten'
    | 'data_portability_request'
    | 'data_rectification'
    | 'data_processing_started'
    | 'data_processing_stopped'
    | 'breach_notification';
  legalBasis: GDPRLegalBasis;
  dataSubjectId: string;
  processingPurpose: string;
  rightExercised?: DataSubjectRight;
  requestId?: string;
  responseDeadline?: Date;
  dataCategories: DataCategory[];
  processingActivities: string[];
  thirdPartyInvolved: boolean;
  crossBorderTransfer: boolean;
}
export interface HIPAAEvent extends BaseEvent {
  eventType:
    | 'phi_accessed'
    | 'phi_disclosed'
    | 'phi_modified'
    | 'phi_created'
    | 'phi_deleted'
    | 'authorization_granted'
    | 'authorization_revoked'
    | 'minimum_necessary_applied'
    | 'breach_detected';
  phiType: PHIType;
  accessJustification: string;
  minimumNecessary: boolean;
  patientId?: string;
  providerId?: string;
  treatmentContext?: string;
  authorizationId?: string;
  authorizationValid: boolean;
  purposeOfUse: string;
}
export interface DataProcessingEvent extends BaseEvent {
  eventType:
    | 'processing_started'
    | 'processing_completed'
    | 'processing_failed'
    | 'processing_paused'
    | 'processing_resumed'
    | 'processing_cancelled';
  processingType: DataProcessingType;
  processingPurpose: string;
  dataVolume: number;
  legalBasis: LegalBasis;
  consentRequired: boolean;
  consentObtained: boolean;
  algorithm?: string;
  parameters?: Record<string, any>;
  outputGenerated: boolean;
  dataQualityScore?: number;
  validationPassed: boolean;
  errorsEncountered: string[];
}
export interface ConsentEvent extends BaseEvent {
  eventType:
    | 'consent_requested'
    | 'consent_given'
    | 'consent_denied'
    | 'consent_withdrawn'
    | 'consent_renewed'
    | 'consent_expired'
    | 'consent_modified';
  consentId: string;
  consentType: ConsentType;
  consentScope: string[];
  dataSubjectId: string;
  processingPurposes: string[];
  dataCategories: DataCategory[];
  consentMechanism: ConsentMechanism;
  explicitConsent: boolean;
  informedConsent: boolean;
  validFrom: Date;
  validUntil?: Date;
  renewalRequired: boolean;
  withdrawalMethod: string;
}
export type GDPRLegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';
export type DataSubjectRight =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restrict_processing'
  | 'data_portability'
  | 'object';
export type PHIType =
  | 'identifiers'
  | 'health_information'
  | 'payment_information'
  | 'dates'
  | 'communication';
export type DataProcessingType =
  | 'collection'
  | 'storage'
  | 'analysis'
  | 'sharing'
  | 'deletion'
  | 'anonymization';
export type ConsentType = 'explicit' | 'implicit' | 'opt_in' | 'opt_out' | 'blanket' | 'granular';
export type ConsentMechanism =
  | 'checkbox'
  | 'signature'
  | 'verbal'
  | 'implied'
  | 'electronic'
  | 'biometric';
