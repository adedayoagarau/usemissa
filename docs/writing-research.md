# Writing room research: Scrivener grade and beyond

October 2026. Four research tracks, run to decide what the writing room
builds after the four agreed stages (`docs/writing-roadmap.md`):

1. Scrivener 3 in depth: the official manual (Mac, revision 3.5.2-01), the
   Literature & Latte forum, reviews.
2. Novel and book planning: Plottr, Aeon Timeline 3, Campfire, Dabble, Novlr,
   LivingWriter, bibisco, Manuskript, yWriter, Wavemaker, Fictionary, Notion
   templates; story-structure frameworks.
3. Book typesetting and export: Vellum, Atticus, Reedsy Studio, Kindle Create,
   Scrivener compile, Affinity; KDP and IngramSpark specs; standard manuscript
   format; poetry and chapbooks; browser print engines and libraries, with
   Chromium 141 print features tested directly.
4. Google Docs and Word shortcuts, page and section breaks, quiet writing
   (iA Writer, Ulysses, Scrivener, FocusWriter, Typora), and the room's
   current key bindings read from the code.

Sources are linked inline. Claims a track could not confirm are marked
unverified. The rule that shapes every recommendation: no AI in the writing
room. Nothing generates, suggests, rewrites or analyzes a writer's words with
a model. "Smart" features below are arithmetic over counts and fields the
writer enters.

## Where the room stands

| Area | Scrivener 3 | Missa today |
| --- | --- | --- |
| Binder of reorderable pieces, projects from templates | Yes | Yes |
| Outline with synopsis and status | Yes, with rolled-up totals and custom columns | Synopsis and status only |
| Corkboard of index cards (linear, freeform, by label) | Yes | No |
| Edit several pieces as one text (Scrivenings) | Yes | No (compile is read-only) |
| Labels, keywords, custom metadata, collections, saved searches | Yes | No |
| Split editor, research beside the draft | Yes, plus PDFs, images, web pages | No |
| Snapshots with compare and restore | Yes | Yes |
| Find and replace | Project-wide, regex | Open piece only |
| Targets: project, document, session from a deadline; writing history | Yes (no days off) | Timer only |
| Composition mode, typewriter scrolling, focus dimming | Yes | Controls fade while the timer runs |
| Margin comments, footnotes, revision colors | Yes | No |
| Pages as printed, per-page format, free canvas | Page view only | Yes, beyond Scrivener |
| Compile: manuscript, paperback PDF, EPUB, DOCX | Yes, and its most-cited pain | Print, PDF via browser, plain text |
| Writing for a call, with limit and blind-reading checks | No | Yes |

