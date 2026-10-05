#!/usr/bin/env node

/**
 * Create the official calendar deadline for saved opportunities that should
 * have one but do not. Between 11 September and the fix in #122, Save failed
 * to insert this event and reported the calendar as pending.
 *
 * Dry run by default: prints how many applications and accounts would change,
 * and how many of those accounts have an active Google or Microsoft calendar
 * connection (their new events are queued for provider export, exactly as a
 * normal Save would). Pass --apply to write.
 *
 *   DATABASE_URL=... npm run calendar:backfill-deadlines --workspace=@missa/radar-adapters
 *   DATABASE_URL=... npm run calendar:backfill-deadlines --workspace=@missa/radar-adapters -- --apply
 *
 * Scope: applications still in preparation, with a confirmed (exact or fixed)
 * deadline on a published opportunity that has not passed. Idempotent: the
 * underlying upsert never duplicates an event, so a rerun is safe.
 */

import { Pool } from "pg";
import { PostgresCreatorCalendarRepository } from "../creatorCalendarRepository.js";

const apply = process.argv.includes("--apply");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2 });
try {
  const missing = await pool.query<{ account_id: string; opportunity_id: string; connected: boolean }>(
    `select t.account_id,t.opportunity_id,
            exists (select 1 from calendar_provider_connections c where c.account_id=t.account_id and c.status='active') connected
       from tracked_opportunities t
       join opportunities o on o.id=t.opportunity_id
      where t.status in ('interested','saved','preparing','draft-started','ready-to-submit')
        and o.publication_state='published'
        and o.deadline_kind in ('exact','fixed')
        and o.deadline_date >= current_date
        and not exists (
          select 1 from creator_calendar_events e
           where e.account_id=t.account_id and e.opportunity_id=t.opportunity_id and e.purpose='official-deadline'
        )
      order by t.account_id,t.opportunity_id`,
  );
  const accounts = new Set(missing.rows.map((row) => row.account_id));
  const connected = new Set(missing.rows.filter((row) => row.connected).map((row) => row.account_id));
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      applications: missing.rowCount,
      accounts: accounts.size,
      accountsWithCalendarExport: connected.size,
    }),
  );
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to create these events.");
  } else {
    const calendar = new PostgresCreatorCalendarRepository(pool);
    let added = 0;
    let skipped = 0;
    for (const row of missing.rows) {
      const result = await calendar.ensureOpportunityDeadline(row.account_id, row.opportunity_id);
      if (result.status === "added") added += 1;
      else skipped += 1;
    }
    console.log(JSON.stringify({ added, skipped }));
  }
} finally {
  await pool.end();
}
