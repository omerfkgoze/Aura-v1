import { useState, useCallback, useEffect } from 'react';
import type {
  RecoveryPhrase,
  KeyBackup,
  RecoverySystemConfig,
  RecoveryValidationLevel,
  RecoveryAttempt,
  RecoveryInitiation,
  EmergencyRecovery,
  RecoveryStats,
  PasskeyRecoveryChallenge,
  PasskeyRecoveryResponse,
  RecoveryValidation,
  KeyRestoration,
  WordlistLanguage,
} from '@aura/shared-types';

// Import WASM crypto core for recovery operations
import {
  RecoverySystem,
  RecoveryPhrase as WasmRecoveryPhrase,
  KeyBackup as WasmKeyBackup,
  WordlistLanguage as WasmWordlistLanguage,
  RecoveryValidationLevel as WasmRecoveryValidationLevel,
} from '@aura/crypto-core';

interface UseRecoveryState {
  isInitialized: boolean;
  currentConfig: RecoverySystemConfig | null;
  backups: KeyBackup[];
  recoveryAttempts: Record<string, RecoveryAttempt>;
  stats: RecoveryStats | null;
  lastError: string | null;
  isLoading: boolean;
  activeRecovery: RecoveryInitiation | null;
  emergencyRecovery: EmergencyRecovery | null;
}

interface UseRecoveryActions {
  initialize: (config: RecoverySystemConfig) => Promise<void>;
  generateRecoveryPhrase: (
    entropyBits: number,
    language: WordlistLanguage
  ) => Promise<RecoveryPhrase>;
  validateRecoveryPhrase: (phrase: RecoveryPhrase) => boolean;
  createBackup: (phrase: RecoveryPhrase, passkeyChallenge: Uint8Array) => Promise<KeyBackup>;
  listBackups: () => Promise<KeyBackup[]>;
  removeBackup: (backupId: string) => Promise<void>;
  initiateRecovery: (
    backupId: string,
    phrase: RecoveryPhrase,
    passkeyResponse: Uint8Array
  ) => Promise<RecoveryInitiation>;
  completeRecovery: (
    recoveryToken: string,
    backupId: string,
    phrase: RecoveryPhrase
  ) => Promise<KeyRestoration>;
  initiateEmergencyRecovery: (
    backupId: string,
    phrase: RecoveryPhrase,
    emergencyCode: string,
    passkeyResponse: Uint8Array
  ) => Promise<EmergencyRecovery>;
  validateEmergencyDelay: (delayToken: string) => boolean;
  getRecoveryAttempts: (backupId: string) => RecoveryAttempt | null;
  resetAttemptCount: (backupId: string) => Promise<void>;
  getStats: () => RecoveryStats | null;
  refreshBackups: () => Promise<void>;
}

interface UseRecoveryResult extends UseRecoveryState, UseRecoveryActions {}

const INITIAL_STATE: UseRecoveryState = {
  isInitialized: false,
  currentConfig: null,
  backups: [],
  recoveryAttempts: {},
  stats: null,
  lastError: null,
  isLoading: false,
  activeRecovery: null,
  emergencyRecovery: null,
};

