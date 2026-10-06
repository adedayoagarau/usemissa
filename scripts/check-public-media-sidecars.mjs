/**
 * Keep media provenance sidecars out of the web app's public directory.
 *
 * Image tools write a `<file>.json` record beside each asset (prompt, origin,
 * license, sometimes a local source path). Next.js serves everything under
 * `apps/web/public`, so a sidecar left there is published at `<asset>.json`.
 * The records live in `apps/web/media-provenance` instead, at the same path
 * as the asset they describe:
 *
 *   apps/web/public/media/home/hero.webp
 *   apps/web/media-provenance/media/home/hero.webp.json
 *
 * Run: node scripts/check-public-media-sidecars.mjs
 */
import path from "node:path";
import { promises as fs } from "node:fs";

const webRoot = path.resolve(import.meta.dirname, "../apps/web");
const publicRoot = path.join(webRoot, "public");
const provenanceRoot = path.join(webRoot, "media-provenance");

const mediaExtension = /\.(?:png|jpe?g|webp|avif|gif|svg|mp4|webm|mov)$/i;

async function walk(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else files.push(entryPath);
  }
  return files;
}

const relative = (file) => path.relative(process.cwd(), file);

const publicFiles = await walk(publicRoot);
const publicSet = new Set(publicFiles);
const violations = [];

for (const file of publicFiles) {
  if (!file.endsWith(".json")) continue;
  const asset = file.slice(0, -".json".length);
  if (!mediaExtension.test(asset) && !publicSet.has(asset)) continue;
  const destination = path.join(
    provenanceRoot,
    path.relative(publicRoot, file),
  );
  violations.push(
    `${relative(file)} is served publicly; move it to ${relative(destination)}`,
  );
}

for (const file of await walk(provenanceRoot)) {
  if (!file.endsWith(".json")) continue;
  const asset = path.join(
    publicRoot,
    path.relative(provenanceRoot, file).slice(0, -".json".length),
  );
  if (!publicSet.has(asset)) {
    violations.push(
      `${relative(file)} describes ${relative(asset)}, which does not exist`,
    );
  }
}

if (violations.length > 0) {
  console.error("Media provenance check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Media provenance check passed.");
}
