# Missa Organization chooser and overview — Local design QA

## Scope

- Contract: `docs/missa-organization-chooser-overview-contract-2026-08-08.md`.
- Comparison route: `/design-system/organization-directions`.
- Directions: Context Rail, Operations Ledger, and Attention Desk.
- Selection remains pending; product `/workspace`, Organization APIs, authorization, and production are unchanged.

## Contract and edge-state verification

- The chooser supports no membership, one membership, several memberships, pending invitation, unavailable Organization, interrupted switch, and foreign/no-longer-authorized access.
- Owner, Reviewer, Program manager, Finance, and Viewer modes render different navigation, action, attention, and summary scopes.
- Reviewer mode retains Reviews and removes People and Settings instead of displaying disabled management controls.
- Unavailable overview omits lifecycle summaries and counts instead of substituting zeroes.
- Taxonomy conflict states keep creative-practice rules separate from eligibility and form questions.
- Triage, overdue review, mixed per-Work decisions, message preparation failure, delivery, billing/seat, large queue, long names, command no-results, and urgent-mobile states remain distinct fixtures.
- Organization switching copy states that prior tenant data is cleared before the new overview opens; the future product still needs authoritative cache invalidation and server projections.
- No rendered fixture exposed a tenant ID, `Workspace`, `Submission Path`, provider code, queue name, confidence, or freshness language.

## Interaction, semantics, and responsive verification

- All three directions render one H1 and one named Organization navigation.
- The command dialog has a visible search trigger and no-result recovery. The local fixture query now resets when the dialog opens.
- At 1280px and 390px, document scroll width equals client width in all three directions.
- The 390px chooser renders search, four membership rows, role labels, availability, and 44px enter actions.
- Direction 2 initially hid its mobile Organization switcher because a broad CSS rule hid both direct buttons. The rule now hides only the final search action; runtime inspection confirms the switcher remains visible.
- Compact tables convert to labelled rows on mobile instead of shrinking below readability.
- Browser runtime reported zero errors after the final pass.
- Targeted ESLint, TypeScript, and `git diff --check` pass.

## Remaining gates

- User selection of one direction.
- Canonical selected review route.
- 320px, tablet, 200% zoom, full keyboard, screen-reader, and reduced-motion runtime passes.
- Typed ten-role capability projection and role-policy matrix.
- Invitation, suspension/unavailable, Organization switch, and tenant-cache contracts.
- Authenticated API integration and explicit product-promotion approval.

# Missa selected Profile — Local design QA

## Selection and scope

- Selected direction: Option 2, Profile Ledger.
- Local implementation: `/design-system/profile`.
- Comparison route remains `/design-system/profile-directions` with Focused Sections and Action Index retained for reference.
- Product `/profile`, public `/profile/[userId]`, Profile APIs, integrations, and production remain unchanged.

## Contract and state verification

- The selected composition separates Overview, Identity, Preferences, Privacy, Integrations, Saved searches, Following, and Data instead of preserving the current long mixed card stack.
- Active, new, partial, multi-practice, preference-conflict, deprecated-term, private-identity, public-Work privacy-conflict, integration-attention, integration-unavailable, empty-collection, large-collection, mutation-failure, concurrent-change, and export-failure fixtures are available from the review control.
- Editing Identity and navigating away opened a focus-managed discard confirmation. `Keep editing` retained the Identity section; `Discard and continue` moved to Preferences.
- A failed Identity save kept the textarea value `Still preserved after failure` and announced that the edits remained.
- Practice conflicts and deprecated terms rendered durable explanations and explicit review actions.
- The multi-practice fixture rendered nine selections across practice, discipline, genre, form, medium, role, and language without presenting a flat taxonomy.
- Toggling Display name from Private to Public updated the local public preview and announced the draft change.
- A private Profile revealed no fallback name, bio, user ID, or previous content in the public preview.
- Gmail repair, calendar-link rotation, integration-unavailable recovery, empty searches, empty following, 24-search pagination, 40-Organization scale, concurrent change, and export failure retained distinct states.

## Semantics and layout verification

- Browser inspection found one H1 on the selected route (`Profile`), named primary and Profile-section navigation, `aria-current` section links, labelled fields and visibility groups, semantic alerts, an alert dialog for unsaved edits, collection articles, and a polite status region.
- All three directions expose one H1 and one named Profile navigation.
- At the 1440px runtime viewport, document scroll width equalled client width in all three directions and in the selected route.
- No rendered direction contained confidence, taxonomy scheme version, last-sync wording, queue names, or provider-code language.
- Targeted ESLint and TypeScript checks pass for both local Profile routes and the shared component.
- CSS defines horizontal section navigation below 800px, stacked fields and connection actions, 430px privacy/term reflow, 44px product controls, visible focus, and reduced-motion behavior.
- Runtime phone, tablet, 200% zoom, physical keyboard, screen reader, real mutation rollback, URL state, public projection, and authenticated integration remain promotion gates.

## Current assessment

- Local desktop directions, selected composition, and exercised interactions: passed.
- Product promotion: blocked pending section APIs/routes, taxonomy and privacy contracts, responsive and assistive-technology runtime QA, and explicit approval.

---

# Application Office prototype QA — 2026-08-15

## Comparison target and evidence

- Source visual truth: `/Users/adedayoagarau/.codex/generated_images/01a008c0-7b49-7ce3-bb23-0688351d5316/exec-11d95f1a-cc3b-4ba4-9460-93ba1cb499a8.png`.
- Browser-rendered implementation: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/03-workspace-desktop.png`.
- Combined full-view comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/design-qa-comparison.png`.
- Combined focused comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/design-qa-focus.png`.
- Responsive evidence: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/07-compile-mobile.png`, `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/08-graph-mobile.png`, and `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/09-workspace-mobile.png`.
- Viewport: 1440 × 1024 CSS px at device scale factor 1 for desktop; 390 × 844 CSS px at device scale factor 1 for mobile.
- Pixel dimensions: source 1487 × 1058; implementation 1440 × 1024. The full comparison uses a near-lossless aspect-ratio normalization of the source to 1440 × 1024 and compares it with the implementation at native capture size. No finding is based on the 47 × 34 px source difference.
- State: default light theme, Component Workspace, Saltwater Lessons selected, source requirement open, reviewer context populated, evidence explanation expanded, work not yet confirmed.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- The extra Application Office rail is an intentional product expansion, not an accidental clone mismatch: the supplied screen is used as the Work Sample component lens inside a broader five-state Office machine.
- The center workspace is narrower than the supplied screen because the persistent Office rail exposes the application state machine. The requirement, selected work, constraint comparison, reviewer context, readiness, and guarded handoff remain legible at 1440 px.
- Mobile uses a horizontally scrollable application-outline strip so persistent state stays available without creating page-level overflow. Document width remained 390 px in Compile Preview, Living Graph, and Component Workspace.

### Required fidelity surfaces

- Fonts and typography: Ysabeau is preserved for product copy and hierarchy; Fragment Mono handles technical labels and provenance. Headline scale, line height, and small-label tracking remain readable at both verified widths.
- Spacing and layout rhythm: true-white regions, hairline separators, compact rails, and generous task-canvas spacing preserve the source's editorial density. The Office rail is the only intentional major-region addition.
- Colors and visual tokens: Missa Aubergine anchors active, progress, and primary-action states; neutral ink, border, green ready, amber review, and red blocker roles remain restrained and semantic.
- Image quality and asset fidelity: Saltwater Lessons uses the generated 1448 × 1086 editorial ocean asset through `next/image`; the crop is sharp and subject-appropriate. The canonical Missa wordmark and the product's existing icon library are used rather than improvised marks.
- Copy and content: the source requirement, limits, selected work, reviewer context, readiness, protected submission boundary, and unknown states use realistic application language. The prototype never claims that Missa submitted an application.
- Accessibility and interaction states: semantic headings, buttons, labels, dialog semantics, visible focus styling, skip link, reduced-motion handling, pressed/expanded states, and keyboard view navigation are present.

## Full-view comparison evidence

The combined image confirms the source's recognizable three-part component pattern—outline, task canvas, readiness—inside the new persistent Office shell. The implementation retains the source's true-white canvas, Aubergine focus treatment, compact typographic rails, work-sample card, explicit readiness, and bottom action posture. The added Office rail and evidence explanation make the application machine visible without replacing the selected screen's task model.

