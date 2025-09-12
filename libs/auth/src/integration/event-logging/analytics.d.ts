/**
 * Event Analytics and Pattern Analysis
 * Defines analytics, pattern detection, and anomaly analysis interfaces
 */
import type { EventType, SecuritySeverity, TimeRange } from './types.js';
import type { RiskLevel } from '../types/index.js';
export interface EventQueryFilters {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: EventType[];
  severityLevels?: SecuritySeverity[];
  riskLevels?: RiskLevel[];
  deviceIds?: string[];
  locations?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
export interface EventPatternQuery {
  userId?: string;
  timeRange: TimeRange;
  eventTypes: EventType[];
  patternType: 'sequence' | 'frequency' | 'anomaly' | 'correlation';
  parameters: Record<string, any>;
}
export interface EventPatternAnalysis {
  patternId: string;
  patternType: string;
  confidence: number;
  occurrences: number;
  timeframe: TimeRange;
  eventSequence?: EventSequencePattern[];
  frequencyPattern?: FrequencyPattern;
  anomalyPattern?: AnomalyPattern;
  correlationPattern?: CorrelationPattern;
  riskLevel: RiskLevel;
  securityImplications: string[];
  recommendedActions: string[];
}
export interface AnomalyDetectionQuery {
  userId?: string;
  timeRange: TimeRange;
  eventTypes?: EventType[];
  sensitivity: 'low' | 'medium' | 'high';
  baselinePeriod: TimeRange;
}
export interface EventAnomalyReport {
  reportId: string;
  generatedAt: Date;
  timeRange: TimeRange;
  anomalies: DetectedAnomaly[];
  totalAnomalies: number;
  anomalyScore: number;
  baselineEvents: number;
  comparisonPeriod: TimeRange;
  detectionSensitivity: 'low' | 'medium' | 'high';
  overallRisk: RiskLevel;
  criticalAnomalies: number;
  investigationRequired: boolean;
}
export interface DetectedAnomaly {
  anomalyId: string;
  type: string;
  severity: SecuritySeverity;
  confidence: number;
  description: string;
  affectedEvents: string[];
  recommendedAction: string;
}
export interface EventSequencePattern {
  sequence: EventType[];
  occurrences: number;
  averageInterval: number;
  confidence: number;
}
export interface FrequencyPattern {
  eventType: EventType;
  normalFrequency: number;
  observedFrequency: number;
  deviation: number;
  timeWindow: string;
}
export interface AnomalyPattern {
  anomalyType: string;
  severity: SecuritySeverity;
  description: string;
  affectedEvents: number;
  timeRange: TimeRange;
}
export interface CorrelationPattern {
  eventTypes: EventType[];
  correlationStrength: number;
  description: string;
  occurrences: number;
}
