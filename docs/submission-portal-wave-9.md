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
