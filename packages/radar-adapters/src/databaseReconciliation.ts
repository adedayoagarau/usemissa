import type { Pool, PoolClient } from "pg";

export interface ReconciliationResult {
  canonicalClosed: number;
  radarClosed: number;
}

/**
 * Reconciles expired opportunities in Postgres so records with past deadlines
 * do not remain in active states ('open', 'closing-soon', 'deadline-extended', 'opening-soon').
 * Updates both the canonical 'opportunities' table and compatibility 'radar_opportunities'.
 */
export async function reconcileExpiredOpportunitiesInDatabase(
  poolOrClient: Pool | PoolClient,
  now: Date = new Date(),
): Promise<ReconciliationResult> {
  const currentDateIso = now.toISOString().slice(0, 10);

  const canonicalRes = await poolOrClient.query<{ id: string }>(
    `UPDATE opportunities
     SET status = 'closed', last_changed_at = now(), updated_at = now()
     WHERE deadline_date < $1::date
       AND status IN ('open', 'closing-soon', 'deadline-extended', 'opening-soon')
     RETURNING id`,
    [currentDateIso],
  );

  const radarRes = await poolOrClient.query<{ id: string }>(
    `UPDATE radar_opportunities
     SET status = 'closed',
         data = jsonb_set(data, '{status}', '"closed"')
     WHERE (data->'fields'->'deadline'->>'date')::date < $1::date
       AND status IN ('open', 'closing-soon', 'deadline-extended', 'opening-soon')
     RETURNING id`,
    [currentDateIso],
  );

  return {
    canonicalClosed: canonicalRes.rowCount ?? canonicalRes.rows.length,
    radarClosed: radarRes.rowCount ?? radarRes.rows.length,
  };
}
