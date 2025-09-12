use wasm_bindgen::prelude::*;
use super::types::{KeyVersion, KeyStatus};
use super::versioned_key::VersionedKey;

/// Migration utilities for progressive key transitions
#[wasm_bindgen]
pub struct KeyMigrationHelper;

#[wasm_bindgen]
impl KeyMigrationHelper {
    /// Parse version string to KeyVersion
    #[wasm_bindgen]
    pub fn parse_version_string(version_str: &str) -> Option<KeyVersion> {
        Self::parse_version_string_internal(version_str)
    }

    /// Validate version format
    #[wasm_bindgen]
    pub fn validate_version_format(version_str: &str) -> bool {
        Self::parse_version_string_internal(version_str).is_some()
    }

    /// Calculate migration progress based on data reencryption
    #[wasm_bindgen]
    pub fn calculate_migration_progress(
        total_records: u32,
        migrated_records: u32,
        failed_records: u32
    ) -> js_sys::Object {
        let progress = js_sys::Object::new();
        
        let completion_rate = if total_records > 0 {
            (migrated_records as f64) / (total_records as f64)
        } else {
            1.0
        };
        
        let failure_rate = if total_records > 0 {
            (failed_records as f64) / (total_records as f64)
        } else {
            0.0
        };
        
        js_sys::Reflect::set(&progress, &JsValue::from_str("totalRecords"), &JsValue::from_f64(total_records as f64)).unwrap();
        js_sys::Reflect::set(&progress, &JsValue::from_str("migratedRecords"), &JsValue::from_f64(migrated_records as f64)).unwrap();
        js_sys::Reflect::set(&progress, &JsValue::from_str("failedRecords"), &JsValue::from_f64(failed_records as f64)).unwrap();
        js_sys::Reflect::set(&progress, &JsValue::from_str("completionRate"), &JsValue::from_f64(completion_rate)).unwrap();
        js_sys::Reflect::set(&progress, &JsValue::from_str("failureRate"), &JsValue::from_f64(failure_rate)).unwrap();
        js_sys::Reflect::set(&progress, &JsValue::from_str("remainingRecords"), &JsValue::from_f64((total_records - migrated_records - failed_records) as f64)).unwrap();
        
        progress
    }

    /// Validate migration readiness
    #[wasm_bindgen]
    pub fn validate_migration_readiness(
        current_key: &VersionedKey,
        new_key: &VersionedKey
    ) -> js_sys::Object {
        let validation = js_sys::Object::new();
        let issues = js_sys::Array::new();
        let mut is_ready = true;

        // Check key statuses
        if !matches!(current_key.status(), KeyStatus::Active) {
            issues.push(&JsValue::from_str("Current key is not active"));
            is_ready = false;
        }

        if !matches!(new_key.status(), KeyStatus::Active | KeyStatus::Migrating) {
            issues.push(&JsValue::from_str("New key is not ready for migration"));
            is_ready = false;
        }

        // Check version compatibility
        if new_key.version().compare_version(&current_key.version()) <= 0 {
            issues.push(&JsValue::from_str("New key version is not newer than current key"));
            is_ready = false;
        }

        // Check backward compatibility
        if !new_key.supports_backward_compatibility_to(&current_key.version()) {
            issues.push(&JsValue::from_str("New key does not support backward compatibility"));
            is_ready = false;
        }

        js_sys::Reflect::set(&validation, &JsValue::from_str("isReady"), &JsValue::from_bool(is_ready)).unwrap();
        js_sys::Reflect::set(&validation, &JsValue::from_str("issues"), &issues).unwrap();
        js_sys::Reflect::set(&validation, &JsValue::from_str("currentVersion"), &JsValue::from_str(&current_key.version().to_string())).unwrap();
        js_sys::Reflect::set(&validation, &JsValue::from_str("newVersion"), &JsValue::from_str(&new_key.version().to_string())).unwrap();
        
        validation
    }

    /// Create migration batch for progressive processing
    #[wasm_bindgen]
    pub fn create_migration_batch(
        data_identifiers: &js_sys::Array,
        batch_size: u32,
        start_index: u32
    ) -> js_sys::Object {
        let batch = js_sys::Object::new();
        let batch_data = js_sys::Array::new();
        
        let end_index = std::cmp::min(start_index + batch_size, data_identifiers.length());
        
        for i in start_index..end_index {
            if let Some(identifier) = data_identifiers.get(i).as_string() {
                batch_data.push(&JsValue::from_str(&identifier));
            }
        }
        
        js_sys::Reflect::set(&batch, &JsValue::from_str("data"), &batch_data).unwrap();
        js_sys::Reflect::set(&batch, &JsValue::from_str("startIndex"), &JsValue::from_f64(start_index as f64)).unwrap();
        js_sys::Reflect::set(&batch, &JsValue::from_str("endIndex"), &JsValue::from_f64(end_index as f64)).unwrap();
        js_sys::Reflect::set(&batch, &JsValue::from_str("batchSize"), &JsValue::from_f64((end_index - start_index) as f64)).unwrap();
        js_sys::Reflect::set(&batch, &JsValue::from_str("hasMore"), &JsValue::from_bool(end_index < data_identifiers.length())).unwrap();
        
        batch
    }

    /// Validate migration rollback safety
    #[wasm_bindgen]
    pub fn validate_rollback_safety(
        current_key: &VersionedKey,
        rollback_version: &KeyVersion
    ) -> bool {
        // Can safely rollback if:
        // 1. Current key can decrypt data from rollback version
        // 2. Rollback version is not expired
        // 3. Current key is in migrating state (not fully committed)
        
        current_key.can_decrypt_data_from_version(rollback_version) &&
        !rollback_version.is_expired() &&
        matches!(current_key.status(), KeyStatus::Migrating)
    }

    // Helper method to parse version string
    fn parse_version_string_internal(version_str: &str) -> Option<KeyVersion> {
        let parts: Vec<&str> = version_str.split('.').collect();
        if parts.len() == 3 {
            if let (Ok(major), Ok(minor), Ok(patch)) = (
                parts[0].parse::<u32>(),
                parts[1].parse::<u32>(),
                parts[2].parse::<u32>()
            ) {
                return Some(KeyVersion::new(major, minor, patch));
            }
        }
        None
    }
}