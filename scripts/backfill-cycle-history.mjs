#!/usr/bin/env node

// One-off: record every observed cycle of every opportunity in
// opportunity_cycle_history (from opportunity_versions snapshots, current
// dates and opportunity_call_windows), then confirm and refresh forecasts.
//
//   npm run build --workspace=@missa/radar-adapters
//   DATABASE_URL=... node scripts/backfill-cycle-history.mjs --dry-run
//   DATABASE_URL=... node scripts/backfill-cycle-history.mjs [--opportunity <id>] [--skip-forecasts]
//
// Safe to re-run: history rows are upserted, admin and organization rows are
// never overwritten, and forecasts are recomputed from the full history.

import pg from "pg";
import {
  backfillCycleHistory,
  confirmForecasts,
  refreshForecasts,
} from "../packages/radar-adapters/dist/src/index.js";

const { Pool } = pg;

function parseArgs(args) {
  const options = { dryRun: false, opportunityIds: undefined, skipForecasts: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--skip-forecasts") options.skipForecasts = true;
    else if (arg === "--opportunity" && args[i + 1]) (options.opportunityIds ??= []).push(args[++i]);
    else if (arg === "--help") {
      console.log("Usage: node scripts/backfill-cycle-history.mjs [--dry-run] [--opportunity <id>]... [--skip-forecasts]");
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  try {
    const now = new Date();
    if (!options.dryRun && !options.skipForecasts) {
      const confirmed = await confirmForecasts(pool, { now, opportunityIds: options.opportunityIds });
      console.log(`Forecasts confirmed: ${confirmed.confirmed} (notices: ${confirmed.notices})`);
    }
    const history = await backfillCycleHistory(pool, { opportunityIds: options.opportunityIds, dryRun: options.dryRun });
    console.log(
      `${options.dryRun ? "[dry run] " : ""}Cycles observed: ${history.cycles} across ${history.opportunities} opportunities; rows written: ${history.written}`,
    );
    if (!options.dryRun && !options.skipForecasts) {
      const forecasts = await refreshForecasts(pool, { now, opportunityIds: options.opportunityIds });
      console.log(
        `Forecasts: ${forecasts.upserted} written, ${forecasts.removed} removed, ${forecasts.keptConfirmed} kept as confirmed (of ${forecasts.considered} with two or more cycles)`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
