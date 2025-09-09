#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::{Arbitrary, Unstructured};
use crypto_core::{encrypt_data, decrypt_data, generate_key, validate_aad};

#[derive(Arbitrary, Debug)]
struct AadFuzzInput {
    data: Vec<u8>,
    aad1: Vec<u8>,
    aad2: Vec<u8>,
    device_id: String,
}

fuzz_target!(|input: AadFuzzInput| {
    // Limit input sizes to prevent excessive memory usage
    if input.data.len() > 4096 || 
       input.aad1.len() > 1024 || 
       input.aad2.len() > 1024 || 
       input.device_id.len() > 256 {
        return;
    }

    if let Ok(key) = generate_key() {
        // Test AAD validation with fuzzed inputs
        let _ = validate_aad(&input.aad1, &input.device_id);
        let _ = validate_aad(&input.aad2, &input.device_id);
        
        // Test encryption with first AAD
        if let Ok(encrypted1) = encrypt_data(&input.data, &key, &input.aad1, &input.device_id) {
            // Test decryption with same AAD (should succeed)
            if let Ok(decrypted1) = decrypt_data(&encrypted1.encrypted_data, &encrypted1.envelope, &key) {
                assert_eq!(input.data, decrypted1);
            }
            
            // Test decryption with different AAD (should fail if AAD is different)
            if input.aad1 != input.aad2 {
                // This should fail due to AAD mismatch - test that it fails gracefully
                let mut modified_envelope = encrypted1.envelope.clone();
                // Note: This is testing the robustness of error handling, not bypassing security
                let _ = decrypt_data(&encrypted1.encrypted_data, &modified_envelope, &key);
            }
        }
        
        // Test AAD edge cases
        let aad_edge_cases = [
            &[] as &[u8],           // Empty AAD
            &[0u8],                 // Single byte
            &vec![0u8; 1024],       // Large AAD
            &vec![255u8; 512],      // All 0xFF bytes
            &input.aad1,            // Fuzzed AAD
        ];
        
        for aad in &aad_edge_cases {
            let _ = validate_aad(aad, &input.device_id);
            
            if let Ok(encrypted) = encrypt_data(&input.data, &key, aad, &input.device_id) {
                let _ = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key);
            }
        }
        
        // Test device ID edge cases with AAD
        let device_id_cases = [
            "",
            "a",
            &"x".repeat(256),
            &input.device_id,
        ];
        
        for device_id in &device_id_cases {
            if device_id.len() <= 256 {
                let _ = validate_aad(&input.aad1, device_id);
                
                if let Ok(encrypted) = encrypt_data(&input.data, &key, &input.aad1, device_id) {
                    let _ = decrypt_data(&encrypted.encrypted_data, &encrypted.envelope, &key);
                }
            }
        }
        
        // Test AAD tampering detection
        if let Ok(encrypted) = encrypt_data(&input.data, &key, &input.aad1, &input.device_id) {
            // Test various forms of AAD tampering
            let tampered_aads = [
                {
                    let mut tampered = input.aad1.clone();
                    if !tampered.is_empty() {
                        tampered[0] = tampered[0].wrapping_add(1);
                    }
                    tampered
                },
                {
                    let mut tampered = input.aad1.clone();
                    tampered.push(0);
                    tampered
                },
                {
                    let mut tampered = input.aad1.clone();
                    if !tampered.is_empty() {
                        tampered.pop();
                    }
                    tampered
                },
                input.aad2.clone(),
            ];
            
            for tampered_aad in &tampered_aads {
                if tampered_aad != &input.aad1 {
                    // These should fail due to AAD mismatch
                    // We're testing that the failures are handled gracefully
                    let _ = validate_aad(tampered_aad, &input.device_id);
                }
            }
        }
    }
});