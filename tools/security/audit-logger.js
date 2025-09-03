#!/usr/bin/env node

/**
 * Security Audit Trail Logger
 *
 * Comprehensive logging system for security events, build processes,
 * and compliance activities in the Aura project supply chain.
 *
 * Usage: node audit-logger.js <event-type> <data>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuditLogger {
  constructor(options = {}) {
    this.options = {
      logLevel: options.logLevel || 'info',
      logFile: options.logFile || path.join(process.cwd(), 'logs', 'security-audit.log'),
      enableConsole: options.enableConsole !== false,
      enableStructuredLogging: options.enableStructuredLogging !== false,
      enableIntegrity: options.enableIntegrity !== false,
      retentionDays: options.retentionDays || 90,
      ...options,
    };

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Initialize log integrity chain
    this.previousLogHash = this.loadLastLogHash();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.options.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Load the hash of the last log entry for integrity chain
   */
  loadLastLogHash() {
    const hashFile = path.join(path.dirname(this.options.logFile), '.last-log-hash');
    if (fs.existsSync(hashFile)) {
      try {
        return fs.readFileSync(hashFile, 'utf8').trim();
      } catch (error) {
        console.warn('Warning: Could not load last log hash:', error.message);
      }
    }
    return crypto.createHash('sha256').update('GENESIS').digest('hex');
  }

  /**
   * Save the hash of the current log entry
   */
  saveCurrentLogHash(hash) {
    if (!this.options.enableIntegrity) return;

    const hashFile = path.join(path.dirname(this.options.logFile), '.last-log-hash');
    try {
      fs.writeFileSync(hashFile, hash);
    } catch (error) {
      console.error('Error saving log hash:', error.message);
    }
  }

  /**
   * Log a security event
   */
  log(level, category, event, data = {}) {
    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID();

    // Create log entry
    const logEntry = {
      id: logId,
      timestamp,
      level: level.toUpperCase(),
      category,
      event,
      data: this.sanitizeLogData(data),
      metadata: {
        pid: process.pid,
        hostname: require('os').hostname(),
        user: process.env.USER || process.env.USERNAME || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        version: this.getAuditLoggerVersion(),
      },
    };

    // Add integrity chain if enabled
    if (this.options.enableIntegrity) {
      logEntry.integrity = {
        previousHash: this.previousLogHash,
        currentHash: this.calculateLogHash(logEntry),
      };
      this.previousLogHash = logEntry.integrity.currentHash;
      this.saveCurrentLogHash(this.previousLogHash);
    }

    // Format and write log
    this.writeLog(logEntry);

    return logId;
  }

  /**
   * Calculate hash for log integrity chain
   */
  calculateLogHash(logEntry) {
    const logString = JSON.stringify({
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      category: logEntry.category,
      event: logEntry.event,
      previousHash: this.previousLogHash,
    });
    return crypto.createHash('sha256').update(logString).digest('hex');
  }

  /**
   * Sanitize log data to prevent injection and remove sensitive info
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'key',
      'api_key',
      'apikey',
      'private_key',
      'privatekey',
      'auth',
      'authorization',
      'session',
      'cookie',
      'cookies',
      'jwt',
      'bearer',
    ];

    const sanitizeObject = obj => {
      if (!obj || typeof obj !== 'object') return obj;

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          obj[key] = sanitizeObject(value);
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Write log entry to file and console
   */
  writeLog(logEntry) {
    const logLine = this.formatLogEntry(logEntry);

    // Write to file
    try {
      fs.appendFileSync(this.options.logFile, logLine + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error.message);
    }

    // Write to console if enabled
    if (this.options.enableConsole) {
      console.log(this.formatConsoleOutput(logEntry));
    }
  }

  /**
   * Format log entry for file storage
   */
  formatLogEntry(logEntry) {
    if (this.options.enableStructuredLogging) {
      return JSON.stringify(logEntry);
    } else {
      return `${logEntry.timestamp} [${logEntry.level}] ${logEntry.category}:${logEntry.event} - ${JSON.stringify(logEntry.data)}`;
    }
  }

  /**
   * Format log entry for console output
   */
  formatConsoleOutput(logEntry) {
    const levelColors = {
      CRITICAL: '\x1b[41m', // Red background
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m', // Yellow
      INFO: '\x1b[36m', // Cyan
      DEBUG: '\x1b[37m', // White
    };

    const reset = '\x1b[0m';
    const color = levelColors[logEntry.level] || '';

    return `${color}[${logEntry.level}]${reset} ${logEntry.timestamp} ${logEntry.category}:${logEntry.event}`;
  }

  /**
   * Get audit logger version
   */
  getAuditLoggerVersion() {
    return '1.0.0';
  }

  // Convenience methods for different log levels
  critical(category, event, data) {
    return this.log('critical', category, event, data);
  }

  error(category, event, data) {
    return this.log('error', category, event, data);
  }

  warn(category, event, data) {
    return this.log('warn', category, event, data);
  }

  info(category, event, data) {
    return this.log('info', category, event, data);
  }

  debug(category, event, data) {
    return this.log('debug', category, event, data);
  }

  // Security-specific logging methods
  securityEvent(event, data) {
    return this.critical('SECURITY', event, data);
  }

  buildEvent(event, data) {
    return this.info('BUILD', event, data);
  }

  dependencyEvent(event, data) {
    return this.info('DEPENDENCY', event, data);
  }

  complianceEvent(event, data) {
    return this.info('COMPLIANCE', event, data);
  }

  /**
   * Verify log integrity chain
   */
  verifyLogIntegrity(logFile = null) {
    const targetFile = logFile || this.options.logFile;

    if (!fs.existsSync(targetFile)) {
      throw new Error(`Log file not found: ${targetFile}`);
    }

    const logContent = fs.readFileSync(targetFile, 'utf8');
    const lines = logContent.trim().split('\n');

    if (!this.options.enableStructuredLogging) {
      console.log('Log integrity verification requires structured logging');
      return true;
    }

    let previousHash = crypto.createHash('sha256').update('GENESIS').digest('hex');
    let verifiedEntries = 0;
    const corruptedEntries = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);

        if (entry.integrity) {
          if (entry.integrity.previousHash !== previousHash) {
            corruptedEntries.push({
              id: entry.id,
              expected: previousHash,
              actual: entry.integrity.previousHash,
            });
          }
          previousHash = entry.integrity.currentHash;
          verifiedEntries++;
        }
      } catch (error) {
        console.warn(`Warning: Could not parse log entry: ${error.message}`);
      }
    }

    if (corruptedEntries.length > 0) {
      console.error('Log integrity verification FAILED');
      console.error('Corrupted entries:', corruptedEntries);
      return false;
    }

    console.log(`Log integrity verification PASSED (${verifiedEntries} entries verified)`);
    return true;
  }

  /**
   * Clean up old log files based on retention policy
   */
  cleanup() {
    const logDir = path.dirname(this.options.logFile);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);

    try {
      const files = fs.readdirSync(logDir);
      let removedFiles = 0;

      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate && file.endsWith('.log')) {
          fs.unlinkSync(filePath);
          removedFiles++;
          this.info('MAINTENANCE', 'LOG_CLEANUP', {
            removedFile: file,
            fileAge: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      if (removedFiles > 0) {
        this.info('MAINTENANCE', 'LOG_RETENTION', { removedFiles });
      }
    } catch (error) {
      this.error('MAINTENANCE', 'LOG_CLEANUP_ERROR', { error: error.message });
    }
  }

  /**
   * Generate audit summary report
   */
  generateSummaryReport(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    if (!fs.existsSync(this.options.logFile)) {
      return { error: 'Log file not found' };
    }

    const logContent = fs.readFileSync(this.options.logFile, 'utf8');
    const lines = logContent.trim().split('\n');

    const summary = {
      period: `${hours} hours`,
      totalEntries: 0,
      byLevel: {},
      byCategory: {},
      securityEvents: [],
      buildEvents: [],
      errors: [],
    };

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = this.options.enableStructuredLogging
          ? JSON.parse(line)
          : this.parseUnstructuredLog(line);

        const entryTime = new Date(entry.timestamp);
        if (entryTime < cutoffTime) continue;

        summary.totalEntries++;

        // Count by level
        summary.byLevel[entry.level] = (summary.byLevel[entry.level] || 0) + 1;

        // Count by category
        summary.byCategory[entry.category] = (summary.byCategory[entry.category] || 0) + 1;

        // Collect security events
        if (entry.category === 'SECURITY') {
          summary.securityEvents.push({
            timestamp: entry.timestamp,
            event: entry.event,
            data: entry.data,
          });
        }

        // Collect build events
        if (entry.category === 'BUILD') {
          summary.buildEvents.push({
            timestamp: entry.timestamp,
            event: entry.event,
            data: entry.data,
          });
        }

        // Collect errors
        if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
          summary.errors.push({
            timestamp: entry.timestamp,
            level: entry.level,
            category: entry.category,
            event: entry.event,
            data: entry.data,
          });
        }
      } catch (error) {
        // Skip unparseable entries
      }
    }

    return summary;
  }

  /**
   * Parse unstructured log line (basic parsing)
   */
  parseUnstructuredLog(line) {
    const match = line.match(/^(\S+) \[(\S+)\] (\S+):(\S+) - (.*)$/);
    if (match) {
      return {
        timestamp: match[1],
        level: match[2],
        category: match[3],
        event: match[4],
        data: match[5] ? JSON.parse(match[5]) : {},
      };
    }
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node audit-logger.js <command> [arguments]');
    console.error('');
    console.error('Commands:');
    console.error('  log <level> <category> <event> [data]  - Log an event');
    console.error('  verify [logfile]                      - Verify log integrity');
    console.error('  cleanup                               - Clean up old log files');
    console.error('  summary [hours]                       - Generate summary report');
    console.error('');
    console.error('Examples:');
    console.error('  node audit-logger.js log info BUILD STARTED \'{"version":"1.0.0"}\'');
    console.error('  node audit-logger.js verify');
    console.error('  node audit-logger.js summary 48');
    process.exit(1);
  }

  const [command, ...cmdArgs] = args;
  const logger = new AuditLogger({
    enableIntegrity: process.env.AUDIT_INTEGRITY !== 'false',
    enableStructuredLogging: process.env.AUDIT_STRUCTURED !== 'false',
  });

  switch (command) {
    case 'log': {
      const [level, category, event, dataStr] = cmdArgs;
      const data = dataStr ? JSON.parse(dataStr) : {};
      const logId = logger.log(level, category, event, data);
      console.log(`Logged event with ID: ${logId}`);
      break;
    }

    case 'verify': {
      const [logFile] = cmdArgs;
      try {
        const isValid = logger.verifyLogIntegrity(logFile);
        process.exit(isValid ? 0 : 1);
      } catch (error) {
        console.error('Verification failed:', error.message);
        process.exit(2);
      }
      break;
    }

    case 'cleanup': {
      logger.cleanup();
      console.log('Log cleanup completed');
      break;
    }

    case 'summary': {
      const [hoursStr] = cmdArgs;
      const hours = hoursStr ? parseInt(hoursStr, 10) : 24;
      const summary = logger.generateSummaryReport(hours);
      console.log(JSON.stringify(summary, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

module.exports = { AuditLogger };
