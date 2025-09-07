export interface FallbackResource {
  primary: string;
  fallbacks: string[];
  integrity?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
}

export interface FallbackConfig {
  resources: FallbackResource[];
  retryAttempts?: number;
  retryDelay?: number;
  onFailure?: (resource: string, error: Error) => void;
}

export class SRIFallbackManager {
  private config: Required<FallbackConfig>;
  private loadAttempts = new Map<string, number>();

  constructor(config: FallbackConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      onFailure: () => {},
      ...config,
    };
  }

  async loadScriptWithFallback(resourceId: string): Promise<HTMLScriptElement> {
    const resource = this.getResource(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    const urls = [resource.primary, ...resource.fallbacks];
    let lastError: Error | null = null;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const attempts = this.loadAttempts.get(url) || 0;

      if (attempts >= this.config.retryAttempts) {
        console.warn(`Skipping ${url} after ${attempts} failed attempts`);
        continue;
      }

      try {
        const script = await this.loadScript(url, resource.integrity, resource.crossorigin);
        this.resetAttempts(url);
        return script;
      } catch (error) {
        lastError = error as Error;
        this.incrementAttempts(url);

        console.warn(`Failed to load script from ${url}:`, error);

        // Report SRI failure if this was an integrity check failure
        if (error.message.includes('integrity')) {
          this.reportSRIFailure(url, resource.integrity || 'unknown');
        }

        // Wait before trying next fallback
        if (i < urls.length - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    // All fallbacks failed
    this.config.onFailure(resourceId, lastError || new Error('All fallbacks failed'));
    throw new Error(`Failed to load resource ${resourceId} from all sources`);
  }

  async loadStylesheetWithFallback(resourceId: string): Promise<HTMLLinkElement> {
    const resource = this.getResource(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    const urls = [resource.primary, ...resource.fallbacks];
    let lastError: Error | null = null;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const attempts = this.loadAttempts.get(url) || 0;

      if (attempts >= this.config.retryAttempts) {
        console.warn(`Skipping ${url} after ${attempts} failed attempts`);
        continue;
      }

      try {
        const link = await this.loadStylesheet(url, resource.integrity, resource.crossorigin);
        this.resetAttempts(url);
        return link;
      } catch (error) {
        lastError = error as Error;
        this.incrementAttempts(url);

        console.warn(`Failed to load stylesheet from ${url}:`, error);

        // Report SRI failure if this was an integrity check failure
        if (error.message.includes('integrity')) {
          this.reportSRIFailure(url, resource.integrity || 'unknown');
        }

        // Wait before trying next fallback
        if (i < urls.length - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    // All fallbacks failed
    this.config.onFailure(resourceId, lastError || new Error('All fallbacks failed'));
    throw new Error(`Failed to load resource ${resourceId} from all sources`);
  }

  private loadScript(
    src: string,
    integrity?: string,
    crossorigin?: string
  ): Promise<HTMLScriptElement> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');

      if (integrity) {
        script.integrity = integrity;
      }

      if (crossorigin) {
        script.crossOrigin = crossorigin;
      }

      script.onload = () => resolve(script);
      script.onerror = () => {
        // Distinguish between network errors and integrity errors
        const errorType = integrity ? 'integrity or network' : 'network';
        reject(new Error(`Script load failed (${errorType} error): ${src}`));
      };

      script.src = src;
      document.head.appendChild(script);
    });
  }

  private loadStylesheet(
    href: string,
    integrity?: string,
    crossorigin?: string
  ): Promise<HTMLLinkElement> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';

      if (integrity) {
        link.integrity = integrity;
      }

      if (crossorigin) {
        link.crossOrigin = crossorigin;
      }

      link.onload = () => resolve(link);
      link.onerror = () => {
        const errorType = integrity ? 'integrity or network' : 'network';
        reject(new Error(`Stylesheet load failed (${errorType} error): ${href}`));
      };

      link.href = href;
      document.head.appendChild(link);
    });
  }

  private getResource(resourceId: string): FallbackResource | undefined {
    return this.config.resources.find(
      r => r.primary.includes(resourceId) || r.fallbacks.some(f => f.includes(resourceId))
    );
  }

  private incrementAttempts(url: string): void {
    const current = this.loadAttempts.get(url) || 0;
    this.loadAttempts.set(url, current + 1);
  }

  private resetAttempts(url: string): void {
    this.loadAttempts.delete(url);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private reportSRIFailure(resourceUrl: string, expectedHash: string): void {
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
        errorMessage: 'SRI check failed, trying fallback',
      }),
    }).catch(error => {
      console.error('Failed to report SRI failure:', error);
    });
  }

  // Public method to get current failure statistics
  getFailureStats(): { url: string; attempts: number }[] {
    return Array.from(this.loadAttempts.entries()).map(([url, attempts]) => ({
      url,
      attempts,
    }));
  }

  // Clear all failure attempts (useful for testing or recovery)
  clearFailureStats(): void {
    this.loadAttempts.clear();
  }
}

// Factory function to create fallback manager with common CDN fallbacks
export function createCDNFallbackManager(
  customConfig?: Partial<FallbackConfig>
): SRIFallbackManager {
  const defaultResources: FallbackResource[] = [
    // Add your common CDN resources here
    // Example:
    // {
    //   primary: 'https://cdn.example.com/library.js',
    //   fallbacks: [
    //     'https://backup-cdn.example.com/library.js',
    //     '/assets/vendor/library.js', // Local fallback
    //   ],
    //   integrity: 'sha384-...',
    //   crossorigin: 'anonymous',
    // },
  ];

  return new SRIFallbackManager({
    resources: defaultResources,
    retryAttempts: 2,
    retryDelay: 500,
    onFailure: (resource, error) => {
      console.error(`Critical: Failed to load resource ${resource}:`, error);

      // Report to monitoring service
      if (typeof window !== 'undefined' && 'navigator' in window) {
        fetch('/api/security/sri-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'sri-failure',
            resourceUrl: resource,
            expectedHash: 'unknown',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            errorMessage: `All fallbacks failed: ${error.message}`,
          }),
        }).catch(() => {}); // Ignore reporting errors
      }
    },
    ...customConfig,
  });
}

// Helper function to preload critical resources with fallbacks
export async function preloadCriticalResources(
  resources: string[],
  fallbackManager: SRIFallbackManager
): Promise<void> {
  const loadPromises = resources.map(async resourceId => {
    try {
      if (resourceId.endsWith('.css')) {
        await fallbackManager.loadStylesheetWithFallback(resourceId);
      } else if (resourceId.endsWith('.js')) {
        await fallbackManager.loadScriptWithFallback(resourceId);
      }
    } catch (error) {
      console.error(`Failed to preload critical resource ${resourceId}:`, error);
    }
  });

  await Promise.allSettled(loadPromises);
}
