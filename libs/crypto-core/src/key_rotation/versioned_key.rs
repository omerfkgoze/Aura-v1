use wasm_bindgen::prelude::*;
use chrono::Utc;
use crate::derivation::DataCategory;
use crate::keys::CryptoKey;
use crate::memory::{track_secret_allocation, track_secret_zeroization};
use super::types::{KeyVersion, KeyStatus};

/// A versioned cryptographic key with lifecycle management
#[wasm_bindgen]
#[derive(Clone)]
pub struct VersionedKey {
    key: CryptoKey,
    version: KeyVersion,
    status: KeyStatus,
    purpose: DataCategory,
    predecessor_version: Option<KeyVersion>,
    migration_progress: f32, // 0.0 to 1.0
    audit_log: Vec<String>,
}

#[wasm_bindgen]
impl VersionedKey {
    #[wasm_bindgen(constructor)]
    pub fn new(key: CryptoKey, version: KeyVersion, purpose: DataCategory) -> Self {
        track_secret_allocation();
        
        Self {
            key,
            version: version.clone(),
            status: KeyStatus::Active,
            purpose,
            predecessor_version: None,
            migration_progress: 0.0,
            audit_log: vec![format!("Key created with version {}", version.to_string())],
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
        // Can decrypt if:
        // 1. Same version
        // 2. Compatible version and this key is newer
        // 3. Currently migrating from that version
        self.version == *data_version 
            || (self.is_compatible_with(data_version) && self.version.compare_version(data_version) >= 0)
            || (self.predecessor_version.as_ref() == Some(data_version) && self.status == KeyStatus::Migrating)
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
        
        // If we have a predecessor, we can decrypt that too
        if let Some(predecessor) = &self.predecessor_version {
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

    #[wasm_bindgen(js_name = setPredecessorVersion)]
    pub fn set_predecessor_version(&mut self, predecessor: KeyVersion) {
        self.predecessor_version = Some(predecessor.clone());
        self.audit_log.push(format!("Predecessor version set to {} at {}", 
            predecessor.to_string(), Utc::now()));
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