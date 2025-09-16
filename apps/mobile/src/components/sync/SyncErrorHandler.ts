/**
 * Sync Error Handling and Notification System
 *
 * Comprehensive error handling for synchronization operations with
 * intelligent error categorization, recovery strategies, and user
 * notification management.
 *
 * Features:
 * - Smart error categorization and severity assessment
 * - Automatic recovery strategies for common errors
 * - User-friendly error notifications with actionable solutions
 * - Error history and analytics for debugging
 * - Privacy-safe error reporting without sensitive data exposure
 */

import { EventEmitter } from 'events';
import {
  SyncErrorDetails,
  SyncNotification,
  SyncNotificationListener,
  RetryConfig,
  NetworkCondition,
} from './types';

export interface ErrorCategory {
  readonly category: 'network' | 'crypto' | 'data' | 'permission' | 'storage' | 'protocol';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly recoverable: boolean;
  readonly autoRetry: boolean;
  readonly userActionRequired: boolean;
}

export interface ErrorResolutionStrategy {
  readonly errorCode: string;
  readonly strategy: 'retry' | 'fallback' | 'manual' | 'ignore';
  readonly maxRetries: number;
  readonly retryDelay: number; // milliseconds
  readonly description: string;
  readonly userInstructions: string;
}

export interface ErrorContext {
  readonly deviceId: string;
  readonly operationType: 'sync' | 'discovery' | 'handshake' | 'transfer' | 'verification';
  readonly networkCondition: NetworkCondition;
  readonly timestamp: Date;
  readonly sessionId?: string;
  readonly additionalData: Record<string, any>;
}

export interface ErrorReport {
  readonly errorId: string;
  readonly error: SyncErrorDetails;
  readonly context: ErrorContext;
  readonly category: ErrorCategory;
  readonly resolutionStrategy: ErrorResolutionStrategy;
  readonly resolutionAttempts: number;
  readonly resolved: boolean;
  readonly resolvedAt?: Date;
  readonly affectedOperations: string[];
}

export interface NotificationConfig {
  readonly enableNotifications: boolean;
  readonly maxActiveNotifications: number;
  readonly autoHideDelay: number; // milliseconds
  readonly enableSounds: boolean;
  readonly enableVibration: boolean;
  readonly priorityThreshold: 'low' | 'medium' | 'high';
}

export class SyncErrorHandler extends EventEmitter {
  private errorReports: Map<string, ErrorReport> = new Map();
  private activeNotifications: Map<string, SyncNotification> = new Map();
  private resolutionStrategies: Map<string, ErrorResolutionStrategy> = new Map();
  private notificationConfig: NotificationConfig;
  private listeners: Set<SyncNotificationListener> = new Set();

  constructor(notificationConfig: NotificationConfig) {
    super();
    this.notificationConfig = notificationConfig;
    this.initializeResolutionStrategies();
  }

  /**
   * Handle a sync error with automatic categorization and resolution
   */
  public async handleError(error: SyncErrorDetails, context: ErrorContext): Promise<ErrorReport> {
    const errorId = this.generateErrorId(error, context);

    // Categorize the error
    const category = this.categorizeError(error, context);

    // Get resolution strategy
    const resolutionStrategy = this.getResolutionStrategy(error.code, category);

    // Create error report
    const errorReport: ErrorReport = {
      errorId,
      error,
      context,
      category,
      resolutionStrategy,
      resolutionAttempts: 0,
      resolved: false,
      affectedOperations: this.identifyAffectedOperations(error, context),
    };

    this.errorReports.set(errorId, errorReport);

    // Log error for debugging (privacy-safe)
    this.logError(errorReport);

    // Create user notification
    if (this.shouldNotifyUser(errorReport)) {
      const notification = this.createErrorNotification(errorReport);
      this.addNotification(notification);
    }

    // Attempt automatic resolution if applicable
    if (category.autoRetry && resolutionStrategy.strategy === 'retry') {
      this.scheduleAutoRetry(errorReport);
    }

    this.emit('error_handled', errorReport);

    return errorReport;
  }

