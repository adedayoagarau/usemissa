import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (process.env.MISSA_TAXONOMY_REHEARSAL !== '1') {
  throw new Error('Refusing taxonomy rehearsal. Set MISSA_TAXONOMY_REHEARSAL=1 only for a disposable Neon branch/database.');
}

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const before = await client.query(`
    select
      to_regclass('public.taxonomy_terms') as taxonomy_terms,
      to_regclass('public.opportunity_taxonomy_terms') as opportunity_taxonomy_terms,
      to_regclass('public.source_coverage_cells') as source_coverage_cells,
      (select count(*)::int from opportunities) as opportunities
  `);
  const state = before.rows[0];
  if (state.taxonomy_terms || state.opportunity_taxonomy_terms || state.source_coverage_cells) {
    console.log(JSON.stringify({ status: 'already-present', ...state }));
    await client.end();
    process.exit(0);
  }
  const migrationPath = fileURLToPath(new URL('../migrations/0011_taxonomy_graph.sql', import.meta.url));
  const migration = await fs.readFile(migrationPath, 'utf8');
  await client.query('begin');
  await client.query(migration);
  await client.query('commit');
  const after = await client.query(`
    select
      to_regclass('public.taxonomy_terms') as taxonomy_terms,
      to_regclass('public.opportunity_taxonomy_terms') as opportunity_taxonomy_terms,
      to_regclass('public.source_coverage_cells') as source_coverage_cells,
      (select count(*)::int from opportunities) as opportunities
  `);
  console.log(JSON.stringify({ status: 'applied-to-rehearsal-database', before: state, after: after.rows[0] }));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
