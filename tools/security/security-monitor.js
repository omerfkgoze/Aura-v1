/**
 * Security Monitoring and Alerting System
 *
 * Monitors security scan results and sends alerts for failures/concerns
 */

import fs from 'fs';
import path from 'path';

/**
 * Security monitoring and alerting system
 */
export class SecurityMonitor {
  constructor(options = {}) {
    this.options = {
      slackWebhook: process.env.SLACK_SECURITY_WEBHOOK,
      emailEndpoint: process.env.EMAIL_ALERT_ENDPOINT,
      logLevel: options.logLevel || 'INFO',
      alertThresholds: {
        critical: 0,
        high: 2,
        medium: 10,
        ...options.alertThresholds,
      },
      enableSlackAlerts: process.env.ENABLE_SLACK_ALERTS === 'true',
      enableEmailAlerts: process.env.ENABLE_EMAIL_ALERTS === 'true',
      environment: process.env.NODE_ENV || 'development',
    };

    this.alerts = [];
    this.metrics = {
      scansCompleted: 0,
      vulnerabilitiesFound: 0,
      criticalIssues: 0,
      alertsSent: 0,
      lastScanTime: null,
    };
  }

  /**
   * Main monitoring entry point
   * @param {string} scanType - Type of security scan (slsa, sbom, supply-chain)
   * @param {object} results - Scan results object
   */
  async monitor(scanType, results) {
    try {
      console.log(`🔍 Monitoring ${scanType} scan results...`);

      this.logEvent('INFO', `Starting monitoring for ${scanType} scan`);

      // Analyze scan results
      const analysis = this.analyzeScanResults(scanType, results);

      // Generate alerts if needed
      const alerts = this.generateAlerts(scanType, analysis);

      // Send alerts
      if (alerts.length > 0) {
        await this.sendAlerts(alerts);
      }

      // Update metrics
      this.updateMetrics(scanType, analysis);

      // Log monitoring results
      await this.logMonitoringResults(scanType, analysis, alerts);

      console.log(`✅ Monitoring completed for ${scanType} scan`);

      return {
        scanType,
        analysis,
        alerts,
        metrics: this.metrics,
      };
    } catch (error) {
      this.logEvent('ERROR', `Monitoring failed for ${scanType}: ${error.message}`);

      // Send critical alert about monitoring failure
      await this.sendCriticalAlert({
        type: 'MONITORING_FAILURE',
        scanType,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Analyze scan results to determine severity and issues
   * @param {string} scanType - Type of scan
   * @param {object} results - Raw scan results
   * @returns {object} Analysis results
   */
  analyzeScanResults(scanType, results) {
    const analysis = {
      scanType,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      severity: 'LOW',
      issues: [],
      vulnerabilities: [],
      recommendations: [],
      metrics: {},
    };

    switch (scanType) {
      case 'slsa':
        return this.analyzeSLSAResults(results, analysis);

      case 'sbom':
        return this.analyzeSBOMResults(results, analysis);

      case 'supply-chain':
        return this.analyzeSupplyChainResults(results, analysis);

      default:
        analysis.status = 'ERROR';
        analysis.issues.push(`Unknown scan type: ${scanType}`);
        return analysis;
    }
  }

  /**
   * Analyze SLSA scan results
   */
  analyzeSLSAResults(results, analysis) {
    analysis.metrics.artifactsVerified = results.artifactsVerified || 0;
    analysis.metrics.provenanceValid = results.provenanceValid || false;
    analysis.metrics.signatureVerified = results.signatureVerified || false;

    // Check for SLSA verification failures
    if (!results.verified) {
      analysis.status = 'FAILED';
      analysis.severity = 'CRITICAL';
      analysis.issues.push('SLSA Level 2 verification failed');

      if (results.errors) {
        results.errors.forEach(error => {
          analysis.issues.push(`SLSA Error: ${error}`);
        });
      }
    }

    // Check for warnings
    if (results.warnings && results.warnings.length > 0) {
      analysis.severity = analysis.severity === 'LOW' ? 'MEDIUM' : analysis.severity;
      results.warnings.forEach(warning => {
        analysis.issues.push(`SLSA Warning: ${warning}`);
      });
    }

    // Check build reproducibility
    if (!results.details?.reproducibleBuild) {
      analysis.issues.push('Build reproducibility verification failed');
      analysis.severity = 'HIGH';
    }

    // Check signature verification
    if (!results.details?.signatureVerified) {
      analysis.issues.push('Artifact signature verification failed');
      analysis.severity = 'CRITICAL';
      analysis.status = 'FAILED';
    }

    return analysis;
  }

  /**
   * Analyze SBOM scan results
   */
  analyzeSBOMResults(results, analysis) {
    analysis.metrics.totalComponents = results.stats?.totalComponents || 0;
    analysis.metrics.vulnerabilities = results.vulnerabilities?.length || 0;
    analysis.metrics.licenseViolations = results.licenseViolations?.length || 0;

    // Check for SBOM generation failures
    if (!results.success) {
      analysis.status = 'FAILED';
      analysis.severity = 'HIGH';
      analysis.issues.push('SBOM generation failed');
    }

    // Check vulnerabilities
    if (results.vulnerabilities) {
      const criticalVulns = results.vulnerabilities.filter(
        v => v.severity === 'critical' || v.ratings?.some(r => r.severity === 'critical')
      );
      const highVulns = results.vulnerabilities.filter(
        v => v.severity === 'high' || v.ratings?.some(r => r.severity === 'high')
      );

      if (criticalVulns.length > this.options.alertThresholds.critical) {
        analysis.status = 'FAILED';
        analysis.severity = 'CRITICAL';
        analysis.issues.push(
          `${criticalVulns.length} critical vulnerabilities found (threshold: ${this.options.alertThresholds.critical})`
        );

        criticalVulns.forEach(vuln => {
          analysis.vulnerabilities.push({
            id: vuln.id,
            severity: 'critical',
            description: vuln.description,
            affects: vuln.affects,
          });
        });
      }

      if (highVulns.length > this.options.alertThresholds.high) {
        analysis.severity = analysis.severity === 'LOW' ? 'HIGH' : analysis.severity;
        analysis.issues.push(
          `${highVulns.length} high severity vulnerabilities found (threshold: ${this.options.alertThresholds.high})`
        );
      }
    }

    // Check license violations
    if (results.licenseViolations && results.licenseViolations.length > 0) {
      analysis.severity = analysis.severity === 'LOW' ? 'MEDIUM' : analysis.severity;
      analysis.issues.push(
        `${results.licenseViolations.length} license compliance violations found`
      );
    }

    return analysis;
  }

  /**
   * Analyze supply-chain scan results
   */
  analyzeSupplyChainResults(results, analysis) {
    analysis.metrics.dependencyConfusionIssues = results.dependencyConfusion?.length || 0;
    analysis.metrics.typosquattingIssues = results.typosquatting?.length || 0;
    analysis.metrics.maliciousPackages = results.maliciousPackages?.length || 0;

    // Check dependency confusion attacks
    if (results.dependencyConfusion && results.dependencyConfusion.length > 0) {
      analysis.status = 'FAILED';
      analysis.severity = 'CRITICAL';
      analysis.issues.push(
        `${results.dependencyConfusion.length} dependency confusion attacks detected`
      );
    }

    // Check typosquatting attempts
    if (results.typosquatting && results.typosquatting.length > 0) {
      analysis.severity = 'HIGH';
      analysis.issues.push(
        `${results.typosquatting.length} potential typosquatting packages detected`
      );
    }

    // Check malicious packages
    if (results.maliciousPackages && results.maliciousPackages.length > 0) {
      analysis.status = 'FAILED';
      analysis.severity = 'CRITICAL';
      analysis.issues.push(`${results.maliciousPackages.length} malicious packages detected`);
    }

    // Check registry configurations
    if (results.suspiciousRegistries && results.suspiciousRegistries.length > 0) {
      analysis.severity = analysis.severity === 'LOW' ? 'MEDIUM' : analysis.severity;
      analysis.issues.push(
        `${results.suspiciousRegistries.length} suspicious registry configurations found`
      );
    }

    return analysis;
  }

  /**
   * Generate alerts based on analysis results
   * @param {string} scanType - Type of scan
   * @param {object} analysis - Analysis results
   * @returns {Array} Array of alert objects
   */
  generateAlerts(scanType, analysis) {
    const alerts = [];

    // Generate alerts based on severity
    if (analysis.severity === 'CRITICAL' || analysis.status === 'FAILED') {
      alerts.push({
        type: 'CRITICAL_SECURITY_ISSUE',
        title: `🚨 Critical Security Issue in ${scanType.toUpperCase()} Scan`,
        severity: 'critical',
        scanType,
        message: `Critical security issues detected in ${scanType} scan`,
        issues: analysis.issues,
        vulnerabilities: analysis.vulnerabilities,
        timestamp: analysis.timestamp,
        environment: this.options.environment,
        actionRequired: true,
        recommendations: this.getCriticalRecommendations(scanType),
      });
    } else if (analysis.severity === 'HIGH') {
      alerts.push({
        type: 'HIGH_SECURITY_WARNING',
        title: `⚠️ High Priority Security Warning in ${scanType.toUpperCase()} Scan`,
        severity: 'high',
        scanType,
        message: `High priority security issues detected in ${scanType} scan`,
        issues: analysis.issues,
        timestamp: analysis.timestamp,
        environment: this.options.environment,
        actionRequired: true,
        recommendations: this.getHighPriorityRecommendations(),
      });
    } else if (analysis.severity === 'MEDIUM' && analysis.issues.length > 0) {
      alerts.push({
        type: 'SECURITY_WARNING',
        title: `⚠️ Security Warning in ${scanType.toUpperCase()} Scan`,
        severity: 'medium',
        scanType,
        message: `Security concerns detected in ${scanType} scan`,
        issues: analysis.issues,
        timestamp: analysis.timestamp,
        environment: this.options.environment,
        actionRequired: false,
        recommendations: this.getMediumPriorityRecommendations(),
      });
    }

    return alerts;
  }

  /**
   * Send alerts via configured channels
   * @param {Array} alerts - Array of alert objects
   */
  async sendAlerts(alerts) {
    for (const alert of alerts) {
      try {
        // Send Slack alert
        if (this.options.enableSlackAlerts && this.options.slackWebhook) {
          await this.sendSlackAlert(alert);
        }

        // Send email alert
        if (this.options.enableEmailAlerts && this.options.emailEndpoint) {
          await this.sendEmailAlert(alert);
        }

        // Log alert
        this.logEvent('ALERT', `Alert sent: ${alert.type} - ${alert.title}`);
        this.metrics.alertsSent++;
      } catch (error) {
        this.logEvent('ERROR', `Failed to send alert: ${error.message}`);
      }
    }
  }

  /**
   * Send Slack alert
   * @param {object} alert - Alert object
   */
  async sendSlackAlert(alert) {
    if (!this.options.slackWebhook) {
      return;
    }

    const color =
      alert.severity === 'critical' ? '#FF0000' : alert.severity === 'high' ? '#FF8C00' : '#FFA500';

    const slackMessage = {
      text: alert.title,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Environment',
              value: this.options.environment,
              short: true,
            },
            {
              title: 'Scan Type',
              value: alert.scanType.toUpperCase(),
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Action Required',
              value: alert.actionRequired ? 'YES' : 'NO',
              short: true,
            },
            {
              title: 'Issues Found',
              value: alert.issues
                .slice(0, 5)
                .map(issue => `• ${issue}`)
                .join('\n'),
              short: false,
            },
          ],
          footer: 'Aura Security Monitor',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    // Add recommendations if available
    if (alert.recommendations && alert.recommendations.length > 0) {
      slackMessage.attachments[0].fields.push({
        title: 'Recommended Actions',
        value: alert.recommendations
          .slice(0, 3)
          .map(rec => `• ${rec}`)
          .join('\n'),
        short: false,
      });
    }

    // Send to Slack webhook
    const response = await fetch(this.options.slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email alert
   * @param {object} alert - Alert object
   */
  async sendEmailAlert(alert) {
    if (!this.options.emailEndpoint) {
      return;
    }

    const emailData = {
      to: process.env.SECURITY_TEAM_EMAIL || 'security@aura-app.com',
      subject: alert.title,
      html: this.generateEmailHTML(alert),
      priority: alert.severity === 'critical' ? 'high' : 'normal',
    };

    const response = await fetch(this.options.emailEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`Email endpoint failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Generate HTML content for email alerts
   * @param {object} alert - Alert object
   * @returns {string} HTML content
   */
  generateEmailHTML(alert) {
    const severityColor =
      alert.severity === 'critical' ? '#FF4444' : alert.severity === 'high' ? '#FF8800' : '#FFAA00';

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${alert.title}</h1>
      </div>
      
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Security Alert Details</h2>
        <ul>
          <li><strong>Environment:</strong> ${this.options.environment}</li>
          <li><strong>Scan Type:</strong> ${alert.scanType.toUpperCase()}</li>
          <li><strong>Severity:</strong> ${alert.severity.toUpperCase()}</li>
          <li><strong>Timestamp:</strong> ${alert.timestamp}</li>
          <li><strong>Action Required:</strong> ${alert.actionRequired ? 'YES' : 'NO'}</li>
        </ul>
      </div>
      
      <div style="padding: 20px;">
        <h3>Issues Found</h3>
        <ul>
          ${alert.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
        
        ${
          alert.recommendations && alert.recommendations.length > 0
            ? `
          <h3>Recommended Actions</h3>
          <ol>
            ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ol>
        `
            : ''
        }
        
        ${
          alert.vulnerabilities && alert.vulnerabilities.length > 0
            ? `
          <h3>Vulnerabilities</h3>
          <ul>
            ${alert.vulnerabilities
              .map(
                vuln => `
              <li><strong>${vuln.id}</strong> (${vuln.severity}): ${vuln.description || 'No description'}</li>
            `
              )
              .join('')}
          </ul>
        `
            : ''
        }
      </div>
      
      <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 12px;">
        <p>This alert was generated by the Aura Security Monitoring System</p>
        <p>Environment: ${this.options.environment} | Scan Type: ${alert.scanType}</p>
      </div>
    </div>
    `;
  }

  /**
   * Send critical alert for monitoring system failures
   * @param {object} criticalAlert - Critical alert details
   */
  async sendCriticalAlert(criticalAlert) {
    const alert = {
      type: 'MONITORING_SYSTEM_FAILURE',
      title: '🔥 CRITICAL: Security Monitoring System Failure',
      severity: 'critical',
      scanType: criticalAlert.scanType || 'unknown',
      message: `Security monitoring system failure: ${criticalAlert.error}`,
      issues: [`Monitoring failure: ${criticalAlert.error}`],
      timestamp: criticalAlert.timestamp,
      environment: this.options.environment,
      actionRequired: true,
      recommendations: [
        'Investigate monitoring system failure immediately',
        'Check system logs for additional details',
        'Verify security scan pipeline integrity',
        'Manually run security scans if needed',
      ],
    };

    await this.sendAlerts([alert]);
  }

  /**
   * Get critical priority recommendations
   */
  getCriticalRecommendations(scanType) {
    const recommendations = [
      'Stop deployment pipeline immediately',
      'Investigate security issues before proceeding',
      'Contact security team for immediate review',
    ];

    switch (scanType) {
      case 'slsa':
        recommendations.push(
          'Verify build provenance and signatures',
          'Check for build environment compromise',
          'Re-run SLSA verification process'
        );
        break;

      case 'sbom':
        recommendations.push(
          'Update or remove vulnerable dependencies',
          'Review license compliance issues',
          'Regenerate SBOM after fixes'
        );
        break;

      case 'supply-chain':
        recommendations.push(
          'Remove suspected malicious packages immediately',
          'Audit dependency sources and registries',
          'Review package.json and lockfiles for tampering'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Get high priority recommendations
   */
  getHighPriorityRecommendations() {
    return [
      'Review and address security issues within 24 hours',
      'Update security documentation',
      'Schedule security team review',
      'Monitor for similar issues in future scans',
    ];
  }

  /**
   * Get medium priority recommendations
   */
  getMediumPriorityRecommendations() {
    return [
      'Schedule security review for next sprint',
      'Update security policies as needed',
      'Monitor issues for escalation',
      'Document lessons learned',
    ];
  }

  /**
   * Update monitoring metrics
   */
  updateMetrics(scanType, analysis) {
    this.metrics.scansCompleted++;
    this.metrics.lastScanTime = analysis.timestamp;

    if (analysis.severity === 'CRITICAL' || analysis.status === 'FAILED') {
      this.metrics.criticalIssues++;
    }

    if (analysis.vulnerabilities) {
      this.metrics.vulnerabilitiesFound += analysis.vulnerabilities.length;
    }
  }

  /**
   * Log monitoring results
   */
  async logMonitoringResults(scanType, analysis, alerts) {
    const logEntry = {
      timestamp: analysis.timestamp,
      scanType,
      status: analysis.status,
      severity: analysis.severity,
      issuesCount: analysis.issues.length,
      alertsGenerated: alerts.length,
      metrics: analysis.metrics,
    };

    this.logEvent('MONITOR', `Scan monitoring completed: ${JSON.stringify(logEntry)}`);

    // Write to monitoring log file
    const logFile = path.join(process.cwd(), '.ai', 'security-monitoring.log');
    const logLine = `${new Date().toISOString()} [${scanType.toUpperCase()}] ${analysis.status} - ${analysis.issues.length} issues, ${alerts.length} alerts\n`;

    try {
      // Ensure directory exists
      const logDir = path.dirname(logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error(`Failed to write monitoring log: ${error.message}`);
    }
  }

  /**
   * Log event with timestamp and level
   */
  logEvent(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] ${message}`;

    if (level === 'ERROR' || this.options.logLevel === 'DEBUG') {
      console.log(logMessage);
    }
  }

  /**
   * Get current monitoring metrics
   * @returns {object} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

/**
 * CLI interface for security monitoring
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new SecurityMonitor();

  // Parse command line arguments
  const scanType = process.argv[2];
  const resultsFile = process.argv[3];

  if (!scanType || !resultsFile) {
    console.error('Usage: node security-monitor.js <scan-type> <results-file>');
    console.error('Example: node security-monitor.js slsa slsa-results.json');
    process.exit(1);
  }

  try {
    // Read scan results
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

    // Run monitoring
    const monitoringResult = await monitor.monitor(scanType, results);

    console.log(`Monitoring completed: ${monitoringResult.alerts.length} alerts generated`);

    // Exit with error code if critical issues found
    if (monitoringResult.analysis.severity === 'CRITICAL') {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Monitoring failed: ${error.message}`);
    process.exit(1);
  }
}
