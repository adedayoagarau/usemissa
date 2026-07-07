---
epic: 6
story: 6.1
status: done
---

# Story 6.1: Entity (Team) and Program creation

## Dev Agent Record

**Implementation:**
- Backend: `WorkspaceEngine.createEntity`/`createProgram` (`packages/workspace-engine/src/engine.ts`) — see the Epic 6 backend commit for the full engine.
- `apps/web/app/api/orgs/[id]/teams/route.ts` (GET list, POST create), `apps/web/app/api/orgs/[id]/teams/[entityId]/programs/route.ts` (POST create) — both gated by `requireOrgMember` (new helper in `lib/auth.ts`, mirrors `RadarServer`'s `requireOrgMember`).
- `apps/web/app/(workspace)/workspace/page.tsx` + `components/workspace-forms.tsx` — the Workspace dashboard, with inline create-forms.
- UI never renders "Entity" — only "Team" per the naming decision doc (confirmed by reading the actual rendered page output, not just the code).

**Verified (real runtime, full round trip):** logged in as the North River rep (`editor@northriverreview.org`, seeded org membership — see the demo-world seeding note in `lib/engine.ts`), created a Team via `POST /api/orgs/org_0001/teams`, then a Program under it via `POST /api/orgs/org_0001/teams/:entityId/programs` — both real API calls, not mocked, and both correctly scoped to the organization from the session.

**See also:** `bugfix-globalthis-singleton.md` — a cross-cutting singleton bug was found and fixed while verifying this story's follow-on work (Story 6.4), affecting the reliability of in-page verification for this and other stories.
