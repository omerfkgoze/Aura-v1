#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { gzip } = require('zlib');
const { promisify } = require('util');

const gzipAsync = promisify(gzip);

/**
 * Checks bundle sizes against performance targets
 * Target: <2MB total bundle size, <512KB per WASM module
 */

const SIZE_TARGETS = {
  WASM_MAX_UNCOMPRESSED: 512 * 1024, // 512KB per WASM
  WASM_MAX_COMPRESSED: 128 * 1024, // 128KB compressed
  JS_MAX_UNCOMPRESSED: 100 * 1024, // 100KB JS bindings
  TOTAL_MAX: 2 * 1024 * 1024, // 2MB total target
};

async function getCompressedSize(filePath) {
  const content = fs.readFileSync(filePath);
  const compressed = await gzipAsync(content);
  return compressed.length;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  return `${bytes}B`;
}

function checkSizeTarget(size, target, name) {
  const percentage = (size / target) * 100;
  const status = size <= target ? '✅' : '⚠️';

  console.log(
    `${status} ${name}: ${formatSize(size)} / ${formatSize(target)} (${percentage.toFixed(1)}%)`
  );

  return {
    size,
    target,
    percentage,
    withinTarget: size <= target,
  };
}

async function analyzeBundleSize() {
  console.log('📏 Analyzing bundle sizes...\n');

  const builds = ['pkg', 'pkg-web', 'pkg-node'];
  const results = {
    timestamp: new Date().toISOString(),
    builds: {},
    summary: {
      totalUncompressed: 0,
      totalCompressed: 0,
      allTargetsMet: true,
    },
  };

  for (const buildDir of builds) {
    if (!fs.existsSync(buildDir)) {
      console.log(`⏭️  Skipping ${buildDir} - directory not found`);
      continue;
    }

    console.log(`📦 Analyzing ${buildDir}:`);

    const wasmPath = path.join(buildDir, 'crypto_core_bg.wasm');
    const jsPath = path.join(buildDir, 'crypto_core.js');
    const tsPath = path.join(buildDir, 'crypto_core.d.ts');

    if (!fs.existsSync(wasmPath)) {
      console.log(`❌ WASM file not found: ${wasmPath}`);
      continue;
    }

    try {
      // WASM analysis
      const wasmSize = fs.statSync(wasmPath).size;
      const wasmCompressed = await getCompressedSize(wasmPath);

      const wasmUncompressedResult = checkSizeTarget(
        wasmSize,
        SIZE_TARGETS.WASM_MAX_UNCOMPRESSED,
        'WASM (uncompressed)'
      );

      const wasmCompressedResult = checkSizeTarget(
        wasmCompressed,
        SIZE_TARGETS.WASM_MAX_COMPRESSED,
        'WASM (gzipped)'
      );

      // JS bindings analysis
      let jsSize = 0;
      let jsCompressed = 0;
      let jsResults = null;

      if (fs.existsSync(jsPath)) {
        jsSize = fs.statSync(jsPath).size;
        jsCompressed = await getCompressedSize(jsPath);

        jsResults = checkSizeTarget(jsSize, SIZE_TARGETS.JS_MAX_UNCOMPRESSED, 'JS bindings');
      }

      // TypeScript definitions size (informational)
      let tsSize = 0;
      if (fs.existsSync(tsPath)) {
        tsSize = fs.statSync(tsPath).size;
        console.log(`ℹ️  TypeScript definitions: ${formatSize(tsSize)}`);
      }

      const buildTotal = wasmSize + jsSize + tsSize;
      const buildCompressedTotal = wasmCompressed + jsCompressed;

      console.log(
        `📊 ${buildDir} total: ${formatSize(buildTotal)} (${formatSize(buildCompressedTotal)} compressed)`
      );

      results.builds[buildDir] = {
        wasm: {
          uncompressed: wasmSize,
          compressed: wasmCompressed,
          withinTarget: wasmUncompressedResult.withinTarget && wasmCompressedResult.withinTarget,
        },
        js: {
          size: jsSize,
          compressed: jsCompressed,
          withinTarget: jsResults ? jsResults.withinTarget : true,
        },
        typescript: tsSize,
        total: {
          uncompressed: buildTotal,
          compressed: buildCompressedTotal,
        },
      };

      results.summary.totalUncompressed += buildTotal;
      results.summary.totalCompressed += buildCompressedTotal;

      if (
        !wasmUncompressedResult.withinTarget ||
        !wasmCompressedResult.withinTarget ||
        (jsResults && !jsResults.withinTarget)
      ) {
        results.summary.allTargetsMet = false;
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error analyzing ${buildDir}: ${error.message}`);
      results.summary.allTargetsMet = false;
    }
  }

  // Overall summary
  console.log('📋 Bundle Size Summary:');
  console.log(`Total uncompressed: ${formatSize(results.summary.totalUncompressed)}`);
  console.log(`Total compressed: ${formatSize(results.summary.totalCompressed)}`);

  const totalTargetResult = checkSizeTarget(
    results.summary.totalUncompressed,
    SIZE_TARGETS.TOTAL_MAX,
    'Total bundle size'
  );

  if (!totalTargetResult.withinTarget) {
    results.summary.allTargetsMet = false;
  }

  // Performance impact assessment
  console.log('\n📱 Performance Impact:');
  const downloadTime3G = results.summary.totalCompressed / (50 * 1024); // 50KB/s 3G
  const downloadTime4G = results.summary.totalCompressed / (200 * 1024); // 200KB/s 4G

  console.log(`3G download time: ${downloadTime3G.toFixed(1)}s`);
  console.log(`4G download time: ${downloadTime4G.toFixed(1)}s`);

  if (downloadTime3G > 10) {
    console.log('⚠️  Warning: 3G download time exceeds 10 seconds');
    results.summary.allTargetsMet = false;
  }

  // Save detailed report
  fs.writeFileSync('bundle-size-report.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed report saved to: bundle-size-report.json');

  if (results.summary.allTargetsMet) {
    console.log('\n✅ All bundle size targets met!');
  } else {
    console.log('\n⚠️  Some bundle size targets exceeded - consider optimization');
    process.exit(1);
  }

  return results;
}

if (require.main === module) {
  analyzeBundleSize().catch(error => {
    console.error('❌ Bundle size analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = { analyzeBundleSize };
