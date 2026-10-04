#!/usr/bin/env node
/**
 * Compares recorded Jev reading decisions with cited facts from the magazine
 * and residency indexes, and prints agreement, coverage and calibration per
 * question. Read-only.
 *
 *   DATABASE_URL=... npm run jev:evaluate-reading
 *   ... --json=/path.json      also write the full evaluation
 *
 * Index facts describe an organization and reach a call through a confirmed
 * profile link (or a residency's cited open-call URL). A disagreement can
 * mean the call page and the directory differ, not only a wrong reading.
 */
import { writeFileSync } from "node:fs";
import pg from "pg";
import {
  evaluateReading,
  formatReadingEvaluation,
  loadReadingDecisions,
  loadReadingTruths,
} from "../packages/radar-adapters/dist/src/index.js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split(/=(.*)/s);
    return [key, value ?? "true"];
  }),
);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  // One read-only transaction so both reads see the same data.
  const db = await pool.connect();
  try {
    await db.query("begin transaction read only");
    const decisions = await loadReadingDecisions(db);
    const { truths, conflicts } = await loadReadingTruths(db);
    await db.query("commit");
    if (decisions.length === 0) {
      console.log(
        "No Jev reading decisions are recorded yet. Run `npm run jev:read` first.",
      );
    }
    const evaluation = evaluateReading(decisions, truths);
    console.log(formatReadingEvaluation(evaluation, conflicts));
    const jsonPath = args.get("json");
    if (jsonPath && jsonPath !== "true") {
      writeFileSync(
        jsonPath,
        JSON.stringify({ ...evaluation, conflicts }, null, 2),
      );
      console.log(`Wrote ${jsonPath}`);
    }
  } finally {
    db.release();
  }
} finally {
  await pool.end();
}
