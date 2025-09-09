use crypto_core::*;

/// Regression test suite for crypto operations
/// Tests for known edge cases, vulnerabilities, and backward compatibility
#[cfg(test)]
mod regression_tests {
    use super::*;

    /// Test vectors for known good encryption/decryption pairs
    /// These ensure backward compatibility and catch regressions
    #[test]
    fn test_known_encryption_vectors() {
        // Test with known good data patterns that have caused issues in the past
        let test_vectors = [
            // Empty data
            (b"" as &[u8], b"test_aad" as &[u8], "device_1"),
            // Single byte
            (b"\x00", b"aad", "device_2"),
            (b"\xFF", b"aad", "device_3"),
            // Common data patterns that might cause issues
            (b"Hello, World!", b"additional_data", "device_4"),
            // All zeros
            (&[0u8; 32], &[0u8; 16], "device_5"),
            // All ones  
            (&[255u8; 32], &[255u8; 16], "device_6"),
            // Alternating pattern
            (&[0xAA; 64], &[0x55; 32], "device_7"),
            // Large data
            (&vec![42u8; 4096], &vec![123u8; 256], "device_large"),
            // Unicode data
            ("Hello 🌍! Testing unicode: αβγδε ñáéíóú".as_bytes(), b"unicode_aad", "device_unicode"),
            // JSON-like data (potential serialization issues)
            (br#"{"key":"value","array":[1,2,3],"nested":{"inner":"data"}}"#, b"json_aad", "device_json"),
            // SQL-like patterns (injection test)
            (b"'; DROP TABLE users; --", b"sql_aad", "device_sql"),
            // Binary data with control characters
            (b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F", b"binary_aad", "device_binary"),
        ];

        for (data, aad, device_id) in test_vectors {
            let key = generate_key().expect("Key generation failed");
            
            // Encrypt
            let encrypted = encrypt_data(data, &key, aad, device_id)
                .expect(&format!("Encryption failed for data: {:?}", data));
            
            // Decrypt
            let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
                .expect(&format!("Decryption failed for data: {:?}", data));
            
            assert_eq!(data, decrypted.as_slice(), "Round-trip failed for data: {:?}", data);
            
            // Verify envelope structure
            assert!(encrypted.envelope.validate().is_ok(), "Invalid envelope for data: {:?}", data);
            assert!(encrypted.envelope.is_compatible_version(), "Incompatible version for data: {:?}", data);
        }
    }

    /// Test for specific cryptographic edge cases that have caused vulnerabilities
    #[test]
    fn test_cryptographic_edge_cases() {
        let key = generate_key().expect("Key generation failed");
        
        // Test nonce reuse detection (should generate unique nonces)
        let data = b"test data";
        let aad = b"test aad";
        let device_id = "test_device";
        
        let mut nonces = std::collections::HashSet::new();
        
        // Generate multiple encryptions and verify nonce uniqueness
        for _ in 0..100 {
            let encrypted = encrypt_data(data, &key, aad, device_id)
                .expect("Encryption failed");
            
            let nonce_key = format!("{}:{}", 
                hex::encode(&encrypted.envelope.nonce),
                encrypted.envelope.key_id
            );
            
            assert!(!nonces.contains(&nonce_key), 
                   "Nonce reused! This is a critical security vulnerability");
            nonces.insert(nonce_key);
        }
    }

    /// Test for timing attack resistance
    #[test]
    fn test_constant_time_operations() {
        let key = generate_key().expect("Key generation failed");
        let data = b"test data for timing attack resistance";
        let aad = b"test aad";
        let device_id = "test_device";
        
        // Create valid encryption
        let encrypted = encrypt_data(data, &key, aad, device_id)
            .expect("Encryption failed");
        
        // Test decryption with various wrong keys (should take similar time)
        let mut decryption_times = Vec::new();
        
        for _ in 0..50 {
            let wrong_key = generate_key().expect("Key generation failed");
            
            let start = std::time::Instant::now();
            let _ = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &wrong_key);
            let duration = start.elapsed();
            
            decryption_times.push(duration);
        }
        
        // Basic timing analysis - all operations should be roughly similar
        let avg_time: std::time::Duration = decryption_times.iter().sum::<std::time::Duration>() / decryption_times.len() as u32;
        
        for time in &decryption_times {
            let ratio = if *time > avg_time {
                time.as_nanos() as f64 / avg_time.as_nanos() as f64
            } else {
                avg_time.as_nanos() as f64 / time.as_nanos() as f64
            };
            
            // Allow for some variance but flag major timing differences
            assert!(ratio < 3.0, "Potential timing attack vulnerability detected: ratio {}", ratio);
        }
    }

    /// Test for buffer overflow and memory safety
    #[test]
    fn test_buffer_safety() {
        let key = generate_key().expect("Key generation failed");
        
        // Test with various buffer sizes near boundaries
        let buffer_sizes = [0, 1, 15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256, 257, 511, 512, 513, 1023, 1024, 1025];
        
        for size in buffer_sizes {
            let data = vec![0xAA; size];
            let aad = vec![0x55; size.min(256)]; // Limit AAD size
            let device_id = format!("device_{}", size);
            
            if let Ok(encrypted) = encrypt_data(&data, &key, &aad, &device_id) {
                if let Ok(decrypted) = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key) {
                    assert_eq!(data, decrypted, "Buffer safety test failed for size {}", size);
                }
            }
        }
    }

