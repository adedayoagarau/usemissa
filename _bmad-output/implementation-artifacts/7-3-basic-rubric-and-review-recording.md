---
epic: 7
story: 7.3
status: done
---

# Story 7.3: Basic rubric and review recording

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.recordReview(reviewAssignmentId, score?, notes?)` — fixed rubric (numeric score + free-text notes), explicitly not a rubric builder per the AC's MVP scope. Marks the `ReviewAssignment.completedAt`.
- `apps/web/app/api/reviewer/assignments/route.ts` (GET, the reviewer's own dashboard data) and `.../assignments/[assignmentId]/review/route.ts` (POST, record) — enforces `assignment.reviewerAccountId === session.account.id`, so a reviewer can only record their own reviews.
- `apps/web/app/(workspace)/reviewer/page.tsx` + `components/review-form.tsx` — "Your reviews" page, not organization-scoped in the URL since a reviewer can be assigned across multiple organizations.

**Verified in a real browser, full loop:** logged in as the assigned reviewer, `/reviewer` correctly showed the assignment ("My Fiction Piece") with the rubric form; filled score `8` and notes "Strong voice, recommend accept.", submitted; page updated in place to "Reviewed — score 8: Strong voice, recommend accept."; logged back in as the admin and confirmed the same recommendation is now visible on the Submission's detail view in the admin inbox ("reviewer1@example.com reviewed — score 8"), closing the loop from reviewer → admin visibility per the AC.

Epic 7 (Workspace — Admin Inbox & Review) is now fully done: all 3 stories complete and verified through a real browser session, not just API calls.
