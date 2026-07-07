import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleRegistry } from './assemble.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, 'sources.json');
const registry = assembleRegistry();
writeFileSync(out, JSON.stringify(registry, null, 2));
console.log(`Exported ${registry.sources.length} sources across ${registry.verticals.length} verticals → ${out}`);
