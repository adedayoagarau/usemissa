---
type: reference
status: living
---

# Design Guidance: Full UI Redesign Pass (shared across all batches)

Read this before any redesign batch. It's the shared design language every
batch must follow so the result is cohesive, not four different sub-agents'
individual taste. Grounded in the existing (already-approved, already-built)
`_bmad-output/planning-artifacts/ux-design-specification.md` — this doc does
not invent new direction, it operationalizes the existing spec into concrete
component choices per surface.

## The two registers (do not blur these)

- **Passport surfaces** (`(passport)` route group: opportunities, inbox,
  tracker) — calmer, Notion-inspired, more whitespace, browsing-oriented.
  Prefer Card-based layouts over dense tables.
- **Workspace surfaces** (`(workspace)` route group: workspace, submissions,
  reviewer) — tighter, Linear-inspired, power-user density. Prefer Table over
  Card grids where the content is genuinely tabular (Submissions inbox).

Marketing/landing (`app/page.tsx`, if it's the marketing root — verify before
touching) keeps its own separate literary voice per the naming-decision doc's
three-register rule — do not apply either of the above two registers there
without checking what that page actually is first.

## Concrete component mapping (from the UX spec's Component Strategy)

| Existing pattern | Replace/upgrade with |
|---|---|
| Plain nav links in `app-nav.tsx` | `NavigationMenu` for primary links, `DropdownMenu` for the user/email + logout menu |
| No command palette | `Command` (Cmd+K palette) for Workspace power-user actions — explicitly called out in the UX spec as valuable for "power user running many calls" |
| Inline/no loading states | `Skeleton` for any list/card that fetches data |
| No toast feedback | `Sonner` (`<Toaster />` mounted once in root layout) for every mutating action (track, follow, save search, publish, assign reviewer, record decision) — the UX spec explicitly says "never make the user wait on page reload to know an action succeeded" |
| Ad-hoc modals/inline forms for saved-search create/edit, team/program/open-call creation | `Dialog` (or `Sheet` for anything long-form/multi-field) |
| `submission-card.tsx`'s expandable-card admin inbox | `Table` with status badges — the UX spec explicitly names this as a proven Submittable-style pattern worth adapting for Workspace's Submissions inbox. This was Story 7.1's own documented scope-cut ("built as expandable per-item cards instead of... reusing the Status Pipeline Board... a real simplification given the time available") — now's the time to close that gap. |
| Score/status `<select>`/plain text | Keep `ExplainedScore` and `StatusPipelineBoard` as-is (already-correct, already-built per the spec's own component strategy) — do NOT rebuild these, just make sure surrounding chrome (cards, spacing) matches the new patterns |
| Auth form plain inputs | `Field` (shadcn's newer form-field wrapper: label + input + description + error, replaces hand-rolled label/input/error markup) |

## Non-negotiables (carried from the UX spec, do not violate)

- **Never show a bare numeric score** without its reasons attached (Fit Score, Trust score) — `ExplainedScore` already does this correctly, don't regress it.
- **Immediate feedback, no reload-to-confirm** — every mutating action gets a toast, not a silent success or a full-page reload as the only signal.
- **8px spacing scale** (`--s1` through `--s12`, already in `globals.css`) — use these, don't invent new spacing values.
- **Terracotta accent (`--brand-accent`/`--primary`) sparingly** — primary actions and active nav state only. Green (`--green`) for positive/success states only. No red/alarm colors for anything that isn't genuinely time-sensitive.
- **Fraunces for headlines only**, Instrument Sans for UI/body, Fragment Mono for tabular/data (deadlines, IDs, counts) — already wired via `font-heading`/`font-sans`/`font-mono` Tailwind classes from `layout.tsx`'s `next/font/local` setup. Use those existing classes, don't add new font declarations.

## What "redesign" means for this pass (scope discipline)

This is a **visual/interaction upgrade using the now-installed shadcn components**, not a rewrite of business logic, data-fetching, or the underlying page/API structure. Every page keeps the same data it fetches and the same routes — only the rendered markup/components change. If a batch's sub-agent finds itself wanting to change what data is fetched or add a new API route, that's out of scope — report it, don't improvise.

## Batches (sequential, each its own Quick Flow + PR)

0. **Foundation** — root layout (ThemeProvider + Toaster), `app-nav.tsx` (NavigationMenu + DropdownMenu + Command palette shell)
1. **Passport** — opportunities, inbox, tracker + their sub-components (saved-searches, following-list, follow-button, explained-score wrapper chrome, track-button, tracker-view-switcher, tracker-item-row, status-pipeline-board, status-select, calendar-feed-button)
2. **Workspace** — workspace, submissions, reviewer + their sub-components (workspace-forms, form-builder, submission-card → Table redesign, review-form)
3. **Public/auth** — login + auth-form, org public page, org submit page + submit-form

Each batch gets its own `quick-{slug}.md` doc with the specific file list and any batch-specific decisions, referencing this shared doc for the design language.
