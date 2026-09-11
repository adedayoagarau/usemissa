# Story 16.1: Workspace Relational Repositories and Transactional Writes

Status: done

## Story

As a Missa customer,
I want organization-managed application, submission, review, decision, and delivery state stored transactionally,
so that concurrent work cannot overwrite another user's changes.

## Scope Lock

This story cuts the existing **organization-managed hosted-submission launch slice** to row-level Postgres repositories:

`Organization -> Team (Entity) -> Program -> Open Call -> Form (SubmissionPath) -> Submission -> Work -> ReviewRound/Assignment/Recommendation -> Decision -> DeliveryTask`

It includes the production commands and reads already needed by that chain. It does **not** implement or cut over:

- creator-owned Radar, account, Tracker, Inbox, Calendar, Library, Profile, or notification-preference data (Story 16.2);
- compatibility retirement, production read cutover, drift quarantine, or the final rollback switch (Story 16.3);
- the untracked Missa Office event reducer/application control plane (Story 17.3);
- hosted draft/form versioning, deadline finalization, immutable receipts, upload lifecycle, or payment-provider reconciliation (Epic 18);
- versioned rubrics/review corrections or organization-route visual promotion (Epic 19).

`submission_drafts` may continue on the existing compatibility path in this story. Do not reinterpret its schema or absorb Epic 18 into this work.

## Acceptance Criteria

1. **Tenant-scoped relational repositories**
   - Given `DATABASE_URL` is configured and the launch-slice schema is migrated,
   - when a supported Workspace read or command is executed,
   - then it goes through typed relational repository/transaction interfaces rather than loading, mutating, or diffing a process-wide `WorkspaceStore`,
   - and every organization-owned query derives the tenant through the full FK chain and includes the authorized `organizationId` in the query boundary,
   - and an identifier from another tenant returns the existing safe not-found/forbidden contract without revealing whether that row exists.

2. **Atomic aggregate mutations**
   - Given a launch-slice command changes one or more domain rows,
   - when it succeeds,
   - then the business rows, derived state, append-only audit event, and required outbox event commit in one explicit Postgres transaction,
   - and any failure rolls back all of them,
   - including at minimum: create/publish/close Open Call, create/update Form, finalize Submission with one-or-more Works, withdraw Submission, create/complete Review work, record/correct/remove Work Decision with derived Submission status, and create/update DeliveryTask.

3. **Row-level optimistic concurrency**
   - Given an updateable launch-slice aggregate was read at revision `N`,
   - when a client submits a command with `expectedRevision: N`,
   - then the repository performs a conditional update (`WHERE id = ? AND revision = ?`) and increments the revision exactly once,
   - and a stale/missing revision changes no rows or side effects and returns a typed `WorkspaceConflictError` containing safe `resourceType`, `resourceId`, `expectedRevision`, and `currentRevision` fields,
   - and `apps/web` maps that error to HTTP `409` with an actionable refresh/retry response rather than silently rebasing or retrying a same-row write.

4. **Idempotent command results**
   - Given a supported mutation has a caller-provided, non-secret `idempotencyKey`, an authenticated actor, an organization tenant (or submitter owner for Submission finalization/withdrawal), and a stable command type,
   - when the same request is retried,
   - then a database uniqueness constraint identifies the prior command, the original typed result/receipt is returned, and no duplicate domain row, audit event, or outbox event is produced,
   - and reuse of the same key with a different request identity/payload hash fails explicitly without returning private prior payload data.

5. **Append-only audit and outbox**
   - Given a supported mutation commits,
   - when its durable effects are inspected,
   - then `audit_events` records actor, tenant, action, target, safe metadata, and timestamp without update/delete behavior,
   - and `outbox_events` records the domain fact needed by downstream workers in the same transaction with a deterministic aggregate/event identity,
   - and neither payload contains answers, review notes, private file URLs, provider secrets, or raw private content unless a later explicitly versioned contract requires it.

6. **Relational read parity for the launch slice**
   - Given representative compatibility-store fixtures and a relational backfill of the same launch-slice records,
   - when the reconciliation command/report compares organization-scoped counts, IDs, relationships, statuses, Work-level decisions, derived Submission summaries, review completion, and Delivery states,
   - then it reports deterministic match/mismatch totals and opaque record identifiers only,
   - writes a machine-readable artifact suitable for Story 16.3's cutover gate,
   - and never emits answers, review notes, private file URLs, email addresses, or provider metadata.

7. **Bounded rollback compatibility**
   - Given this story ships before Story 16.3,
   - when relational authority is disabled using the documented server-only feature switch,
   - then the existing compatibility engine can still read/write the pre-cutover path without destructive conversion,
   - while relational mode never silently falls back after a transaction, authorization, schema, or conflict failure,
   - and the active authority is observable in logs/health output without secrets.

8. **Concurrency, isolation, and failure evidence**
   - Given a disposable real Postgres database,
   - when automated tests run concurrent different-row and same-row commands across separate pools/process-like engine instances,
   - then different rows converge without global advisory serialization, same-row stale writes produce exactly one success and one conflict, duplicate idempotency keys produce one durable result, tenant-crossing reads/mutations disclose nothing, and injected failures prove transaction rollback,
   - and existing Workspace unit/API behavior for the scoped chain remains green.

