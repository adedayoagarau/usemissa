# Missa handoff — ingestion v2, for Codex

## Where this stops

The v2 funnel works end to end as of tonight and there is exactly one decision
pending: two records passed all five publication gates in a dry run and are
ready to publish the moment the flag is set. Nothing has been published by v2
yet. The owner wants visible results on usemissa.com — start there, not with
infrastructure.

## Repository state

- All work is on `main`, pushed: tip `fcdd25369`.
- Every package builds; 70 tests in @missa/ingestion-v2 (69 pass, 1 skipped
  without a database). Verify with per-package `npm test`, checking EXIT CODES
  (a piped grep once masked a failure).
- The worktree `/Volumes/Crucial X10/usemissa/.claude/worktrees/missa-status-eb26e8`
  silently switches back to branch `claude/ingestion-workflow-review-a13438`
  between sessions — check `git branch --show-current` before committing.
- `/Volumes/Crucial X10/usemissa` (main checkout) still has the local-only
  branch `codex/spacing-system` checked out with unrelated dirty work. That
  branch IS merged into main now (merge commit e79140bc9).

## Production topology (Railway project missa-production)

- `ingestion-v2-worker` — combined worker, runs the full pipeline, schedules
  from `missa_ingestion_v2_source_schedules` every 5 min. Redeployed tonight
  with all fixes. Env already set: DATABASE_URL, REDIS_URL, DEEPSEEK_API_KEY,
  R2_* (4 vars), INGESTION_V2_DATABASE_ROLE=production,
  MISSA_INGESTION_V2_PROMOTE_APPROVED=1 (canonical writes ON, publish OFF).
- `v2-render` — Playwright render service, verified working.
  https://v2-render-production.up.railway.app, bearer token in service env
  (RENDER_SERVICE_TOKEN). SSRF-guarded. The worker does NOT yet have
  RENDER_SERVICE_URL/TOKEN set — rendering is off on the combined worker.
- `v2-fetch` / `v2-decide` / `v2-write` — staged graph, deployed, healthy,
  IDLE by design. `MISSA_INGESTION_V2_SCHEDULER_TARGET=staged` on the worker
  hands scheduling to them. Not flipped.
- Radar workers all still run; Radar's review agent is still the only thing
  publishing (249 published records, +127 in the last day). Retirement
  criterion documented: 50 correct v2-published records + two clean weeks.

## What changed today (all on main, all deployed to the worker)

1. `publisher.ts`: organization-website/profile sources reconcile with their
   own page (`basis: "first-party-source"`). Root cause: registry sources have
   no destination rules, so 98% of sources produced zero candidates → 0.5%
   approval. Directories keep the strict external-destination path; regression
   tests cover it. Model prompt now asks the right question per case.
2. `canonicalWriter.ts`: deadlines normalized via radar-engine `parseDate`
   ("January 15, 2027", "Deadline: March 1" etc.), forward-only year
   inference, implausible dates rejected, past deadlines write status=closed.
   Exported as `normalizeOpportunityDeadline` with tests.
3. `publicationRubric.ts`: placeholder-title list extended ("SUBMIT",
   "Submissions", "Recent Books", etc. are page chrome, not identities).
4. Earlier this session (already deployed): identity tautology fix + fuzzy
   org/title matching (Gary's conservative bands), model-response cache keyed
   on content hash (verified live: 25 entries, 2 hits), R2 snapshot storage
   (bodies=r2 in worker log), repair job for the quarantined backlog
   (dry-run only; 0 auto-repaired / 2 needs-review — auto-repair is
   low-yield, human review queue is the path).

## Measured result after the fixes (35 forced runs)

- 14 fetch failures (registry rot, known), 13 first-party rejects (model
  correctly filtering homepages), 2 directory rejects, 6 approvals (29% of
  completions, was 0.5%).
- Deadlines land correctly: 2026-09-30 exact/open; past deadlines closed.
- Publication dry run over all 7 v2 records: 2 publish, 5 needs-human, every
  reason correct.

## THE PENDING DECISION (owner has NOT approved — ask first)

Two records pass all gates:
- opp_v2_a7bb34c991fa28e9a78513358d487475 — "Other Futures Award" (P&W benchmark)
- opp_v2_af954dcff3f8f68d479d71c05087b636 — "Visionary Leaders Refreshing the
  World" (Coca-Cola Scholars; real + correct deadline, but the title is their
  tagline and it's a US high-school scholarship — audience-fit question; the
  owner was explicitly given publish-both / publish-one / publish-neither and
  has not chosen).