  /**
   * Manually retry error resolution
   */
  public async retryErrorResolution(errorId: string): Promise<boolean> {
    const errorReport = this.errorReports.get(errorId);
    if (!errorReport || errorReport.resolved) {
      return false;
    }

    const updatedReport = {
      ...errorReport,
      resolutionAttempts: errorReport.resolutionAttempts + 1,
    };

    this.errorReports.set(errorId, updatedReport);

    try {
      const resolved = await this.executeResolutionStrategy(updatedReport);

      if (resolved) {
        this.markErrorResolved(errorId);
        this.createSuccessNotification(errorReport);
      } else if (updatedReport.resolutionAttempts >= updatedReport.resolutionStrategy.maxRetries) {
        this.createMaxRetriesNotification(errorReport);
      }

      return resolved;
    } catch (retryError) {
      console.error(`Error during retry attempt for ${errorId}:`, retryError);
      return false;
    }
  }

  /**
   * Mark error as resolved
   */
  public markErrorResolved(errorId: string): void {
    const errorReport = this.errorReports.get(errorId);
    if (!errorReport) return;

    const resolvedReport: ErrorReport = {
      ...errorReport,
      resolved: true,
      resolvedAt: new Date(),
    };

    this.errorReports.set(errorId, resolvedReport);

    // Remove related error notifications
    this.removeErrorNotifications(errorId);

    this.emit('error_resolved', resolvedReport);
  }

  /**
   * Get all unresolved errors
   */
  public getUnresolvedErrors(): ErrorReport[] {
    return Array.from(this.errorReports.values()).filter(report => !report.resolved);
  }

