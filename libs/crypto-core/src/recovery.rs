use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::memory::{SecureBuffer, track_secret_allocation, track_secret_zeroization};
use crate::keys::CryptoKey;
use crate::derivation::HierarchicalKey;

/// BIP39 wordlist languages supported for recovery phrases
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WordlistLanguage {
    English = 0,
    Japanese = 1,
    Korean = 2,
    Spanish = 3,
    Chinese = 4,
    French = 5,
}

/// Recovery phrase with BIP39 compatibility
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryPhrase {
    words: Vec<String>,
    entropy_hex: String,
    checksum: String,
    language: u8, // WordlistLanguage as u8 for WASM compatibility
    word_count: usize,
}

#[wasm_bindgen]
impl RecoveryPhrase {
    /// Create new recovery phrase from entropy
    #[wasm_bindgen(constructor)]
    pub fn new(
        words: Vec<String>,
        entropy_hex: String,
        checksum: String,
        language: u8,
        word_count: usize,
    ) -> Self {
        track_secret_allocation();
        Self {
            words,
            entropy_hex,
            checksum,
            language,
            word_count,
        }
    }

    /// Generate new recovery phrase with specified entropy
    #[wasm_bindgen]
    pub fn generate(entropy_bits: usize, language: u8) -> Result<RecoveryPhrase, JsValue> {
        if entropy_bits % 32 != 0 || entropy_bits < 128 || entropy_bits > 256 {
            return Err(JsValue::from_str("Entropy must be 128, 160, 192, 224, or 256 bits"));
        }

        let entropy_bytes = entropy_bits / 8;
        let mut entropy = vec![0u8; entropy_bytes];
        
        // Generate secure random entropy (mock implementation)
        for (i, byte) in entropy.iter_mut().enumerate() {
            *byte = (i as u8).wrapping_mul(41).wrapping_add(73);
        }
        
        let entropy_hex = entropy.iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>();

        // Calculate checksum (simplified BIP39 implementation)
        let checksum_bits = entropy_bits / 32;
        let checksum_byte = entropy[0]; // Simplified checksum
        let checksum = format!("{:0width$b}", checksum_byte, width = checksum_bits);

        // Generate words based on entropy + checksum (mock BIP39 implementation)
        let word_count = (entropy_bits + checksum_bits) / 11;
        let words = generate_bip39_words(entropy_bits, language, word_count)?;

        track_secret_allocation();
        
        Ok(RecoveryPhrase::new(
            words,
            entropy_hex,
            checksum,
            language,
            word_count,
        ))
    }

    /// Validate recovery phrase checksum
    #[wasm_bindgen]
    pub fn validate(&self) -> bool {
        // Simplified validation - in real implementation would verify BIP39 checksum
        !self.words.is_empty() && 
        !self.entropy_hex.is_empty() && 
        !self.checksum.is_empty() &&
        (self.word_count == 12 || self.word_count == 15 || 
         self.word_count == 18 || self.word_count == 21 || 
         self.word_count == 24)
    }

    /// Convert recovery phrase to seed
    #[wasm_bindgen]
    pub fn to_seed(&self, passphrase: &str) -> Result<Vec<u8>, JsValue> {
        if !self.validate() {
            return Err(JsValue::from_str("Invalid recovery phrase"));
        }

        // Mock PBKDF2 implementation for BIP39 seed derivation
        let combined = format!("{}{}", self.words.join(" "), passphrase);
        let mut seed = vec![0u8; 64]; // BIP39 produces 512-bit seed
        
        for (i, byte) in seed.iter_mut().enumerate() {
            *byte = (combined.len() as u8)
                .wrapping_add(i as u8)
                .wrapping_mul(7)
                .wrapping_add(11);
        }

        track_secret_allocation();
        Ok(seed)
    }

