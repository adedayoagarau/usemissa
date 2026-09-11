# Connected preview source audit

The user rejected the initial preview because it used the old root homepage and substituted account mockups. Route existence alone was insufficient evidence of current design.

| Preview destination | Source now used | Recent evidence | Boundary |
| --- | --- | --- | --- |
| Home | app/design-system/homepage-hero/page.tsx → HomepageHeroPreview | 58fdcac85, September 4: knit image, caption scale, morph menu | Existing hero design; not old app/page.tsx; later homepage sections not invented |
| Opportunities | app/opportunities/page.tsx → OpportunitiesBrowseV2Preview | September 4 discovery-design-system document; live white-index cutover | Existing implementation and filters |
| Directory | app/directory/page.tsx → DirectoryBrowseView | September 4 discovery-design-system document; 888a9a29b reading-window refinements | Existing organization browse |
| Rankings | app/rankings/magazines/page.tsx → MagazineRankingsInteractive | September 5 baseline plus this thread's design revision | Proposed design from this thread, not represented as yesterday's approval; Missa ranking authority retained |
| Comparison | app/rankings/compare/page.tsx → MagazineComparisonView | a2139ec0f September 5 plus existing shared-checkout updates | Current component, no replacement mockup |
| Ranking methodology | app/rankings/methodology/page.tsx | Existing Missa ranking methodology | Reused |
| Signup | AuthForm, initialMode signup | cff0ef795 September 5 | Removed newly invented SignupPreview markup; capture-phase submit prevents real account creation |
| Personalization | CreatorOnboarding | a2139ec0f September 5 | Removed CreatorOnboardingPreview substitution; explicit optional preview flag prevents account writes |

Linked opportunity details and organization/publication profiles use existing canonical routes (OpportunityDetailView and InstitutionProfileView), documented in September 4 design handoffs. Those links can leave the preview wrapper; no replacement detail templates were created.

Tests: source-specific homepage assertion catches regression to the old heading; desktop and phone-width hydration checks; signup/skip simulation checked for zero auth/onboarding POST requests. On current clean browser contexts the reported hydration mismatch did not reproduce. Local analytics requests return 403; this is not reported as a hydration fix or a clean production runtime.

This audit does not undo all earlier changes from the thread, certify approval of the new rankings design, or publish the beta.

## Safari LAN follow-up

Testing all eight routes with Playwright WebKit and the actual HTTP LAN address reproduced a Neon Auth module-initialization crash: `crypto.randomUUID` was unavailable. Development-only client instrumentation now provides UUID v4 using `crypto.getRandomValues` before application imports. After this fix, Directory exposed a server/client `data-slot` mismatch between Button and its rendered pagination anchor; the pagination slot now belongs to the Button props consistently.

The final WebKit pass across all eight routes reported neither JavaScript exceptions nor hydration mismatches. Analytics 403 and an external directory resource 404 remain separate. This is Safari-engine emulation, not confirmation from the user's physical iPhone. A browser regression test removes randomUUID before startup, checks UUID format/uniqueness, and visits signup and Directory while collecting runtime/hydration errors. No designs were replaced in this follow-up.