## Tasks / Subtasks

- [x] Task 1: Define the relational command/repository contracts and conflict vocabulary (AC: 1-4, 7)
  - [x] Add typed repository ports for the launch-slice aggregate reads and mutations; keep PostgreSQL/Drizzle types out of domain-facing interfaces.
  - [x] Add a request envelope carrying actor, tenant/owner scope, command type, idempotency key, expected revision where applicable, and correlation/causation identifiers.
  - [x] Add typed `WorkspaceConflictError`, idempotency-reuse error, tenant-safe not-found behavior, and a transaction runner abstraction.
  - [x] Keep the dependency direction `apps/web -> @missa/workspace-engine -> @missa/db`; never import Workspace from Radar.

- [x] Task 2: Add additive authoritative schema and migration (AC: 1-5, 7)
  - [x] Extend the existing Workspace tables in `packages/db/src/schema.ts` with `revision >= 1` and `updated_at` where absent; add the indexes/constraints required for tenant-scoped traversal and conditional updates.
  - [x] Add a Workspace command/idempotency receipt table keyed by tenant/owner + actor + command type + idempotency key, storing request identity/hash and a bounded typed result envelope.
  - [x] Reuse `audit_events` and `outbox_events`; add only the columns/indexes/constraints necessary to make tenant/correlation/event identity explicit. Do not create parallel Workspace-only audit/outbox mechanisms.
  - [x] Generate/register the next `@missa/db` Drizzle migration; do not add runtime DDL for the new authority path to `postgresSchema.ts`.
  - [x] Keep the migration additive and compatible with existing rows (`revision` backfilled/defaulted to `1`); no table drops, renames, snapshot deletion, or destructive type reinterpretation.

- [x] Task 3: Implement Postgres repositories and explicit transaction runner (AC: 1-5)
  - [x] Implement organization-scoped repositories for Team/Program/OpenCall/Form and traversal helpers that bind every owned row to `organizationId` in SQL.
  - [x] Implement Submission/Work, Review, Decision, and Delivery repositories for the existing chain, including owner-scoped applicant operations and organization-scoped operator operations.
  - [x] Use conditional row updates plus `RETURNING`/affected-row checks for optimistic concurrency; use row locks only where a multi-row invariant requires them.
  - [x] Persist each domain mutation, derived Submission status, audit event, outbox event, and idempotency receipt in the same transaction.
  - [x] Do not use the global `missa.workspace.snapshot` advisory lock, read-whole `loadStoreFromPostgres`, JSON snapshot comparison, or automatic rebase for relational-mode commands.

- [x] Task 4: Add a relational Workspace production facade without breaking local/demo behavior (AC: 1-4, 7)
  - [x] Introduce a production command/query facade that preserves current domain rules but operates on repositories rather than `WorkspaceEngine.store`.
  - [x] Make authority selection explicit and server-only (suggested name: `MISSA_WORKSPACE_RELATIONAL_AUTHORITY=1`); relational mode requires `DATABASE_URL` and fails closed if its schema is unavailable.
  - [x] Retain the compatibility engine as a documented rollback input until Story 16.3. Do not dual-write silently and do not delete `WorkspaceStore`, `postgresStore.ts`, or `postgresSchema.ts` in this story.
  - [x] Export the new interfaces/factory through `packages/workspace-engine/src/index.ts` without exposing raw pool clients to route code.

- [x] Task 5: Move the supported launch-slice API boundary off mutable `.store` access (AC: 1-4, 7)
  - [x] Update `apps/web/lib/workspaceEngine.ts` (or add a narrowly named sibling) so relational-mode route handlers receive typed queries/commands and no longer require `persistWorkspace()` after mutation.
  - [x] Update only the API routes needed for the scoped hosted-submission chain. Preserve their existing authentication, authorization, validation, safe error shape, and demo-mode behavior.
  - [x] Map typed optimistic conflicts to HTTP `409`; map idempotent replay to the original successful response; never retry a same-row conflict automatically.
  - [x] Page migration/polish is not part of this story. Where current server pages read `.store`, provide typed relational query adapters needed to preserve their existing output, or leave them on the explicit compatibility mode until their promotion story; document every remaining direct `.store` consumer for Story 16.3.

- [x] Task 6: Build a privacy-safe parity report and rollback inventory (AC: 6-7)
  - [x] Add a deterministic reconciliation module/CLI that compares only the scoped chain and returns counts, opaque IDs, relationship integrity, status/summary parity, and mismatch reason codes.
  - [x] Add fixtures/backfill helpers needed to load representative compatibility state into the additive relational model; do not mutate a shared or production database.
  - [x] Record remaining compatibility-only tables, route/page consumers, authority switch behavior, and the exact handoff gates for Story 16.3.

