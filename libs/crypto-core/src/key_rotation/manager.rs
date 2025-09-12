use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use crate::derivation::{HierarchicalKeyDerivation, DataCategory};
use crate::keys::CryptoKey;
use crate::memory::track_secret_zeroization;
use super::types::{KeyVersion, KeyStatus};
use super::versioned_key::VersionedKey;
use super::scheduler::{KeyRotationScheduler, RotationPolicy};

/// Main key rotation manager orchestrating the entire lifecycle
#[wasm_bindgen]
pub struct KeyRotationManager {
    versioned_keys: HashMap<String, Vec<VersionedKey>>, // purpose -> keys (newest first)
    hd_derivation: HierarchicalKeyDerivation,
    scheduler: KeyRotationScheduler,
    migration_batch_size: usize,
}

#[wasm_bindgen]
impl KeyRotationManager {
    #[wasm_bindgen(constructor)]
    pub fn new(hd_derivation: HierarchicalKeyDerivation) -> Self {
        Self {
            versioned_keys: HashMap::new(),
            hd_derivation,
            scheduler: KeyRotationScheduler::new(),
            migration_batch_size: 100,
        }
    }

    #[wasm_bindgen]
    pub fn get_active_key(&self, purpose: DataCategory) -> Option<VersionedKey> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            keys.iter()
                .find(|key| key.is_usable())
                .cloned()
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn get_key_by_version(&self, purpose: DataCategory, version: &KeyVersion) -> Option<VersionedKey> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            keys.iter()
                .find(|key| &key.version() == version)
                .cloned()
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn create_new_key_version(&mut self, purpose: DataCategory) -> Result<VersionedKey, JsValue> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        // Determine new version number
        let new_version = if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            if let Some(latest) = keys.first() {
                // Check if there's already a migration in progress
                if matches!(latest.status(), KeyStatus::Migrating) {
                    return Err(JsValue::from_str(&format!("Migration already in progress for {}", purpose_str)));
                }
                
                // Increment minor version for regular rotation
                KeyVersion::new(latest.version().major(), latest.version().minor() + 1, 0)
            } else {
                KeyVersion::new(1, 0, 0)
            }
        } else {
            KeyVersion::new(1, 0, 0)
        };

        // Generate new key (simplified for now)
        let mut derived_key = CryptoKey::new("rotation".to_string());
        derived_key.generate().map_err(|e| JsValue::from_str(&format!("Failed to generate key: {:?}", e)))?;

        // Create versioned key
        let mut versioned_key = VersionedKey::new(derived_key, new_version, purpose);
        
        // If replacing an existing key, set up migration
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                current_key.set_status(KeyStatus::Deprecated);
                versioned_key.set_predecessor_version(current_key.version());
                versioned_key.set_status(KeyStatus::Migrating);
            }
            
            // Insert new key at the beginning (newest first)
            keys.insert(0, versioned_key.clone());
        } else {
            // First key for this purpose
            self.versioned_keys.insert(purpose_str.clone(), vec![versioned_key.clone()]);
        }

        // Update scheduler
        self.scheduler.update_next_rotation(&purpose_str);

        Ok(versioned_key)
    }

    #[wasm_bindgen]
    pub fn complete_key_migration(&mut self, purpose: DataCategory) -> Result<(), JsValue> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if matches!(current_key.status(), KeyStatus::Migrating) {
                    current_key.set_status(KeyStatus::Active);
                    current_key.set_migration_progress(1.0);
                    
                    // Clean up old deprecated keys (keep last 2 versions for compatibility)
                    while keys.len() > 3 {
                        if let Some(_old_key) = keys.pop() {
                            track_secret_zeroization();
                        }
                    }
                    
                    Ok(())
                } else {
                    Err(JsValue::from_str("No migration in progress"))
                }
            } else {
                Err(JsValue::from_str("No keys found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn get_scheduler(&self) -> KeyRotationScheduler {
        self.scheduler.clone()
    }

    #[wasm_bindgen]
    pub fn set_rotation_policy(&mut self, purpose: DataCategory, policy: RotationPolicy) {
        let purpose_str = self.purpose_to_string(&purpose);
        self.scheduler.set_rotation_policy(&purpose_str, policy);
    }

    #[wasm_bindgen]
    pub fn check_rotation_due(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        
        for (purpose_str, _) in &self.versioned_keys {
            if self.scheduler.is_rotation_due(purpose_str) {
                array.push(&JsValue::from_str(purpose_str));
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn get_key_versions_for_purpose(&self, purpose: DataCategory) -> js_sys::Array {
        let purpose_str = self.purpose_to_string(&purpose);
        let array = js_sys::Array::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            for key in keys {
                array.push(&JsValue::from_str(&key.version().to_string()));
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn cleanup_expired_keys(&mut self) -> u32 {
        let mut cleaned_count = 0;
        
        for (_, keys) in self.versioned_keys.iter_mut() {
            let original_len = keys.len();
            
            // Keep only non-expired keys or the newest key (even if expired)
            let mut indices_to_remove = Vec::new();
            for (index, key) in keys.iter().enumerate() {
                if index > 0 && key.version().is_expired() && !matches!(key.status(), KeyStatus::Active) {
                    indices_to_remove.push(index);
                }
            }
            
            // Remove in reverse order to maintain indices
            for &index in indices_to_remove.iter().rev() {
                keys.remove(index);
                track_secret_zeroization();
            }
            
            cleaned_count += (original_len - keys.len()) as u32;
        }
        
        cleaned_count
    }

    #[wasm_bindgen]
    pub fn get_key_rotation_analytics(&self) -> js_sys::Object {
        let analytics = js_sys::Object::new();
        
        let mut total_keys = 0;
        let mut active_keys = 0;
        let mut migrating_keys = 0;
        let mut expired_keys = 0;
        
        for keys in self.versioned_keys.values() {
            total_keys += keys.len();
            for key in keys {
                match key.status() {
                    KeyStatus::Active => active_keys += 1,
                    KeyStatus::Migrating => migrating_keys += 1,
                    KeyStatus::Expired => expired_keys += 1,
                    _ => {}
                }
            }
        }
        
        js_sys::Reflect::set(&analytics, &JsValue::from_str("totalKeys"), &JsValue::from_f64(total_keys as f64)).unwrap();
        js_sys::Reflect::set(&analytics, &JsValue::from_str("activeKeys"), &JsValue::from_f64(active_keys as f64)).unwrap();
        js_sys::Reflect::set(&analytics, &JsValue::from_str("migratingKeys"), &JsValue::from_f64(migrating_keys as f64)).unwrap();
        js_sys::Reflect::set(&analytics, &JsValue::from_str("expiredKeys"), &JsValue::from_f64(expired_keys as f64)).unwrap();
        js_sys::Reflect::set(&analytics, &JsValue::from_str("totalPurposes"), &JsValue::from_f64(self.versioned_keys.len() as f64)).unwrap();
        
        analytics
    }

    #[wasm_bindgen]
    pub fn force_rotate_key(&mut self, purpose: DataCategory) -> Result<VersionedKey, JsValue> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        // Force immediate rotation by updating scheduler
        self.scheduler.force_rotation(&purpose_str);
        
        // Create new key version
        self.create_new_key_version(purpose)
    }

    #[wasm_bindgen]
    pub fn get_migration_progress(&self, purpose: DataCategory) -> Option<f32> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            if let Some(key) = keys.first() {
                if matches!(key.status(), KeyStatus::Migrating) {
                    return Some(key.migration_progress());
                }
            }
        }
        None
    }

    #[wasm_bindgen]
    pub fn update_migration_progress(&mut self, purpose: DataCategory, progress: f32) -> Result<(), JsValue> {
        let purpose_str = self.purpose_to_string(&purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(key) = keys.first_mut() {
                if matches!(key.status(), KeyStatus::Migrating) {
                    key.set_migration_progress(progress);
                    return Ok(());
                }
            }
        }
        
        Err(JsValue::from_str("No migration in progress for this purpose"))
    }

    // Helper method to convert DataCategory to string
    fn purpose_to_string(&self, purpose: &DataCategory) -> String {
        purpose.to_string()
    }
}

impl Clone for KeyRotationScheduler {
    fn clone(&self) -> Self {
        KeyRotationScheduler::new()
    }
}