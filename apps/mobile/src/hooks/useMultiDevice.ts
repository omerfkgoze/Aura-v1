import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  DevicePairingRequest,
  DevicePairingResponse,
  DeviceRegistryEntry,
  DeviceStatus,
  MultiDeviceConfig,
  DeviceRegistryStats,
  DeviceSyncStatus,
  CrossDeviceOperation,
  MultiDeviceKeyExchange,
} from '@aura/shared-types';

// Import the WASM crypto core functions
declare global {
  interface Window {
    cryptoCore?: {
      MultiDeviceProtocol: any;
      DevicePairingRequest: any;
      DevicePairingResponse: any;
      DeviceRegistryEntry: any;
    };
  }
}

interface UseMultiDeviceState {
  isInitialized: boolean;
  currentDeviceId: string | null;
  deviceRegistry: DeviceRegistryEntry[];
  registryStats: DeviceRegistryStats | null;
  pairingInProgress: boolean;
  syncStatus: Record<string, DeviceSyncStatus>;
  lastError: string | null;
  isLoading: boolean;
}

interface UseMultiDeviceActions {
  initialize: (config: MultiDeviceConfig) => Promise<void>;
  generatePairingRequest: (deviceName: string, deviceType: string) => Promise<DevicePairingRequest>;
  processPairingRequest: (request: DevicePairingRequest) => Promise<DevicePairingResponse>;
  finalizePairing: (deviceId: string, validated: boolean) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  reenrollDevice: (deviceId: string) => Promise<void>;
  updateDeviceSync: (deviceId: string) => Promise<void>;
  validateDeviceAuth: (deviceId: string, authToken: string) => boolean;
  getTrustedDevices: () => DeviceRegistryEntry[];
  cleanupExpiredDevices: (ttlSeconds: number) => Promise<number>;
  getRegistryStats: () => DeviceRegistryStats | null;
  refreshRegistry: () => Promise<void>;
}

interface UseMultiDeviceResult extends UseMultiDeviceState, UseMultiDeviceActions {}

const INITIAL_STATE: UseMultiDeviceState = {
  isInitialized: false,
  currentDeviceId: null,
  deviceRegistry: [],
  registryStats: null,
  pairingInProgress: false,
  syncStatus: {},
  lastError: null,
  isLoading: false,
};

