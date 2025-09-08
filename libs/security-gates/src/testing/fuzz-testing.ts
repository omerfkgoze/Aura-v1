import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fuzz testing integration for security validation
 * Automated input fuzzing to discover security vulnerabilities
 */

export interface FuzzTestConfig {
  /** Duration of fuzzing in seconds */
  duration: number;
  /** Maximum input size for fuzzing */
  maxInputSize: number;
  /** Number of parallel fuzzing processes */
  parallelism: number;
  /** Seed corpus directory */
  corpusDir: string;
  /** Output directory for crashes and results */
  outputDir: string;
  /** Timeout per individual test case in milliseconds */
  timeout: number;
}

export interface FuzzTestTarget {
  /** Name of the fuzz target */
  name: string;
  /** Function to fuzz */
  targetFunction: (input: Buffer) => any;
  /** Seed inputs for corpus */
  seedInputs: Buffer[];
  /** Expected error types that indicate security issues */
  securityErrorTypes: string[];
}

export class FuzzTestingSuite {
  private readonly config: FuzzTestConfig;

  constructor(config: Partial<FuzzTestConfig> = {}) {
    this.config = {
      duration: 60, // 1 minute default
      maxInputSize: 1024 * 1024, // 1MB
      parallelism: 4,
      corpusDir: './fuzz-corpus',
      outputDir: './fuzz-output',
      timeout: 10000,
      ...config,
    };

    this.ensureDirectories();
  }

  /**
   * Run fuzz testing against crypto envelope validation
   */
  async fuzzCryptoEnvelopeValidation(): Promise<void> {
    const target: FuzzTestTarget = {
      name: 'crypto-envelope-validation',
      targetFunction: this.fuzzCryptoEnvelopeTarget,
      seedInputs: this.generateCryptoEnvelopeSeedInputs(),
      securityErrorTypes: ['ValidationError', 'TypeError', 'RangeError', 'SyntaxError'],
    };

    await this.runFuzzTarget(target);
  }

  /**
   * Run fuzz testing against PII detection
   */
  async fuzzPIIDetection(): Promise<void> {
    const target: FuzzTestTarget = {
      name: 'pii-detection',
      targetFunction: this.fuzzPIIDetectionTarget,
      seedInputs: this.generatePIISeedInputs(),
      securityErrorTypes: ['SecurityError', 'Error'],
    };

    await this.runFuzzTarget(target);
  }

  /**
   * Run fuzz testing against network packet analysis
   */
  async fuzzNetworkPacketAnalysis(): Promise<void> {
    const target: FuzzTestTarget = {
      name: 'network-packet-analysis',
      targetFunction: this.fuzzNetworkPacketTarget,
      seedInputs: this.generateNetworkPacketSeedInputs(),
      securityErrorTypes: ['BufferError', 'ParseError', 'SecurityViolation'],
    };

    await this.runFuzzTarget(target);
  }

  /**
   * Run fuzz testing against RLS policy evaluation
   */
  async fuzzRLSPolicyEvaluation(): Promise<void> {
    const target: FuzzTestTarget = {
      name: 'rls-policy-evaluation',
      targetFunction: this.fuzzRLSPolicyTarget,
      seedInputs: this.generateRLSPolicySeedInputs(),
      securityErrorTypes: ['UnauthorizedAccess', 'PolicyViolation', 'SecurityError'],
    };

    await this.runFuzzTarget(target);
  }

  /**
   * Run all fuzz tests
   */
  async runAllFuzzTests(): Promise<void> {
    console.log('Starting comprehensive fuzz testing suite...');

    const fuzzTests = [
      this.fuzzCryptoEnvelopeValidation(),
      this.fuzzPIIDetection(),
      this.fuzzNetworkPacketAnalysis(),
      this.fuzzRLSPolicyEvaluation(),
    ];

    await Promise.all(fuzzTests);
    console.log('✓ All fuzz tests completed');
  }

