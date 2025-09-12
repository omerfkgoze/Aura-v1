use wasm_bindgen::prelude::*;
use std::collections::HashMap;

// Device classification based on hardware capabilities
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum DeviceClass {
    MobileHigh,
    MobileLow, 
    WebStandard,
    WebLimited,
}

// WASM-friendly functions for DeviceClass
#[wasm_bindgen]
pub fn get_memory_limit_for_class(class: DeviceClass) -> u32 {
    class.memory_limit()
}

#[wasm_bindgen]
pub fn get_argon2_iterations_for_class(class: DeviceClass) -> u32 {
    class.argon2_iterations()
}

#[wasm_bindgen]
pub fn get_argon2_memory_for_class(class: DeviceClass) -> u32 {
    class.argon2_memory()
}

#[wasm_bindgen]
pub fn get_argon2_parallelism_for_class(class: DeviceClass) -> u32 {
    class.argon2_parallelism()
}

impl DeviceClass {
    pub fn memory_limit(&self) -> u32 {
        match self {
            DeviceClass::MobileHigh => 256 * 1024 * 1024,   // 256 MB
            DeviceClass::MobileLow => 128 * 1024 * 1024,    // 128 MB  
            DeviceClass::WebStandard => 128 * 1024 * 1024,  // 128 MB
            DeviceClass::WebLimited => 64 * 1024 * 1024,    // 64 MB
        }
    }

    pub fn argon2_iterations(&self) -> u32 {
        match self {
            DeviceClass::MobileHigh => 3,
            DeviceClass::MobileLow => 2,
            DeviceClass::WebStandard => 2,
            DeviceClass::WebLimited => 2,
        }
    }

    pub fn argon2_memory(&self) -> u32 {
        match self {
            DeviceClass::MobileHigh => 256 * 1024,  // 256 KB
            DeviceClass::MobileLow => 128 * 1024,   // 128 KB
            DeviceClass::WebStandard => 128 * 1024, // 128 KB  
            DeviceClass::WebLimited => 64 * 1024,   // 64 KB
        }
    }

    pub fn argon2_parallelism(&self) -> u32 {
        match self {
            DeviceClass::MobileHigh => 4,
            DeviceClass::MobileLow => 2,
            DeviceClass::WebStandard => 2,
            DeviceClass::WebLimited => 1,
        }
    }
}

// Device capability detection result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct DeviceCapabilities {
    device_class: DeviceClass,
    available_memory: u64,
    cpu_cores: u32,
    has_secure_enclave: bool,
    platform: String,
    performance_score: f64,
}

