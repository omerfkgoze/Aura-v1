import { trustedTypesManager } from '../middleware/trusted-types';

// DOM sink interfaces for dangerous operations
interface DOMSink {
  name: string;
  element: string;
  property: string;
  dangerous: boolean;
  requiresTrustedType: 'HTML' | 'Script' | 'ScriptURL' | null;
}

// Comprehensive list of dangerous DOM sinks
const DOM_SINKS: DOMSink[] = [
  // HTML injection sinks
  {
    name: 'innerHTML',
    element: '*',
    property: 'innerHTML',
    dangerous: true,
    requiresTrustedType: 'HTML',
  },
  {
    name: 'outerHTML',
    element: '*',
    property: 'outerHTML',
    dangerous: true,
    requiresTrustedType: 'HTML',
  },
  {
    name: 'insertAdjacentHTML',
    element: '*',
    property: 'insertAdjacentHTML',
    dangerous: true,
    requiresTrustedType: 'HTML',
  },
  {
    name: 'document.write',
    element: 'document',
    property: 'write',
    dangerous: true,
    requiresTrustedType: 'HTML',
  },
  {
    name: 'document.writeln',
    element: 'document',
    property: 'writeln',
    dangerous: true,
    requiresTrustedType: 'HTML',
  },

  // Script execution sinks
  {
    name: 'eval',
    element: 'window',
    property: 'eval',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'Function constructor',
    element: 'Function',
    property: 'constructor',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'setTimeout script',
    element: 'window',
    property: 'setTimeout',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'setInterval script',
    element: 'window',
    property: 'setInterval',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'script.text',
    element: 'script',
    property: 'text',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'script.textContent',
    element: 'script',
    property: 'textContent',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'script.innerText',
    element: 'script',
    property: 'innerText',
    dangerous: true,
    requiresTrustedType: 'Script',
  },

  // Script URL sinks
  {
    name: 'script.src',
    element: 'script',
    property: 'src',
    dangerous: true,
    requiresTrustedType: 'ScriptURL',
  },
  {
    name: 'iframe.src',
    element: 'iframe',
    property: 'src',
    dangerous: true,
    requiresTrustedType: 'ScriptURL',
  },
  {
    name: 'embed.src',
    element: 'embed',
    property: 'src',
    dangerous: true,
    requiresTrustedType: 'ScriptURL',
  },
  {
    name: 'object.data',
    element: 'object',
    property: 'data',
    dangerous: true,
    requiresTrustedType: 'ScriptURL',
  },

  // Event handler sinks
  {
    name: 'onclick',
    element: '*',
    property: 'onclick',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'onload',
    element: '*',
    property: 'onload',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
  {
    name: 'onerror',
    element: '*',
    property: 'onerror',
    dangerous: true,
    requiresTrustedType: 'Script',
  },
];

export class DOMSinkProtector {
  private originalMethods = new Map<string, any>();
  private violationCount = 0;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeProtection();
    }
  }

  private initializeProtection(): void {
    if (this.isInitialized) return;

    try {
      this.protectInnerHTML();
      this.protectOuterHTML();
      this.protectInsertAdjacentHTML();
      this.protectDocumentWrite();
      this.protectEval();
      this.protectFunctionConstructor();
      this.protectTimerFunctions();
      this.protectScriptProperties();
      this.protectEventHandlers();

      this.isInitialized = true;
      console.log('DOM sink protection initialized');
    } catch (error) {
      console.error('Failed to initialize DOM sink protection:', error);
    }
  }

  private protectInnerHTML(): void {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!originalDescriptor) return;

    this.originalMethods.set('innerHTML_set', originalDescriptor.set);
    this.originalMethods.set('innerHTML_get', originalDescriptor.get);

    Object.defineProperty(Element.prototype, 'innerHTML', {
      get: originalDescriptor.get,
      set: (value: any) => {
        if (this.shouldBlock('innerHTML', value)) {
          this.reportViolation('innerHTML', value);
          return;
        }

        const safeValue = this.getSafeValue(value, 'HTML');
        originalDescriptor.set!.call(this, safeValue);
      },
      configurable: true,
    });
  }

  private protectOuterHTML(): void {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
    if (!originalDescriptor) return;

    this.originalMethods.set('outerHTML_set', originalDescriptor.set);

    Object.defineProperty(Element.prototype, 'outerHTML', {
      get: originalDescriptor.get,
      set: (value: any) => {
        if (this.shouldBlock('outerHTML', value)) {
          this.reportViolation('outerHTML', value);
          return;
        }

        const safeValue = this.getSafeValue(value, 'HTML');
        originalDescriptor.set!.call(this, safeValue);
      },
      configurable: true,
    });
  }

  private protectInsertAdjacentHTML(): void {
    const original = Element.prototype.insertAdjacentHTML;
    this.originalMethods.set('insertAdjacentHTML', original);

    Element.prototype.insertAdjacentHTML = function (position: InsertPosition, text: string) {
      const protector = new DOMSinkProtector();

      if (protector.shouldBlock('insertAdjacentHTML', text)) {
        protector.reportViolation('insertAdjacentHTML', text);
        return;
      }

      const safeText = protector.getSafeValue(text, 'HTML') as string;
      return original.call(this, position, safeText);
    };
  }

  private protectDocumentWrite(): void {
    const originalWrite = document.write;
    const originalWriteln = document.writeln;

    this.originalMethods.set('document_write', originalWrite);
    this.originalMethods.set('document_writeln', originalWriteln);

    document.write = (text: string) => {
      if (this.shouldBlock('document.write', text)) {
        this.reportViolation('document.write', text);
        return;
      }

      const safeText = this.getSafeValue(text, 'HTML') as string;
      return originalWrite.call(document, safeText);
    };

    document.writeln = (text: string) => {
      if (this.shouldBlock('document.writeln', text)) {
        this.reportViolation('document.writeln', text);
        return;
      }

      const safeText = this.getSafeValue(text, 'HTML') as string;
      return originalWriteln.call(document, safeText);
    };
  }

  private protectEval(): void {
    const originalEval = window.eval;
    this.originalMethods.set('eval', originalEval);

    window.eval = (script: string) => {
      if (this.shouldBlock('eval', script)) {
        this.reportViolation('eval', script);
        throw new Error('eval() blocked by security policy');
      }

      const safeScript = this.getSafeValue(script, 'Script') as string;
      return originalEval.call(window, safeScript);
    };
  }

  private protectFunctionConstructor(): void {
    const OriginalFunction = window.Function;
    this.originalMethods.set('Function', OriginalFunction);

    window.Function = new Proxy(OriginalFunction, {
      construct: (target, args) => {
        const script = args[args.length - 1]; // Last argument is the function body

        if (this.shouldBlock('Function', script)) {
          this.reportViolation('Function', script);
          throw new Error('Function() constructor blocked by security policy');
        }

        const safeScript = this.getSafeValue(script, 'Script');
        const newArgs = [...args.slice(0, -1), safeScript];
        return new OriginalFunction(...newArgs);
      },
    });
  }

  private protectTimerFunctions(): void {
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;

    this.originalMethods.set('setTimeout', originalSetTimeout);
    this.originalMethods.set('setInterval', originalSetInterval);

    window.setTimeout = (handler: any, timeout?: number, ...args: any[]) => {
      if (typeof handler === 'string') {
        if (this.shouldBlock('setTimeout', handler)) {
          this.reportViolation('setTimeout', handler);
          throw new Error('setTimeout with string blocked by security policy');
        }

        const safeHandler = this.getSafeValue(handler, 'Script') as string;
        return originalSetTimeout.call(window, safeHandler, timeout, ...args);
      }

      return originalSetTimeout.call(window, handler, timeout, ...args);
    };

    window.setInterval = (handler: any, timeout?: number, ...args: any[]) => {
      if (typeof handler === 'string') {
        if (this.shouldBlock('setInterval', handler)) {
          this.reportViolation('setInterval', handler);
          throw new Error('setInterval with string blocked by security policy');
        }

        const safeHandler = this.getSafeValue(handler, 'Script') as string;
        return originalSetInterval.call(window, safeHandler, timeout, ...args);
      }

      return originalSetInterval.call(window, handler, timeout, ...args);
    };
  }

  private protectScriptProperties(): void {
    const scriptElements = ['script'];
    const properties = ['text', 'textContent', 'innerText', 'src'];

    scriptElements.forEach(tagName => {
      const ElementConstructor = window[
        (tagName.charAt(0).toUpperCase() + tagName.slice(1) + 'Element') as keyof Window
      ] as any;
      if (!ElementConstructor) return;

      properties.forEach(property => {
        const originalDescriptor = Object.getOwnPropertyDescriptor(
          ElementConstructor.prototype,
          property
        );
        if (!originalDescriptor) return;

        const requiresTrustedType = property === 'src' ? 'ScriptURL' : 'Script';

        Object.defineProperty(ElementConstructor.prototype, property, {
          get: originalDescriptor.get,
          set: (value: any) => {
            if (this.shouldBlock(`script.${property}`, value)) {
              this.reportViolation(`script.${property}`, value);
              return;
            }

            const safeValue = this.getSafeValue(
              value,
              requiresTrustedType as 'Script' | 'ScriptURL'
            );
            originalDescriptor.set!.call(this, safeValue);
          },
          configurable: true,
        });
      });
    });
  }

  private protectEventHandlers(): void {
    const eventHandlers = [
      'onclick',
      'onload',
      'onerror',
      'onmouseover',
      'onmouseout',
      'onfocus',
      'onblur',
      'onsubmit',
      'onchange',
      'onkeydown',
      'onkeyup',
      'onkeypress',
    ];

    eventHandlers.forEach(handler => {
      // Protect on HTMLElement
      const descriptor =
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, handler) ||
        Object.getOwnPropertyDescriptor(Element.prototype, handler);

      if (!descriptor) return;

      Object.defineProperty(HTMLElement.prototype, handler, {
        get: descriptor.get,
        set: (value: any) => {
          if (typeof value === 'string') {
            if (this.shouldBlock(handler, value)) {
              this.reportViolation(handler, value);
              return;
            }

            const safeValue = this.getSafeValue(value, 'Script') as string;
            descriptor.set!.call(this, safeValue);
          } else {
            descriptor.set!.call(this, value);
          }
        },
        configurable: true,
      });
    });
  }

  private shouldBlock(sinkName: string, value: any): boolean {
    // Allow trusted types
    if (typeof window !== 'undefined' && window.trustedTypes) {
      if (
        sinkName.includes('innerHTML') ||
        sinkName.includes('outerHTML') ||
        sinkName.includes('insertAdjacentHTML') ||
        sinkName.includes('write')
      ) {
        return !window.trustedTypes.isHTML(value);
      }

      if (
        sinkName.includes('eval') ||
        sinkName.includes('Function') ||
        sinkName.includes('setTimeout') ||
        sinkName.includes('setInterval') ||
        sinkName.startsWith('on') ||
        sinkName.includes('text')
      ) {
        return !window.trustedTypes.isScript(value);
      }

      if (sinkName.includes('src') && sinkName.includes('script')) {
        return !window.trustedTypes.isScriptURL(value);
      }
    }

    // Fallback checks when Trusted Types not supported
    if (typeof value !== 'string') return false;

    // Block obvious XSS patterns
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  private getSafeValue(value: any, type: 'HTML' | 'Script' | 'ScriptURL'): any {
    if (typeof value !== 'string') return value;

    switch (type) {
      case 'HTML':
        return trustedTypesManager.createSafeHTML(value);
      case 'Script':
        return trustedTypesManager.createSafeScript(value);
      case 'ScriptURL':
        return trustedTypesManager.createSafeScriptURL(value);
      default:
        return value;
    }
  }

  private reportViolation(sinkName: string, value: any): void {
    this.violationCount++;

    console.error(`DOM sink violation blocked: ${sinkName}`, {
      value: typeof value === 'string' ? value.substring(0, 100) : value,
      timestamp: new Date().toISOString(),
    });

    // Report to security monitoring
    if (typeof fetch !== 'undefined') {
      fetch('/api/security/dom-violation-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'dom-sink-violation',
          sinkName,
          value: typeof value === 'string' ? value.substring(0, 500) : String(value),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {}); // Ignore reporting errors
    }
  }

  getViolationCount(): number {
    return this.violationCount;
  }

  isProtectionActive(): boolean {
    return this.isInitialized;
  }

  // Method to restore original methods (for testing)
  restore(): void {
    // Implementation to restore original methods would go here
    // This is complex and mainly needed for testing
    console.warn('DOM sink protection restore not implemented');
  }
}

// Global DOM sink protector
export const domSinkProtector = new DOMSinkProtector();
