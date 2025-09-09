use wasm_bindgen::prelude::*;
use crate::security::{constant_time_compare, SideChannelProtection, AuditTrail};
use sha2::{Sha256, Digest};

// Additional Authenticated Data (AAD) validation logic with security hardening
#[wasm_bindgen]
pub struct AADValidator {
    context: String,
    user_id: Option<String>,
    timestamp: Option<u64>,
    audit_trail: AuditTrail,
    hash_cache: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl AADValidator {
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new(context: String) -> AADValidator {
        AADValidator {
            context,
            user_id: None,
            timestamp: None,
            audit_trail: AuditTrail::new(100),
            hash_cache: None,
        }
    }

    #[wasm_bindgen]
    pub fn set_user_id(&mut self, user_id: String) {
        self.user_id = Some(user_id);
    }

    #[wasm_bindgen]
    pub fn set_timestamp(&mut self, timestamp: u64) {
        self.timestamp = Some(timestamp);
    }

    // Generate AAD for cryptographic operations with security hardening
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_aad(&mut self) -> Vec<u8> {
        // Add timing noise to prevent side-channel attacks
        SideChannelProtection::add_timing_noise();
        
        let mut aad = Vec::new();
        
        // Add context with constant-time operations
        aad.extend_from_slice(self.context.as_bytes());
        aad.push(0); // Separator
        
        // Add user ID if present
        if let Some(ref user_id) = self.user_id {
            aad.extend_from_slice(user_id.as_bytes());
        }
        aad.push(0); // Separator
        
        // Add timestamp if present
        if let Some(timestamp) = self.timestamp {
            aad.extend_from_slice(&timestamp.to_le_bytes());
        }
        
        // Compute and cache hash for integrity
        let mut hasher = Sha256::new();
        hasher.update(&aad);
        self.hash_cache = Some(hasher.finalize().to_vec());
        
        // Log operation for audit
        self.audit_trail.log_operation("aad_generation", "SHA256");
        
        aad
    }

    // Validate AAD matches expected format using constant-time comparison
    #[wasm_bindgen]
    #[must_use]
    pub fn validate_aad(&mut self, provided_aad: &[u8]) -> bool {
        let expected_aad = self.generate_aad();
        
        // Use constant-time comparison to prevent timing attacks
        let is_valid = constant_time_compare(provided_aad, &expected_aad);
        
        // Log validation attempt
        self.audit_trail.log_operation("aad_validation", "constant_time_compare");
        
        is_valid
    }
    
    // Get cached hash for integrity verification
    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn cached_hash(&self) -> Option<Vec<u8>> {
        self.hash_cache.clone()
    }
    
    // Clear sensitive cache data
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.hash_cache = None;
        self.audit_trail.clear();
    }

    #[wasm_bindgen(getter)]
    #[must_use]
    pub fn context(&self) -> String {
        self.context.clone()
    }
}

// Create AAD for cycle data encryption
#[wasm_bindgen]
#[must_use]
pub fn create_cycle_data_aad(user_id: String, timestamp: u64) -> Vec<u8> {
    let mut validator = AADValidator::new("cycle_data".to_string());
    validator.set_user_id(user_id);
    validator.set_timestamp(timestamp);
    validator.generate_aad()
}

// Create AAD for healthcare sharing
#[wasm_bindgen]
#[must_use]
pub fn create_healthcare_share_aad(user_id: String, share_token: &str) -> Vec<u8> {
    let mut validator = AADValidator::new("healthcare_share".to_string());
    validator.set_user_id(user_id);
    // Use share token as additional context
    let mut aad = validator.generate_aad();
    aad.extend_from_slice(share_token.as_bytes());
    aad
}