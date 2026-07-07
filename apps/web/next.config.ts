import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This is an npm-workspaces monorepo (root package-lock.json), not a
  // standalone app -- tell Next.js where the real project root is so it
  // doesn't warn about / mis-trace the "additional lockfile" at ../../..
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
};

export default nextConfig;
