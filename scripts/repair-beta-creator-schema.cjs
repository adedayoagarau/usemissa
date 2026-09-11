/* Explicit, one-time beta repair. Never runs as part of the normal app build. */
const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
if (process.env.MISSA_BETA_SCHEMA_REPAIR !== '1') throw new Error('Explicit beta schema repair flag required');
if (!process.env.DATABASE_URL) throw new Error('Configured database required');
const root = path.resolve(__dirname, '..');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('missa-beta-creator-schema-repair'))");
    const read = (name) => fs.readFileSync(path.join(root, 'packages/db/migrations', name), 'utf8');
    const exists = async (name) => Boolean((await client.query('SELECT to_regclass($1) AS relation', ['public.' + name])).rows[0].relation);
    const run = async (name, sql) => {
      await client.query(sql);
      console.log(JSON.stringify({ applied: name, sha256: createHash('sha256').update(sql).digest('hex') }));
    };
    const creator = read('0031_creator_relational_authority.sql');
    const newTables = [...creator.matchAll(/CREATE TABLE "([^"]+)"/g)].map(m => m[1]);
    const present = [];
    for (const name of newTables) if (await exists(name)) present.push(name);
    console.log(JSON.stringify({ creatorTablesPresent: present.length, creatorTablesExpected: newTables.length }));
    if (present.length && present.length !== newTables.length) throw new Error('Partial creator schema requires manual reconciliation');
    const workspace = read('0030_workspace_relational_authority.sql');
    await run('0030 command receipt and audit dependency', workspace.slice(workspace.indexOf('CREATE TABLE IF NOT EXISTS "workspace_command_receipts"'), workspace.indexOf('CREATE INDEX IF NOT EXISTS "programs_tenant_traversal_idx"')));
    if (!present.length) await run('0031_creator_relational_authority.sql', creator);
    await run('0042_creator_product_states.sql', read('0042_creator_product_states.sql'));
    await client.query('COMMIT');
    console.log('Beta creator schema committed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(JSON.stringify({ rolledBack: true, code: error.code, message: error.message }));
    process.exitCode = 1;
  } finally { client.release(); await pool.end(); }
})().catch(error => { console.error(JSON.stringify({ code: error.code, message: error.message })); process.exitCode = 1; });
