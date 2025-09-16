/**
 * Sync Retry Manager with Exponential Backoff
 *
 * Intelligent retry mechanism for synchronization operations with
 * exponential backoff, jitter, circuit breaker patterns, and
 * adaptive retry strategies based on error types and network conditions.
 *
 * Features:
 * - Exponential backoff with configurable parameters
 * - Jitter to prevent thundering herd problems
 * - Circuit breaker pattern for failing services
 * - Adaptive retry strategies based on error types
 * - Network-aware retry scheduling
 * - Retry budget management to prevent resource exhaustion
 */

import { EventEmitter } from 'events';
import { RetryConfig, SyncErrorDetails, NetworkCondition, SyncOperationResult } from './types';

export interface RetryAttempt {
  readonly attemptNumber: number;
  readonly timestamp: Date;
  readonly delay: number; // milliseconds
  readonly error?: SyncErrorDetails;
  readonly networkCondition: NetworkCondition;
  readonly success: boolean;
}

export interface RetryContext {
  readonly operationId: string;
  readonly operationType: 'sync' | 'discovery' | 'handshake' | 'transfer' | 'verification';
  readonly deviceId: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffFactor: number;
  readonly jitterFactor: number;
  readonly retryableErrors: string[];
  readonly circuitBreakerEnabled: boolean;
}

export interface RetrySession {
  readonly sessionId: string;
  readonly context: RetryContext;
  readonly attempts: RetryAttempt[];
  readonly isActive: boolean;
  readonly nextRetryTime?: Date;
  readonly totalDelay: number; // cumulative delay time
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly finalResult?: SyncOperationResult;
}

export interface CircuitBreakerState {
  readonly deviceId: string;
  readonly operationType: string;
  readonly state: 'closed' | 'open' | 'half-open';
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime?: Date;
  readonly lastSuccessTime?: Date;
  readonly openUntil?: Date;
}

export interface RetryBudget {
  readonly deviceId: string;
  readonly windowStart: Date;
  readonly windowDuration: number; // milliseconds
  readonly maxRetries: number;
  readonly usedRetries: number;
  readonly resetTime: Date;
}

export type RetryOperation = () => Promise<SyncOperationResult>;

export class SyncRetryManager extends EventEmitter {
  private retrySessions: Map<string, RetrySession> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryBudgets: Map<string, RetryBudget> = new Map();
  private scheduledRetries: Map<string, NodeJS.Timeout> = new Map();
  private globalConfig: RetryConfig;

  constructor(globalConfig: RetryConfig) {
    super();
    this.globalConfig = globalConfig;
    this.startCleanupTimer();
  }

  /**
   * Execute operation with retry logic
   */
  public async executeWithRetry(
    context: RetryContext,
    operation: RetryOperation,
    networkCondition: NetworkCondition
  ): Promise<SyncOperationResult> {
    const sessionId = this.generateSessionId(context);

    // Check circuit breaker
    if (this.isCircuitOpen(context.deviceId, context.operationType)) {
      throw new Error(
        `Circuit breaker open for ${context.operationType} on device ${context.deviceId}`
      );
    }

    // Check retry budget
    if (!this.hasRetryBudget(context.deviceId)) {
      throw new Error(`Retry budget exhausted for device ${context.deviceId}`);
    }

    // Create retry session
    const session = this.createRetrySession(sessionId, context);
    this.retrySessions.set(sessionId, session);

    try {
      const result = await this.performOperation(session, operation, networkCondition);
      this.completeSession(sessionId, result);
      return result;
    } catch (error) {
      const failureResult: SyncOperationResult = {
        success: false,
        error: error as SyncErrorDetails,
        syncedRecords: 0,
        conflicts: 0,
        duration: Date.now() - session.startTime.getTime(),
        bytesTransferred: 0,
        retryAttempts: session.attempts.length,
      };

      this.completeSession(sessionId, failureResult);
      throw error;
    }
  }

