# Creative direction and homepage specification

> **Superseded direction:** Read [the current production sequence](07-current-production-sequence.md) first. Empty-room composition, Writing-first pilot, fixed page structure and CSS-reveal fallback are not current creative decisions. Technical checks remain applicable; image-specific prompts need revision for the selected Midjourney master.

## 1. Brief

Audience: writers, visual artists, filmmakers, musicians, performers and designers seeking a concrete next opportunity. Some arrive with an immediate deadline; others are exploring what is available. The homepage must serve both without requiring an account, a scene interaction or a long introduction to understand its value.

Message: Missa helps you find opportunities for your creative practice.

Format: responsive web homepage; white editorial interface around an authored media stage. Public beta language and existing discovery routes remain the product boundary.

Desired impression: someone who understands creative work has made the search feel welcoming and navigable. Avoid the visual language of an AI video generator, generic productivity SaaS or luxury fashion campaign.

## 2. Three concepts considered

### A. A place for your practice — selected

**Idea:** a shared architectural threshold opens onto six different creative worlds.

Composition: a strong left-aligned headline and clear action precede a wide studio stage. Two clean sliding panels reveal a carefully composed workspace. A short caption identifies the practice. The stage is bounded by the page grid; white space is part of its identity.

Typography: Newsreader display at the approved marketing scale; Instrument Sans for explanation and controls; Fragment Mono only on real opportunity dates/amounts further down the page.

Colour: white canvas, near-black text and Forest action. Light neutral architectural materials, restrained green objects and truthful material colour inside the imagery. Physical wood can be warm; the page itself must not become cream.

Imagery/material: photographic set design, tactile tools, calm daylight, an unusually coherent shared architecture. Tools show practice rather than trophies or success theatre.

Lineage: architectural editorial photography, stage-set reveals and modernist exhibition design. Space guides attention; a controlled physical change creates surprise.

Why it fits: the reveal is a visual invitation. It makes the breadth of Missa visible without implying a complicated configurator. The same system supports all disciplines.

Risk: rooms could suggest that Missa offers physical studios. Mitigation: clear opportunity headline and copy; no property/location claims; product content immediately below. Abstract set design should feel editorial, not a property listing.

### B. Work in progress

**Idea:** the same central worktable becomes a portrait of different creative practices through carefully edited object match cuts.

Composition: monumental tabletop close-up with a sparse editorial headline above. A manuscript, camera, maquette or instrument becomes the focal object in the same spatial position. Selection reveals a different workspace.

Typography/colour: same approved Missa families and white/Forest interface; more intimate, lower-contrast photography with strong material detail.

Lineage: still-life editorial photography and object portraits. Small traces of making carry human presence without a cast.

Why it fits: recognisable tools make creators feel seen; the production can be more compact than full architectural worlds.

Risk: replacement objects may morph, look like a store, or reduce a practice to a cliché. Spatial jump cuts could feel less impressive than the user's reference. This is the fallback if wide studio continuity proves too expensive.

### C. The open index

**Idea:** a large editorial index of practices sits beside a changing image and a small set of genuine opportunities.

Composition: oversized stacked practice names, one image window, immediate data examples. Hover can preview a still; clicking follows a real filter link. No cinematic state graph is necessary.

Typography/colour: Newsreader names; Instrument Sans supporting text; tight real metadata in Fragment Mono. White and hairline dividers dominate; image colour changes by subject.

Lineage: cultural-institution indexes and exhibition catalogues. Typographic hierarchy makes breadth comprehensible.

Why it fits: direct, fast and easy to maintain. Strongest if discovery usefulness must ship before motion production.

Risk: less cinematic and less spatially memorable. Keep this as a static release option rather than the main creative direction.

**Ranking:** A first for distinctiveness and reference fidelity; C second for speed and utility; B third as an alternate art-production mechanism. We proceed with A, borrowing C's useful links below the stage.

## 3. Art direction: the shared stage

A straight-on architectural set. Two broad pale neutral sliding panels meet at the centre with a narrow seam. A shallow horizontal track and quiet floor plane establish a real mechanism. The panels open outward, revealing a studio behind them. Camera, panel size, floor, track, outer frame and daylight direction are common across all worlds.

No protagonist transforms into another person. The core six scenes are unoccupied, with credible signs of work in progress. This avoids identity continuity problems and lets visitors imagine their own practice. Later editorial portraits can use separately commissioned, cleared photography; they are outside this first homepage scope.

The studios are deliberately specific but not named geographic locations. Avoid presenting creative opportunity as something that happens only in Manhattan, London or other familiar prestige cities. Breadth belongs in verified opportunity data, not invented location symbolism.

### Six worlds

