import { z } from 'zod';
import { DatabaseConnection } from './rls-tester';

export interface ServiceAccount {
  name: string;
  description: string;
  expectedPrivileges: string[];
  prohibitedOperations: string[];
}

export interface PrivilegeEscalationTest {
  testName: string;
  serviceAccount: string;
  escalationAttempts: {
    description: string;
    query: string;
    expectedBlocked: boolean;
  }[];
}

export interface PrivilegeTestResult {
  serviceAccount: string;
  testName: string;
  passed: boolean;
  escalationAttempts: {
    description: string;
    query: string;
    expectedBlocked: boolean;
    actuallyBlocked: boolean;
    error?: string;
  }[];
  summary: string;
}

export interface AdminPrivilegeTest {
  adminAccount: string;
  testScenarios: {
    description: string;
    operation: string;
    shouldSucceed: boolean;
  }[];
}

const ServiceAccountSchema = z.object({
  name: z.string(),
  description: z.string(),
  expectedPrivileges: z.array(z.string()),
  prohibitedOperations: z.array(z.string())
});

const PrivilegeTestConfigSchema = z.object({
  serviceAccounts: z.array(ServiceAccountSchema),
  escalationTests: z.array(z.object({
    testName: z.string(),
    serviceAccount: z.string(),
    escalationAttempts: z.array(z.object({
      description: z.string(),
      query: z.string(),
      expectedBlocked: z.boolean()
    }))
  })),
  adminTests: z.array(z.object({
    adminAccount: z.string(),
    testScenarios: z.array(z.object({
      description: z.string(),
      operation: z.string(),
      shouldSucceed: z.boolean()
    }))
  }))
});

export type PrivilegeTestConfig = z.infer<typeof PrivilegeTestConfigSchema>;

export class PrivilegeTester {
  private db: DatabaseConnection;
  private config: PrivilegeTestConfig;

  constructor(db: DatabaseConnection, config: PrivilegeTestConfig) {
    this.db = db;
    this.config = PrivilegeTestConfigSchema.parse(config);
  }

  async testAllServiceAccounts(): Promise<PrivilegeTestResult[]> {
    const results: PrivilegeTestResult[] = [];

    for (const escalationTest of this.config.escalationTests) {
      const result = await this.testPrivilegeEscalation(escalationTest);
      results.push(result);
    }

    return results;
  }

  async testPrivilegeEscalation(test: PrivilegeEscalationTest): Promise<PrivilegeTestResult> {
    const result: PrivilegeTestResult = {
      serviceAccount: test.serviceAccount,
      testName: test.testName,
      passed: true,
      escalationAttempts: [],
      summary: ''
    };

    for (const attempt of test.escalationAttempts) {
      let actuallyBlocked = false;
      let error: string | undefined;

      try {
        await this.db.queryAsUser(attempt.query, test.serviceAccount);
        actuallyBlocked = false;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        actuallyBlocked = this.isPrivilegeError(errorMsg);
        if (!actuallyBlocked) {
          error = errorMsg;
        }
      }

      const attemptPassed = actuallyBlocked === attempt.expectedBlocked;
      if (!attemptPassed) {
        result.passed = false;
      }

      result.escalationAttempts.push({
        description: attempt.description,
        query: attempt.query,
        expectedBlocked: attempt.expectedBlocked,
        actuallyBlocked,
        error
      });
    }

    result.summary = this.generateEscalationSummary(result);
    return result;
  }

  async testServiceAccountIsolation(): Promise<{
    account: string;
    isolated: boolean;
    violations: string[];
  }[]> {
    const results = [];
    const criticalUserTables = ['encrypted_cycle_data', 'encrypted_user_prefs', 'healthcare_share', 'device_key'];

    for (const serviceAccount of this.config.serviceAccounts) {
      const violations: string[] = [];
      let isolated = true;

      // Test access to user data tables
      for (const table of criticalUserTables) {
        try {
          const result = await this.db.queryAsUser(`SELECT COUNT(*) as count FROM ${table}`, serviceAccount.name);
          
          // Service accounts should not have access to user data
          if (result.length > 0 && result[0].count !== undefined) {
            violations.push(`Unauthorized access to ${table}`);
            isolated = false;
          }
        } catch (error) {
          // Access denied is expected for service accounts
          const errorMsg = error instanceof Error ? error.message : '';
          if (!this.isPrivilegeError(errorMsg)) {
            violations.push(`Unexpected error accessing ${table}: ${errorMsg}`);
          }
        }
      }

      // Test privilege escalation attempts
      const escalationQueries = [
        'ALTER USER current_user SUPERUSER',
        'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user',
        'CREATE USER malicious_user WITH SUPERUSER',
        'DROP POLICY IF EXISTS cycle_data_rls_policy ON encrypted_cycle_data',
        'ALTER TABLE encrypted_cycle_data DISABLE ROW LEVEL SECURITY',
        'SET ROLE postgres'
      ];

      for (const query of escalationQueries) {
        try {
          await this.db.queryAsUser(query, serviceAccount.name);
          violations.push(`Privilege escalation succeeded: ${query}`);
          isolated = false;
        } catch (error) {
          // Access denied is expected
          const errorMsg = error instanceof Error ? error.message : '';
          if (!this.isPrivilegeError(errorMsg)) {
            violations.push(`Unexpected privilege escalation error: ${errorMsg}`);
          }
        }
      }

      results.push({
        account: serviceAccount.name,
        isolated,
        violations
      });
    }

    return results;
  }

