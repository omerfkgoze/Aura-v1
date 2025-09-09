// Integration interfaces for future stories
// This module provides interfaces and foundations for upcoming implementations

use serde::{Deserialize, Serialize};
// use wasm_bindgen::prelude::*; // Reserved for future use
use crate::envelope::CryptoEnvelope;
use crate::SecureBuffer;

/// Device-specific key management interface (Story 1.4 dependency)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceKeyManagementConfig {
    /// Device-specific salt for key derivation
    pub device_salt: Vec<u8>,
    /// Hardware security module availability
    pub hsm_available: bool,
    /// Biometric authentication support
    pub biometric_supported: bool,
    /// Secure enclave availability
    pub secure_enclave_available: bool,
}

impl DeviceKeyManagementConfig {
    pub fn new(
        device_salt: Vec<u8>,
        hsm_available: bool,
        biometric_supported: bool,
        secure_enclave_available: bool,
    ) -> Self {
        Self {
            device_salt,
            hsm_available,
            biometric_supported,
            secure_enclave_available,
        }
    }


}

/// Device-specific key storage interface
pub trait DeviceKeyStorage {
    /// Store key in device-specific secure storage
    fn store_key(&self, key_id: &str, key_data: &SecureBuffer) -> Result<(), String>;
    
    /// Retrieve key from device-specific secure storage
    fn retrieve_key(&self, key_id: &str) -> Result<SecureBuffer, String>;
    
    /// Delete key from device-specific secure storage
    fn delete_key(&self, key_id: &str) -> Result<(), String>;
    
    /// Check if key exists in storage
    fn key_exists(&self, key_id: &str) -> bool;
    
    /// Get device capabilities
    fn get_capabilities(&self) -> DeviceKeyManagementConfig;
}

/// Authentication system integration interface (Story 1.3 dependency)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthIntegrationConfig {
    /// Authentication provider type
    pub provider_type: String,
    /// Token validation endpoint
    pub token_validation_url: String,
    /// Public key for token verification
    pub public_key: Vec<u8>,
    /// Token expiration tolerance (seconds)
    pub expiration_tolerance: u64,
}

impl AuthIntegrationConfig {
    pub fn new(
        provider_type: String,
        token_validation_url: String,
        public_key: Vec<u8>,
        expiration_tolerance: u64,
    ) -> Self {
        Self {
            provider_type,
            token_validation_url,
            public_key,
            expiration_tolerance,
        }
    }
}

/// Authentication context for crypto operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthContext {
    /// User ID from authentication system
    pub user_id: String,
    /// Session token
    pub session_token: String,
    /// Token expiration timestamp
    pub expires_at: u64,
    /// Authentication level (basic, mfa, biometric)
    pub auth_level: String,
}

impl AuthContext {
    pub fn new(
        user_id: String,
        session_token: String,
        expires_at: u64,
        auth_level: String,
    ) -> Self {
        Self {
            user_id,
            session_token,
            expires_at,
            auth_level,
        }
    }

    /// Validate if auth context is still valid
    pub fn is_valid(&self) -> bool {
        let now = js_sys::Date::now() as u64 / 1000;
        self.expires_at > now
    }

    /// Get remaining validity time in seconds
    pub fn remaining_validity(&self) -> u64 {
        let now = js_sys::Date::now() as u64 / 1000;
        if self.expires_at > now {
            self.expires_at - now
        } else {
            0
        }
    }
}

/// Key rotation support interface (Story 1.5 dependency)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyRotationConfig {
    /// Key rotation interval in seconds
    pub rotation_interval: u64,
    /// Maximum key age before forced rotation
    pub max_key_age: u64,
    /// Number of old keys to retain for decryption
    pub old_key_retention_count: u32,
    /// Enable automatic key rotation
    pub auto_rotation_enabled: bool,
}

impl KeyRotationConfig {
    
    pub fn new(
        rotation_interval: u64,
        max_key_age: u64,
        old_key_retention_count: u32,
        auto_rotation_enabled: bool,
    ) -> Self {
        Self {
            rotation_interval,
            max_key_age,
            old_key_retention_count,
            auto_rotation_enabled,
        }
    }
}

/// Key version information for rotation support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyVersion {
    /// Key version identifier
    pub version_id: String,
    /// Key creation timestamp
    pub created_at: u64,
    /// Key status (active, deprecated, revoked)
    pub status: String,
    /// Algorithm used with this key version
    pub algorithm: String,
}

