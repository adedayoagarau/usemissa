# Browse prototype refinement — 2026-09-04

Scope: `/design-system/opportunities-browse-v2`; no live route cutover.

Intent: opportunity data display with a quiet Save action and supporting deadline export. Policy: `data.display.opportunity-card`, `action.quiet`, `overlay.mobile-filter`.

Source: existing `@uitripled/project-card-shadcnui` adaptation in `apps/web/components/design-system/opportunity-browse-project-card.tsx`; existing `SaveOpportunityButton` uses the installed UI Button and Tracker API. Calendar export remains `AddOpportunityToCalendarButton`, with an optional labelled variant. No registry installation.

Adaptation: three-column desktop, two-column tablet, one-column mobile; compact introduction; horizontally scrollable mobile collections; 16:9 card images; deduplicated practice labels; quieter proportional metadata; 44px bookmark overlay and labelled calendar footer. Existing Missa color/radius tokens retained. Component policy and catalogue updated.

States: Save disables during requests, indicates successful saving and catches failures; unauthorized responses navigate to login. Calendar action is absent without a fixed deadline. Search retains server results until submission completes, announces updating and reports displayed/total counts. Empty results expose reset and collection links. Mobile filters apply immediately and finish with Show results; selection has aria-pressed. Focus outlines and reduced-motion CSS are present.

Validation: design-system validator, scoped ESLint and full web TypeScript check passed. Browser checked desktop and 390px populated layouts, long card titles, footer fit, zero-result search/reset, mobile filter selection and Escape dismissal. Calendar href contains an all-day ICS event. Current working preview uses port 3000; port 3001 was unavailable and a second server correctly refused to share the existing dev output.

Not certified: authenticated Save persistence, calendar-app import, 200% browser zoom, complete keyboard focus traversal, reduced-motion emulation and failure injection. The prototype still limits each response to 48 records; no pagination or live cutover was added. Source taxonomy and organization anomalies need separate data review.


## Follow-up: browse behavior and reusable refinements

The prototype now passes repository cursors through and offers First, Previous and Next via the installed Pagination primitive. Cursor history travels in the URL along with query, filters and sort; changing a filter or sort starts a new page sequence. A separate first-page count keeps the total independent of the cursor. The visible range reports 1–48, 49–96, etc. Query failures have a distinct retry state.

`OpportunityCollectionsStrip` is a reusable navigation/disclosure composition: six initial links, See more/See less, horizontal scroll reveal, aria-expanded/aria-controls, and reduced-motion-aware scrolling. The redundant Collections heading and duplicate opportunity total are removed. Search uses one labelled icon button. `OpportunitySort` is reused on desktop and mobile. Card image badges have opaque canvas or Ochre backgrounds, legible over bright and dark photography; card body padding and title weights are consistent.

Observed browser checks: alphabetical sorting changes results; Next displays a new set beginning with 1922 Review: Poetry-Fall 2026; page 2 persists after reload; Previous restores the first set. Mobile filtering preserves sort. Dark-photo Fellowship and No fee badges remain legible at 390px. Escape restores filter-trigger focus. Full 200% zoom, authentication mutations and calendar-app import are still not certified. Repeated fallback photos and source taxonomy anomalies remain separate content-quality issues. No live route cutover.

Additional validation: traversed all five fellowship pages; the last page contains one record (193 of 193) with no Next control. Clearing filters resets pagination. Reduced-motion emulation yielded a 0s card transition and the collection reveal remained functional.

Sorting dropdown alignment: Select retains keyboard/typeahead selection but uses the same shared list/option stylesheet as Location and other filters. The menu is 208px wide with 4px outer and inner padding, 34px minimum rows, 2px gaps, and shared selected/hover/focus colors. It opens below the trigger rather than aligning the selected item over it.

## Promotion to /opportunities

User approved the route cutover. `/opportunities` now reuses the white-index presentation in embedded mode, without the prototype banner/header. `OpportunityShell` retains public navigation and signed-in CreatorShell. Existing metadata, CollectionPage JSON-LD, discovery-view telemetry, representative-preview disclosure, canonical taxonomy filters/facet counts, saved-search controls and account-aware data reads are retained. Canonical filter controls use a quiet index appearance. Search and collection destinations use the current route; cursor history resets with canonical filters. The page size is 48 and facet totals remain independent of pagination. Production cards use SaveToTrackerButton and repository personal.tracked state, retaining first-save authentication behavior. The editorial archive is unchanged.

This is a local repository promotion, not a deployment.

Promotion verification: `/opportunities` renders the white index at desktop and 390px with the real site navigation. Search for poetry stays on the live route; changing to Recently added and advancing to page 2 preserves query and sort. Signed-out Save opened the existing signup flow with the selected opportunity and return URL; the check exited through Return without saving. Full web TypeScript, scoped ESLint and design-system validation passed. Authenticated account testing and external deployment were not performed.
