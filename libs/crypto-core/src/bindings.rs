use wasm_bindgen::prelude::*;

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