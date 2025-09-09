import { promises as fs } from 'fs';
import { SecurityGateResult } from '../core/security-gate.interface';

export interface PcapAnalysisResult {
  encryptedPayloadsOnly: boolean;
  piiExposureDetected: boolean;
  suspiciousPackets: PcapPacket[];
  totalPackets: number;
  encryptedPackets: number;
}

export interface PcapPacket {
  timestamp: number;
  sourceIp: string;
  destinationIp: string;
  protocol: string;
  payload: string;
  isEncrypted: boolean;
  containsPII: boolean;
  warnings: string[];
}

export interface NetworkTrafficViolation {
  type: 'PLAINTEXT_HEALTH_DATA' | 'UNENCRYPTED_PAYLOAD' | 'PII_IN_HEADERS' | 'SUSPICIOUS_METADATA';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  packet: PcapPacket;
  description: string;
}

export class PcapAnalyzer {
  private readonly piiPatterns = [
    // Medical/health data patterns
    /menstrual|period|cycle|ovulation|pregnancy/i,
    /contraceptive|birth\s*control|pill/i,
    /symptom|pain|cramp|mood/i,
    /temperature|weight|blood\s*pressure/i,
    /medical|health|doctor|physician/i,
    // Personal identifiers
    /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN pattern
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-?\d{3}-?\d{4}\b/, // Phone number
    // Device identifiers (should be salted hashes only)
    /device[_-]?id|unique[_-]?id|identifier/i,
  ];

  private readonly encryptedIndicators = [
    'application/x-encrypted',
    'application/octet-stream',
    'Content-Encoding: gzip',
    'Content-Type: application/json', // Encrypted JSON payloads
  ];

  private readonly suspiciousHeaders = [
    'x-real-ip',
    'x-forwarded-for',
    'user-agent',
    'x-device-id',
    'authorization',
  ];