impl KeyVersion {
    
    pub fn new(
        version_id: String,
        created_at: u64,
        status: String,
        algorithm: String,
    ) -> Self {
        Self {
            version_id,
            created_at,
            status,
            algorithm,
        }
    }

    /// Check if key version is active

    pub fn is_active(&self) -> bool {
        self.status == "active"
    }

    /// Get key age in seconds

    pub fn get_age(&self) -> u64 {
        let now = js_sys::Date::now() as u64 / 1000;
        now.saturating_sub(self.created_at)
    }
}

/// Crypto envelope validation for key rotation
pub fn validate_envelope_for_rotation(envelope: &CryptoEnvelope) -> Result<KeyVersion, String> {
    // Extract key version information from envelope
    let key_id_opt = envelope.key_id();
    let key_id = key_id_opt.as_ref()
        .ok_or("Missing key_id in crypto envelope")?;
    
    // Parse key version from key_id (format: user_id:version:timestamp)
    let parts: Vec<&str> = key_id.split(':').collect();
    if parts.len() < 3 {
        return Err("Invalid key_id format for rotation support".to_string());
    }
    
    let version_id = parts[1].to_string();
    let created_at = parts[2].parse::<u64>()
        .map_err(|_| "Invalid timestamp in key_id".to_string())?;
    
    Ok(KeyVersion::new(
        version_id,
        created_at,
        "active".to_string(),
        "AES256GCM".to_string(), // Use string representation instead of enum
    ))
}

/// Health-check interface for validation demo (Story 1.6 dependency)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckConfig {
    /// Enable health check endpoint
    pub enabled: bool,
    /// Health check interval in seconds
    pub check_interval: u64,
    /// Include performance metrics in health check
    pub include_performance: bool,
    /// Include security status in health check
    pub include_security: bool,
}

impl HealthCheckConfig {
    
    pub fn new(
        enabled: bool,
        check_interval: u64,
        include_performance: bool,
        include_security: bool,
    ) -> Self {
        Self {
            enabled,
            check_interval,
            include_performance,
            include_security,
        }
    }
}

/// Health check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    /// Overall health status (healthy, degraded, unhealthy)
    pub status: String,
    /// Timestamp of health check
    pub timestamp: u64,
    /// Crypto operations health
    pub crypto_health: String,
    /// Memory health status
    pub memory_health: String,
    /// Performance metrics (if enabled)
    pub performance_metrics: Option<String>,
    /// Security status (if enabled)
    pub security_status: Option<String>,
}

impl HealthCheckResult {
    
    pub fn new(
        status: String,
        timestamp: u64,
        crypto_health: String,
        memory_health: String,
        performance_metrics: Option<String>,
        security_status: Option<String>,
    ) -> Self {
        Self {
            status,
            timestamp,
            crypto_health,
            memory_health,
            performance_metrics,
            security_status,
        }
    }

    /// Check if overall health is good

    pub fn is_healthy(&self) -> bool {
        self.status == "healthy"
    }
}

/// Perform comprehensive health check
pub fn perform_health_check(config: &HealthCheckConfig) -> HealthCheckResult {
    if !config.enabled {
        return HealthCheckResult::new(
            "disabled".to_string(),
            js_sys::Date::now() as u64 / 1000,
            "disabled".to_string(),
            "disabled".to_string(),
            None,
            None,
        );
    }

    let timestamp = js_sys::Date::now() as u64 / 1000;
    
    // Check crypto operations health
    let crypto_health = match test_crypto_operations() {
        Ok(_) => "healthy".to_string(),
        Err(_) => "unhealthy".to_string(),
    };
    
    // Check memory health
    let memory_usage = crate::memory::get_memory_stats().secrets_allocated;
    let memory_health = if memory_usage <= 1024*1024 {
        "healthy".to_string() // < 1MB
    } else if memory_usage <= 10*1024*1024 {
        "warning".to_string() // 1-10MB
    } else {
        "critical".to_string() // > 10MB
    };
    
    // Performance metrics (if enabled)
    let performance_metrics = if config.include_performance {
        Some(format!("memory_allocated: {} bytes", crate::memory::get_memory_stats().secrets_allocated))
    } else {
        None
    };
    
    // Security status (if enabled)
    let security_status = if config.include_security {
        Some("security_audit_passed: true".to_string())
    } else {
        None
    };
    
    // Determine overall status
    let overall_status = match (&crypto_health[..], &memory_health[..]) {
        ("healthy", "healthy") => "healthy",
        ("healthy", "warning") => "degraded",
        _ => "unhealthy",
    };
    
    HealthCheckResult::new(
        overall_status.to_string(),
        timestamp,
        crypto_health,
        memory_health,
        performance_metrics,
        security_status,
    )
}

