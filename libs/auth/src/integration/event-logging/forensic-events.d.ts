/**
 * Forensic Event Types and Analysis Structures
 * Defines forensic investigation and evidence collection events
 */
import type { BaseEvent } from './types.js';
export interface ForensicEvent extends BaseEvent {
  eventType:
    | 'evidence_collected'
    | 'chain_of_custody_established'
    | 'evidence_analyzed'
    | 'timeline_reconstructed'
    | 'correlation_identified'
    | 'incident_declared'
    | 'investigation_started'
    | 'investigation_completed';
  investigationId: string;
  evidenceId: string;
  chainOfCustody: ChainOfCustodyRecord[];
  evidenceType: EvidenceType;
  evidenceHash: string;
  evidenceSize: number;
  collectionMethod: string;
  analysisResults?: ForensicAnalysisResult[];
  correlatedEvents?: string[];
  timelinePosition?: number;
  legalHold: boolean;
  discoverable: boolean;
  privileged: boolean;
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
export interface ForensicAnalysisResult {
  analysisId: string;
  analysisType: string;
  findings: string[];
  confidence: number;
  methodology: string;
  tools: string[];
  analyst: string;
}
export interface ForensicSnapshot {
  snapshotId: string;
  createdAt: Date;
  context: ForensicSnapshotContext;
  systemState: SystemStateSnapshot;
  applicationState: ApplicationStateSnapshot;
  userState: UserStateSnapshot;
  evidenceHash: string;
  chainOfCustody: ChainOfCustodyRecord;
  legalHold: boolean;
}
export interface ForensicSnapshotContext {
  incidentId: string;
  triggerEvent: string;
  investigatorId: string;
  legalHold: boolean;
  preservationOrder: string;
}
export interface SystemStateSnapshot {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkConnections: NetworkConnection[];
  runningProcesses: ProcessInfo[];
  systemLogs: LogEntry[];
}
export interface ApplicationStateSnapshot {
  timestamp: Date;
  applicationVersion: string;
  configurationHash: string;
  activeSessions: string[];
  databaseConnections: number;
  cacheStatus: CacheStatus;
}
export interface UserStateSnapshot {
  timestamp: Date;
  userId: string;
  sessionStates: SessionState[];
  permissions: string[];
  recentActivities: RecentActivity[];
}
export interface NetworkConnection {
  localAddress: string;
  remoteAddress: string;
  protocol: string;
  state: string;
  processId: number;
}
export interface ProcessInfo {
  processId: number;
  processName: string;
  cpuUsage: number;
  memoryUsage: number;
  startTime: Date;
  userId: string;
}
export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}
export interface CacheStatus {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  size: number;
  maxSize: number;
}
export interface SessionState {
  sessionId: string;
  status: 'active' | 'idle' | 'expired' | 'terminated';
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}
export interface RecentActivity {
  timestamp: Date;
  activityType: string;
  details: string;
  riskLevel: string;
}
export type EvidenceType =
  | 'log_entry'
  | 'network_packet'
  | 'file_system'
  | 'memory_dump'
  | 'database_record'
  | 'system_state';
