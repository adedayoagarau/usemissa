---
epic: 1
story: 1.1
status: done
---

# Story 1.1: Add CI (build + test on every PR)

As a maintainer,
I want every PR to automatically install, build, and test the whole workspace,
So that a repeat of this session's silent three-branch divergence can't happen again.

**Acceptance Criteria:** see `_bmad-output/planning-artifacts/epics.md` Epic 1.

## Dev Agent Record

**Implementation:** `.github/workflows/ci.yml` — two jobs:
- `build-and-test`: install → build → test across all npm workspaces, plus `scripts/check-package-boundaries.sh` enforcing the one-way `radar-engine` ↛ `workspace-engine` dependency rule.
- `postgres-integration`: spins up a `postgres:16` service container and re-runs `radar-engine`'s test suite with `DATABASE_URL` set, exercising the Postgres-backed store path (prerequisite groundwork for Story 1.4).

**Verified:** `scripts/check-package-boundaries.sh` runs clean locally (no `workspace-engine` package exists yet, so trivially passes — will become meaningful once Story 1.3 lands). CI itself will validate on the next push/PR since GitHub Actions workflows only execute server-side.

**Deviation from AC:** none.
