// Minimal stand-ins for the subset of `next/headers` that route handlers and
// the libraries under test reach. Both return synchronous values (matching
// Next's sync API) so `await cookies()` and plain `cookies()` work alike.

class ReadonlyRequestCookies {
  constructor(store = new Map()) {
    this._store = store;
  }
  get(name) {
    return this._store.get(name);
  }
  getAll() {
    return [...this._store.values()];
  }
  has(name) {
    return this._store.has(name);
  }
  set(name, value) {
    this._store.set(name, value);
  }
  delete(name) {
    this._store.delete(name);
  }
  clear() {
    this._store.clear();
  }
  toString() {
    return "";
  }
  [Symbol.iterator]() {
    return this._store.entries();
  }
}

const cookieStore = new ReadonlyRequestCookies();

export function cookies() {
  return cookieStore;
}

export function headers() {
  return new Headers();
}

export function draftMode() {
  return {
    isEnabled: false,
    enable() {},
    disable() {},
  };
}
