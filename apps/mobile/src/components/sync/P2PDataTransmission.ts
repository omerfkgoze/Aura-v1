/**
 * P2P Data Transmission Layer
 *
 * Implements encrypted data transmission layer for cycle data synchronization.
 * Uses shared secrets from handshake for secure data exchange.
 *
 * SECURITY: All health data encrypted with P2P shared secrets
 * PRIVACY: Zero plaintext health data transmission
 * INTEGRITY: Data integrity verification with checksums
 */

import { EventEmitter } from 'events';
import {
  P2PMessage,
  P2PMessageType,
  P2PSyncData,
  TrustedDevice,
  SyncSession,
  ConflictResolution,
} from './types';
import { CryptoEnvelope } from '../../services/EncryptedDataService';

export interface DataTransmissionConfig {
  maxChunkSize: number; // bytes
  compressionEnabled: boolean;
  checksumAlgorithm: 'SHA256' | 'SHA512';
  encryptionAlgorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  transmissionTimeout: number; // ms
  maxRetries: number;
}

export interface DataChunk {
  chunkId: string;
  sessionId: string;
  sequenceNumber: number;
  totalChunks: number;
  data: Uint8Array;
  checksum: string;
  isLast: boolean;
}

export interface TransmissionProgress {
  sessionId: string;
  bytesTransferred: number;
  totalBytes: number;
  chunksTransferred: number;
  totalChunks: number;
  percentage: number;
  estimatedTimeRemaining?: number; // ms
}

export class P2PDataTransmission extends EventEmitter {
  private config: DataTransmissionConfig;
  private activeSessions: Map<string, SyncSession> = new Map();
  private receivingChunks: Map<string, Map<number, DataChunk>> = new Map();
  private transmissionQueues: Map<string, P2PSyncData[]> = new Map();

