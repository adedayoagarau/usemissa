// Resolves framework-only modules to inert stand-ins so the web unit suite can
// run under plain Node without the Next.js server runtime. Everything else is
// forwarded to the normal loader chain (including tsx's TypeScript loader).
const STUBS = new Map([
  ["server-only", "stubs/server-only.mjs"],
  ["next/headers", "stubs/next-headers.mjs"],
]);

export async function resolve(specifier, context, nextResolve) {
  const stub = STUBS.get(specifier);
  if (stub) {
    return {
      shortCircuit: true,
      url: new URL(`./${stub}`, import.meta.url).href,
    };
  }
  return nextResolve(specifier, context);
}
