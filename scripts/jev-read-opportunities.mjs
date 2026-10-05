#!/usr/bin/env node
/**
 * Shadow reading pass: asks Jev the reading questions about published
 * opportunities and records every answer in data_decisions. It never changes
 * an opportunity; decisions are always recorded in shadow mode.
 *
 *   DATABASE_URL=... JEV_API_KEY=... npm run jev:read -- --limit=200
 *   ... --since=2026-09-01        only opportunities changed since this date
 *   ... --ids=opp_1,opp_2         only these opportunities
 *   ... --batch=50                rows loaded per query
 *   ... --dry-run                 build states and count them; no Jev calls, no writes
 */
import pg from "pg";
import { jevClientFromEnv } from "../packages/decisions/dist/src/index.js";
import { runReadingPass } from "../packages/radar-adapters/dist/src/index.js";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    const next = argv[index + 1];
    if (inline !== undefined) args.set(key, inline);
    else if (next !== undefined && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else args.set(key, "true");
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const dryRun = args.get("dry-run") === "true";
const limit = Number(args.get("limit") ?? 100);
const batchSize = Number(args.get("batch") ?? 50);
const since = args.get("since") ?? null;
const ids = args.get("ids")
  ? args
      .get("ids")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  : null;

if (!Number.isInteger(limit) || limit < 1) {
  console.error("--limit must be a positive whole number.");
  process.exit(1);
}
if (since && Number.isNaN(Date.parse(since))) {
  console.error(`--since is not a date: ${since}`);
  process.exit(1);
}

const client = jevClientFromEnv();
if (!client.available && !dryRun) {
  console.log(
    "JEV_API_KEY is not set, so there is nothing to ask Jev. No decisions were recorded.",
  );
  console.log(
    "Set JEV_API_KEY to run the reading pass, or pass --dry-run to check what would be read.",
  );
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Point it at a Neon branch, not production, until the pass is reviewed.",
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const summary = await runReadingPass({
    db: pool,
    client,
    limit,
    batchSize: Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 50,
    since,
    ids,
    dryRun,
    log: (line) => console.log(line),
  });
  console.log(`Opportunities considered: ${summary.considered}`);
  console.log(`Skipped for too little stored text: ${summary.skippedThinText}`);
  const meanChars =
    summary.considered - summary.skippedThinText
      ? Math.round(
          summary.stateChars.total /
            (summary.considered - summary.skippedThinText),
        )
      : 0;
  console.log(
    `State size: mean ${meanChars} chars, largest ${summary.stateChars.max}`,
  );
  if (dryRun) {
    console.log("Dry run: Jev was not called and nothing was written.");
  } else {
    console.log(`Read by Jev: ${summary.decided}; failed: ${summary.failed}`);
    console.log(
      `Answers recorded in data_decisions (shadow): ${summary.recordedAnswers}`,
    );
    console.table(
      Object.fromEntries(
        Object.entries(summary.routes).map(([key, routes]) => [
          key.replace("opportunity.reading.", ""),
          routes,
        ]),
      ),
    );
    for (const { opportunityId, error } of summary.errors.slice(0, 10)) {
      console.log(`  ${opportunityId}: ${error}`);
    }
  }
} finally {
  await pool.end();
}
