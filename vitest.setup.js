// vitest.setup.js
// Provides a proper in-memory localStorage for Node 25+ environments
// where the built-in localStorage stub lacks .clear() and other methods.

if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index) => [...store.keys()][index] ?? null,
  };
}
