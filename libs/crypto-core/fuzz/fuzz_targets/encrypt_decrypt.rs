#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::{Arbitrary, Unstructured};
use crypto_core::{encrypt_data, decrypt_data, generate_key};

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    data: Vec<u8>,
    aad: Vec<u8>,
    device_id: String,
}

fuzz_target!(|input: FuzzInput| {
    // Limit input sizes to prevent excessive memory usage during fuzzing
    if input.data.len() > 10240 || input.aad.len() > 1024 || input.device_id.len() > 256 {
        return;
    }

    // Generate a valid key
    if let Ok(key) = generate_key() {
        // Test encryption
        if let Ok(encrypted) = encrypt_data(&input.data, &key, &input.aad, &input.device_id) {
            // Test decryption of valid encrypted data
            if let Ok(decrypted) = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key) {
                // Verify round-trip correctness
                assert_eq!(input.data, decrypted);
            }
            
            // Test decryption with corrupted data (should fail gracefully)
            let mut corrupted_data = encrypted.encrypted_data.clone();
            if !corrupted_data.is_empty() {
                corrupted_data[0] = corrupted_data[0].wrapping_add(1);
                let _ = decrypt_data(&corrupted_data, &encrypted.envelope, &key);
            }
            
            // Test decryption with wrong key (should fail gracefully)
            if let Ok(wrong_key) = generate_key() {
                let _ = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &wrong_key);
            }
        }
    }
});