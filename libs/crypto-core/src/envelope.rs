use wasm_bindgen::prelude::*;
use zeroize::Zeroize;

// Crypto envelope version for compatibility
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EnvelopeVersion {
    V1 = 1,
    V2 = 2,
}

// Algorithm identifier for crypto operations
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CryptoAlgorithm {
    AES256GCM = 1,
    ChaCha20Poly1305 = 2,
}

// KDF parameters for key derivation
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct KDFParams {
    algorithm: String,
    iterations: u32,
    memory_cost: Option<u32>,
    parallelism: Option<u32>,
}

// Crypto envelope for secure data handling with complete metadata
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct CryptoEnvelope {
    version: EnvelopeVersion,
    algorithm: CryptoAlgorithm,
    kdf_params: Option<KDFParams>,
    salt: Vec<u8>,
    nonce: Vec<u8>,
    key_id: Option<String>,
    encrypted_data: Vec<u8>,
    tag: Vec<u8>,
    aad_hash: Vec<u8>,
}

impl Default for CryptoEnvelope {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl KDFParams {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(algorithm: String, iterations: u32) -> KDFParams {
        KDFParams {
            algorithm,
            iterations,
            memory_cost: None,
            parallelism: None,
        }
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn algorithm(&self) -> String {
        self.algorithm.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn iterations(&self) -> u32 {
        self.iterations
    }

    #[wasm_bindgen]
    pub fn set_memory_cost(&mut self, memory_cost: u32) {
        self.memory_cost = Some(memory_cost);
    }

    #[wasm_bindgen]
    pub fn set_parallelism(&mut self, parallelism: u32) {
        self.parallelism = Some(parallelism);
    }
}

#[wasm_bindgen]
impl CryptoEnvelope {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new() -> CryptoEnvelope {
        CryptoEnvelope {
            version: EnvelopeVersion::V2,
            algorithm: CryptoAlgorithm::AES256GCM,
            kdf_params: None,
            salt: Vec::new(),
            nonce: Vec::new(),
            key_id: None,
            encrypted_data: Vec::new(),
            tag: Vec::new(),
            aad_hash: Vec::new(),
        }
    }

