use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use crate::memory::SecureBuffer;

// Platform-specific secure storage interface
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq)]
pub enum SecureStoragePlatform {
    IOSKeychain,
    AndroidKeystore,
    AndroidStrongBox,
    WebCryptoAPI,
    WebIndexedDB,
}

// Secure storage configuration
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct SecureStorageConfig {
    platform: SecureStoragePlatform,
    keychain_service: String,
    require_authentication: bool,
    require_biometrics: bool,
    accessibility_level: String,
    encryption_algorithm: String,
}

#[wasm_bindgen]
impl SecureStorageConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(
        platform: SecureStoragePlatform,
        keychain_service: String,
        require_authentication: bool,
        require_biometrics: bool,
        accessibility_level: String,
        encryption_algorithm: String,
    ) -> SecureStorageConfig {
        SecureStorageConfig {
            platform,
            keychain_service,
            require_authentication,
            require_biometrics,
            accessibility_level,
            encryption_algorithm,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn platform(&self) -> SecureStoragePlatform {
        self.platform.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn keychain_service(&self) -> String {
        self.keychain_service.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn require_authentication(&self) -> bool {
        self.require_authentication
    }

    #[wasm_bindgen(getter)]
    pub fn require_biometrics(&self) -> bool {
        self.require_biometrics
    }

    #[wasm_bindgen(getter)]
    pub fn accessibility_level(&self) -> String {
        self.accessibility_level.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn encryption_algorithm(&self) -> String {
        self.encryption_algorithm.clone()
    }
}

// Master key storage metadata
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct MasterKeyStorageInfo {
    key_id: String,
    device_id: String,
    storage_location: String,
    created_at: f64, // timestamp
    last_accessed: f64, // timestamp
    access_count: u32,
    platform: SecureStoragePlatform,
    is_hardware_backed: bool,
}

#[wasm_bindgen]
impl MasterKeyStorageInfo {
    #[wasm_bindgen(constructor)]
    pub fn new(
        key_id: String,
        device_id: String,
        storage_location: String,
        created_at: f64,
        last_accessed: f64,
        access_count: u32,
        platform: SecureStoragePlatform,
        is_hardware_backed: bool,
    ) -> MasterKeyStorageInfo {
        MasterKeyStorageInfo {
            key_id,
            device_id,
            storage_location,
            created_at,
            last_accessed,
            access_count,
            platform,
            is_hardware_backed,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn key_id(&self) -> String {
        self.key_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> String {
        self.device_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn storage_location(&self) -> String {
        self.storage_location.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn created_at(&self) -> f64 {
        self.created_at
    }

    #[wasm_bindgen(getter)]
    pub fn last_accessed(&self) -> f64 {
        self.last_accessed
    }

    #[wasm_bindgen(getter)]
    pub fn access_count(&self) -> u32 {
        self.access_count
    }

    #[wasm_bindgen(getter)]
    pub fn platform(&self) -> SecureStoragePlatform {
        self.platform.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn is_hardware_backed(&self) -> bool {
        self.is_hardware_backed
    }
}

// Entropy source information for key generation
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct EntropySource {
    source_type: String,
    entropy_bytes: u32,
    quality_score: f64, // 0.0 to 1.0
    is_hardware_based: bool,
    timestamp: f64,
}

#[wasm_bindgen]
impl EntropySource {
    #[wasm_bindgen(constructor)]
    pub fn new(
        source_type: String,
        entropy_bytes: u32,
        quality_score: f64,
        is_hardware_based: bool,
        timestamp: f64,
    ) -> EntropySource {
        EntropySource {
            source_type,
            entropy_bytes,
            quality_score,
            is_hardware_based,
            timestamp,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn source_type(&self) -> String {
        self.source_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn entropy_bytes(&self) -> u32 {
        self.entropy_bytes
    }

    #[wasm_bindgen(getter)]
    pub fn quality_score(&self) -> f64 {
        self.quality_score
    }

    #[wasm_bindgen(getter)]
    pub fn is_hardware_based(&self) -> bool {
        self.is_hardware_based
    }

    #[wasm_bindgen(getter)]
    pub fn timestamp(&self) -> f64 {
        self.timestamp
    }
}

// Hardware Security Module detection result
#[wasm_bindgen]
#[derive(Debug, Clone)]
pub struct HSMCapabilities {
    has_hsm: bool,
    hsm_type: String,
    supports_key_generation: bool,
    supports_key_storage: bool,
    supports_attestation: bool,
    max_key_size: u32,
    supported_algorithms: Vec<String>,
}

#[wasm_bindgen]
impl HSMCapabilities {
    #[wasm_bindgen(constructor)]
    pub fn new(
        has_hsm: bool,
        hsm_type: String,
        supports_key_generation: bool,
        supports_key_storage: bool,
        supports_attestation: bool,
        max_key_size: u32,
    ) -> HSMCapabilities {
        HSMCapabilities {
            has_hsm,
            hsm_type,
            supports_key_generation,
            supports_key_storage,
            supports_attestation,
            max_key_size,
            supported_algorithms: vec!["AES-256-GCM".to_string(), "ChaCha20-Poly1305".to_string()],
        }
    }

    #[wasm_bindgen(getter)]
    pub fn has_hsm(&self) -> bool {
        self.has_hsm
    }

    #[wasm_bindgen(getter)]
    pub fn hsm_type(&self) -> String {
        self.hsm_type.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn supports_key_generation(&self) -> bool {
        self.supports_key_generation
    }

    #[wasm_bindgen(getter)]
    pub fn supports_key_storage(&self) -> bool {
        self.supports_key_storage
    }

    #[wasm_bindgen(getter)]
    pub fn supports_attestation(&self) -> bool {
        self.supports_attestation
    }

    #[wasm_bindgen(getter)]
    pub fn max_key_size(&self) -> u32 {
        self.max_key_size
    }

    #[wasm_bindgen]
    pub fn supported_algorithms(&self) -> Vec<String> {
        self.supported_algorithms.clone()
    }
}

// Platform-specific secure storage manager
#[wasm_bindgen]
pub struct PlatformSecureStorage {
    config: SecureStorageConfig,
    storage_cache: HashMap<String, SecureBuffer>,
    hsm_capabilities: Option<HSMCapabilities>,
}

#[wasm_bindgen]
impl PlatformSecureStorage {
    #[wasm_bindgen(constructor)]
    pub fn new(config: SecureStorageConfig) -> PlatformSecureStorage {
        PlatformSecureStorage {
            config,
            storage_cache: HashMap::new(),
            hsm_capabilities: None,
        }
    }

    // Initialize platform-specific secure storage
    #[wasm_bindgen]
    pub async fn initialize(&mut self) -> Result<bool, JsValue> {
        // Detect HSM capabilities
        self.hsm_capabilities = Some(self.detect_hsm_capabilities().await?);
        
        // Validate platform support
        self.validate_platform_support()?;
        
        Ok(true)
    }

    // Generate master key using platform-specific entropy
    #[wasm_bindgen]
    pub async fn generate_master_key(&self, key_id: String) -> Result<MasterKeyStorageInfo, JsValue> {
        // Gather entropy from multiple sources
        let entropy_sources = self.gather_entropy_sources().await?;
        
        // Validate entropy quality
        self.validate_entropy_quality(&entropy_sources)?;
        
        // Generate key using platform-specific secure random
        let key_material = self.generate_secure_random(32)?; // 256-bit key
        
        // Store in platform-specific secure storage
        let storage_location = self.store_master_key(&key_id, &key_material).await?;
        
        let info = MasterKeyStorageInfo::new(
            key_id,
            self.get_device_id(),
            storage_location,
            js_sys::Date::now(),
            js_sys::Date::now(),
            0,
            self.config.platform(),
            self.is_hardware_backed(),
        );
        
        Ok(info)
    }

    // Store master key in platform-specific secure storage
    #[wasm_bindgen]
    pub async fn store_master_key(&self, key_id: &str, key_material: &[u8]) -> Result<String, JsValue> {
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => {
                self.store_in_ios_keychain(key_id, key_material).await
            }
            SecureStoragePlatform::AndroidKeystore => {
                self.store_in_android_keystore(key_id, key_material).await
            }
            SecureStoragePlatform::AndroidStrongBox => {
                self.store_in_android_strongbox(key_id, key_material).await
            }
            SecureStoragePlatform::WebCryptoAPI => {
                self.store_in_webcrypto(key_id, key_material).await
            }
            SecureStoragePlatform::WebIndexedDB => {
                self.store_in_indexeddb(key_id, key_material).await
            }
        }
    }

    // Retrieve master key from platform-specific secure storage
    #[wasm_bindgen]
    pub async fn retrieve_master_key(&self, key_id: String) -> Result<Vec<u8>, JsValue> {
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => {
                self.retrieve_from_ios_keychain(&key_id).await
            }
            SecureStoragePlatform::AndroidKeystore => {
                self.retrieve_from_android_keystore(&key_id).await
            }
            SecureStoragePlatform::AndroidStrongBox => {
                self.retrieve_from_android_strongbox(&key_id).await
            }
            SecureStoragePlatform::WebCryptoAPI => {
                self.retrieve_from_webcrypto(&key_id).await
            }
            SecureStoragePlatform::WebIndexedDB => {
                self.retrieve_from_indexeddb(&key_id).await
            }
        }
    }

    // Delete master key from platform-specific secure storage
    #[wasm_bindgen]
    pub async fn delete_master_key(&self, key_id: String) -> Result<bool, JsValue> {
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => {
                self.delete_from_ios_keychain(&key_id).await
            }
            SecureStoragePlatform::AndroidKeystore => {
                self.delete_from_android_keystore(&key_id).await
            }
            SecureStoragePlatform::AndroidStrongBox => {
                self.delete_from_android_strongbox(&key_id).await
            }
            SecureStoragePlatform::WebCryptoAPI => {
                self.delete_from_webcrypto(&key_id).await
            }
            SecureStoragePlatform::WebIndexedDB => {
                self.delete_from_indexeddb(&key_id).await
            }
        }
    }

    // Check if key exists in secure storage
    #[wasm_bindgen]
    pub async fn key_exists(&self, key_id: String) -> Result<bool, JsValue> {
        match self.retrieve_master_key(key_id).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    // Get HSM capabilities
    #[wasm_bindgen]
    pub fn get_hsm_capabilities(&self) -> Option<HSMCapabilities> {
        self.hsm_capabilities.clone()
    }

    // Check if storage is hardware-backed
    #[wasm_bindgen]
    pub fn is_hardware_backed(&self) -> bool {
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => true, // iOS Keychain uses Secure Enclave when available
            SecureStoragePlatform::AndroidKeystore => true, // Android Keystore can be hardware-backed
            SecureStoragePlatform::AndroidStrongBox => true, // StrongBox is always hardware-backed
            SecureStoragePlatform::WebCryptoAPI => false, // WebCrypto is software-based
            SecureStoragePlatform::WebIndexedDB => false, // IndexedDB is software-based
        }
    }

    // Private helper methods (implemented as async functions that delegate to JS)
    async fn store_in_ios_keychain(&self, key_id: &str, _key_material: &[u8]) -> Result<String, JsValue> {
        // This would delegate to native iOS Keychain via React Native/Expo
        let storage_location = format!("ios_keychain://{}/{}", self.config.keychain_service(), key_id);
        Ok(storage_location)
    }

    async fn store_in_android_keystore(&self, key_id: &str, _key_material: &[u8]) -> Result<String, JsValue> {
        // This would delegate to Android Keystore via React Native/Expo
        let storage_location = format!("android_keystore://{}", key_id);
        Ok(storage_location)
    }

    async fn store_in_android_strongbox(&self, key_id: &str, _key_material: &[u8]) -> Result<String, JsValue> {
        // This would delegate to Android StrongBox via React Native/Expo
        let storage_location = format!("android_strongbox://{}", key_id);
        Ok(storage_location)
    }

    async fn store_in_webcrypto(&self, key_id: &str, _key_material: &[u8]) -> Result<String, JsValue> {
        // This would use WebCrypto API to store in CryptoKey format
        let storage_location = format!("webcrypto://{}", key_id);
        Ok(storage_location)
    }

    async fn store_in_indexeddb(&self, key_id: &str, _key_material: &[u8]) -> Result<String, JsValue> {
        // This would store encrypted key material in IndexedDB
        let storage_location = format!("indexeddb://{}", key_id);
        Ok(storage_location)
    }

    async fn retrieve_from_ios_keychain(&self, _key_id: &str) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would delegate to native iOS Keychain
        Ok(vec![0u8; 32]) // Mock 32-byte key
    }

    async fn retrieve_from_android_keystore(&self, _key_id: &str) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would delegate to Android Keystore
        Ok(vec![0u8; 32]) // Mock 32-byte key
    }

    async fn retrieve_from_android_strongbox(&self, _key_id: &str) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would delegate to Android StrongBox
        Ok(vec![0u8; 32]) // Mock 32-byte key
    }

    async fn retrieve_from_webcrypto(&self, _key_id: &str) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would use WebCrypto API
        Ok(vec![0u8; 32]) // Mock 32-byte key
    }

    async fn retrieve_from_indexeddb(&self, _key_id: &str) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would retrieve from IndexedDB
        Ok(vec![0u8; 32]) // Mock 32-byte key
    }

    async fn delete_from_ios_keychain(&self, _key_id: &str) -> Result<bool, JsValue> {
        Ok(true) // Mock successful deletion
    }

    async fn delete_from_android_keystore(&self, _key_id: &str) -> Result<bool, JsValue> {
        Ok(true) // Mock successful deletion
    }

    async fn delete_from_android_strongbox(&self, _key_id: &str) -> Result<bool, JsValue> {
        Ok(true) // Mock successful deletion
    }

    async fn delete_from_webcrypto(&self, _key_id: &str) -> Result<bool, JsValue> {
        Ok(true) // Mock successful deletion
    }

    async fn delete_from_indexeddb(&self, _key_id: &str) -> Result<bool, JsValue> {
        Ok(true) // Mock successful deletion
    }

    async fn detect_hsm_capabilities(&self) -> Result<HSMCapabilities, JsValue> {
        let has_hsm = match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => true,
            SecureStoragePlatform::AndroidStrongBox => true,
            SecureStoragePlatform::AndroidKeystore => true,
            _ => false,
        };

        let hsm_type = match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => "iOS Secure Enclave".to_string(),
            SecureStoragePlatform::AndroidStrongBox => "Android StrongBox".to_string(),
            SecureStoragePlatform::AndroidKeystore => "Android TEE".to_string(),
            _ => "None".to_string(),
        };

        Ok(HSMCapabilities::new(
            has_hsm,
            hsm_type,
            true,  // supports_key_generation
            true,  // supports_key_storage
            has_hsm, // supports_attestation
            256,   // max_key_size (bits)
        ))
    }

    fn validate_platform_support(&self) -> Result<(), JsValue> {
        // Basic platform validation
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => {
                // Would check for iOS Keychain availability
                Ok(())
            }
            SecureStoragePlatform::AndroidKeystore | SecureStoragePlatform::AndroidStrongBox => {
                // Would check for Android Keystore/StrongBox availability
                Ok(())
            }
            SecureStoragePlatform::WebCryptoAPI => {
                // Would check for WebCrypto API support
                Ok(())
            }
            SecureStoragePlatform::WebIndexedDB => {
                // Would check for IndexedDB support
                Ok(())
            }
        }
    }

    async fn gather_entropy_sources(&self) -> Result<Vec<EntropySource>, JsValue> {
        let mut sources = Vec::new();
        
        // Platform-specific entropy sources
        match self.config.platform() {
            SecureStoragePlatform::IOSKeychain => {
                sources.push(EntropySource::new(
                    "iOS SecRandomCopyBytes".to_string(),
                    32,
                    1.0, // High quality
                    true,
                    js_sys::Date::now(),
                ));
            }
            SecureStoragePlatform::AndroidKeystore | SecureStoragePlatform::AndroidStrongBox => {
                sources.push(EntropySource::new(
                    "Android SecureRandom".to_string(),
                    32,
                    1.0, // High quality
                    true,
                    js_sys::Date::now(),
                ));
            }
            SecureStoragePlatform::WebCryptoAPI => {
                sources.push(EntropySource::new(
                    "WebCrypto getRandomValues".to_string(),
                    32,
                    0.9, // Good quality
                    false,
                    js_sys::Date::now(),
                ));
            }
            SecureStoragePlatform::WebIndexedDB => {
                sources.push(EntropySource::new(
                    "Math.random (fallback)".to_string(),
                    32,
                    0.3, // Poor quality - should be supplemented
                    false,
                    js_sys::Date::now(),
                ));
            }
        }
        
        Ok(sources)
    }

    fn validate_entropy_quality(&self, sources: &[EntropySource]) -> Result<(), JsValue> {
        let total_quality: f64 = sources.iter().map(|s| s.quality_score()).sum();
        let avg_quality = total_quality / sources.len() as f64;
        
        if avg_quality < 0.8 {
            return Err(JsValue::from_str("Insufficient entropy quality for secure key generation"));
        }
        
        Ok(())
    }

    fn generate_secure_random(&self, bytes: usize) -> Result<Vec<u8>, JsValue> {
        // Mock implementation - would use platform-specific secure random
        Ok(vec![0u8; bytes])
    }

    fn get_device_id(&self) -> String {
        "mock_device_id".to_string() // Would get actual device ID
    }
}

impl Default for PlatformSecureStorage {
    fn default() -> Self {
        let default_config = SecureStorageConfig::new(
            SecureStoragePlatform::WebCryptoAPI,
            "aura-default".to_string(),
            false,
            false,
            "WhenUnlocked".to_string(),
            "AES-256-GCM".to_string(),
        );
        
        Self::new(default_config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_storage_config() {
        let config = SecureStorageConfig::new(
            SecureStoragePlatform::IOSKeychain,
            "test-service".to_string(),
            true,
            true,
            "WhenUnlocked".to_string(),
            "AES-256-GCM".to_string(),
        );

        assert_eq!(config.platform(), SecureStoragePlatform::IOSKeychain);
        assert_eq!(config.keychain_service(), "test-service");
        assert!(config.require_authentication());
        assert!(config.require_biometrics());
    }

    #[test]
    fn test_hsm_capabilities() {
        let hsm = HSMCapabilities::new(
            true,
            "iOS Secure Enclave".to_string(),
            true,
            true,
            true,
            256,
        );

        assert!(hsm.has_hsm());
        assert_eq!(hsm.hsm_type(), "iOS Secure Enclave");
        assert!(hsm.supports_key_generation());
        assert!(hsm.supports_key_storage());
        assert!(hsm.supports_attestation());
        assert_eq!(hsm.max_key_size(), 256);
    }

    #[test]
    fn test_entropy_source() {
        let entropy = EntropySource::new(
            "iOS SecRandomCopyBytes".to_string(),
            32,
            1.0,
            true,
            1640995200000.0,
        );

        assert_eq!(entropy.source_type(), "iOS SecRandomCopyBytes");
        assert_eq!(entropy.entropy_bytes(), 32);
        assert_eq!(entropy.quality_score(), 1.0);
        assert!(entropy.is_hardware_based());
    }

    #[test]
    fn test_hardware_backed_detection() {
        let ios_config = SecureStorageConfig::new(
            SecureStoragePlatform::IOSKeychain,
            "test".to_string(),
            false,
            false,
            "WhenUnlocked".to_string(),
            "AES-256-GCM".to_string(),
        );
        let ios_storage = PlatformSecureStorage::new(ios_config);
        assert!(ios_storage.is_hardware_backed());

        let web_config = SecureStorageConfig::new(
            SecureStoragePlatform::WebCryptoAPI,
            "test".to_string(),
            false,
            false,
            "WhenUnlocked".to_string(),
            "AES-256-GCM".to_string(),
        );
        let web_storage = PlatformSecureStorage::new(web_config);
        assert!(!web_storage.is_hardware_backed());
    }
}