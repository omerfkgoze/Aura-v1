/**
 * Session Monitoring and Health Management
 */

import type { RiskLevel } from '../types.js';

export interface SessionHealthStatus {
  sessionId: string;
  overall: HealthLevel;

  // Health components
  tokenHealth: TokenHealthStatus;
  deviceHealth: DeviceHealthStatus;
  networkHealth: NetworkHealthStatus;
  behaviourHealth: BehaviourHealthStatus;

  // Monitoring metrics
  lastCheckAt: Date;
  healthScore: number; // 0-100
  degradationRate: number;

  // Recommendations
  recommendations: HealthRecommendation[];
  alertsTriggered: HealthAlert[];
}

export interface ActiveSessionInfo {
  sessionId: string;
  userId: string;
  deviceId: string;

  // Session basics
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;

  // Device and location
  deviceType: string;
  platform: string;
  location: SessionLocationInfo;

  // Activity metrics
  actionsCount: number;
  dataAccessed: string[];
  riskEvents: number;

  // Current status
  status: SessionStatus;
  healthLevel: HealthLevel;
  riskLevel: RiskLevel;
}

export interface SessionRiskAssessment {
  sessionId: string;
  assessedAt: Date;
  overallRisk: RiskLevel;

  // Risk factors
  riskFactors: RiskFactor[];
  riskScore: number; // 0-100
  riskTrend: 'increasing' | 'stable' | 'decreasing';

  // Behavioral analysis
  behavioralBaseline: BehavioralBaseline;
  anomaliesDetected: BehavioralAnomaly[];

  // Device and environment
  deviceTrustLevel: number;
  networkTrustLevel: number;
  locationRisk: LocationRisk;

  // Compliance and policy
  policyViolations: PolicyViolation[];
  complianceRisk: ComplianceRisk;

  // Recommendations
  mitigationActions: RiskMitigationAction[];
  monitoringRequired: boolean;
}

// Health Status Types
export interface TokenHealthStatus {
  valid: boolean;
  expiresIn: number;
  signatureIntegrity: boolean;
  rotationNeeded: boolean;
}

export interface DeviceHealthStatus {
  trusted: boolean;
  compromiseIndicators: string[];
  securityFeatures: DeviceSecurityFeature[];
  lastVerification: Date;
}

export interface NetworkHealthStatus {
  secure: boolean;
  vpnDetected: boolean;
  suspiciousActivity: boolean;
  latencyNormal: boolean;
}

export interface BehaviourHealthStatus {
  patternMatch: number; // 0-100
  anomaliesDetected: number;
  riskEvents: number;
  deviationLevel: 'low' | 'medium' | 'high';
}

// Risk Assessment Types
export interface RiskFactor {
  type: RiskFactorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected: Date;
  mitigated: boolean;
}

export interface BehavioralBaseline {
  userId: string;
  establishedAt: Date;

  // Usage patterns
  typicalUsageHours: number[];
  commonDevices: string[];
  frequentLocations: string[];

  // Interaction patterns
  averageSessionDuration: number;
  typicalActionSequences: string[];
  dataAccessPatterns: DataAccessPattern[];
}

export interface BehavioralAnomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number; // 0-100
  firstDetected: Date;
}

export interface LocationRisk {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: LocationRiskFactor[];
  geofenceViolation: boolean;
  travelDetected: boolean;
}

export interface PolicyViolation {
  policyId: string;
  violationType: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  detectedAt: Date;
}

export interface ComplianceRisk {
  gdprRisk: 'low' | 'medium' | 'high';
  hipaaRisk: 'low' | 'medium' | 'high';
  dataRetentionRisk: 'low' | 'medium' | 'high';
  consentRisk: 'low' | 'medium' | 'high';
}

export interface RiskMitigationAction {
  action: MitigationActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  automated: boolean;
  requiresUserAction: boolean;
}

// Supporting Types
export interface SessionLocationInfo {
  country: string;
  region?: string;
  city?: string;
  timezone: string;
  vpnDetected: boolean;
  knownLocation: boolean;
}

export interface DeviceSecurityFeature {
  feature: string;
  enabled: boolean;
  version?: string;
  lastUpdated?: Date;
}

export interface DataAccessPattern {
  dataType: string;
  frequency: number;
  timePattern: string;
  accessLevel: string;
}

export interface HealthRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  action: string;
  automated: boolean;
}

export interface HealthAlert {
  alertId: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  triggeredAt: Date;
}

export interface LocationRiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

// Enums
export type HealthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type SessionStatus = 'active' | 'idle' | 'expired' | 'suspended' | 'terminated';

export type RiskFactorType =
  | 'device_anomaly'
  | 'location_anomaly'
  | 'behavior_anomaly'
  | 'network_anomaly'
  | 'time_anomaly'
  | 'access_anomaly';

export type AnomalyType =
  | 'unusual_location'
  | 'unusual_time'
  | 'unusual_device'
  | 'unusual_behavior'
  | 'data_access_anomaly'
  | 'session_duration_anomaly';

export type MitigationActionType =
  | 'require_reauth'
  | 'limit_access'
  | 'increase_monitoring'
  | 'terminate_session'
  | 'notify_user'
  | 'escalate_security';
