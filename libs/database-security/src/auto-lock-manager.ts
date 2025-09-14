/**
 * Auto-lock Security Mechanism
 * Configurable idle timeout with database locking and re-authentication
 * Application state monitoring and secure lock status management
 * Author: Dev Agent (Story 2.1)
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { securityLogger, type SecurityEvent } from './security-logger';

/**
 * Auto-lock configuration settings
 */
export interface AutoLockConfig {
  enabled: boolean; // Enable/disable auto-lock
  idleTimeout: number; // Idle timeout in milliseconds
  backgroundTimeout: number; // Background timeout in milliseconds
  requireBiometric: boolean; // Require biometric for unlock
  requirePin: boolean; // Require PIN for unlock
  maxUnlockAttempts: number; // Max attempts before lockout
  lockoutDuration: number; // Lockout duration in milliseconds
  showLockIndicator: boolean; // Show lock status in UI
  enableNotifications: boolean; // Enable lock/unlock notifications
}

/**
 * Lock status information
 */
export interface LockStatus {
  isLocked: boolean; // Current lock state
  lockedAt?: number; // Timestamp when locked
  lockReason?: 'idle' | 'background' | 'manual' | 'security';
  timeRemaining?: number; // Time until auto-unlock (if applicable)
  requiresAuthentication: boolean; // Requires auth to unlock
  unlockAttempts: number; // Failed unlock attempts
  isInLockout: boolean; // Currently in lockout period
  lockoutEndsAt?: number; // When lockout period ends
}

/**
 * Authentication requirement for unlock
 */
export interface UnlockAuthConfig {
  requirePin: boolean;
  requireBiometric: boolean;
  allowFallback: boolean; // Allow fallback to PIN if biometric fails
  maxAttempts: number;
}

/**
 * Auto-lock event types
 */
export interface AutoLockEvent extends SecurityEvent {
  type: 'auto_lock' | 'manual_lock' | 'unlock_attempt' | 'unlock_success' | 'lockout_activated';
  metadata: {
    reason?: string;
    success?: boolean;
    attempts?: number;
    duration?: number;
  };
}

/**
 * Application state monitoring data
 */
interface AppStateData {
  currentState: AppStateStatus;
  lastActiveTime: number;
  lastBackgroundTime: number;
  stateHistory: Array<{
    state: AppStateStatus;
    timestamp: number;
  }>;
}

/**
 * Auto-lock Security Manager
 * Handles automatic database locking based on idle time and app state
 */
export class AutoLockManager {
  private config: AutoLockConfig;
  private lockStatus: LockStatus;
  private appStateData: AppStateData;
  private idleTimer?: NodeJS.Timeout;
  private backgroundTimer?: NodeJS.Timeout;
  private lockoutTimer?: NodeJS.Timeout;
  private lastActivityTime: number;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(initialConfig?: Partial<AutoLockConfig>) {
    this.config = {
      enabled: true,
      idleTimeout: 5 * 60 * 1000, // 5 minutes
      backgroundTimeout: 30 * 1000, // 30 seconds
      requireBiometric: true,
      requirePin: true,
      maxUnlockAttempts: 3,
      lockoutDuration: 5 * 60 * 1000, // 5 minutes
      showLockIndicator: true,
      enableNotifications: true,
      ...initialConfig,
    };

    this.lockStatus = {
      isLocked: false,
      requiresAuthentication: false,
      unlockAttempts: 0,
      isInLockout: false,
    };

    this.appStateData = {
      currentState: AppState.currentState,
      lastActiveTime: Date.now(),
      lastBackgroundTime: Date.now(),
      stateHistory: [],
    };

    this.lastActivityTime = Date.now();
  }

