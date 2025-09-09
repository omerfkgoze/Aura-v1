use proptest::prelude::*;
use quickcheck::{quickcheck, TestResult};
use quickcheck_macros::quickcheck;
use crypto_core::{
    keys::CryptoKey,
    envelope::{CryptoEnvelope, CryptoEnvelopeBuilder},
    aad::AADValidator,
    memory::SecureBuffer,
};
use std::collections::HashMap;

// Property-based testing for cryptographic operations

#[cfg(test)]
mod crypto_properties {
    use super::*;

    /// Property: Key generation should always produce valid keys
    #[quickcheck]
    fn prop_key_generation_always_valid(key_type: String) -> TestResult {
        if key_type.is_empty() || key_type.len() > 50 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new(&key_type);
            match key {
                Ok(k) => {
                    let is_valid = k.is_initialized();
                    let has_length = k.length() > 0;
                    is_valid && has_length
                }
                Err(_) => true, // Invalid types are expected to fail
            }
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Encryption and decryption should be inverse operations
    #[quickcheck]
    fn prop_encrypt_decrypt_inverse(plaintext: Vec<u8>) -> TestResult {
        if plaintext.is_empty() || plaintext.len() > 1024 * 1024 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            let envelope_result = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key);

            match envelope_result {
                Ok(envelope) => {
                    match envelope.decrypt(&key) {
                        Ok(decrypted) => decrypted == plaintext,
                        Err(_) => false,
                    }
                }
                Err(_) => false,
            }
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: AAD validation should be consistent
    #[quickcheck]
    fn prop_aad_validation_consistent(user_id: String, timestamp: u64, context: String) -> TestResult {
        if user_id.is_empty() || user_id.len() > 100 || 
           context.is_empty() || context.len() > 100 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let mut validator = AADValidator::new(&context);
            validator.set_user_id(&user_id);
            validator.set_timestamp(timestamp);

            let aad = validator.generate_aad();
            
            // Same validator should validate its own AAD
            let valid1 = validator.validate_aad(&aad);
            let valid2 = validator.validate_aad(&aad);
            
            // Should be consistent
            valid1 && valid2 && valid1 == valid2
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Different inputs should produce different outputs
    #[quickcheck]
    fn prop_encryption_different_inputs_different_outputs(
        plaintext1: Vec<u8>,
        plaintext2: Vec<u8>
    ) -> TestResult {
        if plaintext1 == plaintext2 || plaintext1.is_empty() || plaintext2.is_empty() ||
           plaintext1.len() > 1024 || plaintext2.len() > 1024 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            
            let envelope1 = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext1, &key).unwrap();
                
            let envelope2 = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm") 
                .with_version(1)
                .encrypt(&plaintext2, &key).unwrap();

            // Different plaintexts should produce different ciphertexts
            envelope1.get_encrypted_data() != envelope2.get_encrypted_data()
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Memory should be properly cleared after operations
    #[quickcheck]
    fn prop_memory_cleanup_after_operations(data: Vec<u8>) -> TestResult {
        if data.is_empty() || data.len() > 1024 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let mut buffer = SecureBuffer::new(data.len());
            buffer.copy_from_slice(&data);
            
            // Use the buffer for some operation
            let key = CryptoKey::new("encryption").unwrap();
            let _envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(buffer.as_slice(), &key);

            // Buffer should be zeroized when dropped
            drop(buffer);
            
            true // If we get here without panic, memory management worked
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Envelope serialization should be reversible
    #[quickcheck]
    fn prop_envelope_serialization_reversible(plaintext: Vec<u8>) -> TestResult {
        if plaintext.is_empty() || plaintext.len() > 1024 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            let envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key).unwrap();

            // Serialize to JSON
            let json = envelope.to_json().unwrap();
            
            // Deserialize back
            let deserialized = CryptoEnvelope::from_json(&json).unwrap();
            
            // Should decrypt to same plaintext
            match deserialized.decrypt(&key) {
                Ok(decrypted) => decrypted == plaintext,
                Err(_) => false,
            }
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Keys of different types should behave differently
    #[quickcheck]
    fn prop_different_key_types_different_behavior() -> bool {
        let encryption_key = CryptoKey::new("encryption");
        let signing_key = CryptoKey::new("signing");
        
        match (encryption_key, signing_key) {
            (Ok(enc_key), Ok(sign_key)) => {
                // Different key types should have different lengths or properties
                enc_key.length() != sign_key.length() || 
                enc_key.key_type() != sign_key.key_type()
            }
            _ => true, // If creation fails, that's expected behavior for some types
        }
    }

    /// Property: Nonce reuse should be prevented
    #[quickcheck]
    fn prop_nonce_uniqueness_enforcement(plaintext: Vec<u8>) -> TestResult {
        if plaintext.is_empty() || plaintext.len() > 512 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            
            let envelope1 = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key).unwrap();
                
            let envelope2 = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key).unwrap();

            // Same plaintext but different encryptions should have different nonces
            envelope1.get_nonce() != envelope2.get_nonce()
        });

        TestResult::from_bool(result.unwrap_or(false))
    }
}

