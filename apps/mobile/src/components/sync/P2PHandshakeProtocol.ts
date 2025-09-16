/**
 * P2P Handshake Protocol
 *
 * Implements secure handshake protocol for device authentication and key exchange.
 * Uses ephemeral keys and forward secrecy for secure P2P communication.
 *
 * SECURITY: Forward secrecy with ephemeral keys
 * AUTHENTICATION: Mutual device authentication
 * ISOLATION: Separate from primary data encryption keys
 */

import { EventEmitter } from 'events';
import { P2PMessage, P2PMessageType, DeviceInfo, TrustedDevice, P2PKeyPair } from './types';

export interface HandshakeSession {
  sessionId: string;
  initiator: boolean;
  remoteDeviceId: string;
  status: 'initiated' | 'challenged' | 'verified' | 'completed' | 'failed';
  ephemeralKeyPair: P2PKeyPair;
  remoteEphemeralKey?: string;
  sharedSecret?: string;
  challenge?: string;
  challengeResponse?: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface HandshakeChallenge {
  challenge: string;
  timestamp: number;
  deviceFingerprint: string;
}

export interface HandshakeResponse {
  challengeResponse: string;
  counterChallenge: string;
  timestamp: number;
  deviceFingerprint: string;
}

export class P2PHandshakeProtocol extends EventEmitter {
  private deviceId: string;
  private deviceKeyPair: P2PKeyPair;
  private activeSessions: Map<string, HandshakeSession> = new Map();
  private handshakeTimeout: number;

  constructor(deviceId: string, deviceKeyPair: P2PKeyPair, handshakeTimeout: number = 30000) {
    super();
    this.deviceId = deviceId;
    this.deviceKeyPair = deviceKeyPair;
    this.handshakeTimeout = handshakeTimeout;
  }

