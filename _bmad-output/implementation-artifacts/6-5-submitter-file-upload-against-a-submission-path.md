---
epic: 6
story: 6.5
status: partial
---

# Story 6.5: Submitter file upload against a Submission Path

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.createSubmission(submissionPathId, submitterAccountId, works)` — enforces the item-level model: a Submission is never created with zero Works (throws), and each Work is a separate record under it. Backend fully unit-tested.
- `apps/web/app/api/submission-paths/[pathId]/submit/route.ts` (POST) — any authenticated user can submit (no `requireSelf`/`requireOrgMember` needed here, matches the AC's "submitter" actor).

**Not done / real limitation, marked `partial`:**
1. **No file storage backend.** No S3/Vercel Blob/equivalent is provisioned. The route accepts a `fileUrl` string per work directly in the JSON body rather than handling a real multipart upload — this proves the Submission/Work creation flow end to end, but real file handling (the actual "upload" in "file upload") is unbuilt. Flagged in the route's own code comment rather than silently treated as done.
2. **No UI.** There's no form for a submitter to actually fill out and hit this endpoint from a browser — Story 6.3's missing Form Builder UI (see that story's notes) is a prerequisite for a real submit form to exist at all (the form needs to be defined before a submitter can fill it out).
3. **Not smoke-tested via curl this session** (ran out of time after the Story 6.4 bugfix investigation) — the engine-level test (`packages/workspace-engine/test/engine.test.ts`, "Story 6.5: submitting creates a Submission with one or more Works") is the only verification this session provides for the createSubmission logic itself; the HTTP route wrapping it is implemented but unverified end to end.

**Recommended next steps, in order:** build the Form Builder UI (finishes 6.3), then a submitter-facing submit form using it (finishes this story's UI gap), then a real file-storage adapter (closes gap #1).
