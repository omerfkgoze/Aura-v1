/**
 * Security Event Types and Context Data
 * Defines security-specific events, threats, and analysis context
 */
import type { BaseEvent, SecuritySeverity, LoggedEvent } from './types.js';
export interface SecurityEventLogger {
  logSecurityEvent(event: SecurityEvent): Promise<LoggedEvent>;
  logAuthenticationEvent(event: AuthenticationEvent): Promise<LoggedEvent>;
  logSessionEvent(event: SessionEvent): Promise<LoggedEvent>;
  logDeviceEvent(event: DeviceEvent): Promise<LoggedEvent>;
  getSecurityEvents(filters?: SecurityEventFilters): Promise<SecurityEvent[]>;
}
export interface AuthenticationEvent extends BaseEvent {
  eventType: 'authentication_started' | 'authentication_completed' | 'authentication_failed';
  method: string;
  success: boolean;
  failureReason?: string;
}
export interface SessionEvent extends BaseEvent {
  eventType: 'session_created' | 'session_terminated' | 'session_expired';
  sessionId: string;
  duration?: number;
}
export interface DeviceEvent extends BaseEvent {
  eventType: 'device_registered' | 'device_removed' | 'device_suspicious';
  deviceId: string;
  deviceInfo: any;
}
export interface SecurityEventFilters {
  severity?: SecuritySeverity;
  timeRange?: {
    start: Date;
    end: Date;
  };
  eventTypes?: string[];
}
export interface SecurityEvent extends BaseEvent {
  eventType:
    | 'security_violation'
    | 'suspicious_activity'
    | 'threat_detected'
    | 'attack_attempt'
    | 'security_policy_violation'
    | 'anomaly_detected'
    | 'privilege_escalation_attempt'
    | 'unauthorized_access_attempt'
    | 'data_breach_detected'
    | 'malware_detected'
    | 'phishing_attempt';
  severity: SecuritySeverity;
  threatType: ThreatType;
  attackVector?: AttackVector;
  securityContext: SecurityEventContext;
  affectedResources: string[];
  detectionMethod: DetectionMethod;
  detectionConfidence: number;
  falsePositiveLikelihood: number;
  autoMitigated: boolean;
  mitigationActions: string[];
  responseRequired: boolean;
  escalated: boolean;
  impactLevel: ImpactLevel;
  affectedUsers: string[];
  dataExposureRisk: DataExposureRisk;
}
export interface SecurityEventContext {
  attackPhase?: AttackPhase;
  attackComplexity: AttackComplexity;
  userInteractionRequired: boolean;
  sourceIP: string;
  destinationIP?: string;
  protocol: string;
  port?: number;
  endpoint?: string;
  userAgent?: string;
  referer?: string;
  sessionContext?: string;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}
export type ThreatType =
  | 'malware'
  | 'phishing'
  | 'social_engineering'
  | 'brute_force'
  | 'injection'
  | 'privilege_escalation'
  | 'data_exfiltration';
export type AttackVector =
  | 'network'
  | 'email'
  | 'web'
  | 'physical'
  | 'social'
  | 'supply_chain'
  | 'insider';
export type DetectionMethod =
  | 'signature'
  | 'heuristic'
  | 'behavioral'
  | 'anomaly'
  | 'machine_learning'
  | 'rule_based';
export type ImpactLevel = 'minimal' | 'minor' | 'moderate' | 'major' | 'severe';
export type DataExposureRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type AttackPhase =
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_control'
  | 'actions_objectives';
export type AttackComplexity = 'low' | 'medium' | 'high';
