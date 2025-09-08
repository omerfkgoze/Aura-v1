import * as fc from 'fast-check';
import { z } from 'zod';

/**
 * Property-based testing framework for crypto operations and data handling
 * Ensures security properties hold across all possible inputs
 */

export interface PropertyTestConfig {
  /** Number of test runs per property */
  runs: number;
  /** Maximum shrinking iterations */
  maxShrinkRuns: number;
  /** Random seed for reproducible tests */
  seed?: number;
  /** Timeout per test run in milliseconds */
  timeout: number;
}

export interface SecurityProperty<T> {
  /** Name of the security property being tested */
  name: string;
  /** Generator for test data */
  generator: fc.Arbitrary<T>;
  /** Property predicate that must always return true */
  predicate: (data: T) => boolean;
  /** Optional precondition filter */
  precondition?: (data: T) => boolean;
}

export class PropertyTestingSuite {
  private readonly config: PropertyTestConfig;

  constructor(config: Partial<PropertyTestConfig> = {}) {
    this.config = {
      runs: 1000,
      maxShrinkRuns: 100,
      timeout: 5000,
      ...config,
    };
  }

  /**
   * Run a security property test
   */
  async testSecurityProperty<T>(property: SecurityProperty<T>): Promise<void> {
    const { name, generator, predicate, precondition } = property;

    return fc.assert(
      fc.property(generator, data => {
        if (precondition && !precondition(data)) {
          return true; // Skip test if precondition not met
        }
        return predicate(data);
      }),
      {
        numRuns: this.config.runs,
        maxSkipsPerRun: 100,
        seed: this.config.seed,
        timeout: this.config.timeout,
        verbose: 2,
        examples: [],
      }
    );
  }

  /**
   * Create crypto envelope property tests
   */
  createCryptoEnvelopeTests(): SecurityProperty<any>[] {
    return [
      {
        name: 'Crypto envelope must have required structure',
        generator: fc.record({
          version: fc.nat({ max: 10 }),
          algorithm: fc.oneof(
            fc.constant('XChaCha20Poly1305'),
            fc.constant('AES-256-GCM'),
            fc.string().filter(s => !['XChaCha20Poly1305', 'AES-256-GCM'].includes(s))
          ),
          kdfParams: fc.record({
            algorithm: fc.oneof(fc.constant('Argon2id'), fc.string()),
            memory: fc.nat({ max: 1000000 }),
            iterations: fc.nat({ max: 100 }),
            parallelism: fc.nat({ max: 32 }),
          }),
          salt: fc.base64String({ minLength: 1, maxLength: 100 }),
          nonce: fc.base64String({ minLength: 1, maxLength: 100 }),
          keyId: fc.string(),
          aad: fc.record({
            userId: fc.uuid(),
            recordId: fc.uuid(),
            tableName: fc.string(),
            version: fc.nat(),
            timestamp: fc.date().map(d => d.toISOString()),
          }),
        }),
        predicate: envelope => {
          // Valid envelopes must pass validation
          if (envelope.algorithm === 'XChaCha20Poly1305' || envelope.algorithm === 'AES-256-GCM') {
            return (
              envelope.kdfParams.algorithm === 'Argon2id' &&
              envelope.kdfParams.memory >= 65536 &&
              envelope.kdfParams.iterations >= 3 &&
              envelope.kdfParams.parallelism >= 1 &&
              envelope.salt.length >= 44 && // 32 bytes base64
              envelope.aad.userId.length > 0 &&
              envelope.aad.recordId.length > 0
            );
          }
          return true; // Invalid algorithms should be caught by validator
        },
      },
      {
        name: 'Base64 encoded fields must be properly formatted',
        generator: fc.record({
          salt: fc.base64String({ minLength: 44, maxLength: 44 }),
          nonce: fc.base64String({ minLength: 16, maxLength: 32 }),
        }),
        predicate: data => {
          try {
            Buffer.from(data.salt, 'base64');
            Buffer.from(data.nonce, 'base64');
            return true;
          } catch {
            return false;
          }
        },
      },
    ];
  }

  /**
   * Create PII detection property tests
   */
  createPIIDetectionTests(): SecurityProperty<string>[] {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/, // Phone number
    ];