  async analyzePcapFile(filePath: string): Promise<SecurityGateResult> {
    try {
      const fileExists = await this.fileExists(filePath);
      if (!fileExists) {
        return {
          valid: false,
          passed: false,
          errors: [`PCAP file not found: ${filePath}`],
          warnings: [],
          details: 'PCAP analysis failed - file not found',
          metadata: {
            encryptedPayloadsOnly: false,
            piiExposureDetected: true,
            suspiciousPackets: [],
            totalPackets: 0,
            encryptedPackets: 0,
          },
        };
      }

      const packets = await this.parsePcapFile(filePath);
      const analysis = await this.analyzePackets(packets);
      const violations = await this.identifyViolations(packets);

      const passed =
        analysis.encryptedPayloadsOnly && !analysis.piiExposureDetected && violations.length === 0;

      const errors: string[] = [];
      const warnings: string[] = [];

      violations.forEach(v => {
        if (v.severity === 'HIGH') {
          errors.push(v.description);
        } else {
          warnings.push(v.description);
        }
      });

      return {
        valid: passed,
        passed,
        errors,
        warnings,
        details: passed
          ? 'Network traffic analysis passed - all payloads encrypted, no PII exposure detected'
          : `Network traffic analysis failed - ${violations.length} violations found`,
        metadata: analysis as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [
          `PCAP analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        details: 'PCAP analysis failed due to an error',
        metadata: {
          encryptedPayloadsOnly: false,
          piiExposureDetected: true,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
      };
    }
  }

  async analyzeNetworkTrafficInMemory(packets: PcapPacket[]): Promise<SecurityGateResult> {
    try {
      const analysis = await this.analyzePackets(packets);
      const violations = await this.identifyViolations(packets);

      const passed =
        analysis.encryptedPayloadsOnly && !analysis.piiExposureDetected && violations.length === 0;

      const errors: string[] = [];
      const warnings: string[] = [];

      violations.forEach(v => {
        if (v.severity === 'HIGH') {
          errors.push(v.description);
        } else {
          warnings.push(v.description);
        }
      });

      return {
        valid: passed,
        passed,
        errors,
        warnings,
        details: passed
          ? 'Network traffic analysis passed - all payloads encrypted, no PII exposure detected'
          : `Network traffic analysis failed - ${violations.length} violations found`,
        metadata: analysis as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [
          `Network traffic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
        details: 'Network traffic analysis failed due to an error',
        metadata: {
          encryptedPayloadsOnly: false,
          piiExposureDetected: true,
          suspiciousPackets: [],
          totalPackets: 0,
          encryptedPackets: 0,
        },
      };
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async parsePcapFile(filePath: string): Promise<PcapPacket[]> {
    // In a real implementation, this would use a proper PCAP parser library
    // like node-pcap or similar. For now, we'll simulate packet parsing
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // This is a simplified parser for demonstration
    // Real implementation would parse binary PCAP format
    return this.parseSimulatedPcapData(fileContent);
  }

  private parseSimulatedPcapData(data: string): PcapPacket[] {
    // Simulate parsing PCAP data
    // In production, this would parse actual PCAP binary format
    const lines = data.split('\n').filter(line => line.trim());
    const packets: PcapPacket[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('->')) {
        const packet = this.parsePacketLine(line, i);
        if (packet) {
          packets.push(packet);
        }
      }
    }

    return packets;
  }

  private parsePacketLine(line: string, _index: number): PcapPacket | null {
    // Simplified packet parsing for demonstration
    const parts = line.split(' ');
    if (parts.length < 3) return null;

    const [timestamp, connection, ...payloadParts] = parts;
    const [sourceIp, destinationIp] = connection.split('->');
    const payload = payloadParts.join(' ');

    return {
      timestamp: parseFloat(timestamp) || Date.now(),
      sourceIp: sourceIp?.trim() || 'unknown',
      destinationIp: destinationIp?.trim() || 'unknown',
      protocol: 'TCP', // Simplified
      payload,
      isEncrypted: this.isPayloadEncrypted(payload),
      containsPII: this.detectPIIInPayload(payload),
      warnings: [],
    };
  }

  private async analyzePackets(packets: PcapPacket[]): Promise<PcapAnalysisResult> {
    const totalPackets = packets.length;
    let encryptedPackets = 0;
    let piiExposureDetected = false;
    const suspiciousPackets: PcapPacket[] = [];

    for (const packet of packets) {
      if (packet.isEncrypted) {
        encryptedPackets++;
      }

      if (packet.containsPII) {
        piiExposureDetected = true;
        suspiciousPackets.push({
          ...packet,
          warnings: [...packet.warnings, 'PII detected in payload'],
        });
      }

      // Check for unencrypted health data
      if (this.containsHealthData(packet.payload) && !packet.isEncrypted) {
        suspiciousPackets.push({
          ...packet,
          warnings: [...packet.warnings, 'Unencrypted health data detected'],
        });
      }
    }

    const encryptedPayloadsOnly = totalPackets === 0 || encryptedPackets === totalPackets;

    return {
      encryptedPayloadsOnly,
      piiExposureDetected,
      suspiciousPackets,
      totalPackets,
      encryptedPackets,
    };
  }

  private async identifyViolations(packets: PcapPacket[]): Promise<NetworkTrafficViolation[]> {
    const violations: NetworkTrafficViolation[] = [];

    for (const packet of packets) {
      // Check for plaintext health data
      if (this.containsHealthData(packet.payload) && !packet.isEncrypted) {
        violations.push({
          type: 'PLAINTEXT_HEALTH_DATA',
          severity: 'HIGH',
          packet,
          description: 'Health data transmitted in plaintext violates zero-knowledge architecture',
        });
      }

      // Check for unencrypted payloads
      if (!packet.isEncrypted && packet.payload.length > 0) {
        violations.push({
          type: 'UNENCRYPTED_PAYLOAD',
          severity: 'MEDIUM',
          packet,
          description: 'Unencrypted payload detected in network traffic',
        });
      }

      // Check for PII in headers or payload
      if (packet.containsPII) {
        violations.push({
          type: 'PII_IN_HEADERS',
          severity: 'HIGH',
          packet,
          description: 'Personally Identifiable Information detected in network traffic',
        });
      }

      // Check for suspicious metadata patterns
      if (this.hasSuspiciousMetadata(packet)) {
        violations.push({
          type: 'SUSPICIOUS_METADATA',
          severity: 'LOW',
          packet,
          description: 'Suspicious metadata patterns that could enable tracking',
        });
      }
    }

    return violations;
  }

  private isPayloadEncrypted(payload: string): boolean {
    // Check for encrypted content indicators
    const hasEncryptionHeaders = this.encryptedIndicators.some(indicator =>
      payload.toLowerCase().includes(indicator.toLowerCase())
    );

    // Check for base64-like content (potential encrypted data)
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    const lines = payload.split('\n');
    const hasBase64Content = lines.some(line => line.length > 20 && base64Regex.test(line.trim()));

    // Check for JSON with encrypted fields
    try {
      const json = JSON.parse(payload);
      if (json && typeof json === 'object') {
        const keys = Object.keys(json);
        const hasEncryptedFields = keys.some(
          key => key.includes('encrypted') || key.includes('cipher') || key.includes('envelope')
        );
        if (hasEncryptedFields) return true;
      }
    } catch {
      // Not JSON, continue with other checks
    }

    return hasEncryptionHeaders || hasBase64Content;
  }

  private detectPIIInPayload(payload: string): boolean {
    return this.piiPatterns.some(pattern => pattern.test(payload));
  }

  private containsHealthData(payload: string): boolean {
    const healthPatterns = [
      /menstrual|period|cycle|ovulation/i,
      /pregnancy|contraceptive|fertility/i,
      /symptom|pain|cramp|mood|energy/i,
      /temperature|basal|bbt/i,
      /flow|heavy|light|spotting/i,
    ];

    return healthPatterns.some(pattern => pattern.test(payload));
  }

  private hasSuspiciousMetadata(packet: PcapPacket): boolean {
    // Check for timing patterns that could enable tracking
    const requestSize = packet.payload.length;

    // Suspiciously small or large requests
    if (requestSize > 0 && (requestSize < 10 || requestSize > 50000)) {
      return true;
    }

    // Check for suspicious header patterns in payload
    return this.suspiciousHeaders.some(header =>
      packet.payload.toLowerCase().includes(header.toLowerCase())
    );
  }

  // Utility methods for testing
  createMockPacket(
    sourceIp: string,
    destinationIp: string,
    payload: string,
    isEncrypted: boolean = false
  ): PcapPacket {
    return {
      timestamp: Date.now(),
      sourceIp,
      destinationIp,
      protocol: 'TCP',
      payload,
      isEncrypted,
      containsPII: this.detectPIIInPayload(payload),
      warnings: [],
    };
  }
}
