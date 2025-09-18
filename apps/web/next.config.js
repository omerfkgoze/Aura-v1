/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic Next.js configuration
  reactStrictMode: true,
  poweredByHeader: false,

  // =============================================================================
  // MONOREPO CONFIGURATION - FIXED FOR DEVELOPMENT
  // =============================================================================

  // ✅ FIXED: Correct package names for transpilation
  transpilePackages: ['@aura/shared-types', '@aura/utils', '@aura/crypto-core', '@aura/ui'],

  // Images configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['localhost'], // Add your image domains as needed
  },

  // Enable TypeScript checking in development
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable ESLint in development
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Simplified webpack configuration
  webpack: (
    config
    //  { isServer }
  ) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Add WASM rule
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  },
};

module.exports = nextConfig;
