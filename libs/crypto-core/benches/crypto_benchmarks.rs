use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use crypto_core::{
    keys::CryptoKey,
    envelope::{CryptoEnvelope, CryptoEnvelopeBuilder},
    aad::AADValidator,
    memory::SecureBuffer,
};
use std::time::Duration;

fn benchmark_key_generation(c: &mut Criterion) {
    let mut group = c.benchmark_group("key_generation");
    
    group.bench_function("encryption_key", |b| {
        b.iter(|| {
            let key = CryptoKey::new("encryption").unwrap();
            black_box(&key);
            key.free();
        })
    });
    
    group.bench_function("signing_key", |b| {
        b.iter(|| {
            let key = CryptoKey::new("signing").unwrap();
            black_box(&key);
            key.free();
        })
    });
    
    group.finish();
}

fn benchmark_encryption_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("encryption");
    
    // Test different data sizes
    let sizes = vec![64, 256, 1024, 4096, 16384, 65536];
    
    for size in sizes {
        let data = vec![0u8; size];
        let key = CryptoKey::new("encryption").unwrap();
        
        group.throughput(Throughput::Bytes(size as u64));
        group.bench_with_input(
            BenchmarkId::new("encrypt", size),
            &data,
            |b, data| {
                b.iter(|| {
                    let envelope = CryptoEnvelopeBuilder::new()
                        .with_algorithm("aes-256-gcm")
                        .with_version(1)
                        .encrypt(black_box(data), &key)
                        .unwrap();
                    black_box(&envelope);
                })
            },
        );
    }
    
    group.finish();
}

fn benchmark_decryption_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("decryption");
    
    let sizes = vec![64, 256, 1024, 4096, 16384, 65536];
    
    for size in sizes {
        let data = vec![0u8; size];
        let key = CryptoKey::new("encryption").unwrap();
        
        // Pre-encrypt data for decryption benchmark
        let envelope = CryptoEnvelopeBuilder::new()
            .with_algorithm("aes-256-gcm")
            .with_version(1)
            .encrypt(&data, &key)
            .unwrap();
        
        group.throughput(Throughput::Bytes(size as u64));
        group.bench_with_input(
            BenchmarkId::new("decrypt", size),
            &envelope,
            |b, envelope| {
                b.iter(|| {
                    let decrypted = envelope.decrypt(black_box(&key)).unwrap();
                    black_box(&decrypted);
                })
            },
        );
    }
    
    group.finish();
}

fn benchmark_aad_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("aad_validation");
    
    group.bench_function("generate_aad", |b| {
        let mut validator = AADValidator::new("cycle_data");
        validator.set_user_id("test-user-123");
        validator.set_timestamp(1234567890);
        
        b.iter(|| {
            let aad = validator.generate_aad();
            black_box(&aad);
        })
    });
    
    group.bench_function("validate_aad", |b| {
        let mut validator = AADValidator::new("cycle_data");
        validator.set_user_id("test-user-123");
        validator.set_timestamp(1234567890);
        let aad = validator.generate_aad();
        
        b.iter(|| {
            let result = validator.validate_aad(black_box(&aad));
            black_box(result);
        })
    });
    
    group.finish();
}

fn benchmark_envelope_serialization(c: &mut Criterion) {
    let mut group = c.benchmark_group("envelope_serialization");
    
    let data = vec![0u8; 1024];
    let key = CryptoKey::new("encryption").unwrap();
    let envelope = CryptoEnvelopeBuilder::new()
        .with_algorithm("aes-256-gcm")
        .with_version(1)
        .encrypt(&data, &key)
        .unwrap();
    
    group.bench_function("to_json", |b| {
        b.iter(|| {
            let json = envelope.to_json().unwrap();
            black_box(&json);
        })
    });
    
    let json = envelope.to_json().unwrap();
    group.bench_function("from_json", |b| {
        b.iter(|| {
            let envelope = CryptoEnvelope::from_json(black_box(&json)).unwrap();
            black_box(&envelope);
        })
    });
    
    group.finish();
}

fn benchmark_memory_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("memory_operations");
    
    let sizes = vec![64, 256, 1024, 4096];
    
    for size in sizes {
        group.throughput(Throughput::Bytes(size as u64));
        group.bench_with_input(
            BenchmarkId::new("secure_buffer_alloc", size),
            &size,
            |b, &size| {
                b.iter(|| {
                    let buffer = SecureBuffer::new(black_box(size));
                    black_box(&buffer);
                })
            },
        );
        
        let data = vec![0u8; size];
        group.bench_with_input(
            BenchmarkId::new("secure_buffer_copy", size),
            &data,
            |b, data| {
                b.iter(|| {
                    let mut buffer = SecureBuffer::new(data.len());
                    buffer.copy_from_slice(black_box(data));
                    black_box(&buffer);
                })
            },
        );
    }
    
    group.finish();
}

