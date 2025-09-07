import React, { useEffect, useRef, useState } from 'react';
import { useTrustedTypes } from '../../middleware/trusted-types';
import { clientSRIVerifier } from '../../security/sri-hash-generator';

export interface SafeScriptProps {
  src?: string;
  code?: string;
  nonce?: string;
  defer?: boolean;
  async?: boolean;
  type?: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallbackSrc?: string[];
  requireSRI?: boolean;
}

export const SafeScript: React.FC<SafeScriptProps> = ({
  src,
  code,
  nonce,
  defer = false,
  async = false,
  type = 'text/javascript',
  integrity,
  crossOrigin = 'anonymous',
  onLoad,
  onError,
  fallbackSrc = [],
  requireSRI = true,
}) => {
  const { createSafeScript, createSafeScriptURL, isConfigured } = useTrustedTypes();
  const [loadError, setLoadError] = useState<string | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    const loadScript = async () => {
      try {
        script = document.createElement('script');

        // Set basic attributes
        script.type = type;
        if (defer) script.defer = true;
        if (async) script.async = true;
        if (nonce) script.nonce = nonce;
        if (crossOrigin) script.crossOrigin = crossOrigin;

        // Handle inline script
        if (code) {
          const safeCode = createSafeScript(code);
          if (isConfigured()) {
            script.textContent = safeCode as any;
          } else {
            script.textContent = safeCode as string;
          }
        }

        // Handle external script
        if (src) {
          // Check if SRI hash is available and required
          let finalIntegrity = integrity;
          if (!finalIntegrity && requireSRI) {
            finalIntegrity = clientSRIVerifier.getExpectedHash(src);
            if (!finalIntegrity) {
              throw new Error(`SRI hash required but not found for: ${src}`);
            }
          }

          if (finalIntegrity) {
            script.integrity = finalIntegrity;
          }

          const safeSrc = createSafeScriptURL(src);
          script.src = safeSrc as string;
        }

        // Set up event handlers
        script.onload = () => {
          if (mountedRef.current) {
            setLoadError(null);
            onLoad?.();
          }
        };

        script.onerror = event => {
          if (!mountedRef.current) return;

          const error = new Error(`Script load failed: ${src || 'inline script'}`);
          setLoadError(error.message);

          // Try fallback URLs if available
          if (src && fallbackSrc.length > 0) {
            tryFallback(script, fallbackSrc, 0);
            return;
          }

          onError?.(error);
        };

        // Add to DOM
        scriptRef.current = script;
        document.head.appendChild(script);
      } catch (error) {
        if (mountedRef.current) {
          const err = error as Error;
          setLoadError(err.message);
          onError?.(err);
        }
      }
    };

    const tryFallback = (failedScript: HTMLScriptElement, fallbacks: string[], index: number) => {
      if (index >= fallbacks.length) {
        const error = new Error('All fallback scripts failed to load');
        setLoadError(error.message);
        onError?.(error);
        return;
      }

      const fallbackUrl = fallbacks[index];
      console.warn(`Trying fallback script: ${fallbackUrl}`);

      // Remove failed script
      if (failedScript.parentNode) {
        failedScript.parentNode.removeChild(failedScript);
      }

      // Create new script with fallback URL
      const fallbackScript = document.createElement('script');
      fallbackScript.type = type;
      if (defer) fallbackScript.defer = true;
      if (async) fallbackScript.async = true;
      if (nonce) fallbackScript.nonce = nonce;
      if (crossOrigin) fallbackScript.crossOrigin = crossOrigin;

      // Try to get SRI hash for fallback
      const fallbackIntegrity = clientSRIVerifier.getExpectedHash(fallbackUrl);
      if (fallbackIntegrity) {
        fallbackScript.integrity = fallbackIntegrity;
      }

      fallbackScript.onload = () => {
        if (mountedRef.current) {
          setLoadError(null);
          onLoad?.();
        }
      };

      fallbackScript.onerror = () => {
        if (mountedRef.current) {
          tryFallback(fallbackScript, fallbacks, index + 1);
        }
      };

      const safeFallbackSrc = createSafeScriptURL(fallbackUrl);
      fallbackScript.src = safeFallbackSrc as string;

      scriptRef.current = fallbackScript;
      document.head.appendChild(fallbackScript);
    };

    loadScript();

    // Cleanup
    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [
    src,
    code,
    nonce,
    defer,
    async,
    type,
    integrity,
    crossOrigin,
    requireSRI,
    createSafeScript,
    createSafeScriptURL,
    isConfigured,
    onLoad,
    onError,
    fallbackSrc,
  ]);

  // Render error state if needed
  if (loadError && process.env.NODE_ENV === 'development') {
    return (
      <div
        style={{
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          margin: '10px 0',
          fontSize: '12px',
          color: '#a00',
        }}
      >
        <strong>Script Load Error:</strong> {loadError}
        {src && (
          <div>
            <strong>URL:</strong> {src}
          </div>
        )}
        {fallbackSrc.length > 0 && (
          <div>
            <strong>Fallbacks:</strong> {fallbackSrc.join(', ')}
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Hook for safe script loading
export function useSafeScript() {
  const { createSafeScript, createSafeScriptURL, isConfigured } = useTrustedTypes();

  const loadScript = (options: Omit<SafeScriptProps, 'onLoad' | 'onError'>) => {
    return new Promise<HTMLScriptElement>((resolve, reject) => {
      const script = document.createElement('script');

      try {
        // Configure script element
        script.type = options.type || 'text/javascript';
        if (options.defer) script.defer = true;
        if (options.async) script.async = true;
        if (options.nonce) script.nonce = options.nonce;
        if (options.crossOrigin) script.crossOrigin = options.crossOrigin;
        if (options.integrity) script.integrity = options.integrity;

        if (options.code) {
          const safeCode = createSafeScript(options.code);
          script.textContent = safeCode as string;
        }

        if (options.src) {
          const safeSrc = createSafeScriptURL(options.src);
          script.src = safeSrc as string;
        }

        script.onload = () => resolve(script);
        script.onerror = () =>
          reject(new Error(`Failed to load script: ${options.src || 'inline'}`));

        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  };

  return {
    loadScript,
    createSafeScript,
    createSafeScriptURL,
    isSecure: isConfigured(),
  };
}

export default SafeScript;
