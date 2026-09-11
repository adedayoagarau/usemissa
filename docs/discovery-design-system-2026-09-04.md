# Missa discovery design system

Current integration reference: [Directory and creator portfolio handoff](directory-portfolio-integration-handoff.md). Use its source-verified endpoints and persistence boundaries when continuing implementation; older historical status below may be superseded.

This document records the implemented September 4 design direction. DESIGN.md remains the visual authority and component-policy.json governs component selection. This is a local implementation record, not a deployment or research certification.

## Three page patterns

| Pattern | Routes | Shared implementation |
| --- | --- | --- |
| Opportunity browse | /opportunities and its design-system preview | OpportunitiesBrowseV2Preview, OpportunityCatalogueFilters, OpportunityBrowseProjectCard |
| Organization browse | /directory, /residencies, /journals, /presses, /grants, /organizations | DirectoryBrowseView; DirectoryCategoryPage supplies category loading and route identity |
| Opportunity detail | /opportunities/[id] | OpportunityDetailView, OpportunityDetailStickyActions |
| Editorial collection | /discover/[slug] | Shared collection route, collectionArtDirection.ts and collection-palette.css |

Directory category pages describe organizations and programs; similarly named /discover collections describe opportunity records. Do not combine their counts or datasets.

## Typography and space

- Instrument Sans: navigation, controls, cards, detail titles, reading text and section headings.
- Newsreader: selected expressive collection headlines. Keep the literal collection name visible as orientation.
- Fragment Mono: narrowly scoped data where already used; never an automatic treatment for all metadata.
- Browse introductions: 24px interface title, 14px helper text, restrained caption label.
- Detail titles: responsive 28–44px interface type; 16px reading text with 1.8 line-height; 22px section headings.
- Back navigation and detail identity belong together: 20px padding between the back-link box and summary content, without the former extra top margin.
- Main layouts use 24px desktop gutters and 16px mobile gutters. Card gaps are 16px; reading columns use larger spacing to separate tasks.

## Organization and opportunity cards

Opportunity cards retain Save on the image/identity plate, readable category and deadline badges, facts and a labelled calendar action. Use an available identity image. Missing or failed images use a compact organization-name plate, never a generic stock-photo substitution. Avoid repeating that same name in the card body.

Organization cards retain available images through Avatar, with category-icon loading/error/missing fallbacks. Contain images rather than crop logos. Show actual summaries; do not fill missing summaries with generic instructions. Titles remain real profile links. Do not invent organization authority from a discovery-source URL.

Use the same grid progression: three columns on wide desktop, two on tablet and one below 768px. All card actions must have keyboard focus and accessible names.

## Browse controls and state

Search is a labelled input with an icon submit button. Filters and sorting use the approved shared dropdown treatment. Collection links on opportunity browse use progressive horizontal disclosure. Organization categories use quiet navigation with an explicit active state.

Opportunity pagination uses cursor history in the URL. Organization pagination uses page numbers, preserves query/category and resets on category or search changes. Fixed-category directory routes keep search and pagination on their own route; cross-category navigation carries the query to the chosen category. Counts must come from the repository, without hardcoded marketing totals. Repository failures have retry states distinct from zero results.

## Opportunity detail information order

Overview → Who can apply → What you’ll need → How to apply → Tags.

Use unboxed reading sections with fine separators. Eligibility markers must not imply the visitor qualifies; preparation progress belongs in the actual interactive checklist. Preserve additional rule values when they carry information rather than deleting qualifiers indiscriminately.

At a glance precedes organization context in the rail. Use readable dates, precise fee labels and explicit unknown states where needed. Organization-wide windows must be labelled as such. Do not expose internal reputation tiers or filler turnaround claims.

Save, official destination and calendar appear near the summary. A desktop action bar appears once summary actions pass above the header. Mobile retains its existing dock. Existing authentication and tracked-state flows are authoritative. Saving is not applying. The final content area has application/source access and a quiet reporting link, not a second large sales-style CTA.

## Collection art direction

Distinct palettes live in the design-system palette file and map primitives to cover surface/text/graphic roles. Feature styles consume those roles. Status and application actions retain their normal meaning. Results use light canvas tints and white cards.

Typography and imagery should express the subject. Women & Non-Binary uses a typography-led “Take up space” cover without the former orbit. Remaining motifs are still reviewable editorial choices, not mandatory ornaments. Mobile hides decorative motifs and reduces cover spacing. Original image development is appropriate only when an image contributes meaning; never generate a fictional organization logo or imply a photograph depicts an actual program.

Collection cross-links live in the shared footer through the optional collectionLinks slot.

## Extending the system

1. Choose the page intent: browse opportunities, browse organizations, read an opportunity, or explore a collection.
2. Reuse the matching component and pass route-specific identity and data.
3. Keep business queries and provenance attached to the route's actual content type.
4. Add a documented semantic variant only when an existing pattern cannot serve the interaction.
5. Update the catalogue/policy when adding a variant; run check:design-system, scoped lint and type checks.
6. Review desktop, 390px, keyboard, long content, loading, empty and error behavior as applicable; record untested cases honestly.

## Scope and remaining work

This rollout covers discovery indexes, collection pages and opportunity details. Organization/publication profiles now use the shared template documented in organization-profile-design-2026-09-04.md. Account settings, Tracker and other application workspaces are outside this rollout.

The Exclamation Mark Lit duplicate identity audit is recorded in design-uplift-refinements-2026-09-04.md. This rollout does not merge database records. Existing data anomalies remain separate from layout and visual design.