  /**
   * Get error history for analysis
   */
  public getErrorHistory(deviceId?: string): ErrorReport[] {
    const reports = Array.from(this.errorReports.values());

    if (deviceId) {
      return reports.filter(report => report.context.deviceId === deviceId);
    }

    return reports.sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime());
  }

  /**
   * Get active notifications
   */
  public getActiveNotifications(): SyncNotification[] {
    return Array.from(this.activeNotifications.values());
  }

  /**
   * Dismiss notification
   */
  public dismissNotification(notificationId: string): void {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    this.activeNotifications.delete(notificationId);
    this.emit('notification_dismissed', notification);
  }

  /**
   * Clear all notifications
   */
  public clearAllNotifications(): void {
    this.activeNotifications.clear();
    this.emit('notifications_cleared');
  }

  /**
   * Add notification listener
   */
  public addNotificationListener(listener: SyncNotificationListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove notification listener
   */
  public removeNotificationListener(listener: SyncNotificationListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Update notification configuration
   */
  public updateNotificationConfig(config: Partial<NotificationConfig>): void {
    this.notificationConfig = { ...this.notificationConfig, ...config };
  }

  // Private methods

  private generateErrorId(error: SyncErrorDetails, context: ErrorContext): string {
    const timestamp = context.timestamp.getTime();
    const deviceHash = context.deviceId.slice(-8);
    return `error_${error.code}_${deviceHash}_${timestamp}`;
  }

  private categorizeError(error: SyncErrorDetails, context: ErrorContext): ErrorCategory {
    // Network-related errors
    if (error.code.startsWith('NET_') || error.code.includes('NETWORK')) {
      return {
        category: 'network',
        severity: context.networkCondition.type === 'offline' ? 'high' : 'medium',
        recoverable: true,
        autoRetry: true,
        userActionRequired: false,
      };
    }

    // Crypto-related errors
    if (error.code.startsWith('CRYPTO_') || error.code.includes('ENCRYPTION')) {
      return {
        category: 'crypto',
        severity: 'high',
        recoverable: error.code !== 'CRYPTO_KEY_CORRUPTED',
        autoRetry: false,
        userActionRequired: true,
      };
    }

    // Data-related errors
    if (error.code.startsWith('DATA_') || error.code.includes('VALIDATION')) {
      return {
        category: 'data',
        severity: error.code.includes('CORRUPTION') ? 'critical' : 'medium',
        recoverable: !error.code.includes('CORRUPTION'),
        autoRetry: error.code.includes('TIMEOUT'),
        userActionRequired: error.code.includes('CORRUPTION'),
      };
    }

    // Permission errors
    if (error.code.startsWith('PERM_') || error.code.includes('UNAUTHORIZED')) {
      return {
        category: 'permission',
        severity: 'high',
        recoverable: false,
        autoRetry: false,
        userActionRequired: true,
      };
    }

    // Storage errors
    if (error.code.startsWith('STORAGE_') || error.code.includes('DISK')) {
      return {
        category: 'storage',
        severity: error.code.includes('FULL') ? 'critical' : 'medium',
        recoverable: true,
        autoRetry: false,
        userActionRequired: error.code.includes('FULL'),
      };
    }

    // Default to protocol error
    return {
      category: 'protocol',
      severity: 'medium',
      recoverable: true,
      autoRetry: true,
      userActionRequired: false,
    };
  }

  private getResolutionStrategy(
    errorCode: string,
    category: ErrorCategory
  ): ErrorResolutionStrategy {
    const strategy = this.resolutionStrategies.get(errorCode);

    if (strategy) {
      return strategy;
    }

    // Default strategy based on category
    switch (category.category) {
      case 'network':
        return {
          errorCode,
          strategy: 'retry',
          maxRetries: 3,
          retryDelay: 5000,
          description: 'Network connectivity issue, will retry automatically',
          userInstructions: 'Check your internet connection and try again',
        };

      case 'crypto':
        return {
          errorCode,
          strategy: 'manual',
          maxRetries: 0,
          retryDelay: 0,
          description: 'Encryption error requires manual intervention',
          userInstructions: 'Please check your device security settings',
        };

      case 'storage':
        return {
          errorCode,
          strategy: category.severity === 'critical' ? 'manual' : 'retry',
          maxRetries: category.severity === 'critical' ? 0 : 2,
          retryDelay: 3000,
          description: 'Storage issue detected',
          userInstructions: 'Check available storage space on your device',
        };

      default:
        return {
          errorCode,
          strategy: 'retry',
          maxRetries: 2,
          retryDelay: 3000,
          description: 'Temporary sync issue',
          userInstructions: 'Please try again in a few moments',
        };
    }
  }

  private initializeResolutionStrategies(): void {
    const strategies: ErrorResolutionStrategy[] = [
      {
        errorCode: 'NET_CONNECTION_TIMEOUT',
        strategy: 'retry',
        maxRetries: 3,
        retryDelay: 5000,
        description: 'Connection timeout, retrying with longer timeout',
        userInstructions: 'Check your internet connection',
      },
      {
        errorCode: 'NET_DNS_RESOLUTION_FAILED',
        strategy: 'fallback',
        maxRetries: 2,
        retryDelay: 3000,
        description: 'DNS resolution failed, trying alternative methods',
        userInstructions: 'Check your network settings',
      },
      {
        errorCode: 'CRYPTO_HANDSHAKE_FAILED',
        strategy: 'retry',
        maxRetries: 1,
        retryDelay: 2000,
        description: 'Device handshake failed, will regenerate keys and retry',
        userInstructions: 'Ensure the other device is nearby and unlocked',
      },
      {
        errorCode: 'DATA_VALIDATION_FAILED',
        strategy: 'manual',
        maxRetries: 0,
        retryDelay: 0,
        description: 'Data validation failed, manual review required',
        userInstructions: 'Please check your data for any unusual entries',
      },
      {
        errorCode: 'STORAGE_DISK_FULL',
        strategy: 'manual',
        maxRetries: 0,
        retryDelay: 0,
        description: 'Storage space full, cannot continue sync',
        userInstructions: 'Free up storage space on your device',
      },
    ];

    for (const strategy of strategies) {
      this.resolutionStrategies.set(strategy.errorCode, strategy);
    }
  }

  private identifyAffectedOperations(error: SyncErrorDetails, context: ErrorContext): string[] {
    const operations: string[] = [];

    switch (context.operationType) {
      case 'sync':
        operations.push('data_synchronization');
        if (error.category === 'crypto') {
          operations.push('encryption', 'decryption');
        }
        break;

      case 'discovery':
        operations.push('device_discovery', 'network_scan');
        break;

      case 'handshake':
        operations.push('device_authentication', 'key_exchange');
        break;

      case 'transfer':
        operations.push('data_transfer', 'file_upload', 'file_download');
        break;

      case 'verification':
        operations.push('data_verification', 'integrity_check');
        break;
    }

    return operations;
  }

  private shouldNotifyUser(errorReport: ErrorReport): boolean {
    if (!this.notificationConfig.enableNotifications) {
      return false;
    }

    // Check priority threshold
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = severityLevels[this.notificationConfig.priorityThreshold];
    const errorLevel = severityLevels[errorReport.category.severity];

    if (errorLevel < thresholdLevel) {
      return false;
    }

    // Check if we've hit max notifications
    if (this.activeNotifications.size >= this.notificationConfig.maxActiveNotifications) {
      return false;
    }

    return true;
  }

  private createErrorNotification(errorReport: ErrorReport): SyncNotification {
    const deviceName = errorReport.context.deviceId.slice(-4);

    return {
      id: `error_${errorReport.errorId}`,
      type: 'error',
      title: this.getErrorTitle(errorReport),
      message: this.getErrorMessage(errorReport),
      timestamp: new Date(),
      deviceId: errorReport.context.deviceId,
      action: errorReport.category.recoverable
        ? {
            label: 'Retry',
            handler: () => this.retryErrorResolution(errorReport.errorId),
          }
        : undefined,
      dismissible: true,
      autoHide: false,
      priority: errorReport.category.severity === 'critical' ? 'high' : 'medium',
      category: 'sync',
    };
  }

  private createSuccessNotification(errorReport: ErrorReport): void {
    const notification: SyncNotification = {
      id: `success_${errorReport.errorId}`,
      type: 'success',
      title: 'Issue Resolved',
      message: 'The sync error has been resolved successfully',
      timestamp: new Date(),
      deviceId: errorReport.context.deviceId,
      dismissible: true,
      autoHide: true,
      priority: 'low',
      category: 'sync',
    };

    this.addNotification(notification);
  }

  private createMaxRetriesNotification(errorReport: ErrorReport): void {
    const notification: SyncNotification = {
      id: `max_retries_${errorReport.errorId}`,
      type: 'warning',
      title: 'Max Retries Reached',
      message:
        'Unable to resolve the sync error automatically. Manual intervention may be required.',
      timestamp: new Date(),
      deviceId: errorReport.context.deviceId,
      dismissible: true,
      autoHide: false,
      priority: 'high',
      category: 'sync',
    };

    this.addNotification(notification);
  }

  private getErrorTitle(errorReport: ErrorReport): string {
    switch (errorReport.category.category) {
      case 'network':
        return 'Connection Issue';
      case 'crypto':
        return 'Security Error';
      case 'data':
        return 'Data Error';
      case 'permission':
        return 'Permission Error';
      case 'storage':
        return 'Storage Error';
      default:
        return 'Sync Error';
    }
  }

  private getErrorMessage(errorReport: ErrorReport): string {
    const deviceName = errorReport.context.deviceId.slice(-4);
    return `${errorReport.resolutionStrategy.description} (Device: ${deviceName})`;
  }

  private addNotification(notification: SyncNotification): void {
    this.activeNotifications.set(notification.id, notification);

    // Auto-hide if configured
    if (notification.autoHide) {
      setTimeout(() => {
        this.dismissNotification(notification.id);
      }, this.notificationConfig.autoHideDelay);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }

    this.emit('notification_added', notification);
  }

  private removeErrorNotifications(errorId: string): void {
    const toRemove: string[] = [];

    for (const [notificationId, notification] of this.activeNotifications) {
      if (notificationId.includes(errorId)) {
        toRemove.push(notificationId);
      }
    }

    for (const notificationId of toRemove) {
      this.dismissNotification(notificationId);
    }
  }

  private async scheduleAutoRetry(errorReport: ErrorReport): Promise<void> {
    const delay = errorReport.resolutionStrategy.retryDelay;

    setTimeout(async () => {
      if (
        !errorReport.resolved &&
        errorReport.resolutionAttempts < errorReport.resolutionStrategy.maxRetries
      ) {
        await this.retryErrorResolution(errorReport.errorId);
      }
    }, delay);
  }

  private async executeResolutionStrategy(errorReport: ErrorReport): Promise<boolean> {
    // In a real implementation, this would execute the actual resolution strategy
    // For now, we'll simulate resolution based on error type

    switch (errorReport.resolutionStrategy.strategy) {
      case 'retry':
        // Simulate retry success rate based on error type
        return Math.random() > 0.3; // 70% success rate

      case 'fallback':
        // Simulate fallback mechanism
        return Math.random() > 0.2; // 80% success rate

      case 'manual':
        // Manual resolution requires user action
        return false;

      case 'ignore':
        // Mark as resolved by ignoring
        return true;

      default:
        return false;
    }
  }

  private logError(errorReport: ErrorReport): void {
    // Log error for debugging without exposing sensitive data
    const logData = {
      errorId: errorReport.errorId,
      errorCode: errorReport.error.code,
      category: errorReport.category.category,
      severity: errorReport.category.severity,
      deviceId: errorReport.context.deviceId.slice(-4), // Only last 4 chars
      operationType: errorReport.context.operationType,
      networkType: errorReport.context.networkCondition.type,
      timestamp: errorReport.context.timestamp.toISOString(),
    };

    console.error('Sync error logged:', logData);

    // In a real implementation, this would send to logging service
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.errorReports.clear();
    this.activeNotifications.clear();
    this.resolutionStrategies.clear();
    this.listeners.clear();
    this.removeAllListeners();
  }
}
