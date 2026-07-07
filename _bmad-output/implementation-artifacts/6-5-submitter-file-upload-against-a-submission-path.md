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

**Verified (real runtime, full round trip), after Story 6.3's Form Builder UI landed:**
```
POST /api/submission-paths/subpath_0004/submit {works: [{title: "My Poem", fileUrl: "https://example.com/poem.pdf"}]}
-> 201, Submission + Work created and persisted, both with real ids
```

**Still not done / real limitations, kept `partial`:**
1. **No file storage backend.** No S3/Vercel Blob/equivalent is provisioned. The route accepts a `fileUrl` string per work directly in the JSON body rather than handling a real multipart upload — the Submission/Work creation flow is real and verified, but actual file handling (the "upload" in "file upload") is unbuilt. Flagged in the route's own code comment rather than silently treated as done.
2. **No submitter-facing UI.** There's still no form for a submitter to fill out and hit this endpoint from a browser — this session verified the API contract directly via `curl`, not a real submit page. Recommended next step now that Story 6.3's Form Builder exists: render the saved form's fields on a public submit page under `/org/:id` (or per Open Call) and wire it to this endpoint.

**Recommended next steps, in order:** build the submitter-facing submit form (closes gap #2), then a real file-storage adapter (closes gap #1).
