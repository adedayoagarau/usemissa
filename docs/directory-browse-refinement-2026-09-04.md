# Directory browse refinement

The /directory route now uses the established Opportunities white-index treatment. Category links filter within Directory and preserve the search; search and category changes reset pagination. Totals come from the repository, with no hardcoded category counts or blanket verification claims. Existing specialized directory routes retain their current presentation.

## Component contract

Intent: search (Input and Button), navigation (Link and Pagination), data display (Card), recovery (Empty and Button). Installed sources are apps/web/components/ui; the semantic composition is apps/web/components/directory-browse-view.tsx. No vendor installation or new theme. Policy and catalogue record the white-index Directory variant. Available organization images are displayed with contain sizing, with category icons as loading, missing-image and failed-image fallbacks through the installed Avatar component. Taxonomy text is humanized, and long summaries are clamped while profile links retain the full title.

Default, hover and focus use Missa surface, border and Forest tokens. Pagination has disabled boundaries. Empty results offer a reset; repository failures offer retry. Navigation remains server-rendered GET URLs; no mutation success state or new animation applies. Out-of-range pages are clamped to the final page.

## Validation

- Desktop and 390px browser review passed.
- Search via keyboard Enter, category filtering, next-page state preservation and empty-state recovery passed.
- Scoped ESLint, TypeScript no-emit and design-system checks passed.
- No new motion; native horizontal category scrolling on mobile.
- 200% browser zoom and a deliberately induced database outage were not exercised.

Underlying duplicate, incomplete and misclassified profiles remain a separate data-quality issue. This is a local route change, not a deployment.
