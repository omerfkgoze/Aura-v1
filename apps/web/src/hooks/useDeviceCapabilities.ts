import { useState, useEffect } from 'react';
import { DeviceCapabilities, DeviceClass, Argon2Params } from '@aura/shared-types';

// Import crypto core WASM bindings dynamically
type DeviceCapabilityDetector = any;

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

      // Get web device information
      const deviceInfo = await getWebDeviceInfo();

      // Initialize WASM detector with dynamic import
      const { DeviceCapabilityDetector } = await import('@aura/crypto-core');
      const detector = new DeviceCapabilityDetector();

      // Detect capabilities using WASM module
      const wasmCapabilities = detector.detect_capabilities(
        BigInt(deviceInfo.availableMemoryMB),
        deviceInfo.cpuCores,
        'web',
        deviceInfo.hasSecureContext
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

      // Cache the results in localStorage
      await cacheCapabilities(tsCapabilities, tsParams);

      setCapabilities(tsCapabilities);
      setArgon2Params(tsParams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to detect device capabilities: ${errorMessage}`);

      // Try to load cached capabilities as fallback
      try {
        const cached = loadCachedCapabilities();
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

// Helper function to get web device information
async function getWebDeviceInfo() {
  // Get device memory if available (Chrome supports this)
  const deviceMemoryGB = (navigator as any).deviceMemory || 4; // Fallback to 4GB
  const availableMemoryMB = deviceMemoryGB * 1024;

  // Estimate CPU cores
  const cpuCores = navigator.hardwareConcurrency || 4;

  // Check for secure context (HTTPS)
  const hasSecureContext =
    window.isSecureContext &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined';

  // Get additional browser capabilities
  const browserInfo = getBrowserInfo();

  // Performance estimation based on various factors
  const performanceHints = await getPerformanceHints();

  return {
    availableMemoryMB,
    cpuCores,
    hasSecureContext,
    browserInfo,
    performanceHints,
  };
}

// Get browser information for device classification
function getBrowserInfo() {
  const userAgent = navigator.userAgent;

  let browser = 'unknown';
  let version = 'unknown';

  if (userAgent.includes('Chrome/')) {
    browser = 'chrome';
    version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'unknown';
  } else if (userAgent.includes('Firefox/')) {
    browser = 'firefox';
    version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'unknown';
  } else if (userAgent.includes('Safari/')) {
    browser = 'safari';
    version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'unknown';
  } else if (userAgent.includes('Edge/')) {
    browser = 'edge';
    version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'unknown';
  }

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return {
    browser,
    version,
    isMobile,
    userAgent,
  };
}

// Get performance hints through various web APIs
async function getPerformanceHints() {
  const hints: any = {};

  try {
    // Connection information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      hints.effectiveType = connection.effectiveType;
      hints.downlink = connection.downlink;
      hints.rtt = connection.rtt;
    }

    // Memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      hints.usedJSHeapSize = memory.usedJSHeapSize;
      hints.totalJSHeapSize = memory.totalJSHeapSize;
      hints.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }

    // Simple performance test
    const startTime = performance.now();
    for (let i = 0; i < 100000; i++) {
      Math.random();
    }
    const endTime = performance.now();
    hints.simpleComputeTime = endTime - startTime;

    // WebGL capabilities (indicates GPU performance)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      hints.webgl = { renderer, vendor };
    }
  } catch (err) {
    console.warn('Failed to gather performance hints:', err);
  }

  return hints;
}

// Cache capabilities in localStorage
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

    localStorage.setItem('aura_device_capabilities_cache', JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Failed to cache device capabilities:', err);
  }
}

// Load cached capabilities from localStorage
function loadCachedCapabilities(): {
  capabilities: DeviceCapabilities;
  params: Argon2Params;
} | null {
  try {
    const cached = localStorage.getItem('aura_device_capabilities_cache');

    if (!cached) return null;

    const cacheData = JSON.parse(cached);

    // Check if cache is still valid (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - cacheData.timestamp > maxAge) {
      localStorage.removeItem('aura_device_capabilities_cache');
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

// Performance benchmark hook for web
export function useArgon2Benchmark() {
  const [isRunning, setIsRunning] = useState(false);

  const runBenchmark = async (testParams: Argon2Params, targetDurationMs: number = 1000) => {
    setIsRunning(true);

    try {
      const { DeviceCapabilityDetector } = await import('@aura/crypto-core');
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

// Hook for adaptive parameter optimization
export function useAdaptiveParameterOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const optimizeParameters = async (
    capabilities: DeviceCapabilities,
    targetDurationMs: number = 1000
  ): Promise<Argon2Params | null> => {
    setIsOptimizing(true);

    try {
      const { DeviceCapabilityDetector } = await import('@aura/crypto-core');
      const detector = new DeviceCapabilityDetector();
      const wasmCapabilities = new (detector as any).DeviceCapabilities(
        capabilities.deviceClass,
        capabilities.availableMemory,
        capabilities.cpuCores,
        capabilities.hasSecureEnclave,
        capabilities.platform,
        capabilities.performanceScore
      );

      const optimizedParams = await detector.select_adaptive_parameters(
        wasmCapabilities,
        targetDurationMs
      );

      return {
        memoryKb: optimizedParams.memory_kb,
        iterations: optimizedParams.iterations,
        parallelism: optimizedParams.parallelism,
        saltLength: optimizedParams.salt_length,
        keyLength: optimizedParams.key_length,
      };
    } catch (err) {
      console.error('Parameter optimization failed:', err);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };

  return {
    optimizeParameters,
    isOptimizing,
  };
}
