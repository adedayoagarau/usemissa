#!/usr/bin/env node
/**
 * Asks Jev how likely each published call is to exploit applicants
 * (opportunity.predatory_risk, plus the fee, pay-to-publish, rights and
 * organizer flags) and records every answer in data_decisions.
 *
 *   DATABASE_URL=... JEV_API_KEY=... npm run trust:sweep            # shadow: records only
 *   ... -- --limit=200              how many published calls to read (default 200)
 *   ... -- --opportunity=<id>       one call
 *   ... -- --dry-run                keep decisions in memory and print them
 *
 * Live mode (DECISIONS_MODE_TRUST_SWEEP=live and JEV_TRUST_SWEEP_ACCOUNT_ID set
 * to the admin account that files the cases) only opens an admin support case
 * in opportunity_issue_reports with reason "predatory-risk". It never
 * unpublishes, edits or labels a call, and nothing here is shown publicly.
 */
import { createHash } from "node:crypto";
import pg from "pg";
import {
  TRUST_SWEEP_QUESTIONS,
  createMemoryDecisionLedger,
  createPostgresDecisionLedger,
  decide,
  decisionModeFromEnv,
  inputHash,
  jevClientFromEnv,
  predatoryRisk,
  predatoryRiskState,
} from "../packages/decisions/dist/src/index.js";

export const TRUST_SWEEP_SCOPE = "trust_sweep";
export const TRUST_REVIEW_REASON = "predatory-risk";

export const PUBLISHED_OPPORTUNITIES_SQL = `
  select o.id, o.title, o.type, o.fee_status, o.fee_cents, o.fee_currency, o.prize,
         o.guidelines_url, o.submission_host, left(o.search_document, 8000) as text,
         org.data->>'name' as organization_name,
         org.data->'domains'->>0 as organization_domain,
         s.url as source_url,
         coalesce((select json_agg(json_build_object('title', p.title, 'amountCents', p.amount_cents, 'currency', p.currency)
                                   order by p.rank nulls last)
                     from opportunity_call_prizes p where p.opportunity_id = o.id), '[]'::json) as prizes
    from opportunities o
    left join radar_organizations org on org.id = o.organization_id
    left join opportunity_sources s on s.id = o.source_id
   where o.publication_state = 'published'
     and o.status not in ('closed', 'archived')
     and ($1::text is null or o.id = $1)
   order by o.last_changed_at desc nulls last, o.id
   limit $2`;

/** Published facts only: the listing, its organizer and its source. */
export function trustSweepState(row) {
  return predatoryRiskState({
    title: row.title,
    type: row.type,
    feeStatus: row.fee_status,
    feeCents: row.fee_cents,
    feeCurrency: row.fee_currency,
    prize: row.prize,
    prizes: Array.isArray(row.prizes) ? row.prizes : [],
    organizationName: row.organization_name,
    organizationWebsite: row.organization_domain
      ? `https://${row.organization_domain}`
      : null,
    sourceUrl: row.source_url,
    submissionHost: row.submission_host,
    guidelinesUrl: row.guidelines_url,
    text: row.text,
  });
}

/** Signals a live, confident answer raised; empty in shadow mode. */
export function trustReviewSignals(outcomes) {
  const signals = [];
  const risk = outcomes[predatoryRisk.key];
  if (
    risk?.actionable &&
    risk.route === "apply" &&
    risk.answer !== "legitimate"
  )
    signals.push(risk.answer);
  for (const question of TRUST_SWEEP_QUESTIONS) {
    if (question.key === predatoryRisk.key) continue;
    const outcome = outcomes[question.key];
    if (outcome?.actionable && outcome.route === "apply")
      signals.push(question.key.split(".")[1]);
  }
  return signals;
}

/** A stable UUID per call and input, so a rerun never opens a second case. */
export function trustReviewIdempotencyKey(opportunityId, hash) {
  const hex = createHash("sha256")
    .update(`trust-sweep:${opportunityId}:${hash}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Opens one admin case unless an open one for this call already exists. */
export async function openTrustReviewCase(db, input) {
  const result = await db.query(
    `insert into opportunity_issue_reports
       (id, account_id, opportunity_id, subject_type, subject_id, reason, note, status, idempotency_key, evidence_url)
     select $1, $2, $3, 'opportunity', $3, $4, $5, 'open', $6::uuid, $7
      where not exists (
        select 1 from opportunity_issue_reports
         where opportunity_id = $3 and reason = $4 and status in ('open', 'in-progress', 'in_progress'))
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      `issue_trust_${input.idempotencyKey.replace(/-/g, "").slice(0, 24)}`,
      input.accountId,
      input.opportunityId,
      TRUST_REVIEW_REASON,
      `Trust sweep flagged: ${input.signals.join(", ")}. Review the listing; nothing was changed or unpublished.`,
      input.idempotencyKey,
      input.evidenceUrl ?? null,
    ],
  );
  return result.rows[0]?.id ?? null;
}

