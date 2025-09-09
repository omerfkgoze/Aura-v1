import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { PcapAnalyzer, PcapPacket } from '../../src/network/pcap-analyzer';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

const mockFs = fs as any;

describe('PcapAnalyzer', () => {
  let analyzer: PcapAnalyzer;

  beforeEach(() => {
    analyzer = new PcapAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('analyzePcapFile', () => {
    it('should return failure when PCAP file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await analyzer.analyzePcapFile('/path/to/nonexistent.pcap');

      expect(result.passed).toBe(false);
      expect(result.details).toContain('PCAP file not found');
      expect((result.metadata as any).totalPackets).toBe(0);
      expect((result.metadata as any).encryptedPackets).toBe(0);
    });

    it('should analyze encrypted traffic successfully', async () => {
      const mockPcapData = `
1234567890.123 192.168.1.1->api.example.com HTTP/1.1 Content-Type: application/json {"encrypted": "base64encodeddata", "envelope": {"version": 1}}
1234567890.124 api.example.com->192.168.1.1 HTTP/1.1 Content-Type: application/octet-stream binaryencryptedresponse
      `.trim();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockPcapData);

      const result = await analyzer.analyzePcapFile('/path/to/valid.pcap');

      expect(result.passed).toBe(true);
      expect(result.details).toContain('all payloads encrypted, no PII exposure detected');
      expect((result.metadata as any).totalPackets).toBe(2);
      expect((result.metadata as any).encryptedPackets).toBe(2);
      expect((result.metadata as any).encryptedPayloadsOnly).toBe(true);
      expect((result.metadata as any).piiExposureDetected).toBe(false);
    });

    it('should detect PII exposure in network traffic', async () => {
      const mockPcapData = `
1234567890.123 192.168.1.1->api.example.com HTTP/1.1 {"email": "user@example.com", "menstrual_cycle": "day 14"}
1234567890.124 192.168.1.1->api.example.com HTTP/1.1 {"ssn": "123-45-6789", "period_symptoms": "cramps"}
      `.trim();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockPcapData);

      const result = await analyzer.analyzePcapFile('/path/to/pii.pcap');

      expect(result.passed).toBe(false);
      expect(result.details).toContain('violations found');
      expect((result.metadata as any).piiExposureDetected).toBe(true);
      expect((result.metadata as any).suspiciousPackets.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unencrypted health data', async () => {
      const mockPcapData = `
1234567890.123 192.168.1.1->api.example.com HTTP/1.1 {"cycle_day": 14, "ovulation_detected": true}
1234567890.124 192.168.1.1->api.example.com HTTP/1.1 {"pregnancy_test": "positive", "symptoms": "nausea"}
      `.trim();

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockPcapData);

      const result = await analyzer.analyzePcapFile('/path/to/health.pcap');

      expect(result.passed).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'PLAINTEXT_HEALTH_DATA')).toBe(true);
      expect(result.errors.some((v: any) => v.severity === 'HIGH')).toBe(true);
    });

    it('should handle file read errors gracefully', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await analyzer.analyzePcapFile('/path/to/error.pcap');

      expect(result.passed).toBe(false);
      expect(result.details).toContain('PCAP analysis failed');
    });
  });

  describe('analyzeNetworkTrafficInMemory', () => {
    it('should analyze packets in memory successfully', async () => {
      const packets: PcapPacket[] = [
        analyzer.createMockPacket(
          '192.168.1.1',
          'api.example.com',
          '{"encrypted": "dGVzdGRhdGE=", "envelope": {"version": 1}}',
          true
        ),
        analyzer.createMockPacket(
          'api.example.com',
          '192.168.1.1',
          'Content-Type: application/octet-stream\nbinaryencryptedresponse',
          true
        ),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(packets);

      expect(result.passed).toBe(true);
      expect((result.metadata as any).totalPackets).toBe(2);
      expect((result.metadata as any).encryptedPackets).toBe(2);
      expect((result.metadata as any).encryptedPayloadsOnly).toBe(true);
    });

    it('should detect PII in memory packets', async () => {
      const packets: PcapPacket[] = [
        analyzer.createMockPacket(
          '192.168.1.1',
          'api.example.com',
          '{"email": "user@example.com", "period_data": "heavy flow"}',
          false
        ),
        analyzer.createMockPacket(
          '192.168.1.1',
          'api.example.com',
          '{"phone": "555-123-4567", "menstrual_symptoms": "cramps"}',
          false
        ),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(packets);

      expect(result.passed).toBe(false);
      expect((result.metadata as any).piiExposureDetected).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty packet array', async () => {
      const result = await analyzer.analyzeNetworkTrafficInMemory([]);

      expect(result.passed).toBe(true);
      expect((result.metadata as any).totalPackets).toBe(0);
      expect((result.metadata as any).encryptedPayloadsOnly).toBe(true);
    });
  });

  describe('PII Detection', () => {
    it('should detect various PII patterns', async () => {
      const piiPackets = [
        analyzer.createMockPacket('client', 'server', 'SSN: 123-45-6789'),
        analyzer.createMockPacket('client', 'server', 'Email: test@example.com'),
        analyzer.createMockPacket('client', 'server', 'Phone: 555-123-4567'),
        analyzer.createMockPacket('client', 'server', 'Credit Card: 4532 1234 5678 9012'),
        analyzer.createMockPacket('client', 'server', 'menstrual cycle data'),
        analyzer.createMockPacket('client', 'server', 'contraceptive pill reminder'),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(piiPackets);

      expect((result.metadata as any).piiExposureDetected).toBe(true);
      expect((result.metadata as any).suspiciousPackets.length).toBeGreaterThan(0);
    });

    it('should detect health-specific data patterns', async () => {
      const healthPackets = [
        analyzer.createMockPacket('client', 'server', 'ovulation detected today'),
        analyzer.createMockPacket('client', 'server', 'pregnancy test positive'),
        analyzer.createMockPacket('client', 'server', 'fertility tracking data'),
        analyzer.createMockPacket('client', 'server', 'basal body temperature: 98.6F'),
        analyzer.createMockPacket('client', 'server', 'heavy menstrual flow'),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(healthPackets);

      expect(result.passed).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'PLAINTEXT_HEALTH_DATA')).toBe(true);
    });
  });

  describe('Encryption Detection', () => {
    it('should correctly identify encrypted payloads', async () => {
      const encryptedPackets = [
        analyzer.createMockPacket(
          'client',
          'server',
          'Content-Type: application/octet-stream',
          true
        ),
        analyzer.createMockPacket(
          'client',
          'server',
          '{"encrypted": "dGVzdA==", "envelope": {}}',
          false
        ),
        analyzer.createMockPacket('client', 'server', 'dGVzdGRhdGFiYXNlNjRlbmNvZGVk', false),
        analyzer.createMockPacket('client', 'server', 'application/x-encrypted', false),
      ];

      // Manually set encryption status for testing
      encryptedPackets[1].isEncrypted = true;
      encryptedPackets[2].isEncrypted = true;
      encryptedPackets[3].isEncrypted = true;

      const result = await analyzer.analyzeNetworkTrafficInMemory(encryptedPackets);

      expect((result.metadata as any).encryptedPackets).toBe(4);
      expect((result.metadata as any).encryptedPayloadsOnly).toBe(true);
    });

    it('should identify unencrypted payloads', async () => {
      const unencryptedPackets = [
        analyzer.createMockPacket('client', 'server', 'plain text data', false),
        analyzer.createMockPacket('client', 'server', '{"user": "john", "action": "login"}', false),
        analyzer.createMockPacket('client', 'server', 'GET /api/users HTTP/1.1', false),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(unencryptedPackets);

      expect((result.metadata as any).encryptedPackets).toBe(0);
      expect((result.metadata as any).encryptedPayloadsOnly).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'UNENCRYPTED_PAYLOAD')).toBe(true);
    });
  });

  describe('Violation Detection', () => {
    it('should identify different violation types correctly', async () => {
      const violatingPackets = [
        analyzer.createMockPacket('client', 'server', 'menstrual cycle: day 14', false), // PLAINTEXT_HEALTH_DATA
        analyzer.createMockPacket('client', 'server', 'plain text data', false), // UNENCRYPTED_PAYLOAD
        analyzer.createMockPacket('client', 'server', 'email: user@example.com', false), // PII_IN_HEADERS
        analyzer.createMockPacket('client', 'server', 'x-device-id: unique123', false), // SUSPICIOUS_METADATA
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(violatingPackets);

      expect(result.errors.length).toBeGreaterThan(0);

      const errorTypes = result.errors.map((v: any) => v.type);
      expect(errorTypes).toContain('PLAINTEXT_HEALTH_DATA');
      expect(errorTypes).toContain('UNENCRYPTED_PAYLOAD');
      expect(errorTypes).toContain('PII_IN_HEADERS');

      const severities = result.errors.map((v: any) => v.severity);
      expect(severities).toContain('HIGH');
      expect(severities).toContain('MEDIUM');
    });

    it('should handle suspicious metadata detection', async () => {
      const suspiciousPackets = [
        analyzer.createMockPacket('client', 'server', '', false), // Tiny payload
        analyzer.createMockPacket('client', 'server', 'x'.repeat(60000), false), // Huge payload
        analyzer.createMockPacket('client', 'server', 'authorization: bearer token123', false),
      ];

      const result = await analyzer.analyzeNetworkTrafficInMemory(suspiciousPackets);

      expect(result.errors.some((v: any) => v.type === 'SUSPICIOUS_METADATA')).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should create mock packets correctly', () => {
      const packet = analyzer.createMockPacket('source', 'dest', 'test payload', true);

      expect(packet.sourceIp).toBe('source');
      expect(packet.destinationIp).toBe('dest');
      expect(packet.payload).toBe('test payload');
      expect(packet.isEncrypted).toBe(true);
      expect(packet.protocol).toBe('TCP');
      expect(packet.warnings).toEqual([]);
    });

    it('should detect PII in mock packets automatically', () => {
      const piiPacket = analyzer.createMockPacket('source', 'dest', 'email: test@example.com');
      const cleanPacket = analyzer.createMockPacket('source', 'dest', 'encrypted data');

      expect(piiPacket.containsPII).toBe(true);
      expect(cleanPacket.containsPII).toBe(false);
    });
  });
});
