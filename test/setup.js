// Test environment bootstrap for headless Node.js testing

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 256,
          height: 256,
          getContext(type) {
            return {
              createRadialGradient: () => ({ addColorStop: () => {} }),
              fillStyle: '',
              strokeStyle: '',
              lineWidth: 1,
              beginPath: () => {},
              closePath: () => {},
              arc: () => {},
              ellipse: () => {},
              fill: () => {},
              stroke: () => {},
              fillRect: () => {},
              clearRect: () => {},
              measureText: () => ({ width: 10 }),
              fillText: () => {},
              drawImage: () => {}
            };
          }
        };
      }
      return {};
    }
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear()
  };
}