async function alreadyDecided(db, opportunityId, hash) {
  const result = await db.query(
    `select 1 from data_decisions
      where subject_type = 'opportunity' and subject_id = $1 and question_key = $2
        and question_version = $3 and decider = 'jev' and input_hash = $4
      limit 1`,
    [opportunityId, predatoryRisk.key, predatoryRisk.version, hash],
  );
  return result.rows.length > 0;
}

/**
 * One decide() per published call, four at a time. Never throws for a Jev or
 * ledger failure; those are counted and logged.
 */
export async function runTrustSweep({
  db,
  client,
  ledger,
  mode,
  limit = 200,
  opportunityId = null,
  reviewAccountId = null,
  concurrency = 4,
  log = console.log,
}) {
  const summary = {
    read: 0,
    skipped: 0,
    decided: 0,
    flagged: 0,
    casesOpened: 0,
    errors: 0,
  };
  const { rows } = await db.query(PUBLISHED_OPPORTUNITIES_SQL, [
    opportunityId,
    limit,
  ]);
  summary.read = rows.length;
  let next = 0;
  const worker = async () => {
    for (;;) {
      const row = rows[next];
      next += 1;
      if (!row) return;
      try {
        const state = trustSweepState(row);
        const hash = inputHash(state);
        if (await alreadyDecided(db, row.id, hash)) {
          summary.skipped += 1;
          continue;
        }
        const result = await decide({
          client,
          ledger,
          mode,
          subjectId: row.id,
          state,
          questions: TRUST_SWEEP_QUESTIONS,
          evidenceUrl: row.source_url ?? null,
        });
        if (result.error) {
          summary.errors += 1;
          log(`[trust-sweep] ${row.id}: ${result.error}`);
        }
        summary.decided += 1;
        const signals = trustReviewSignals(result.outcomes);
        if (signals.length === 0) continue;
        summary.flagged += 1;
        if (!reviewAccountId) continue;
        const caseId = await openTrustReviewCase(db, {
          accountId: reviewAccountId,
          opportunityId: row.id,
          signals,
          idempotencyKey: trustReviewIdempotencyKey(row.id, hash),
          evidenceUrl: row.source_url,
        });
        if (caseId) summary.casesOpened += 1;
      } catch (error) {
        summary.errors += 1;
        log(
          `[trust-sweep] ${row.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(concurrency, rows.length)) },
      worker,
    ),
  );
  return summary;
}

async function main() {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );
  if (!process.env.DATABASE_URL) {
    console.error("[trust-sweep] DATABASE_URL is required.");
    process.exit(1);
  }
  const client = jevClientFromEnv();
  if (!client.available) {
    console.log("[trust-sweep] JEV_API_KEY is not set; nothing to do.");
    return;
  }
  const dryRun = args.get("dry-run") === "true";
  const mode = dryRun ? "shadow" : decisionModeFromEnv(TRUST_SWEEP_SCOPE);
  const reviewAccountId =
    mode === "live"
      ? process.env.JEV_TRUST_SWEEP_ACCOUNT_ID?.trim() || null
      : null;
  if (mode === "live" && !reviewAccountId) {
    console.warn(
      "[trust-sweep] Live mode without JEV_TRUST_SWEEP_ACCOUNT_ID: recording only, no cases opened.",
    );
  }
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString,
    max: 2,
    ssl: connectionString.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  const ledger = dryRun
    ? createMemoryDecisionLedger()
    : createPostgresDecisionLedger(pool);
  try {
    const limit = Number(args.get("limit") ?? 200);
    const summary = await runTrustSweep({
      db: pool,
      client,
      ledger,
      mode,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 5_000) : 200,
      opportunityId: args.get("opportunity") ?? null,
      reviewAccountId,
    });
    console.log(
      `[trust-sweep] mode=${mode}${dryRun ? " (dry run)" : ""}`,
      summary,
    );
    if (dryRun) {
      for (const record of ledger.records) {
        console.log(
          `${record.subjectId}\t${record.questionKey}\t${record.answer}\t${record.route}\t${record.probability ?? ""}`,
        );
      }
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("jev-trust-sweep.mjs")) {
  main().catch((error) => {
    console.error("[trust-sweep] failed:", error);
    process.exit(1);
  });
}