- [x] Task 7: Prove behavior with focused and real-Postgres tests (AC: 1-8)
  - [x] Unit-test repository SQL boundaries, safe conflict payloads, idempotency identity mismatch, audit/outbox payload redaction, and derived Submission status.
  - [x] Integration-test one complete Team-to-Delivery happy path against a uniquely named disposable Postgres database.
  - [x] Run separate-client concurrency tests for different-row convergence, same-row conflict, duplicate command replay, decision/status invariants, and failure rollback.
  - [x] Test tenant isolation at every organization-owned resource level plus submitter-owner isolation for Submission operations.
  - [x] Verify compatibility mode still passes existing Workspace tests and relational mode fails closed when its migration/schema is absent.
  - [x] Run `npm run test --workspace=@missa/workspace-engine`, `npm run test --workspace=@missa/db`, affected `apps/web` route tests, TypeScript, and lint; report focused results separately from full-repository or production certification.

## Dev Notes

### Current State (Read Before Editing)

- `packages/workspace-engine/src/engine.ts` is a synchronous in-memory facade. Commands mutate `Map` values in place; many reads traverse all maps; only some commands append audits. Preserve its domain invariants and use it as compatibility/test behavior, not as the relational repository implementation.
- `packages/workspace-engine/src/store/store.ts` owns a whole-domain `WorkspaceStore`. `cloneStore` exists only to calculate compatibility deltas. Do not extend this snapshot contract to implement relational authority.
- `packages/workspace-engine/src/productionEngine.ts` loads every Workspace row into memory at boot and exposes a manual `persist()` boundary. It catches a global snapshot conflict, rereads the snapshot version, and retries the local delta once. This can merge independent rows, but it does **not** prevent same-row last-writer-wins.
- `packages/workspace-engine/src/db/postgresStore.ts` contains compatibility `saveStoreToPostgres`, `saveStoreDeltaToPostgres`, and `loadStoreFromPostgres`. Delta upserts generally use unconditional `ON CONFLICT DO UPDATE`; a single `missa_snapshot_versions` row and advisory lock serialize persistence. Preserve these functions only for rollback/parity until Story 16.3.
- `packages/workspace-engine/src/db/postgresSchema.ts` is runtime compatibility DDL. The authoritative target schema and generated migration ledger are owned by `@missa/db`; do not add another authoritative schema source here.
- `packages/db/src/schema.ts` already defines typed Workspace tables plus shared `audit_events` and `outbox_events`. Extend these definitions and generate an additive migration rather than duplicating tables.
- `apps/web/lib/workspaceEngine.ts` returns the compatibility `WorkspaceEngine` and requires callers to invoke `persistWorkspace()`. Several routes/pages also read `.store` directly. The developer must inventory these consumers and move only the launch-slice command/query boundary needed by this story.
- `packages/workspace-engine/src/office/application.ts` and `packages/workspace-engine/test/office-application.test.ts` are untracked user work. They describe a future event-sourced Missa Office contract and are out of scope. Do not modify, move, export differently, or commit them as part of Story 16.1.

### Domain and Transaction Boundaries

- The atomic final-Submission command creates the Submission and at least one Work and records its audit/outbox/idempotency receipt together. It must never expose a Submission without its Works.
- A Decision attaches to a Work. Recording/correcting/removing it and refreshing the parent Submission summary is one transaction.
- A DeliveryTask can exist only for an accepted Work. Invariant checks and insertion/update occur in one transaction.
- A ReviewAssignment must bind a Submission and ReviewRound belonging to the same Open Call; validate inside the transaction against tenant-scoped rows.
- Do not move network/provider calls inside database transactions. Commit an outbox intent; workers/provider reconciliation are later concerns.
- Prefer short Read Committed transactions with conditional updates and narrowly scoped `SELECT ... FOR UPDATE` for multi-row invariants. If Serializable is introduced for a particular operation, retry the **whole transaction** only for documented SQLSTATE `40001`, with a strict bound; never translate a business revision conflict into an automatic retry.

### Idempotency Contract

- Identity must include tenant/owner scope, actor, command type, and idempotency key. Store a stable request identity/hash so the same key cannot be reused for different semantics.
- The result envelope must be sufficient to return the original resource/revision/receipt but must not duplicate private answers, review text, file URLs, or secrets.
- The domain insert/update, audit row, outbox row, and receipt must commit together. A unique violation should resolve to an exact replay or explicit identity mismatch, never an unconditional last-write update.

### Migration and Rollback Constraints

- `@missa/db` is the sole Drizzle migration owner. The current journal runs through `0029_governed_operations.sql`; generate the next ordered migration through the package tooling and update the journal/schema tests together.
- Do not apply or rehearse this migration against a shared or production database in this story. Use a uniquely named disposable database/branch and validate the exact target before any cleanup.
- Additive expand/backfill only: retain compatibility columns/tables and runtime paths. Story 16.3 owns production cutover, drift quarantine, fallback removal, and compatibility retirement.
- Relational mode must never silently fall back because a query, schema, or authorization check failed; the explicit authority switch is the only rollback selector.

### Likely File Boundaries

**Expected new files (names may vary while preserving these boundaries):**

- `packages/workspace-engine/src/repositories/contracts.ts`
- `packages/workspace-engine/src/repositories/postgres/*.ts`
- `packages/workspace-engine/src/relationalWorkspace.ts`
- `packages/workspace-engine/src/errors.ts`
- `packages/workspace-engine/src/reconciliation/workspaceParity.ts`
- `packages/workspace-engine/test/relational-*.test.ts`
- `packages/db/migrations/0030_*.sql` (or the next number generated from the current journal)

