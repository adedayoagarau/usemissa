import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const migrationsRoot = join(repoRoot, 'packages', 'db', 'migrations');
const journalPath = join(migrationsRoot, 'meta', '_journal.json');
const journal = JSON.parse(await readFile(journalPath, 'utf8'));

const indexes = journal.entries.map((entry) => entry.idx);
if (indexes.some((idx, index) => idx !== index)) {
  throw new Error('Migration journal indexes must be contiguous and zero-based');
}

for (const entry of journal.entries) {
  await access(join(migrationsRoot, `${entry.tag}.sql`));
}

const requiredTags = [
  '0014_platform_admin_foundations',
  '0015_admin_operations',
  '0016_opportunity_intelligence',
  '0017_chat_baseline',
];
for (const tag of requiredTags) {
  if (!journal.entries.some((entry) => entry.tag === tag)) {
    throw new Error(`Required migration is missing from the journal: ${tag}`);
  }
}

const expectedObjects = {
  '0016_opportunity_intelligence.sql': ['opportunity_contents', 'radar_content_review_jobs', 'radar_content_review_decisions'],
  '0017_chat_baseline.sql': ['chat_conversations', 'chat_runs', 'chat_messages', 'chat_run_events'],
};
for (const [fileName, objects] of Object.entries(expectedObjects)) {
  const sql = await readFile(join(migrationsRoot, fileName), 'utf8');
  const normalizedSql = sql.replaceAll('"', '');
  for (const objectName of objects) {
    if (!normalizedSql.includes(objectName)) {
      throw new Error(`${fileName} does not contain expected object ${objectName}`);
    }
  }
}

console.log(JSON.stringify({ entries: journal.entries.length, required: requiredTags }));
