---
type: quick-flow
status: done
baseline_commit: 7368196e4e07fe5fe536ca9c7b6a2bb53caae5ec
---

# Quick Flow: UI Redesign Batch 0 — Foundation (theme, toasts, nav)

## Intent

First of four sequential batches redesigning every existing page to use the
46 shadcn components installed earlier this session (previously purely
additive, nothing wired in yet). This batch is the foundation everything
else depends on: theme provider + toast plumbing in the root layout, and a
proper navigation bar. Read
`_bmad-output/implementation-artifacts/design-guidance-ui-redesign.md` in
full FIRST — it's the shared design language every batch (including this
one) must follow. Do not improvise design decisions outside what that doc
and this doc specify.

## Why this matters

User feedback: "this cannot be the UI for this app." `apps/web` had only 7
shadcn components before this session; 46 more were just installed but
nothing uses them yet. This batch makes the shared shell (nav, toast
feedback, theming) actually work so every subsequent page-level batch has a
working foundation to build on.

## Approach (leader-decided, do not redesign)

### 1. `apps/web/app/layout.tsx` — theme + toast plumbing

- Wrap `{children}` in `next-themes`' `ThemeProvider` (already a dependency
  from the shadcn install — `attribute="class"`, `defaultTheme="light"`,
  `enableSystem` is fine, `disableTransitionOnChange` recommended per
  next-themes' own docs to avoid a flash of transition on first paint).
- Mount `<Toaster />` (from `@/components/ui/sonner`) once, inside the body,
  outside/after `{children}` — this makes `toast(...)` calls from `sonner`
  work anywhere in the app without each page needing to mount its own.
- Do NOT add a theme toggle UI yet — that's optional polish, not required
  for this batch. `enableSystem` alone is enough (respects OS preference).

### 2. `apps/web/components/app-nav.tsx` — real navigation

Current state: a plain flex `<header>` with 6 hardcoded `<Link>`s, an email
string, and a plain logout `<Button>`. Replace with:

