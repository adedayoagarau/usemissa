---
type: quick-flow
status: in-review
baseline_commit: b53fb0d93f82633a4720f33c1825445493952d0a
---

# Quick Flow: Bulk-install shadcn/ui component library

## Intent (verbatim from user)

"this cannot be the UI for this app... time to download all the components
you need. https://ui.shadcn.com/docs/components see here. I am sure you will
need, virtually all of these components here."

## Why this matters

`apps/web` currently has only 7 shadcn components installed (badge, button,
card, input, label, select, tabs) — verified via `ls apps/web/components/ui/`.
Every other UI need across the app (dialogs, tables, dropdowns, toasts,
loading states, sheets, tooltips, etc.) has presumably been hand-rolled or
skipped, which is almost certainly why the current UI feels thin/incomplete.
Installing the full practical component set unblocks richer UI work later
without a CLI round-trip every time a new pattern is needed.

## Scope decision (leader-decided)

Fetched the live shadcn docs index — 73 named components total. Filtered to
what's actually relevant:

**Install these ~50 (not yet present)** — accordion, alert, alert-dialog,
aspect-ratio, avatar, breadcrumb, button-group, calendar, carousel, chart,
checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu,
empty, field, hover-card, input-group, input-otp, item, kbd, menubar,
native-select, navigation-menu, pagination, popover, progress, radio-group,
resizable, scroll-area, separator, sheet, sidebar, skeleton, slider, sonner,
spinner, switch, table, textarea, toggle, toggle-group, tooltip.

**Skip these 5** — `attachment`, `bubble`, `marker`, `message`,
`message-scroller`. These are shadcn's newer AI-chat-specific components
("AI Elements") — Missa is a submission-tracking platform, not a chat
interface. Installing them would add unused dependencies for a UI pattern
this product doesn't have. If a future feature genuinely needs a chat-like
surface, add these then, with actual context for why.

**Skip these 4 as separate `add` targets** — `data-table`, `combobox`,
`date-picker`, `typography`. These are shadcn *documentation recipes*
(composites of other primitives: table+react-table, popover+command,
popover+calendar; typography is just prose CSS guidance), not standalone
installable components. Once `table`/`popover`/`command`/`calendar` are
installed, building a data-table/combobox/date-picker for a specific real
use case (e.g. the admin Submissions inbox) is a follow-up feature task, not
part of this bulk install.