  /**
   * Initialize auto-lock manager
   */
  async initialize(): Promise<void> {
    try {
      // Load stored configuration
      await this.loadStoredConfig();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Start idle monitoring if enabled
      if (this.config.enabled) {
        this.startIdleMonitoring();
      }

      await securityLogger.logEvent({
        type: 'auto_lock_init',
        level: 'info',
        message: 'Auto-lock manager initialized',
        metadata: {
          enabled: this.config.enabled,
          idleTimeout: this.config.idleTimeout,
          backgroundTimeout: this.config.backgroundTimeout,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await securityLogger.logEvent({
        type: 'auto_lock_init_error',
        level: 'error',
        message: 'Failed to initialize auto-lock manager',
        metadata: { error: errorMessage },
      });
      throw error;
    }
  }

  /**
   * Update auto-lock configuration
   */
  async updateConfig(newConfig: Partial<AutoLockConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Store updated configuration
    await this.storeConfig();

    // Restart monitoring with new settings
    if (
      oldConfig.enabled !== this.config.enabled ||
      oldConfig.idleTimeout !== this.config.idleTimeout
    ) {
      this.stopIdleMonitoring();
      if (this.config.enabled) {
        this.startIdleMonitoring();
      }
    }

    await securityLogger.logEvent({
      type: 'auto_lock_config_updated',
      level: 'info',
      message: 'Auto-lock configuration updated',
      metadata: {
        changes: Object.keys(newConfig),
        enabled: this.config.enabled,
      },
    });

    this.emitEvent('config-updated', this.config);
  }

  /**
   * Get current lock status
   */
  getLockStatus(): LockStatus {
    return { ...this.lockStatus };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoLockConfig {
    return { ...this.config };
  }

  /**
   * Manually lock the database
   */
  async lock(reason: 'manual' | 'security' = 'manual'): Promise<void> {
    if (this.lockStatus.isLocked) {
      return;
    }

    const timestamp = Date.now();

    this.lockStatus = {
      isLocked: true,
      lockedAt: timestamp,
      lockReason: reason,
      requiresAuthentication: this.config.requirePin || this.config.requireBiometric,
      unlockAttempts: 0,
      isInLockout: false,
    };

    // Stop idle monitoring while locked
    this.stopIdleMonitoring();

    const lockEvent: AutoLockEvent = {
      type: reason === 'manual' ? 'manual_lock' : 'auto_lock',
      level: 'info',
      message: `Database locked (${reason})`,
      timestamp,
      metadata: { reason },
    };

    await securityLogger.logEvent(lockEvent);
    this.emitEvent('lock-changed', this.lockStatus);

    if (this.config.enableNotifications) {
      this.emitEvent('notification', {
        type: 'lock',
        message: 'Database has been locked for security',
        timestamp,
      });
    }
  }

  /**
   * Attempt to unlock the database
   */
  async unlock(credentials: {
    pin?: string;
    biometricSuccess?: boolean;
    deviceId: string;
  }): Promise<{ success: boolean; error?: string; lockoutRemaining?: number }> {
    const { pin, biometricSuccess, deviceId } = credentials;

    // Check if in lockout
    if (this.lockStatus.isInLockout) {
      const remaining = this.getRemainingLockoutTime();
      if (remaining > 0) {
        return {
          success: false,
          error: 'Account locked due to too many attempts',
          lockoutRemaining: remaining,
        };
      } else {
        // Lockout expired
        this.clearLockout();
      }
    }

    // Check authentication requirements
    const authValid = await this.validateUnlockCredentials(pin, biometricSuccess);

    if (!authValid.success) {
      // Increment failed attempts
      this.lockStatus.unlockAttempts++;

      // Check for lockout
      if (this.lockStatus.unlockAttempts >= this.config.maxUnlockAttempts) {
        await this.activateLockout();

        return {
          success: false,
          error: 'Too many failed attempts. Account locked.',
          lockoutRemaining: this.config.lockoutDuration,
        };
      }

      await securityLogger.logEvent({
        type: 'unlock_attempt',
        level: 'warning',
        message: 'Failed unlock attempt',
        metadata: {
          attempts: this.lockStatus.unlockAttempts,
          maxAttempts: this.config.maxUnlockAttempts,
          deviceId,
        },
      });

      return {
        success: false,
        error: authValid.error || 'Authentication failed',
      };
    }

    // Successful unlock
    await this.performUnlock();

    await securityLogger.logEvent({
      type: 'unlock_success',
      level: 'info',
      message: 'Database unlocked successfully',
      metadata: { deviceId },
    });

    return { success: true };
  }

  /**
   * Record user activity to reset idle timer
   */
  recordActivity(): void {
    if (!this.config.enabled || this.lockStatus.isLocked) {
      return;
    }

    this.lastActivityTime = Date.now();

    // Restart idle timer
    this.stopIdleMonitoring();
    this.startIdleMonitoring();
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopIdleMonitoring();
    this.stopBackgroundMonitoring();
    this.clearLockoutTimer();
    AppState.removeEventListener('change', this.handleAppStateChange);
    this.eventListeners.clear();
  }

  /**
   * Set up application state monitoring
   */
  private setupAppStateMonitoring(): void {
    // Listen for app state changes
    AppState.addEventListener('change', this.handleAppStateChange);

    // Initialize current state
    this.appStateData.currentState = AppState.currentState;
    this.appStateData.lastActiveTime = Date.now();
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const timestamp = Date.now();
    const previousState = this.appStateData.currentState;

    // Record state change
    this.appStateData.stateHistory.push({
      state: nextAppState,
      timestamp,
    });

    // Keep only last 10 state changes
    if (this.appStateData.stateHistory.length > 10) {
      this.appStateData.stateHistory = this.appStateData.stateHistory.slice(-10);
    }

    this.appStateData.currentState = nextAppState;

    if (nextAppState === 'active') {
      this.appStateData.lastActiveTime = timestamp;
      this.stopBackgroundMonitoring();

      // Resume idle monitoring if not locked
      if (this.config.enabled && !this.lockStatus.isLocked) {
        this.startIdleMonitoring();
      }
    } else if (nextAppState === 'background') {
      this.appStateData.lastBackgroundTime = timestamp;
      this.stopIdleMonitoring();

      // Start background timeout
      if (this.config.enabled && !this.lockStatus.isLocked) {
        this.startBackgroundMonitoring();
      }
    }

    this.emitEvent('app-state-changed', {
      previous: previousState,
      current: nextAppState,
      timestamp,
    });
  };

  /**
   * Start idle activity monitoring
   */
  private startIdleMonitoring(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.lock('idle');
    }, this.config.idleTimeout);
  }

  /**
   * Stop idle activity monitoring
   */
  private stopIdleMonitoring(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  /**
   * Start background timeout monitoring
   */
  private startBackgroundMonitoring(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
    }

    this.backgroundTimer = setTimeout(() => {
      this.lock('background');
    }, this.config.backgroundTimeout);
  }

  /**
   * Stop background timeout monitoring
   */
  private stopBackgroundMonitoring(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = undefined;
    }
  }

  /**
   * Validate unlock credentials
   */
  private async validateUnlockCredentials(
    pin?: string,
    biometricSuccess?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    let pinValid = false;
    let biometricValid = false;

    // Check PIN if required
    if (this.config.requirePin) {
      if (!pin) {
        return { success: false, error: 'PIN required' };
      }

      // Get stored PIN hash
      try {
        const storedHash = await SecureStore.getItemAsync('auto_lock_pin_hash');
        if (storedHash) {
          const pinHash = await this.hashPin(pin);
          pinValid = pinHash === storedHash;
        }
      } catch (error) {
        return { success: false, error: 'Failed to validate PIN' };
      }

      if (!pinValid) {
        return { success: false, error: 'Invalid PIN' };
      }
    } else {
      pinValid = true;
    }

    // Check biometric if required
    if (this.config.requireBiometric) {
      if (biometricSuccess === undefined) {
        return { success: false, error: 'Biometric authentication required' };
      }
      biometricValid = biometricSuccess;

      if (!biometricValid) {
        return { success: false, error: 'Biometric authentication failed' };
      }
    } else {
      biometricValid = true;
    }

    return { success: pinValid && biometricValid };
  }

  /**
   * Perform unlock operations
   */
  private async performUnlock(): Promise<void> {
    this.lockStatus = {
      isLocked: false,
      requiresAuthentication: false,
      unlockAttempts: 0,
      isInLockout: false,
    };

    // Resume idle monitoring
    if (this.config.enabled) {
      this.startIdleMonitoring();
    }

    this.emitEvent('lock-changed', this.lockStatus);

    if (this.config.enableNotifications) {
      this.emitEvent('notification', {
        type: 'unlock',
        message: 'Database unlocked successfully',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Activate lockout after max attempts
   */
  private async activateLockout(): Promise<void> {
    this.lockStatus.isInLockout = true;
    this.lockStatus.lockoutEndsAt = Date.now() + this.config.lockoutDuration;

    this.lockoutTimer = setTimeout(() => {
      this.clearLockout();
    }, this.config.lockoutDuration);

    await securityLogger.logEvent({
      type: 'lockout_activated',
      level: 'warning',
      message: 'Account locked due to too many failed unlock attempts',
      metadata: {
        duration: this.config.lockoutDuration,
        attempts: this.lockStatus.unlockAttempts,
      },
    });

    this.emitEvent('lockout-activated', {
      duration: this.config.lockoutDuration,
      endsAt: this.lockStatus.lockoutEndsAt,
    });
  }

  /**
   * Clear lockout status
   */
  private clearLockout(): void {
    this.lockStatus.isInLockout = false;
    this.lockStatus.lockoutEndsAt = undefined;
    this.lockStatus.unlockAttempts = 0;

    this.clearLockoutTimer();
    this.emitEvent('lockout-cleared', {});
  }

  /**
   * Clear lockout timer
   */
  private clearLockoutTimer(): void {
    if (this.lockoutTimer) {
      clearTimeout(this.lockoutTimer);
      this.lockoutTimer = undefined;
    }
  }

  /**
   * Get remaining lockout time
   */
  private getRemainingLockoutTime(): number {
    if (!this.lockStatus.isInLockout || !this.lockStatus.lockoutEndsAt) {
      return 0;
    }
    return Math.max(0, this.lockStatus.lockoutEndsAt - Date.now());
  }

  /**
   * Hash PIN for secure storage
   */
  private async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'auto_lock_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hashBuffer).toString('hex');
  }

  /**
   * Store configuration securely
   */
  private async storeConfig(): Promise<void> {
    try {
      const configJson = JSON.stringify(this.config);
      await SecureStore.setItemAsync('auto_lock_config', configJson);
    } catch (error) {
      console.error('[AutoLock] Failed to store config:', error);
    }
  }

  /**
   * Load stored configuration
   */
  private async loadStoredConfig(): Promise<void> {
    try {
      const configJson = await SecureStore.getItemAsync('auto_lock_config');
      if (configJson) {
        const storedConfig = JSON.parse(configJson);
        this.config = { ...this.config, ...storedConfig };
      }
    } catch (error) {
      console.warn('[AutoLock] Failed to load stored config:', error);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[AutoLock] Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
}

/**
 * React hook for auto-lock functionality
 */
export function useAutoLock() {
  const [lockStatus, setLockStatus] = React.useState<LockStatus>({
    isLocked: false,
    requiresAuthentication: false,
    unlockAttempts: 0,
    isInLockout: false,
  });

  const [config, setConfig] = React.useState<AutoLockConfig | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const managerRef = React.useRef<AutoLockManager | null>(null);

  React.useEffect(() => {
    const manager = new AutoLockManager();
    managerRef.current = manager;

    const initializeManager = async () => {
      try {
        await manager.initialize();
        setLockStatus(manager.getLockStatus());
        setConfig(manager.getConfig());
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    // Set up event listeners
    manager.addEventListener('lock-changed', setLockStatus);
    manager.addEventListener('config-updated', setConfig);

    initializeManager();

    return () => {
      manager.cleanup();
    };
  }, []);

  const recordActivity = React.useCallback(() => {
    managerRef.current?.recordActivity();
  }, []);

  const lock = React.useCallback(async (reason?: 'manual' | 'security') => {
    if (managerRef.current) {
      await managerRef.current.lock(reason);
    }
  }, []);

  const unlock = React.useCallback(
    async (credentials: { pin?: string; biometricSuccess?: boolean; deviceId: string }) => {
      if (managerRef.current) {
        return await managerRef.current.unlock(credentials);
      }
      return { success: false, error: 'Manager not initialized' };
    },
    []
  );

  const updateConfig = React.useCallback(async (newConfig: Partial<AutoLockConfig>) => {
    if (managerRef.current) {
      await managerRef.current.updateConfig(newConfig);
    }
  }, []);

  return {
    lockStatus,
    config,
    isInitialized,
    error,
    recordActivity,
    lock,
    unlock,
    updateConfig,
  };
}

/**
 * Global auto-lock manager instance
 */
export const autoLockManager = new AutoLockManager();

// React import for hook
import React from 'react';
