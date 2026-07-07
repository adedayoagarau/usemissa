# Terminology Reference

This PRD is written entirely in the approved user-facing vocabulary from `docs/missa-naming-decisions.md`. Key mappings engineers must respect when translating these FRs into stories/code:

| Internal/schema name (code only) | User-facing name (UI copy, this PRD) |
|---|---|
| `submission_path` | *(hidden — user sees "form" and "categories")* |
| `entity` | Team |
| `submitter` (schema) | never shown; UI says "you / your work / My Passport" |
| Trust Layer / Trust Signals / Freshness | **Verified** badge + "checked Nh ago" |
| Submission Package → | **Submission** |
| Submission Item → | **Work** |
| The 8 verb modules (Discover/Submit/Manage/Review/Decide/Message/Deliver/Analyze) | → noun modules (Opportunities/Submissions/Reviews/Decisions/Messages/Delivery/Insights) |
| Rules Engine → | **Automations** |
| Radar (as a feature name, user-facing) | **Alerts** / **Opportunities** ("Radar" stays fine as the internal engine name) |

Full mapping tables (submitter nav, organization nav, enterprise layer, pricing plans, retired names) live in `docs/missa-naming-decisions.md` and `docs/missa-naming-inventory.md` — this PRD does not duplicate them, it defers to them as the source of truth. Any new FR, story, or UI surface that introduces a name not covered by those docs should be run past them (or through the same rename process) before shipping.

---
