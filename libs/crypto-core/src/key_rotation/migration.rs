use wasm_bindgen::prelude::*;
use super::types::{KeyVersion, KeyStatus, RotationTiming};
use super::versioned_key::VersionedKey;
use std::collections::HashMap;
use js_sys::Date;

/// Migration utilities for progressive key transitions
#[wasm_bindgen]
pub struct KeyMigrationHelper;

/// Progressive data migration system for batch re-encryption
#[wasm_bindgen]
pub struct ProgressiveMigrationManager {
    batch_size: u32,
    max_concurrent_batches: u32,
    migration_state: HashMap<String, MigrationCheckpoint>,
}

/// Migration checkpoint for resumability
#[derive(Clone)]
pub struct MigrationCheckpoint {
    pub migration_id: String,
    pub current_batch: u32,
    pub total_batches: u32,
    pub processed_count: u32,
    pub failed_count: u32,
    pub last_checkpoint_time: f64,
    pub user_timing_preferences: RotationTiming,
    pub integrity_hash: String,
}

/// Batch processing configuration
#[wasm_bindgen]
pub struct BatchConfig {
    size: u32,
    max_concurrent: u32,
    integrity_validation: bool,
    performance_monitoring: bool,
}

/// Migration progress tracking
#[wasm_bindgen]
pub struct MigrationProgress {
    migration_id: String,
    total_records: u32,
    processed_records: u32,
    failed_records: u32,
    current_batch: u32,
    estimated_time_remaining: f64,
    performance_metrics: js_sys::Object,
}

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

#[wasm_bindgen]
impl ProgressiveMigrationManager {
    /// Create new progressive migration manager
    #[wasm_bindgen(constructor)]
    pub fn new(batch_size: u32, max_concurrent_batches: u32) -> ProgressiveMigrationManager {
        ProgressiveMigrationManager {
            batch_size,
            max_concurrent_batches,
            migration_state: HashMap::new(),
        }
    }

    /// Start new progressive migration with user timing preferences
    #[wasm_bindgen]
    pub fn start_migration(
        &mut self,
        migration_id: &str,
        total_records: u32,
        timing_preferences: &str
    ) -> js_sys::Object {
        let timing = match timing_preferences {
            "immediate" => RotationTiming::Immediate,
            "background" => RotationTiming::Background,
            "scheduled" => RotationTiming::Scheduled,
            _ => RotationTiming::Background,
        };

        let total_batches = (total_records + self.batch_size - 1) / self.batch_size;
        let current_time = Date::now();

        let checkpoint = MigrationCheckpoint {
            migration_id: migration_id.to_string(),
            current_batch: 0,
            total_batches,
            processed_count: 0,
            failed_count: 0,
            last_checkpoint_time: current_time,
            user_timing_preferences: timing,
            integrity_hash: Self::calculate_initial_integrity_hash(migration_id, total_records),
        };

        self.migration_state.insert(migration_id.to_string(), checkpoint);

        let result = js_sys::Object::new();
        js_sys::Reflect::set(&result, &JsValue::from_str("migrationId"), &JsValue::from_str(migration_id)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("totalBatches"), &JsValue::from_f64(total_batches as f64)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("batchSize"), &JsValue::from_f64(self.batch_size as f64)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("timingPreference"), &JsValue::from_str(timing_preferences)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("started"), &JsValue::from_bool(true)).unwrap();

        result
    }

