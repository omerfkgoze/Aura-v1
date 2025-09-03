use wasm_bindgen::prelude::*;

// Additional Authenticated Data (AAD) validation logic
#[wasm_bindgen]
pub struct AADValidator {
    context: String,
    user_id: Option<String>,
    timestamp: Option<u64>,
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

    // Generate AAD for cryptographic operations
    #[wasm_bindgen]
    #[must_use]
    pub fn generate_aad(&self) -> Vec<u8> {
        let mut aad = Vec::new();
        
        // Add context
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
        
        aad
    }

    // Validate AAD matches expected format
    #[wasm_bindgen]
    #[must_use]
    pub fn validate_aad(&self, provided_aad: &[u8]) -> bool {
        let expected_aad = self.generate_aad();
        provided_aad == expected_aad
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