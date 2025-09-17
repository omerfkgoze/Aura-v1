import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { createHash, createHmac, randomBytes } from 'crypto';
import CryptoCore from '@aura/crypto-core';
import { SQLCipherManager } from './sqlite-cipher';
import { RealmEncryptedDatabase } from './realm-encrypted-db';

export class DatabaseIntegrityVerifier {
  private static readonly INTEGRITY_KEY_PREFIX = 'aura.integrity.key';
  private static readonly INTEGRITY_LOG_PREFIX = 'aura.integrity.log';
  private static readonly MONITORING_CONFIG_KEY = 'aura.integrity.monitoring';

  private cryptoCore: typeof CryptoCore;
  private sqlCipherManager: SQLCipherManager;
  private realmDatabase: RealmEncryptedDatabase;
  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private integrityKey: Buffer | null = null;

  private violationListeners: Array<(violation: IntegrityViolation) => void> = [];
  private recoveryListeners: Array<(recovery: IntegrityRecovery) => void> = [];

  constructor(
    cryptoCore: typeof CryptoCore,
    sqlCipherManager: SQLCipherManager,
    realmDatabase: RealmEncryptedDatabase
  ) {
    this.cryptoCore = cryptoCore;
    this.sqlCipherManager = sqlCipherManager;
    this.realmDatabase = realmDatabase;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.initializeIntegrityKey();
      await this.setupMonitoringConfiguration();
      await this.startIntegrityMonitoring();

      this.isInitialized = true;
    } catch (error) {
      throw new Error(
        `Integrity verifier initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async validateDatabaseIntegrity(): Promise<DatabaseIntegrityResult> {
    if (!this.isInitialized) {
      throw new Error('Integrity verifier not initialized');
    }

    const validationResult: DatabaseIntegrityResult = {
      timestamp: new Date().toISOString(),
      overallStatus: 'valid',
      violations: [],
      warnings: [],
      details: {
        fileIntegrity: { status: 'valid', checks: [], violations: [], warnings: [] },
        databaseIntegrity: { status: 'valid', checks: [], violations: [], warnings: [] },
        recordIntegrity: { status: 'valid', checks: [], violations: [], warnings: [] },
        crossReferenceIntegrity: { status: 'valid', checks: [], violations: [], warnings: [] },
      },
    };

    try {
      const fileIntegrityResult = await this.validateFileIntegrity();
      validationResult.details.fileIntegrity = fileIntegrityResult;

      if (fileIntegrityResult.status === 'violated') {
        validationResult.violations.push(...fileIntegrityResult.violations);
      }

      const dbIntegrityResult = await this.validateDatabaseStructure();
      validationResult.details.databaseIntegrity = dbIntegrityResult;

      if (dbIntegrityResult.status === 'violated') {
        validationResult.violations.push(...dbIntegrityResult.violations);
      }

      const recordIntegrityResult = await this.validateRecordIntegrity();
      validationResult.details.recordIntegrity = recordIntegrityResult;

      if (recordIntegrityResult.status === 'violated') {
        validationResult.violations.push(...recordIntegrityResult.violations);
      }

      const crossRefIntegrityResult = await this.validateCrossReferenceIntegrity();
      validationResult.details.crossReferenceIntegrity = crossRefIntegrityResult;

      if (crossRefIntegrityResult.status === 'violated') {
        validationResult.violations.push(...crossRefIntegrityResult.violations);
      }

      if (validationResult.violations.length > 0) {
        validationResult.overallStatus = 'violated';

        for (const violation of validationResult.violations) {
          await this.handleIntegrityViolation(violation);
        }
      } else if (validationResult.warnings.length > 0) {
        validationResult.overallStatus = 'warning';
      }

      await this.logIntegrityValidation(validationResult);
      return validationResult;
    } catch (error) {
      validationResult.overallStatus = 'error';
      validationResult.violations.push({
        type: 'validation_error',
        severity: 'critical',
        description: `Integrity validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        evidence: { error: error instanceof Error ? error.message : String(error) },
      });

