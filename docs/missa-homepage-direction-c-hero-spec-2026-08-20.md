# Missa Homepage — Direction C

## Field notes / editorial archive

Date: 20 August 2026  
Scope: Section 1 only — public shell and hero.  
Status: design direction for the local review route; not production promotion.

## Decision in one sentence

Direction C makes Missa feel like a moving editorial archive: the visitor understands the product through one large statement, one real Opportunity, and one visible source trail before being asked to browse further.

The common visitor task is the governing constraint:

1. Understand what Missa is.
2. Recognize that the information is source-first.
3. Open one real Opportunity quickly.

This is deliberately different from Direction A’s broad Opportunity Horizon and Direction B’s Source Constellation. C uses Melius’s editorial pauses, large type, contained visual scenes, and strong entry rhythm, but replaces the continuously moving canvas with a focused reading sequence.

## Melius parallel, translated for Missa

| Melius pattern              | Direction C translation                                                       | Missa boundary                                                                    |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Large manifesto statement   | One three-line promise: “See what’s open. Know what it asks. Keep moving.”    | The statement must be supported by a real public route or an honest access state. |
| Floating compact navigation | A small dark shell that keeps the archive open around it                      | Every item must point to a real Missa route; no invented product areas.           |
| Card-and-media canvas       | One paper-like Opportunity dossier with source, deadline, fee, and discipline | No fake records, fake metrics, or evidence-like decoration.                       |
| Creative output grouping    | Source, ask, and next action grouped into one readable record                 | The visual treatment cannot hide essential facts behind hover or motion.          |
| Editorial manifesto pauses  | Short archive notes between the promise and the first action                  | Copy should explain Missa’s method, not become generic brand poetry.              |
| Prompt/access bar           | A state-aware “Open the field” bar                                            | `PublicAccessMode` controls copy, route, and interaction.                         |

## Visual composition

### The scene

Use a full-bleed near-black aubergine field, approximately `#151018`, with a restrained paper grain layer. The scene should feel like a worktable at night: warm ivory paper, ink rules, clipped source fragments, and a single saturated registration mark. It is atmospheric, but the active record remains the sharpest object on the page.

At desktop widths, the first viewport is a 56/44 asymmetric composition:

- **Top shell:** floating, compact navigation inside a dark translucent capsule.
- **Left column:** eyebrow, large statement, short explanation, and one primary action.
- **Right column:** the active Opportunity dossier, tilted by only 1–2 degrees, with a paper edge and one real source fragment or typographic source treatment.
- **Bottom rail:** a narrow evidence line showing `SOURCE`, `DEADLINE`, `FEE`, and `FIELD`, followed by the action to open the Opportunity.

The hero should not show three equal cards. The visitor should know which record matters. Neighboring records, if used, are only quiet cropped tabs behind the active dossier and never carry essential information.

### Proposed hierarchy

```text
┌────────────────────────────────────────────────────────────────────┐
│  MISSA                         Opportunities  Guides  ...  Open field │
│                                                                    │
│  PUBLIC FIELD NOTES                    ┌────────────────────────┐  │
│                                        │ SOURCE ATTACHED         │  │
│  See what’s open.                      │ Opportunity title       │  │
│  Know what it asks.                    │ Organization             │  │
│  Keep moving.                          │                          │  │
│                                        │ deadline  fee  field     │  │
│  Missa keeps the call, its source,     │                          │  │
│  and your next decision together.     │ Open Opportunity ↗       │  │
│                                        └────────────────────────┘  │
│  [Open one real Opportunity]                                      │
│                                                                    │
│  SOURCE  official page  ·  DEADLINE  12 Sep 2026  ·  FEE  unknown  │
└────────────────────────────────────────────────────────────────────┘
```

The diagram is a composition guide, not a final UI. The actual card content comes from the repository, and missing facts remain visible as “Deadline not listed”, “Fee not listed”, or equivalent canonical labels.

### Copy direction

Use the existing Missa promise as the primary headline so the redesign does not lose product clarity:

> See what’s open. Know what it asks. Keep moving.

Supporting copy:

> Missa brings creative Opportunities, their official source, and your next action into one clear path.

Eyebrow options, in priority order:

