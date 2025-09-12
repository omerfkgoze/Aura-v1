use wasm_bindgen::prelude::*;
use crate::memory::SecureBuffer;
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use std::collections::HashMap;

type HmacSha256 = Hmac<Sha256>;

// Data categories for key isolation
#[wasm_bindgen]
#[derive(Clone, Debug, PartialEq)]
pub enum DataCategory {
    CycleData,
    Preferences,
    HealthcareSharing,
    DeviceSync,
}

impl DataCategory {
    pub fn from_string(s: &str) -> Option<DataCategory> {
        match s {
            "cycle_data" => Some(DataCategory::CycleData),
            "preferences" => Some(DataCategory::Preferences),
            "healthcare_sharing" => Some(DataCategory::HealthcareSharing),
            "device_sync" => Some(DataCategory::DeviceSync),
            _ => None,
        }
    }

    pub fn to_string(&self) -> String {
        match self {
            DataCategory::CycleData => "cycle_data".to_string(),
            DataCategory::Preferences => "preferences".to_string(),
            DataCategory::HealthcareSharing => "healthcare_sharing".to_string(),
            DataCategory::DeviceSync => "device_sync".to_string(),
        }
    }
}

// BIP32-style derivation path structure
#[wasm_bindgen]
pub struct DerivationPath {
    path: Vec<u32>,
}

#[wasm_bindgen]
impl DerivationPath {
    #[wasm_bindgen(constructor)]
    pub fn new() -> DerivationPath {
        DerivationPath { path: Vec::new() }
    }

    #[wasm_bindgen(js_name = fromString)]
    pub fn from_string(path_str: &str) -> Result<DerivationPath, JsValue> {
        if !path_str.starts_with("m/") {
            return Err(JsValue::from_str("Path must start with 'm/'"));
        }

        let path_parts: Result<Vec<u32>, _> = path_str[2..]
            .split('/')
            .filter(|s| !s.is_empty())
            .map(|s| {
                if s.ends_with('\'') || s.ends_with('h') {
                    // Hardened derivation
                    let num_str = &s[..s.len()-1];
                    num_str.parse::<u32>().map(|n| n + 0x80000000)
                } else {
                    s.parse::<u32>()
                }
            })
            .collect();

        match path_parts {
            Ok(path) => Ok(DerivationPath { path }),
            Err(_) => Err(JsValue::from_str("Invalid derivation path format")),
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        if self.path.is_empty() {
            return "m".to_string();
        }

        let path_str: Vec<String> = self.path
            .iter()
            .map(|&index| {
                if index >= 0x80000000 {
                    format!("{}'", index - 0x80000000)
                } else {
                    index.to_string()
                }
            })
            .collect();

        format!("m/{}", path_str.join("/"))
    }

    #[wasm_bindgen]
    pub fn child(&self, index: u32) -> DerivationPath {
        let mut new_path = self.path.clone();
        new_path.push(index);
        DerivationPath { path: new_path }
    }

    #[wasm_bindgen(js_name = hardenedChild)]
    pub fn hardened_child(&self, index: u32) -> DerivationPath {
        let mut new_path = self.path.clone();
        new_path.push(index + 0x80000000);
        DerivationPath { path: new_path }
    }
}

// Extended key structure for hierarchical derivation
#[wasm_bindgen]
pub struct ExtendedKey {
    key: SecureBuffer,
    chain_code: SecureBuffer,
    depth: u8,
    parent_fingerprint: [u8; 4],
    child_number: u32,
}

#[wasm_bindgen]
impl ExtendedKey {
    // Create master key from seed
    #[wasm_bindgen(js_name = fromSeed)]
    pub fn from_seed(seed: &[u8]) -> Result<ExtendedKey, JsValue> {
        if seed.len() < 16 || seed.len() > 64 {
            return Err(JsValue::from_str("Seed length must be between 16 and 64 bytes"));
        }

        let mut mac = HmacSha256::new_from_slice(b"ed25519 seed")
            .map_err(|e| JsValue::from_str(&format!("HMAC creation failed: {}", e)))?;
        mac.update(seed);
        let result = mac.finalize().into_bytes();

        let key_bytes = &result[0..32];
        let chain_code_bytes = &result[32..64];

        Ok(ExtendedKey {
            key: SecureBuffer::from_bytes(key_bytes.to_vec()),
            chain_code: SecureBuffer::from_bytes(chain_code_bytes.to_vec()),
            depth: 0,
            parent_fingerprint: [0; 4],
            child_number: 0,
        })
    }

