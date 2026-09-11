# Missa visual direction: Human Opportunity Directory

**Status:** Adopted reference direction for the product-wide reset  
**Reference inspected:** Variant, “Opportunity Web App 1”  
**Inspection date:** 2026-08-31  
**Evidence boundary:** Live rendered desktop frame inspected in the Codex in-app browser. The page exposed no WebMCP tools, so structure and tokens were measured from its rendered DOM and computed styles. Mobile behavior and interaction outcomes were not available in the inspected frame and remain design specifications rather than observed facts.

## Direction in one sentence

Missa is a calm, human opportunity directory that uses evocative imagery and quiet, disciplined product UI to help creatives see what is open, understand who is behind it, judge whether it fits, and apply with confidence.

## Why this reference works

The interface is attractive because it makes one strong visual move—large photographic opportunity covers—inside an otherwise restrained product shell. The application chrome stays quiet, the cards repeat predictably, the typography is confident without becoming theatrical, and every opportunity has a clear next action.

The design feels human because the images create atmosphere and possibility. It does not attempt to manufacture character through novelty typography, decorative shapes, excessive color, or dashboard density.

## Observed desktop anatomy

```text
┌───────────────── 288px navigation rail ─────────────────┬──────── workspace ────────┐
│ Brand                                                     │ 80px utility/search bar   │
│ Primary navigation                                        ├───────────────────────────┤
│ Category navigation                                       │ Page heading + subtitle   │
│                                                           │                           │
│ Settings pinned near the bottom                           │ Responsive opportunity grid│
└───────────────────────────────────────────────────────────┴───────────────────────────┘
```

At the inspected 916 × 930 embedded viewport:

- Navigation rail: `288px` wide, `#EBEBEB`, `24px` padding.
- Workspace: remaining `628px`, with an `80px` utility bar and independently scrolling content.
- Content region: `40px` padding.
- Results grid: two `258px` columns with a `32px` gap.
- Desktop source classes indicate a responsive `1 → 2 → 3` column grid.
- Scrolling belongs to the results workspace; the navigation and utility bar remain stable.

## Measured visual tokens

### Color

| Role | Observed value | Missa use |
|---|---:|---|
| Application canvas | `#F2F2F2` | Default discovery background |
| Navigation rail | `#EBEBEB` | Persistent desktop navigation |
| Primary surface | `#FFFFFF` | Opportunity tile and selected navigation |
| Primary ink | `#1A1A1A` | Titles, values, primary actions |
| Secondary text | `#6B7280` | Supporting copy and descriptions |
| Tertiary label | `#9CA3AF` | Field labels and quiet metadata |
| Search surface | `#F5F5F5` | Search and quiet inputs |
| Positive surface | `#F0F7F2` | Verified fit or trust state |
| Positive ink | `#2D5A3A` | Verified fit or trust state |

Missa should retain the neutral structure and define one ownable accent for active navigation, verified identity, focus, and small moments of brand recognition. Accent color must not compete with the images.

### Typography

- Observed family: `Inter, -apple-system, sans-serif`.
- Product body baseline: `16px / 24px`, weight `400`.
- Page title: `36px / 40px`, weight `600`.
- Page subtitle: `18px / 28px`, weight `400`.
- Opportunity title on image: `24px / 32px`, weight `600`, white.
- Opportunity facts: `14px / 20px`, weight `500`.
- Fact labels and opportunity type: `10px / 15px`, weight `700`, uppercase, `1px` tracking.
- Primary action label: `14px`, weight `600`.

Missa should use a single excellent sans-serif product family at first. Brand distinction should come from image direction, composition, language, and the wordmark before introducing a second display face.

### Spacing, shape, and depth

- Base rhythm: `4px`, with primary steps at `8`, `12`, `16`, `24`, `32`, and `40px`.
- Active navigation: `48px` tall, `12px` radius, `10px 12px` padding.
- Search: `40px` tall, pill radius, `10px 16px`, with `40px` left inset for its icon.
- Opportunity tile: `20px` radius, clipped image, white body.
- Tile grid gap: `32px`.
- Default tile shadow: only `0 1px 2px rgba(0,0,0,.05)`.
- Hover intent: shadow grows over approximately `300ms`; layout and color remain stable.
- Primary actions: black pill, `40px` height, `10px 32px` padding.
- Type label: translucent white, backdrop blur, `8px` radius, `6px 12px` padding.
- Status pill: `28px` tall, full radius, `6px 12px` padding.

## Opportunity tile anatomy

Every tile follows the same reading order:

1. Atmospheric or documentary image.
2. Opportunity type label over the image.
3. Opportunity title over the image near the lower edge.
4. Verified organization identity.
5. Two decision-critical facts.
6. One explainable state.
7. One primary action.

For Missa, the tile should contain:

- **Image:** an authentic organization-, place-, discipline-, or program-derived image. Never unrelated generic stock imagery.
- **Type:** residency, grant, prize, fellowship, open call, commission, or role.
- **Title:** the canonical opportunity title, cleaned of crawler noise.
- **Organization:** the verified host, with the parent relationship available when relevant: “Talking Gourds · a program of Telluride Institute.”
- **Facts:** vary by opportunity type, but prioritize deadline plus fee, award, location, or duration.
- **State:** a truthful, explainable label such as “Strong fit,” “Closing soon,” “Verified,” or “Needs review.” Do not show invented match percentages.
- **Action:** “View details” in discovery. Reserve “Apply” for destinations confirmed as official.