export function useRecovery(): UseRecoveryResult {
  const [state, setState] = useState<UseRecoveryState>(INITIAL_STATE);
  const [recoverySystem, setRecoverySystem] = useState<any>(null);

  // Initialize crypto core if needed
  useEffect(() => {
    const initializeCryptoCore = async () => {
      try {
        if (typeof window !== 'undefined' && !window.cryptoCore) {
          console.warn('WASM crypto core not loaded - using mock implementation');
        }
      } catch (error) {
        console.error('Failed to initialize crypto core:', error);
        setState(prev => ({ ...prev, lastError: 'Failed to initialize crypto core' }));
      }
    };

    initializeCryptoCore();
  }, []);

  const initialize = useCallback(async (config: RecoverySystemConfig) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, lastError: null }));

      // Create recovery system instance (mock for now)
      const systemInstance = {
        create_backup: () => ({
          backup_id: () => `backup_${Date.now()}`,
          device_id: () => config.deviceId,
          encrypted_master_key: () => new Uint8Array(32),
          recovery_phrase_hash: () => new Uint8Array(32),
          passkey_challenge: () => new Uint8Array(32),
          backup_timestamp: () => Date.now(),
          version: () => 1,
          metadata: () => '{"created": "mock"}',
        }),
        initiate_recovery: () => `recovery_token_${Date.now()}`,
        complete_recovery: () => new Uint8Array(32),
        emergency_recovery: () => `emergency_delay_${Date.now()}_${Date.now() + 300000}`,
        validate_emergency_delay: () => false,
        list_backups: () => [],
        remove_backup: () => {},
        get_attempt_count: () => 0,
        is_backup_locked: () => false,
        reset_attempt_count: () => {},
        get_stats: () => ({
          totalBackups: 0,
          lockedBackups: 0,
          validationLevel: config.validationLevel,
          maxAttempts: config.maxAttempts,
          deviceId: config.deviceId,
        }),
      };

      setRecoverySystem(systemInstance);

      setState(prev => ({
        ...prev,
        isInitialized: true,
        currentConfig: config,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Recovery system initialization failed:', error);
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Initialization failed',
        isLoading: false,
      }));
    }
  }, []);

  const generateRecoveryPhrase = useCallback(
    async (entropyBits: number, language: WordlistLanguage): Promise<RecoveryPhrase> => {
      try {
        // Mock recovery phrase generation
        const wordCount = entropyBits / 11; // Approximate BIP39 word count
        const words: string[] = [];

        // Generate mock words
        const baseWords = [
          'abandon',
          'ability',
          'able',
          'about',
          'above',
          'absent',
          'absorb',
          'abstract',
        ];
        for (let i = 0; i < Math.floor(wordCount); i++) {
          words.push(`${baseWords[i % baseWords.length]}${i + 1}`);
        }

        const phrase: RecoveryPhrase = {
          words,
          entropyHex: Array.from(new Uint8Array(entropyBits / 8))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''),
          checksum: 'mock_checksum',
          language,
          wordCount: words.length,
        };

        return phrase;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to generate recovery phrase',
        }));
        throw error;
      }
    },
    []
  );

  const validateRecoveryPhrase = useCallback((phrase: RecoveryPhrase): boolean => {
    try {
      // Basic validation
      return (
        phrase.words.length > 0 &&
        phrase.entropyHex.length > 0 &&
        phrase.checksum.length > 0 &&
        [12, 15, 18, 21, 24].includes(phrase.wordCount)
      );
    } catch (error) {
      console.error('Recovery phrase validation failed:', error);
      return false;
    }
  }, []);

  const createBackup = useCallback(
    async (phrase: RecoveryPhrase, passkeyChallenge: Uint8Array): Promise<KeyBackup> => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, lastError: null }));

        // Mock hierarchical key for backup creation
        const mockHierarchicalKey = {
          key_bytes: () => new Uint8Array(32),
        };

        // Mock recovery phrase object for WASM
        const wasmPhrase = {
          validate: () => validateRecoveryPhrase(phrase),
          phrase_string: () => phrase.words.join(' '),
          to_seed: () => new Uint8Array(64),
        };

        const wasmBackup = recoverySystem.create_backup(
          mockHierarchicalKey,
          wasmPhrase,
          passkeyChallenge
        );

        const backup: KeyBackup = {
          backupId: wasmBackup.backup_id(),
          deviceId: wasmBackup.device_id(),
          encryptedMasterKey: wasmBackup.encrypted_master_key(),
          recoveryPhraseHash: wasmBackup.recovery_phrase_hash(),
          passkeyChallenge: wasmBackup.passkey_challenge(),
          backupTimestamp: wasmBackup.backup_timestamp(),
          version: wasmBackup.version(),
          metadata: wasmBackup.metadata(),
        };

        setState(prev => ({
          ...prev,
          backups: [...prev.backups, backup],
          isLoading: false,
        }));

        await refreshBackups();
        return backup;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to create backup',
          isLoading: false,
        }));
        throw error;
      }
    },
    [recoverySystem, validateRecoveryPhrase]
  );

  const listBackups = useCallback(async (): Promise<KeyBackup[]> => {
    if (!recoverySystem) {
      return [];
    }

    try {
      const wasmBackups = recoverySystem.list_backups();
      const backups: KeyBackup[] = wasmBackups.map((backup: any) => ({
        backupId: backup.backupId,
        deviceId: backup.deviceId || '',
        encryptedMasterKey: new Uint8Array(0),
        recoveryPhraseHash: new Uint8Array(0),
        passkeyChallenge: new Uint8Array(0),
        backupTimestamp: backup.timestamp || Date.now(),
        version: backup.version || 1,
        metadata: backup.metadata || '{}',
      }));

      setState(prev => ({ ...prev, backups }));
      return backups;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }, [recoverySystem]);

  const removeBackup = useCallback(
    async (backupId: string) => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        await recoverySystem.remove_backup(backupId);

        setState(prev => ({
          ...prev,
          backups: prev.backups.filter(backup => backup.backupId !== backupId),
          lastError: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to remove backup',
        }));
        throw error;
      }
    },
    [recoverySystem]
  );

  const initiateRecovery = useCallback(
    async (
      backupId: string,
      phrase: RecoveryPhrase,
      passkeyResponse: Uint8Array
    ): Promise<RecoveryInitiation> => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, lastError: null }));

        // Mock recovery phrase object for WASM
        const wasmPhrase = {
          validate: () => validateRecoveryPhrase(phrase),
          phrase_string: () => phrase.words.join(' '),
        };

        const recoveryToken = recoverySystem.initiate_recovery(
          backupId,
          wasmPhrase,
          passkeyResponse
        );

        const initiation: RecoveryInitiation = {
          recoveryToken,
          backupId,
          initiatedAt: Date.now(),
          validationLevel: state.currentConfig?.validationLevel || 'Basic',
          expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        };

        setState(prev => ({
          ...prev,
          activeRecovery: initiation,
          isLoading: false,
        }));

        return initiation;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to initiate recovery',
          isLoading: false,
        }));
        throw error;
      }
    },
    [recoverySystem, validateRecoveryPhrase, state.currentConfig]
  );

  const completeRecovery = useCallback(
    async (
      recoveryToken: string,
      backupId: string,
      phrase: RecoveryPhrase
    ): Promise<KeyRestoration> => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, lastError: null }));

        // Mock recovery phrase object for WASM
        const wasmPhrase = {
          validate: () => validateRecoveryPhrase(phrase),
          to_seed: () => new Uint8Array(64),
        };

        const restoredKeyBytes = recoverySystem.complete_recovery(
          backupId,
          recoveryToken,
          wasmPhrase
        );

        const restoration: KeyRestoration = {
          restoredKeyBytes,
          deviceId: state.currentConfig?.deviceId || '',
          backupId,
          restorationTimestamp: Date.now(),
          validationLevel: state.currentConfig?.validationLevel || 'Basic',
          hierarchicalKeyVersion: 1,
        };

        setState(prev => ({
          ...prev,
          activeRecovery: null,
          isLoading: false,
        }));

        return restoration;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to complete recovery',
          isLoading: false,
        }));
        throw error;
      }
    },
    [recoverySystem, validateRecoveryPhrase, state.currentConfig]
  );

  const initiateEmergencyRecovery = useCallback(
    async (
      backupId: string,
      phrase: RecoveryPhrase,
      emergencyCode: string,
      passkeyResponse: Uint8Array
    ): Promise<EmergencyRecovery> => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, lastError: null }));

        // Mock recovery phrase object for WASM
        const wasmPhrase = {
          validate: () => validateRecoveryPhrase(phrase),
          phrase_string: () => phrase.words.join(' '),
        };

        const delayToken = recoverySystem.emergency_recovery(
          backupId,
          wasmPhrase,
          emergencyCode,
          passkeyResponse
        );

        const unlockTime = Date.now() + (state.currentConfig?.lockoutDurationMs || 300000);

        const emergency: EmergencyRecovery = {
          delayToken,
          backupId,
          emergencyCode,
          unlockTime,
          requiredFactors: ['recovery_phrase', 'emergency_code', 'time_delay'],
        };

        setState(prev => ({
          ...prev,
          emergencyRecovery: emergency,
          isLoading: false,
        }));

        return emergency;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError:
            error instanceof Error ? error.message : 'Failed to initiate emergency recovery',
          isLoading: false,
        }));
        throw error;
      }
    },
    [recoverySystem, validateRecoveryPhrase, state.currentConfig]
  );

  const validateEmergencyDelay = useCallback(
    (delayToken: string): boolean => {
      if (!recoverySystem) {
        return false;
      }

      try {
        return recoverySystem.validate_emergency_delay(delayToken);
      } catch (error) {
        console.error('Emergency delay validation failed:', error);
        return false;
      }
    },
    [recoverySystem]
  );

  const getRecoveryAttempts = useCallback(
    (backupId: string): RecoveryAttempt | null => {
      if (!recoverySystem) {
        return null;
      }

      try {
        const attemptCount = recoverySystem.get_attempt_count(backupId);
        const isLocked = recoverySystem.is_backup_locked(backupId);

        return {
          backupId,
          attemptCount,
          lastAttempt: Date.now(), // Would be tracked properly in real implementation
          isLocked,
          unlockTime: isLocked
            ? Date.now() + (state.currentConfig?.lockoutDurationMs || 300000)
            : undefined,
        };
      } catch (error) {
        console.error('Failed to get recovery attempts:', error);
        return null;
      }
    },
    [recoverySystem, state.currentConfig]
  );

  const resetAttemptCount = useCallback(
    async (backupId: string) => {
      if (!recoverySystem) {
        throw new Error('Recovery system not initialized');
      }

      try {
        recoverySystem.reset_attempt_count(backupId);

        setState(prev => ({
          ...prev,
          recoveryAttempts: {
            ...prev.recoveryAttempts,
            [backupId]: {
              ...prev.recoveryAttempts[backupId],
              attemptCount: 0,
              isLocked: false,
            } as RecoveryAttempt,
          },
          lastError: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to reset attempt count',
        }));
        throw error;
      }
    },
    [recoverySystem]
  );

  const getStats = useCallback((): RecoveryStats | null => {
    if (!recoverySystem) {
      return null;
    }

    try {
      const wasmStats = recoverySystem.get_stats();

      const stats: RecoveryStats = {
        totalBackups: wasmStats.totalBackups || 0,
        lockedBackups: wasmStats.lockedBackups || 0,
        validationLevel: wasmStats.validationLevel || 'Basic',
        maxAttempts: wasmStats.maxAttempts || 3,
        deviceId: wasmStats.deviceId || '',
      };

      setState(prev => ({ ...prev, stats }));
      return stats;
    } catch (error) {
      console.error('Failed to get recovery stats:', error);
      return null;
    }
  }, [recoverySystem]);

  const refreshBackups = useCallback(async () => {
    try {
      const backups = await listBackups();
      const stats = getStats();

      setState(prev => ({
        ...prev,
        backups,
        stats,
      }));
    } catch (error) {
      console.error('Failed to refresh backups:', error);
    }
  }, [listBackups, getStats]);

  // Auto-refresh backups periodically
  useEffect(() => {
    if (!state.isInitialized) return;

    const interval = setInterval(refreshBackups, 60000); // Every minute
    return () => clearInterval(interval);
  }, [state.isInitialized, refreshBackups]);

  return {
    // State
    ...state,

    // Actions
    initialize,
    generateRecoveryPhrase,
    validateRecoveryPhrase,
    createBackup,
    listBackups,
    removeBackup,
    initiateRecovery,
    completeRecovery,
    initiateEmergencyRecovery,
    validateEmergencyDelay,
    getRecoveryAttempts,
    resetAttemptCount,
    getStats,
    refreshBackups,
  };
}

export type { UseRecoveryResult, RecoverySystemConfig };
