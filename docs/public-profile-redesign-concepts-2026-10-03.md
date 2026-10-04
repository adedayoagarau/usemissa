---
title: Public creator profile — redesign concepts
status: implemented in part (see "What was built")
date: "2026-10-03"
related:
  - ./missa-public-creator-portfolio-contract-2026-09-01.md
  - ./public-creator-profile-design.md
  - ./directory-portfolio-integration-handoff.md
---

# Public creator profile — redesign concepts

Concept canvas (13 boards, private until shared):
https://claude.ai/artifact/VwETHP1gkDMQNbuEUvFfJV

This started as ideation. The section "What was built" at the end records
which parts are now in `apps/web`. Sample creators (Riley Chen, Nadia Okafor, Juno Adeyemi, Wren Ito)
and every organization named on the canvas are fictional.

## Why the current profile fails

Reviewed against the `/design-system/creator-profile-v2` sample (best case) and
`apps/web/lib/creator-portfolio-schema.ts` (what real profiles can hold).

- **It collapses without imagery.** Missing covers and audio render as large
  empty grey blocks ("Accompanying text · audio unavailable"). Most real
  writers will look worse than the sample.
- **One template for every craft.** A poem, a print series and an album all
  become the same image card.
- **It doesn’t answer the visitor’s questions:** what do they make, are they
  available, can I trust these credits, how do I reach them?
- **The schema caps the record:** one book, one credit, two fixed sections.
- **Missa’s strongest asset is missing.** The directory and organization
  outcomes could make credits verifiable; today a credit is just text.

## The idea: one profile, adaptive to craft

One system of components that re-composes around a **craft lens**. The facts
and trust rules stay the same; the emphasis changes.

| Lens          | Leads with                      | Default add-ons                              | Theme          |
| ------------- | ------------------------------- | -------------------------------------------- | -------------- |
| Writing       | Reading room, first lines       | Shelf, Track record, Upcoming                | Sage / Default |
| Visual        | Plates with wall-label captions | Series, Editions, Shows, Inquiry             | Mineral        |
| Sound & stage | Player, next date               | Listening, Dates, Booking kit, Collaborators | After hours    |
| Film          | Trailer, screenings             | Screening, Shows, Press, Collaborators       | After hours    |
| Design        | Case studies                    | Plates, Services, Inquiry                    | Default        |
| Mixed         | Format the creator adds most    | Derived                                      | Any            |

Three hero styles cover every situation: **Portrait**, **Plate** (featured
image carries the identity) and **Type only** (no images needed). A sparse
profile with a name, a bio and three poems must look finished; empty sections
and their tabs are left out for visitors.

## Missa-native layer

These features use data no portfolio site has. They are the reason to keep a
profile on Missa rather than Behance or a personal site.

1. **Track record with provenance.** Each entry is **Confirmed** (the
   organization recorded the outcome on Missa), **Linked** (matched by the
   creator to a directory profile) or **Added by the creator**. The badge
   always opens a plain-language explanation (PRODUCT.md principle 2).
   Confirmed can only be set by the server; creators can hide but not forge it.
2. **CV export.** A formatted PDF built from the record that attaches to Missa
   applications in one step.
3. **Invite to apply.** Organizations viewing a profile see “Invite to apply”
   for their open calls instead of a generic contact button.
4. **Inquiry without exposing email.** Intent-sorted notes go to the Missa
   inbox; the sender’s address is shared only when the creator replies.

## Add-on library (23)

- **Presence:** Now (self-expiring status line), Open to (open / from a date /
  booked), Upcoming, Follow (email, no public counts), Share card.
- **Work:** Reading room, Listening, Screening, Plates and series, Shelf,
  Editions (enquiry only, no checkout), Case study.
- **Record:** Track record, Shows and performances, Press (source link
  required), CV export, Collaborators (both sides confirm).
- **Connect:** Inquiry, Invite to apply, Booking kit, Services, Teaching,
  Support (external link, clearly marked as leaving Missa).

## Components and policy deltas

Extend the existing compositions and add three semantic components. Per
AGENTS.md, inspect the configured registries before building any of these.

| Component                 | Base            | Notes                                                                                                                        |
| ------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `PortfolioIdentityHeader` | existing        | `variant: portrait \| plate \| type`                                                                                         |
| `PortfolioWorkCard`       | existing        | `format: text \| image \| audio \| video \| link \| book` × default, hover, focus-visible, loading, media error, owner draft |
| `ProvenanceBadge`         | Badge + Popover | Mirrors `MatchExplanationTrigger` disclosure pattern                                                                         |
| `AvailabilityChip`        | Badge           | open, from date, booked, hidden (owner only)                                                                                 |
| `ProfileAudioPlayer`      | —               | Needs a registry search before any custom build; idle, playing, buffering, error                                             |

