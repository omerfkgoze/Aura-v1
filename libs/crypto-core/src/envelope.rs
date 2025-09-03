use wasm_bindgen::prelude::*;
use zeroize::Zeroize;

// Crypto envelope for secure data handling
#[wasm_bindgen]
pub struct CryptoEnvelope {
    encrypted_data: Vec<u8>,
    nonce: Vec<u8>,
    tag: Vec<u8>,
}

impl Default for CryptoEnvelope {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl CryptoEnvelope {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> CryptoEnvelope {
        CryptoEnvelope {
            encrypted_data: Vec::new(),
            nonce: Vec::new(),
            tag: Vec::new(),
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn encrypted_data(&self) -> Vec<u8> {
        self.encrypted_data.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn nonce(&self) -> Vec<u8> {
        self.nonce.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn tag(&self) -> Vec<u8> {
        self.tag.clone()
    }

    #[wasm_bindgen(setter)]
    pub fn set_encrypted_data(&mut self, data: Vec<u8>) {
        self.encrypted_data = data;
    }

    #[wasm_bindgen(setter)]
    pub fn set_nonce(&mut self, nonce: Vec<u8>) {
        self.nonce = nonce;
    }

    #[wasm_bindgen(setter)]
    pub fn set_tag(&mut self, tag: Vec<u8>) {
        self.tag = tag;
    }
}

impl Drop for CryptoEnvelope {
    fn drop(&mut self) {
        // Zeroize sensitive data when dropped
        self.encrypted_data.zeroize();
        self.nonce.zeroize();
        self.tag.zeroize();
    }
}

// Create a crypto envelope from components
#[wasm_bindgen]
#[must_use]
pub fn create_envelope(encrypted_data: Vec<u8>, nonce: Vec<u8>, tag: Vec<u8>) -> CryptoEnvelope {
    let mut envelope = CryptoEnvelope::new();
    envelope.set_encrypted_data(encrypted_data);
    envelope.set_nonce(nonce);
    envelope.set_tag(tag);
    envelope
}