# Interactive homepage feature explorer

This replaces the static feature sections from document 16 after the user requested a dynamic design and added the creator portfolio. It is a local extension of the approved green-and-white homepage, not a new site identity.

## Applicable design workflow

Impeccable's `reference/new-work.md`, sections 1 and 3, explicitly routes this work as an extension of an existing surface: “A section, component, feature, or state inside an established surface inherits that surface. Never turn a local addition into a new identity exercise.” Its local-extension rule says: “No concept tournament, and no DESIGN.md change unless the user approves a durable system change.”

The user approved the green portrait hero and existing homepage direction, then requested a dynamic feature section and added the creator portfolio. That establishes the boundary: inherit Missa's white/Forest surfaces, typography, tokens and installed components; resolve this section's content, hierarchy and interactions. A new-world FORM seed, concept tournament and quality-bar card do not apply. None was generated or retrospectively invented. The direction and acceptance criteria below are the contract for this local extension.

## Direction and acceptance criteria

Mode: Persuade. Show visitors what they can do after finding a call. One generous feature stage connects Portfolio, Applications, Notifications and Goals. The selected feature reveals a distinct, usable product view rather than repeating a stack of marketing cards.

The signature interaction is user-controlled feature selection followed by a short entrance transition. No autoplay or scroll capture. The real preview controls must respond, and reduced motion must keep all content and functionality.

- Portfolio: reuse CreatorPortfolioStudio; try the four existing portfolio themes, switch work formats, open the image or read the sample work. A persistent label identifies the existing fictional creator and artwork. The authenticated editor remains `/profile/portfolio`.
- Applications: show exact current catalogue titles, IDs and deadline dates. Do not pretend public opportunities are saved to an account. `/tracker` is the authenticated tool.
- Notifications: switches change the preview, including its off state. A reminder preview can reference a real catalogue title and deadline; it never claims that a notification was delivered. The label says these choices are previews; preferences are saved in `/inbox`.
- Goals: select a target of 6, 12 or 24 and see the actual GoalSubmissionProgress component respond. The count starts at zero; no submissions are invented. The label explains that recorded submissions fill the circles in an account. `/goals` handles persisted targets, dates and check-ins.

## Implementation and source boundaries

`HomepageWorkspace` is the semantic composition at `apps/web/components/missa/homepage-workspace.tsx`. It uses installed Tabs (Studio tabs-09 inspected), Table/table-01, Switch/switch-01, Button and Skeleton. `CreatorPortfolioStudio` gained an optional embedded variant with an appropriate section/heading hierarchy and no account controls. The standalone account editor and public portfolio keep their normal behavior.

Component intent is composition (`composition.homepage-workspace`), feature selection (Tabs), preference selection (Switch), data display (Table and GoalSubmissionProgress), navigation (Button with Link), and loading status (Skeleton). Portfolio composition follows `composition.creator-portfolio` and its `embedded-marketing-sample` variant. Both compositions and the embedded boundary are already recorded in `apps/web/component-policy.json` and `apps/web/component-catalogue.json`; this documentation pass adds no component or variant.

The corresponding CSS modules are `apps/web/components/missa/homepage-workspace.module.css` and `apps/web/components/creator-portfolio-studio.module.css`. They retain the existing typography and use the homepage continuation tokens for Forest selection, soft surfaces, corners and depth. The desktop stage pairs explanatory copy with a product preview; below the 760px container breakpoint it stacks, with a two-by-two feature selector. The embedded portfolio keeps its real writing/image filters and disclosures while reducing its scale and omitting contact and credit modules.

Backend contracts for goals, Tracker and notifications are recorded in document 16. Portfolio draft, media, revision and published snapshot contracts were verified against `docs/directory-portfolio-integration-handoff.md`, `creator-portfolio-studio.tsx`, the portfolio schema and creatorProfileRepository. Published snapshots and private drafts are separate; this homepage does not load either private drafts or account alerts.

Catalogue cards remain the exact OpportunityBrowseProjectCard used on `/opportunities`. No new opportunity card variant was introduced. Preview state is memory-only and causes no account writes or publication.

The hero sentence, account FAQ and footer now include portfolio alongside the other creator tools. The repeated static goals/photo block was removed so the interactive section carries this story once.

## Built interaction states

- Portfolio opens by default in Sage. Sage, Paper, Mineral and Night buttons expose their selection with `aria-pressed`; changing theme remounts the sample. The fictional creator label remains visible.
- Applications sorts valid exact deadlines and shows up to three current catalogue records with their original opportunity links, organization names when supplied, and UTC calendar dates. Loading uses a labelled busy skeleton; failure exposes “Try again”; an empty selection exposes “Browse opportunities”; successful loading restores the table.
- All three notification switches start on. The live preview prioritizes deadline reminders, then opportunity updates, then goal check-ins, and shows an explicit off state when none is selected. A real deadline is used when available; otherwise the reminder stays generic.
- Goals starts at zero of twelve. Targets of 6, 12 and 24 update the reused progress component without recording a submission. Feature entrances and notification changes become immediate with reduced motion. Installed controls supply hover, focus-visible and keyboard states; this preview has no account-save or submit control requiring disabled, saving or saved states.

## Review evidence

Screenshots: `apps/web/.impeccable/review/features-{portfolio,applications,notifications,goals}-{1440,390}.png`, plus `features-portfolio-1266.png` for the supplied user viewport.

All five tests in `apps/web/e2e/homepage-continuation.spec.ts` passed: the first four ran together and the dynamic explorer test passed separately. Completed checks cover real catalogue identity and deadline values, API failure/empty/retry, shared card consistency, anonymous Save navigation, mobile long titles, 200% zoom, reduced motion, keyboard navigation, all four feature views, portfolio themes and formats, notification on/off states, target changes, Axe accessibility and zero account writes. Captured widths are 1440px, 1266px and 390px. TypeScript, scoped ESLint, `npm run check:design-system` and `git diff --check` also passed in the implementation run; this documentation-only pass did not rerun them.

The initial Impeccable finish review found no material visual defects in the nine captures. Its sole finding concerned documenting the applicable workflow exception. The final review at `/tmp/missa-feature-finish-review.md` marks that finding resolved, with no remaining item and `disposition: ship`. That final verdict scores the documentation fix; it is not a new audit or a whole-surface release certification.

The Impeccable detector returned no code findings. Its saved comp gate refers to an unrelated Opportunities mockup from earlier work; that stale global build state was not rewritten. This section follows the established homepage directly, with no approved image comp.

No deployment, profile publication or notification delivery was performed by this work.
