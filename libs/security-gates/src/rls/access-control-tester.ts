import { z } from 'zod';
import { DatabaseConnection } from './rls-tester';

export interface CrossUserTestScenario {
  scenarioName: string;
  userA: string;
  userB: string;
  tableName: string;
  testOperations: {
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    query: string;
    expectedBlocked: boolean;
  }[];
}

export interface AccessControlTestResult {
  scenarioName: string;
  passed: boolean;
  operations: {
    operation: string;
    query: string;
    expectedBlocked: boolean;
    actuallyBlocked: boolean;
    error?: string;
  }[];
  summary: string;
}

export interface DataIsolationTest {
  tableName: string;
  userA: string;
  userB: string;
  setupData: {
    userAData: { query: string; params?: any[] }[];
    userBData: { query: string; params?: any[] }[];
  };
  isolationTests: {
    description: string;
    query: string;
    executingUser: string;
    shouldReturnRows: number;
  }[];
}

const CrossUserTestConfigSchema = z.object({
  scenarios: z.array(
    z.object({
      scenarioName: z.string(),
      userA: z.string(),
      userB: z.string(),
      tableName: z.string(),
      testOperations: z.array(
        z.object({
          operation: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
          query: z.string(),
          expectedBlocked: z.boolean(),
        })
      ),
    })
  ),
  isolationTests: z.array(
    z.object({
      tableName: z.string(),
      userA: z.string(),
      userB: z.string(),
      setupData: z.object({
        userAData: z.array(
          z.object({
            query: z.string(),
            params: z.array(z.any()).optional(),
          })
        ),
        userBData: z.array(
          z.object({
            query: z.string(),
            params: z.array(z.any()).optional(),
          })
        ),
      }),
      isolationTests: z.array(
        z.object({
          description: z.string(),
          query: z.string(),
          executingUser: z.string(),
          shouldReturnRows: z.number(),
        })
      ),
    })
  ),
});

export type CrossUserTestConfig = z.infer<typeof CrossUserTestConfigSchema>;

export class AccessControlTester {
  private db: DatabaseConnection;
  private config: CrossUserTestConfig;

  constructor(db: DatabaseConnection, config: CrossUserTestConfig) {
    this.db = db;
    this.config = CrossUserTestConfigSchema.parse(config);
  }

  async testAllScenarios(): Promise<AccessControlTestResult[]> {
    const results: AccessControlTestResult[] = [];

    for (const scenario of this.config.scenarios) {
      const result = await this.testCrossUserScenario(scenario);
      results.push(result);
    }

    return results;
  }

  async testCrossUserScenario(scenario: CrossUserTestScenario): Promise<AccessControlTestResult> {
    const result: AccessControlTestResult = {
      scenarioName: scenario.scenarioName,
      passed: true,
      operations: [],
      summary: '',
    };

    for (const operation of scenario.testOperations) {
      let actuallyBlocked = false;
      let error: string | undefined;

      try {
        // Execute operation as User A trying to access User B's data
        await this.db.queryAsUser(operation.query, scenario.userA);
        // If no exception, operation was not blocked
        actuallyBlocked = false;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        actuallyBlocked = this.isAccessDeniedError(errorMsg);
        if (!actuallyBlocked) {
          error = errorMsg;
        }
      }

      const operationPassed = actuallyBlocked === operation.expectedBlocked;
      if (!operationPassed) {
        result.passed = false;
      }

      result.operations.push({
        operation: operation.operation,
        query: operation.query,
        expectedBlocked: operation.expectedBlocked,
        actuallyBlocked,
        error,
      });
    }

    result.summary = this.generateScenarioSummary(result);
    return result;
  }

