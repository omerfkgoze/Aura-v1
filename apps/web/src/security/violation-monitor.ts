interface ViolationAlert {
  type: 'csp' | 'sri' | 'cert-pinning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface AlertThreshold {
  count: number;
  timeWindow: number; // milliseconds
  severity: ViolationAlert['severity'];
}

export class ViolationMonitor {
  private violations = new Map<string, { count: number; firstSeen: Date; lastSeen: Date }>();
  private readonly alertThresholds: AlertThreshold[] = [
    { count: 1, timeWindow: 60 * 1000, severity: 'critical' }, // 1 in 1 min = critical
    { count: 5, timeWindow: 5 * 60 * 1000, severity: 'high' }, // 5 in 5 min = high
    { count: 10, timeWindow: 15 * 60 * 1000, severity: 'medium' }, // 10 in 15 min = medium
    { count: 20, timeWindow: 60 * 60 * 1000, severity: 'low' }, // 20 in 1 hour = low
  ];

  private alertCallbacks: Array<(alert: ViolationAlert) => Promise<void>> = [];

  constructor() {
    // Cleanup old violations every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  addAlertCallback(callback: (alert: ViolationAlert) => Promise<void>): void {
    this.alertCallbacks.push(callback);
  }

  async recordCSPViolation(violation: {
    'blocked-uri': string;
    'document-uri': string;
    'effective-directive': string;
    'violated-directive': string;
    'script-sample'?: string;
  }): Promise<void> {
    const key = this.createViolationKey('csp', {
      blockedUri: this.sanitizeUri(violation['blocked-uri']),
      directive: violation['effective-directive'],
      violatedDirective: violation['violated-directive'],
    });

    await this.recordViolation('csp', key, {
      blockedUri: violation['blocked-uri'],
      documentUri: violation['document-uri'],
      directive: violation['effective-directive'],
      violatedDirective: violation['violated-directive'],
      scriptSample: violation['script-sample'],
    });
  }

  async recordSRIViolation(resourceUrl: string, expectedHash: string): Promise<void> {
    const key = this.createViolationKey('sri', {
      resource: this.sanitizeUri(resourceUrl),
      hash: expectedHash,
    });

    await this.recordViolation('sri', key, {
      resourceUrl,
      expectedHash,
    });
  }

  async recordCertPinningViolation(hostname: string, expectedPin: string): Promise<void> {
    const key = this.createViolationKey('cert-pinning', {
      hostname,
      pin: expectedPin,
    });

    await this.recordViolation('cert-pinning', key, {
      hostname,
      expectedPin,
    });
  }

  private async recordViolation(
    type: ViolationAlert['type'],
    key: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const now = new Date();
    const existing = this.violations.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = now;
    } else {
      this.violations.set(key, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
    }

    // Check if we should alert
    const violationData = this.violations.get(key)!;
    const severity = this.calculateSeverity(violationData, now);

    if (severity) {
      const alert: ViolationAlert = {
        type,
        severity,
        message: this.generateAlertMessage(type, violationData, metadata),
        timestamp: now,
        metadata: {
          ...metadata,
          count: violationData.count,
          firstSeen: violationData.firstSeen,
          key,
        },
      };

      await this.triggerAlert(alert);
    }
  }

  private calculateSeverity(
    violation: { count: number; firstSeen: Date },
    now: Date
  ): ViolationAlert['severity'] | null {
    const timeElapsed = now.getTime() - violation.firstSeen.getTime();

    for (const threshold of this.alertThresholds) {
      if (violation.count >= threshold.count && timeElapsed <= threshold.timeWindow) {
        return threshold.severity;
      }
    }

    return null;
  }

  private generateAlertMessage(
    type: ViolationAlert['type'],
    violation: { count: number; firstSeen: Date; lastSeen: Date },
    metadata: Record<string, any>
  ): string {
    const timeSpan = violation.lastSeen.getTime() - violation.firstSeen.getTime();
    const timeSpanStr =
      timeSpan < 60000 ? `${Math.round(timeSpan / 1000)}s` : `${Math.round(timeSpan / 60000)}m`;

    switch (type) {
      case 'csp':
        return `CSP violation detected: ${violation.count} violations of ${metadata['violatedDirective']} in ${timeSpanStr}. Blocked URI: ${metadata['blockedUri']}`;

      case 'sri':
        return `SRI violation detected: ${violation.count} integrity failures for ${metadata['resourceUrl']} in ${timeSpanStr}. Expected hash: ${metadata['expectedHash']}`;

      case 'cert-pinning':
        return `Certificate pinning violation: ${violation.count} pinning failures for ${metadata['hostname']} in ${timeSpanStr}. Expected pin: ${metadata['expectedPin']}`;

      default:
        return `Security violation detected: ${violation.count} violations in ${timeSpanStr}`;
    }
  }

  private async triggerAlert(alert: ViolationAlert): Promise<void> {
    // Log the alert
    console.warn(`[SECURITY ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);

    // Trigger all registered callbacks
    const promises = this.alertCallbacks.map(callback =>
      callback(alert).catch(error => console.error('Alert callback failed:', error))
    );

    await Promise.allSettled(promises);
  }

  private createViolationKey(type: string, data: Record<string, string>): string {
    const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
    const dataString = sortedEntries.map(([key, value]) => `${key}:${value}`).join('|');
    return `${type}:${dataString}`;
  }

  private sanitizeUri(uri: string): string {
    if (!uri) return '[empty]';
    if (uri === 'inline') return 'inline';
    if (uri === 'eval') return 'eval';
    if (uri === 'about:blank') return 'about:blank';

    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return '[invalid-uri]';
    }
  }

  private cleanup(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, violation] of Array.from(this.violations.entries())) {
      if (now.getTime() - violation.lastSeen.getTime() > maxAge) {
        this.violations.delete(key);
      }
    }
  }

  // Public method to get current violation statistics
  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    recentViolations: Array<{ key: string; count: number; lastSeen: Date }>;
  } {
    const stats = {
      total: this.violations.size,
      byType: {} as Record<string, number>,
      recentViolations: [] as Array<{ key: string; count: number; lastSeen: Date }>,
    };

    for (const [key, violation] of Array.from(this.violations.entries())) {
      const type = key.split(':')[0];
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      stats.recentViolations.push({
        key,
        count: violation.count,
        lastSeen: violation.lastSeen,
      });
    }

    // Sort by most recent
    stats.recentViolations.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

    return stats;
  }
}

// Global violation monitor instance
export const violationMonitor = new ViolationMonitor();

// Setup default alert callbacks
violationMonitor.addAlertCallback(async alert => {
  // In production, this would send to Sentry, Slack, email, etc.
  if (process.env['NODE_ENV'] === 'production') {
    // Send to monitoring service
    console.log('Would send alert to monitoring service:', alert);
  }
});

violationMonitor.addAlertCallback(async alert => {
  // Log to audit trail
  if (alert.severity === 'critical' || alert.severity === 'high') {
    console.error('HIGH PRIORITY SECURITY ALERT:', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      metadata: alert.metadata,
    });
  }
});
