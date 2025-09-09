#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::{Arbitrary, Unstructured};
use crypto_core::{CryptoEnvelope, CryptoError};
use serde_json;

#[derive(Arbitrary, Debug)]
struct EnvelopeFuzzInput {
    json_data: Vec<u8>,
    version: u32,
    algorithm: String,
    kdf_params: Vec<u8>,
    salt: Vec<u8>,
    nonce: Vec<u8>,
    key_id: String,
}

fuzz_target!(|input: EnvelopeFuzzInput| {
    // Test JSON parsing with arbitrary data
    let _ = serde_json::from_slice::<CryptoEnvelope>(&input.json_data);
    
    // Test envelope creation with fuzzed parameters
    if input.algorithm.len() <= 64 && 
       input.kdf_params.len() <= 1024 && 
       input.salt.len() <= 256 && 
       input.nonce.len() <= 256 && 
       input.key_id.len() <= 128 {
        
        let envelope = CryptoEnvelope {
            version: input.version,
            algorithm: input.algorithm.clone(),
            kdf_params: input.kdf_params.clone(),
            salt: input.salt.clone(),
            nonce: input.nonce.clone(),
            key_id: input.key_id.clone(),
        };
        
        // Test serialization
        if let Ok(serialized) = serde_json::to_string(&envelope) {
            // Test deserialization
            let _: Result<CryptoEnvelope, _> = serde_json::from_str(&serialized);
        }
        
        // Test envelope validation
        let _ = envelope.validate();
        
        // Test envelope compatibility checking
        let _ = envelope.is_compatible_version();
    }
    
    // Test malformed JSON structures
    let malformed_jsons = [
        b"{\"version\":}",
        b"{\"version\":null}",
        b"{\"algorithm\":123}",
        b"{\"salt\":\"invalid_base64!\"}",
        b"{\"nonce\":[1,2,3]}",
        b"{}",
        b"null",
        b"[]",
        b"\"string\"",
        &input.json_data,
    ];
    
    for malformed in &malformed_jsons {
        let _ = serde_json::from_slice::<CryptoEnvelope>(malformed);
    }
});