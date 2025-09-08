import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  MetadataDetector,
  RequestMetadata,
  MetadataPattern,
  MetadataViolation,
} from '../../src/network/metadata-detector';

describe('MetadataDetector', () => {
  let detector: MetadataDetector;

  beforeEach(() => {
    detector = new MetadataDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('analyzeMetadata', () => {
    it('should pass analysis for empty request array', async () => {
      const result = await detector.analyzeMetadata([]);

      expect(result.passed).toBe(true);
      expect(result.message).toContain('No requests to analyze');
      expect(result.details.riskScore).toBe(0);
      expect(result.details.patterns).toEqual([]);
    });

    it('should detect timing patterns in regular intervals', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [];

      // Create requests with 1000ms intervals (regular polling)
      for (let i = 0; i < 10; i++) {
        requests.push(
          detector.createMockRequestMetadata('/api/status', baseTime + i * 1000, 512, 50)
        );
      }

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.timingPatternsDetected).toBe(true);
      expect(
        result.details.patterns.some(
          p => p.type === 'TIMING' && p.description.includes('Regular polling pattern')
        )
      ).toBe(true);
    });

    it('should detect timing differences between sensitive and normal requests', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [];

      // Normal requests with fast response times
      for (let i = 0; i < 5; i++) {
        requests.push(
          detector.createMockRequestMetadata(
            '/api/status',
            baseTime + i * 1000,
            512,
            50 // Fast response
          )
        );
      }

      // Sensitive requests with slow response times
      for (let i = 0; i < 5; i++) {
        requests.push(
          detector.createMockRequestMetadata(
            '/api/cycle/data',
            baseTime + i * 1000 + 500,
            1024,
            250 // Slow response - reveals processing difference
          )
        );
      }

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.timingPatternsDetected).toBe(true);
      expect(
        result.details.patterns.some(
          p =>
            p.type === 'TIMING' &&
            p.severity === 'HIGH' &&
            p.description.includes('Timing differences')
        )
      ).toBe(true);
    });

    it('should detect consistent response size patterns', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [];

      // Create multiple requests with identical response sizes
      for (let i = 0; i < 10; i++) {
        requests.push(
          detector.createMockRequestMetadata(
            '/api/user/profile',
            baseTime + i * 1000,
            1337, // Suspiciously consistent size
            100
          )
        );
      }

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.sizePatternsDetected).toBe(true);
      expect(
        result.details.patterns.some(
          p => p.type === 'SIZE' && p.description.includes('Consistent response sizes')
        )
      ).toBe(true);
    });

    it('should detect suspicious headers', async () => {
      const requests: RequestMetadata[] = [
        {
          ...detector.createMockRequestMetadata('/api/data'),
          headers: {
            'Content-Type': 'application/json',
            'X-Real-IP': '192.168.1.100',
            'X-Device-ID': 'unique-device-123',
            'X-Tracking-ID': 'track-abc-123',
          },
        },
        {
          ...detector.createMockRequestMetadata('/api/status'),
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '10.0.0.1',
            'X-Session-ID': 'sess-xyz-789',
          },
        },
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.headerLeakageDetected).toBe(true);
      expect(result.details.patterns.some(p => p.type === 'HEADER' && p.severity === 'HIGH')).toBe(
        true
      );
    });

    it('should detect tracking parameters in headers', async () => {
      const requests: RequestMetadata[] = [
        {
          ...detector.createMockRequestMetadata('/api/data'),
          headers: {
            'Content-Type': 'application/json',
            Referer: 'https://example.com?utm_source=google&utm_campaign=health',
            'X-Custom': 'fbclid=abc123&gclid=xyz789',
          },
        },
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.headerLeakageDetected).toBe(true);
      expect(
        result.details.patterns.some(
          p => p.type === 'HEADER' && p.description.includes('Tracking pattern')
        )
      ).toBe(true);
    });

    it('should calculate appropriate risk scores', async () => {
      const highRiskRequests: RequestMetadata[] = [];
      const baseTime = Date.now();

      // Create many violations for high risk score
      for (let i = 0; i < 20; i++) {
        highRiskRequests.push({
          timestamp: baseTime + i * 1000, // Regular timing
          size: 1337, // Consistent size
          duration: i % 2 === 0 ? 50 : 200, // Timing leak
          headers: {
            'X-Real-IP': '192.168.1.100',
            'X-Device-ID': `device-${i}`,
            'X-Tracking-ID': `utm_source=test&fbclid=${i}`,
          },
          path: '/api/cycle/sensitive',
          method: 'GET',
          statusCode: 200,
        });
      }

      const result = await detector.analyzeMetadata(highRiskRequests);

      expect(result.details.riskScore).toBeGreaterThan(50);
      expect(result.passed).toBe(false);
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock an error condition
      const invalidRequests = [null as any];

      const result = await detector.analyzeMetadata(invalidRequests);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Metadata analysis failed');
      expect(result.details.riskScore).toBe(100);
    });
  });

  describe('analyzeRequestBatch', () => {
    it('should analyze requests in time windows', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [];

      // Create requests spanning multiple time windows
      for (let i = 0; i < 10; i++) {
        requests.push(
          detector.createMockRequestMetadata(
            '/api/status',
            baseTime + i * 65000, // 65 second intervals (different windows)
            512,
            50
          )
        );
      }

      const result = await detector.analyzeRequestBatch(requests, 60000); // 1 minute windows

      expect(result.passed).toBe(true);
      expect(result.details.patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect cross-window patterns', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [];

      // Create consistent pattern across time windows
      for (let window = 0; window < 3; window++) {
        for (let i = 0; i < 5; i++) {
          requests.push(
            detector.createMockRequestMetadata(
              '/api/cycle/data',
              baseTime + window * 70000 + i * 1000,
              1337, // Consistent size across windows
              100
            )
          );
        }
      }

      const result = await detector.analyzeRequestBatch(requests, 60000);

      expect(result.details.sizePatternsDetected).toBe(true);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect sequential access to sensitive endpoints', async () => {
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [
        detector.createMockRequestMetadata('/api/cycle/data', baseTime),
        detector.createMockRequestMetadata('/api/symptoms/pain', baseTime + 1000),
        detector.createMockRequestMetadata('/api/fertility/tracking', baseTime + 2000),
        detector.createMockRequestMetadata('/api/pregnancy/test', baseTime + 3000),
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(
        result.details.patterns.some(
          p =>
            p.type === 'SEQUENCE' &&
            p.description.includes('Sequential access to sensitive endpoints')
        )
      ).toBe(true);
    });

    it('should detect browser fingerprinting attempts', async () => {
      const requests: RequestMetadata[] = [
        detector.createMockRequestMetadata('/api/fingerprint/canvas'),
        detector.createMockRequestMetadata('/api/device/capabilities'),
        detector.createMockRequestMetadata('/api/browser/features'),
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(
        result.details.patterns.some(
          p => p.type === 'FINGERPRINT' && p.description.includes('fingerprinting')
        )
      ).toBe(true);
    });

    it('should detect canvas fingerprinting indicators', async () => {
      const requests: RequestMetadata[] = [];

      // Create many image/canvas requests
      for (let i = 0; i < 10; i++) {
        requests.push({
          ...detector.createMockRequestMetadata(`/api/canvas/test-${i}`),
          headers: {
            'Content-Type': 'image/png',
            Accept: 'image/webp,image/*',
          },
        });
      }

      const result = await detector.analyzeMetadata(requests);

      expect(
        result.details.patterns.some(
          p =>
            p.type === 'FINGERPRINT' &&
            p.severity === 'HIGH' &&
            p.description.includes('canvas fingerprinting')
        )
      ).toBe(true);
    });

    it('should detect consistent User-Agent patterns', async () => {
      const requests: RequestMetadata[] = [];
      const userAgent = 'Mozilla/5.0 (Bot/1.0)';

      for (let i = 0; i < 15; i++) {
        requests.push({
          ...detector.createMockRequestMetadata(`/api/endpoint-${i}`),
          userAgent,
        });
      }

      const result = await detector.analyzeMetadata(requests);

      expect(
        result.details.patterns.some(
          p => p.type === 'FINGERPRINT' && p.description.includes('Consistent User-Agent')
        )
      ).toBe(true);
    });
  });

  describe('Tracking Signal Extraction', () => {
    it('should extract tracking signals from URL parameters', async () => {
      const requests: RequestMetadata[] = [
        detector.createMockRequestMetadata('/api/data?utm_source=google&utm_campaign=health'),
        detector.createMockRequestMetadata('/api/track?fbclid=abc123&session_id=xyz789'),
        detector.createMockRequestMetadata('/api/analytics?_ga=123&_gid=456'),
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.trackingSignalsFound.length).toBeGreaterThan(0);
      expect(
        result.details.trackingSignalsFound.some(signal => signal.includes('utm_source'))
      ).toBe(true);
    });

    it('should extract tracking signals from headers', async () => {
      const requests: RequestMetadata[] = [
        {
          ...detector.createMockRequestMetadata('/api/data'),
          headers: {
            'X-Session-ID': 'sess-123',
            'X-Track-ID': 'utm_medium=email',
            'User-Agent': 'TrackingBot/1.0 device_id=abc123',
          },
        },
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(result.details.trackingSignalsFound.length).toBeGreaterThan(0);
    });
  });

  describe('Violation Identification', () => {
    it('should create appropriate violation types for different patterns', async () => {
      const requests: RequestMetadata[] = [
        // Timing violation
        {
          ...detector.createMockRequestMetadata('/api/cycle/data', Date.now(), 1024, 500),
        },
        {
          ...detector.createMockRequestMetadata('/api/status', Date.now() + 1000, 512, 50),
        },
        // Header violation
        {
          ...detector.createMockRequestMetadata('/api/data'),
          headers: { 'X-Real-IP': '192.168.1.1' },
        },
      ];

      const result = await detector.analyzeMetadata(requests);

      const violationTypes = result.violations.map(v => v.type);
      expect(violationTypes).toContain('TIMING_LEAK');
      expect(violationTypes).toContain('HEADER_LEAK');

      // Check that each violation has a recommendation
      expect(result.violations.every(v => v.description && v.description.length > 0)).toBe(true);
    });

    it('should provide appropriate recommendations for violations', async () => {
      const requests: RequestMetadata[] = [
        {
          ...detector.createMockRequestMetadata('/api/sensitive'),
          headers: { 'X-Device-ID': 'device123' },
        },
      ];

      const result = await detector.analyzeMetadata(requests);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].description).toContain('Suspicious header');
    });
  });

  describe('Utility Methods', () => {
    it('should create mock request metadata correctly', () => {
      const timestamp = Date.now();
      const request = detector.createMockRequestMetadata('/api/test', timestamp, 2048, 150);

      expect(request.path).toBe('/api/test');
      expect(request.timestamp).toBe(timestamp);
      expect(request.size).toBe(2048);
      expect(request.duration).toBe(150);
      expect(request.method).toBe('GET');
      expect(request.statusCode).toBe(200);
      expect(request.headers['Content-Type']).toBe('application/json');
    });

    it('should normalize paths correctly for grouping', () => {
      const detector = new MetadataDetector();

      // Access private method through type assertion
      const normalize = (detector as any).normalizePathForGrouping;

      expect(normalize('/api/users/123')).toBe('/api/users/{id}');
      expect(normalize('/api/data/550e8400-e29b-41d4-a716-446655440000')).toBe('/api/data/{uuid}');
      expect(normalize('/api/cycle/456?param=value')).toBe('/api/cycle/{id}');
    });

    it('should calculate variance correctly', () => {
      const detector = new MetadataDetector();
      const calculateVariance = (detector as any).calculateVariance;

      expect(calculateVariance([])).toBe(0);
      expect(calculateVariance([1, 1, 1, 1])).toBe(0);
      expect(calculateVariance([1, 2, 3, 4, 5])).toBeCloseTo(2, 0);
    });

    it('should group requests by time windows correctly', () => {
      const detector = new MetadataDetector();
      const baseTime = Date.now();
      const requests: RequestMetadata[] = [
        detector.createMockRequestMetadata('/api/1', baseTime),
        detector.createMockRequestMetadata('/api/2', baseTime + 30000), // 30s later
        detector.createMockRequestMetadata('/api/3', baseTime + 70000), // 70s later (new window)
        detector.createMockRequestMetadata('/api/4', baseTime + 80000), // 80s later (same window as #3)
      ];

      const groupRequests = (detector as any).groupRequestsByTime;
      const groups = groupRequests(requests, 60000); // 1 minute windows

      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(2); // First two requests
      expect(groups[1].length).toBe(2); // Last two requests
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate higher risk scores for severe patterns', async () => {
      const highRiskRequests: RequestMetadata[] = [];
      const baseTime = Date.now();

      // Create requests with multiple high-severity violations
      for (let i = 0; i < 10; i++) {
        highRiskRequests.push({
          timestamp: baseTime + i * 1000,
          size: 1337, // Consistent size pattern
          duration: i % 2 === 0 ? 50 : 300, // High timing variance
          headers: {
            'X-Real-IP': '192.168.1.100',
            'X-Device-ID': `device-${i}`,
            'X-Tracking-ID': 'utm_source=test',
            'Content-Type': 'image/png', // Canvas fingerprinting
          },
          path: `/api/cycle/canvas-${i}`, // Sensitive + fingerprinting
          method: 'GET',
          statusCode: 200,
        });
      }

      const result = await detector.analyzeMetadata(highRiskRequests);

      expect(result.details.riskScore).toBeGreaterThan(70);
      expect(result.passed).toBe(false);
    });

    it('should calculate lower risk scores for benign patterns', async () => {
      const benignRequests: RequestMetadata[] = [];
      const baseTime = Date.now();

      // Create normal-looking requests
      for (let i = 0; i < 5; i++) {
        benignRequests.push(
          detector.createMockRequestMetadata(
            `/api/public/status-${i}`,
            baseTime + (i * 2000 + Math.random() * 1000), // Varied timing
            1000 + Math.random() * 500, // Varied size
            100 + Math.random() * 50 // Varied duration
          )
        );
      }

      const result = await detector.analyzeMetadata(benignRequests);

      expect(result.details.riskScore).toBeLessThan(30);
      expect(result.passed).toBe(true);
    });
  });
});
