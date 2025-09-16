/**
 * Sync Progress Tracking Service
 *
 * Provides detailed progress monitoring for synchronization operations,
 * especially for large data transfers with real-time updates and
 * performance metrics.
 *
 * Features:
 * - Real-time progress tracking for sync operations
 * - Large data transfer monitoring with chunking support
 * - Performance metrics and speed calculations
 * - ETA estimation and bandwidth monitoring
 * - Pause/resume capability for long transfers
 */

import { EventEmitter } from 'events';
import { SyncProgress, SyncProgressListener, SyncOperationResult, NetworkCondition } from './types';

export interface ProgressSession {
  readonly sessionId: string;
  readonly deviceId: string;
  readonly deviceName: string;
  readonly startTime: Date;
  readonly totalSize: number; // bytes
  readonly totalOperations: number;
  readonly priority: 'high' | 'medium' | 'low';
  readonly canPause: boolean;
  readonly transferType: 'upload' | 'download' | 'bidirectional';
}

export interface TransferChunk {
  readonly chunkId: string;
  readonly sequenceNumber: number;
  readonly size: number; // bytes
  readonly checksum: string;
  readonly encryptedData: ArrayBuffer;
  readonly isLast: boolean;
}

export interface ProgressMetrics {
  readonly sessionId: string;
  readonly bytesPerSecond: number;
  readonly averageSpeed: number; // over last 30 seconds
  readonly peakSpeed: number;
  readonly timeElapsed: number; // milliseconds
  readonly estimatedTimeRemaining: number; // milliseconds
  readonly efficiency: number; // 0-100, based on network conditions
  readonly retryCount: number;
  readonly pausedDuration: number; // milliseconds
}

export interface ProgressUpdate {
  readonly sessionId: string;
  readonly timestamp: Date;
  readonly completedOperations: number;
  readonly bytesTransferred: number;
  readonly currentOperation: string;
  readonly currentChunk?: number;
  readonly totalChunks?: number;
  readonly speed: number; // bytes per second
  readonly networkCondition: NetworkCondition;
}

export class SyncProgressTracker extends EventEmitter {
  private activeSessions: Map<string, ProgressSession> = new Map();
  private sessionProgress: Map<string, SyncProgress> = new Map();
  private sessionMetrics: Map<string, ProgressMetrics> = new Map();
  private progressHistory: Map<string, ProgressUpdate[]> = new Map();
  private pausedSessions: Set<string> = new Set();
  private listeners: Set<SyncProgressListener> = new Set();

  constructor() {
    super();
  }

  /**
   * Start tracking progress for a new sync session
   */
  public startProgressTracking(session: ProgressSession): void {
    this.activeSessions.set(session.sessionId, session);

    const initialProgress: SyncProgress = {
      sessionId: session.sessionId,
      totalOperations: session.totalOperations,
      completedOperations: 0,
      currentOperation: 'Initializing sync...',
      operationType: 'upload',
      estimatedTimeRemaining: 0,
      dataTransferred: 0,
      totalDataSize: session.totalSize,
      currentFileIndex: 0,
      totalFiles: session.totalOperations,
      speed: 0,
    };

    this.sessionProgress.set(session.sessionId, initialProgress);

    const initialMetrics: ProgressMetrics = {
      sessionId: session.sessionId,
      bytesPerSecond: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      timeElapsed: 0,
      estimatedTimeRemaining: 0,
      efficiency: 100,
      retryCount: 0,
      pausedDuration: 0,
    };

    this.sessionMetrics.set(session.sessionId, initialMetrics);
    this.progressHistory.set(session.sessionId, []);

    this.emit('session_started', session);
  }

