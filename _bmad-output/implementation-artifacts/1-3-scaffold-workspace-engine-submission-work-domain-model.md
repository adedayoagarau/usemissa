---
epic: 1
story: 1.3
status: done
---

# Story 1.3: Scaffold packages/workspace-engine with the Submission/Work domain *types*

As a developer,
I want the Entity/Program/OpenCall/SubmissionPath/Submission/Work TypeScript domain types decided and written down before any Workspace feature is built on top of them,
So that the item-level (Work) decision model is decided correctly from the start without front-loading every database table.

**Acceptance Criteria:** see `_bmad-output/planning-artifacts/epics.md` Epic 1 (as revised by the implementation-readiness check).

## Dev Agent Record

**Implementation:**
- `packages/workspace-engine/` — new package, `@missa/workspace-engine`, depends on `@missa/radar-engine` (one-way, verified by `scripts/check-package-boundaries.sh`).
- `src/domain/types.ts` — full domain as interfaces only (no Drizzle schema yet, per the readiness-check fix): `Entity`, `Program`, `OpenCall` (optional `radarOpportunityId`), `SubmissionPath` (+`SubmissionField`), `Submission`, `Work`, `ReviewRound`, `ReviewAssignment`, `ReviewRecommendation`, `Decision`, `DeliveryTask`. An inline ADR comment records why `Decision`/`DeliveryTask` attach to `Work`, not `Submission`.
- `test/domain.test.ts` — 3 tests: full chain construction (Entity→Program→OpenCall→SubmissionPath→Submission→Work), a compile-time check (`@ts-expect-error`) that `Decision` has no `submissionId` field (enforces the ADR), and ReviewRound/ReviewAssignment scoping.

**Gap found and fixed while implementing this story:** root `package.json`'s `build`/`test` scripts were hardcoded to only run `@missa/radar-engine` and `@missa/radar-adapters` (not a generic `--workspaces` flag, despite `"workspaces": ["packages/*"]` in the same file) — so the new package was silently skipped by both. Fixed by adding explicit `--workspace=@missa/workspace-engine` legs to both scripts.

**Verified:** `npm run build` and `npm test` from repo root now build/test all three packages (44 + 6 + 3 = 53 tests passing). `scripts/check-package-boundaries.sh` passes.

**Deviation from AC:** none beyond the readiness-check-driven scope change (types only, no schema.ts) already reflected in the epics.md AC text itself.
