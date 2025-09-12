/**
 * System Event Types and Context Data
 * Defines system-level events and operational context
 */
import type { BaseEvent } from './types.js';
export interface SystemEvent extends BaseEvent {
  eventType:
    | 'system_startup'
    | 'system_shutdown'
    | 'configuration_change'
    | 'policy_update'
    | 'maintenance_started'
    | 'maintenance_completed'
    | 'backup_started'
    | 'backup_completed'
    | 'restore_started'
    | 'restore_completed'
    | 'key_rotation'
    | 'certificate_renewal'
    | 'software_update';
  systemComponent: string;
  operationType: OperationType;
  changeDescription: string;
  oldValue?: any;
  newValue?: any;
  serviceImpact: ServiceImpact;
  userImpact: UserImpact;
  securityImpact: SecurityImpact;
  adminUserId?: string;
  approvalId?: string;
  automatedAction: boolean;
}
export type OperationType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'configure'
  | 'backup'
  | 'restore';
export type ServiceImpact = 'none' | 'minimal' | 'partial' | 'significant' | 'complete';
export type UserImpact = 'none' | 'minor' | 'moderate' | 'major' | 'severe';
export type SecurityImpact = 'none' | 'low' | 'medium' | 'high' | 'critical';
