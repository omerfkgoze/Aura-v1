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

/**
 * Initialize database security configuration
 */
export async function initializeDatabaseSecurity(config: {
  enableCertificatePinning?: boolean;
  enableConnectionSecurity?: boolean;
  enableRLSEnforcement?: boolean;
  enableSecurityLogging?: boolean;
  supabaseUrl?: string;
  environment?: 'development' | 'staging' | 'production';
}) {
  const {
    enableCertificatePinning = true,
    enableConnectionSecurity = true,
    enableRLSEnforcement = true,
    enableSecurityLogging = true,
    environment = 'production',
  } = config;

  console.log('[DatabaseSecurity] Initializing security configuration...', {
    certificatePinning: enableCertificatePinning,
    connectionSecurity: enableConnectionSecurity,
    rlsEnforcement: enableRLSEnforcement,
    securityLogging: enableSecurityLogging,
    environment,
  });

  // Import the instances dynamically to avoid circular dependencies
  const { certificatePinningManager } = await import('./certificate-pinning');
  const { connectionSecurityManager } = await import('./connection-security');
  const { rlsPolicyEnforcer } = await import('./rls-enforcement');
  const { securityLogger } = await import('./security-logger');

  // Initialize security components based on configuration
  return {
    certificatePinning: enableCertificatePinning ? certificatePinningManager : null,
    connectionSecurity: enableConnectionSecurity ? connectionSecurityManager : null,
    rlsEnforcement: enableRLSEnforcement ? rlsPolicyEnforcer : null,
    securityLogger: enableSecurityLogging ? securityLogger : null,
  };
}
