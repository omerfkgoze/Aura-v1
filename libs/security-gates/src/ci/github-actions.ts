import { GateRunner, GateRunnerConfig } from '../core/gate-runner';
import { CryptoGate } from '../crypto/crypto-gate';
import { NetworkGate } from '../network/network-gate';
import { TestingGate, createTestingGate } from '../testing/testing-gate';
import { PIIPreventionGate, validatePIIPrevention } from '../pii/pii-gate';
import {
  SecurityGate,
  SecurityGateResult,
  GateExecutionContext,
} from '../core/security-gate.interface';

export interface CIGateConfig extends GateRunnerConfig {
  exitOnFailure?: boolean;
  generateReport?: boolean;
  reportPath?: string;
  slackWebhook?: string;
  // Advanced testing options
  enableAdvancedTesting?: boolean;
  enablePropertyTesting?: boolean;
  enableFuzzTesting?: boolean;
  enableChaosEngineering?: boolean;
  enableLoadTesting?: boolean;
  maxTestingTime?: number; // minutes
  // Network analysis options
  enableNetworkAnalysis?: boolean;
  pcapFile?: string;
  networkAnalysisTimeout?: number;
  // PII prevention options
  enablePIIPrevention?: boolean;
  logPaths?: string[];
  errorSamples?: string[];
  piiFailOnCritical?: boolean;
}

export class GitHubActionsCrypto implements SecurityGate {
  name = 'crypto-envelope-validation';
  description = 'Validates crypto envelope structure and parameters';
  version = '1.0.0';

  private cryptoGate: CryptoGate;

  constructor(config?: Parameters<typeof CryptoGate.prototype.constructor>[0]) {
    this.cryptoGate = new CryptoGate(config);
  }

  async execute(input: unknown): Promise<SecurityGateResult> {
    if (Array.isArray(input)) {
      const batchResult = await this.cryptoGate.validateBatch(input);
      return {
        valid: batchResult.summary.invalid === 0,
        errors: batchResult.results.flatMap(r => r.errors),
        warnings: batchResult.results.flatMap(r => r.warnings),
        metadata: {
          batchSummary: batchResult.summary,
          totalEnvelopes: batchResult.results.length,
        },
      };
    } else {
      const result = await this.cryptoGate.validateCryptoEnvelope(input);
      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    }
  }

