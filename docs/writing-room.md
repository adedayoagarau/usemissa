# Writing room (`/doc`)

The room lives at `/doc`. The old `/write` address redirects there, with the
entry it names, so earlier links keep working.

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
| Missa’s automated systems don’t read it. | Only `lib/writing-repository.ts` reads `creator_writing_entries`, and only the writing routes and `/doc` import it. `lib/writing-boundary.test.ts` fails when any other file names the table or imports the repository. `/doc` (and `/write`) send `Permissions-Policy: tools=()` and registers no WebMCP tools. |
| Deleting an entry removes it from your account. | `DELETE` removes the row. Audit events record creation and deletion with no text. Database backups follow the provider's retention; the privacy notice should say so before launch. |
| Extensions you add to your browser can still read pages you open. | Stated plainly, because Missa cannot control them. |

“AI” appears only in that popover. The roadmap rule is “no AI in product or
marketing language”; naming its absence here is a deliberate exception for
the writer's benefit and needs an owner decision before public launch.

## Pages

A piece is a set of printed pages on one paper size: A4, US Letter, A5 or
chapbook (5.5 × 8.5 in).

- **Rich text.** Body text, heading, subheading and quotation; bold, italic,
  underline, strikethrough, superscript and subscript; line alignment; scene
  breaks (a rule between scenes); undo and redo. No links, code or embeds.