1. `PUBLIC FIELD NOTES`
2. `CREATIVE OPPORTUNITIES / SOURCE FIRST`
3. `01 / START WITH SOMETHING REAL`

The active card should use task language, not marketing language:

- `OFFICIAL SOURCE ATTACHED`
- `DEADLINE / 12 SEP 2026`
- `FEE / NOT LISTED`
- `OPEN THE OFFICIAL CALL`

Do not use “verified” unless the projection has the corresponding canonical evidence state. Do not show a freshness number or a “best match” badge in this public hero.

## Typography and colour

### Typography

Use the existing Missa font contract for the first slice:

- **Display:** `Ysabeau`, variable weight, with a large optical size, tight tracking, and line breaks authored for the composition.
- **Interface:** the same `Ysabeau` family at a calmer weight for navigation and supporting copy.
- **Evidence metadata:** `Fragment Mono`, uppercase, with generous tracking and explicit labels.

This keeps the direction within the current Next/font/local setup and avoids adding a font dependency before the visual system is proven. A licensed editorial display face can be evaluated later, but it is not required to make C distinctive.

Suggested scale:

- Headline: `clamp(3.5rem, 8.5vw, 8.75rem)`, line-height `.82–.9`, maximum three lines.
- Supporting copy: `clamp(1rem, 1.35vw, 1.25rem)`, line-height `1.35`.
- Eyebrow/metadata: `0.65–0.75rem`, Fragment Mono, uppercase, `0.12em` tracking.
- Card title: `clamp(1.75rem, 3vw, 3.25rem)`, line-height `.95–1.05`.

Do not make the body text small to imitate a luxury landing page. Evidence must remain comfortable to read.

### Palette

```css
--c-field: #151018;
--c-field-raised: #211923;
--c-paper: #f1eadb;
--c-paper-muted: #c7bda9;
--c-ink: #151116;
--c-saffron: #e3a727;
--c-coral: #e06d55;
--c-cobalt: #315bd6;
--c-rule: color-mix(in srgb, #f1eadb 22%, transparent);
```

Use aubergine and paper as the dominant relationship. Saffron is the primary action colour. Coral and cobalt are registration accents used sparingly—never as a gradient and never as a substitute for status semantics.

The field texture must sit behind content with `pointer-events: none`, a low alpha, and no contrast-dependent information. The page must remain usable when the texture fails to load.

## Motion choreography

### Personality

Direction C uses **premium editorial motion**: calm, deliberate, and slightly tactile. It should feel like a page being laid on a table, not a dashboard reacting to every cursor movement.

Motion constants:

```ts
const motion = {
  quick: 160,
  standard: 420,
  dramatic: 760,
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
};
```

### Entrance sequence

1. Field and shell settle first: opacity plus an 8px vertical offset, `160ms`.
2. Eyebrow and headline reveal from the reading position, staggered by `45ms`; total headline sequence stays below `500ms`.
3. The dossier enters from 24px right and `rotate(-1deg)` to its resting position over `760ms`; it should not overshoot.
4. Evidence metadata arrives 90ms after the dossier lands, with a small upward translation, not opacity alone.
5. The primary action becomes available with the final evidence rail, not before the main record is readable.

This creates a clear setup → record → evidence → action narrative. The headline is the hero element; the dossier is the proof; the action is the resolution.

### Interaction motion

- Hover/focus on the dossier: lift by `4px`, rotate to `0deg`, and increase the paper shadow. Never reveal a fact only on hover.
- Primary action press: scale to `.98` for `120ms`, then settle in `220ms`.
- If the user changes the active Opportunity, the outgoing record exits in `180ms` and the new record enters in `420ms`; preserve the card’s reading position.
- No autoplaying record carousel. Movement cannot change which Opportunity is being read without user intent.
- Scroll reveals belong below Section 1; do not pin the hero into a cinematic scroll trap.

### Reduced motion

With `prefers-reduced-motion: reduce`:

- Remove grain drift, parallax, rotation, automatic reveals, and card travel.
- Render the headline, dossier, evidence rail, and action in their final positions.
- Keep focus, selected, pressed, loading, and unavailable states explicit through colour, border, and text.
- Never replace an important transition with opacity-only ambiguity.