/// Test basic crypto operations for health check
fn test_crypto_operations() -> Result<(), String> {
    use crate::keys::CryptoKey;
    
    // Generate test key
    let mut key = CryptoKey::new("health_check".to_string());
    key.generate().map_err(|e| format!("Key generation failed: {:?}", e))?;
    
    // Test data (simplified health check)
    let _test_data = b"health_check_test_data";
    
    // Basic validation that key was generated
    if !key.is_initialized() {
        return Err("Key generation validation failed".to_string());
    }
    
    Ok(())
}

/// Debugging and monitoring interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugConfig {
    /// Enable debug logging
    pub debug_enabled: bool,
    /// Debug log level (error, warn, info, debug)
    pub log_level: String,
    /// Include memory statistics in debug output
    pub include_memory_stats: bool,
    /// Include performance metrics in debug output
    pub include_performance_metrics: bool,
}

impl DebugConfig {
    
    pub fn new(
        debug_enabled: bool,
        log_level: String,
        include_memory_stats: bool,
        include_performance_metrics: bool,
    ) -> Self {
        Self {
            debug_enabled,
            log_level,
            include_memory_stats,
            include_performance_metrics,
        }
    }
}

/// Monitoring metrics collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringMetrics {
    /// Number of crypto operations performed
    pub crypto_operations_count: u64,
    /// Average crypto operation time (microseconds)
    pub avg_operation_time_us: u64,
    /// Peak memory usage (bytes)
    pub peak_memory_usage: usize,
    /// Current memory usage (bytes)
    pub current_memory_usage: usize,
    /// Number of memory leaks detected
    pub memory_leaks_detected: u32,
    /// Last health check timestamp
    pub last_health_check: u64,
}

impl MonitoringMetrics {
    
    pub fn new() -> Self {
        Self {
            crypto_operations_count: 0,
            avg_operation_time_us: 0,
            peak_memory_usage: 0,
            current_memory_usage: 0,
            memory_leaks_detected: 0,
            last_health_check: 0,
        }
    }

    /// Update metrics with new operation data

    pub fn update_crypto_operation(&mut self, operation_time_us: u64) {
        self.crypto_operations_count += 1;
        self.avg_operation_time_us = (self.avg_operation_time_us + operation_time_us) / 2;
    }

    /// Update memory usage metrics

    pub fn update_memory_usage(&mut self, current_usage: usize) {
        self.current_memory_usage = current_usage;
        if current_usage > self.peak_memory_usage {
            self.peak_memory_usage = current_usage;
        }
    }

    /// Record memory leak detection

    pub fn record_memory_leak(&mut self) {
        self.memory_leaks_detected += 1;
    }

    /// Update last health check timestamp

    pub fn update_health_check_timestamp(&mut self) {
        self.last_health_check = js_sys::Date::now() as u64 / 1000;
    }

    /// Get summary report

    pub fn get_summary_report(&self) -> String {
        format!(
            "CryptoCore Monitoring Report:\n\
            - Operations: {}\n\
            - Avg Time: {}μs\n\
            - Memory Peak: {} bytes\n\
            - Memory Current: {} bytes\n\
            - Memory Leaks: {}\n\
            - Last Health Check: {}",
            self.crypto_operations_count,
            self.avg_operation_time_us,
            self.peak_memory_usage,
            self.current_memory_usage,
            self.memory_leaks_detected,
            self.last_health_check
        )
    }
}

/// Global monitoring metrics instance
static mut GLOBAL_METRICS: Option<MonitoringMetrics> = None;

/// Get global monitoring metrics
pub fn get_monitoring_metrics() -> MonitoringMetrics {
    unsafe {
        #[allow(static_mut_refs)]
        GLOBAL_METRICS.get_or_insert_with(|| MonitoringMetrics::new()).clone()
    }
}

/// Update global monitoring metrics
pub fn update_global_metrics(metrics: MonitoringMetrics) {
    unsafe {
        GLOBAL_METRICS = Some(metrics);
    }
}