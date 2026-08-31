# Opportunity disclosure components

This directory owns the reusable public presentation language for opportunity facts. It does not own repository access, publication decisions, authentication, or private persistence.

## Inputs

- `OpportunityCard` consumes `OpportunityBrowseProjection`.
- `OpportunityDetail` consumes `OpportunityDetailProjection`.
- Fixtures implement the same detail projection and may not introduce a parallel opportunity shape.

## Components

| Component | Responsibility |
|---|---|
| `DisclosureState` | Human-readable confirmed, unknown, warning, unavailable, and changed states |
| `OpportunityIdentity` | Permitted image or decorative initials fallback |
| `OpportunityFact` | One labeled decision fact with optional explanation |
| `OpportunityFactGroup` | Deadline, fee, reach, and optional status definition list |
| `OpportunityCard` | Browse-level decision scan and source identity |
| `OpportunityNotice` | Conflict, unknown, changed, or closed notice |
| `OpportunityDetailSection` | Numbered progressive-disclosure section |
| `OpportunityDetail` | Identity → decision → preparation → terms → official handoff composition |

## Accessibility contract

- Native headings, lists, links, buttons, and definition lists are the default.
- Decorative icons and initials are hidden from assistive technology.
- Images use repository-provided alternative text; an empty string is valid for decorative identity media.
- Unknowns and conflicts are communicated in words, not by color alone.
- External source links disclose that they open a new tab.
- Disabled private actions remain visibly distinct from unavailable public facts.

## Phase boundary

`/design-system/opportunities-overhaul` is the Phase 1 reference consumer. Canonical `/opportunities` integration, real private-action wiring, production fail-closed behavior, and any presentation flag belong to Phase 2 after the proposed ADRs are accepted.
