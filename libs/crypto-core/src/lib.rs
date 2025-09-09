// Use default WASM allocator for better security and maintenance

use wasm_bindgen::prelude::*;

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

pub mod envelope;
pub mod keys;
pub mod aad;
pub mod memory;
pub mod bindings;
pub mod security;

// Re-export main functions for JavaScript consumption
pub use envelope::*;
pub use keys::*;
pub use aad::*;
pub use memory::{SecureBuffer, MemoryPool, SecureTempData, get_memory_usage, get_active_allocations, cleanup_unused_buffers, has_memory_leaks};
pub use bindings::*;
pub use security::*;

// Initialize function called when WASM module is loaded
#[wasm_bindgen(start)]
pub fn init() {
    console_log!("Crypto core WASM module initialized");
}

// Test function to verify WASM bindings work
#[wasm_bindgen]
#[must_use]
pub fn test_crypto_core() -> String {
    "Crypto core is working!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_core_init() {
        let result = test_crypto_core();
        assert_eq!(result, "Crypto core is working!");
    }

    #[test] 
    fn test_modules_exist() {
        // Test that all modules are accessible
        use crate::envelope::CryptoEnvelope;
        use crate::keys::CryptoKey;
        use crate::aad::AADValidator;
        
        let envelope = CryptoEnvelope::new();
        let key = CryptoKey::new("encryption".to_string());
        let validator = AADValidator::new("test".to_string());
        
        // Basic existence tests
        assert!(!key.is_initialized());
        assert_eq!(validator.context(), "test");
        assert_eq!(envelope.encrypted_data().len(), 0);
    }
}