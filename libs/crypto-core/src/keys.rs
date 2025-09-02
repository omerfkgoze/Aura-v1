use wasm_bindgen::prelude::*;
use zeroize::Zeroize;
use rand::RngCore;

// Key management for cryptographic operations
#[wasm_bindgen]
pub struct CryptoKey {
    key_data: Vec<u8>,
    key_type: String,
}

#[wasm_bindgen]
impl CryptoKey {
    #[wasm_bindgen(constructor)]
    pub fn new(key_type: String) -> CryptoKey {
        CryptoKey {
            key_data: Vec::new(),
            key_type,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn key_type(&self) -> String {
        self.key_type.clone()
    }

    // Generate a new random key using secure randomness
    #[wasm_bindgen]
    pub fn generate(&mut self) -> Result<(), JsValue> {
        let mut rng = rand::thread_rng();
        match self.key_type.as_str() {
            "encryption" => {
                // Generate 32-byte key for encryption using secure random
                let mut key_bytes = vec![0u8; 32];
                rng.fill_bytes(&mut key_bytes);
                self.key_data = key_bytes;
                Ok(())
            }
            "signing" => {
                // Generate 64-byte key for signing using secure random
                let mut key_bytes = vec![0u8; 64];
                rng.fill_bytes(&mut key_bytes);
                self.key_data = key_bytes;
                Ok(())
            }
            _ => Err(JsValue::from_str("Unsupported key type")),
        }
    }

    // Get key length
    #[wasm_bindgen]
    pub fn length(&self) -> usize {
        self.key_data.len()
    }

    // Check if key is initialized
    #[wasm_bindgen]
    pub fn is_initialized(&self) -> bool {
        !self.key_data.is_empty()
    }
}

impl Drop for CryptoKey {
    fn drop(&mut self) {
        // Zeroize key data when dropped for security
        self.key_data.zeroize();
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