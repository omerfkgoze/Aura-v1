use wasm_bindgen::prelude::*;
// use zeroize::Zeroize;  // Reserved for future use
// use rand::RngCore;     // Reserved for future use
use crate::security::{SecureRandom, constant_time_compare, MemoryProtection};
use crate::memory::{SecureBuffer, track_secret_zeroization};

// Key management for cryptographic operations with security hardening  
#[wasm_bindgen]
pub struct CryptoKey {
    key_buffer: SecureBuffer,
    key_type: String,
    memory_protection: MemoryProtection,
    is_initialized: bool,
}

#[wasm_bindgen]
impl CryptoKey {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(key_type: String) -> CryptoKey {
        CryptoKey {
            key_buffer: SecureBuffer::new(0),
            key_type,
            memory_protection: MemoryProtection::new(),
            is_initialized: false,
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn key_type(&self) -> String {
        self.key_type.clone()
    }

    // Generate a new random key using secure randomness with hardening
    #[wasm_bindgen]
    pub fn generate(&mut self) -> Result<(), JsValue> {
        let key_size = match self.key_type.as_str() {
            "encryption" => 32, // 256-bit key for encryption
            "signing" => 64,    // 512-bit key for signing
            _ => return Err(JsValue::from_str("Unsupported key type")),
        };
        
        // Generate secure key material using platform entropy
        let key_bytes = SecureRandom::generate_key(key_size)?;
        
        // Create secure buffer and store key
        self.key_buffer = SecureBuffer::from_bytes(key_bytes);
        self.is_initialized = true;
        
        Ok(())
    }

    // Get key length
    #[wasm_bindgen]
    #[must_use]
    pub fn length(&self) -> usize {
        self.key_buffer.len()
    }

    // Check if key is initialized
    #[wasm_bindgen]
    #[must_use]
    pub fn is_initialized(&self) -> bool {
        self.is_initialized && self.key_buffer.is_active()
    }
    
    // Constant-time key comparison for security
    #[wasm_bindgen]
    #[must_use]
    pub fn constant_time_equals(&self, other: &CryptoKey) -> Result<bool, JsValue> {
        if !self.is_initialized() || !other.is_initialized() {
            return Ok(false);
        }
        
        let self_key = self.key_buffer.as_slice()
            .map_err(|e| JsValue::from_str(e))?;
        let other_key = other.key_buffer.as_slice()
            .map_err(|e| JsValue::from_str(e))?;
            
        Ok(constant_time_compare(self_key, other_key))
    }
    
    // Validate memory protection canary
    #[wasm_bindgen]
    #[must_use]
    pub fn validate_memory_protection(&self) -> bool {
        self.memory_protection.check_canary(self.memory_protection.canary_value())
    }
    
    // Explicit key zeroization
    #[wasm_bindgen]
    pub fn zeroize_key(&mut self) {
        self.key_buffer.zeroize_buffer();
        self.is_initialized = false;
    }
}



// Generate a new encryption key
#[wasm_bindgen]
pub fn generate_encryption_key() -> Result<CryptoKey, JsValue> {
    let mut key = CryptoKey::new("encryption".to_string());
    key.generate()?;
    Ok(key)
}

// Generate a new signing key
#[wasm_bindgen]
pub fn generate_signing_key() -> Result<CryptoKey, JsValue> {
    let mut key = CryptoKey::new("signing".to_string());
    key.generate()?;
    Ok(key)
}

// Implement Drop trait for automatic cleanup tracking
impl Drop for CryptoKey {
    fn drop(&mut self) {
        self.zeroize_key();
        track_secret_zeroization();
    }
}

// Manual Clone implementation for CryptoKey
impl Clone for CryptoKey {
    fn clone(&self) -> Self {
        // Create a new key of the same type but don't copy sensitive data
        CryptoKey::new(self.key_type.clone())
    }
}