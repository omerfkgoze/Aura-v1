const { getDefaultConfig } = require('expo/metro-config');
const { withNxMetro } = require('@nx/expo');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Define the monorepo root and workspace packages
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Configure for monorepo structure
defaultConfig.watchFolders = [workspaceRoot];
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Configure shared packages resolution
defaultConfig.resolver.alias = {
  '@aura/shared-types': path.resolve(workspaceRoot, 'libs/shared-types/src'),
  '@aura/crypto-core': path.resolve(workspaceRoot, 'libs/crypto-core/src'),
  '@aura/ui': path.resolve(workspaceRoot, 'libs/ui/src'),
  '@aura/utils': path.resolve(workspaceRoot, 'libs/utils/src'),
};

// Enable haste for better performance with monorepo
defaultConfig.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = withNxMetro(defaultConfig, {
  debug: false,
  extensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
});
