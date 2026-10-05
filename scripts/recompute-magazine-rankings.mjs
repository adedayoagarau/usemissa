#!/usr/bin/env node
/**
 * Updates the Missa Literary Magazine Index by hand. The same update runs on a
 * schedule through /api/cron/magazine-rankings.
 *
 *   DATABASE_URL=... npm run magazine:rankings                    # refresh sources, dry run
 *   DATABASE_URL=... npm run magazine:rankings -- --write         # refresh and publish
 *   ... --years=2024,2025,2026   recompute these years (default: latest complete year)
 *   ... --no-refresh             skip fetching sources; use stored snapshots
 *   ... --report=/path.json      write the full summary
 *   ... --neon-http              use Neon's HTTPS SQL API where raw Postgres is blocked
 *   ... --allow-shrink           publish even if a year loses over 20% of its magazines
 *                                (only for a reviewed rebuild; the schedule never does this)
 *
 * Sources, facts and rules are described in docs/magazine-index-ranking-process.md.
 */
import { writeFileSync } from "node:fs";
import pg from "pg";
import {
  pgRankingDb,
  recomputeMagazineRankings,
  runMagazineIndexUpdate,
} from "../packages/radar-adapters/dist/src/index.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const write = args.get("write") === "true";
const refresh = args.get("no-refresh") !== "true";
const years = args.get("years")?.split(",").map(Number);
const reportPath = args.get("report");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Point it at a Neon branch, not production, until the result is reviewed.");
  process.exit(1);
}

/** Neon's HTTPS SQL endpoint, for environments that block raw Postgres. */
function neonHttpDb(connectionString) {
  const host = new URL(connectionString).hostname;
  const post = async (body, headers = {}) => {
    const response = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: { "Neon-Connection-String": connectionString, "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? `Neon HTTP ${response.status}`);
    return payload;
  };
  return {
    query: async (text, params = []) => ({ rows: (await post({ query: text, params })).rows }),
    transaction: async (statements) => {
      await post(
        { queries: statements.map(([query, params]) => ({ query, params })) },
        { "Neon-Batch-Isolation-Level": "Serializable" },
      );
    },
  };
}

let pool;
const db =
  args.get("neon-http") === "true"
    ? neonHttpDb(process.env.DATABASE_URL)
    : pgRankingDb((pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })));

try {
  let result;
  if (refresh) {
    result = await runMagazineIndexUpdate(db, {
      trigger: "manual",
      publish: write,
      years,
      allowShrink: args.get("allow-shrink") === "true",
    });
    for (const r of result.refresh) {
      if (!["settled", "unchanged"].includes(r.outcome)) {
        console.log(`${r.source} ${r.editionYear}${r.genre ? ` ${r.genre}` : ""}: ${r.outcome}${r.rows != null ? ` (${r.rows} rows)` : ""}${r.reason ? ` - ${r.reason}` : ""}`);
      }
    }
    if (result.status === "failed") throw new Error(result.error);
  } else {
    result = await recomputeMagazineRankings(db, { years, write });
  }
  const summary = result.summary;
  console.log(`\nYears: ${summary.years.join(", ")}`);
  for (const year of summary.years) {
    console.log(`${year}:`, summary.magazines[year]);
    console.table(summary.pillarStatus[year]);
  }
  console.log(`Unmatched listed names: ${summary.unmatchedNames.filter((n) => n.startsWith("Garstang")).length} Garstang, ${summary.unmatchedNames.length} in all`);
  console.log(`Magazines with recorded fee amounts: ${summary.feeAmounts.magazines}`);
  console.log(`Listing says no fee, but a regular category charges: ${summary.feeAmounts.listingSaysNoFeeButCategoryCharges.length}`);
  console.log(`Listing says fee, but a regular category is free: ${summary.feeAmounts.listingSaysFeeButCategoryFree.length}`);
  if (reportPath) writeFileSync(reportPath, JSON.stringify(result, null, 2));
  console.log(write ? "\nPublished." : "\nDry run: rankings not written. Re-run with --write against a Neon branch.");
} finally {
  await pool?.end();
}
