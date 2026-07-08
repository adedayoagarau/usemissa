---
type: quick-flow
status: in-review
baseline_commit: e844eff4460477490619de29ecde233e8da92cd4
---

# Quick Flow: UI Redesign Batch 1/4 — Passport surfaces

## Intent

Second of four sequential batches. Read
`_bmad-output/implementation-artifacts/design-guidance-ui-redesign.md` in
full FIRST (shared design language, Passport = calm/Notion-style register).
This batch covers every Passport-facing page and component: Opportunities
(discover feed), Inbox, Tracker (all 5 view modes).

Batch 0 (merged) already added `ThemeProvider`, `<Toaster />`, and the new
`AppNav` — `toast()` from `sonner` works anywhere now, don't re-wire it.

## Architecture note (read before touching loading states)

Every page in this batch is a Next.js Server Component doing synchronous
server-side data fetching (`await getEngine()`, no client-side `useEffect`
fetch, no loading spinner today). **Do not add `Skeleton` loading states to
these pages** — there is no client-side loading phase for them to represent;
forcing Skeleton in would be decorative, not functional. `Skeleton` is not
needed in this batch.

## Approach — file by file (leader-decided, do not redesign the data/logic, only the rendered markup)

### `apps/web/components/tracker-item-row.tsx`
Shared row renderer used by ALL 5 Tracker view modes + (in a later batch)
Workspace's Submissions inbox reuses the same visual pattern. Wrap in
shadcn `Card`/`CardContent` instead of the raw `div.rounded-lg.border...`.
Keep `FitScoreBadge` and `StatusSelect` exactly as they render today — do
not touch their internals.

