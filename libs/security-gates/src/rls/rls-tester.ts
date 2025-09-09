import { z } from 'zod';

export interface RLSPolicy {
  tableName: string;
  policyName: string;
  expectedCondition: string;
  testQueries: {
    authorized: string[];
    unauthorized: string[];
  };
}

export interface RLSTestResult {
  tableName: string;
  policyName: string;
  passed: boolean;
  authorizedTests: { query: string; passed: boolean; error?: string }[];
  unauthorizedTests: { query: string; blocked: boolean; error?: string }[];
  errors: string[];
}

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  queryAsUser: (sql: string, userId: string, params?: any[]) => Promise<any[]>;
  beginTransaction: () => Promise<void>;
  commitTransaction: () => Promise<void>;
  rollbackTransaction: () => Promise<void>;
}

const RLSPolicySchema = z.object({
  tableName: z.string().min(1),
  policyName: z.string().min(1),
  expectedCondition: z.string().min(1),
  testQueries: z.object({
    authorized: z.array(z.string()),
    unauthorized: z.array(z.string()),
  }),
});

const RLSTestConfigSchema = z.object({
  policies: z.array(RLSPolicySchema),
  testUsers: z.object({
    validUser: z.string(),
    otherUser: z.string(),
    adminUser: z.string().optional(),
  }),
});

export type RLSTestConfig = z.infer<typeof RLSTestConfigSchema>;

export class RLSTester {
  private db: DatabaseConnection;
  private config: RLSTestConfig;

  constructor(db: DatabaseConnection, config: RLSTestConfig) {
    this.db = db;
    this.config = RLSTestConfigSchema.parse(config);
  }

