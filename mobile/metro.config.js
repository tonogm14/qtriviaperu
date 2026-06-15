const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-worklets 0.5.1 has its `react-native` package.json field
// pointing to TypeScript source (./src/index). Metro can't transform TS in
// node_modules, so we intercept the resolution and redirect to the compiled
// JS in lib/module — which Expo Go 54 already has as its native binary.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-worklets') {
    return {
      filePath: path.join(
        __dirname,
        'node_modules/react-native-worklets/lib/module/index.js'
      ),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
