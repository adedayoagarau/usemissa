---
epic: 6
story: 6.5
status: done
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

**Gap #2 closed — submitter-facing UI built:** `apps/web/app/org/[organizationId]/[openCallId]/page.tsx` (linked from the public org page's open-call cards) + `components/submit-form.tsx`, rendering the *actual* fields Story 6.3's Form Builder saved (no hardcoded field set) with a real `<input type="file">`.

**Verified in a real browser (not just curl)** — this was the first story this session actually driven end-to-end through a live browser rather than API calls alone, specifically because file-input behavior can't be meaningfully tested via curl:
- Unauthenticated visitor sees "Log in to submit" (confirmed via accessibility snapshot + screenshot — Fraunces heading and terracotta accent rendering correctly, i.e. the design pass is visually real, not just class names).
- Logged-in submitter: filled the Title field, attached a real `File` object (via `DataTransfer`, since browser automation can't drive a native OS file picker) to the Manuscript field, submitted.
- Response: `201 Created`, `Submission` + `Work` persisted with `title: "My Test Poem"` and `fileUrl: "data:text/plain;base64,VGhpcyBpcyBteSB0ZXN0IG1hbnVzY3JpcHQgY29udGVudC4="` — decodes to the exact file content uploaded, confirming the FileReader → data-URI → API round trip is genuinely correct, not just wired up.
- **Tooling note, not an app bug:** the `preview_click` tool's synthetic click on the Submit button didn't trigger form submission (no `fetch` fired); a direct `element.click()` via the browser's own JS did. Documented so this isn't mistaken for a real submission bug if re-tested.

**Storage hardening completed:** file bytes now upload through
`POST /api/submission-paths/:pathId/upload` to the configured private Vercel
Blob store (25 MB per file). Submission rows retain only the opaque Blob URL;
the submit route validates that the form exists, is published, and every Work
has a title. Missing Blob configuration fails closed with `503` rather than
falling back to data URIs.
