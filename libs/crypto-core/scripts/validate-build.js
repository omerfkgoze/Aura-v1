#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Validates WASM build outputs for integrity, size constraints, and exports
 */

const BUILD_CONFIGS = [
  { name: 'bundler', dir: 'pkg', maxSize: 512 * 1024 }, // 512KB max
  { name: 'web', dir: 'pkg-web', maxSize: 512 * 1024 },
  { name: 'nodejs', dir: 'pkg-node', maxSize: 512 * 1024 },
];

const REQUIRED_EXPORTS = [
  'encrypt_cycle_data',
  'decrypt_cycle_data',
  'generate_user_key',
  'create_crypto_envelope',
  'validate_crypto_envelope',
  'zeroize_memory',
  'get_memory_stats',
];

function checkFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function checkFileSize(filePath, maxSize, name) {
  const stats = fs.statSync(filePath);
  console.log(`✓ ${name}: ${(stats.size / 1024).toFixed(2)}KB`);

  if (stats.size > maxSize) {
    throw new Error(`${name} size ${stats.size} exceeds maximum ${maxSize} bytes`);
  }
}

function checkWASMIntegrity(wasmPath) {
  const wasmBuffer = fs.readFileSync(wasmPath);
  const hash = crypto.createHash('sha256').update(wasmBuffer).digest('hex');

  // Basic WASM validation - check magic number
  if (wasmBuffer.length < 8 || wasmBuffer.toString('hex', 0, 4) !== '0061736d') {
    throw new Error(`Invalid WASM file: ${wasmPath}`);
  }

  console.log(`✓ WASM integrity verified (SHA256: ${hash.substring(0, 16)}...)`);
  return hash;
}

function checkJSBindings(jsPath) {
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  // Check for required exports
  const missingExports = REQUIRED_EXPORTS.filter(exportName => !jsContent.includes(exportName));

  if (missingExports.length > 0) {
    throw new Error(`Missing exports in JS bindings: ${missingExports.join(', ')}`);
  }

  console.log(`✓ JS bindings contain all required exports`);
}

function checkTypeScriptDefinitions(tsPath) {
  const tsContent = fs.readFileSync(tsPath, 'utf8');

  // Check for TypeScript export declarations
  const missingTypes = REQUIRED_EXPORTS.filter(
    exportName => !tsContent.includes(`export function ${exportName}`)
  );

  if (missingTypes.length > 0) {
    throw new Error(`Missing TypeScript definitions: ${missingTypes.join(', ')}`);
  }

  console.log(`✓ TypeScript definitions complete`);
}

async function validateBuild() {
  console.log('🔍 Validating WASM build outputs...\n');

  const results = {};

  for (const config of BUILD_CONFIGS) {
    console.log(`📦 Validating ${config.name} build:`);

    const wasmPath = path.join(config.dir, 'crypto_core_bg.wasm');
    const jsPath = path.join(config.dir, 'crypto_core.js');
    const tsPath = path.join(config.dir, 'crypto_core.d.ts');
    const pkgPath = path.join(config.dir, 'package.json');

    try {
      // Check all required files exist
      checkFileExists(wasmPath);
      checkFileExists(jsPath);
      checkFileExists(tsPath);
      checkFileExists(pkgPath);

      // Check file sizes
      checkFileSize(wasmPath, config.maxSize, 'WASM');

      // Validate WASM integrity
      const wasmHash = checkWASMIntegrity(wasmPath);

      // Check JS bindings
      checkJSBindings(jsPath);

      // Check TypeScript definitions
      checkTypeScriptDefinitions(tsPath);

      // Validate package.json
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (!pkgJson.name || !pkgJson.version) {
        throw new Error('Invalid package.json - missing name or version');
      }

      results[config.name] = {
        valid: true,
        wasmHash: wasmHash,
        size: fs.statSync(wasmPath).size,
      };

      console.log(`✅ ${config.name} build validation passed\n`);
    } catch (error) {
      console.error(`❌ ${config.name} build validation failed: ${error.message}\n`);
      process.exit(1);
    }
  }

  // Generate build report
  const report = {
    timestamp: new Date().toISOString(),
    builds: results,
    totalSize: Object.values(results).reduce((sum, build) => sum + build.size, 0),
  };

  fs.writeFileSync('build-report.json', JSON.stringify(report, null, 2));

  console.log('🎉 All build validations passed!');
  console.log(`📊 Total WASM size: ${(report.totalSize / 1024).toFixed(2)}KB`);
  console.log(`📋 Build report saved to: build-report.json`);
}

if (require.main === module) {
  validateBuild().catch(error => {
    console.error('❌ Build validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { validateBuild };
