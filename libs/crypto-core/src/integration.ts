// TypeScript integration patterns for future development
// This module provides TypeScript interfaces and utilities for cross-story integration

import type { AsyncCryptoCore } from './index';

// Device-specific key management integration (Story 1.4 dependency)
export interface DeviceKeyManagementIntegration {
  /**
   * Initialize device-specific key management
   * @param config Device capabilities and configuration
   */
  initializeDeviceKeyManagement(config: DeviceKeyManagementConfig): Promise<void>;

  /**
   * Store key using device-specific secure storage
   * @param keyId Unique identifier for the key
   * @param keyData Key data to store securely
   */
  storeKeySecurely(keyId: string, keyData: Uint8Array): Promise<void>;

  /**
   * Retrieve key from device-specific secure storage
   * @param keyId Unique identifier for the key
   */
  retrieveKeySecurely(keyId: string): Promise<Uint8Array>;

  /**
   * Delete key from device-specific secure storage
   * @param keyId Unique identifier for the key
   */
  deleteKeySecurely(keyId: string): Promise<void>;

  /**
   * Check if key exists in secure storage
   * @param keyId Unique identifier for the key
   */
  keyExistsSecurely(keyId: string): Promise<boolean>;

  /**
   * Get device security capabilities
   */
  getDeviceCapabilities(): Promise<DeviceKeyManagementConfig>;
}

export interface DeviceKeyManagementConfig {
  deviceSalt: Uint8Array;
  hsmAvailable: boolean;
  biometricSupported: boolean;
  secureEnclaveAvailable: boolean;
}

// Authentication system integration (Story 1.3 dependency)
export interface AuthSystemIntegration {
  /**
   * Initialize authentication integration
   * @param config Authentication system configuration
   */
  initializeAuthIntegration(config: AuthIntegrationConfig): Promise<void>;

  /**
   * Validate authentication context
   * @param authContext Current authentication context
   */
  validateAuthContext(authContext: AuthContext): Promise<boolean>;

  /**
   * Get current authentication context
   */
  getCurrentAuthContext(): Promise<AuthContext | null>;

  /**
   * Refresh authentication context
   * @param authContext Current authentication context
   */
  refreshAuthContext(authContext: AuthContext): Promise<AuthContext>;

  /**
   * Create authenticated crypto operation context
   * @param authContext Authentication context
   * @param operationType Type of crypto operation
   */
  createCryptoOperationContext(
    authContext: AuthContext,
    operationType: 'encrypt' | 'decrypt' | 'key_generation'
  ): Promise<CryptoOperationContext>;
}

export interface AuthIntegrationConfig {
  providerType: string;
  tokenValidationUrl: string;
  publicKey: Uint8Array;
  expirationTolerance: number;
}

export interface AuthContext {
  userId: string;
  sessionToken: string;
  expiresAt: number;
  authLevel: 'basic' | 'mfa' | 'biometric';
}

export interface CryptoOperationContext {
  authContext: AuthContext;
  operationType: string;
  timestamp: number;
  sessionId: string;
}

// Key rotation support (Story 1.5 dependency)
export interface KeyRotationIntegration {
  /**
   * Initialize key rotation support
   * @param config Key rotation configuration
   */
  initializeKeyRotation(config: KeyRotationConfig): Promise<void>;

  /**
   * Check if key rotation is needed
   * @param keyVersion Current key version information
   */
  isRotationNeeded(keyVersion: IntegrationKeyVersion): Promise<boolean>;

  /**
   * Rotate key to new version
   * @param currentKeyId Current key identifier
   * @param rotationReason Reason for rotation
   */
  rotateKey(currentKeyId: string, rotationReason: string): Promise<KeyRotationResult>;

  /**
   * Get key version history
   * @param keyId Key identifier
   */
  getKeyVersionHistory(keyId: string): Promise<IntegrationKeyVersion[]>;

  /**
   * Validate crypto envelope with key version
   * @param envelope Crypto envelope to validate
   */
  validateEnvelopeForRotation(envelope: any): Promise<KeyVersionValidationResult>;

