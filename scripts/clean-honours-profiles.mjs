#!/usr/bin/env node
/**
 * Cleans magazine profiles created from honours-list lines ("*Shenandoah",
 * "Gettysburg Review ©", "Point, The"): merges each into the real profile when
 * exactly one exists (moving its data and leaving a redirect), else renames it.
 *
 *   DATABASE_URL=... node scripts/clean-honours-profiles.mjs               # dry run
 *   DATABASE_URL=... node scripts/clean-honours-profiles.mjs --write       # apply
 *   ... --neon-http     use Neon's HTTPS SQL API where raw Postgres is blocked
 *
 * Rebuild the magazine index for every year afterwards
 * with scripts/recompute-magazine-rankings.mjs --years=<every year in the table> --write.
 */
import pg from "pg";
import {
  honoursCleanupStatements,
  pgRankingDb,
  planHonoursProfileCleanup,
} from "../packages/radar-adapters/dist/src/index.js";

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

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
const db = args.has("--neon-http")
  ? neonHttpDb(process.env.DATABASE_URL)
  : pgRankingDb((pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })));

try {
  const { rows } = await db.query(
    `SELECT id, name, profile_kind AS kind, name_key FROM gary_profiles
     WHERE profile_kind IN ('literary_magazine', 'small_press', 'organization')`,
  );
  const taken = new Set(rows.map((r) => r.name_key).filter(Boolean));
  const plan = planHonoursProfileCleanup(rows, taken);
  console.log(`Merge into an existing profile: ${plan.merges.length}`);
  for (const { from, to } of plan.merges.slice(0, 15)) console.log(`  "${from.name}" → "${to.name}"`);
  console.log(`Rename: ${plan.renames.length}`);
  for (const { profile, name } of plan.renames.slice(0, 15)) console.log(`  "${profile.name}" → "${name}"`);
  console.log(`Left alone (more than one possible match): ${plan.ambiguous.length}`);
  for (const { profile, candidates } of plan.ambiguous) {
    console.log(`  "${profile.name}" ? ${candidates.map((c) => `"${c.name}" (${c.kind})`).join(", ")}`);
  }
  if (write) {
    const statements = honoursCleanupStatements(plan);
    await db.transaction(statements);
    console.log(`Applied ${statements.length} statements.`);
  } else {
    console.log("Dry run: nothing written. Pass --write to apply.");
  }
} finally {
  await pool?.end();
}
