#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::{Arbitrary, Unstructured};
use crypto_core::{generate_key, derive_key_from_password, CryptoError};

#[derive(Arbitrary, Debug)]
struct KeyFuzzInput {
    password: Vec<u8>,
    salt: Vec<u8>,
    iterations: u32,
    key_material: Vec<u8>,
}

fuzz_target!(|input: KeyFuzzInput| {
    // Test key generation (should always succeed)
    let _ = generate_key();
    
    // Test password-based key derivation with fuzzed inputs
    if input.password.len() <= 1024 && input.salt.len() <= 256 {
        // Limit iterations to prevent excessive computation during fuzzing
        let limited_iterations = std::cmp::min(input.iterations, 10000);
        
        if limited_iterations > 0 {
            let _ = derive_key_from_password(&input.password, &input.salt, limited_iterations);
        }
    }
    
    // Test edge cases for password derivation
    let edge_cases = [
        (&[] as &[u8], &[] as &[u8], 1u32),  // Empty password and salt
        (b"", b"salt", 1),                    // Empty password
        (b"password", b"", 1),                // Empty salt
        (b"a", b"b", 1),                      // Minimal inputs
        (&vec![0u8; 1024], &vec![0u8; 256], 1), // Large inputs
        (&input.password, &input.salt, 1),    // Fuzzed inputs with minimal iterations
    ];
    
    for (password, salt, iterations) in &edge_cases {
        if password.len() <= 1024 && salt.len() <= 256 {
            let _ = derive_key_from_password(password, salt, *iterations);
        }
    }
    
    // Test with various invalid parameters
    let _ = derive_key_from_password(&input.password, &input.salt, 0); // Should fail
    
    // Test key material handling if we have a key derivation function that accepts raw material
    if input.key_material.len() >= 32 && input.key_material.len() <= 64 {
        // Test creating keys from raw material (if such function exists)
        // This would test the key validation and sanitization
    }
    
    // Test multiple key generations for consistency
    if let (Ok(key1), Ok(key2)) = (generate_key(), generate_key()) {
        // Keys should be different
        assert_ne!(key1.as_bytes(), key2.as_bytes());
    }
    
    // Test password-based derivation consistency
    if !input.password.is_empty() && !input.salt.is_empty() && input.password.len() <= 256 && input.salt.len() <= 64 {
        if let (Ok(key1), Ok(key2)) = (
            derive_key_from_password(&input.password, &input.salt, 1000),
            derive_key_from_password(&input.password, &input.salt, 1000)
        ) {
            // Same inputs should produce same keys
            assert_eq!(key1.as_bytes(), key2.as_bytes());
        }
    }
});