  /**
   * Migrate old encrypted data to new key version
   * @param oldKeyId Old key identifier
   * @param newKeyId New key identifier
   * @param encryptedData Encrypted data to migrate
   */
  migrateEncryptedData(
    oldKeyId: string,
    newKeyId: string,
    encryptedData: Uint8Array
  ): Promise<Uint8Array>;
}

export interface KeyRotationConfig {
  rotationInterval: number;
  maxKeyAge: number;
  oldKeyRetentionCount: number;
  autoRotationEnabled: boolean;
}

export interface IntegrationKeyVersion {
  versionId: string;
  createdAt: number;
  status: 'active' | 'deprecated' | 'revoked';
  algorithm: string;
}

export interface KeyRotationResult {
  newKeyId: string;
  newKeyVersion: IntegrationKeyVersion;
  rotationTimestamp: number;
  rotationReason: string;
  success: boolean;
}

export interface KeyVersionValidationResult {
  valid: boolean;
  keyVersion: IntegrationKeyVersion;
  rotationNeeded: boolean;
  validationErrors: string[];
}

// Health-check interface (Story 1.6 dependency)
export interface HealthCheckIntegration {
  /**
   * Initialize health check system
   * @param config Health check configuration
   */
  initializeHealthCheck(config: HealthCheckConfig): Promise<void>;

  /**
   * Perform comprehensive health check
   */
  performHealthCheck(): Promise<HealthCheckResult>;

  /**
   * Get current health status
   */
  getCurrentHealthStatus(): Promise<HealthStatus>;

  /**
   * Register health check callback
   * @param callback Function to call on health status change
   */
  registerHealthCheckCallback(callback: (status: HealthStatus) => void): string;

  /**
   * Unregister health check callback
   * @param callbackId Callback identifier
   */
  unregisterHealthCheckCallback(callbackId: string): void;

  /**
   * Start continuous health monitoring
   * @param interval Monitoring interval in seconds
   */
  startHealthMonitoring(interval: number): Promise<void>;

  /**
   * Stop continuous health monitoring
   */
  stopHealthMonitoring(): Promise<void>;
}

export interface HealthCheckConfig {
  enabled: boolean;
  checkInterval: number;
  includePerformance: boolean;
  includeSecurity: boolean;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  cryptoHealth: string;
  memoryHealth: string;
  performanceMetrics?: string;
  securityStatus?: string;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    crypto: 'healthy' | 'degraded' | 'unhealthy';
    memory: 'healthy' | 'degraded' | 'unhealthy';
    performance: 'healthy' | 'degraded' | 'unhealthy';
    security: 'healthy' | 'degraded' | 'unhealthy';
  };
  lastCheck: number;
}

// Debugging and monitoring interfaces
export interface DebugIntegration {
  /**
   * Initialize debug system
   * @param config Debug configuration
   */
  initializeDebug(config: DebugConfig): Promise<void>;

  /**
   * Get current monitoring metrics
   */
  getMonitoringMetrics(): Promise<MonitoringMetrics>;

  /**
   * Enable debug logging
   * @param level Log level to enable
   */
  enableDebugLogging(level: 'error' | 'warn' | 'info' | 'debug'): void;

  /**
   * Disable debug logging
   */
  disableDebugLogging(): void;

  /**
   * Generate debug report
   */
  generateDebugReport(): Promise<DebugReport>;

  /**
   * Export metrics for external monitoring
   * @param format Export format
   */
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): Promise<string>;
}

export interface DebugConfig {
  debugEnabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  includeMemoryStats: boolean;
  includePerformanceMetrics: boolean;
}

export interface MonitoringMetrics {
  cryptoOperationsCount: number;
  avgOperationTimeUs: number;
  peakMemoryUsage: number;
  currentMemoryUsage: number;
  memoryLeaksDetected: number;
  lastHealthCheck: number;
}

export interface DebugReport {
  timestamp: number;
  version: string;
  platform: string;
  metrics: MonitoringMetrics;
  healthStatus: HealthStatus;
  recentErrors: DebugError[];
  configurationSummary: ConfigurationSummary;
}

export interface DebugError {
  timestamp: number;
  level: 'error' | 'warn';
  message: string;
  context?: Record<string, any>;
}

