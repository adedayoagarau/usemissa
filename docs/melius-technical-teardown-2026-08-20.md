# Melius technical teardown for Missa homepage direction

Date: 20 August 2026  
Scope: public Melius homepage, Mobbin section study, and translation into a Missa design-engineering direction.

## Source and method

- Live product: [melius.com](https://www.melius.com/)
- Mobbin preview: [Melius preview](https://mobbin.com/sites/melius-d9eeb87d-1a87-40f8-bcd6-4986bec2c899/43cb8d19-6ea2-4836-968c-4e0be7488b8f/preview)
- Mobbin section index: [Melius sections](https://mobbin.com/sites/sections/96f63669-e217-4c65-86ad-665bd7ffd22e)

The Mobbin index reports 26 sections. Each screenshot below was captured by opening the corresponding section from that index, rather than relying on a direct section URL. This matters because the Mobbin viewer can resolve a direct section URL to a different section while the page is still loading.

The screenshots include the Mobbin viewer frame. They are evidence of composition, hierarchy, asset treatment, and interaction intent—not pixel-perfect exports from Melius. The live site was also inspected for implementation clues, asset URLs, responsive behavior, and motion-related class names.

## What makes Melius feel designed

Melius is not simply a monochrome site with animation layered on top. Its recognisable quality comes from several systems reinforcing one another:

1. **A single visual metaphor.** Creative outputs are treated as a physical, floating canvas: cards bend into arcs, gather into piles, and move across a dark field. The metaphor carries the story from hero through sign-up, model showcase, persona showcase, and CTA.
2. **High contrast with controlled color.** Near-black surfaces, warm white type, orange/yellow actions, and saturated media create a deliberate visual hierarchy. Color is concentrated in the product evidence and calls to action.
3. **Display typography as an identity layer.** Large editorial serif headlines are paired with compact futuristic sans text and small mono-style labels. The type contrast creates tension without needing decorative UI.
4. **Real media does the selling.** The page uses image and video outputs, not generic abstract dashboards. Each media group is tied to a job: advertising, e-commerce, filmmaking, fashion, branding, models, or personas.
5. **Motion reveals relationships.** The cards are not random decoration. Their movement demonstrates breadth, transformation, grouping, and progression. The controls expose the underlying content model.
6. **A strong entry/exit rhythm.** The navigation is small and floating, the hero is a statement, the showcase is exploratory, and the CTA returns to the same visual language. The page feels like one composed object rather than a stack of unrelated sections.

## Full 26-section inventory

The section labels below are the labels shown by Mobbin. Repeated labels are retained because each is a different captured composition and represents a different reusable pattern.

|   # | Mobbin label | Section ID                             | What the section is doing                                                                                               | Missa translation opportunity                                                                                                                                  | Screenshot                                                                                    |
| --: | ------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
|   1 | Footer       | `541b0fd6-f736-44ee-a608-acb0e0a99ce5` | Dark closing surface with newsletter capture, grouped navigation, status/legal rail, and oversized background wordmark. | End with a field-note/newsletter doorway and a strong Missa wordmark, while keeping privacy and production status explicit.                                    | [Open screenshot](assets/melius-sections-2026-08-20/541b0fd6-f736-44ee-a608-acb0e0a99ce5.png) |
|   2 | CTA          | `8d890ce0-100d-4cc1-ad9f-682a11998fbd` | Sign-up prompt centered inside a dark visual field, with a suspended arc of colorful media cards.                       | Use the real access mode as the CTA: browse when open, join the waitlist when gated, never imply availability that is not true.                                | [Open screenshot](assets/melius-sections-2026-08-20/8d890ce0-100d-4cc1-ad9f-682a11998fbd.png) |
|   3 | Pricing      | `0285776d-597f-454c-b1ca-b011cd2d4b42` | Four-plan pricing composition with three tall cards and a wider enterprise row.                                         | Do not add pricing to Missa. Reuse the composition logic for creator and organization entry points, with honest access boundaries.                             | [Open screenshot](assets/melius-sections-2026-08-20/0285776d-597f-454c-b1ca-b011cd2d4b42.png) |
|   4 | Pricing      | `645493d9-beb7-430e-bbfc-d186ed926845` | Dense plan comparison table with category rows, plan columns, action buttons, and a show-more control.                  | Translate the scan pattern into methodology or evidence comparison, not a feature matrix.                                                                      | [Open screenshot](assets/melius-sections-2026-08-20/645493d9-beb7-430e-bbfc-d186ed926845.png) |
|   5 | About        | `4968302b-5be7-413a-836a-76c3f5580416` | Scroll-driven manifesto treatment with repeated giant type and coins accumulating along the bottom edge.                | A source/evidence metaphor could be compelling, but Missa should use real source metadata rather than decorative “proof” objects.                              | [Open screenshot](assets/melius-sections-2026-08-20/4968302b-5be7-413a-836a-76c3f5580416.png) |
|   6 | FAQ          | `724979c8-ca17-47d9-960a-4c602db5aeb1` | Editorial FAQ panel on a textured dark surface; one answer is open while the rest remain compact rows.                  | Use an accessible methodology accordion for “How we verify”, “What remains unknown”, and “What happens when an opportunity changes”.                           | [Open screenshot](assets/melius-sections-2026-08-20/724979c8-ca17-47d9-960a-4c602db5aeb1.png) |
|   7 | Hero         | `96f63669-e217-4c65-86ad-665bd7ffd22e` | Primary hero: giant centered promise, colorful output cards entering from both sides, compact prompt/access bar below.  | First Missa design slice: a single strong promise plus a moving horizon of real opportunity/source cards and an access bar.                                    | [Open screenshot](assets/melius-sections-2026-08-20/96f63669-e217-4c65-86ad-665bd7ffd22e.png) |
|   8 | Features     | `3f4ed450-3eec-4694-acd7-5176809c4b32` | Full dark creative-canvas view with an animated card arrangement and a central sign-up control.                         | Show the Inspect → Decide → Keep → Act path as a visual system, not four detached feature cards.                                                               | [Open screenshot](assets/melius-sections-2026-08-20/3f4ed450-3eec-4694-acd7-5176809c4b32.png) |
|   9 | Features     | `89b9c1bd-4937-454f-86a7-1c9e78d4dc89` | Product-feature mosaic grouping different creative outputs and cards into one visual canvas.                            | Group source, deadline, fee, eligibility, and save state around one Opportunity rather than showing a generic dashboard.                                       | [Open screenshot](assets/melius-sections-2026-08-20/89b9c1bd-4937-454f-86a7-1c9e78d4dc89.png) |
|  10 | CTA          | `d1ac4e79-634f-4d1a-a49c-3c91612641b6` | Enterprise CTA embedded after pricing, with a large white plan row above and dark footer/newsletter below.              | A contextual organization doorway can follow the public opportunity horizon, but must remain distinct from creator access.                                     | [Open screenshot](assets/melius-sections-2026-08-20/d1ac4e79-634f-4d1a-a49c-3c91612641b6.png) |
|  11 | Hero         | `530dda6e-9a44-491e-bbc7-f843e27d1a41` | Hero variant with an animated side-to-side/card-stack creative output field and centered message.                       | A second Missa hero study: opportunity cards can orbit a central statement while their evidence remains readable on focus/hover.                               | [Open screenshot](assets/melius-sections-2026-08-20/530dda6e-9a44-491e-bbc7-f843e27d1a41.png) |
|  12 | About        | `56791fa8-e248-47f9-9b5a-6fefd978ed30` | Team/creative-persona visual with multiple people/cards gathered into a broad composition.                              | Humanize Missa with creators and organizations as entry points, without turning the product into a social feed.                                                | [Open screenshot](assets/melius-sections-2026-08-20/56791fa8-e248-47f9-9b5a-6fefd978ed30.png) |
|  13 | About        | `89626de6-3bf3-4b13-ae48-cf3fc6292459` | Large editorial/about statement using visual interruption and a bold image/coin motif.                                  | Explain Missa’s evidence-first position through a short manifesto anchored to a real source record.                                                            | [Open screenshot](assets/melius-sections-2026-08-20/89626de6-3bf3-4b13-ae48-cf3fc6292459.png) |
|  14 | About        | `dc5d3a2f-c127-432b-be35-db19e9698046` | Image-led about panel with oversized statement and a strong single focal asset.                                         | Use one carefully selected global creator image or source document only if it has rights, provenance, and a clear editorial job.                               | [Open screenshot](assets/melius-sections-2026-08-20/dc5d3a2f-c127-432b-be35-db19e9698046.png) |
|  15 | About        | `b811990a-b34f-4294-8f56-b4d0bfc690e2` | Card-based explanatory/about composition with multiple visual units arranged as one scene.                              | Use a “what you can trust here” rail with official source, unknowns visible, and private decisions as the three proof units.                                   | [Open screenshot](assets/melius-sections-2026-08-20/b811990a-b34f-4294-8f56-b4d0bfc690e2.png) |
|  16 | Blog         | `3b0ce969-1d53-4cd9-b680-c674802d1a3a` | Editorial/content entry point built from a visual lead and supporting article cards.                                    | Introduce Guides and methodology as useful editorial work, not a generic marketing blog.                                                                       | [Open screenshot](assets/melius-sections-2026-08-20/3b0ce969-1d53-4cd9-b680-c674802d1a3a.png) |
|  17 | About        | `ba41e4ec-6867-4edf-8dea-0376f4514059` | Manifesto-style section with large type, compact supporting copy, and restrained media.                                 | Put Missa’s central promise in a quiet editorial pause after the first product proof.                                                                          | [Open screenshot](assets/melius-sections-2026-08-20/ba41e4ec-6867-4edf-8dea-0376f4514059.png) |
|  18 | Downloads    | `3e5af267-5125-409d-90ae-2e49bdd9e0db` | Brand/download card with a large visual identity asset and direct action.                                               | Offer a methodology or source-standard download only when it is a real, maintained artifact.                                                                   | [Open screenshot](assets/melius-sections-2026-08-20/3e5af267-5125-409d-90ae-2e49bdd9e0db.png) |
|  19 | Downloads    | `ba1cc2b7-b681-4298-80b2-146c88d77d45` | Alternative download presentation with a smaller asset/action relationship.                                             | A compact “read the method” module can work near the footer.                                                                                                   | [Open screenshot](assets/melius-sections-2026-08-20/ba1cc2b7-b681-4298-80b2-146c88d77d45.png) |
|  20 | Downloads    | `10ab6e82-045c-42b8-bd30-94901c1439f3` | Download/detail panel that prioritizes an asset preview and a single action.                                            | Use for a real public field guide or opportunity-source checklist, not a fabricated lead magnet.                                                               | [Open screenshot](assets/melius-sections-2026-08-20/10ab6e82-045c-42b8-bd30-94901c1439f3.png) |
|  21 | Downloads    | `5db71a02-2050-468b-ab91-44f643a04ecb` | Another download/identity card that uses the same visual language at a different scale.                                 | Gives Missa a reusable artifact card for guides, terms, or methodology releases.                                                                               | [Open screenshot](assets/melius-sections-2026-08-20/5db71a02-2050-468b-ab91-44f643a04ecb.png) |
|  22 | Contact      | `6365c06c-9c38-42b6-9e19-ebb4c797f9d2` | Contact/lead entry point with a focused form-oriented layout.                                                           | Separate creator access, organization contact, and support paths; do not hide one behind another.                                                              | [Open screenshot](assets/melius-sections-2026-08-20/6365c06c-9c38-42b6-9e19-ebb4c797f9d2.png) |
|  23 | 404          | `98ff559e-c72e-4465-8c0b-e2f9282655a1` | Branded failure state that preserves the dark visual world and gives the user a way back.                               | Missa’s unavailable/deadline/source states should feel authored, informative, and recoverable rather than like a generic error.                                | [Open screenshot](assets/melius-sections-2026-08-20/98ff559e-c72e-4465-8c0b-e2f9282655a1.png) |
|  24 | Hero         | `60596ce0-f8a6-46b5-86f1-d3624f700684` | Hero variant with a curved/hourglass photo strip and a human focal subject.                                             | Demonstrates how one memorable, continuous image can carry the hero without a dashboard.                                                                       | [Open screenshot](assets/melius-sections-2026-08-20/60596ce0-f8a6-46b5-86f1-d3624f700684.png) |
|  25 | Navigation   | `6d72e748-35b3-4c23-8f39-620f011613d4` | Compact floating navigation with a menu state over the hero visual.                                                     | Missa should have a compact shell that leaves room for the hero, with clear Opportunities, Guides, For organizations, Methodology, Sign in, and access action. | [Open screenshot](assets/melius-sections-2026-08-20/6d72e748-35b3-4c23-8f39-620f011613d4.png) |
|  26 | Features     | `785e1fa7-469b-44af-aae2-487c6306219a` | Model showcase: five curved media/model cards with a horizontal progress control.                                       | Use a horizontal evidence/opportunity horizon with deliberate pacing and a clear active item, not a static card grid.                                          | [Open screenshot](assets/melius-sections-2026-08-20/785e1fa7-469b-44af-aae2-487c6306219a.png) |

## Live-site engineering observations

### Rendering and asset delivery

The public Melius page is a Next.js/Vercel-rendered page. The response exposes Next static chunks, a Turbopack-generated chunk signal, and Next image optimization URLs. The page is therefore not a single hand-authored canvas: it is a normal component tree with a carefully art-directed media layer.

Observed media strategy:

- Next image optimization is used for remote/local image assets.
- Images appear to load through a blur-up state before becoming sharp: loading classes include opacity reduction and blur, with a roughly 500ms easing transition.
- Creative showcase assets are grouped by domain, including advertising, e-commerce, filmmaking, fashion, and branding.
- Some showcase nodes are `.webm` video rather than animated GIFs, including advertising, e-commerce, and filmmaking nodes.
- Persona media includes video for agencies and CD/filmmakers, and image media for marketers, e-commerce, and GTM/growth.
- The page preloads important font and coin assets while allowing the larger showcase media to load progressively.

This is the core engineering lesson for Missa: the “richness” is delivered by an asset model and loading strategy. It is not achieved by making every DOM element move.

### Typography signals

The live page exposes several font assets with distinct jobs:

- Reckless Standard: editorial/display serif role.
- FG Futurist: futuristic utility/display sans role.
- Ease Standard: readable supporting sans role.
- A mono-style font signal for compact labels and metadata.

Missa should not copy these font files. The transferable rule is a controlled three-level type system: a distinctive display face for the promise, a calm reading face for explanation, and a compact utility face for evidence labels, dates, source state, and controls.

### Motion and interaction signals

Observed or exposed implementation signals include:

- 200–500ms transitions for color, opacity, borders, and image readiness.
- A cubic-bezier close to `cubic-bezier(0.23, 1, 0.32, 1)` for image transitions.
- Accordion open/close animation using a quartic in/out easing.
- Hover scale around `1.03` for selected media/action surfaces.
- CTA pseudo-elements that expand/scale on hover to create a color sweep.
- A breathing glow treatment on selected pricing surfaces.
- Pointer-event-disabled atmospheric layers with opacity transitions.
- Explicit `motion-reduce:transition-none` handling.
- Carousel/slider affordances with accessible “show next card” and “show previous card” labels.
- Billing switch and FAQ accordion states.

There are also client-code dependency signals for motion and 3D-style rendering. The exact production library should not be assumed from the public bundle alone; if Missa needs to reproduce a particular behavior, we should choose the smallest local primitive that meets the interaction and accessibility requirements rather than import an entire animation stack.

### Layout and visual primitives

The repeatable Melius primitives are:

```text
Public shell
  ├─ floating compact navigation
  ├─ oversized editorial heading
  ├─ atmospheric surface: grain, dots, glow, or gradient
  ├─ media choreography: cards, arc, pile, rail, or model curve
  ├─ single primary action
  └─ quiet utility metadata
```

The page alternates between full-bleed visual scenes and contained information panels. This prevents the interface from becoming a long wall of identical cards. Even dense material, such as pricing or FAQs, is placed inside a distinct scene with its own surface, scale, and rhythm.

## What Missa should borrow—and what it should reject

### Borrow

- A memorable visual metaphor that can survive across the whole homepage.
- A large, centered promise instead of a product dashboard as the first impression.
- Real media and source fragments as visual proof.
- Dark atmospheric scenes used selectively, with bright evidence/action accents.
- A floating shell that keeps the page’s visual field open.
- Horizontal and curved media choreography for progressive discovery.
- One dominant action per scene.
- Authored empty, unavailable, and error states.
- Motion that demonstrates relationships between content objects.

### Reject

- Fake opportunity counts, fake freshness, testimonials, or fabricated activity.
- A pricing section when Missa’s current product boundary does not need one.
- Decorative source documents that are not attached to real canonical records.
- A generic “AI dashboard” hero.
- Motion that makes deadlines, source names, fees, or eligibility harder to read.
- A hidden preference/profile form inside waitlist access.
- Public browsing actions that production routing would block.
- An animation framework chosen before the content model and reduced-motion behavior are defined.

## Missa design direction: “the opportunity horizon”

The strongest translation is not “Melius but for opportunities.” It is a visual field where a creator can see that the world is open, then inspect what each opening actually asks of them.

### Hero concept

**Visual idea:** a dark aubergine-to-black field with a slow, asymmetric horizon of real Opportunity cards and source fragments. Cards can bend into a shallow arc or drift past one another, but the active card always exposes readable evidence: title, opportunity type, location/remote context, deadline state, and official source.

**Center statement:**

> See what’s open. Know what it asks. Keep moving.

**Bottom access bar:** a single state-aware doorway:

- `closed`: “Missa is preparing the public field.” with a waitlist action.
- `waitlist`: email-only waitlist form using the existing contract.
- `open`: “Browse opportunities” as the primary action; signed-out reading remains open and Save routes to authentication only when needed.

The bar should feel like Melius’ prompt/access control in composition, but it must remain a truthful product boundary rather than a simulated command interface.

### Proposed homepage scene sequence

1. **Announcement/review strip:** quiet, useful, and clearly labeled if this is a local review concept.
2. **Floating navigation:** Opportunities, Guides, For organizations, Methodology, Sign in, and the state-aware primary action.
3. **Hero horizon:** one promise, one active Opportunity, one source/evidence signal, one access bar.
4. **Source desk:** three moving proof units—official source attached, unknowns visible, decisions stay private.
5. **Opportunity horizon:** real repository records only; honest empty, unavailable, missing-source, unknown-fee, and unpublished-deadline states.
6. **Connected path:** Inspect → Decide → Keep → Act, expressed as a continuous transition rather than four equal cards.
7. **Audience split:** creator and organization entry points, each with a distinct job and CTA.
8. **Guides/methodology:** editorial entry points that earn trust and explain the method.
9. **Final doorway/footer:** return to the same access state and visual metaphor from the hero.

## Design-engineering build plan

This should be designed and implemented in slices. The first slice should be the visual identity-bearing part, not the entire homepage.

### Slice 1: shell, hero, and access bar

Build only:

- `PublicShell`
- `FloatingNavigation`
- `HeroHorizon`
- `AccessBar`
- `MediaCard`
- `NoiseLayer`

The slice should prove:

- the page has a point of view;
- the visual metaphor works without a fake dashboard;
- real Opportunity/source data can occupy the visual field;
- access mode changes copy, control, and behavior without changing the composition;
- mobile does not collapse into a generic card stack;
- keyboard and reduced-motion behavior remain first-class.

### Slice 2: source desk and opportunity horizon

Add:

- `EvidenceRail`
- `OpportunityHorizon`
- `OpportunityCard`
- `SourceBadge`
- `UnknownState`
- `UnavailableState`

This slice connects the art direction to Missa’s actual public repository and canonical source rules.

### Slice 3: connected path and audiences

Add:

- `ProcessPath`
- `CreatorEntryCard`
- `OrganizationEntryCard`
- `MethodologyLink`

This is where we explain the product without reverting to a feature grid.

### Slice 4: footer and long-page rhythm

Add the closing scene, guide links, legal/navigation groups, and any real newsletter/waitlist action. The footer should echo the hero’s atmosphere but not duplicate the hero interaction.

## Component contract

Every new component should specify these states before visual polish:

| Component                                    | Required states                                                                                     | Responsive rule                                                             | Accessibility contract                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `FloatingNavigation`                         | default, menu open, focus, pressed                                                                  | collapses to menu; preserves primary access action                          | `nav` landmark, labelled menu button, Escape closes, focus returns to trigger            |
| `AccessBar`                                  | closed, waitlist, open, loading, success, error, unavailable                                        | becomes stacked form/action on narrow screens                               | labelled email field, live status for result, no hidden preference fields                |
| `MediaCard`                                  | loading, loaded, hover, focus, selected, unavailable                                                | changes from arc/rail to deliberate horizontal scroll or single active card | card link/button semantics, meaningful alt text, no motion-only information              |
| `OpportunityCard`                            | normal, missing source, unknown fee, unpublished deadline, expired/unavailable, save pending, saved | content reorders so title/source/deadline remain first                      | heading/link structure, source and date labels, Save is a labelled button                |
| `EvidenceRail`                               | default, active item, expanded item, empty                                                          | horizontal rail becomes vertical evidence stack                             | list semantics, active item exposed, keyboard previous/next if carousel behavior remains |
| `ProcessPath`                                | default, active step, reduced motion                                                                | becomes a vertical sequence                                                 | headings and ordered sequence remain meaningful without animation                        |
| `CreatorEntryCard` / `OrganizationEntryCard` | default, hover, focus, unavailable                                                                  | two columns become one; no forced equal height                              | link names explain destination and audience                                              |
| `MethodologyLink` / footer                   | default, hover, focus, unavailable                                                                  | grouped links collapse into readable sections                               | footer landmark and logical tab order                                                    |

## Responsive and motion rules

- Desktop can use the full arc/horizon composition; tablet should reduce card count and preserve one active card; mobile should make the active card readable first and use a controlled horizontal rail only when it remains discoverable.
- Never hide source, deadline, fee, or eligibility behind hover. Hover may change atmosphere; it cannot be the only way to access evidence.
- Use transform/opacity for nonessential movement. Avoid layout-affecting animation for the primary content.
- Respect `prefers-reduced-motion`: remove continuous drift, parallax, automatic card cycling, and glow breathing; keep selected/focus states static and clear.
- Lazy-load below-the-fold media. The hero’s first meaningful content should not wait for a video. Use a poster or static first frame for motion assets.
- Keep the DOM order aligned with the reading order. Visual arcs can be achieved with transforms or CSS grid placement without making keyboard order confusing.
- Test long opportunity titles, long organization names, translated CTA labels, right-to-left text, missing images, and source URLs that wrap.
- Preserve a minimum visible focus treatment against dark atmospheric surfaces. Do not rely on a subtle color shift alone.

## Current Missa engineering boundary

This teardown informs the local review concept only. The implementation boundary remains:

- `apps/web/components/design-system/homepage-future.tsx`
- `apps/web/components/design-system/homepage-future.module.css`
- `apps/web/app/design-system/homepage-future/page.tsx`

The production root page, production proxy, data migration path, and deployment are outside this phase. The existing shared access model remains the correct boundary:

```ts
type PublicAccessMode = "closed" | "waitlist" | "open";
```

The next implementation should preserve the existing public Opportunity repository/API, waitlist contract, authentication handoff, and Save-to-Tracker behavior. The visual redesign must not create a parallel access state or a new Opportunity API.

## Captured Missa design direction

### Direction statement

Missa should feel like a **living field of openings**: a place where creative work is not presented as an anonymous feed, but as a set of doors with visible requirements, provenance, and consequences.

The visual system should create a moment of discovery, then immediately earn that feeling with evidence. The first impression can be cinematic; the second impression must be legible and trustworthy.

### Design pillars

1. **Atmosphere before interface chrome.** Start with a composed scene, not a dashboard or a grid of equal cards.
2. **Evidence inside the beauty.** Every visual Opportunity treatment must retain the source, deadline state, and essential ask in the accessible reading order.
3. **Motion as orientation.** Movement should show where an Opportunity came from, what is active, and what can be inspected next.
4. **Global by default.** Location, remote context, currency, date, language, and timezone must never assume one country or one creator path.
5. **Private decisions stay private.** The homepage can invite discovery; it must not imply that Saves, preferences, or Profile activity are public proof.
6. **Access is a product state.** Closed, waitlist, and open are not cosmetic variants. They change the action, copy, and available route.

### Three possible visual directions

Using the “design it twice” discipline, there are three viable translations of the Melius reference. They should not be blended indiscriminately; each creates a different Missa personality.

#### A. Opportunity horizon — recommended

An aubergine/black field carries a shallow horizon of real Opportunity cards. One active card is readable in the center; neighboring cards are glimpsed as color, discipline, organization, or source fragments. The horizon slowly changes position as the user navigates or scrolls.

- **Melius parallel:** curved model cards and creative-output rails.
- **Missa-specific meaning:** the world of opportunities is broad, but each opening can be inspected.
- **Motion:** slow lateral drift, focus-to-center transition, card elevation on selection, no automatic content cycling when reduced motion is enabled.
- **Risk:** if cards become too abstract, the scene becomes decoration. The active card must expose evidence immediately.

#### B. Source constellation

The homepage is a dark editorial space where official sources, deadlines, disciplines, and Opportunity records appear as connected points. Selecting a point brings a source-backed record forward.

- **Melius parallel:** the idea of a canvas where many nodes assemble into one creative result.
- **Missa-specific meaning:** provenance is not a footnote; it is the structure of the product.
- **Motion:** nodes connect and separate with gentle line/opacity transitions; selection expands one evidence cluster.
- **Risk:** graph metaphors can feel technical or overwhelming, especially on mobile and for screen-reader users. It requires a very strong linear fallback.

#### C. Field notes / editorial archive

The page behaves like a moving archive: large display statements, source excerpts, discipline markers, opportunity cards, and field-guide entries alternate in a calm but highly art-directed sequence.

- **Melius parallel:** manifesto pauses, editorial type scale, contained dark information scenes, and strong footer/CTA rhythm.
- **Missa-specific meaning:** Missa is a trusted editorial instrument for deciding what deserves a creator’s time.
- **Motion:** page-level reveals, image crops, text displacement, and progressive source annotation rather than a continuously moving canvas.
- **Risk:** it may feel beautiful but less immediately useful if the public Opportunity entry point arrives too late.

### Recommended synthesis

Use **Opportunity horizon** for the hero and first interactive proof, borrow **Source constellation** for the evidence relationship inside each active card, and use **Field notes** for the lower-page methodology and guide rhythm. This gives Missa the visual confidence of Melius without copying its AI-canvas premise.

## Parallel: Melius pattern to Missa product behavior

| Melius pattern                  | What it accomplishes                                                   | Missa equivalent                                                                                       | Boundary to preserve                                                                           |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Floating compact navigation     | Keeps the visual field open while preserving entry actions.            | Opportunities, Guides, For organizations, Methodology, Sign in, and access action.                     | Navigation must expose real routes and not imply an unavailable product area.                  |
| Centered one-line hero promise  | Establishes a memorable point of view before explaining features.      | “See what’s open. Know what it asks. Keep moving.”                                                     | The promise must be supported by real public data or an honest access state.                   |
| Curved/stacked media cards      | Demonstrates breadth and creates visual movement.                      | Opportunity horizon with discipline, organization, source, and evidence fragments.                     | No fake records, fake metrics, or source-like decoration.                                      |
| Prompt/access bar               | Gives the visitor one obvious next action.                             | Closed/waitlist/open access doorway.                                                                   | CTA behavior must derive from PublicAccessMode; no drift between copy and routing.             |
| Model/persona tabs              | Lets users explore multiple use cases without multiplying page length. | Creator and organization entry points; optionally opportunity types or disciplines.                    | Tabs must not hide essential information or turn navigation into a preference-collection flow. |
| Video/image node assets         | Makes the product feel tangible and specific.                          | Real identity assets where rights and alt text are available; otherwise typographic/source treatments. | A missing image must not remove the Opportunity’s meaning.                                     |
| Dark textured information panel | Makes dense content feel like part of the same world.                  | Source desk, methodology, unknowns, and unavailable states.                                            | Texture cannot reduce contrast or obscure evidence labels.                                     |
| FAQ accordion                   | Compresses explanation while retaining a long-form answer.             | Verification, source changes, deadlines, fees, saves, and privacy methodology.                         | Native button semantics, keyboard operation, deep-linkable headings where useful.              |
| Pricing comparison              | Gives a clear commercial decision surface.                             | Not used. Missa currently needs access and audience pathways, not fabricated pricing.                  | Do not add pricing until an approved commercial model exists.                                  |
| Branded 404/unavailable state   | Keeps failure inside the brand and provides recovery.                  | Missing source, unavailable browse, unpublished deadline, and expired Opportunity states.              | State copy must distinguish “not observed” from “does not exist.”                              |
| Newsletter/footer closure       | Provides a final low-friction continuation.                            | Guides, methodology, waitlist/access, privacy, and source-first footer.                                | Email collection remains within the existing waitlist/newsletter contract.                     |

## Dependency inventory

This inventory separates what is already present from what must be decided, supplied, or built. “Dependency” does not automatically mean “install a package.” Several of the most important dependencies are content, data, and governance dependencies.

### Already available in the repository

| Dependency                              | Current evidence                                                                                                                                               | Role in the redesign                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Next.js App Router                      | apps/web/app/design-system/homepage-future/page.tsx                                                                                                            | Server-render the review route and keep data loading outside the client visual layer.                                 |
| CSS Modules                             | Existing homepage-future.module.css and other design-system routes                                                                                             | Own the art-directed scene layout without changing the project’s styling boundary.                                    |
| motion                                  | Declared in apps/web/package.json                                                                                                                              | Provide limited client transitions where CSS alone is insufficient. No new animation package is required for Slice 1. |
| Embla Carousel                          | embla-carousel, embla-carousel-react, and autoplay packages are declared                                                                                       | Optional controlled rail behavior for the opportunity horizon; use only if a carousel is genuinely needed.            |
| Lucide icons and existing UI primitives | lucide-react, Base UI, existing Button, Input, Badge, and card components                                                                                      | Accessible controls, status icons, and fallback UI.                                                                   |
| Shared public access model              | apps/web/lib/publicAccess.ts                                                                                                                                   | Single source for closed, waitlist, and open behavior.                                                                |
| Public Opportunity repository           | apps/web/lib/opportunityRepository.ts and getOpportunityRepository()                                                                                           | Supplies real public records to the horizon; no new Opportunity API is needed.                                        |
| Opportunity browse projection           | @missa/radar-engine projection already includes title, organization, type, discipline, deadline, fee, location, source, and personal Save state                | Provides the evidence metadata required for a readable visual card.                                                   |
| Source and identity media fields        | source.url, source.checkedAt, source.processingSucceededAt, identityAssetUrl, and identityAssetAlt are available in related Opportunity projections/components | Support source-first cards and progressive media where the asset is real and usable.                                  |
| Waitlist flow                           | /waitlist, /api/waitlist, existing validation, campaign handling, rate limiting, analytics, confirmation email, and privacy page                               | Provides the waitlist state without creating a second signup contract.                                                |
| Authentication and first-Save intent    | Existing auth routes and /api/journey/first-save/intent                                                                                                        | Preserve the rule that public reading is open while Save requires authentication at the correct point.                |
| Save-to-Tracker handoff                 | SaveToTrackerButton, /api/me/tracker, saveOpportunityForAccount, and canonical save adapter                                                                    | Makes the active Opportunity action real and preserves intent/idempotency behavior.                                   |
| Existing brand identity                 | MissaWordmark, existing design tokens, content guidance, and public shell components                                                                           | Prevents the redesign from becoming a Melius copy or a new brand system disconnected from Missa.                      |
| Local review boundary                   | /design-system/homepage-future                                                                                                                                 | Allows visual iteration without promoting the concept to the production root route.                                   |

### Required design inputs

These are decisions or supplied materials, not npm dependencies:

1. **Hero visual metaphor:** approve the recommended Opportunity horizon, or choose Source constellation / Field notes as the primary direction.
2. **Display type decision:** select or approve the Missa display face and its licensing. The system needs a distinctive display role, not an unlicensed copy of Melius typography.
3. **Color and surface tokens:** define the aubergine/black atmospheric surface, evidence accent colors, focus color, border treatment, and light-surface fallback.
4. **Media policy:** identify which existing Opportunity identity assets are cleared for public display, what alt text is authoritative, and what the fallback looks like when no image is available.
5. **Hero content selection:** choose one or more real public Opportunity records that are safe and representative for local review. If production data is unavailable, use clearly labelled review fixtures rather than fabricated live-looking records.
6. **Access copy:** approve the exact closed, waitlist, and open language, including whether the local route should visibly say “design review.”
7. **Audience destinations:** confirm the canonical creator and organization routes so the audience cards do not become dead-end marketing links.
8. **Motion intensity:** approve whether the default scene is subtle drift, scroll-linked movement, or interaction-only motion. Reduced-motion behavior is mandatory regardless of the choice.

### Required implementation work

1. Extract a small homepage-future visual language: tokens for atmosphere, media surfaces, focus, display type, and spacing.
2. Create a shared typed content model for the visual horizon so cards cannot lose source/deadline/fee honesty while being art-directed.
3. Split the current large prototype into deep components: shell, navigation, access bar, media card, opportunity card, evidence rail, and reduced-motion media layer.
4. Add a client boundary only around the interactive horizon and access form; keep repository loading and public metadata server-side.
5. Add a stable active-card model with URL/hash or button semantics so selection can be restored and announced.
6. Implement loading, empty, missing-source, unknown-fee, unpublished-deadline, unavailable, and error states before decorative motion.
7. Add image loading with a static fallback/poster, loading="lazy" below the fold, explicit dimensions/aspect ratios, and no hero-blocking video dependency.
8. Add keyboard tests, reduced-motion tests, access-mode tests, and responsive screenshots for the local route.

### Infrastructure and operational dependencies

| Dependency                                | Needed when                     | Why it matters                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Database-backed public repository         | Production public browsing      | The hero horizon must read from the same canonical public projection as /opportunities; it must not use a homepage-only dataset.                                                     |
| Public source/identity asset availability | When using image-led cards      | Assets need stable URLs, rights/permission, alt text, and an unavailable fallback. Existing Vercel Blob support can be reused where appropriate.                                     |
| Waitlist database and email delivery      | Closed/waitlist production mode | Existing /api/waitlist behavior, rate limits, Resend confirmation, and privacy language must remain the authority.                                                                   |
| Authentication/session runtime            | Save and Sign in                | The homepage should hand off to existing auth, not create a visual-only login state.                                                                                                 |
| Analytics event contract                  | Before measuring the redesign   | Track bounded events such as horizon view, active-card selection, source-open, access CTA, waitlist start/submit, and Save intent; do not send raw email or private preference data. |
| Performance budget                        | Before production promotion     | Define a hero media byte budget, LCP target, maximum simultaneous videos, and behavior on slow connections.                                                                          |
| Browser/device QA                         | Before promotion                | Validate desktop, tablet, mobile, touch, keyboard, screen reader, reduced motion, high contrast, and long/localized content.                                                         |
| Production promotion gate                 | Only after review               | Keep the concept route isolated until design, product, data, accessibility, and performance acceptance are explicit.                                                                 |

### Dependencies we do not need for the first slice

- A new Opportunity API.
- A 3D/WebGL engine.
- A new CMS.
- A new animation framework.
- A new profile or preference model.
- Pricing, billing, or subscription infrastructure.
- Fabricated hero media or a large stock-image library.
- A production proxy change.

The first slice can be built with the current Next.js route, CSS Modules, the existing motion dependency or CSS transitions, real repository projections, and the existing access/Save contracts.

## Decision needed for the next step

Before building the entire page, approve the first visual slice: **dark opportunity horizon + centered promise + state-aware access bar + one real Opportunity/source card**. That slice will answer the only question that matters right now: whether Missa has acquired a distinctive visual language, rather than merely receiving more sections.