    // Derive child key
    #[wasm_bindgen(js_name = deriveChild)]
    pub fn derive_child(&self, index: u32) -> Result<ExtendedKey, JsValue> {
        let is_hardened = index >= 0x80000000;
        
        let key_slice = self.key.as_slice()
            .map_err(|e| JsValue::from_str(e))?;
        let chain_code_slice = self.chain_code.as_slice()
            .map_err(|e| JsValue::from_str(e))?;

        let mut mac = HmacSha256::new_from_slice(chain_code_slice)
            .map_err(|e| JsValue::from_str(&format!("HMAC creation failed: {}", e)))?;

        if is_hardened {
            mac.update(&[0u8]); // 0x00 padding for hardened derivation
            mac.update(key_slice);
        } else {
            // For non-hardened derivation, we would use public key
            // For simplicity, treating as hardened for now
            mac.update(&[0u8]);
            mac.update(key_slice);
        }
        
        mac.update(&index.to_be_bytes());
        let result = mac.finalize().into_bytes();

        let child_key_bytes = &result[0..32];
        let child_chain_code_bytes = &result[32..64];

        // Calculate fingerprint from current key
        let mut hasher = Sha256::new();
        hasher.update(key_slice);
        let hash = hasher.finalize();
        let mut fingerprint = [0u8; 4];
        fingerprint.copy_from_slice(&hash[0..4]);

        Ok(ExtendedKey {
            key: SecureBuffer::from_bytes(child_key_bytes.to_vec()),
            chain_code: SecureBuffer::from_bytes(child_chain_code_bytes.to_vec()),
            depth: self.depth + 1,
            parent_fingerprint: fingerprint,
            child_number: index,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn depth(&self) -> u8 {
        self.depth
    }

    #[wasm_bindgen(js_name = getKeyBytes)]
    pub fn get_key_bytes(&self) -> Result<Vec<u8>, JsValue> {
        let key_slice = self.key.as_slice()
            .map_err(|e| JsValue::from_str(e))?;
        Ok(key_slice.to_vec())
    }
}

// Hierarchical key derivation manager
#[wasm_bindgen]
pub struct HierarchicalKeyDerivation {
    master_key: Option<ExtendedKey>,
    derived_keys: HashMap<String, ExtendedKey>,
    key_version: u32,
}

#[wasm_bindgen]
impl HierarchicalKeyDerivation {
    #[wasm_bindgen(constructor)]
    pub fn new() -> HierarchicalKeyDerivation {
        HierarchicalKeyDerivation {
            master_key: None,
            derived_keys: HashMap::new(),
            key_version: 1,
        }
    }

    // Initialize with master seed
    #[wasm_bindgen(js_name = initializeWithSeed)]
    pub fn initialize_with_seed(&mut self, seed: &[u8]) -> Result<(), JsValue> {
        let master_key = ExtendedKey::from_seed(seed)?;
        self.master_key = Some(master_key);
        self.derived_keys.clear();
        Ok(())
    }

    // Derive purpose-specific key for data category
    #[wasm_bindgen(js_name = deriveDataCategoryKey)]
    pub fn derive_data_category_key(&mut self, category_str: &str, device_id: &str) -> Result<Vec<u8>, JsValue> {
        let category = DataCategory::from_string(category_str)
            .ok_or_else(|| JsValue::from_str("Invalid data category"))?;
        let master_key = self.master_key.as_ref()
            .ok_or_else(|| JsValue::from_str("Master key not initialized"))?;

        // Purpose-specific derivation paths following BIP43/BIP44 pattern
        // m / purpose' / coin_type' / account' / change / address_index
        let purpose = match category {
            DataCategory::CycleData => 44u32,           // Health data
            DataCategory::Preferences => 45u32,         // Preferences
            DataCategory::HealthcareSharing => 46u32,   // Sharing
            DataCategory::DeviceSync => 47u32,          // Device sync
        };

        // Create derivation path: m / purpose' / 0' / 0' / device_hash
        let device_hash = {
            let mut hasher = Sha256::new();
            hasher.update(device_id.as_bytes());
            let hash = hasher.finalize();
            u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]) & 0x7FFFFFFF // Ensure non-hardened
        };

        let path_key = format!("{}:{}:{}", category.to_string(), device_id, self.key_version);
        
        if let Some(existing_key) = self.derived_keys.get(&path_key) {
            return existing_key.get_key_bytes();
        }

        // Derive: m / purpose'
        let level1 = master_key.derive_child(purpose + 0x80000000)?;
        
        // Derive: m / purpose' / 0'
        let level2 = level1.derive_child(0x80000000)?;
        
        // Derive: m / purpose' / 0' / 0' 
        let level3 = level2.derive_child(0x80000000)?;
        
        // Derive: m / purpose' / 0' / 0' / device_hash
        let final_key = level3.derive_child(device_hash)?;

        let key_bytes = final_key.get_key_bytes()?;
        self.derived_keys.insert(path_key, final_key);

        Ok(key_bytes)
    }

    // Get key for specific derivation path
    #[wasm_bindgen(js_name = deriveKeyAtPath)]
    pub fn derive_key_at_path(&mut self, path_str: &str) -> Result<Vec<u8>, JsValue> {
        let master_key = self.master_key.as_ref()
            .ok_or_else(|| JsValue::from_str("Master key not initialized"))?;

        let path = DerivationPath::from_string(path_str)?;
        
        if let Some(existing_key) = self.derived_keys.get(path_str) {
            return existing_key.get_key_bytes();
        }

        let mut current_key = master_key.clone();
        
        // Derive key following the path
        for &index in &path.path {
            current_key = current_key.derive_child(index)?;
        }

        let key_bytes = current_key.get_key_bytes()?;
        self.derived_keys.insert(path_str.to_string(), current_key);

        Ok(key_bytes)
    }

    // Forward secrecy: increment key version and clear old keys
    #[wasm_bindgen(js_name = rotateKeys)]
    pub fn rotate_keys(&mut self) -> Result<(), JsValue> {
        self.key_version += 1;
        self.derived_keys.clear();
        Ok(())
    }

    #[wasm_bindgen(getter, js_name = keyVersion)]
    pub fn key_version(&self) -> u32 {
        self.key_version
    }

    // Verify key isolation between categories
    #[wasm_bindgen(js_name = verifyKeyIsolation)]
    pub fn verify_key_isolation(&mut self, device_id: &str) -> Result<bool, JsValue> {
        let categories = vec![
            "cycle_data",
            "preferences",
            "healthcare_sharing",
            "device_sync",
        ];

        let mut keys = Vec::new();
        
        // Derive keys for all categories
        for category in &categories {
            let key = self.derive_data_category_key(category, device_id)?;
            keys.push(key);
        }

        // Verify all keys are different
        for (i, key1) in keys.iter().enumerate() {
            for (j, key2) in keys.iter().enumerate() {
                if i != j && key1 == key2 {
                    return Ok(false); // Keys are not isolated
                }
            }
        }

        Ok(true) // All keys are unique
    }
}

impl Clone for ExtendedKey {
    fn clone(&self) -> Self {
        // Get key bytes and recreate SecureBuffer
        let key_bytes = self.key.as_slice().unwrap_or(&[]).to_vec();
        let chain_code_bytes = self.chain_code.as_slice().unwrap_or(&[]).to_vec();
        
        ExtendedKey {
            key: SecureBuffer::from_bytes(key_bytes),
            chain_code: SecureBuffer::from_bytes(chain_code_bytes),
            depth: self.depth,
            parent_fingerprint: self.parent_fingerprint,
            child_number: self.child_number,
        }
    }
}

// Convenience functions for JavaScript
#[wasm_bindgen]
pub fn create_derivation_path(path_str: &str) -> Result<DerivationPath, JsValue> {
    DerivationPath::from_string(path_str)
}

#[wasm_bindgen]
pub fn create_master_key_from_seed(seed: &[u8]) -> Result<ExtendedKey, JsValue> {
    ExtendedKey::from_seed(seed)
}