// No-op stand-in for the `server-only` package. That package throws on import
// outside the Next.js server runtime; unit tests run in plain Node and only
// need the module boundary to resolve without error.
export {};