## Focused-region comparison evidence

The focused comparison covers the requirement block, selected Saltwater Lessons asset, hard-constraint evaluation, and reviewer-context entry. It confirms that the implementation replaces the source's generic context list with a more operational constraint table while retaining the same hierarchy and editorial restraint. This was the densest fidelity region; no smaller crop was required after the text, image, dividers, and state treatments remained readable.

## Interaction and runtime verification

- Compiled the application and advanced into Living Graph.
- Opened Work Samples, confirmed Saltwater Lessons, and observed the readiness state change.
- Reviewed the v3 → v4 source change, accepted it as a new revision, and continued to Apply Bridge.
- Filled all 12 supported fields, opened the proof dialog, recorded receipt `NRR-2026-1842`, and verified the submission receipt state.
- Verified the 390 px Compile Preview, Living Graph, and Component Workspace states with no document-level horizontal overflow.
- Browser console errors and warnings checked after the primary and mobile flows: none.

## Comparison history

### Pass 1 — five-state browser render

- Evidence: desktop state captures `01` through `06` and mobile captures `07` through `09` in `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/`.
- Finding: the final graph node retained an outgoing arrow at the end of the second row (P2 visual continuity).
- Fix: changed the desktop graph-end selector from the fourth node only to every fourth node.
- Post-fix evidence: the live browser render at the same 1440 × 1024 viewport; no row-ending arrow remains.

### Pass 2 — normalized source/implementation comparison

- Evidence: `design-qa-comparison.png` and `design-qa-focus.png`.
- Result: no actionable P0/P1/P2 findings. Remaining density difference is the intentional persistent Office rail.

## Follow-up polish (P3, non-blocking)

- A later iteration could collapse the Office rail into a narrower icon-and-label mode between 1024 and 1280 px to return more width to dense component workspaces.
- The mobile outline strip could add a subtle edge fade to signal horizontal scrolling, provided it stays within Missa's no-decoration-for-decoration's-sake rule.

## Implementation checklist

- [x] Five interactive Office states on one review route.
- [x] In-memory state inspector and explicit no-persistence boundary.
- [x] End-to-end guarded handoff and receipt flow.
- [x] Desktop and 390 px browser verification.
- [x] Source/implementation full-view and focused comparisons.
- [x] Scoped lint, TypeScript, and whitespace checks.

final result: passed

---

# Tracker Calendar connection QA — 2026-08-16

## Comparison target and evidence

- Source visual truth: `/Users/adedayoagarau/.codex/generated_images/01a008c0-7b49-7ce3-bb23-0688351d5316/exec-11d95f1a-cc3b-4ba4-9460-93ba1cb499a8.png`.
- Browser-rendered implementation: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/12-calendar-sync-desktop.png`.
- Combined full-view comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/13-calendar-sync-design-qa-comparison.png`.
- Focused event-state evidence: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/12-calendar-event-dialog-desktop.png` and `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/12-calendar-deadline-desktop.png`.
- Responsive evidence: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/12-calendar-sync-mobile.png` and `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/12-calendar-sync-mobile-dialog.png`.
- Viewport: 1512 × 982 CSS px at device scale factor 1 for desktop; 390 × 844 CSS px at device scale factor 1 for mobile.
- Pixel dimensions: source 1487 × 1058; full implementation capture 1512 × 1331; mobile captures 390 × 844. The comparison board normalizes both desktop views to 720 px width and records the content-state mismatch explicitly: the source is Work Samples while the implementation is Calendar.
- State: light theme; Calendar disconnected by default; Google direct connection, one-way Missa Deadlines feed, individual `.ics` preparation, and provider-confirmed add states exercised separately.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- The Calendar screen preserves the source office's restrained navigation, three-level typographic hierarchy, hairline structure, white canvas, Aubergine actions, and evidence-first side information. The different content state prevents pixel-level component matching, so QA judges shared shell, density, hierarchy, and interaction language rather than pretending the two screens are identical.
- Direct Google and Outlook connection is clearly separated from the existing private one-way feed. Feed refresh timing, unknown deadline time, narrow permissions, update approval, and unconfirmed `.ics` import states are all visible before action.
- The 390 px layout turns the Tracker rail into a drawer, stacks the connection card and deadline action, contains the seven-day strip, and keeps the dialog scrollable without clipping its close control.

### Required fidelity surfaces

- Fonts and typography: existing Missa sans and mono variables preserve sentence case, compact technical labels, editorial headings, readable optical weights, and mobile wrapping without truncation.
- Spacing and layout rhythm: the connection card, availability lens, weekly agenda, schedule proposal, deadline evidence, and modal use the established compact grid, hairline borders, restrained radii, and calm vertical rhythm.
- Colors and visual tokens: Aubergine remains reserved for selected state and primary action; muted green identifies confirmed connection, pale blue carries uncertainty, and neutral surfaces avoid implying provider success.
- Image quality and asset fidelity: the Calendar view introduces no new raster asset. It uses the canonical Missa wordmark and the existing Lucide icon library; no improvised SVG, CSS illustration, or placeholder art was added.
- Copy and content: `Added` appears only after the simulated provider-confirmation step. A one-way feed says `Included`, individual `.ics` preparation remains unconfirmed, and a missing closing time stays explicit instead of receiving an invented hour.

## Full-view comparison evidence

The combined board confirms that the Calendar reads as another room in the same Office system: global navigation, persistent Tracker rail, compact labels, true-white task surface, Aubergine focus, and high-information cards remain consistent with the supplied source. The implementation is intentionally less form-dense because this state is planning and projection rather than application entry.

## Focused-region comparison evidence

The focused desktop capture covers the upcoming-deadline card and individual-event dialog at readable size. It verifies event name, official date, all-day uncertainty, reminders, included source links, disconnected fallback, and the boundary between `Prepare calendar file` and `Connect calendar`. The mobile dialog capture verifies provider selection, update policy, and permission copy in the constrained state.

## Interaction and runtime verification

- Opened Calendar connection settings and selected Google Calendar.
- Confirmed that deadline changes default to `Ask me before updating` and that private-calendar reading is described as a separate permission.
- Completed the simulated Google connection, reviewed the North River Review event, and reached the provider-confirmed `Added to Google Calendar` state.
- Switched to Apple and other calendars, verified the refresh limitation, and confirmed the page says `Included in Missa Deadlines feed` without offering a false direct-add action.
- Opened the disconnected event path and verified `.ics` preparation says the calendar app must confirm the event.
- Verified the 390 × 844 Calendar page and connection dialog in the in-app browser. No Next.js error overlay, visible runtime alert, or failed interaction appeared; the selected browser surface did not expose a separate console-log reader.
- Full web lint, TypeScript, production build, and `git diff --check` pass.

## Comparison history

### Pass 1 — calendar semantics and responsive render

- Finding: a connected one-way feed reused the direct-provider `Add to calendar feed` wording, which could falsely imply a verified cloud write (P1 product-trust issue).
- Fix: the feed now uses `Included in Missa Deadlines feed`, exposes provider-controlled refresh timing, and offers feed settings rather than a direct-add confirmation.
- Post-fix evidence: desktop feed interaction and mobile connection dialog; no direct `Added` claim remains in the feed path.

### Pass 2 — normalized source/implementation comparison

- Evidence: `13-calendar-sync-design-qa-comparison.png` plus the focused event-state captures.
- Result: no actionable P0/P1/P2 differences remain across the shared shell and visual language. The differing Work Samples and Calendar content states are intentional and explicitly excluded from pixel-precision claims.

## Follow-up polish (P3, non-blocking)

- When direct provider integrations are implemented, add distinct revoked, expired-credential, partial-write, duplicate-event, and provider-rate-limit fixtures before product promotion.
- Replace the prototype's simulated provider confirmation with receipt-backed provider event IDs before exposing `Added` in production.

## Implementation checklist

- [x] One-event add contract.
- [x] Direct connection versus one-way feed separation.
- [x] Unknown-time, update-policy, permission, and provider-refresh content states.
- [x] Provider-confirmed and unconfirmed outcome language.
- [x] Desktop and 390 px interaction verification.
- [x] Source/implementation full-view and focused comparisons.
- [x] Full lint, TypeScript, build, and whitespace validation.

