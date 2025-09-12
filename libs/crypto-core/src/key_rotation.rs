use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use chrono::{DateTime, Duration, Utc};
use crate::derivation::{HierarchicalKeyDerivation, DataCategory};
use crate::keys::CryptoKey;
use crate::memory::{SecureBuffer, track_secret_allocation, track_secret_zeroization};

/// Version information for cryptographic keys
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub struct KeyVersion {
    major: u32,
    minor: u32,
    patch: u32,
    created_at: DateTime<Utc>,
    expires_at: Option<DateTime<Utc>>,
}

#[wasm_bindgen]
impl KeyVersion {
    #[wasm_bindgen(constructor)]
    pub fn new(major: u32, minor: u32, patch: u32) -> Self {
        Self {
            major,
            minor,
            patch,
            created_at: Utc::now(),
            expires_at: None,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn major(&self) -> u32 {
        self.major
    }

    #[wasm_bindgen(getter)]
    pub fn minor(&self) -> u32 {
        self.minor
    }

    #[wasm_bindgen(getter)]
    pub fn patch(&self) -> u32 {
        self.patch
    }

    #[wasm_bindgen(getter)]
    pub fn created_at(&self) -> f64 {
        self.created_at.timestamp_millis() as f64
    }

    #[wasm_bindgen(getter)]
    pub fn expires_at(&self) -> Option<f64> {
        self.expires_at.map(|dt| dt.timestamp_millis() as f64)
    }

    #[wasm_bindgen(setter)]
    pub fn set_expires_at(&mut self, timestamp_ms: f64) {
        if timestamp_ms > 0.0 {
            self.expires_at = Some(DateTime::from_timestamp_millis(timestamp_ms as i64).unwrap_or(Utc::now()));
        }
    }

    #[wasm_bindgen]
    pub fn to_string(&self) -> String {
        format!("{}.{}.{}", self.major, self.minor, self.patch)
    }

    #[wasm_bindgen]
    pub fn is_compatible_with(&self, other: &KeyVersion) -> bool {
        // Keys are compatible if major version matches
        self.major == other.major
    }

    #[wasm_bindgen]
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            expires_at < Utc::now()
        } else {
            false
        }
    }
}

/// Status of a versioned key
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum KeyStatus {
    Active,
    Deprecated,
    Migrating,
    Revoked,
    Expired,
}

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
            || (self.version.is_compatible_with(data_version) && self.version.major >= data_version.major)
            || (self.predecessor_version.as_ref() == Some(data_version) && self.status == KeyStatus::Migrating)
    }

    #[wasm_bindgen]
    pub fn supports_backward_compatibility_to(&self, target_version: &KeyVersion) -> bool {
        // Check if this key can handle data encrypted with the target version
        // Support backward compatibility within the same major version
        self.version.is_compatible_with(target_version) && 
        (self.version.major > target_version.major || 
         (self.version.major == target_version.major && self.version.minor >= target_version.minor))
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
        if self.version.major > 1 {
            for major in 1..self.version.major {
                let compat_version = KeyVersion::new(major, 0, 0);
                array.push(&JsValue::from_str(&compat_version.to_string()));
            }
        }
        
        array
    }
}

