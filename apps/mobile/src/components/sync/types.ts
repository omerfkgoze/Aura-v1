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