| World label | Focal arrangement | Supporting detail | Movement |
|---|---|---|---|
| Writing | Open notebook on a modest desk, a small stack of manuscript pages | Plain book spines, pencil, seat with a dark green textile | Panels slide; pages remain still |
| Visual art | Easel with an original abstract work and a small clay form | Worktable, pigment dishes, restrained studio marks | Panels slide; art and tools remain still |
| Film | Unbranded camera on a tripod facing a small set | Blank slate, carefully coiled cable, one large soft source | Panels slide; no camera operator or screen animation |
| Music | Compact keyboard and acoustic instrument stand | Quiet acoustic panels, microphone, blank sheet on stand | Panels slide; no vibrating strings or audio |
| Performance | Open rehearsal floor with a dark green side curtain | Low rehearsal block, warm neutral cyc/back wall | Panels slide; curtain stays still |
| Design | Table with paper models, material samples and a task lamp | Plain mock-up packaging, folded textile, geometric prototype | Panels slide; samples remain fixed |

These are visual categories, not new database taxonomy. Writing may map to several canonical terms. Film and performance may overlap opportunities. The full opportunity catalogue remains available to everyone.

## 4. Page sequence and copy

### Header

Existing Missa wordmark with current beta treatment. Primary navigation: Opportunities, Directory, Rankings. Account actions remain secondary and use existing routes. On mobile, use the approved menu/sheet structure with correct focus handling. Do not copy the current custom morphing menu without checking its policy and keyboard behaviour.

### Hero: understand first, explore second

Eyebrow: `For your creative practice`

H1: `Opportunities for every creator`

Body: `Find open calls, grants, residencies, and places to share your work.`

Primary action: `Explore opportunities` → `/opportunities`.

Optional supporting text link: `How Missa works` → the on-page explanation.

Below: cinematic stage and a visible `Explore the studio` scene control label. The visual scene selection does not save account preferences or imply recommendation personalisation.

Scene buttons: Writing, Visual art, Film, Music, Performance, Design. Use ordinary supporting Button actions: activating one requests a finite preview. Selected state is conveyed with text and `aria-pressed`, not an animated category badge. A selection does not navigate.

Stable stage caption: `A place for writing.` / `A place for visual art.` / `A place for film.` / `A place for music.` / `A place for performance.` / `A place for design.` Default: `Make room for what comes next.` Captions are DOM text outside the footage.

Motion setting: `Scene motion` with On/Off text. Respect system reduced motion as the initial preference; do not persist without a clearly scoped choice. An explicit Off always wins. A small `Close studio` action returns to the closed base. Keep it mounted to avoid unnecessary focus transfers.

### Practice entry: useful navigation

Heading: `Start with your practice`

Copy: `Explore opportunities across writing, art, film, music, performance, and design.`

Provide six simple text links or an approved list composition. These are separate from the scene preview buttons. Label links `Writing opportunities`, etc. Derive their destination URLs from the actual taxonomy/query contracts and verify the resulting filters. If a reliable mapping is unavailable, send the visitor to the broad Opportunities page with a truthful label rather than silently using a wrong parameter.

On the first pilot, the single always-working Explore link is sufficient; the six filtered links are a later acceptance gate.

### Real opportunities

Heading when authoritative current open records are available: `Open for your next step`

Show up to three current eligible public records, selected through existing visibility/freshness rules. Required: title, organiser if supplied, opportunity type, meaningful fee/funding/deadline fields, detail link. Preserve original currencies and exact dates. Unknown and not-applicable fields remain distinct. Do not invent an opportunity to complete a grid.

Use existing opportunity composition, adapted to the marketing density through approved tokens. Keep save/account actions out of the beta homepage unless their full journey is confirmed. Dedicated title links prevent nested interactive card conflicts.

If fewer than three records qualify, show fewer. If none can be verified, replace the section with the existing catalogue entry and omit the claim that these are open. Error: `We couldn't load opportunities here. You can still explore the catalogue.` Link remains available; never silently label fixtures as live.

### How Missa works

Heading: `From looking to a next step`

1. `Find an opportunity` — `Explore calls, grants, residencies, and more for your practice.`
2. `Check the details` — `Review the deadline, eligibility, fees, and application requirements.`
3. `Go to the official application` — `Follow the organiser's link and apply on their website.`

Do not say that opening an organiser link submits work. If a particular listing follows a different application model, its detail page governs that process.

### Trust and method

Heading: `Know where an opportunity comes from`

Copy: `Check the source and application details before you apply.`

Link: `Read our methodology` → `/methodology` after destination verification.

Do not claim every record is manually verified, always fresh, free, worldwide or appropriate for every visitor. The beta label belongs near shared branding, not buried in this section.

### Footer

Short final invitation: `Find a next step for your work.`

Link: `Explore opportunities`.

Existing applicable About, Methodology and Terms links. Include only verified existing contact/privacy destinations. No invented testimonials, logos, user counts, success rates, partner affiliations or email form with no working submission path.