  /**
   * Update progress for an active session
   */
  public updateProgress(
    sessionId: string,
    update: Partial<SyncProgress>,
    networkCondition: NetworkCondition
  ): void {
    const currentProgress = this.sessionProgress.get(sessionId);
    const session = this.activeSessions.get(sessionId);

    if (!currentProgress || !session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (this.pausedSessions.has(sessionId)) {
      return; // Don't update progress for paused sessions
    }

    // Calculate updated progress
    const updatedProgress: SyncProgress = {
      ...currentProgress,
      ...update,
      speed: this.calculateCurrentSpeed(
        sessionId,
        update.dataTransferred || currentProgress.dataTransferred
      ),
    };

    // Update estimated time remaining
    if (updatedProgress.dataTransferred > 0 && updatedProgress.speed > 0) {
      const remainingBytes = updatedProgress.totalDataSize - updatedProgress.dataTransferred;
      updatedProgress.estimatedTimeRemaining = Math.round(
        (remainingBytes / updatedProgress.speed) * 1000
      );
    }

    this.sessionProgress.set(sessionId, updatedProgress);

    // Update metrics
    this.updateMetrics(sessionId, updatedProgress, networkCondition);

    // Record progress history
    this.recordProgressUpdate(sessionId, updatedProgress, networkCondition);

    // Notify listeners
    this.notifyProgressListeners(updatedProgress);

    this.emit('progress_updated', sessionId, updatedProgress);
  }

  /**
   * Report chunk transfer completion
   */
  public reportChunkTransfer(
    sessionId: string,
    chunk: TransferChunk,
    transferTime: number // milliseconds
  ): void {
    const currentProgress = this.sessionProgress.get(sessionId);
    if (!currentProgress) return;

    const speed = (chunk.size / transferTime) * 1000; // bytes per second

    this.updateProgress(
      sessionId,
      {
        dataTransferred: currentProgress.dataTransferred + chunk.size,
        currentOperation: `Transferring chunk ${chunk.sequenceNumber}...`,
        speed,
      },
      this.getLastNetworkCondition(sessionId)
    );

    this.emit('chunk_transferred', sessionId, chunk, transferTime);
  }

  /**
   * Report operation completion (file, record, etc.)
   */
  public reportOperationCompletion(
    sessionId: string,
    operationName: string,
    bytesProcessed: number
  ): void {
    const currentProgress = this.sessionProgress.get(sessionId);
    if (!currentProgress) return;

    this.updateProgress(
      sessionId,
      {
        completedOperations: currentProgress.completedOperations + 1,
        currentFileIndex: currentProgress.currentFileIndex + 1,
        dataTransferred: currentProgress.dataTransferred + bytesProcessed,
        currentOperation: `Completed: ${operationName}`,
      },
      this.getLastNetworkCondition(sessionId)
    );

    this.emit('operation_completed', sessionId, operationName, bytesProcessed);
  }

  /**
   * Pause sync session
   */
  public pauseSession(sessionId: string): void {
    if (!this.activeSessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.pausedSessions.add(sessionId);

    const currentProgress = this.sessionProgress.get(sessionId);
    if (currentProgress) {
      this.updateProgress(
        sessionId,
        {
          currentOperation: 'Sync paused by user',
          speed: 0,
        },
        this.getLastNetworkCondition(sessionId)
      );
    }

    this.emit('session_paused', sessionId);
  }

  /**
   * Resume paused sync session
   */
  public resumeSession(sessionId: string): void {
    if (!this.pausedSessions.has(sessionId)) {
      return; // Session is not paused
    }

    this.pausedSessions.delete(sessionId);

    const currentProgress = this.sessionProgress.get(sessionId);
    if (currentProgress) {
      this.updateProgress(
        sessionId,
        {
          currentOperation: 'Resuming sync...',
        },
        this.getLastNetworkCondition(sessionId)
      );
    }

    this.emit('session_resumed', sessionId);
  }

  /**
   * Cancel sync session
   */
  public cancelSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.pausedSessions.delete(sessionId);
    this.activeSessions.delete(sessionId);

    const currentProgress = this.sessionProgress.get(sessionId);
    if (currentProgress) {
      this.updateProgress(
        sessionId,
        {
          currentOperation: 'Sync cancelled',
        },
        this.getLastNetworkCondition(sessionId)
      );
    }

    this.emit('session_cancelled', sessionId);

    // Clean up session data after a delay
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, 30000); // 30 seconds
  }

  /**
   * Complete sync session
   */
  public completeSession(sessionId: string, result: SyncOperationResult): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this.pausedSessions.delete(sessionId);
    this.activeSessions.delete(sessionId);

    const currentProgress = this.sessionProgress.get(sessionId);
    if (currentProgress) {
      const completedProgress: SyncProgress = {
        ...currentProgress,
        completedOperations: currentProgress.totalOperations,
        currentFileIndex: currentProgress.totalFiles,
        estimatedTimeRemaining: 0,
        currentOperation: result.success ? 'Sync completed successfully' : 'Sync failed',
        speed: 0,
      };

      this.sessionProgress.set(sessionId, completedProgress);
      this.notifyProgressListeners(completedProgress);
    }

    this.emit('session_completed', sessionId, result);

