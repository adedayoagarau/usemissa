# Writing room (`/write`)

Status: behind sign-in, not linked from public pages. Migrations 0095, 0096 and
0097 must be applied before account saving works in an environment. What comes
next is in `docs/writing-roadmap.md`.

## What it is

A blank page for writing, adapted from Freewrite (MIT, Farza Majeed; the
creator's fork is `adedayoagarau/akowe`). No Freewrite code is reused: it is a
native macOS app and Missa is a web app. What carries over is the interaction:

- the page and nothing else on screen;
- a timer (5 to 60 minutes, 15 by default) that hides the controls while it
  runs and brings them back when paused or finished;
- a choice of ten typefaces and a text size;
- a list of past entries, a new-entry button and full screen.

Freewrite's "chat" button, which sent an entry to ChatGPT or Claude, is not
carried over.

Stage 1 was write mode: one plain-text page. Step 1 of stage 2 adds rich text
on printed pages, each with its own format (see **Pages** below). Step 2, a
free canvas any page can switch to, is not started. Later stages (drafts tied to
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

## Pages

A piece is a set of printed pages on one paper size: A4, US Letter, A5 or
chapbook (5.5 × 8.5 in).

- **Rich text.** Body text, heading, subheading and quotation; bold, italic,
  underline and strikethrough; line alignment; section breaks; undo and redo.
  No links, code or embeds.
- **Every space is kept.** Tab writes a tab, runs of spaces stay as typed, and
  both survive saving, reloading and printing. To leave a page by keyboard,
  press Escape, then Tab.
- **Format per page.** Each page has its own alignment, line spacing, letter
  spacing, margins (in millimetres), typeface and text size. Page format opens
  from the format bar; “Use this format on every page” copies it to the rest.
- **Pages are added, moved and deleted** from More. Arrow keys cross from the
  end of one page to the start of the next. Backspace on an empty page removes
  it.
- **Text that runs past the bottom margin** is marked with a dashed line and a
  “Move the rest to a new page” button. Pages do not split text by
  themselves: where a page ends is the writer's choice.
- **Two views.** Printed pages show each sheet at its real proportions, scaled
  to the window. Draft drops the paper and is the default below 768px wide.
- **Print or save as PDF** uses the browser's print dialog with the paper size
  set, one sheet per page and no controls.
- **A title** sits above the first page and names the entry in the list.

The document is JSON (`lib/writing-document.ts`): version, paper size,
typeface, text size and pages. Each page has an id, a kind (`flow` now; the
canvas will be another kind), its format and its text as ProseMirror JSON. The
server checks the shape and limits (500 pages, 2,000,000 characters, nesting
depth 40) before saving. `body` stays the plain text of every page, used for
the word count, previews and the plain-text download. Entries saved before
pages existed open as one page with their text unchanged.

## Projects

A project gathers pieces (entries) into one body of work: a poetry
collection, a story, a novel, an essay or an application.

- **Templates.** A new project can start blank or with its template's first
  pieces, created in one statement with the project: a story gets Draft and
  Notes; a novel gets three chapters, Characters and Notes; an application gets
  Artist statement, Project description, Bio and Work sample notes.
- **Binder.** The library sheet shows projects and loose pieces. A project's
  binder lists its pieces in order. Pieces are reordered by dragging the handle
  (the installed `Sortable`) or with Move up and Move down in each piece's menu,
  which is the keyboard and screen reader path. A piece moves between projects,
  or back to loose pieces, from the same menu.
- **Outline.** Each piece has a synopsis and a status (Idea, First draft,
  Revised, Final), shown in order with word counts. Only the writer sees them.
- **Compile.** Joins every piece in order into one manuscript: paper size,
  an optional title page, and each piece's title at the top of its first page.
  Each page keeps its own format. The result opens in place of the editor, to
  print, save as PDF or download as plain text. Words kept on the device but not
  yet confirmed by the account are compiled too.
- **A new piece in a project** is created there when it is first saved, even
  if it was started offline; a piece that forks after a conflict stays in the
  same project.
- **Deleting a project keeps its pieces.** They become loose pieces.

Ordering, moving and the index card never change a piece's revision, which
tracks its text alone, so reordering on one device never conflicts with
writing on another. A project belongs to one account, and the composite key
`(project_id, account_id)` makes a piece in another account's project
impossible.

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

- **Tiptap for the editor.** Rich text needs a document model; writing one
  that handles input methods, undo and assistive technology is not worth
  doing. Tiptap 3.31.4 (MIT) wraps ProseMirror. Only the MIT core is used:
  `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` and
  `@tiptap/extension-text-align`, pinned to exact versions. None of Tiptap's
  AI, collaboration or cloud packages is installed, and the boundary test
  still rejects AI SDK imports. Each page is its own editor, so a page's
  format cannot leak into the next.
- **Pages break where the writer says.** Automatic reflow across pages would
  move a poem's lines without asking; marking the overflow and offering a move
  keeps the layout in the writer's hands.
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
- Semantic component `WritingPages` (`components/missa/writing-pages.tsx`),
  replacing `WritingSurface`. Gap recorded: the installed `Textarea` and the
  20 local Studio textarea variants are bordered plain-text form fields; no
  registry offers a paged rich-text document. Long text inside forms stays
  `Field` + `Textarea`.
- `WritingFormatBar` and `WritingFormatSheet`
  (`components/missa/writing-format.tsx`) are built from installed
  `Button` (pressed state via `aria-pressed`), `Tooltip`, `NativeSelect`,
  `RadioGroup`, `Input`, `Field` and `Sheet`.
- Composition `WritingRoom` (`components/missa/writing-room.tsx`) uses installed
  `Button`, `ButtonGroup`, `DropdownMenu`, `Popover`, `Sheet`, `Item`, `Empty`,
  `Alert`, `AlertDialog` and Sonner. No registry items installed.
- Adaptations: semantic tokens only; the writer's chosen face for the page,
  `font-mono` for the timer, size and word count; controls fade with a 180ms
  opacity transition that reduced motion removes; hidden controls cannot be
  clicked until hovered or focused.
- States covered: blank page, overflowing page, one page (delete and move
  disabled), printed and draft views, blank, writing, saving, saved, offline, retrying, signed out,
  device only, cannot save, too long, opening, open failed, missing entry,
  changed or deleted on another device, empty list, delete confirmation,
  delete failure, timer running, paused and finished.

## Validation

- `lib/writing-document.test.ts` (spaces and tabs kept exactly, page text
  order, rejected documents).
- `lib/writing-projects.test.ts` (compile keeps every page and its format,
  unique page ids, plain-text compile, request checks).
- `lib/writing.test.ts`, `lib/writing-sync.test.ts` (17 cases, including title
  and page changes, device drafts kept before pages existed, and a piece that
  is created in its project and stays there when it forks; device-first
  saving, retries, offline, conflicts, deletes elsewhere, halted saving,
  broken device storage, deletes racing saves, two offline tabs sharing one
  browser), `lib/writing-repository.test.ts`
  (real Postgres: revisions, replays, conflicts, account isolation, deletion,
  audit events without text, export, projects from templates, piece order, cards, compile order, no piece in another account's project, deleting a project keeps its pieces), `lib/writing-boundary.test.ts`.
- `e2e/writing-room.spec.ts` (relational): sign-in redirect, `tools=()` header,
  autosave, reload, offline and back, entries, focus return, promise, delete,
  axe on the page, the entries sheet and the typeface menu, timer hiding and
  keyboard reveal, a typeface choice kept across a reload, and a second page
  with its own line spacing, letter spacing and alignment, with tabs and
  spaces, kept across a reload, axe on the format panel, and an A4 sheet at
  210mm wide; and a project from a template, opening and writing a piece,
  reordering by menu, outline status and synopsis kept across a reload,
  compile, moving a loose piece in, and deleting the project with its pieces
  kept, with axe on the new-project dialog, the binder and the outline.
- Print output checked as PDF: one sheet per page at the paper size, each
  page's own format, no controls.
- Checked in Chromium at 1440×900, 390×844 and 720×450 (200% zoom), with long
  unbroken text and reduced motion; no horizontal scroll.
- Not yet checked: Safari and Firefox, real mobile devices with an on-screen
  keyboard, screen readers beyond the automated checks.

## Rollout

Apply the migrations once per environment, in order:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0095_creator_writing.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0096_creator_writing_pages.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0097_creator_writing_projects.sql
```

0096 and 0097 add a table and nullable or defaulted columns only, so each can
run before its code ships. 0097 uses `ON DELETE SET NULL (project_id)`, which
needs Postgres 15 or later. Without it, saves fail and text stays on the device with a retry notice.
Without `DATABASE_URL`, the room keeps text in the browser only and says so.
