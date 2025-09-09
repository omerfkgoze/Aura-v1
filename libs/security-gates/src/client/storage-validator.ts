/**
 * Client-Side Storage Encryption Validation System
 *
 * Comprehensive validation framework for client-side data storage encryption
 * ensuring all sensitive data is properly encrypted before storage in
 * IndexedDB, localStorage, sessionStorage, and other client storage mechanisms.
 *
 * Implements AC 6 subtask 2: Client-side storage encryption validation system
 */

// import { z } from 'zod'; // Currently unused

// Storage types that require validation
export type StorageType = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'webSQL' | 'cookies';

// Encryption algorithms approved for client-side storage
const APPROVED_ALGORITHMS = ['AES-256-GCM', 'XChaCha20-Poly1305', 'AES-GCM'] as const;

// Patterns indicating unencrypted sensitive data
const SENSITIVE_DATA_PATTERNS = [
  // Health data patterns (critical for Aura app)
  /cycle\s*data/gi,
  /period/gi,
  /menstrual/gi,
  /ovulat/gi,
  /fertility/gi,
  /contracepti/gi,
  /symptom/gi,
  /temperature/gi,
  /mood/gi,
  /flow/gi,
  /cervical/gi,

  // Crypto material patterns
  /-----BEGIN/gi,
  /-----END/gi,
  /private[_\s]*key/gi,
  /public[_\s]*key/gi,
  /master[_\s]*key/gi,
  /seed[_\s]*phrase/gi,
  /mnemonic/gi,

  // Personal information
  /email["\s]*[:=]/gi,
  /phone["\s]*[:=]/gi,
  /address["\s]*[:=]/gi,
  /birthday/gi,
  /birthdate/gi,
  /ssn["\s]*[:=]/gi,
  /passport/gi,

  // Authentication tokens
  /access[_\s]*token/gi,
  /refresh[_\s]*token/gi,
  /jwt/gi,
  /bearer/gi,
  /session[_\s]*id/gi,

  // Device identifiers
  /device[_\s]*id/gi,
  /fingerprint/gi,
  /uuid["\s]*[:=]/gi,
];

export interface StorageValidationResult {
  isValid: boolean;
  violations: StorageViolation[];
  riskScore: number;
  recommendations: string[];
  totalItems: number;
  encryptedItems: number;
  unencryptedItems: number;
}

export interface StorageViolation {
  storageType: StorageType;
  key: string;
  value: string;
  violationType: 'unencrypted_sensitive' | 'weak_encryption' | 'invalid_format' | 'key_exposure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern?: RegExp;
  recommendation: string;
}

export interface StorageValidationConfig {
  enableStrictMode: boolean;
  requiredAlgorithms: string[];
  maxUnencryptedSize: number;
  allowedUnencryptedPatterns: RegExp[];
  storageTypes: StorageType[];
}

export interface EncryptedStorageItem {
  version: number;
  algorithm: string;
  iv: string;
  encryptedData: string;
  aad?: string;
  timestamp: string;
}

const DEFAULT_CONFIG: StorageValidationConfig = {
  enableStrictMode: true,
  requiredAlgorithms: [...APPROVED_ALGORITHMS],
  maxUnencryptedSize: 100, // bytes
  allowedUnencryptedPatterns: [
    /^theme$/gi,
    /^language$/gi,
    /^preferences\.ui\./gi,
    /^settings\.display\./gi,
  ],
  storageTypes: ['localStorage', 'sessionStorage', 'indexedDB', 'cookies'],
};

export class StorageValidator {
  private config: StorageValidationConfig;

  constructor(config: Partial<StorageValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate all client-side storage for encryption compliance
   */
  async validateAllStorage(): Promise<Map<StorageType, StorageValidationResult>> {
    const results = new Map<StorageType, StorageValidationResult>();

    for (const storageType of this.config.storageTypes) {
      const result = await this.validateStorage(storageType);
      results.set(storageType, result);
    }

    return results;
  }

  /**
   * Validate specific storage type for encryption compliance
   */
  async validateStorage(storageType: StorageType): Promise<StorageValidationResult> {
    const violations: StorageViolation[] = [];
    let totalItems = 0;
    let encryptedItems = 0;
    let unencryptedItems = 0;

    try {
      switch (storageType) {
        case 'localStorage':
          const localResult = await this.validateWebStorage(localStorage, 'localStorage');
          violations.push(...localResult.violations);
          totalItems = localResult.totalItems;
          encryptedItems = localResult.encryptedItems;
          unencryptedItems = localResult.unencryptedItems;
          break;

        case 'sessionStorage':
          const sessionResult = await this.validateWebStorage(sessionStorage, 'sessionStorage');
          violations.push(...sessionResult.violations);
          totalItems = sessionResult.totalItems;
          encryptedItems = sessionResult.encryptedItems;
          unencryptedItems = sessionResult.unencryptedItems;
          break;

        case 'indexedDB':
          const idbResult = await this.validateIndexedDB();
          violations.push(...idbResult.violations);
          totalItems = idbResult.totalItems;
          encryptedItems = idbResult.encryptedItems;
          unencryptedItems = idbResult.unencryptedItems;
          break;

        case 'cookies':
          const cookieResult = await this.validateCookies();
          violations.push(...cookieResult.violations);
          totalItems = cookieResult.totalItems;
          encryptedItems = cookieResult.encryptedItems;
          unencryptedItems = cookieResult.unencryptedItems;
          break;

        default:
          throw new Error(`Unsupported storage type: ${storageType}`);
      }
    } catch (error) {
      violations.push({
        storageType,
        key: 'validation_error',
        value: error instanceof Error ? error.message : 'Unknown error',
        violationType: 'invalid_format',
        severity: 'high',
        recommendation: `Failed to validate ${storageType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    const riskScore = this.calculateRiskScore(violations);
    const recommendations = this.generateRecommendations(violations, storageType);

    return {
      isValid: violations.length === 0,
      violations,
      riskScore,
      recommendations,
      totalItems,
      encryptedItems,
      unencryptedItems,
    };
  }

  private async validateWebStorage(
    storage: Storage,
    storageType: StorageType
  ): Promise<{
    violations: StorageViolation[];
    totalItems: number;
    encryptedItems: number;
    unencryptedItems: number;
  }> {
    const violations: StorageViolation[] = [];
    let totalItems = 0;
    let encryptedItems = 0;
    let unencryptedItems = 0;

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;

      const value = storage.getItem(key);
      if (!value) continue;

      totalItems++;

      // Check if item should be allowed unencrypted
      const isAllowedUnencrypted = this.isAllowedUnencrypted(key, value);
      if (isAllowedUnencrypted) {
        unencryptedItems++;
        continue;
      }

      // Check if value is encrypted
      const isEncrypted = this.isValidEncryptedFormat(value);
      if (isEncrypted) {
        encryptedItems++;
        // Validate encryption format
        const encryptionViolations = this.validateEncryptionFormat(value, key, storageType);
        violations.push(...encryptionViolations);
      } else {
        unencryptedItems++;
        // Check for sensitive data in unencrypted storage
        const sensitiveViolations = this.checkSensitiveData(key, value, storageType);
        violations.push(...sensitiveViolations);
      }
    }

    return { violations, totalItems, encryptedItems, unencryptedItems };
  }

  private async validateIndexedDB(): Promise<{
    violations: StorageViolation[];
    totalItems: number;
    encryptedItems: number;
    unencryptedItems: number;
  }> {
    const violations: StorageViolation[] = [];
    const totalItems = 0;
    const encryptedItems = 0;
    const unencryptedItems = 0;

    // This is a simplified implementation
    // Real implementation would enumerate all IndexedDB databases and object stores
    try {
      // Check if IndexedDB is available
      if (!('indexedDB' in window)) {
        return { violations, totalItems, encryptedItems, unencryptedItems };
      }

      // In a real implementation, this would:
      // 1. Get all database names
      // 2. Open each database
      // 3. Enumerate all object stores
      // 4. Scan all records for encryption compliance

      // Placeholder for actual IndexedDB validation
      violations.push({
        storageType: 'indexedDB',
        key: 'validation_info',
        value: 'IndexedDB validation requires database-specific implementation',
        violationType: 'invalid_format',
        severity: 'low',
        recommendation: 'Implement specific IndexedDB validation for your application databases',
      });
    } catch (error) {
      violations.push({
        storageType: 'indexedDB',
        key: 'access_error',
        value: error instanceof Error ? error.message : 'Unknown error',
        violationType: 'invalid_format',
        severity: 'medium',
        recommendation: 'Unable to access IndexedDB for validation',
      });
    }

    return { violations, totalItems, encryptedItems, unencryptedItems };
  }

  private async validateCookies(): Promise<{
    violations: StorageViolation[];
    totalItems: number;
    encryptedItems: number;
    unencryptedItems: number;
  }> {
    const violations: StorageViolation[] = [];
    let totalItems = 0;
    let encryptedItems = 0;
    let unencryptedItems = 0;

    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
      if (!cookie.trim()) continue;

      const [key, value] = cookie.split('=').map(s => s.trim());
      if (!key || !value) continue;

      totalItems++;

      // Check if cookie should be allowed unencrypted
      const isAllowedUnencrypted = this.isAllowedUnencrypted(key, value);
      if (isAllowedUnencrypted) {
        unencryptedItems++;
        continue;
      }

      // Check if cookie value is encrypted
      const isEncrypted = this.isValidEncryptedFormat(decodeURIComponent(value));
      if (isEncrypted) {
        encryptedItems++;
        const encryptionViolations = this.validateEncryptionFormat(
          decodeURIComponent(value),
          key,
          'cookies'
        );
        violations.push(...encryptionViolations);
      } else {
        unencryptedItems++;
        const sensitiveViolations = this.checkSensitiveData(
          key,
          decodeURIComponent(value),
          'cookies'
        );
        violations.push(...sensitiveViolations);
      }
    }

    return { violations, totalItems, encryptedItems, unencryptedItems };
  }

  private isAllowedUnencrypted(key: string, value: string): boolean {
    // Check if key matches allowed unencrypted patterns
    for (const pattern of this.config.allowedUnencryptedPatterns) {
      if (pattern.test(key)) {
        return true;
      }
    }

    // Check if value is small and non-sensitive
    if (value.length <= this.config.maxUnencryptedSize) {
      const hasSensitiveData = SENSITIVE_DATA_PATTERNS.some(pattern => pattern.test(value));
      return !hasSensitiveData;
    }

    return false;
  }

  private isValidEncryptedFormat(value: string): boolean {
    try {
      const parsed = JSON.parse(value) as EncryptedStorageItem;
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'algorithm' in parsed &&
        'iv' in parsed &&
        'encryptedData' in parsed
      );
    } catch {
      return false;
    }
  }

  private validateEncryptionFormat(
    value: string,
    key: string,
    storageType: StorageType
  ): StorageViolation[] {
    const violations: StorageViolation[] = [];

    try {
      const encrypted = JSON.parse(value) as EncryptedStorageItem;

      // Validate algorithm
      if (!this.config.requiredAlgorithms.includes(encrypted.algorithm)) {
        violations.push({
          storageType,
          key,
          value: `algorithm: ${encrypted.algorithm}`,
          violationType: 'weak_encryption',
          severity: 'high',
          recommendation: `Use approved encryption algorithm. Found: ${encrypted.algorithm}, Required: ${this.config.requiredAlgorithms.join(', ')}`,
        });
      }

      // Validate IV/nonce presence
      if (!encrypted.iv || encrypted.iv.length < 16) {
        violations.push({
          storageType,
          key,
          value: `iv: ${encrypted.iv}`,
          violationType: 'weak_encryption',
          severity: 'critical',
          recommendation: 'IV/nonce must be present and at least 16 bytes for secure encryption',
        });
      }

      // Validate encrypted data presence
      if (!encrypted.encryptedData || encrypted.encryptedData.length === 0) {
        violations.push({
          storageType,
          key,
          value: 'empty encryptedData',
          violationType: 'invalid_format',
          severity: 'critical',
          recommendation: 'Encrypted data field cannot be empty',
        });
      }

      // Validate version for crypto agility
      if (!encrypted.version || encrypted.version < 1) {
        violations.push({
          storageType,
          key,
          value: `version: ${encrypted.version}`,
          violationType: 'invalid_format',
          severity: 'medium',
          recommendation: 'Include version number for crypto agility and future upgrades',
        });
      }
    } catch (error) {
      violations.push({
        storageType,
        key,
        value: error instanceof Error ? error.message : 'Parse error',
        violationType: 'invalid_format',
        severity: 'high',
        recommendation: 'Encrypted storage item has invalid JSON format',
      });
    }

    return violations;
  }

  private checkSensitiveData(
    key: string,
    value: string,
    storageType: StorageType
  ): StorageViolation[] {
    const violations: StorageViolation[] = [];

    for (const pattern of SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(key) || pattern.test(value)) {
        violations.push({
          storageType,
          key,
          value: value.substring(0, 100), // Limit exposure
          violationType: 'unencrypted_sensitive',
          severity: this.getSeverityForPattern(pattern),
          pattern,
          recommendation: `Encrypt sensitive data before storing. Pattern matched: ${pattern.toString()}`,
        });
      }
    }

    return violations;
  }

  private getSeverityForPattern(pattern: RegExp): 'critical' | 'high' | 'medium' | 'low' {
    const patternStr = pattern.toString().toLowerCase();

    // Health data is critical for Aura app
    if (
      patternStr.includes('cycle') ||
      patternStr.includes('period') ||
      patternStr.includes('menstrual')
    ) {
      return 'critical';
    }

    // Crypto material is critical
    if (patternStr.includes('key') || patternStr.includes('begin') || patternStr.includes('seed')) {
      return 'critical';
    }

    // Auth tokens are high
    if (
      patternStr.includes('token') ||
      patternStr.includes('jwt') ||
      patternStr.includes('session')
    ) {
      return 'high';
    }

    // PII is high
    if (
      patternStr.includes('email') ||
      patternStr.includes('phone') ||
      patternStr.includes('address')
    ) {
      return 'high';
    }

    return 'medium';
  }

  private calculateRiskScore(violations: StorageViolation[]): number {
    let score = 0;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score += 100;
          break;
        case 'high':
          score += 50;
          break;
        case 'medium':
          score += 25;
          break;
        case 'low':
          score += 10;
          break;
      }
    }

    return score;
  }

  private generateRecommendations(
    violations: StorageViolation[],
    storageType: StorageType
  ): string[] {
    const recommendations = new Set<string>();

    const hasUnencryptedSensitive = violations.some(
      v => v.violationType === 'unencrypted_sensitive'
    );
    const hasWeakEncryption = violations.some(v => v.violationType === 'weak_encryption');
    const hasFormatIssues = violations.some(v => v.violationType === 'invalid_format');

    if (hasUnencryptedSensitive) {
      recommendations.add(`Encrypt all sensitive data before storing in ${storageType}`);
      recommendations.add(
        'Use crypto-core library for consistent encryption across the application'
      );
      recommendations.add('Implement automatic encryption for health data and PII');
    }

    if (hasWeakEncryption) {
      recommendations.add(
        `Use approved encryption algorithms: ${this.config.requiredAlgorithms.join(', ')}`
      );
      recommendations.add('Ensure proper IV/nonce generation for each encryption operation');
      recommendations.add('Include Additional Authenticated Data (AAD) for integrity protection');
    }

    if (hasFormatIssues) {
      recommendations.add(
        'Follow standardized encrypted storage format with version, algorithm, IV, and encrypted data'
      );
      recommendations.add('Implement proper error handling for storage validation failures');
    }

    recommendations.add(
      `Implement automated ${storageType} encryption validation in CI/CD pipeline`
    );
    recommendations.add('Regular security audits of client-side storage usage');

    return Array.from(recommendations);
  }

  /**
   * Generate comprehensive storage validation report
   */
  generateReport(results: Map<StorageType, StorageValidationResult>): string {
    const totalViolations = Array.from(results.values()).reduce(
      (sum, r) => sum + r.violations.length,
      0
    );
    const totalItems = Array.from(results.values()).reduce((sum, r) => sum + r.totalItems, 0);
    const totalEncrypted = Array.from(results.values()).reduce(
      (sum, r) => sum + r.encryptedItems,
      0
    );
    const encryptionRate = totalItems > 0 ? ((totalEncrypted / totalItems) * 100).toFixed(1) : '0';

    let report = `
# Client-Side Storage Encryption Validation Report

## Summary
- Storage Types Validated: ${results.size}
- Total Storage Items: ${totalItems}
- Encrypted Items: ${totalEncrypted}
- Encryption Rate: ${encryptionRate}%
- Total Violations: ${totalViolations}

## Overall Status
${totalViolations === 0 ? '✅ PASS' : '❌ FAIL'} - Client-Side Storage Encryption

`;

    for (const [storageType, result] of results) {
      const status = result.isValid ? '✅ PASS' : '❌ FAIL';
      report += `
### ${storageType.toUpperCase()} Storage
- Status: ${status}
- Items: ${result.totalItems}
- Encrypted: ${result.encryptedItems}
- Unencrypted: ${result.unencryptedItems}
- Risk Score: ${result.riskScore}
- Violations: ${result.violations.length}
`;

      if (result.violations.length > 0) {
        const criticalViolations = result.violations.filter(v => v.severity === 'critical');
        if (criticalViolations.length > 0) {
          report += `
Critical Issues:
${criticalViolations.map(v => `- ${v.violationType}: ${v.key}`).join('\n')}
`;
        }
      }
    }

    return report;
  }
}

export default StorageValidator;
