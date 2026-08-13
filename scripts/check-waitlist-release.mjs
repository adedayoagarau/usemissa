import { Client } from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for the waitlist release preflight');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5_000 });
try {
  await client.connect();
  const table = await client.query("select to_regclass('public.waitlist_signups') as name");
  if (!table.rows[0]?.name) {
    console.log(JSON.stringify({ ready: false, reason: 'waitlist_signups table is missing' }));
    process.exitCode = 1;
  } else {
    const columns = await client.query(`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'waitlist_signups'
      order by ordinal_position
    `);
    const indexes = await client.query(`
      select indexname
      from pg_indexes
      where schemaname = 'public' and tablename = 'waitlist_signups'
    `);
    const columnNames = columns.rows.map((row) => row.column_name);
    const indexNames = indexes.rows.map((row) => row.indexname);
    const requiredColumns = ['id', 'email', 'source', 'campaign', 'created_at'];
    const hasUniqueEmailIndex = indexNames.some((name) => name === 'waitlist_signups_email_idx');
    const ready = requiredColumns.every((name) => columnNames.includes(name)) && hasUniqueEmailIndex;
    console.log(JSON.stringify({ ready, table: 'waitlist_signups', columns: columnNames, uniqueEmailIndex: hasUniqueEmailIndex }));
    if (!ready) process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message.split('\n')[0] : 'waitlist release preflight failed');
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
