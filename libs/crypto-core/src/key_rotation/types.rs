use wasm_bindgen::prelude::*;
use chrono::{DateTime, Duration, Utc};

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

    #[wasm_bindgen(js_name = setExpiration)]
    pub fn set_expiration(&mut self, duration_days: u32) -> Result<(), JsValue> {
        let duration = Duration::days(duration_days as i64);
        self.expires_at = Some(self.created_at + duration);
        Ok(())
    }

    #[wasm_bindgen(js_name = isExpired)]
    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            Utc::now() > expires_at
        } else {
            false
        }
    }

    #[wasm_bindgen(js_name = toString)]
    pub fn to_string(&self) -> String {
        format!("{}.{}.{}", self.major, self.minor, self.patch)
    }

    #[wasm_bindgen(js_name = compareVersion)]
    pub fn compare_version(&self, other: &KeyVersion) -> i32 {
        match self.major.cmp(&other.major) {
            std::cmp::Ordering::Less => -1,
            std::cmp::Ordering::Greater => 1,
            std::cmp::Ordering::Equal => match self.minor.cmp(&other.minor) {
                std::cmp::Ordering::Less => -1,
                std::cmp::Ordering::Greater => 1,
                std::cmp::Ordering::Equal => match self.patch.cmp(&other.patch) {
                    std::cmp::Ordering::Less => -1,
                    std::cmp::Ordering::Greater => 1,
                    std::cmp::Ordering::Equal => 0,
                }
            }
        }
    }
}

/// Key lifecycle status enumeration
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum KeyStatus {
    Active,
    Deprecated,
    Revoked,
    Migrating,
    Expired,
}

/// Security event types that can trigger emergency key rotations
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum SecurityEventType {
    DeviceCompromise,
    UnauthorizedAccess,
    SuspiciousActivity,
    DataBreach,
    NetworkIntrusion,
    MalwareDetected,
    UserReported,
}

/// Rotation trigger types for policy-based scheduling
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum RotationTrigger {
    TimeBased,
    UsageBased,
    EventBased,
    Manual,
    Emergency,
}

/// User timing preferences for rotation operations
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum RotationTiming {
    Immediate,
    LowUsage,
    Scheduled,
    UserControlled,
    Background,
}

/// Error types for key rotation operations
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum KeyRotationError {
    InvalidVersion,
    KeyNotFound,
    MigrationInProgress,
    PolicyViolation,
    CryptoError,
    StorageError,
    NetworkError,
    SecurityEventProcessingError,
    InvalidRotationTiming,
    UserPreferencesNotFound,
}

impl std::fmt::Display for KeyRotationError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            KeyRotationError::InvalidVersion => write!(f, "Invalid key version"),
            KeyRotationError::KeyNotFound => write!(f, "Key not found"),
            KeyRotationError::MigrationInProgress => write!(f, "Migration already in progress"),
            KeyRotationError::PolicyViolation => write!(f, "Policy violation"),
            KeyRotationError::CryptoError => write!(f, "Cryptographic operation failed"),
            KeyRotationError::StorageError => write!(f, "Storage operation failed"),
            KeyRotationError::NetworkError => write!(f, "Network operation failed"),
            KeyRotationError::SecurityEventProcessingError => write!(f, "Security event processing failed"),
            KeyRotationError::InvalidRotationTiming => write!(f, "Invalid rotation timing preference"),
            KeyRotationError::UserPreferencesNotFound => write!(f, "User rotation preferences not found"),
        }
    }
}

impl std::error::Error for KeyRotationError {}

/// Result type for key rotation operations
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum RotationResult {
    Success,
    Failed,
    Pending,
    RequiresUserConfirmation,
    PolicyViolation,
}