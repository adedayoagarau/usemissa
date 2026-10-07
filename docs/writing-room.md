# Writing room (`/write`), stage 1

Status: prototype behind sign-in, not linked from public pages. Migration 0095
must be applied before account saving works in an environment.

## What it is

A blank page for writing, adapted from Freewrite (MIT, Farza Majeed; the
creator's fork is `adedayoagarau/akowe`). No Freewrite code is reused: it is a
native macOS app and Missa is a web app. What carries over is the interaction:

- one plain-text page and nothing else on screen;
- a timer (5 to 60 minutes, 15 by default) that hides the controls while it
  runs and brings them back when paused or finished;
- a choice of ten typefaces and a size (16–28px);
- a list of past entries, a new-entry button and full screen.

Freewrite's "chat" button, which sent an entry to ChatGPT or Claude, is not
carried over.

This is stage 1 of the writing plan: write mode. Later stages (drafts tied to
Library Works, word and page limits from a call, standard manuscript export,
long-form projects, `.scriv` import) are not started.

## The promise and how it is kept

The **Private** popover on the page says:

| Promise shown to the writer | How it is kept |
| --- | --- |
| Missa adds no AI here. Nothing suggests, rewrites or finishes your words. | The page has no such feature. `lib/writing-boundary.test.ts` fails if a writing-module file imports an AI or model SDK. |
| Your writing is never sent to an AI service or used to train one. | Text goes only to `PUT /api/me/writing/[id]` and the database. Sentry drops request bodies and has no session replay; PostHog runs without autocapture or session recording; analytics records the path, never the query or text. |
| Missa’s automated systems don’t read it. | Only `lib/writing-repository.ts` reads `creator_writing_entries`, and only the writing routes and `/write` import it. `lib/writing-boundary.test.ts` fails when any other file names the table or imports the repository. `/write` sends `Permissions-Policy: tools=()` and registers no WebMCP tools. |
| Deleting an entry removes it from your account. | `DELETE` removes the row. Audit events record creation and deletion with no text. Database backups follow the provider's retention; the privacy notice should say so before launch. |
| Extensions you add to your browser can still read pages you open. | Stated plainly, because Missa cannot control them. |

“AI” appears only in that popover. The roadmap rule is “no AI in product or
marketing language”; naming its absence here is a deliberate exception for
the writer's benefit and needs an owner decision before public launch.

## Saving model

`lib/writing-sync.ts` keeps text safe between the keyboard and the account:

1. Every change is kept on the device first (`localStorage`, per account).
2. It is saved to the account about a second after typing stops, and at least
   every four seconds while typing continues. Ctrl/⌘+S saves at once.
3. A device copy is removed only after the account confirms that exact text.
4. Each save names the revision it was written on. If another device saved
   since, or deleted the entry, the account refuses the save and this device's
   text becomes a new entry. Nothing is overwritten and nothing is dropped.
5. Offline, text stays on the device and is sent when the connection returns.
   Server errors retry with back-off (2 seconds up to 30).
6. If neither the account nor the device can keep the text, the page shows a
   “Copy text” alert and warns before closing.

Empty new entries are never saved. Entry ids are created on the device, so an
entry started offline keeps its identity. Two writing-room tabs in one browser
share the device copy; each replaces only the drafts it has seen, so neither
erases the other's.

## Decisions

- **Plain text, not rich text.** Matches Freewrite and keeps stage 1 free of the
  editor-library decision, which is hard to undo. `WritingSurface` is a native
  textarea, so typing, input methods, undo and assistive technology behave as
  the platform does.
- **Outside the creator shell.** `/write` has its own auth gate and no
  navigation rail; it links back to Home. A **Write** link is added to the
  creator navigation.
- **Rendered in the browser only.** The room reads device drafts before its
  first paint, so it is loaded with `next/dynamic` and `ssr: false`.
- **Writer typefaces.** Ten open-licence faces, grouped as serif, sans serif
  and typewriter, each previewed in the menu: Newsreader, Literata,
  EB Garamond, Libre Baskerville, Cormorant Garamond; Instrument Sans, Atkinson
  Hyperlegible Next; Courier Prime, iA Writer Duo, Anonymous Pro. They are
  self-hosted and downloaded only when picked, so choosing one sends nothing
  to a font service. Provenance, licences and changes are in
  `apps/web/fonts/writing/README.md`. Times New Roman, Garamond and other
  commercial or system faces are not included: they cannot be served under an
  open licence.
- **Language coverage.** Not every face draws every letter. EB Garamond and
  Libre Baskerville draw the Yoruba, Igbo and Hausa letters checked (ẹ ọ ṣ ị ụ
  ɓ ɗ ƙ); Newsreader, Instrument Sans, Courier Prime, Anonymous Pro and
  Atkinson Hyperlegible Next do not draw the dot-below letters, so those
  letters come from a fallback font and tone marks can sit loosely. The menu
  says which faces to use. Whether the default should move from Newsreader to
  EB Garamond is an open decision.
- **Serif by default, spelling check off by default.** Freewriting asks the
  writer not to stop for spelling; the check is one click away in More.
- **White canvas only.** Dark mode is an open decision in `DESIGN.md`; a
  writing room is a strong case for deciding it.
- **Own download, not the account export.** “Download all” returns one plain
  text file. Adding writing to `/api/me/export` changes that export's
  contract and is left for a follow-up.
- **Handle `write` reserved** so no creator profile can claim the route.

## Component handoff

- Intent: composition (`composition.writing-room`) and a new input surface
  (`input.writing-page`).
- New semantic component `WritingSurface`
  (`components/missa/writing-surface.tsx`). Gap recorded: the installed
  `Textarea` and the 20 local Studio textarea variants are bordered, labelled
  form fields; none is a borderless document surface. Long text inside forms
  stays `Field` + `Textarea`.
- Composition `WritingRoom` (`components/missa/writing-room.tsx`) uses installed
  `Button`, `ButtonGroup`, `DropdownMenu`, `Popover`, `Sheet`, `Item`, `Empty`,
  `Alert`, `AlertDialog` and Sonner. No registry items installed.
- Adaptations: semantic tokens only; the writer's chosen face for the page,
  `font-mono` for the timer, size and word count; controls fade with a 180ms
  opacity transition that reduced motion removes; hidden controls cannot be
  clicked until hovered or focused.
- States covered: blank, writing, saving, saved, offline, retrying, signed out,
  device only, cannot save, too long, opening, open failed, missing entry,
  changed or deleted on another device, empty list, delete confirmation,
  delete failure, timer running, paused and finished.

## Validation

- `lib/writing.test.ts`, `lib/writing-sync.test.ts` (14 cases: device-first
  saving, retries, offline, conflicts, deletes elsewhere, halted saving,
  broken device storage, deletes racing saves, two offline tabs sharing one
  browser), `lib/writing-repository.test.ts`
  (real Postgres: revisions, replays, conflicts, account isolation, deletion,
  audit events without text, export), `lib/writing-boundary.test.ts`.
- `e2e/writing-room.spec.ts` (relational): sign-in redirect, `tools=()` header,
  autosave, reload, offline and back, entries, focus return, promise, delete,
  axe on the page, the entries sheet and the typeface menu, timer hiding and
  keyboard reveal, and a typeface choice kept across a reload.
- Checked in Chromium at 1440×900, 390×844 and 720×450 (200% zoom), with long
  unbroken text and reduced motion; no horizontal scroll.
- Not yet checked: Safari and Firefox, real mobile devices with an on-screen
  keyboard, screen readers beyond the automated checks.

## Rollout

Apply the migration once per environment:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0095_creator_writing.sql
```

Without it, saves fail and text stays on the device with a retry notice.
Without `DATABASE_URL`, the room keeps text in the browser only and says so.
