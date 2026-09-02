---
title: Missa homepage — Open Index restart
status: local review concept
supersedes: homepage-future visual direction A/B/C
---

# Missa homepage: Open Index

The previous dark, image-led Opportunity Horizon concept is sunset as an active
direction. It was too theatrical for Missa and pushed the useful catalogue below
the brand moment.

This restart treats the homepage as a public reading surface: a quiet index of
real Opportunities, with source, limits, and unknowns visible before sign-in.

## Design decision

The working direction is **Open Index**:

- paper-white surface, near-black ink, neutral hairlines;
- one restrained aubergine accent for actions and focus;
- Ysabeau for editorial headings, existing Missa sans for interface copy, and
  Fragment Mono for compact metadata;
- no hero image, generated asset, gradient, glass surface, shadow system, or
  decorative dashboard;
- the Opportunity list is the visual center of gravity;
- motion is limited to short row and focus transitions.

The direction combines the strongest ideas from the design exploration:

- **Open Index:** newspaper-like hierarchy and public reading-room posture;
- **Opportunity Field:** optimize for quickly deciding whether to open a call;
- **Source Ledger:** make provenance and uncertainty structural rather than
  decorative.

## Homepage anatomy

1. Quiet public header with Opportunities, Guides, Methodology, For
   organizations, Sign in, and the state-aware access action.
2. Compact opening statement: “Find the call worth your time.”
3. Fact panel: official source, separate deadline/fee, unknown information.
4. Access doorway reflecting `closed`, `waitlist`, or `open`.
5. Public promise: read, check, keep.
6. Repository-backed Opportunity index with search and evidence metadata.
7. Read → Decide → Track path.
8. Creator and organization entry points.
9. Methodology note and restrained footer.

## State boundary

The route remains local-only. It consumes the existing public Opportunity
repository and `PublicAccessMode`. Closed and waitlist states do not render
public browse links or records. Open state renders only repository data and
keeps the honest empty/unavailable state when there are no records.

Public reading remains unauthenticated. Authentication belongs at Save to
Tracker, with intent preserved and canonical state revalidated by the existing
product flow.

## Deliberately excluded

- generated or decorative hero imagery;
- Pexels imagery in the primary homepage surface;
- fabricated counts, testimonials, freshness, rankings, or match scores;
- pricing, product dashboards, account prompts, and profile completion;
- source-confidence claims that readers cannot interpret;
- organization capabilities not supported by the current product.

If Pexels imagery is used later, it should support a specific guide or editorial
explanation, carry a meaningful caption and credit, and never stand in for
Opportunity evidence.

## Engineering notes

The local concept is implemented in:

- `apps/web/components/design-system/homepage-future.tsx`
- `apps/web/components/design-system/homepage-future.module.css`
- `apps/web/app/design-system/homepage-future/page.tsx`

The route is not production root, proxy, data, or deployment authority. The
existing public-access, authentication, waitlist, and Opportunity contracts
remain unchanged.