final result: passed

---

# Application Office Review and Submit QA — 2026-08-16

## Comparison target and evidence

- Source visual truth: `/Users/adedayoagarau/.codex/generated_images/01a008c0-7b49-7ce3-bb23-0688351d5316/exec-11d95f1a-cc3b-4ba4-9460-93ba1cb499a8.png`.
- Browser-rendered implementation: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/10-review-desktop.png`.
- Combined comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/application-office-prototype/11-review-design-qa-comparison.png`.
- Viewport: 1440 × 1024 CSS px at device scale factor 1 for desktop; 390 × 844 CSS px at device scale factor 1 for mobile.
- Pixel dimensions: source 1487 × 1058, normalized to 1440 × 1024; implementation 1440 × 1024. The comparison canvas places both normalized views side by side without density scaling.
- State: light theme, Review and submit ready state, four application sections complete, creator and organization confirmations initially unchecked.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- The new screen preserves the source's application outline, central task canvas, readiness rail, restrained editorial density, and explicit submission boundary inside the broader Tracker Office shell.
- Review content is intentionally longer than the source Work Samples state. The declaration and final action follow the reviewed sections in document order, and the page retains bottom padding so the prototype navigator does not prevent access.
- The only issue found during the interaction pass was primary-button text inheriting the shell foreground inside the mobile confirmation dialog (P2 contrast). The selector now gives primary and disabled actions explicit scoped foreground colors.

### Required fidelity surfaces

- Fonts and typography: existing Missa display and mono variables preserve the source hierarchy, sentence case, tracked labels, and readable mobile wrapping.
- Spacing and layout rhythm: the three-column application frame, hairline dividers, compact review rows, restrained radii, and generous confirmation spacing match the established application language.
- Colors and visual tokens: Aubergine remains reserved for focus and final action; confirmed receipt uses muted green; unconfirmed handoff uses amber without implying failure or success.
- Image quality and asset fidelity: this state introduces no new raster imagery. The canonical wordmark and existing Lucide icon set remain intact; no placeholder or improvised asset was added.
- Copy and content: the creator declaration, organization terms, Missa promise, confirmed success copy, receipt facts, and external unconfirmed language preserve the supplied wording. `Submitted` appears only with a receipt value.

## Full-view comparison evidence

The combined comparison confirms that the Review screen reads as the next state of the supplied application workspace rather than a separate product. Global navigation, opportunity header, checklist, task canvas, progress rail, and boundary card retain the same hierarchy. The additional Tracker rail is the previously approved Office expansion.

## Focused-region comparison evidence

A separate crop was not required because the new surfaces contain text, native checkboxes, buttons, and bordered panels rather than dense imagery or custom assets. The full-size combined comparison keeps those controls legible, while the browser pass separately inspected the mobile confirmation dialog and receipt state.

## Interaction and runtime verification

- Accepted the creator declaration and North River Review terms separately; the final action changed from disabled to enabled only after both were checked.
- Opened the final confirmation dialog and verified its evidence-qualified provider language.
- Simulated provider confirmation and verified receipt `NRR-2026-1842`, submitted timestamp, submitter, no-response-date state, and `Submitted · Awaiting response`.
- Opened the external handoff and verified that it contained no Submitted language before proof.
- Added external receipt `SUB-44820` and verified that only then did the state resolve to Submitted.
- Verified 1280 px and 390 px document widths with no horizontal overflow.
- Browser console errors and warnings: none.

## Comparison history

### Pass 1 — Review composition and evidence states

- Evidence: `10-review-desktop.png`, the live 390 × 844 browser view, and the confirmed/unconfirmed interaction states.
- Finding: mobile confirmation-dialog primary action had Aubergine background with inherited dark text (P2 contrast).
- Fix: scoped primary and disabled button colors beneath the Office shell selector.
- Post-fix evidence: computed button foreground `rgb(255, 255, 255)` on background `rgb(90, 63, 104)`; dialog remained enabled and document width remained 390 px.

### Pass 2 — normalized source comparison

- Evidence: `11-review-design-qa-comparison.png`.
- Result: no actionable P0/P1/P2 findings. The longer review sequence and persistent Tracker rail are intentional product differences.

## Follow-up polish (P3, non-blocking)

- Remove the prototype state controls and bottom navigator when the reviewed workflow is promoted into production UI.
- Replace the simulated provider response with the real hosted-submission receipt contract before promotion.

## Implementation checklist

- [x] Separate creator declaration and organization-specific terms.
- [x] Evidence-qualified Missa promise.
- [x] Direct provider-confirmed success state.
- [x] External unconfirmed state with proof gate.
- [x] Desktop and mobile interaction verification.

final result: passed

# Profile portfolio — design QA — 2026-08-14

## Comparison target

- Source visual truth: the user-supplied “MISSA · BUILD REFERENCE · PROFILE PORTFOLIO · 14 AUG 2026” composition and `missa-profile-portfolio-contract-2026-08-14.md`.
- Rendered implementation: `/design-system/profile-portfolio` on the branch preview alias.
- The supplied source is a written composition reference, not a capturable image. No local Figma frame, mockup, or source screenshot was available; pixel-level source comparison is therefore blocked.

## Evidence

- Mobile implementation: `qa-evidence/profile-portfolio/mobile-390.png` — 390×844 pixels, 390×844 CSS viewport, density 1.
- Desktop implementation: `qa-evidence/profile-portfolio/desktop-1131.png` — 1131×994 pixels, 1131px CSS viewport, density 1.
- Sample grid focus: `qa-evidence/profile-portfolio/sample-grid-1131.png`.
- Owner mode focus: `qa-evidence/profile-portfolio/owner-mode-1131.png`.
- Full-view and focused regions were captured from the browser-rendered implementation after the repair pass.

## Findings and repair history

### Earlier pass — actionable findings

- [P1] Identity header used a bespoke two-column layout. Public and owner content detached from the main reading column; the photo appeared visually attached to the wrong owner field.
- [P1] Owner save bar was fixed against the entire review page and appeared below the signed-out public fixture.
- [P1] Three sample cards stretched to equal height; audio content sat low and video content could escape its card.
- [P2] Hidden owner credit was appended after the 2023 row instead of retaining its 2024 position.
- [P2] Video evidence inherited the audio provider label; portrait was circular; image fixture exposed `ROOM / GENERATOR / OFF`; Contact used an envelope icon.

### Fixes applied

- Rebuilt the identity region with `Item`, `ItemMedia`, and `ItemContent`; owner photo and `Change photo` now stay together.
- Changed the portrait to a rectangular 70×88 treatment.
- Changed the save bar to sticky within the owner composition rather than fixed across the review page.
- Added `align-items: start`, `min-width: 0`, and `overflow: hidden` to the sample grid/card/media chain.
- Added explicit sample-to-provider data: audio → Spotify, video → YouTube. Platform evidence now requires a provider.
- Inserted the hidden 2024 row between 2025 and 2023 while preserving the real row and `Show` action.
- Removed the artwork debug text and envelope icon.

### Post-fix evidence

- 390px runtime: `body.scrollWidth === body.clientWidth === 390`; no horizontal overflow.
- Public identity uses the shared `Item` anatomy and the photo is rectangular.
- Sample grid has three contained cards with top-aligned content; video caption and frame remain inside the card.
- Audio and video no longer render provider or verification labels.
- Owner sequence reads 2026, 2025, hidden 2024, 2023.
- The public fixture does not show the owner save bar.

## Required fidelity surfaces

- Fonts and typography: Ysabeau is used for sentences, headings, labels, and actions; Fragment Mono remains for handles, years, evidence labels, and section eyebrows. The hierarchy is legible in the captured desktop and mobile states.
- Spacing and layout: the repaired identity and sample grid are stable at 390px and 1131px. The review route intentionally contains multiple fixture sections; it is not itself the customer-facing public Profile.
- Colors and tokens: the implementation uses Missa semantic tokens for borders, ink, primary, surfaces, and evidence treatment. No evidence tier is represented as a success badge.
- Image quality and asset fidelity: the profile photo uses the existing `/media/home/artist-at-work.webp` asset with a rectangular crop. The artwork and video fixtures remain review placeholders, as the source contract does not provide final media assets.
- Copy and content: provider labels, hidden-credit language, owner actions, and media captions match the current contract direction. The remaining review-only fixture copy should not ship to customer-facing routes.

