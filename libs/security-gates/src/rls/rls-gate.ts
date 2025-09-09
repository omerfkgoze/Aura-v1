import { z } from 'zod';
import { SecurityGateResult, SecurityGate } from '../core/security-gate.interface';
import { RLSTester, RLSTestConfig, DEFAULT_RLS_CONFIG, DatabaseConnection } from './rls-tester';
import {
  AccessControlTester,
  CrossUserTestConfig,
  DEFAULT_ACCESS_CONTROL_CONFIG,
} from './access-control-tester';
import { PrivilegeTester, PrivilegeTestConfig, DEFAULT_PRIVILEGE_CONFIG } from './privilege-tester';
import { SessionTester, SessionTestConfig, DEFAULT_SESSION_CONFIG } from './session-tester';

export interface RLSGateConfig {
  enabled: boolean;
  rlsConfig: RLSTestConfig;
  accessControlConfig: CrossUserTestConfig;
  privilegeConfig: PrivilegeTestConfig;
  sessionConfig: SessionTestConfig;
  migrationValidation: {
    validateBeforeMigration: boolean;
    validateAfterMigration: boolean;
    requiredPolicies: string[];
    blockedMigrationPatterns: string[];
  };
  performanceThresholds: {
    maxTestDurationMs: number;
    maxPolicyValidationTime: number;
    maxConcurrentTests: number;
  };
}

export interface RLSMigrationValidation {
  migrationSql: string;
  preValidationResults: {
    rlsPoliciesValid: boolean;
    accessControlSecure: boolean;
    privilegesIsolated: boolean;
  };
  postValidationResults: {
    newPoliciesValid: boolean;
    existingPoliciesIntact: boolean;
    noSecurityRegression: boolean;
  };
  securityImpactAnalysis: {
    tablesAffected: string[];
    policiesModified: string[];
    potentialVulnerabilities: string[];
    mitigationRequired: string[];
  };
}

// DatabaseConnection interface moved to rls-tester.ts to avoid duplication

const RLSGateConfigSchema = z.object({
  enabled: z.boolean(),
  rlsConfig: z.any(), // Would use proper RLSTestConfig schema in production
  accessControlConfig: z.any(),
  privilegeConfig: z.any(),
  sessionConfig: z.any(),
  migrationValidation: z.object({
    validateBeforeMigration: z.boolean(),
    validateAfterMigration: z.boolean(),
    requiredPolicies: z.array(z.string()),
    blockedMigrationPatterns: z.array(z.string()),
  }),
  performanceThresholds: z.object({
    maxTestDurationMs: z.number().positive(),
    maxPolicyValidationTime: z.number().positive(),
    maxConcurrentTests: z.number().positive(),
  }),
});