What keeps writers on Scrivener, in their own words: moving scenes without
copy and paste; the corkboard as an overview; the outliner's progress bars;
split view and Scrivenings; snapshots before a rewrite; deadline targets; and
one project compiling to several outputs. What drives them away: compile
complexity ("after about 50 compiles still can't get the look"), fragile sync
between devices, lost poetry line breaks in export, no collaboration, no
Android, and a steep learning curve
([forum](https://forum.literatureandlatte.com/t/what-is-your-favourite-scrivener-feature-and-what-is-the-most-useful-feature/121556),
[compile thread](https://forum.literatureandlatte.com/t/another-one-of-the-periodical-compiling-is-traumatic-threads/143959?page=2),
[poetry thread](https://forum.literatureandlatte.com/t/using-scrivener-to-format-books-of-poetry/92836)).

Missa already answers sync (device-first saving that never overwrites
another device), poetry layout (every space and tab kept, per-page format)
and live pages instead of compile-then-look. The gaps are planning,
structure views, targets, quiet writing, annotations and real book export.

## Findings

### Shortcuts and breaks

Read from the code: each page is its own editor, so select-all, outline,
focus and typewriter scrolling must work at room level. Wrong today:

- Ctrl/⌘+Enter inserts a line break. In Docs and Word it is a page break.
- Tab inside a list types a tab instead of nesting the item.
- ⌘+H on a Mac hides the browser, so find and replace never opens. Docs uses
  ⌘+Shift+H.
- The format bar's "Section break" inserts a scene break (a rule). Real
  section breaks would collide with that name.
- In full screen, Escape leaves full screen before it can leave the page.
- Typing `- `, `* ` or `1. ` turns a line into a list, even after a tab,
  which breaks the promise that every space and tab is kept as typed.

Docs and Word semantics: a page break moves text to the next page; a section
break starts a new formatting unit (next page or continuous; Word adds odd
and even page) that carries its own margins, orientation, headers and
footers, and page numbering
([Docs](https://support.google.com/docs/answer/11526892),
[Word](https://support.microsoft.com/en-US/Word/use-section-breaks-to-change-the-layout-or-formatting-in-one-section-of-your-word-document)).
In DOCX a section is a `w:sectPr` on its last paragraph.

How it maps to the room: a page that does not continue the one before is
already a section (its own format from there on). So:

- **Page break** (Ctrl/⌘+Enter): split at the caret into a new page that
  keeps the section's format (a "same format as before" link, like Docs'
  "Link to previous").
- **Section break, next page** (menu): the same, with its own format. This is
  today's "Add a page after this one".
- **Section break, continuous**: not supported; margins can't change mid-page.
  A canvas page covers the layouts that need it.
- **Backspace at the start** of a page removes the break and pulls the text
  back.
- **Show breaks**: labels between sheets, and inline in draft view.
- **Scene break** is renamed from "Section break".

Shortcuts worth adding, all with MIT Tiptap extensions or small commands:
superscript and subscript (Ctrl/⌘+. and ,), clear formatting (Ctrl/⌘+\),
strikethrough aliases (Alt+Shift+5, ⌘+Shift+X), word count dialog
(Ctrl/⌘+Shift+C, with the selection's count and reading time), Snapshots
(Ctrl/⌘+Alt+Shift+H), compact or quiet mode (Ctrl/⌘+Shift+F), link
(Ctrl/⌘+K), smart quotes and dashes as a preference, move paragraph up or
down, and a special-character palette (non-breaking space, Yoruba, Igbo and
Hausa letters). Rules: every shortcut also has a menu route; no handler
matches `event.code`, so AltGr letters (Polish ś, ć; German { [ ]) are never
taken; browser keys (Ctrl+N/T/W, Ctrl+1–9, zoom, F11) stay the browser's.

### Quiet writing

The common set across iA Writer, Ulysses, Scrivener, FocusWriter and Typora
([iA](https://ia.net/writer/support/editor/focus-mode),
[Ulysses](https://help.ulysses.app/editor-customization-guide),
[Scrivener](https://www.literatureandlatte.com/blog/distraction-free-writing-with-scrivener),
[Typora](https://support.typora.io/Focus-and-Typewriter-Mode)):

- chrome hidden while typing, back on pointer movement or keyboard focus;
- focus dimming of everything but the current paragraph or sentence;
- typewriter scrolling that keeps the line at a chosen height, only while
  typing;
- an option to hide the word count.

Sentence detection can use `Intl.Segmenter`, which follows Unicode rules: no
model, no reading of meaning. Dimmed text must stay at 4.5:1 contrast through
a token, not opacity, and the mode must be easy to switch off (WCAG 1.4.3).
Typewriter scrolling is instant, never animated.

**Not recommended:** parts-of-speech highlighting (iA Writer, Scrivener's
Linguistic Focus). Even on the device it is automated reading of the
writer's text, it would contradict the room's promise, and it works in
English only. The on-brand alternative is a list of the writer's own words to
watch, highlighted by plain search. A dialogue highlight driven only by
quotation marks would also be acceptable.

### Planning a novel or a book

**Scene and chapter cards.** The fields writers actually fill
([yWriter](https://spacejock.com/yWriter7.html),
[Plottr](https://plottr.com/features/), Fictionary): title, synopsis, point
of view, status, target and actual words, plotlines, color; then characters
present, location, story date and time, goal, conflict, outcome, tags; and
for some, tension, scene or sequel, threads opened and closed, an "unused"
flag. Writers start with few fields and add more, so every field is optional
and the writer can add their own. The card must be the binder piece itself:
Plottr's main complaint is that the plan lives in a separate app from the
draft.

**Plotline grid.** Plotlines as rows, chapters or pieces as columns, cards
where they meet (Plottr's timeline, Dabble's plot grid). Writers use it to see
that every subplot keeps appearing. A grid can also stand alone for a series.

**Story bible.** Characters, places, items and the writer's own kinds, each
with fields, images, other names, relations (a family tree), and an automatic
"Appears in" list of pieces. Series scope, with values that can change from
book to book (Plottr users ask for this; Campfire sells each part as a
module).

**Timeline, and what "multi-branch" means.** Writers use "branch" for four
different things:

1. parallel lanes, one per character or arc, against one clock (Aeon's arcs,
   Campfire's rows) — what most people mean;
2. several timelines in one project, such as eras or worlds (Campfire, World
   Anvil Chronicles, where one event can sit on several timelines);
3. true alternate versions that fork from an event and can be compared — no
   mainstream novel tool does this; Aeon staff point users to copied arcs and
   filters ([Aeon forum](https://forum.aeontimeline.com/t/alternative-timeline-and-compare/2189));
4. the order a story is told in against the order events happen (Aeon's
   Narrative and Timeline views) — the one novelists with flashbacks need most.

Dates must be allowed to be loose, ranged or missing: Campfire's requirement
that every scene has a date is a common complaint. Ages at each event come
from birth dates (Aeon). Dependencies between events ("after", "blocks") are
highlighted when broken, never silently fixed.

**Story structures.** Three-act, Save the Cat (15 beats with positions, for
example the midpoint at 50%), seven-point, Story Circle, Hero's Journey,
Snowflake as a guided worksheet, Freytag, Kishōtenketsu; scene and sequel and
the MICE quotient as per-scene fields. Beat names and positions are facts;
descriptive text from authored frameworks (Save the Cat, Romancing the Beat)
needs a license check before it is reproduced.

**The smart planner, with no AI.** Each of these is arithmetic over counts and
fields:

- deadline targets: words left ÷ writing days left, skipping weekdays and
  dates the writer marks, fixed when the day starts, showing days ahead or
  behind (Dabble does this; Scrivener can't skip days);
- writing history: words per day for the project and each piece;
- pacing: where each beat was planned (50%) against where its scene falls by
  word count (61%);
- point-of-view share and sequence; character presence by chapter;
- plotline gaps: a plotline missing for more than N chapters;
- chapter and scene length against the book's average;
- goal, conflict and outcome left empty; runs of scenes with no conflict;
- timeline checks: events out of order against their dependencies, a
  character before birth or after death, one character in two places at once;
- continuity, "who knows what": a fact a character learns in scene 12, flagged
  if a scene before 12 says they use it. No tool reviewed does this.

Plottr already markets "No AI" on every plan
([pricing](https://plottr.com/pricing/)), so Missa's edge is planning that
lives on the manuscript itself, plus these checks.

### Book typesetting and export

What writers expect from Vellum, Atticus and Reedsy
([Vellum](http://help.vellum.pub/print/settings/),
[Vellum auto-layout](https://help.vellum.pub/print/auto-layout/)): trim
presets (5×8, 5.5×8.5, 6×9 first), mirrored margins with a gutter that grows
with page count (KDP's floor: 0.375″ to 150 pages up to 0.875″ past 700,
[KDP](https://kdp.amazon.com/en_US/help/topic/GVBQ3CMEQW3W2VL6)), chapter
opener styles, drop caps and small-caps first lines, ornamental scene breaks
(shown differently at a page edge), front and back matter with their own
rules, roman then arabic page numbers, no running head on chapter openers,
chapters on the right-hand page, automatic widow and orphan control, EPUB and
print PDF.

Submissions: standard manuscript format
([Shunn](https://www.shunn.net/format/story/all/)) — 12 pt Times or Courier,
double spaced, 1″ margins, half-inch indents, a header of surname, title and
page from page 2, a centered `#` for scene breaks, word count rounded — sent
as DOCX. Poetry manuscripts are single spaced, with stanzas kept whole where
possible, "continue stanza" or "begin new stanza" on carried pages, and page
numbers restarting per poem
([Shunn, poems](https://www.shunn.net/format/2013/10/formatting_long_and_multiple_p.html)).
Saddle-stitched chapbooks need a page count that is a multiple of four.

Browser engines, tested in Chromium 141: page sizes, mixed sizes through named
pages, left and right margins, margin boxes and page counters work. Forcing a
chapter onto a right-hand page, a different first page per named page,
running heads taken from the text, and automatic hyphenation do not. So the
room keeps laying out its own pages, as it already does, and computes recto
starts, blank pages, running heads and numbering itself.

Libraries, all permissively licensed: Hyphenopoly (MIT) for the same
hyphenation on screen, in print and in files; `docx` (MIT) for Word files
with real sections; a small EPUB 3 writer on JSZip, checked with EPUBCheck in
CI; Playwright with Chromium (Apache-2.0) later for one-click PDF on the
server. Avoid Vivliostyle in the app (AGPL) and Paged.js as a core dependency
(its stable release is from 2023). Don't call output "PDF/X" without a
preflight step.

## Recommended plan

In order. Each stage ships on its own, with tests, docs and the policy and
catalogue updates AGENTS.md requires.

| Stage | What the writer gets | Storage |
| --- | --- | --- |
| E. Editor essentials | Page break on Ctrl/⌘+Enter, section breaks, Backspace removes a break, show breaks, scene break renamed; Tab nests lists; ⌘+Shift+H on Mac; superscript, subscript, clear formatting, strikethrough aliases; word count dialog with the selection and reading time; smart quotes and dashes as a preference; list typing rules only where they can't eat a poem's indent | Document JSON only |
| F. Quiet writing | Quiet mode apart from the timer, focus dimming by paragraph or sentence, typewriter scrolling, hide the count, Escape in full screen, watch-words | Preferences only |
| G. Cards and corkboard | Fields on every piece (point of view, characters, place, story date, plotlines, tags, goal, conflict, outcome, target, the writer's own), a corkboard by order, plotline or status, an outliner with columns and rolled-up totals, saved views, and editing a run of pieces as one text | New tables |
| H. Story bible | Characters, places, items and custom kinds with fields, images, other names, relations, "Appears in", series scope | New tables |
| I. Plot grid and structures | Plotline grid tied to the binder or standalone for a series; structure templates as an overlay; pacing against beats; plotline gaps | Builds on G |
| J. Goals and history | Deadline targets that skip days off, fixed at day start, ahead or behind; writing history per day | New table |
| K. Timeline | Story order and telling order side by side, loose dates, lanes per character or arc, ages, dependencies, continuity checks; alternate branches that fork from an event, last | New tables |
| L. Book design and export | Book designs (trim, gutter by page count, openers, drop caps, ornaments, running heads), front and back matter, recto starts, widows and orphans, hyphenation; chapbook padding; print preflight; DOCX in standard manuscript format, EPUB 3, then server PDF | Project settings |
| M. Notes and research | Margin notes, endnotes then footnotes, links, research (images and PDFs) beside the draft in a split view | Document JSON and storage |

Stage E is what the owner asked for next and corrects wrong behavior, so it
goes first.
F is small and makes the room feel finished. G to K are the planner, in the
order their data depends on each other. L is the largest and benefits from the
section model E introduces.

## Decisions

Made by the owner in October 2026:

- Stages G to K, the planner, are part of Plus (and Pro). Everything before
  them stays in every plan. Free accounts see what Plus adds, once, calmly.
- Dialogue highlighting by quotation marks is within the room's promise and
  is built (Focus, Dialogue). Parts-of-speech highlighting is not.
- Smart quotes and dashes are off by default.
- Story-structure templates (stage I) ship the beat names and positions,
  which are facts, with short descriptions in Missa's own words, crediting
  each framework by name ("after Blake Snyder"). No author's text is copied,
  so no license is needed.
