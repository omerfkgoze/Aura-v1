// Trusted Types polyfill interface for better TypeScript support
declare global {
  interface Window {
    trustedTypes?: {
      createPolicy(name: string, policy: TrustedTypePolicy): TrustedTypePolicy;
      isHTML(value: any): value is TrustedHTML;
      isScript(value: any): value is TrustedScript;
      isScriptURL(value: any): value is TrustedScriptURL;
      emptyHTML: TrustedHTML;
      emptyScript: TrustedScript;
    };
    TrustedHTML?: any;
    TrustedScript?: any;
    TrustedScriptURL?: any;
  }
}

interface TrustedTypePolicy {
  createHTML?(input: string, ...args: any[]): TrustedHTML;
  createScript?(input: string, ...args: any[]): TrustedScript;
  createScriptURL?(input: string, ...args: any[]): TrustedScriptURL;
}

interface TrustedHTML {
  toString(): string;
}

interface TrustedScript {
  toString(): string;
}

interface TrustedScriptURL {
  toString(): string;
}

export class TrustedTypesManager {
  private defaultPolicy: TrustedTypePolicy | null = null;
  private policies = new Map<string, TrustedTypePolicy>();
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'trustedTypes' in window;
    this.initializeDefaultPolicy();
  }

  private initializeDefaultPolicy(): void {
    if (!this.isSupported || !window.trustedTypes) return;

    try {
      this.defaultPolicy = window.trustedTypes.createPolicy('default', {
        createHTML: (input: string) => this.sanitizeHTML(input),
        createScript: (input: string) => this.sanitizeScript(input),
        createScriptURL: (input: string) => this.sanitizeScriptURL(input),
      });

      this.policies.set('default', this.defaultPolicy);
      console.log('Trusted Types default policy initialized');
    } catch (error) {
      console.error('Failed to create default Trusted Types policy:', error);
    }
  }

  createPolicy(name: string, policyOptions: TrustedTypePolicy): TrustedTypePolicy | null {
    if (!this.isSupported || !window.trustedTypes) {
      console.warn('Trusted Types not supported, returning null policy');
      return null;
    }

    try {
      const policy = window.trustedTypes.createPolicy(name, policyOptions);
      this.policies.set(name, policy);
      return policy;
    } catch (error) {
      console.error(`Failed to create Trusted Types policy '${name}':`, error);
      return null;
    }
  }

  getPolicy(name: string): TrustedTypePolicy | null {
    return this.policies.get(name) || null;
  }

  // Safe HTML creation methods
  createSafeHTML(input: string): TrustedHTML | string {
    if (!this.isSupported || !this.defaultPolicy?.createHTML) {
      return this.sanitizeHTML(input);
    }

    try {
      return this.defaultPolicy.createHTML(input);
    } catch (error) {
      console.error('Failed to create trusted HTML:', error);
      return this.sanitizeHTML(input);
    }
  }

  // Safe Script creation methods
  createSafeScript(input: string): TrustedScript | string {
    if (!this.isSupported || !this.defaultPolicy?.createScript) {
      return this.sanitizeScript(input);
    }

    try {
      return this.defaultPolicy.createScript(input);
    } catch (error) {
      console.error('Failed to create trusted script:', error);
      return this.sanitizeScript(input);
    }
  }

  // Safe Script URL creation methods
  createSafeScriptURL(input: string): TrustedScriptURL | string {
    if (!this.isSupported || !this.defaultPolicy?.createScriptURL) {
      return this.sanitizeScriptURL(input);
    }

    try {
      return this.defaultPolicy.createScriptURL(input);
    } catch (error) {
      console.error('Failed to create trusted script URL:', error);
      return this.sanitizeScriptURL(input);
    }
  }

  // Sanitization methods (fallback when Trusted Types not supported)
  private sanitizeHTML(input: string): string {
    // Basic HTML sanitization
    const div = document.createElement('div');
    div.textContent = input;
    let sanitized = div.innerHTML;

    // Allow basic formatting tags but remove dangerous ones
    const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span'];
    const dangerousTags = ['script', 'object', 'embed', 'iframe', 'form', 'input'];

    // Remove dangerous tags
    dangerousTags.forEach(tag => {
      const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove javascript: and data: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');

    // Remove on* event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>]*/gi, '');

    return sanitized;
  }

  private sanitizeScript(input: string): string {
    // For scripts, we're very restrictive
    // Only allow specific patterns that are known to be safe

    // Check if it's a known safe pattern
    const safePatterns = [
      /^console\.(log|warn|error|info)\([^)]*\);?$/,
      /^\/\*[\s\S]*?\*\/$/, // Comments only
      /^\/\/.*$/, // Single line comments
      /^\s*$/, // Empty or whitespace only
    ];

    const isSafe = safePatterns.some(pattern => pattern.test(input.trim()));

    if (!isSafe) {
      console.warn('Script content blocked by sanitizer:', input.substring(0, 100));
      return '// Script blocked by security policy';
    }

    return input;
  }

  private sanitizeScriptURL(input: string): string {
    try {
      const url = new URL(input, window.location.origin);

      // Only allow https, http, and relative URLs from same origin
      if (url.protocol === 'javascript:' || url.protocol === 'data:') {
        console.warn('Dangerous script URL blocked:', input);
        return '';
      }

      // For external URLs, only allow known CDNs
      const allowedHosts = [
        'cdn.jsdelivr.net',
        'unpkg.com',
        'cdnjs.cloudflare.com',
        // Add your trusted CDN hosts here
      ];

      if (url.host !== window.location.host) {
        if (!allowedHosts.includes(url.host)) {
          console.warn('External script URL blocked:', input);
          return '';
        }
      }

      return url.toString();
    } catch (error) {
      console.warn('Invalid script URL:', input);
      return '';
    }
  }

  // Helper methods for React integration
  createReactSafeProps(props: Record<string, any>): Record<string, any> {
    const safeProps: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      if (key === 'dangerouslySetInnerHTML' && value && value.__html) {
        safeProps[key] = {
          __html: this.createSafeHTML(value.__html),
        };
      } else if (typeof value === 'string' && this.isDangerousProp(key)) {
        safeProps[key] = this.sanitizeHTML(value);
      } else {
        safeProps[key] = value;
      }
    }

    return safeProps;
  }

  private isDangerousProp(propName: string): boolean {
    const dangerousProps = ['innerHTML', 'outerHTML', 'dangerouslySetInnerHTML'];

    // Check for event handlers (onClick, onLoad, etc.)
    if (propName.toLowerCase().startsWith('on')) {
      return true;
    }

    return dangerousProps.includes(propName);
  }

  // DOM manipulation helpers
  safeSetInnerHTML(element: Element, html: string): void {
    const safeHTML = this.createSafeHTML(html);

    if (this.isSupported && window.trustedTypes?.isHTML(safeHTML)) {
      element.innerHTML = safeHTML as any;
    } else {
      element.innerHTML = safeHTML as string;
    }
  }

  safeCreateElement(tagName: string, attributes?: Record<string, string>): HTMLElement {
    const element = document.createElement(tagName);

    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key.toLowerCase().startsWith('on')) {
          console.warn(`Event handler attribute blocked: ${key}`);
          continue;
        }

        if (key === 'src' && tagName.toLowerCase() === 'script') {
          element.setAttribute(key, this.sanitizeScriptURL(value));
        } else {
          element.setAttribute(key, value);
        }
      }
    }

    return element;
  }

  // Check if Trusted Types is properly configured
  isConfigured(): boolean {
    return this.isSupported && this.defaultPolicy !== null;
  }

  // Get current policy violations (for debugging)
  getViolationCount(): number {
    // This would need to be implemented with actual violation tracking
    // For now, return 0 as a placeholder
    return 0;
  }
}

// Global instance
export const trustedTypesManager = new TrustedTypesManager();

// React hook for using Trusted Types
export function useTrustedTypes() {
  return {
    createSafeHTML: (html: string) => trustedTypesManager.createSafeHTML(html),
    createSafeScript: (script: string) => trustedTypesManager.createSafeScript(script),
    createSafeScriptURL: (url: string) => trustedTypesManager.createSafeScriptURL(url),
    safeSetInnerHTML: (element: Element, html: string) =>
      trustedTypesManager.safeSetInnerHTML(element, html),
    isConfigured: () => trustedTypesManager.isConfigured(),
  };
}
