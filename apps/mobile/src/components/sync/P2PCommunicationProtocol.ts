/**
 * P2P Communication Protocol
 *
 * Implements device-to-device communication protocol using separate
 * encryption keys isolated from primary data encryption.
 *
 * SECURITY: P2P keys are completely separate from data encryption keys
 * PRIVACY: No plaintext health data transmitted
 * ISOLATION: P2P crypto operations use dedicated key space
 */

import { EventEmitter } from 'events';
import {
  DeviceInfo,
  P2PMessage,
  P2PMessageType,
  P2PKeyPair,
  TrustedDevice,
  P2PSyncData,
  P2PConnectionConfig,
  P2PSyncStatus,
  P2PSyncError,
  P2PAuditLog,
} from './types';

export class P2PCommunicationProtocol extends EventEmitter {
  private deviceId: string;
  private deviceName: string;
  private platform: 'ios' | 'android';
  private p2pKeyPair: P2PKeyPair | null = null;
  private trustedDevices: Map<string, TrustedDevice> = new Map();
  private activeSessions: Map<string, any> = new Map();
  private config: P2PConnectionConfig;
  private status: P2PSyncStatus;
  private auditLogs: P2PAuditLog[] = [];

  constructor(
    deviceId: string,
    deviceName: string,
    platform: 'ios' | 'android',
    config: Partial<P2PConnectionConfig> = {}
  ) {
    super();

    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.platform = platform;

    this.config = {
      discoveryPort: 8765,
      dataPort: 8766,
      discoveryInterval: 5000,
      handshakeTimeout: 30000,
      syncTimeout: 300000,
      maxConnections: 5,
      enableMulticast: true,
      requireManualTrust: true,
      ...config,
    };

    this.status = {
      isEnabled: false,
      isDiscovering: false,
      connectedDevices: [],
      pendingTrust: [],
      syncInProgress: false,
      errors: [],
    };
  }

  /**
   * Initialize P2P communication protocol
   * Generates P2P key pair separate from data encryption keys
   */
  async initialize(): Promise<void> {
    try {
      await this.generateP2PKeyPair();
      await this.loadTrustedDevices();
      this.status.isEnabled = true;

      this.addAuditLog({
        operation: 'discovery',
        deviceId: this.deviceId,
        success: true,
      });

      this.emit('initialized');
    } catch (error) {
      const syncError: P2PSyncError = {
        errorId: this.generateId(),
        type: 'crypto',
        message: `P2P initialization failed: ${error.message}`,
        timestamp: Date.now(),
        resolved: false,
      };

      this.status.errors.push(syncError);
      this.emit('error', syncError);
      throw error;
    }
  }

  /**
   * Generate P2P key pair isolated from primary encryption
   * Uses separate key derivation for device-to-device communication
   */
  private async generateP2PKeyPair(): Promise<void> {
    // CRITICAL: P2P keys must be completely isolated from primary data keys
    // Use separate crypto context for P2P operations

    const keyId = this.generateId();

    // In real implementation, this would use crypto-core WASM module
    // with separate key derivation path for P2P operations
    const mockKeyPair = {
      keyId,
      publicKey: `p2p_public_${keyId}`,
      privateKey: `p2p_private_${keyId}`, // Would be encrypted with device key
      algorithm: 'ECDH-P256' as const,
      createdAt: Date.now(),
    };

    this.p2pKeyPair = mockKeyPair;

    // Store P2P key pair in separate secure storage
    await this.storeP2PKeyPair(mockKeyPair);
  }

  /**
   * Start device discovery on local network
   * Announces this device for P2P synchronization
   */
  async startDiscovery(): Promise<void> {
    if (!this.status.isEnabled || !this.p2pKeyPair) {
      throw new Error('P2P protocol not initialized');
    }

    this.status.isDiscovering = true;

    const deviceInfo: DeviceInfo = {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      platform: this.platform,
      appVersion: '1.0.0', // From app config
      protocolVersion: '1.0',
      publicKey: this.p2pKeyPair.publicKey,
      discoveredAt: Date.now(),
    };

    // Start multicast discovery
    this.startMulticastAnnouncement(deviceInfo);

    this.addAuditLog({
      operation: 'discovery',
      deviceId: this.deviceId,
      success: true,
    });

    this.emit('discoveryStarted');
  }