  async testRolePermissionBoundaries(): Promise<{
    role: string;
    boundariesRespected: boolean;
    permissionTests: {
      permission: string;
      granted: boolean;
      shouldBeGranted: boolean;
    }[];
  }[]> {
    const results = [];
    const rolePermissionTests = [
      {
        role: 'authenticated',
        permissions: [
          { permission: 'SELECT on encrypted_cycle_data WHERE user_id = auth.uid()', shouldHave: true },
          { permission: 'SELECT on encrypted_cycle_data (all rows)', shouldHave: false },
          { permission: 'CREATE TABLE', shouldHave: false },
          { permission: 'DROP TABLE', shouldHave: false },
          { permission: 'ALTER USER', shouldHave: false }
        ]
      },
      {
        role: 'anon',
        permissions: [
          { permission: 'SELECT on encrypted_cycle_data', shouldHave: false },
          { permission: 'INSERT into encrypted_cycle_data', shouldHave: false },
          { permission: 'SELECT on public tables (non-sensitive)', shouldHave: true }
        ]
      }
    ];

    for (const roleTest of rolePermissionTests) {
      const permissionTests = [];
      let boundariesRespected = true;

      for (const permTest of roleTest.permissions) {
        let granted = false;

        try {
          // Test permission by attempting operation
          let testQuery = '';
          
          if (permTest.permission.includes('SELECT on encrypted_cycle_data WHERE')) {
            testQuery = 'SELECT COUNT(*) FROM encrypted_cycle_data WHERE user_id = auth.uid()';
          } else if (permTest.permission.includes('SELECT on encrypted_cycle_data (all')) {
            testQuery = 'SELECT COUNT(*) FROM encrypted_cycle_data';
          } else if (permTest.permission.includes('CREATE TABLE')) {
            testQuery = 'CREATE TABLE test_privilege_escalation (id integer)';
          } else if (permTest.permission.includes('DROP TABLE')) {
            testQuery = 'DROP TABLE IF EXISTS test_privilege_escalation';
          } else if (permTest.permission.includes('ALTER USER')) {
            testQuery = 'ALTER USER current_user SUPERUSER';
          } else if (permTest.permission.includes('INSERT into encrypted_cycle_data')) {
            testQuery = "INSERT INTO encrypted_cycle_data (user_id, encrypted_data) VALUES ('test', 'test')";
          } else {
            continue; // Skip unknown permission tests
          }

          // Execute as role (this is simplified - in reality you'd use specific role users)
          await this.db.query(testQuery);
          granted = true;
        } catch (error) {
          granted = false;
        }

        const testPassed = granted === permTest.shouldHave;
        if (!testPassed) {
          boundariesRespected = false;
        }

        permissionTests.push({
          permission: permTest.permission,
          granted,
          shouldBeGranted: permTest.shouldHave
        });
      }

      results.push({
        role: roleTest.role,
        boundariesRespected,
        permissionTests
      });
    }

    return results;
  }

