import pg from 'pg';
const { Client, Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[RECONCILE] DATABASE_URL is not set.');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

export async function reconcileExpiredOpportunities(clientOrPool, now = new Date()) {
  const currentDateIso = now.toISOString().slice(0, 10);

  // 1. Reconcile canonical opportunities table
  const canonicalRes = await clientOrPool.query(
    `UPDATE opportunities
     SET status = 'closed', last_changed_at = now(), updated_at = now()
     WHERE deadline_date < $1::date
       AND status IN ('open', 'closing-soon', 'deadline-extended', 'opening-soon')
     RETURNING id, title, status, deadline_date::text`,
    [currentDateIso]
  );

  // 2. Reconcile compatibility radar_opportunities table
  const radarRes = await clientOrPool.query(
    `UPDATE radar_opportunities
     SET status = 'closed',
         data = jsonb_set(data, '{status}', '"closed"')
     WHERE (data->'fields'->'deadline'->>'date')::date < $1::date
       AND status IN ('open', 'closing-soon', 'deadline-extended', 'opening-soon')
     RETURNING id, status, data->'fields'->'deadline'->>'date' as deadline_date`,
    [currentDateIso]
  );

  return {
    canonicalCount: canonicalRes.rowCount ?? canonicalRes.rows.length,
    canonicalRows: canonicalRes.rows,
    radarCount: radarRes.rowCount ?? radarRes.rows.length,
    radarRows: radarRes.rows,
  };
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (isDryRun) {
      console.log('[RECONCILE] Running DRY RUN (transaction will roll back)...');
      await client.query('BEGIN');
      const result = await reconcileExpiredOpportunities(client);
      console.log(`[RECONCILE] Would close ${result.canonicalCount} canonical opportunities.`);
      console.log(`[RECONCILE] Would close ${result.radarCount} radar_opportunities.`);
      await client.query('ROLLBACK');
      console.log('[RECONCILE] Dry run rolled back successfully.');
    } else {
      console.log('[RECONCILE] Executing reconciliation against database...');
      await client.query('BEGIN');
      const result = await reconcileExpiredOpportunities(client);
      await client.query('COMMIT');
      console.log(`[RECONCILE] Successfully closed ${result.canonicalCount} canonical opportunities.`);
      console.log(`[RECONCILE] Successfully closed ${result.radarCount} radar_opportunities.`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[RECONCILE] Failed to reconcile opportunities:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('reconcile-expired-opportunities.mjs')) {
  main();
}
