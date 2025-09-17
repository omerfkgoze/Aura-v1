const { getDefaultConfig } = require('expo/metro-config');
const { withNxMetro } = require('@nx/expo');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = withNxMetro(defaultConfig, {
  // Change this to true in case you want to use Nx task graph
  debug: false,
  extensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
});