fn benchmark_target_validation(c: &mut Criterion) {
    let mut group = c.benchmark_group("target_validation");
    
    // Performance target: <500ms for crypto operations
    group.measurement_time(Duration::from_secs(10));
    group.warm_up_time(Duration::from_secs(3));
    
    // Test critical path operations that must meet 500ms target
    group.bench_function("full_encrypt_decrypt_cycle_1kb", |b| {
        let data = vec![0u8; 1024];
        
        b.iter(|| {
            // Full encryption/decryption cycle
            let key = CryptoKey::new("encryption").unwrap();
            let envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(black_box(&data), &key)
                .unwrap();
            
            let decrypted = envelope.decrypt(&key).unwrap();
            black_box(&decrypted);
            key.free();
        })
    });
    
    group.bench_function("full_encrypt_decrypt_cycle_64kb", |b| {
        let data = vec![0u8; 65536];
        
        b.iter(|| {
            let key = CryptoKey::new("encryption").unwrap();
            let envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(black_box(&data), &key)
                .unwrap();
            
            let decrypted = envelope.decrypt(&key).unwrap();
            black_box(&decrypted);
            key.free();
        })
    });
    
    // Test AAD validation performance
    group.bench_function("aad_generation_validation_cycle", |b| {
        b.iter(|| {
            let mut validator = AADValidator::new("cycle_data");
            validator.set_user_id("test-user-123");
            validator.set_timestamp(black_box(1234567890));
            
            let aad = validator.generate_aad();
            let result = validator.validate_aad(&aad);
            black_box(result);
            validator.free();
        })
    });
    
    group.finish();
}

fn benchmark_concurrent_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("concurrent_operations");
    
    use std::sync::Arc;
    use std::thread;
    
    group.bench_function("parallel_key_generation", |b| {
        b.iter(|| {
            let handles: Vec<_> = (0..4).map(|_| {
                thread::spawn(|| {
                    let key = CryptoKey::new("encryption").unwrap();
                    black_box(&key);
                    key.free();
                })
            }).collect();
            
            for handle in handles {
                handle.join().unwrap();
            }
        })
    });
    
    group.bench_function("parallel_encryption", |b| {
        let data = Arc::new(vec![0u8; 1024]);
        
        b.iter(|| {
            let handles: Vec<_> = (0..4).map(|_| {
                let data = Arc::clone(&data);
                thread::spawn(move || {
                    let key = CryptoKey::new("encryption").unwrap();
                    let envelope = CryptoEnvelopeBuilder::new()
                        .with_algorithm("aes-256-gcm")
                        .with_version(1)
                        .encrypt(&data, &key)
                        .unwrap();
                    black_box(&envelope);
                    key.free();
                })
            }).collect();
            
            for handle in handles {
                handle.join().unwrap();
            }
        })
    });
    
    group.finish();
}

fn benchmark_cross_platform_consistency(c: &mut Criterion) {
    let mut group = c.benchmark_group("cross_platform");
    
    // Ensure consistent performance across platforms
    let data = vec![0u8; 1024];
    let key = CryptoKey::new("encryption").unwrap();
    
    group.bench_function("encrypt_consistency_test", |b| {
        b.iter(|| {
            let envelope = CryptoEnvelopeBuilder::new()
                .with_algorithm("aes-256-gcm")
                .with_version(1)
                .encrypt(black_box(&data), &key)
                .unwrap();
            
            // Verify output is consistent
            assert!(!envelope.get_encrypted_data().is_empty());
            assert_eq!(envelope.get_nonce().len(), 12); // GCM nonce size
            
            black_box(&envelope);
        })
    });
    
    group.finish();
}

// Custom criterion configuration for performance targets
fn create_criterion() -> Criterion {
    Criterion::default()
        .measurement_time(Duration::from_secs(5))
        .warm_up_time(Duration::from_secs(2))
        .with_plots() // Generate performance plots
        .significance_level(0.05)
        .sample_size(100)
        .configure_from_args()
}

criterion_group! {
    name = crypto_benchmarks;
    config = create_criterion();
    targets = 
        benchmark_key_generation,
        benchmark_encryption_operations,
        benchmark_decryption_operations,
        benchmark_aad_operations,
        benchmark_envelope_serialization,
        benchmark_memory_operations,
        benchmark_target_validation,
        benchmark_concurrent_operations,
        benchmark_cross_platform_consistency
}

criterion_main!(crypto_benchmarks);