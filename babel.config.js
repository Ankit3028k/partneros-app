module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@partneros/core': './packages/core/src',
          '@partneros/shared': './packages/shared/src',
          '@partneros/knowledge': './packages/knowledge/src',
          '@partneros/memory': './packages/memory/src',
          '@partneros/intent': './packages/intent/src',
          '@partneros/llm': './packages/llm/src',
          '@partneros/app': './packages/app/src',
          '@partneros/planner': './packages/planner/src',
          '@partneros/device': './packages/device/src',
          '@partneros/wakeword': './packages/wakeword/src',
        },
      },
    ],
  ],
};
