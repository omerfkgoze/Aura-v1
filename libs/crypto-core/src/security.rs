use wasm_bindgen::prelude::*;
use zeroize::Zeroize;
use rand::RngCore;

/// Security hardening and attack mitigation module
/// Implements constant-time operations, side-channel attack prevention,
/// and secure random number generation

/// Constant-time comparison to prevent timing attacks
#[wasm_bindgen]
#[must_use]
pub fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    
    let mut result = 0u8;
    for i in 0..a.len() {
        result |= a[i] ^ b[i];
    }
    
    // Constant time check if result is zero
    ((result as u16).wrapping_sub(1) >> 8) == 1
}

/// Secure random number generator using platform entropy
#[wasm_bindgen]
pub struct SecureRandom {
    _private: (), // Prevents construction outside this module
}

#[wasm_bindgen]
impl SecureRandom {
    /// Generate secure random bytes
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_bytes(size: usize) -> Result<Vec<u8>, JsValue> {
        if size == 0 || size > 4096 {
            return Err(JsValue::from_str("Invalid size: must be between 1 and 4096 bytes"));
        }
        
        let mut buffer = vec![0u8; size];
        let mut rng = rand::thread_rng();
        rng.fill_bytes(&mut buffer);
        
        Ok(buffer)
    }
    
    /// Generate secure random nonce for crypto operations
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_nonce() -> Result<Vec<u8>, JsValue> {
        Self::generate_bytes(12) // 96-bit nonce for AES-GCM
    }
    
    /// Generate secure salt for key derivation
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_salt() -> Result<Vec<u8>, JsValue> {
        Self::generate_bytes(32) // 256-bit salt
    }
    
    /// Generate secure key material
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_key(size: usize) -> Result<Vec<u8>, JsValue> {
        match size {
            16 | 24 | 32 => Self::generate_bytes(size), // AES key sizes
            _ => Err(JsValue::from_str("Invalid key size: must be 16, 24, or 32 bytes")),
        }
    }
}

/// Memory protection utilities
#[wasm_bindgen]
pub struct MemoryProtection {
    canary_value: u64,
}

#[wasm_bindgen]
impl MemoryProtection {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> MemoryProtection {
        let mut rng = rand::thread_rng();
        MemoryProtection {
            canary_value: rng.next_u64(),
        }
    }
    
    /// Check stack canary for buffer overflow detection
    #[wasm_bindgen]
    #[must_use]
    pub fn check_canary(&self, canary: u64) -> bool {
        constant_time_compare(
            &self.canary_value.to_le_bytes(),
            &canary.to_le_bytes()
        )
    }
    
    /// Get current canary value
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn canary_value(&self) -> u64 {
        self.canary_value
    }
    
    /// Validate buffer bounds to prevent overflow
    #[wasm_bindgen]
    #[must_use]
    pub fn validate_bounds(buffer_size: usize, offset: usize, length: usize) -> bool {
        // Check for integer overflow
        if let Some(end_pos) = offset.checked_add(length) {
            end_pos <= buffer_size
        } else {
            false // Overflow detected
        }
    }
}

impl Default for MemoryProtection {
    fn default() -> Self {
        Self::new()
    }
}

/// Side-channel attack prevention utilities
#[wasm_bindgen]
pub struct SideChannelProtection;

#[wasm_bindgen]
impl SideChannelProtection {
    /// Constant-time conditional select
    #[wasm_bindgen]
    #[must_use]
    pub fn conditional_select(condition: bool, true_val: u8, false_val: u8) -> u8 {
        let mask = if condition { 0xFF } else { 0x00 };
        (mask & true_val) | (!mask & false_val)
    }
    
    /// Constant-time array conditional select
    #[wasm_bindgen]
    #[must_use]
    pub fn conditional_select_array(condition: bool, true_array: &[u8], false_array: &[u8]) -> Result<Vec<u8>, JsValue> {
        if true_array.len() != false_array.len() {
            return Err(JsValue::from_str("Arrays must have equal length"));
        }
        
        let mut result = vec![0u8; true_array.len()];
        for i in 0..true_array.len() {
            result[i] = Self::conditional_select(condition, true_array[i], false_array[i]);
        }
        
        Ok(result)
    }
    