  /**
   * Run a specific fuzz target
   */
  private async runFuzzTarget(target: FuzzTestTarget): Promise<void> {
    console.log(`Starting fuzz test: ${target.name}`);

    // Create corpus directory for this target
    const targetCorpusDir = path.join(this.config.corpusDir, target.name);
    const targetOutputDir = path.join(this.config.outputDir, target.name);

    fs.mkdirSync(targetCorpusDir, { recursive: true });
    fs.mkdirSync(targetOutputDir, { recursive: true });

    // Write seed inputs to corpus
    target.seedInputs.forEach((seedInput, index) => {
      const seedPath = path.join(targetCorpusDir, `seed_${index}`);
      fs.writeFileSync(seedPath, seedInput);
    });

    // Run fuzzing with timeout and error detection
    const startTime = Date.now();
    const endTime = startTime + this.config.duration * 1000;

    let testCount = 0;
    let crashCount = 0;

    while (Date.now() < endTime) {
      try {
        // Generate random input based on corpus
        const fuzzInput = this.generateFuzzInput(targetCorpusDir);

        // Run target function with timeout
        const result = await this.runWithTimeout(
          () => target.targetFunction(fuzzInput),
          this.config.timeout
        );

        testCount++;

        // Check for security violations in result
        if (this.detectSecurityViolation(result, target.securityErrorTypes)) {
          crashCount++;
          const crashPath = path.join(targetOutputDir, `crash_${crashCount}`);
          fs.writeFileSync(crashPath, fuzzInput);
          console.warn(`Security violation detected in ${target.name}: ${crashPath}`);
        }
      } catch (error) {
        testCount++;

        // Check if error indicates security issue
        if (this.isSecurityError(error, target.securityErrorTypes)) {
          crashCount++;
          const crashPath = path.join(targetOutputDir, `crash_${crashCount}`);
          const errorInfo = {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          };
          fs.writeFileSync(crashPath + '.error', JSON.stringify(errorInfo, null, 2));
          console.warn(`Security error in ${target.name}: ${error.message}`);
        }
      }

      // Brief pause to avoid overwhelming the system
      await this.sleep(1);
    }

    console.log(`✓ Fuzz test ${target.name} completed: ${testCount} tests, ${crashCount} crashes`);

    if (crashCount > 0) {
      throw new Error(`Fuzz testing found ${crashCount} security issues in ${target.name}`);
    }
  }

