import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the crypto-core module completely
vi.mock('@aura/crypto-core', () => ({
  AsyncCryptoCore: {
    create: vi.fn().mockResolvedValue({
      generateEncryptionKey: vi.fn().mockResolvedValue({ id: 'test-key' }),
      createEnvelope: vi.fn().mockResolvedValue({
        version: '1.0',
        algorithm: 'AES-256-GCM',
        nonce: 'test-nonce',
        ciphertext: 'test-ciphertext',
        tag: 'test-tag',
      }),
      createCycleDataAAD: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
      runHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
    }),
  },
  CryptoOperationError: class CryptoOperationError extends Error {
    constructor(
      message: string,
      public operation: string
    ) {
      super(message);
      this.name = 'CryptoOperationError';
    }
  },
  IntegrityVerificationError: class IntegrityVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'IntegrityVerificationError';
    }
  },
  CryptoEnvelope: vi.fn(),
}));

// Mock shared-types module
vi.mock('@aura/shared-types', () => ({
  DeviceCapabilities: vi.fn(),
  BenchmarkResult: vi.fn(),
}));

// Dynamically import the POST and GET functions after mocks are set up
const { POST, GET } = (await vi.importActual(
  '../../../app/api/internal/health-check/route.ts'
)) as any;

// Mock global crypto for Web Crypto API
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
  writable: true,
});

describe('/api/internal/health-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/internal/health-check', () => {
    it('should return healthy status with all checks passing', async () => {
      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({
          testData: 'test-cycle-data',
          includePerformanceMetrics: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.cryptoIntegrity.wasmModuleVerified).toBe(true);
      expect(data.cryptoIntegrity.keyGenerationWorking).toBe(true);
      expect(data.cryptoIntegrity.encryptDecryptCycle).toBe(true);
      expect(data.envelope.structure).toBeTruthy();
      expect(data.performanceMetrics).toBeTruthy();
      expect(Array.isArray(data.errors)).toBe(true);
      expect(Array.isArray(data.warnings)).toBe(true);
    });

    it('should handle crypto core initialization failure', async () => {
      // Mock initialization failure
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      mockCryptoCore.AsyncCryptoCore.create.mockRejectedValueOnce(
        new Error('WASM module failed to load')
      );

      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.cryptoIntegrity.wasmModuleVerified).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
      expect(data.errors[0]).toContain('Crypto core initialization failed');
    });

    it('should handle key generation failure gracefully', async () => {
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      const mockInstance = {
        generateEncryptionKey: vi.fn().mockRejectedValue(new Error('Key generation failed')),
        createEnvelope: vi.fn(),
        createCycleDataAAD: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        runHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };
      mockCryptoCore.AsyncCryptoCore.create.mockResolvedValueOnce(mockInstance);

      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.cryptoIntegrity.keyGenerationWorking).toBe(false);
      expect(data.errors.some((e: string) => e.includes('Key generation failed'))).toBe(true);
    });

    it('should validate request schema and handle invalid input', async () => {
      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: {
            platform: 'test',
            deviceClass: 'InvalidDeviceClass', // Invalid enum value
            availableMemory: 'not-a-number', // Should be number
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should include performance metrics when requested', async () => {
      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({
          includePerformanceMetrics: true,
          deviceInfo: {
            platform: 'web',
            deviceClass: 'WebStandard',
            availableMemory: 1024 * 1024 * 1024, // 1GB
            cpuCores: 4,
            hasSecureEnclave: false,
            performanceScore: 85,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.performanceMetrics).toBeTruthy();
      expect(typeof data.performanceMetrics.encryptionDurationMs).toBe('number');
      expect(typeof data.performanceMetrics.decryptionDurationMs).toBe('number');
      expect(typeof data.performanceMetrics.keyZeroizationMs).toBe('number');
      expect(data.performanceMetrics.benchmark).toBeTruthy();
      expect(data.performanceMetrics.memoryUsage).toBeTruthy();
    });

    it('should handle envelope creation failure', async () => {
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      const mockInstance = {
        generateEncryptionKey: vi.fn().mockResolvedValue({ id: 'test-key' }),
        createEnvelope: vi.fn().mockRejectedValue(new Error('Envelope creation failed')),
        createCycleDataAAD: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        runHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };
      mockCryptoCore.AsyncCryptoCore.create.mockResolvedValueOnce(mockInstance);

      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.cryptoIntegrity.encryptDecryptCycle).toBe(false);
      expect(data.envelope.structure).toBe(null);
    });

    it('should handle AAD validation warnings gracefully', async () => {
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      const mockInstance = {
        generateEncryptionKey: vi.fn().mockResolvedValue({ id: 'test-key' }),
        createEnvelope: vi.fn().mockResolvedValue({
          version: '1.0',
          algorithm: 'AES-256-GCM',
          nonce: 'test-nonce',
          ciphertext: 'test-ciphertext',
          tag: 'test-tag',
        }),
        createCycleDataAAD: vi.fn().mockRejectedValue(new Error('AAD creation failed')),
        runHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };
      mockCryptoCore.AsyncCryptoCore.create.mockResolvedValueOnce(mockInstance);

      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(200); // Degraded but not unhealthy

      const data = await response.json();
      expect(data.status).toBe('degraded');
      expect(data.warnings.some((w: string) => w.includes('AAD validation failed'))).toBe(true);
    });
  });

  describe('GET /api/internal/health-check', () => {
    it('should handle GET requests by delegating to POST', async () => {
      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeTruthy();
      expect(typeof data.status).toBe('string');
      expect(data.timestamp).toBeTruthy();
    });
  });

  describe('Performance benchmarking', () => {
    it('should adjust benchmark iterations based on device class', async () => {
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      let keyGenerationCallCount = 0;
      const mockInstance = {
        generateEncryptionKey: vi.fn().mockImplementation(() => {
          keyGenerationCallCount++;
          return Promise.resolve({ id: `test-key-${keyGenerationCallCount}` });
        }),
        createEnvelope: vi.fn().mockResolvedValue({
          version: '1.0',
          algorithm: 'AES-256-GCM',
        }),
        createCycleDataAAD: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        runHealthCheck: vi.fn().mockResolvedValue({ status: 'healthy' }),
      };
      mockCryptoCore.AsyncCryptoCore.create.mockResolvedValue(mockInstance);

      // Test with MobileLow device class (should use fewer iterations)
      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({
          includePerformanceMetrics: true,
          deviceInfo: {
            platform: 'mobile',
            deviceClass: 'MobileLow',
            availableMemory: 512 * 1024 * 1024,
            cpuCores: 2,
            hasSecureEnclave: false,
            performanceScore: 45,
          },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.performanceMetrics.benchmark.iterationsTested).toBe(10); // MobileLow uses 10 iterations
      expect(data.performanceMetrics.benchmark.success).toBe(true);
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: '{ invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should handle unexpected exceptions during health check', async () => {
      const mockCryptoCore = await vi.importMock('@aura/crypto-core');
      mockCryptoCore.AsyncCryptoCore.create.mockRejectedValueOnce(
        new Error('Unexpected system error')
      );

      const request = new NextRequest('http://localhost/api/internal/health-check', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.status).toBe('unhealthy');
      expect(data.errors.length).toBeGreaterThan(0);
    });
  });
});
