#!/usr/bin/env node

/**
 * Dependency Policy Enforcement Script
 *
 * Validates dependencies against security policies to prevent
 * supply-chain attacks and dependency confusion.
 *
 * Usage: node dependency-policy-check.js [options]
 */

const fs = require('fs');
const path = require('path');

class DependencyPolicyChecker {
  constructor(policyPath, options = {}) {
    this.policy = this.loadPolicy(policyPath);
    this.options = {
      mode: options.mode || 'warn',
      verbose: options.verbose || false,
      outputFormat: options.outputFormat || 'console',
      ...options,
    };

    this.violations = [];
    this.warnings = [];
    this.approvals = [];
  }

  /**
   * Load security policy configuration
   */
  loadPolicy(policyPath) {
    try {
      const policyContent = fs.readFileSync(policyPath, 'utf8');
      return JSON.parse(policyContent);
    } catch (error) {
      throw new Error(`Failed to load policy from ${policyPath}: ${error.message}`);
    }
  }

  /**
   * Main validation entry point
   */
  async validate(packageFiles) {
    console.log(`🔍 Starting dependency policy validation...`);
    console.log(`📋 Policy: ${this.policy.name} v${this.policy.version}`);
    console.log(`⚙️ Mode: ${this.options.mode}`);

    for (const file of packageFiles) {
      if (!fs.existsSync(file)) {
        this.warnings.push(`Package file not found: ${file}`);
        continue;
      }

      await this.validatePackageFile(file);
    }

    return this.generateReport();
  }

  /**
   * Validate individual package file
   */
  async validatePackageFile(filePath) {
    const fileName = path.basename(filePath);
    console.log(`📦 Validating: ${filePath}`);

    if (fileName === 'package.json') {
      await this.validateNpmPackage(filePath);
    } else if (fileName === 'Cargo.toml') {
      await this.validateCargoPackage(filePath);
    } else {
      this.warnings.push(`Unknown package file format: ${filePath}`);
    }
  }

  /**
   * Validate npm package.json
   */
  async validateNpmPackage(filePath) {
    try {
      const packageContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const dependencies = {
        ...packageContent.dependencies,
        ...packageContent.devDependencies,
        ...packageContent.peerDependencies,
        ...packageContent.optionalDependencies,
      };

      for (const [name, version] of Object.entries(dependencies)) {
        await this.validateNpmDependency(name, version, filePath);
      }
    } catch (error) {
      this.violations.push({
        type: 'parsing-error',
        file: filePath,
        message: `Failed to parse package.json: ${error.message}`,
      });
    }
  }

  /**
   * Validate individual npm dependency
   */
  async validateNpmDependency(name, version, filePath) {
    // Check blocked packages
    const blocked = this.findBlockedPackage('npm', name);
    if (blocked) {
      this.violations.push({
        type: 'blocked-package',
        package: name,
        version: version,
        file: filePath,
        reason: blocked.reason,
        severity: blocked.severity,
        policy: 'npm-blocked',
      });
      return;
    }

    // Check scope protection
    if (this.isProtectedScope(name)) {
      this.violations.push({
        type: 'scope-violation',
        package: name,
        version: version,
        file: filePath,
        reason: 'Package uses protected scope',
        severity: 'high',
        policy: 'scope-protection',
      });
      return;
    }

    // Check typosquatting
    const typosquatting = this.checkTyposquatting(name);
    if (typosquatting) {
      this.warnings.push({
        type: 'typosquatting',
        package: name,
        version: version,
        file: filePath,
        reason: `Similar to protected name: ${typosquatting.protectedName}`,
        similarity: typosquatting.similarity,
        policy: 'typosquatting-detection',
      });
    }

    // Check crypto packages
    if (this.isCryptoPackage(name)) {
      const allowed = this.findAllowedPackage('npm', name);
      if (!allowed) {
        this.violations.push({
          type: 'unapproved-crypto',
          package: name,
          version: version,
          file: filePath,
          reason: 'Cryptographic package requires security approval',
          severity: 'critical',
          policy: 'cryptographic',
        });
      } else {
        // Check version constraints
        if (!this.isVersionAllowed(version, allowed)) {
          this.violations.push({
            type: 'version-violation',
            package: name,
            version: version,
            file: filePath,
            reason: `Version ${version} not allowed, max: ${allowed.maxVersion}`,
            severity: 'high',
            policy: 'cryptographic',
          });
        } else {
          this.approvals.push({
            package: name,
            version: version,
            reason: allowed.reason,
          });
        }
      }
    }
  }

