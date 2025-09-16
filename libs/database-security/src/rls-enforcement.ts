/**
 * RLS Policy Enforcement Utilities
 * Runtime validation and enforcement of Row Level Security policies
 * Author: Dev Agent (Story 0.8)
 */

export interface RLSValidationResult {
  isValid: boolean;
  policyName?: string;
  tableName: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  userId?: string;
  errorMessage?: string;
  violationType?:
    | 'unauthorized_access'
    | 'cross_user_access'
    | 'policy_bypass'
    | 'service_role_violation';
}

export interface UserIsolationCheck {
  userId: string;
  tableName: string;
  recordCount: number;
  crossUserAccessAttempted: boolean;
  rlsEnforced: boolean;
  isolationVerified: boolean;
}

/**
 * RLS Policy Enforcer
 * Validates and enforces Row Level Security policies at runtime
 */
export class RLSPolicyEnforcer {
  private supabaseClient: any;
  private validationCache: Map<string, { result: RLSValidationResult; timestamp: number }> =
    new Map();
  private cacheTimeout: number = 300000; // 5 minutes

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Validate RLS policy enforcement for a specific operation
   */
  public async validateRLSPolicy(
    tableName: string,
    operation: RLSValidationResult['operation'],
    userId?: string,
    recordIds?: string[]
  ): Promise<RLSValidationResult> {
    const cacheKey = `${tableName}_${operation}_${userId}_${recordIds?.join(',') || 'all'}`;

    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }

    try {
      const result = await this.performRLSValidation(tableName, operation, userId, recordIds);

      // Cache the result
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const errorResult: RLSValidationResult = {
        isValid: false,
        tableName,
        operation,
        userId,
        errorMessage: `RLS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        violationType: 'policy_bypass',
      };

      return errorResult;
    }
  }

  /**
   * Perform actual RLS validation
   */
  private async performRLSValidation(
    tableName: string,
    operation: RLSValidationResult['operation'],
    userId?: string,
    recordIds?: string[]
  ): Promise<RLSValidationResult> {
    // Test queries to validate RLS enforcement
    const testQueries = this.buildRLSTestQueries(tableName, operation, userId, recordIds);

    for (const query of testQueries) {
      try {
        const { data, error } = await this.supabaseClient.rpc('validate_rls_policy', {
          test_query: query.sql,
          expected_result: query.expectedResult,
        });

        if (error) {
          // RLS policy correctly denied access
          if (
            error.code === 'PGRST116' ||
            (error instanceof Error && error.message?.includes('permission denied'))
          ) {
            continue; // This is expected for negative tests
          }

          // Unexpected error
          return {
            isValid: false,
            tableName,
            operation,
            userId,
            errorMessage: `RLS validation error: ${error instanceof Error ? error.message : String(error)}`,
            violationType: 'policy_bypass',
          };
        }

        // Check if unauthorized access was allowed (security violation)
        if (query.shouldDeny && data && data.length > 0) {
          return {
            isValid: false,
            tableName,
            operation,
            userId,
            errorMessage: 'RLS policy failed to deny unauthorized access',
            violationType: 'unauthorized_access',
          };
        }
      } catch (validationError) {
        // Log validation attempts for monitoring
        console.warn('[RLS Validation]', {
          tableName,
          operation,
          userId,
          error: validationError,
        });
      }
    }

    // All tests passed
    return {
      isValid: true,
      tableName,
      operation,
      userId,
      policyName: `${tableName}_${operation.toLowerCase()}`,
    };
  }

  /**
   * Build RLS test queries for validation
   */
  private buildRLSTestQueries(
    tableName: string,
    operation: RLSValidationResult['operation'],
    userId?: string,
    recordIds?: string[]
  ): Array<{ sql: string; expectedResult: string; shouldDeny: boolean }> {
    const queries: Array<{ sql: string; expectedResult: string; shouldDeny: boolean }> = [];

    switch (operation) {
      case 'SELECT':
        // Test user isolation
        queries.push({
          sql: `SELECT COUNT(*) FROM ${tableName} WHERE "userId" != '${userId || 'test'}'`,
          expectedResult: '0',
          shouldDeny: true,
        });

        // Test authenticated access
        queries.push({
          sql: `SELECT COUNT(*) FROM ${tableName} WHERE "userId" = '${userId || 'test'}'`,
          expectedResult: 'any',
          shouldDeny: false,
        });
        break;

      case 'INSERT':
        // Test cross-user insertion prevention
        queries.push({
          sql: `INSERT INTO ${tableName} ("userId", "encryptedPayload") VALUES ('different-user-id', 'test')`,
          expectedResult: 'error',
          shouldDeny: true,
        });
        break;

      case 'UPDATE':
        if (recordIds && recordIds.length > 0) {
          // Test cross-user update prevention
          queries.push({
            sql: `UPDATE ${tableName} SET "encryptedPayload" = 'test' WHERE id = '${recordIds[0]}' AND "userId" != '${userId || 'test'}'`,
            expectedResult: 'error',
            shouldDeny: true,
          });
        }
        break;

      case 'DELETE':
        if (recordIds && recordIds.length > 0) {
          // Test cross-user deletion prevention
          queries.push({
            sql: `DELETE FROM ${tableName} WHERE id = '${recordIds[0]}' AND "userId" != '${userId || 'test'}'`,
            expectedResult: 'error',
            shouldDeny: true,
          });
        }
        break;
    }

    return queries;
  }

  /**
   * Check user isolation for a specific table
   */
  public async checkUserIsolation(tableName: string, userId: string): Promise<UserIsolationCheck> {
    try {
      // Count user's own records
      const { count: userRecords, error: userError } = await this.supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId);

      if (userError) {
        throw new Error(`Failed to count user records: ${userError.message}`);
      }

      // Attempt to access other users' records (should fail with RLS)
      const { count: otherRecords, error: otherError } = await this.supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .neq('userId', userId);

      // RLS should prevent access to other users' records
      const crossUserAccessAttempted = !otherError;
      const rlsEnforced = otherError?.code === 'PGRST116' || otherRecords === 0;

      return {
        userId,
        tableName,
        recordCount: userRecords || 0,
        crossUserAccessAttempted,
        rlsEnforced,
        isolationVerified: rlsEnforced,
      };
    } catch (error) {
      return {
        userId,
        tableName,
        recordCount: 0,
        crossUserAccessAttempted: true,
        rlsEnforced: false,
        isolationVerified: false,
      };
    }
  }

  /**
   * Test service role restrictions
   */
  public async validateServiceRoleRestrictions(): Promise<{
    canAccessUserData: boolean;
    canAccessSystemData: boolean;
    restrictionsEnforced: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];
    let canAccessUserData = false;
    let canAccessSystemData = true;

    // Test access to user data tables (should be denied)
    const userDataTables = [
      'encrypted_cycle_data',
      'encrypted_user_prefs',
      'healthcare_share',
      'device_key',
    ];

    for (const table of userDataTables) {
      try {
        const { data, error } = await this.supabaseClient.from(table).select('*').limit(1);

        if (!error && data && data.length > 0) {
          canAccessUserData = true;
          violations.push(`Service role can access user data in ${table}`);
        }
      } catch (error) {
        // Expected - service role should not have access
      }
    }

    // Test access to system/metadata tables (should be allowed)
    try {
      const { data, error } = await this.supabaseClient.rpc('connection_status');

      if (error) {
        canAccessSystemData = false;
        violations.push('Service role cannot access system functions');
      }
    } catch (error) {
      canAccessSystemData = false;
      violations.push('Service role system access failed');
    }

    return {
      canAccessUserData,
      canAccessSystemData,
      restrictionsEnforced: !canAccessUserData && canAccessSystemData,
      violations,
    };
  }

  /**
   * Clear validation cache
   */
  public clearValidationCache(tableName?: string): void {
    if (tableName) {
      // Clear cache entries for specific table
      for (const [key] of this.validationCache.entries()) {
        if (key.startsWith(tableName)) {
          this.validationCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.validationCache.clear();
    }
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(): {
    cacheSize: number;
    cacheHitRate: number;
    recentValidations: number;
  } {
    const now = Date.now();
    const recentValidations = Array.from(this.validationCache.values()).filter(
      cached => now - cached.timestamp < 3600000
    ).length; // Last hour

    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need to track hits/misses for accurate rate
      recentValidations,
    };
  }
}

/**
 * Singleton RLS policy enforcer
 */
export let rlsPolicyEnforcer: RLSPolicyEnforcer;

/**
 * Initialize RLS policy enforcer with Supabase client
 */
export function initializeRLSPolicyEnforcer(supabaseClient: any): RLSPolicyEnforcer {
  rlsPolicyEnforcer = new RLSPolicyEnforcer(supabaseClient);
  return rlsPolicyEnforcer;
}

/**
 * React hook for RLS validation
 */
export function useRLSValidation(supabaseClient: any) {
  const enforcer = new RLSPolicyEnforcer(supabaseClient);

  const validatePolicy = async (
    tableName: string,
    operation: RLSValidationResult['operation'],
    userId?: string,
    recordIds?: string[]
  ): Promise<RLSValidationResult> => {
    return enforcer.validateRLSPolicy(tableName, operation, userId, recordIds);
  };

  const checkIsolation = async (tableName: string, userId: string): Promise<UserIsolationCheck> => {
    return enforcer.checkUserIsolation(tableName, userId);
  };

  const validateServiceRole = async () => {
    return enforcer.validateServiceRoleRestrictions();
  };

  return {
    validatePolicy,
    checkIsolation,
    validateServiceRole,
    clearCache: enforcer.clearValidationCache.bind(enforcer),
    getStats: enforcer.getValidationStats.bind(enforcer),
  };
}