/// Key rotation scheduler for automated rotation
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct KeyRotationScheduler {
    rotation_intervals: HashMap<String, Duration>, // purpose -> interval
    next_rotations: HashMap<String, DateTime<Utc>>, // purpose -> next rotation time
    rotation_policies: HashMap<String, RotationPolicy>,
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct RotationPolicy {
    max_age_days: u32,
    max_usage_count: Option<u64>,
    force_rotation_on_compromise: bool,
    requires_user_confirmation: bool,
}

#[wasm_bindgen]
impl RotationPolicy {
    #[wasm_bindgen(constructor)]
    pub fn new(max_age_days: u32) -> Self {
        Self {
            max_age_days,
            max_usage_count: None,
            force_rotation_on_compromise: true,
            requires_user_confirmation: false,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn max_age_days(&self) -> u32 {
        self.max_age_days
    }

    #[wasm_bindgen(setter)]
    pub fn set_max_usage_count(&mut self, count: u64) {
        self.max_usage_count = Some(count);
    }

    #[wasm_bindgen(setter)]
    pub fn set_requires_user_confirmation(&mut self, requires: bool) {
        self.requires_user_confirmation = requires;
    }
}

#[wasm_bindgen]
impl KeyRotationScheduler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            rotation_intervals: HashMap::new(),
            next_rotations: HashMap::new(),
            rotation_policies: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn set_rotation_policy(&mut self, purpose: &str, policy: RotationPolicy) {
        let interval = Duration::days(policy.max_age_days as i64);
        self.rotation_intervals.insert(purpose.to_string(), interval);
        self.rotation_policies.insert(purpose.to_string(), policy);
        
        // Schedule next rotation
        let next_rotation = Utc::now() + interval;
        self.next_rotations.insert(purpose.to_string(), next_rotation);
    }

    #[wasm_bindgen]
    pub fn is_rotation_due(&self, purpose: &str) -> bool {
        if let Some(next_rotation) = self.next_rotations.get(purpose) {
            *next_rotation <= Utc::now()
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn get_next_rotation_time(&self, purpose: &str) -> Option<f64> {
        self.next_rotations.get(purpose)
            .map(|dt| dt.timestamp_millis() as f64)
    }

    #[wasm_bindgen]
    pub fn get_time_until_rotation(&self, purpose: &str) -> Option<f64> {
        if let Some(next_rotation) = self.next_rotations.get(purpose) {
            let duration = *next_rotation - Utc::now();
            Some(duration.num_milliseconds() as f64)
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn force_rotation(&mut self, purpose: &str) {
        // Set next rotation to now to trigger immediate rotation
        self.next_rotations.insert(purpose.to_string(), Utc::now());
    }

    #[wasm_bindgen]
    pub fn update_next_rotation(&mut self, purpose: &str) {
        if let Some(interval) = self.rotation_intervals.get(purpose) {
            let next_rotation = Utc::now() + *interval;
            self.next_rotations.insert(purpose.to_string(), next_rotation);
        }
    }

    #[wasm_bindgen]
    pub fn get_all_scheduled_rotations(&self) -> js_sys::Array {
        let array = js_sys::Array::new();
        
        for (purpose, next_rotation) in &self.next_rotations {
            let obj = js_sys::Object::new();
            
            js_sys::Reflect::set(&obj, &JsValue::from_str("purpose"), &JsValue::from_str(purpose)).unwrap();
            js_sys::Reflect::set(&obj, &JsValue::from_str("nextRotation"), &JsValue::from_f64(next_rotation.timestamp_millis() as f64)).unwrap();
            js_sys::Reflect::set(&obj, &JsValue::from_str("isDue"), &JsValue::from_bool(self.is_rotation_due(purpose))).unwrap();
            
            if let Some(time_until) = self.get_time_until_rotation(purpose) {
                js_sys::Reflect::set(&obj, &JsValue::from_str("timeUntilRotation"), &JsValue::from_f64(time_until)).unwrap();
            }
            
            if let Some(policy) = self.rotation_policies.get(purpose) {
                js_sys::Reflect::set(&obj, &JsValue::from_str("maxAgeDays"), &JsValue::from_f64(policy.max_age_days as f64)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("requiresUserConfirmation"), &JsValue::from_bool(policy.requires_user_confirmation)).unwrap();
            }
            
            array.push(&obj);
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn get_rotations_due_within(&self, hours: u32) -> js_sys::Array {
        let array = js_sys::Array::new();
        let threshold = Utc::now() + Duration::hours(hours as i64);
        
        for (purpose, next_rotation) in &self.next_rotations {
            if *next_rotation <= threshold {
                let obj = js_sys::Object::new();
                
                js_sys::Reflect::set(&obj, &JsValue::from_str("purpose"), &JsValue::from_str(purpose)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("nextRotation"), &JsValue::from_f64(next_rotation.timestamp_millis() as f64)).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("isDue"), &JsValue::from_bool(*next_rotation <= Utc::now())).unwrap();
                js_sys::Reflect::set(&obj, &JsValue::from_str("hoursUntilDue"), &JsValue::from_f64(
                    (*next_rotation - Utc::now()).num_hours() as f64
                )).unwrap();
                
                array.push(&obj);
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn postpone_rotation(&mut self, purpose: &str, additional_days: u32) -> Result<(), JsValue> {
        if let Some(current_rotation) = self.next_rotations.get_mut(purpose) {
            *current_rotation = *current_rotation + Duration::days(additional_days as i64);
            Ok(())
        } else {
            Err(JsValue::from_str("Purpose not found in rotation schedule"))
        }
    }

    #[wasm_bindgen]
    pub fn schedule_rotation_at(&mut self, purpose: &str, timestamp_ms: f64) -> Result<(), JsValue> {
        let target_time = DateTime::from_timestamp_millis(timestamp_ms as i64)
            .ok_or_else(|| JsValue::from_str("Invalid timestamp"))?;
        
        if target_time <= Utc::now() {
            return Err(JsValue::from_str("Cannot schedule rotation in the past"));
        }
        
        self.next_rotations.insert(purpose.to_string(), target_time);
        Ok(())
    }

    #[wasm_bindgen]
    pub fn enable_automatic_rotation(&mut self, purpose: &str, enabled: bool) -> Result<(), JsValue> {
        if let Some(policy) = self.rotation_policies.get_mut(purpose) {
            // Store the enabled state (we can extend RotationPolicy to include this)
            if enabled && !self.next_rotations.contains_key(purpose) {
                // Schedule the first automatic rotation
                self.update_next_rotation(purpose);
            } else if !enabled {
                // Remove from automatic rotation schedule
                self.next_rotations.remove(purpose);
            }
            Ok(())
        } else {
            Err(JsValue::from_str("Purpose not found in rotation policies"))
        }
    }

    #[wasm_bindgen]
    pub fn get_rotation_statistics(&self) -> js_sys::Object {
        let stats = js_sys::Object::new();
        
        let total_scheduled = self.next_rotations.len();
        let due_now = self.next_rotations.iter()
            .filter(|(purpose, _)| self.is_rotation_due(purpose))
            .count();
        let due_within_24h = self.next_rotations.iter()
            .filter(|(_, next_rotation)| **next_rotation <= Utc::now() + Duration::hours(24))
            .count();
        let due_within_7d = self.next_rotations.iter()
            .filter(|(_, next_rotation)| **next_rotation <= Utc::now() + Duration::days(7))
            .count();
        
        js_sys::Reflect::set(&stats, &JsValue::from_str("totalScheduled"), &JsValue::from_f64(total_scheduled as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueNow"), &JsValue::from_f64(due_now as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueWithin24Hours"), &JsValue::from_f64(due_within_24h as f64)).unwrap();
        js_sys::Reflect::set(&stats, &JsValue::from_str("dueWithin7Days"), &JsValue::from_f64(due_within_7d as f64)).unwrap();
        
        // Find next rotation
        if let Some((purpose, next_time)) = self.next_rotations.iter()
            .min_by_key(|(_, time)| *time) {
            js_sys::Reflect::set(&stats, &JsValue::from_str("nextRotationPurpose"), &JsValue::from_str(purpose)).unwrap();
            js_sys::Reflect::set(&stats, &JsValue::from_str("nextRotationTime"), &JsValue::from_f64(next_time.timestamp_millis() as f64)).unwrap();
        }
        
        stats
    }

    #[wasm_bindgen]
    pub fn cleanup_expired_schedules(&mut self) -> u32 {
        let expired_threshold = Utc::now() - Duration::days(30); // Remove schedules older than 30 days
        let original_count = self.next_rotations.len();
        
        self.next_rotations.retain(|_, next_rotation| *next_rotation > expired_threshold);
        
        (original_count - self.next_rotations.len()) as u32
    }
}

/// Main key rotation manager
#[wasm_bindgen]
pub struct KeyRotationManager {
    versioned_keys: HashMap<String, Vec<VersionedKey>>, // purpose -> keys (newest first)
    hd_derivation: HierarchicalKeyDerivation,
    scheduler: KeyRotationScheduler,
    migration_batch_size: usize,
}

#[derive(Debug)]
pub enum KeyRotationError {
    InvalidVersion(String),
    MigrationInProgress(String),
    NoActiveKey(String),
    BackwardCompatibilityViolation(String),
    KeyGenerationError(String),
}

impl std::fmt::Display for KeyRotationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            KeyRotationError::KeyGenerationError(e) => write!(f, "Key generation error: {}", e),
            KeyRotationError::InvalidVersion(msg) => write!(f, "Invalid version: {}", msg),
            KeyRotationError::MigrationInProgress(msg) => write!(f, "Migration in progress: {}", msg),
            KeyRotationError::NoActiveKey(msg) => write!(f, "No active key: {}", msg),
            KeyRotationError::BackwardCompatibilityViolation(msg) => write!(f, "Backward compatibility violation: {}", msg),
        }
    }
}

impl std::error::Error for KeyRotationError {}

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
        let purpose_str = format!("{:?}", purpose);
        
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
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            keys.iter()
                .find(|key| key.version == *version)
                .cloned()
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn create_new_key_version(&mut self, purpose: DataCategory) -> Result<VersionedKey, JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        // Determine new version number
        let new_version = if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            if let Some(latest) = keys.first() {
                // Check if there's already a migration in progress
                if latest.status == KeyStatus::Migrating {
                    return Err(JsValue::from_str(&format!("Migration already in progress for {}", purpose_str)));
                }
                
                // Increment minor version for regular rotation
                KeyVersion::new(latest.version.major, latest.version.minor + 1, 0)
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
                versioned_key.predecessor_version = Some(current_key.version.clone());
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
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key.set_status(KeyStatus::Active);
                    current_key.set_migration_progress(1.0);
                    
                    // Clean up old deprecated keys (keep last 2 versions for compatibility)
                    while keys.len() > 3 {
                        if let Some(old_key) = keys.pop() {
                            track_secret_zeroization();
                            // Log removal
                            if let Some(newest) = keys.first_mut() {
                                newest.audit_log.push(format!("Removed old key version {} at {}", 
                                    old_key.version.to_string(), Utc::now()));
                            }
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
        let purpose_str = format!("{:?}", purpose);
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
        let purpose_str = format!("{:?}", purpose);
        let array = js_sys::Array::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            for key in keys {
                array.push(&JsValue::from_str(&key.version.to_string()));
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
                let should_remove = keys.len() > 1 && key.version.is_expired() && !key.is_usable();
                if should_remove {
                    indices_to_remove.push(index);
                }
            }
            
            // Remove in reverse order to maintain indices
            for &index in indices_to_remove.iter().rev() {
                keys.remove(index);
            }
            
            cleaned_count += (original_len - keys.len()) as u32;
        }
        
        // Track memory cleanup
        for _ in 0..cleaned_count {
            track_secret_zeroization();
        }
        
        cleaned_count
    }

    #[wasm_bindgen]
    pub fn revoke_key_version(&mut self, purpose: DataCategory, version: &KeyVersion) -> Result<(), JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(key) = keys.iter_mut().find(|k| k.version == *version) {
                key.set_status(KeyStatus::Revoked);
                Ok(())
            } else {
                Err(JsValue::from_str("Key version not found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn get_migration_status(&self, purpose: DataCategory) -> Option<f32> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            keys.iter()
                .find(|key| key.status == KeyStatus::Migrating)
                .map(|key| key.migration_progress)
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn find_key_for_decryption(&self, purpose: DataCategory, data_version: &KeyVersion) -> Option<VersionedKey> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            // First, try to find exact version match
            if let Some(exact_key) = keys.iter().find(|key| key.version == *data_version && key.is_usable()) {
                return Some(exact_key.clone());
            }
            
            // Then, try to find a key that can decrypt this version
            keys.iter()
                .find(|key| key.can_decrypt_data_from_version(data_version) && key.is_usable())
                .cloned()
        } else {
            None
        }
    }

    #[wasm_bindgen]
    pub fn validate_backward_compatibility(&self, purpose: DataCategory, required_versions: js_sys::Array) -> bool {
        let purpose_str = format!("{:?}", purpose);
        
        // Check if we can decrypt data from all required versions
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            let usable_keys: Vec<_> = keys.iter().filter(|key| key.is_usable()).collect();
            
            for i in 0..required_versions.length() {
                if let Some(version_str) = required_versions.get(i).as_string() {
                    // Parse version string (format: "major.minor.patch")
                    let parts: Vec<&str> = version_str.split('.').collect();
                    if parts.len() == 3 {
                        if let (Ok(major), Ok(minor), Ok(patch)) = (
                            parts[0].parse::<u32>(),
                            parts[1].parse::<u32>(),
                            parts[2].parse::<u32>()
                        ) {
                            let required_version = KeyVersion::new(major, minor, patch);
                            
                            // Check if any usable key can decrypt this version
                            let can_decrypt = usable_keys.iter()
                                .any(|key| key.can_decrypt_data_from_version(&required_version));
                            
                            if !can_decrypt {
                                return false;
                            }
                        }
                    }
                }
            }
            
            true
        } else {
            false
        }
    }

    #[wasm_bindgen]
    pub fn get_supported_versions(&self, purpose: DataCategory) -> js_sys::Array {
        let purpose_str = format!("{:?}", purpose);
        let array = js_sys::Array::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            let mut supported_versions = std::collections::HashSet::new();
            
            // Collect all versions that can be decrypted by current keys
            for key in keys.iter().filter(|k| k.is_usable()) {
                let compat_versions = key.get_backward_compatibility_versions();
                for i in 0..compat_versions.length() {
                    if let Some(version_str) = compat_versions.get(i).as_string() {
                        supported_versions.insert(version_str);
                    }
                }
            }
            
            // Convert to sorted array
            let mut versions: Vec<_> = supported_versions.into_iter().collect();
            versions.sort();
            
            for version in versions {
                array.push(&JsValue::from_str(&version));
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn check_compatibility_requirements(&self, purpose: DataCategory) -> js_sys::Object {
        let purpose_str = format!("{:?}", purpose);
        let result = js_sys::Object::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            let usable_keys: Vec<_> = keys.iter().filter(|k| k.is_usable()).collect();
            
            // Set basic info
            js_sys::Reflect::set(&result, &JsValue::from_str("purpose"), &JsValue::from_str(&purpose_str)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("totalKeys"), &JsValue::from_f64(keys.len() as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("usableKeys"), &JsValue::from_f64(usable_keys.len() as f64)).unwrap();
            
            // Get current active version
            if let Some(active_key) = usable_keys.first() {
                js_sys::Reflect::set(&result, &JsValue::from_str("currentVersion"), &JsValue::from_str(&active_key.version.to_string())).unwrap();
                js_sys::Reflect::set(&result, &JsValue::from_str("supportedVersions"), &active_key.get_backward_compatibility_versions()).unwrap();
            }
            
            // Check for potential compatibility issues
            let deprecated_count = keys.iter().filter(|k| k.status == KeyStatus::Deprecated).count();
            let migrating_count = keys.iter().filter(|k| k.status == KeyStatus::Migrating).count();
            
            js_sys::Reflect::set(&result, &JsValue::from_str("deprecatedKeys"), &JsValue::from_f64(deprecated_count as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("migratingKeys"), &JsValue::from_f64(migrating_count as f64)).unwrap();
            
            // Compatibility health score (0-100)
            let health_score = if usable_keys.is_empty() {
                0.0
            } else {
                let score = 100.0 - (deprecated_count as f64 * 10.0) - (migrating_count as f64 * 5.0);
                score.max(0.0).min(100.0)
            };
            
            js_sys::Reflect::set(&result, &JsValue::from_str("compatibilityHealthScore"), &JsValue::from_f64(health_score)).unwrap();
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("purpose"), &JsValue::from_str(&purpose_str)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("error"), &JsValue::from_str("Purpose not found")).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("compatibilityHealthScore"), &JsValue::from_f64(0.0)).unwrap();
        }
        
        result
    }

    #[wasm_bindgen]
    pub fn start_progressive_migration(&mut self, purpose: DataCategory, batch_size: Option<usize>) -> Result<(), JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if batch_size.is_some() {
            self.migration_batch_size = batch_size.unwrap();
        }
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key.set_migration_progress(0.0);
                    current_key.audit_log.push(format!("Progressive migration started with batch size {} at {}", 
                        self.migration_batch_size, Utc::now()));
                    Ok(())
                } else {
                    Err(JsValue::from_str("Key is not in migrating state"))
                }
            } else {
                Err(JsValue::from_str("No keys found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn update_migration_progress(&mut self, purpose: DataCategory, processed_items: u32, total_items: u32) -> Result<f32, JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if total_items == 0 {
            return Err(JsValue::from_str("Total items cannot be zero"));
        }
        
        let progress = (processed_items as f32) / (total_items as f32);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key.set_migration_progress(progress);
                    
                    // Auto-complete migration if 100%
                    if progress >= 1.0 {
                        self.complete_key_migration(purpose)?;
                    }
                    
                    Ok(progress)
                } else {
                    Err(JsValue::from_str("Key is not in migrating state"))
                }
            } else {
                Err(JsValue::from_str("No keys found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn get_migration_batch_info(&self, purpose: DataCategory, total_items: u32) -> js_sys::Object {
        let purpose_str = format!("{:?}", purpose);
        let result = js_sys::Object::new();
        
        js_sys::Reflect::set(&result, &JsValue::from_str("purpose"), &JsValue::from_str(&purpose_str)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("batchSize"), &JsValue::from_f64(self.migration_batch_size as f64)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("totalItems"), &JsValue::from_f64(total_items as f64)).unwrap();
        
        let total_batches = ((total_items as f64) / (self.migration_batch_size as f64)).ceil() as u32;
        js_sys::Reflect::set(&result, &JsValue::from_str("totalBatches"), &JsValue::from_f64(total_batches as f64)).unwrap();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            if let Some(current_key) = keys.first() {
                if current_key.status == KeyStatus::Migrating {
                    let current_progress = current_key.migration_progress;
                    let processed_items = (current_progress * total_items as f32) as u32;
                    let current_batch = (processed_items / self.migration_batch_size as u32) + 1;
                    
                    js_sys::Reflect::set(&result, &JsValue::from_str("currentProgress"), &JsValue::from_f64(current_progress as f64)).unwrap();
                    js_sys::Reflect::set(&result, &JsValue::from_str("processedItems"), &JsValue::from_f64(processed_items as f64)).unwrap();
                    js_sys::Reflect::set(&result, &JsValue::from_str("currentBatch"), &JsValue::from_f64(current_batch as f64)).unwrap();
                    js_sys::Reflect::set(&result, &JsValue::from_str("remainingItems"), &JsValue::from_f64((total_items - processed_items) as f64)).unwrap();
                } else {
                    js_sys::Reflect::set(&result, &JsValue::from_str("status"), &JsValue::from_str("not_migrating")).unwrap();
                }
            }
        }
        
        result
    }

    #[wasm_bindgen]
    pub fn pause_migration(&mut self, purpose: DataCategory) -> Result<(), JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key.audit_log.push(format!("Migration paused at {:.1}% at {}", 
                        current_key.migration_progress * 100.0, Utc::now()));
                    Ok(())
                } else {
                    Err(JsValue::from_str("Key is not in migrating state"))
                }
            } else {
                Err(JsValue::from_str("No keys found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn resume_migration(&mut self, purpose: DataCategory) -> Result<(), JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key.audit_log.push(format!("Migration resumed at {:.1}% at {}", 
                        current_key.migration_progress * 100.0, Utc::now()));
                    Ok(())
                } else {
                    Err(JsValue::from_str("Key is not in migrating state"))
                }
            } else {
                Err(JsValue::from_str("No keys found"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn rollback_migration(&mut self, purpose: DataCategory) -> Result<(), JsValue> {
        let purpose_str = format!("{:?}", purpose);
        
        if let Some(keys) = self.versioned_keys.get_mut(&purpose_str) {
            let mut current_key_migrating = false;
            let mut predecessor_version: Option<KeyVersion> = None;
            
            // First pass: check status and get predecessor info
            if let Some(current_key) = keys.first_mut() {
                if current_key.status == KeyStatus::Migrating {
                    current_key_migrating = true;
                    predecessor_version = current_key.predecessor_version.clone();
                    
                    // Reset migration progress and set to deprecated
                    current_key.set_migration_progress(0.0);
                    current_key.set_status(KeyStatus::Deprecated);
                    current_key.audit_log.push(format!("Migration rolled back at {}", Utc::now()));
                }
            }
            
            if current_key_migrating {
                // Second pass: reactivate predecessor if available
                if let Some(pred_version) = predecessor_version {
                    if let Some(predecessor_key) = keys.iter_mut()
                        .find(|k| k.version == pred_version) {
                        predecessor_key.set_status(KeyStatus::Active);
                    }
                }
                Ok(())
            } else {
                Err(JsValue::from_str("Key is not in migrating state"))
            }
        } else {
            Err(JsValue::from_str("Purpose not found"))
        }
    }

    #[wasm_bindgen]
    pub fn estimate_migration_time(&self, purpose: DataCategory, total_items: u32, items_per_second: f32) -> js_sys::Object {
        let purpose_str = format!("{:?}", purpose);
        let result = js_sys::Object::new();
        
        js_sys::Reflect::set(&result, &JsValue::from_str("purpose"), &JsValue::from_str(&purpose_str)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("totalItems"), &JsValue::from_f64(total_items as f64)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("itemsPerSecond"), &JsValue::from_f64(items_per_second as f64)).unwrap();
        
        if items_per_second > 0.0 {
            let total_time_seconds = (total_items as f32) / items_per_second;
            let batch_time_seconds = (self.migration_batch_size as f32) / items_per_second;
            
            js_sys::Reflect::set(&result, &JsValue::from_str("estimatedTotalTimeSeconds"), &JsValue::from_f64(total_time_seconds as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("estimatedBatchTimeSeconds"), &JsValue::from_f64(batch_time_seconds as f64)).unwrap();
            
            // Calculate remaining time if migration is in progress
            if let Some(keys) = self.versioned_keys.get(&purpose_str) {
                if let Some(current_key) = keys.first() {
                    if current_key.status == KeyStatus::Migrating {
                        let remaining_progress = 1.0 - current_key.migration_progress;
                        let remaining_time_seconds = total_time_seconds * remaining_progress;
                        
                        js_sys::Reflect::set(&result, &JsValue::from_str("remainingTimeSeconds"), &JsValue::from_f64(remaining_time_seconds as f64)).unwrap();
                        js_sys::Reflect::set(&result, &JsValue::from_str("remainingProgress"), &JsValue::from_f64(remaining_progress as f64)).unwrap();
                    }
                }
            }
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("error"), &JsValue::from_str("Items per second must be greater than 0")).unwrap();
        }
        
        result
    }

    #[wasm_bindgen]
    pub fn get_key_lifecycle_status(&self, purpose: DataCategory) -> js_sys::Object {
        let purpose_str = format!("{:?}", purpose);
        let result = js_sys::Object::new();
        
        js_sys::Reflect::set(&result, &JsValue::from_str("purpose"), &JsValue::from_str(&purpose_str)).unwrap();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            let total_keys = keys.len();
            let active_keys = keys.iter().filter(|k| k.status == KeyStatus::Active).count();
            let deprecated_keys = keys.iter().filter(|k| k.status == KeyStatus::Deprecated).count();
            let migrating_keys = keys.iter().filter(|k| k.status == KeyStatus::Migrating).count();
            let revoked_keys = keys.iter().filter(|k| k.status == KeyStatus::Revoked).count();
            let expired_keys = keys.iter().filter(|k| k.version.is_expired()).count();
            
            js_sys::Reflect::set(&result, &JsValue::from_str("totalKeys"), &JsValue::from_f64(total_keys as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("activeKeys"), &JsValue::from_f64(active_keys as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("deprecatedKeys"), &JsValue::from_f64(deprecated_keys as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("migratingKeys"), &JsValue::from_f64(migrating_keys as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("revokedKeys"), &JsValue::from_f64(revoked_keys as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("expiredKeys"), &JsValue::from_f64(expired_keys as f64)).unwrap();
            
            // Get oldest and newest key versions
            if let Some(oldest_key) = keys.iter().min_by_key(|k| k.version.created_at) {
                js_sys::Reflect::set(&result, &JsValue::from_str("oldestVersion"), &JsValue::from_str(&oldest_key.version.to_string())).unwrap();
                js_sys::Reflect::set(&result, &JsValue::from_str("oldestCreatedAt"), &JsValue::from_f64(oldest_key.version.created_at())).unwrap();
            }
            
            if let Some(newest_key) = keys.iter().max_by_key(|k| k.version.created_at) {
                js_sys::Reflect::set(&result, &JsValue::from_str("newestVersion"), &JsValue::from_str(&newest_key.version.to_string())).unwrap();
                js_sys::Reflect::set(&result, &JsValue::from_str("newestCreatedAt"), &JsValue::from_f64(newest_key.version.created_at())).unwrap();
            }
            
            // Lifecycle health score (0-100)
            let health_score = if active_keys > 0 {
                let base_score = 100.0;
                let expired_penalty = expired_keys as f64 * 20.0;
                let revoked_penalty = revoked_keys as f64 * 15.0;
                let deprecated_penalty = deprecated_keys as f64 * 5.0;
                
                (base_score - expired_penalty - revoked_penalty - deprecated_penalty).max(0.0).min(100.0)
            } else {
                0.0
            };
            
            js_sys::Reflect::set(&result, &JsValue::from_str("lifecycleHealthScore"), &JsValue::from_f64(health_score)).unwrap();
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("error"), &JsValue::from_str("Purpose not found")).unwrap();
        }
        
        result
    }

    #[wasm_bindgen]
    pub fn get_comprehensive_audit_trail(&self, purpose: DataCategory) -> js_sys::Array {
        let purpose_str = format!("{:?}", purpose);
        let array = js_sys::Array::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            for key in keys {
                let key_obj = js_sys::Object::new();
                
                js_sys::Reflect::set(&key_obj, &JsValue::from_str("version"), &JsValue::from_str(&key.version.to_string())).unwrap();
                js_sys::Reflect::set(&key_obj, &JsValue::from_str("status"), &JsValue::from_str(&format!("{:?}", key.status))).unwrap();
                js_sys::Reflect::set(&key_obj, &JsValue::from_str("createdAt"), &JsValue::from_f64(key.version.created_at())).unwrap();
                js_sys::Reflect::set(&key_obj, &JsValue::from_str("auditLog"), &key.get_audit_log()).unwrap();
                
                if let Some(predecessor) = &key.predecessor_version {
                    js_sys::Reflect::set(&key_obj, &JsValue::from_str("predecessorVersion"), &JsValue::from_str(&predecessor.to_string())).unwrap();
                }
                
                if key.status == KeyStatus::Migrating {
                    js_sys::Reflect::set(&key_obj, &JsValue::from_str("migrationProgress"), &JsValue::from_f64(key.migration_progress as f64)).unwrap();
                }
                
                array.push(&key_obj);
            }
        }
        
        array
    }

    #[wasm_bindgen]
    pub fn get_lifecycle_recommendations(&self, purpose: DataCategory) -> js_sys::Array {
        let purpose_str = format!("{:?}", purpose);
        let recommendations = js_sys::Array::new();
        
        if let Some(keys) = self.versioned_keys.get(&purpose_str) {
            let active_keys: Vec<_> = keys.iter().filter(|k| k.status == KeyStatus::Active).collect();
            let expired_keys: Vec<_> = keys.iter().filter(|k| k.version.is_expired()).collect();
            let deprecated_keys: Vec<_> = keys.iter().filter(|k| k.status == KeyStatus::Deprecated).collect();
            let migrating_keys: Vec<_> = keys.iter().filter(|k| k.status == KeyStatus::Migrating).collect();
            
            if active_keys.is_empty() {
                recommendations.push(&JsValue::from_str("CRITICAL: No active keys found. Generate new key immediately."));
            }
            
            if !expired_keys.is_empty() {
                recommendations.push(&JsValue::from_str(&format!("WARNING: {} expired keys detected. Consider cleanup.", expired_keys.len())));
            }
            
            if deprecated_keys.len() > 3 {
                recommendations.push(&JsValue::from_str("INFO: Multiple deprecated keys found. Consider archiving old versions."));
            }
            
            if !migrating_keys.is_empty() {
                let stuck_migrations: Vec<_> = migrating_keys.iter()
                    .filter(|k| k.migration_progress < 0.1)
                    .collect();
                
                if !stuck_migrations.is_empty() {
                    recommendations.push(&JsValue::from_str("WARNING: Migration appears stuck. Check migration progress."));
                }
            }
            
            // Check if rotation is overdue
            if let Some(scheduler) = self.scheduler.next_rotations.get(&purpose_str) {
                if *scheduler < Utc::now() - Duration::days(7) {
                    recommendations.push(&JsValue::from_str("WARNING: Key rotation is overdue by more than 7 days."));
                }
            }
            
            // Check key age
            if let Some(newest_key) = active_keys.first() {
                let age_days = (Utc::now().timestamp_millis() - newest_key.version.created_at() as i64) / (1000 * 60 * 60 * 24);
                if age_days > 365 {
                    recommendations.push(&JsValue::from_str("INFO: Active key is over 1 year old. Consider rotation."));
                }
            }
            
            if keys.len() > 10 {
                recommendations.push(&JsValue::from_str("INFO: Large number of key versions. Consider cleanup and archival."));
            }
            
            if recommendations.length() == 0 {
                recommendations.push(&JsValue::from_str("OK: Key lifecycle appears healthy."));
            }
        } else {
            recommendations.push(&JsValue::from_str("ERROR: Purpose not found in key management system."));
        }
        
        recommendations
    }
}

impl Default for KeyRotationManager {
    fn default() -> Self {
        // This will not compile without an HierarchicalKeyDerivation instance
        // It's here for trait completeness but should not be used
        panic!("KeyRotationManager requires HierarchicalKeyDerivation instance");
    }
}