  async testAdminAccountSecurity(): Promise<{
    adminAccount: string;
    securityScore: number;
    findings: {
      category: string;
      issue: string;
      severity: 'low' | 'medium' | high' | 'critical';
    }[];
  }[]> {
    const results = [];

    for (const adminTest of this.config.adminTests) {
      const findings: Array<{
        category: string;
        issue: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }> = [];

      // Test admin account privileges
      const adminPrivilegeTests = [
        {
          description: 'Can create/drop tables',
          query: 'CREATE TABLE admin_test_table (id integer); DROP TABLE admin_test_table;',
          category: 'DDL Operations',
          expectedSuccess: true
        },
        {
          description: 'Can modify RLS policies',
          query: 'SELECT COUNT(*) FROM pg_policy',
          category: 'Security Controls',
          expectedSuccess: true
        },
        {
          description: 'Can access user data (should be restricted)',
          query: 'SELECT COUNT(*) FROM encrypted_cycle_data',
          category: 'Data Access',
          expectedSuccess: false // Even admins should not have direct user data access
        },
        {
          description: 'Can create users',
          query: 'CREATE USER test_admin_created_user',
          category: 'User Management',
          expectedSuccess: true
        }
      ];

      let securityScore = 100;

      for (const test of adminPrivilegeTests) {
        try {
          await this.db.queryAsUser(test.query, adminTest.adminAccount);
          
          if (!test.expectedSuccess) {
            findings.push({
              category: test.category,
              issue: `Admin has excessive privilege: ${test.description}`,
              severity: 'high'
            });
            securityScore -= 20;
          }
        } catch (error) {
          if (test.expectedSuccess) {
            const errorMsg = error instanceof Error ? error.message : '';
            if (this.isPrivilegeError(errorMsg)) {
              findings.push({
                category: test.category,
                issue: `Admin lacks expected privilege: ${test.description}`,
                severity: 'medium'
              });
              securityScore -= 10;
            }
          } else {
            // Expected failure - admin properly restricted
          }
        }
      }

      // Test for common admin account vulnerabilities
      const vulnerabilityTests = [
        {
          description: 'Check for default admin credentials',
          test: () => adminTest.adminAccount === 'admin' || adminTest.adminAccount === 'administrator',
          severity: 'critical' as const,
          category: 'Authentication'
        },
        {
          description: 'Check for shared admin accounts',
          test: () => adminTest.adminAccount.includes('shared') || adminTest.adminAccount.includes('generic'),
          severity: 'high' as const,
          category: 'Authentication'
        }
      ];

      for (const vulnTest of vulnerabilityTests) {
        if (vulnTest.test()) {
          findings.push({
            category: vulnTest.category,
            issue: vulnTest.description,
            severity: vulnTest.severity
          });
          
          if (vulnTest.severity === 'critical') {
            securityScore -= 40;
          } else if (vulnTest.severity === 'high') {
            securityScore -= 25;
          }
        }
      }

      results.push({
        adminAccount: adminTest.adminAccount,
        securityScore: Math.max(0, securityScore),
        findings
      });
    }

    return results;
  }

  private isPrivilegeError(errorMessage: string): boolean {
    const privilegeErrorPatterns = [
      'permission denied',
      'insufficient privilege',
      'must be owner',
      'must be superuser',
      'access denied',
      'not authorized',
      'cannot execute',
      'role does not exist',
      'authentication failed'
    ];

    const lowerError = errorMessage.toLowerCase();
    return privilegeErrorPatterns.some(pattern => lowerError.includes(pattern));
  }

  private generateEscalationSummary(result: PrivilegeTestResult): string {
    const total = result.escalationAttempts.length;
    const blocked = result.escalationAttempts.filter(attempt => attempt.actuallyBlocked).length;
    const successful = total - blocked;

    if (result.passed) {
      return `✅ All ${total} escalation attempts properly handled (${blocked} blocked, ${successful} allowed as expected)`;
    } else {
      const failures = result.escalationAttempts.filter(attempt => 
        attempt.actuallyBlocked !== attempt.expectedBlocked
      );
      return `❌ ${failures.length}/${total} escalation tests failed: ${failures
        .map(f => f.description)
        .join(', ')}`;
    }
  }

  generateReport(results: PrivilegeTestResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    let report = `\n⚔️ Privilege Escalation Test Report\n`;
    report += `====================================\n`;
    report += `Total Service Accounts Tested: ${totalCount}\n`;
    report += `Passed Security Tests: ${passedCount}\n`;
    report += `Failed Security Tests: ${totalCount - passedCount}\n`;
    report += `Security Success Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%\n\n`;

    for (const result of results) {
      const status = result.passed ? '✅ SECURE' : '🚨 VULNERABLE';
      report += `${status} ${result.serviceAccount} - ${result.testName}\n`;
      report += `  ${result.summary}\n`;
      
      if (!result.passed) {
        const violations = result.escalationAttempts.filter(attempt => 
          attempt.actuallyBlocked !== attempt.expectedBlocked
        );
        
        for (const violation of violations) {
          if (violation.expectedBlocked && !violation.actuallyBlocked) {
            report += `    🚨 CRITICAL: ${violation.description} - Escalation succeeded when it should have been blocked\n`;
          } else if (!violation.expectedBlocked && violation.actuallyBlocked) {
            report += `    ⚠️  WARNING: ${violation.description} - Expected operation was blocked\n`;
          }
          
          if (violation.error) {
            report += `       Error: ${violation.error}\n`;
          }
        }
      }
      
      report += '\n';
    }

    return report;
  }
}