export class RLSGate implements SecurityGate {
  readonly name = 'RLS and Access Control Gate';
  readonly description = 'Comprehensive RLS policy testing and access control validation';
  readonly version = '1.0.0';
  private config: RLSGateConfig;
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection, config: Partial<RLSGateConfig> = {}) {
    this.db = db;
    const defaultConfig = {
      enabled: true,
      rlsConfig: DEFAULT_RLS_CONFIG,
      accessControlConfig: DEFAULT_ACCESS_CONTROL_CONFIG,
      privilegeConfig: DEFAULT_PRIVILEGE_CONFIG,
      sessionConfig: DEFAULT_SESSION_CONFIG,
      migrationValidation: {
        validateBeforeMigration: true,
        validateAfterMigration: true,
        requiredPolicies: [
          'encrypted_cycle_data.cycle_data_rls_policy',
          'encrypted_user_prefs.user_prefs_rls_policy',
          'healthcare_share.healthcare_share_rls_policy',
          'device_key.device_key_rls_policy',
        ],
        blockedMigrationPatterns: [
          'DROP POLICY',
          'DISABLE ROW LEVEL SECURITY',
          'ALTER TABLE .* DISABLE ROW LEVEL SECURITY',
          'GRANT ALL PRIVILEGES',
          'CREATE USER .* SUPERUSER',
          'ALTER USER .* SUPERUSER',
        ],
      },
      performanceThresholds: {
        maxTestDurationMs: 300000, // 5 minutes
        maxPolicyValidationTime: 30000, // 30 seconds
        maxConcurrentTests: 5,
      },
      ...config,
    };

    this.config = RLSGateConfigSchema.parse(defaultConfig) as RLSGateConfig;
  }

  async execute(_input: unknown): Promise<SecurityGateResult> {
    return this.validate();
  }

  getConfig(): Record<string, unknown> {
    return this.config as unknown as Record<string, unknown>;
  }

  validateConfig(config: Record<string, unknown>): SecurityGateResult {
    try {
      RLSGateConfigSchema.parse(config);
      return {
        valid: true,
        passed: true,
        errors: [],
        warnings: [],
        details: 'RLS Gate configuration is valid',
      };
    } catch (error) {
      return {
        valid: false,
        passed: false,
        errors: [error instanceof Error ? error.message : 'Invalid configuration'],
        warnings: [],
        details: 'RLS Gate configuration validation failed',
      };
    }
  }

  async validate(): Promise<SecurityGateResult> {
    if (!this.config.enabled) {
      return {
        valid: true,
        passed: true,
        errors: [],
        warnings: ['RLS Gate is disabled'],
        details: 'RLS security gate is configured as disabled',
        metadata: {
          gateName: this.name,
          timestamp: new Date(),
          summary: 'RLS Gate disabled - skipping validation',
        },
      };
    }

    const startTime = Date.now();
    const results = [];
    let overallPassed = true;

    try {
      // 1. RLS Policy Testing
      const rlsTester = new RLSTester(this.db, this.config.rlsConfig);
      const rlsResults = await this.runWithTimeout(
        () => rlsTester.testAllPolicies(),
        this.config.performanceThresholds.maxPolicyValidationTime,
        'RLS Policy Tests'
      );

      const rlsPassed = rlsResults.every(r => r.passed);
      if (!rlsPassed) overallPassed = false;

      results.push({
        category: 'RLS Policies',
        passed: rlsPassed,
        details: rlsTester.generateReport(rlsResults),
        metrics: {
          totalPolicies: rlsResults.length,
          passedPolicies: rlsResults.filter(r => r.passed).length,
          failedPolicies: rlsResults.filter(r => !r.passed).length,
        },
      });

      // 2. Cross-User Access Control Testing
      const accessTester = new AccessControlTester(this.db, this.config.accessControlConfig);
      const accessResults = await this.runWithTimeout(
        () => accessTester.testAllScenarios(),
        this.config.performanceThresholds.maxTestDurationMs,
        'Access Control Tests'
      );

      const accessPassed = accessResults.every(r => r.passed);
      if (!accessPassed) overallPassed = false;

      results.push({
        category: 'Access Control',
        passed: accessPassed,
        details: accessTester.generateReport(accessResults),
        metrics: {
          totalScenarios: accessResults.length,
          passedScenarios: accessResults.filter(r => r.passed).length,
          failedScenarios: accessResults.filter(r => !r.passed).length,
        },
      });

      // 3. Data Isolation Testing
      const isolationResults = await accessTester.testDataIsolation();
      const isolationPassed = isolationResults.every(r => r.isolationMaintained);
      if (!isolationPassed) overallPassed = false;

      results.push({
        category: 'Data Isolation',
        passed: isolationPassed,
        details: this.formatIsolationResults(isolationResults),
        metrics: {
          totalTables: isolationResults.length,
          isolatedTables: isolationResults.filter(r => r.isolationMaintained).length,
          compromisedTables: isolationResults.filter(r => !r.isolationMaintained).length,
        },
      });

      // 4. Privilege Escalation Testing
      const privilegeTester = new PrivilegeTester(this.db, this.config.privilegeConfig);
      const privilegeResults = await this.runWithTimeout(
        () => privilegeTester.testAllServiceAccounts(),
        this.config.performanceThresholds.maxTestDurationMs,
        'Privilege Tests'
      );

      const privilegePassed = privilegeResults.every(r => r.passed);
      if (!privilegePassed) overallPassed = false;

      results.push({
        category: 'Privilege Escalation',
        passed: privilegePassed,
        details: privilegeTester.generateReport(privilegeResults),
        metrics: {
          totalAccounts: privilegeResults.length,
          secureAccounts: privilegeResults.filter(r => r.passed).length,
          vulnerableAccounts: privilegeResults.filter(r => !r.passed).length,
        },
      });

      // 5. Service Account Isolation
      const serviceIsolationResults = await privilegeTester.testServiceAccountIsolation();
      const serviceIsolationPassed = serviceIsolationResults.every(r => r.isolated);
      if (!serviceIsolationPassed) overallPassed = false;

      results.push({
        category: 'Service Account Isolation',
        passed: serviceIsolationPassed,
        details: this.formatServiceIsolationResults(serviceIsolationResults),
        metrics: {
          totalServiceAccounts: serviceIsolationResults.length,
          isolatedAccounts: serviceIsolationResults.filter(r => r.isolated).length,
          compromisedAccounts: serviceIsolationResults.filter(r => !r.isolated).length,
        },
      });

      // 6. Session Security Testing
      const sessionTester = new SessionTester(this.db, this.config.sessionConfig);
      const sessionAudit = await this.runWithTimeout(
        () => sessionTester.runAllTests(),
        this.config.performanceThresholds.maxTestDurationMs,
        'Session Security Tests'
      );

      const sessionPassed = sessionAudit.criticalVulnerabilities.length === 0;
      if (!sessionPassed) overallPassed = false;

      results.push({
        category: 'Session Security',
        passed: sessionPassed,
        details: sessionTester.generateReport(sessionAudit),
        metrics: {
          totalTests: sessionAudit.totalTests,
          passedTests: sessionAudit.passed,
          failedTests: sessionAudit.failed,
          criticalVulnerabilities: sessionAudit.criticalVulnerabilities.length,
          warnings: sessionAudit.warnings.length,
        },
      });

      const duration = Date.now() - startTime;

      return {
        valid: overallPassed,
        passed: overallPassed,
        errors: results.filter(r => !r.passed).map(r => `${r.category}: ${r.details}`),
        warnings: results.filter(r => r.passed).map(r => `${r.category}: passed`),
        details: this.generateDetailedReport(results),
        executionTime: duration,
        metadata: {
          gateName: this.name,
          timestamp: new Date(),
          summary: this.generateSummary(results, overallPassed, duration),
          results,
          testDuration: duration,
          totalComponents: results.length,
          passedComponents: results.filter(r => r.passed).length,
          failedComponents: results.filter(r => !r.passed).length,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        valid: false,
        passed: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        details: `Gate execution failed after ${duration}ms`,
        executionTime: duration,
        metadata: {
          gateName: this.name,
          timestamp: new Date(),
          summary: `RLS Gate failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          testDuration: duration,
        },
      };
    }
  }

  async validateMigration(migrationSql: string): Promise<RLSMigrationValidation> {
    // Pre-migration validation
    const preValidationResults = await this.runPreMigrationValidation();

    // Analyze migration SQL for security implications
    const securityImpactAnalysis = await this.analyzeMigrationSecurity(migrationSql);

    // Check for blocked patterns
    await this.validateMigrationPatterns(migrationSql);

    // Run migration in transaction for validation
    await this.db.beginTransaction();

    try {
      // Execute migration
      await this.db.query(migrationSql);

      // Post-migration validation
      const postValidationResults = await this.runPostMigrationValidation();

      // Rollback the test migration
      await this.db.rollbackTransaction();

      return {
        migrationSql,
        preValidationResults,
        postValidationResults,
        securityImpactAnalysis,
      };
    } catch (error) {
      await this.db.rollbackTransaction();
      throw new Error(
        `Migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async runPreMigrationValidation(): Promise<{
    rlsPoliciesValid: boolean;
    accessControlSecure: boolean;
    privilegesIsolated: boolean;
  }> {
    const rlsTester = new RLSTester(this.db, this.config.rlsConfig);
    const rlsResults = await rlsTester.testAllPolicies();

    const accessTester = new AccessControlTester(this.db, this.config.accessControlConfig);
    const accessResults = await accessTester.testAllScenarios();

    const privilegeTester = new PrivilegeTester(this.db, this.config.privilegeConfig);
    const privilegeResults = await privilegeTester.testServiceAccountIsolation();

    return {
      rlsPoliciesValid: rlsResults.every(r => r.passed),
      accessControlSecure: accessResults.every(r => r.passed),
      privilegesIsolated: privilegeResults.every(r => r.isolated),
    };
  }

  private async runPostMigrationValidation(): Promise<{
    newPoliciesValid: boolean;
    existingPoliciesIntact: boolean;
    noSecurityRegression: boolean;
  }> {
    // Re-run all validations after migration
    const validation = await this.validate();

    // Check for specific policy integrity
    const requiredPoliciesExist = await this.verifyRequiredPolicies();

    return {
      newPoliciesValid: validation.passed,
      existingPoliciesIntact: requiredPoliciesExist,
      noSecurityRegression: validation.passed,
    };
  }

  private async analyzeMigrationSecurity(migrationSql: string): Promise<{
    tablesAffected: string[];
    policiesModified: string[];
    potentialVulnerabilities: string[];
    mitigationRequired: string[];
  }> {
    const analysis = {
      tablesAffected: [] as string[],
      policiesModified: [] as string[],
      potentialVulnerabilities: [] as string[],
      mitigationRequired: [] as string[],
    };

    // Parse SQL for table operations
    const tableMatches = migrationSql.match(/(?:CREATE|ALTER|DROP)\s+TABLE\s+(\w+)/gi) || [];
    analysis.tablesAffected = tableMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[parts.length - 1];
    });

    // Parse for policy operations
    const policyMatches = migrationSql.match(/(?:CREATE|ALTER|DROP)\s+POLICY\s+(\w+)/gi) || [];
    analysis.policiesModified = policyMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[parts.length - 1];
    });

    // Identify potential vulnerabilities
    if (migrationSql.toLowerCase().includes('drop policy')) {
      analysis.potentialVulnerabilities.push('Policy removal detected - may compromise RLS');
      analysis.mitigationRequired.push('Verify replacement policy exists before dropping');
    }

    if (migrationSql.toLowerCase().includes('disable row level security')) {
      analysis.potentialVulnerabilities.push('RLS disable detected - CRITICAL security risk');
      analysis.mitigationRequired.push('IMMEDIATE ACTION: Re-enable RLS with proper policies');
    }

    if (migrationSql.toLowerCase().includes('grant all privileges')) {
      analysis.potentialVulnerabilities.push('Excessive privilege grant detected');
      analysis.mitigationRequired.push('Review and minimize granted privileges');
    }

    // Check for sensitive table modifications
    const sensitiveTablePatterns = ['encrypted_', 'user_', 'auth_', 'session_'];
    for (const table of analysis.tablesAffected) {
      if (sensitiveTablePatterns.some(pattern => table.toLowerCase().includes(pattern))) {
        analysis.potentialVulnerabilities.push(`Sensitive table modification: ${table}`);
        analysis.mitigationRequired.push(`Verify security controls remain intact for ${table}`);
      }
    }

    return analysis;
  }

  private async validateMigrationPatterns(migrationSql: string): Promise<void> {
    for (const pattern of this.config.migrationValidation.blockedMigrationPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(migrationSql)) {
        throw new Error(`Migration blocked: Contains prohibited pattern "${pattern}"`);
      }
    }
  }

  private async verifyRequiredPolicies(): Promise<boolean> {
    for (const policyPath of this.config.migrationValidation.requiredPolicies) {
      const [tableName, policyName] = policyPath.split('.');

      const query = `
        SELECT COUNT(*) as count
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        WHERE cls.relname = $1 AND pol.polname = $2
      `;

      const result = await this.db.query(query, [tableName, policyName]);

      if (result.length === 0 || result[0].count === 0) {
        return false;
      }
    }

    return true;
  }

  private formatIsolationResults(results: any[]): string {
    let report = '\n🏛️ Data Isolation Test Results:\n';

    for (const result of results) {
      const status = result.isolationMaintained ? '✅ ISOLATED' : '🚨 COMPROMISED';
      report += `${status} ${result.tableName}\n`;

      if (!result.isolationMaintained) {
        const failedTests = result.testResults.filter((t: any) => !t.passed);
        for (const test of failedTests) {
          report += `    ❌ ${test.description}\n`;
          report += `       Expected: ${test.expectedRows} rows, Got: ${test.actualRows} rows\n`;
        }
      }
    }

    return report;
  }

  private formatServiceIsolationResults(results: any[]): string {
    let report = '\n🛡️ Service Account Isolation Results:\n';

    for (const result of results) {
      const status = result.isolated ? '✅ ISOLATED' : '🚨 COMPROMISED';
      report += `${status} ${result.account}\n`;

      if (result.violations.length > 0) {
        for (const violation of result.violations) {
          report += `    ⚠️ ${violation}\n`;
        }
      }
    }

    return report;
  }

  private generateSummary(results: any[], passed: boolean, duration: number): string {
    const totalComponents = results.length;
    const passedComponents = results.filter(r => r.passed).length;

    const status = passed ? '✅ SECURE' : '🚨 VULNERABILITIES DETECTED';

    return (
      `${status} - RLS Gate validation completed in ${duration}ms. ` +
      `${passedComponents}/${totalComponents} security components passed validation.`
    );
  }

  private generateDetailedReport(results: any[]): string {
    let report = '\n🔒 RLS & Access Control Security Gate Report\n';
    report += '==============================================\n\n';

    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} ${result.category}\n`;

      if (result.metrics) {
        report += '  Metrics:\n';
        for (const [key, value] of Object.entries(result.metrics)) {
          report += `    ${key}: ${value}\n`;
        }
      }

      if (result.details) {
        report += `${result.details}\n`;
      }

      report += '\n';
    }

    return report;
  }
}

// Default RLS Gate configuration for Aura application
export const DEFAULT_RLS_GATE_CONFIG: RLSGateConfig = {
  enabled: true,
  rlsConfig: DEFAULT_RLS_CONFIG,
  accessControlConfig: DEFAULT_ACCESS_CONTROL_CONFIG,
  privilegeConfig: DEFAULT_PRIVILEGE_CONFIG,
  sessionConfig: DEFAULT_SESSION_CONFIG,
  migrationValidation: {
    validateBeforeMigration: true,
    validateAfterMigration: true,
    requiredPolicies: [
      'encrypted_cycle_data.cycle_data_rls_policy',
      'encrypted_user_prefs.user_prefs_rls_policy',
      'healthcare_share.healthcare_share_rls_policy',
      'device_key.device_key_rls_policy',
    ],
    blockedMigrationPatterns: [
      'DROP POLICY',
      'DISABLE ROW LEVEL SECURITY',
      'ALTER TABLE .* DISABLE ROW LEVEL SECURITY',
      'GRANT ALL PRIVILEGES ON ALL TABLES',
      'CREATE USER .* SUPERUSER',
      'ALTER USER .* SUPERUSER',
      'SET ROLE postgres',
      'RESET ROLE',
    ],
  },
  performanceThresholds: {
    maxTestDurationMs: 300000, // 5 minutes
    maxPolicyValidationTime: 30000, // 30 seconds
    maxConcurrentTests: 5,
  },
};
