---
title: Public profile — add-ons, work pages and share kit (build spec)
status: in progress
date: "2026-10-07"
related:
  - ./public-profile-redesign-concepts-2026-10-03.md
  - ./public-creator-profile-design.md
  - ./directory-portfolio-integration-handoff.md
---

# Public profile — add-ons, work pages and share kit

Build spec for the parts of the October concept canvas that were not yet in
`apps/web`. The canvas is
https://claude.ai/artifact/VwETHP1gkDMQNbuEUvFfJV (13 boards, private). The
first build (4 October) shipped the profile, the studio and the Missa-native
layer. This build adds everything the add-on library, the work page and the
share kit boards show, and connects each piece to the profile builder
(`ProfileStudio`).

Fictional creators (Riley Chen, Nadia Okafor, Juno Adeyemi, Wren Ito) and every
organization named on the canvas are fictional.

## What the canvas has that the first build did not

| Canvas board          | Not yet built                                                                 | Stream  |
| --------------------- | ----------------------------------------------------------------------------- | ------- |
| Add-on library        | Editions, Shows and performances, Services, Teaching, Support                 | A, B    |
| Add-on library        | Collaborators (both sides confirm), Booking kit (files, bios)                 | F       |
| Add-on library        | Plates and series, Screening, chapters and transcripts, Case study            | C       |
| Work page             | A page for one work: contents, parts, credits, context, previous and next     | D       |
| Share kit             | Story image, event card with a QR code, email signature                       | E       |
| Editor                | Add an add-on, craft presets, Default theme, drag to reorder, View as         | core    |
| Components and states | Player states, media error and loading on work cards, viewer-specific actions | C, core |

## The foundation (already in this branch)

Read these before changing anything.

- `lib/creator-portfolio-schema.ts` — schema v3, all additive. Old drafts and
  snapshots parse unchanged; no database migration.
  - Modules are now 13: the six core ones plus `ADDON_MODULES` (`editions`,
    `shows`, `collaborators`, `booking`, `services`, `teaching`, `support`).
    An add-on is on the profile only when its module entry has `added: true`.
    `activeModules()` is the list the rail and the page use; `setAddon()` turns
    one on or off and never deletes its data.
  - New arrays and objects: `editions`, `shows`, `collaborators`, `booking`
    (`shortBio`, `longBio`, `files`), `services`, `teaching`, `support`.
  - Work gained `slug`, `series`, `medium`, `size`, `edition`, `video`,
    `chapters`, `transcript`, `brief`, `role`, `client`, `clientOrganization`,
    `outcome`, `about`, `madeDuring`, `supportedBy`, `rights`, `credits`,
    `parts`. Make blank works with `createWork()`.
  - Theme `default` (white canvas) joins `sage`, `mineral`, `night`.
  - `withServerProvenance(draft, outcomes, facts)` also replaces what only the
    server may say: `collaborators[].confirmed` and `booking.files[].type/bytes`.
    A client value for either is always discarded.
  - `publicPortfolioProjection()` drops add-ons that are not added, collaborators
    that are not confirmed, past teaching dates, untitled items and empty files.
- `lib/creator-profile.ts` — `MODULE_LABELS`, `ADDON_META` (group and summary),
  `LENSES[lens].addons` and `.theme` (the craft presets), `applyLensOrder`,
  `applyLensAddons`.
- `lib/creator-work-page.ts` — `workSlugs`, `workHref`, `workBySlug`,
  `workNeighbours`. Every address on a profile is unique and avoids
  `RESERVED_WORK_SLUGS`.
- Visitor page: `components/creator-profile/sections/`
  - `shared.tsx` exports `Heading`, `SectionHead`, `safeHref`, `hostname` and the
    profile stylesheet as `profileStyles`.
  - `shared.tsx` also exports `EnquireButton`, which opens the profile's message
    form with a topic and first line filled in (`requestInquiry` in
    `profile-connect.tsx`). Sections receive `canContact` and leave the button
    out when the visitor has no way to write.
  - One file per add-on exports `<id>Section = { filled, Section }`;
    `index.ts` registers them in `ADDON_SECTIONS`. `public-profile.tsx` renders
    any add-on through that registry, so adding a section never touches
    `public-profile.tsx`.
- Studio: `components/creator-profile/studio/`
  - `addons/<id>-editor.tsx` exports `<id>Editor = { Editor, count }`;
    `addons/index.ts` registers them in `ADDON_EDITORS`. `ProfileStudio` shows
    the section in the rail only once it is added, frames the editor with
    `AddonFrame` (heading, summary, Switch off), and offers `AddAddonMenu`.
  - `studio-editors.tsx` now exports `TextField`, `AreaField`, `SelectField`,
    `MediaField`, `ItemList`, `EditorHead`, `set` and `EditorProps` for reuse.
  - `work-format-fields.tsx` and `work-page-fields.tsx` are rendered inside every
    work row; they receive `WorkFieldsProps` (`work-fields.ts`).
  - `share-panel.tsx` is the Share kit panel in the rail.