## Open questions

- A source screenshot or Figma frame is still required for a true visual-fidelity pass. The current report compares the browser render against the written composition contract and user-supplied review notes, not pixel-equivalent source imagery.
- The identity’s exact desktop axis should be confirmed against that source frame; the repaired `Item` now shares the page column and no longer creates the previous detached gutter.

## Implementation checklist

- [x] Rebuild identity on Missa `Item` primitives.
- [x] Contain and top-align sample cards.
- [x] Add provider assertion/data mapping.
- [x] Preserve hidden credit order and real row content.
- [x] Scope owner save bar.
- [x] Rectangular portrait and remove debug/icon artifacts.
- [x] Capture desktop, mobile, sample-grid, and owner-mode evidence.
- [ ] Repeat against a capturable source visual target.

## Follow-up polish

- Confirm the final profile portrait asset and crop with the real public-profile visual target.
- Exercise keyboard focus, 200% zoom, reduced motion, and all 16 fixtures in the browser after the source frame is available.

final result: blocked — source visual target is only available as written contract/reference text; no capturable source image or Figma frame was available for the required combined comparison.

# Missa selected Tracker Calendar — Local design QA

## Selection and scope

- Selected direction: Option 2, Month + Agenda, with Agenda Ledger as its narrow-screen fallback and explicit alternate mode.
- Local implementation: `/design-system/calendar`.
- Comparison route remains `/design-system/calendar-directions`.
- Product `/tracker` and compatibility route `/calendar` remain unchanged; no deployment or promotion is authorized.

## State and interaction verification

- Selecting an empty date moved the selected-day heading to that date and showed a truthful empty-day state instead of retaining unrelated event detail.
- Month and Agenda are functional modes; Agenda exposes filters for deadlines, estimated responses, and submission events.
- Conflicting official dates rendered a durable alert and stayed in the undated conflict group instead of being silently placed on the grid.
- The moved-deadline fixture showed the new 28 August date and preserved the previous value in the change explanation.
- The dense fixture represented seven events on 14 August with a visible `+4` aggregate after the first three markers.
- Timezone, first-use empty, all-undated, active-feed, and disconnected-feed fixtures rendered their distinct explanations and actions.
- Calendar subscription explained bearer-link privacy and exercised copy, create, rotate, and disconnect intent without exposing Work files or submission text.

## Semantics and layout verification

- Browser inspection found one H1, named primary and Tracker-view navigation, a labelled month region, date buttons with event counts, semantic event articles, complementary event detail, labelled feed scope controls, and polite status feedback.
- At the 1440px runtime viewport, document scroll width equalled client width (1440px); no horizontal overflow was present.
- CSS and viewport-state logic open the selected composition in Agenda mode at 760px and below while retaining the explicit Month switch.
- Unsupported `Object.groupBy` usage, inert view controls, and stale detail on empty dates were corrected during review.
- Targeted ESLint and TypeScript checks pass for both local Calendar routes and the shared component.
- Runtime phone, tablet, 200% zoom, full calendar-grid keyboard behavior, screen-reader, real feed rotation/revocation, URL state, API failure/rollback, and authenticated integration remain promotion gates.

## Current assessment

- Local desktop composition and exercised interactions: passed.
- Product promotion: blocked pending typed Calendar/Tracker data work, responsive and assistive-technology runtime QA, and explicit approval.

---

# Missa selected creator Inbox — Local design QA

## Selection and scope

- Selected synthesis: Attention Queue default plus Review Desk as the Email Review view.
- Local implementation: `/design-system/inbox`.
- Comparison route remains `/design-system/inbox-directions`.
- Product `/inbox` and `/messages` remain unchanged; no deployment or promotion is authorized.

## State and interaction verification

- Search in All reduced six items to the After the Harmattan receipt and updated the detail to that same item rather than leaving an unrelated selection.
- Email Review switched from the general queue into the focused confirmation desk.
- Ambiguous email required a related Tracker record and customer status; Confirm produced a polite Tracker update acknowledgement.
- Conflicting official deadline information rendered a durable alert and preserved both values.
- Caught-up and repository-failure fixtures retained meaningful recovery; the large fixture rendered 24 items in All.
- Archive removed the selected decision, moved selection to the remaining attention item, and announced completion.
- Mark all read removed every visible Unread marker and announced completion.

## Semantics and layout verification

- Browser inspection found one H1, named primary and Inbox navigation, semantic articles and time values, complementary event detail, labelled selects, named icon controls, and a polite status region.
- At the 1440px runtime viewport, document scroll width equalled client width (1440px); no horizontal overflow was present.
- Search/detail synchronization and conflict fixture priority defects found during review were corrected.
- CSS provides a real Back to Inbox action when master-detail collapses below 980px, touch-safe controls, stacked review decisions, and 320/390px reflow.
- Targeted ESLint, TypeScript, and diff checks pass for the selected route and shared component.
- Runtime phone, tablet, 200% zoom, physical-keyboard, screen-reader, real API failure/rollback, URL state, and authenticated integration remain promotion gates.

## Current assessment

- Local desktop synthesis and exercised interactions: passed.
- Product promotion: blocked pending durable Inbox data/API work, responsive and assistive-technology runtime QA, and explicit approval.

---

# Missa creator Inbox directions — Local design QA

## Scope

- Local comparison route: `/design-system/inbox-directions`.
- Directions: Attention Queue, Daily Briefing, and Review Desk.
- Product `/inbox` and `/messages` remain unchanged; no deployment or promotion is authorized.
- Creator Inbox is notifications and email-review decisions, not chat. Organization Messages remains separate.

## State and interaction verification

- Fixtures implemented: active, caught up, one urgent decision, email needs correction, conflicting opportunity change, load failure, and 24-item history.
- Search reduced the All view to one matching Harmattan record.
- Mark all read produced polite confirmation.
- Daily Briefing rendered its grouped editorial hierarchy.
- Review Desk rendered a focused confirm/correct/ignore/delete-saved-excerpt flow without raw confidence or classification labels.
- Ambiguous email rendered opportunity choice; conflict rendered durable official-information warning; empty and failure states retained recovery.
- The large fixture rendered all 24 items after selecting All.

## Semantics and layout verification

- Browser inspection found one H1, named primary, Inbox, and review navigation; semantic articles, time values, complementary detail, labelled selects, named icon controls, and a polite status region.
- At the 1440px runtime viewport, all exercised directions kept document scroll width equal to client width (1440px).
- Targeted ESLint and TypeScript checks pass for the new route and component.
- CSS defines master-detail collapse below 980px, mobile queue/detail separation, touch-safe controls, stacked decisions, and 320/390px reflow.
- Runtime phone, tablet, 200% zoom, physical-keyboard, screen-reader, real read/archive mutations, URL state, and authenticated integration remain promotion gates.

## Current assessment

- Local desktop direction comparison and exercised fixtures: passed.
- Direction selection: resolved into the selected local synthesis.
- Product promotion: blocked.

---

# Missa selected Library and Work — Local design QA

## Selection and scope

- Selected direction: Option 2, Working Archive.
- Local implementation: `/design-system/library-work`.
- Product `/library` and future `/library/works/[workId]` routes remain unchanged; no deployment or production promotion is authorized.
- Composition: compact searchable archive, contextual Work dossier, Files, Saved Answers, versions, taxonomy by facet, Tracker/submission context, and archive-first removal.

## State and interaction verification

- Edge fixtures implemented: active, first-use empty, multi-medium Work, deprecated taxonomy, current-versus-submitted version, missing file, private/public conflict, and 24-record Library.
- Search reduced four Works to the matching Harmattan record and rendered a useful zero-result recovery state.
- Files rendered four resource rows; Saved Answers rendered three rows and Copy produced polite status feedback.
- Work detail navigation rendered Overview, Files, Taxonomy, and History; the exercised views contained three versions/four files, 12-facet framing, and three historical events.
- Version difference renders one durable explanation; first-use empty explains Work before offering Work or file creation.
- Large fixture rendered 24 Work rows with explicit pagination framing.

## Semantics and layout verification

