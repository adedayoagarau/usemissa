import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to apply the target schema');
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsRoot = join(repoRoot, 'packages', 'db', 'migrations');

// The live database has a reconciled history: 0006-0013 were applied before
// 0014 was registered in the Drizzle journal, and 0003 and 0011 are identical
// taxonomy migrations. A clean target-schema check must reproduce that
// effective schema in dependency order rather than relying on the sparse live
// journal to describe an empty database.
const migrationFiles = [
  '0000_wet_dracula.sql',
  '0001_steady_lockheed.sql',
  '0002_spooky_molecule_man.sql',
  '0003_living_ben_grimm.sql',
  '0004_amused_blonde_phantom.sql',
  '0005_nervous_salo.sql',
  '0002_organization_roles.sql',
  '0003_submission_payments.sql',
  '0003_canonical_taxonomy.sql',
  '0004_open_call_guidelines.sql',
  '0005_submission_answers.sql',
  '0006_submission_idempotency.sql',
  '0007_submission_drafts.sql',
  '0008_submission_draft_payment.sql',
  '0009_work_file_urls.sql',
  '0010_reconcile_submission_drafts.sql',
  '0012_activate_missa_taxonomy.sql',
  '0013_radar_agent_heartbeat.sql',
  '0014_platform_admin_foundations.sql',
  '0015_admin_operations.sql',
  '0016_opportunity_intelligence.sql',
  '0017_chat_baseline.sql',
  '0023_profile_opportunity_identity.sql',
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  for (const fileName of migrationFiles) {
    const sql = await readFile(join(migrationsRoot, fileName), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Target schema migration failed: ${fileName}`, { cause: error });
    }
  }

  const result = await client.query(`
    select count(*)::int as table_count
    from information_schema.tables
    where table_schema = 'public'
  `);
  console.log(JSON.stringify({ applied: migrationFiles.length, publicTables: result.rows[0].table_count }));
} finally {
  await client.end();
}
