import { NextApiRequest, NextApiResponse } from 'next';
import { devLogger, cryptoLogger } from '@aura/logger';
import { securityConfig } from '../../../config/env';

/**
 * Development-only crypto validation endpoint
 * Tests encryption, hashing, and device fingerprinting operations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {} as Record<string, any>,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        overall: 'unknown' as 'pass' | 'fail',
      },
    };
    
    // Test 1: Basic cryptographic operations
    const basicCryptoTest = await testBasicCrypto();
    testResults.tests.basicCrypto = basicCryptoTest;
    cryptoLogger.operation('test_basic', 'sha256', basicCryptoTest.passed);
    
    // Test 2: Device pepper validation
    const devicePepperTest = await testDevicePepper();
    testResults.tests.devicePepper = devicePepperTest;
    cryptoLogger.operation('test_device_pepper', 'hmac-sha256', devicePepperTest.passed);
    
    // Test 3: Encryption/Decryption operations
    const encryptionTest = await testEncryption();
    testResults.tests.encryption = encryptionTest;
    cryptoLogger.operation('test_encryption', 'aes-256-gcm', encryptionTest.passed);
    
    // Test 4: Hash consistency and security
    const hashTest = await testHashOperations();
    testResults.tests.hashing = hashTest;
    cryptoLogger.operation('test_hashing', 'pbkdf2', hashTest.passed);
    
    // Calculate summary
    const allTests = Object.values(testResults.tests);
    testResults.summary.total = allTests.length;
    testResults.summary.passed = allTests.filter(test => test.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    testResults.summary.overall = testResults.summary.failed === 0 ? 'pass' : 'fail';
    
    const responseTime = Date.now() - startTime;
    devLogger.cryptoTest('validation_suite', testResults.summary.overall === 'pass', responseTime);
    
    return res.status(200).json(testResults);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    devLogger.cryptoTest('validation_error', false, responseTime);
    
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Crypto validation failed',
      tests: {},
      summary: { total: 0, passed: 0, failed: 0, overall: 'fail' },
    });
  }
}

async function testBasicCrypto() {
  const startTime = Date.now();
  
  try {
    const crypto = require('crypto');
    const testData = 'Aura crypto validation test data';
    
    // Test SHA-256 consistency
    const hash1 = crypto.createHash('sha256').update(testData).digest('hex');
    const hash2 = crypto.createHash('sha256').update(testData).digest('hex');
    const hashConsistent = hash1 === hash2 && hash1.length === 64;
    
    // Test random number generation
    const random1 = crypto.randomBytes(32);
    const random2 = crypto.randomBytes(32);
    const randomUnique = !random1.equals(random2) && random1.length === 32;
    
    // Test timing-safe comparison
    const timingSafeEqual = crypto.timingSafeEqual(
      Buffer.from(hash1, 'hex'),
      Buffer.from(hash2, 'hex')
    );
    
    const allPassed = hashConsistent && randomUnique && timingSafeEqual;
    
    return {
      passed: allPassed,
      duration: Date.now() - startTime,
      details: {
        hashConsistency: hashConsistent,
        randomUniqueness: randomUnique,
        timingSafeComparison: timingSafeEqual,
        sampleHash: hash1.substring(0, 16) + '...',
      },
    };
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: 'Basic crypto test failed',
    };
  }
}

async function testDevicePepper() {
  const startTime = Date.now();
  
  try {
    const crypto = require('crypto');
    
    // Simulate device identification process
    const mockDeviceInfo = {
      userAgent: 'MockUserAgent/1.0',
      screen: '1920x1080',
      timezone: 'UTC',
    };
    
    const deviceString = JSON.stringify(mockDeviceInfo);
    
    // Test frontend pepper (accessible to client)
    const frontendHash = crypto
      .createHmac('sha256', securityConfig.devicePepper)
      .update(deviceString)
      .digest('hex');
    
    // Test backend pepper (server-side validation)
    const backendHash = crypto
      .createHmac('sha256', securityConfig.deviceHashPepper)
      .update(frontendHash)
      .digest('hex');
    
    // Verify peppers are different (security requirement)
    const peppersAreDifferent = securityConfig.devicePepper !== securityConfig.deviceHashPepper;
    
    // Verify hash consistency
    const frontendHash2 = crypto
      .createHmac('sha256', securityConfig.devicePepper)
      .update(deviceString)
      .digest('hex');
    
    const hashConsistent = frontendHash === frontendHash2;
    
    const allPassed = peppersAreDifferent && hashConsistent && 
      frontendHash.length === 64 && backendHash.length === 64;
    
    return {
      passed: allPassed,
      duration: Date.now() - startTime,
      details: {
        peppersAreDifferent,
        hashConsistency: hashConsistent,
        frontendHashLength: frontendHash.length,
        backendHashLength: backendHash.length,
        sampleFrontendHash: frontendHash.substring(0, 16) + '...',
        sampleBackendHash: backendHash.substring(0, 16) + '...',
      },
    };
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: 'Device pepper test failed',
    };
  }
}

async function testEncryption() {
  const startTime = Date.now();
  
  try {
    const crypto = require('crypto');
    const testData = 'Sensitive health data simulation for testing';
    
    // Generate encryption key (would come from secure key management in production)
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Encrypt
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(testData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Decrypt
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Verify round-trip
    const roundTripSuccess = decrypted === testData;
    
    // Verify encrypted data is different from original
    const encryptedIsDifferent = encrypted !== testData;
    
    const allPassed = roundTripSuccess && encryptedIsDifferent;
    
    return {
      passed: allPassed,
      duration: Date.now() - startTime,
      details: {
        roundTripSuccess,
        encryptedIsDifferent,
        originalLength: testData.length,
        encryptedLength: encrypted.length,
        decryptedLength: decrypted.length,
      },
    };
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: 'Encryption test failed',
    };
  }
}

async function testHashOperations() {
  const startTime = Date.now();
  
  try {
    const crypto = require('crypto');
    const password = 'test-password-123';
    const salt = crypto.randomBytes(32);
    
    // Test PBKDF2 (password hashing)
    const hash1 = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    const hash2 = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
    const pbkdf2Consistent = hash1.equals(hash2);
    
    // Test different salts produce different hashes
    const salt2 = crypto.randomBytes(32);
    const hash3 = crypto.pbkdf2Sync(password, salt2, 100000, 64, 'sha256');
    const differentSaltsDifferentHashes = !hash1.equals(hash3);
    
    // Test timing attack resistance
    const wrongPassword = 'wrong-password-123';
    const wrongHash = crypto.pbkdf2Sync(wrongPassword, salt, 100000, 64, 'sha256');
    const wrongPasswordDifferentHash = !hash1.equals(wrongHash);
    
    const allPassed = pbkdf2Consistent && differentSaltsDifferentHashes && wrongPasswordDifferentHash;
    
    return {
      passed: allPassed,
      duration: Date.now() - startTime,
      details: {
        pbkdf2Consistency: pbkdf2Consistent,
        differentSaltsProduceDifferentHashes: differentSaltsDifferentHashes,
        wrongPasswordProducesDifferentHash: wrongPasswordDifferentHash,
        hashLength: hash1.length,
        saltLength: salt.length,
      },
    };
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      error: 'Hash operations test failed',
    };
  }
}