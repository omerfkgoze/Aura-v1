export class AuthAuditLogger {
  config;
  eventHistory = [];
  MAX_HISTORY_SIZE = 1000;
  constructor(config = {}) {
    this.config = {
      enableEventLogging: true,
      enableSecurityAudit: true,
      maxEventHistory: 500,
      logLevel: 'standard',
      sensitiveDataMasking: true,
      exportFormat: 'json',
      ...config,
    };
  }
  logAuthEvent(event, additionalData) {
    if (!this.config.enableEventLogging) {
      return;
    }
    try {
      const securityEvent = this.enrichEvent(event, additionalData);
      this.storeEvent(securityEvent);
      // Check for security anomalies
      if (this.config.enableSecurityAudit) {
        this.analyzeSecurityEvent(securityEvent);
      }
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }
  getAuditHistory(limit) {
    const historyLimit = limit || this.config.maxEventHistory;
    return this.eventHistory.slice(0, historyLimit);
  }
  getSecurityEvents(severityFilter) {
    return this.eventHistory.filter(
      event =>
        event.category === 'security' && (severityFilter ? event.severity === severityFilter : true)
    );
  }
  generateAuditSummary(timeRangeHours = 24) {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);
    const recentEvents = this.eventHistory.filter(event => event.timestamp >= startTime);
    const successfulLogins = recentEvents.filter(
      event => event.type === 'login' && event.success
    ).length;
    const failedLogins = recentEvents.filter(
      event => event.type === 'login' && !event.success
    ).length;
    const logouts = recentEvents.filter(event => event.type === 'logout').length;
    const securityEvents = recentEvents.filter(event => event.category === 'security').length;
    const highRiskEvents = recentEvents.filter(event => event.riskScore > 70).length;
    let riskLevel = 'low';
    if (highRiskEvents > 0 || failedLogins > 5) {
      riskLevel = 'high';
    } else if (failedLogins > 2 || securityEvents > 0) {
      riskLevel = 'medium';
    }
    return {
      totalEvents: recentEvents.length,
      successfulLogins,
      failedLogins,
      logouts,
      securityEvents,
      timeRange: {
        start: startTime,
        end: now,
      },
      riskLevel,
    };
  }
  exportAuditLog(format = this.config.exportFormat) {
    if (format === 'csv') {
      return this.exportToCsv();
    }
    return this.exportToJson();
  }
  clearAuditHistory() {
    this.eventHistory = [];
  }
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  enrichEvent(event, additionalData) {
    const baseEvent = {
      ...event,
      severity: this.calculateSeverity(event),
      category: this.categorizeEvent(event),
      riskScore: this.calculateRiskScore(event),
      ...additionalData,
    };
    // Add device info if available
    if (typeof navigator !== 'undefined') {
      baseEvent.userAgent = this.config.sensitiveDataMasking
        ? this.maskUserAgent(navigator.userAgent)
        : navigator.userAgent;
    }
    // Mask sensitive data if enabled
    if (this.config.sensitiveDataMasking) {
      return this.maskSensitiveData(baseEvent);
    }
    return baseEvent;
  }
  calculateSeverity(event) {
    if (event.type === 'login' && !event.success) {
      return 'medium';
    }
    if (event.type === 'logout' && event.error) {
      return 'high';
    }
    if (event.type === 'recovery') {
      return event.success ? 'medium' : 'high';
    }
    return 'low';
  }
  categorizeEvent(event) {
    switch (event.type) {
      case 'login':
      case 'registration':
        return 'authentication';
      case 'logout':
        return 'session';
      case 'recovery':
        return 'security';
      case 'refresh':
        return 'session';
      default:
        return 'authentication';
    }
  }
  calculateRiskScore(event) {
    let score = 0;
    // Base score by event type
    switch (event.type) {
      case 'login':
        score = event.success ? 10 : 40;
        break;
      case 'logout':
        score = 5;
        break;
      case 'recovery':
        score = event.success ? 30 : 60;
        break;
      case 'refresh':
        score = event.success ? 5 : 20;
        break;
      case 'registration':
        score = 15;
        break;
    }
    // Increase score for errors
    if (event.error) {
      score += 20;
    }
    // Increase score for certain methods
    if (event.method === 'recovery') {
      score += 25;
    }
    return Math.min(score, 100);
  }
  storeEvent(event) {
    this.eventHistory.unshift(event);
    // Maintain history size limit
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory = this.eventHistory.slice(0, this.config.maxEventHistory);
    }
  }
  analyzeSecurityEvent(event) {
    // Check for multiple failed logins
    if (event.type === 'login' && !event.success) {
      const recentFailedLogins = this.getRecentFailedLogins(5); // Last 5 minutes
      if (recentFailedLogins.length >= 3) {
        this.logSecurityAlert('Multiple failed login attempts detected', 'high');
      }
    }
    // Check for suspicious recovery attempts
    if (event.type === 'recovery' && !event.success) {
      const recentRecoveryAttempts = this.getRecentRecoveryAttempts(10); // Last 10 minutes
      if (recentRecoveryAttempts.length >= 2) {
        this.logSecurityAlert('Multiple recovery attempts detected', 'critical');
      }
    }
    // Check for rapid session cycling
    if (event.type === 'logout') {
      const recentLogins = this.getRecentLogins(2); // Last 2 minutes
      if (recentLogins.length >= 2) {
        this.logSecurityAlert('Rapid session cycling detected', 'medium');
      }
    }
  }
  getRecentFailedLogins(minutes) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.eventHistory.filter(
      event => event.type === 'login' && !event.success && event.timestamp >= cutoff
    );
  }
  getRecentRecoveryAttempts(minutes) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.eventHistory.filter(
      event => event.type === 'recovery' && event.timestamp >= cutoff
    );
  }
  getRecentLogins(minutes) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.eventHistory.filter(
      event => event.type === 'login' && event.success && event.timestamp >= cutoff
    );
  }
  logSecurityAlert(message, severity) {
    const alertEvent = {
      type: 'login', // Base type required
      method: 'passkey',
      timestamp: new Date(),
      success: false,
      error: message,
      severity,
      category: 'security',
      riskScore: severity === 'critical' ? 95 : severity === 'high' ? 80 : 60,
    };
    this.storeEvent(alertEvent);
    // In production, this would trigger security notifications
    console.warn(`Security Alert [${severity.toUpperCase()}]: ${message}`);
  }
  maskSensitiveData(event) {
    const masked = { ...event };
    // Mask IP addresses
    if (masked.remoteIp) {
      const parts = masked.remoteIp.split('.');
      if (parts.length === 4) {
        masked.remoteIp = `${parts[0]}.${parts[1]}.***.***.`;
      }
    }
    // Mask detailed geolocation
    if (masked.geolocation?.coordinates) {
      delete masked.geolocation.coordinates;
    }
    // Mask detailed user agent
    if (masked.userAgent) {
      masked.userAgent = this.maskUserAgent(masked.userAgent);
    }
    return masked;
  }
  maskUserAgent(userAgent) {
    // Keep browser type but mask version details
    const browserRegex = /(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/g;
    return userAgent.replace(browserRegex, (_match, browser) => `${browser}/***`);
  }
  exportToJson() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      config: this.config,
      summary: this.generateAuditSummary(),
      events: this.eventHistory,
    };
    return JSON.stringify(exportData, null, 2);
  }
  exportToCsv() {
    const headers = [
      'timestamp',
      'type',
      'method',
      'success',
      'severity',
      'category',
      'riskScore',
      'error',
    ];
    const rows = this.eventHistory.map(event => [
      event.timestamp.toISOString(),
      event.type,
      event.method,
      event.success.toString(),
      event.severity,
      event.category,
      event.riskScore.toString(),
      event.error || '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    return csvContent;
  }
}
// Singleton instance for global use
export const globalAuditLogger = new AuthAuditLogger();
// Hook for React components to use audit logging
export function useAuthAudit() {
  return {
    logger: globalAuditLogger,
    logEvent: (event, additionalData) => {
      globalAuditLogger.logAuthEvent(event, additionalData);
    },
    getHistory: limit => globalAuditLogger.getAuditHistory(limit),
    getSummary: hours => globalAuditLogger.generateAuditSummary(hours),
    exportLog: format => globalAuditLogger.exportAuditLog(format),
  };
}
//# sourceMappingURL=audit.js.map