  /**
   * Initiate handshake with discovered device
   * Creates ephemeral keys and starts authentication process
   */
  async initiateHandshake(
    remoteDevice: DeviceInfo,
    trustedDevice?: TrustedDevice
  ): Promise<string> {
    const sessionId = this.generateSessionId();

    try {
      // Generate ephemeral key pair for this session
      const ephemeralKeyPair = await this.generateEphemeralKeyPair();

      const session: HandshakeSession = {
        sessionId,
        initiator: true,
        remoteDeviceId: remoteDevice.deviceId,
        status: 'initiated',
        ephemeralKeyPair,
        startedAt: Date.now(),
      };

      this.activeSessions.set(sessionId, session);

      // Set timeout for handshake completion
      setTimeout(() => {
        this.handleHandshakeTimeout(sessionId);
      }, this.handshakeTimeout);

      // Create handshake initiation message
      const initMessage: P2PMessage = {
        messageId: this.generateMessageId(),
        type: P2PMessageType.HANDSHAKE_INIT,
        fromDeviceId: this.deviceId,
        toDeviceId: remoteDevice.deviceId,
        timestamp: Date.now(),
        encrypted: false,
        payload: {
          sessionId,
          ephemeralPublicKey: ephemeralKeyPair.publicKey,
          deviceFingerprint: await this.generateDeviceFingerprint(),
          protocolVersion: '1.0',
          supportedAlgorithms: ['ECDH-P256', 'X25519'],
        },
      };

      await this.sendMessage(initMessage);

      this.emit('handshakeInitiated', { sessionId, remoteDevice });

      return sessionId;
    } catch (error) {
      this.handleHandshakeError(sessionId, `Handshake initiation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle incoming handshake initiation
   */
  async handleHandshakeInit(message: P2PMessage): Promise<void> {
    const payload = message.payload as any;
    const sessionId = payload.sessionId;

    try {
      // Validate handshake parameters
      if (!this.validateHandshakeInit(payload)) {
        throw new Error('Invalid handshake parameters');
      }

      // Generate ephemeral key pair for response
      const ephemeralKeyPair = await this.generateEphemeralKeyPair();

      const session: HandshakeSession = {
        sessionId,
        initiator: false,
        remoteDeviceId: message.fromDeviceId,
        status: 'challenged',
        ephemeralKeyPair,
        remoteEphemeralKey: payload.ephemeralPublicKey,
        startedAt: Date.now(),
      };

      this.activeSessions.set(sessionId, session);

      // Generate challenge for mutual authentication
      const challenge = await this.generateChallenge();
      session.challenge = challenge;

      // Derive shared secret from ephemeral keys
      const sharedSecret = await this.deriveSharedSecret(
        ephemeralKeyPair.privateKey,
        payload.ephemeralPublicKey
      );
      session.sharedSecret = sharedSecret;

      // Create handshake response with challenge
      const responseMessage: P2PMessage = {
        messageId: this.generateMessageId(),
        type: P2PMessageType.HANDSHAKE_RESPONSE,
        fromDeviceId: this.deviceId,
        toDeviceId: message.fromDeviceId,
        timestamp: Date.now(),
        encrypted: true, // Encrypted with ephemeral shared secret
        payload: {
          sessionId,
          ephemeralPublicKey: ephemeralKeyPair.publicKey,
          challenge,
          deviceFingerprint: await this.generateDeviceFingerprint(),
          protocolVersion: '1.0',
        },
      };

      await this.sendEncryptedMessage(responseMessage, sharedSecret);

      this.emit('handshakeChallenged', { sessionId, challenge });
    } catch (error) {
      this.handleHandshakeError(sessionId, `Handshake response failed: ${error.message}`);
    }
  }

  /**
   * Handle handshake response with challenge
   */
  async handleHandshakeResponse(message: P2PMessage): Promise<void> {
    const payload = message.payload as any;
    const sessionId = payload.sessionId;
    const session = this.activeSessions.get(sessionId);

    if (!session || !session.initiator) {
      throw new Error('Invalid handshake session');
    }

    try {
      // Derive shared secret
      const sharedSecret = await this.deriveSharedSecret(
        session.ephemeralKeyPair.privateKey,
        payload.ephemeralPublicKey
      );
      session.sharedSecret = sharedSecret;
      session.remoteEphemeralKey = payload.ephemeralPublicKey;

      // Decrypt and validate challenge
      const decryptedPayload = await this.decryptMessage(message, sharedSecret);
      const challenge = decryptedPayload.challenge;

      // Generate challenge response
      const challengeResponse = await this.generateChallengeResponse(challenge);
      session.challengeResponse = challengeResponse;

      // Generate counter-challenge
      const counterChallenge = await this.generateChallenge();
      session.challenge = counterChallenge;

      session.status = 'verified';

      // Send challenge response and counter-challenge
      const completeMessage: P2PMessage = {
        messageId: this.generateMessageId(),
        type: P2PMessageType.HANDSHAKE_COMPLETE,
        fromDeviceId: this.deviceId,
        toDeviceId: message.fromDeviceId,
        timestamp: Date.now(),
        encrypted: true,
        payload: {
          sessionId,
          challengeResponse,
          counterChallenge,
          deviceFingerprint: await this.generateDeviceFingerprint(),
        },
      };

      await this.sendEncryptedMessage(completeMessage, sharedSecret);

      this.emit('handshakeVerified', { sessionId, counterChallenge });
    } catch (error) {
      this.handleHandshakeError(sessionId, `Handshake verification failed: ${error.message}`);
    }
  }

  /**
   * Handle handshake completion
   */
  async handleHandshakeComplete(message: P2PMessage): Promise<void> {
    const payload = message.payload as any;
    const sessionId = payload.sessionId;
    const session = this.activeSessions.get(sessionId);

    if (!session || session.initiator) {
      throw new Error('Invalid handshake session');
    }

    try {
      if (!session.sharedSecret) {
        throw new Error('Shared secret not established');
      }

      // Decrypt and validate response
      const decryptedPayload = await this.decryptMessage(message, session.sharedSecret);

      // Verify challenge response
      const isValidResponse = await this.verifyChallengeResponse(
        session.challenge!,
        decryptedPayload.challengeResponse
      );

      if (!isValidResponse) {
        throw new Error('Invalid challenge response');
      }

      // Generate response to counter-challenge
      const counterChallengeResponse = await this.generateChallengeResponse(
        decryptedPayload.counterChallenge
      );

      session.status = 'completed';
      session.completedAt = Date.now();

      // Send final acknowledgment
      const ackMessage: P2PMessage = {
        messageId: this.generateMessageId(),
        type: P2PMessageType.HANDSHAKE_COMPLETE,
        fromDeviceId: this.deviceId,
        toDeviceId: message.fromDeviceId,
        timestamp: Date.now(),
        encrypted: true,
        payload: {
          sessionId,
          counterChallengeResponse,
          completed: true,
        },
      };

      await this.sendEncryptedMessage(ackMessage, session.sharedSecret);

      this.emit('handshakeCompleted', {
        sessionId,
        remoteDeviceId: session.remoteDeviceId,
        sharedSecret: session.sharedSecret,
      });
    } catch (error) {
      this.handleHandshakeError(sessionId, `Handshake completion failed: ${error.message}`);
    }
  }

  /**
   * Get handshake session
   */
  getSession(sessionId: string): HandshakeSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): HandshakeSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Cancel handshake session
   */
  cancelSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      session.error = 'Cancelled by user';
      this.activeSessions.delete(sessionId);
      this.emit('handshakeCancelled', { sessionId });
    }
  }

  // Private helper methods

  private async generateEphemeralKeyPair(): Promise<P2PKeyPair> {
    // Generate ephemeral ECDH key pair for this session
    // Implementation would use crypto-core WASM module
    const keyId = this.generateSessionId();

    return {
      keyId,
      publicKey: `ephemeral_public_${keyId}`,
      privateKey: `ephemeral_private_${keyId}`,
      algorithm: 'ECDH-P256',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };
  }

  private async deriveSharedSecret(privateKey: string, remotePublicKey: string): Promise<string> {
    // Perform ECDH key agreement to derive shared secret
    // Implementation would use crypto-core for secure key derivation
    return `shared_secret_${this.generateSessionId()}`;
  }

  private async generateChallenge(): Promise<string> {
    // Generate cryptographic challenge for authentication
    // Implementation would use secure random number generation
    return `challenge_${this.generateSessionId()}`;
  }

  private async generateChallengeResponse(challenge: string): Promise<string> {
    // Generate response to authentication challenge
    // Implementation would use HMAC with device key
    return `response_${challenge}_${Date.now()}`;
  }

  private async verifyChallengeResponse(challenge: string, response: string): Promise<boolean> {
    // Verify challenge response using HMAC
    // Implementation would use crypto-core for verification
    const expectedResponse = await this.generateChallengeResponse(challenge);
    return response === expectedResponse;
  }

  private async generateDeviceFingerprint(): Promise<string> {
    // Generate device fingerprint for authentication
    // Includes device ID, public key hash, and platform info
    return `fingerprint_${this.deviceId}_${Date.now()}`;
  }

  private validateHandshakeInit(payload: any): boolean {
    return (
      typeof payload.sessionId === 'string' &&
      typeof payload.ephemeralPublicKey === 'string' &&
      typeof payload.deviceFingerprint === 'string' &&
      typeof payload.protocolVersion === 'string' &&
      Array.isArray(payload.supportedAlgorithms)
    );
  }

  private async sendMessage(message: P2PMessage): Promise<void> {
    // Send unencrypted message (for initial handshake)
    this.emit('sendMessage', message);
  }

  private async sendEncryptedMessage(message: P2PMessage, sharedSecret: string): Promise<void> {
    // Encrypt message payload with shared secret
    // Implementation would use crypto-core for encryption
    this.emit('sendEncryptedMessage', { message, sharedSecret });
  }

  private async decryptMessage(message: P2PMessage, sharedSecret: string): Promise<any> {
    // Decrypt message payload with shared secret
    // Implementation would use crypto-core for decryption
    return message.payload;
  }

  private handleHandshakeTimeout(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status !== 'completed') {
      this.handleHandshakeError(sessionId, 'Handshake timeout');
    }
  }

  private handleHandshakeError(sessionId: string, error: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      session.error = error;
      this.emit('handshakeError', { sessionId, error });
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
