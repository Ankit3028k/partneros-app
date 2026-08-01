module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-mmkv|react-native-safe-area-context|@react-native/new-app-screen)/)',
  ],
  moduleNameMapper: {
    '^@partneros/core$': '<rootDir>/packages/core/src',
    '^@partneros/shared$': '<rootDir>/packages/shared/src',
    '^@partneros/knowledge$': '<rootDir>/packages/knowledge/src',
    '^@partneros/memory$': '<rootDir>/packages/memory/src',
    '^@partneros/intent$': '<rootDir>/packages/intent/src',
    '^@partneros/llm$': '<rootDir>/packages/llm/src',
    '^@partneros/app$': '<rootDir>/packages/app/src',
  },
};
