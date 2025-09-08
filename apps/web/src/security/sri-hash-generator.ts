import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SRIResource {
  url: string;
  filePath?: string;
  hash?: string;
  algorithm: 'sha256' | 'sha384' | 'sha512';
  crossorigin?: 'anonymous' | 'use-credentials';
}

export interface SRIManifest {
  version: string;
  buildTimestamp: string;
  resources: SRIResource[];
}

export class SRIHashGenerator {
  private readonly manifestPath: string;
  private manifest: SRIManifest | null = null;
  private manifestCache: { manifest: SRIManifest; lastModified: number } | null = null;

  constructor(buildOutputDir: string) {
    this.manifestPath = join(buildOutputDir, 'sri-manifest.json');
  }

  async generateHash(
    content: Buffer | string,
    algorithm: SRIResource['algorithm'] = 'sha384'
  ): Promise<string> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const hash = createHash(algorithm).update(buffer).digest('base64');
    return `${algorithm}-${hash}`;
  }

  async generateHashFromFile(
    filePath: string,
    algorithm: SRIResource['algorithm'] = 'sha384'
  ): Promise<string> {
    try {
      const content = await readFile(filePath);
      return await this.generateHash(content, algorithm);
    } catch (error) {
      throw new Error(`Failed to generate SRI hash for ${filePath}: ${error}`);
    }
  }

  async generateManifest(resources: Omit<SRIResource, 'hash'>[]): Promise<SRIManifest> {
    const manifestResources: SRIResource[] = [];

    for (const resource of resources) {
      let hash: string;

      if (resource.filePath) {
        hash = await this.generateHashFromFile(resource.filePath, resource.algorithm);
      } else {
        throw new Error(`No file path provided for resource: ${resource.url}`);
      }

      manifestResources.push({
        ...resource,
        hash,
      });
    }

    this.manifest = {
      version: '1.0',
      buildTimestamp: new Date().toISOString(),
      resources: manifestResources,
    };

    return this.manifest;
  }

  async saveManifest(manifest?: SRIManifest): Promise<void> {
    const manifestToSave = manifest || this.manifest;
    if (!manifestToSave) {
      throw new Error('No manifest to save. Generate manifest first.');
    }

    const { writeFile, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');

    try {
      await mkdir(dirname(this.manifestPath), { recursive: true });
      await writeFile(this.manifestPath, JSON.stringify(manifestToSave, null, 2));
    } catch (error) {
      throw new Error(`Failed to save SRI manifest: ${error}`);
    }
  }

  async loadManifest(): Promise<SRIManifest | null> {
    try {
      // Check cache first in production
      if (process.env.NODE_ENV === 'production' && this.manifestCache) {
        const { stat } = await import('fs/promises');
        const stats = await stat(this.manifestPath);
        const lastModified = stats.mtime.getTime();

        // Return cached version if file hasn't changed
        if (lastModified <= this.manifestCache.lastModified) {
          this.manifest = this.manifestCache.manifest;
          return this.manifest;
        }
      }

      const content = await readFile(this.manifestPath, 'utf8');
      this.manifest = JSON.parse(content);

      // Cache in production
      if (process.env.NODE_ENV === 'production' && this.manifest) {
        const { stat } = await import('fs/promises');
        const stats = await stat(this.manifestPath);
        this.manifestCache = {
          manifest: this.manifest,
          lastModified: stats.mtime.getTime(),
        };
      }

      return this.manifest;
    } catch (error) {
      return null;
    }
  }

  getResourceHash(url: string): string | null {
    if (!this.manifest) return null;

    const resource = this.manifest.resources.find(r => r.url === url);
    return resource?.hash || null;
  }

  generateIntegrityAttribute(url: string, fallbackHashes?: string[]): string {
    const primaryHash = this.getResourceHash(url);
    if (!primaryHash && (!fallbackHashes || fallbackHashes.length === 0)) {
      throw new Error(`No SRI hash found for resource: ${url}`);
    }

    const hashes = [primaryHash, ...(fallbackHashes || [])].filter(Boolean);
    return hashes.join(' ');
  }

  validateHash(content: Buffer | string, expectedHash: string): boolean {
    try {
      const [algorithm, expectedHashValue] = expectedHash.split('-', 2);
      if (!algorithm || !expectedHashValue) return false;

      const actualHash = createHash(algorithm)
        .update(Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'))
        .digest('base64');

      return actualHash === expectedHashValue;
    } catch {
      return false;
    }
  }

  async verifyResource(
    url: string,
    content: Buffer | string
  ): Promise<{
    valid: boolean;
    expectedHash?: string;
    actualHash?: string;
    error?: string;
  }> {
    const expectedHash = this.getResourceHash(url);
    if (!expectedHash) {
      return {
        valid: false,
        error: `No SRI hash found for resource: ${url}`,
      };
    }

    try {
      const [algorithm] = expectedHash.split('-', 2);
      const actualHash = await this.generateHash(content, algorithm as SRIResource['algorithm']);
      const valid = this.validateHash(content, expectedHash);

      return {
        valid,
        expectedHash,
        actualHash,
        error: valid ? undefined : 'Hash mismatch',
      };
    } catch (error) {
      return {
        valid: false,
        expectedHash,
        error: `Verification failed: ${error}`,
      };
    }
  }
}

// Runtime SRI verification for client-side
export class ClientSRIVerifier {
  private manifest: SRIManifest | null = null;
  private manifestCache: Map<string, { manifest: SRIManifest; expiresAt: number }> = new Map();
  private readonly cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  async loadManifest(manifestUrl: string = '/sri-manifest.json'): Promise<void> {
    // Check cache first in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const cached = this.manifestCache.get(manifestUrl);
      if (cached && Date.now() < cached.expiresAt) {
        this.manifest = cached.manifest;
        return;
      }
    }

    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to load SRI manifest: ${response.statusText}`);
      }
      this.manifest = await response.json();

      // Cache in production
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && this.manifest) {
        this.manifestCache.set(manifestUrl, {
          manifest: this.manifest,
          expiresAt: Date.now() + this.cacheMaxAge,
        });
      }
    } catch (error) {
      console.warn('Failed to load SRI manifest:', error);
      this.manifest = null;
    }
  }

  getExpectedHash(resourceUrl: string): string | null {
    if (!this.manifest) return null;

    const resource = this.manifest.resources.find(
      r => r.url === resourceUrl || resourceUrl.endsWith(r.url)
    );
    return resource?.hash || null;
  }

  async verifyAndLoadScript(src: string, nonce?: string): Promise<HTMLScriptElement> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const expectedHash = this.getExpectedHash(src);

      if (expectedHash) {
        script.integrity = expectedHash;
        script.crossOrigin = 'anonymous';
      }

      if (nonce) {
        script.nonce = nonce;
      }

      script.onload = () => resolve(script);
      script.onerror = () => {
        const error = new Error(`Failed to load script: ${src}`);
        reject(error);

        // Report SRI failure
        this.reportSRIFailure(src, expectedHash || 'unknown');
      };

      script.src = src;
      document.head.appendChild(script);
    });
  }

  async verifyAndLoadStylesheet(href: string): Promise<HTMLLinkElement> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      const expectedHash = this.getExpectedHash(href);

      link.rel = 'stylesheet';
      if (expectedHash) {
        link.integrity = expectedHash;
        link.crossOrigin = 'anonymous';
      }

      link.onload = () => resolve(link);
      link.onerror = () => {
        const error = new Error(`Failed to load stylesheet: ${href}`);
        reject(error);

        // Report SRI failure
        this.reportSRIFailure(href, expectedHash || 'unknown');
      };

      link.href = href;
      document.head.appendChild(link);
    });
  }

  private reportSRIFailure(resourceUrl: string, expectedHash: string): void {
    // Send SRI failure report to monitoring endpoint
    fetch('/api/security/sri-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'sri-failure',
        resourceUrl,
        expectedHash,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    }).catch(error => {
      console.error('Failed to report SRI failure:', error);
    });
  }
}

// Global client verifier instance
export const clientSRIVerifier = new ClientSRIVerifier();