## Component and data model

### Public shell

```ts
type PublicShellProps = {
  accessMode: PublicAccessMode;
  menuOpen?: boolean;
};
```

Responsibilities:

- `header` and `nav` landmarks.
- Real links: Opportunities, Guides, For organizations, Methodology, Sign in.
- One state-aware primary action.
- Mobile menu with Escape-to-close and focus return.

### Hero record

The page should receive the first hero record from the existing server-side repository query. No client-side fetch or new API is needed for Section 1.

```ts
type HeroRecord = Pick<
  OpportunityBrowseProjection,
  | "id"
  | "slug"
  | "title"
  | "organizationName"
  | "type"
  | "discipline"
  | "status"
  | "deadline"
  | "fee"
  | "location"
  | "source"
>;

type HeroState = {
  accessMode: PublicAccessMode;
  record?: HeroRecord;
  repositoryUnavailable: boolean;
};
```

Recommended server query:

```ts
repository.browse({
  openNow: true,
  sort: "soonest-deadline",
  limit: 1,
});
```

The selection is deterministic and public. Do not use private Profile preferences to personalize the public hero. A Save is a private interest signal, not eligibility or fit.

### `HeroDossier`

Required states:

- `record`: title, organization, discipline/type, deadline, fee, source, and “Open official call”.
- `missing-source`: preserve the record but make the missing authority prominent; do not show a source button.
- `unknown-fee`: use canonical unknown wording, never infer free.
- `unpublished-deadline`: show the stored deadline kind/raw text only when allowed by the projection; do not manufacture a date.
- `empty`: explain that no published Opportunity is available in this review and route to browse/guides.
- `unavailable`: explain that the public collection could not be read and preserve a retry/browse action.
- `loading`: static dossier geometry with a labelled loading status; avoid a fake record skeleton that resembles evidence.

### `AccessBar`

The action is derived only from `PublicAccessMode`:

- `closed`: “Public access is not open yet” with no browse action.
- `waitlist`: existing waitlist contract only; collect email and existing campaign context, not Profile preferences.
- `open`: “Open this Opportunity” and “Browse Opportunities”; public reading remains unauthenticated.

Save is not a hero CTA. If a visitor reaches Save from the Opportunity detail, preserve the existing authentication and first-Save intent handoff.

### Selection model

For the first slice, use a single active record. If later research proves that multiple records improve comprehension, add an explicit selection model:

```ts
type HeroSelection = {
  activeId: string;
  reason: "manual" | "deep-link";
};
```

Do not add autoplay state, interval timers, or random selection.

## Responsive composition

### Desktop — 1280px and above

- Keep the asymmetric two-column scene.
- Show full navigation and one active dossier.
- Allow one quiet cropped archive tab behind the dossier only if it does not compete with the title.
- Keep the evidence rail horizontal and aligned to the content grid.

### Tablet — 768px

- Reduce the headline width and dossier scale.
- Keep the two-column relationship only when the active card remains readable; otherwise place the dossier beneath the statement.
- Collapse the nav links into a labelled menu before they become cramped.
- Preserve the evidence rail as two rows, not a horizontally clipped line.

### Mobile — 375px / 428px

- Reading order: shell → eyebrow → headline → supporting copy → dossier → evidence → primary action.
- No overlapping paper layers that obscure the title or source.
- The dossier becomes a full-width document with a small accent edge, not a tiny tilted card.
- The source, deadline, and fee labels stay visible before the action.
- If more than one record exists in a future version, use a deliberate horizontal rail with previous/next buttons and a visible position label; never rely on swipe discovery alone.
- Minimum touch target: 44px. Avoid placing the menu and primary action flush against one another.

### Content and localization tolerance

Test long titles, long organization names, translated action labels, right-to-left text, missing images, wrapped URLs, dates with timezone context, unknown fees, and currencies other than USD. The card must grow vertically rather than truncate a consequential fact.

## Accessibility contract