- Sample data: `lib/creator-profile-sample.ts` already carries one example of
  every add-on and a work page for "An atlas of small departures".

### File ownership

Each stream edits only the files it owns. If you must touch a shared file, make
the smallest change and say so in your report.

| Stream | Owns                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `sections/{editions,shows,services,teaching,support}-section.tsx`, `sections/addons.module.css` (new), their tests                                            |
| B      | `studio/addons/{editions,shows,services,teaching,support}-editor.tsx`, `studio/addons/fields.tsx` (new), suggestions for those add-ons                        |
| C      | the work card, work dialog, mini player and audio hook in `public-profile.tsx`, `studio/work-format-fields.tsx`, new `components/creator-profile/work-media/` |
| D      | `app/[handle]/[work]/`, `components/creator-profile/work-page/` (new), `studio/work-page-fields.tsx`, `lib/creator-work-page.ts`, sitemap, SEO                |
| E      | `app/[handle]/story.png/`, `app/[handle]/events/`, `studio/share-panel.tsx`, `components/creator-profile/share/` (new), QR helper                             |
| F      | `sections/{collaborators,booking}-section.tsx`, `studio/addons/{collaborators,booking}-editor.tsx`, media route, server facts, collaborator API               |

Shared styling for new visitor sections goes in a new `.module.css` beside the
section, never in `public-profile.module.css`. Studio-only styling goes in a new
`.module.css` beside the editor.

## How to build any of it

`AGENTS.md` binds every UI change. In short:

1. Read `DESIGN.md` (sections 3, 4, 7, 8) and `apps/web/component-policy.json`.
2. Name the intent before the component. Use what `component-policy.json`
   selects: installed primitives in `components/ui`, then the Missa semantic
   wrappers in `components/missa`, then the local Studio catalogue. Check the
   registries in `components.json` before writing custom markup, and record what
   you inspected if you must.
3. Style only with tokens (`var(--…)`, the creator theme variables, the
   `font-heading` / `font-mono` classes). No raw colours, font families,
   arbitrary radii, shadows or animation in feature code.
4. Copy follows `docs/missa-messaging.md`. Check every claim against shipped
   code. Run `npm run check:language`.
5. Build the states that apply: default, hover, focus-visible, disabled,
   loading, empty, error, success. Check 390px, 200% zoom, keyboard, long
   content and reduced motion.
6. Never add a native `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`
   or `<details>`, or an ARIA widget role, where a component exists. Run
   `npm run check:design-system`; it fails when a file gains one.
7. Add unit tests for pure logic and Playwright coverage through the
   `/design-system/creator-profile-v2` and `/design-system/creator-profile-settings`
   routes (`?sample=1` seeds the sample). Those routes need no database.
8. Update `apps/web/component-policy.json` and `component-catalogue.json` when
   you add a component or an approved variant (`npm run design-system:catalogue`
   rewrites the catalogue).
9. Privacy rules from the first build still hold: no email address is ever
   shown, Confirmed is set only by the server, and unpublished content never
   leaves the studio.

Checks to run before you hand back, from the repo root:

```
npm run typecheck
npm run lint
npm run check:design-system
npm run check:language
cd apps/web && NODE_OPTIONS=--import=./test/register.mjs npx tsx --test lib/<your>.test.ts
```

## Stream A — visitor add-ons

Editions, Shows and performances, Services, Teaching and Support, as the
Add-on library board draws them. Each section follows the profile's grammar
(`SectionHead`, mono labels, rules between rows) and reads on every theme.

- **Editions.** A row per edition: image (or a type-only plate), title, then
  `medium · size · year`, and "4 of 12 available". Enquiries only: "Enquire"
  opens the message form (`EnquireButton`, topic `commission`) with the
  edition's title as the first line. Sold out (available `0`) reads "Sold out" and the
  action becomes "Ask about another print". No price, no checkout.
- **Shows and performances.** A CV-style list grouped by year, newest first,
  with `Solo`, `Group`, `Premiere`, `Screening`, `Performance` tags and the
  venue. A show with a link links out.
- **Services.** Title, typical timing, an optional price line and a note.
  "Rates are optional": omit the price cleanly. A single "Get in touch" action
  uses `EnquireButton` with the Commission topic.
- **Teaching.** Workshops with date, place and places left ("3 places left",
  hidden when unstated, "Full" at `0`). "Request a place" uses `EnquireButton` with the Booking topic and the session's title.
  Past sessions are already dropped by the projection.