- **`NavigationMenu`** for the primary links (Opportunities, Inbox, Tracker,
  Workspace, Submissions, Your reviews) — use `NavigationMenuLink` styled as
  the active-route-aware links they already are (keep the existing
  `hover:text-primary` active-state logic, just move it into
  `NavigationMenu`'s structure). Do NOT reorganize/rename the links
  themselves — same 6 items, same labels, same hrefs (per
  `docs/missa-naming-decisions.md`, referenced in the existing code comment
  — don't touch naming).
- **`DropdownMenu`** for the user area: trigger shows the email (or an
  `Avatar` with initials — your call, keep it simple, initials from the
  email's local-part first letter is fine if you add Avatar), dropdown
  contains at minimum "Log out" (same `fetch('/api/auth/logout')` + router
  logic already there — don't change that behavior, just move it into the
  dropdown item's `onClick`).
- **`Command` (Cmd+K palette) — shell only, not full implementation.** Per
  the design guidance doc, a command palette is valuable for Workspace power
  users. For THIS batch: add a `<CommandDialog>` triggered by Cmd+K (or
  Ctrl+K) that lists the same 6 nav links as selectable commands (navigating
  on select, using `useRouter().push`). This is intentionally minimal scope
  — richer command-palette actions (approve/reject, bulk decisions) are a
  future task, not this batch. Don't build more than "Cmd+K → jump to a
  page."
- Keep the component's existing props signature (`{ email: string }`) — no
  changes to how `(passport)/layout.tsx` / `(workspace)/layout.tsx` call it.

## Explicit non-goals for this batch

- Do NOT touch `(passport)/layout.tsx` or `(workspace)/layout.tsx` beyond
  what's needed if `AppNav`'s props change (they shouldn't).
- Do NOT touch any page under `app/(passport)/`, `app/(workspace)/`,
  `app/login/`, or `app/org/` — those are later batches.
- Do NOT add a theme toggle button.
- Do NOT build out full command-palette actions beyond navigation.

## Success criteria

- `npm run build --workspace=@missa/web` clean, zero TypeScript errors.
- Nav renders identically in content (same 6 links, same labels) but via
  `NavigationMenu`; logout still works (same API call); Cmd+K opens a
  palette that navigates to any of the 6 sections.
- Toast plumbing works: temporarily verify with a manual `toast('test')`
  call somewhere reachable (e.g., trigger it from a dev-only spot, confirm
  visually via the running dev server, THEN remove the test call before
  finishing — don't leave debug code in the diff).
- No existing page's behavior changes beyond the nav bar itself.

## Dev Notes

### Files touched

- `apps/web/app/layout.tsx` (modified) — added `ThemeProvider` (wrapping
  `{children}` + `<Toaster />`) and `suppressHydrationWarning` on `<html>`.
- `apps/web/components/app-nav.tsx` (modified) — full redesign per spec:
  `NavigationMenu` for primary links, `DropdownMenu` for the user/logout
  menu, `CommandDialog` shell for Cmd+K.
- `apps/web/components/theme-provider.tsx` (new) — standard shadcn
  `'use client'` wrapper around `next-themes`' `ThemeProvider`, since
  `next-themes` doesn't ship a pre-marked client component.
- `apps/web/components/ui/command.tsx` (modified, 1 line) — see "Deviation
  from doc" below.

### Component structure decisions (within doc's guardrails)

- **Layout**: `ThemeProvider` configured `attribute="class"` (matches the
  existing `.dark` class-selector convention already in `globals.css`),
  `defaultTheme="light"`, `enableSystem`, `disableTransitionOnChange` —
  exactly as specified. Added `suppressHydrationWarning` to `<html>`,
  which is next-themes' own documented companion setting (avoids a
  hydration-mismatch console warning when the inline script sets the
  class before React hydrates) — not a design decision, just the standard
  correct wiring for this exact pattern.
- **Nav links**: extracted the 6 links into a single `NAV_LINKS` const
  (`href`/`label` pairs, unchanged hrefs/labels) shared by both
  `NavigationMenu` and the `CommandDialog`'s command list, so the two
  never drift out of sync. Each `NavigationMenuLink` uses the `render={<Link
  href={...} />}` polymorphic pattern (this codebase's base-ui-based
  components use `render`, not shadcn's older Radix `asChild`) and keeps
  the exact `hover:text-primary` class from the original.
- **User dropdown**: kept it to plain email text as the trigger (no
  `Avatar`) per the doc's "your call, keep it simple" — one `DropdownMenuItem`
  ("Log out") wired to the same `fetch('/api/auth/logout')` →
  `router.push('/login')` → `router.refresh()` logic, unchanged.
- **Command palette**: `CommandDialog` open state is local `useState`,
  toggled by a `keydown` listener for Cmd+K/Ctrl+K (`metaKey || ctrlKey`)
  registered in a `useEffect`. `CommandItem`s reuse `NAV_LINKS`; `onSelect`
  closes the dialog and calls `router.push(href)`. No actions beyond
  navigation, per the doc's explicit "shell only" scope.

### Deviation from doc (flagging for review)

While verifying Cmd+K live, the palette crashed with a runtime error:
`Cannot read properties of undefined (reading 'subscribe')` inside
`CommandInput`. Root cause: the pre-installed `apps/web/components/ui/command.tsx`'s
`CommandDialog` rendered `{children}` directly inside `DialogContent`
**without** wrapping them in a `<Command>` root — but `CommandInput` /
`CommandList` (from `cmdk`) require that root's context to function at
all. This is a bug in the already-installed shadcn file (predates this
batch), not something introduced by the nav redesign, and not a design
decision — it's the standard shadcn `CommandDialog` pattern (wrap
`children` in `<Command>`) that was simply missing. Fixed with a 1-line
change: `<DialogContent>{children}</DialogContent>` →
`<DialogContent><Command>{children}</Command></DialogContent>`. Flagging
this explicitly since it touches a shared `ui/` file outside this batch's
listed file set — please review that single-line diff in
`apps/web/components/ui/command.tsx`.

### Verification performed

- `npm run build --workspace=@missa/web` — clean, zero TypeScript errors
  (full output below).
- Live dev-server check (`next dev -p 3301`, stopped after verification;
  temporary `.claude/launch.json` "web-dev" entry added and reverted
  afterward — final diff has no launch.json change):
  - Nav renders all 6 links (Opportunities, Inbox, Tracker, Workspace,
    Submissions, Your reviews) via `NavigationMenu`, same labels/hrefs.
  - Clicked the email trigger — `DropdownMenu` opens showing "Log out".
  - Added a temporary `apps/web/components/_test-toast.tsx` (mounted once
    in `layout.tsx`) that called `toast('test')` on mount — confirmed the
    toast rendered bottom-right via `Sonner`. Removed both the temp file
    and its import/mount from `layout.tsx` before finishing (verified via
    `git status` — no debug artifacts left in the diff).
  - Dispatched a synthetic Cmd+K `keydown` — palette opened (after the
    `command.tsx` fix above), listing all 6 nav items under a "Navigate"
    heading. Clicked "Tracker" — dialog closed, app navigated to
    `/tracker`, page rendered correctly.
  - Checked browser console — no errors after the fix.
- Did not touch any file under `app/(passport)/`, `app/(workspace)/`,
  `app/login/`, or `app/org/`, and did not change `AppNav`'s `{ email:
  string }` prop signature — both call sites
  (`app/(passport)/layout.tsx`, `app/(workspace)/layout.tsx`) need no
  changes.

### Build output (final, post-cleanup)

```
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 2.1s
  Running TypeScript ...
  Finished TypeScript in 2.2s ...
  Collecting page data using 9 workers ...
  Generating static pages using 9 workers (0/16) ...
✓ Generating static pages using 9 workers (16/16) in 72ms
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

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Task checklist (Success criteria from the doc)

- [x] `npm run build --workspace=@missa/web` clean, zero TypeScript errors.
- [x] Nav renders identically in content (same 6 links, same labels) via
      `NavigationMenu`; logout still works (same API call); Cmd+K opens a
      palette that navigates to any of the 6 sections.
- [x] Toast plumbing works — verified live, temp test call removed before
      finishing.
- [x] No existing page's behavior changes beyond the nav bar itself.

## Leader Review Notes

Reviewed the diff (root layout, app-nav.tsx, new theme-provider.tsx, and the flagged 1-line command.tsx fix — confirmed it's a genuine pre-existing bug, `CommandDialog` rendered children without the `<Command>` root that `cmdk`'s context requires). Independently rebuilt clean (`rm -rf .next`) and ran the build myself. Started the preview server, logged in as the demo North River rep, and verified live in a real browser:

- Nav renders all 6 links correctly via `NavigationMenu`.
- Email dropdown opens and shows "Log out" via `DropdownMenu`.
- Cmd+K opens the command palette; clicking "Tracker" navigates correctly and the Tracker page renders (confirmed via `window.location.pathname` and a screenshot, not just the accessibility tree — my first click attempt used an nth-of-type selector that may have mistargeted, a testing artifact on my end, not an app bug; a retest with a text-matched click confirmed correct, stable navigation).
- No console errors.

No issues found. No fix-request round needed. Approved as-is, including the out-of-scope `command.tsx` fix.