- Browser inspection found one H1, named primary and Library navigation, semantic articles, headings, description lists, a complementary Work detail region, named icon controls, and a polite status region.
- At the 1440px runtime viewport, document scroll width equalled client width (1440px); no horizontal page overflow was present.
- Targeted ESLint, TypeScript, and diff checks pass for the selected route and composition.
- CSS defines focused master-detail behavior below 900px, touch-safe controls, stacked resource rows, mobile Work detail, and 320/390px-specific reflow.
- Runtime phone, tablet, 200% zoom, physical-keyboard, screen-reader, upload state, URL state, authenticated mutation rollback, and large-Library performance checks remain promotion gates.

## Current assessment

- Local desktop composition and exercised fixture/view interactions: passed.
- Product promotion: blocked pending data-model changes, authenticated integration, responsive and assistive-technology runtime QA, and explicit approval.

---

# Missa selected Opportunity Detail — Local design QA

## Selection and scope

- Selected synthesis: Decision Brief identity and hero, Evidence Ledger fact anatomy, and Guided Pursuit narrow-screen reading order.
- Local implementation: `/design-system/opportunity-detail`.
- Product route `/opportunities/[slug]` remains unchanged; no deployment or production promotion is authorized.
- Source image is rendered directly without a visible “Opportunity photo” label. No-image and broken-image fixtures use a quiet fallback.

## State and interaction verification

- Record fixtures implemented: complete, partial, conflicting, closed, no image, broken image, source unavailable, merged duplicate, and long content.
- Person states implemented: signed out, signed in, In Tracker, preparing, and submitted.
- Save interaction changed `Save to Tracker` to `In Tracker` and announced `Saved to Tracker.` through a polite status region.
- Conflicting-deadline state rendered a durable alert and labelled Deadline/Status values without a confidence or freshness score.
- Unavailable-source state replaced every external link with explanatory status rather than a dead control.
- Official-source actions render as semantic external links, not buttons.
- Issue reporting opened a focus-managed dialog with labelled category and details fields; a completed report produced a confirmation state and retained a close action.
- One initial Save/In Tracker control appears in the hero. The sticky fact rail does not duplicate it.

## Semantics and layout verification

- Browser DOM inspection found one H1, labelled navigation, semantic article/sections, `dl` fact and requirement rows, a list for eligibility, an accessible dialog name, and named icon controls.
- At the 1440 px runtime viewport, `document.documentElement.scrollWidth` equalled `clientWidth` (1440 px); no horizontal overflow was present.
- Targeted ESLint and TypeScript checks pass for the new route and selected composition.
- CSS defines narrow-screen reflow at 900 px and 620 px, 44 px actions, stacked action groups, single-column fact/requirement reading, and a two-column review toolbar that does not cover product content.
- Runtime phone, tablet, 200% zoom, physical-keyboard, screen-reader, and reduced-motion checks remain promotion gates because the current in-app browser viewport cannot be resized in this session.

## Current assessment

- Local desktop composition and exercised interactions: passed.
- Product promotion: blocked pending responsive runtime and assistive-technology QA plus explicit approval.

---

# Missa selected Tracker — Local design QA

## Selection and scope

- Selected synthesis: Next Actions default, optional Stage Board, Work Map as Works, plus distinct Submissions and Calendar views.
- Local implementation: `/design-system/tracker`.
- Product routes remain unchanged. `/tracker`, `/my-submissions`, and submission detail have not been promoted or deployed.

## State and interaction verification

- Edge fixtures implemented: active, imported unmatched, status conflict, mixed per-Work decision, first-use empty, and 18-record history.
- Active search reduced four Tracker rows to the PEN America record without losing the labelled search field.
- Row action announced `Review opportunity opened for PEN America Open Call — Writing for Change.` through a polite status region.
- Active layout changed between Next Actions and Stage Board; the board rendered Saved, Preparing, Submitted, In progress, and Outcome as customer stages.
- Submissions rendered hosted/creator-recorded context and two relevant records.
- Calendar rendered Upcoming dates plus a separate Undated and response items region.
- Works rendered Saltwater Lessons, Unassigned, After the Harmattan, and Borrowed Ground as distinct groups.
- Conflict fixture rendered a durable alert instead of silently choosing between Submitted and Withdrawn.
- Empty fixture rendered private first-use guidance; the large fixture rendered 18 records.

## Semantics and layout verification

- Browser DOM inspection found one H1, H2 section headings in the selected views, labelled Tracker navigation, named icon buttons, semantic `dl` metadata, and a live status region.
- At the 1440 px runtime viewport, the Works view and 18-record fixture both kept document scroll width equal to client width (1440 px).
- Targeted ESLint and TypeScript checks pass for the selected route and shared Tracker composition.
- CSS converts Stage Board to stage-labelled lists below 800 px and stacks Tracker rows, search, actions, Calendar, and Work navigation without drag dependence.
- Runtime phone, tablet, 200% zoom, physical-keyboard, screen-reader, URL-state, status-mutation failure/rollback, and large-history performance checks remain promotion gates.

## Current assessment

- Local desktop composition and exercised view/state interactions: passed.
- Product promotion: blocked pending canonical status reconciliation, responsive and assistive-technology runtime QA, submission-detail composition, and explicit approval.

---

# Missa Opportunities overhaul — Design QA

## Comparison target

- Desktop source visual truth: `outputs/missa-visual-directions-2026-08-08/web-option-2.png`, selected Option 2, “Curated Catalogue.”
- Mobile source visual truth: `outputs/missa-visual-directions-2026-08-08/option-1.png`, selected Option 1, “Editorial Index.”
- Local implementation: `/design-system/opportunities-overhaul`; product routes remain unchanged.
- Desktop implementation evidence: `outputs/missa-opportunities-overhaul-2026-08-08/desktop-option-2-final.png` at 1440 × 1024 CSS px.
- Mobile implementation evidence: `outputs/missa-opportunities-overhaul-2026-08-08/mobile-option-1-final.png` at 390 × 844 CSS px.
- The final desktop reference/implementation and mobile reference/implementation were inspected together in one four-image comparison input.

## Required contract

- Customer language is limited to Opportunities, Tracker, Library, Profile, and Organization. No customer-facing Passport, Workspace, Radar, Trust Layer, freshness, source-confidence, or update language appears.
- Opportunity imagery is shown without an “Opportunity photo” label; missing media uses a quiet organization/title-initial fallback.
- The only initial record action is Save / In Tracker.
- Taxonomy remains progressively disclosed through separate opportunity-type, practice, reach, deadline, and fee controls.
- This is a local design-system preview. It does not import premium variants into a product route and does not promote any component to production.

## Interaction and state verification

- Search: mobile tap search displayed the loading skeleton and reduced the result set to one matching record.
- Filters: the bottom filter sheet, practice search, Photography selection, clear, and apply path produced one correct result.
- Sort and pagination: Title A-Z reordered the first result to Compass Literary Awards; Next moved from page one to page two after clearing filters.
- Save: Save to Tracker changed to In Tracker inside the opportunity detail sheet.
- Details: summary, observable match reasons, eligibility, preparation, organization link availability, report action, and return-to-results surfaces rendered.
- Navigation: the mobile menu exposed Opportunities, Tracker, Library, Guides, and Organization.
- Loading, empty, error, retry, missing organization, missing image, rolling deadline, unknown deadline, long title, and fee-unknown states were exercised or visibly represented.
- Browser console: zero errors after the final render.

## Responsive and accessibility verification

- Tested widths: 320, 390, 768, 1024, and 1440 px. At every width, document scroll width equalled viewport width and no horizontal page overflow occurred.
- Each tested width rendered one H1, no unnamed buttons, and no images missing an `alt` attribute.
- Mobile uses a bottom filter sheet, dense editorial rows, touch-sized controls, non-overlapping save actions, and a full-width detail sheet.
- Desktop uses the selected catalogue structure: persistent progressive filters, search and active filters, two-column media records, and calm Aubergine interaction cues.
- Focus-visible styles are defined for interactive primitives. The in-app browser's synthetic Tab command did not advance focus beyond the document body, so a physical-keyboard traversal remains a promotion-gate check rather than a local visual blocker.

## Comparison findings and fixes

