# Submission portal — Wave 4 verification gate

## Scope

Wave 4 is the evidence gate for the submission portal journey. It verifies the
local route surface and browser behavior, then records what still requires a
disposable relational database before hosted deployment.

## Checks completed

- `git diff --check`: passed.
- 390px browser viewport: homepage shell renders with a compact menu, readable
  navigation, visible headings, and no exposed organization identifiers.
- Unknown hosted opportunity: `/org/unknown/unknown` returns the framework 404
  page rather than a compatibility fallback.
- Public portal projection for an unknown organization: returns `503 Portal
  projection is unavailable` while relational authority is not configured.
- Organization portal configuration without a session: returns `401 Not
  authenticated`.
- Existing hosted-application Playwright spec was attempted against the running
  local server; all three cases stopped at the fixture login with `401` because
  the compatibility server has no seeded test account.
- Relational-authority dev server on port `3110`: public portal configuration
  returned `200` for both seeded organizations; fixture login returned `200`.
- Applicant journey: authenticated draft save returned a recovery receipt and
  pinned form/opportunity version IDs; final submission returned `201` with a
  durable submission receipt and work row. Replaying the same idempotency key
  returned the original result.
- Tenant check: organization B exposed only its own published portal and call
  data; organization A's submission was not present in B's owner/inbox views.
- Fixed a relational JSON boundary bug discovered by the journey: draft answers,
  work titles, section progress, and submission answers are serialized before
  writing to `jsonb` columns.

## Disposable relational run

- Created Neon branch `missa-beta-migration-rehearsal-20260908` child with the
  existing one-day expiration policy.
- Created database `missa_story_16_1_wave4_20260911b` in the `usemissa` Neon
  project.
- Applied the canonical Drizzle journal migrations, then migrations `0056` and
  `0057`.
- `DISPOSABLE_WORKSPACE_DATABASE_URL npm test --workspace=@missa/workspace-engine`:
  53 passed, 1 skipped, 0 failed.
- The live relational path covered idempotency, optimistic concurrency,
  rollback, payment reuse protection, review/decision/delivery relationships,
  tenant isolation, and private-content redaction.

## Remaining proof

The relational contract is now proven against disposable Neon state. The
following remain unproven:

1. Browser upload/scanning against a real private Blob provider and the full
   workflow-replacement journey.
2. Physical iPhone/Android, screen-reader, 200% zoom, and reduced-motion runs.

## Next action

Hand the remaining provider-backed upload, reviewer inbox, and production
readiness work to Wave 5. Do not use a hosted production database as a
substitute. The Neon branch is configured to auto-delete after one day.
