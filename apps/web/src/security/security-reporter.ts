import { violationMonitor } from './violation-monitor';

interface CSPViolation {
  'blocked-uri': string;
  'document-uri': string;
  'effective-directive': string;
  'original-policy': string;
  referrer: string;
  'script-sample': string;
  'status-code': number;
  'violated-directive': string;
  'line-number'?: number;
  'column-number'?: number;
  'source-file'?: string;
}

interface CSPReport {
  'csp-report': CSPViolation;
}

export interface SecurityReporter {
  reportCSPViolation(violation: CSPViolation): Promise<void>;
  reportSRIFailure(resourceUrl: string, expectedHash: string): Promise<void>;
  reportCertificatePinningFailure(hostname: string, expectedPin: string): Promise<void>;
}

class PrivacySafeSecurityReporter implements SecurityReporter {
  private readonly isProduction = process.env['NODE_ENV'] === 'production';
  private readonly sentryDsn = process.env['SENTRY_DSN'];

  async reportCSPViolation(violation: CSPViolation): Promise<void> {
    // Remove potentially sensitive data
    const sanitizedViolation = this.sanitizeCSPViolation(violation);

    if (!this.shouldReport(sanitizedViolation)) {
      return;
    }

    // Record in violation monitor for alerting
    await violationMonitor.recordCSPViolation(sanitizedViolation);

    // Log locally for development
    if (!this.isProduction) {
      console.warn('CSP Violation:', sanitizedViolation);
      return;
    }

    // Report to monitoring service (Sentry)
    if (this.sentryDsn) {
      await this.sendToSentry('csp-violation', sanitizedViolation);
    }

    // Store in audit log
    await this.logSecurityEvent('CSP_VIOLATION', {
      directive: sanitizedViolation['effective-directive'],
      blockedUri: this.sanitizeUrl(sanitizedViolation['blocked-uri']),
      violatedDirective: sanitizedViolation['violated-directive'],
      timestamp: new Date().toISOString(),
    });
  }

  async reportSRIFailure(resourceUrl: string, expectedHash: string): Promise<void> {
    const sanitizedUrl = this.sanitizeUrl(resourceUrl);

    // Record in violation monitor for alerting
    await violationMonitor.recordSRIViolation(sanitizedUrl, expectedHash);

    if (!this.isProduction) {
      console.error('SRI Failure:', { url: sanitizedUrl, hash: expectedHash });
      return;
    }

    if (this.sentryDsn) {
      await this.sendToSentry('sri-failure', {
        resourceUrl: sanitizedUrl,
        expectedHash,
      });
    }

    await this.logSecurityEvent('SRI_FAILURE', {
      resourceUrl: sanitizedUrl,
      expectedHash,
      timestamp: new Date().toISOString(),
    });
  }

  async reportCertificatePinningFailure(hostname: string, expectedPin: string): Promise<void> {
    // Record in violation monitor for alerting
    await violationMonitor.recordCertPinningViolation(hostname, expectedPin);

    if (!this.isProduction) {
      console.error('Certificate Pinning Failure:', { hostname, expectedPin });
      return;
    }

    if (this.sentryDsn) {
      await this.sendToSentry('cert-pinning-failure', {
        hostname,
        expectedPin,
      });
    }

    await this.logSecurityEvent('CERT_PINNING_FAILURE', {
      hostname,
      expectedPin,
      timestamp: new Date().toISOString(),
    });
  }

  private sanitizeCSPViolation(violation: CSPViolation): CSPViolation {
    return {
      ...violation,
      'blocked-uri': this.sanitizeUrl(violation['blocked-uri']),
      'document-uri': this.sanitizeUrl(violation['document-uri']),
      referrer: this.sanitizeUrl(violation.referrer),
      'script-sample': this.sanitizeScriptSample(violation['script-sample']),
      'source-file': violation['source-file']
        ? this.sanitizeUrl(violation['source-file'])
        : undefined,
    };
  }

  private sanitizeUrl(url: string): string {
    if (!url || url === 'about:blank') return url;

    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments that might contain PII
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }

  private sanitizeScriptSample(sample: string): string {
    if (!sample) return sample;

    // Truncate and remove potentially sensitive content
    const maxLength = 100;
    const sanitized = sample
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]') // Remove dates
      .replace(/\b\d{3,}\b/g, '[NUMBER]') // Remove large numbers
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
      .substring(0, maxLength);

    return sanitized.length < sample.length ? `${sanitized}...` : sanitized;
  }

  private shouldReport(violation: CSPViolation): boolean {
    const blockedUri = violation['blocked-uri'];

    // Don't report known false positives
    const ignoredPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'about:blank',
      'data:',
      'blob:',
    ];

    return !ignoredPatterns.some(pattern => blockedUri.startsWith(pattern));
  }

  private async sendToSentry(eventType: string, data: any): Promise<void> {
    try {
      // This would integrate with Sentry SDK
      // For now, we'll just log the structure
      console.log('Sentry Report:', { eventType, data });
    } catch (error) {
      console.error('Failed to send security report to Sentry:', error);
    }
  }

  private async logSecurityEvent(eventType: string, data: any): Promise<void> {
    try {
      // This would store in audit log
      // For now, we'll just log the structure
      console.log('Security Audit Log:', { eventType, data });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

export const securityReporter = new PrivacySafeSecurityReporter();
