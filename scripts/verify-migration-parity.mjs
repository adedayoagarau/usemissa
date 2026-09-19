import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const migrationsRoot = join(repoRoot, 'packages', 'db', 'migrations');
const applyScriptPath = join(repoRoot, 'scripts', 'apply-target-schema.mjs');

// `apply-target-schema.mjs` is the single source of truth for the clean
// target-schema order. A migration omitted there will be silently absent from
// CI-provisioned and fresh databases even though production has it, so this
// check keeps disk files and the ordered list in exact parity.
const SUPERSEDED = new Set([
  // `0011_taxonomy_graph` duplicates `0003_canonical_taxonomy`; the live
  // history keeps only the canonical copy.
  '0011_taxonomy_graph',
]);

const applySource = await readFile(applyScriptPath, 'utf8');
const ordered = [...applySource.matchAll(/'(\d{4}_[a-z0-9_]+)\.sql'/g)].map(
  (match) => match[1],
);
const orderedSet = new Set(ordered);

if (ordered.length !== orderedSet.size) {
  throw new Error(
    'apply-target-schema.mjs lists a migration more than once; order must be unambiguous.',
  );
}

const diskFiles = (await readdir(migrationsRoot))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => name.replace(/\.sql$/, ''));

const missingFromOrder = diskFiles.filter(
  (file) => !orderedSet.has(file) && !SUPERSEDED.has(file),
);
if (missingFromOrder.length) {
  throw new Error(
    `Migrations on disk are missing from apply-target-schema.mjs: ${missingFromOrder.join(', ')}. ` +
      'Add them in dependency order (or add to the SUPERSEDED set if intentionally excluded).',
  );
}

const missingFromDisk = ordered.filter(
  (file) => !diskFiles.includes(file),
);
if (missingFromDisk.length) {
  throw new Error(
    `apply-target-schema.mjs references migrations that do not exist on disk: ${missingFromDisk.join(', ')}.`,
  );
}

console.log(
  JSON.stringify({
    ordered: ordered.length,
    onDisk: diskFiles.length,
    superseded: [...SUPERSEDED],
  }),
);
