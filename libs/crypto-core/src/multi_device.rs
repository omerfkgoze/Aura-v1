use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::memory::{track_secret_allocation, track_secret_zeroization};
use crate::keys::CryptoKey;
// use crate::derivation::HierarchicalKeyDerivation; // Unused import removed

/// Device pairing request containing public key and device metadata
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePairingRequest {
    device_id: String,
    device_name: String,
    device_type: String,
    public_key: Vec<u8>,
    challenge_nonce: Vec<u8>,
    timestamp: u64,
}

#[wasm_bindgen]
impl DevicePairingRequest {
    #[wasm_bindgen(constructor)]
    pub fn new(
        device_id: String,
        device_name: String,
        device_type: String,
        public_key: Vec<u8>,
        challenge_nonce: Vec<u8>,
        timestamp: u64,
    ) -> Self {
        track_secret_allocation();
        Self {
            device_id,
            device_name,
            device_type,
            public_key,
            challenge_nonce,
            timestamp,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> String {
        self.device_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_name(&self) -> String {
        self.device_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_type(&self) -> String {
        self.device_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn challenge_nonce(&self) -> Vec<u8> {
        self.challenge_nonce.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn timestamp(&self) -> u64 {
        self.timestamp
    }
}

/// Device pairing response with authentication proof
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePairingResponse {
    device_id: String,
    response_signature: Vec<u8>,
    shared_secret_hash: Vec<u8>,
    device_trust_token: String,
    timestamp: u64,
}

#[wasm_bindgen]
impl DevicePairingResponse {
    #[wasm_bindgen(constructor)]
    pub fn new(
        device_id: String,
        response_signature: Vec<u8>,
        shared_secret_hash: Vec<u8>,
        device_trust_token: String,
        timestamp: u64,
    ) -> Self {
        track_secret_allocation();
        Self {
            device_id,
            response_signature,
            shared_secret_hash,
            device_trust_token,
            timestamp,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> String {
        self.device_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn response_signature(&self) -> Vec<u8> {
        self.response_signature.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn shared_secret_hash(&self) -> Vec<u8> {
        self.shared_secret_hash.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_trust_token(&self) -> String {
        self.device_trust_token.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn timestamp(&self) -> u64 {
        self.timestamp
    }
}

/// Device trust status and synchronization state
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceStatus {
    Unknown = 0,
    Pending = 1,
    Trusted = 2,
    Revoked = 3,
    Expired = 4,
}

/// Device registry entry containing trust information
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRegistryEntry {
    device_id: String,
    device_name: String,
    device_type: String,
    status: u8, // DeviceStatus as u8 for WASM compatibility
    trust_token: String,
    public_key: Vec<u8>,
    last_sync: u64,
    trust_score: f64,
    created_at: u64,
    updated_at: u64,
}

#[wasm_bindgen]
impl DeviceRegistryEntry {
    #[wasm_bindgen(constructor)]
    pub fn new(
        device_id: String,
        device_name: String,
        device_type: String,
        status: u8,
        trust_token: String,
        public_key: Vec<u8>,
        last_sync: u64,
        trust_score: f64,
        created_at: u64,
        updated_at: u64,
    ) -> Self {
        Self {
            device_id,
            device_name,
            device_type,
            status,
            trust_token,
            public_key,
            last_sync,
            trust_score,
            created_at,
            updated_at,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> String {
        self.device_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_name(&self) -> String {
        self.device_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_type(&self) -> String {
        self.device_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn status(&self) -> u8 {
        self.status
    }

    #[wasm_bindgen(setter)]
    pub fn set_status(&mut self, status: u8) {
        self.status = status;
        self.updated_at = js_sys::Date::now() as u64;
    }

    #[wasm_bindgen(getter)]
    pub fn trust_token(&self) -> String {
        self.trust_token.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn last_sync(&self) -> u64 {
        self.last_sync
    }

    #[wasm_bindgen(setter)]
    pub fn set_last_sync(&mut self, timestamp: u64) {
        self.last_sync = timestamp;
        self.updated_at = js_sys::Date::now() as u64;
    }

    #[wasm_bindgen(getter)]
    pub fn trust_score(&self) -> f64 {
        self.trust_score
    }

    #[wasm_bindgen(setter)]
    pub fn set_trust_score(&mut self, score: f64) {
        self.trust_score = score.max(0.0).min(1.0); // Clamp to [0,1]
        self.updated_at = js_sys::Date::now() as u64;
    }

    #[wasm_bindgen(getter)]
    pub fn created_at(&self) -> u64 {
        self.created_at
    }

    #[wasm_bindgen(getter)]
    pub fn updated_at(&self) -> u64 {
        self.updated_at
    }

    /// Check if device entry is expired based on timestamp
    #[wasm_bindgen]
    pub fn is_expired(&self, ttl_seconds: u64) -> bool {
        let now = js_sys::Date::now() as u64;
        (now - self.last_sync) > (ttl_seconds * 1000)
    }

    /// Check if device is in trusted state
    #[wasm_bindgen]
    pub fn is_trusted(&self) -> bool {
        self.status == DeviceStatus::Trusted as u8
    }

    /// Check if device is revoked
    #[wasm_bindgen]
    pub fn is_revoked(&self) -> bool {
        self.status == DeviceStatus::Revoked as u8
    }
}

/// Multi-device key exchange protocol manager
#[wasm_bindgen]
pub struct MultiDeviceProtocol {
    device_registry: HashMap<String, DeviceRegistryEntry>,
    master_key: Option<CryptoKey>,
    current_device_id: String,
    trust_threshold: f64,
    max_devices: usize,
}

#[wasm_bindgen]
impl MultiDeviceProtocol {
    /// Create new multi-device protocol manager
    #[wasm_bindgen(constructor)]
    pub fn new(current_device_id: String, trust_threshold: f64, max_devices: usize) -> Self {
        Self {
            device_registry: HashMap::new(),
            master_key: None,
            current_device_id,
            trust_threshold: trust_threshold.max(0.0).min(1.0), // Clamp to [0,1]
            max_devices,
        }
    }

    /// Initialize protocol with hierarchical master key
    #[wasm_bindgen]
    pub fn initialize(&mut self, master_key: &CryptoKey) -> Result<(), JsValue> {
        self.master_key = Some(master_key.clone());
        Ok(())
    }

    /// Generate device pairing request for initiating device pairing
    #[wasm_bindgen]
    pub fn generate_pairing_request(
        &self,
        device_name: String,
        device_type: String,
    ) -> Result<DevicePairingRequest, JsValue> {
        // Generate ephemeral public key for this pairing session
        let mut public_key = vec![0u8; 32]; // Mock 32-byte public key
        let mut challenge_nonce = vec![0u8; 16]; // Mock 16-byte nonce
        
        // In real implementation, use secure random generation
        for (i, byte) in public_key.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(7).wrapping_add(13);
        }
        
        for (i, byte) in challenge_nonce.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(11).wrapping_add(17);
        }

        let timestamp = js_sys::Date::now() as u64;

        Ok(DevicePairingRequest::new(
            self.current_device_id.clone(),
            device_name,
            device_type,
            public_key,
            challenge_nonce,
            timestamp,
        ))
    }

    /// Process incoming pairing request and generate response
    #[wasm_bindgen]
    pub fn process_pairing_request(
        &mut self,
        request: &DevicePairingRequest,
    ) -> Result<DevicePairingResponse, JsValue> {
        // Validate request timestamp (within 5 minutes)
        let now = js_sys::Date::now() as u64;
        let max_age = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (now - request.timestamp()) > max_age {
            return Err(JsValue::from_str("Pairing request expired"));
        }

        // Check device registry capacity
        if self.device_registry.len() >= self.max_devices {
            return Err(JsValue::from_str("Maximum device limit reached"));
        }

        // Generate response signature (mock implementation)
        let mut response_signature = vec![0u8; 64]; // Mock 64-byte signature
        let mut shared_secret_hash = vec![0u8; 32]; // Mock 32-byte hash
        
        for (i, byte) in response_signature.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(23).wrapping_add(31);
        }
        
        for (i, byte) in shared_secret_hash.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(29).wrapping_add(37);
        }

        // Generate device trust token
        let device_trust_token = format!(
            "trust_{}_{}", 
            request.device_id(),
            now
        );

        // Create device registry entry as pending
        let device_entry = DeviceRegistryEntry::new(
            request.device_id(),
            request.device_name(),
            request.device_type(),
            DeviceStatus::Pending as u8,
            device_trust_token.clone(),
            request.public_key(),
            now,
            0.5, // Initial trust score
            now,
            now,
        );

        self.device_registry.insert(request.device_id(), device_entry);

        Ok(DevicePairingResponse::new(
            self.current_device_id.clone(),
            response_signature,
            shared_secret_hash,
            device_trust_token,
            now,
        ))
    }

    /// Finalize device pairing after successful response validation
    #[wasm_bindgen]
    pub fn finalize_pairing(
        &mut self,
        device_id: String,
        validated: bool,
    ) -> Result<(), JsValue> {
        let device_entry = self.device_registry
            .get_mut(&device_id)
            .ok_or_else(|| JsValue::from_str("Device not found in registry"))?;

        if validated {
            device_entry.set_status(DeviceStatus::Trusted as u8);
            device_entry.set_trust_score(1.0);
        } else {
            device_entry.set_status(DeviceStatus::Revoked as u8);
            device_entry.set_trust_score(0.0);
        }

        Ok(())
    }

    /// Revoke device access and remove from trusted devices
    #[wasm_bindgen]
    pub fn revoke_device(&mut self, device_id: String) -> Result<(), JsValue> {
        let device_entry = self.device_registry
            .get_mut(&device_id)
            .ok_or_else(|| JsValue::from_str("Device not found in registry"))?;

        device_entry.set_status(DeviceStatus::Revoked as u8);
        device_entry.set_trust_score(0.0);
        
        track_secret_zeroization();
        Ok(())
    }

    /// Re-enroll previously revoked device
    #[wasm_bindgen]
    pub fn reenroll_device(&mut self, device_id: String) -> Result<(), JsValue> {
        let device_entry = self.device_registry
            .get_mut(&device_id)
            .ok_or_else(|| JsValue::from_str("Device not found in registry"))?;

        if device_entry.is_revoked() {
            device_entry.set_status(DeviceStatus::Pending as u8);
            device_entry.set_trust_score(0.5);
        } else {
            return Err(JsValue::from_str("Device is not in revoked state"));
        }

        Ok(())
    }

    /// Update device synchronization timestamp
    #[wasm_bindgen]
    pub fn update_device_sync(&mut self, device_id: String) -> Result<(), JsValue> {
        let device_entry = self.device_registry
            .get_mut(&device_id)
            .ok_or_else(|| JsValue::from_str("Device not found in registry"))?;

        let now = js_sys::Date::now() as u64;
        device_entry.set_last_sync(now);

        Ok(())
    }

    /// Get device trust status
    #[wasm_bindgen]
    pub fn get_device_status(&self, device_id: String) -> u8 {
        self.device_registry
            .get(&device_id)
            .map(|entry| entry.status())
            .unwrap_or(DeviceStatus::Unknown as u8)
    }

    /// Get list of trusted devices
    #[wasm_bindgen]
    pub fn get_trusted_devices(&self) -> Vec<JsValue> {
        self.device_registry
            .values()
            .filter(|entry| entry.is_trusted() && entry.trust_score >= self.trust_threshold)
            .map(|entry| {
                let obj = js_sys::Object::new();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("deviceId"),
                    &JsValue::from_str(&entry.device_id()),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("deviceName"),
                    &JsValue::from_str(&entry.device_name()),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("deviceType"),
                    &JsValue::from_str(&entry.device_type()),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("trustScore"),
                    &JsValue::from_f64(entry.trust_score()),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("lastSync"),
                    &JsValue::from_f64(entry.last_sync() as f64),
                ).unwrap();
                obj.into()
            })
            .collect()
    }

    /// Clean up expired devices from registry
    #[wasm_bindgen]
    pub fn cleanup_expired_devices(&mut self, ttl_seconds: u64) -> usize {
        let expired_devices: Vec<String> = self.device_registry
            .iter()
            .filter(|(_, entry)| entry.is_expired(ttl_seconds))
            .map(|(device_id, _)| device_id.clone())
            .collect();

        let count = expired_devices.len();
        
        for device_id in expired_devices {
            if let Some(entry) = self.device_registry.get_mut(&device_id) {
                entry.set_status(DeviceStatus::Expired as u8);
            }
        }

        track_secret_zeroization();
        count
    }

    /// Get device registry statistics
    #[wasm_bindgen]
    pub fn get_registry_stats(&self) -> JsValue {
        let trusted_count = self.device_registry.values()
            .filter(|entry| entry.is_trusted())
            .count();
        
        let revoked_count = self.device_registry.values()
            .filter(|entry| entry.is_revoked())
            .count();

        let pending_count = self.device_registry.values()
            .filter(|entry| entry.status() == DeviceStatus::Pending as u8)
            .count();

        let expired_count = self.device_registry.values()
            .filter(|entry| entry.status() == DeviceStatus::Expired as u8)
            .count();

        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &JsValue::from_str("total"), &JsValue::from_f64(self.device_registry.len() as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("trusted"), &JsValue::from_f64(trusted_count as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("revoked"), &JsValue::from_f64(revoked_count as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("pending"), &JsValue::from_f64(pending_count as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("expired"), &JsValue::from_f64(expired_count as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("maxDevices"), &JsValue::from_f64(self.max_devices as f64)).unwrap();
        obj.into()
    }

    /// Validate device authentication for cross-device operations
    #[wasm_bindgen]
    pub fn validate_device_auth(&self, device_id: String, auth_token: String) -> bool {
        if let Some(entry) = self.device_registry.get(&device_id) {
            entry.is_trusted() && 
            entry.trust_score >= self.trust_threshold &&
            entry.trust_token() == auth_token &&
            !entry.is_expired(24 * 3600) // 24 hour TTL
        } else {
            false
        }
    }

    /// Get device count
    #[wasm_bindgen]
    pub fn device_count(&self) -> usize {
        self.device_registry.len()
    }

    /// Check if device limit is reached
    #[wasm_bindgen]
    pub fn is_device_limit_reached(&self) -> bool {
        self.device_registry.len() >= self.max_devices
    }
}

impl Drop for MultiDeviceProtocol {
    fn drop(&mut self) {
        // Clear sensitive data when dropping
        self.device_registry.clear();
        track_secret_zeroization();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_pairing_request() {
        let request = DevicePairingRequest::new(
            "device1".to_string(),
            "iPhone 15".to_string(),
            "mobile".to_string(),
            vec![1, 2, 3, 4],
            vec![5, 6, 7, 8],
            1234567890,
        );

        assert_eq!(request.device_id(), "device1");
        assert_eq!(request.device_name(), "iPhone 15");
        assert_eq!(request.device_type(), "mobile");
        assert_eq!(request.public_key(), vec![1, 2, 3, 4]);
        assert_eq!(request.challenge_nonce(), vec![5, 6, 7, 8]);
        assert_eq!(request.timestamp(), 1234567890);
    }

    #[test]
    fn test_device_registry_entry() {
        let mut entry = DeviceRegistryEntry::new(
            "device1".to_string(),
            "iPhone 15".to_string(),
            "mobile".to_string(),
            DeviceStatus::Trusted as u8,
            "trust_token_123".to_string(),
            vec![1, 2, 3, 4],
            1234567890,
            0.9,
            1234567890,
            1234567890,
        );

        assert!(entry.is_trusted());
        assert!(!entry.is_revoked());
        assert_eq!(entry.trust_score(), 0.9);

        entry.set_status(DeviceStatus::Revoked as u8);
        assert!(!entry.is_trusted());
        assert!(entry.is_revoked());
    }

    #[test]
    fn test_multi_device_protocol() {
        let mut protocol = MultiDeviceProtocol::new(
            "current_device".to_string(),
            0.7,
            5,
        );

        assert_eq!(protocol.device_count(), 0);
        assert!(!protocol.is_device_limit_reached());

        // Test pairing request generation
        let request = protocol.generate_pairing_request(
            "Test Device".to_string(),
            "mobile".to_string(),
        ).unwrap();

        assert_eq!(request.device_id(), "current_device");
        assert_eq!(request.device_name(), "Test Device");
        assert_eq!(request.device_type(), "mobile");

        // Test pairing request processing
        let response = protocol.process_pairing_request(&request).unwrap();
        assert_eq!(response.device_id(), "current_device");

        assert_eq!(protocol.device_count(), 1);
        assert_eq!(protocol.get_device_status("current_device".to_string()), DeviceStatus::Pending as u8);

        // Test pairing finalization
        protocol.finalize_pairing("current_device".to_string(), true).unwrap();
        assert_eq!(protocol.get_device_status("current_device".to_string()), DeviceStatus::Trusted as u8);

        // Test device revocation
        protocol.revoke_device("current_device".to_string()).unwrap();
        assert_eq!(protocol.get_device_status("current_device".to_string()), DeviceStatus::Revoked as u8);

        // Test re-enrollment
        protocol.reenroll_device("current_device".to_string()).unwrap();
        assert_eq!(protocol.get_device_status("current_device".to_string()), DeviceStatus::Pending as u8);
    }

    #[test]
    fn test_device_authentication() {
        let mut protocol = MultiDeviceProtocol::new(
            "current_device".to_string(),
            0.8,
            3,
        );

        let request = protocol.generate_pairing_request(
            "Test Device".to_string(),
            "mobile".to_string(),
        ).unwrap();

        let response = protocol.process_pairing_request(&request).unwrap();
        protocol.finalize_pairing("current_device".to_string(), true).unwrap();

        // Valid authentication should pass
        assert!(protocol.validate_device_auth(
            "current_device".to_string(),
            response.device_trust_token(),
        ));

        // Invalid token should fail
        assert!(!protocol.validate_device_auth(
            "current_device".to_string(),
            "invalid_token".to_string(),
        ));

        // Non-existent device should fail
        assert!(!protocol.validate_device_auth(
            "non_existent".to_string(),
            response.device_trust_token(),
        ));
    }

    #[test]
    fn test_device_limit() {
        let mut protocol = MultiDeviceProtocol::new(
            "current_device".to_string(),
            0.5,
            2, // Limit to 2 devices
        );

        // Add first device
        let request1 = DevicePairingRequest::new(
            "device1".to_string(),
            "Device 1".to_string(),
            "mobile".to_string(),
            vec![1, 2, 3, 4],
            vec![5, 6, 7, 8],
            1234567890,
        );
        protocol.process_pairing_request(&request1).unwrap();

        // Add second device
        let request2 = DevicePairingRequest::new(
            "device2".to_string(),
            "Device 2".to_string(),
            "web".to_string(),
            vec![9, 10, 11, 12],
            vec![13, 14, 15, 16],
            1234567890,
        );
        protocol.process_pairing_request(&request2).unwrap();

        assert!(protocol.is_device_limit_reached());

        // Third device should fail
        let request3 = DevicePairingRequest::new(
            "device3".to_string(),
            "Device 3".to_string(),
            "desktop".to_string(),
            vec![17, 18, 19, 20],
            vec![21, 22, 23, 24],
            1234567890,
        );
        
        let result = protocol.process_pairing_request(&request3);
        assert!(result.is_err());
    }
}