export function useMultiDevice(): UseMultiDeviceResult {
  const [state, setState] = useState<UseMultiDeviceState>(INITIAL_STATE);
  const [protocol, setProtocol] = useState<any>(null);

  // Initialize crypto core if needed
  useEffect(() => {
    const initializeCryptoCore = async () => {
      try {
        if (typeof window !== 'undefined' && !window.cryptoCore) {
          // In a real implementation, this would load the WASM module
          // For now, we'll mock the interface
          console.warn('WASM crypto core not loaded - using mock implementation');
        }
      } catch (error) {
        console.error('Failed to initialize crypto core:', error);
        setState(prev => ({ ...prev, lastError: 'Failed to initialize crypto core' }));
      }
    };

    initializeCryptoCore();
  }, []);

  const initialize = useCallback(async (config: MultiDeviceConfig) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, lastError: null }));

      // Create protocol instance (mock for now)
      const protocolInstance = {
        initialize: () => Promise.resolve(),
        generate_pairing_request: (name: string, type: string) => ({
          device_id: () => config.currentDeviceId,
          device_name: () => name,
          device_type: () => type,
          public_key: () => new Uint8Array(32),
          challenge_nonce: () => new Uint8Array(16),
          timestamp: () => Date.now(),
        }),
        process_pairing_request: (request: any) => ({
          device_id: () => config.currentDeviceId,
          response_signature: () => new Uint8Array(64),
          shared_secret_hash: () => new Uint8Array(32),
          device_trust_token: () => `trust_${request.device_id()}_${Date.now()}`,
          timestamp: () => Date.now(),
        }),
        finalize_pairing: () => Promise.resolve(),
        revoke_device: () => Promise.resolve(),
        reenroll_device: () => Promise.resolve(),
        update_device_sync: () => Promise.resolve(),
        get_device_status: () => 0, // Unknown
        get_trusted_devices: () => [],
        cleanup_expired_devices: () => 0,
        get_registry_stats: () => ({
          total: 0,
          trusted: 0,
          revoked: 0,
          pending: 0,
          expired: 0,
          maxDevices: config.maxDevices,
        }),
        validate_device_auth: () => false,
        device_count: () => 0,
        is_device_limit_reached: () => false,
      };

      setProtocol(protocolInstance);

      setState(prev => ({
        ...prev,
        isInitialized: true,
        currentDeviceId: config.currentDeviceId,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Multi-device initialization failed:', error);
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Initialization failed',
        isLoading: false,
      }));
    }
  }, []);

  const generatePairingRequest = useCallback(
    async (deviceName: string, deviceType: string): Promise<DevicePairingRequest> => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        setState(prev => ({ ...prev, pairingInProgress: true, lastError: null }));

        const wasmRequest = protocol.generate_pairing_request(deviceName, deviceType);

        const request: DevicePairingRequest = {
          deviceId: wasmRequest.device_id(),
          deviceName: wasmRequest.device_name(),
          deviceType: wasmRequest.device_type(),
          publicKey: wasmRequest.public_key(),
          challengeNonce: wasmRequest.challenge_nonce(),
          timestamp: wasmRequest.timestamp(),
        };

        setState(prev => ({ ...prev, pairingInProgress: false }));
        return request;
      } catch (error) {
        setState(prev => ({
          ...prev,
          pairingInProgress: false,
          lastError: error instanceof Error ? error.message : 'Failed to generate pairing request',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const processPairingRequest = useCallback(
    async (request: DevicePairingRequest): Promise<DevicePairingResponse> => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        setState(prev => ({ ...prev, pairingInProgress: true, lastError: null }));

        // Create mock WASM request object
        const wasmRequest = {
          device_id: () => request.deviceId,
          device_name: () => request.deviceName,
          device_type: () => request.deviceType,
          public_key: () => request.publicKey,
          challenge_nonce: () => request.challengeNonce,
          timestamp: () => request.timestamp,
        };

        const wasmResponse = protocol.process_pairing_request(wasmRequest);

        const response: DevicePairingResponse = {
          deviceId: wasmResponse.device_id(),
          responseSignature: wasmResponse.response_signature(),
          sharedSecretHash: wasmResponse.shared_secret_hash(),
          deviceTrustToken: wasmResponse.device_trust_token(),
          timestamp: wasmResponse.timestamp(),
        };

        setState(prev => ({ ...prev, pairingInProgress: false }));
        await refreshRegistry(); // Refresh to show new pending device

        return response;
      } catch (error) {
        setState(prev => ({
          ...prev,
          pairingInProgress: false,
          lastError: error instanceof Error ? error.message : 'Failed to process pairing request',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const finalizePairing = useCallback(
    async (deviceId: string, validated: boolean) => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        await protocol.finalize_pairing(deviceId, validated);
        await refreshRegistry();

        setState(prev => ({
          ...prev,
          lastError: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to finalize pairing',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const revokeDevice = useCallback(
    async (deviceId: string) => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        await protocol.revoke_device(deviceId);
        await refreshRegistry();

        setState(prev => ({
          ...prev,
          lastError: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to revoke device',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const reenrollDevice = useCallback(
    async (deviceId: string) => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        await protocol.reenroll_device(deviceId);
        await refreshRegistry();

        setState(prev => ({
          ...prev,
          lastError: null,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to re-enroll device',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const updateDeviceSync = useCallback(
    async (deviceId: string) => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        await protocol.update_device_sync(deviceId);

        const syncStatus: DeviceSyncStatus = {
          deviceId,
          lastSyncAttempt: Date.now(),
          lastSuccessfulSync: Date.now(),
          syncStatus: 'success',
          conflictCount: 0,
        };

        setState(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            [deviceId]: syncStatus,
          },
          lastError: null,
        }));
      } catch (error) {
        const syncStatus: DeviceSyncStatus = {
          deviceId,
          lastSyncAttempt: Date.now(),
          lastSuccessfulSync: state.syncStatus[deviceId]?.lastSuccessfulSync || 0,
          syncStatus: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Sync failed',
          conflictCount: 0,
        };

        setState(prev => ({
          ...prev,
          syncStatus: {
            ...prev.syncStatus,
            [deviceId]: syncStatus,
          },
          lastError: error instanceof Error ? error.message : 'Failed to update device sync',
        }));
        throw error;
      }
    },
    [protocol, state.syncStatus]
  );

  const validateDeviceAuth = useCallback(
    (deviceId: string, authToken: string): boolean => {
      if (!protocol) {
        return false;
      }

      try {
        return protocol.validate_device_auth(deviceId, authToken);
      } catch (error) {
        console.error('Device auth validation failed:', error);
        return false;
      }
    },
    [protocol]
  );

  const getTrustedDevices = useCallback((): DeviceRegistryEntry[] => {
    if (!protocol) {
      return [];
    }

    try {
      const trustedDevices = protocol.get_trusted_devices();
      return trustedDevices.map((device: any) => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        status: 'Trusted' as DeviceStatus,
        trustToken: device.trustToken || '',
        publicKey: device.publicKey || new Uint8Array(0),
        lastSync: device.lastSync || Date.now(),
        trustScore: device.trustScore || 1.0,
        createdAt: device.createdAt || Date.now(),
        updatedAt: device.updatedAt || Date.now(),
      }));
    } catch (error) {
      console.error('Failed to get trusted devices:', error);
      return [];
    }
  }, [protocol]);

  const cleanupExpiredDevices = useCallback(
    async (ttlSeconds: number): Promise<number> => {
      if (!protocol) {
        throw new Error('Multi-device protocol not initialized');
      }

      try {
        const cleanedCount = protocol.cleanup_expired_devices(ttlSeconds);
        await refreshRegistry();
        return cleanedCount;
      } catch (error) {
        setState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Failed to cleanup expired devices',
        }));
        throw error;
      }
    },
    [protocol]
  );

  const getRegistryStats = useCallback((): DeviceRegistryStats | null => {
    if (!protocol) {
      return null;
    }

    try {
      const stats = protocol.get_registry_stats();
      return {
        total: stats.total || 0,
        trusted: stats.trusted || 0,
        revoked: stats.revoked || 0,
        pending: stats.pending || 0,
        expired: stats.expired || 0,
        maxDevices: stats.maxDevices || 10,
      };
    } catch (error) {
      console.error('Failed to get registry stats:', error);
      return null;
    }
  }, [protocol]);

  const refreshRegistry = useCallback(async () => {
    if (!protocol) {
      return;
    }

    try {
      const trustedDevices = getTrustedDevices();
      const stats = getRegistryStats();

      setState(prev => ({
        ...prev,
        deviceRegistry: trustedDevices,
        registryStats: stats,
      }));
    } catch (error) {
      console.error('Failed to refresh registry:', error);
    }
  }, [protocol, getTrustedDevices, getRegistryStats]);

  // Auto-refresh registry periodically
  useEffect(() => {
    if (!state.isInitialized) return;

    const interval = setInterval(refreshRegistry, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [state.isInitialized, refreshRegistry]);

  // Memoized computed values
  const trustedDeviceCount = useMemo(() => {
    return state.deviceRegistry.filter(device => device.status === 'Trusted').length;
  }, [state.deviceRegistry]);

  const isDeviceLimitReached = useMemo(() => {
    return protocol ? protocol.is_device_limit_reached() : false;
  }, [protocol, state.deviceRegistry]);

  return {
    // State
    ...state,

    // Actions
    initialize,
    generatePairingRequest,
    processPairingRequest,
    finalizePairing,
    revokeDevice,
    reenrollDevice,
    updateDeviceSync,
    validateDeviceAuth,
    getTrustedDevices,
    cleanupExpiredDevices,
    getRegistryStats,
    refreshRegistry,
  };
}

export type { UseMultiDeviceResult, MultiDeviceConfig };
