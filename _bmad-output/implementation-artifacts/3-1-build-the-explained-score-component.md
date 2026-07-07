---
epic: 3
story: 3.1
status: done
---

# Story 3.1: Build the Explained Score component

## Dev Agent Record

**Implementation:** `apps/web/components/explained-score.tsx` — `FitScoreBadge` (tier label + expandable ✓/⚠/✕ reasons list, click-to-expand, `aria-expanded`) and `TrustBadge` (Verified/Checked/Unverified + "checked Nh ago"). Uses the shadcn `Badge` primitive themed with the Missa palette (`--green` for reasons, `--accent-deep`/`--accent-tint` for watch-outs, `destructive` for disqualifiers).

**Verified:** rendered live in the Opportunities page smoke test (Story 3.2) — real Fit Score data (`Strong Fit`, `Possible Fit`) with real reasons ("Accepts poetry, fiction", "No fee", "Deadline in 6 days") confirmed present in the API response consumed by this component.

**Not done in this story:** Expected Response confidence-range variant (mentioned in the UX spec as a third variant) — deferred until a story actually surfaces Expected Response data in a page (Epic 3 didn't reach that; `responseStats`/`expectedResponseWindowDays` exist in the engine but no UI story consumes them yet).
