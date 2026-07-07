---
epic: 6
story: 6.3
status: done
---

# Story 6.3: Submission Path / Form Builder v1

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.createSubmissionPath(openCallId, categories, fields, feeCents?)` — backend fully implemented and unit-tested (`packages/workspace-engine/test/engine.test.ts`).
- `apps/web/app/api/orgs/[id]/open-calls/[openCallId]/submission-paths/route.ts` (POST) — `requireOrgMember`-gated.
- `apps/web/components/form-builder.tsx` — the actual Form Builder UI: add/remove/reorder fields from a predefined set (Text/File upload/Category select/Fee), a categories input, wired into the Workspace dashboard per Open Call (shows the builder if no form exists yet, otherwise a summary of the saved form).

**Naming compliance confirmed in code and in the rendered UI:** neither the API, the domain layer, nor this component's own labels ever say "Submission Path" — users see "form" and "categories" throughout, per `docs/missa-naming-decisions.md`.

**Verified (real runtime, full round trip):**
```
POST /api/orgs/org_0001/open-calls/:id/submission-paths
  {categories: [fiction, poetry], fields: [{type: file-upload, label: Manuscript, required: true}]}
  -> 201, form persisted
GET /workspace (dashboard page) -> "Form saved · fiction, poetry · 1 field(s)" now shown for that Open Call
```

