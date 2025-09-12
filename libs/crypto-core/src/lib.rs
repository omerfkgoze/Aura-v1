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
pub mod integration;
pub mod device;
pub mod secure_storage;
pub mod derivation;
pub mod multi_device;
pub mod recovery;
pub mod key_rotation;

// Re-export main functions for JavaScript consumption
pub use envelope::*;
pub use keys::*;
pub use derivation::*;
pub use aad::*;
pub use memory::{SecureBuffer, MemoryPool, SecureTempData, get_memory_usage, get_active_allocations, cleanup_unused_buffers, has_memory_leaks, get_memory_stats, reset_memory_stats, MemoryStats, track_secret_allocation, track_secret_zeroization, track_allocation};
pub use bindings::*;
pub use security::*;
pub use integration::*;
pub use device::*;
pub use secure_storage::*;
pub use multi_device::*;
pub use recovery::*;
pub use key_rotation::*;

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

// Simple wrapper functions for testing
pub fn generate_key() -> Result<CryptoKey, Box<dyn std::error::Error>> {
    let mut key = CryptoKey::new("encryption".to_string());
    key.generate().map_err(|e| format!("Key generation failed: {:?}", e))?;
    track_secret_allocation();
    Ok(key)
}

pub fn encrypt_data(
    data: &[u8],
    _key: &CryptoKey,
    aad: &[u8],
    _device_id: &str,
) -> Result<EncryptionResult, Box<dyn std::error::Error>> {
    track_allocation(data.len() + aad.len());
    track_secret_allocation();
    
    // Create a mock encryption result for testing using the constructor
    let envelope = CryptoEnvelope::new();
    
    // Mock encrypted data (in real implementation, this would be actual encryption)
    let encrypted_data = data.iter().map(|&b| b ^ 0xAA).collect();
    
    Ok(EncryptionResult {
        encrypted_data,
        envelope,
    })
}

pub fn decrypt_data(
    encrypted_data: &[u8],
    envelope: &CryptoEnvelope,
    _key: &CryptoKey,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    track_allocation(encrypted_data.len());
    
    // Basic envelope validation (simplified for now)
    if envelope.encrypted_data().is_empty() {
        return Err("Invalid envelope: empty encrypted data".into());
    }
    
    // Mock decryption (in real implementation, this would be actual decryption)
    let decrypted = encrypted_data.iter().map(|&b| b ^ 0xAA).collect();
    
    Ok(decrypted)
}

pub fn derive_key_from_password(
    password: &[u8],
    salt: &[u8],
    iterations: u32,
) -> Result<CryptoKey, Box<dyn std::error::Error>> {
    if iterations == 0 {
        return Err("Iterations must be greater than 0".into());
    }
    
    track_secret_allocation();
    track_allocation(password.len() + salt.len());
    
    // Mock key derivation (in real implementation, this would use Argon2)
    let mut key = CryptoKey::new("derived".to_string());
    key.generate().map_err(|e| format!("Key derivation failed: {:?}", e))?;
    
    Ok(key)
}

pub fn validate_aad(aad: &[u8], device_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Basic AAD validation
    if aad.is_empty() && device_id.is_empty() {
        return Err("Both AAD and device_id cannot be empty".into());
    }
    Ok(())
}

#[derive(Debug, Clone)]
pub struct EncryptionResult {
    pub encrypted_data: Vec<u8>,
    pub envelope: CryptoEnvelope,
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