    // Getters for all envelope fields
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn version(&self) -> u8 {
        self.version as u8
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn algorithm(&self) -> u8 {
        self.algorithm as u8
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn salt(&self) -> Vec<u8> {
        self.salt.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn nonce(&self) -> Vec<u8> {
        self.nonce.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn key_id(&self) -> Option<String> {
        self.key_id.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn encrypted_data(&self) -> Vec<u8> {
        self.encrypted_data.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn tag(&self) -> Vec<u8> {
        self.tag.clone()
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn aad_hash(&self) -> Vec<u8> {
        self.aad_hash.clone()
    }

    // Setters for envelope construction
    #[wasm_bindgen]
    pub fn set_version(&mut self, version: u8) -> Result<(), JsValue> {
        match version {
            1 => self.version = EnvelopeVersion::V1,
            2 => self.version = EnvelopeVersion::V2,
            _ => return Err(JsValue::from_str("Unsupported envelope version")),
        }
        Ok(())
    }

    #[wasm_bindgen]
    pub fn set_algorithm(&mut self, algorithm: u8) -> Result<(), JsValue> {
        match algorithm {
            1 => self.algorithm = CryptoAlgorithm::AES256GCM,
            2 => self.algorithm = CryptoAlgorithm::ChaCha20Poly1305,
            _ => return Err(JsValue::from_str("Unsupported algorithm")),
        }
        Ok(())
    }

    #[wasm_bindgen]
    pub fn set_kdf_params(&mut self, params: KDFParams) {
        self.kdf_params = Some(params);
    }

    #[wasm_bindgen]
    pub fn set_salt(&mut self, salt: Vec<u8>) {
        self.salt = salt;
    }

    #[wasm_bindgen]
    pub fn set_nonce(&mut self, nonce: Vec<u8>) {
        self.nonce = nonce;
    }

    #[wasm_bindgen]
    pub fn set_key_id(&mut self, key_id: String) {
        self.key_id = Some(key_id);
    }

    #[wasm_bindgen]
    pub fn set_encrypted_data(&mut self, data: Vec<u8>) {
        self.encrypted_data = data;
    }

    #[wasm_bindgen]
    pub fn set_tag(&mut self, tag: Vec<u8>) {
        self.tag = tag;
    }

    #[wasm_bindgen]
    pub fn set_aad_hash(&mut self, aad_hash: Vec<u8>) {
        self.aad_hash = aad_hash;
    }

    // Validation methods
    #[wasm_bindgen]
    #[must_use]
    pub fn is_valid(&self) -> bool {
        !self.encrypted_data.is_empty() &&
        !self.nonce.is_empty() &&
        !self.tag.is_empty() &&
        !self.salt.is_empty() &&
        !self.aad_hash.is_empty()
    }

    #[wasm_bindgen]
    #[must_use]
    pub fn validate_integrity(&self) -> Result<bool, JsValue> {
        if !self.is_valid() {
            return Ok(false);
        }
        
        // Additional integrity checks
        match self.algorithm {
            CryptoAlgorithm::AES256GCM => {
                if self.tag.len() != 16 {
                    return Err(JsValue::from_str("Invalid tag length for AES-GCM"));
                }
            },
            CryptoAlgorithm::ChaCha20Poly1305 => {
                if self.tag.len() != 16 {
                    return Err(JsValue::from_str("Invalid tag length for ChaCha20-Poly1305"));
                }
            },
        }
        
        Ok(true)
    }
}

impl Drop for CryptoEnvelope {
    fn drop(&mut self) {
        // Zeroize all sensitive data when dropped
        self.salt.zeroize();
        self.nonce.zeroize();
        self.encrypted_data.zeroize();
        self.tag.zeroize();
        self.aad_hash.zeroize();
    }
}

impl Drop for KDFParams {
    fn drop(&mut self) {
        self.algorithm.zeroize();
    }
}

// Create a crypto envelope from components with full metadata
#[wasm_bindgen]
#[must_use]
pub fn create_envelope_with_metadata(
    version: u8,
    algorithm: u8,
    salt: Vec<u8>,
    nonce: Vec<u8>,
    encrypted_data: Vec<u8>,
    tag: Vec<u8>,
    aad_hash: Vec<u8>,
) -> Result<CryptoEnvelope, JsValue> {
    let mut envelope = CryptoEnvelope::new();
    envelope.set_version(version)?;
    envelope.set_algorithm(algorithm)?;
    envelope.set_salt(salt);
    envelope.set_nonce(nonce);
    envelope.set_encrypted_data(encrypted_data);
    envelope.set_tag(tag);
    envelope.set_aad_hash(aad_hash);
    
    // Validate the envelope before returning
    envelope.validate_integrity()?;
    Ok(envelope)
}

// Create a basic envelope (backward compatibility)
#[wasm_bindgen]
#[must_use]
pub fn create_envelope(encrypted_data: Vec<u8>, nonce: Vec<u8>, tag: Vec<u8>) -> CryptoEnvelope {
    let mut envelope = CryptoEnvelope::new();
    envelope.set_encrypted_data(encrypted_data);
    envelope.set_nonce(nonce);
    envelope.set_tag(tag);
    envelope
}

// Envelope serialization for database storage (JSONB compatible)
#[wasm_bindgen]
#[must_use]
pub fn serialize_envelope(envelope: &CryptoEnvelope) -> Result<String, JsValue> {
    use serde_json::json;
    
    let json_obj = json!({
        "version": envelope.version() as u8,
        "algorithm": envelope.algorithm() as u8,
        "salt": base64_encode(&envelope.salt()),
        "nonce": base64_encode(&envelope.nonce()),
        "key_id": envelope.key_id(),
        "encrypted_data": base64_encode(&envelope.encrypted_data()),
        "tag": base64_encode(&envelope.tag()),
        "aad_hash": base64_encode(&envelope.aad_hash())
    });
    
    serde_json::to_string(&json_obj)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

// Envelope deserialization from database (JSONB compatible)
#[wasm_bindgen]
#[must_use]
pub fn deserialize_envelope(json_str: &str) -> Result<CryptoEnvelope, JsValue> {
    let json_val: serde_json::Value = serde_json::from_str(json_str)
        .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;
    
    let mut envelope = CryptoEnvelope::new();
    
    if let Some(version) = json_val["version"].as_u64() {
        envelope.set_version(version as u8)?;
    }
    
    if let Some(algorithm) = json_val["algorithm"].as_u64() {
        envelope.set_algorithm(algorithm as u8)?;
    }
    
    if let Some(salt_b64) = json_val["salt"].as_str() {
        envelope.set_salt(base64_decode(salt_b64)?);
    }
    
    if let Some(nonce_b64) = json_val["nonce"].as_str() {
        envelope.set_nonce(base64_decode(nonce_b64)?);
    }
    
    if let Some(key_id) = json_val["key_id"].as_str() {
        envelope.set_key_id(key_id.to_string());
    }
    
    if let Some(data_b64) = json_val["encrypted_data"].as_str() {
        envelope.set_encrypted_data(base64_decode(data_b64)?);
    }
    
    if let Some(tag_b64) = json_val["tag"].as_str() {
        envelope.set_tag(base64_decode(tag_b64)?);
    }
    
    if let Some(aad_b64) = json_val["aad_hash"].as_str() {
        envelope.set_aad_hash(base64_decode(aad_b64)?);
    }
    
    envelope.validate_integrity()?;
    Ok(envelope)
}

// Base64 encoding helper
fn base64_encode(data: &[u8]) -> String {
    // Simple base64 implementation for WASM
    use std::collections::HashMap;
    
    const CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let chars: Vec<char> = CHARS.chars().collect();
    
    let mut result = String::new();
    let mut i = 0;
    
    while i < data.len() {
        let a = data[i] as usize;
        let b = if i + 1 < data.len() { data[i + 1] as usize } else { 0 };
        let c = if i + 2 < data.len() { data[i + 2] as usize } else { 0 };
        
        let bitmap = (a << 16) | (b << 8) | c;
        
        result.push(chars[(bitmap >> 18) & 63]);
        result.push(chars[(bitmap >> 12) & 63]);
        result.push(if i + 1 < data.len() { chars[(bitmap >> 6) & 63] } else { '=' });
        result.push(if i + 2 < data.len() { chars[bitmap & 63] } else { '=' });
        
        i += 3;
    }
    
    result
}

// Base64 decoding helper
fn base64_decode(encoded: &str) -> Result<Vec<u8>, JsValue> {
    // Simple base64 decoding for WASM
    use std::collections::HashMap;
    
    const CHARS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut char_map = HashMap::new();
    for (i, c) in CHARS.chars().enumerate() {
        char_map.insert(c, i);
    }
    
    let cleaned: String = encoded.chars().filter(|c| *c != '=').collect();
    let mut result = Vec::new();
    let mut i = 0;
    
    while i + 3 < cleaned.len() {
        let chars: Vec<char> = cleaned.chars().skip(i).take(4).collect();
        let values: Result<Vec<usize>, _> = chars.iter()
            .map(|c| char_map.get(c).copied().ok_or("Invalid base64 character"))
            .collect();
        
        let values = values.map_err(|e| JsValue::from_str(e))?;
        let bitmap = (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];
        
        result.push((bitmap >> 16) as u8);
        result.push((bitmap >> 8) as u8);
        result.push(bitmap as u8);
        
        i += 4;
    }
    
    // Handle remaining characters
    if i < cleaned.len() {
        let remaining: Vec<char> = cleaned.chars().skip(i).collect();
        if remaining.len() >= 2 {
            let values: Result<Vec<usize>, _> = remaining.iter()
                .map(|c| char_map.get(c).copied().ok_or("Invalid base64 character"))
                .collect();
            
            let values = values.map_err(|e| JsValue::from_str(e))?;
            let bitmap = (values[0] << 18) | (values[1] << 12) |
                         (if values.len() > 2 { values[2] << 6 } else { 0 }) |
                         (if values.len() > 3 { values[3] } else { 0 });
            
            result.push((bitmap >> 16) as u8);
            if remaining.len() > 2 {
                result.push((bitmap >> 8) as u8);
            }
            if remaining.len() > 3 {
                result.push(bitmap as u8);
            }
        }
    }
    
    Ok(result)
}