**Expected updates:**

- `packages/db/src/schema.ts`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/test/schema.test.ts`
- `packages/workspace-engine/src/index.ts`
- `packages/workspace-engine/package.json` only if a required workspace dependency/script changes
- `apps/web/lib/workspaceEngine.ts` and the scoped launch-slice route handlers/tests
- `packages/db/README.md` or a focused cutover note documenting the authority switch and Story 16.3 handoff

**Preserve unless a proven compatibility fix is required:**

- `packages/workspace-engine/src/db/postgresStore.ts`
- `packages/workspace-engine/src/db/postgresSchema.ts`
- `packages/workspace-engine/src/store/store.ts`
- `packages/workspace-engine/src/productionEngine.ts`
- all untracked Office, recommendation, ingestion, taxonomy, and homepage files

### Testing Requirements

- Use `node:test`/`node:assert` for Workspace and DB package tests, matching existing package conventions.
- Fake-pool SQL-shape tests are useful but do not satisfy concurrency or transaction acceptance criteria. Retain evidence from a disposable real Postgres run.
- At minimum, the real-Postgres suite must prove:
  1. two independent-row commands both survive;
  2. two updates at revision `N` yield one commit and one typed conflict;
  3. two simultaneous identical idempotent commands yield one domain/audit/outbox/result set;
  4. the same key with a changed request identity is rejected;
  5. a forced error after a domain write leaves no domain/audit/outbox/receipt rows;
  6. cross-tenant IDs cannot be read, updated, or distinguished;
  7. Work decisions and parent Submission summary remain transactionally consistent.
- Use privacy-safe fixtures. Failure logs and parity artifacts must not contain answers, notes, email addresses, private Blob URLs, credentials, or provider payloads.

### Preservation Warnings

- The working tree contains substantial unrelated user work in recommendation, ingestion, Radar, taxonomy, homepage-future, and Missa Office files. Inspect `git status` before and after every edit and stage only Story 16.1 files.
- `packages/workspace-engine/src/index.ts` is already modified by untracked/dirty Missa Office work. Patch it surgically; do not overwrite or reformat unrelated exports.
- Do not claim production authority, migration deployment, provider success, or full end-to-end readiness from local/unit/disposable-database evidence. This story produces a cutover candidate; Stories 16.3 and 21 own activation and certification.

### Latest Technical Notes

- PostgreSQL's current transaction-isolation guidance says business rules under Read Committed require deliberate locking/conditional-write design; Serializable failures use SQLSTATE `40001` and require retrying the complete transaction. Keep transactions small and make any retry policy explicit. [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- PostgreSQL row locks are held until transaction end and block competing writers/lockers, not ordinary readers. Use them only around invariants that span rows; row revision checks should remain the normal optimistic path. [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- `INSERT ... ON CONFLICT ... RETURNING` can return the actual inserted/updated row, but a conditional conflict update that does not satisfy its `WHERE` condition returns no row. Use that behavior to distinguish exact replay from conflicting identity, not to overwrite mismatched commands. [PostgreSQL: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)

### References

- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-28.md` — Issue summary, recommended approach, Epic 16]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 16, Story 16.1]
- [Source: `ONBOARDING.md` — Data and persistence]
- [Source: `_bmad-output/planning-artifacts/prd/functional-requirements.md` — FR40-FR49]
- [Source: `_bmad-output/planning-artifacts/prd/user-journeys.md` — organization admin and reviewer journeys]
- [Source: `_bmad-output/planning-artifacts/prd/non-functional-requirements.md` — security, scalability, compliance and trust]
- [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — data architecture, authentication/security, API patterns]
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` — naming, structure, tests]
- [Source: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — package/API/data boundaries]
- [Source: `packages/workspace-engine/src/engine.ts` — current domain commands and invariants]
- [Source: `packages/workspace-engine/src/productionEngine.ts` — compatibility production construction and retry]
- [Source: `packages/workspace-engine/src/db/postgresStore.ts` — snapshot/delta persistence]
- [Source: `packages/workspace-engine/src/db/postgresSchema.ts` — compatibility runtime DDL]
- [Source: `packages/db/src/schema.ts` — target Workspace, audit, and outbox schema]
- [Source: `apps/web/lib/workspaceEngine.ts` — web compatibility-engine boundary]

## Dev Agent Record

### Agent Model Used

GPT-5.6 Codex (replacement developer, team-respawn)

### Debug Log References

- Audited the predecessor's partial diff instead of trusting it. Found and repaired missing `revision >= 1` constraints, missing `review_assignments.updated_at`, an owner-envelope impersonation gap, unscoped unpublished Form finalization, and a concurrent Work-decision race that could leave the parent Submission summary stale.
- Added the scoped relational API branches after the first draft had only a helper that made all organization routes fail closed under the authority switch.
- Disposable database discovery found the working `.env.local` Neon connection and the prior Epic 15 certification pattern. The exact creation script was reconstructed with a validated `missa_story_16_1_*` name and active-database guard, but this agent's sandbox could not resolve the Neon hostname (`ENOTFOUND`) before any database was created. The shared `neondb` database was not mutated.
- Root `node_modules` disappeared during shared-worktree validation; restored deterministically with `npm ci --ignore-scripts`. No source or lockfile changes were made by that restore.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story creation evidence is repository and official PostgreSQL documentation only; no production mutation or deployment was performed.
- Added additive migration 0030, scoped command receipts, revisions, shared audit/outbox correlation, relational transaction facade, safe typed errors, deterministic request hashing, explicit authority health/fail-closed behavior, backfill/parity helpers, and the Story 16.3 rollback inventory.
- Relational API branches now cover Team, Program, Open Call create/list/publish/close, Form create/update, Review Round create/list, assignment create/list/complete, Decision record/correct, Delivery create/update, hosted Submission finalize, and owner Submission detail/withdraw. Compatibility/demo behavior remains selected only when the server authority switch is off.
- Decision commands lock the parent Submission before reading/changing Work decisions, so different Work decisions cannot race the derived packet status. Decision correction/removal refuses to invalidate an existing DeliveryTask.
- Focused validation: Workspace 46 passed, 2 skipped (the compatibility and Story 16.1 real-Postgres cases); DB 15 passed; web relational-boundary tests 2 passed; root web TypeScript passed; root web ESLint passed; `git diff --check` passed.
- **Blocker:** AC 8 remains unproven because the real-Postgres suite could not reach Neon from this sandbox. The test is retained and guarded to accept only a `missa_story_16_1_*` database. Do not move this story to review until migration 0030 and that suite pass on a disposable target.
- No production database, migration ledger, deployment, or provider was mutated. Local evidence is not production certification.
- Review fix round 1 preserves `answers`, `category`, Work `fileUrl`/`fileUrls`, payment status/session/fee, and the bounded caller idempotency key in the relational transaction. Audit/outbox metadata remains limited to revision and Work count.
- `WorkspaceCommandResult.replayed` now distinguishes a newly committed command from a receipt replay. Relational create routes return `201` only for new resources and `200` for replays; mutation routes expose `idempotent`. Submission/decision Radar projections are retried using their existing deduplication/status idempotency, so an earlier post-commit persistence failure can recover without duplicate creator effects.
- The decision route now reads tenant-scoped creator context after the relational commit, then preserves the existing creator alert and Tracker projection outside the database transaction.
- Focused route validation from `apps/web` with `NODE_OPTIONS='--conditions=react-server'`: 5 passed across `workspaceEngine.test.ts`, `workspaceRelationalSubmissionRoute.test.ts`, and `workspaceRelationalDecisionRoute.test.ts`.
- Review-round validation: Workspace 46 passed, 2 skipped (real Postgres); DB 15 passed; web TypeScript and ESLint passed. The retained disposable-Postgres test now uses the owner as actor and asserts all private application/payment fields, but was not claimed because no disposable URL was supplied to this process.
- Review fix round 2 suppresses Submission and Decision Radar projections for exact relational command replays. The original `200`/`idempotent: true` response remains intact, while a newer creator Tracker status and its history are no longer overwritten or extended by a replay.
- Round 2 direct-route evidence: 5/5 passed across `workspaceEngine.test.ts`, `workspaceRelationalSubmissionRoute.test.ts`, and `workspaceRelationalDecisionRoute.test.ts`; both projection tests assert creator alert counts and Tracker event counts remain unchanged across replay.
- Round 2 package/quality evidence: Workspace 46 passed, 2 skipped (real Postgres); DB 15/15 passed; web TypeScript passed; web ESLint passed; `git diff --check` passed. Status remains blocked only on the disposable real-Postgres integration/concurrency gate.
- 2026-08-30 real-Postgres closure: created only guarded `missa_story_16_1_*` databases, replayed the effective schema from zero through migration 0030, and passed the guarded Team-to-Delivery suite with separate pools. The run proved independent-row convergence, one-success/one-conflict same-row writes, exact command replay and mismatch rejection, tenant-safe reads, private payload retention, derived decision status, and injected transaction rollback.
- Clean migration rehearsal exposed and fixed two production-candidate defects: migration 0030 declared duplicate revision checks for newly created Decision and Delivery tables, and relational Work `file_urls` values were sent as PostgreSQL arrays rather than JSONB. The target-schema replay now includes the registered 0018-0030 dependency tail, with DB regression assertions.
- Validation after fixes: clean target replay applied 35 ordered SQL files and produced 95 public tables; relational Workspace suite passed 47/47 with only the separately tested compatibility case skipped; compatibility real-Postgres round-trip passed 1/1; DB passed 16/16; affected web routes passed 5/5; web TypeScript, ESLint, and `git diff --check` passed.
- Repository-wide regression boundary: Contracts 12/12, Taxonomy 10/10, DB 16/16, and Radar Engine 152/152 passed. Radar Adapters had one unrelated date-sensitive Sundance discovery failure (`Sundance deadlines emits current official application cards`: expected one current card, received none). No Story 16.1 file touches that adapter. Status remains blocked under the workflow's full-suite gate rather than claiming all-repository green.
- 2026-08-30 completion rerun: made the Sundance adapter fixture independent of the wall clock while retaining production expiry filtering. The affected file passed 9/9, and the complete repository package chain passed: Contracts 12/12, Taxonomy 10/10, DB 16/16, Radar Engine 152/152, Radar Adapters 163/163 with 2 intentional skips, Ingestion 68/68 with 1 intentional skip, and Workspace 46/46 with 2 database-gated skips. Web TypeScript, ESLint, and `git diff --check` also passed. Story 16.1 is ready for review; this remains a local/disposable-database cutover candidate, not production activation.

### File List

- `_bmad-output/implementation-artifacts/16-1-workspace-relational-repositories-and-transactional-writes.md`
- `apps/web/app/api/me/submissions/[submissionId]/route.ts`
- `apps/web/app/api/me/submissions/[submissionId]/withdraw/route.ts`
- `apps/web/app/api/orgs/[id]/delivery-tasks/[taskId]/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/publish/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/review-rounds/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/submission-paths/route.ts`
- `apps/web/app/api/orgs/[id]/open-calls/route.ts`
- `apps/web/app/api/orgs/[id]/review-rounds/[roundId]/assign/route.ts`
- `apps/web/app/api/orgs/[id]/teams/[entityId]/programs/route.ts`
- `apps/web/app/api/orgs/[id]/teams/route.ts`
- `apps/web/app/api/orgs/[id]/works/[workId]/decision/route.ts`
- `apps/web/app/api/orgs/[id]/works/[workId]/delivery-tasks/route.ts`
- `apps/web/app/api/reviewer/assignments/[assignmentId]/review/route.ts`
- `apps/web/app/api/reviewer/assignments/route.ts`
- `apps/web/app/api/submission-paths/[pathId]/submit/route.ts`
- `apps/web/lib/organizationAccess.ts`
- `apps/web/lib/workspaceEngine.test.ts`
- `apps/web/lib/workspaceRelationalDecisionRoute.test.ts`
- `apps/web/lib/workspaceRelationalSubmissionRoute.test.ts`
- `apps/web/lib/workspaceEngine.ts`
- `docs/workspace-relational-authority.md`
- `packages/db/migrations/0030_workspace_relational_authority.sql`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/src/schema.ts`
- `packages/db/test/schema.test.ts`
- `packages/radar-adapters/test/machineDiscoveryAdapters.test.ts`
- `scripts/apply-target-schema.mjs`
- `packages/workspace-engine/src/errors.ts`
- `packages/workspace-engine/src/reconciliation/workspaceParity.ts`
- `packages/workspace-engine/src/relationalWorkspace.ts`
- `packages/workspace-engine/src/repositories/contracts.ts`
- `packages/workspace-engine/src/repositories/postgres/transactionRunner.ts`
- `packages/workspace-engine/test/relational-postgres.test.ts`
- `packages/workspace-engine/test/postgres-integration.test.ts`
- `packages/workspace-engine/test/relational-workspace.test.ts`
- `packages/workspace-engine/src/index.ts` — Story 16.1 adds relational exports only; pre-existing untracked Missa Office exports in the same dirty file were preserved and are not claimed by this story.

