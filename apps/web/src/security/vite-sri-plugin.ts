import { Plugin } from 'vite';
import { join, extname, basename } from 'path';
import { SRIHashGenerator, SRIResource } from './sri-hash-generator';

export interface SRIPluginOptions {
  algorithms?: Array<'sha256' | 'sha384' | 'sha512'>;
  include?: string[];
  exclude?: string[];
  manifestPath?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

// Simple minimatch implementation for pattern matching
function minimatch(str: string, pattern: string): boolean {
  if (pattern.includes('**')) {
    const [prefix, suffix] = pattern.split('**');
    return str.startsWith(prefix.replace(/\*/g, '')) && str.endsWith(suffix.replace(/\*/g, ''));
  }

  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(str);
  }

  return str === pattern;
}

// Helper function for pattern matching
function shouldIncludeFile(
  fileName: string,
  ext: string,
  include: string[],
  exclude: string[]
): boolean {
  // Check exclude patterns first
  for (const pattern of exclude) {
    if (minimatch(fileName, pattern)) {
      return false;
    }
  }

  // Check include patterns
  for (const pattern of include) {
    if (minimatch(fileName, pattern)) {
      return true;
    }
  }

  // Default inclusion for common web assets
  const includedExtensions = ['.js', '.css', '.mjs'];
  return includedExtensions.includes(ext);
}

export function createSRIPlugin(options: SRIPluginOptions = {}): Plugin {
  const {
    algorithms = ['sha384'],
    include = ['**/*.js', '**/*.css'],
    exclude = [],
    crossOrigin = 'anonymous',
  } = options;

  let sriGenerator: SRIHashGenerator;
  let buildOutputDir: string;
  const generatedHashes = new Map<string, string>();

  return {
    name: 'vite-sri-plugin',
    apply: 'build',

    configResolved(config) {
      buildOutputDir = config.build.outDir;
      sriGenerator = new SRIHashGenerator(buildOutputDir);
    },

    generateBundle(options, bundle) {
      // Store the bundle for later use in writeBundle
      (this as any)._bundle = bundle;
    },

    async writeBundle() {
      const bundle = (this as any)._bundle;
      if (!bundle) {
        return;
      }

      try {
        const resources: SRIResource[] = [];

        // Process all output files and generate hashes from their content
        for (const [fileName, chunk] of Object.entries(bundle)) {
          const bundleChunk = chunk as any;
          if (bundleChunk.type === 'chunk' || bundleChunk.type === 'asset') {
            const ext = extname(fileName);

            // Check if file should be included
            if (!shouldIncludeFile(fileName, ext, include, exclude)) {
              continue;
            }

            const publicPath = `/${fileName}`;
            const algorithm = algorithms[0];

            // Get content from the bundle
            let content: string | Buffer;
            if (bundleChunk.type === 'chunk') {
              content = bundleChunk.code;
            } else {
              content =
                bundleChunk.source instanceof Uint8Array
                  ? Buffer.from(bundleChunk.source)
                  : bundleChunk.source;
            }

            // Generate hash from content directly
            const hash = await sriGenerator.generateHash(content, algorithm);

            resources.push({
              url: publicPath,
              hash,
              algorithm,
              crossorigin: crossOrigin,
            });
          }
        }

        // Create manifest
        const manifest: import('./sri-hash-generator').SRIManifest = {
          version: '1.0',
          buildTimestamp: new Date().toISOString(),
          resources,
        };

        // Save manifest to build output
        await sriGenerator.saveManifest(manifest);

        // Store hashes for HTML transformation
        manifest.resources.forEach(resource => {
          generatedHashes.set(resource.url, resource.hash!);
        });

        console.log(`✓ Generated SRI manifest with ${manifest.resources.length} resources`);

        // Log resources for debugging
        manifest.resources.forEach(resource => {
          console.log(`  ${resource.url} -> ${resource.hash}`);
        });
      } catch (error) {
        console.error('Failed to generate SRI manifest:', error);
        throw error;
      }
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        // Only transform if we have a bundle context and generated hashes
        if (!context?.bundle || generatedHashes.size === 0) {
          return html;
        }

        try {
          // Add SRI attributes to script and link tags
          html = html.replace(
            /<script\s+([^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*)>/gi,
            (match, attributes, src) => {
              const hash = generatedHashes.get(src);
              if (hash && !attributes.includes('integrity=')) {
                const crossOriginAttr = crossOrigin ? ` crossorigin="${crossOrigin}"` : '';
                return `<script ${attributes} integrity="${hash}"${crossOriginAttr}>`;
              }
              return match;
            }
          );

          html = html.replace(
            /<link\s+([^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']stylesheet["'][^>]*)>/gi,
            (match, attributes, href) => {
              const hash = generatedHashes.get(href);
              if (hash && !attributes.includes('integrity=')) {
                const crossOriginAttr = crossOrigin ? ` crossorigin="${crossOrigin}"` : '';
                return `<link ${attributes} integrity="${hash}"${crossOriginAttr}>`;
              }
              return match;
            }
          );
        } catch (error) {
          console.warn('SRI plugin: Error during HTML transformation:', error);
        }

        return html;
      },
    },
  };
}

// Helper to create SRI attributes for manual use
export function createSRIAttributes(
  hash: string,
  crossOrigin: 'anonymous' | 'use-credentials' = 'anonymous'
): Record<string, string> {
  return {
    integrity: hash,
    crossorigin: crossOrigin,
  };
}
