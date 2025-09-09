/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js configuration
  reactStrictMode: true,
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Build output configuration
  distDir: '../../dist/apps/web',

  // Skip TypeScript build-time type checking (we do it separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable typed routes validation
  typedRoutes: false,

  // Skip pre-rendering error pages to avoid Html import issue
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    gzipSize: true,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Ignore specific modules for client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Exclude problematic SRI plugin from build
    config.resolve.alias = {
      ...config.resolve.alias,
      './src/security/vite-sri-plugin': false,
    };

    return config;
  },
};

module.exports = nextConfig;
