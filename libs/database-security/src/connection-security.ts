/**
 * Database Connection Security Management
 * Connection pooling, firewall rules, and security monitoring
 * Author: Dev Agent (Story 0.8)
 */

export interface ConnectionSecurityConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  statementTimeout: number;
  sslMode: 'require' | 'prefer' | 'disable';
  minTlsVersion: string;
  allowedIpRanges?: string[];
  enableConnectionLogging: boolean;
  enableFailureDetection: boolean;
  rateLimitPerIP: number;
  rateLimitPerUser: number;
}

export interface ConnectionHealthCheck {
  activeConnections: number;
  sslEnabled: boolean;
  maxConnections: number;
  connectionUtilization: number;
  failedConnectionAttempts: number;
  lastHealthCheck: Date;
  securityViolations: number;
}

export interface SecurityViolation {
  type: 'connection_limit_exceeded' | 'ssl_required' | 'ip_blocked' | 'rate_limit_exceeded';
  clientIp: string;
  timestamp: Date;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Database Connection Security Manager
 */
export class DatabaseConnectionSecurity {
  private config: ConnectionSecurityConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private securityViolations: SecurityViolation[] = [];
  private connectionAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();

  constructor(config: Partial<ConnectionSecurityConfig> = {}) {
    this.config = {
      maxConnections: 200,
      connectionTimeout: 30000, // 30 seconds
      idleTimeout: 600000, // 10 minutes
      statementTimeout: 30000, // 30 seconds
      sslMode: 'require',
      minTlsVersion: 'TLSv1.3',
      enableConnectionLogging: true,
      enableFailureDetection: true,
      rateLimitPerIP: 100, // requests per minute
      rateLimitPerUser: 1000, // requests per hour
      ...config,
    };

    this.initializeSecurityMonitoring();
  }