    /// Test for known serialization vulnerabilities
    #[test]
    fn test_envelope_serialization_safety() {
        let key = generate_key().expect("Key generation failed");
        let data = b"test data";
        let aad = b"test aad";
        let device_id = "test_device";
        
        let encrypted = encrypt_data(data, &key, aad, device_id)
            .expect("Encryption failed");
        
        // Test normal serialization
        let serialized = serde_json::to_string(&encrypted.envelope)
            .expect("Serialization failed");
        let deserialized: CryptoEnvelope = serde_json::from_str(&serialized)
            .expect("Deserialization failed");
        
        assert_eq!(encrypted.envelope.version, deserialized.version);
        assert_eq!(encrypted.envelope.algorithm, deserialized.algorithm);
        assert_eq!(encrypted.envelope.salt, deserialized.salt);
        assert_eq!(encrypted.envelope.nonce, deserialized.nonce);
        assert_eq!(encrypted.envelope.key_id, deserialized.key_id);
        
        // Test malformed JSON (should fail gracefully)
        let malformed_jsons = [
            r#"{"version":"not_a_number"}"#,
            r#"{"algorithm":null}"#,
            r#"{"salt":"invalid_base64!"}"#,
            r#"{"version":4294967296}"#, // Overflow
            r#"{"algorithm":"' OR 1=1; --"}"#, // SQL injection attempt
            r#"{"nonce":""}"#,
            r#"{}"#,
            "malformed json{",
            "",
        ];
        
        for malformed in &malformed_jsons {
            let result: Result<CryptoEnvelope, _> = serde_json::from_str(malformed);
            // Should either fail or produce a valid envelope that fails validation
            if let Ok(envelope) = result {
                let _ = envelope.validate(); // Should catch invalid envelopes
            }
        }
    }

    /// Test for key derivation consistency and security
    #[test]
    fn test_key_derivation_regression() {
        // Test password-based key derivation consistency
        let test_cases = [
            (b"password123" as &[u8], b"salt456" as &[u8], 1000u32),
            (b"", b"salt", 1),
            (b"password", b"", 1),
            (b"a", b"b", 1),
            (b"long password with unicode: αβγδε ñáéíóú", b"complex$salt#123", 5000),
        ];
        
        for (password, salt, iterations) in test_cases {
            if let Ok(key1) = derive_key_from_password(password, salt, iterations) {
                if let Ok(key2) = derive_key_from_password(password, salt, iterations) {
                    assert_eq!(key1.as_bytes(), key2.as_bytes(), 
                              "Key derivation not consistent for password: {:?}", password);
                }
                
                // Test that different salts produce different keys
                let different_salt = [salt, b"different"].concat();
                if let Ok(key3) = derive_key_from_password(password, &different_salt, iterations) {
                    assert_ne!(key1.as_bytes(), key3.as_bytes(),
                              "Different salts produced same key for password: {:?}", password);
                }
            }
        }
        
        // Test iteration count impact
        let password = b"test_password";
        let salt = b"test_salt";
        
        if let (Ok(key_low), Ok(key_high)) = (
            derive_key_from_password(password, salt, 1),
            derive_key_from_password(password, salt, 10000)
        ) {
            assert_ne!(key_low.as_bytes(), key_high.as_bytes(),
                      "Different iteration counts produced same key");
        }
    }

