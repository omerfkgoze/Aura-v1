/**
 * Forensic Analysis and Timeline Reconstruction
 * Defines forensic analysis, timeline reconstruction, and reporting interfaces
 */
import type { EventType, SecuritySeverity, TimeRange } from './types.js';
import type { AttackVector } from './security-events.js';
export interface EventTimeline {
  timelineId: string;
  reconstructedAt: Date;
  timeRange: TimeRange;
  events: TimelineEvent[];
  correlations: EventCorrelation[];
  gaps: TimelineGap[];
  attackNarrative?: string;
  keyMilestones: TimelineMilestone[];
  evidenceQuality: EvidenceQuality;
  reconstructionConfidence: number;
  timelineAccuracy: number;
  missingEvidence: string[];
}
export interface TimelineEvent {
  eventId: string;
  timestamp: Date;
  eventType: EventType;
  description: string;
  confidence: number;
  sourceReliability: number;
  correlatedEvents: string[];
}
export interface EventCorrelation {
  correlationId: string;
  eventIds: string[];
  correlationType: 'causal' | 'temporal' | 'behavioral' | 'technical';
  strength: number;
  description: string;
}
export interface TimelineGap {
  startTime: Date;
  endTime: Date;
  duration: number;
  possibleCauses: string[];
  impactOnAnalysis: 'minimal' | 'moderate' | 'significant';
}
export interface TimelineMilestone {
  timestamp: Date;
  event: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidenceQuality: EvidenceQuality;
}
export interface EvidenceQuality {
  completeness: number;
  reliability: number;
  integrity: number;
  chainOfCustody: boolean;
  verifiable: boolean;
}
export interface EventEvidence {
  evidenceId: string;
  eventIds: string[];
  collectedAt: Date;
  integrityHash: string;
  chainOfCustody: ChainOfCustodyRecord[];
  legalHold: boolean;
  admissible: boolean;
}
export interface EventChainEvidence {
  chainId: string;
  startEventId: string;
  endEventId: string;
  eventCount: number;
  chainIntegrity: boolean;
  missingEvents: string[];
  preservationQuality: EvidenceQuality;
}
export interface EventCorrelationReport {
  reportId: string;
  generatedAt: Date;
  correlations: EventCorrelation[];
  confidenceScore: number;
  analysisMethod: string;
}
export interface TimelineReconstructionQuery {
  incidentId: string;
  timeRange: TimeRange;
  eventTypes?: EventType[];
  userIds?: string[];
  deviceIds?: string[];
  confidence: number;
}
export interface CorrelationAnalysisQuery {
  eventIds: string[];
  analysisType: 'temporal' | 'causal' | 'behavioral' | 'technical' | 'all';
  timeWindow: number;
  confidence: number;
}
export interface ForensicReportQuery {
  incidentId: string;
  reportType: 'summary' | 'detailed' | 'technical' | 'executive';
  includeTimeline: boolean;
  includeEvidence: boolean;
  includeRecommendations: boolean;
}
export interface ForensicReport {
  reportId: string;
  incidentId: string;
  generatedAt: Date;
  investigator: string;
  executiveSummary: string;
  findings: ForensicFinding[];
  timeline: EventTimeline;
  evidence: EventEvidence[];
  rootCause: string;
  attackVector: AttackVector;
  impactAssessment: string;
  recommendations: ForensicRecommendation[];
  lessoneLearned: string[];
  legalImplications: string[];
  regulatoryRequirements: string[];
  disclosureRequirements: string[];
}
export interface ForensicFinding {
  findingId: string;
  category: string;
  severity: SecuritySeverity;
  description: string;
  evidence: string[];
  confidence: number;
  implications: string[];
}
export interface ForensicRecommendation {
  category: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  rationale: string;
  estimatedCost: string;
  estimatedTimeframe: string;
}
export interface ChainOfCustodyRecord {
  recordId: string;
  timestamp: Date;
  custodian: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed';
  location: string;
  integrityHash: string;
  signature: string;
}
