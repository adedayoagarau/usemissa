---
type: quick-flow
status: in-progress
---

# Quick Flow: UI Redesign Batch 2/4 — Workspace surfaces

## Intent

Third of four sequential batches. Read
`_bmad-output/implementation-artifacts/design-guidance-ui-redesign.md` in
full FIRST (shared design language — Workspace = dense/Linear-style
register, tighter than Passport's calm/Notion style). This batch covers
Workspace (team/program/open-call management), Submissions (admin inbox),
and Reviewer dashboard.

Batches 0 and 1 (merged) already added the theme/toast/nav foundation and
redesigned every Passport page — `toast()` from `sonner` works anywhere,
Card/Empty patterns are established. Follow the same conventions.

## Architecture note (same as Batch 1)

All pages in this batch are Server Components doing synchronous
server-side data fetching. No `Skeleton` loading states needed here either.

## The one structural change in this batch: Submissions inbox → real Table

This is the single biggest change in the whole 4-batch effort, and it's
explicitly called for in the UX spec: *"Submittable's status-badge-driven
table view for Submissions — a proven pattern for exactly this domain,
worth adapting for the admin inbox."* Story 7.1's own dev notes already
flagged the current expandable-card list as a deliberate scope-cut versus
this exact pattern. Closing that gap is the point of this batch, not scope
creep.

### Current behavior (do not lose any of this)
`apps/web/app/(workspace)/submissions/page.tsx` groups submissions into 4
stage sections (Submitted/In review/Decided/Withdrawn) with a heading per
stage, each rendering a list of `SubmissionCard` (expandable: click to load
Works + review assignments + an assign-reviewer form via
`GET /api/orgs/:id/submissions/:submissionId`).

### New behavior
- Replace the 4 grouped sections with ONE `Table` listing every submission
  (all stages together), columns: **Open Call** (title), **Submitted**
  (date, `font-mono`), **Status** (a `Badge` — map `submitted`/`in-review`/
  `decided`/`withdrawn` to distinct variants, e.g. `submitted`→default,
  `in-review`→secondary/outline, `decided`→a green-tinted custom class
  matching `explained-score.tsx`'s `--green` convention, `withdrawn`→muted),
  and an action column with a "View" `Button`.
- Clicking "View" opens a `Sheet` (side panel, `side="right"`) — NOT a
  `Dialog` — showing the exact same content `SubmissionCard`'s expanded
  state shows today: Works list, Reviewers list (with review status), and
  the assign-reviewer form (Select + round-name Input + Button). Fetch the
  detail data (`GET /api/orgs/:id/submissions/:submissionId`) when the
  Sheet opens, same as today's on-demand load — don't change the API call.
- Keep `SubmissionCard`'s existing component file, but restructure its
  internals: extract the assign-reviewer logic/state into the component
  (it becomes the Sheet's content), and the page renders a `Table` whose
  rows trigger opening a Sheet for the selected submission (you'll need to
  lift some state — e.g. "which submission is selected" — up to the page
  or a small client wrapper component; your call on the exact composition,
  as long as the end result is: Table of all submissions → click View →
  Sheet with full detail + working assign-reviewer form).
- Add `toast.success('Reviewer assigned')` after a successful assignment.
- If there are zero submissions total, use `Empty` instead of the table.

## Approach — the rest of the files (leader-decided, do not redesign the data/logic)

### `apps/web/app/(workspace)/workspace/page.tsx`
- No-memberships state and no-entities state (`entities.length === 0`) →
  `Empty`/`EmptyTitle`/`EmptyDescription` instead of plain `<p>`.
- Wrap each top-level entity (Team) in a `Card`. Keep the nested
  program/open-call structure as plain divs (this is Workspace's dense,
  Linear-style register — don't over-nest Cards inside Cards; one level of
  Card per Team is enough).
- Open call status (`call.status`, currently plain
  `<span className="text-muted-foreground">`) → a `Badge` (draft→outline,
  published→default/green-tinted, closed→muted).
- Do NOT convert the inline Create Team/Program/Open Call forms into
  Dialogs — keep them inline per Workspace's dense register (Linear uses
  inline quick-add for tree items, not modals for every action). Just
  upgrade their internals (next section).

### `apps/web/components/workspace-forms.tsx`
- Replace every raw `<input>` with shadcn `Input`.
- Replace each inline `error &&` span with `toast.error(error)`.
- Add `toast.success(...)` after each successful create/publish action
  (e.g. "Team created", "Program added", "Open call created", "Published").
- Keep the compact inline-form layout (flex row, label-less placeholder
  inputs) — this matches Workspace's dense register, don't restructure
  into Field-wrapped multi-line forms like Batch 1's saved-searches Dialog.

### `apps/web/components/form-builder.tsx`
- Replace the raw `<input type="checkbox">` ("required") with shadcn
  `Checkbox`.
- Replace the inline `error &&` span with `toast.error(data.error ?? 'Failed to save form')`.
- Add `toast.success('Form saved')` on success.
- Optional, your call: the ↑/↓/Remove button trio per field row could use
  `ButtonGroup` for tighter visual grouping — nice-to-have, not required.

### `apps/web/components/review-form.tsx`
Add `toast.success('Recommendation submitted')` after a successful submit,
before `router.refresh()`. No structural change needed otherwise.

### `apps/web/app/(workspace)/reviewer/page.tsx`
Wrap each assignment in a `Card`. Empty state (`assignments.length === 0`)
→ `Empty`/`EmptyTitle`/`EmptyDescription`.

## Non-goals for this batch

- No changes to login, org public page, or org submit page — Batch 3.
- No changes to API routes, data fetching, or business logic anywhere —
  the Submissions Table/Sheet restructure changes *how* the same data is
  presented and *when* the same existing API call fires (on Sheet-open
  instead of on card-expand), not what data exists or what any endpoint does.
- No Skeleton loading states.

## Success criteria

- `npm run build --workspace=@missa/web` clean, zero TypeScript errors.
- Submissions page: real Table with status badges, all submissions from
  all 4 stages visible in one place; clicking View opens a Sheet with
  working Works list, Reviewers list, and a functional assign-reviewer
  form (test this live — assign a reviewer and confirm it actually works,
  not just that the Sheet opens).
- Workspace page: Team/Program/Open-call creation still works (same API
  calls), toasts fire, status badges render.
- Reviewer page: assignments render as Cards, review-form still submits
  correctly with a toast.
- Live-verify in a real browser (start the dev server) as an admin/org
  member demo account.

## Dev Notes

(developer fills in below)