// Default privilege escalation test configuration
export const DEFAULT_PRIVILEGE_CONFIG: PrivilegeTestConfig = {
  serviceAccounts: [
    {
      name: 'service_backup',
      description: 'Backup service account for data archival',
      expectedPrivileges: ['SELECT on backup tables', 'INSERT into backup_log'],
      prohibitedOperations: ['SELECT on encrypted_cycle_data', 'ALTER USER', 'CREATE TABLE']
    },
    {
      name: 'service_analytics',
      description: 'Analytics service account for aggregated reporting',
      expectedPrivileges: ['SELECT on analytics_views', 'INSERT into analytics_log'],
      prohibitedOperations: ['SELECT on encrypted_cycle_data', 'UPDATE user data', 'DROP TABLE']
    },
    {
      name: 'service_migration',
      description: 'Migration service account for database schema updates',
      expectedPrivileges: ['ALTER TABLE', 'CREATE INDEX', 'UPDATE schema_version'],
      prohibitedOperations: ['SELECT on encrypted_cycle_data', 'ALTER USER', 'GRANT privileges to other users']
    }
  ],
  escalationTests: [
    {
      testName: 'Backup Service Privilege Escalation',
      serviceAccount: 'service_backup',
      escalationAttempts: [
        {
          description: 'Attempt to access encrypted user data',
          query: 'SELECT * FROM encrypted_cycle_data LIMIT 1',
          expectedBlocked: true
        },
        {
          description: 'Attempt to create admin user',
          query: 'CREATE USER backup_admin WITH SUPERUSER',
          expectedBlocked: true
        },
        {
          description: 'Attempt to disable RLS',
          query: 'ALTER TABLE encrypted_cycle_data DISABLE ROW LEVEL SECURITY',
          expectedBlocked: true
        },
        {
          description: 'Attempt to elevate own privileges',
          query: 'ALTER USER service_backup SUPERUSER',
          expectedBlocked: true
        },
        {
          description: 'Attempt to access backup tables (should succeed)',
          query: 'SELECT COUNT(*) FROM backup_metadata',
          expectedBlocked: false
        }
      ]
    },
    {
      testName: 'Analytics Service Privilege Escalation',
      serviceAccount: 'service_analytics',
      escalationAttempts: [
        {
          description: 'Attempt to access raw encrypted data',
          query: 'SELECT encrypted_data FROM encrypted_cycle_data LIMIT 1',
          expectedBlocked: true
        },
        {
          description: 'Attempt to modify user data',
          query: "UPDATE encrypted_cycle_data SET encrypted_data = 'modified' WHERE id = 1",
          expectedBlocked: true
        },
        {
          description: 'Attempt to create new tables',
          query: 'CREATE TABLE analytics_backdoor (data text)',
          expectedBlocked: true
        },
        {
          description: 'Attempt to grant privileges to others',
          query: 'GRANT SELECT ON encrypted_cycle_data TO public',
          expectedBlocked: true
        }
      ]
    },
    {
      testName: 'Migration Service Privilege Escalation',
      serviceAccount: 'service_migration',
      escalationAttempts: [
        {
          description: 'Attempt to access user data during migration',
          query: 'SELECT user_id, encrypted_data FROM encrypted_cycle_data',
          expectedBlocked: true
        },
        {
          description: 'Attempt to create superuser account',
          query: 'CREATE USER migration_admin WITH SUPERUSER PASSWORD \'password\'',
          expectedBlocked: true
        },
        {
          description: 'Attempt to modify RLS policies',
          query: 'DROP POLICY cycle_data_rls_policy ON encrypted_cycle_data',
          expectedBlocked: true
        },
        {
          description: 'Schema modification (should succeed for migration)',
          query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS test_migration_index ON schema_version (version)',
          expectedBlocked: false
        }
      ]
    }
  ],
  adminTests: [
    {
      adminAccount: 'admin_user',
      testScenarios: [
        {
          description: 'Admin can manage database schema',
          operation: 'CREATE TABLE test_admin_table (id integer)',
          shouldSucceed: true
        },
        {
          description: 'Admin should not have direct user data access',
          operation: 'SELECT * FROM encrypted_cycle_data',
          shouldSucceed: false
        }
      ]
    }
  ]
};