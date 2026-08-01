jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      getString: (key) => store.get(key) ?? null,
      set: (key, value) => store.set(key, value),
      clearAll: () => store.clear(),
      getAllKeys: () => Array.from(store.keys()),
      delete: (key) => store.delete(key),
    }),
  };
});

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => Promise.resolve({
    executeSql: jest.fn(() => Promise.resolve([{ rows: { length: 0, item: () => null, raw: () => [] } }])),
    transaction: jest.fn(),
  })),
}));

jest.mock('@react-native/new-app-screen', () => ({
  NewAppScreen: 'NewAppScreen',
}));