- [P1 resolved] The first desktop render placed search and records too low. The intro and workspace rhythm were tightened to match the reference's header-to-search and search-to-catalogue positions.
- [P1 resolved] The first mobile render stacked opportunity facts and showed too few records. The fact grid and row padding were compacted to restore the selected editorial-index density.
- [P2 resolved] Mobile filters and active chips initially occupied separate rows. They now share one horizontally resilient row, including Clear all at 390 px.
- [P2 resolved] Practice search, sorting, and pagination were initially visual-only. All three now update the rendered records.
- [P2 resolved] A development review toolbar originally obscured the viewport. It now sits after page content and does not cover the user interface.
- [P3] The Next.js development badge appears in local screenshots. Re-capture from a production-mode preview before promotion.
- [P3] Run a physical-keyboard and screen-reader pass before promoting selected components into a product route.

## Final assessment

- No actionable P0, P1, or P2 visual or interaction findings remain in the local responsive prototype.
- Differences from generated references are intentional Style Guide 2.0 decisions: uppercase Missa wordmark, current semantic tokens, functional search action, realistic local assets, and truthful four-record fixture count.

final result: passed

---

# Missa waitlist — Design audit and QA

## Comparison target

- Source visual truth: `/tmp/codex-remote-attachments/019fde48-5227-7ad2-9943-2556835d9744/0B1CF0ED-2973-423F-98CD-BA847F49AE50/1-Photo-1.jpg` (771 × 1280 px).
- Rendered implementation: `http://localhost:3107/waitlist` in the Codex in-app browser.
- Initial implementation evidence: `/Users/adedayoagarau/.codex/visualizations/2026/08/07/019fde48-5227-7ad2-9943-2556835d9744/waitlist-audit/01-current-desktop.png` and `02-current-mobile.png`.
- Revised implementation evidence: `/Users/adedayoagarau/.codex/visualizations/2026/08/07/019fde48-5227-7ad2-9943-2556835d9744/waitlist-audit/03-revised-mobile.png` and `05-revised-desktop.png`.
- Combined full-view comparison: `/Users/adedayoagarau/.codex/visualizations/2026/08/07/019fde48-5227-7ad2-9943-2556835d9744/waitlist-audit/04-source-vs-revised-mobile.png`.
- Focused comparison: `/Users/adedayoagarau/.codex/visualizations/2026/08/07/019fde48-5227-7ad2-9943-2556835d9744/waitlist-audit/07-focused-copy-form.png`.

## Capture normalization

- Source dimensions: 771 × 1280 px.
- Mobile implementation: 390 × 844 CSS px and 390 × 844 image px, device scale factor 1.
- Desktop implementation: 1440 × 900 CSS px and 1440 × 900 image px, device scale factor 1.
- The full-view comparison scales the source to 844 px high and places it beside the 390 × 844 implementation without stretching either image.
- The focused comparison crops the headline, support copy, label, and form from both screens, then normalizes the regions to 450 px high.

## State and interactions

- Light-on-image waitlist state, unauthenticated creator, empty email field.
- Invalid-email submission was tested in the browser and produced the inline `Enter a valid email address.` alert without console errors; evidence: `06-validation-error-desktop.png`.
- The success state was not submitted because that would create a durable waitlist record. Its implementation remains covered by the existing client state and API path.
- Browser console check: no warnings or errors on the revised default and invalid-email states.

## Audit findings and fixes

- [P1] The original composition duplicated the same painting as a pale page background and a rounded image card. This split attention between decorative regions and made the form feel secondary. Fix: use the real Pexels painting once as a full-bleed background with a single contrast layer.
- [P1] `Browse opportunities` and `Log in` competed with the waitlist conversion task. Fix: remove both links and retain only the Missa wordmark.
- [P2] The mobile layout pushed a repeated image panel below the form, creating an unnecessary second section and a 1168 px page. Fix: keep the full experience within the 844 px mobile viewport.
- [P2] The first version introduced unapproved positioning and decorative copy. Fix: use the approved headline, audience-specific description, waitlist label, and invitation reassurance; remove the decorative eyebrow, image caption, and footer slogan.
- [P2] Separate input and button boxes felt like generic SaaS controls and drifted from the reference. Fix: combine them into one high-contrast form surface with the Aubergine action contained inside it.

## Required fidelity surfaces

- Fonts and typography: Instrument Sans now follows the reference's direct sans-serif display treatment while retaining Missa's installed family. The headline uses a controlled two-line wrap, 0.94–0.97 line height, and a clear body/form hierarchy at both viewports.
- Spacing and layout rhythm: the page is one viewport at desktop and mobile, with a single left-aligned content column, a restrained header divider, and form spacing aligned to the reference. No horizontal or vertical overflow remains in the tested states.
- Colors and visual tokens: the real painting provides the palette; a dark ink overlay creates white-text legibility, while Aubergine remains the only action color. The form uses one white surface rather than layered cards.
- Image quality and asset fidelity: the supplied Steve A Johnson Pexels painting is used directly at responsive source widths. No CSS illustration, fake SVG, or placeholder replaces it.
- Copy and content: the page now says `Find your next opportunity.` and names grants, residencies, fellowships, commissions, and open calls. Secondary navigation and unapproved campaign language are removed.
- Accessibility: heading and region semantics, an explicit email label, live error/success messaging, a 56 px control height, visible focus treatment, and reduced-motion handling remain present. Screenshot review cannot establish full WCAG compliance.

## Full-view and focused comparison evidence

- Full view: the revised mobile page preserves the source's logo → promise → explanation → waitlist form sequence and full-image atmosphere while using Missa's approved copy and Aubergine action.
- Focused region: headline scale, sentence length, label-to-form spacing, unified field geometry, and arrow action were compared together. The implementation intentionally keeps a stronger CTA color than the reference because Aubergine is Missa's action token.

## Comparison history

### Pass 1 — current implementation

- Findings: duplicated painting, competing navigation, split mobile composition, unapproved decorative language, and disconnected form controls.
- Result: blocked by actionable P1/P2 design issues.

### Pass 2 — simplified reference-led composition

- Fixes: removed navigation and extra copy, converted the painting to one full-bleed asset, tightened the approved message hierarchy, unified the email action, and kept desktop/mobile within one viewport.
- Post-fix evidence: `03-revised-mobile.png`, `05-revised-desktop.png`, `04-source-vs-revised-mobile.png`, and `07-focused-copy-form.png`.
- Result: no actionable P0, P1, or P2 visual findings remain.

## Follow-up polish

- [P3] Re-capture from a production server before release so the development-only Next.js badge is absent from final evidence.
- [P3] Exercise the success state after migration `0020_waitlist_signups.sql` is applied to a disposable or approved database.

final result: passed

---

# Missa admin dashboard — Design QA gate

## Comparison target

- Source visual truth: selected Image Gen direction 3, “Operations queue,” at `/Users/adedayoagarau/.codex/generated_images/019fce4a-e0c7-79a3-aec9-4b42b4ca0832/exec-6b82e56d-6c14-4ed8-a0dd-c353d74a0f13.png` (1440 × 1024 px).
- Rendered implementation URL: `http://localhost:3002/admin` (local production render; intended production route is `https://www.usemissa.com/admin`).
- Implementation screenshot path: not captured. This session has no user-selected browser available, and the Product Design browser override does not permit an unrequested Playwright capture.
- Combined comparison input: not available.

## Capture normalization

- Intended comparison viewport: 1440 × 1024 CSS px, device scale factor 1.
- Source dimensions: 1440 × 1024 px. Implementation dimensions: unavailable because no screenshot was captured.
- Density normalization: not performed.

## State

- Intended state: authenticated platform administrator on the Operations queue route, populated backend read model, light theme.
- The implementation source was inspected in `apps/web/app/(admin)/admin/page.tsx`, `apps/web/app/(admin)/admin/operations/page.tsx`, `apps/web/components/platform-admin.tsx`, and `apps/web/lib/platformAdmin.ts`.

## Full-view and focused comparison evidence

- Full-view comparison: blocked because the browser-rendered implementation screenshot is missing; the selected source visual is available.
- Focused-region comparison: not performed; there is no normalized visual pair to inspect.

## Findings