#[wasm_bindgen]
impl DeviceCapabilities {
    #[wasm_bindgen(constructor)]
    pub fn new(
        device_class: DeviceClass,
        available_memory: u64,
        cpu_cores: u32,
        has_secure_enclave: bool,
        platform: String,
        performance_score: f64,
    ) -> DeviceCapabilities {
        DeviceCapabilities {
            device_class,
            available_memory,
            cpu_cores,
            has_secure_enclave,
            platform,
            performance_score,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn device_class(&self) -> DeviceClass {
        self.device_class.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn available_memory(&self) -> u64 {
        self.available_memory
    }

    #[wasm_bindgen(getter)]
    pub fn cpu_cores(&self) -> u32 {
        self.cpu_cores
    }

    #[wasm_bindgen(getter)]
    pub fn has_secure_enclave(&self) -> bool {
        self.has_secure_enclave
    }

    #[wasm_bindgen(getter)]
    pub fn platform(&self) -> String {
        self.platform.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn performance_score(&self) -> f64 {
        self.performance_score
    }
}

// Argon2id parameters optimized for device class
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct Argon2Params {
    memory_kb: u32,
    iterations: u32,
    parallelism: u32,
    salt_length: u32,
    key_length: u32,
}

#[wasm_bindgen]
impl Argon2Params {
    #[wasm_bindgen(constructor)]
    pub fn new(
        memory_kb: u32,
        iterations: u32,
        parallelism: u32,
        salt_length: u32,
        key_length: u32,
    ) -> Argon2Params {
        Argon2Params {
            memory_kb,
            iterations,
            parallelism,
            salt_length,
            key_length,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn memory_kb(&self) -> u32 {
        self.memory_kb
    }

    #[wasm_bindgen(getter)]
    pub fn iterations(&self) -> u32 {
        self.iterations
    }

    #[wasm_bindgen(getter)]
    pub fn parallelism(&self) -> u32 {
        self.parallelism
    }

    #[wasm_bindgen(getter)]
    pub fn salt_length(&self) -> u32 {
        self.salt_length
    }

    #[wasm_bindgen(getter)]
    pub fn key_length(&self) -> u32 {
        self.key_length
    }
}

// Performance benchmark result for KDF parameter tuning
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct BenchmarkResult {
    duration_ms: f64,
    memory_used_mb: f64,
    iterations_tested: u32,
    success: bool,
    error_message: Option<String>,
}

#[wasm_bindgen]
impl BenchmarkResult {
    #[wasm_bindgen(constructor)]
    pub fn new(
        duration_ms: f64,
        memory_used_mb: f64,
        iterations_tested: u32,
        success: bool,
        error_message: Option<String>,
    ) -> BenchmarkResult {
        BenchmarkResult {
            duration_ms,
            memory_used_mb,
            iterations_tested,
            success,
            error_message,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn duration_ms(&self) -> f64 {
        self.duration_ms
    }

    #[wasm_bindgen(getter)]
    pub fn memory_used_mb(&self) -> f64 {
        self.memory_used_mb
    }

    #[wasm_bindgen(getter)]
    pub fn iterations_tested(&self) -> u32 {
        self.iterations_tested
    }

    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool {
        self.success
    }

    #[wasm_bindgen(getter)]
    pub fn error_message(&self) -> Option<String> {
        self.error_message.clone()
    }
}

// Device capability detector
#[wasm_bindgen]
pub struct DeviceCapabilityDetector {
    benchmark_cache: HashMap<String, BenchmarkResult>,
}

#[wasm_bindgen]
impl DeviceCapabilityDetector {
    #[wasm_bindgen(constructor)]
    pub fn new() -> DeviceCapabilityDetector {
        DeviceCapabilityDetector {
            benchmark_cache: HashMap::new(),
        }
    }

    // Detect device capabilities from JavaScript-provided metrics
    #[wasm_bindgen]
    pub fn detect_capabilities(
        &self,
        available_memory_mb: u64,
        cpu_cores: u32,
        platform: String,
        has_secure_enclave: bool,
    ) -> DeviceCapabilities {
        let device_class = self.classify_device(
            available_memory_mb,
            cpu_cores,
            &platform,
            has_secure_enclave,
        );

        // Calculate performance score based on capabilities
        let performance_score = self.calculate_performance_score(
            available_memory_mb,
            cpu_cores,
            has_secure_enclave,
        );

        DeviceCapabilities::new(
            device_class,
            available_memory_mb * 1024 * 1024, // Convert to bytes
            cpu_cores,
            has_secure_enclave,
            platform,
            performance_score,
        )
    }

    // Get optimal Argon2id parameters for device class
    #[wasm_bindgen]
    pub fn get_optimal_argon2_params(&self, capabilities: &DeviceCapabilities) -> Argon2Params {
        let device_class = capabilities.device_class();
        
        Argon2Params::new(
            device_class.argon2_memory(),
            device_class.argon2_iterations(),
            device_class.argon2_parallelism(),
            32, // 32-byte salt
            32, // 32-byte key
        )
    }

    // Benchmark Argon2id performance for parameter tuning
    #[wasm_bindgen]
    pub async fn benchmark_argon2_performance(
        &mut self,
        test_params: &Argon2Params,
        target_duration_ms: f64,
    ) -> Result<BenchmarkResult, JsValue> {
        let cache_key = format!(
            "{}:{}:{}:{}",
            test_params.memory_kb(),
            test_params.iterations(),
            test_params.parallelism(),
            target_duration_ms
        );

        // Check cache first
        if let Some(cached_result) = self.benchmark_cache.get(&cache_key) {
            return Ok(cached_result.clone());
        }

        // Perform benchmark (simplified mock implementation)
        let _start_time = js_sys::Date::now();
        
        // Mock Argon2 operation (in real implementation, this would be actual Argon2)
        let mock_operation_time = (test_params.memory_kb() as f64 * test_params.iterations() as f64) / 1000.0;
        
        let duration_ms = mock_operation_time;
        let memory_used_mb = test_params.memory_kb() as f64 / 1024.0;
        let success = duration_ms <= target_duration_ms * 1.2; // 20% tolerance

        let result = BenchmarkResult::new(
            duration_ms,
            memory_used_mb,
            test_params.iterations(),
            success,
            if success { None } else { Some("Benchmark exceeded target duration".to_string()) },
        );

        // Cache the result
        self.benchmark_cache.insert(cache_key, result.clone());

        Ok(result)
    }

    // Adaptive parameter selection based on benchmark results
    #[wasm_bindgen]
    pub async fn select_adaptive_parameters(
        &mut self,
        capabilities: &DeviceCapabilities,
        target_duration_ms: f64,
    ) -> Result<Argon2Params, JsValue> {
        let mut best_params = self.get_optimal_argon2_params(capabilities);
        let mut best_score = 0.0;

        // Test multiple parameter combinations
        let memory_options = vec![64, 128, 256]; // KB
        let iteration_options = vec![2, 3, 4];

        for memory_kb in memory_options {
            for iterations in &iteration_options {
                let test_params = Argon2Params::new(
                    memory_kb,
                    *iterations,
                    capabilities.cpu_cores().min(4),
                    32,
                    32,
                );

                match self.benchmark_argon2_performance(&test_params, target_duration_ms).await {
                    Ok(benchmark) => {
                        if benchmark.success() {
                            // Score based on security (iterations * memory) and performance
                            let security_score = (iterations * memory_kb) as f64;
                            let performance_penalty = benchmark.duration_ms() / target_duration_ms;
                            let total_score = security_score / performance_penalty;

                            if total_score > best_score {
                                best_score = total_score;
                                best_params = test_params;
                            }
                        }
                    }
                    Err(_) => continue,
                }
            }
        }

        Ok(best_params)
    }

    // Private helper methods
    fn classify_device(
        &self,
        available_memory_mb: u64,
        cpu_cores: u32,
        platform: &str,
        has_secure_enclave: bool,
    ) -> DeviceClass {
        // Mobile device classification
        if platform.contains("ios") || platform.contains("android") {
            if available_memory_mb >= 6000 && cpu_cores >= 6 && has_secure_enclave {
                return DeviceClass::MobileHigh;
            }
            return DeviceClass::MobileLow;
        }

        // Web device classification
        if available_memory_mb >= 4000 && cpu_cores >= 4 {
            DeviceClass::WebStandard
        } else {
            DeviceClass::WebLimited
        }
    }

    fn calculate_performance_score(
        &self,
        available_memory_mb: u64,
        cpu_cores: u32,
        has_secure_enclave: bool,
    ) -> f64 {
        let mut score = 0.0;

        // Memory score (0-40 points)
        score += (available_memory_mb as f64 / 1000.0).min(40.0);

        // CPU score (0-30 points)
        score += (cpu_cores as f64 * 5.0).min(30.0);

        // Secure enclave bonus (0-30 points)
        if has_secure_enclave {
            score += 30.0;
        }

        score.min(100.0)
    }
}

impl Default for DeviceCapabilityDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_classification() {
        let detector = DeviceCapabilityDetector::new();

        // Test mobile high-end device
        let mobile_high = detector.detect_capabilities(
            8000,
            8,
            "ios".to_string(),
            true,
        );
        assert_eq!(mobile_high.device_class(), DeviceClass::MobileHigh);

        // Test mobile low-end device
        let mobile_low = detector.detect_capabilities(
            4000,
            4,
            "android".to_string(),
            false,
        );
        assert_eq!(mobile_low.device_class(), DeviceClass::MobileLow);

        // Test web standard device
        let web_standard = detector.detect_capabilities(
            6000,
            6,
            "web".to_string(),
            false,
        );
        assert_eq!(web_standard.device_class(), DeviceClass::WebStandard);

        // Test web limited device
        let web_limited = detector.detect_capabilities(
            2000,
            2,
            "web".to_string(),
            false,
        );
        assert_eq!(web_limited.device_class(), DeviceClass::WebLimited);
    }

    #[test]
    fn test_argon2_parameters() {
        let mobile_high = DeviceClass::MobileHigh;
        assert_eq!(mobile_high.argon2_iterations(), 3);
        assert_eq!(mobile_high.argon2_memory(), 256 * 1024);
        assert_eq!(mobile_high.argon2_parallelism(), 4);

        let web_limited = DeviceClass::WebLimited;
        assert_eq!(web_limited.argon2_iterations(), 2);
        assert_eq!(web_limited.argon2_memory(), 64 * 1024);
        assert_eq!(web_limited.argon2_parallelism(), 1);
    }

    #[test]
    fn test_performance_score_calculation() {
        let detector = DeviceCapabilityDetector::new();

        // High-end device with secure enclave
        let high_score = detector.calculate_performance_score(8000, 8, true);
        assert!(high_score > 90.0);

        // Low-end device without secure enclave
        let low_score = detector.calculate_performance_score(2000, 2, false);
        assert!(low_score < 50.0);
    }

    #[test]
    fn test_optimal_params_selection() {
        let detector = DeviceCapabilityDetector::new();
        let capabilities = detector.detect_capabilities(
            6000,
            6,
            "ios".to_string(),
            true,
        );

        let params = detector.get_optimal_argon2_params(&capabilities);
        assert_eq!(params.salt_length(), 32);
        assert_eq!(params.key_length(), 32);
        assert!(params.memory_kb() >= 64);
        assert!(params.iterations() >= 2);
    }
}