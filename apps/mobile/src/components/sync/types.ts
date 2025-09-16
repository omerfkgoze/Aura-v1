/**
 * P2P Synchronization Types
 *
 * Defines types for device-to-device communication protocol with
 * separate encryption keys for secure synchronization.
 */

import { CryptoEnvelope } from '../../services/EncryptedDataService';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  appVersion: string;
  protocolVersion: string;
  publicKey: string; // P2P public key for secure handshake
  discoveredAt: number; // timestamp
}

export interface P2PMessage {
  messageId: string;
  type: P2PMessageType;
  fromDeviceId: string;
  toDeviceId: string;
  timestamp: number;
  encrypted: boolean;
  payload: unknown;
  signature?: string; // Message authentication
}

export enum P2PMessageType {
  DISCOVERY_ANNOUNCE = 'discovery_announce',
  DISCOVERY_RESPONSE = 'discovery_response',
  HANDSHAKE_INIT = 'handshake_init',
  HANDSHAKE_RESPONSE = 'handshake_response',
  HANDSHAKE_COMPLETE = 'handshake_complete',
  TRUST_REQUEST = 'trust_request',
  TRUST_ACCEPT = 'trust_accept',
  TRUST_REJECT = 'trust_reject',
  SYNC_REQUEST = 'sync_request',
  SYNC_DATA = 'sync_data',
  SYNC_ACK = 'sync_ack',
  CONFLICT_NOTIFICATION = 'conflict_notification',
  DEVICE_REVOKE = 'device_revoke',
}

export interface P2PKeyPair {
  keyId: string;
  publicKey: string;
  privateKey: string; // Encrypted with device key
  algorithm: 'ECDH-P256' | 'X25519';
  createdAt: number;
  expiresAt?: number;
}

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android';
  publicKey: string;
  sharedSecret: string; // Encrypted derived key for this device pair
  trustLevel: 'pending' | 'trusted' | 'revoked';
  trustedAt?: number;
  revokedAt?: number;
  lastSeenAt: number;
  syncVersion: number; // For conflict resolution
}

export interface SyncSession {
  sessionId: string;
  withDeviceId: string;
  status: 'initiating' | 'active' | 'completed' | 'failed';
  direction: 'send' | 'receive' | 'bidirectional';
  startedAt: number;
  completedAt?: number;
  dataTransferred: number; // bytes
  conflictsDetected: number;
}

export interface P2PSyncData {
  dataType: 'cycle_data' | 'user_prefs' | 'device_settings';
  version: number;
  deviceId: string;
  lastModified: number;
  checksum: string; // For integrity verification
  encryptedPayload: CryptoEnvelope; // Data encrypted with P2P keys
}

export interface ConflictResolution {
  conflictId: string;
  dataType: string;
  localVersion: number;
  remoteVersion: number;
  localDeviceId: string;
  remoteDeviceId: string;
  localData: unknown;
  remoteData: unknown;
  resolution: 'local_wins' | 'remote_wins' | 'manual' | 'merge';
  resolvedAt?: number;
  resolvedBy?: string; // Device that resolved
}

export interface P2PConnectionConfig {
  discoveryPort: number;
  dataPort: number;
  discoveryInterval: number; // ms
  handshakeTimeout: number; // ms
  syncTimeout: number; // ms
  maxConnections: number;
  enableMulticast: boolean;
  requireManualTrust: boolean;
}

export interface P2PSyncStatus {
  isEnabled: boolean;
  isDiscovering: boolean;
  connectedDevices: string[]; // device IDs
  pendingTrust: string[]; // device IDs awaiting trust
  lastSyncAt?: number;
  syncInProgress: boolean;
  errors: P2PSyncError[];
}

export interface P2PSyncError {
  errorId: string;
  type: 'network' | 'crypto' | 'protocol' | 'trust' | 'data';
  message: string;
  deviceId?: string;
  timestamp: number;
  resolved: boolean;
}

export interface P2PAuditLog {
  logId: string;
  timestamp: number;
  operation: 'discovery' | 'handshake' | 'trust' | 'sync' | 'revoke';
  deviceId: string;
  success: boolean;
  dataSize?: number; // bytes transferred (no content)
  error?: string;
}

// Synchronization Status Monitoring Types (Task 5)

export interface SyncStatusDetails {
  readonly deviceId: string;
  readonly status: 'synced' | 'syncing' | 'pending' | 'error' | 'offline';
  readonly lastSyncTime: Date | null;
  readonly progress: number; // 0-100
  readonly pendingOperations: number;
  readonly error: SyncErrorDetails | null;
}

export interface SyncErrorDetails {
  readonly code: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly retryCount: number;
  readonly recoverable: boolean;
  readonly category: 'network' | 'crypto' | 'data' | 'permission' | 'storage';
}

