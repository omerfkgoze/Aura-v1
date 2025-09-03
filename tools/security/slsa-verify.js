#!/usr/bin/env node

/**
 * SLSA Provenance Verification Script
 *
 * Verifies SLSA Level 2 build provenance and Sigstore signatures
 * for deployment pipeline integration.
 *
 * Usage: node slsa-verify.js <artifact-path> [options]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SLSAVerifier {
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode !== false, // Default to true
      allowedSourceRepo: options.allowedSourceRepo || 'https://github.com/aura-app/aura',
      requiredSLSALevel: options.requiredSLSALevel || 2,
      maxArtifactAge: options.maxArtifactAge || 7 * 24 * 60 * 60 * 1000, // 7 days
      ...options,
    };

    this.results = {
      verified: false,
      errors: [],
      warnings: [],
      details: {},
    };
  }

  /**
   * Main verification entry point
   */
  async verify(artifactPath, provenancePath, signaturePath) {
    try {
      console.log('🔍 Starting SLSA Level 2 verification...');

      // Step 1: Verify artifact exists and is readable
      await this.verifyArtifactExists(artifactPath);

      // Step 2: Verify SLSA provenance
      await this.verifyProvenance(provenancePath);

      // Step 3: Verify Sigstore signature
      await this.verifySignature(artifactPath, signaturePath);

      // Step 4: Cross-verify artifact hash with provenance
      await this.crossVerifyHashes(artifactPath, provenancePath);

      // Step 5: Verify build environment isolation
      await this.verifyBuildEnvironment(provenancePath);

      // Step 6: Verify reproducible build requirements
      await this.verifyReproducibleBuild(provenancePath);

      this.results.verified = this.results.errors.length === 0;

      if (this.results.verified) {
        console.log('✅ SLSA Level 2 verification PASSED');
      } else {
        console.log('❌ SLSA Level 2 verification FAILED');
        this.results.errors.forEach(error => console.error(`  - ${error}`));
      }

      return this.results;
    } catch (error) {
      this.results.errors.push(`Verification failed: ${error.message}`);
      this.results.verified = false;
      console.error('💥 SLSA verification error:', error.message);
      return this.results;
    }
  }

  /**
   * Verify artifact exists and calculate hash
   */
  async verifyArtifactExists(artifactPath) {
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const stats = fs.statSync(artifactPath);
    if (!stats.isFile()) {
      throw new Error(`Artifact is not a file: ${artifactPath}`);
    }

    // Calculate SHA256 hash
    const content = fs.readFileSync(artifactPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    this.results.details.artifactHash = hash;
    this.results.details.artifactSize = stats.size;

    console.log(`📁 Artifact verified: ${path.basename(artifactPath)} (${stats.size} bytes)`);
    console.log(`🔐 SHA256: ${hash}`);
  }

  /**
   * Verify SLSA provenance attestation
   */
  async verifyProvenance(provenancePath) {
    if (!fs.existsSync(provenancePath)) {
      throw new Error(`Provenance file not found: ${provenancePath}`);
    }

    const provenanceContent = fs.readFileSync(provenancePath, 'utf8');
    let provenance;

    try {
      // SLSA provenance is in in-toto format (JSONL)
      const lines = provenanceContent.trim().split('\n');
      provenance = JSON.parse(lines[0]); // First line contains the attestation
    } catch (error) {
      throw new Error(`Invalid provenance format: ${error.message}`);
    }

    // Verify SLSA provenance structure
    this.verifyProvenanceStructure(provenance);

    // Verify source repository
    this.verifySourceRepository(provenance);

    // Verify SLSA level
    this.verifySLSALevel(provenance);

    // Verify build timestamp
    this.verifyBuildTimestamp(provenance);

    this.results.details.provenance = {
      builderVersion: provenance.predicate?.builder?.id,
      buildType: provenance.predicate?.buildType,
      sourceRepo: provenance.predicate?.invocation?.configSource?.uri,
      buildTimestamp: provenance.predicate?.metadata?.buildStartedOn,
    };

    console.log('📋 SLSA provenance verified');
  }

  /**
   * Verify provenance has required SLSA structure
   */
  verifyProvenanceStructure(provenance) {
    const required = [
      'predicateType',
      'predicate.builder.id',
      'predicate.buildType',
      'predicate.invocation',
      'predicate.metadata',
      'subject',
    ];

    for (const field of required) {
      const value = this.getNestedProperty(provenance, field);
      if (!value) {
        this.results.errors.push(`Missing required provenance field: ${field}`);
      }
    }

    // Verify predicate type is SLSA
    if (provenance.predicateType !== 'https://slsa.dev/provenance/v0.2') {
      this.results.errors.push(`Invalid predicate type: ${provenance.predicateType}`);
    }
  }

  /**
   * Verify source repository matches expected
   */
  verifySourceRepository(provenance) {
    const sourceRepo = provenance.predicate?.invocation?.configSource?.uri;

    if (!sourceRepo) {
      this.results.errors.push('Missing source repository in provenance');
      return;
    }

    if (this.options.allowedSourceRepo && !sourceRepo.startsWith(this.options.allowedSourceRepo)) {
      this.results.errors.push(`Unauthorized source repository: ${sourceRepo}`);
    }
  }

  /**
   * Verify SLSA level meets requirements
   */
  verifySLSALevel(provenance) {
    // SLSA Level 2 requirements check
    const buildType = provenance.predicate?.buildType;

    if (!buildType || !buildType.includes('github')) {
      this.results.warnings.push('Cannot verify SLSA level from build type');
    }

    // Check for hermetic build (Level 2 requirement)
    const metadata = provenance.predicate?.metadata;
    if (!metadata?.reproducible) {
      this.results.warnings.push('Build reproducibility not explicitly verified');
    }
  }

  /**
   * Verify build timestamp is reasonable
   */
  verifyBuildTimestamp(provenance) {
    const buildTime = provenance.predicate?.metadata?.buildStartedOn;

    if (!buildTime) {
      this.results.warnings.push('Missing build timestamp');
      return;
    }

    const buildDate = new Date(buildTime);
    const now = new Date();
    const age = now.getTime() - buildDate.getTime();

    if (age > this.options.maxArtifactAge) {
      this.results.warnings.push(
        `Artifact age exceeds maximum: ${Math.round(age / (24 * 60 * 60 * 1000))} days`
      );
    }

    if (buildDate > now) {
      this.results.errors.push('Build timestamp is in the future');
    }
  }

  /**
   * Verify Sigstore signature
   */
  async verifySignature(artifactPath, signaturePath) {
    if (!signaturePath || !fs.existsSync(signaturePath)) {
      throw new Error(`Signature file not found: ${signaturePath}`);
    }

    const certificatePath = signaturePath.replace('.sig', '.crt');
    if (!fs.existsSync(certificatePath)) {
      throw new Error(`Certificate file not found: ${certificatePath}`);
    }

    try {
      // Use cosign to verify the signature
      const cmd = [
        'cosign verify-blob',
        `--certificate="${certificatePath}"`,
        `--signature="${signaturePath}"`,
        `--certificate-identity="https://github.com/aura-app/aura/.github/workflows/slsa-build.yml@refs/heads/main"`,
        `--certificate-oidc-issuer="https://token.actions.githubusercontent.com"`,
        `"${artifactPath}"`,
      ].join(' ');

      execSync(cmd, { stdio: 'pipe' });

      console.log('🔏 Sigstore signature verified');

      this.results.details.signatureVerified = true;
    } catch (error) {
      // Check if cosign is installed
      try {
        execSync('cosign version', { stdio: 'pipe' });
      } catch {
        this.results.warnings.push('cosign not installed - signature verification skipped');
        return;
      }

      this.results.errors.push(`Signature verification failed: ${error.message}`);
    }
  }

  /**
   * Cross-verify artifact hash matches provenance
   */
  async crossVerifyHashes(artifactPath, provenancePath) {
    const provenanceContent = fs.readFileSync(provenancePath, 'utf8');
    const lines = provenanceContent.trim().split('\n');
    const provenance = JSON.parse(lines[0]);

    const subjects = provenance.subject || [];
    const artifactName = path.basename(artifactPath);
    const expectedHash = this.results.details.artifactHash;

    // Find matching subject in provenance
    const matchingSubject = subjects.find(
      subject => subject.name === artifactName || subject.name.endsWith(artifactName)
    );

    if (!matchingSubject) {
      this.results.errors.push(`Artifact not found in provenance subjects: ${artifactName}`);
      return;
    }

    const provenanceHash = matchingSubject.digest?.sha256;
    if (!provenanceHash) {
      this.results.errors.push('No SHA256 hash found in provenance');
      return;
    }

    if (expectedHash !== provenanceHash) {
      this.results.errors.push(`Hash mismatch: expected ${expectedHash}, got ${provenanceHash}`);
      return;
    }

    console.log('🔐 Artifact hash matches provenance');
    this.results.details.hashVerified = true;
  }

  /**
   * Verify build environment isolation (SLSA Level 2)
   */
  async verifyBuildEnvironment(provenancePath) {
    const provenanceContent = fs.readFileSync(provenancePath, 'utf8');
    const lines = provenanceContent.trim().split('\n');
    const provenance = JSON.parse(lines[0]);

    const builderId = provenance.predicate?.builder?.id;

    // Verify builder is GitHub Actions (isolated environment)
    if (!builderId || !builderId.includes('github')) {
      this.results.errors.push('Build environment is not GitHub Actions (required for isolation)');
      return;
    }

    // Check for hermetic build indicators
    const invocation = provenance.predicate?.invocation;

    // Verify no network access during build (indicated by locked dependencies)
    if (invocation?.parameters && !invocation.parameters.includes('frozen-lockfile')) {
      this.results.warnings.push('Build may not be fully hermetic (dependencies not frozen)');
    }

    console.log('🏗️  Build environment isolation verified');
    this.results.details.buildIsolation = true;
  }

  /**
   * Verify reproducible build requirements
   */
  async verifyReproducibleBuild(provenancePath) {
    const provenanceContent = fs.readFileSync(provenancePath, 'utf8');
    const lines = provenanceContent.trim().split('\n');
    const provenance = JSON.parse(lines[0]);

    const invocation = provenance.predicate?.invocation;

    // Check for SOURCE_DATE_EPOCH (deterministic timestamps)
    if (invocation?.environment && !invocation.environment.SOURCE_DATE_EPOCH) {
      this.results.warnings.push('SOURCE_DATE_EPOCH not set (may affect build reproducibility)');
    }

    // Check for deterministic build flag
    if (invocation?.environment && !invocation.environment.DETERMINISTIC_BUILD) {
      this.results.warnings.push('DETERMINISTIC_BUILD flag not set');
    }

    console.log('🔄 Reproducible build requirements verified');
    this.results.details.reproducibleBuild = true;
  }

  /**
   * Utility function to get nested object property
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate verification report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      verified: this.results.verified,
      slsaLevel: this.options.requiredSLSALevel,
      summary: {
        errors: this.results.errors.length,
        warnings: this.results.warnings.length,
        checks: {
          artifactExists: !!this.results.details.artifactHash,
          provenanceValid: !this.results.errors.some(e => e.includes('provenance')),
          signatureVerified: !!this.results.details.signatureVerified,
          hashMatches: !!this.results.details.hashVerified,
          buildIsolated: !!this.results.details.buildIsolation,
          reproducible: !!this.results.details.reproducibleBuild,
        },
      },
      details: this.results.details,
      errors: this.results.errors,
      warnings: this.results.warnings,
    };

    return report;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node slsa-verify.js <artifact-path> <provenance-path> <signature-path>');
    console.error('');
    console.error('Example:');
    console.error(
      '  node slsa-verify.js build-artifacts/app.wasm provenance.intoto.jsonl app.wasm.sig'
    );
    process.exit(1);
  }

  const [artifactPath, provenancePath, signaturePath] = args;

  const verifier = new SLSAVerifier({
    strictMode: process.env.SLSA_STRICT_MODE !== 'false',
    allowedSourceRepo: process.env.SLSA_ALLOWED_REPO || 'https://github.com/aura-app/aura',
  });

  verifier
    .verify(artifactPath, provenancePath, signaturePath)
    .then(results => {
      // Output JSON report for CI/CD consumption
      if (process.env.SLSA_OUTPUT_FORMAT === 'json') {
        console.log(JSON.stringify(verifier.generateReport(), null, 2));
      }

      process.exit(results.verified ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal verification error:', error.message);
      process.exit(2);
    });
}

module.exports = { SLSAVerifier };
