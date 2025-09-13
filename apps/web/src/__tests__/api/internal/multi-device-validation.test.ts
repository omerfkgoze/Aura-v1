import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/internal/multi-device-validation/route';

// Mock crypto-core module
vi.mock('@aura/crypto-core', () => ({
  encryptCycleData: vi.fn(),
  decryptCycleData: vi.fn(),
  rotateKeys: vi.fn(),
  deriveDeviceKey: vi.fn(),
}));

describe('/api/internal/multi-device-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/internal/multi-device-validation', () => {
    it('should return endpoint information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.info).toMatchObject({
        endpoint: '/api/internal/multi-device-validation',
        purpose: 'Multi-device encryption validation for zero-knowledge architecture',
        capabilities: expect.arrayContaining([
          'Cross-device encryption testing with different key derivations',
          'Zero-knowledge synchronization demonstration',
          'Hardware-backed security simulation',
        ]),
        supportedDevices: ['iOS', 'android', 'web'],
        securityLevels: ['hardware-backed', 'software-only', 'tee'],
        testScenarios: ['online', 'offline-delayed', 'partial-network'],
        validationTypes: ['cross-device', 'zero-knowledge-sync', 'consistency-check'],
      });
    });
  });

  describe('POST /api/internal/multi-device-validation', () => {
    const createValidRequest = (overrides = {}) => ({
      testData: 'sample-health-data',
      devices: [
        {
          deviceId: 'ios-device-1',
          type: 'iOS',
          securityLevel: 'hardware-backed',
          capabilities: {
            hardwareKeyStore: true,
            biometricAuth: true,
            secureEnclave: true,
          },
        },
        {
          deviceId: 'android-device-1',
          type: 'android',
          securityLevel: 'hardware-backed',
          capabilities: {
            hardwareKeyStore: true,
            biometricAuth: true,
            secureEnclave: false,
          },
        },
      ],
      syncScenario: 'online',
      validationType: 'cross-device',
      ...overrides,
    });

    it('should successfully validate cross-device encryption with iOS and Android', async () => {
      const requestData = createValidRequest();
      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toMatchObject({
        testId: expect.stringMatching(/^test-\d+$/),
        timestamp: expect.any(String),
        scenario: 'online',
        validationType: 'cross-device',
        deviceKeyDerivations: expect.arrayContaining([
          expect.objectContaining({
            deviceId: 'ios-device-1',
            derivationMethod: 'SecureEnclave-ECDH',
            hardwareBacked: true,
            keyVersion: 1,
          }),
          expect.objectContaining({
            deviceId: 'android-device-1',
            derivationMethod: 'AndroidKeystore-AES',
            hardwareBacked: true,
            keyVersion: 1,
          }),
        ]),
        encryptionResults: expect.arrayContaining([
          expect.objectContaining({
            deviceId: 'ios-device-1',
            encryptedData: expect.any(String),
            cryptoEnvelope: expect.objectContaining({
              version: '1.0.0',
              algorithm: 'AES-256-GCM',
              kdfParams: expect.objectContaining({
                name: 'Argon2id',
                iterations: 2, // Mobile optimized
                memory: 32768,
                parallelism: 1,
              }),
            }),
            performanceMetrics: expect.objectContaining({
              encryptionTime: expect.any(Number),
              memoryUsage: expect.any(Number),
              cpuUsage: expect.any(Number),
            }),
          }),
        ]),
        crossDeviceDecryption: expect.arrayContaining([
          expect.objectContaining({
            sourceDevice: expect.any(String),
            targetDevice: expect.any(String),
            decryptionSuccess: true,
            dataIntegrityValid: true,
            performanceImpact: expect.any(Number),
          }),
        ]),
        zeroKnowledgeValidation: {
          noPlaintextExposure: true,
          keyIsolationMaintained: true,
          metadataMinimized: true,
        },
        securityValidation: {
          memoryZeroization: true,
          keyExposureRisk: 'none', // Hardware-backed devices
          hardwareSecurityUtilized: true,
          auditTrailComplete: true,
        },
      });
    });

    it('should handle web device with software-only security', async () => {
      const requestData = createValidRequest({
        devices: [
          {
            deviceId: 'web-device-1',
            type: 'web',
            securityLevel: 'software-only',
            capabilities: {
              hardwareKeyStore: false,
              biometricAuth: false,
              secureEnclave: false,
            },
          },
          {
            deviceId: 'ios-device-1',
            type: 'iOS',
            securityLevel: 'hardware-backed',
            capabilities: {
              hardwareKeyStore: true,
              biometricAuth: true,
              secureEnclave: true,
            },
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.deviceKeyDerivations).toContainEqual(
        expect.objectContaining({
          deviceId: 'web-device-1',
          derivationMethod: 'PBKDF2-HMAC-SHA256',
          hardwareBacked: false,
        })
      );
      expect(data.result.securityValidation.keyExposureRisk).toBe('low');
      expect(data.result.performanceBenchmarks.batteryImpactAssessment).toBe('moderate');
    });

    it('should validate zero-knowledge synchronization', async () => {
      const requestData = createValidRequest({
        validationType: 'zero-knowledge-sync',
        syncScenario: 'offline-delayed',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.syncResults).toHaveLength(1); // 2 devices = 1 sync pair
      expect(data.result.syncResults[0]).toMatchObject({
        sourceDevice: expect.any(String),
        targetDevice: expect.any(String),
        syncSuccess: true,
        dataIntegrityValid: true,
        conflictsDetected: 0,
        syncDuration: expect.any(Number),
        networkUsage: expect.any(Number),
      });
      expect(data.result.zeroKnowledgeValidation.noPlaintextExposure).toBe(true);
    });

    it('should perform consistency validation across multiple devices', async () => {
      const requestData = createValidRequest({
        validationType: 'consistency-check',
        devices: [
          {
            deviceId: 'ios-device-1',
            type: 'iOS',
            securityLevel: 'hardware-backed',
            capabilities: { hardwareKeyStore: true, biometricAuth: true, secureEnclave: true },
          },
          {
            deviceId: 'android-device-1',
            type: 'android',
            securityLevel: 'tee',
            capabilities: { hardwareKeyStore: true, biometricAuth: true, secureEnclave: false },
          },
          {
            deviceId: 'web-device-1',
            type: 'web',
            securityLevel: 'software-only',
            capabilities: { hardwareKeyStore: false, biometricAuth: false, secureEnclave: false },
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.consistencyValidation.allDevicesConsistent).toBe(true);
      expect(data.result.syncResults).toHaveLength(3); // 3 devices = 3 sync pairs
      expect(data.metadata.devicesValidated).toBe(3);
    });

    it('should handle partial network scenario', async () => {
      const requestData = createValidRequest({
        syncScenario: 'partial-network',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.scenario).toBe('partial-network');
      expect(data.result.syncResults.every(sync => sync.syncSuccess)).toBe(true);
    });

    it('should validate performance benchmarks', async () => {
      const requestData = createValidRequest();
      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.performanceBenchmarks).toMatchObject({
        averageEncryptionTime: expect.any(Number),
        averageDecryptionTime: expect.any(Number),
        memorySafetyValidated: true,
        batteryImpactAssessment: expect.stringMatching(/^(minimal|moderate|high)$/),
      });

      // Hardware-backed devices should have better performance
      const iosResult = data.result.encryptionResults.find(
        (r: any) => r.deviceId === 'ios-device-1'
      );
      expect(iosResult.performanceMetrics.encryptionTime).toBeLessThan(15);
    });

    it('should return 400 for invalid request - missing required fields', async () => {
      const invalidRequest = {
        testData: 'sample-data',
        // Missing devices, syncScenario, validationType
      };

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['devices'],
            message: 'Required',
          }),
        ])
      );
    });

    it('should return 400 for invalid device configuration', async () => {
      const invalidRequest = createValidRequest({
        devices: [
          {
            deviceId: '', // Invalid empty deviceId
            type: 'invalid-type', // Invalid device type
            securityLevel: 'hardware-backed',
            capabilities: {
              hardwareKeyStore: true,
              biometricAuth: true,
              secureEnclave: true,
            },
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation failed');
    });

    it('should return 400 for insufficient devices (minimum 2 required)', async () => {
      const invalidRequest = createValidRequest({
        devices: [
          {
            deviceId: 'single-device',
            type: 'iOS',
            securityLevel: 'hardware-backed',
            capabilities: {
              hardwareKeyStore: true,
              biometricAuth: true,
              secureEnclave: true,
            },
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for too many devices (maximum 5)', async () => {
      const devices = Array.from({ length: 6 }, (_, i) => ({
        deviceId: `device-${i}`,
        type: 'iOS' as const,
        securityLevel: 'hardware-backed' as const,
        capabilities: {
          hardwareKeyStore: true,
          biometricAuth: true,
          secureEnclave: true,
        },
      }));

      const invalidRequest = createValidRequest({ devices });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate crypto envelope structure across different devices', async () => {
      const requestData = createValidRequest();
      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // All crypto envelopes should have consistent structure
      data.result.encryptionResults.forEach((result: any) => {
        expect(result.cryptoEnvelope).toMatchObject({
          version: '1.0.0',
          algorithm: 'AES-256-GCM',
          kdfParams: expect.objectContaining({
            name: 'Argon2id',
            iterations: expect.any(Number),
            memory: expect.any(Number),
            parallelism: 1,
          }),
          salt: expect.any(String),
          nonce: expect.any(String),
          keyId: expect.stringContaining('key-'),
          aad: expect.any(String),
        });
      });
    });

    it('should demonstrate hardware security utilization correctly', async () => {
      const requestData = createValidRequest({
        devices: [
          {
            deviceId: 'hardware-device',
            type: 'iOS',
            securityLevel: 'hardware-backed',
            capabilities: {
              hardwareKeyStore: true,
              biometricAuth: true,
              secureEnclave: true,
            },
          },
          {
            deviceId: 'software-device',
            type: 'web',
            securityLevel: 'software-only',
            capabilities: {
              hardwareKeyStore: false,
              biometricAuth: false,
              secureEnclave: false,
            },
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/internal/multi-device-validation',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.result.securityValidation.hardwareSecurityUtilized).toBe(true);
      expect(data.result.securityValidation.keyExposureRisk).toBe('low'); // Mixed hardware/software
      expect(data.metadata.securityLevel).toBe('high'); // At least one hardware-backed device
    });
  });
});
