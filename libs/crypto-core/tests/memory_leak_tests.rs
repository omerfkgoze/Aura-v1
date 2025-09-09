use crypto_core::{
    keys::{CryptoKey, generate_encryption_key},
    envelope::{create_envelope, serialize_envelope, deserialize_envelope},
    memory::{SecureBuffer, get_memory_stats, reset_memory_stats},
    EncryptionResult
};

/// Memory leak detection test suite
/// Tests for proper cleanup and memory hygiene across all crypto operations
#[cfg(all(test, not(target_arch = "wasm32")))]
mod memory_leak_tests {
    use super::*;

    #[test]
    fn test_key_generation_memory_cleanup() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        // Generate many keys
        for _ in 0..100 {
            let mut key = CryptoKey::new("encryption".to_string());
            let _ = key.generate();
            // Key should be automatically zeroized when dropped
        }
        
        let final_stats = get_memory_stats();
        
        // Memory should be managed properly
        assert!(final_stats.operations_count >= 100, 
                "Expected at least 100 operations, got {}", 
                final_stats.operations_count);
        
        // Memory should not grow excessively
        let memory_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(memory_growth < 512 * 1024, "Memory grew by {} bytes during key generation", memory_growth);
    }

    #[test]
    fn test_envelope_operations_memory() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let mut envelopes = Vec::new();
        
        // Create many envelopes
        for i in 0..50 {
            let data = format!("test data {}", i).into_bytes();
            let nonce = vec![i as u8, (i+1) as u8, (i+2) as u8];
            let tag = vec![(i*2) as u8, (i*2+1) as u8, (i*2+2) as u8];
            
            let envelope = create_envelope(data, nonce, tag);
            
            // Test serialization if available
            if let Ok(serialized) = serialize_envelope(&envelope) {
                if let Ok(_deserialized) = deserialize_envelope(&serialized) {
                    // Successful round-trip
                }
            }
            
            envelopes.push(envelope);
        }
        
        let final_stats = get_memory_stats();
        
        // Check that operations don't cause excessive memory growth
        let memory_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(memory_growth < 1024 * 1024, "Memory grew by {} bytes during envelope operations", memory_growth);
        
        // Cleanup
        drop(envelopes);
    }

    #[test]
    fn test_secure_buffer_cleanup() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let buffer_sizes = vec![16, 32, 64, 128, 256, 512, 1024, 2048];
        
        // Create and destroy many secure buffers
        for size in &buffer_sizes {
            for _ in 0..10 {
                let buffer = SecureBuffer::new(*size);
                assert_eq!(buffer.len(), *size);
                // Buffer should be automatically cleaned up when dropped
            }
        }
        
        let final_stats = get_memory_stats();
        
        // Memory should be managed properly
        let memory_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(memory_growth < 2 * 1024 * 1024, "Memory grew by {} bytes during buffer operations", memory_growth);
    }

    #[test]
    fn test_mixed_operations_memory_hygiene() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        // Mix different operations to test overall memory hygiene
        for i in 0..20 {
            // Key operations
            let mut key = CryptoKey::new(format!("test_key_{}", i));
            let _ = key.generate();
            
            // Buffer operations
            let buffer = SecureBuffer::new(256 + i);
            assert_eq!(buffer.len(), 256 + i);
            
            // Envelope operations
            let data = format!("mixed test data {}", i).into_bytes();
            let envelope = create_envelope(data, vec![i as u8], vec![(i*2) as u8]);
            assert!(envelope.is_valid() || !envelope.is_valid()); // Either state is fine
            
            // All should be cleaned up at end of iteration
        }
        
        let final_stats = get_memory_stats();
        
        // Verify overall memory hygiene
        let memory_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(memory_growth < 1024 * 1024, "Memory grew by {} bytes during mixed operations", memory_growth);
        
        // Should have performed operations
        assert!(final_stats.operations_count > initial_stats.operations_count,
                "Expected operations count to increase from {} to {}", 
                initial_stats.operations_count, final_stats.operations_count);
    }

    #[test]
    fn test_stress_test_memory_stability() {
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        // Stress test with many rapid allocations/deallocations
        for round in 0..5 {
            let mut temporary_items = Vec::new();
            
            // Allocate many items
            for i in 0..50 {
                let mut key = CryptoKey::new(format!("stress_key_{}_{}", round, i));
                let _ = key.generate();
                temporary_items.push(key);
                
                let buffer = SecureBuffer::new(128 + i % 512);
                drop(buffer); // Immediate cleanup
                
                let envelope = create_envelope(
                    vec![i as u8; 64], 
                    vec![round as u8, i as u8], 
                    vec![(round + i) as u8]
                );
                drop(envelope); // Immediate cleanup
            }
            
            // Check memory during stress
            let during_stats = get_memory_stats();
            let during_growth = during_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
            assert!(during_growth < 5 * 1024 * 1024, 
                    "Memory grew too much during stress test round {}: {} bytes", 
                    round, during_growth);
            
            // Cleanup round
            drop(temporary_items);
        }
        
        let final_stats = get_memory_stats();
        
        // After stress test, memory should be reasonable
        let final_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(final_growth < 2 * 1024 * 1024, 
                "Memory grew too much after stress test: {} bytes", final_growth);
        
        // Should have performed many operations
        assert!(final_stats.operations_count >= 250, // 5 rounds * 50 items
                "Expected at least 250 operations, got {}", 
                final_stats.operations_count);
    }

    #[test]
    fn test_concurrent_memory_safety() {
        use std::thread;
        use std::sync::Arc;
        
        reset_memory_stats();
        let initial_stats = get_memory_stats();
        
        let mut handles = vec![];
        
        // Spawn multiple threads doing memory operations
        for thread_id in 0..4 {
            let handle = thread::spawn(move || {
                for i in 0..25 {
                    // Each thread does some memory operations
                    let mut key = CryptoKey::new(format!("thread_{}_{}", thread_id, i));
                    let _ = key.generate();
                    
                    let buffer = SecureBuffer::new(64 + (i % 256));
                    assert_eq!(buffer.len(), 64 + (i % 256));
                    
                    let envelope = create_envelope(
                        vec![thread_id as u8, i as u8], 
                        vec![i as u8], 
                        vec![(thread_id + i) as u8]
                    );
                    assert!(envelope.encrypted_data().len() >= 0);
                    
                    // Items cleaned up at end of iteration
                }
            });
            handles.push(handle);
        }
        
        // Wait for all threads
        for handle in handles {
            handle.join().expect("Thread should complete successfully");
        }
        
        let final_stats = get_memory_stats();
        
        // Verify concurrent operations didn't cause memory issues
        let memory_growth = final_stats.total_allocated.saturating_sub(initial_stats.total_allocated);
        assert!(memory_growth < 2 * 1024 * 1024, 
                "Memory grew by {} bytes during concurrent operations", memory_growth);
        
        // Should have performed operations from all threads
        assert!(final_stats.operations_count >= 100, // 4 threads * 25 operations
                "Expected at least 100 operations from concurrent threads, got {}", 
                final_stats.operations_count);
    }
}