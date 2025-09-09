use crypto_core::*;

/// Memory leak detection test suite
/// Tests for proper cleanup and memory hygiene across all crypto operations
#[cfg(test)]
mod memory_leak_tests {
    use super::*;

    #[test]
    fn test_encryption_decryption_memory_leak() {
        // Reset memory tracking
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let data = b"test data for memory leak detection";
        let aad = b"additional authenticated data";
        
        // Perform multiple encryption/decryption cycles
        for i in 0..100 {
            let key = generate_key().expect("Failed to generate key");
            let device_id = format!("device_{}", i);
            
            // Encrypt
            let encrypted = encrypt_data(data, &key, aad, &device_id)
                .expect("Encryption failed");
            
            // Decrypt
            let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
                .expect("Decryption failed");
            
            assert_eq!(data, decrypted.as_slice());
            
            // Force cleanup (keys should be zeroized automatically)
        }
        
        let final_stats = get_memory_stats();
        
        // Memory usage should not grow significantly
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 1024 * 1024, "Memory grew by {} bytes, indicating potential leak", memory_growth);
        
        // All secrets should be properly zeroized
        assert_eq!(final_stats.secrets_zeroized, final_stats.secrets_allocated,
                   "Not all secrets were zeroized: allocated {} vs zeroized {}", 
                   final_stats.secrets_allocated, final_stats.secrets_zeroized);
    }

    #[test]
    fn test_key_generation_memory_cleanup() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        // Generate many keys
        for _ in 0..1000 {
            let _key = generate_key().expect("Failed to generate key");
            // Key should be automatically zeroized when dropped
        }
        
        let final_stats = get_memory_stats();
        
        // All generated keys should be zeroized
        assert!(final_stats.secrets_zeroized >= 1000, 
                "Expected at least 1000 keys to be zeroized, got {}", 
                final_stats.secrets_zeroized);
        
        // Memory should not grow excessively
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 512 * 1024, "Memory grew by {} bytes during key generation", memory_growth);
    }

    #[test]
    fn test_envelope_serialization_memory() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let key = generate_key().expect("Failed to generate key");
        let data = b"test envelope serialization";
        let aad = b"aad for envelope test";
        let device_id = "test_device";
        
        let mut envelopes = Vec::new();
        
        // Create many envelopes
        for _ in 0..100 {
            let encrypted = encrypt_data(data, &key, aad, device_id)
                .expect("Encryption failed");
            
            // Serialize and deserialize
            let serialized = serde_json::to_string(&encrypted.envelope)
                .expect("Serialization failed");
            let deserialized: CryptoEnvelope = serde_json::from_str(&serialized)
                .expect("Deserialization failed");
            
            envelopes.push(deserialized);
        }
        
        let final_stats = get_memory_stats();
        
        // Check that serialization/deserialization doesn't leak
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 256 * 1024, "Envelope operations caused memory growth of {} bytes", memory_growth);
        
        // Clear envelopes and check cleanup
        drop(envelopes);
        
        let cleanup_stats = get_memory_stats();
        assert!(cleanup_stats.total_allocated <= final_stats.total_allocated,
                "Memory not properly cleaned up after dropping envelopes");
    }

    #[test]
    fn test_aad_validation_memory() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let key = generate_key().expect("Failed to generate key");
        let data = b"test aad validation";
        let device_id = "test_device";
        
        // Test with various AAD sizes
        for size in [16, 64, 256, 1024, 4096] {
            let aad = vec![0xAA; size];
            
            let encrypted = encrypt_data(data, &key, &aad, device_id)
                .expect("Encryption failed");
            
            let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
                .expect("Decryption failed");
            
            assert_eq!(data, decrypted.as_slice());
        }
        
        let final_stats = get_memory_stats();
        
        // AAD handling should not leak memory
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 128 * 1024, "AAD validation caused memory growth of {} bytes", memory_growth);
    }

    #[test]
    fn test_concurrent_operations_memory() {
        use std::sync::Arc;
        use std::thread;
        
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let data = Arc::new(b"concurrent test data".to_vec());
        let aad = Arc::new(b"concurrent aad".to_vec());
        
        // Spawn multiple threads performing crypto operations
        let handles: Vec<_> = (0..10).map(|i| {
            let data = Arc::clone(&data);
            let aad = Arc::clone(&aad);
            
            thread::spawn(move || {
                for j in 0..10 {
                    let key = generate_key().expect("Failed to generate key");
                    let device_id = format!("device_{}_{}", i, j);
                    
                    let encrypted = encrypt_data(&data, &key, &aad, &device_id)
                        .expect("Encryption failed");
                    
                    let decrypted = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key)
                        .expect("Decryption failed");
                    
                    assert_eq!(data.as_slice(), decrypted.as_slice());
                }
            })
        }).collect();
        
        // Wait for all threads to complete
        for handle in handles {
            handle.join().expect("Thread failed");
        }
        
        let final_stats = get_memory_stats();
        
        // Concurrent operations should not cause excessive memory growth
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 2 * 1024 * 1024, "Concurrent operations caused memory growth of {} bytes", memory_growth);
        
        // All secrets should be properly zeroized
        assert!(final_stats.secrets_zeroized >= 100, 
                "Expected at least 100 secrets to be zeroized in concurrent test, got {}", 
                final_stats.secrets_zeroized);
    }

    #[test]
    fn test_error_handling_memory_cleanup() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let key = generate_key().expect("Failed to generate key");
        let data = b"test error handling";
        let aad = b"test aad";
        let device_id = "test_device";
        
        // Create valid encryption
        let encrypted = encrypt_data(data, &key, aad, device_id)
            .expect("Encryption failed");
        
        // Test error scenarios
        for _ in 0..50 {
            // Try to decrypt with wrong key
            let wrong_key = generate_key().expect("Failed to generate key");
            let _ = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &wrong_key);
            
            // Try to decrypt corrupted data
            let mut corrupted_data = encrypted.encrypted_data.clone();
            if !corrupted_data.is_empty() {
                corrupted_data[0] ^= 0xFF;
            }
            let _ = decrypt_data(&corrupted_data, &encrypted.envelope, &key);
        }
        
        let final_stats = get_memory_stats();
        
        // Error handling should not leak memory
        let memory_growth = final_stats.total_allocated - initial_stats.total_allocated;
        assert!(memory_growth < 256 * 1024, "Error handling caused memory growth of {} bytes", memory_growth);
        
        // All secrets used in error scenarios should be zeroized
        assert!(final_stats.secrets_zeroized >= 50, 
                "Expected error handling to zeroize secrets, got {}", 
                final_stats.secrets_zeroized);
    }

    #[test]
    fn test_memory_statistics_accuracy() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        // Verify initial state
        assert_eq!(initial_stats.secrets_allocated, 0);
        assert_eq!(initial_stats.secrets_zeroized, 0);
        assert_eq!(initial_stats.operations_count, 0);
        
        // Perform tracked operations
        let key1 = generate_key().expect("Failed to generate key");
        let key2 = generate_key().expect("Failed to generate key");
        
        let stats_after_keys = get_memory_stats();
        assert!(stats_after_keys.secrets_allocated >= 2);
        assert!(stats_after_keys.operations_count >= 2);
        
        // Drop keys and verify cleanup tracking
        drop(key1);
        drop(key2);
        
        // Give some time for cleanup to be tracked
        std::thread::sleep(std::time::Duration::from_millis(10));
        
        let final_stats = get_memory_stats();
        assert!(final_stats.secrets_zeroized >= 2, 
                "Memory statistics not accurately tracking zeroization");
    }
}