---
epic: 6
story: 6.4
status: done
---

# Story 6.4: Public organization page

## Dev Agent Record

**Implementation:** `apps/web/app/org/[organizationId]/page.tsx` — unauthenticated page, lists only `published` Open Calls via `WorkspaceEngine.publishedOpenCallsForOrganization` (walks Organization → Entity → Program → OpenCall). `export const dynamic = 'force-dynamic'` added after finding this page doesn't read cookies/headers and would otherwise be a candidate for Next.js's render caching.

**Bug found and fixed here (the most significant finding of this Epic 6 pass):** the public page didn't reflect a just-published Open Call at all — traced to a cross-cutting singleton bug (module-level `let` state not shared between Route Handlers and Page Server Components under Next.js's per-route bundling), not a caching issue as first suspected. Full writeup in `bugfix-globalthis-singleton.md`. Fixed by switching both `lib/engine.ts` and `lib/workspaceEngine.ts` to `globalThis`-based singletons.

**Verified (real runtime, full round trip, after the fix):**
```
POST /api/orgs/org_0001/teams -> Team created
POST /api/orgs/org_0001/teams/:id/programs -> Program created
POST /api/orgs/org_0001/open-calls -> Open Call created, status: draft
GET /org/org_0001 -> "No open calls right now" (draft correctly hidden)
POST /api/orgs/org_0001/open-calls/:id/publish -> status: published
GET /org/org_0001 -> "Fall Fiction Issue" now visible
```
This is the AC's exact draft-vs-published visibility requirement, verified end to end, not assumed from the code alone.