- [P1] Visual fidelity comparison cannot be completed.
  Location: Missa platform admin Control Room and Operations routes.
  Evidence: the selected Image Gen direction is available, but there is no browser capture of the authenticated implementation in this session.
  Impact: approving a redesign would make the visual target implicit and could reproduce the current dashboard's density problems under a new skin.
  Fix: capture the implementation at the same viewport and authenticated state, then compare it with the selected direction.

### Required fidelity surfaces

- Fonts and typography: intended families and hierarchy are defined in `DESIGN.md`; visual fidelity is unverified.
- Spacing and layout rhythm: intended Workspace density is defined in `DESIGN.md`; visual fidelity is unverified.
- Colors and visual tokens: true white, semantic neutrals, Aubergine action, and restrained state colors are defined in `DESIGN.md`; visual fidelity is unverified.
- Image quality and asset fidelity: no source visual assets are part of this admin target; visual fidelity is unverified.
- Copy and content: current admin vocabulary is visible in the route source; target hierarchy and task language remain unapproved.

## Comparison history

- Pass 0 — gate check: blocked after implementation. The source direction is selected, but no browser-rendered implementation screenshot was available for comparison.

## Implementation checklist

- [x] Generate and select an admin visual direction.
- [x] Implement the selected data-first operations-queue direction against the backend read model.
- [ ] Capture the selected source visual and authenticated implementation at 1440 × 1024, plus responsive states.
- [ ] Compare full view and focused regions together.
- [ ] Fix P0/P1/P2 findings and repeat the comparison.

final result: blocked

---

# Historical QA — Organization marketing page

## Comparison target

- Primary source visual: `/Users/adedayoagarau/.codex/generated_images/019fba3b-6c0b-7220-b862-b4c8d2b4ce28/exec-16b83cc8-b128-4d13-9ff6-687405382950.png` (selected Editorial Institution direction, 861 × 1827 px).
- Secondary reference: `/tmp/codex-remote-attachments/019fba3b-6c0b-7220-b862-b4c8d2b4ce28/95FEDFA1-B191-486F-8AC9-E041E2CC55D8/1-Pasted-Image-1.jpg` (CRM inspiration, 278 × 1280 px).
- Implementation: `/for-organizations`, rendered from the production server at `http://localhost:3002/for-organizations`.
- Combined comparison input: `/tmp/missa-org-design-qa/source-implementation-comparison.png`.
- Focused comparison input: `/tmp/missa-org-design-qa/focused-comparison.png`.

## Capture normalization

- Desktop viewport: 1440 × 1000 CSS px, device scale factor 1.
- Desktop implementation capture: `/tmp/missa-org-design-qa/org-desktop-prod.png`, 1440 × 5735 px, full page.
- Latest desktop implementation capture after the atmospheric gradient pass: `/tmp/missa-org-design-qa/org-desktop-gradient.png`.
- Mobile viewport: 390 × 844 CSS px, device scale factor 1.
- Mobile implementation capture: `/tmp/missa-org-design-qa/org-mobile-prod.png`, 390 × 7892 px, full page.
- Interaction captures: `/tmp/missa-org-design-qa/org-review-prod.png`, `/tmp/missa-org-design-qa/org-decisions-prod.png`, and `/tmp/missa-org-design-qa/org-faq-open-prod.png`.
- The source and implementation were resized only for the composite comparison; no density-based findings were filed. The source layout is a long marketing-page reference, not a pixel-identical viewport target.

## State and interactions

- Default light theme, unauthenticated organization visitor, desktop and mobile.
- Product showcase tabs switch between Public portal, Review workspace, and Decisions.
- FAQ rows use native expandable `details` states.
- Header and CTA links point to the existing login/signup, opportunities, and workspace routes.
- Desktop interaction smoke checks passed: Review workspace tab, Decisions tab, and first FAQ expansion.

## Full-view comparison evidence

The implementation preserves the selected direction's core composition: a strong Fraunces-led hero, real institutional photography, a submission preview layered over the image, a proof rail, product UI as the main evidence, workflow sections, a pricing/value explanation, FAQ, and a closing CTA. It also carries the CRM reference's progressive product-story rhythm (hero proof → product views → workflow → value → FAQ → CTA) without copying its CRM language, customer metrics, or purple/pink visual system.

The page remains true white with near-black type and restrained Aubergine action color, matching `DESIGN.md`. The CRM reference's tinted atmosphere is used only as a restrained wash around product surfaces; it does not replace the white canvas.

## Focused-region comparison evidence

- Hero: headline scale, photo crop, overlay call card, CTA hierarchy, and Aubergine halo were compared against the selected direction. The implementation uses a new generated gallery photograph with the same institutional/editorial intent and negative-space requirement.
- Product proof: the Public portal and Review workspace states were compared at the same section position. Both use readable product UI, not a screenshot pasted as a decorative image; the implementation has live tab state and realistic sample records.
- Responsive: the mobile capture confirms the hero, product preview, proof rail, three-step workflow, value cards, FAQ, CTA, and footer stack without horizontal overflow or clipped controls.

## Findings

No actionable P0, P1, or P2 mismatches remain.

### Required fidelity surfaces

- Fonts and typography: Fraunces is reserved for display statements and Instrument Sans/Fragment Mono handle UI, body, labels, and dates. Mobile headings wrap intentionally without clipping.
- Spacing and layout rhythm: 8px-derived spacing, hairline separators, restrained 6–14px radii, and generous section intervals hold at desktop and mobile widths.
- Colors and tokens: true white canvas, near-black ink, neutral borders, Aubergine CTA/focus, green completion states, and amber review state match Missa semantic roles.
- Image quality and asset fidelity: the gallery image is a real generated asset at `/apps/web/public/media/missa-org-gallery.png`, rendered with `next/image`; no CSS or inline-SVG replacement is used for the hero image. Icons use the existing Lucide library.
- Copy and content: organization-specific copy is coherent and avoids unsupported customer logos, testimonials, savings percentages, or claims. Sample workflow data is clearly product UI content.
- Accessibility and states: semantic links, buttons, tab roles, native details disclosure, visible focus rings, descriptive image alt text, and reduced-motion handling are implemented.

## Comparison history

### Pass 1 — production render

- Evidence: `/tmp/missa-org-design-qa/org-desktop-prod.png` and `/tmp/missa-org-design-qa/org-mobile-prod.png` compared with the combined source input.
- Result: no P0/P1/P2 findings. The dev overlay seen during the first local preview was removed by validating the production render before comparison.
- Fixes: none required after the production capture.

### Pass 2 — atmospheric gradient refinement

- Earlier request: the hero felt too plain relative to the CRM inspiration's soft atmospheric field.
- Fix: added a localized peach/Aubergine radial gradient behind the hero visual in `apps/web/app/for-organizations/org.module.css`. The gradient is clipped to the hero, uses Missa's restrained palette, and leaves the page canvas true white.
- Post-fix evidence: `/tmp/missa-org-design-qa/org-desktop-gradient.png` at the same 1440 × 1000 viewport. The gradient supports the hero/product relationship without reducing text contrast or changing section hierarchy.
- Result: no P0/P1/P2 findings introduced; the page remains passed.

## Follow-up polish (P3, non-blocking)

- The CRM reference includes testimonial and customer-proof sections. Missa intentionally leaves those out until real organization evidence is available; add them only with verified source material.
- The selected concept has a darker workflow band; the implementation keeps that sequence on white to stay aligned with Missa's true-white canvas rule.
- The new atmospheric gradient is intentionally softer and more localized than the reference's pink field so it does not turn the Missa canvas into paper or a tinted SaaS background.

## Implementation checklist

- [x] Dedicated `/for-organizations` page with separate organization register.
- [x] Homepage organization links route to the dedicated page.
- [x] Interactive product showcase tabs.
- [x] Native FAQ disclosure states.
- [x] Responsive desktop/mobile layout.
- [x] Production build, typecheck, and lint pass.
- [x] Full-view and focused source/implementation comparisons captured.

historical final result: passed
# Tracker directions QA — 2026-08-08

Status: local visual directions complete; selection and product promotion pending.

