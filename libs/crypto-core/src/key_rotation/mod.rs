/// Key rotation framework with enterprise-grade lifecycle management
/// 
/// This module provides comprehensive key rotation capabilities including:
/// - Versioned key management with semantic versioning
/// - Automated rotation scheduling with policy-based management
/// - Progressive migration with backward compatibility
/// - Comprehensive audit trails and analytics
/// 
/// ## Architecture
/// 
/// The key rotation framework is divided into several logical modules:
/// 
/// - `types`: Core data structures (KeyVersion, KeyStatus, errors)
/// - `versioned_key`: Individual key lifecycle management
/// - `scheduler`: Automated rotation scheduling and policies
/// - `manager`: Main orchestration and coordination
/// - `migration`: Migration utilities and validation helpers
/// 
/// ## Usage Example
/// 
/// ```rust,ignore
/// use crate::key_rotation::{KeyRotationManager, RotationPolicy};
/// use crate::derivation::{HierarchicalKeyDerivation, DataCategory};
/// 
/// // Initialize key rotation manager
/// let hd = HierarchicalKeyDerivation::new();
/// let mut manager = KeyRotationManager::new(hd);
/// 
/// // Set rotation policy
/// let policy = RotationPolicy::new(90); // 90 days
/// manager.set_rotation_policy(DataCategory::CycleData, policy);
/// 
/// // Create new key version when rotation is due
/// if manager.check_rotation_due().length() > 0 {
///     let new_key = manager.create_new_key_version(DataCategory::CycleData)?;
///     // ... perform progressive migration ...
///     manager.complete_key_migration(DataCategory::CycleData)?;
/// }
/// ```

pub mod types;
pub mod versioned_key;
pub mod scheduler;
pub mod manager;
pub mod migration;
pub mod emergency;

// Re-export main types for convenience
pub use types::{KeyVersion, KeyStatus, KeyRotationError};
pub use versioned_key::VersionedKey;
pub use scheduler::{KeyRotationScheduler, RotationPolicy};
pub use manager::KeyRotationManager;
pub use migration::KeyMigrationHelper;