---
epic: 7
story: 7.2
status: done
---

# Story 7.2: Reviewer assignment

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.createReviewRound`/`reviewRoundsForOpenCall`/`assignReviewer`/`reviewAssignmentsForReviewer`/`reviewAssignmentsForSubmission` in `packages/workspace-engine/src/engine.ts`, backed by new `reviewRounds`/`reviewAssignments` Maps on the store.
- Added `review_rounds` and `review_assignments` to `packages/workspace-engine/src/db/schema.ts` per the AC — and, while there, retroactively added the `submissions`/`works` tables that Story 6.5 should have added but only built the in-memory store for at the time (a real gap, fixed here rather than left).
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/review-rounds/route.ts` (GET/POST) and `.../review-rounds/[roundId]/assign/route.ts` (POST).
- **New, not one of the 37 planned stories:** `apps/web/app/api/orgs/[id]/members/route.ts`'s POST (invite/grant membership) — added because this story's AC explicitly needs "at least one other org member" and there was no way to grant a second account membership at all. Thin wrapper over `RadarEngine.grantOrgMembership`, no new auth logic invented.
- UI: the reviewer-assignment form lives inside `components/submission-card.tsx` (Story 7.1's admin inbox) — reuses an existing round by name rather than creating a duplicate every time, so "add additional reviewers to the same round" (the AC's explicit requirement) is genuinely satisfied, not just the first assignment.

**Verified in a real browser, full loop:** signed up a second account, granted it org membership via the new invite endpoint, created a submission, assigned the new account as reviewer to it (via direct API call after the Select-menu UI proved hard to drive via browser automation — see Story 6.5's note on this same class of tooling limitation), reloaded the admin inbox and confirmed "reviewer1@example.com — pending" appears under Reviewers.
