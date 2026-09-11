# Journal profile consolidation

Canonical presentation: `/journal/[slug]`, using the existing InstitutionProfileView. `/journals/[id]` resolves the existing profile record and issues a permanent redirect to its semantic route, preserving query parameters. Both previously used the same profile repository; no database records are moved or deleted.

## Content mapping

| Existing content | Consolidated location |
| --- | --- |
| Name, logo, official website, schedule | Existing newer hero |
| Overall/genre standings, scores, tier | Compact hero summary and rankings disclosure |
| Editorial archetype, tags, honors, query policy | Editorial details disclosure |
| Response reporting, distributions and outcomes | Existing response-report component in disclosure |
| About, focus, genres, subgenres, editorial tips | Existing About, Editorial focus, Submitting your work sections; distinct tips retained |
| Reading window, fee, payment, response, simultaneous/unsolicited policy | Existing At a glance fields |
| Formats, circulation, contact name/address | Added to existing facts/contact area |
| Issue artwork, grouped media | Existing media gallery, merging unique legacy issue covers |
| Prize year, winner, title, judge | Prize history; official-domain work links only |
| Linked opportunities and saving | Existing Submission calls; verified Missa detail links and shared SaveToTrackerButton |
| Discovery-source URLs and social records | Unchanged in repository; journal public discovery/social links suppressed per user direction |

Existing legacy opportunity anchor is retained. Ranking list, comparison, shortlist and tracker-action links now target the canonical journal route. Unknown profiles still return 404. Non-journal legacy redirects continue to their semantic routes.

Rollback: source is uncommitted; pre-consolidation legacy implementation saved at `/private/tmp/missa-journals-before-consolidation.tsx`. No database migration was performed for this consolidation. Preserve unrelated dirty files when reverting the scoped changes.

Components: existing Input/Button unaffected; disclosure.group uses installed Accordion; ranking status uses existing RankingTierBadge. No new design-system primitive or variant. The new JournalProfileDetails is a composition of existing components.

Verification results are recorded after the local route and mobile checks. No Vercel deployment is authorized for this review.

Validation: two Playwright regression checks pass for Cincinnati Review's redirect, query preservation, ranking disclosure and source-link policy, plus A Public Space's retained prize/contact content. Typecheck, scoped ESLint, design-system validation and diff whitespace checks pass. Mobile 390px and desktop 1440px render without horizontal overflow. Cloudflare HTTP verification returns 308 then 200 on the canonical route; relative Location preserves the public preview host. Browser fragments are retained by the HTTP redirect. The preview host is explicitly enabled through MISSA_DEV_PREVIEW_HOST for local development only.