    return [
      {
        name: 'Text containing PII must be detected',
        generator: fc.oneof(
          fc.string().filter(s => !piiPatterns.some(pattern => pattern.test(s))), // No PII
          fc.string().map(s => s + ' 123-45-6789'), // With SSN
          fc.string().map(s => s + ' 4111-1111-1111-1111'), // With credit card
          fc.string().map(s => s + ' test@example.com'), // With email
          fc.string().map(s => s + ' 555-123-4567') // With phone
        ),
        predicate: text => {
          const containsPII = piiPatterns.some(pattern => pattern.test(text));
          const detectedPII = this.detectPII(text);
          return containsPII === detectedPII;
        },
      },
    ];
  }

  /**
   * Create network security property tests
   */
  createNetworkSecurityTests(): SecurityProperty<any>[] {
    return [
      {
        name: 'Network requests must not contain plaintext PII',
        generator: fc.record({
          method: fc.oneof(
            fc.constant('GET'),
            fc.constant('POST'),
            fc.constant('PUT'),
            fc.constant('DELETE')
          ),
          headers: fc.dictionary(fc.string(), fc.string()),
          body: fc.oneof(fc.constant(null), fc.string(), fc.object()),
          url: fc.webUrl(),
        }),
        predicate: request => {
          const requestStr = JSON.stringify(request);
          return !this.detectPII(requestStr);
        },
      },
      {
        name: 'TLS configuration must meet minimum security standards',
        generator: fc.record({
          protocol: fc.oneof(
            fc.constant('TLSv1.2'),
            fc.constant('TLSv1.3'),
            fc.constant('TLSv1.1'),
            fc.constant('TLSv1.0')
          ),
          cipherSuite: fc.oneof(
            fc.constant('ECDHE-RSA-AES256-GCM-SHA384'),
            fc.constant('ECDHE-RSA-AES128-GCM-SHA256'),
            fc.constant('AES256-SHA') // Weak cipher
          ),
          certificateValid: fc.boolean(),
          certificatePinned: fc.boolean(),
        }),
        predicate: tlsConfig => {
          const isSecureProtocol = ['TLSv1.2', 'TLSv1.3'].includes(tlsConfig.protocol);
          const isSecureCipher = tlsConfig.cipherSuite.includes('GCM');
          const isSecure =
            isSecureProtocol &&
            isSecureCipher &&
            tlsConfig.certificateValid &&
            tlsConfig.certificatePinned;

          // Property: Either the configuration is secure, or it should be rejected
          return isSecure || !this.shouldAcceptTLSConfig(tlsConfig);
        },
      },
    ];
  }

  /**
   * Create RLS policy property tests
   */
  createRLSPolicyTests(): SecurityProperty<any>[] {
    return [
      {
        name: 'Database queries must enforce user isolation',
        generator: fc.record({
          query: fc.string(),
          userId: fc.uuid(),
          requestedUserId: fc.uuid(),
          tableName: fc.oneof(
            fc.constant('encrypted_user_prefs'),
            fc.constant('encrypted_cycle_data'),
            fc.constant('healthcare_share'),
            fc.constant('device_key')
          ),
        }),
        predicate: queryData => {
          const { userId, requestedUserId, tableName } = queryData;

          // Property: User can only access their own data
          if (userId !== requestedUserId) {
            return !this.wouldRLSAllowAccess(queryData);
          }
          return true;
        },
      },
    ];
  }

  /**
   * Run all security property tests
   */
  async runAllSecurityTests(): Promise<void> {
    const testSuites = [
      this.createCryptoEnvelopeTests(),
      this.createPIIDetectionTests(),
      this.createNetworkSecurityTests(),
      this.createRLSPolicyTests(),
    ];

    for (const suite of testSuites) {
      for (const test of suite) {
        try {
          await this.testSecurityProperty(test);
          console.log(`✓ Property test passed: ${test.name}`);
        } catch (error) {
          console.error(`✗ Property test failed: ${test.name}`, error);
          throw error;
        }
      }
    }
  }

  // Helper methods for property test predicates
  private detectPII(text: string): boolean {
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/, // Phone number
    ];
    return piiPatterns.some(pattern => pattern.test(text));
  }

  private shouldAcceptTLSConfig(config: any): boolean {
    // Mock implementation - in real code this would check against security policy
    const isSecureProtocol = ['TLSv1.2', 'TLSv1.3'].includes(config.protocol);
    const isSecureCipher = config.cipherSuite.includes('GCM');
    return (
      isSecureProtocol && isSecureCipher && config.certificateValid && config.certificatePinned
    );
  }

  private wouldRLSAllowAccess(queryData: any): boolean {
    // Mock implementation - in real code this would simulate RLS policy evaluation
    return queryData.userId === queryData.requestedUserId;
  }
}

/**
 * Default property testing configuration for security gates
 */
export const DEFAULT_SECURITY_PROPERTY_CONFIG: PropertyTestConfig = {
  runs: 1000,
  maxShrinkRuns: 100,
  timeout: 5000,
};

/**
 * Create property testing suite with security-focused configuration
 */
export function createSecurityPropertyTester(
  config?: Partial<PropertyTestConfig>
): PropertyTestingSuite {
  return new PropertyTestingSuite({ ...DEFAULT_SECURITY_PROPERTY_CONFIG, ...config });
}