## Image direction

Images are the principal emotional layer of the product.

- Prefer authentic organization and program imagery from an official, licensed, or explicitly permitted source.
- If the opportunity has no reliable image, inherit cautiously from the verified organization or program.
- Record image source, ownership, attribution requirements, crop, and inheritance level.
- Do not use crawler-source branding as opportunity imagery.
- Do not generate a misleading image that appears to document a real program or place.
- Use a controlled crop and a bottom readability scrim for overlaid titles.
- Keep titles to roughly two lines before changing the tile treatment.
- Provide a designed non-photographic fallback using the organization’s identity—not random initials on a gradient.

## Information architecture adaptation

### Desktop navigation

Keep the calm persistent rail, but use Missa’s product model:

- Explore
- Saved
- Tracker
- Profile

The second navigation group should be context-sensitive and derived from real taxonomy rather than hard-coded decorative categories. Suggested opportunity discovery filters include:

- All opportunities
- Residencies
- Grants and prizes
- Fellowships
- Open calls
- Commissions

### Utility bar

- Global opportunity and organization search.
- Notification entry only when notification state is real.
- Compact profile identity.
- No ornamental metrics.

### Discovery surface

- Page title and one restrained human sentence.
- A focused filter affordance; do not fill the top of the screen with controls.
- Image-led opportunity grid.
- Progressive loading or pagination that preserves scroll position.

### Opportunity detail

Selecting a tile should lead to a detail experience with stronger disclosure than the reference:

- Canonical title and type.
- Verified host organization and parent organization relationship.
- Summary in plain language.
- Deadline and timezone.
- Entry fee and fee variants.
- Award, stipend, or compensation.
- Eligibility.
- Submission requirements and limits.
- Location, duration, and format where applicable.
- Judge, curator, or selection body when verified.
- Official application destination.
- Discovery source, separately labeled.
- Last checked date, conflicts, uncertainty, and correction affordance.
- More opportunities from the same organization.

## Mobile translation

The mobile experience should preserve the aesthetic, not merely stack the desktop.

- Replace the rail with a compact top bar and a four-item bottom navigation.
- Use a single-column, edge-aware image feed with `16px` page gutters.
- Keep image tiles visually generous, around a `4:3` or slightly taller ratio.
- Keep tile title, type, and scrim treatment identical to desktop.
- Show organization identity and the two most important facts beneath the image.
- Make the whole tile navigable while retaining a clearly labeled action.
- Use a bottom sheet for filters and sorting.
- Use a dedicated opportunity detail screen, not a cramped modal.
- Keep all touch targets at least `44px`.
- Avoid sticky controls that cover facts or the official-link action.

## Product-wide extension

The visual language can extend beyond opportunities without making every object a photo card:

- **Organizations:** image-led identity header, followed by programs and open opportunities.
- **Tracker:** quiet list or timeline; photography becomes a small contextual thumbnail.
- **Library:** editorial covers or work thumbnails only when assets exist.
- **Calendar:** no decorative photography; use the same neutral shell, typography, spacing, and status language.
- **Organization workspace:** denser operational surfaces with the same typography and control system, not the same discovery grid.

The system is shared through shell, typography, color, spacing, actions, focus treatment, and status semantics. Component layouts should respond to the job being done.

## What not to copy

- Generic job-board categories or employment terminology.
- Fictional “92% match” numbers.
- “Apply” or “Submit” actions before the official destination is verified.
- A personal job title in the utility bar unless Missa has that profile concept.
- Decorative counters that are not backed by real catalogue data.
- Generic stock photography disconnected from an opportunity or organization.
- Status labels without definitions or evidence.
- Desktop-only assumptions.
- Icon-font glyphs that fail semantically or render as broken characters.

## Relationship to Miro and Coss

- The Miro reference remains useful for disciplined spacing, confident sans-serif typography, flat surfaces, restrained shadows, pill actions, and responsive touch targets.
- Missa should not inherit Miro’s marketing color system, oversized marketing type, or pastel feature-card language for the application.
- Coss remains an implementation source for accessible primitives and interaction particles after the visual direction is selected.
- Coss is not the Missa theme, typography, color palette, layout, or brand personality.

## Acceptance criteria for the next visual prototype

The next prototype is acceptable only if it:

1. Visibly belongs to this image-led, quiet-shell direction.
2. Uses real Missa opportunity and organization fields rather than job-board filler.
3. Shows at least one organization hosting multiple opportunities.
4. Separates official destination from discovery source.
5. Removes crawler noise and HTML entities from titles and descriptions.
6. Includes credible image provenance and a deliberate missing-image fallback.
7. Demonstrates desktop discovery, mobile discovery, and opportunity detail.
8. Uses explainable states rather than invented scoring.
9. Passes keyboard, focus, contrast, touch-target, reduced-motion, and responsive checks.
10. Is selected as a visual target before production frontend migration begins.