  /**
   * Schedule a retry for later execution
   */
  public scheduleRetry(
    context: RetryContext,
    operation: RetryOperation,
    networkCondition: NetworkCondition,
    delay: number
  ): string {
    const sessionId = this.generateSessionId(context);
    const session = this.createRetrySession(sessionId, context);

    session.nextRetryTime = new Date(Date.now() + delay);
    this.retrySessions.set(sessionId, session);

    const timeoutId = setTimeout(async () => {
      try {
        await this.executeWithRetry(context, operation, networkCondition);
      } catch (error) {
        console.error(`Scheduled retry failed for session ${sessionId}:`, error);
      } finally {
        this.scheduledRetries.delete(sessionId);
      }
    }, delay);

    this.scheduledRetries.set(sessionId, timeoutId);

    this.emit('retry_scheduled', sessionId, delay);
    return sessionId;
  }

  /**
   * Cancel scheduled retry
   */
  public cancelRetry(sessionId: string): boolean {
    const timeoutId = this.scheduledRetries.get(sessionId);
    if (!timeoutId) return false;

    clearTimeout(timeoutId);
    this.scheduledRetries.delete(sessionId);

    const session = this.retrySessions.get(sessionId);
    if (session) {
      const cancelledSession: RetrySession = {
        ...session,
        isActive: false,
        endTime: new Date(),
      };
      this.retrySessions.set(sessionId, cancelledSession);
    }

    this.emit('retry_cancelled', sessionId);
    return true;
  }

  /**
   * Get retry session information
   */
  public getRetrySession(sessionId: string): RetrySession | null {
    return this.retrySessions.get(sessionId) || null;
  }

  /**
   * Get all active retry sessions
   */
  public getActiveSessions(): RetrySession[] {
    return Array.from(this.retrySessions.values()).filter(session => session.isActive);
  }

  /**
   * Get circuit breaker state
   */
  public getCircuitBreakerState(
    deviceId: string,
    operationType: string
  ): CircuitBreakerState | null {
    const key = `${deviceId}:${operationType}`;
    return this.circuitBreakers.get(key) || null;
  }

  /**
   * Reset circuit breaker
   */
  public resetCircuitBreaker(deviceId: string, operationType: string): void {
    const key = `${deviceId}:${operationType}`;
    const currentState = this.circuitBreakers.get(key);

    if (currentState) {
      const resetState: CircuitBreakerState = {
        ...currentState,
        state: 'closed',
        failureCount: 0,
        lastSuccessTime: new Date(),
      };
      this.circuitBreakers.set(key, resetState);
      this.emit('circuit_breaker_reset', deviceId, operationType);
    }
  }

  /**
   * Get retry budget for device
   */
  public getRetryBudget(deviceId: string): RetryBudget | null {
    return this.retryBudgets.get(deviceId) || null;
  }

  /**
   * Reset retry budget for device
   */
  public resetRetryBudget(deviceId: string): void {
    const budget = this.createRetryBudget(deviceId);
    this.retryBudgets.set(deviceId, budget);
    this.emit('retry_budget_reset', deviceId);
  }

  // Private methods

  private async performOperation(
    session: RetrySession,
    operation: RetryOperation,
    networkCondition: NetworkCondition
  ): Promise<SyncOperationResult> {
    const maxAttempts = session.context.maxRetries + 1; // +1 for initial attempt

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStartTime = Date.now();

      try {
        // Record attempt start
        const attemptRecord: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: new Date(),
          delay: attempt === 1 ? 0 : this.calculateDelay(session, attempt - 1),
          networkCondition,
          success: false,
        };

        // Update session with attempt
        const updatedSession = {
          ...session,
          attempts: [...session.attempts, attemptRecord],
        };
        this.retrySessions.set(session.sessionId, updatedSession);

        // Wait for delay if this is a retry
        if (attempt > 1) {
          await this.delay(attemptRecord.delay);
        }

        // Check if we still have retry budget
        if (!this.hasRetryBudget(session.context.deviceId)) {
          throw new Error('Retry budget exhausted');
        }

        // Consume retry budget
        if (attempt > 1) {
          this.consumeRetryBudget(session.context.deviceId);
        }

        // Perform the operation
        const result = await operation();

        // Record successful attempt
        const successfulAttempt: RetryAttempt = {
          ...attemptRecord,
          success: true,
        };

        const finalSession = {
          ...updatedSession,
          attempts: [...updatedSession.attempts.slice(0, -1), successfulAttempt],
        };
        this.retrySessions.set(session.sessionId, finalSession);

        // Update circuit breaker on success
        this.recordSuccess(session.context.deviceId, session.context.operationType);

        this.emit('operation_succeeded', session.sessionId, attempt, result);
        return result;
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        const syncError = error as SyncErrorDetails;

        // Record failed attempt
        const failedAttempt: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: new Date(),
          delay: attempt === 1 ? 0 : this.calculateDelay(session, attempt - 1),
          error: syncError,
          networkCondition,
          success: false,
        };