- Review route: `/design-system/tracker-directions`
- Directions: Next actions, Stage board, Work map.
- Edge fixtures: active, imported unmatched, status conflict, mixed Work decision, first-use empty, large history.
- Desktop render checked at 1440×1024 with no page-level horizontal overflow.
- Direction switching and all six fixture states checked.
- Lint, TypeScript, and whitespace validation pass.
- Customer-facing fit/trust/freshness/internal processing UI is absent.
- Stage board explicitly supplies a list fallback; runtime phone-width verification remains a promotion gate.
- Current `/tracker` and `/my-submissions` product routes remain untouched.

---

# Opportunity detail directions QA — 2026-08-08

Status: local visual directions complete; selection and product promotion pending.

- Review route: `/design-system/opportunity-detail-directions`
- Directions: Decision brief, Evidence ledger, Guided pursuit.
- Edge-state control: complete, partial, conflicting facts, closed.
- Desktop render checked at 1440×1024 with no horizontal overflow.
- Direction switching, edge-state switching, and Save/In Tracker state checked.
- Lint, TypeScript, and whitespace validation pass.
- Customer-facing freshness, source-confidence, internal-review, and numeric-fit UI are absent.
- Runtime mobile viewport capture remains a promotion gate; responsive CSS is present but is not claimed as a completed mobile verification here.
- Product routes remain untouched.

---

# Tracker workbench prototype QA — 2026-08-16

## Comparison target and evidence

- Source visual truth: `/Users/adedayoagarau/.codex/generated_images/01a008c0-7b49-7ce3-bb23-0688351d5316/exec-11d95f1a-cc3b-4ba4-9460-93ba1cb499a8.png`.
- Browser-rendered implementation: `/Volumes/Crucial X10/usemissa/apps/web/outputs/tracker-workbench-prototype/12-workspace-desktop.png`.
- Combined full-view comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/tracker-workbench-prototype/design-qa-comparison.png`.
- Combined focused comparison: `/Volumes/Crucial X10/usemissa/apps/web/outputs/tracker-workbench-prototype/design-qa-focus.png`.
- Additional desktop evidence: `01-overview-desktop.png`, `02-overview-collapsed-desktop.png`, `03-for-you-desktop.png`, `04-calendar-desktop.png`, `05-messages-desktop.png`, and `06-map-desktop.png` in `/Volumes/Crucial X10/usemissa/apps/web/outputs/tracker-workbench-prototype/`.
- Mobile evidence: `07-overview-mobile.png`, `08-drawer-mobile.png`, `09-for-you-mobile.png`, `10-calendar-mobile.png`, and `11-application-mobile.png` in the same output directory.
- Viewport: 1440 × 1024 CSS px at device scale factor 1 for desktop; 390 × 844 CSS px at device scale factor 1 for mobile.
- Pixel dimensions: source 1487 × 1058; implementation 1440 × 1024; mobile implementation 390 × 844. The source was aspect-ratio normalized to 1440 × 1024 for the combined comparison.
- State: light theme; Tracker selected in the global shell; Work Sample component open inside the North River Review application; Saltwater Lessons selected; requirement, readiness, and evidence visible.

## Findings

No actionable P0, P1, or P2 mismatch remains.

- The application lens retains the supplied screen's outline, task canvas, readiness rail, Work selection, reviewer context, and guarded handoff inside the broader Tracker workbench.
- The additional left rail is intentional: the user clarified that Tracker is the entire private office. It is collapsible on desktop and becomes an off-canvas drawer on mobile.
- The broader Tracker overview, personalized opportunities, notifications, pipeline, calendar, Work connections, messages, submissions, archive, and Tracker map are product extensions rather than clone surfaces; they use the same Missa tokens, typography, density, and interaction grammar.

### Required fidelity surfaces

- Fonts and typography: the implementation uses the existing Missa font variables, sentence case, compact technical labels, and editorial heading hierarchy. Desktop and 390 px headings wrap without clipping.
- Spacing and layout rhythm: true-white regions, hairline separators, restrained radii, compact navigation groups, and Comfortable-density task surfaces preserve the source's calm administrative rhythm.
- Colors and tokens: Aubergine is reserved for selection, primary action, and focused state; green, amber, red, blue, and neutral surfaces retain semantic roles without decorative gradients.
- Image quality and asset fidelity: Saltwater Lessons uses the generated 1448 × 1086 ocean asset through `next/image`. The canonical Missa wordmark and the existing icon library are used.
- Copy and content: unknown, missing, protected, proposed, submitted, and receipt states are explicit. Personalized recommendations name their input factors and do not predict acceptance.
- Accessibility and states: semantic labels, drawer backdrop/close, pressed and current states, skip link, focus treatment, reduced-motion handling, native fields, and dialog semantics are present.

## Full-view comparison evidence

The combined image confirms that Tracker keeps the source screen's recognizable three-part application structure while adding a persistent workbench rail. Top-level global navigation now selects Tracker; Office is not a destination. The application remains a room within Tracker, with the same source-aware Work Sample hierarchy and readiness posture.

## Focused-region comparison evidence

The focused comparison covers the requirement, selected Work, hard constraints, and reviewer context. Text, image crop, borders, status treatment, and operational hierarchy remain legible despite the additional Tracker context. No smaller crop was needed.

## Interaction and runtime verification

- Collapsed and expanded the desktop Tracker rail.
- Opened the mobile drawer and navigated to personalized opportunities, calendar, and applications.
- Added and removed opportunity recommendations in local prototype state.
- Marked notification state locally and navigated consequence-linked items.
- Sent a prototype-only contextual DM reply and verified the local message state.
- Opened the twelve-contract Tracker map.
- Ran the application workflow from Compile Preview through graph, Work matching, source-change revision, Apply Bridge, and receipt `NRR-2026-2714`.
- Verified desktop and mobile document widths; browser console errors and warnings were empty after the final pass.

## Comparison history

### Pass 1 — expanded Tracker shell

- Evidence: desktop captures `01` through `06` and the first mobile captures.
- Finding: the 390 px personalized calendar caused 478 px document width because the seven-day strip contributed its fixed grid width to the page (P2).
- Fix: constrained the calendar section to `min-width: 0`, contained overflow, and kept the week strip's horizontal scrolling inside its card.
- Post-fix evidence: `10-calendar-mobile.png`; document `scrollWidth` and `clientWidth` both measured 390 px.

### Pass 2 — normalized application-lens comparison

- Evidence: `design-qa-comparison.png` and `design-qa-focus.png`.
- Result: no actionable P0/P1/P2 findings. The persistent Tracker rail is the approved structural expansion.

### Pass 3 — canonical application language

- Replaced the application workspace with the user-supplied canonical navigation, header, checklist, status, Work Sample, progress, next-action, and application-detail language.
- Kept the character count computed from the current field value; the supplied 97-character sentence therefore renders as `97 of 400 characters`.
- Verified `Messages` in global navigation, the local `Add Saltwater Lessons` interaction, the context-resolved `Submit to North River Review` action, receipt state, and 390 px document width with no horizontal overflow.
- Browser console: no errors. The LCP warning found during the pass was resolved by eagerly loading the above-the-fold Work image.

### Pass 4 — canonical Budget contract

- Added the complete user-supplied Budget screen after Work Samples, including the exact checklist, status, guideline, funding, cost, note, validation, progress, next-action, and application-detail language.
- Added URL-addressable previews for empty, save-error, complete, changed-guidance, and expired states.
- Verified that entering `$1,500` for Installation materials changes total costs from `$6,700` to `$8,200`, clears the balance, enables `Continue to Review`, and opens the complete state.
- Verified `Add funding source` and `Add cost`, required-field validation, a 120-character computed Budget note count, 390 px document width with no overflow, and a clean final browser console.

## Follow-up polish (P3, non-blocking)

- The mobile drawer can later add an internal “jump to room” search if the final information architecture grows beyond the current twelve contracts.
- The prototype navigator intentionally overlaps lower content; it is review-only chrome and will be removed when a direction is promoted.

## Implementation checklist

- [x] Tracker replaces Office in global navigation and language.
- [x] Collapsible desktop rail and mobile drawer.
- [x] Original Tracker pipeline, calendar, Work, submissions, and archive surfaces.
- [x] Personalized opportunities, notifications, contextual messages, and planning lens.
- [x] Five-state application preparation and guarded handoff.
- [x] Twelve explicit room contracts in UI and prototype notes.
- [x] Desktop/mobile interaction and visual QA.

final result: passed