export interface ConfigurationSummary {
  authIntegration: boolean;
  keyRotation: boolean;
  healthCheck: boolean;
  debug: boolean;
  securityFeatures: string[];
}

// Unified integration interface for all future stories
export interface CryptoCoreIntegration
  extends DeviceKeyManagementIntegration,
    AuthSystemIntegration,
    KeyRotationIntegration,
    HealthCheckIntegration,
    DebugIntegration {
  /**
   * Initialize all integration modules
   * @param config Unified integration configuration
   */
  initializeAllIntegrations(config: UnifiedIntegrationConfig): Promise<void>;

  /**
   * Get integration status
   */
  getIntegrationStatus(): Promise<IntegrationStatus>;

  /**
   * Shutdown all integrations cleanly
   */
  shutdownIntegrations(): Promise<void>;
}

export interface UnifiedIntegrationConfig {
  deviceKeyManagement?: DeviceKeyManagementConfig;
  authSystem?: AuthIntegrationConfig;
  keyRotation?: KeyRotationConfig;
  healthCheck?: HealthCheckConfig;
  debug?: DebugConfig;
}

export interface IntegrationStatus {
  deviceKeyManagement: boolean;
  authSystem: boolean;
  keyRotation: boolean;
  healthCheck: boolean;
  debug: boolean;
  initialized: boolean;
  errors: string[];
}

// Factory function to create integration instance
export function createCryptoCoreIntegration(cryptoCore: AsyncCryptoCore): CryptoCoreIntegration {
  return new CryptoCoreIntegrationImpl(cryptoCore);
}

// Implementation class (placeholder for future development)
class CryptoCoreIntegrationImpl implements CryptoCoreIntegration {
  private cryptoCore: AsyncCryptoCore;
  private integrationStatus: IntegrationStatus;

  constructor(cryptoCore: AsyncCryptoCore) {
    this.cryptoCore = cryptoCore;
    this.integrationStatus = {
      deviceKeyManagement: false,
      authSystem: false,
      keyRotation: false,
      healthCheck: false,
      debug: false,
      initialized: false,
      errors: [],
    };
  }

  // Device Key Management
  async initializeDeviceKeyManagement(config: DeviceKeyManagementConfig): Promise<void> {
    // Implementation will be added in Story 1.4
    this.integrationStatus.deviceKeyManagement = true;
  }

  async storeKeySecurely(keyId: string, keyData: Uint8Array): Promise<void> {
    throw new Error('Device key management not implemented yet - Story 1.4');
  }

  async retrieveKeySecurely(keyId: string): Promise<Uint8Array> {
    throw new Error('Device key management not implemented yet - Story 1.4');
  }

  async deleteKeySecurely(keyId: string): Promise<void> {
    throw new Error('Device key management not implemented yet - Story 1.4');
  }

  async keyExistsSecurely(keyId: string): Promise<boolean> {
    throw new Error('Device key management not implemented yet - Story 1.4');
  }

  async getDeviceCapabilities(): Promise<DeviceKeyManagementConfig> {
    throw new Error('Device key management not implemented yet - Story 1.4');
  }

  // Authentication System
  async initializeAuthIntegration(config: AuthIntegrationConfig): Promise<void> {
    // Implementation will be added in Story 1.3
    this.integrationStatus.authSystem = true;
  }

  async validateAuthContext(authContext: AuthContext): Promise<boolean> {
    throw new Error('Auth system integration not implemented yet - Story 1.3');
  }

  async getCurrentAuthContext(): Promise<AuthContext | null> {
    throw new Error('Auth system integration not implemented yet - Story 1.3');
  }

  async refreshAuthContext(authContext: AuthContext): Promise<AuthContext> {
    throw new Error('Auth system integration not implemented yet - Story 1.3');
  }

  async createCryptoOperationContext(
    authContext: AuthContext,
    operationType: 'encrypt' | 'decrypt' | 'key_generation'
  ): Promise<CryptoOperationContext> {
    throw new Error('Auth system integration not implemented yet - Story 1.3');
  }

  // Key Rotation
  async initializeKeyRotation(config: KeyRotationConfig): Promise<void> {
    // Implementation will be added in Story 1.5
    this.integrationStatus.keyRotation = true;
  }