- **Keys from Google Docs.** Ctrl or ⌘ + . and , for superscript and
  subscript; Ctrl or ⌘ + \ clears formatting; Alt + Shift + 5 or ⌘ + Shift + X
  strike through (as well as Ctrl or ⌘ + Shift + S); Ctrl or ⌘ + Shift + C
  opens the word count. Keys match on the character typed, never the key's
  position, so letters made with AltGr (Polish ś, ć; German { [ ]) are never
  taken. Every key also has a menu or button.
- **Smart quotes and dashes** (More, a checkbox, off by default): curly quotes,
  an em dash for two hyphens, an ellipsis for three dots. Off by default so a
  poem's straight quotes stay as typed; Backspace straight after a change
  undoes it (`lib/writing-typing.ts`).
- **Word count** (the footer count, More, or the keys): pages, words,
  characters with and without spaces, and reading time at 238 words a
  minute. With text selected, the footer reads "4 of 1,240 words" and the
  dialog shows the selection's share of each count.
- **Every space is kept.** Tab writes a tab, runs of spaces stay as typed, and
  both survive saving, reloading and printing. In a list, Tab nests the item.
  Typing "- ", "+ " or "* " starts a list only at the start of a line, so a
  dash after a tab or spaces stays as typed. To leave a page by keyboard,
  press Escape, then Tab.
- **Format per page.** Each page has its own alignment, line spacing, letter
  spacing, margins (in millimetres), typeface and text size. Page format opens
  from the format bar; “Use this format on every page” copies it to the rest.
- **Page and section breaks, as in Google Docs and Word.** Ctrl+Enter (⌘+Enter
  on a Mac), or More, Page break, moves the text after the caret to a new
  page in the same section; a change of format reaches every page of the
  section. More, Section break, own format, does the same but the new page
  starts a section whose format is its own. A label between pages says which
  break is there; it never prints. Backspace at the very start of a page
  removes a page break, and the text flows back. A section break with a
  different format is removed only from More, Remove the section break before
  this page, and the joined pages take the format of the section before.
  Stored as `pageBreak` on the page; a page that neither continues nor
  follows a page break starts a section.
- **Pages are moved and deleted** from More. Arrow keys cross from the end of
  one page to the start of the next. Backspace on an empty page removes it.
- **Text flows from page to page.** In printed-pages view, paragraphs that
  run past a page's bottom margin move to the top of a page that continues it,
  made when needed, and the caret goes with them. Deleting text brings
  paragraphs back, and an empty continuing page goes away. A page the writer
  adds is never merged into another, so a page set apart for a poem stays
  apart. Text moves a whole paragraph at a time, so a paragraph is never split
  into two; a single paragraph longer than the page is marked so the writer
  can break it. Format changes reach every page of the section, and plain
  text gains no blank lines at these breaks or at page breaks (`continues` on
  the page); a section break adds one blank line.
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

## Quiet writing

All in More, kept on the device as preferences:

- **Quiet mode** (or Ctrl or ⌘ + Shift + F, Google Docs' compact mode key):
  the controls fade while the writer writes, with or without the timer. They
  come back on pointing at them or on reaching them by keyboard, and whenever
  a dialog or sheet is open.
- **Focus**: Every line clear, This paragraph, This sentence, or Dialogue. Everything but
  the paragraph or sentence in hand takes the muted text color (5.55:1 on
  paper, 7.34:1 in the dark room, so still WCAG AA). Sentences are found by
  the browser's Unicode rules (`Intl.Segmenter`); nothing reads what the words
  mean. Dialogue keeps what is inside quotation marks (“ ”, " ", ‘ ’, « »)
  clear on every page and dims the rest; it goes by the marks alone. Dimming
  never prints (`lib/writing-focus.ts`).
- **Typewriter scrolling** keeps the line being written in the middle of the
  window. It moves only as the writer types, never on a click, and jumps
  rather than glides; half a window of room below the last page lets the last
  line reach the middle.
- **Hide the word count** leaves "Word count" in the footer instead of the
  number; the dialog still opens from it.
- **Escape in full screen**: where the browser allows (Chrome and Edge),
  Escape reaches the page, so Escape then Tab still leaves it; holding Escape
  leaves full screen.

Not built, by choice: parts-of-speech highlighting (iA Writer, Scrivener's
Linguistic Focus). Even on the device it is automated reading of the writer's
words, which the room promises not to do (`docs/writing-research.md`).

## Snapshots, find and replace, appearance

- **Snapshots** (More, Snapshots…) keep the open piece as it stands: title,
  every page and its format, under an optional name. A snapshot can be
  compared with the text now, line by line, with lines only in the snapshot
  struck through and new lines marked; spaces and tabs count. Restoring keeps a
  snapshot of the text as it is first ("Before restoring …"), so nothing is
  lost. Up to 100 a piece; the oldest past that are let go. A snapshot is
  deleted with its piece. The piece must be saved to the account first.
- **Find and replace** (Ctrl/⌘+F or Ctrl/⌘+H, or More) searches every page and
  canvas text box in reading order, marks every match and the one in hand,
  and replaces one or all. Match case is optional. A match never reaches
  across paragraphs. Enter finds the next, Shift+Enter the previous, Escape
  closes the bar.
- **Appearance** (More): Light, Dark, or Match this device. Only the writing
  room turns dark; printing is always on white. The dark palette is Missa's
  (`.dark` in `app/globals.css`), with every text pair at WCAG AA or better.

## Writing for a call

- **More, Write for a call…** ties the open piece to a call in the writer's
  tracker. Calls already sent or decided are left out of the list; with none,
  the sheet points to Find calls. The piece must be saved to the account
  first.
- With a call tied, the sheet shows the call, its deadline, Guidelines, Apply
  and the tracker record, the writer's checklist for it, and checks on this
  piece: its words against the word limit, its printed pages against the page
  limit, the checklist, and, when the call reads blind, whether the writer's
  name is in the text. Limits taken from the listing say to confirm them in the
  guidelines. These are Missa's pre-submit checks (`lib/pre-submit-check.ts`),
  run on the piece in the browser (`lib/writing-call.ts`); the text is not sent
  anywhere for them.
- The footer shows words against the limit ("1,240 / 3,000 words"), marked
  when over. Change call and Write without a call are in the sheet.
- The link is kept with the piece (`call_id`, migration 0099) and survives
  saves from any device; it does not change the text's revision. If the call
  leaves the tracker, the sheet says so and offers another.

## Free canvas

Any page can switch between **Flowing text** and **Free canvas** (More, This
page's layout). A canvas page holds text boxes placed in millimetres from the
page's top left corner, each with its own width and turn, for concrete and
visual poetry. It prints exactly as set.

- Switching to a canvas puts the page's text in one box inside its margins.
  Switching back joins the boxes in reading order (top to bottom, then left to
  right), every word and space kept.
- A box moves by dragging its handle. From the keyboard, with the handle
  focused, arrow keys move it 1 mm (10 mm with Shift), Alt with left or right
  narrows or widens it, and `[` and `]` turn it 15°. The box's menu turns,
  straightens, widens, narrows, brings to front, sends to back or deletes it.
- New boxes come from **Add a text box** in More, or by double-clicking or
  double-tapping the paper where the box should go.
- Text never flows into or out of a canvas page. Plain text, word counts and
  compile read the boxes in reading order. Compile adds a piece's title only
  to a flowing first page.
- Positions are kept to a tenth of a millimetre and checked on the server
  (up to 200 boxes a page).

## The planner (Plus)

Part of Plus and Pro (`writingPlanner` in
`packages/radar-adapters/src/creatorEntitlements.ts`). On Free, a project's
Outline keeps its synopsis and status for each piece and says once, with the
shared `UpgradeHint`, what Plus adds.

- **Index cards.** Every piece in a project has a card: synopsis and status,
  then point of view, characters, place, when it happens in the story, the
  plotlines it carries, tags, goal, conflict, outcome and a word target. Every
  field is optional. Cards are the writer's notes about a piece, never its
  text (`lib/writing-cards.ts`, `card` on the piece, migration 0100).
- **Plotlines.** A project's threads (the main story, a romance, one
  character's arc), named by the writer and marked with a categorical
  `HueTile` (`plan` on the project, migration 0100).
- **Corkboard.** The cards in binder order, or gathered by plotline, status or
  point of view. A card that carries two plotlines sits in both.
- **Outline.** A table of the pieces with point of view, plotlines, status and
  words against each target, with the totals for the project.
- The server checks the plan before saving a card or plotlines (403 with
  `locked: "writingPlanner"` otherwise); synopsis and status stay free.
  A writer who leaves Plus keeps every card; they show again on return.

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
- **Text flows, pages the writer adds stay put.** Writers expect prose to
  continue onto the next page by itself, as in a word processor. Flow happens
  only between a page and the pages made to continue it, so a page the writer
  added for a poem is never pulled into another. Changed from stage 2's first
  version, which marked overflow and left the move to the writer.
- **Outside the creator shell.** `/doc` has its own auth gate and no
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
- `WritingCall` (`components/missa/writing-call.tsx`) is a `Sheet` of `Item`s
  with `Empty` and `Spinner`, and reuses `PreSubmitCheckList`, extracted from
  `components/missa/pre-submit-check.tsx` so the tracker and the room show
  checks the same way. States: no calls, loading, failed with retry, call
  left the tracker, linked, passed, needs attention, and saving.
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
  kept, with axe on the new-project dialog, the binder and the outline; and a
  piece tied to a call read blind with a word limit: the name check, the
  footer count going over, the link kept across a reload, and untying it, with
  axe on the call sheet.
- `lib/writing-call.test.ts` (word and page limits, blind reading, the footer
  meter).
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
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0098_creator_writing_snapshots.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0099_creator_writing_calls.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f packages/db/migrations/0100_creator_writing_cards.sql
```

0096 to 0100 add tables and nullable or defaulted columns only, so each can
run before its code ships. 0097 uses `ON DELETE SET NULL (project_id)`, which
needs Postgres 15 or later. Without it, saves fail and text stays on the device with a retry notice.
Without `DATABASE_URL`, the room keeps text in the browser only and says so.