export interface DeviceSyncState {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: 'ios' | 'android' | 'web';
  readonly isOnline: boolean;
  readonly lastSeen: Date;
  readonly syncStatus: SyncStatusDetails;
  readonly dataConsistency: ConsistencyState;
  readonly networkCondition: NetworkCondition;
}

export interface ConsistencyState {
  readonly isConsistent: boolean;
  readonly lastVerified: Date;
  readonly inconsistencies: InconsistencyReport[];
  readonly verificationProgress: number; // 0-100
  readonly recordsChecked: number;
  readonly totalRecords: number;
}

export interface InconsistencyReport {
  readonly recordId: string;
  readonly recordType: 'cycle_data' | 'user_prefs' | 'device_keys';
  readonly conflictType: 'version_mismatch' | 'data_corruption' | 'missing_record';
  readonly timestamp: Date;
  readonly affectedDevices: string[];
  readonly severity: 'low' | 'medium' | 'high';
  readonly autoResolvable: boolean;
}

export interface SyncProgress {
  readonly sessionId: string;
  readonly totalOperations: number;
  readonly completedOperations: number;
  readonly currentOperation: string;
  readonly operationType: 'upload' | 'download' | 'verify' | 'resolve';
  readonly estimatedTimeRemaining: number; // milliseconds
  readonly dataTransferred: number; // bytes
  readonly totalDataSize: number; // bytes
  readonly currentFileIndex: number;
  readonly totalFiles: number;
  readonly speed: number; // bytes per second
}

export interface SyncNotification {
  readonly id: string;
  readonly type: 'success' | 'warning' | 'error' | 'info';
  readonly title: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly deviceId?: string;
  readonly action?: {
    readonly label: string;
    readonly handler: () => void;
  };
  readonly dismissible: boolean;
  readonly autoHide: boolean;
  readonly priority: 'high' | 'medium' | 'low';
  readonly category: 'sync' | 'conflict' | 'network' | 'security';
}

export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelay: number; // milliseconds
  readonly maxDelay: number; // milliseconds
  readonly backoffFactor: number;
  readonly jitterFactor: number; // 0-1
  readonly retryableErrors: string[]; // error codes that can be retried
}

export interface NetworkCondition {
  readonly type: 'wifi' | 'cellular' | 'ethernet' | 'offline';
  readonly quality: 'excellent' | 'good' | 'poor' | 'unusable';
  readonly bandwidth: number; // Mbps
  readonly latency: number; // milliseconds
  readonly isMetered: boolean;
  readonly isReachable: boolean;
  readonly lastChecked: Date;
}

// Status monitoring callback types
export type SyncStatusListener = (status: SyncStatusDetails) => void;
export type DeviceStateListener = (devices: DeviceSyncState[]) => void;
export type SyncProgressListener = (progress: SyncProgress) => void;
export type SyncNotificationListener = (notification: SyncNotification) => void;
export type NetworkConditionListener = (condition: NetworkCondition) => void;
export type ConsistencyCheckListener = (result: ConsistencyCheckResult) => void;

// Operation result types
export interface SyncOperationResult {
  readonly success: boolean;
  readonly error?: SyncErrorDetails;
  readonly syncedRecords: number;
  readonly conflicts: number;
  readonly duration: number; // milliseconds
  readonly bytesTransferred: number;
  readonly retryAttempts: number;
}

export interface ConsistencyCheckResult {
  readonly isConsistent: boolean;
  readonly checkedRecords: number;
  readonly inconsistencies: InconsistencyReport[];
  readonly duration: number; // milliseconds
  readonly devicesCovered: string[];
  readonly completionPercentage: number;
}

// Event types for sync monitoring
export interface SyncEvent {
  readonly type:
    | 'sync_started'
    | 'sync_progress'
    | 'sync_completed'
    | 'sync_failed'
    | 'conflict_detected'
    | 'device_connected'
    | 'device_disconnected'
    | 'consistency_check_started'
    | 'consistency_check_completed';
  readonly deviceId: string;
  readonly timestamp: Date;
  readonly sessionId?: string;
  readonly data: any;
  readonly priority: 'high' | 'medium' | 'low';
}

// Configuration types
export interface SyncMonitoringConfig {
  readonly updateInterval: number; // milliseconds
  readonly consistencyCheckInterval: number; // milliseconds
  readonly progressUpdateInterval: number; // milliseconds
  readonly maxNotifications: number;
  readonly enableDetailedLogging: boolean;
  readonly retryConfig: RetryConfig;
  readonly networkCheckInterval: number; // milliseconds
  readonly enableRealTimeUpdates: boolean;
  readonly notificationThreshold: {
    readonly errorCount: number;
    readonly slowSyncDuration: number; // milliseconds
    readonly lowDataConsistency: number; // percentage
  };
}