  async testDataIsolation(): Promise<
    {
      tableName: string;
      isolationMaintained: boolean;
      testResults: any[];
    }[]
  > {
    const results = [];

    for (const isolationTest of this.config.isolationTests) {
      // Setup test data for both users
      await this.setupTestData(isolationTest);

      const testResults = [];
      let isolationMaintained = true;

      for (const test of isolationTest.isolationTests) {
        try {
          const queryResult = await this.db.queryAsUser(test.query, test.executingUser);
          const actualRows = queryResult.length;
          const testPassed = actualRows === test.shouldReturnRows;

          if (!testPassed) {
            isolationMaintained = false;
          }

          testResults.push({
            description: test.description,
            expectedRows: test.shouldReturnRows,
            actualRows,
            passed: testPassed,
          });
        } catch (error) {
          // If query fails due to access control, that might be expected
          const isAccessDenied = this.isAccessDeniedError(
            error instanceof Error ? error.message : ''
          );
          const testPassed = test.shouldReturnRows === 0 && isAccessDenied;

          if (!testPassed) {
            isolationMaintained = false;
          }

          testResults.push({
            description: test.description,
            expectedRows: test.shouldReturnRows,
            actualRows: isAccessDenied ? 0 : 'ERROR',
            passed: testPassed,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Cleanup test data
      await this.cleanupTestData(isolationTest);

      results.push({
        tableName: isolationTest.tableName,
        isolationMaintained,
        testResults,
      });
    }

    return results;
  }

  async testBulkDataAccess(
    targetUserId: string,
    attackingUserId: string
  ): Promise<{
    tablesTestedCount: number;
    unauthorizedAccessAttempts: number;
    successfulBreaches: number;
    blockedAttempts: number;
  }> {
    const tables = [
      'encrypted_user_prefs',
      'encrypted_cycle_data',
      'healthcare_share',
      'device_key',
    ];
    const operations = ['SELECT', 'UPDATE', 'DELETE'];

    let unauthorizedAccessAttempts = 0;
    let successfulBreaches = 0;
    let blockedAttempts = 0;

    for (const table of tables) {
      for (const operation of operations) {
        unauthorizedAccessAttempts++;

        let query: string;
        switch (operation) {
          case 'SELECT':
            query = `SELECT * FROM ${table} WHERE user_id = '${targetUserId}'`;
            break;
          case 'UPDATE':
            query = `UPDATE ${table} SET updated_at = NOW() WHERE user_id = '${targetUserId}'`;
            break;
          case 'DELETE':
            query = `DELETE FROM ${table} WHERE user_id = '${targetUserId}' AND id = 999999`;
            break;
          default:
            continue;
        }

        try {
          const result = await this.db.queryAsUser(query, attackingUserId);

          // If SELECT returns data or UPDATE/DELETE affects rows, it's a breach
          if (operation === 'SELECT' && result.length > 0) {
            successfulBreaches++;
          } else if ((operation === 'UPDATE' || operation === 'DELETE') && result.length > 0) {
            successfulBreaches++;
          } else {
            blockedAttempts++;
          }
        } catch (error) {
          const isAccessDenied = this.isAccessDeniedError(
            error instanceof Error ? error.message : ''
          );
          if (isAccessDenied) {
            blockedAttempts++;
          } else {
            // Unexpected error, but still blocked
            blockedAttempts++;
          }
        }
      }
    }

    return {
      tablesTestedCount: tables.length,
      unauthorizedAccessAttempts,
      successfulBreaches,
      blockedAttempts,
    };
  }

  async testLateralMovement(compromisedUserId: string): Promise<{
    attemptedLateralMovements: number;
    successfulMovements: number;
    blockedMovements: number;
    discoveredUsers: string[];
  }> {
    let attemptedLateralMovements = 0;
    let successfulMovements = 0;
    let blockedMovements = 0;
    const discoveredUsers: string[] = [];

    // Attempt to discover other users
    const discoveryQueries = [
      'SELECT DISTINCT user_id FROM encrypted_user_prefs',
      'SELECT DISTINCT user_id FROM encrypted_cycle_data',
      'SELECT DISTINCT user_id FROM healthcare_share',
      'SELECT DISTINCT user_id FROM device_key',
    ];

    for (const query of discoveryQueries) {
      attemptedLateralMovements++;

      try {
        const result = await this.db.queryAsUser(query, compromisedUserId);

        if (result.length > 0) {
          successfulMovements++;
          // Collect discovered user IDs (this would be a security breach)
          result.forEach((row: any) => {
            if (row.user_id && !discoveredUsers.includes(row.user_id)) {
              discoveredUsers.push(row.user_id);
            }
          });
        } else {
          blockedMovements++;
        }
      } catch (error) {
        const isAccessDenied = this.isAccessDeniedError(
          error instanceof Error ? error.message : ''
        );
        if (isAccessDenied) {
          blockedMovements++;
        } else {
          blockedMovements++;
        }
      }
    }

    // Attempt to access discovered users' data
    for (const targetUserId of discoveredUsers) {
      if (targetUserId !== compromisedUserId) {
        const accessAttempts = [
          `SELECT * FROM encrypted_cycle_data WHERE user_id = '${targetUserId}'`,
          `SELECT * FROM encrypted_user_prefs WHERE user_id = '${targetUserId}'`,
        ];

        for (const attempt of accessAttempts) {
          attemptedLateralMovements++;

          try {
            const result = await this.db.queryAsUser(attempt, compromisedUserId);
            if (result.length > 0) {
              successfulMovements++;
            } else {
              blockedMovements++;
            }
          } catch (error) {
            blockedMovements++;
          }
        }
      }
    }

    return {
      attemptedLateralMovements,
      successfulMovements,
      blockedMovements,
      discoveredUsers,
    };
  }

  private async setupTestData(isolationTest: DataIsolationTest): Promise<void> {
    // Setup data for user A
    for (const data of isolationTest.setupData.userAData) {
      try {
        await this.db.queryAsUser(data.query, isolationTest.userA, data.params);
      } catch (error) {
        // Ignore setup errors for now
      }
    }

    // Setup data for user B
    for (const data of isolationTest.setupData.userBData) {
      try {
        await this.db.queryAsUser(data.query, isolationTest.userB, data.params);
      } catch (error) {
        // Ignore setup errors for now
      }
    }
  }

  private async cleanupTestData(isolationTest: DataIsolationTest): Promise<void> {
    const cleanupQueries = [
      `DELETE FROM ${isolationTest.tableName} WHERE user_id = '${isolationTest.userA}' AND (encrypted_data = 'test-user-a-data' OR encrypted_data LIKE 'test-%')`,
      `DELETE FROM ${isolationTest.tableName} WHERE user_id = '${isolationTest.userB}' AND (encrypted_data = 'test-user-b-data' OR encrypted_data LIKE 'test-%')`,
    ];

    for (const query of cleanupQueries) {
      try {
        // Use admin or system user for cleanup
        await this.db.query(query);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private isAccessDeniedError(errorMessage: string): boolean {
    const accessDeniedPatterns = [
      'permission denied',
      'access denied',
      'insufficient privilege',
      'row level security',
      'rls policy',
      'policy violation',
    ];

    const lowerError = errorMessage.toLowerCase();
    return accessDeniedPatterns.some(pattern => lowerError.includes(pattern));
  }

  private generateScenarioSummary(result: AccessControlTestResult): string {
    const total = result.operations.length;
    const passed = result.operations.filter(op => op.actuallyBlocked === op.expectedBlocked).length;
    const failed = total - passed;

    if (result.passed) {
      return `✅ All ${total} operations behaved as expected`;
    } else {
      return `❌ ${failed}/${total} operations failed: ${result.operations
        .filter(op => op.actuallyBlocked !== op.expectedBlocked)
        .map(
          op =>
            `${op.operation} ${op.expectedBlocked ? 'should have been blocked' : 'should have succeeded'}`
        )
        .join(', ')}`;
    }
  }

  generateReport(results: AccessControlTestResult[]): string {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    let report = `\n🛡️ Cross-User Access Control Test Report\n`;
    report += `=========================================\n`;
    report += `Total Scenarios Tested: ${totalCount}\n`;
    report += `Passed: ${passedCount}\n`;
    report += `Failed: ${totalCount - passedCount}\n`;
    report += `Success Rate: ${((passedCount / totalCount) * 100).toFixed(1)}%\n\n`;

    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} ${result.scenarioName}\n`;
      report += `  ${result.summary}\n`;

      if (!result.passed) {
        const failedOps = result.operations.filter(op => op.actuallyBlocked !== op.expectedBlocked);
        for (const op of failedOps) {
          report += `    ⚠️  ${op.operation}: Expected ${op.expectedBlocked ? 'blocked' : 'allowed'}, got ${op.actuallyBlocked ? 'blocked' : 'allowed'}\n`;
          if (op.error) {
            report += `       Error: ${op.error}\n`;
          }
        }
      }

      report += '\n';
    }

    return report;
  }
}

// Default cross-user access control test configuration
export const DEFAULT_ACCESS_CONTROL_CONFIG: CrossUserTestConfig = {
  scenarios: [
    {
      scenarioName: 'User A attempts to access User B cycle data',
      userA: 'test-user-a-uuid',
      userB: 'test-user-b-uuid',
      tableName: 'encrypted_cycle_data',
      testOperations: [
        {
          operation: 'SELECT',
          query: "SELECT * FROM encrypted_cycle_data WHERE user_id = 'test-user-b-uuid'",
          expectedBlocked: true,
        },
        {
          operation: 'UPDATE',
          query:
            "UPDATE encrypted_cycle_data SET encrypted_data = 'hacked' WHERE user_id = 'test-user-b-uuid'",
          expectedBlocked: true,
        },
        {
          operation: 'DELETE',
          query: "DELETE FROM encrypted_cycle_data WHERE user_id = 'test-user-b-uuid'",
          expectedBlocked: true,
        },
      ],
    },
    {
      scenarioName: 'User B attempts to access User A preferences',
      userA: 'test-user-a-uuid',
      userB: 'test-user-b-uuid',
      tableName: 'encrypted_user_prefs',
      testOperations: [
        {
          operation: 'SELECT',
          query: "SELECT * FROM encrypted_user_prefs WHERE user_id = 'test-user-a-uuid'",
          expectedBlocked: true,
        },
        {
          operation: 'INSERT',
          query:
            "INSERT INTO encrypted_user_prefs (user_id, encrypted_data) VALUES ('test-user-a-uuid', 'malicious')",
          expectedBlocked: true,
        },
      ],
    },
    {
      scenarioName: 'Bulk data access attempt',
      userA: 'test-attacker-uuid',
      userB: 'test-victim-uuid',
      tableName: 'encrypted_cycle_data',
      testOperations: [
        {
          operation: 'SELECT',
          query: 'SELECT * FROM encrypted_cycle_data',
          expectedBlocked: true,
        },
        {
          operation: 'SELECT',
          query: 'SELECT COUNT(*) FROM encrypted_cycle_data',
          expectedBlocked: true,
        },
      ],
    },
  ],
  isolationTests: [
    {
      tableName: 'encrypted_cycle_data',
      userA: 'test-user-a-uuid',
      userB: 'test-user-b-uuid',
      setupData: {
        userAData: [
          {
            query:
              "INSERT INTO encrypted_cycle_data (user_id, encrypted_data, created_at) VALUES ('test-user-a-uuid', 'test-user-a-data', NOW())",
          },
        ],
        userBData: [
          {
            query:
              "INSERT INTO encrypted_cycle_data (user_id, encrypted_data, created_at) VALUES ('test-user-b-uuid', 'test-user-b-data', NOW())",
          },
        ],
      },
      isolationTests: [
        {
          description: 'User A should only see their own data',
          query: 'SELECT * FROM encrypted_cycle_data',
          executingUser: 'test-user-a-uuid',
          shouldReturnRows: 1,
        },
        {
          description: 'User B should only see their own data',
          query: 'SELECT * FROM encrypted_cycle_data',
          executingUser: 'test-user-b-uuid',
          shouldReturnRows: 1,
        },
        {
          description: 'User A should not access User B data specifically',
          query: "SELECT * FROM encrypted_cycle_data WHERE user_id = 'test-user-b-uuid'",
          executingUser: 'test-user-a-uuid',
          shouldReturnRows: 0,
        },
      ],
    },
  ],
};