  async isRotationNeeded(keyVersion: IntegrationKeyVersion): Promise<boolean> {
    throw new Error('Key rotation not implemented yet - Story 1.5');
  }

  async rotateKey(currentKeyId: string, rotationReason: string): Promise<KeyRotationResult> {
    throw new Error('Key rotation not implemented yet - Story 1.5');
  }

  async getKeyVersionHistory(keyId: string): Promise<IntegrationKeyVersion[]> {
    throw new Error('Key rotation not implemented yet - Story 1.5');
  }

  async validateEnvelopeForRotation(envelope: any): Promise<KeyVersionValidationResult> {
    throw new Error('Key rotation not implemented yet - Story 1.5');
  }

  async migrateEncryptedData(
    oldKeyId: string,
    newKeyId: string,
    encryptedData: Uint8Array
  ): Promise<Uint8Array> {
    throw new Error('Key rotation not implemented yet - Story 1.5');
  }

  // Health Check
  async initializeHealthCheck(config: HealthCheckConfig): Promise<void> {
    // Implementation will be added in Story 1.6
    this.integrationStatus.healthCheck = true;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  async getCurrentHealthStatus(): Promise<HealthStatus> {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  registerHealthCheckCallback(callback: (status: HealthStatus) => void): string {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  unregisterHealthCheckCallback(callbackId: string): void {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  async startHealthMonitoring(interval: number): Promise<void> {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  async stopHealthMonitoring(): Promise<void> {
    throw new Error('Health check not implemented yet - Story 1.6');
  }

  // Debug
  async initializeDebug(config: DebugConfig): Promise<void> {
    // Basic implementation available
    this.integrationStatus.debug = true;
  }

  async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    // Basic implementation using existing functionality
    return {
      cryptoOperationsCount: 0, // Will be tracked in future stories
      avgOperationTimeUs: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      memoryLeaksDetected: 0,
      lastHealthCheck: 0,
    };
  }

  enableDebugLogging(level: 'error' | 'warn' | 'info' | 'debug'): void {
    console.log(`Debug logging enabled at level: ${level}`);
  }

  disableDebugLogging(): void {
    console.log('Debug logging disabled');
  }

  async generateDebugReport(): Promise<DebugReport> {
    throw new Error('Debug report generation not fully implemented yet');
  }

  async exportMetrics(format: 'json' | 'csv' | 'prometheus'): Promise<string> {
    throw new Error('Metrics export not implemented yet');
  }

  // Unified interface
  async initializeAllIntegrations(config: UnifiedIntegrationConfig): Promise<void> {
    const errors: string[] = [];

    try {
      if (config.deviceKeyManagement) {
        await this.initializeDeviceKeyManagement(config.deviceKeyManagement);
      }
    } catch (error) {
      errors.push(`Device key management initialization failed: ${error}`);
    }

    try {
      if (config.authSystem) {
        await this.initializeAuthIntegration(config.authSystem);
      }
    } catch (error) {
      errors.push(`Auth system initialization failed: ${error}`);
    }

    try {
      if (config.keyRotation) {
        await this.initializeKeyRotation(config.keyRotation);
      }
    } catch (error) {
      errors.push(`Key rotation initialization failed: ${error}`);
    }

    try {
      if (config.healthCheck) {
        await this.initializeHealthCheck(config.healthCheck);
      }
    } catch (error) {
      errors.push(`Health check initialization failed: ${error}`);
    }

    try {
      if (config.debug) {
        await this.initializeDebug(config.debug);
      }
    } catch (error) {
      errors.push(`Debug initialization failed: ${error}`);
    }

    this.integrationStatus.errors = errors;
    this.integrationStatus.initialized = errors.length === 0;
  }

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    return { ...this.integrationStatus };
  }

  async shutdownIntegrations(): Promise<void> {
    // Clean shutdown of all integration modules
    this.integrationStatus = {
      deviceKeyManagement: false,
      authSystem: false,
      keyRotation: false,
      healthCheck: false,
      debug: false,
      initialized: false,
      errors: [],
    };
  }
}