- **Support.** One link, clearly marked as leaving Missa ("Payments happen
  outside Missa."), opens in a new tab with the `(opens in a new tab)` text.

Embedded mode never shows them (the registry already filters). Section nav
labels come from `MODULE_NAV_LABELS`.

## Stream B — studio editors for the same five

Use `ItemList`, `TextField`, `AreaField`, `SelectField`, `MediaField` and
`DatePickerField` (`components/missa/date-picker-field.tsx`). Add a number field
for edition size, places left and similar (`inputMode="numeric"`, empty means
unstated, never `NaN`) in `studio/addons/fields.tsx`.

- Editions: image, title, medium, size, year, edition size, how many are
  available (never more than the edition size), note.
- Shows: year, title, venue, kind, link.
- Services: title, timing, price (optional), note.
- Teaching: title, date, place, places left, note.
- Support: label, link, note, with a line saying the link leaves Missa.
- Extend `profileSuggestions` (`lib/creator-profile-suggestions.ts`) for these:
  an add-on that is on but empty ("Add your first edition"), a Teaching session
  whose date has passed, and a Support link that is not a full web address.
- Count in the rail comes from each editor's `count`.

## Stream C — work formats

Upgrade how a work shows on the profile and in the dialog, and add its fields to
the editor (`studio/work-format-fields.tsx`).

- **Plates and series.** Wall-label captions: `title, year · medium · size ·
edition`. Works that share a `series` group under a series heading with a
  plate count. The format filter gains "Series" only when a series exists. Keep
  `filter.creator-work-format` rules (built from formats present, hidden when
  everything is one format, announced).
- **Screening.** `video` takes a YouTube or Vimeo link. Play it through a
  click-to-load poster so nothing from the provider loads before the visitor
  asks. Use `youtube-nocookie.com` and `player.vimeo.com` only; any other link
  opens as an ordinary external link. Check `next.config.ts` and `proxy.ts` for a
  Content-Security-Policy and widen `frame-src` for exactly those two hosts if
  one exists. Chapters (`mm:ss` and a title) show beside the player and jump to
  the time when the provider allows it; a transcript opens in a disclosure.
- **Listening.** Audio works gain chapters and a transcript ("Transcripts
  included"). The mini player shows elapsed and total time, a buffering state
  and an error state with Try again, as the Components board draws it. It keeps
  playing while the visitor scrolls (it already does).
- **Case study.** A work with `brief`, `role`, `client` and `outcome` shows them
  as labelled facts. A `clientOrganization` links to the directory profile.
- **Work card states.** Loading (structure only), media error ("The image
  didn’t load. The work is still here." with Try again) and focus-visible.
- **Editor.** Group the new fields in `WorkFormatFields` so a poem's row stays
  short: show the wall-label fields once an image is set, the film fields on
  demand, the case-study fields when the lens is Design or a client is set.
  Chapters use `ItemList`. Warn on a chapter time that is not `mm:ss`.
- Add a craft fixture file (`lib/creator-profile-sample-crafts.ts`) with a
  visual, sound, film and design creator for tests and `/design-system` review.

## Stream D — the work page

`/@handle/<slug>` for one work, drawn on the "Work page" board: breadcrumb,
title and standfirst, counts ("9 poems · 14 plates · 1 recording"), facts
(year, published in with its Confirmed mark, made during, supported by), a
contents list, the parts in order, an About this work block, credits, the
publisher card, Previous and Next, and the copyright line.

- Route `app/[handle]/[work]/page.tsx`. It reuses `loadPublishedPortfolio`,
  `workBySlug` and `PublicSiteShell`. A slug that no work has is a real 404; an
  alias handle redirects like the profile does.
- A work with no `parts` still has a page: its own text, image and audio are the
  content. Counts and the contents list appear only when there is more than one
  part.
- Parts: `text` keeps its line breaks; `image` is a plate with its caption as the
  alt text source; `audio` uses the shared player. Add Previous and Next from
  `workNeighbours`.
- "Published in" links the record entry that names this work, with its
  `ProvenanceBadge`.
- Metadata: title, description, canonical, Open Graph, and `CreativeWork`
  JSON-LD through `lib/profileSeo.tsx`. Add work pages to
  `app/sitemap-profiles.xml`. Unpublished or hidden works have no page.
- On the profile, work cards and the dialog gain "Open the page" using
  `workHref`.
- Editor (`studio/work-page-fields.tsx`): the page address (with the live URL and
  a collision note), About this work, made during, supported by, rights line,
  credits (`ItemList`), and a parts editor (`ItemList` with kind, title, text,
  image or audio). Reordering uses the same move controls as other lists.
  `portfolioMediaIds` already covers part media.
- Reading view, plates and the player must work at 390px with no horizontal
  scroll.

## Stream E — share kit

Made from the profile; it updates when the featured work changes.

- **Link card.** The existing `/@handle/share.png` stays (1200 × 630). Check it
  against the board and match it if it differs.
- **Story.** `/@handle/story.png`, 1080 × 1920, drawn like `share.png`
  (`next/og`): the featured image, a first line or quote from the featured work,
  the name and the address.
- **Event card.** `/@handle/events/<eventId>` is an A6 print page for one
  upcoming event (kind, date and time, title, place) with a QR code that links
  to the profile, and a Print or Save as PDF button like the CV's. It is not
  indexed. Unknown, past or unpublished events are 404.
- **QR code.** `qrcode-generator` is already in `package-lock.json` through
  another package; add it as a direct dependency of `apps/web` and render the
  code as inline SVG with an accessible name. A shared helper in
  `lib/qr-code.ts` (with tests) encodes any `https://…` address.
- **Email signature.** Name, practice line and address as table-based inline-style
  HTML that pastes into any mail client, with "Copy as HTML" and a preview. No
  external CSS, no tracking, no image that needs a login.
- **Studio panel.** `studio/share-panel.tsx`: the three previews, Download for the
  two images, a link to each upcoming event's card, the signature, and the copy
  link. Before the first publish it explains what unlocks and offers Publish
  (`onPublish`). When there are unpublished changes it says the kit shows the
  last published version.
- Cover reduced motion and the empty cases (no featured image: type only; no
  upcoming events: the event card section says so).

## Stream F — collaborators and booking kit

Both need the server.

**Collaborators.** "Credit the people who made the work. Both sides confirm
before it shows."

- A collaborator entry names a Missa creator by `handle`, a `role` and a display
  name. It shows publicly only when that creator's published profile lists this
  creator back. No new tables: confirmation is computed on each read from the
  other creator's published snapshot (`readPublishedPortfolio` /
  `resolveHandle`, cached per request, at most 12 lookups).
- Add `lib/portfolio-server-facts.ts` returning `ServerFacts` for a draft, and
  use it wherever `withServerProvenance` runs on the server:
  `app/api/creator/portfolio-draft/route.ts`,
  `app/api/creator/portfolio-publish/route.ts`, `lib/published-portfolio.ts`.
  Keep the studio preview honest: the studio gets each collaborator's status
  from a small authenticated endpoint (`/api/creator/portfolio-collaborators`)
  and shows "Waiting for @name to credit you back" or "Confirmed".
- The owner can see unconfirmed entries; visitors never do. Self-credit and
  duplicates are rejected.
- Section: avatar initials, name linking to `/@handle`, role, and a Confirmed
  `ProvenanceBadge`-style mark that explains the rule in plain language.
- Entry points: a creator viewing another creator's profile gets "Credit as
  collaborator", which opens the studio at
  `/profile/portfolio?credit=<handle>` with the add-on switched on and a new row
  prefilled. Handle that query in the editor.

**Booking kit.** "Tech rider, press kit and bios for programmers, with file type
and size shown."

- `app/api/creator/portfolio-media/route.ts` accepts `application/pdf` and
  `application/zip` (still capped at 20 MB and sniffed with `file-type`).
  Documents are served from `portfolio-media/[id]` with
  `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` and
  never inline. The studio's `Upload` type gains `"document"`.
- File type and byte size come from the stored file at read time (a metadata
  query that does not load the bytes), through `ServerFacts.files`. Display
  "PDF · 240 KB" and "ZIP · 18 MB".
- Section: short bio and long bio with a Copy button each, then the files as
  download rows. Bios are plain text.
- Editor: short bio (400), long bio (2000), up to six files with a label and an
  upload; remove with Undo like other lists.
- The press kit and rider are public once published: say so in the editor.

## Integration (after the streams)

Done by the foundation owner once the branches merge: studio drag-to-reorder
with `components/ui/sortable.tsx` next to the move buttons, "View as" in the
preview (visitor, creator, organization, owner) so each viewer's actions are
checkable, the owner bar on the live page, Default theme card and lens theme
suggestion, API projection (`lib/public-creator-projection.ts`), policy and
catalogue entries, the design-system gallery, full Playwright coverage and
before/after screenshots against the canvas boards.

## Not in this build

Stated so nothing is claimed that is not shipped:

- Checkout, prices on Editions, payment of any kind.
- Public follower counts, appreciations and view statistics.
- Notifying followers when a creator publishes.
- "Save to shortlist" for organizations. Missa has no creator shortlist for
  organizations yet.
- Custom domains for profiles.
- Server-generated PDFs. The event card and CV print through the browser.