  /**
   * Fuzz target functions
   */
  private fuzzCryptoEnvelopeTarget = (input: Buffer): any => {
    try {
      const jsonStr = input.toString('utf8');
      const envelope = JSON.parse(jsonStr);

      // Mock crypto envelope validation
      this.validateCryptoEnvelope(envelope);
      return { valid: true, envelope };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  };

  private fuzzPIIDetectionTarget = (input: Buffer): any => {
    const text = input.toString('utf8', 0, Math.min(input.length, 10000));

    // Mock PII detection
    const piiFound = this.detectPII(text);
    return { text, piiFound };
  };

  private fuzzNetworkPacketTarget = (input: Buffer): any => {
    try {
      // Mock network packet parsing
      const packet = this.parseNetworkPacket(input);
      return { valid: true, packet };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  };

  private fuzzRLSPolicyTarget = (input: Buffer): any => {
    try {
      const policyStr = input.toString('utf8');
      const policyData = JSON.parse(policyStr);

      // Mock RLS policy evaluation
      const allowed = this.evaluateRLSPolicy(policyData);
      return { allowed, policy: policyData };
    } catch (error) {
      return { allowed: false, error: error.message };
    }
  };

  /**
   * Generate seed inputs for different fuzz targets
   */
  private generateCryptoEnvelopeSeedInputs(): Buffer[] {
    const validEnvelope = {
      version: 1,
      algorithm: 'XChaCha20Poly1305',
      kdfParams: {
        algorithm: 'Argon2id',
        memory: 65536,
        iterations: 3,
        parallelism: 1,
      },
      salt: 'YWJjZGVmZ2hpams' + 'bG1ub3BxcnN0dXZ3eHl6MTIzNDU2',
      nonce: 'YWJjZGVmZ2hpams',
      keyId: 'test-key-id',
      aad: {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        recordId: '987fcdeb-51a2-43d7-8f9e-123456789abc',
        tableName: 'encrypted_cycle_data',
        version: 1,
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    };

    return [
      Buffer.from(JSON.stringify(validEnvelope), 'utf8'),
      Buffer.from('{"invalid": "json"}', 'utf8'),
      Buffer.from('', 'utf8'),
      Buffer.from('null', 'utf8'),
      Buffer.from('[]', 'utf8'),
      Buffer.from('{"version":999999}', 'utf8'),
    ];
  }

  private generatePIISeedInputs(): Buffer[] {
    const samples = [
      'Hello world',
      'My SSN is 123-45-6789',
      'Contact me at test@example.com',
      'Call 555-123-4567',
      'Card number: 4111-1111-1111-1111',
      'No PII here',
      ''.repeat(1000), // Empty/long strings
    ];

    return samples.map(s => Buffer.from(s, 'utf8'));
  }

  private generateNetworkPacketSeedInputs(): Buffer[] {
    return [
      Buffer.from([0x45, 0x00, 0x00, 0x3c]), // IPv4 header start
      Buffer.from([0x08, 0x00, 0x45, 0x00]), // Ethernet + IP
      Buffer.alloc(0), // Empty packet
      Buffer.alloc(1500, 0xff), // Max ethernet frame
      Buffer.from('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n'),
    ];
  }

  private generateRLSPolicySeedInputs(): Buffer[] {
    const policies = [
      { userId: 'user1', requestedUserId: 'user1', action: 'read' },
      { userId: 'user1', requestedUserId: 'user2', action: 'read' },
      { userId: '', requestedUserId: 'user1', action: 'read' },
      {},
      { userId: null },
    ];

    return policies.map(p => Buffer.from(JSON.stringify(p), 'utf8'));
  }

  /**
   * Utility methods
   */
  private generateFuzzInput(corpusDir: string): Buffer {
    try {
      const files = fs.readdirSync(corpusDir);
      if (files.length === 0) {
        return Buffer.alloc(Math.random() * 1000);
      }

      const randomFile = files[Math.floor(Math.random() * files.length)];
      let input = fs.readFileSync(path.join(corpusDir, randomFile));

      // Apply random mutations
      input = this.mutateInput(input);

      return input;
    } catch {
      return Buffer.alloc(Math.random() * 1000);
    }
  }

  private mutateInput(input: Buffer): Buffer {
    const mutated = Buffer.from(input);
    const mutationCount = Math.floor(Math.random() * 10) + 1;

    for (let i = 0; i < mutationCount; i++) {
      const mutationType = Math.floor(Math.random() * 4);

      switch (mutationType) {
        case 0: // Bit flip
          if (mutated.length > 0) {
            const byteIndex = Math.floor(Math.random() * mutated.length);
            mutated[byteIndex] ^= 1 << Math.floor(Math.random() * 8);
          }
          break;
        case 1: // Insert random bytes
          const insertPos = Math.floor(Math.random() * (mutated.length + 1));
          const randomBytes = Buffer.alloc(Math.floor(Math.random() * 10));
          randomBytes.forEach((_, i) => (randomBytes[i] = Math.floor(Math.random() * 256)));
          return Buffer.concat([
            mutated.subarray(0, insertPos),
            randomBytes,
            mutated.subarray(insertPos),
          ]);
        case 2: // Delete bytes
          if (mutated.length > 1) {
            const deletePos = Math.floor(Math.random() * mutated.length);
            const deleteLen =
              Math.floor(Math.random() * Math.min(10, mutated.length - deletePos)) + 1;
            return Buffer.concat([
              mutated.subarray(0, deletePos),
              mutated.subarray(deletePos + deleteLen),
            ]);
          }
          break;
        case 3: // Replace bytes
          if (mutated.length > 0) {
            const replacePos = Math.floor(Math.random() * mutated.length);
            mutated[replacePos] = Math.floor(Math.random() * 256);
          }
          break;
      }
    }

    return mutated;
  }

  private async runWithTimeout<T>(fn: () => T, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeout);

      try {
        const result = fn();
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private detectSecurityViolation(result: any, securityErrorTypes: string[]): boolean {
    if (typeof result === 'object' && result.error) {
      return securityErrorTypes.some(
        errorType =>
          result.error.includes(errorType) ||
          result.error.includes('security') ||
          result.error.includes('unauthorized')
      );
    }
    return false;
  }

  private isSecurityError(error: any, securityErrorTypes: string[]): boolean {
    return securityErrorTypes.some(
      errorType =>
        error.name === errorType ||
        error.message.includes('security') ||
        error.message.includes('unauthorized') ||
        error.message.includes('violation')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private ensureDirectories(): void {
    fs.mkdirSync(this.config.corpusDir, { recursive: true });
    fs.mkdirSync(this.config.outputDir, { recursive: true });
  }

  // Mock implementations for fuzz targets
  private validateCryptoEnvelope(envelope: any): void {
    if (!envelope || typeof envelope !== 'object') {
      throw new Error('Invalid envelope structure');
    }
    if (!envelope.version || typeof envelope.version !== 'number') {
      throw new Error('Invalid version');
    }
    if (!['XChaCha20Poly1305', 'AES-256-GCM'].includes(envelope.algorithm)) {
      throw new Error('Unsupported algorithm');
    }
  }

  private detectPII(text: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    ];
    return piiPatterns.some(pattern => pattern.test(text));
  }

  private parseNetworkPacket(packet: Buffer): any {
    if (packet.length < 4) {
      throw new Error('Packet too small');
    }

    return {
      version: packet[0] >> 4,
      headerLength: packet[0] & 0xf,
      totalLength: packet.readUInt16BE(2),
    };
  }

  private evaluateRLSPolicy(policy: any): boolean {
    if (!policy.userId || !policy.requestedUserId) {
      return false;
    }
    return policy.userId === policy.requestedUserId;
  }
}

/**
 * Default fuzz testing configuration
 */
export const DEFAULT_FUZZ_CONFIG: FuzzTestConfig = {
  duration: 60,
  maxInputSize: 1024 * 1024,
  parallelism: 4,
  corpusDir: './fuzz-corpus',
  outputDir: './fuzz-output',
  timeout: 10000,
};

/**
 * Create fuzz testing suite with default configuration
 */
export function createFuzzTester(config?: Partial<FuzzTestConfig>): FuzzTestingSuite {
  return new FuzzTestingSuite({ ...DEFAULT_FUZZ_CONFIG, ...config });
}
