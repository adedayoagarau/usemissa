#!/usr/bin/env node
/**
 * Applies approved database decisions from data_decisions: only rows with
 * mode 'live', route 'apply' and status 'proposed', only for the question
 * keys named with --question, and only through the allow-list in
 * @missa/decisions (databaseApplyTargets). A field that already holds a
 * stated value is never overwritten. All writes run in one transaction; each
 * applied row is marked 'applied' with applied_at and the value it replaced
 * (applied_from), and cites data_decisions:<id> in the target's metadata
 * column where the table has one.
 *
 * Dry run by default: reports what would be written and writes nothing.
 *
 * Usage:
 *   node scripts/jev-apply-decisions.mjs --question=<key>[,<key>] [--subject=<id>[,<id>]]
 *     [--limit=1000] [--apply]
 *   node scripts/jev-apply-decisions.mjs --list
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { countryNameFromCode } from "@missa/contracts";
import { applyDatabaseDecisions, databaseApplyTargets } from "@missa/decisions";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  try {
    const env = readFileSync(join(repoRoot, ".env.local"), "utf8");
    const match = env.match(/^DATABASE_URL\s*=\s*(.*)$/m);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // fall through
  }
  throw new Error("DATABASE_URL missing from env or .env.local");
}

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

const targets = databaseApplyTargets({
  countryName: (code) => countryNameFromCode(code),
});

async function main() {
  if (process.argv.includes("--list")) {
    for (const target of Object.values(targets)) {
      console.log(
        `${target.questionKey} → ${target.table}.${target.column} (when ${target.writableWhen})`,
      );
    }
    return;
  }
  const questionKeys = (argValue("question") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (questionKeys.length === 0) {
    throw new Error(
      "Name the questions to apply with --question=<key>[,<key>]; see --list",
    );
  }
  const dryRun = !process.argv.includes("--apply");
  const limit = Math.max(
    1,
    Math.min(10_000, Number(argValue("limit") ?? 1000) || 1000),
  );
  const subjectIds = argValue("subject")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const pool = new pg.Pool({ connectionString: readDatabaseUrl(), max: 1 });
  const client = await pool.connect();
  try {
    const report = await applyDatabaseDecisions(client, {
      targets,
      questionKeys,
      dryRun,
      limit,
      subjectIds: subjectIds?.length ? subjectIds : undefined,
    });
    console.log(
      `=== ${dryRun ? "Dry run (nothing written; pass --apply to write)" : "Applied"} ===`,
    );
    console.log(
      JSON.stringify({
        considered: report.considered,
        [dryRun ? "wouldApply" : "applied"]: report.applied.length,
        skipped: report.skipped.length,
      }),
    );
    for (const result of report.applied) {
      console.log(
        `  ${result.questionKey} ${result.subjectId}: ${result.previous ?? "(empty)"} → ${result.value} [data_decisions:${result.decisionId}]`,
      );
    }
    const reasons = new Map();
    for (const skip of report.skipped)
      reasons.set(skip.reason, (reasons.get(skip.reason) ?? 0) + 1);
    for (const [reason, count] of reasons)
      console.log(`  skipped ${count}: ${reason}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
