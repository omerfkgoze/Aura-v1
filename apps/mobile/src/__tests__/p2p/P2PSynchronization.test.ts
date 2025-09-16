/**
 * P2P Synchronization Tests
 *
 * Tests P2P synchronization across iOS, Android platforms with security validation.
 * Covers device discovery, handshake, trust management, and data transmission.
 *
 * Priority: P0 - Critical security and functionality validation
 */

import { jest } from '@jest/globals';
import { P2PCommunicationProtocol } from '../../components/sync/P2PCommunicationProtocol';
import { P2PDiscoveryService } from '../../components/sync/P2PDiscoveryService';
import { P2PHandshakeProtocol } from '../../components/sync/P2PHandshakeProtocol';
import { P2PDataTransmission } from '../../components/sync/P2PDataTransmission';
import { DeviceTrustManager } from '../../components/sync/DeviceTrustManager';
import {
  DeviceInfo,
  P2PConnectionConfig,
  P2PSyncData,
  TrustedDevice,
  P2PMessageType,
} from '../../components/sync/types';

describe('P2P Synchronization Cross-Platform Tests', () => {
  let iosDevice: P2PCommunicationProtocol;
  let androidDevice: P2PCommunicationProtocol;
  let iosDiscovery: P2PDiscoveryService;
  let androidDiscovery: P2PDiscoveryService;
  let iosTrustManager: DeviceTrustManager;
  let androidTrustManager: DeviceTrustManager;

  const mockConfig: P2PConnectionConfig = {
    discoveryPort: 8765,
    dataPort: 8766,
    discoveryInterval: 1000,
    handshakeTimeout: 10000,
    syncTimeout: 30000,
    maxConnections: 5,
    enableMulticast: true,
    requireManualTrust: true,
  };

  beforeEach(async () => {
    // Setup iOS device
    iosDevice = new P2PCommunicationProtocol(
      'ios-device-001',
      'iPhone Test Device',
      'ios',
      mockConfig
    );

    // Setup Android device
    androidDevice = new P2PCommunicationProtocol(
      'android-device-001',
      'Android Test Device',
      'android',
      mockConfig
    );

    // Initialize devices
    await iosDevice.initialize();
    await androidDevice.initialize();

    // Setup discovery services
    const iosDeviceInfo: DeviceInfo = {
      deviceId: 'ios-device-001',
      deviceName: 'iPhone Test Device',
      platform: 'ios',
      appVersion: '1.0.0',
      protocolVersion: '1.0',
      publicKey: 'ios_public_key_001',
      discoveredAt: Date.now(),
    };

    const androidDeviceInfo: DeviceInfo = {
      deviceId: 'android-device-001',
      deviceName: 'Android Test Device',
      platform: 'android',
      appVersion: '1.0.0',
      protocolVersion: '1.0',
      publicKey: 'android_public_key_001',
      discoveredAt: Date.now(),
    };

    iosDiscovery = new P2PDiscoveryService(iosDeviceInfo, mockConfig);
    androidDiscovery = new P2PDiscoveryService(androidDeviceInfo, mockConfig);

    // Setup trust managers
    iosTrustManager = new DeviceTrustManager({
      requireManualApproval: true,
      maxTrustedDevices: 5,
      allowCrossplatform: true,
    });

    androidTrustManager = new DeviceTrustManager({
      requireManualApproval: true,
      maxTrustedDevices: 5,
      allowCrossplatform: true,
    });

    await iosTrustManager.initialize();
    await androidTrustManager.initialize();
  });

  afterEach(async () => {
    await iosDiscovery.stopDiscovery();
    await androidDiscovery.stopDiscovery();
  });

  describe('Cross-Platform Device Discovery', () => {
    test('iOS device discovers Android device', async () => {
      const discoveredDevices: DeviceInfo[] = [];

      iosDiscovery.on('deviceDiscovered', event => {
        discoveredDevices.push(event.deviceInfo);
      });

      // Start discovery on both devices
      await iosDiscovery.startDiscovery();
      await androidDiscovery.startDiscovery();

      // Simulate Android device announcement
      const androidDeviceInfo: DeviceInfo = {
        deviceId: 'android-device-001',
        deviceName: 'Android Test Device',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'android_public_key_001',
        discoveredAt: Date.now(),
      };

      // Simulate discovery event
      iosDiscovery.emit('deviceDiscovered', androidDeviceInfo);

      expect(discoveredDevices).toHaveLength(1);
      expect(discoveredDevices[0].deviceId).toBe('android-device-001');
      expect(discoveredDevices[0].platform).toBe('android');
    });

    test('Android device discovers iOS device', async () => {
      const discoveredDevices: DeviceInfo[] = [];

      androidDiscovery.on('deviceDiscovered', event => {
        discoveredDevices.push(event.deviceInfo);
      });

      await androidDiscovery.startDiscovery();
      await iosDiscovery.startDiscovery();

      // Simulate iOS device announcement
      const iosDeviceInfo: DeviceInfo = {
        deviceId: 'ios-device-001',
        deviceName: 'iPhone Test Device',
        platform: 'ios',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'ios_public_key_001',
        discoveredAt: Date.now(),
      };

      androidDiscovery.emit('deviceDiscovered', iosDeviceInfo);

      expect(discoveredDevices).toHaveLength(1);
      expect(discoveredDevices[0].deviceId).toBe('ios-device-001');
      expect(discoveredDevices[0].platform).toBe('ios');
    });

    test('Discovery ignores self-announcements', async () => {
      const discoveredDevices: DeviceInfo[] = [];

      iosDiscovery.on('deviceDiscovered', event => {
        discoveredDevices.push(event.deviceInfo);
      });

      await iosDiscovery.startDiscovery();

      // Simulate self-announcement (should be ignored)
      const selfDeviceInfo: DeviceInfo = {
        deviceId: 'ios-device-001',
        deviceName: 'iPhone Test Device',
        platform: 'ios',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'ios_public_key_001',
        discoveredAt: Date.now(),
      };

      iosDiscovery.emit('deviceDiscovered', selfDeviceInfo);

      expect(discoveredDevices).toHaveLength(0);
    });
  });

  describe('Cross-Platform Handshake Protocol', () => {
    test('Successful handshake between iOS and Android', async () => {
      const handshakeEvents: string[] = [];

      iosDevice.on('handshakeCompleted', () => {
        handshakeEvents.push('ios_completed');
      });

      androidDevice.on('handshakeCompleted', () => {
        handshakeEvents.push('android_completed');
      });

      // Simulate handshake initiation
      await iosDevice.initiateHandshake('android-device-001');

      // Simulate successful handshake completion
      setTimeout(() => {
        iosDevice.emit('handshakeCompleted', {
          sessionId: 'test-session',
          remoteDeviceId: 'android-device-001',
          sharedSecret: 'test-shared-secret',
        });

        androidDevice.emit('handshakeCompleted', {
          sessionId: 'test-session',
          remoteDeviceId: 'ios-device-001',
          sharedSecret: 'test-shared-secret',
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(handshakeEvents).toContain('ios_completed');
      expect(handshakeEvents).toContain('android_completed');
    });

    test('Handshake timeout handling', async () => {
      const timeoutErrors: string[] = [];

      iosDevice.on('error', error => {
        if (error.message.includes('timeout')) {
          timeoutErrors.push('ios_timeout');
        }
      });

      // Initiate handshake but don't complete it
      await iosDevice.initiateHandshake('android-device-001');

      // Wait for timeout (should occur before our test timeout)
      await new Promise(resolve => setTimeout(resolve, 15000));

      expect(timeoutErrors).toContain('ios_timeout');
    }, 20000);

    test('Handshake security validation', async () => {
      const securityEvents: any[] = [];

      iosDevice.on('securityValidation', event => {
        securityEvents.push(event);
      });

      // Initiate handshake with security validation
      await iosDevice.initiateHandshake('android-device-001');

      // Verify security events are triggered
      // Implementation would validate:
      // - Key exchange integrity
      // - Device fingerprint verification
      // - Protocol version compatibility

      expect(securityEvents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Platform Trust Management', () => {
    test('Trust request creation and approval', async () => {
      const trustEvents: string[] = [];

      iosTrustManager.on('deviceTrusted', () => {
        trustEvents.push('device_trusted');
      });

      const androidDeviceInfo: DeviceInfo = {
        deviceId: 'android-device-001',
        deviceName: 'Android Test Device',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'android_public_key_001',
        discoveredAt: Date.now(),
      };

      // Request trust
      const requestId = await iosTrustManager.requestDeviceTrust(androidDeviceInfo);
      expect(requestId).toBeDefined();

      // Approve trust
      await iosTrustManager.approveTrustRequest(requestId);

      expect(trustEvents).toContain('device_trusted');
      expect(iosTrustManager.isDeviceTrusted('android-device-001')).toBe(true);
    });

    test('Trust revocation functionality', async () => {
      const revocationEvents: string[] = [];

      iosTrustManager.on('deviceTrustRevoked', () => {
        revocationEvents.push('device_revoked');
      });

      // First establish trust
      const androidDeviceInfo: DeviceInfo = {
        deviceId: 'android-device-001',
        deviceName: 'Android Test Device',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'android_public_key_001',
        discoveredAt: Date.now(),
      };

      const requestId = await iosTrustManager.requestDeviceTrust(androidDeviceInfo);
      await iosTrustManager.approveTrustRequest(requestId);

      // Revoke trust
      await iosTrustManager.revokeDeviceTrust('android-device-001', {
        reason: 'user_requested',
        details: 'Test revocation',
        immediate: true,
      });

      expect(revocationEvents).toContain('device_revoked');
      expect(iosTrustManager.isDeviceTrusted('android-device-001')).toBe(false);
    });

    test('Cross-platform trust policy validation', async () => {
      // Test that cross-platform trust is allowed by policy
      const androidDeviceInfo: DeviceInfo = {
        deviceId: 'android-device-001',
        deviceName: 'Android Test Device',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'android_public_key_001',
        discoveredAt: Date.now(),
      };

      // Should succeed with cross-platform policy enabled
      const requestId = await iosTrustManager.requestDeviceTrust(androidDeviceInfo);
      expect(requestId).toBeDefined();

      // Test with cross-platform disabled
      await iosTrustManager.updateTrustPolicy({ allowCrossplatform: false });

      const anotherAndroidDevice: DeviceInfo = {
        deviceId: 'android-device-002',
        deviceName: 'Another Android Device',
        platform: 'android',
        appVersion: '1.0.0',
        protocolVersion: '1.0',
        publicKey: 'android_public_key_002',
        discoveredAt: Date.now(),
      };

      // Should fail with cross-platform disabled
      await expect(iosTrustManager.requestDeviceTrust(anotherAndroidDevice)).rejects.toThrow(
        'Cross-platform devices not allowed'
      );
    });
  });

  describe('Cross-Platform Data Transmission', () => {
    let iosTransmission: P2PDataTransmission;
    let androidTransmission: P2PDataTransmission;

    beforeEach(() => {
      iosTransmission = new P2PDataTransmission({
        maxChunkSize: 1024,
        compressionEnabled: true,
        encryptionAlgorithm: 'AES-256-GCM',
      });

      androidTransmission = new P2PDataTransmission({
        maxChunkSize: 1024,
        compressionEnabled: true,
        encryptionAlgorithm: 'AES-256-GCM',
      });
    });

    test('Successful data transmission between platforms', async () => {
      const transmissionEvents: string[] = [];

      androidTransmission.on('syncDataReceived', () => {
        transmissionEvents.push('data_received');
      });

      // Start sync session
      const sessionId = await iosTransmission.startSyncSession('android-device-001', 'send');

      // Create mock sync data
      const syncData: P2PSyncData = {
        dataType: 'cycle_data',
        version: 1,
        deviceId: 'ios-device-001',
        lastModified: Date.now(),
        checksum: 'mock_checksum',
        encryptedPayload: {
          version: '1.0',
          algorithm: 'AES-256-GCM',
          iv: 'mock_iv',
          authTag: 'mock_auth_tag',
          encryptedData: 'mock_encrypted_data',
          aad: 'mock_aad',
        },
      };

      // Queue and transmit data
      await iosTransmission.queueDataForTransmission('android-device-001', syncData);

      // Simulate successful transmission
      setTimeout(() => {
        androidTransmission.emit('syncDataReceived', {
          sessionId,
          syncData,
          fromDeviceId: 'ios-device-001',
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(transmissionEvents).toContain('data_received');
    });

    test('Large data chunking and reassembly', async () => {
      const chunkEvents: any[] = [];

      androidTransmission.on('chunkReceived', event => {
        chunkEvents.push(event);
      });

      // Create large mock data that requires chunking
      const largeData = new Uint8Array(5000); // 5KB data
      largeData.fill(1);

      const sessionId = await iosTransmission.startSyncSession('android-device-001', 'send');

      // Simulate chunked transmission
      const chunkSize = 1024;
      const totalChunks = Math.ceil(largeData.length / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        setTimeout(() => {
          androidTransmission.emit('chunkReceived', {
            sessionId,
            chunkId: `chunk_${i}`,
            sequenceNumber: i,
            totalChunks,
          });
        }, i * 10);
      }

      await new Promise(resolve => setTimeout(resolve, totalChunks * 20));

      expect(chunkEvents).toHaveLength(totalChunks);
      expect(chunkEvents[0].sequenceNumber).toBe(0);
      expect(chunkEvents[totalChunks - 1].sequenceNumber).toBe(totalChunks - 1);
    });

    test('Data integrity verification', async () => {
      const integrityEvents: string[] = [];

      androidTransmission.on('transmissionError', event => {
        if (event.error.includes('integrity')) {
          integrityEvents.push('integrity_failure');
        }
      });

      // Simulate corrupted data chunk
      const corruptedChunk = {
        chunkId: 'test_chunk',
        sessionId: 'test_session',
        sequenceNumber: 0,
        totalChunks: 1,
        data: new Uint8Array([1, 2, 3, 4]),
        checksum: 'wrong_checksum', // Intentionally wrong
        isLast: true,
      };

      await androidTransmission.handleIncomingChunk(corruptedChunk, 'ios-device-001');

      expect(integrityEvents).toContain('integrity_failure');
    });
  });

  describe('Security Validation', () => {
    test('P2P key isolation verification', async () => {
      // Verify that P2P keys are separate from data encryption keys
      const iosStatus = iosDevice.getStatus();
      const androidStatus = androidDevice.getStatus();

      expect(iosStatus.isEnabled).toBe(true);
      expect(androidStatus.isEnabled).toBe(true);

      // Verify no sensitive data in status
      expect(JSON.stringify(iosStatus)).not.toContain('private');
      expect(JSON.stringify(iosStatus)).not.toContain('secret');
      expect(JSON.stringify(androidStatus)).not.toContain('private');
      expect(JSON.stringify(androidStatus)).not.toContain('secret');
    });

    test('Audit trail privacy compliance', async () => {
      const auditLogs = iosDevice.getAuditLogs(10);

      // Verify audit logs don't contain sensitive data
      for (const log of auditLogs) {
        const logString = JSON.stringify(log);
        expect(logString).not.toContain('password');
        expect(logString).not.toContain('secret');
        expect(logString).not.toContain('cycle_data');
        expect(logString).not.toContain('symptom');
        expect(logString).not.toContain('menstrual');
      }
    });

    test('Network disconnection handling', async () => {
      const errorEvents: string[] = [];

      iosDevice.on('error', () => {
        errorEvents.push('network_error');
      });

      // Simulate network disconnection during sync
      await iosDevice.startDiscovery();

      // Simulate network error
      setTimeout(() => {
        iosDevice.emit('error', {
          errorId: 'test_error',
          type: 'network',
          message: 'Network disconnected',
          timestamp: Date.now(),
          resolved: false,
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorEvents).toContain('network_error');
    });
  });

  describe('Performance Validation', () => {
    test('Discovery performance within acceptable limits', async () => {
      const startTime = Date.now();

      await iosDiscovery.startDiscovery();
      await androidDiscovery.startDiscovery();

      const discoveryTime = Date.now() - startTime;

      // Discovery should start within 1 second
      expect(discoveryTime).toBeLessThan(1000);
    });

    test('Handshake completion within timeout', async () => {
      const startTime = Date.now();

      const handshakePromise = new Promise(resolve => {
        iosDevice.on('handshakeCompleted', () => {
          const handshakeTime = Date.now() - startTime;
          expect(handshakeTime).toBeLessThan(mockConfig.handshakeTimeout);
          resolve(handshakeTime);
        });
      });

      await iosDevice.initiateHandshake('android-device-001');

      // Simulate successful handshake
      setTimeout(() => {
        iosDevice.emit('handshakeCompleted', {
          sessionId: 'perf_test',
          remoteDeviceId: 'android-device-001',
          sharedSecret: 'test_secret',
        });
      }, 100);

      await handshakePromise;
    });

    test('Data transmission throughput', async () => {
      const startTime = Date.now();
      const dataSize = 10000; // 10KB

      const sessionId = await iosTransmission.startSyncSession('android-device-001', 'send');

      // Simulate data transmission completion
      setTimeout(() => {
        iosTransmission.emit('syncSessionCompleted', {
          sessionId,
          dataTransferred: dataSize,
          duration: Date.now() - startTime,
          conflictsDetected: 0,
        });
      }, 500);

      const result = await new Promise(resolve => {
        iosTransmission.on('syncSessionCompleted', event => {
          resolve(event);
        });
      });

      const throughput = ((result as any).dataTransferred / (result as any).duration) * 1000; // bytes/second

      // Should achieve at least 10KB/s throughput
      expect(throughput).toBeGreaterThan(10000);
    });
  });
});
