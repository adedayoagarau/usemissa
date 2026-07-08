# Missa — High-fidelity product prototype

Interactive HTML/CSS prototype of the Missa opportunity intelligence app. Uses the **SaaS design system** from the product handoff (Fraunces + Instrument Sans + Fragment Mono, terracotta accent) and **approved user-facing vocabulary** (Opportunities, Alerts, Tracker, Submissions, Saved — not "Radar" or "Discover").

## View locally

```bash
# From repo root — any static server works
npx -y serve prototype -p 3456
# Open http://localhost:3456
```

Or open `prototype/index.html` directly in a browser (fonts load from `../landing/fonts/`).

## Screens

| Screen | What it shows |
|--------|----------------|
| **Opportunities** | Feed + detail split view: match badges, filters by vertical, deadline/fee/trust, how to apply, jury, evidence, change history |
| **Alerts** | Inbox digest: new for you, closing soon, updated, followed orgs — each with a "why" reason |
| **Tracker** | Pipeline kanban: Saved → Preparing → Submitted → In review → Accepted |
| **Submissions** | Packet table with status pills, reply-window progress, deadline-updated banner |
| **Saved** | Saved search profiles + followed organizations |
| **Source registry** | 1,042-source registry admin: tier distribution, source table |
| **Verification** | Admin queue: conflicts, duplicates, low confidence, org claims |

## Design tokens

See `css/tokens.css`. Key values:

- Background `#FAFAF9`, surface `#FFFFFF`
- Ink `#1C1815`, secondary `#6F6862`
- Accent `#C6402A` (terracotta)
- Green `#2E5B41` (verified / accepted)

## Files

```
prototype/
├── index.html      # Full interactive app (all screens)
├── css/
│   ├── tokens.css  # Design system variables
│   └── app.css     # Components + layout
├── js/
│   └── app.js      # Navigation, opportunity list/detail
└── README.md
```

## Relationship to production

- **Marketing**: `landing/` (correspondence / Vermeer aesthetic)
- **Engine API**: `packages/radar-engine/` (JSON API + minimal dev UI)
- **This prototype**: target end-user product UI — wire to radar-engine API when ready

## Mock data notes

Opportunity cards use realistic examples across literary, residency, grant, and film verticals. The Hilltop grant shows a **conflicting deadline** (directory vs org site) — core Radar behavior. Res Artis-sourced residency shows **tier-2 discovery** with email/PDF apply flow and unnamed jury.
