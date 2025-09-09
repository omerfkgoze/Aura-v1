import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TlsInspector, CertificateDetails, TlsViolation } from '../../src/network/tls-inspector';

describe('TlsInspector', () => {
  let inspector: TlsInspector;

  beforeEach(() => {
    inspector = new TlsInspector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('inspectTlsConnection', () => {
    it('should pass inspection for secure TLS connection', async () => {
      // Add pinned certificate for testing
      inspector.addPinnedCertificate(
        'api.aura-app.com',
        'SHA256:ABCD1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB'
      );

      const result = await inspector.inspectTlsConnection('api.aura-app.com', 443);

      expect(result.passed).toBe(true);
      expect(result.details).toContain('TLS inspection passed');
      expect((result.metadata as any).certificateValid).toBe(true);
      expect((result.metadata as any).tlsVersionSecure).toBe(true);
      expect((result.metadata as any).cipherSuiteSecure).toBe(true);
    });

    it('should fail inspection for non-pinned certificate', async () => {
      const result = await inspector.inspectTlsConnection('unknown-host.com', 443);

      expect(result.passed).toBe(false);
      expect((result.metadata as any).certificatePinned).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'CERTIFICATE_NOT_PINNED')).toBe(true);
    });

    it('should handle connection timeout gracefully', async () => {
      const result = await inspector.inspectTlsConnection('nonexistent-host.invalid', 443, 100);

      expect(result.passed).toBe(false);
      expect(result.details).toContain('TLS inspection failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect certificate expiration warnings', async () => {
      // Mock a certificate that expires soon
      const mockInspector = new TlsInspector();

      // Create a spy to return an almost-expired certificate
      vi.spyOn(mockInspector as any, 'analyzeTlsConnection').mockImplementation(async () => {
        const now = new Date();
        const expiringSoon = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

        return {
          certificateValid: true,
          certificatePinned: false,
          cipherSuiteSecure: true,
          tlsVersionSecure: true,
          certificateDetails: {
            subject: 'CN=expiring.example.com',
            issuer: 'CN=Test CA',
            validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            validTo: expiringSoon,
            serialNumber: '12345',
            fingerprint: 'SHA256:TEST123',
            keyAlgorithm: 'RSA',
            keySize: 2048,
            signatureAlgorithm: 'sha256WithRSAEncryption',
            san: ['expiring.example.com'],
          },
          vulnerabilities: [],
        };
      });

      const result = await mockInspector.inspectTlsConnection('expiring.example.com', 443);

      expect(result.errors.some((v: any) => v.type === 'CERTIFICATE_EXPIRED')).toBe(true);
      expect(result.errors.some((v: any) => v.severity === 'MEDIUM')).toBe(true);
    });
  });

  describe('inspectCertificateFile', () => {
    it('should validate certificate file successfully', async () => {
      const result = await inspector.inspectCertificateFile('/path/to/valid-cert.pem');

      expect(result.passed).toBe(true);
      expect(result.details).toContain('Certificate validation passed');
      expect((result.metadata as any).certificateDetails.subject).toContain('CN=example.com');
    });

    it('should handle invalid certificate file paths', async () => {
      const result = await inspector.inspectCertificateFile('/path/to/nonexistent.pem');

      expect(result.passed).toBe(false);
      expect(result.details).toContain('Certificate inspection failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect localhost certificates', async () => {
      const result = await inspector.inspectCertificateFile('/path/to/localhost.pem');

      expect((result.metadata as any).certificateDetails.subject).toContain('CN=localhost');
      expect((result.metadata as any).certificateDetails.san).toContain('localhost');
    });
  });

  describe('Certificate Pinning Management', () => {
    it('should add and verify pinned certificates', () => {
      const hostname = 'test.example.com';
      const fingerprint = 'SHA256:TEST123456789ABCDEF';

      inspector.addPinnedCertificate(hostname, fingerprint);
      const pinnedCerts = inspector.getPinnedCertificates(hostname);

      expect(pinnedCerts).toContain(fingerprint);
    });

    it('should remove pinned certificates', () => {
      const hostname = 'test.example.com';
      const fingerprint1 = 'SHA256:TEST123';
      const fingerprint2 = 'SHA256:TEST456';

      inspector.addPinnedCertificate(hostname, fingerprint1);
      inspector.addPinnedCertificate(hostname, fingerprint2);
      inspector.removePinnedCertificate(hostname, fingerprint1);

      const pinnedCerts = inspector.getPinnedCertificates(hostname);
      expect(pinnedCerts).not.toContain(fingerprint1);
      expect(pinnedCerts).toContain(fingerprint2);
    });

    it('should handle empty pinned certificate list', () => {
      const pinnedCerts = inspector.getPinnedCertificates('nonexistent.com');
      expect(pinnedCerts).toEqual([]);
    });

    it('should remove hostname entry when all certificates are removed', () => {
      const hostname = 'test.example.com';
      const fingerprint = 'SHA256:TEST123';

      inspector.addPinnedCertificate(hostname, fingerprint);
      inspector.removePinnedCertificate(hostname, fingerprint);

      const pinnedCerts = inspector.getPinnedCertificates(hostname);
      expect(pinnedCerts).toEqual([]);
    });
  });

  describe('TLS Security Validation', () => {
    it('should identify secure TLS configurations', async () => {
      inspector.addPinnedCertificate(
        'secure.example.com',
        'SHA256:SECURE123456789ABCDEF123456789ABCDEF123456789ABCDEF123456789ABC'
      );

      const result = await inspector.inspectTlsConnection('secure.example.com', 443);

      expect((result.metadata as any).certificatePinned).toBe(true);
      expect((result.metadata as any).tlsVersionSecure).toBe(true);
      expect((result.metadata as any).cipherSuiteSecure).toBe(true);
    });

    it('should detect weak cipher suites', async () => {
      // Mock weak cipher suite detection
      const mockInspector = new TlsInspector();
      vi.spyOn(mockInspector as any, 'analyzeTlsConnection').mockImplementation(async () => ({
        certificateValid: true,
        certificatePinned: false,
        cipherSuiteSecure: false, // Weak cipher detected
        tlsVersionSecure: true,
        certificateDetails: inspector['createMockCertificateDetails']('weak.example.com'),
        vulnerabilities: [],
      }));

      const result = await mockInspector.inspectTlsConnection('weak.example.com', 443);

      expect(result.passed).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'WEAK_CIPHER')).toBe(true);
      expect(result.errors.some((v: any) => v.severity === 'HIGH')).toBe(true);
    });

    it('should detect insecure TLS versions', async () => {
      // Mock insecure TLS version detection
      const mockInspector = new TlsInspector();
      vi.spyOn(mockInspector as any, 'analyzeTlsConnection').mockImplementation(async () => ({
        certificateValid: true,
        certificatePinned: false,
        cipherSuiteSecure: true,
        tlsVersionSecure: false, // Weak TLS version
        certificateDetails: inspector['createMockCertificateDetails']('oldtls.example.com'),
        vulnerabilities: [],
      }));

      const result = await mockInspector.inspectTlsConnection('oldtls.example.com', 443);

      expect(result.passed).toBe(false);
      expect(result.errors.some((v: any) => v.type === 'WEAK_TLS_VERSION')).toBe(true);
      expect(result.errors.some((v: any) => v.severity === 'HIGH')).toBe(true);
    });
  });

  describe('Certificate Validation', () => {
    it('should validate certificate properties correctly', async () => {
      const validCert: CertificateDetails = {
        subject: 'CN=valid.example.com',
        issuer: 'CN=Valid CA, O=Test CA, C=US',
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        serialNumber: '03:A4:F2:E5:7B:1C:9D:8E',
        fingerprint: 'SHA256:VALID123456789ABCDEF',
        keyAlgorithm: 'RSA',
        keySize: 2048,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        san: ['valid.example.com'],
      };

      const isValid = await (inspector as any).validateCertificateDetails(validCert);
      expect(isValid).toBe(true);
    });

    it('should reject expired certificates', async () => {
      const expiredCert: CertificateDetails = {
        subject: 'CN=expired.example.com',
        issuer: 'CN=Expired CA',
        validFrom: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
        validTo: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
        serialNumber: '12345',
        fingerprint: 'SHA256:EXPIRED123',
        keyAlgorithm: 'RSA',
        keySize: 2048,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        san: ['expired.example.com'],
      };

      const isValid = await (inspector as any).validateCertificateDetails(expiredCert);
      expect(isValid).toBe(false);
    });

    it('should reject certificates with weak key sizes', async () => {
      const weakKeyCert: CertificateDetails = {
        subject: 'CN=weak.example.com',
        issuer: 'CN=Weak CA',
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        serialNumber: '12345',
        fingerprint: 'SHA256:WEAK123',
        keyAlgorithm: 'RSA',
        keySize: 1024, // Weak key size
        signatureAlgorithm: 'sha256WithRSAEncryption',
        san: ['weak.example.com'],
      };

      const isValid = await (inspector as any).validateCertificateDetails(weakKeyCert);
      expect(isValid).toBe(false);
    });

    it('should reject certificates with weak signature algorithms', async () => {
      const weakSigCert: CertificateDetails = {
        subject: 'CN=weaksig.example.com',
        issuer: 'CN=Weak Sig CA',
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        serialNumber: '12345',
        fingerprint: 'SHA256:WEAKSIG123',
        keyAlgorithm: 'RSA',
        keySize: 2048,
        signatureAlgorithm: 'md5WithRSAEncryption', // Weak signature algorithm
        san: ['weaksig.example.com'],
      };

      const isValid = await (inspector as any).validateCertificateDetails(weakSigCert);
      expect(isValid).toBe(false);
    });

    it('should reject not-yet-valid certificates', async () => {
      const futureCert: CertificateDetails = {
        subject: 'CN=future.example.com',
        issuer: 'CN=Future CA',
        validFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        serialNumber: '12345',
        fingerprint: 'SHA256:FUTURE123',
        keyAlgorithm: 'RSA',
        keySize: 2048,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        san: ['future.example.com'],
      };

      const isValid = await (inspector as any).validateCertificateDetails(futureCert);
      expect(isValid).toBe(false);
    });
  });

  describe('Violation Detection', () => {
    it('should generate appropriate recommendations for violations', async () => {
      const mockResult = {
        certificateValid: false,
        certificatePinned: false,
        cipherSuiteSecure: false,
        tlsVersionSecure: false,
        certificateDetails: inspector['createEmptyCertificateDetails'](),
        vulnerabilities: [],
      };

      const errors = await (inspector as any).identifyTlsViolations(mockResult, 'bad.example.com');

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((v: TlsViolation) => v.recommendation.length > 0)).toBe(true);

      const types = errors.map((v: TlsViolation) => v.type);
      expect(types).toContain('CERTIFICATE_INVALID');
      expect(types).toContain('CERTIFICATE_NOT_PINNED');
      expect(types).toContain('WEAK_CIPHER');
      expect(types).toContain('WEAK_TLS_VERSION');
    });

    it('should prioritize high-severity violations', async () => {
      const result = await inspector.inspectTlsConnection('insecure.example.com', 443);

      const mediumSeverityErrors = result.errors.filter((v: any) => v.severity === 'MEDIUM');

      // Certificate not pinned should be medium severity
      expect(mediumSeverityErrors.some((v: any) => v.type === 'CERTIFICATE_NOT_PINNED')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network connectivity issues', async () => {
      const result = await inspector.inspectTlsConnection('192.0.2.1', 443, 100); // Non-routable IP

      expect(result.passed).toBe(false);
      expect(result.details).toContain('TLS inspection failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid hostnames gracefully', async () => {
      const result = await inspector.inspectTlsConnection('', 443);

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid ports gracefully', async () => {
      const result = await inspector.inspectTlsConnection('example.com', -1);

      expect(result.passed).toBe(false);
      expect(result.details).toContain('TLS inspection failed');
    });
  });

  describe('Mock Certificate Generation', () => {
    it('should generate consistent mock certificates', () => {
      const cert1 = (inspector as any).createMockCertificateDetails('test.example.com');
      const cert2 = (inspector as any).createMockCertificateDetails('test.example.com');

      expect(cert1.subject).toBe(cert2.subject);
      expect(cert1.keyAlgorithm).toBe(cert2.keyAlgorithm);
      expect(cert1.keySize).toBe(cert2.keySize);
      expect(cert1.san).toEqual(cert2.san);
    });

    it('should generate different fingerprints for different calls', () => {
      const fingerprint1 = (inspector as any).generateFingerprint();
      const fingerprint2 = (inspector as any).generateFingerprint();

      expect(fingerprint1).not.toBe(fingerprint2);
      expect(fingerprint1.length).toBe(64);
      expect(fingerprint2.length).toBe(64);
      expect(/^[0-9A-F]+$/.test(fingerprint1)).toBe(true);
      expect(/^[0-9A-F]+$/.test(fingerprint2)).toBe(true);
    });
  });
});