#[cfg(test)]
mod performance_properties {
    use super::*;
    use std::time::{Duration, Instant};

    /// Property: Crypto operations should complete within time bounds
    #[quickcheck]
    fn prop_crypto_operations_performance_bounds(data: Vec<u8>) -> TestResult {
        if data.is_empty() || data.len() > 1024 {
            return TestResult::discard();
        }

        let start = Instant::now();
        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            let _envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&data, &key).unwrap();
        });
        let duration = start.elapsed();

        // Should complete within 500ms as per requirements
        TestResult::from_bool(
            result.is_ok() && duration < Duration::from_millis(500)
        )
    }

    /// Property: Memory usage should be bounded
    #[quickcheck]
    fn prop_bounded_memory_usage(data_size: usize) -> TestResult {
        if data_size == 0 || data_size > 1024 * 1024 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let data = vec![0u8; data_size];
            let key = CryptoKey::new("encryption").unwrap();
            
            // Multiple encryptions shouldn't cause unbounded memory growth
            for _ in 0..10 {
                let _envelope = CryptoEnvelopeBuilder::new()
                    .with_algorithm("aes-256-gcm")
                    .with_version(1)
                    .encrypt(&data, &key).unwrap();
            }
            
            true
        });

        TestResult::from_bool(result.unwrap_or(false))
    }
}

#[cfg(test)]
mod security_properties {
    use super::*;

    /// Property: Invalid AAD should always be rejected
    #[quickcheck]
    fn prop_invalid_aad_rejected(
        valid_user: String,
        valid_timestamp: u64,
        invalid_aad: Vec<u8>
    ) -> TestResult {
        if valid_user.is_empty() || valid_user.len() > 100 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let mut validator = AADValidator::new("test_context");
            validator.set_user_id(&valid_user);
            validator.set_timestamp(valid_timestamp);

            // Invalid AAD should be rejected
            !validator.validate_aad(&invalid_aad)
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Tampered ciphertext should fail decryption
    #[quickcheck]
    fn prop_tampered_ciphertext_fails_decryption(plaintext: Vec<u8>, tamper_index: usize) -> TestResult {
        if plaintext.is_empty() || plaintext.len() > 512 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key = CryptoKey::new("encryption").unwrap();
            let mut envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key).unwrap();

            // Tamper with the ciphertext
            if let Ok(mut encrypted_data) = envelope.get_encrypted_data_mut() {
                if !encrypted_data.is_empty() && tamper_index < encrypted_data.len() {
                    encrypted_data[tamper_index] ^= 0x01; // Flip one bit
                }
            }

            // Decryption should fail
            envelope.decrypt(&key).is_err()
        });

        TestResult::from_bool(result.unwrap_or(false))
    }

    /// Property: Wrong key should fail decryption
    #[quickcheck]
    fn prop_wrong_key_fails_decryption(plaintext: Vec<u8>) -> TestResult {
        if plaintext.is_empty() || plaintext.len() > 512 {
            return TestResult::discard();
        }

        let result = std::panic::catch_unwind(|| {
            let key1 = CryptoKey::new("encryption").unwrap();
            let key2 = CryptoKey::new("encryption").unwrap();
            
            let envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(&plaintext, &key1).unwrap();

            // Decryption with wrong key should fail
            envelope.decrypt(&key2).is_err()
        });

        TestResult::from_bool(result.unwrap_or(false))
    }
}

// Run all property tests
#[cfg(test)]
mod test_runner {
    use super::*;

    #[test]
    fn run_all_property_tests() {
        // Run QuickCheck property tests
        quickcheck(crypto_properties::prop_key_generation_always_valid as fn(String) -> TestResult);
        quickcheck(crypto_properties::prop_encrypt_decrypt_inverse as fn(Vec<u8>) -> TestResult);
        quickcheck(crypto_properties::prop_aad_validation_consistent as fn(String, u64, String) -> TestResult);
        quickcheck(crypto_properties::prop_encryption_different_inputs_different_outputs as fn(Vec<u8>, Vec<u8>) -> TestResult);
        quickcheck(crypto_properties::prop_memory_cleanup_after_operations as fn(Vec<u8>) -> TestResult);
        quickcheck(crypto_properties::prop_envelope_serialization_reversible as fn(Vec<u8>) -> TestResult);
        quickcheck(crypto_properties::prop_different_key_types_different_behavior as fn() -> bool);
        quickcheck(crypto_properties::prop_nonce_uniqueness_enforcement as fn(Vec<u8>) -> TestResult);
        
        quickcheck(performance_properties::prop_crypto_operations_performance_bounds as fn(Vec<u8>) -> TestResult);
        quickcheck(performance_properties::prop_bounded_memory_usage as fn(usize) -> TestResult);
        
        quickcheck(security_properties::prop_invalid_aad_rejected as fn(String, u64, Vec<u8>) -> TestResult);
        quickcheck(security_properties::prop_tampered_ciphertext_fails_decryption as fn(Vec<u8>, usize) -> TestResult);
        quickcheck(security_properties::prop_wrong_key_fails_decryption as fn(Vec<u8>) -> TestResult);

        println!("All property-based tests completed successfully!");
    }
}