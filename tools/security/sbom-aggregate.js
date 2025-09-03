#!/usr/bin/env node

/**
 * Multi-Ecosystem SBOM Aggregator
 *
 * Aggregates SBOMs from different ecosystems (npm, Cargo, comprehensive)
 * into a unified project-level SBOM with deduplication and validation.
 *
 * Usage: node sbom-aggregate.js --npm <npm-sbom> --cargo <cargo-sbom> --output <output-file>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SBOMAggregator {
  constructor(options = {}) {
    this.options = {
      projectName: options.projectName || 'aura-app',
      projectVersion: options.projectVersion || '1.0.0',
      outputFormat: options.outputFormat || 'cyclonedx',
      includeDevDependencies: options.includeDevDependencies !== false,
      deduplication: options.deduplication !== false,
      ...options,
    };

    this.aggregatedSBOM = this.initializeBaseSBOM();
    this.componentMap = new Map(); // For deduplication
    this.stats = {
      npmComponents: 0,
      cargoComponents: 0,
      comprehensiveComponents: 0,
      duplicatesRemoved: 0,
      totalComponents: 0,
    };
  }

  /**
   * Initialize base SBOM structure
   */
  initializeBaseSBOM() {
    const timestamp = new Date().toISOString();

    if (this.options.outputFormat === 'spdx') {
      return {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        documentName: `${this.options.projectName}-sbom`,
        documentNamespace: `https://github.com/aura-app/aura/sbom/${timestamp}`,
        creationInfo: {
          created: timestamp,
          creators: ['Tool: Aura SBOM Aggregator-1.0.0'],
          licenseListVersion: '3.19',
        },
        packages: [],
      };
    } else {
      // CycloneDX format
      return {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${this.generateUUID()}`,
        version: 1,
        metadata: {
          timestamp: timestamp,
          tools: [
            {
              vendor: 'Aura',
              name: 'SBOM Aggregator',
              version: '1.0.0',
            },
          ],
          component: {
            type: 'application',
            'bom-ref': this.options.projectName,
            name: this.options.projectName,
            version: this.options.projectVersion,
            description: 'Aura - Privacy-first menstrual health tracking app',
            licenses: [
              {
                license: {
                  name: 'MIT',
                  url: 'https://opensource.org/licenses/MIT',
                },
              },
            ],
          },
        },
        components: [],
        dependencies: [],
        vulnerabilities: [],
      };
    }
  }

  /**
   * Aggregate multiple SBOM files
   */
  async aggregate(inputFiles) {
    console.log('🔄 Starting SBOM aggregation...');

    for (const [ecosystem, filePath] of Object.entries(inputFiles)) {
      if (filePath && fs.existsSync(filePath)) {
        console.log(`📋 Processing ${ecosystem} SBOM: ${filePath}`);
        await this.processSBOM(filePath, ecosystem);
      } else {
        console.warn(`⚠️ SBOM file not found: ${filePath} (${ecosystem})`);
      }
    }

    this.finalizeSBOM();
    console.log('✅ SBOM aggregation completed');

    return this.aggregatedSBOM;
  }

  /**
   * Process individual SBOM file
   */
  async processSBOM(filePath, ecosystem) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const sbom = JSON.parse(content);

      if (this.isCycloneDXFormat(sbom)) {
        this.processCycloneDXSBOM(sbom, ecosystem);
      } else if (this.isSPDXFormat(sbom)) {
        this.processSPDXSBOM(sbom, ecosystem);
      } else {
        console.warn(`⚠️ Unknown SBOM format in ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing SBOM ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if SBOM is CycloneDX format
   */
  isCycloneDXFormat(sbom) {
    return sbom.bomFormat === 'CycloneDX' || sbom.specVersion;
  }

  /**
   * Check if SBOM is SPDX format
   */
  isSPDXFormat(sbom) {
    return sbom.spdxVersion || sbom.SPDXID;
  }

  /**
   * Process CycloneDX SBOM
   */
  processCycloneDXSBOM(sbom, ecosystem) {
    if (!sbom.components || !Array.isArray(sbom.components)) {
      console.warn(`⚠️ No components found in ${ecosystem} SBOM`);
      return;
    }

    let addedCount = 0;

    for (const component of sbom.components) {
      // Enhance component with ecosystem information
      const enhancedComponent = this.enhanceComponent(component, ecosystem);

      if (this.addComponent(enhancedComponent)) {
        addedCount++;
      }
    }

    this.stats[`${ecosystem}Components`] = addedCount;
    console.log(`  📦 Added ${addedCount} components from ${ecosystem}`);

    // Merge vulnerabilities if present
    if (sbom.vulnerabilities && Array.isArray(sbom.vulnerabilities)) {
      this.mergeVulnerabilities(sbom.vulnerabilities);
    }

    // Merge dependencies if present
    if (sbom.dependencies && Array.isArray(sbom.dependencies)) {
      this.mergeDependencies(sbom.dependencies);
    }
  }

  /**
   * Process SPDX SBOM
   */
  processSPDXSBOM(sbom, ecosystem) {
    if (!sbom.packages || !Array.isArray(sbom.packages)) {
      console.warn(`⚠️ No packages found in ${ecosystem} SPDX SBOM`);
      return;
    }

    let addedCount = 0;

    for (const pkg of sbom.packages) {
      // Convert SPDX package to CycloneDX component
      const component = this.convertSPDXToCycloneDX(pkg, ecosystem);

      if (this.addComponent(component)) {
        addedCount++;
      }
    }

    this.stats[`${ecosystem}Components`] = addedCount;
    console.log(`  📦 Added ${addedCount} components from ${ecosystem} (SPDX)`);
  }

  /**
   * Enhance component with ecosystem and security information
   */
  enhanceComponent(component, ecosystem) {
    const enhanced = { ...component };

    // Add ecosystem tag
    if (!enhanced.properties) {
      enhanced.properties = [];
    }

    enhanced.properties.push({
      name: 'aura:ecosystem',
      value: ecosystem,
    });

    // Add processing timestamp
    enhanced.properties.push({
      name: 'aura:processed',
      value: new Date().toISOString(),
    });

    // Ensure bom-ref is unique across ecosystems
    if (enhanced['bom-ref']) {
      enhanced['bom-ref'] = `${ecosystem}:${enhanced['bom-ref']}`;
    } else {
      enhanced['bom-ref'] = `${ecosystem}:${enhanced.name}@${enhanced.version || 'unknown'}`;
    }

    // Add security metadata
    if (this.isSecurityCriticalComponent(enhanced)) {
      enhanced.properties.push({
        name: 'aura:security-critical',
        value: 'true',
      });
    }

    return enhanced;
  }

  /**
   * Check if component is security critical (crypto, auth, etc.)
   */
  isSecurityCriticalComponent(component) {
    const securityKeywords = [
      'crypto',
      'encrypt',
      'decrypt',
      'auth',
      'password',
      'token',
      'jwt',
      'oauth',
      'security',
      'hash',
      'ssl',
      'tls',
      'certificate',
      'signature',
      'random',
      'sodium',
      'openssl',
    ];

    const name = (component.name || '').toLowerCase();
    const description = (component.description || '').toLowerCase();

    return securityKeywords.some(
      keyword => name.includes(keyword) || description.includes(keyword)
    );
  }

  /**
   * Add component with deduplication
   */
  addComponent(component) {
    const key = this.generateComponentKey(component);

    if (this.options.deduplication && this.componentMap.has(key)) {
      // Component already exists, merge properties
      const existing = this.componentMap.get(key);
      this.mergeComponentProperties(existing, component);
      this.stats.duplicatesRemoved++;
      return false;
    }

    // Add new component
    this.componentMap.set(key, component);

    if (this.options.outputFormat === 'spdx') {
      this.aggregatedSBOM.packages.push(this.convertCycloneDXToSPDX(component));
    } else {
      this.aggregatedSBOM.components.push(component);
    }

    return true;
  }

  /**
   * Generate unique key for component deduplication
   */
  generateComponentKey(component) {
    // Use purl if available, otherwise use name+version
    if (component.purl) {
      return component.purl;
    }

    return `${component.type || 'unknown'}:${component.name}@${component.version || 'unknown'}`;
  }

  /**
   * Merge component properties
   */
  mergeComponentProperties(existing, newComponent) {
    if (!existing.properties) existing.properties = [];
    if (!newComponent.properties) return;

    // Merge properties, avoiding duplicates
    for (const prop of newComponent.properties) {
      const existingProp = existing.properties.find(p => p.name === prop.name);
      if (!existingProp) {
        existing.properties.push(prop);
      }
    }

    // Merge licenses
    if (newComponent.licenses && newComponent.licenses.length > 0) {
      if (!existing.licenses) existing.licenses = [];

      for (const license of newComponent.licenses) {
        const licenseId = license.license?.id || license.license?.name;
        const existingLicense = existing.licenses.find(
          l => l.license?.id === licenseId || l.license?.name === licenseId
        );

        if (!existingLicense) {
          existing.licenses.push(license);
        }
      }
    }
  }

  /**
   * Convert SPDX package to CycloneDX component
   */
  convertSPDXToCycloneDX(spdxPackage, ecosystem) {
    const component = {
      type: this.inferComponentType(spdxPackage.name, ecosystem),
      'bom-ref': `${ecosystem}:${spdxPackage.name}`,
      name: spdxPackage.name,
      version: spdxPackage.versionInfo || 'unknown',
    };

    // Add description if available
    if (spdxPackage.description) {
      component.description = spdxPackage.description;
    }

    // Convert licenses
    if (spdxPackage.licenseConcluded && spdxPackage.licenseConcluded !== 'NOASSERTION') {
      component.licenses = [
        {
          license: {
            name: spdxPackage.licenseConcluded,
          },
        },
      ];
    }

    // Add download location as external reference
    if (spdxPackage.downloadLocation && spdxPackage.downloadLocation !== 'NOASSERTION') {
      component.externalReferences = [
        {
          type: 'distribution',
          url: spdxPackage.downloadLocation,
        },
      ];
    }

    // Generate purl if possible
    component.purl = this.generatePurl(component, ecosystem);

    return component;
  }

  /**
   * Convert CycloneDX component to SPDX package
   */
  convertCycloneDXToSPDX(component) {
    return {
      SPDXID: `SPDXRef-Package-${component.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: component.name,
      versionInfo: component.version || 'unknown',
      downloadLocation: component.externalReferences?.[0]?.url || 'NOASSERTION',
      filesAnalyzed: false,
      licenseConcluded: component.licenses?.[0]?.license?.name || 'NOASSERTION',
      licenseDeclared: component.licenses?.[0]?.license?.name || 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      description: component.description || '',
    };
  }

  /**
   * Infer component type based on name and ecosystem
   */
  inferComponentType(name, ecosystem) {
    if (ecosystem === 'npm') return 'library';
    if (ecosystem === 'cargo') return 'library';
    if (ecosystem === 'comprehensive') {
      // Try to infer from name
      if (name.includes('os') || name.includes('system')) return 'operating-system';
      if (name.includes('container') || name.includes('image')) return 'container';
      return 'library';
    }
    return 'library';
  }

  /**
   * Generate Package URL (purl)
   */
  generatePurl(component, ecosystem) {
    if (component.purl) return component.purl;

    const type = ecosystem === 'npm' ? 'npm' : ecosystem === 'cargo' ? 'cargo' : 'generic';
    const name = component.name;
    const version = component.version || '';

    return `pkg:${type}/${name}@${version}`;
  }

  /**
   * Merge vulnerabilities from source SBOM
   */
  mergeVulnerabilities(vulnerabilities) {
    if (this.options.outputFormat === 'spdx') return; // SPDX doesn't have vulnerabilities section

    for (const vuln of vulnerabilities) {
      // Check if vulnerability already exists
      const existing = this.aggregatedSBOM.vulnerabilities.find(
        v =>
          v.id === vuln.id ||
          (v.source?.name === vuln.source?.name && v.source?.url === vuln.source?.url)
      );

      if (!existing) {
        this.aggregatedSBOM.vulnerabilities.push(vuln);
      }
    }
  }

  /**
   * Merge dependencies from source SBOM
   */
  mergeDependencies(dependencies) {
    if (this.options.outputFormat === 'spdx') return; // SPDX has different relationship model

    for (const dep of dependencies) {
      // Check if dependency relationship already exists
      const existing = this.aggregatedSBOM.dependencies.find(d => d.ref === dep.ref);

      if (existing) {
        // Merge dependsOn arrays
        if (dep.dependsOn && Array.isArray(dep.dependsOn)) {
          if (!existing.dependsOn) existing.dependsOn = [];

          for (const depRef of dep.dependsOn) {
            if (!existing.dependsOn.includes(depRef)) {
              existing.dependsOn.push(depRef);
            }
          }
        }
      } else {
        this.aggregatedSBOM.dependencies.push(dep);
      }
    }
  }

  /**
   * Finalize aggregated SBOM
   */
  finalizeSBOM() {
    this.stats.totalComponents = this.componentMap.size;

    // Update metadata
    if (this.options.outputFormat === 'cyclonedx') {
      this.aggregatedSBOM.metadata.timestamp = new Date().toISOString();

      // Add aggregation statistics as properties
      this.aggregatedSBOM.metadata.properties = [
        { name: 'aura:aggregation-stats', value: JSON.stringify(this.stats) },
        { name: 'aura:ecosystems', value: 'npm,cargo,comprehensive' },
        { name: 'aura:deduplication', value: this.options.deduplication.toString() },
      ];
    }

    // Sort components by name for consistency
    if (this.aggregatedSBOM.components) {
      this.aggregatedSBOM.components.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (this.aggregatedSBOM.packages) {
      this.aggregatedSBOM.packages.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  /**
   * Generate UUID for SBOM serial number
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Write aggregated SBOM to file
   */
  async writeToFile(outputPath, format = 'json') {
    try {
      let content;

      if (format === 'json') {
        content = JSON.stringify(this.aggregatedSBOM, null, 2);
      } else {
        throw new Error(`Unsupported output format: ${format}`);
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, content, 'utf8');
      console.log(`✅ Aggregated SBOM written to: ${outputPath}`);

      // Generate and write hash file
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const hashPath = `${outputPath}.sha256`;
      fs.writeFileSync(hashPath, `${hash}  ${path.basename(outputPath)}\n`, 'utf8');
      console.log(`🔐 SBOM hash written to: ${hashPath}`);

      return { outputPath, hashPath, hash };
    } catch (error) {
      console.error(`❌ Error writing SBOM to ${outputPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Get aggregation statistics
   */
  getStats() {
    return {
      ...this.stats,
      deduplicationEnabled: this.options.deduplication,
      outputFormat: this.options.outputFormat,
    };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {};
  const inputFiles = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--npm':
        inputFiles.npm = nextArg;
        i++;
        break;
      case '--cargo':
        inputFiles.cargo = nextArg;
        i++;
        break;
      case '--comprehensive':
        inputFiles.comprehensive = nextArg;
        i++;
        break;
      case '--output':
        options.outputPath = nextArg;
        i++;
        break;
      case '--spdx-output':
        options.spdxOutputPath = nextArg;
        i++;
        break;
      case '--format':
        options.outputFormat = nextArg;
        i++;
        break;
      case '--project-name':
        options.projectName = nextArg;
        i++;
        break;
      case '--project-version':
        options.projectVersion = nextArg;
        i++;
        break;
      case '--no-deduplication':
        options.deduplication = false;
        break;
      case '--help':
        console.log(`
SBOM Aggregator Usage:

  node sbom-aggregate.js [options]

Options:
  --npm <file>              Path to npm SBOM file
  --cargo <file>            Path to Cargo SBOM file  
  --comprehensive <file>    Path to comprehensive SBOM file
  --output <file>           Output path for aggregated SBOM
  --spdx-output <file>      Output path for SPDX format SBOM
  --format <format>         Output format (cyclonedx|spdx) [default: cyclonedx]
  --project-name <name>     Project name [default: aura-app]
  --project-version <ver>   Project version [default: 1.0.0]
  --no-deduplication        Disable component deduplication
  --help                    Show this help message

Examples:
  node sbom-aggregate.js --npm npm-sbom.json --cargo cargo-sbom.json --output aura-sbom.json
  node sbom-aggregate.js --npm npm.json --cargo cargo.json --format spdx --output aura.spdx.json
        `);
        process.exit(0);
        break;
    }
  }

  if (!options.outputPath) {
    console.error('❌ Error: --output option is required');
    process.exit(1);
  }

  if (Object.keys(inputFiles).length === 0) {
    console.error('❌ Error: At least one input SBOM file is required');
    process.exit(1);
  }

  // Run aggregation
  main();
}

// Main function moved outside to comply with ESLint no-inner-declarations
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const options = {};
  const inputFiles = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--npm':
        inputFiles.npm = nextArg;
        i++;
        break;
      case '--cargo':
        inputFiles.cargo = nextArg;
        i++;
        break;
      case '--comprehensive':
        inputFiles.comprehensive = nextArg;
        i++;
        break;
      case '--output':
        options.outputPath = nextArg;
        i++;
        break;
      case '--spdx-output':
        options.spdxOutputPath = nextArg;
        i++;
        break;
      case '--format':
        options.outputFormat = nextArg;
        i++;
        break;
      case '--project-name':
        options.projectName = nextArg;
        i++;
        break;
      case '--project-version':
        options.projectVersion = nextArg;
        i++;
        break;
      case '--no-deduplication':
        options.deduplication = false;
        break;
      case '--help':
        console.log(
          `\nSBOM Aggregator Usage:\n\n  node sbom-aggregate.js [options]\n\nOptions:\n  --npm <file>              Path to npm SBOM file\n  --cargo <file>            Path to Cargo SBOM file  \n  --comprehensive <file>    Path to comprehensive SBOM file\n  --output <file>           Output path for aggregated SBOM\n  --spdx-output <file>      Output path for SPDX format SBOM\n  --format <format>         Output format (cyclonedx|spdx) [default: cyclonedx]\n  --project-name <name>     Project name [default: aura-app]\n  --project-version <ver>   Project version [default: 1.0.0]\n  --no-deduplication        Disable component deduplication\n  --help                    Show this help message\n\nExamples:\n  node sbom-aggregate.js --npm npm-sbom.json --cargo cargo-sbom.json --output aura-sbom.json\n  node sbom-aggregate.js --npm npm.json --cargo cargo.json --format spdx --output aura.spdx.json\n        `
        );
        process.exit(0);
        break;
    }
  }

  if (!options.outputPath) {
    console.error('❌ Error: --output option is required');
    process.exit(1);
  }

  if (Object.keys(inputFiles).length === 0) {
    console.error('❌ Error: At least one input SBOM file is required');
    process.exit(1);
  }

  try {
    const aggregator = new SBOMAggregator(options);

    // Aggregate SBOMs
    await aggregator.aggregate(inputFiles);

    // Write CycloneDX output
    await aggregator.writeToFile(options.outputPath);

    // Write SPDX output if requested
    if (options.spdxOutputPath) {
      const spdxAggregator = new SBOMAggregator({
        ...options,
        outputFormat: 'spdx',
      });

      await spdxAggregator.aggregate(inputFiles);
      await spdxAggregator.writeToFile(options.spdxOutputPath);
    }

    // Print statistics
    const stats = aggregator.getStats();
    console.log('\n📊 Aggregation Statistics:');
    console.log(`  Total Components: ${stats.totalComponents}`);
    console.log(`  npm Components: ${stats.npmComponents}`);
    console.log(`  Cargo Components: ${stats.cargoComponents}`);
    console.log(`  Comprehensive Components: ${stats.comprehensiveComponents}`);
    console.log(`  Duplicates Removed: ${stats.duplicatesRemoved}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ SBOM aggregation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { SBOMAggregator };