### Change Log

- 2026-08-28: Implemented and locally validated the Story 16.1 relational authority candidate; left blocked pending the mandatory disposable-real-Postgres migration/concurrency run.
- 2026-08-28: Applied code-review fixes for payload retention, truthful replay semantics, creator decision projections, route regressions, and the disposable-Postgres owner fixture; status remains blocked only on the real-Postgres gate.
- 2026-08-28: Addressed code review round 2 by suppressing all relational-replay Radar side effects and proving stable creator alert/Tracker-event counts; status remains blocked only on the real-Postgres gate.
- 2026-08-30: Closed the disposable-real-Postgres acceptance gate, repaired clean-schema replay, duplicate migration checks, JSONB Work file serialization, and compatibility fixture setup; retained blocked status solely because the repository-wide run has one unrelated date-sensitive Radar Adapter failure.
- 2026-08-30: Stabilized the date-sensitive Sundance fixture, completed the all-package regression and static-quality gates, and moved Story 16.1 to review.
- 2026-08-30: Applied all independent-review patches, expanded the guarded real-Postgres suite through Review and Delivery, passed the full repository regression, and closed Story 16.1 as a local/disposable-database cutover candidate. Production activation remains Story 16.3.

## QA Results

### Independent functional validation — 2026-08-28

VALIDATION: PARTIAL

