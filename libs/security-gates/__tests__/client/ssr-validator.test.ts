/**
 * SSR-PII Prevention Validation Tests
 *
 * Comprehensive tests for SSR validator ensuring no plaintext sensitive data
 * is included in server-side rendered HTML output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SSRValidator from '../../src/client/ssr-validator';

describe('SSRValidator', () => {
  let validator: SSRValidator;

  beforeEach(() => {
    validator = new SSRValidator();
  });

  describe('HTML Content Validation', () => {
    it('should pass for clean HTML without PII', async () => {
      const cleanHTML = `
        <html>
          <head><title>Dashboard</title></head>
          <body>
            <div id="app">
              <h1>Welcome to Aura</h1>
              <p>Your health tracking dashboard</p>
            </div>
          </body>
        </html>
      `;

      const result = await validator.validateHTML(cleanHTML, 'test-page');

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('should fail for HTML containing cycle data', async () => {
      const piiHTML = `
        <html>
          <head><title>Dashboard</title></head>
          <body>
            <div id="app">
              <div data-cycle-data="period started today">
                Cycle information loaded
              </div>
            </div>
          </body>
        </html>
      `;

      const result = await validator.validateHTML(piiHTML, 'dashboard');

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);

      // Check for critical violations
      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    it('should detect crypto material in HTML', async () => {
      const cryptoHTML = `
        <html>
          <body>
            <script type="application/json">
              {
                "key": "dGVzdGtleTE2Yml0ZXNsb25nZGF0YQ==",
                "salt": "abcdef1234567890abcdef1234567890"
              }
            </script>
          </body>
        </html>
      `;

      const result = await validator.validateHTML(cryptoHTML, 'crypto-test');

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'pii_exposure')).toBe(true);

      const highSeverityViolations = result.violations.filter(
        v => v.severity === 'high' || v.severity === 'critical'
      );
      expect(highSeverityViolations.length).toBeGreaterThan(0);
    });

    it('should detect personal information in meta tags', async () => {
      const personalInfoHTML = `
        <html>
          <head>
            <meta name="user-email" content="user@example.com">
            <meta property="user-phone" content="+1-555-123-4567">
          </head>
          <body></body>
        </html>
      `;

      const result = await validator.validateHTML(personalInfoHTML, 'personal-info-test');

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === 'pii_exposure')).toBe(true);
    });

    it('should ignore HTML comments and CSS comments', async () => {
      const htmlWithComments = `
        <html>
          <!-- This comment contains cycle data but should be ignored -->
          <head>
            <style>
              /* menstrual cycle styles - this is just a comment */
              .dashboard { color: blue; }
            </style>
          </head>
          <body></body>
        </html>
      `;

      const result = await validator.validateHTML(htmlWithComments, 'comments-test');

      // Should pass because comments are exempt
      expect(result.isValid).toBe(true);
    });
  });

  describe('Batch Page Validation', () => {
    it('should validate multiple pages and return results map', async () => {
      const pages = new Map([
        ['/home', '<html><body><h1>Home</h1></body></html>'],
        ['/dashboard', '<html><body><div data-cycle="active">Dashboard</div></body></html>'],
        ['/settings', '<html><body><h1>Settings</h1></body></html>'],
      ]);

      const results = await validator.validatePages(pages);

      expect(results.size).toBe(3);
      expect(results.has('/home')).toBe(true);
      expect(results.has('/dashboard')).toBe(true);
      expect(results.has('/settings')).toBe(true);

      // Home and settings should pass
      expect(results.get('/home')?.isValid).toBe(true);
      expect(results.get('/settings')?.isValid).toBe(true);

      // Dashboard should fail due to cycle data
      expect(results.get('/dashboard')?.isValid).toBe(false);
    });
  });

  describe('Page Component Validation', () => {
    it('should detect getServerSideProps usage', async () => {
      const componentWithSSR = 'getServerSideProps function detected';

      const result = await validator.validatePageComponent(componentWithSSR);

      expect(result.isValid).toBe(false);
      expect(
        result.violations.some(v => v.type === 'pii_exposure' && v.severity === 'critical')
      ).toBe(true);
    });

    it('should pass for components without SSR', async () => {
      const componentWithoutSSR = 'regular component code';

      const result = await validator.validatePageComponent(componentWithoutSSR);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Risk Scoring', () => {
    it('should assign higher risk scores to health data violations', async () => {
      const healthDataHTML = `
        <html><body>
          <div>menstrual cycle tracking active</div>
          <div>fertility window detected</div>
        </body></html>
      `;

      const result = await validator.validateHTML(healthDataHTML, 'health-test');

      expect(result.riskScore).toBeGreaterThan(100); // Should be high risk

      const criticalViolations = result.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations.length).toBeGreaterThan(0);
    });

    it('should assign medium risk to general PII', async () => {
      const generalPiiHTML = `
        <html><body>
          <div>Phone: +1-555-123-4567</div>
        </body></html>
      `;

      const result = await validator.validateHTML(generalPiiHTML, 'general-pii-test');

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThan(200); // Should be less than health data
    });
  });

  describe('Recommendations Generation', () => {
    it('should provide specific recommendations for health data violations', async () => {
      const healthDataHTML = `
        <html><body>
          <div>cycle data exposed</div>
        </body></html>
      `;

      const result = await validator.validateHTML(healthDataHTML, 'health-rec-test');

      expect(result.recommendations).toContain(
        'Implement client-side encryption for all health data before any rendering'
      );
      expect(result.recommendations).toContain(
        'Use Next.js dynamic imports with { ssr: false } for health-related components'
      );
    });

    it('should provide crypto-specific recommendations for crypto violations', async () => {
      const cryptoHTML = `
        <html><body>
          <div>-----BEGIN PRIVATE KEY-----</div>
        </body></html>
      `;

      const result = await validator.validateHTML(cryptoHTML, 'crypto-rec-test');

      expect(result.recommendations).toContain(
        'Never include cryptographic material in server-side rendered content'
      );
      expect(result.recommendations).toContain(
        'Use secure crypto-core operations for all encryption/decryption on client-side only'
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive validation report', async () => {
      const pages = new Map([
        ['/clean', '<html><body>Clean page</body></html>'],
        ['/violations', '<html><body><div>cycle data here</div></body></html>'],
      ]);

      const results = await validator.validatePages(pages);
      const report = validator.generateReport(results);

      expect(report).toContain('SSR-PII Prevention Validation Report');
      expect(report).toContain('Total Pages Validated: 2');
      expect(report).toContain('Valid Pages (no PII): 1');
      expect(report).toContain('Pages with Violations: 1');
      expect(report).toMatch(/✅ PASS|❌ FAIL/);
    });

    it('should show PASS for all clean pages', async () => {
      const cleanPages = new Map([
        ['/home', '<html><body>Home</body></html>'],
        ['/about', '<html><body>About</body></html>'],
      ]);

      const results = await validator.validatePages(cleanPages);
      const report = validator.generateReport(results);

      expect(report).toContain('✅ PASS - SSR-PII Prevention');
      expect(report).toContain('Valid Pages (no PII): 2');
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom patterns', async () => {
      const customValidator = new SSRValidator({
        customPatterns: [/customSensitiveData/gi],
        maxRiskScore: 10,
      });

      const customHTML = '<html><body>customSensitiveData found</body></html>';
      const result = await customValidator.validateHTML(customHTML, 'custom-test');

      expect(result.isValid).toBe(false);
      expect(
        result.violations.some(v => v.pattern?.toString().includes('customSensitiveData'))
      ).toBe(true);
    });

    it('should respect exempt patterns', async () => {
      const exemptValidator = new SSRValidator({
        exemptPatterns: [/cycle\s*data/gi],
      });

      const exemptHTML = '<html><body>cycle data should be exempt</body></html>';
      const result = await exemptValidator.validateHTML(exemptHTML, 'exempt-test');

      // Should pass because cycle data is exempt
      expect(result.isValid).toBe(true);
    });
  });
});
