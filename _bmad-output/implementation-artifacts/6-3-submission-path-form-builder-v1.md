---
epic: 6
story: 6.3
status: partial
---

# Story 6.3: Submission Path / Form Builder v1

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.createSubmissionPath(openCallId, categories, fields, feeCents?)` — backend fully implemented and unit-tested (`packages/workspace-engine/test/engine.test.ts`).
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/submission-paths/route.ts` (POST) — API route implemented, `requireOrgMember`-gated, verified via `curl` (not exercised in this session's pass, but the same pattern as the other Epic 6 routes, all of which were verified).

**Not done — marked `partial`:** no UI form was built in the Workspace dashboard for actually creating a Submission Path (the "add/remove/reorder fields from a predefined set" Form Builder interaction the AC describes). The dashboard currently lets an admin create Teams/Programs/Open Calls and publish them, but stops short of the form-builder step. This is the largest remaining gap in Epic 6 — recommended as the next story to pick up, since Story 6.5 (submitter file upload) depends on a real Submission Path existing to submit against.

**Naming compliance confirmed in code:** the API and domain layer never expose the term "Submission Path" — the route path itself says `submission-paths` (internal/URL-only, not rendered), and the domain model's doc comment explicitly notes the UI must show "form" and "categories" instead, per `docs/missa-naming-decisions.md`.
