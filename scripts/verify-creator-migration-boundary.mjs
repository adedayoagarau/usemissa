import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const migrations = join(root, 'packages', 'db', 'migrations');
const journal = JSON.parse(await readFile(join(migrations, 'meta', '_journal.json'), 'utf8'));
const additive = [
  '0045_creator_goals.sql',
  '0046_goal_disciplines.sql',
  '0047_application_workspace.sql',
  '0048_creator_reminders.sql',
  '0049_creator_following.sql',
  '0050_creator_recommendations.sql',
  '0051_creator_calendar_planning.sql',
];

const details = [];
for (const file of additive) {
  const sql = await readFile(join(migrations, file), 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  const guarded = /CREATE TABLE IF NOT EXISTS|ALTER TABLE[\s\S]*?IF NOT EXISTS|CREATE INDEX IF NOT EXISTS/u.test(sql);
  const tag = file.replace(/\.sql$/u, '');
  if (journal.entries.some((entry) => entry.tag === tag)) {
    throw new Error(`${tag} is registered in the replay journal; reconcile it against an isolated database before promotion`);
  }
  details.push({ file, sha256: hash, idempotentGuardsPresent: guarded });
}

if (details.some((item) => !item.idempotentGuardsPresent)) {
  throw new Error('An additive creator migration is missing an idempotent DDL guard');
}

console.log(JSON.stringify({
  status: 'safe-to-rehearse',
  journalEntries: journal.entries.length,
  additiveMigrations: details,
  note: 'These migrations are intentionally not registered for replay until a disposable database rehearsal is recorded.',
}, null, 2));
