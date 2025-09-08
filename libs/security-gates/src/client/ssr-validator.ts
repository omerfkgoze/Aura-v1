/**
 * SSR-PII Prevention Testing Framework
 *
 * Automated validation system ensuring no plaintext sensitive data
 * is included in server-side rendered HTML output.
 *
 * This validator implements comprehensive testing for SSR-PII prevention
 * as specified in AC 6: Client-Side Security Validation Framework
 */

import { z } from 'zod';

// PII patterns that should never appear in SSR HTML
const PII_PATTERNS = [
  // Health Data Patterns (highest priority)
  /cycle\s*data/gi,
  /period\s*track/gi,
  /menstrual/gi,
  /ovulat/gi,
  /fertility/gi,
  /pregnancy/gi,
  /contracepti/gi,
  /sexual\s*health/gi,
  /reproductive/gi,
  /hormone/gi,
  /symptom/gi,
  /mood\s*track/gi,
  /temperature/gi,
  /cervical/gi,
  /luteal/gi,
  /follicular/gi,

  // Crypto Data Patterns
  /-----BEGIN\s+[A-Z\s]+KEY-----/gi,
  /[A-Za-z0-9+/]{32,}={0,2}/g, // Base64 patterns (32+ chars)
  /[0-9a-fA-F]{64,}/g, // Hex patterns (64+ chars)
  /argon2[id]?\$[^$]+\$[^$]+\$/gi,
  /scrypt\$[^$]+\$[^$]+\$/gi,

  // Personal Information
  /email["\s]*[:=]["\s]*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  /phone["\s]*[:=]["\s]*[\+]?[1-9]?[0-9]{7,15}/gi,
  /ssn["\s]*[:=]["\s]*\d{3}-\d{2}-\d{4}/gi,
  /birthdate["\s]*[:=]/gi,
  /dob["\s]*[:=]/gi,

  // Device and Crypto Identifiers
  /device[_\s]*id["\s]*[:=]/gi,
  /key[_\s]*id["\s]*[:=]/gi,
  /salt["\s]*[:=]/gi,
  /nonce["\s]*[:=]/gi,
  /iv["\s]*[:=]/gi,
  /aad["\s]*[:=]/gi,
];

// HTML elements that commonly leak PII in SSR
const RISKY_ELEMENTS = [
  'meta[name*="user"]',
  'meta[property*="user"]',
  'input[value]',
  'textarea',
  'script[type="application/json"]',
  'script[type="application/ld+json"]',
  '[data-user]',
  '[data-cycle]',
  '[data-health]',
  '[data-crypto]',
];

// Attributes that commonly contain PII
const RISKY_ATTRIBUTES = ['data-*', 'value', 'placeholder', 'aria-label', 'title', 'alt'];

export interface SSRValidationResult {
  isValid: boolean;
  violations: SSRViolation[];
  riskScore: number;
  recommendations: string[];
}

export interface SSRViolation {
  type: 'pii_exposure' | 'crypto_leak' | 'element_risk' | 'attribute_risk';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  content: string;
  pattern?: RegExp;
  element?: string;
  attribute?: string;
  recommendation: string;
}

export interface SSRValidationConfig {
  enableStrictMode: boolean;
  customPatterns: RegExp[];
  allowedElements: string[];
  exemptPatterns: RegExp[];
  maxRiskScore: number;
}

const DEFAULT_CONFIG: SSRValidationConfig = {
  enableStrictMode: true,
  customPatterns: [],
  allowedElements: [],
  exemptPatterns: [
    /<!--[\s\S]*?-->/g, // HTML comments
    /\/\*[\s\S]*?\*\//g, // CSS comments
  ],
  maxRiskScore: 0, // Zero tolerance for PII in SSR
};

export class SSRValidator {
  private config: SSRValidationConfig;
  private allPatterns: RegExp[];

  constructor(config: Partial<SSRValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.allPatterns = [...PII_PATTERNS, ...this.config.customPatterns];
  }

  /**
   * Validate HTML content for SSR-PII prevention compliance
   */
  async validateHTML(html: string, context: string = 'unknown'): Promise<SSRValidationResult> {
    const violations: SSRViolation[] = [];

    // Clean HTML from exempt patterns
    let cleanHtml = html;
    for (const exemptPattern of this.config.exemptPatterns) {
      cleanHtml = cleanHtml.replace(exemptPattern, '');
    }

    // Check for PII patterns in HTML content
    violations.push(...this.checkPIIPatterns(cleanHtml, context));

    // Check risky HTML elements
    violations.push(...(await this.checkRiskyElements(html, context)));

    // Check risky attributes
    violations.push(...(await this.checkRiskyAttributes(html, context)));

    // Calculate risk score
    const riskScore = this.calculateRiskScore(violations);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations);

    return {
      isValid: violations.length === 0 && riskScore <= this.config.maxRiskScore,
      violations,
      riskScore,
      recommendations,
    };
  }

  /**
   * Validate Next.js page component for SSR safety
   */
  async validatePageComponent(componentPath: string): Promise<SSRValidationResult> {
    // This would integrate with actual file system in real implementation
    const violations: SSRViolation[] = [];

    // Check for getServerSideProps usage
    violations.push(...(await this.checkServerSideProps(componentPath)));

    // Check for direct sensitive data usage
    violations.push(...(await this.checkComponentDataUsage(componentPath)));

    const riskScore = this.calculateRiskScore(violations);
    const recommendations = this.generateRecommendations(violations);

    return {
      isValid: violations.length === 0,
      violations,
      riskScore,
      recommendations,
    };
  }

  /**
   * Batch validate multiple HTML pages
   */
  async validatePages(pages: Map<string, string>): Promise<Map<string, SSRValidationResult>> {
    const results = new Map<string, SSRValidationResult>();

    for (const [pagePath, html] of pages) {
      const result = await this.validateHTML(html, pagePath);
      results.set(pagePath, result);
    }

    return results;
  }

  private checkPIIPatterns(html: string, context: string): SSRViolation[] {
    const violations: SSRViolation[] = [];

    for (const pattern of this.allPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          violations.push({
            type: 'pii_exposure',
            severity: this.getSeverityForPattern(pattern),
            location: context,
            content: match.substring(0, 100), // Limit content length
            pattern,
            recommendation: `Remove or encrypt sensitive data before SSR: "${match.substring(0, 50)}..."`,
          });
        }
      }
    }

    return violations;
  }

  private async checkRiskyElements(html: string, context: string): Promise<SSRViolation[]> {
    const violations: SSRViolation[] = [];

    // In a real implementation, this would use a DOM parser
    for (const elementSelector of RISKY_ELEMENTS) {
      const elementRegex = new RegExp(`<${elementSelector}[^>]*>`, 'gi');
      const matches = html.match(elementRegex);

      if (matches) {
        for (const match of matches) {
          violations.push({
            type: 'element_risk',
            severity: 'medium',
            location: context,
            content: match,
            element: elementSelector,
            recommendation: `Review element "${elementSelector}" for potential PII exposure`,
          });
        }
      }
    }

    return violations;
  }

  private async checkRiskyAttributes(html: string, context: string): Promise<SSRViolation[]> {
    const violations: SSRViolation[] = [];

    // Check for data attributes and other risky attributes
    const dataAttrRegex = /data-[a-zA-Z0-9-]+\s*=\s*["'][^"']*["']/gi;
    const matches = html.match(dataAttrRegex);

    if (matches) {
      for (const match of matches) {
        // Check if the data attribute contains sensitive patterns
        for (const pattern of this.allPatterns) {
          if (pattern.test(match)) {
            violations.push({
              type: 'attribute_risk',
              severity: 'high',
              location: context,
              content: match,
              attribute: match.split('=')[0].trim(),
              recommendation: `Sensitive data detected in attribute: ${match.split('=')[0].trim()}`,
            });
          }
        }
      }
    }

    return violations;
  }

  private async checkServerSideProps(componentPath: string): Promise<SSRViolation[]> {
    const violations: SSRViolation[] = [];

    // Check for getServerSideProps that might expose PII
    // This is a simplified implementation - real version would parse the file
    const hasGetServerSideProps = componentPath.includes('getServerSideProps');

    if (hasGetServerSideProps) {
      violations.push({
        type: 'pii_exposure',
        severity: 'critical',
        location: componentPath,
        content: 'getServerSideProps detected',
        recommendation:
          'Avoid getServerSideProps for pages with sensitive data. Use client-side data fetching with encryption.',
      });
    }

    return violations;
  }

  private async checkComponentDataUsage(componentPath: string): Promise<SSRViolation[]> {
    const violations: SSRViolation[] = [];

    // Check for direct sensitive data usage in component
    // This would analyze the actual component code in real implementation

    return violations;
  }

  private getSeverityForPattern(pattern: RegExp): 'critical' | 'high' | 'medium' | 'low' {
    const patternStr = pattern.toString();

    // Health data patterns are critical
    if (
      patternStr.includes('cycle') ||
      patternStr.includes('menstrual') ||
      patternStr.includes('fertility')
    ) {
      return 'critical';
    }

    // Crypto patterns are high severity
    if (
      patternStr.includes('BEGIN') ||
      patternStr.includes('argon2') ||
      patternStr.includes('[A-Za-z0-9+/]{32,}')
    ) {
      return 'high';
    }

    // Personal info is high severity
    if (
      patternStr.includes('email') ||
      patternStr.includes('phone') ||
      patternStr.includes('ssn')
    ) {
      return 'high';
    }

    return 'medium';
  }

  private calculateRiskScore(violations: SSRViolation[]): number {
    let score = 0;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score += 100;
          break;
        case 'high':
          score += 50;
          break;
        case 'medium':
          score += 25;
          break;
        case 'low':
          score += 10;
          break;
      }
    }

    return score;
  }

  private generateRecommendations(violations: SSRViolation[]): string[] {
    const recommendations = new Set<string>();

    // Add general recommendations based on violation types
    const hasHealth = violations.some(
      v => v.content.toLowerCase().includes('cycle') || v.content.toLowerCase().includes('health')
    );
    const hasCrypto = violations.some(
      v => v.type === 'pii_exposure' && (v.content.includes('BEGIN') || v.content.length > 50)
    );

    if (hasHealth) {
      recommendations.add(
        'Implement client-side encryption for all health data before any rendering'
      );
      recommendations.add(
        'Use Next.js dynamic imports with { ssr: false } for health-related components'
      );
    }

    if (hasCrypto) {
      recommendations.add('Never include cryptographic material in server-side rendered content');
      recommendations.add(
        'Use secure crypto-core operations for all encryption/decryption on client-side only'
      );
    }

    if (violations.length > 0) {
      recommendations.add('Review all server-side rendering logic for potential PII exposure');
      recommendations.add('Implement automated SSR validation in CI/CD pipeline');
    }

    return Array.from(recommendations);
  }

  /**
   * Create comprehensive SSR validation report
   */
  generateReport(results: Map<string, SSRValidationResult>): string {
    const totalPages = results.size;
    const validPages = Array.from(results.values()).filter(r => r.isValid).length;
    const totalViolations = Array.from(results.values()).reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    const maxRiskScore = Math.max(...Array.from(results.values()).map(r => r.riskScore));

    let report = `
# SSR-PII Prevention Validation Report

## Summary
- Total Pages Validated: ${totalPages}
- Valid Pages (no PII): ${validPages}
- Pages with Violations: ${totalPages - validPages}
- Total Violations: ${totalViolations}
- Maximum Risk Score: ${maxRiskScore}

## Validation Status
${validPages === totalPages ? '✅ PASS' : '❌ FAIL'} - SSR-PII Prevention

`;

    // Add detailed results for failed pages
    for (const [page, result] of results) {
      if (!result.isValid) {
        report += `
### ${page}
- Risk Score: ${result.riskScore}
- Violations: ${result.violations.length}

Critical Issues:
${result.violations
  .filter(v => v.severity === 'critical')
  .map(v => `- ${v.type}: ${v.content.substring(0, 100)}`)
  .join('\n')}
`;
      }
    }

    return report;
  }
}

export default SSRValidator;
