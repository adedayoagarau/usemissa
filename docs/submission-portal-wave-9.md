# Submission portal — Wave 9 launch-candidate handoff

Wave 9 repaired the production catalogue regression discovered during Wave 8,
then re-ran the public production smoke. The code and configuration changes
are committed; the remaining work is provider and seeded-journey certification,
not another public browse fix.

## Delivered

- Committed the Wave 7/8 portal work as `3614a4b3`.
- Added a source-boundary guard in `packages/radar-adapters/src/opportunityRepository.ts`
  so the optional `gary_profile_visuals` relation is not queried when that
  additive table is absent.
- Added a regression test for disabling optional Gary visual reads.
- Committed the guard as `ee39df5a`.
- Set the reversible production variables
  `MISSA_CREATOR_RELATIONAL_AUTHORITY=1` and
  `MISSA_GARY_PROFILE_VISUALS_READS=0`. Values were verified without exposing
  secrets.
- Deployed the current commit to the Vercel production target and aliased it
  to `www.usemissa.com` / `usemissa.com`.

## Verification

Local checks:

- `npm run build --workspace=@missa/radar-adapters` — passed.
- `node --test packages/radar-adapters/dist/test/opportunityRepository.test.js`
  — 15/15 passed.
- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run build --workspace=@missa/web` — passed; 261 routes generated.
- `npm test --workspace=@missa/workspace-engine` — 52 passed, 2 expected live
  PostgreSQL skips.
- `npm run check:design-system`, `npm run check:language`, and
  `git diff --check` — passed.

Production HTTP checks:

- `/api/health/readiness` — 200, overall `ready`.
- `/api/opportunities` — 200, valid response with 2,246 public records.
- `/opportunities` — 200.
- `/` — 200.

The required production checks now report database, session, creator authority,
file storage, cron, email, and shared rate limiting as ready. Payments, Gmail,
SCIM, and malware scanning remain optional and degraded.

Browser smoke against `https://missa-app-adedayoagarau.vercel.app/opportunities`
confirmed the catalogue heading, search, filters, sorting, result count, cards,
calendar links, pagination, and sign-in-required Save actions. At 390 × 844,
navigation and filters collapsed into labelled controls and the first card
remained readable without horizontal overflow. The only captured console
warning came from the installed Grammarly browser extension, not Missa app
code. No login, Save, Apply, upload, or submit action was activated.

## Remaining launch gates

1. Verify that Preview uses a dedicated Neon database identity; the presence of
   a Vercel `DATABASE_URL` alone is insufficient.
2. Choose and configure a malware provider, then prove clean, rejected,
   unavailable, and retryable Blob upload outcomes.
3. Seed disposable Preview fixtures and run the complete applicant path:
   draft, autosave, revision conflict, upload retry, packet review, submit,
   and relational receipt.
4. Run the organization path: reviewer assignment, blind projection, review,
   per-Work decision, message approval, delivery, and retry/outbox behavior.
5. Verify Railway worker/outbox health independently from Vercel readiness.
6. Complete screen-reader, keyboard, 200% zoom, reduced-motion, physical
   iPhone, and physical Android checks on the seeded submission journey.

The production public catalogue is repaired and smoke-tested. The submission
portal itself is not launch-certified until the provider, tenant, seeded
journey, worker, and device gates above have receipts.

## Visual backfill correction

The production safeguard `MISSA_GARY_PROFILE_VISUALS_READS=0` was a
fail-closed runtime setting for a missing relation; it did not delete
opportunities or profiles. The local Neon `main` database was checked before
and after the backfill: opportunities remained at 7,267 and profiles at
11,265. The terminal backfill inserted/upserted 13,031 verified visual source
rows into `gary_profile_visuals`, increasing that projection from 11,562 to
24,593 rows. It is available as:

```sh
set -a; . apps/web/.env.production.local; set +a
npm run backfill:profile-visuals --workspace=@missa/radar-adapters
```

The command is transactional and upsert-only. It maps verified organization
marks to logos, canonical representative images to banners, and verified
issue covers to issue-cover visuals. The Vercel production database identity
still needs to be matched to this Neon branch before the production read flag
can be safely restored; no production data was deleted while that identity is
unresolved.

## Opportunity organization and artwork reconciliation

The terminal reconciliation ran against the local Neon `main` branch using
only deterministic evidence: a unique confirmed profile link or a unique exact
official-host match. It created or reused organization records and updated
opportunity ownership without deleting or rewriting opportunity rows.

- Opportunities: 7,267 before and after.
- Missing organization links: 1,100 → 343.
- Published opportunities missing an organization: 1,074 → 323.
- Deterministic matches applied: 1,222 (107 confirmed links and 1,115 exact
  official-host matches).
- A post-run dry run found no further deterministic organization matches; the
  remaining 323 published rows are intentionally unresolved rather than
  guessed from names.

The source-page media backfill exhausted every published opportunity that had
an authoritative source URL and no existing media candidate. Across the
follow-up passes it processed 2,439 source pages and auto-cleared 1,076
rights-gated assets (413 in the initial pass, 528 in the second pass, and 135
in the final partition). The resulting local coverage is:

- Published opportunities: 6,026.
- With an authoritative direct, linked-organization, or profile visual:
  4,865 (80.7%).
- Without an authoritative visual: 1,161 (19.3%).
- Cleared media candidates: 1,172; rejected candidates are retained for audit.
- No published opportunity remains uncrawled by the safe source-page worker;
  residuals are blocked, failed, rejected by rights/quality gates, or have no
  deterministic organization visual to inherit.

No opportunity, organization, profile, or candidate records were deleted by
these reconciliation runs. The scripts are repeatable and upsert-only:

```sh
set -a; . apps/web/.env.production.local; set +a
npm run reconcile:opportunity-organizations --workspace=@missa/radar-adapters
node scripts/backfill-opportunity-media.mjs --published-only --apply --auto-clear-verified --limit 250
```