`filter.creator-work-format` keeps its rules: built from formats present,
formats with no work are not shown, hidden when everything is one format.

## Data model delta (from `portfolioSchema`)

- `book` → `shelf[]`: kind (book, chapbook, record, catalogue), cover, year,
  publisher, url, availability note.
- `credit` → `record[]`: kind (journal, prize, residency, grant, exhibition,
  performance), organization link (existing shape), `provenance` (server
  derived).
- `sections` → ordered `modules[]`: add-on id + visibility.
- New: `lens`, `hero`, `now { text, endsOn }`, `openTo[] { label, state,
date }`, `events[]`, `press[] { quote, source, url }`, `featuredWork`.
- Works: `plates[]` with caption fields (medium, dimensions, year, edition
  size and availability), `series`, `excerpt` (first lines).

## Phasing

1. **Frontend only, current data.** New layout, Type-only hero, sparse and
   empty-section rules, work cards by format, share card. Biggest visible
   change without a migration.
2. **Schema v2.** Shelf, record (Linked and Added), Now, Open to, Upcoming,
   lens, hero, module ordering.
3. **Missa-native.** Confirmed provenance from organization outcomes, CV
   export, Invite to apply, inquiry inbox.
4. **Media.** Listening and Screening players, editions, collaborator
   confirmation.

## Open questions

1. ~~Retire the **Paper** theme?~~ Decided October 2026: retired. Its ochre
   tint read as cream, which PRODUCT.md lists as an anti-reference. Stored
   Paper profiles render as Sage.
2. Which organization actions count as **Confirmed** — a decision recorded in
   a hosted application only, or also a manual confirmation request?
3. Inquiry abuse controls: require sign-in, rate limits, or both?
4. Custom domains for profiles (Dribbble Playbook offers this) — in scope?

## References (Mobbin)

Taken from, with what we kept:

- [Spotify artist](https://mobbin.com/screens/5def950c-68f1-4df1-8a04-124f53ab97c5),
  [Apple Music artist](https://mobbin.com/screens/9641ddc6-837c-44f6-a238-e68c527fc100),
  [Suno profile](https://mobbin.com/screens/c87e69b4-575b-4bb9-bfa1-bd6390ce78e2)
  — hero plate, latest release, player that persists.
- [SoundCloud “Pinned to Spotlight”](https://mobbin.com/screens/d8353db0-0666-4b7a-870b-a4ad0dcbb193)
  — creator-chosen featured work.
- [Live Nation artist events](https://mobbin.com/screens/4fce8775-bd5f-47be-90d3-de89fad019d7)
  — dates as a first-class section.
- [Behance profile](https://mobbin.com/screens/bf8bc08e-bf8a-4875-acd8-e43d7dd60705)
  — explicit “hire” availability; rejected: appreciations and stats.
- [Polywork](https://mobbin.com/screens/f8d0e856-762c-4287-9178-34e7933d7b59),
  [v0 portfolio](https://mobbin.com/screens/5fd402b5-c671-48c1-907f-a06be60bf3a5)
  — “open to” and availability status.
- [Figma Sites CV](https://mobbin.com/screens/928c9e80-3fc4-44cd-9d7c-561a3b0f26d3)
  — year-led record with inline evidence.
- [Telescope item](https://mobbin.com/screens/64aa2cd0-f577-45ef-99d8-746f119cb3cb),
  [Magnific originals](https://mobbin.com/screens/5bd22b33-8570-4aa6-bed5-72a6c358b1c3)
  — work pages with metadata and context.
- [Dribbble Playbook settings](https://mobbin.com/screens/ca6b9417-811a-4e7c-92b7-503339e948c0),
  [Kit creator profile](https://mobbin.com/screens/0272477e-f8b7-4103-b323-c8e6c766cd97)
  — publish state, layout choice, section list for the owner.
- [Cosmos](https://mobbin.com/screens/f43e3040-8813-42e7-af8a-766eed60df5d),
  [Savee](https://mobbin.com/screens/087ce5cf-e2cd-4fa8-84be-c9ecc57e2073)
  — quiet identity header; rejected: follower counts.

## What was built (2026-10-04)

The profile and the creator-side studio were implemented together. Design and
validation notes are in [Public creator profile](public-creator-profile-design.md#profile-v2-and-studio-october-2026).

Built: craft lenses (mixed, writing, visual, sound, stage, film, design) that
order sections; Portrait, Plate and Type heroes; Now line; Open-to
availability chips; Selected work with format filter, reading view and a shared
audio player; Upcoming with calendar files; Shelf; Track record with
Confirmed / Linked / Added provenance; Press; About and contact; printable CV;
social share image; the studio with live desktop/phone preview, section
ordering and visibility, suggestions and publishing.

Not built yet: inquiry inbox, Follow, Invite to apply, Editions and Booking
kit add-ons, Collaborators, and view analytics. Retiring the Paper theme is
still an open question.