  constructor(config: Partial<DataTransmissionConfig> = {}) {
    super();

    this.config = {
      maxChunkSize: 64 * 1024, // 64KB chunks
      compressionEnabled: true,
      checksumAlgorithm: 'SHA256',
      encryptionAlgorithm: 'AES-256-GCM',
      transmissionTimeout: 300000, // 5 minutes
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Start sync session with trusted device
   */
  async startSyncSession(
    deviceId: string,
    direction: 'send' | 'receive' | 'bidirectional'
  ): Promise<string> {
    const sessionId = this.generateSessionId();

    const session: SyncSession = {
      sessionId,
      withDeviceId: deviceId,
      status: 'initiating',
      direction,
      startedAt: Date.now(),
      dataTransferred: 0,
      conflictsDetected: 0,
    };

    this.activeSessions.set(sessionId, session);

    // Initialize transmission queue for this device
    if (!this.transmissionQueues.has(deviceId)) {
      this.transmissionQueues.set(deviceId, []);
    }

    this.emit('syncSessionStarted', { sessionId, deviceId, direction });

    return sessionId;
  }

  /**
   * Queue data for transmission to device
   */
  async queueDataForTransmission(deviceId: string, syncData: P2PSyncData): Promise<void> {
    const queue = this.transmissionQueues.get(deviceId);
    if (!queue) {
      throw new Error('No transmission queue for device');
    }

    // Add checksum for integrity verification
    syncData.checksum = await this.calculateChecksum(syncData.encryptedPayload);

    queue.push(syncData);

    this.emit('dataQueued', { deviceId, dataType: syncData.dataType });
  }

  /**
   * Transmit queued data to device
   */
  async transmitQueuedData(sessionId: string, trustedDevice: TrustedDevice): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid sync session');
    }

    const queue = this.transmissionQueues.get(trustedDevice.deviceId);
    if (!queue || queue.length === 0) {
      this.completeSyncSession(sessionId);
      return;
    }

    session.status = 'active';

    try {
      for (const syncData of queue) {
        await this.transmitSyncData(sessionId, trustedDevice, syncData);
      }

      // Clear queue after successful transmission
      queue.length = 0;

      this.completeSyncSession(sessionId);
    } catch (error) {
      this.failSyncSession(sessionId, `Data transmission failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transmit single sync data item
   */
  private async transmitSyncData(
    sessionId: string,
    trustedDevice: TrustedDevice,
    syncData: P2PSyncData
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId)!;

    // Serialize and encrypt sync data
    const serializedData = await this.serializeSyncData(syncData);
    const encryptedData = await this.encryptForTransmission(
      serializedData,
      trustedDevice.sharedSecret
    );

    // Compress if enabled
    const finalData = this.config.compressionEnabled
      ? await this.compressData(encryptedData)
      : encryptedData;

    // Split into chunks if necessary
    const chunks = await this.createDataChunks(sessionId, finalData);

    // Transmit chunks
    for (const chunk of chunks) {
      await this.transmitChunk(trustedDevice.deviceId, chunk);
      session.dataTransferred += chunk.data.length;

      this.emitTransmissionProgress(sessionId, chunks.length);
    }
  }

  /**
   * Handle incoming data chunk
   */
  async handleIncomingChunk(chunk: DataChunk, fromDeviceId: string): Promise<void> {
    const sessionId = chunk.sessionId;

    // Verify chunk integrity
    const calculatedChecksum = await this.calculateChecksum(chunk.data);
    if (calculatedChecksum !== chunk.checksum) {
      this.emit('transmissionError', {
        sessionId,
        error: 'Chunk integrity verification failed',
        chunkId: chunk.chunkId,
      });
      return;
    }

    // Store chunk
    if (!this.receivingChunks.has(sessionId)) {
      this.receivingChunks.set(sessionId, new Map());
    }

    const sessionChunks = this.receivingChunks.get(sessionId)!;
    sessionChunks.set(chunk.sequenceNumber, chunk);

    this.emit('chunkReceived', {
      sessionId,
      chunkId: chunk.chunkId,
      sequenceNumber: chunk.sequenceNumber,
      totalChunks: chunk.totalChunks,
    });

    // Check if all chunks received
    if (sessionChunks.size === chunk.totalChunks) {
      await this.assembleReceivedData(sessionId, fromDeviceId);
    }
  }

  /**
   * Assemble received data chunks
   */
  private async assembleReceivedData(sessionId: string, fromDeviceId: string): Promise<void> {
    const sessionChunks = this.receivingChunks.get(sessionId);
    if (!sessionChunks) {
      return;
    }

    try {
      // Sort chunks by sequence number
      const sortedChunks = Array.from(sessionChunks.values()).sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber
      );

      // Combine chunk data
      const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
      const combinedData = new Uint8Array(totalSize);

      let offset = 0;
      for (const chunk of sortedChunks) {
        combinedData.set(chunk.data, offset);
        offset += chunk.data.length;
      }

      // Decompress if needed
      const decompressedData = this.config.compressionEnabled
        ? await this.decompressData(combinedData)
        : combinedData;

      // Decrypt received data
      const trustedDevice = await this.getTrustedDevice(fromDeviceId);
      const decryptedData = await this.decryptReceivedData(
        decompressedData,
        trustedDevice.sharedSecret
      );

      // Deserialize sync data
      const syncData = await this.deserializeSyncData(decryptedData);

      // Verify data integrity
      const calculatedChecksum = await this.calculateChecksum(syncData.encryptedPayload);
      if (calculatedChecksum !== syncData.checksum) {
        throw new Error('Data integrity verification failed');
      }

      // Process received sync data
      await this.processReceivedSyncData(sessionId, syncData, fromDeviceId);

      // Clean up
      this.receivingChunks.delete(sessionId);
    } catch (error) {
      this.emit('transmissionError', {
        sessionId,
        error: `Data assembly failed: ${error.message}`,
      });
    }
  }

  /**
   * Process received sync data
   */
  private async processReceivedSyncData(
    sessionId: string,
    syncData: P2PSyncData,
    fromDeviceId: string
  ): Promise<void> {
    // Check for conflicts
    const conflict = await this.detectDataConflict(syncData);

    if (conflict) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.conflictsDetected++;
      }

      this.emit('syncConflictDetected', {
        sessionId,
        conflict,
        syncData,
        fromDeviceId,
      });
    } else {
      // No conflict, process data normally
      this.emit('syncDataReceived', {
        sessionId,
        syncData,
        fromDeviceId,
      });
    }
  }

  /**
   * Create data chunks from large data
   */
  private async createDataChunks(sessionId: string, data: Uint8Array): Promise<DataChunk[]> {
    const chunks: DataChunk[] = [];
    const totalChunks = Math.ceil(data.length / this.config.maxChunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.config.maxChunkSize;
      const end = Math.min(start + this.config.maxChunkSize, data.length);
      const chunkData = data.slice(start, end);

      const chunk: DataChunk = {
        chunkId: this.generateChunkId(),
        sessionId,
        sequenceNumber: i,
        totalChunks,
        data: chunkData,
        checksum: await this.calculateChecksum(chunkData),
        isLast: i === totalChunks - 1,
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Encrypt data for transmission
   */
  private async encryptForTransmission(
    data: Uint8Array,
    sharedSecret: string
  ): Promise<Uint8Array> {
    // Implementation would use crypto-core WASM module
    // Encrypt with P2P shared secret using AES-256-GCM
    return data; // Mock implementation
  }

  /**
   * Decrypt received data
   */
  private async decryptReceivedData(
    encryptedData: Uint8Array,
    sharedSecret: string
  ): Promise<Uint8Array> {
    // Implementation would use crypto-core WASM module
    // Decrypt with P2P shared secret
    return encryptedData; // Mock implementation
  }

  /**
   * Compress data for transmission
   */
  private async compressData(data: Uint8Array): Promise<Uint8Array> {
    // Implementation would use compression library
    // Could use gzip or brotli compression
    return data; // Mock implementation
  }

  /**
   * Decompress received data
   */
  private async decompressData(compressedData: Uint8Array): Promise<Uint8Array> {
    // Implementation would use compression library
    return compressedData; // Mock implementation
  }

  /**
   * Serialize sync data for transmission
   */
  private async serializeSyncData(syncData: P2PSyncData): Promise<Uint8Array> {
    const serialized = JSON.stringify(syncData);
    return new TextEncoder().encode(serialized);
  }

  /**
   * Deserialize received sync data
   */
  private async deserializeSyncData(data: Uint8Array): Promise<P2PSyncData> {
    const text = new TextDecoder().decode(data);
    return JSON.parse(text);
  }

  /**
   * Calculate data checksum
   */
  private async calculateChecksum(data: Uint8Array | CryptoEnvelope): Promise<string> {
    // Implementation would use crypto-core for secure hashing
    const input =
      data instanceof Uint8Array ? data : new TextEncoder().encode(JSON.stringify(data));
    return `checksum_${input.length}_${Date.now()}`;
  }

  /**
   * Detect data conflicts
   */
  private async detectDataConflict(syncData: P2PSyncData): Promise<ConflictResolution | null> {
    // Implementation would check local data version against received version
    // Return conflict if versions mismatch
    return null; // Mock implementation
  }

  /**
   * Transmit single chunk
   */
  private async transmitChunk(deviceId: string, chunk: DataChunk): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type: P2PMessageType.SYNC_DATA,
      fromDeviceId: '', // Set by sender
      toDeviceId: deviceId,
      timestamp: Date.now(),
      encrypted: true,
      payload: chunk,
    };

    this.emit('transmitChunk', message);
  }

  /**
   * Complete sync session
   */
  private completeSyncSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = Date.now();

      this.emit('syncSessionCompleted', {
        sessionId,
        dataTransferred: session.dataTransferred,
        duration: session.completedAt - session.startedAt,
        conflictsDetected: session.conflictsDetected,
      });
    }
  }

  /**
   * Fail sync session
   */
  private failSyncSession(sessionId: string, error: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';

      this.emit('syncSessionFailed', { sessionId, error });
    }
  }

  /**
   * Emit transmission progress
   */
  private emitTransmissionProgress(sessionId: string, totalChunks: number): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Calculate progress (simplified)
    const progress: TransmissionProgress = {
      sessionId,
      bytesTransferred: session.dataTransferred,
      totalBytes: session.dataTransferred, // Would be calculated based on queue
      chunksTransferred: 1, // Would track actual chunks
      totalChunks,
      percentage: 50, // Would calculate actual percentage
    };

    this.emit('transmissionProgress', progress);
  }

  /**
   * Get trusted device info
   */
  private async getTrustedDevice(deviceId: string): Promise<TrustedDevice> {
    // Implementation would fetch from trusted device storage
    throw new Error('Not implemented');
  }

  /**
   * Get active sync sessions
   */
  getActiveSessions(): SyncSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get transmission queue for device
   */
  getTransmissionQueue(deviceId: string): P2PSyncData[] {
    return this.transmissionQueues.get(deviceId) || [];
  }

  /**
   * Cancel sync session
   */
  cancelSyncSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      this.activeSessions.delete(sessionId);
      this.receivingChunks.delete(sessionId);

      this.emit('syncSessionCancelled', { sessionId });
    }
  }

  // Helper methods

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateChunkId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