        const updatedSession = {
          ...session,
          attempts: [...session.attempts.slice(0, -1), failedAttempt],
        };
        this.retrySessions.set(session.sessionId, updatedSession);

        // Update circuit breaker on failure
        this.recordFailure(session.context.deviceId, session.context.operationType);

        this.emit('operation_failed', session.sessionId, attempt, syncError);

        // Check if error is retryable
        if (!this.isRetryableError(syncError, session.context)) {
          throw error;
        }

        // Check if we should continue retrying
        if (attempt >= maxAttempts) {
          throw error;
        }

        // Check if circuit breaker is now open
        if (this.isCircuitOpen(session.context.deviceId, session.context.operationType)) {
          throw new Error('Circuit breaker opened due to repeated failures');
        }

        // Check network condition for adaptive retry
        if (!this.shouldRetryBasedOnNetwork(networkCondition)) {
          throw new Error('Network conditions unfavorable for retry');
        }
      }
    }

    throw new Error('Maximum retry attempts reached');
  }

  private calculateDelay(session: RetrySession, attemptNumber: number): number {
    const { baseDelay, maxDelay, backoffFactor, jitterFactor } = session.context;

    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(backoffFactor, attemptNumber - 1);

    // Apply max delay limit
    delay = Math.min(delay, maxDelay);

    // Apply jitter to prevent thundering herd
    const jitter = delay * jitterFactor * (Math.random() - 0.5);
    delay = Math.max(0, delay + jitter);

    return Math.round(delay);
  }

  private isRetryableError(error: SyncErrorDetails, context: RetryContext): boolean {
    // Check if error code is in retryable list
    if (context.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check error category for general retryability
    switch (error.category) {
      case 'network':
        return true; // Network errors are generally retryable
      case 'storage':
        return !error.code.includes('FULL'); // Storage errors except disk full
      case 'permission':
        return false; // Permission errors are not retryable
      case 'crypto':
        return error.code.includes('TIMEOUT'); // Only crypto timeouts are retryable
      default:
        return error.recoverable;
    }
  }

  private shouldRetryBasedOnNetwork(networkCondition: NetworkCondition): boolean {
    // Don't retry if offline
    if (networkCondition.type === 'offline') {
      return false;
    }

    // Don't retry if network quality is very poor
    if (networkCondition.quality === 'unusable') {
      return false;
    }

    // Consider bandwidth and latency for retry decision
    if (networkCondition.bandwidth < 1 && networkCondition.latency > 5000) {
      return false; // Very slow connection
    }

    return true;
  }

  private createRetrySession(sessionId: string, context: RetryContext): RetrySession {
    return {
      sessionId,
      context,
      attempts: [],
      isActive: true,
      totalDelay: 0,
      startTime: new Date(),
    };
  }

  private completeSession(sessionId: string, result: SyncOperationResult): void {
    const session = this.retrySessions.get(sessionId);
    if (!session) return;

    const completedSession: RetrySession = {
      ...session,
      isActive: false,
      endTime: new Date(),
      finalResult: result,
    };

    this.retrySessions.set(sessionId, completedSession);
    this.emit('session_completed', sessionId, result);
  }

  private generateSessionId(context: RetryContext): string {
    const timestamp = Date.now();
    const deviceHash = context.deviceId.slice(-4);
    return `retry_${context.operationType}_${deviceHash}_${timestamp}`;
  }

  private isCircuitOpen(deviceId: string, operationType: string): boolean {
    const key = `${deviceId}:${operationType}`;
    const state = this.circuitBreakers.get(key);

    if (!state) {
      // Initialize circuit breaker if not exists
      this.initializeCircuitBreaker(deviceId, operationType);
      return false;
    }

    if (state.state === 'open') {
      // Check if circuit should transition to half-open
      if (state.openUntil && Date.now() > state.openUntil.getTime()) {
        this.transitionToHalfOpen(deviceId, operationType);
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(deviceId: string, operationType: string): void {
    const key = `${deviceId}:${operationType}`;
    const state = this.circuitBreakers.get(key);

    if (!state) {
      this.initializeCircuitBreaker(deviceId, operationType);
      return;
    }

    const updatedState: CircuitBreakerState = {
      ...state,
      state: 'closed',
      successCount: state.successCount + 1,
      failureCount: 0,
      lastSuccessTime: new Date(),
    };

    this.circuitBreakers.set(key, updatedState);
  }

  private recordFailure(deviceId: string, operationType: string): void {
    const key = `${deviceId}:${operationType}`;
    const state = this.circuitBreakers.get(key);

    if (!state) {
      this.initializeCircuitBreaker(deviceId, operationType);
      return;
    }

    const newFailureCount = state.failureCount + 1;
    const shouldOpen = newFailureCount >= 5; // Open after 5 consecutive failures

    const updatedState: CircuitBreakerState = {
      ...state,
      failureCount: newFailureCount,
      lastFailureTime: new Date(),
      state: shouldOpen ? 'open' : state.state,
      openUntil: shouldOpen ? new Date(Date.now() + 60000) : state.openUntil, // Open for 1 minute
    };

    this.circuitBreakers.set(key, updatedState);

    if (shouldOpen) {
      this.emit('circuit_breaker_opened', deviceId, operationType);
    }
  }

  private initializeCircuitBreaker(deviceId: string, operationType: string): void {
    const key = `${deviceId}:${operationType}`;
    const initialState: CircuitBreakerState = {
      deviceId,
      operationType,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
    };

    this.circuitBreakers.set(key, initialState);
  }

  private transitionToHalfOpen(deviceId: string, operationType: string): void {
    const key = `${deviceId}:${operationType}`;
    const state = this.circuitBreakers.get(key);

    if (state) {
      const halfOpenState: CircuitBreakerState = {
        ...state,
        state: 'half-open',
      };
      this.circuitBreakers.set(key, halfOpenState);
      this.emit('circuit_breaker_half_open', deviceId, operationType);
    }
  }

  private hasRetryBudget(deviceId: string): boolean {
    const budget = this.retryBudgets.get(deviceId);

    if (!budget) {
      // Create initial budget
      this.retryBudgets.set(deviceId, this.createRetryBudget(deviceId));
      return true;
    }

    // Check if budget window has expired
    if (Date.now() > budget.resetTime.getTime()) {
      this.retryBudgets.set(deviceId, this.createRetryBudget(deviceId));
      return true;
    }

    return budget.usedRetries < budget.maxRetries;
  }

  private consumeRetryBudget(deviceId: string): void {
    const budget = this.retryBudgets.get(deviceId);
    if (!budget) return;

    const updatedBudget: RetryBudget = {
      ...budget,
      usedRetries: budget.usedRetries + 1,
    };

    this.retryBudgets.set(deviceId, updatedBudget);
  }

  private createRetryBudget(deviceId: string): RetryBudget {
    const windowDuration = 3600000; // 1 hour window
    const now = new Date();

    return {
      deviceId,
      windowStart: now,
      windowDuration,
      maxRetries: 20, // 20 retries per hour
      usedRetries: 0,
      resetTime: new Date(now.getTime() + windowDuration),
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startCleanupTimer(): void {
    // Clean up completed sessions every 10 minutes
    setInterval(() => {
      this.cleanupCompletedSessions();
    }, 600000);
  }

  private cleanupCompletedSessions(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago

    for (const [sessionId, session] of this.retrySessions) {
      if (!session.isActive && session.endTime && session.endTime.getTime() < cutoffTime) {
        this.retrySessions.delete(sessionId);
      }
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // Cancel all scheduled retries
    for (const timeoutId of this.scheduledRetries.values()) {
      clearTimeout(timeoutId);
    }

    this.retrySessions.clear();
    this.circuitBreakers.clear();
    this.retryBudgets.clear();
    this.scheduledRetries.clear();
    this.removeAllListeners();
  }
}
