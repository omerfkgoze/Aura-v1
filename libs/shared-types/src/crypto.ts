// Crypto-related types for zero-knowledge encryption

export interface EncryptedData {
  ciphertext: string;
  nonce: string;
  aad: string; // Additional Authenticated Data
  version: string;
}

export interface CryptoKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface DeviceFingerprint {
  saltedHash: string;
  timestamp: number;
}

export interface EncryptionEnvelope {
  encryptedData: EncryptedData;
  keyId: string;
  algorithm: string;
}
