# Opportunities component retirement map

Date: 2026-08-31

Phase 2 makes `components/opportunity-disclosure/` the shared public presentation layer for canonical browse and detail routes. The server presentation selector keeps the prior compositions available as a bounded rollback path; it does not select or modify repository authority.

| Component | Phase 2 status | Retirement decision |
|---|---|---|
| `opportunity-disclosure/opportunity-disclosure.tsx` | Canonical shared owner | Keep. Owns public cards, facts, uncertainty, progressive detail, and action slots. |
| `opportunity-results.tsx` | Canonical route orchestrator | Keep. Owns URL pagination and selects only the server-resolved presentation. |
| `opportunity-catalogue-card.tsx` | Legacy presentation only | Retain through rollback observation; remove when Phase 3 closes the legacy selector. |
| `opportunity-detail-view.tsx` | Legacy presentation only | Retain through rollback observation; remove when Phase 3 closes the legacy selector. |
| `opportunity-card.tsx` | Separate authenticated/panel consumers | Do not merge in Phase 2. Audit each consumer before consolidation. |
| `opportunity-detail-panel.tsx` | Panel-specific composition | Keep until its non-route consumers are migrated; share projection formatting where useful. |
| `opportunity-catalogue-filters.tsx` | Canonical desktop/mobile filter contract | Keep. Phase 2 repaired programmatic checkbox naming. |
| `opportunity-filters.tsx` | Compact filter-row contract used elsewhere | Keep separate; its interaction and information density differ from the catalogue rail. |
| `/design-system/opportunities-overhaul` | Deterministic reference surface | Keep through Phase 3 as the edge-state fixture matrix; it is not a data fallback. |

## Phase 3 removal gate

Remove the legacy card/detail compositions and `legacy` selector value only after production observation confirms the disclosure presentation, Save/Tracker, SEO, source handoff, URL state, responsive behavior, and accessibility at parity. Removal must not alter `MISSA_OPPORTUNITY_REPOSITORY`, Postgres configuration, publication gates, or response contracts.
