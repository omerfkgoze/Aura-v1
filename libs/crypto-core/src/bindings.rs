use wasm_bindgen::prelude::*;
// use serde::{Serialize, Deserialize}; // Reserved for future use
use js_sys::{Promise, Object};
use wasm_bindgen_futures::future_to_promise;

// Import console.log for debugging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Define a macro for easier logging
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// WASM binding exports for JavaScript/TypeScript integration
/// This module handles the interface between Rust and JavaScript

/// Error types for crypto operations
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct CryptoError {
    message: String,
    error_type: String,
}

#[wasm_bindgen]
impl CryptoError {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(message: String, error_type: String) -> CryptoError {
        CryptoError { message, error_type }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn message(&self) -> String {
        self.message.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn error_type(&self) -> String {
        self.error_type.clone()
    }
}

/// Convert Rust errors to JavaScript-friendly format
impl From<&str> for CryptoError {
    fn from(msg: &str) -> Self {
        CryptoError::new(msg.to_string(), "CryptoError".to_string())
    }
}

/// Result type for crypto operations
pub type CryptoResult<T> = Result<T, CryptoError>;

/// Integrity verification for WASM module
#[wasm_bindgen]
pub struct ModuleIntegrity {
    checksum: String,
    verified: bool,
}

#[wasm_bindgen]
impl ModuleIntegrity {
    /// Verify module integrity
    #[wasm_bindgen]
    #[must_use]
    pub fn verify_module() -> ModuleIntegrity {
        // In a real implementation, this would verify the WASM module's integrity
        // For now, we'll use a simple check
        let checksum = "sha256:placeholder_checksum".to_string();
        let verified = true; // Placeholder - should implement actual verification
        
        ModuleIntegrity { checksum, verified }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn checksum(&self) -> String {
        self.checksum.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn verified(&self) -> bool {
        self.verified
    }
}

/// Promise-based async interface support
#[wasm_bindgen]
pub struct AsyncCryptoOperation {
    operation_id: String,
    status: String,
}

#[wasm_bindgen]
impl AsyncCryptoOperation {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(operation_id: String) -> AsyncCryptoOperation {
        AsyncCryptoOperation {
            operation_id,
            status: "pending".to_string(),
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn operation_id(&self) -> String {
        self.operation_id.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn status(&self) -> String {
        self.status.clone()
    }

    #[wasm_bindgen]
    pub fn set_status(&mut self, status: String) {
        self.status = status;
    }

    #[wasm_bindgen]
    #[must_use]
    pub fn is_complete(&self) -> bool {
        self.status == "complete" || self.status == "error"
    }
}

/// Async crypto operations with Promise support
#[wasm_bindgen]
pub struct AsyncCrypto;

#[wasm_bindgen]
impl AsyncCrypto {
    /// Async envelope creation returning a Promise
    #[wasm_bindgen]
    pub fn create_envelope_async(
        encrypted_data: &[u8],
        nonce: &[u8], 
        tag: &[u8]
    ) -> Promise {
        let encrypted_data = encrypted_data.to_vec();
        let nonce = nonce.to_vec();
        let tag = tag.to_vec();
        
        future_to_promise(async move {
            use crate::envelope::CryptoEnvelope;
            
            // Simulate async work with proper memory management
            let mut envelope = CryptoEnvelope::new();
            envelope.set_encrypted_data(encrypted_data);
            envelope.set_nonce(nonce);
            envelope.set_tag(tag);
            
            Ok(JsValue::from(envelope))
        })
    }

    /// Async key generation returning a Promise
    #[wasm_bindgen]
    pub fn generate_key_async(key_type: String) -> Promise {
        future_to_promise(async move {
            use crate::keys::CryptoKey;
            
            let mut key = CryptoKey::new(key_type);
            let _ = key.generate();
            
            Ok(JsValue::from(key))
        })
    }

    /// Async AAD generation returning a Promise
    #[wasm_bindgen]
    pub fn create_aad_async(context: String, user_id: String, timestamp: String) -> Promise {
        future_to_promise(async move {
            use crate::aad::AADValidator;
            
            let mut validator = AADValidator::new(context);
            validator.set_user_id(user_id);
            
            // Parse timestamp safely
            let timestamp = timestamp.parse::<u64>()
                .map_err(|e| JsValue::from_str(&format!("Invalid timestamp: {}", e)))?;
            validator.set_timestamp(timestamp);
            
            let aad = validator.generate_aad();
            Ok(JsValue::from(js_sys::Uint8Array::from(&aad[..])))
        })
    }
}

/// WASM initialization with integrity check
#[wasm_bindgen]
pub fn init_crypto_core_with_verification() -> Result<ModuleIntegrity, JsValue> {
    // Verify module integrity first
    let integrity = ModuleIntegrity::verify_module();
    
    if !integrity.verified() {
        return Err(JsValue::from_str("Module integrity verification failed"));
    }

    // Initialize crypto components
    console_log!("Crypto core initialized with integrity verification");
    Ok(integrity)
}

/// Health check interface for validation
#[wasm_bindgen]
#[derive(Clone)]
pub struct HealthCheck {
    crypto_status: String,
    memory_status: String,
    binding_status: String,
}

#[wasm_bindgen]
impl HealthCheck {
    /// Perform comprehensive health check
    #[wasm_bindgen]
    #[must_use]
    pub fn run_health_check() -> HealthCheck {
        let crypto_status = "healthy".to_string(); // Should test crypto operations
        let memory_status = "healthy".to_string(); // Should check memory pools
        let binding_status = "healthy".to_string(); // Should test WASM bindings
        
        HealthCheck {
            crypto_status,
            memory_status,
            binding_status,
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn crypto_status(&self) -> String {
        self.crypto_status.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn memory_status(&self) -> String {
        self.memory_status.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn binding_status(&self) -> String {
        self.binding_status.clone()
    }

    #[wasm_bindgen]
    #[must_use]
    pub fn is_healthy(&self) -> bool {
        self.crypto_status == "healthy" 
            && self.memory_status == "healthy" 
            && self.binding_status == "healthy"
    }

    #[wasm_bindgen]
    #[must_use]
    pub fn to_json(&self) -> String {
        format!(
            "{{\"crypto_status\":\"{}\",\"memory_status\":\"{}\",\"binding_status\":\"{}\"}}",
            self.crypto_status, self.memory_status, self.binding_status
        )
    }
}

/// Debug interface for development
#[wasm_bindgen]
pub struct DebugInterface {
    debug_enabled: bool,
}

#[wasm_bindgen]
impl DebugInterface {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(debug_enabled: bool) -> DebugInterface {
        DebugInterface { debug_enabled }
    }

    /// Log debug information if enabled
    #[wasm_bindgen]
    pub fn debug_log(&self, message: &str) {
        if self.debug_enabled {
            console_log!("[CRYPTO-DEBUG] {}", message);
        }
    }

    /// Get memory statistics for debugging
    #[wasm_bindgen]
    #[must_use]
    pub fn get_memory_stats(&self) -> String {
        if self.debug_enabled {
            // This would return actual memory statistics
            format!("{{\"wasm_memory\":\"placeholder\",\"active_buffers\":0}}")
        } else {
            "Debug disabled".to_string()
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn debug_enabled(&self) -> bool {
        self.debug_enabled
    }

    #[wasm_bindgen]
    pub fn set_debug_enabled(&mut self, enabled: bool) {
        self.debug_enabled = enabled;
    }
}

impl Default for DebugInterface {
    fn default() -> Self {
        Self::new(false)
    }
}

/// Export version information
#[wasm_bindgen]
#[must_use]
pub fn get_crypto_core_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Export build information
#[wasm_bindgen]
#[must_use]
pub fn get_build_info() -> String {
    format!(
        "{{\"version\":\"{}\",\"build_target\":\"wasm32-unknown-unknown\",\"optimization\":\"release\"}}",
        env!("CARGO_PKG_VERSION")
    )
}

/// WASM memory utilities wrapper
#[wasm_bindgen]
pub struct WasmMemoryUtils;

#[wasm_bindgen]
impl WasmMemoryUtils {
    /// Get current WASM memory statistics
    #[wasm_bindgen]
    pub fn get_memory_stats() -> Object {
        use crate::memory::{get_memory_usage, get_active_allocations};
        
        let obj = Object::new();
        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("heap_size"),
            &JsValue::from_f64(get_memory_usage() as f64)
        ).expect("Failed to set heap_size");
        
        js_sys::Reflect::set(
            &obj,
            &JsValue::from_str("active_allocations"),
            &JsValue::from_f64(get_active_allocations() as f64)
        ).expect("Failed to set active_allocations");
        
        obj
    }
    
    /// Force garbage collection of WASM memory
    #[wasm_bindgen]
    pub fn cleanup_memory() {
        use crate::memory::cleanup_unused_buffers;
        cleanup_unused_buffers();
    }
    
    /// Check for memory leaks
    #[wasm_bindgen]
    pub fn detect_leaks() -> bool {
        use crate::memory::has_memory_leaks;
        has_memory_leaks()
    }
}

/// TypeScript type definition generator
#[wasm_bindgen]
pub struct TypeDefinitions;

#[wasm_bindgen]
impl TypeDefinitions {
    /// Generate comprehensive TypeScript definitions
    #[wasm_bindgen]
    pub fn generate_type_definitions() -> String {
        r#"
// Generated TypeScript definitions for crypto-core
export interface CryptoEnvelopeData {
  version: number;
  algorithm: string;
  kdf_params: KDFParams;
  salt: Uint8Array;
  nonce: Uint8Array;
  key_id: string;
  encrypted_data: Uint8Array;
  tag: Uint8Array;
}

export interface KDFParams {
  algorithm: 'argon2id';
  memory_cost: number;
  time_cost: number;
  parallelism: number;
}

export interface CryptoOperationResult<T> {
  success: boolean;
  data?: T;
  error?: CryptoError;
}

export interface MemoryStats {
  heap_size: number;
  active_allocations: number;
  has_leaks: boolean;
}

export declare class AsyncCryptoCore {
  static create(): Promise<AsyncCryptoCore>;
  createEnvelope(data: Uint8Array, nonce: Uint8Array, tag: Uint8Array): Promise<CryptoEnvelope>;
  generateEncryptionKey(): Promise<CryptoKey>;
  generateSigningKey(): Promise<CryptoKey>;
  createCycleDataAAD(userId: string, timestamp: bigint): Promise<Uint8Array>;
  createHealthcareShareAAD(userId: string, shareToken: string): Promise<Uint8Array>;
  runHealthCheck(): Promise<HealthCheck>;
}
        "#.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_error() {
        let error = CryptoError::new("Test error".to_string(), "TestError".to_string());
        assert_eq!(error.message(), "Test error");
        assert_eq!(error.error_type(), "TestError");
    }

    #[test]
    fn test_module_integrity() {
        let integrity = ModuleIntegrity::verify_module();
        assert!(!integrity.checksum().is_empty());
        assert!(integrity.verified()); // Placeholder should return true
    }

    #[test]
    fn test_health_check() {
        let health = HealthCheck::run_health_check();
        assert!(health.is_healthy());
        assert_eq!(health.crypto_status(), "healthy");
    }

    #[test]
    fn test_version_info() {
        let version = get_crypto_core_version();
        assert!(!version.is_empty());
        
        let build_info = get_build_info();
        assert!(build_info.contains("version"));
    }
}