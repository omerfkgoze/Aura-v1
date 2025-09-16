/**
 * Device Trust Manager
 *
 * Implements device trust management and revocation capabilities.
 * Manages trusted device relationships with manual verification and security controls.
 *
 * SECURITY: Manual trust verification required
 * PRIVACY: No sensitive data in trust metadata
 * REVOCATION: Immediate trust revocation and key cleanup
 */

import { EventEmitter } from 'events';
import { TrustedDevice, DeviceInfo, P2PAuditLog, P2PMessage, P2PMessageType } from './types';

export interface TrustRequest {
  requestId: string;
  deviceInfo: DeviceInfo;
  requestedAt: number;
  expiresAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  userPrompted: boolean;
  securityScore: number; // Risk assessment score
}

export interface TrustPolicy {
  requireManualApproval: boolean;
  autoExpireDays: number;
  maxTrustedDevices: number;
  requireDeviceFingerprint: boolean;
  allowCrossplatform: boolean;
  securityThreshold: number; // Minimum security score
}

export interface RevocationReason {
  reason: 'user_requested' | 'security_breach' | 'device_lost' | 'policy_violation' | 'expired';
  details?: string;
  immediate: boolean;
}

export class DeviceTrustManager extends EventEmitter {
  private trustedDevices: Map<string, TrustedDevice> = new Map();
  private trustRequests: Map<string, TrustRequest> = new Map();
  private revokedDevices: Map<string, TrustedDevice> = new Map();
  private trustPolicy: TrustPolicy;
  private auditLogs: P2PAuditLog[] = [];

  constructor(trustPolicy: Partial<TrustPolicy> = {}) {
    super();

    this.trustPolicy = {
      requireManualApproval: true,
      autoExpireDays: 90,
      maxTrustedDevices: 5,
      requireDeviceFingerprint: true,
      allowCrossplatform: true,
      securityThreshold: 7,
      ...trustPolicy,
    };
  }