  /**
   * Stop device discovery
   */
  stopDiscovery(): void {
    this.status.isDiscovering = false;
    this.emit('discoveryStopped');
  }

  /**
   * Handle discovered device
   * Initiates trust verification process
   */
  private async handleDiscoveredDevice(deviceInfo: DeviceInfo): Promise<void> {
    if (deviceInfo.deviceId === this.deviceId) {
      return; // Ignore self
    }

    const existingDevice = this.trustedDevices.get(deviceInfo.deviceId);

    if (existingDevice?.trustLevel === 'revoked') {
      return; // Ignore revoked devices
    }

    if (!existingDevice) {
      // New device discovered
      const newDevice: TrustedDevice = {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        platform: deviceInfo.platform,
        publicKey: deviceInfo.publicKey,
        sharedSecret: '', // Will be derived during handshake
        trustLevel: 'pending',
        lastSeenAt: Date.now(),
        syncVersion: 0,
      };

      this.trustedDevices.set(deviceInfo.deviceId, newDevice);
      this.status.pendingTrust.push(deviceInfo.deviceId);

      this.emit('deviceDiscovered', deviceInfo);
    } else {
      // Update last seen for known device
      existingDevice.lastSeenAt = Date.now();
    }
  }

  /**
   * Initiate handshake with discovered device
   * Establishes shared secret for encrypted communication
   */
  async initiateHandshake(targetDeviceId: string): Promise<void> {
    const device = this.trustedDevices.get(targetDeviceId);
    if (!device) {
      throw new Error('Device not found in trusted devices');
    }

    if (!this.p2pKeyPair) {
      throw new Error('P2P key pair not initialized');
    }

    try {
      // Generate ephemeral key for this session
      const ephemeralKey = await this.generateEphemeralKey();

      const handshakeMessage: P2PMessage = {
        messageId: this.generateId(),
        type: P2PMessageType.HANDSHAKE_INIT,
        fromDeviceId: this.deviceId,
        toDeviceId: targetDeviceId,
        timestamp: Date.now(),
        encrypted: false, // Initial handshake not encrypted
        payload: {
          publicKey: this.p2pKeyPair.publicKey,
          ephemeralKey: ephemeralKey.publicKey,
          deviceInfo: {
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            platform: this.platform,
          },
        },
      };

      await this.sendMessage(handshakeMessage);

      this.addAuditLog({
        operation: 'handshake',
        deviceId: targetDeviceId,
        success: true,
      });
    } catch (error) {
      this.addSyncError('crypto', `Handshake failed: ${error.message}`, targetDeviceId);
      throw error;
    }
  }

  /**
   * Request trust from user for discovered device
   * Implements manual trust verification for security
   */
  async requestDeviceTrust(deviceId: string): Promise<boolean> {
    const device = this.trustedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Emit trust request for UI handling
    return new Promise(resolve => {
      this.emit('trustRequest', device, (approved: boolean) => {
        if (approved) {
          device.trustLevel = 'trusted';
          device.trustedAt = Date.now();
          this.status.pendingTrust = this.status.pendingTrust.filter(id => id !== deviceId);
          this.status.connectedDevices.push(deviceId);

          this.addAuditLog({
            operation: 'trust',
            deviceId,
            success: true,
          });
        } else {
          device.trustLevel = 'revoked';
          device.revokedAt = Date.now();
          this.status.pendingTrust = this.status.pendingTrust.filter(id => id !== deviceId);
        }

        this.saveTrustedDevices();
        resolve(approved);
      });
    });
  }