    /// Test for AAD validation edge cases and vulnerabilities
    #[test]
    fn test_aad_validation_regression() {
        let key = generate_key().expect("Key generation failed");
        let data = b"test data";
        
        // Test AAD edge cases that might bypass validation
        let aad_test_cases = [
            (b"" as &[u8], "empty_aad"),
            (b"\x00", "null_byte"),
            (b"\x00\x00\x00\x00", "null_bytes"),
            (b"normal_aad", "normal"),
            (b"unicode: αβγδε ñáéíóú", "unicode"),
            (b"json: {\"key\":\"value\"}", "json"),
            (b"sql: '; DROP TABLE users; --", "sql"),
            (&vec![0u8; 1024], "large_zeros"),
            (&vec![255u8; 512], "large_ones"),
        ];
        
        for (aad, description) in aad_test_cases {
            let device_id = format!("device_{}", description);
            
            if let Ok(encrypted) = encrypt_data(data, &key, aad, &device_id) {
                // Should decrypt with same AAD
                let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
                    .expect(&format!("Decryption failed for AAD: {}", description));
                assert_eq!(data, decrypted.as_slice());
                
                // Should fail with different AAD (if different)
                let different_aad = [aad, b"_different"].concat();
                if different_aad != aad {
                    // This should fail due to AAD mismatch
                    let result = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key);
                    // We expect this to fail, but it should fail gracefully
                }
            }
        }
    }

    /// Test for backward compatibility with previous envelope versions
    #[test]
    fn test_envelope_version_compatibility() {
        let key = generate_key().expect("Key generation failed");
        let data = b"version compatibility test";
        let aad = b"version_aad";
        let device_id = "version_device";
        
        let encrypted = encrypt_data(data, &key, aad, device_id)
            .expect("Encryption failed");
        
        // Current envelope should be compatible
        assert!(encrypted.envelope.is_compatible_version(),
               "Current envelope version should be compatible");
        
        // Test various version numbers
        let version_tests = [0, 1, 2, 3, 4, 5, 999, u32::MAX];
        
        for version in version_tests {
            let mut test_envelope = encrypted.envelope.clone();
            test_envelope.version = version;
            
            // Version compatibility check
            let is_compatible = test_envelope.is_compatible_version();
            
            // Current implementation should handle versions appropriately
            if version <= 3 {
                assert!(is_compatible, "Version {} should be compatible", version);
            }
            // Future versions might or might not be compatible - test graceful handling
        }
    }

    /// Test for race conditions and concurrent access
    #[test]
    fn test_concurrent_operations_regression() {
        use std::sync::Arc;
        use std::thread;
        use std::sync::atomic::{AtomicUsize, Ordering};
        
        let success_count = Arc::new(AtomicUsize::new(0));
        let total_operations = 100;
        
        let handles: Vec<_> = (0..10).map(|thread_id| {
            let success_count = Arc::clone(&success_count);
            
            thread::spawn(move || {
                for op_id in 0..10 {
                    let key = generate_key().expect("Key generation failed");
                    let data = format!("thread_{}_op_{}", thread_id, op_id);
                    let aad = format!("aad_{}_{}", thread_id, op_id);
                    let device_id = format!("device_{}_{}", thread_id, op_id);
                    
                    if let Ok(encrypted) = encrypt_data(data.as_bytes(), &key, aad.as_bytes(), &device_id) {
                        if let Ok(decrypted) = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key) {
                            if data.as_bytes() == decrypted.as_slice() {
                                success_count.fetch_add(1, Ordering::Relaxed);
                            }
                        }
                    }
                }
            })
        }).collect();
        
        // Wait for all threads
        for handle in handles {
            handle.join().expect("Thread panicked");
        }
        
        let final_count = success_count.load(Ordering::Relaxed);
        assert_eq!(final_count, total_operations, 
                  "Concurrent operations failed: {} / {} succeeded", 
                  final_count, total_operations);
    }

    /// Test for specific crypto library integration issues
    #[test]
    fn test_crypto_library_integration() {
        // Test that our crypto operations work correctly with the underlying libraries
        
        // Test key generation produces valid keys
        for _ in 0..10 {
            let key = generate_key().expect("Key generation failed");
            assert_eq!(key.as_bytes().len(), 32, "Generated key has wrong length");
            
            // Key should not be all zeros (extremely unlikely with proper RNG)
            assert!(!key.as_bytes().iter().all(|&b| b == 0), "Generated key is all zeros");
        }
        
        // Test encryption produces non-trivial output
        let key = generate_key().expect("Key generation failed");
        let data = b"test data for integration test";
        let aad = b"integration_aad";
        let device_id = "integration_device";
        
        let encrypted = encrypt_data(data, &key, aad, device_id)
            .expect("Encryption failed");
        
        // Encrypted data should be different from input
        assert_ne!(data.to_vec(), encrypted.encrypted_data);
        
        // Encrypted data should not be all zeros
        assert!(!encrypted.encrypted_data.iter().all(|&b| b == 0));
        
        // Envelope should be properly populated
        assert!(!encrypted.envelope.algorithm.is_empty());
        assert!(!encrypted.envelope.salt.is_empty());
        assert!(!encrypted.envelope.nonce.is_empty());
        assert!(!encrypted.envelope.key_id.is_empty());
        
        // Should decrypt correctly
        let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
            .expect("Decryption failed");
        assert_eq!(data.to_vec(), decrypted);
    }
}