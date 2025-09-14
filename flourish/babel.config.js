    module.exports = function(api) {
      api.cache(true);
      return {
        presets: ['babel-preset-expo'],
        plugins: [
          // Required for Reanimated (if you use it)
          'react-native-reanimated/plugin',
          // This is the key plugin for react-native-vector-icons web support
          [
            'module-resolver',
            {
              alias: {
                // This alias ensures that react-native-vector-icons uses the web-compatible version
                // which is provided by @expo/vector-icons.
                'react-native-vector-icons': '@expo/vector-icons',
              },
              extensions: [
                '.js',
                '.jsx',
                '.ts',
                '.tsx',
                '.json',
                '.wasm',
                '.ios.js',
                '.android.js',
                '.web.js', // Crucial for web resolution
              ],
            },
          ],
          // Ensure this is present for React 18/19 if not already handled by preset-expo
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], 
        ],
      };
    };
    