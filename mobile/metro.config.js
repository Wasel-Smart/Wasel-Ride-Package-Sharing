const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable symlinks for monorepo support
config.resolver.unstable_enableSymlinks = true;

// Add support for additional file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Optimize bundle size
config.transformer.minifierConfig = {
  compress: {
    drop_console: process.env.NODE_ENV === 'production',
  },
};

// Enable faster refresh
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add custom middleware if needed
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