**Already have (skip, don't re-add)** — badge, button, card, input, label,
select, tabs.

## Approach

1. From `apps/web/`, run the shadcn CLI to add all ~50 components in the
   scope list above. The existing `components.json` (style: "base-nova",
   Base UI primitives via `@base-ui/react`, baseColor "neutral") is already
   configured — the CLI will respect it automatically, same as the 7
   existing components.
2. Batch this efficiently — the shadcn CLI accepts multiple component names
   in one invocation (e.g. `npx shadcn@latest add accordion alert avatar ...`),
   so this can likely be done in one or a few commands rather than ~50
   separate ones. Use `-y`/`--yes` (or whatever the installed CLI version's
   non-interactive flag is) to avoid interactive prompts blocking automation.
3. After installing, run `npm run build` for `apps/web` to confirm every new
   component compiles cleanly and doesn't break the existing app (new
   components pull their own dependencies — e.g. `sonner`, `embla-carousel-react`,
   `cmdk`, `vaul`, `react-day-picker`, `recharts` or similar for `chart` —
   confirm these installed correctly and don't conflict with existing deps).
4. Do NOT wire any of these into existing pages/components yet — that's a
   separate, larger design/UX task the user will scope next. This pass is
   purely "make the components available," matching the literal request.
5. Do NOT touch components.json's style/config — just add components within
   the existing configuration.

## Success criteria

- `apps/web/components/ui/` contains all ~50 newly-listed components (plus
  the 7 already present — 57 total), each a real, buildable file (not a stub).
- `npm run build` for `apps/web` succeeds with zero TypeScript errors.
- `package.json` shows the new component dependencies added cleanly (no
  version conflicts, no manual editing of unrelated dependencies).
- No existing page/component behavior changes — this is purely additive.

## Dev Notes

### Command run

From `apps/web/`:

```
npx shadcn@latest add -y accordion alert alert-dialog aspect-ratio avatar breadcrumb button-group calendar carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu empty field hover-card input-group input-otp item kbd menubar native-select navigation-menu pagination popover progress radio-group resizable scroll-area separator sheet sidebar skeleton slider sonner spinner switch table textarea toggle toggle-group tooltip
```

One invocation, 46 component names, `-y` to skip the interactive confirmation prompt. No retries were needed — the whole batch installed cleanly on the first attempt.

### Result

- CLI reported "Created 47 files" (46 new `components/ui/*.tsx` files, one for each requested component, plus `apps/web/hooks/use-mobile.ts` — a support hook pulled in as a dependency of `sidebar`).
- CLI reported "Skipped 4 files (files might be identical, use --overwrite to overwrite)": `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`. These were pulled in transitively as dependencies of other components (e.g. `calendar`→button, `command`→dialog→button, etc.) but correctly left untouched since they already exist. `--overwrite` was never passed, so this is expected, safe behavior — confirmed via `git status` that none of the 7 pre-existing components show as modified.
- `apps/web/components/ui/` now contains 53 files total: the 7 pre-existing (badge, button, card, input, label, select, tabs) + all 46 newly-listed components. Verified via `ls apps/web/components/ui/ | wc -l` → 53.
- `apps/web/components.json` — confirmed unchanged (`git diff --stat apps/web/components.json` produced no output).

### New files created (46 components + 1 hook)

`apps/web/components/ui/`: accordion.tsx, alert.tsx, alert-dialog.tsx, aspect-ratio.tsx, avatar.tsx, breadcrumb.tsx, button-group.tsx, calendar.tsx, carousel.tsx, chart.tsx, checkbox.tsx, collapsible.tsx, command.tsx, context-menu.tsx, dialog.tsx, drawer.tsx, dropdown-menu.tsx, empty.tsx, field.tsx, hover-card.tsx, input-group.tsx, input-otp.tsx, item.tsx, kbd.tsx, menubar.tsx, native-select.tsx, navigation-menu.tsx, pagination.tsx, popover.tsx, progress.tsx, radio-group.tsx, resizable.tsx, scroll-area.tsx, separator.tsx, sheet.tsx, sidebar.tsx, skeleton.tsx, slider.tsx, sonner.tsx, spinner.tsx, switch.tsx, table.tsx, textarea.tsx, toggle.tsx, toggle-group.tsx, tooltip.tsx

`apps/web/hooks/use-mobile.ts` (new file, dependency of `sidebar.tsx`)

### New dependencies added to `apps/web/package.json`

```
cmdk: ^1.1.1
date-fns: ^4.4.0
embla-carousel-react: ^8.6.0
input-otp: ^1.4.2
next-themes: ^0.4.6
react-day-picker: ^10.0.1
react-resizable-panels: ^4.12.1
recharts: ^3.8.0
sonner: ^2.0.7
```

Root `package-lock.json` updated accordingly (monorepo hoists to root lockfile). No version conflicts encountered; no unrelated dependencies touched.

### Build verification

Ran from project root: `npm run build --workspace=@missa/web`

- Internal workspace deps (`@missa/radar-engine`, `@missa/radar-adapters`, `@missa/workspace-engine`) compiled via `tsc` with no errors.
- `next build` (Turbopack) compiled successfully in 2.4s, TypeScript check finished in 2.3s with zero errors, all 16 routes generated/collected successfully (static + dynamic).
- **Build status: PASS.**

### Components skipped per scope decision (not installed, as planned)

- AI-chat-specific ("AI Elements"): `attachment`, `bubble`, `marker`, `message`, `message-scroller` — not applicable to Missa's submission-tracking domain.
- Documentation recipes / composites (not standalone installable components): `data-table`, `combobox`, `date-picker`, `typography`.
- Already present, left untouched: `badge`, `button`, `card`, `input`, `label`, `select`, `tabs`.

### Failures

None. All 46 components in scope installed successfully on the first attempt; no retries were required.

### Scope adherence

No existing pages/components were wired to the new UI components — this pass was purely additive, per the doc's explicit instruction. `components.json` style/config block was not modified.

## Leader Review Notes

Reviewed the diff and Dev Notes: confirmed the scope decision was followed exactly (46 installed, 5 AI-chat components skipped, 4 composite recipes skipped, 7 pre-existing left untouched — `git status` shows zero modifications to the existing 7 files). Independently ran a clean rebuild (`rm -rf apps/web/.next` first) and `npm run build --workspace=@missa/web` myself rather than trusting the report — zero TypeScript errors, all 16 routes generated. Spot-checked `sonner.tsx`: it depends on `next-themes`' `useTheme()`, which needs a `ThemeProvider` wrapped around the app and a mounted `<Toaster />` to actually function — neither exists yet, which is correct and expected (this pass is explicitly "make available," not "wire in"; `useTheme()` degrades gracefully without a provider, so it doesn't break the build).

No issues found. No fix-request round needed.

## What's NOT done (by design, flagged for the next task)

None of the 53 components are used anywhere yet — every existing page still renders exactly as before. Follow-up wiring work (not part of this pass):
- Mount `<Toaster />` (sonner) + wrap the app in `next-themes`' `ThemeProvider` in `apps/web/app/layout.tsx` for toast notifications to work anywhere.
- Actually redesign/upgrade specific pages to use the richer components (Dialog instead of ad-hoc modals, Table for the admin Submissions inbox, Skeleton for loading states, DropdownMenu for the nav, Sheet for mobile nav, etc.) — this is the real "fix the UI" work the user is after; installing the library was the prerequisite, not the redesign itself.
