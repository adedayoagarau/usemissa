---
epic: 6
story: 6.2
status: done
---

# Story 6.2: Open Call creation, optionally linked to a claimed Radar listing

## Dev Agent Record

**Implementation:**
- `WorkspaceEngine.createOpenCall(programId, title, radarOpportunityId?)` + `publishOpenCall(openCallId)` — draft/published state machine, `radarOpportunityId` is a genuinely optional field (standalone Open Calls work with zero Radar linkage, per the architecture doc's Opportunity↔OpenCall relationship decision).
- `apps/web/app/api/orgs/[id]/open-calls/route.ts` (GET/POST) + `.../[openCallId]/publish/route.ts` (POST) — both `requireOrgMember`-gated, and the POST verifies the target program actually belongs to the calling organization (not just any program id).

**Verified (real runtime):** created a standalone Open Call (no `radarOpportunityId`) via the Workspace dashboard form, confirmed it starts as `draft`, confirmed a draft call does **not** appear on the org's public page (`/org/:id`), then published it via the dashboard's Publish button and confirmed it **does** appear afterward. This publish→public-page round trip is what originally surfaced the `globalThis` singleton bug documented in `bugfix-globalthis-singleton.md` — the fix is required for this story's AC to actually hold.
