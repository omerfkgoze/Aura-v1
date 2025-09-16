/**
 * Session Monitoring and Health Management
 */
import type { RiskLevel } from '../types/index.js';
export interface SessionMonitor {
  getSessionHealth(sessionId: string): Promise<SessionHealthStatus>;
  monitorSessionRisk(sessionId: string): Promise<SessionRiskAssessment>;
  trackSessionMetrics(sessionId: string): Promise<SessionSecurityMetrics>;
}
export interface SessionSecurityMetrics {
  sessionId: string;
  riskScore: number;
  threatLevel: RiskLevel;
  anomalyDetected: boolean;
  lastRiskAssessment: Date;
  securityEvents: number;
}
export interface SessionHealthStatus {
  sessionId: string;
  overall: HealthLevel;
  tokenHealth: TokenHealthStatus;
  deviceHealth: DeviceHealthStatus;
  networkHealth: NetworkHealthStatus;
  behaviourHealth: BehaviourHealthStatus;
  lastCheckAt: Date;
  healthScore: number;
  degradationRate: number;
  recommendations: HealthRecommendation[];
  alertsTriggered: HealthAlert[];
}
export interface ActiveSessionInfo {
  sessionId: string;
  userId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  deviceType: string;
  platform: string;
  location: SessionLocationInfo;
  actionsCount: number;
  dataAccessed: string[];
  riskEvents: number;
  status: SessionStatus;
  healthLevel: HealthLevel;
  riskLevel: RiskLevel;
}
export interface SessionRiskAssessment {
  sessionId: string;
  assessedAt: Date;
  overallRisk: RiskLevel;
  riskFactors: RiskFactor[];
  riskScore: number;
  riskTrend: 'increasing' | 'stable' | 'decreasing';
  behavioralBaseline: BehavioralBaseline;
  anomaliesDetected: BehavioralAnomaly[];
  deviceTrustLevel: number;
  networkTrustLevel: number;
  locationRisk: LocationRisk;
  policyViolations: PolicyViolation[];
  complianceRisk: ComplianceRisk;
  mitigationActions: RiskMitigationAction[];
  monitoringRequired: boolean;
}
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
  patternMatch: number;
  anomaliesDetected: number;
  riskEvents: number;
  deviationLevel: 'low' | 'medium' | 'high';
}
export interface RiskFactor {
  type: RiskFactorType;
  severity: RiskLevel;
  description: string;
  detectedAt: Date;
  mitigated: boolean;
}
export interface BehavioralBaseline {
  userId: string;
  establishedAt: Date;
  typicalUsageHours: number[];
  commonDevices: string[];
  frequentLocations: string[];
  averageSessionDuration: number;
  typicalActionSequences: string[];
  dataAccessPatterns: DataAccessPattern[];
}
export interface BehavioralAnomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
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