  /**
   * Initialize security monitoring and health checks
   */
  private initializeSecurityMonitoring(): void {
    if (this.config.enableFailureDetection) {
      this.startHealthChecks();
    }

    console.log('[ConnectionSecurity] Initialized with config:', {
      maxConnections: this.config.maxConnections,
      sslMode: this.config.sslMode,
      minTlsVersion: this.config.minTlsVersion,
      rateLimitPerIP: this.config.rateLimitPerIP,
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        this.analyzeHealthMetrics(health);
      } catch (error) {
        console.error('[ConnectionSecurity] Health check failed:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Stop health check monitoring
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform database connection health check
   */
  public async performHealthCheck(): Promise<ConnectionHealthCheck> {
    try {
      // This would integrate with actual database connection pool
      // For now, return simulated health metrics
      const mockHealth: ConnectionHealthCheck = {
        activeConnections: Math.floor(Math.random() * this.config.maxConnections * 0.7),
        sslEnabled: this.config.sslMode === 'require',
        maxConnections: this.config.maxConnections,
        connectionUtilization: 0,
        failedConnectionAttempts: this.getFailedConnectionCount(),
        lastHealthCheck: new Date(),
        securityViolations: this.securityViolations.length,
      };

      mockHealth.connectionUtilization =
        (mockHealth.activeConnections / mockHealth.maxConnections) * 100;

      return mockHealth;
    } catch (error) {
      throw new Error(`Health check failed: ${error}`);
    }
  }

  /**
   * Analyze health metrics and detect security issues
   */
  private analyzeHealthMetrics(health: ConnectionHealthCheck): void {
    // Check connection utilization
    if (health.connectionUtilization > 80) {
      this.recordSecurityViolation({
        type: 'connection_limit_exceeded',
        clientIp: 'system',
        timestamp: new Date(),
        details: `Connection utilization at ${health.connectionUtilization}%`,
        severity: 'medium',
      });
    }

    // Check SSL enforcement
    if (!health.sslEnabled && this.config.sslMode === 'require') {
      this.recordSecurityViolation({
        type: 'ssl_required',
        clientIp: 'system',
        timestamp: new Date(),
        details: 'SSL not enabled but required by security policy',
        severity: 'high',
      });
    }

    // Log health status
    if (this.config.enableConnectionLogging) {
      console.log('[ConnectionSecurity] Health check:', {
        activeConnections: health.activeConnections,
        utilization: `${health.connectionUtilization.toFixed(1)}%`,
        violations: health.securityViolations,
      });
    }
  }

  /**
   * Validate connection attempt against security policies
   */
  public validateConnectionAttempt(
    clientIp: string,
    userId?: string,
    additionalContext?: Record<string, any>
  ): {
    allowed: boolean;
    reason?: string;
    rateLimited?: boolean;
  } {
    // Check if IP is blocked
    if (this.blockedIPs.has(clientIp)) {
      this.recordSecurityViolation({
        type: 'ip_blocked',
        clientIp,
        timestamp: new Date(),
        details: 'Connection attempt from blocked IP',
        severity: 'high',
      });

      return {
        allowed: false,
        reason: 'IP address is blocked',
      };
    }

    // Check rate limiting
    const rateLimitResult = this.checkRateLimit(clientIp, userId);
    if (!rateLimitResult.allowed) {
      this.recordSecurityViolation({
        type: 'rate_limit_exceeded',
        clientIp,
        timestamp: new Date(),
        details: rateLimitResult.reason || 'Rate limit exceeded',
        severity: 'medium',
      });

      return {
        allowed: false,
        reason: rateLimitResult.reason,
        rateLimited: true,
      };
    }

    // Validate against allowed IP ranges if configured
    if (this.config.allowedIpRanges && this.config.allowedIpRanges.length > 0) {
      const ipAllowed = this.isIpInAllowedRanges(clientIp);
      if (!ipAllowed) {
        this.recordSecurityViolation({
          type: 'ip_blocked',
          clientIp,
          timestamp: new Date(),
          details: 'IP not in allowed ranges',
          severity: 'medium',
        });

        return {
          allowed: false,
          reason: 'IP address not in allowed ranges',
        };
      }
    }

    // Record successful connection attempt
    this.recordConnectionAttempt(clientIp);

    return { allowed: true };
  }

  /**
   * Check rate limiting for IP and user
   */
  private checkRateLimit(clientIp: string, userId?: string): { allowed: boolean; reason?: string } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Check IP rate limit (per minute)
    const ipAttempts = this.connectionAttempts.get(clientIp);
    if (
      ipAttempts &&
      ipAttempts.lastAttempt > oneMinuteAgo &&
      ipAttempts.count > this.config.rateLimitPerIP
    ) {
      return {
        allowed: false,
        reason: `IP rate limit exceeded: ${ipAttempts.count}/${this.config.rateLimitPerIP} per minute`,
      };
    }

    // Check user rate limit (per hour) if userId provided
    if (userId) {
      const userAttempts = this.connectionAttempts.get(`user:${userId}`);
      if (
        userAttempts &&
        userAttempts.lastAttempt > oneHourAgo &&
        userAttempts.count > this.config.rateLimitPerUser
      ) {
        return {
          allowed: false,
          reason: `User rate limit exceeded: ${userAttempts.count}/${this.config.rateLimitPerUser} per hour`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record connection attempt for rate limiting
   */
  private recordConnectionAttempt(clientIp: string, userId?: string): void {
    const now = new Date();

    // Record IP attempt
    const ipAttempts = this.connectionAttempts.get(clientIp) || { count: 0, lastAttempt: now };
    ipAttempts.count++;
    ipAttempts.lastAttempt = now;
    this.connectionAttempts.set(clientIp, ipAttempts);

    // Record user attempt if provided
    if (userId) {
      const userKey = `user:${userId}`;
      const userAttempts = this.connectionAttempts.get(userKey) || { count: 0, lastAttempt: now };
      userAttempts.count++;
      userAttempts.lastAttempt = now;
      this.connectionAttempts.set(userKey, userAttempts);
    }

    // Clean up old records (older than 1 hour)
    this.cleanupOldConnectionAttempts();
  }

  /**
   * Clean up old connection attempt records
   */
  private cleanupOldConnectionAttempts(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);

    for (const [key, attempt] of this.connectionAttempts.entries()) {
      if (attempt.lastAttempt < oneHourAgo) {
        this.connectionAttempts.delete(key);
      }
    }
  }

  /**
   * Check if IP is in allowed ranges
   */
  private isIpInAllowedRanges(clientIp: string): boolean {
    if (!this.config.allowedIpRanges || this.config.allowedIpRanges.length === 0) {
      return true;
    }

    // Simplified IP range checking (in production, use a proper IP range library)
    return this.config.allowedIpRanges.some(range => {
      if (range.includes('/')) {
        // CIDR notation check (simplified)
        return clientIp.startsWith(range.split('/')[0]);
      }
      // Exact match or wildcard
      return clientIp === range || range === '*';
    });
  }

  /**
   * Record security violation
   */
  private recordSecurityViolation(violation: SecurityViolation): void {
    this.securityViolations.push(violation);

    // Keep only last 1000 violations to prevent memory issues
    if (this.securityViolations.length > 1000) {
      this.securityViolations = this.securityViolations.slice(-1000);
    }

    // Block IP if critical violations
    if (violation.severity === 'critical' || violation.type === 'ip_blocked') {
      this.blockedIPs.add(violation.clientIp);
    }

    // Log security violation
    console.warn('[ConnectionSecurity] Security violation:', {
      type: violation.type,
      clientIp: violation.clientIp,
      severity: violation.severity,
      details: violation.details,
    });

    // In production, integrate with alerting system
    if (violation.severity === 'critical' || violation.severity === 'high') {
      this.sendSecurityAlert(violation);
    }
  }

  /**
   * Send security alert (placeholder for integration)
   */
  private sendSecurityAlert(violation: SecurityViolation): void {
    // In production, integrate with Sentry, email alerts, or monitoring system
    console.error('[ConnectionSecurity] SECURITY ALERT:', violation);
  }

  /**
   * Get failed connection count
   */
  private getFailedConnectionCount(): number {
    const oneHourAgo = new Date(Date.now() - 3600000);
    return this.securityViolations.filter(
      v =>
        v.timestamp > oneHourAgo &&
        ['connection_limit_exceeded', 'ip_blocked', 'rate_limit_exceeded'].includes(v.type)
    ).length;
  }

  /**
   * Get recent security violations
   */
  public getSecurityViolations(
    since?: Date,
    severity?: SecurityViolation['severity']
  ): SecurityViolation[] {
    let violations = this.securityViolations;

    if (since) {
      violations = violations.filter(v => v.timestamp >= since);
    }

    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }

    return violations.slice(-100); // Return last 100 violations
  }

  /**
   * Block IP address
   */
  public blockIP(clientIp: string, reason: string): void {
    this.blockedIPs.add(clientIp);

    this.recordSecurityViolation({
      type: 'ip_blocked',
      clientIp,
      timestamp: new Date(),
      details: `Manually blocked: ${reason}`,
      severity: 'high',
    });

    console.log(`[ConnectionSecurity] Blocked IP: ${clientIp} - ${reason}`);
  }

  /**
   * Unblock IP address
   */
  public unblockIP(clientIp: string): void {
    this.blockedIPs.delete(clientIp);
    console.log(`[ConnectionSecurity] Unblocked IP: ${clientIp}`);
  }

  /**
   * Get current configuration
   */
  public getConfig(): ConnectionSecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ConnectionSecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[ConnectionSecurity] Configuration updated:', newConfig);
  }
}

/**
 * Singleton connection security manager
 */
export const connectionSecurityManager = new DatabaseConnectionSecurity({
  maxConnections: 200,
  sslMode: 'require',
  minTlsVersion: 'TLSv1.3',
  enableConnectionLogging: true,
  enableFailureDetection: true,
  rateLimitPerIP: 100,
  rateLimitPerUser: 1000,
});

/**
 * Express middleware for connection security (if using Express)
 */
export function createConnectionSecurityMiddleware(
  securityManager: DatabaseConnectionSecurity = connectionSecurityManager
) {
  return (req: any, res: any, next: any) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id;

    const validation = securityManager.validateConnectionAttempt(clientIp, userId);

    if (!validation.allowed) {
      return res.status(429).json({
        error: 'Connection denied',
        reason: validation.reason,
        rateLimited: validation.rateLimited,
      });
    }

    next();
  };
}
