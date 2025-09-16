use wasm_bindgen::prelude::*;
// use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::derivation::DataCategory;
use crate::keys::CryptoKey;
use crate::memory::{track_secret_allocation, track_secret_zeroization};
use super::types::{KeyVersion, KeyStatus}; // KeyRotationError removed - unused

/// Legacy key retention policy for cleanup management
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct LegacyKeyRetentionPolicy {
    max_legacy_versions: u32,
    min_retention_days: u32,
    auto_cleanup_enabled: bool,
    require_migration_completion: bool,
}

#[wasm_bindgen]
impl LegacyKeyRetentionPolicy {
    #[wasm_bindgen(constructor)]
    pub fn new(max_legacy_versions: u32, min_retention_days: u32) -> Self {
        Self {
            max_legacy_versions,
            min_retention_days,
            auto_cleanup_enabled: true,
            require_migration_completion: true,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn max_legacy_versions(&self) -> u32 {
        self.max_legacy_versions
    }

    #[wasm_bindgen(getter)]
    pub fn min_retention_days(&self) -> u32 {
        self.min_retention_days
    }

    #[wasm_bindgen(setter)]
    pub fn set_auto_cleanup_enabled(&mut self, enabled: bool) {
        self.auto_cleanup_enabled = enabled;
    }

    #[wasm_bindgen(getter)]
    pub fn auto_cleanup_enabled(&self) -> bool {
        self.auto_cleanup_enabled
    }

    #[wasm_bindgen(setter)]
    pub fn set_require_migration_completion(&mut self, required: bool) {
        self.require_migration_completion = required;
    }

    #[wasm_bindgen(getter)]
    pub fn require_migration_completion(&self) -> bool {
        self.require_migration_completion
    }
}

/// A versioned cryptographic key with lifecycle management
#[wasm_bindgen]
#[derive(Clone)]
pub struct VersionedKey {
    key: CryptoKey,
    version: KeyVersion,
    status: KeyStatus,
    purpose: DataCategory,
    predecessor_versions: Vec<KeyVersion>, // Support multiple predecessors
    supported_decryption_versions: Vec<KeyVersion>, // Versions this key can decrypt
    migration_progress: f32, // 0.0 to 1.0
    audit_log: Vec<String>,
    creation_time: DateTime<Utc>,
    last_used_time: Option<DateTime<Utc>>,
    usage_count: u64,
    integrity_hash: Option<String>, // For validation
}

#[wasm_bindgen]
impl VersionedKey {
    #[wasm_bindgen(constructor)]
    pub fn new(key: CryptoKey, version: KeyVersion, purpose: DataCategory) -> Self {
        track_secret_allocation();
        
        let creation_time = Utc::now();
        let supported_versions = vec![version.clone()];
        
        Self {
            key,
            version: version.clone(),
            status: KeyStatus::Active,
            purpose,
            predecessor_versions: Vec::new(),
            supported_decryption_versions: supported_versions,
            migration_progress: 0.0,
            audit_log: vec![format!("Key created with version {} at {}", version.to_string(), creation_time)],
            creation_time,
            last_used_time: None,
            usage_count: 0,
            integrity_hash: None,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn key(&self) -> CryptoKey {
        self.key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> KeyVersion {
        self.version.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn status(&self) -> KeyStatus {
        self.status.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn purpose(&self) -> DataCategory {
        self.purpose.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn migration_progress(&self) -> f32 {
        self.migration_progress
    }

    #[wasm_bindgen(getter)]
    pub fn creation_time(&self) -> f64 {
        self.creation_time.timestamp_millis() as f64
    }

    #[wasm_bindgen(getter)]
    pub fn last_used_time(&self) -> Option<f64> {
        self.last_used_time.map(|dt| dt.timestamp_millis() as f64)
    }

    #[wasm_bindgen(getter)]
    pub fn usage_count(&self) -> u64 {
        self.usage_count
    }

    #[wasm_bindgen(getter)]
    pub fn integrity_hash(&self) -> Option<String> {
        self.integrity_hash.clone()
    }

    #[wasm_bindgen]
    pub fn get_audit_log(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        for entry in &self.audit_log {
            array.push(&JsValue::from_str(entry));
        }
        array
    }

    #[wasm_bindgen]
    pub fn set_status(&mut self, status: KeyStatus) {
        let old_status = self.status.clone();
        self.status = status;
        self.audit_log.push(format!("Status changed from {:?} to {:?} at {}", 
            old_status, self.status, Utc::now()));
    }

    #[wasm_bindgen]
    pub fn set_migration_progress(&mut self, progress: f32) {
        let clamped_progress = progress.clamp(0.0, 1.0);
        self.migration_progress = clamped_progress;
        self.audit_log.push(format!("Migration progress updated to {:.1}% at {}", 
            clamped_progress * 100.0, Utc::now()));
    }

    #[wasm_bindgen]
    pub fn is_usable(&self) -> bool {
        matches!(self.status, KeyStatus::Active | KeyStatus::Migrating) 
            && !self.version.is_expired()
    }

    #[wasm_bindgen]
    pub fn can_decrypt_data_from_version(&self, data_version: &KeyVersion) -> bool {
        // Can decrypt if version is in supported decryption versions list
        self.supported_decryption_versions.contains(data_version)
    }

    #[wasm_bindgen]
    pub fn supports_backward_compatibility_to(&self, target_version: &KeyVersion) -> bool {
        // Check if this key can handle data encrypted with the target version
        // Support backward compatibility within the same major version
        self.is_compatible_with(target_version) && 
        (self.version.major() > target_version.major() || 
         (self.version.major() == target_version.major() && self.version.minor() >= target_version.minor()))
    }

    #[wasm_bindgen]
    pub fn get_backward_compatibility_versions(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        
        // Current version can always decrypt itself
        array.push(&JsValue::from_str(&self.version.to_string()));
        
        // If we have predecessors, we can decrypt those too
        for predecessor in &self.predecessor_versions {
            array.push(&JsValue::from_str(&predecessor.to_string()));
        }
        
        // For major version compatibility, add all compatible versions
        // (This is a simplified implementation - in practice, you'd track actual supported versions)
        if self.version.major() > 1 {
            for major in 1..self.version.major() {
                let compat_version = KeyVersion::new(major, 0, 0);
                array.push(&JsValue::from_str(&compat_version.to_string()));
            }
        }
        
        array
    }

    // Multi-version Support Methods
    #[wasm_bindgen(js_name = addPredecessorVersion)]
    pub fn add_predecessor_version(&mut self, predecessor: KeyVersion) {
        if !self.predecessor_versions.contains(&predecessor) {
            self.predecessor_versions.push(predecessor.clone());
            self.supported_decryption_versions.push(predecessor.clone());
            self.audit_log.push(format!("Predecessor version {} added at {}", 
                predecessor.to_string(), Utc::now()));
        }
    }

    #[wasm_bindgen(js_name = getPredecessorVersions)]
    pub fn get_predecessor_versions(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        for version in &self.predecessor_versions {
            array.push(&JsValue::from_str(&version.to_string()));
        }
        array
    }

    #[wasm_bindgen(js_name = setPredecessorVersion)]
    pub fn set_predecessor_version(&mut self, version: KeyVersion) {
        self.add_predecessor_version(version);
    }

    #[wasm_bindgen(js_name = getSupportedDecryptionVersions)]
    pub fn get_supported_decryption_versions(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        for version in &self.supported_decryption_versions {
            array.push(&JsValue::from_str(&version.to_string()));
        }
        array
    }

    #[wasm_bindgen(js_name = addSupportedDecryptionVersion)]
    pub fn add_supported_decryption_version(&mut self, version: KeyVersion) -> Result<(), JsValue> {
        if self.validate_version_compatibility(&version)? {
            if !self.supported_decryption_versions.contains(&version) {
                self.supported_decryption_versions.push(version.clone());
                self.audit_log.push(format!("Added support for decryption version {} at {}", 
                    version.to_string(), Utc::now()));
            }
            Ok(())
        } else {
            Err(JsValue::from_str("Version not compatible for decryption support"))
        }
    }

    #[wasm_bindgen(js_name = validateVersionCompatibility)]
    pub fn validate_version_compatibility(&self, version: &KeyVersion) -> Result<bool, JsValue> {
        // Validate that this key can support decryption of the given version
        // Must be same major version and not newer than current key
        if version.major() != self.version.major() {
            return Ok(false);
        }
        
        if version.compare_version(&self.version) > 0 {
            return Ok(false);
        }
        
        Ok(true)
    }

    #[wasm_bindgen(js_name = validateKeyIntegrity)]
    pub fn validate_key_integrity(&mut self) -> Result<bool, JsValue> {
        // Generate and verify integrity hash
        let current_hash = self.generate_integrity_hash()?;
        
        if let Some(stored_hash) = &self.integrity_hash {
            let is_valid = current_hash == *stored_hash;
            if !is_valid {
                self.audit_log.push(format!("INTEGRITY VIOLATION detected at {}", Utc::now()));
            }
            Ok(is_valid)
        } else {
            // First time validation - store the hash
            self.integrity_hash = Some(current_hash);
            self.audit_log.push(format!("Integrity hash established at {}", Utc::now()));
            Ok(true)
        }
    }

    #[wasm_bindgen(js_name = updateUsageTracking)]
    pub fn update_usage_tracking(&mut self) {
        self.usage_count += 1;
        self.last_used_time = Some(Utc::now());
        
        // Log usage periodically (every 100 uses)
        if self.usage_count % 100 == 0 {
            self.audit_log.push(format!("Key usage count reached {} at {}", 
                self.usage_count, Utc::now()));
        }
    }

    #[wasm_bindgen(js_name = checkRetentionEligibility)]
    pub fn check_retention_eligibility(&self, policy: &LegacyKeyRetentionPolicy) -> bool {
        // Check if this key is eligible for cleanup based on retention policy
        let age_days = (Utc::now() - self.creation_time).num_days() as u32;
        
        // Must meet minimum retention period
        if age_days < policy.min_retention_days() {
            return false;
        }
        
        // If migration completion required, check migration status
        if policy.require_migration_completion() && self.migration_progress < 1.0 {
            return false;
        }
        
        // Key must not be active
        matches!(self.status, KeyStatus::Deprecated | KeyStatus::Expired)
    }

    #[wasm_bindgen(js_name = transitionToVersion)]
    pub fn transition_to_version(&mut self, new_version: KeyVersion, new_key: CryptoKey) -> Result<(), JsValue> {
        // Validate transition is allowed
        if new_version.compare_version(&self.version) <= 0 {
            return Err(JsValue::from_str("New version must be newer than current version"));
        }
        
        // Store current version as predecessor
        self.add_predecessor_version(self.version.clone());
        
        // Update to new version
        let old_version = self.version.clone();
        self.version = new_version.clone();
        self.key = new_key;
        self.status = KeyStatus::Active;
        self.migration_progress = 0.0;
        self.integrity_hash = None; // Reset integrity hash for new key
        
        self.audit_log.push(format!("Transitioned from version {} to {} at {}", 
            old_version.to_string(), new_version.to_string(), Utc::now()));
        
        Ok(())
    }

    // Private helper method
    fn generate_integrity_hash(&self) -> Result<String, JsValue> {
        // Generate a hash of key metadata for integrity checking
        // In a real implementation, this would use a proper crypto hash
        let data = format!("{}{}{:?}{}", 
            self.version.to_string(),
            self.purpose.clone() as u32,
            self.status,
            self.creation_time.timestamp()
        );
        
        // Simplified hash - in production use SHA-256 or similar
        Ok(format!("{:x}", data.len() * 31 + data.chars().map(|c| c as usize).sum::<usize>()))
    }

    // Helper method for version compatibility checking
    fn is_compatible_with(&self, other: &KeyVersion) -> bool {
        // Same major version indicates compatibility
        self.version.major() == other.major()
    }
}

impl Drop for VersionedKey {
    fn drop(&mut self) {
        track_secret_zeroization();
    }
}