    /// Add timing noise to prevent timing analysis
    #[wasm_bindgen]
    pub fn add_timing_noise() {
        let mut rng = rand::thread_rng();
        let noise_cycles = (rng.next_u32() % 100) + 50; // 50-149 cycles
        
        // Perform dummy operations for timing noise
        let mut dummy = 0u64;
        for _ in 0..noise_cycles {
            dummy = dummy.wrapping_mul(17).wrapping_add(1);
        }
        
        // Use dummy to prevent optimization
        if dummy == u64::MAX {
            console_log!("Timing noise applied");
        }
    }
}

/// Cryptographic operation audit trail
#[wasm_bindgen]
pub struct AuditTrail {
    operations: Vec<String>,
    max_entries: usize,
}

#[wasm_bindgen]
impl AuditTrail {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(max_entries: usize) -> AuditTrail {
        AuditTrail {
            operations: Vec::new(),
            max_entries: if max_entries > 0 { max_entries } else { 1000 },
        }
    }
    
    /// Log a cryptographic operation (privacy-safe)
    #[wasm_bindgen]
    pub fn log_operation(&mut self, operation_type: &str, algorithm: &str) {
        let timestamp = js_sys::Date::now() as u64;
        let entry = format!("{}|{}|{}", timestamp, operation_type, algorithm);
        
        self.operations.push(entry);
        
        // Maintain max entries limit
        if self.operations.len() > self.max_entries {
            self.operations.remove(0);
        }
    }
    
    /// Get operation count for a specific type
    #[wasm_bindgen]
    #[must_use]
    pub fn get_operation_count(&self, operation_type: &str) -> usize {
        self.operations.iter()
            .filter(|entry| entry.contains(&format!("{}|", operation_type)))
            .count()
    }
    
    /// Get recent operations (returns JSON string)
    #[wasm_bindgen]
    #[must_use]
    pub fn get_recent_operations(&self, limit: usize) -> String {
        let recent: Vec<&String> = self.operations
            .iter()
            .rev()
            .take(limit.min(50)) // Max 50 for security
            .collect();
        
        // Return as JSON array
        format!("[{}]", 
            recent.iter()
                .map(|op| format!("\"{}\"", op))
                .collect::<Vec<_>>()
                .join(",")
        )
    }
    
    /// Clear audit trail (emergency function)
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.operations.clear();
    }
    
    /// Get total operation count
    #[wasm_bindgen]
    #[must_use]
    pub fn total_operations(&self) -> usize {
        self.operations.len()
    }
}

impl Drop for AuditTrail {
    fn drop(&mut self) {
        self.clear();
    }
}

/// Secure key derivation with timing attack protection
#[wasm_bindgen]
pub struct SecureKDF;

#[wasm_bindgen]
impl SecureKDF {
    /// Derive key using Argon2id with constant-time validation
    #[wasm_bindgen]
    #[must_use]
    pub fn derive_key(
        password: &[u8], 
        salt: &[u8], 
        iterations: u32, 
        memory_cost: u32, 
        parallelism: u32,
        output_length: usize
    ) -> Result<Vec<u8>, JsValue> {
        use argon2::{Argon2, Algorithm, Version, Params};
        
        // Validate parameters to prevent DoS
        if iterations < 1 || iterations > 10 {
            return Err(JsValue::from_str("Invalid iterations: must be 1-10"));
        }
        
        if memory_cost < 1024 || memory_cost > 65536 {
            return Err(JsValue::from_str("Invalid memory cost: must be 1024-65536 KB"));
        }
        
        if parallelism < 1 || parallelism > 4 {
            return Err(JsValue::from_str("Invalid parallelism: must be 1-4"));
        }
        
        if output_length < 16 || output_length > 64 {
            return Err(JsValue::from_str("Invalid output length: must be 16-64 bytes"));
        }
        
        let params = Params::new(memory_cost, iterations, parallelism, Some(output_length))
            .map_err(|e| JsValue::from_str(&format!("Invalid Argon2 params: {}", e)))?;
        
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        let mut output = vec![0u8; output_length];
        
        argon2.hash_password_into(password, salt, &mut output)
            .map_err(|e| JsValue::from_str(&format!("Key derivation failed: {}", e)))?;
        
        Ok(output)
    }
}