  /**
   * Validate Cargo.toml
   */
  async validateCargoPackage(filePath) {
    try {
      const cargoContent = fs.readFileSync(filePath, 'utf8');
      const dependencies = this.parseCargoToml(cargoContent);

      for (const [name, version] of Object.entries(dependencies)) {
        await this.validateCargoDependency(name, version, filePath);
      }
    } catch (error) {
      this.violations.push({
        type: 'parsing-error',
        file: filePath,
        message: `Failed to parse Cargo.toml: ${error.message}`,
      });
    }
  }

  /**
   * Parse Cargo.toml dependencies (simple parser)
   */
  parseCargoToml(content) {
    const dependencies = {};
    const lines = content.split('\n');
    let inDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '[dependencies]') {
        inDependencies = true;
        continue;
      }

      if (trimmed.startsWith('[') && trimmed !== '[dependencies]') {
        inDependencies = false;
        continue;
      }

      if (inDependencies && trimmed.includes('=')) {
        const match = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
        if (match) {
          const [, name, versionSpec] = match;
          dependencies[name.trim()] = versionSpec.trim().replace(/['"]/g, '');
        }
      }
    }

    return dependencies;
  }

  /**
   * Validate individual Cargo dependency
   */
  async validateCargoDependency(name, version, filePath) {
    // Check blocked packages
    const blocked = this.findBlockedPackage('cargo', name);
    if (blocked) {
      this.violations.push({
        type: 'blocked-package',
        package: name,
        version: version,
        file: filePath,
        reason: blocked.reason,
        severity: blocked.severity,
        policy: 'cargo-blocked',
      });
      return;
    }

    // Check crypto packages (all Cargo deps in crypto-core are crypto-related)
    const allowed = this.findAllowedPackage('cargo', name);
    if (!allowed) {
      this.violations.push({
        type: 'unapproved-crypto',
        package: name,
        version: version,
        file: filePath,
        reason: 'Cryptographic package requires security approval',
        severity: 'critical',
        policy: 'cryptographic',
      });
    } else {
      // Check exact version matching for crypto dependencies
      if (allowed.exactVersion && !this.isExactVersion(version, allowed.exactVersion)) {
        this.violations.push({
          type: 'version-violation',
          package: name,
          version: version,
          file: filePath,
          reason: `Exact version required: ${allowed.exactVersion}, got: ${version}`,
          severity: 'high',
          policy: 'cryptographic',
        });
      } else {
        this.approvals.push({
          package: name,
          version: version,
          reason: allowed.reason,
        });
      }
    }
  }

  /**
   * Find blocked package in policy
   */
  findBlockedPackage(ecosystem, name) {
    const cryptoBlocked = this.policy.policies.cryptographic?.packages?.[ecosystem]?.blocked || [];
    const authBlocked = this.policy.policies.authentication?.packages?.[ecosystem]?.blocked || [];
    const networkBlocked = this.policy.policies.networking?.packages?.[ecosystem]?.blocked || [];

    const allBlocked = [...cryptoBlocked, ...authBlocked, ...networkBlocked];

    return allBlocked.find(blocked => blocked.name === name);
  }

  /**
   * Find allowed package in policy
   */
  findAllowedPackage(ecosystem, name) {
    const cryptoAllowed = this.policy.policies.cryptographic?.packages?.[ecosystem]?.allowed || [];
    const authAllowed = this.policy.policies.authentication?.packages?.[ecosystem]?.allowed || [];

    const allAllowed = [...cryptoAllowed, ...authAllowed];

    return allAllowed.find(allowed => allowed.name === name);
  }

