# Side scrolling and four live metrics

September 7, 2026. Local homepage refinement; no deployment.

## Intent and implementation

Navigation, selection, data display and loading status. Existing policy entry: `composition.homepage-next-opening`. Implementation: `apps/web/components/missa/homepage-next-opening.tsx` with scoped component tokens. Reuses the installed shadcn Carousel, Card, Button and Skeleton primitives, Studio card-05 composition and carousel-08 controls. No registry component replacement or theme installation.

- Add `embla-carousel-wheel-gestures@8.1.0` to the existing Embla 8 carousel. Horizontal trackpad gestures follow pointer-like dragging; vertical gestures continue to scroll the page. Looping removes the empty space at the first/last category. Dots, arrows, keyboard navigation and touch dragging remain available; no autoplay.
- Use circular distance for overlap ordering when the selected card crosses the loop boundary.
- Compact the inactive cards to photograph and centered category title. The selected card expands to reveal its description and action. Its content is the only active card link exposed to assistive technology.
- Four staggered statistic cards: current open opportunities, residencies, grants, and public directory profiles labelled Organizations. Plus signs are smaller, raised suffixes, while the database values remain unchanged.
- Organizations reads `/api/journals?limit=1` **without a kind filter**. Despite the historical endpoint name, this calls the same unfiltered `ProfileRepository.browse()` used by `/directory`. The card links to `/directory`. This represents organization/publication profiles in the directory, not registered or verified organization accounts.
- Snapshot during this change: 4,609 open opportunities; 1,128 residencies; 288 grants; 10,891 directory profiles. These are runtime values, not hardcoded claims.
- Container queries produce a two-column metric arrangement on smaller available widths, including 200% zoom. Mobile uses compact two-column cards. Loading uses corresponding skeleton geometry; errors retain retry and never become fabricated zero counts.

## Research

[Embla wheel gestures documentation](https://www.embla-carousel.com/docs/v8/plugins/wheel-gestures) documents the plugin and axis selection. Installed `node_modules/embla-carousel-wheel-gestures/src/WheelGesturesPlugin.ts` was reviewed before integration. [MDN WheelEvent](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent) distinguishes wheel gestures from actual scrolling. Repository source and user annotations govern the final behavior.

## Verification

Focused browser coverage: six cases covering category-specific destination URLs, keyboard control, mobile dragging, reduced motion, 200% zoom, unavailable counts and retry, section order, horizontal wheel input, preservation of vertical scrolling, looping from Festivals to Residencies, and four metrics with the actual directory total. Desktop reviewed at 1266 and 1920 widths; 390px mobile screenshots reviewed for metrics and the active card. Policy, scoped lint and TypeScript checks included.

Applicable states: selected and neighboring cards, hover, focus-visible, initialization-disabled arrows, loading, unavailable/retry and successful live results. Empty opportunity results are handled by the destination search; the static category navigation remains available even when counts cannot be fetched. Generated imagery and prompts remain documented in `12-category-image-direction.md`.
