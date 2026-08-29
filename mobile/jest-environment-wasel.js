const localStorageData = new Map();

const localStorageMock = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
  clear: () => localStorageData.clear(),
  get length() { return localStorageData.size; },
  key: (index) => Array.from(localStorageData.keys())[index] ?? null,
};

// Node.js v25 exposes localStorage/sessionStorage as lazy getters on globalThis.
// Remove them before jest-environment-node loads so its nodeGlobals list
// does not include them, then restore our safe mocks afterward.
const hadLocalStorage = Object.hasOwn(globalThis, 'localStorage');
const hadSessionStorage = Object.hasOwn(globalThis, 'sessionStorage');
const originalLocalStorage = hadLocalStorage ? globalThis.localStorage : undefined;
const originalSessionStorage = hadSessionStorage ? globalThis.sessionStorage : undefined;

try {
  if (hadLocalStorage) delete globalThis.localStorage;
  if (hadSessionStorage) delete globalThis.sessionStorage;
} catch {
  // ignore
}

const { TestEnvironment: NodeEnvironment } = require('jest-environment-node');

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  enumerable: true,
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  enumerable: true,
  value: localStorageMock,
  writable: true,
});

class WaselTestEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    this.global.localStorage = globalThis.localStorage;
    this.global.sessionStorage = globalThis.sessionStorage;
  }

  async teardown() {
    delete this.global.localStorage;
    delete this.global.sessionStorage;
    localStorageData.clear();
    await super.teardown();
  }
}

module.exports = { TestEnvironment: WaselTestEnvironment, default: WaselTestEnvironment };
