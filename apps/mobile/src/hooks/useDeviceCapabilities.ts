import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { DeviceCapabilities, DeviceClass, Argon2Params } from '@aura/shared-types';

// Import crypto core WASM bindings
import {
  DeviceCapabilityDetector,
  DeviceCapabilities as WasmDeviceCapabilities,
} from '@aura/crypto-core';

export interface UseDeviceCapabilitiesResult {
  capabilities: DeviceCapabilities | null;
  argon2Params: Argon2Params | null;
  isLoading: boolean;
  error: string | null;
  refreshCapabilities: () => Promise<void>;
}

export function useDeviceCapabilities(): UseDeviceCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [argon2Params, setArgon2Params] = useState<Argon2Params | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectCapabilities = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Get device information
      const deviceInfo = await getDeviceInfo();

      // Initialize WASM detector
      const detector = new DeviceCapabilityDetector();

      // Detect capabilities using WASM module
      const wasmCapabilities = detector.detect_capabilities(
        BigInt(deviceInfo.availableMemoryMB),
        deviceInfo.cpuCores,
        deviceInfo.platform,
        deviceInfo.hasSecureEnclave
      );

      // Convert WASM types to TypeScript types
      const tsCapabilities: DeviceCapabilities = {
        deviceClass: wasmCapabilities.device_class.toString() as DeviceClass,
        availableMemory: Number(wasmCapabilities.available_memory),
        cpuCores: wasmCapabilities.cpu_cores,
        hasSecureEnclave: wasmCapabilities.has_secure_enclave,
        platform: wasmCapabilities.platform,
        performanceScore: wasmCapabilities.performance_score,
      };

      // Get optimal Argon2 parameters
      const wasmParams = detector.get_optimal_argon2_params(wasmCapabilities);
      const tsParams: Argon2Params = {
        memoryKb: wasmParams.memory_kb,
        iterations: wasmParams.iterations,
        parallelism: wasmParams.parallelism,
        saltLength: wasmParams.salt_length,
        keyLength: wasmParams.key_length,
      };

      // Cache the results
      await cacheCapabilities(tsCapabilities, tsParams);

      setCapabilities(tsCapabilities);
      setArgon2Params(tsParams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to detect device capabilities: ${errorMessage}`);

      // Try to load cached capabilities as fallback
      try {
        const cached = await loadCachedCapabilities();
        if (cached) {
          setCapabilities(cached.capabilities);
          setArgon2Params(cached.params);
        }
      } catch (cacheErr) {
        console.warn('Failed to load cached capabilities:', cacheErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCapabilities = async (): Promise<void> => {
    await detectCapabilities();
  };

  useEffect(() => {
    detectCapabilities();
  }, []);

  return {
    capabilities,
    argon2Params,
    isLoading,
    error,
    refreshCapabilities,
  };
}

// Helper function to get device information
async function getDeviceInfo() {
  const { width, height } = Dimensions.get('window');
  const screenSize = width * height;

  // Estimate available memory based on device characteristics
  let availableMemoryMB = 2048; // Default fallback

  if (Platform.OS === 'ios') {
    // iOS memory estimation based on device model and screen size
    if (Device.modelName?.includes('Pro') || screenSize > 1000000) {
      availableMemoryMB = 6144; // 6GB for Pro models
    } else if (Device.modelName?.includes('Plus') || screenSize > 500000) {
      availableMemoryMB = 4096; // 4GB for Plus models
    } else {
      availableMemoryMB = 3072; // 3GB for standard models
    }
  } else if (Platform.OS === 'android') {
    // Android memory estimation (simplified)
    if (screenSize > 1000000) {
      availableMemoryMB = 8192; // 8GB for high-end devices
    } else if (screenSize > 500000) {
      availableMemoryMB = 4096; // 4GB for mid-range devices
    } else {
      availableMemoryMB = 2048; // 2GB for low-end devices
    }
  }

  // Estimate CPU cores based on platform and device characteristics
  let cpuCores = 4; // Default

  if (Platform.OS === 'ios') {
    cpuCores = Device.modelName?.includes('Pro') ? 8 : 6;
  } else if (Platform.OS === 'android') {
    cpuCores = availableMemoryMB >= 6144 ? 8 : 6;
  }

  // Check for secure enclave availability
  const hasSecureEnclave = await checkSecureEnclaveAvailability();

  return {
    availableMemoryMB,
    cpuCores,
    platform: Platform.OS,
    hasSecureEnclave,
    screenSize,
    deviceModel: Device.modelName || 'Unknown',
  };
}

// Check if secure enclave/keystore is available
async function checkSecureEnclaveAvailability(): Promise<boolean> {
  try {
    // Test if we can store and retrieve from secure storage
    const testKey = 'secure_enclave_test';
    const testValue = 'test_value';

    await SecureStore.setItemAsync(testKey, testValue, {
      keychainService: 'aura-secure-test',
      requireAuthentication: false,
    });

    const retrieved = await SecureStore.getItemAsync(testKey, {
      keychainService: 'aura-secure-test',
    });

    // Cleanup test data
    await SecureStore.deleteItemAsync(testKey, {
      keychainService: 'aura-secure-test',
    });

    return retrieved === testValue;
  } catch {
    return false;
  }
}

// Cache capabilities for faster subsequent loads
async function cacheCapabilities(
  capabilities: DeviceCapabilities,
  params: Argon2Params
): Promise<void> {
  try {
    const cacheData = {
      capabilities,
      params,
      timestamp: Date.now(),
    };

    await SecureStore.setItemAsync('device_capabilities_cache', JSON.stringify(cacheData), {
      keychainService: 'aura-device-capabilities',
      requireAuthentication: false,
    });
  } catch (err) {
    console.warn('Failed to cache device capabilities:', err);
  }
}

// Load cached capabilities
async function loadCachedCapabilities(): Promise<{
  capabilities: DeviceCapabilities;
  params: Argon2Params;
} | null> {
  try {
    const cached = await SecureStore.getItemAsync('device_capabilities_cache', {
      keychainService: 'aura-device-capabilities',
    });

    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // Check if cache is still valid (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - cacheData.timestamp > maxAge) {
      return null;
    }

    return {
      capabilities: cacheData.capabilities,
      params: cacheData.params,
    };
  } catch {
    return null;
  }
}

// Performance benchmark hook for parameter tuning
export function useArgon2Benchmark() {
  const [isRunning, setIsRunning] = useState(false);

  const runBenchmark = async (testParams: Argon2Params, targetDurationMs: number = 1000) => {
    setIsRunning(true);

    try {
      const detector = new DeviceCapabilityDetector();
      const wasmParams = {
        memory_kb: testParams.memoryKb,
        iterations: testParams.iterations,
        parallelism: testParams.parallelism,
        salt_length: testParams.saltLength,
        key_length: testParams.keyLength,
      };

      const result = await detector.benchmark_argon2_performance(
        wasmParams as any,
        targetDurationMs
      );

      return {
        durationMs: result.duration_ms,
        memoryUsedMb: result.memory_used_mb,
        iterationsTested: result.iterations_tested,
        success: result.success,
        errorMessage: result.error_message || undefined,
      };
    } finally {
      setIsRunning(false);
    }
  };

  return {
    runBenchmark,
    isRunning,
  };
}
