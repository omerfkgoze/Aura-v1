#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

/**
 * Generates and verifies integrity hashes for WASM modules
 * Creates subresource integrity (SRI) hashes for secure loading
 */

function generateSRIHash(filePath, algorithm = 'sha384') {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

function generateFileHash(filePath, algorithm = 'sha256') {
  const content = fs.readFileSync(filePath);
  return crypto.createHash(algorithm).update(content).digest('hex');
}

function validateWASMStructure(wasmPath) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  
  // Check WASM magic number (0x00 0x61 0x73 0x6d)
  if (wasmBuffer.length < 8) {
    throw new Error('WASM file too small');
  }
  
  const magic = wasmBuffer.readUInt32LE(0);
  if (magic !== 0x6d736100) { // \0asm in little endian
    throw new Error('Invalid WASM magic number');
  }
  
  // Check WASM version (should be 1)
  const version = wasmBuffer.readUInt32LE(4);
  if (version !== 1) {
    throw new Error(`Unsupported WASM version: ${version}`);
  }
  
  return {
    size: wasmBuffer.length,
    version: version,
    valid: true
  };
}

function generateIntegrityManifest() {
  console.log('🔒 Generating integrity manifest...\n');
  
  const builds = ['pkg', 'pkg-web', 'pkg-node'];
  const manifest = {
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    algorithm: 'sha384',
    files: {}
  };
  
  for (const buildDir of builds) {
    if (!fs.existsSync(buildDir)) {
      console.log(`⏭️  Skipping ${buildDir} - directory not found`);
      continue;
    }
    
    console.log(`🔍 Processing ${buildDir}:`);
    
    const files = [
      'crypto_core_bg.wasm',
      'crypto_core.js',
      'crypto_core.d.ts',
      'package.json'
    ];
    
    manifest.files[buildDir] = {};
    
    for (const fileName of files) {
      const filePath = path.join(buildDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Missing: ${fileName}`);
        continue;
      }
      
      try {
        const fileStats = fs.statSync(filePath);
        const sriHash = generateSRIHash(filePath);
        const sha256Hash = generateFileHash(filePath, 'sha256');
        const sha512Hash = generateFileHash(filePath, 'sha512');
        
        manifest.files[buildDir][fileName] = {
          size: fileStats.size,
          modified: fileStats.mtime.toISOString(),
          integrity: sriHash,
          sha256: sha256Hash,
          sha512: sha512Hash
        };
        
        // Special validation for WASM files
        if (fileName.endsWith('.wasm')) {
          const wasmInfo = validateWASMStructure(filePath);
          manifest.files[buildDir][fileName].wasm = wasmInfo;
          console.log(`✅ ${fileName}: ${(fileStats.size / 1024).toFixed(2)}KB - WASM v${wasmInfo.version}`);
        } else {
          console.log(`✅ ${fileName}: ${(fileStats.size / 1024).toFixed(2)}KB`);
        }
        
        console.log(`   SRI: ${sriHash.substring(0, 32)}...`);
        
      } catch (error) {
        console.error(`❌ Error processing ${fileName}: ${error.message}`);
        process.exit(1);
      }
    }
    
    console.log('');
  }
  
  // Save manifest
  const manifestPath = 'integrity-manifest.json';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`📄 Integrity manifest saved to: ${manifestPath}`);
  
  // Generate TypeScript definitions for integrity hashes
  generateIntegrityTypes(manifest);
  
  // Generate example usage
  generateIntegrityExample(manifest);
  
  return manifest;
}

function generateIntegrityTypes(manifest) {
  const integrityData = JSON.stringify(
    Object.fromEntries(
      Object.entries(manifest.files).flatMap(([build, files]) =>
        Object.entries(files).map(([file, info]) => [
          build + '/' + file,
          {
            integrity: info.integrity,
            sha256: info.sha256,
            sha512: info.sha512,
            size: info.size
          }
        ])
      )
    ),
    null,
    2
  );

  const typesContent = '// Auto-generated integrity types\n' +
    '// Generated: ' + manifest.timestamp + '\n\n' +
    'export interface IntegrityHashes {\n' +
    '  readonly [key: string]: {\n' +
    '    readonly integrity: string;\n' +
    '    readonly sha256: string;\n' +
    '    readonly sha512: string;\n' +
    '    readonly size: number;\n' +
    '  };\n' +
    '}\n\n' +
    'export const CRYPTO_CORE_INTEGRITY: IntegrityHashes = ' + integrityData + ' as const;\n\n' +
    '/**\n' +
    ' * Verifies WASM module integrity before loading\n' +
    ' */\n' +
    'export function verifyIntegrity(\n' +
    '  content: ArrayBuffer,\n' +
    '  expectedHash: string\n' +
    '): boolean {\n' +
    '  const hash = crypto.subtle.digest(\'SHA-384\', content)\n' +
    '    .then(hashBuffer => {\n' +
    '      const hashArray = new Uint8Array(hashBuffer);\n' +
    '      const hashBase64 = btoa(String.fromCharCode(...hashArray));\n' +
    '      return \'sha384-\' + hashBase64;\n' +
    '    });\n' +
    '  \n' +
    '  return hash.then(computedHash => computedHash === expectedHash);\n' +
    '}\n';

  fs.writeFileSync('src/integrity.ts', typesContent);
  console.log('📝 TypeScript integrity types generated: src/integrity.ts');
}

function generateIntegrityExample(manifest) {
  const exampleContent = `// Example: Secure WASM loading with integrity verification
// Generated: ${manifest.timestamp}

import { CRYPTO_CORE_INTEGRITY, verifyIntegrity } from './integrity';

/**
 * Securely loads crypto-core WASM with integrity verification
 */
export async function loadCryptoCoreSecurely(target: 'bundler' | 'web' | 'nodejs' = 'bundler') {
  const wasmPath = target === 'bundler' ? 'pkg' : `pkg-${target}`;
  const expectedHash = CRYPTO_CORE_INTEGRITY[`${wasmPath}/crypto_core_bg.wasm`];
  
  if (!expectedHash) {
    throw new Error(`No integrity hash found for target: ${target}`);
  }
  
  // Fetch WASM module
  const response = await fetch(`./${wasmPath}/crypto_core_bg.wasm`);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM: ${response.status}`);
  }
  
  const wasmBytes = await response.arrayBuffer();
  
  // Verify integrity
  const isValid = await verifyIntegrity(wasmBytes, expectedHash.integrity);
  if (!isValid) {
    throw new Error('WASM integrity verification failed - possible tampering detected');
  }
  
  // Load verified WASM
  const wasmModule = await WebAssembly.instantiate(wasmBytes);
  
  console.log(`✅ Crypto core WASM loaded securely (${target})`);
  return wasmModule;
}

// Example usage in Next.js
/*
import { loadCryptoCoreSecurely } from './crypto-integrity';

async function initializeCrypto() {
  try {
    const cryptoCore = await loadCryptoCoreSecurely('bundler');
    // Use cryptoCore safely
  } catch (error) {
    console.error('Crypto initialization failed:', error);
    // Handle security error appropriately
  }
}
*/
`;

  fs.writeFileSync('src/secure-loader-example.ts', exampleContent);
  console.log('📝 Secure loader example generated: src/secure-loader-example.ts');
}

function verifyIntegrityManifest(manifestPath) {
  console.log('🔍 Verifying integrity manifest...\n');
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Integrity manifest not found - run integrity check first');
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let allValid = true;
  
  for (const [buildDir, files] of Object.entries(manifest.files)) {
    console.log(`🔍 Verifying ${buildDir}:`);
    
    for (const [fileName, expectedInfo] of Object.entries(files)) {
      const filePath = path.join(buildDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Missing: ${fileName}`);
        allValid = false;
        continue;
      }
      
      try {
        const currentSha256 = generateFileHash(filePath, 'sha256');
        const currentSRI = generateSRIHash(filePath);
        
        if (currentSha256 !== expectedInfo.sha256) {
          console.log(`❌ ${fileName}: SHA256 mismatch`);
          console.log(`   Expected: ${expectedInfo.sha256}`);
          console.log(`   Current:  ${currentSha256}`);
          allValid = false;
        } else if (currentSRI !== expectedInfo.integrity) {
          console.log(`❌ ${fileName}: SRI mismatch`);
          allValid = false;
        } else {
          console.log(`✅ ${fileName}: Integrity verified`);
        }
        
      } catch (error) {
        console.error(`❌ Error verifying ${fileName}: ${error.message}`);
        allValid = false;
      }
    }
    
    console.log('');
  }
  
  if (allValid) {
    console.log('✅ All integrity checks passed!');
  } else {
    console.log('❌ Some integrity checks failed!');
    process.exit(1);
  }
  
  return allValid;
}

async function checkIntegrity() {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      return generateIntegrityManifest();
    
    case 'verify':
      return verifyIntegrityManifest('integrity-manifest.json');
    
    default:
      // Default: generate manifest
      return generateIntegrityManifest();
  }
}

if (require.main === module) {
  checkIntegrity().catch(error => {
    console.error('❌ Integrity check failed:', error.message);
    process.exit(1);
  });
}

module.exports = { 
  generateIntegrityManifest, 
  verifyIntegrityManifest,
  generateSRIHash,
  generateFileHash 
};