/// Platform-specific entropy collection
#[wasm_bindgen]
pub struct PlatformEntropy;

#[wasm_bindgen]
impl PlatformEntropy {
    /// Collect additional entropy from available sources
    #[wasm_bindgen]
    #[must_use]
    pub fn collect_entropy() -> Vec<u8> {
        let mut entropy = Vec::new();
        
        // Timestamp entropy
        let timestamp = js_sys::Date::now();
        entropy.extend_from_slice(&timestamp.to_bits().to_le_bytes());
        
        // Performance timing entropy
        let performance_now = web_sys::window()
            .and_then(|win| win.performance())
            .map(|perf| perf.now())
            .unwrap_or(0.0);
        entropy.extend_from_slice(&performance_now.to_bits().to_le_bytes());
        
        // Memory usage entropy (if available)
        if let Some(memory) = web_sys::window()
            .and_then(|win| win.performance())
            .and_then(|perf| perf.memory()) {
            entropy.extend_from_slice(&memory.used_js_heap_size().to_le_bytes());
            entropy.extend_from_slice(&memory.total_js_heap_size().to_le_bytes());
        }
        
        // Add some randomness from thread_rng as well
        let mut rng = rand::thread_rng();
        let mut random_bytes = [0u8; 16];
        rng.fill_bytes(&mut random_bytes);
        entropy.extend_from_slice(&random_bytes);
        
        entropy
    }
    
    /// Estimate entropy quality (0-100 score)
    #[wasm_bindgen]
    #[must_use]
    pub fn estimate_entropy_quality(data: &[u8]) -> u8 {
        if data.is_empty() {
            return 0;
        }
        
        // Simple entropy estimation using byte distribution
        let mut counts = [0u32; 256];
        for &byte in data {
            counts[byte as usize] += 1;
        }
        
        // Count unique bytes
        let unique_bytes = counts.iter().filter(|&&count| count > 0).count();
        
        // Calculate Shannon entropy approximation
        let length = data.len() as f64;
        let mut entropy = 0.0;
        
        for &count in &counts {
            if count > 0 {
                let p = count as f64 / length;
                entropy -= p * p.log2();
            }
        }
        
        // Normalize to 0-100 scale
        let max_entropy = 8.0; // Maximum entropy for bytes
        ((entropy / max_entropy) * 100.0).min(100.0).max(0.0) as u8
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constant_time_compare() {
        let a = [1, 2, 3, 4];
        let b = [1, 2, 3, 4];
        let c = [1, 2, 3, 5];
        
        assert!(constant_time_compare(&a, &b));
        assert!(!constant_time_compare(&a, &c));
    }

    #[test]
    fn test_secure_random() {
        let bytes1 = SecureRandom::generate_bytes(32).unwrap();
        let bytes2 = SecureRandom::generate_bytes(32).unwrap();
        
        assert_eq!(bytes1.len(), 32);
        assert_eq!(bytes2.len(), 32);
        assert_ne!(bytes1, bytes2); // Should be different
    }

    #[test]
    fn test_memory_protection() {
        let protection = MemoryProtection::new();
        let canary = protection.canary_value();
        
        assert!(protection.check_canary(canary));
        assert!(!protection.check_canary(canary.wrapping_add(1)));
        
        assert!(MemoryProtection::validate_bounds(100, 10, 50));
        assert!(!MemoryProtection::validate_bounds(100, 90, 20));
    }

    #[test]
    fn test_side_channel_protection() {
        assert_eq!(SideChannelProtection::conditional_select(true, 0xFF, 0x00), 0xFF);
        assert_eq!(SideChannelProtection::conditional_select(false, 0xFF, 0x00), 0x00);
    }

    #[test]
    fn test_audit_trail() {
        let mut audit = AuditTrail::new(5);
        audit.log_operation("encrypt", "AES-256-GCM");
        audit.log_operation("decrypt", "AES-256-GCM");
        
        assert_eq!(audit.total_operations(), 2);
        assert_eq!(audit.get_operation_count("encrypt"), 1);
    }

    #[test]
    fn test_platform_entropy() {
        let entropy = PlatformEntropy::collect_entropy();
        assert!(!entropy.is_empty());
        
        let quality = PlatformEntropy::estimate_entropy_quality(&entropy);
        assert!(quality > 0);
    }
}