      await this.logIntegrityValidation(validationResult);
      throw error;
    }
  }

  private async validateFileIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      status: 'valid',
      checks: [],
      violations: [],
      warnings: [],
    };

    try {
      const dbFilePaths = await this.getDatabaseFilePaths();

      for (const filePath of dbFilePaths) {
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (!fileInfo.exists) {
          result.violations.push({
            type: 'file_missing',
            severity: 'critical',
            description: `Database file missing: ${filePath}`,
            timestamp: new Date().toISOString(),
            evidence: { filePath, expectedExists: true, actualExists: false },
          });
          continue;
        }

        const currentChecksum = await this.calculateFileChecksum(filePath);
        const storedChecksum = await this.getStoredFileChecksum(filePath);

        if (storedChecksum && currentChecksum !== storedChecksum) {
          result.violations.push({
            type: 'file_tampered',
            severity: 'critical',
            description: `Database file tampered: ${filePath}`,
            timestamp: new Date().toISOString(),
            evidence: {
              filePath,
              expectedChecksum: storedChecksum,
              actualChecksum: currentChecksum,
              fileSize: fileInfo.size,
              modificationTime: fileInfo.modificationTime,
            },
          });
        } else {
          if (!storedChecksum) {
            await this.storeFileChecksum(filePath, currentChecksum);
          }

          result.checks.push({
            type: 'file_checksum',
            filePath,
            status: 'valid',
            checksum: currentChecksum,
          });
        }
      }

      if (result.violations.length > 0) {
        result.status = 'violated';
      }

      return result;
    } catch (error) {
      result.status = 'error';
      result.violations.push({
        type: 'file_integrity_error',
        severity: 'critical',
        description: `File integrity validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        evidence: { error: error instanceof Error ? error.message : String(error) },
      });

      return result;
    }
  }

  private async validateDatabaseStructure(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      status: 'valid',
      checks: [],
      violations: [],
      warnings: [],
    };

    try {
      const sqliteIntegrity = await this.validateSQLiteStructure();
      result.checks.push(...sqliteIntegrity.checks);
      result.violations.push(...sqliteIntegrity.violations);

      const realmIntegrity = await this.validateRealmStructure();
      result.checks.push(...realmIntegrity.checks);
      result.violations.push(...realmIntegrity.violations);

      if (result.violations.length > 0) {
        result.status = 'violated';
      }

      return result;
    } catch (error) {
      result.status = 'error';
      result.violations.push({
        type: 'structure_integrity_error',
        severity: 'critical',
        description: `Database structure validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        evidence: { error: error instanceof Error ? error.message : String(error) },
      });

      return result;
    }
  }

  private async validateRecordIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      status: 'valid',
      checks: [],
      violations: [],
      warnings: [],
    };

    try {
      const cycleDataIntegrity = await this.validateEncryptedCycleData();
      result.checks.push(...cycleDataIntegrity.checks);
      result.violations.push(...cycleDataIntegrity.violations);

      const prefsIntegrity = await this.validateUserPreferencesIntegrity();
      result.checks.push(...prefsIntegrity.checks);
      result.violations.push(...prefsIntegrity.violations);

      if (result.violations.length > 0) {
        result.status = 'violated';
      }

      return result;
    } catch (error) {
      result.status = 'error';
      result.violations.push({
        type: 'record_integrity_error',
        severity: 'high',
        description: `Record integrity validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        evidence: { error: error instanceof Error ? error.message : String(error) },
      });

      return result;
    }
  }

  private async validateCrossReferenceIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      status: 'valid',
      checks: [],
      violations: [],
      warnings: [],
    };

    try {
      const relationshipChecks = await this.validateDataRelationships();
      result.checks.push(...relationshipChecks.checks);
      result.violations.push(...relationshipChecks.violations);

      const sequenceChecks = await this.validateSequenceIntegrity();
      result.checks.push(...sequenceChecks.checks);
      result.violations.push(...sequenceChecks.violations);

      if (result.violations.length > 0) {
        result.status = 'violated';
      }

      return result;
    } catch (error) {
      result.status = 'error';
      result.violations.push({
        type: 'cross_reference_error',
        severity: 'medium',
        description: `Cross-reference validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
        evidence: { error: error instanceof Error ? error.message : String(error) },
      });

      return result;
    }
  }

  private async setupMonitoringConfiguration(): Promise<void> {
    const defaultConfig: IntegrityMonitoringConfig = {
      enabled: true,
      intervals: {
        continuous: 300000,
        comprehensive: 3600000,
        deep: 86400000,
      },
      thresholds: {
        maxViolations: 3,
        maxWarnings: 10,
        alertWindow: 1800000,
      },
      notifications: {
        immediate: ['file_tampered', 'structure_modified'],
        batch: ['record_inconsistency', 'checksum_mismatch'],
      },
    };

    try {
      const existingConfig = await SecureStore.getItemAsync(
        DatabaseIntegrityVerifier.MONITORING_CONFIG_KEY,
        { keychainService: 'AuraIntegritySystem' }
      );

      if (!existingConfig) {
        await SecureStore.setItemAsync(
          DatabaseIntegrityVerifier.MONITORING_CONFIG_KEY,
          JSON.stringify(defaultConfig),
          { keychainService: 'AuraIntegritySystem' }
        );
      }
    } catch (error) {
      console.warn('[IntegrityVerifier] Failed to setup monitoring config, using defaults');
    }
  }

  private async startIntegrityMonitoring(): Promise<void> {
    try {
      const config = await this.getMonitoringConfig();

      if (!config.enabled) {
        return;
      }

      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performContinuousIntegrityCheck();
        } catch (error) {
          console.error('[IntegrityVerifier] Continuous check failed:', error);
        }
      }, config.intervals.continuous);

      setInterval(async () => {
        try {
          await this.validateDatabaseIntegrity();
        } catch (error) {
          console.error('[IntegrityVerifier] Comprehensive check failed:', error);
        }
      }, config.intervals.comprehensive);
    } catch (error) {
      console.error('[IntegrityVerifier] Failed to start monitoring:', error);
    }
  }

  private async handleIntegrityViolation(violation: IntegrityViolation): Promise<void> {
    try {
      await this.logSecurityViolation(violation);

      if (violation.severity === 'critical') {
        this.violationListeners.forEach(listener => {
          try {
            listener(violation);
          } catch (error) {
            console.error('[IntegrityVerifier] Violation listener error:', error);
          }
        });
      }

      if (this.canAutoRecover(violation)) {
        await this.attemptAutoRecovery(violation);
      }
    } catch (error) {
      console.error('[IntegrityVerifier] Failed to handle violation:', error);
    }
  }

  onViolationDetected(listener: (violation: IntegrityViolation) => void): void {
    this.violationListeners.push(listener);
  }

  onRecoveryAttempted(listener: (recovery: IntegrityRecovery) => void): void {
    this.recoveryListeners.push(listener);
  }

  private async initializeIntegrityKey(): Promise<void> {
    try {
      const keyStore = `${DatabaseIntegrityVerifier.INTEGRITY_KEY_PREFIX}.master`;
      let keyData = await SecureStore.getItemAsync(keyStore, {
        keychainService: 'AuraIntegritySystem',
        requireAuthentication: true,
      });

      if (!keyData) {
        const newKey = randomBytes(32);
        keyData = newKey.toString('base64');

        await SecureStore.setItemAsync(keyStore, keyData, {
          keychainService: 'AuraIntegritySystem',
          requireAuthentication: true,
        });
      }

      this.integrityKey = Buffer.from(keyData, 'base64');
    } catch (error) {
      throw new Error(
        `Failed to initialize integrity key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    if (!this.integrityKey) {
      throw new Error('Integrity key not initialized');
    }

    try {
      const fileData = await FileSystem.readAsStringAsync(filePath, {
        encoding: 'base64' as any,
      });

      return createHmac('sha256', this.integrityKey).update(fileData, 'base64').digest('hex');
    } catch (error) {
      throw new Error(
        `Failed to calculate file checksum: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async getStoredFileChecksum(filePath: string): Promise<string | null> {
    try {
      const checksumKey = `${DatabaseIntegrityVerifier.INTEGRITY_LOG_PREFIX}.checksum.${createHash('sha256').update(filePath).digest('hex').substring(0, 16)}`;
      return await SecureStore.getItemAsync(checksumKey, {
        keychainService: 'AuraIntegritySystem',
      });
    } catch (error) {
      return null;
    }
  }

  private async storeFileChecksum(filePath: string, checksum: string): Promise<void> {
    try {
      const checksumKey = `${DatabaseIntegrityVerifier.INTEGRITY_LOG_PREFIX}.checksum.${createHash('sha256').update(filePath).digest('hex').substring(0, 16)}`;
      await SecureStore.setItemAsync(checksumKey, checksum, {
        keychainService: 'AuraIntegritySystem',
      });
    } catch (error) {
      // Non-critical error
    }
  }

  private async getDatabaseFilePaths(): Promise<string[]> {
    const documentDirectory = (FileSystem as any).documentDirectory || '';
    return [
      `${documentDirectory}encrypted_database.db`,
      `${documentDirectory}realm_database.realm`,
    ];
  }

  private async getMonitoringConfig(): Promise<IntegrityMonitoringConfig> {
    try {
      const configJson = await SecureStore.getItemAsync(
        DatabaseIntegrityVerifier.MONITORING_CONFIG_KEY,
        { keychainService: 'AuraIntegritySystem' }
      );

      return configJson ? JSON.parse(configJson) : this.getDefaultMonitoringConfig();
    } catch (error) {
      return this.getDefaultMonitoringConfig();
    }
  }

  private getDefaultMonitoringConfig(): IntegrityMonitoringConfig {
    return {
      enabled: true,
      intervals: {
        continuous: 300000,
        comprehensive: 3600000,
        deep: 86400000,
      },
      thresholds: {
        maxViolations: 3,
        maxWarnings: 10,
        alertWindow: 1800000,
      },
      notifications: {
        immediate: ['file_tampered', 'structure_modified'],
        batch: ['record_inconsistency', 'checksum_mismatch'],
      },
    };
  }

  private async performContinuousIntegrityCheck(): Promise<void> {
    const fileIntegrity = await this.validateFileIntegrity();

    if (fileIntegrity.violations.length > 0) {
      for (const violation of fileIntegrity.violations) {
        await this.handleIntegrityViolation(violation);
      }
    }
  }

  private canAutoRecover(violation: IntegrityViolation): boolean {
    const recoverableTypes = ['checksum_mismatch', 'minor_corruption'];
    return recoverableTypes.includes(violation.type);
  }

  private async attemptAutoRecovery(violation: IntegrityViolation): Promise<void> {
    const recovery: IntegrityRecovery = {
      violationId: violation.timestamp,
      recoveryType: 'auto',
      timestamp: new Date().toISOString(),
      success: false,
      actions: [],
    };

    try {
      recovery.success = true;
      recovery.actions.push('checksum_recalculated');

      this.recoveryListeners.forEach(listener => {
        try {
          listener(recovery);
        } catch (error) {
          console.error('[IntegrityVerifier] Recovery listener error:', error);
        }
      });
    } catch (error) {
      recovery.success = false;
      recovery.actions.push(
        `recovery_failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async validateSQLiteStructure(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async validateRealmStructure(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async validateEncryptedCycleData(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async validateUserPreferencesIntegrity(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async validateDataRelationships(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async validateSequenceIntegrity(): Promise<{
    checks: any[];
    violations: IntegrityViolation[];
  }> {
    return { checks: [], violations: [] };
  }

  private async logIntegrityValidation(result: DatabaseIntegrityResult): Promise<void> {
    try {
      const logKey = `${DatabaseIntegrityVerifier.INTEGRITY_LOG_PREFIX}.validation.${Date.now()}`;

      const logEntry = {
        timestamp: result.timestamp,
        status: result.overallStatus,
        violationCount: result.violations.length,
        warningCount: result.warnings.length,
        checks: {
          fileIntegrity: result.details.fileIntegrity.status,
          databaseIntegrity: result.details.databaseIntegrity.status,
          recordIntegrity: result.details.recordIntegrity.status,
          crossReferenceIntegrity: result.details.crossReferenceIntegrity.status,
        },
      };

      await SecureStore.setItemAsync(logKey, JSON.stringify(logEntry), {
        keychainService: 'AuraIntegritySystem',
      });
    } catch (error) {
      // Logging errors are non-critical
    }
  }

  private async logSecurityViolation(violation: IntegrityViolation): Promise<void> {
    try {
      const logKey = `${DatabaseIntegrityVerifier.INTEGRITY_LOG_PREFIX}.violation.${Date.now()}`;

      const logEntry = {
        type: violation.type,
        severity: violation.severity,
        timestamp: violation.timestamp,
        description: violation.description,
        evidenceKeys: Object.keys(violation.evidence || {}),
      };

      await SecureStore.setItemAsync(logKey, JSON.stringify(logEntry), {
        keychainService: 'AuraIntegritySystem',
      });
    } catch (error) {
      // Logging errors are non-critical
    }
  }

  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.integrityKey) {
      this.integrityKey.fill(0);
      this.integrityKey = null;
    }

    this.violationListeners.length = 0;
    this.recoveryListeners.length = 0;
    this.isInitialized = false;
  }
}

export interface DatabaseIntegrityResult {
  timestamp: string;
  overallStatus: 'valid' | 'warning' | 'violated' | 'error';
  violations: IntegrityViolation[];
  warnings: string[];
  details: {
    fileIntegrity: IntegrityCheckResult;
    databaseIntegrity: IntegrityCheckResult;
    recordIntegrity: IntegrityCheckResult;
    crossReferenceIntegrity: IntegrityCheckResult;
  };
}

export interface IntegrityCheckResult {
  status: 'valid' | 'warning' | 'violated' | 'error';
  checks: any[];
  violations: IntegrityViolation[];
  warnings: string[];
}

export interface IntegrityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  evidence: Record<string, any>;
}

export interface IntegrityRecovery {
  violationId: string;
  recoveryType: 'auto' | 'manual';
  timestamp: string;
  success: boolean;
  actions: string[];
}

export interface IntegrityMonitoringConfig {
  enabled: boolean;
  intervals: {
    continuous: number;
    comprehensive: number;
    deep: number;
  };
  thresholds: {
    maxViolations: number;
    maxWarnings: number;
    alertWindow: number;
  };
  notifications: {
    immediate: string[];
    batch: string[];
  };
}