  /**
   * Check if package name uses protected scope
   */
  isProtectedScope(name) {
    if (!name.startsWith('@')) return false;

    const scope = name.split('/')[0];
    const protectedScopes =
      this.policy.policies['supply-chain-protection']?.rules?.['scope-protection']
        ?.protectedScopes || [];

    return protectedScopes.includes(scope);
  }

  /**
   * Check for potential typosquatting
   */
  checkTyposquatting(name) {
    const protectedNames =
      this.policy.policies['supply-chain-protection']?.rules?.typosquatting?.protectedNames || [];
    const threshold =
      this.policy.policies['supply-chain-protection']?.rules?.typosquatting?.similarityThreshold ||
      0.8;

    for (const protectedName of protectedNames) {
      const similarity = this.calculateSimilarity(name, protectedName);
      if (similarity > threshold && name !== protectedName) {
        return {
          protectedName,
          similarity,
        };
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if package is crypto-related
   */
  isCryptoPackage(name) {
    const cryptoKeywords = [
      'crypto',
      'encrypt',
      'decrypt',
      'hash',
      'hmac',
      'sha',
      'md5',
      'aes',
      'rsa',
      'ecdsa',
      'ed25519',
      'argon',
      'bcrypt',
      'scrypt',
      'sodium',
      'nacl',
      'pbkdf',
      'random',
      'entropy',
      'jwt',
      'jose',
    ];

    const lowerName = name.toLowerCase();
    return cryptoKeywords.some(keyword => lowerName.includes(keyword));
  }

  /**
   * Check if version is allowed
   */
  isVersionAllowed(version, allowed) {
    if (allowed.exactVersion) {
      return this.isExactVersion(version, allowed.exactVersion);
    }

    if (allowed.maxVersion) {
      return this.isVersionLessThan(version, allowed.maxVersion);
    }

    return true;
  }

  /**
   * Check exact version match
   */
  isExactVersion(version, exactVersion) {
    // Remove version prefixes and compare
    const cleanVersion = version.replace(/^[\^~]/, '');
    return cleanVersion === exactVersion;
  }

  /**
   * Check if version is less than max (simplified)
   */
  isVersionLessThan(version, maxVersion) {
    // Simplified version comparison - in production use semver library
    const cleanVersion = version.replace(/^[\^~]/, '');
    return cleanVersion.localeCompare(maxVersion, undefined, { numeric: true }) <= 0;
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      policy: {
        name: this.policy.name,
        version: this.policy.version,
      },
      summary: {
        violations: this.violations.length,
        warnings: this.warnings.length,
        approvals: this.approvals.length,
        totalChecked: this.violations.length + this.warnings.length + this.approvals.length,
      },
      results: {
        violations: this.violations,
        warnings: this.warnings,
        approvals: this.approvals,
      },
      passed: this.violations.length === 0,
    };

    // Apply enforcement mode
    if (this.options.mode === 'warn') {
      report.passed = true; // Don't fail in warn mode
    }

    return report;
  }

  /**
   * Output report in specified format
   */
  outputReport(report) {
    if (this.options.outputFormat === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this.outputConsoleReport(report);
    }
  }

  /**
   * Output human-readable console report
   */
  outputConsoleReport(report) {
    console.log('\n📊 Dependency Policy Validation Report');
    console.log('═'.repeat(50));

    console.log(`🕒 Generated: ${report.timestamp}`);
    console.log(`📋 Policy: ${report.policy.name} v${report.policy.version}`);

    console.log('\n📈 Summary:');
    console.log(`  ❌ Violations: ${report.summary.violations}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`  ✅ Approved: ${report.summary.approvals}`);
    console.log(`  📦 Total Checked: ${report.summary.totalChecked}`);

    if (report.results.violations.length > 0) {
      console.log('\n❌ Policy Violations:');
      for (const violation of report.results.violations) {
        console.log(`  • ${violation.package} (${violation.version})`);
        console.log(`    📁 File: ${violation.file}`);
        console.log(`    🚨 Severity: ${violation.severity}`);
        console.log(`    📄 Reason: ${violation.reason}`);
        console.log(`    📋 Policy: ${violation.policy}`);
        console.log('');
      }
    }

    if (report.results.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      for (const warning of report.results.warnings) {
        console.log(`  • ${warning.package} (${warning.version})`);
        console.log(`    📄 Reason: ${warning.reason}`);
        if (warning.similarity) {
          console.log(`    📊 Similarity: ${(warning.similarity * 100).toFixed(1)}%`);
        }
        console.log('');
      }
    }

    if (this.options.verbose && report.results.approvals.length > 0) {
      console.log('\n✅ Approved Dependencies:');
      for (const approval of report.results.approvals) {
        console.log(`  • ${approval.package} (${approval.version})`);
        console.log(`    📄 Reason: ${approval.reason}`);
        console.log('');
      }
    }

    console.log(`\n${report.passed ? '✅ PASSED' : '❌ FAILED'}: Dependency policy validation`);

    if (!report.passed) {
      console.log('\nRecommendations:');
      console.log('1. Review and remove blocked dependencies');
      console.log('2. Get security approval for crypto dependencies');
      console.log('3. Update dependency versions to approved ranges');
      console.log('4. Consider alternatives for flagged packages');
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    mode: 'warn',
    verbose: false,
    outputFormat: 'console',
    policyPath: 'tools/security/dependency-policy.json',
  };

  const packageFiles = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--mode':
        options.mode = nextArg;
        i++;
        break;
      case '--policy':
        options.policyPath = nextArg;
        i++;
        break;
      case '--output':
        options.outputFormat = nextArg;
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Dependency Policy Checker Usage:

  node dependency-policy-check.js [options] <package-files...>

Options:
  --mode <mode>         Enforcement mode (warn|enforce) [default: warn]
  --policy <path>       Path to policy file [default: tools/security/dependency-policy.json]
  --output <format>     Output format (console|json) [default: console]
  --verbose             Show approved dependencies
  --help               Show this help message

Examples:
  node dependency-policy-check.js package.json
  node dependency-policy-check.js --mode enforce package.json libs/crypto-core/Cargo.toml
  node dependency-policy-check.js --output json --verbose package.json
        `);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          packageFiles.push(arg);
        }
        break;
    }
  }

