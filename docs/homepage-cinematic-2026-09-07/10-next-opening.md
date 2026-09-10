# Revision after annotated review

The user replaced the section heading with “Your dream, any dream, is here” and rejected the eyebrow, generic introduction, footer sentence and equal-column composition. These are removed. The revised section uses a large two-line editorial heading, a text-style accessible RadioGroup, one lead opportunity and two secondary entries. Mobile stacks the entries. Missing eligibility placeholders are removed; available deadline, fee, location and prize fields remain.

## Database correction

The existing .env.local already selects the Postgres repository and has DATABASE_URL configured (no credentials recorded here). The earlier section filtered canonical taxonomy assignments, which were empty on many live records. This falsely produced zero results. The homepage now uses the API's populated normalized discipline fields. Writing unions writing/literature/poetry/fiction/nonfiction; Performance unions theatre/dance. Other choices map to visual-arts, film, music and design. The browse destination uses exactly the same filter. Up to 12 real records are requested and the first three distinct organisations displayed. This is deterministic selection, not a claim of human curation.

Live pre-change diagnostic counts: Film 201, Music 80, Visual art 582, Design 1, Theatre 19, Dance 101, Writing 224 and Literature 16 individually. All six homepage discipline choices were then tested in the browser and returned at least one record. No unrelated records are substituted for a genuinely empty discipline; future empty states remain truthful.

The new design system check passes, including the previously unrelated application-preview violation now resolved elsewhere. TypeScript and scoped lint pass. Tests cover live discipline results, filtered destinations, keyboard arrows, 390px/reduced motion, error retry, empty results and 200% CSS zoom overflow.

---

## Earlier implementation (superseded)

# Original portrait homepage — next opening

User approved adding opportunity discovery directly beneath the existing green knit portrait. The original hero is restored at `/`; `/design-system/homepage-hero` shows the same composition. The rejected studio remains at its separate study route. No generated video has been integrated.

## Component decisions

- Navigation: installed Button rendered as Next Link; Explore targets `#next-opening`.
- Single discipline selection: `choice.single-visible` → installed RadioGroup, with wrapping labels and accessible names. Canonical practice taxonomy IDs reuse the existing mapping.
- Record display: installed Item and ItemContent; editorial three-column layout, one column at 390px, approved semantic color and typography tokens. No new primitive needed.
- Loading: Skeleton and status. Empty: Empty. Error: Empty with installed retry Button. Link and radio focus/hover states retained. Selection remains available during loading; obsolete requests are aborted. No save or submission action.
- Mobile portrait navigation is contained within the hero so inverse navigation does not float over white content.

## Data and truth boundary

Reads the existing `/api/opportunities` endpoint with `openNow=true`, limit 3 and selected canonical taxonomy IDs. This shows catalogue records, not independently verified editorial recommendations. No fabricated records, images or awards. Missing eligibility points readers to the full details. The existing catalogue can return incomplete metadata; this section does not invent or repair it. Browse links retain the current discipline.

## Verification

Live desktop Chrome inspection; 390px screenshot; automated Explore anchor, real API query, discipline destination, keyboard arrow selection, reduced-motion/mobile layout, failed-request retry and empty response. 200% CSS zoom checks layout overflow (not a substitute for every browser's native zoom behavior). Long live titles wrap naturally. TypeScript and scoped lint checked separately.

The repository design validator initially passed. A subsequent run reported an unrelated violation in `components/missa/applications-design-preview.tsx` (direct Badge primitive import). That concurrently present file was not modified by this work. No new violations were reported for this section.
