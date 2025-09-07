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
      const resources: Omit<SRIResource, 'hash'>[] = [];

      // Process all output files
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' || chunk.type === 'asset') {
          const ext = extname(fileName);

          // Check if file should be included
          if (!this.shouldIncludeFile(fileName, ext, include, exclude)) {
            continue;
          }

          const publicPath = `/${fileName}`;
          const filePath = join(buildOutputDir, fileName);

          // Use the primary algorithm for hash generation
          const algorithm = algorithms[0];

          resources.push({
            url: publicPath,
            filePath,
            algorithm,
            crossorigin: crossOrigin,
          });
        }
      }

      // Store resources for writeBundle hook
      (this as any)._sriResources = resources;
    },

    async writeBundle() {
      const resources = (this as any)._sriResources as Omit<SRIResource, 'hash'>[];
      if (!resources || resources.length === 0) {
        return;
      }

      try {
        // Generate manifest with hashes
        const manifest = await sriGenerator.generateManifest(resources);

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
      enforce: 'post',
      transform(html, context) {
        if (context.bundle) {
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
        }
        return html;
      },
    },
  };

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