- Mode: full (Epic 16 has three stories).
- Project type: full-stack Next.js monorepo with API routes and PostgreSQL data layer.
- Build: PASS.
  - `npm run build --workspace=@missa/db`
  - `npm run build --workspace=@missa/workspace-engine`
  - `npm run build --workspace=@missa/web`
  - The production Next.js build compiled, type-checked, generated 202 static pages, and completed with exit code 0.
- Focused package behavior: PASS.
  - `npm test --workspace=@missa/workspace-engine`: 46 passed, 0 failed, 2 skipped. The skipped cases were the pre-existing compatibility real-Postgres case and the guarded Story 16.1 real-Postgres case because no disposable URL was supplied to that local package run.
  - `npm test --workspace=@missa/db`: 15 passed, 0 failed.
- Direct route behavior: PASS.
  - `cd apps/web && NODE_OPTIONS='--conditions=react-server' node --import tsx --test lib/workspaceEngine.test.ts lib/workspaceRelationalSubmissionRoute.test.ts lib/workspaceRelationalDecisionRoute.test.ts`: 5 passed, 0 failed.
  - Evidence covers stable request identity, required idempotency keys, safe `409` conflicts, private submission payload retention, new-versus-replay response semantics, tenant-safe `404`, creator alert/Tracker projection, and suppression of replay side effects.
  - A first diagnostic invocation with bare `node --test` failed to resolve TypeScript extensionless imports and `@/lib`; rerunning with the repository-compatible `node --import tsx --test` loader passed. This was a runner mismatch, not an application failure.
