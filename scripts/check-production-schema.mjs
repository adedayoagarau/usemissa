// Read-only check of which hand-applied migrations a database is missing.
//
// Migrations 0043 onwards are applied by hand with psql and nothing in the
// database records which ran. This script reads each migration file, lists
// the tables, columns, indexes and constraints it creates, and checks whether each exists.
// It opens a READ ONLY transaction and never changes the database.
//
//   DATABASE_URL=... node scripts/check-production-schema.mjs [--from=0043]
//   railway run --service creator-worker node scripts/check-production-schema.mjs
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

const from = process.argv.find((arg) => arg.startsWith('--from='))?.slice(7) ?? '0043';
const migrationsRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'db', 'migrations');
const files = (await readdir(migrationsRoot)).filter((name) => /^\d{4}_.*\.sql$/.test(name) && name >= from).sort();

const bare = (name) => name.replace(/"/g, '').replace(/^public\./i, '').toLowerCase();

function objectsIn(sql) {
  const text = sql.replace(/--[^\n]*/g, '').replace(/\$\$[\s\S]*?\$\$/g, '');
  const tables = new Set();
  const columns = [];
  const indexes = new Set();
  const constraints = new Set();
  for (const match of text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)) tables.add(bare(match[1]));
  for (const statement of text.split(';')) {
    const alter = statement.match(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)/i);
    if (!alter) continue;
    for (const add of statement.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?("?\w+"?)/gi))
      columns.push({ table: bare(alter[1]), column: bare(add[1]) });
  }
  for (const match of text.matchAll(/create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?("?\w+"?)/gi)) indexes.add(bare(match[1]));
  for (const match of text.matchAll(/add\s+constraint\s+("?\w+"?)/gi)) constraints.add(bare(match[1]));
  return { tables: [...tables], columns, indexes: [...indexes], constraints: [...constraints] };
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const tableRows = await client.query(`select table_name from information_schema.tables where table_schema = 'public'`);
  const columnRows = await client.query(`select table_name, column_name from information_schema.columns where table_schema = 'public'`);
  const indexRows = await client.query(`select indexname from pg_indexes where schemaname = 'public'`);
  const constraintRows = await client.query(`select conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'`);
  await client.query('ROLLBACK');

  const haveTable = new Set(tableRows.rows.map((row) => row.table_name));
  const haveColumn = new Set(columnRows.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const haveIndex = new Set(indexRows.rows.map((row) => row.indexname));
  const haveConstraint = new Set(constraintRows.rows.map((row) => row.conname));

  const report = [];
  for (const file of files) {
    const { tables, columns, indexes, constraints } = objectsIn(await readFile(join(migrationsRoot, file), 'utf8'));
    const missing = [
      ...tables.filter((table) => !haveTable.has(table)).map((table) => `table ${table}`),
      ...columns.filter(({ table, column }) => !haveColumn.has(`${table}.${column}`)).map(({ table, column }) => `column ${table}.${column}`),
      ...indexes.filter((index) => !haveIndex.has(index)).map((index) => `index ${index}`),
      ...constraints.filter((name) => !haveConstraint.has(name)).map((name) => `constraint ${name}`),
    ];
    const checked = tables.length + columns.length + indexes.length + constraints.length;
    const status = checked === 0 ? 'unchecked' : missing.length === 0 ? 'applied' : missing.length === checked ? 'missing' : 'partial';
    report.push({ file, status, checked, missing });
  }

  for (const { file, status, checked, missing } of report) {
    console.log(`${status.padEnd(9)} ${file}${status === 'unchecked' ? ' (nothing it creates can be checked by name; read it by hand)' : ` (${checked - missing.length}/${checked})`}`);
    for (const item of missing) console.log(`            missing ${item}`);
  }
  const needed = report.filter((entry) => entry.status === 'missing' || entry.status === 'partial').map((entry) => entry.file);
  console.log(`\n${needed.length} migration(s) to apply, in this order:`);
  for (const file of needed) console.log(`  ${file}`);
} finally {
  await client.end();
}
