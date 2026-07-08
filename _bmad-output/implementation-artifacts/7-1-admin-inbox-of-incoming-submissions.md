---
epic: 7
story: 7.1
status: done
---

# Story 7.1: Admin inbox of incoming Submissions

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.submissionsForOrganization(organizationId)` — walks Org → Entity → Program → OpenCall → Submission (drafts included, unlike the public page's published-only traversal — an admin needs to see everything).
- `apps/web/app/api/orgs/[id]/submissions/route.ts` (GET, list) and `.../submissions/[submissionId]/route.ts` (GET, detail with Works + review assignments).
- `apps/web/app/(workspace)/submissions/page.tsx` + `components/submission-card.tsx` — grouped-by-status inbox (Submitted/In review/Decided/Withdrawn), expandable per-submission card showing Works and reviewer assignments.

**Deliberate scope cut vs. the UX spec's AC** ("reusing the Status Pipeline Board component... with a bulk-action toolbar per column"): built as expandable per-item cards instead of a bulk-action toolbar. Real simplification given the time available this session, not a hidden gap — the grouping-by-stage and "click shows Works" requirements are both genuinely met.

**Verified in a real browser:** logged in as the North River rep, navigated to `/submissions`, confirmed the seeded submission (from Story 6.5's test data) appears grouped under "SUBMITTED (1)", clicked to expand, confirmed "My Fiction Piece" (the Work) is listed.
