import { describe, it, expect, beforeEach } from 'vitest';
import {
  DeviceCapabilityDetector,
  DeviceClass,
  DeviceCapabilities,
  Argon2Params,
  BenchmarkResult,
} from '../src/device';

describe('Device Capability Detection', () => {
  let detector: DeviceCapabilityDetector;

  beforeEach(() => {
    detector = new DeviceCapabilityDetector();
  });

  describe('DeviceClass parameters', () => {
    it('should have correct memory limits for each device class', () => {
      expect(DeviceClass.MobileHigh.memory_limit()).toBe(256 * 1024 * 1024);
      expect(DeviceClass.MobileLow.memory_limit()).toBe(128 * 1024 * 1024);
      expect(DeviceClass.WebStandard.memory_limit()).toBe(128 * 1024 * 1024);
      expect(DeviceClass.WebLimited.memory_limit()).toBe(64 * 1024 * 1024);
    });

    it('should have correct Argon2id iterations for each device class', () => {
      expect(DeviceClass.MobileHigh.argon2_iterations()).toBe(3);
      expect(DeviceClass.MobileLow.argon2_iterations()).toBe(2);
      expect(DeviceClass.WebStandard.argon2_iterations()).toBe(2);
      expect(DeviceClass.WebLimited.argon2_iterations()).toBe(2);
    });

    it('should have correct Argon2id memory settings for each device class', () => {
      expect(DeviceClass.MobileHigh.argon2_memory()).toBe(256 * 1024);
      expect(DeviceClass.MobileLow.argon2_memory()).toBe(128 * 1024);
      expect(DeviceClass.WebStandard.argon2_memory()).toBe(128 * 1024);
      expect(DeviceClass.WebLimited.argon2_memory()).toBe(64 * 1024);
    });

    it('should have correct parallelism settings for each device class', () => {
      expect(DeviceClass.MobileHigh.argon2_parallelism()).toBe(4);
      expect(DeviceClass.MobileLow.argon2_parallelism()).toBe(2);
      expect(DeviceClass.WebStandard.argon2_parallelism()).toBe(2);
      expect(DeviceClass.WebLimited.argon2_parallelism()).toBe(1);
    });
  });

  describe('Device capability detection', () => {
    it('should classify high-end mobile devices correctly', () => {
      const capabilities = detector.detect_capabilities(
        8000, // 8GB RAM
        8, // 8 CPU cores
        'ios',
        true // Has secure enclave
      );

      expect(capabilities.device_class()).toBe(DeviceClass.MobileHigh);
      expect(capabilities.available_memory()).toBe(8000 * 1024 * 1024);
      expect(capabilities.cpu_cores()).toBe(8);
      expect(capabilities.has_secure_enclave()).toBe(true);
      expect(capabilities.platform()).toBe('ios');
      expect(capabilities.performance_score()).toBeGreaterThan(90);
    });

    it('should classify low-end mobile devices correctly', () => {
      const capabilities = detector.detect_capabilities(
        3000, // 3GB RAM
        4, // 4 CPU cores
        'android',
        false // No secure enclave
      );

      expect(capabilities.device_class()).toBe(DeviceClass.MobileLow);
      expect(capabilities.available_memory()).toBe(3000 * 1024 * 1024);
      expect(capabilities.cpu_cores()).toBe(4);
      expect(capabilities.has_secure_enclave()).toBe(false);
      expect(capabilities.performance_score()).toBeLessThan(60);
    });

    it('should classify web devices correctly', () => {
      const webStandard = detector.detect_capabilities(
        6000, // 6GB RAM
        6, // 6 CPU cores
        'web',
        false
      );

      expect(webStandard.device_class()).toBe(DeviceClass.WebStandard);

      const webLimited = detector.detect_capabilities(
        2000, // 2GB RAM
        2, // 2 CPU cores
        'web',
        false
      );

      expect(webLimited.device_class()).toBe(DeviceClass.WebLimited);
    });

    it('should calculate performance scores correctly', () => {
      // High-end device
      const highEnd = detector.detect_capabilities(8000, 8, 'ios', true);
      expect(highEnd.performance_score()).toBeGreaterThan(90);

      // Mid-range device
      const midRange = detector.detect_capabilities(4000, 4, 'android', false);
      expect(midRange.performance_score()).toBeBetween(40, 70);

      // Low-end device
      const lowEnd = detector.detect_capabilities(2000, 2, 'web', false);
      expect(lowEnd.performance_score()).toBeLessThan(40);
    });
  });

  describe('Argon2 parameter optimization', () => {
    it('should provide optimal parameters for each device class', () => {
      const mobileHigh = detector.detect_capabilities(8000, 8, 'ios', true);
      const params = detector.get_optimal_argon2_params(mobileHigh);

      expect(params.memory_kb()).toBe(256 * 1024);
      expect(params.iterations()).toBe(3);
      expect(params.parallelism()).toBe(4);
      expect(params.salt_length()).toBe(32);
      expect(params.key_length()).toBe(32);
    });

    it('should adjust parameters based on device capabilities', () => {
      const webLimited = detector.detect_capabilities(2000, 2, 'web', false);
      const params = detector.get_optimal_argon2_params(webLimited);

      expect(params.memory_kb()).toBe(64 * 1024);
      expect(params.iterations()).toBe(2);
      expect(params.parallelism()).toBe(1);
    });
  });

  describe('Performance benchmarking', () => {
    it('should perform Argon2 benchmark', async () => {
      const testParams = new Argon2Params(128, 2, 2, 32, 32);
      const result = await detector.benchmark_argon2_performance(testParams, 1000);

      expect(result.duration_ms()).toBeGreaterThan(0);
      expect(result.memory_used_mb()).toBeGreaterThan(0);
      expect(result.iterations_tested()).toBe(2);
      expect(typeof result.success()).toBe('boolean');
    });

    it('should cache benchmark results', async () => {
      const testParams = new Argon2Params(128, 2, 2, 32, 32);

      // First benchmark
      const result1 = await detector.benchmark_argon2_performance(testParams, 1000);

      // Second benchmark with same parameters should be cached
      const result2 = await detector.benchmark_argon2_performance(testParams, 1000);

      expect(result1.duration_ms()).toBe(result2.duration_ms());
      expect(result1.memory_used_mb()).toBe(result2.memory_used_mb());
    });

    it('should fail benchmark for parameters exceeding target duration', async () => {
      const heavyParams = new Argon2Params(512, 5, 8, 32, 32);
      const result = await detector.benchmark_argon2_performance(heavyParams, 100); // Very short target

      expect(result.success()).toBe(false);
      expect(result.error_message()).toBeDefined();
    });
  });

  describe('Adaptive parameter selection', () => {
    it('should select optimal parameters within target duration', async () => {
      const capabilities = detector.detect_capabilities(4000, 4, 'android', false);
      const params = await detector.select_adaptive_parameters(capabilities, 1000);

      expect(params.memory_kb()).toBeGreaterThan(0);
      expect(params.iterations()).toBeGreaterThanOrEqual(2);
      expect(params.parallelism()).toBeGreaterThanOrEqual(1);
      expect(params.salt_length()).toBe(32);
      expect(params.key_length()).toBe(32);
    });

    it('should adapt to device constraints', async () => {
      // Low-end device should get lighter parameters
      const lowEnd = detector.detect_capabilities(2000, 2, 'web', false);
      const lightParams = await detector.select_adaptive_parameters(lowEnd, 1000);

      // High-end device should get heavier parameters
      const highEnd = detector.detect_capabilities(8000, 8, 'ios', true);
      const heavyParams = await detector.select_adaptive_parameters(highEnd, 1000);

      // Heavy params should have higher security (more iterations or memory)
      const lightSecurity = lightParams.iterations() * lightParams.memory_kb();
      const heavySecurity = heavyParams.iterations() * heavyParams.memory_kb();

      expect(heavySecurity).toBeGreaterThanOrEqual(lightSecurity);
    });
  });

  describe('Data structures', () => {
    it('should create DeviceCapabilities with all properties', () => {
      const capabilities = new DeviceCapabilities(
        DeviceClass.MobileHigh,
        8 * 1024 * 1024 * 1024, // 8GB
        8,
        true,
        'ios',
        95.5
      );

      expect(capabilities.device_class()).toBe(DeviceClass.MobileHigh);
      expect(capabilities.available_memory()).toBe(8 * 1024 * 1024 * 1024);
      expect(capabilities.cpu_cores()).toBe(8);
      expect(capabilities.has_secure_enclave()).toBe(true);
      expect(capabilities.platform()).toBe('ios');
      expect(capabilities.performance_score()).toBe(95.5);
    });

    it('should create Argon2Params with all properties', () => {
      const params = new Argon2Params(256, 3, 4, 32, 32);

      expect(params.memory_kb()).toBe(256);
      expect(params.iterations()).toBe(3);
      expect(params.parallelism()).toBe(4);
      expect(params.salt_length()).toBe(32);
      expect(params.key_length()).toBe(32);
    });

    it('should create BenchmarkResult with all properties', () => {
      const result = new BenchmarkResult(850.5, 0.25, 3, true, null);

      expect(result.duration_ms()).toBe(850.5);
      expect(result.memory_used_mb()).toBe(0.25);
      expect(result.iterations_tested()).toBe(3);
      expect(result.success()).toBe(true);
      expect(result.error_message()).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero memory gracefully', () => {
      const capabilities = detector.detect_capabilities(0, 4, 'web', false);
      expect(capabilities.device_class()).toBe(DeviceClass.WebLimited);
    });

    it('should handle zero CPU cores gracefully', () => {
      const capabilities = detector.detect_capabilities(4000, 0, 'web', false);
      expect(capabilities.cpu_cores()).toBe(0);
      expect(capabilities.device_class()).toBe(DeviceClass.WebLimited);
    });

    it('should handle unknown platform', () => {
      const capabilities = detector.detect_capabilities(4000, 4, 'unknown', false);
      expect(capabilities.platform()).toBe('unknown');
      expect(capabilities.device_class()).toBe(DeviceClass.WebStandard);
    });
  });
});

// Helper assertion extensions
declare global {
  namespace Vi {
    interface Assertion<T> {
      toBeBetween(min: number, max: number): T;
    }
  }
}

expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `Expected ${received} to be between ${min} and ${max}`,
      pass,
    };
  },
});