  async testAllPolicies(): Promise<RLSTestResult[]> {
    const results: RLSTestResult[] = [];

    for (const policy of this.config.policies) {
      try {
        const result = await this.testPolicy(policy);
        results.push(result);
      } catch (error) {
        results.push({
          tableName: policy.tableName,
          policyName: policy.policyName,
          passed: false,
          authorizedTests: [],
          unauthorizedTests: [],
          errors: [
            `Critical testing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ],
        });
      }
    }

    return results;
  }

  async testPolicy(policy: RLSPolicy): Promise<RLSTestResult> {
    const result: RLSTestResult = {
      tableName: policy.tableName,
      policyName: policy.policyName,
      passed: true,
      authorizedTests: [],
      unauthorizedTests: [],
      errors: [],
    };

    // Verify RLS is enabled on the table
    const rlsEnabled = await this.verifyRLSEnabled(policy.tableName);
    if (!rlsEnabled) {
      result.passed = false;
      result.errors.push(`RLS not enabled on table ${policy.tableName}`);
      return result;
    }

    // Verify policy exists and matches expected condition
    const policyExists = await this.verifyPolicyExists(
      policy.tableName,
      policy.policyName,
      policy.expectedCondition
    );
    if (!policyExists) {
      result.passed = false;
      result.errors.push(
        `Policy ${policy.policyName} does not exist or condition mismatch on table ${policy.tableName}`
      );
      return result;
    }

    // Test authorized queries (should succeed)
    for (const query of policy.testQueries.authorized) {
      try {
        await this.db.queryAsUser(query, this.config.testUsers.validUser);
        result.authorizedTests.push({ query, passed: true });
      } catch (error) {
        result.passed = false;
        result.authorizedTests.push({
          query,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test unauthorized queries (should fail with access denied)
    for (const query of policy.testQueries.unauthorized) {
      try {
        await this.db.queryAsUser(query, this.config.testUsers.otherUser);
        // If query succeeds, it means RLS failed to block unauthorized access
        result.passed = false;
        result.unauthorizedTests.push({
          query,
          blocked: false,
          error: 'Query should have been blocked by RLS but succeeded',
        });
      } catch (error) {
        // Query failed as expected (blocked by RLS)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRLSBlock =
          errorMessage.includes('permission denied') ||
          errorMessage.includes('access denied') ||
          errorMessage.includes('insufficient privilege');

        if (isRLSBlock) {
          result.unauthorizedTests.push({ query, blocked: true });
        } else {
          // Query failed for unexpected reason
          result.passed = false;
          result.unauthorizedTests.push({
            query,
            blocked: false,
            error: `Unexpected error: ${errorMessage}`,
          });
        }
      }
    }

    return result;
  }

  async testCrossUserAccess(tableName: string, userAId: string, userBId: string): Promise<boolean> {
    try {
      // Try to access user B's data as user A
      const query = `SELECT * FROM ${tableName} WHERE user_id = $1`;
      const result = await this.db.queryAsUser(query, userAId, [userBId]);

      // If we get results, RLS is not working properly
      return result.length === 0;
    } catch (error) {
      // Access denied is the expected behavior
      const errorMessage = error instanceof Error ? error.message : '';
      return errorMessage.includes('permission denied') || errorMessage.includes('access denied');
    }
  }

  async testServiceAccountAccess(): Promise<{ account: string; hasMinimalAccess: boolean }[]> {
    const serviceAccounts = ['service_backup', 'service_analytics', 'service_migration'];
    const results = [];

    for (const account of serviceAccounts) {
      try {
        // Service accounts should not have access to user data
        const userDataQuery = 'SELECT * FROM encrypted_cycle_data LIMIT 1';
        await this.db.queryAsUser(userDataQuery, account);

        // If query succeeds, service account has too much access
        results.push({ account, hasMinimalAccess: false });
      } catch (error) {
        // Access denied is expected for service accounts
        results.push({ account, hasMinimalAccess: true });
      }
    }

    return results;
  }

  private async verifyRLSEnabled(tableName: string): Promise<boolean> {
    try {
      const query = `
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1 AND relkind = 'r'
      `;
      const result = await this.db.query(query, [tableName]);
      return result.length > 0 && result[0].relrowsecurity === true;
    } catch (error) {
      return false;
    }
  }

  private async verifyPolicyExists(
    tableName: string,
    policyName: string,
    expectedCondition: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT pol.polname, pol.polcmd, pol.polqual::text as condition
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        WHERE cls.relname = $1 AND pol.polname = $2
      `;
      const result = await this.db.query(query, [tableName, policyName]);

      if (result.length === 0) return false;

      // Normalize whitespace for comparison
      const actualCondition = result[0].condition?.replace(/\s+/g, ' ').trim();
      const normalizedExpected = expectedCondition.replace(/\s+/g, ' ').trim();

      return actualCondition === normalizedExpected;
    } catch (error) {
      return false;
    }
  }

  generateReport(results: RLSTestResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    let report = `\n🔒 RLS Policy Test Report\n`;
    report += `=====================================\n`;
    report += `Total Policies Tested: ${totalCount}\n`;
    report += `Passed: ${passedCount}\n`;
    report += `Failed: ${totalCount - passedCount}\n`;
    report += `Success Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%\n\n`;

    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} ${result.tableName}.${result.policyName}\n`;

      if (result.errors.length > 0) {
        report += `  Errors: ${result.errors.join(', ')}\n`;
      }

      if (result.authorizedTests.length > 0) {
        const authPassed = result.authorizedTests.filter(t => t.passed).length;
        report += `  Authorized Tests: ${authPassed}/${result.authorizedTests.length} passed\n`;
      }

      if (result.unauthorizedTests.length > 0) {
        const blockedCount = result.unauthorizedTests.filter(t => t.blocked).length;
        report += `  Unauthorized Tests: ${blockedCount}/${result.unauthorizedTests.length} properly blocked\n`;
      }

      report += '\n';
    }

    return report;
  }
}

// Default RLS test configuration for Aura app
export const DEFAULT_RLS_CONFIG: RLSTestConfig = {
  policies: [
    {
      tableName: 'encrypted_user_prefs',
      policyName: 'user_prefs_rls_policy',
      expectedCondition: '((auth.uid())::text = user_id)',
      testQueries: {
        authorized: [
          'SELECT * FROM encrypted_user_prefs WHERE user_id = auth.uid()::text',
          "INSERT INTO encrypted_user_prefs (user_id, encrypted_data) VALUES (auth.uid()::text, 'test')",
          "UPDATE encrypted_user_prefs SET encrypted_data = 'updated' WHERE user_id = auth.uid()::text",
        ],
        unauthorized: [
          'SELECT * FROM encrypted_user_prefs WHERE user_id != auth.uid()::text',
          'SELECT * FROM encrypted_user_prefs',
          "UPDATE encrypted_user_prefs SET encrypted_data = 'hacked' WHERE user_id != auth.uid()::text",
        ],
      },
    },
    {
      tableName: 'encrypted_cycle_data',
      policyName: 'cycle_data_rls_policy',
      expectedCondition: '((auth.uid())::text = user_id)',
      testQueries: {
        authorized: [
          'SELECT * FROM encrypted_cycle_data WHERE user_id = auth.uid()::text',
          "INSERT INTO encrypted_cycle_data (user_id, encrypted_data, created_at) VALUES (auth.uid()::text, 'test', NOW())",
          'DELETE FROM encrypted_cycle_data WHERE user_id = auth.uid()::text AND id = 1',
        ],
        unauthorized: [
          'SELECT * FROM encrypted_cycle_data WHERE user_id != auth.uid()::text',
          'SELECT * FROM encrypted_cycle_data',
          'DELETE FROM encrypted_cycle_data WHERE user_id != auth.uid()::text',
        ],
      },
    },
    {
      tableName: 'healthcare_share',
      policyName: 'healthcare_share_rls_policy',
      expectedCondition: '((auth.uid())::text = user_id)',
      testQueries: {
        authorized: [
          'SELECT * FROM healthcare_share WHERE user_id = auth.uid()::text',
          "INSERT INTO healthcare_share (user_id, share_token, expires_at) VALUES (auth.uid()::text, 'token', NOW() + INTERVAL '1 day')",
          "UPDATE healthcare_share SET expires_at = NOW() + INTERVAL '2 days' WHERE user_id = auth.uid()::text",
        ],
        unauthorized: [
          'SELECT * FROM healthcare_share WHERE user_id != auth.uid()::text',
          'SELECT * FROM healthcare_share',
          "UPDATE healthcare_share SET share_token = 'hacked' WHERE user_id != auth.uid()::text",
        ],
      },
    },
    {
      tableName: 'device_key',
      policyName: 'device_key_rls_policy',
      expectedCondition: '((auth.uid())::text = user_id)',
      testQueries: {
        authorized: [
          'SELECT * FROM device_key WHERE user_id = auth.uid()::text',
          "INSERT INTO device_key (user_id, device_hash, public_key) VALUES (auth.uid()::text, 'hash', 'key')",
          "DELETE FROM device_key WHERE user_id = auth.uid()::text AND device_hash = 'old_hash'",
        ],
        unauthorized: [
          'SELECT * FROM device_key WHERE user_id != auth.uid()::text',
          'SELECT * FROM device_key',
          "UPDATE device_key SET public_key = 'compromised' WHERE user_id != auth.uid()::text",
        ],
      },
    },
  ],
  testUsers: {
    validUser: 'test-user-a-uuid',
    otherUser: 'test-user-b-uuid',
    adminUser: 'admin-user-uuid',
  },
};