  /**
   * Revoke trust for a device
   * Removes device from trusted list and clears shared secrets
   */
  async revokeDeviceTrust(deviceId: string): Promise<void> {
    const device = this.trustedDevices.get(deviceId);
    if (!device) {
      return;
    }

    device.trustLevel = 'revoked';
    device.revokedAt = Date.now();

    // Clear shared secret
    device.sharedSecret = '';

    // Remove from active connections
    this.status.connectedDevices = this.status.connectedDevices.filter(id => id !== deviceId);

    // Send revocation message if connected
    if (this.activeSessions.has(deviceId)) {
      const revokeMessage: P2PMessage = {
        messageId: this.generateId(),
        type: P2PMessageType.DEVICE_REVOKE,
        fromDeviceId: this.deviceId,
        toDeviceId: deviceId,
        timestamp: Date.now(),
        encrypted: true,
        payload: { reason: 'Trust revoked by user' },
      };

      await this.sendEncryptedMessage(revokeMessage, device.sharedSecret);
      this.activeSessions.delete(deviceId);
    }

    await this.saveTrustedDevices();

    this.addAuditLog({
      operation: 'revoke',
      deviceId,
      success: true,
    });

    this.emit('deviceRevoked', deviceId);
  }

  /**
   * Send encrypted sync data to trusted device
   * Uses P2P shared secret for encryption
   */
  async sendSyncData(deviceId: string, syncData: P2PSyncData): Promise<void> {
    const device = this.trustedDevices.get(deviceId);
    if (!device || device.trustLevel !== 'trusted') {
      throw new Error('Device not trusted for sync operations');
    }

    try {
      const syncMessage: P2PMessage = {
        messageId: this.generateId(),
        type: P2PMessageType.SYNC_DATA,
        fromDeviceId: this.deviceId,
        toDeviceId: deviceId,
        timestamp: Date.now(),
        encrypted: true,
        payload: syncData,
      };

      await this.sendEncryptedMessage(syncMessage, device.sharedSecret);

      this.addAuditLog({
        operation: 'sync',
        deviceId,
        success: true,
        dataSize: JSON.stringify(syncData).length,
      });
    } catch (error) {
      this.addSyncError('data', `Sync data transmission failed: ${error.message}`, deviceId);
      throw error;
    }
  }

  /**
   * Get current P2P synchronization status
   */
  getStatus(): P2PSyncStatus {
    return { ...this.status };
  }

  /**
   * Get list of trusted devices
   */
  getTrustedDevices(): TrustedDevice[] {
    return Array.from(this.trustedDevices.values()).filter(
      device => device.trustLevel === 'trusted'
    );
  }

  /**
   * Get audit logs for sync operations
   * Returns privacy-safe logs without content
   */
  getAuditLogs(limit: number = 100): P2PAuditLog[] {
    return this.auditLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Private helper methods

  private async generateEphemeralKey(): Promise<{ publicKey: string; privateKey: string }> {
    // Generate ephemeral key pair for session
    const keyId = this.generateId();
    return {
      publicKey: `ephemeral_public_${keyId}`,
      privateKey: `ephemeral_private_${keyId}`,
    };
  }

  private async storeP2PKeyPair(keyPair: P2PKeyPair): Promise<void> {
    // Store in secure device storage, separate from data encryption keys
    // Implementation would use secure enclave/keychain
  }

  private async loadTrustedDevices(): Promise<void> {
    // Load trusted devices from secure storage
    // Implementation would decrypt and load saved trust relationships
  }

  private async saveTrustedDevices(): Promise<void> {
    // Save trusted devices to secure storage
    // Implementation would encrypt and persist trust data
  }

  private startMulticastAnnouncement(deviceInfo: DeviceInfo): void {
    // Start multicast UDP announcement for device discovery
    // Implementation would use React Native networking
  }

  private async sendMessage(message: P2PMessage): Promise<void> {
    // Send unencrypted message (for handshake)
    // Implementation would use TCP/UDP networking
  }

  private async sendEncryptedMessage(message: P2PMessage, sharedSecret: string): Promise<void> {
    // Encrypt and send message using shared secret
    // Implementation would use crypto-core for encryption
  }

  private addSyncError(type: P2PSyncError['type'], message: string, deviceId?: string): void {
    const error: P2PSyncError = {
      errorId: this.generateId(),
      type,
      message,
      deviceId,
      timestamp: Date.now(),
      resolved: false,
    };

    this.status.errors.push(error);
    this.emit('syncError', error);
  }

  private addAuditLog(log: Omit<P2PAuditLog, 'logId' | 'timestamp'>): void {
    const auditLog: P2PAuditLog = {
      logId: this.generateId(),
      timestamp: Date.now(),
      ...log,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
