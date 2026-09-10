# Homepage copy and card consistency

Date: 7 September 2026 (local)

This refinement supersedes the custom walkthrough and promotional copy in `14-homepage-continuation.md`. The approved green hero, category carousel, photography and section order remain.

## Review findings

1. **The copy repeated vague promises.** “Spend your time on the work,” “A few possibilities” and “Your work belongs out in the world” offered little information. The surrounding sentences repeated the same ideas.
2. **The homepage invented another opportunity card.** Its type, metadata, styling and actions differed from `/opportunities`. Visitors should recognize the same object on both pages.
3. **Several labels hid their destination.** “Learn more” and “Meet Missa” were less useful than naming the actual destination or action.
4. **The walkthrough required extra interaction to reveal ordinary information.** A direct set of catalogue cards is easier to scan and already provides the relevant actions.

## Changes

- Replaced the custom discovery tabs and card markup with the exact `OpportunityBrowseProjectCard` used by `/opportunities`, registered as `data.display.opportunity-card` in the component policy.
- Reused the component without homepage-specific card styles. The same badges, image/identity fallback, deadline, fee, save, calendar and detail links now appear on both pages.
- Narrowed the shared card's TypeScript input to fields it actually renders. Public API records need no fabricated internal source-verification timestamp or confirmation flag to satisfy the card.
- Passed the actual server session to the homepage cards, preserving signed-in saving and anonymous sign-in behavior.
- Removed obsolete tab, preview and nested card styling. Kept the card grid responsive at desktop, tablet and phone widths.
- Named the shared media link for assistive technology. This accessibility fix applies to catalogue and homepage alike.
- Allowed 20 seconds for live metric requests before showing the existing retry state; the local verification encountered one slow response with the earlier 12-second limit.
- Updated component policy and catalogue to describe the reused component and its real actions.

## Copy examples

| Before | After |
| --- | --- |
| Spend your time on the work. | Open opportunities |
| A residency for your next chapter. A grant for the idea that won’t let go… | Search residencies, grants, publications and prizes without checking each website separately. |
| A different place. Time to make something only you can. | Find time and space to work on a project. |
| Give your words, images and ideas a life beyond the studio. | Find magazines and editors accepting submissions. |
| Learn more | Browse publications (or the selected category) |
| A world of places worth knowing. | Explore organizations |
| For the work. And the person behind it. | Find calls for your work. |
| Your work belongs out in the world. | Find your next opportunity. |
| The catalogue is taking a moment. | We couldn’t load the opportunities. |
| Can I explore without an account? | Do I need an account? |

The FAQ now gives short answers about accounts, multiple disciplines, application fees, applying and eligibility. The footer's decorative closing line and the photo section's eyebrow were removed. Existing database titles and organization names were not rewritten.

## Data

The opportunity cards use validated records from `/api/opportunities?openNow=true&limit=12`. Three examples are selected across available types. No seeded opportunities, substituted images or invented fields are added to these cards. Image and organization fallbacks are those of the existing shared card.

Live homepage metrics and exact matched directory profiles continue using their existing backend endpoints. The generated campaign photo and category illustrations remain visual assets; they are not represented as photos of specific backend opportunities or participating organizations.

## Method and sources

Applied Impeccable's clarify workflow and craft floor to the user-authorized copy and component refinement. Reviewed the live homepage against the live Opportunities page before editing. This is an implementation review, not a scored dual-agent critique report.

Repository authority:

- `PRODUCT.md`, `DESIGN.md`, `docs/missa-content-quick-reference.md`
- `apps/web/component-policy.json`, `apps/web/component-catalogue.json`
- `apps/web/app/opportunities/page.tsx`
- `apps/web/components/design-system/opportunities-browse-v2-preview.tsx`
- `apps/web/components/design-system/opportunity-browse-project-card.tsx`
- `apps/web/components/save-to-tracker-button.tsx`
- The public opportunity response contract and API handler

Primary external references:

- [Writing for user interfaces — GOV.UK](https://www.gov.uk/service-manual/design/writing-for-user-interfaces)
- [Button — GOV.UK Design System](https://design-system.service.gov.uk/components/button/)
- [Card — shadcn](https://ui.shadcn.com/docs/components/aria/card)

Impeccable's scoped source detector returned no findings. Its saved build-phase state refers to an earlier Opportunities front-page mockup, not this homepage refinement. That unrelated state was inspected and left unchanged.

## Validation

- Batched desktop and 390px mobile review, followed by one confirmation pass.
- Live API titles and IDs checked against rendered cards; shared card class compared with `/opportunities`.
- Loading, empty, error and retry paths, long titles, keyboard FAQ, 200% zoom, reduced motion and scoped Axe scan.
- Anonymous save tested with a mocked intent endpoint: the same opportunity ID reaches the existing sign-in flow. No real opportunity was saved or application submitted during QA.
- Existing carousel category destinations, horizontal gestures and four live metrics covered by regression tests.
- TypeScript, scoped ESLint and the repository design-system check.

Local changes only. No deployment or database content edits.
