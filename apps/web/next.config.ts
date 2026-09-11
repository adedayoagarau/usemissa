import path from "node:path";
import type { NextConfig } from "next";

const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production";
const previewHosts = (process.env.MISSA_DEV_PREVIEW_HOST ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === 'production'
  : process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  experimental: {
    // Optional local-only override for slow external-drive cache compaction.
    turbopackFileSystemCacheForDev: process.env.MISSA_DEV_DISABLE_DISK_CACHE !== "1",
  },
  // This is an npm-workspaces monorepo (root package-lock.json), not a
  // standalone app -- tell Next.js where the real project root is so it
  // doesn't warn about / mis-trace the "additional lockfile" at ../../..
  outputFileTracingRoot: path.join(/* turbopackIgnore: true */ import.meta.dirname, "../../"),
  allowedDevOrigins: ["127.0.0.1", "10.0.0.119", ...previewHosts],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