  getConfig(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
    };
  }

  validateConfig(config: Record<string, unknown>): SecurityGateResult {
    const requiredFields = ['name', 'description', 'version'];
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

export class CIGateRunner {
  private runner: GateRunner;
  private config: CIGateConfig;

  constructor(config: CIGateConfig = {}) {
    this.config = {
      exitOnFailure: true,
      generateReport: true,
      reportPath: './security-gate-report.md',
      environment: (process.env.NODE_ENV as any) || 'development',
      // Advanced testing defaults
      enableAdvancedTesting: true,
      enablePropertyTesting: true,
      enableFuzzTesting: true,
      enableChaosEngineering: false, // Disabled by default for CI
      enableLoadTesting: false, // Disabled by default for CI
      maxTestingTime: 15, // 15 minutes max
      // Network analysis defaults
      enableNetworkAnalysis: false,
      networkAnalysisTimeout: 300, // 5 minutes
      ...config,
    };

    this.runner = new GateRunner({
      failFast: this.config.exitOnFailure,
      parallel: this.config.parallel,
      timeout: this.config.timeout,
      retries: this.config.retries,
      environment: this.config.environment,
    });

    this.setupDefaultGates();
  }

  private setupDefaultGates(): void {
    // Register crypto envelope validation gate
    const cryptoGate = new GitHubActionsCrypto({
      strictMode: this.config.environment === 'production',
      allowWarnings: this.config.environment !== 'production',
      timingAttackCheck: true,
      quantumResistanceCheck: false,
    });
    this.runner.registerGate(cryptoGate);

    // Register network analysis gate if enabled
    if (this.config.enableNetworkAnalysis) {
      const networkGate = new NetworkGate({
        pcapAnalysisEnabled: true,
        tlsInspectionEnabled: true,
        metadataDetectionEnabled: true,
        timeout: this.config.networkAnalysisTimeout! * 1000,
      });
      this.runner.registerGate(networkGate);
    }

    // Register advanced testing gate if enabled
    if (this.config.enableAdvancedTesting) {
      const testingGate = createTestingGate({
        enablePropertyTesting: this.config.enablePropertyTesting!,
        enableFuzzTesting: this.config.enableFuzzTesting!,
        enableChaosEngineering: this.config.enableChaosEngineering!,
        enableLoadTesting: this.config.enableLoadTesting!,
        maxTestingTime: this.config.maxTestingTime!,
        parallelExecution: true,
        failFast: this.config.exitOnFailure!,
        outputDirectory: './ci-testing-results',
      });
      this.runner.registerGate(testingGate);
    }
  }

  async runCryptoValidation(envelopesPath: string): Promise<void> {
    console.log('🔐 Running crypto envelope validation...');

    try {
      // Load envelopes from file or environment
      const envelopes = await this.loadEnvelopes(envelopesPath);

      if (envelopes.length === 0) {
        console.log('ℹ️  No crypto envelopes found to validate');
        return;
      }

      console.log(`📊 Found ${envelopes.length} crypto envelopes to validate`);

      const context: Partial<GateExecutionContext> = {
        environment: this.config.environment,
        timestamp: new Date(),
        requestId: process.env.GITHUB_RUN_ID,
        metadata: {
          repository: process.env.GITHUB_REPOSITORY,
          branch: process.env.GITHUB_REF_NAME,
          commit: process.env.GITHUB_SHA,
          actor: process.env.GITHUB_ACTOR,
        },
      };

      const result = await this.runner.executeGate(
        'crypto-envelope-validation',
        envelopes,
        context
      );

      // Generate report
      if (this.config.generateReport) {
        await this.generateReport(result, envelopes.length);
      }

      // Log results
      this.logResults(result, envelopes.length);

      // Send notifications
      if (this.config.slackWebhook && !result.valid) {
        await this.sendSlackNotification(result, envelopes.length);
      }

      // Exit with error code if validation failed
      if (this.config.exitOnFailure && !result.valid) {
        console.error('❌ Crypto envelope validation failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('💥 Error during crypto validation:', error);
      if (this.config.exitOnFailure) {
        process.exit(1);
      }
    }
  }

  private async loadEnvelopes(path: string): Promise<unknown[]> {
    // In a real implementation, this would load from files, database, or API
    // For now, return empty array as placeholder
    console.log(`📁 Loading envelopes from: ${path}`);
    return [];
  }

  private async generateReport(result: SecurityGateResult, envelopeCount: number): Promise<void> {
    const report = this.createMarkdownReport(result, envelopeCount);

    // Write report to file
    const fs = await import('fs/promises');
    await fs.writeFile(this.config.reportPath!, report);

    console.log(`📝 Security gate report generated: ${this.config.reportPath}`);
  }

  private createMarkdownReport(result: SecurityGateResult, envelopeCount: number): string {
    const status = result.valid ? '✅ PASSED' : '❌ FAILED';
    const timestamp = new Date().toISOString();

    let report = `# Security Gate Report\n\n`;
    report += `**Status:** ${status}\n`;
    report += `**Timestamp:** ${timestamp}\n`;
    report += `**Environment:** ${this.config.environment}\n`;
    report += `**Envelopes Validated:** ${envelopeCount}\n\n`;

    if (result.errors.length > 0) {
      report += `## Errors (${result.errors.length})\n\n`;
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += `## Warnings (${result.warnings.length})\n\n`;
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (result.metadata) {
      report += `## Metadata\n\n`;
      report += '```json\n';
      report += JSON.stringify(result.metadata, null, 2);
      report += '\n```\n';
    }

    return report;
  }

  private logResults(result: SecurityGateResult, envelopeCount: number): void {
    if (result.valid) {
      console.log(`✅ All ${envelopeCount} crypto envelopes passed validation`);
    } else {
      console.log(`❌ Crypto envelope validation failed`);
      console.log(`   Errors: ${result.errors.length}`);
      console.log(`   Warnings: ${result.warnings.length}`);
    }

    if (result.errors.length > 0) {
      console.log('\n🚨 Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
  }

  private async sendSlackNotification(
    result: SecurityGateResult,
    envelopeCount: number
  ): Promise<void> {
    const payload = {
      text: `🚨 Crypto Envelope Validation Failed`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Crypto Envelope Validation Failed*\n• Environment: ${this.config.environment}\n• Envelopes: ${envelopeCount}\n• Errors: ${result.errors.length}\n• Warnings: ${result.warnings.length}`,
          },
        },
      ],
    };

    try {
      const response = await fetch(this.config.slackWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('Failed to send Slack notification');
      }
    } catch (error) {
      console.warn('Error sending Slack notification:', error);
    }
  }
}

// CLI entry point for GitHub Actions
export async function runCIGates(): Promise<void> {
  const envelopesPath = process.argv[2] || './test-envelopes.json';
  const environment = (process.env.NODE_ENV as any) || 'development';

  const ciRunner = new CIGateRunner({
    environment,
    exitOnFailure: true,
    generateReport: true,
    reportPath: process.env.REPORT_PATH || './security-gate-report.md',
    slackWebhook: process.env.SLACK_WEBHOOK,
  });

  await ciRunner.runCryptoValidation(envelopesPath);
}