To publish (after owner approval):
```
INGESTION_V2_DATABASE_ROLE=production \
MISSA_INGESTION_V2_PROMOTE_APPROVED=1 \
MISSA_INGESTION_V2_PUBLISH=1 \
DATABASE_URL=<prod url from railway variables --service ingestion-v2-worker> \
V2_PUBLISH_LIMIT=10 \
node packages/ingestion-v2/dist/src/publish-cli.js
```
Dry run: same command without MISSA_INGESTION_V2_PUBLISH. The DB trigger
`missa_publication_gate` is the backstop — it raises 23514 on any unready
record and the transaction rolls back. Rollback = set publication_state back
to 'reviewable' (or flag off for future ticks).

## Next steps in order (from docs/ingestion-v2-unblock-plan-2026-08-15.md)

1. Supervised publish batch(es) of 10, hand-checked on usemissa.com, until 50
   correct records. Approvals accumulate as the scheduler works the registry
   (median cadence 168h; ~40 sources/hour when flowing; forcing a batch:
   see the enqueue pattern below).
2. Needs-review queue in the admin workbench
   (apps/web/app/(admin)/admin/ingestion-v2 + components/ingestion-v2-workbench.tsx)
   for the 5 held records + repair backlog.
3. Registry hygiene: deactivate sources with 3 consecutive
   not-found/blocked runs — NOT actionable yet (most sources have 1–2 runs of
   history); query is written, revisit after ~2 weekly sweeps.
4. Set RENDER_SERVICE_URL + RENDER_SERVICE_TOKEN on ingestion-v2-worker to
   enable render escalation there (values: service domain above + token from
   v2-render env).
5. Radar retirement per the 50-record criterion. Do not touch Radar before.

## Force-enqueue pattern (for testing batches without waiting on cadence)

```js
import { createIngestionCatalog, createQueueBundle, startRun, adapterForSource } from "@missa/ingestion-v2";
const sources = createIngestionCatalog("deepseek-html-v2")
  .filter(s => s.eligible && s.kind === "organization-website")
  .map(s => ({ ...s, adapterId: adapterForSource(s.kind, "deepseek-html-v2") }));
// REDIS_URL required; mode "promote" exercises the full path incl. canonical writes
```

## Gotchas that cost time today

- `railway redeploy` rebuilds the SAME commit; it does not pull from GitHub.
  Deploy local code with `railway up --service <name> --detach` from the repo
  root after `railway link -p e32bad5f-e08d-47e4-b0c7-6f10fae7c11c -e production -s <name>`.
- npm script named `publish` collides with npm's lifecycle — it's `publication`.
- INGESTION_V2_DATABASE_ROLE: production READS need only the label;
  production WRITES also need MISSA_INGESTION_V2_PROMOTE_APPROVED=1.
- zsh: `status` is a read-only variable; don't use it in scripts.
- `create table if not exists` never updates constraints — repair decisions
  table needed an explicit constraint migration; pattern is in repair.ts.

## Constraints (unchanged from the previous handoff)

- Never mass-invent organizations, types, or official URLs.
- Directory URLs are evidence, never the public destination when a
  first-party page exists.
- DeepSeek proposes; deterministic gates decide; production writes are never
  model-direct. Dry-run-then-apply for anything that touches production.