## 5. Responsive composition

Desktop reference frame: 1440×900. Container maximum 1360px, 32px page gutters. Use the existing 64px Newsreader marketing display role as the starting point. Headline and lede occupy a clear reading column; the primary action sits adjacent in the same introductory block where width allows. Media below spans the container with a maximum 16px media radius from the design scale, if a radius is used.

Keep first-fold content modest enough that visitors see the headline, Explore action and part of the studio without scrolling. Do not impose a fixed full-screen layout that hides controls at short heights. Overall hero height follows content.

Mobile reference: 390×844, also 320×568. Use 16px gutters, readable responsive heading, stacked copy/action, a bounded portrait media area and a wrapping two-column grid of scene controls. Controls can sit below the media; this is preferable to text over tools. Allow normal vertical scrolling. The primary link appears before the media in DOM and visual order.

The 16:9-to-9:16 centre crop retains only about 31.64% of master width. Every focal arrangement must pass that crop. Core pilot tests the crop first; if it fails, create one shared mobile composition and derive every mobile endpoint from it. Never generate six unrelated mobile scenes. Swapping the responsive asset family happens only in an idle state or through a static matched poster, never halfway through a transition.

At 200% zoom or short landscape: put controls and text in flow, reduce decorative stage height, retain touch sizes and allow page scrolling. No fixed controller obscures content.

## 6. Interaction contract

On initial visit: show the closed studio poster and useful HTML immediately. No automatic footage, no rotating disciplines, no audio. The page works with JavaScript unavailable.

On Writing: set requested world to Writing immediately; communicate `Opening writing studio…`; leave opportunity navigation available. Prepare the forward clip hidden. Reveal only when a valid opening frame is ready; hold the approved endpoint. Announce `Writing studio shown` once.

On Film while Writing is open: close Writing using its validated return, then open Film from the shared base. No direct Writing-to-Film clip exists. UI acknowledges Film immediately. Keep only the latest requested world; never queue an unbounded list. Core prototype can disable further scene requests during the active pair while keeping navigation available; full version must settle on the latest request deterministically.

On repeated click of the already-selected world: no-op; do not restart the footage. Close studio is explicit and does not clear an account preference.

On failure: retain the last valid frame. Offer Retry and Still scenes. Resolve the requested scene instantly to its approved poster when Still scenes is chosen, provided that poster is available. If missing, retain the base and keep all browse links functional. Do not announce a video completion that never happened.

Motion off: show matched destination posters directly without cinematic playback or spatial UI animation. Selection and discovery access work identically. Turning motion off mid-playback cancels the active request, pauses media and resolves to an available destination poster; if unavailable, retain the current safe image and explain the limitation.

Navigation click during playback: navigate immediately; cancel media work on unmount. Never delay discovery until an animation finishes.

## 7. Token and component decisions

| User intent | Existing policy entry | Candidate implementation | Adaptation |
|---|---|---|---|
| Primary discovery navigation styled as action | `action.primary` | `components/ui/button.tsx` with existing Link rendering pattern | Forest default, approved radius, real href |
| Request a studio preview | `action.supporting` | `components/ui/button.tsx` | Stable labelled buttons; finite preview; group name; selected text/pressed state |
| Toggle scene motion | `setting.boolean` | `components/ui/switch.tsx` | Visible Scene motion label, system-aware initial value |
| Close studio / retry | `action.quiet` / `action.supporting` | Button | Stable position; local media state only |
| Local media failure | `feedback.local-recoverable` | `components/ui/alert.tsx` | Calm text with a useful fallback |
| No verified records | `feedback.empty` | `components/ui/empty.tsx` | Real catalogue link; no fabricated cards |
| Opportunity record | `productCompositions.OpportunityCard` | Existing browse implementation, inspect before reuse | True values, semantic badges, marketing density |
| Responsive navigation | Existing shell/menu conventions, exact entry to resolve in B01 | Installed Sheet/navigation components | Focus, Escape, return behaviour |
| Cinematic composition | New proposed `composition.homepage-studio` | Proposed `components/missa/homepage-studio.tsx` | Experimental until all motion/browser/token checks pass |

The scene request buttons are actions, not onboarding radio choices. If a future design turns this into a saved preference, use `choice.single-visible`/RadioGroup and revisit persistence explicitly.

Multi-second footage is authored media; it is not permission for multi-second UI transitions. Current hover/menu/reveal durations stay within DESIGN.md. Document any needed marketing-media policy clarification centrally before UI implementation. No liquid-glass theme migration is part of this plan.

## 8. What success looks like

A visitor understands Missa without clicking the studio. A curious visitor discovers a beautifully coherent reveal. A returning visitor reaches opportunities immediately. A reduced-motion or slow-network visitor receives the same useful page. A creator from any listed practice sees a credible invitation without an unsupported promise about available inventory or success.