  if (packageFiles.length === 0) {
    packageFiles.push('package.json');
    if (fs.existsSync('libs/crypto-core/Cargo.toml')) {
      packageFiles.push('libs/crypto-core/Cargo.toml');
    }
  }

  // Run validation
  main();
}

// Main function moved outside to comply with ESLint no-inner-declarations
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {
    mode: 'warn',
    verbose: false,
    outputFormat: 'console',
    policyPath: 'tools/security/dependency-policy.json',
  };

  const packageFiles = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--mode':
        options.mode = nextArg;
        i++;
        break;
      case '--policy':
        options.policyPath = nextArg;
        i++;
        break;
      case '--output':
        options.outputFormat = nextArg;
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
Dependency Policy Checker Usage:

  node dependency-policy-check.js [options] <package-files...>

Options:
  --mode <mode>         Enforcement mode (warn|enforce) [default: warn]
  --policy <path>       Path to policy file [default: tools/security/dependency-policy.json]
  --output <format>     Output format (console|json) [default: console]
  --verbose             Show approved dependencies
  --help               Show this help message

Examples:
  node dependency-policy-check.js package.json
  node dependency-policy-check.js --mode enforce package.json libs/crypto-core/Cargo.toml
  node dependency-policy-check.js --output json --verbose package.json
        `);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          packageFiles.push(arg);
        }
        break;
    }
  }

  if (packageFiles.length === 0) {
    packageFiles.push('package.json');
    if (fs.existsSync('libs/crypto-core/Cargo.toml')) {
      packageFiles.push('libs/crypto-core/Cargo.toml');
    }
  }

  try {
    const checker = new DependencyPolicyChecker(options.policyPath, options);
    const report = await checker.validate(packageFiles);

    checker.outputReport(report);

    process.exit(report.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Policy check failed:', error.message);
    process.exit(2);
  }
}

module.exports = { DependencyPolicyChecker };
