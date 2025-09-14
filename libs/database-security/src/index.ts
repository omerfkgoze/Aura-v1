/**
 * Database Security Library
 * Comprehensive database security utilities including certificate pinning,
 * connection security, and RLS policy enforcement
 * Author: Dev Agent (Story 0.8)
 */

// Certificate Pinning
export {
  CertificatePinningManager,
  certificatePinningManager,
  SUPABASE_CERTIFICATE_PINS,
  createSecureSupabaseConfig,
  type CertificatePinConfig,
  type CertificateValidationResult,
} from './certificate-pinning';

// Mobile Certificate Pinning
export {
  MobileCertificatePinning,
  mobileCertificatePinning,
  useCertificatePinning,
  createSecureSupabaseMobileClient,
} from './mobile-certificate-pinning';

// Web Certificate Pinning
export {
  WebCertificatePinning,
  webCertificatePinning,
  createSecureSupabaseWebClient,
} from './web-certificate-pinning';

// Connection Security
export {
  DatabaseConnectionSecurity,
  connectionSecurityManager,
  type ConnectionSecurityConfig,
  type ConnectionHealthCheck,
} from './connection-security';

// RLS Policy Enforcement
export {
  RLSPolicyEnforcer,
  rlsPolicyEnforcer,
  initializeRLSPolicyEnforcer,
  useRLSValidation,
  type RLSValidationResult,
  type UserIsolationCheck,
} from './rls-enforcement';

// Security Utilities
export {
  SecurityEventLogger,
  securityLogger,
  type SecurityEvent,
  type SecurityEventLevel,
} from './security-logger';

// SQLCipher Integration (Story 2.1)
export {
  SQLCipherManager,
  createSQLCipherManager,
  PlatformConfigs,
  type SQLCipherConfig,
  type EncryptionParams,
  type DatabaseKeyInfo,
} from './sqlite-cipher';

// Database Connection Manager (Story 2.1)
export {
  DatabaseConnectionManager,
  type ConnectionConfig,
  type DatabaseSchema,
  type TableSchema,
  type ColumnSchema,
  type IndexSchema,
  type TriggerSchema,
} from './database-connection-manager';

// Encryption Validator (Story 2.1)
export {
  EncryptionValidator,
  validateMultipleDatabases,
  createValidationReport,
  type EncryptionValidationResult,
  type FileIntegrityCheck,
} from './encryption-validator';

// Realm Encrypted Database (Story 2.1)
export {
  RealmEncryptedDatabase,
  EncryptedCycleData,
  EncryptedUserPrefs,
  DeviceKeyMetadata,
  createRealmEncryptedDatabase,
  DefaultSchemas,
  type RealmConfig,
  type EncryptedRealmConfig,
  type RealmKeyInfo,
} from './realm-encrypted-db';

// Duress Protection System (Story 2.1)
export {
  DuressProtectionManager,
  duressProtectionManager,
  useDuressProtection,
  type DuressPinConfig,
  type BiometricDuressConfig,
  type SecureDeletionConfig,
  type DuressActivationResult,
  type DuressActivationEvent,
} from './duress-protection';

// Auto-lock Security Mechanism (Story 2.1)
export {
  AutoLockManager,
  autoLockManager,
  useAutoLock,
  type AutoLockConfig,
  type LockStatus,
  type UnlockAuthConfig,
  type AutoLockEvent,
} from './auto-lock-manager';

// Encrypted Migration Manager (Story 2.1)
export {
  EncryptedMigrationManager,
  encryptedMigrationManager,
  type MigrationDefinition,
  type EncryptedMigrationScript,
  type MigrationValidationRule,
  type SchemaVersion,
  type MigrationResult,
  type MigrationStatus,
  type MigrationEvent,
} from './encrypted-migration-manager';

/**
 * Initialize database security configuration
 */
export async function initializeDatabaseSecurity(config: {
  enableCertificatePinning?: boolean;
  enableConnectionSecurity?: boolean;
  enableRLSEnforcement?: boolean;
  enableSecurityLogging?: boolean;
  enableDuressProtection?: boolean;
  enableAutoLock?: boolean;
  enableEncryptedMigrations?: boolean;
  supabaseUrl?: string;
  environment?: 'development' | 'staging' | 'production';
}) {
  const {
    enableCertificatePinning = true,
    enableConnectionSecurity = true,
    enableRLSEnforcement = true,
    enableSecurityLogging = true,
    enableDuressProtection = true,
    enableAutoLock = true,
    enableEncryptedMigrations = true,
    environment = 'production',
  } = config;

  console.log('[DatabaseSecurity] Initializing security configuration...', {
    certificatePinning: enableCertificatePinning,
    connectionSecurity: enableConnectionSecurity,
    rlsEnforcement: enableRLSEnforcement,
    securityLogging: enableSecurityLogging,
    duressProtection: enableDuressProtection,
    autoLock: enableAutoLock,
    encryptedMigrations: enableEncryptedMigrations,
    environment,
  });

  // Import the instances dynamically to avoid circular dependencies
  const { certificatePinningManager } = await import('./certificate-pinning');
  const { connectionSecurityManager } = await import('./connection-security');
  const { rlsPolicyEnforcer } = await import('./rls-enforcement');
  const { securityLogger } = await import('./security-logger');
  const { duressProtectionManager } = await import('./duress-protection');
  const { autoLockManager } = await import('./auto-lock-manager');
  const { encryptedMigrationManager } = await import('./encrypted-migration-manager');

  // Initialize security components based on configuration
  const duressManager = enableDuressProtection ? duressProtectionManager : null;
  if (duressManager) {
    await duressManager.initialize();
  }

  const lockManager = enableAutoLock ? autoLockManager : null;
  if (lockManager) {
    await lockManager.initialize();
  }

  const migrationManager = enableEncryptedMigrations ? encryptedMigrationManager : null;
  // Migration manager requires database instance for initialization

  return {
    certificatePinning: enableCertificatePinning ? certificatePinningManager : null,
    connectionSecurity: enableConnectionSecurity ? connectionSecurityManager : null,
    rlsEnforcement: enableRLSEnforcement ? rlsPolicyEnforcer : null,
    securityLogger: enableSecurityLogging ? securityLogger : null,
    duressProtection: duressManager,
    autoLock: lockManager,
    encryptedMigrations: migrationManager,
  };
}