- Quality gates: PASS.
  - `npm run typecheck --workspace=@missa/web`: exit 0.
  - `npm run lint --workspace=@missa/web`: exit 0.
  - `git diff --check`: exit 0.
- Runtime HTTP smoke: SKIPPED by sandbox boundary.
  - `MISSA_WORKSPACE_RELATIONAL_AUTHORITY=1` with `DATABASE_URL` removed was used for the attempted startup.
  - `next start --port 3211` could not bind a loopback listener in this validator sandbox (`listen EPERM 0.0.0.0:3211`), so no real HTTP request was issued. Direct route tests exercised the relevant route handlers and fail-safe response mapping without opening a socket.
- Disposable PostgreSQL migration/concurrency gate: SKIPPED after a guarded real attempt; this is the blocking gap.
  - `.env.local` exposes a configured `DATABASE_URL`; no secret value was printed.
  - The validator derived and validated the unique target `missa_story_16_1_20260828152513`, required the `missa_story_16_1_*` pattern, verified that the active URL did not name a disposable target, and attempted a read-only identity query before creation.
  - DNS resolution failed with `getaddrinfo ENOTFOUND ep-restless-shadow-at3y7bdv-pooler.c-9.us-east-1.aws.neon.tech` before the identity query or `CREATE DATABASE` executed.
  - No disposable database was created or left behind. Migration 0030 was not applied to active/shared `neondb`; no active/shared database row or provider state was mutated.
  - Therefore AC 8's zero-to-0030 replay, separate-pool concurrency, tenant isolation, idempotent duplicate convergence, transactional rollback, and Team-to-Delivery real-database proof remain unverified by this independent run.
- Cross-cutting checks (informational, non-blocking):
  - `npm audit --omit=dev --json` could not reach the npm advisory endpoint because DNS is blocked; no vulnerability count is claimed.
  - `gitleaks` and Docker are unavailable on this host, so secret-scanner and image/container checks were not run.
  - Built `.next` directory size: 209 MB. No Story 16.1-specific performance regression baseline exists.
  - Accessibility was not rerun because Story 16.1 promotes no UI and the sandbox could not start the frontend; this does not replace the later route-promotion accessibility gate.

Verdict rationale: local build, typed route behavior, compatibility behavior, and static quality gates pass, but full validation cannot be marked PASS until migration 0030 and `packages/workspace-engine/test/relational-postgres.test.ts` pass against a uniquely named disposable PostgreSQL database from a network-enabled runner. Story status should remain `blocked`.

### Review Findings

- [x] [Review][Patch] Preserve the complete hosted-submission payload in relational mode: the current branch drops normalized answers, category, Work file URLs, payment session ID, and fee amount even though the compatibility command persists them, causing irreversible application-data loss when authority is enabled. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:85]
- [x] [Review][Patch][Round 2] Suppress all post-commit Radar side effects on relational replay: the response now reports replay truthfully, but both Submission and Decision routes still execute alert/Tracker projection code for `replayed: true`; alert dedup masks one effect while repeated `setMyStatus` can append duplicate status events. Add assertions for alert and Tracker-event counts across replay. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:101]
- [x] [Review][Patch] Correct the retained real-Postgres owner test before certification: its submission envelope keeps `actorAccountId` set to the organization actor while setting a different `ownerAccountId`, so the implemented anti-impersonation guard will reject the test before the Team-to-Delivery assertions run. [`packages/workspace-engine/test/relational-postgres.test.ts`:45]
- [x] [Review][Patch] Add route-level regression coverage for the relational launch slice, including submission payload preservation, tenant-safe 404/409 behavior, required idempotency/revision errors, and creator-visible decision side effects; the current two web tests cover only envelope/error helpers while 16 API handlers changed behavior. [`apps/web/lib/workspaceEngine.test.ts`:6]
- [x] [Review][Patch] Preserve the existing creator decision notification/Tracker projection or retain an explicit non-promotable gate: the relational decision branch returns immediately after the Workspace transaction and skips the Radar alert/status side effects performed by the compatibility branch, while the emitted outbox payload lacks the submitter/opportunity references needed to reproduce them. [`apps/web/app/api/orgs/[id]/works/[workId]/decision/route.ts`:15]

#### Independent review — 2026-08-30

