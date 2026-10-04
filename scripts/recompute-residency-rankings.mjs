#!/usr/bin/env node
/**
 * Rebuilds the Missa residency index from cited directory listings.
 *
 *   DATABASE_URL=... npm run residency:rankings               # dry run: prints the summary
 *   DATABASE_URL=... npm run residency:rankings -- --write    # replaces the index
 *   ... --provision              first create profiles for directory programs Missa has none for
 *   ... --report=/path.json      write the full summary
 *   ... --neon-http              use Neon's HTTPS SQL API where raw Postgres is blocked
 *
 * Inputs (refresh with scripts/crawl-aca-residencies.mjs):
 *   packages/radar-adapters/src/ranking/data/residencies/aca-programs.json
 *   packages/radar-adapters/src/ranking/data/residencies/aca-open-calls.json
 *   packages/radar-adapters/src/ranking/data/residencies/rmar-residencies.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import {
  pgRankingDb,
  provisionResidencyProfiles,
  recomputeResidencyRankings,
} from "../packages/radar-adapters/dist/src/index.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const write = args.get("write") === "true";
const reportPath = args.get("report");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. Point it at a Neon branch, not production, until the result is reviewed.");
  process.exit(1);
}

const data = (file) =>
  JSON.parse(
    readFileSync(new URL(`../packages/radar-adapters/src/ranking/data/residencies/${file}`, import.meta.url), "utf8"),
  );

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

const sources = {
  rmar: data("rmar-residencies.json"),
  acaPrograms: data("aca-programs.json"),
  acaCalls: data("aca-open-calls.json"),
};

try {
  if (args.get("provision") === "true") {
    const { planned, unmatchedListings } = await provisionResidencyProfiles(db, sources, { write });
    console.log(`Profiles to create: ${planned.length} (from ${unmatchedListings} unmatched listings)`);
    console.table(planned.slice(0, 20).map((p) => ({ name: p.name, slug: p.nameKey, website: p.website, city: p.city })));
    if (reportPath) writeFileSync(reportPath.replace(/\.json$/, "-profiles.json"), JSON.stringify(planned, null, 2));
  }
  const { summary } = await recomputeResidencyRankings(db, sources, { write });
  console.log(`Ranked programs: ${summary.ranked} (listings without a matching profile: ${summary.unmatchedListings})`);
  console.log("Tiers:", summary.tiers);
  console.log("Programs with each fact:", summary.facts);
  console.log(`Average coverage: ${summary.averageCoverage}`);
  console.table(summary.top);
  if (reportPath) writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(write ? "Published." : "Dry run: nothing written. Pass --write to publish.");
} finally {
  await pool?.end();
}