    // Clean up session data after a delay
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, 60000); // 1 minute
  }

  /**
   * Get progress for specific session
   */
  public getSessionProgress(sessionId: string): SyncProgress | null {
    return this.sessionProgress.get(sessionId) || null;
  }

  /**
   * Get metrics for specific session
   */
  public getSessionMetrics(sessionId: string): ProgressMetrics | null {
    return this.sessionMetrics.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  public getActiveSessions(): ProgressSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get progress history for session
   */
  public getProgressHistory(sessionId: string): ProgressUpdate[] {
    return this.progressHistory.get(sessionId) || [];
  }

  /**
   * Check if session is paused
   */
  public isSessionPaused(sessionId: string): boolean {
    return this.pausedSessions.has(sessionId);
  }

  /**
   * Register progress listener
   */
  public addProgressListener(listener: SyncProgressListener): void {
    this.listeners.add(listener);
  }

  /**
   * Unregister progress listener
   */
  public removeProgressListener(listener: SyncProgressListener): void {
    this.listeners.delete(listener);
  }

  // Private methods

  private calculateCurrentSpeed(sessionId: string, currentBytesTransferred: number): number {
    const session = this.activeSessions.get(sessionId);
    if (!session) return 0;

    const timeElapsed = Date.now() - session.startTime.getTime();
    if (timeElapsed === 0) return 0;

    return (currentBytesTransferred / timeElapsed) * 1000; // bytes per second
  }

  private updateMetrics(
    sessionId: string,
    progress: SyncProgress,
    networkCondition: NetworkCondition
  ): void {
    const session = this.activeSessions.get(sessionId);
    const currentMetrics = this.sessionMetrics.get(sessionId);

    if (!session || !currentMetrics) return;

    const timeElapsed = Date.now() - session.startTime.getTime();
    const pausedDuration = this.pausedSessions.has(sessionId)
      ? currentMetrics.pausedDuration + 1000
      : currentMetrics.pausedDuration; // Add 1 second if currently paused

    const averageSpeed = this.calculateAverageSpeed(sessionId);
    const efficiency = this.calculateEfficiency(progress.speed, networkCondition);

    const updatedMetrics: ProgressMetrics = {
      ...currentMetrics,
      bytesPerSecond: progress.speed,
      averageSpeed,
      peakSpeed: Math.max(currentMetrics.peakSpeed, progress.speed),
      timeElapsed,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      efficiency,
      pausedDuration,
    };

    this.sessionMetrics.set(sessionId, updatedMetrics);
  }

  private calculateAverageSpeed(sessionId: string): number {
    const history = this.progressHistory.get(sessionId) || [];
    if (history.length === 0) return 0;

    // Calculate average speed over last 30 seconds
    const thirtySecondsAgo = Date.now() - 30000;
    const recentUpdates = history.filter(update => update.timestamp.getTime() > thirtySecondsAgo);

    if (recentUpdates.length === 0) return 0;

    const totalSpeed = recentUpdates.reduce((sum, update) => sum + update.speed, 0);
    return totalSpeed / recentUpdates.length;
  }

  private calculateEfficiency(currentSpeed: number, networkCondition: NetworkCondition): number {
    if (networkCondition.bandwidth === 0) return 0;

    // Calculate theoretical maximum speed based on network bandwidth
    const maxTheoreticalSpeed = (networkCondition.bandwidth * 1024 * 1024) / 8; // Convert Mbps to bytes/sec
    const efficiency = (currentSpeed / maxTheoreticalSpeed) * 100;

    return Math.min(100, Math.max(0, efficiency));
  }

  private recordProgressUpdate(
    sessionId: string,
    progress: SyncProgress,
    networkCondition: NetworkCondition
  ): void {
    const history = this.progressHistory.get(sessionId) || [];

    const update: ProgressUpdate = {
      sessionId,
      timestamp: new Date(),
      completedOperations: progress.completedOperations,
      bytesTransferred: progress.dataTransferred,
      currentOperation: progress.currentOperation,
      currentChunk: progress.currentFileIndex,
      totalChunks: progress.totalFiles,
      speed: progress.speed,
      networkCondition,
    };

    history.push(update);

    // Keep only last 100 updates to prevent memory bloat
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    this.progressHistory.set(sessionId, history);
  }

  private getLastNetworkCondition(sessionId: string): NetworkCondition {
    const history = this.progressHistory.get(sessionId) || [];
    const lastUpdate = history[history.length - 1];

    return (
      lastUpdate?.networkCondition || {
        type: 'wifi',
        quality: 'good',
        bandwidth: 50,
        latency: 25,
        isMetered: false,
        isReachable: true,
        lastChecked: new Date(),
      }
    );
  }

  private notifyProgressListeners(progress: SyncProgress): void {
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error notifying progress listener:', error);
      }
    }
  }

  private cleanupSession(sessionId: string): void {
    this.sessionProgress.delete(sessionId);
    this.sessionMetrics.delete(sessionId);
    this.progressHistory.delete(sessionId);
    this.pausedSessions.delete(sessionId);

    this.emit('session_cleaned_up', sessionId);
  }

  /**
   * Cleanup all resources
   */
  public dispose(): void {
    // Cancel all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.cancelSession(sessionId);
    }

    this.activeSessions.clear();
    this.sessionProgress.clear();
    this.sessionMetrics.clear();
    this.progressHistory.clear();
    this.pausedSessions.clear();
    this.listeners.clear();
    this.removeAllListeners();
  }
}