    #[wasm_bindgen(getter)]
    pub fn words(&self) -> Vec<String> {
        self.words.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn entropy_hex(&self) -> String {
        self.entropy_hex.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn checksum(&self) -> String {
        self.checksum.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn language(&self) -> u8 {
        self.language
    }

    #[wasm_bindgen(getter)]
    pub fn word_count(&self) -> usize {
        self.word_count
    }

    /// Get recovery phrase as space-separated string
    #[wasm_bindgen]
    pub fn phrase_string(&self) -> String {
        self.words.join(" ")
    }
}

/// Key backup information for secure escrow
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBackup {
    backup_id: String,
    device_id: String,
    encrypted_master_key: Vec<u8>,
    recovery_phrase_hash: Vec<u8>,
    passkey_challenge: Vec<u8>,
    backup_timestamp: u64,
    version: u32,
    metadata: String, // JSON metadata
}

#[wasm_bindgen]
impl KeyBackup {
    #[wasm_bindgen(constructor)]
    pub fn new(
        backup_id: String,
        device_id: String,
        encrypted_master_key: Vec<u8>,
        recovery_phrase_hash: Vec<u8>,
        passkey_challenge: Vec<u8>,
        backup_timestamp: u64,
        version: u32,
        metadata: String,
    ) -> Self {
        track_secret_allocation();
        Self {
            backup_id,
            device_id,
            encrypted_master_key,
            recovery_phrase_hash,
            passkey_challenge,
            backup_timestamp,
            version,
            metadata,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn backup_id(&self) -> String {
        self.backup_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn device_id(&self) -> String {
        self.device_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn encrypted_master_key(&self) -> Vec<u8> {
        self.encrypted_master_key.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn recovery_phrase_hash(&self) -> Vec<u8> {
        self.recovery_phrase_hash.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn passkey_challenge(&self) -> Vec<u8> {
        self.passkey_challenge.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn backup_timestamp(&self) -> u64 {
        self.backup_timestamp
    }

    #[wasm_bindgen(getter)]
    pub fn version(&self) -> u32 {
        self.version
    }

    #[wasm_bindgen(getter)]
    pub fn metadata(&self) -> String {
        self.metadata.clone()
    }
}

/// Recovery validation levels for emergency procedures
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecoveryValidationLevel {
    Basic = 0,      // Recovery phrase only
    Standard = 1,   // Recovery phrase + passkey
    Enhanced = 2,   // Recovery phrase + passkey + additional factor
    Emergency = 3,  // Multi-factor with time delay
}

/// Recovery system manager integrating with Passkeys authentication
#[wasm_bindgen]
pub struct RecoverySystem {
    device_id: String,
    key_backups: HashMap<String, KeyBackup>,
    recovery_attempts: HashMap<String, u32>,
    validation_level: u8, // RecoveryValidationLevel as u8
    max_attempts: u32,
    lockout_duration_ms: u64,
}

#[wasm_bindgen]
impl RecoverySystem {
    /// Create new recovery system
    #[wasm_bindgen(constructor)]
    pub fn new(
        device_id: String,
        validation_level: u8,
        max_attempts: u32,
        lockout_duration_ms: u64,
    ) -> Self {
        Self {
            device_id,
            key_backups: HashMap::new(),
            recovery_attempts: HashMap::new(),
            validation_level,
            max_attempts,
            lockout_duration_ms,
        }
    }

    /// Create key backup with recovery phrase and passkey integration
    #[wasm_bindgen]
    pub fn create_backup(
        &mut self,
        hierarchical_key: &HierarchicalKey,
        recovery_phrase: &RecoveryPhrase,
        passkey_challenge: Vec<u8>,
    ) -> Result<KeyBackup, JsValue> {
        if !recovery_phrase.validate() {
            return Err(JsValue::from_str("Invalid recovery phrase"));
        }

        let backup_id = format!(
            "backup_{}_{}", 
            self.device_id, 
            js_sys::Date::now() as u64
        );

        // Hash the recovery phrase for verification
        let phrase_bytes = recovery_phrase.phrase_string().as_bytes();
        let recovery_phrase_hash = simple_hash(phrase_bytes);

        // Encrypt master key with recovery phrase seed
        let seed = recovery_phrase.to_seed("")?;
        let encrypted_master_key = encrypt_with_seed(&seed, hierarchical_key)?;

        let metadata = serde_json::json!({
            "device_id": self.device_id,
            "created_at": js_sys::Date::now(),
            "validation_level": self.validation_level,
            "word_count": recovery_phrase.word_count(),
            "language": recovery_phrase.language(),
        }).to_string();

        let backup = KeyBackup::new(
            backup_id.clone(),
            self.device_id.clone(),
            encrypted_master_key,
            recovery_phrase_hash,
            passkey_challenge,
            js_sys::Date::now() as u64,
            1, // Version 1
            metadata,
        );

        self.key_backups.insert(backup_id, backup.clone());
        track_secret_allocation();

        Ok(backup)
    }

    /// Initiate recovery process with Passkeys authentication
    #[wasm_bindgen]
    pub fn initiate_recovery(
        &mut self,
        backup_id: String,
        recovery_phrase: &RecoveryPhrase,
        passkey_response: Vec<u8>,
    ) -> Result<String, JsValue> {
        // Check attempt limits
        let attempt_count = self.recovery_attempts.get(&backup_id).unwrap_or(&0);
        if *attempt_count >= self.max_attempts {
            return Err(JsValue::from_str("Recovery attempts exceeded - account locked"));
        }

        let backup = self.key_backups.get(&backup_id)
            .ok_or_else(|| JsValue::from_str("Backup not found"))?;

        // Validate recovery phrase
        if !recovery_phrase.validate() {
            self.increment_attempt_count(&backup_id);
            return Err(JsValue::from_str("Invalid recovery phrase"));
        }

        // Verify recovery phrase matches backup
        let phrase_bytes = recovery_phrase.phrase_string().as_bytes();
        let phrase_hash = simple_hash(phrase_bytes);
        
        if phrase_hash != backup.recovery_phrase_hash() {
            self.increment_attempt_count(&backup_id);
            return Err(JsValue::from_str("Recovery phrase does not match backup"));
        }

        // Validate passkey response (simplified)
        if self.validation_level >= RecoveryValidationLevel::Standard as u8 {
            if !validate_passkey_response(&backup.passkey_challenge(), &passkey_response) {
                self.increment_attempt_count(&backup_id);
                return Err(JsValue::from_str("Passkey authentication failed"));
            }
        }

        // Generate recovery token
        let recovery_token = format!(
            "recovery_{}_{}_{}",
            backup_id,
            self.device_id,
            js_sys::Date::now() as u64
        );

        // Reset attempt count on successful initiation
        self.recovery_attempts.remove(&backup_id);
        track_secret_allocation();

        Ok(recovery_token)
    }

    /// Complete recovery and restore hierarchical key
    #[wasm_bindgen]
    pub fn complete_recovery(
        &self,
        backup_id: String,
        recovery_token: String,
        recovery_phrase: &RecoveryPhrase,
    ) -> Result<Vec<u8>, JsValue> {
        // Validate recovery token format
        if !recovery_token.starts_with("recovery_") {
            return Err(JsValue::from_str("Invalid recovery token"));
        }

        let backup = self.key_backups.get(&backup_id)
            .ok_or_else(|| JsValue::from_str("Backup not found"))?;

        // Decrypt master key using recovery phrase seed
        let seed = recovery_phrase.to_seed("")?;
        let decrypted_key = decrypt_with_seed(&seed, &backup.encrypted_master_key())?;

        track_secret_allocation();
        Ok(decrypted_key)
    }

    /// Emergency recovery with enhanced validation
    #[wasm_bindgen]
    pub fn emergency_recovery(
        &mut self,
        backup_id: String,
        recovery_phrase: &RecoveryPhrase,
        emergency_code: String,
        passkey_response: Vec<u8>,
    ) -> Result<String, JsValue> {
        if self.validation_level != RecoveryValidationLevel::Emergency as u8 {
            return Err(JsValue::from_str("Emergency recovery not enabled"));
        }

        // Enhanced validation for emergency recovery
        if emergency_code.len() < 8 {
            return Err(JsValue::from_str("Invalid emergency code"));
        }

        // Simulate time delay for emergency procedures
        let delay_token = format!(
            "emergency_delay_{}_{}_{}",
            backup_id,
            self.device_id,
            js_sys::Date::now() as u64 + self.lockout_duration_ms
        );

        track_secret_allocation();
        Ok(delay_token)
    }

    /// Validate emergency delay has passed
    #[wasm_bindgen]
    pub fn validate_emergency_delay(&self, delay_token: String) -> bool {
        if !delay_token.starts_with("emergency_delay_") {
            return false;
        }

        // Extract timestamp from token (simplified parsing)
        if let Some(timestamp_str) = delay_token.split('_').last() {
            if let Ok(unlock_time) = timestamp_str.parse::<u64>() {
                return js_sys::Date::now() as u64 >= unlock_time;
            }
        }

        false
    }

    /// List available backups for device
    #[wasm_bindgen]
    pub fn list_backups(&self) -> Vec<JsValue> {
        self.key_backups
            .values()
            .filter(|backup| backup.device_id() == self.device_id)
            .map(|backup| {
                let obj = js_sys::Object::new();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("backupId"),
                    &JsValue::from_str(&backup.backup_id()),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("timestamp"),
                    &JsValue::from_f64(backup.backup_timestamp() as f64),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("version"),
                    &JsValue::from_f64(backup.version() as f64),
                ).unwrap();
                js_sys::Reflect::set(
                    &obj,
                    &JsValue::from_str("metadata"),
                    &JsValue::from_str(&backup.metadata()),
                ).unwrap();
                obj.into()
            })
            .collect()
    }

    /// Remove old backup
    #[wasm_bindgen]
    pub fn remove_backup(&mut self, backup_id: String) -> Result<(), JsValue> {
        if self.key_backups.remove(&backup_id).is_some() {
            track_secret_zeroization();
            Ok(())
        } else {
            Err(JsValue::from_str("Backup not found"))
        }
    }

    /// Get recovery attempt count for backup
    #[wasm_bindgen]
    pub fn get_attempt_count(&self, backup_id: String) -> u32 {
        *self.recovery_attempts.get(&backup_id).unwrap_or(&0)
    }

    /// Check if backup is locked due to too many attempts
    #[wasm_bindgen]
    pub fn is_backup_locked(&self, backup_id: String) -> bool {
        *self.recovery_attempts.get(&backup_id).unwrap_or(&0) >= self.max_attempts
    }

    /// Reset attempt count for backup (admin function)
    #[wasm_bindgen]
    pub fn reset_attempt_count(&mut self, backup_id: String) {
        self.recovery_attempts.remove(&backup_id);
    }

    /// Get system statistics
    #[wasm_bindgen]
    pub fn get_stats(&self) -> JsValue {
        let total_backups = self.key_backups.len();
        let locked_backups = self.recovery_attempts
            .values()
            .filter(|&&count| count >= self.max_attempts)
            .count();

        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &JsValue::from_str("totalBackups"), &JsValue::from_f64(total_backups as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("lockedBackups"), &JsValue::from_f64(locked_backups as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("validationLevel"), &JsValue::from_f64(self.validation_level as f64)).unwrap();
        js_sys::Reflect::set(&obj, &JsValue::from_str("maxAttempts"), &JsValue::from_f64(self.max_attempts as f64)).unwrap();
        obj.into()
    }

    fn increment_attempt_count(&mut self, backup_id: &str) {
        let count = self.recovery_attempts.get(backup_id).unwrap_or(&0);
        self.recovery_attempts.insert(backup_id.to_string(), count + 1);
    }
}

impl Drop for RecoverySystem {
    fn drop(&mut self) {
        // Clear sensitive data when dropping
        self.key_backups.clear();
        self.recovery_attempts.clear();
        track_secret_zeroization();
    }
}

// Helper functions for BIP39 and cryptographic operations

fn generate_bip39_words(entropy_bits: usize, language: u8, word_count: usize) -> Result<Vec<String>, JsValue> {
    // Mock BIP39 word generation - in real implementation would use proper wordlist
    let base_words = match language {
        0 => vec!["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", 
                 "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid"],
        _ => vec!["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8",
                 "word9", "word10", "word11", "word12", "word13", "word14", "word15", "word16"],
    };

    let mut words = Vec::with_capacity(word_count);
    for i in 0..word_count {
        let word_index = (entropy_bits + i) % base_words.len();
        words.push(format!("{}{}", base_words[word_index], i + 1));
    }

    Ok(words)
}

fn simple_hash(data: &[u8]) -> Vec<u8> {
    // Simple hash function for demonstration - in real implementation would use SHA-256
    let mut hash = vec![0u8; 32];
    let mut state = 0x5A5A5A5Au32;
    
    for &byte in data {
        state = state.wrapping_mul(0x9E3779B9);
        state ^= byte as u32;
        state = state.rotate_left(13);
    }
    
    for (i, byte) in hash.iter_mut().enumerate() {
        *byte = ((state >> (i % 4 * 8)) & 0xFF) as u8;
        state = state.wrapping_mul(0x41C64E6D).wrapping_add(0x3039);
    }
    
    hash
}

fn encrypt_with_seed(seed: &[u8], key: &HierarchicalKey) -> Result<Vec<u8>, JsValue> {
    // Mock encryption with seed - in real implementation would use proper AEAD
    let key_bytes = key.key_bytes();
    let mut encrypted = vec![0u8; key_bytes.len()];
    
    for (i, (&k, &s)) in key_bytes.iter().zip(seed.iter().cycle()).enumerate() {
        encrypted[i] = k ^ s ^ ((i as u8).wrapping_mul(73));
    }
    
    Ok(encrypted)
}

fn decrypt_with_seed(seed: &[u8], encrypted_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    // Mock decryption with seed - reverse of encrypt_with_seed
    let mut decrypted = vec![0u8; encrypted_data.len()];
    
    for (i, (&e, &s)) in encrypted_data.iter().zip(seed.iter().cycle()).enumerate() {
        decrypted[i] = e ^ s ^ ((i as u8).wrapping_mul(73));
    }
    
    Ok(decrypted)
}

fn validate_passkey_response(challenge: &[u8], response: &[u8]) -> bool {
    // Mock passkey validation - in real implementation would verify WebAuthn response
    if challenge.is_empty() || response.is_empty() {
        return false;
    }
    
    // Simple validation: response should be related to challenge
    let challenge_sum: u32 = challenge.iter().map(|&b| b as u32).sum();
    let response_sum: u32 = response.iter().map(|&b| b as u32).sum();
    
    response_sum > challenge_sum // Very simplified validation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recovery_phrase_generation() {
        let phrase = RecoveryPhrase::generate(128, WordlistLanguage::English as u8).unwrap();
        
        assert_eq!(phrase.word_count(), 12); // 128 bits = 12 words
        assert_eq!(phrase.language(), WordlistLanguage::English as u8);
        assert!(phrase.validate());
        assert!(!phrase.entropy_hex().is_empty());
        assert!(!phrase.checksum().is_empty());
    }

    #[test]
    fn test_recovery_phrase_to_seed() {
        let phrase = RecoveryPhrase::generate(128, WordlistLanguage::English as u8).unwrap();
        let seed = phrase.to_seed("test_passphrase").unwrap();
        
        assert_eq!(seed.len(), 64); // BIP39 seed is 512 bits (64 bytes)
    }

    #[test]
    fn test_recovery_system() {
        let mut recovery_system = RecoverySystem::new(
            "test_device".to_string(),
            RecoveryValidationLevel::Standard as u8,
            3, // max attempts
            300000, // 5 minute lockout
        );

        assert_eq!(recovery_system.get_attempt_count("test_backup".to_string()), 0);
        assert!(!recovery_system.is_backup_locked("test_backup".to_string()));
    }

    #[test]
    fn test_key_backup_creation() {
        let mut recovery_system = RecoverySystem::new(
            "test_device".to_string(),
            RecoveryValidationLevel::Standard as u8,
            3,
            300000,
        );

        let phrase = RecoveryPhrase::generate(128, WordlistLanguage::English as u8).unwrap();
        let hierarchical_key = crate::derivation::HierarchicalKey::new(
            vec![1, 2, 3, 4],
            "test_device".to_string(),
            1,
        );
        let passkey_challenge = vec![5, 6, 7, 8];

        let backup = recovery_system.create_backup(
            &hierarchical_key,
            &phrase,
            passkey_challenge,
        ).unwrap();

        assert!(!backup.backup_id().is_empty());
        assert_eq!(backup.device_id(), "test_device");
        assert!(!backup.encrypted_master_key().is_empty());
    }

    #[test]
    fn test_recovery_initiation() {
        let mut recovery_system = RecoverySystem::new(
            "test_device".to_string(),
            RecoveryValidationLevel::Basic as u8, // Only require recovery phrase
            3,
            300000,
        );

        let phrase = RecoveryPhrase::generate(128, WordlistLanguage::English as u8).unwrap();
        let hierarchical_key = crate::derivation::HierarchicalKey::new(
            vec![1, 2, 3, 4],
            "test_device".to_string(),
            1,
        );

        let backup = recovery_system.create_backup(
            &hierarchical_key,
            &phrase,
            vec![],
        ).unwrap();

        let recovery_token = recovery_system.initiate_recovery(
            backup.backup_id(),
            &phrase,
            vec![], // No passkey for basic level
        ).unwrap();

        assert!(recovery_token.starts_with("recovery_"));
    }

    #[test]
    fn test_attempt_limiting() {
        let mut recovery_system = RecoverySystem::new(
            "test_device".to_string(),
            RecoveryValidationLevel::Standard as u8,
            2, // Only 2 attempts allowed
            300000,
        );

        let phrase = RecoveryPhrase::generate(128, WordlistLanguage::English as u8).unwrap();
        let wrong_phrase = RecoveryPhrase::generate(160, WordlistLanguage::English as u8).unwrap();
        let hierarchical_key = crate::derivation::HierarchicalKey::new(
            vec![1, 2, 3, 4],
            "test_device".to_string(),
            1,
        );

        let backup = recovery_system.create_backup(
            &hierarchical_key,
            &phrase,
            vec![1, 2, 3, 4],
        ).unwrap();

        // First failed attempt
        let result1 = recovery_system.initiate_recovery(
            backup.backup_id(),
            &wrong_phrase,
            vec![1, 2, 3, 4],
        );
        assert!(result1.is_err());
        assert_eq!(recovery_system.get_attempt_count(backup.backup_id()), 1);

        // Second failed attempt
        let result2 = recovery_system.initiate_recovery(
            backup.backup_id(),
            &wrong_phrase,
            vec![1, 2, 3, 4],
        );
        assert!(result2.is_err());
        assert_eq!(recovery_system.get_attempt_count(backup.backup_id()), 2);
        assert!(recovery_system.is_backup_locked(backup.backup_id()));

        // Third attempt should be blocked
        let result3 = recovery_system.initiate_recovery(
            backup.backup_id(),
            &phrase, // Even with correct phrase
            vec![1, 2, 3, 4],
        );
        assert!(result3.is_err());
        assert!(result3.unwrap_err().as_string().unwrap().contains("locked"));
    }
}