- Include a skip link to `#main-content`.
- Use one `h1` in Section 1. The dossier title is an `h2` or linked heading depending on page structure; do not skip heading levels.
- Use `header`, `nav`, `main`, and the hero’s labelled `section` landmarks.
- The dossier must be a real link or article with a real link, not a clickable `div`.
- The official source link needs an accessible name that includes the destination, such as “Open official source for [Opportunity title]”.
- All decorative grain, paper marks, and registration lines are `aria-hidden`.
- Do not put source, deadline, fee, or eligibility information only in an image or tooltip.
- Focus rings use a two-colour treatment visible against both the dark field and warm paper.
- A mobile menu uses a button with `aria-expanded`, `aria-controls`, and a stable labelled panel. Escape closes it and returns focus to the trigger.
- If record selection is introduced later, use a labelled group of buttons or tabs with proper keyboard behaviour; do not invent a carousel role without a real need.
- Loading, repository-unavailable, and waitlist success/error messages use an appropriate live region without stealing focus.

## Dependencies

### Existing dependencies to reuse

- Next.js App Router and server-rendered local review route.
- CSS Modules and the current Missa spacing/tokens.
- `MissaWordmark`, existing Button/Input/Badge primitives, and Lucide icons.
- `motion` only for the staged dossier transition if CSS cannot express the required choreography.
- `PublicAccessMode` from `apps/web/lib/publicAccess.ts`.
- `getOpportunityRepository()` and `OpportunityBrowseProjection` from the existing repository/engine.
- Existing waitlist, authentication, and Save-to-Tracker contracts.

### Dependencies that are decisions, not installs

- Final hero copy and whether `PUBLIC FIELD NOTES` is the approved eyebrow.
- Whether Missa approves the aubergine/ivory/saffron palette for a public homepage.
- Whether any Opportunity identity images are rights-cleared and have canonical alt text.
- Whether the first local review uses a real repository record or an explicitly labelled fixture when the repository is empty.
- Which single record-selection rule is approved for the hero.

### Explicitly not required for Section 1

- New Opportunity API.
- CMS or editorial database.
- WebGL or Three.js.
- A second carousel library.
- New authentication, waitlist, or analytics contracts.
- Pricing, testimonials, fabricated metrics, or fake freshness indicators.
- Production root-page changes, proxy changes, migrations, or deployment.

## Risks and mitigations

### Risk: beauty outruns usefulness

Mitigation: the active dossier is present in the first viewport, with source/deadline/fee before the primary action. The archive treatment is subordinate to the record.

### Risk: “archive” feels passive

Mitigation: keep the first action concrete: open one real Opportunity. Use archive language in the visual system and methodology, not as a replacement for product verbs.

### Risk: missing data breaks the composition

Mitigation: design empty, unavailable, missing-source, unknown-fee, and unpublished-deadline states as authored variants of the dossier geometry.

### Risk: motion becomes decorative theatre

Mitigation: no autoplay, no random card cycling, no facts revealed only by hover, and a static reduced-motion rendering that preserves the complete reading path.

### Risk: Melius imitation

Mitigation: borrow the relationship between type, media, and motion—not its AI canvas, model cards, orange product UI, or visual assets. Missa’s central object is a source-backed Opportunity.

### Risk: current repository has no public records

Mitigation: do not manufacture records. Render a clearly labelled empty review state, or use a fixture explicitly marked as review-only and never “live”.

## Acceptance test for Direction C

Before moving to Section 2, a reviewer should be able to answer “yes” to all of these:

- Can I explain Missa after reading only the headline and supporting copy?
- Can I identify one real Opportunity without scrolling through a dashboard?
- Can I see its source, deadline state, fee state, and next action immediately?
- Does the page still make sense when the repository is empty or unavailable?
- Does closed/waitlist/open change the action honestly?
- Can I complete the primary path with keyboard only?
- Does reduced motion preserve the same information and hierarchy?
- Does the design remain convincing at 375px, 768px, and 1280px?
- Does it feel like Missa’s evidence-first product rather than a Melius clone?

## Next implementation slice

Implement only:

1. `PublicShell` / floating navigation.
2. `HeroEditorial` composition.
3. `HeroDossier` with real repository data and honest fallback states.
4. `AccessBar` derived from `PublicAccessMode`.
5. Grain/paper atmosphere as nonessential CSS decoration.
6. Focus, reduced-motion, and responsive tests.

Do not build the lower homepage sections until this first viewport passes the acceptance test.