- [x] [Review][Patch] Serialize Form `categories` and `fields` as JSON before PostgreSQL writes; direct JavaScript arrays are encoded as PostgreSQL array literals and corrupt the intended JSONB shape. [`packages/workspace-engine/src/relationalWorkspace.ts`:241]
- [x] [Review][Patch] Separate organization authentication/membership from compatibility Workspace scope construction so relational routes never load the process-wide `WorkspaceStore`. [`apps/web/lib/organizationAccess.ts`:51]
- [x] [Review][Patch] Complete the mandatory disposable-Postgres proof with the full ReviewRound/Assignment/Recommendation chain, simultaneous duplicate commands, and read/mutation isolation at every resource level. [`packages/workspace-engine/test/relational-postgres.test.ts`:25]
- [x] [Review][Patch] Compare every scoped parent relationship during reconciliation, including Entity, Program, SubmissionPath, and Work edges. [`packages/workspace-engine/src/reconciliation/workspaceParity.ts`:31]
- [x] [Review][Patch] Bind SubmissionPath updates to both the tenant and the Open Call named in the route hierarchy. [`packages/workspace-engine/src/relationalWorkspace.ts`:247]
- [x] [Review][Patch] Reject post-completion recommendation overwrites; versioned review corrections belong to Epic 19. [`packages/workspace-engine/src/relationalWorkspace.ts`:326]
- [x] [Review][Patch] Expose the implemented idempotent, revision-checked Work Decision removal through the supported API boundary. [`apps/web/app/api/orgs/[id]/works/[workId]/decision/route.ts`:9]
- [x] [Review][Patch] Validate Submission `fileUrl` and `fileUrls` container and element types before ownership checks or persistence. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:44]
- [x] [Review][Patch] Make Submission Radar/Tracker projection independently retryable after the relational transaction commits; an idempotent command replay currently suppresses a previously failed projection forever. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:100]
- [x] [Review][Patch] Make Decision notification/Tracker projection independently retryable after commit for the same split-brain failure case. [`apps/web/app/api/orgs/[id]/works/[workId]/decision/route.ts`:23]
- [x] [Review][Patch] Verify Stripe session amount and currency and atomically enforce one-payment-session-per-submission before accepting payment proof. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:75]
- [x] [Review][Patch] Lock or conditionally guard the parent Open Call during Submission finalization so closure cannot race the published-status check. [`packages/workspace-engine/src/relationalWorkspace.ts`:267]
- [x] [Review][Patch] Reject Work Decisions for withdrawn Submissions while holding the Submission lock. [`packages/workspace-engine/src/relationalWorkspace.ts`:342]
- [x] [Review][Patch] Include normalized optimistic preconditions in the idempotency request identity so a changed `If-Match` cannot replay an earlier success. [`apps/web/lib/workspaceEngine.ts`:44]
- [x] [Review][Patch] Reject idempotency keys longer than 200 characters instead of silently truncating and colliding them. [`apps/web/lib/workspaceEngine.ts`:41]
- [x] [Review][Patch] Bound `expectedRevision` to a positive JavaScript-safe PostgreSQL integer before sending it to the database. [`apps/web/lib/workspaceEngine.ts`:45]
- [x] [Review][Patch] Map tenant-safe not-found and known database failures consistently, log unknown failures server-side, and never return raw database messages. [`apps/web/lib/workspaceEngine.ts`:59]
- [x] [Review][Patch] Clear a rejected relational-workspace initialization promise so transient database failures can recover without a process restart. [`apps/web/lib/workspaceEngine.ts`:20]
- [x] [Review][Patch] Preserve the original transaction error if rollback itself fails. [`packages/workspace-engine/src/repositories/postgres/transactionRunner.ts`:14]
- [x] [Review][Patch] Update the relational withdrawal path to emit a replay-safe Tracker projection matching the existing behavior. [`apps/web/app/api/me/submissions/[submissionId]/withdraw/route.ts`:11]
- [x] [Review][Patch] Return the committed Work rows from relational Submission finalization rather than echoing incomplete request payloads. [`apps/web/app/api/submission-paths/[pathId]/submit/route.ts`:116]
- [x] [Review][Patch] Apply the domain Form validator before relational writes and preserve the existing taxonomy assignment contract. [`apps/web/app/api/orgs/[id]/open-calls/[openCallId]/submission-paths/route.ts`:16]
- [x] [Review][Patch] Derive and persist organization identity for owner-scoped Submission audit/outbox events instead of recording a null tenant. [`packages/workspace-engine/src/relationalWorkspace.ts`:256]
- [x] [Review][Patch] Make withdrawal a one-way transition from explicitly withdrawable states so fresh keys cannot repeatedly increment revision and duplicate events. [`packages/workspace-engine/src/relationalWorkspace.ts`:287]
- [x] [Review][Patch] Compute or verify canonical command identity from actual repository inputs instead of trusting a caller-supplied hash. [`packages/workspace-engine/src/relationalWorkspace.ts`:167]
- [x] [Review][Patch] Expand relational health checks beyond one receipt table to the registered migration and required launch-slice relations, columns, and constraints. [`packages/workspace-engine/src/relationalWorkspace.ts`:53]
- [x] [Review][Patch] Align the relational-authority runbook with the Radar/Tracker effects the promoted routes actually perform and must replay. [`docs/workspace-relational-authority.md`:44]