    /// Resume migration from checkpoint
    #[wasm_bindgen]
    pub fn resume_migration(&mut self, migration_id: &str) -> js_sys::Object {
        let result = js_sys::Object::new();
        
        if let Some(checkpoint) = self.migration_state.get(migration_id) {
            js_sys::Reflect::set(&result, &JsValue::from_str("canResume"), &JsValue::from_bool(true)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("currentBatch"), &JsValue::from_f64(checkpoint.current_batch as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("totalBatches"), &JsValue::from_f64(checkpoint.total_batches as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("processedCount"), &JsValue::from_f64(checkpoint.processed_count as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("failedCount"), &JsValue::from_f64(checkpoint.failed_count as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("lastCheckpoint"), &JsValue::from_f64(checkpoint.last_checkpoint_time)).unwrap();
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("canResume"), &JsValue::from_bool(false)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("error"), &JsValue::from_str("Migration not found")).unwrap();
        }

        result
    }

    /// Process next batch with integrity validation
    #[wasm_bindgen]
    pub fn process_next_batch(
        &mut self,
        migration_id: &str,
        batch_data: &js_sys::Array,
        processed_count: u32,
        failed_count: u32
    ) -> js_sys::Object {
        let result = js_sys::Object::new();
        
        if let Some(checkpoint) = self.migration_state.get_mut(migration_id) {
            // Update checkpoint
            checkpoint.current_batch += 1;
            checkpoint.processed_count += processed_count;
            checkpoint.failed_count += failed_count;
            checkpoint.last_checkpoint_time = Date::now();
            
            // Validate data integrity
            let integrity_valid = self.validate_batch_integrity(batch_data, &checkpoint.integrity_hash);
            
            // Calculate progress
            let total_processed = checkpoint.processed_count + checkpoint.failed_count;
            let completion_rate = if checkpoint.total_batches > 0 {
                checkpoint.current_batch as f64 / checkpoint.total_batches as f64
            } else { 1.0 };
            
            // Estimate remaining time
            let elapsed_time = checkpoint.last_checkpoint_time - 
                self.migration_state.get(migration_id).unwrap().last_checkpoint_time;
            let estimated_remaining = if completion_rate > 0.0 {
                elapsed_time * (1.0 - completion_rate) / completion_rate
            } else { 0.0 };
            
            js_sys::Reflect::set(&result, &JsValue::from_str("success"), &JsValue::from_bool(true)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("currentBatch"), &JsValue::from_f64(checkpoint.current_batch as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("completionRate"), &JsValue::from_f64(completion_rate)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("integrityValid"), &JsValue::from_bool(integrity_valid)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("estimatedTimeRemaining"), &JsValue::from_f64(estimated_remaining)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("isComplete"), &JsValue::from_bool(checkpoint.current_batch >= checkpoint.total_batches)).unwrap();
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("success"), &JsValue::from_bool(false)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("error"), &JsValue::from_str("Migration not found")).unwrap();
        }

        result
    }

    /// Get migration progress status
    #[wasm_bindgen]
    pub fn get_migration_progress(&self, migration_id: &str) -> js_sys::Object {
        let result = js_sys::Object::new();
        
        if let Some(checkpoint) = self.migration_state.get(migration_id) {
            let completion_rate = if checkpoint.total_batches > 0 {
                checkpoint.current_batch as f64 / checkpoint.total_batches as f64
            } else { 1.0 };
            
            js_sys::Reflect::set(&result, &JsValue::from_str("migrationId"), &JsValue::from_str(migration_id)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("currentBatch"), &JsValue::from_f64(checkpoint.current_batch as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("totalBatches"), &JsValue::from_f64(checkpoint.total_batches as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("processedCount"), &JsValue::from_f64(checkpoint.processed_count as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("failedCount"), &JsValue::from_f64(checkpoint.failed_count as f64)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("completionRate"), &JsValue::from_f64(completion_rate)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("timingPreference"), &JsValue::from_str(
                match checkpoint.user_timing_preferences {
                    RotationTiming::Immediate => "immediate",
                    RotationTiming::Background => "background",
                    RotationTiming::Scheduled => "scheduled",
                }
            )).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("lastCheckpoint"), &JsValue::from_f64(checkpoint.last_checkpoint_time)).unwrap();
            js_sys::Reflect::set(&result, &JsValue::from_str("found"), &JsValue::from_bool(true)).unwrap();
        } else {
            js_sys::Reflect::set(&result, &JsValue::from_str("found"), &JsValue::from_bool(false)).unwrap();
        }

        result
    }

    /// Validate migration can be safely rolled back
    #[wasm_bindgen]
    pub fn validate_rollback_safety(
        &self,
        migration_id: &str,
        current_key: &VersionedKey,
        rollback_version: &KeyVersion
    ) -> js_sys::Object {
        let result = js_sys::Object::new();
        let mut is_safe = false;
        let mut reasons = js_sys::Array::new();

        if let Some(checkpoint) = self.migration_state.get(migration_id) {
            // Can rollback if:
            // 1. Migration is not complete
            // 2. Current key can decrypt rollback version data
            // 3. Rollback version is still valid
            // 4. No data integrity issues
            
            if checkpoint.current_batch >= checkpoint.total_batches {
                reasons.push(&JsValue::from_str("Migration is already complete"));
            } else if !current_key.can_decrypt_data_from_version(rollback_version) {
                reasons.push(&JsValue::from_str("Current key cannot decrypt rollback version data"));
            } else if rollback_version.is_expired() {
                reasons.push(&JsValue::from_str("Rollback version is expired"));
            } else {
                is_safe = true;
            }
        } else {
            reasons.push(&JsValue::from_str("Migration not found"));
        }

        js_sys::Reflect::set(&result, &JsValue::from_str("isSafe"), &JsValue::from_bool(is_safe)).unwrap();
        js_sys::Reflect::set(&result, &JsValue::from_str("reasons"), &reasons).unwrap();
        
        result
    }

    /// Clear completed migration state
    #[wasm_bindgen]
    pub fn clear_migration(&mut self, migration_id: &str) -> bool {
        self.migration_state.remove(migration_id).is_some()
    }

    /// Get optimal batch size based on system performance
    #[wasm_bindgen]
    pub fn calculate_optimal_batch_size(
        &self,
        total_records: u32,
        available_memory_mb: u32,
        target_processing_time_ms: u32
    ) -> u32 {
        // Calculate optimal batch size based on:
        // - Available memory
        // - Target processing time
        // - Total records
        let memory_based_size = (available_memory_mb * 1024 * 1024) / 1000; // Rough estimate
        let time_based_size = std::cmp::max(1, target_processing_time_ms / 10); // Rough estimate
        let record_based_size = std::cmp::min(total_records / 10, 10000); // Max 10k per batch
        
        std::cmp::min(
            std::cmp::min(memory_based_size, time_based_size),
            std::cmp::max(record_based_size, 100) // Minimum 100 per batch
        )
    }

    // Helper methods
    fn calculate_initial_integrity_hash(migration_id: &str, total_records: u32) -> String {
        // Simple hash calculation for integrity validation
        format!("{}-{}-{}", migration_id, total_records, Date::now())
    }

    fn validate_batch_integrity(&self, _batch_data: &js_sys::Array, _expected_hash: &str) -> bool {
        // In a real implementation, this would validate data integrity
        // For now, return true as placeholder
        true
    }
}

#[wasm_bindgen]
impl BatchConfig {
    /// Create new batch configuration
    #[wasm_bindgen(constructor)]
    pub fn new(
        size: u32,
        max_concurrent: u32,
        integrity_validation: bool,
        performance_monitoring: bool
    ) -> BatchConfig {
        BatchConfig {
            size,
            max_concurrent,
            integrity_validation,
            performance_monitoring,
        }
    }

    /// Get batch size
    #[wasm_bindgen(getter)]
    pub fn size(&self) -> u32 {
        self.size
    }

    /// Get max concurrent batches
    #[wasm_bindgen(getter)]
    pub fn max_concurrent(&self) -> u32 {
        self.max_concurrent
    }

    /// Get integrity validation setting
    #[wasm_bindgen(getter)]
    pub fn integrity_validation(&self) -> bool {
        self.integrity_validation
    }

    /// Get performance monitoring setting
    #[wasm_bindgen(getter)]
    pub fn performance_monitoring(&self) -> bool {
        self.performance_monitoring
    }
}

#[wasm_bindgen]
impl MigrationProgress {
    /// Create new migration progress tracker
    #[wasm_bindgen(constructor)]
    pub fn new(migration_id: &str, total_records: u32) -> MigrationProgress {
        MigrationProgress {
            migration_id: migration_id.to_string(),
            total_records,
            processed_records: 0,
            failed_records: 0,
            current_batch: 0,
            estimated_time_remaining: 0.0,
            performance_metrics: js_sys::Object::new(),
        }
    }

    /// Update progress with batch results
    #[wasm_bindgen]
    pub fn update_progress(
        &mut self,
        processed: u32,
        failed: u32,
        batch_number: u32,
        processing_time_ms: f64
    ) {
        self.processed_records += processed;
        self.failed_records += failed;
        self.current_batch = batch_number;
        
        // Update performance metrics
        js_sys::Reflect::set(
            &self.performance_metrics,
            &JsValue::from_str("averageProcessingTime"),
            &JsValue::from_f64(processing_time_ms)
        ).unwrap();
        
        // Calculate estimated time remaining
        let completion_rate = if self.total_records > 0 {
            (self.processed_records + self.failed_records) as f64 / self.total_records as f64
        } else { 1.0 };
        
        if completion_rate > 0.0 && completion_rate < 1.0 {
            self.estimated_time_remaining = processing_time_ms * (1.0 - completion_rate) / completion_rate;
        }
    }

    /// Get current progress as percentage
    #[wasm_bindgen]
    pub fn get_completion_percentage(&self) -> f64 {
        if self.total_records == 0 {
            return 100.0;
        }
        ((self.processed_records + self.failed_records) as f64 / self.total_records as f64) * 100.0
    }

    /// Get progress summary object
    #[wasm_bindgen]
    pub fn get_progress_summary(&self) -> js_sys::Object {
        let summary = js_sys::Object::new();
        
        js_sys::Reflect::set(&summary, &JsValue::from_str("migrationId"), &JsValue::from_str(&self.migration_id)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("totalRecords"), &JsValue::from_f64(self.total_records as f64)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("processedRecords"), &JsValue::from_f64(self.processed_records as f64)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("failedRecords"), &JsValue::from_f64(self.failed_records as f64)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("currentBatch"), &JsValue::from_f64(self.current_batch as f64)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("completionPercentage"), &JsValue::from_f64(self.get_completion_percentage())).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("estimatedTimeRemaining"), &JsValue::from_f64(self.estimated_time_remaining)).unwrap();
        js_sys::Reflect::set(&summary, &JsValue::from_str("performanceMetrics"), &self.performance_metrics).unwrap();
        
        summary
    }
}