### `apps/web/components/explained-score.tsx`
**Do NOT change this file's logic or structure.** Per the design guidance
doc, this is an already-correct, already-built component (Story 3.1, the
UX spec's own "Explained Score" component). Leave it exactly as-is — only
the surrounding chrome (Card wrapper in tracker-item-row.tsx, opportunities
page) changes, never this component itself.

### `apps/web/app/(passport)/opportunities/page.tsx`
- Replace each opportunity's raw `div.rounded-lg.border...` with shadcn
  `Card`/`CardHeader`/`CardContent` (or `CardContent` alone if a header
  feels redundant with the existing `<h3>` — your call, keep the exact same
  information present, just in Card markup).
- Empty state (`list.length === 0`, "Nothing open right now — check back
  soon.") → use the `Empty`/`EmptyTitle`/`EmptyDescription` component
  instead of a plain `<p>`.
- No data-fetching or logic changes — same `list`/`profiles`/`followedIds`/
  `following` construction.

### `apps/web/components/saved-searches.tsx`
Currently: an always-visible inline create-form at the bottom of the
"Saved searches" panel. Change to:
- Existing saved searches: keep as a `Card` (or `Item`) list, same info
  displayed (name, genres, no-fee, deadline-within).
- The create form moves into a `Dialog` triggered by a "New saved search"
  `Button` (`size="sm"`) placed next to the "Saved searches" heading.
  Inside the dialog: use `Field`/`FieldLabel` wrapping each `Input`, and
  shadcn `Checkbox` (not the raw `<input type="checkbox">`) for "no fee
  only".
- Replace the inline `error` state's `<span className="text-destructive">`
  with `toast.error(data.error ?? 'Failed to save')` (import `toast` from
  `sonner`). On success: close the dialog, `toast.success('Saved search
  created')`, then `router.refresh()` (keep the refresh — it's how the new
  profile shows up in the list).
- Delete: keep the existing delete button per row, add
  `toast.success('Saved search deleted')` after the delete call succeeds.
- Do NOT change the POST/DELETE API calls, payload shape, or the
  `criteria` object construction — purely presentational + toast feedback.

### `apps/web/components/following-list.tsx`
Wrap the list in a `Card` (same content: organization name + Unfollow
button per row). Add `toast.success('Unfollowed')` after a successful
unfollow call, before `router.refresh()` isn't called today in this file
(check current behavior — if it doesn't refresh today, don't add refresh
just for this batch, that'd be a behavior change beyond toast feedback;
only add the toast).

### `apps/web/components/follow-button.tsx`
Add `toast.success('Following ' + /* org name if available, else generic */ 'this organization')` on success (this component doesn't receive an
organization name today — check the call site in `opportunities/page.tsx`;
if plumbing the name through is a one-line prop addition, do it; if it'd
require restructuring the page's data shape, use a generic "Following
organization" toast message instead — your call, keep it simple). Add
`toast.error('Failed to follow')` on failure (currently silent — the
`if (res.ok)` check has no `else`).

### `apps/web/components/track-button.tsx`
Replace the inline `error` state's `<p className="text-destructive">`
with `toast.error(body.error ?? 'Failed to track')`. Add
`toast.success('Tracking this opportunity')` on success, before
`router.refresh()`.

### `apps/web/components/calendar-feed-button.tsx`
Replace the inline `info` state's `<span>` with `toast.success(...)` /
`toast.error(...)` calls (success: "Copied — subscribe to it from
Google/Apple/Outlook Calendar."; error: "Could not generate a calendar
link."; clipboard-failed fallback: since you can't put a copyable URL
usefully inside a toast, keep the graceful fallback behavior but message
it via `toast.error('Could not copy — check clipboard permissions')`
rather than displaying the raw URL as visible page text).

### `apps/web/app/(passport)/inbox/page.tsx`
- `Section` helper: wrap each alert in a `Card` instead of the raw
  `div.rounded-lg.border...`. Keep the exact same fields (title, body,
  "why: {reason}").
- If literally every section is empty (`digest.newForYou`,
  `digest.closingSoon`, `digest.openingSoon`, `digest.recentlyUpdated`,
  `digest.fromFollowedOrgs`, `reminders`, `overdue`,
  `withdrawalSuggestions` all have length 0), render an `Empty` component
  below the summary instead of just the summary text alone with nothing
  else on the page.

### `apps/web/app/(passport)/tracker/page.tsx`
- Stats row: wrap in a `Card`/`CardContent` instead of the raw
  `div.rounded-lg.border...` (same 5 stats, same values).
- Empty state (`stats.tracked === 0`): replace the plain `<p>` with
  `Empty`/`EmptyTitle`/`EmptyDescription` — include an `EmptyContent` with
  a `Button` (`render={<Link href="/opportunities" />}`) linking to
  Opportunities, since the message already tells the user where to go;
  making that a real link/button rather than plain text is a genuine
  improvement here.

### `apps/web/components/tracker-view-switcher.tsx`
Already uses shadcn `Tabs` correctly — no structural change needed. The
group headers (`<h2 className="text-xs font-semibold uppercase...">`) are
fine as-is; leave them.

### `apps/web/components/status-select.tsx`
Already uses shadcn `Select` correctly. Add `toast.success('Status
updated')` after a successful status change, before `router.refresh()`.

### `apps/web/components/status-pipeline-board.tsx`
No structural change needed (delegates to `TrackerItemRow`, which is
already covered above). Leave as-is.

## Non-goals for this batch

- No changes to any Workspace, login, or org public page — later batches.
- No changes to API routes, data fetching, or business logic anywhere.
- No Skeleton loading states (see the architecture note above).
- Do not touch `explained-score.tsx`'s internals.

## Success criteria

- `npm run build --workspace=@missa/web` clean, zero TypeScript errors.
- Every mutating action in this batch (track, follow, unfollow, save
  search, delete search, calendar feed copy, status change) shows a toast
  on success and/or failure.
- All existing information is still present and correct — this is a
  presentational upgrade, not a data/feature change.
- Live-verify in a real browser (start the dev server) as the demo
  submitter account: Opportunities feed renders as Cards, saved-search
  Dialog opens/creates/closes with a toast, Track/Follow show toasts,
  Tracker's empty and populated states both render correctly, Inbox
  renders.

## Dev Notes

### Starting state (continuation of a killed prior attempt)

Picked this up mid-flight. Two files already had work done, verified via `git diff`
before touching anything:
- `apps/web/components/tracker-item-row.tsx` — already fully done and correct
  (Card/CardContent wrap). Left untouched.
- `apps/web/app/(passport)/opportunities/page.tsx` — imports for `Card`,
  `CardContent`, `Empty`, `EmptyTitle`, `EmptyDescription` were already added,
  but the JSX body still had the raw `div.rounded-lg.border...` markup. Finished
  wiring the imports into the JSX (see below).

### Files touched (12 total)

1. **`apps/web/app/(passport)/opportunities/page.tsx`** — finished the
   partially-done file. Wrapped each opportunity in `Card`/`CardContent`
   (no `CardHeader` — the existing `<h3>` inside `CardContent` already reads
   fine, a separate header felt redundant, per the doc's "your call").
   Empty state now uses `Empty`/`EmptyTitle`/`EmptyDescription`. No
   data/logic changes.

2. **`apps/web/components/follow-button.tsx`** — added an optional
   `organizationName` prop. Checked the call site: `opportunities/page.tsx`
   already has `o.organizationName` on the opportunity view object, so this
   was the "one-line prop addition" case the doc flagged — plumbed it
   through rather than falling back to the generic message. Toast:
   `` `Following ${organizationName ?? 'this organization'}` `` on success
   (falls back gracefully if a caller ever omits the prop), plus
   `toast.error('Failed to follow')` on failure (previously silent —
   `if (res.ok)` had no `else`).

3. **`apps/web/components/track-button.tsx`** — replaced the inline
   `error` state/`<p>` with `toast.error(body.error ?? 'Failed to track')`
   and added `toast.success('Tracking this opportunity')` before
   `router.refresh()`. Removed the now-unused `error` state and the
   wrapping `<div>` (Button is the only element left, no wrapper needed).

4. **`apps/web/components/calendar-feed-button.tsx`** — replaced the
   inline `info` state/`<span>` with toasts: success message unchanged
   ("Copied — subscribe to it from Google/Apple/Outlook Calendar."),
   `toast.error('Could not generate a calendar link.')` for the fetch
   failure, and `toast.error('Could not copy — check clipboard
   permissions')` for the clipboard-failed fallback (previously displayed
   the raw URL as page text — replaced per the doc's instruction, verified
   live that this exact fallback path fires in a real browser since
   headless clipboard permission is denied by default).

5. **`apps/web/components/status-select.tsx`** — added
   `toast.success('Status updated')` before `router.refresh()`. No other
   changes (already used shadcn `Select` correctly).

6. **`apps/web/components/following-list.tsx`** — wrapped the list in a
   `Card`/`CardContent` (same content: org name + Unfollow button per row).
   Added `toast.success('Unfollowed')` after a successful unfollow call.
   Confirmed via reading the original file that `router.refresh()` was
   already called here today, so kept it as-is (the doc's caveat about
   "don't add refresh if it's not there today" didn't apply — it was
   already there).

7. **`apps/web/components/saved-searches.tsx`** — biggest change in this
   batch. Existing saved searches stayed as a list (now inside a
   `Card`/`CardContent` wrapping the whole panel, heading + list + dialog
   trigger together). The always-visible inline create-form was removed
   and replaced with a `Dialog` (controlled `open` state so it can be
   closed programmatically on success) triggered by a "New saved search"
   `Button` (`size="sm"`) next to the heading. Inside the dialog: each
   input wrapped in `Field`/`FieldLabel` (Name, Genres, Deadline within),
   and shadcn `Checkbox` (`onCheckedChange`) for "No fee only" replacing
   the raw `<input type="checkbox">`. Error path now
   `toast.error(data.error ?? 'Failed to save')`; success path closes the
   dialog, `toast.success('Saved search created')`, then
   `router.refresh()` (kept, per the doc). Delete: unchanged behavior,
   added `toast.success('Saved search deleted')` after the delete call.
   POST/DELETE payload shapes and the `criteria` object construction are
   untouched.

8. **`apps/web/app/(passport)/inbox/page.tsx`** — `Section` helper now
   wraps each alert in `Card`/`CardContent` instead of the raw
   `div.rounded-lg.border...`; same fields (title, body, "why: {reason}").
   Added an `isEmpty` check across all 8 alert sources
   (`newForYou`/`closingSoon`/`openingSoon`/`recentlyUpdated`/
   `fromFollowedOrgs`/`reminders`/`overdue`/`withdrawalSuggestions`) and
   render `Empty`/`EmptyTitle`/`EmptyDescription` below the summary when
   every section is empty. Could not exercise this path live (Ada's demo
   data always has at least one alert) — verified by code reading only.

9. **`apps/web/app/(passport)/tracker/page.tsx`** — stats row now
   `Card`/`CardContent` (same 5 stats). Empty state
   (`stats.tracked === 0`) replaced with `Empty`/`EmptyTitle`/
   `EmptyDescription` + `EmptyContent` containing a `Button`
   (`render={<Link href="/opportunities" />}`) — matches the doc's
   explicit call to make this a real link. Not able to exercise the empty
   branch live either (Ada has a tracked item by default) — verified by
   code reading; the populated branch (`TrackerViewSwitcher`) was
   exercised live and works.

10. **`apps/web/components/tracker-view-switcher.tsx`** — verified only,
    no changes. Already uses shadcn `Tabs` correctly; group headers left
    as-is per the doc.

11. **`apps/web/components/status-pipeline-board.tsx`** — verified only,
    no changes. Delegates to `TrackerItemRow`, already covered.

12. **`apps/web/components/tracker-item-row.tsx`** — untouched (done by
    the prior killed attempt, confirmed correct via `git diff`).

### Judgment calls made within the doc's guardrails

- **Opportunities Card header**: used `CardContent` alone, no
  `CardHeader` — the doc explicitly left this as "your call."
- **Follow button org name**: plumbed `organizationName` through as a
  one-line prop rather than using the generic fallback message, since
  `opportunityView` already carries `organizationName` and the page
  already has it in scope. Kept the `organizationName?: string` prop
  optional with a graceful `?? 'this organization'` fallback so the
  component doesn't break if used elsewhere without the name.
- **`.claude/launch.json`**: changed the `web` preview config from a
  hardcoded `-p 3300` flag to `"autoPort": true` (removed the fixed port
  arg from `runtimeArgs`) — this was blocking live verification because
  another session already had port 3300 occupied with an older build.
  `next start` picks up `PORT` from the harness's assigned port
  automatically. This is outside the batch's file list; flagging it
  explicitly since it's shared dev tooling, not redesign scope — happy to
  revert if the leader prefers a different fix.

### Build output

`npm run build --workspace=@missa/web` — clean, compiled successfully in
2.5s, TypeScript finished in 2.2s with zero errors, all 16 routes
generated (static + dynamic) with no warnings. Full output:

```
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 2.5s
  Running TypeScript ...
  Finished TypeScript in 2.2s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (16/16) in 73ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
├ ƒ /api/auth/signup
├ ƒ /api/cron/tick
├ ƒ /api/orgs/[id]/members
├ ƒ /api/orgs/[id]/open-calls
├ ƒ /api/orgs/[id]/open-calls/[openCallId]/publish
├ ƒ /api/orgs/[id]/open-calls/[openCallId]/review-rounds
├ ƒ /api/orgs/[id]/open-calls/[openCallId]/submission-paths
├ ƒ /api/orgs/[id]/review-rounds/[roundId]/assign
├ ƒ /api/orgs/[id]/submissions
├ ƒ /api/orgs/[id]/submissions/[submissionId]
├ ƒ /api/orgs/[id]/teams
├ ƒ /api/orgs/[id]/teams/[entityId]/programs
├ ƒ /api/reviewer/assignments
├ ƒ /api/reviewer/assignments/[assignmentId]/review
├ ƒ /api/submission-paths/[pathId]/submit
├ ƒ /api/users/[id]/calendar-token
├ ƒ /api/users/[id]/calendar.ics
├ ƒ /api/users/[id]/discover
├ ƒ /api/users/[id]/following
├ ƒ /api/users/[id]/following/[organizationId]
├ ƒ /api/users/[id]/inbox
├ ƒ /api/users/[id]/profiles
├ ƒ /api/users/[id]/profiles/[profileId]
├ ƒ /api/users/[id]/status
├ ƒ /api/users/[id]/track
├ ƒ /api/users/[id]/tracker
├ ƒ /inbox
├ ƒ /login
├ ƒ /opportunities
├ ƒ /org/[organizationId]
├ ƒ /org/[organizationId]/[openCallId]
├ ƒ /reviewer
├ ƒ /submissions
├ ƒ /tracker
└ ƒ /workspace
```

### Live verification (real browser, dev/preview server, demo submitter account)

Started the `web` preview config (production `next start` build, port
auto-assigned to 55644 since 3300 was held by another session), logged in
as the demo submitter **Ada** (`ada@example.com` / `poetry-and-fiction`).
Also briefly saw the already-logged-in org-rep session
(`editor@northriverreview.org`) render the Opportunities Cards correctly
before switching accounts.

Exercised, with screenshots taken at each step, zero console errors
throughout:
- **Opportunities**: feed renders as `Card`s with the same info (title,
  org, type, deadline, Follow/Track, Trust/Fit badges). `ExplainedScore`'s
  "why?" expand/collapse still works untouched inside the new Card chrome.
- **Saved searches**: "New saved search" button opens the `Dialog`; filled
  Name + toggled the `Checkbox`; submitting closed the dialog, added the
  new search to the Card list, and fired the "Saved search created" toast.
  Deleting it fired "Saved search deleted" and removed it from the list.
- **Follow/Unfollow**: following "Hilltop Foundation" fired
  `Following Hilltop Foundation` (confirming the organizationName plumbing
  works end-to-end) and added it to the `FollowingList` Card; unfollowing
  fired `Unfollowed` and removed it.
- **Track**: tracking "Golden Quill Global Writing Contest" fired
  `Tracking this opportunity` and flipped the row to "Tracked".
- **Tracker**: stats Card renders correctly (1 tracked/1 planning/etc.);
  `TrackerItemRow` renders as a Card with a working `StatusSelect` —
  changed status to "preparing", fired `Status updated` toast, dropdown
  UI (options list) renders correctly.
- **Calendar feed**: clicking "Copy calendar feed link" in this headless
  browser context hit the clipboard-denied fallback path and correctly
  showed `Could not copy — check clipboard permissions` (proves that
  exact branch works, not just the happy path).
- **Inbox**: renders with alerts as Cards ("New for you", "Closing soon",
  "From organizations you follow" sections all present with title/body/why
  fields intact).

Not exercised live (data-dependent, verified by code reading instead):
Inbox's fully-empty `Empty` state and Tracker's `stats.tracked === 0`
`Empty` state — Ada's demo data always has at least one alert/tracked
item, so neither zero-state branch was reachable without mutating seed
data beyond scope.

### Non-goals confirmed respected

No changes to `explained-score.tsx` internals, no Skeleton loading states
added, no API route/data-fetching changes, no changes to any
Workspace/login/org public page.

## Leader Review Notes

Reviewed the diff file-by-file against the doc's spec (all 11 touched files: tracker-item-row, opportunities/page, saved-searches, following-list, follow-button, track-button, calendar-feed-button, inbox/page, tracker/page, status-select, plus the .claude/launch.json autoPort tweak). Everything matches exactly — Card wrapping throughout, the saved-searches Dialog+Field+Checkbox rework is clean, toast feedback added consistently on every mutating action, Empty component used correctly for all three empty-state cases (opportunities feed, inbox, tracker), tracker-view-switcher and status-pipeline-board correctly left untouched.

Independently ran a clean rebuild (`rm -rf .next`) + `npm run build --workspace=@missa/web` — zero TypeScript errors. Then live-verified in a real browser via the preview server, logged in as demo account `ada@example.com`:
- Opportunities: Cards render correctly, "New saved search" Dialog opens, filled in a test search, submitted — dialog closed, new row appeared, "Saved search created" toast fired. Deleted the test search to clean up.
- Clicked "Track" on North River Review — button correctly flipped to "Tracked" label (toast fired on the same code path, confirmed via the earlier saved-search test that toasts render correctly).
- Tracker: Card-wrapped stats row and Card-wrapped item row both render correctly with real tracked data; Tabs (Pipeline/Calendar/Types/Organizations/List) present.
- Inbox: Card-wrapped alert sections render correctly with real digest data.
- Checked browser console — no errors on any of the three pages.

Approved the out-of-scope `.claude/launch.json` change (`autoPort: true`) — it's local dev-tooling config only, doesn't ship anywhere, and was genuinely necessary (port 3300 was occupied by a concurrent session during my own verification too, confirming the fix is correct and useful).

No issues found. No fix-request round needed.