  /**
   * Initialize trust manager
   * Loads trusted devices and validates existing trusts
   */
  async initialize(): Promise<void> {
    try {
      await this.loadTrustedDevices();
      await this.validateExistingTrusts();
      await this.cleanupExpiredRequests();

      this.addAuditLog({
        operation: 'trust',
        deviceId: 'system',
        success: true,
      });

      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Request trust for discovered device
   * Initiates manual trust verification process
   */
  async requestDeviceTrust(deviceInfo: DeviceInfo): Promise<string> {
    // Check if device already trusted
    const existingDevice = this.trustedDevices.get(deviceInfo.deviceId);
    if (existingDevice) {
      if (existingDevice.trustLevel === 'trusted') {
        throw new Error('Device already trusted');
      }
      if (existingDevice.trustLevel === 'revoked') {
        throw new Error('Device trust has been revoked');
      }
    }

    // Check trust policy limits
    await this.validateTrustPolicy(deviceInfo);

    // Generate trust request
    const requestId = this.generateRequestId();
    const securityScore = await this.calculateSecurityScore(deviceInfo);

    const trustRequest: TrustRequest = {
      requestId,
      deviceInfo,
      requestedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      status: 'pending',
      userPrompted: false,
      securityScore,
    };

    this.trustRequests.set(requestId, trustRequest);

    // Auto-approve if security score meets threshold and policy allows
    if (
      !this.trustPolicy.requireManualApproval &&
      securityScore >= this.trustPolicy.securityThreshold
    ) {
      await this.approveTrustRequest(requestId, 'automatic_approval');
    } else {
      // Require manual approval
      this.emit('trustRequestCreated', trustRequest);
    }

    this.addAuditLog({
      operation: 'trust',
      deviceId: deviceInfo.deviceId,
      success: true,
    });

    return requestId;
  }

  /**
   * Approve trust request
   */
  async approveTrustRequest(
    requestId: string,
    approvalMethod: 'manual' | 'automatic_approval' = 'manual'
  ): Promise<void> {
    const request = this.trustRequests.get(requestId);
    if (!request) {
      throw new Error('Trust request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Trust request not pending');
    }

    if (Date.now() > request.expiresAt) {
      request.status = 'expired';
      throw new Error('Trust request expired');
    }

    try {
      // Create trusted device entry
      const trustedDevice: TrustedDevice = {
        deviceId: request.deviceInfo.deviceId,
        deviceName: request.deviceInfo.deviceName,
        platform: request.deviceInfo.platform,
        publicKey: request.deviceInfo.publicKey,
        sharedSecret: '', // Will be set during handshake
        trustLevel: 'trusted',
        trustedAt: Date.now(),
        lastSeenAt: Date.now(),
        syncVersion: 0,
      };

      this.trustedDevices.set(request.deviceInfo.deviceId, trustedDevice);
      request.status = 'approved';

      // Save to persistent storage
      await this.saveTrustedDevices();

      this.addAuditLog({
        operation: 'trust',
        deviceId: request.deviceInfo.deviceId,
        success: true,
      });

      this.emit('deviceTrusted', {
        deviceId: request.deviceInfo.deviceId,
        approvalMethod,
        securityScore: request.securityScore,
      });

      // Send trust acceptance to device
      await this.sendTrustAcceptance(request.deviceInfo.deviceId);
    } catch (error) {
      this.addAuditLog({
        operation: 'trust',
        deviceId: request.deviceInfo.deviceId,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Reject trust request
   */
  async rejectTrustRequest(requestId: string, reason?: string): Promise<void> {
    const request = this.trustRequests.get(requestId);
    if (!request) {
      throw new Error('Trust request not found');
    }

    request.status = 'rejected';

    this.addAuditLog({
      operation: 'trust',
      deviceId: request.deviceInfo.deviceId,
      success: false,
      error: reason || 'User rejected',
    });

    this.emit('trustRequestRejected', {
      deviceId: request.deviceInfo.deviceId,
      reason,
    });

    // Send trust rejection to device
    await this.sendTrustRejection(request.deviceInfo.deviceId, reason);
  }

  /**
   * Revoke device trust
   * Immediately removes trust and cleans up keys
   */
  async revokeDeviceTrust(deviceId: string, revocationReason: RevocationReason): Promise<void> {
    const device = this.trustedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not found in trusted devices');
    }

    try {
      // Update device status
      device.trustLevel = 'revoked';
      device.revokedAt = Date.now();

      // Clear shared secret for security
      device.sharedSecret = '';

      // Move to revoked devices list
      this.revokedDevices.set(deviceId, device);
      this.trustedDevices.delete(deviceId);

      // Save changes
      await this.saveTrustedDevices();
      await this.saveRevokedDevices();

      this.addAuditLog({
        operation: 'revoke',
        deviceId,
        success: true,
      });

      // Send revocation notification if immediate
      if (revocationReason.immediate) {
        await this.sendRevocationNotification(deviceId, revocationReason);
      }

      this.emit('deviceTrustRevoked', {
        deviceId,
        reason: revocationReason.reason,
        immediate: revocationReason.immediate,
      });
    } catch (error) {
      this.addAuditLog({
        operation: 'revoke',
        deviceId,
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Update device shared secret after handshake
   */
  async updateDeviceSharedSecret(deviceId: string, sharedSecret: string): Promise<void> {
    const device = this.trustedDevices.get(deviceId);
    if (!device) {
      throw new Error('Device not trusted');
    }

    if (device.trustLevel !== 'trusted') {
      throw new Error('Device trust level not valid for secret update');
    }

    // Update shared secret
    device.sharedSecret = sharedSecret;
    device.lastSeenAt = Date.now();

    await this.saveTrustedDevices();

    this.emit('deviceSecretUpdated', { deviceId });
  }

  /**
   * Validate trust policy against new device
   */
  private async validateTrustPolicy(deviceInfo: DeviceInfo): Promise<void> {
    // Check maximum trusted devices limit
    if (this.trustedDevices.size >= this.trustPolicy.maxTrustedDevices) {
      throw new Error('Maximum trusted devices limit reached');
    }

    // Check cross-platform policy
    if (!this.trustPolicy.allowCrossplatform) {
      const currentPlatforms = new Set(
        Array.from(this.trustedDevices.values()).map(d => d.platform)
      );

      if (currentPlatforms.size > 0 && !currentPlatforms.has(deviceInfo.platform)) {
        throw new Error('Cross-platform devices not allowed by policy');
      }
    }

    // Validate device fingerprint if required
    if (this.trustPolicy.requireDeviceFingerprint) {
      if (!deviceInfo.publicKey || deviceInfo.publicKey.length === 0) {
        throw new Error('Device fingerprint required by policy');
      }
    }
  }

  /**
   * Calculate security score for device
   */
  private async calculateSecurityScore(deviceInfo: DeviceInfo): Promise<number> {
    let score = 5; // Base score

    // Platform security
    if (deviceInfo.platform === 'ios') {
      score += 2; // iOS generally more secure
    } else if (deviceInfo.platform === 'android') {
      score += 1;
    }

    // Protocol version
    if (deviceInfo.protocolVersion === '1.0') {
      score += 1;
    }

    // Public key present
    if (deviceInfo.publicKey && deviceInfo.publicKey.length > 0) {
      score += 2;
    }

    // App version (would validate against known versions)
    if (deviceInfo.appVersion) {
      score += 1;
    }

    return Math.min(score, 10); // Max score of 10
  }

  /**
   * Validate existing trusted devices
   */
  private async validateExistingTrusts(): Promise<void> {
    const now = Date.now();
    const expireTime = this.trustPolicy.autoExpireDays * 24 * 60 * 60 * 1000;

    for (const [deviceId, device] of this.trustedDevices.entries()) {
      // Check if trust has expired
      if (device.trustedAt && now - device.trustedAt > expireTime) {
        await this.revokeDeviceTrust(deviceId, {
          reason: 'expired',
          details: 'Trust period expired',
          immediate: false,
        });
        continue;
      }

      // Validate device data integrity
      if (!device.publicKey || !device.deviceName) {
        await this.revokeDeviceTrust(deviceId, {
          reason: 'policy_violation',
          details: 'Invalid device data',
          immediate: true,
        });
      }
    }
  }

  /**
   * Clean up expired trust requests
   */
  private async cleanupExpiredRequests(): Promise<void> {
    const now = Date.now();

    for (const [requestId, request] of this.trustRequests.entries()) {
      if (now > request.expiresAt && request.status === 'pending') {
        request.status = 'expired';
        this.emit('trustRequestExpired', { requestId, deviceId: request.deviceInfo.deviceId });
      }
    }
  }

  /**
   * Send trust acceptance message
   */
  private async sendTrustAcceptance(deviceId: string): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type: P2PMessageType.TRUST_ACCEPT,
      fromDeviceId: '', // Set by sender
      toDeviceId: deviceId,
      timestamp: Date.now(),
      encrypted: false,
      payload: {
        message: 'Device trust approved',
        trustLevel: 'trusted',
      },
    };

    this.emit('sendTrustMessage', message);
  }

  /**
   * Send trust rejection message
   */
  private async sendTrustRejection(deviceId: string, reason?: string): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type: P2PMessageType.TRUST_REJECT,
      fromDeviceId: '', // Set by sender
      toDeviceId: deviceId,
      timestamp: Date.now(),
      encrypted: false,
      payload: {
        message: 'Device trust rejected',
        reason: reason || 'User declined',
      },
    };

    this.emit('sendTrustMessage', message);
  }

  /**
   * Send revocation notification
   */
  private async sendRevocationNotification(
    deviceId: string,
    revocationReason: RevocationReason
  ): Promise<void> {
    const message: P2PMessage = {
      messageId: this.generateMessageId(),
      type: P2PMessageType.DEVICE_REVOKE,
      fromDeviceId: '', // Set by sender
      toDeviceId: deviceId,
      timestamp: Date.now(),
      encrypted: false,
      payload: {
        message: 'Device trust revoked',
        reason: revocationReason.reason,
        details: revocationReason.details,
        immediate: revocationReason.immediate,
      },
    };

    this.emit('sendTrustMessage', message);
  }

  // Public getters

  /**
   * Get all trusted devices
   */
  getTrustedDevices(): TrustedDevice[] {
    return Array.from(this.trustedDevices.values()).filter(
      device => device.trustLevel === 'trusted'
    );
  }

  /**
   * Get specific trusted device
   */
  getTrustedDevice(deviceId: string): TrustedDevice | null {
    const device = this.trustedDevices.get(deviceId);
    return device?.trustLevel === 'trusted' ? device : null;
  }

  /**
   * Get pending trust requests
   */
  getPendingTrustRequests(): TrustRequest[] {
    return Array.from(this.trustRequests.values()).filter(
      request => request.status === 'pending' && Date.now() <= request.expiresAt
    );
  }

  /**
   * Get revoked devices
   */
  getRevokedDevices(): TrustedDevice[] {
    return Array.from(this.revokedDevices.values());
  }

  /**
   * Check if device is trusted
   */
  isDeviceTrusted(deviceId: string): boolean {
    const device = this.trustedDevices.get(deviceId);
    return device?.trustLevel === 'trusted' || false;
  }

  /**
   * Get trust policy
   */
  getTrustPolicy(): TrustPolicy {
    return { ...this.trustPolicy };
  }

  /**
   * Update trust policy
   */
  async updateTrustPolicy(updates: Partial<TrustPolicy>): Promise<void> {
    this.trustPolicy = { ...this.trustPolicy, ...updates };
    await this.saveTrustPolicy();

    this.emit('trustPolicyUpdated', this.trustPolicy);
  }

  /**
   * Get audit logs
   */
  getTrustAuditLogs(limit: number = 100): P2PAuditLog[] {
    return this.auditLogs
      .filter(log => ['trust', 'revoke'].includes(log.operation))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Private storage methods

  private async loadTrustedDevices(): Promise<void> {
    // Implementation would load from secure device storage
    // Mock implementation
  }

  private async saveTrustedDevices(): Promise<void> {
    // Implementation would save to secure device storage
    // Mock implementation
  }

  private async saveRevokedDevices(): Promise<void> {
    // Implementation would save to secure device storage
    // Mock implementation
  }

  private async saveTrustPolicy(): Promise<void> {
    // Implementation would save to secure device storage
    // Mock implementation
  }

  private addAuditLog(log: Omit<P2PAuditLog, 'logId' | 'timestamp'>): void {
    const auditLog: P2PAuditLog = {
      logId: this.generateRequestId(),
      timestamp: Date.now(),
      ...log,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
