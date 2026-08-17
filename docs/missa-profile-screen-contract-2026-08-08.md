---
title: Missa Profile screen contract
version: "1.1"
status: approved-and-implemented-locally
date: "2026-08-08"
superseded_by: ./missa-profile-product-contract-2026-08-16.md
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
current_routes:
  - /profile
  - /profile/[userId]
target_routes:
  - /profile
  - /profile/identity
  - /profile/preferences
  - /profile/privacy
  - /profile/integrations
  - /profile/saved-searches
  - /profile/following
  - /profile/data
  - /profile/[userId]
component_selection_status: selected-option-2-profile-ledger
selected_review_route: /design-system/profile
product_promotion_status: implemented-local-not-deployed
runtime_visual_audit_status: focused-desktop-mobile-accessibility-passed
---

# Missa Profile screen contract

> Superseded by the [current Profile product contract](./missa-profile-product-contract-2026-08-16.md). This file remains as the design record for the earlier combined Profile and Settings direction.

Profile is the creator's control surface for identity, private opportunity preferences, privacy, integrations, saved searches, following, and data. It is not a public portfolio by default and it is not a score of how serious or complete a creator is.

Option 2, Profile Ledger, is now promoted locally to `/profile`. Each job has a URL-backed focused section inside one coherent Profile shell. `/profile/[userId]` remains a separate, intentionally small public projection. Nothing in this tranche is deployed.

## Local implementation outcome

- `/profile` now has Overview, Identity, Preferences, Privacy, Integrations, Saved searches, Following, and Data sections with stable `section` URLs and exact authentication return paths.
- Identity, private preferences, and privacy have separate save, failure, restore, and unsaved-navigation boundaries even though identity and preferences currently share the owner Profile API.
- Practice preferences begin with the guided broad path and can be progressively refined across all 12 canonical facets by searching within one named facet. The product does not expose scheme versions, term IDs, weights, or a flat 1,084-term selector.
- Preference labels now say `Show me opportunities like this`, `Especially interested`, and `Do not show this practice`; exclusion consequences require confirmation and parent/descendant conflicts block saving.
- Opportunity type, geography, career stage, fee, deadline window, and simultaneous-submission choices remain independent. No-fee and maximum-fee controls cannot silently contradict each other.
- Profile completeness is no longer rendered as a score or gate. New and incomplete creators can continue using the product.
- Legacy tracked-Opportunity visibility may remain in stored compatibility data, but public Profile projection and UI never expose Tracker activity.
- Saved-search and following empty states now explain purpose and recovery. Following remains reversible and does not imply endorsement.
- Integrations no longer expose sync timestamps, scan windows, raw codes, or confidence thresholds in the customer-facing Profile section.
- Focused owner mutation, privacy, export, public projection, desktop, 390px, serious/critical Axe, no-overflow, URL, and authentication tests pass locally. Product screenshots are retained in `apps/web/outputs/profile-product-desktop.png` and `apps/web/outputs/profile-product-mobile.png`.
- Profile image, public links, selected public Works, eligibility self-description, separate section route files, calendar integration, integration outage breadth, and large-collection pagination remain honest model or lifecycle gaps. They are not simulated in the product.

## 1. Product jobs

Profile must help a creator answer:

1. What does Missa know about me, and which parts are public?
2. Which private details shape the opportunities and explanations I see?
3. How do I refine preferences without describing every Work or navigating all 1,084 taxonomy terms?
4. Which Organizations and searches am I following intentionally?
5. Which email and calendar connections are active, and what can each connection do?
6. How do I preview, export, or change my data without exposing private matching or submission history?

Success feels like: “I know what is public, I can tune what Missa shows me, and each change has a clear scope.”

Profile is not:

- a public Tracker summary;
- a leaderboard, progress score, or requirement to use Opportunities;
- a substitute for the taxonomy on an individual Library Work;
- an eligibility verdict;
- a place for Organization membership administration;
- a source freshness or backend-processing dashboard;
- a single form that saves unrelated identity, matching, privacy, and integration state together.

## 2. People and modes

### Creator owner

Edits public identity, private preferences, privacy, integrations, saved searches, follows, and exports. All private sections require the owner session.

### Signed-out visitor

Can see only the explicit public projection at `/profile/[userId]`. The absence of a public field never reveals that a private value exists.

### Organization member

Uses the same personal Profile as any creator. Membership and role controls belong under Organization, not inside the creator's matching preferences.

### Returning creator with incomplete information

Can use public Opportunities, Tracker, and Library without completing every Profile section. The Overview suggests one useful next step but does not block the product or grade the person.

## 3. Authoritative domain boundaries

| Question | Domain | Profile behavior |
|---|---|---|
| What name, biography, image, links, or selected Works may visitors see? | Public identity | Explicitly published fields only; separate save and preview |
| What does the creator make or want to see more of? | 12-facet canonical practice taxonomy | Private stable term IDs with progressive disclosure; never a flat 1,084-term picker |
| Which kind of opportunity is useful? | Opportunity type | Separate choices such as grant, residency, contest, commission, or exhibition |
| Who is eligible? | Eligibility attributes and opportunity rules | Optional private self-description; never public and never inferred from practice terms |
| Where can the creator apply from or participate? | Geography and participation mode | Separate from practice and eligibility; ordinary labels backed by structured values |
| What fee, deadline, or submission behavior is acceptable? | Opportunity preferences | Separate controls with unknown-data consequences explained |
| What does one specific Work contain? | Library Work taxonomy | Edited in Library, not copied into Profile |
| What query should run repeatedly? | Saved search | Explicit named criteria and notification behavior; separate from broad Profile defaults |
| Which Organization is interesting? | Following | A reversible relationship; does not imply endorsement or eligibility |
| Which external service may Missa read or update? | Integration authorization | Connection, scope, mode, repair, and revoke controls; never mixed into identity saving |

## 4. Current-state evidence and gaps

### Current private Profile

- `/profile` is one long sequence: identity/preferences, privacy, exports, saved searches, following, Profile props, Gmail Sync, and forwarding.
- Display name, bio, canonical practice preferences, and opportunity preferences share one save request. An error in one area can block unrelated changes.
- The practice picker exposes only three guided labels over the first three taxonomy facets while the canonical graph has 12 independent facets and 1,084 terms.
- The current copy says all preferences narrow the feed. In persistence and query behavior, `include` and `prefer` produce explainable match reasons, while `exclude` suppresses matching taxonomy branches. These consequences need distinct customer language.
- Opportunity type, location, career stage, fee, deadline window, and simultaneous-submission settings are structurally separate in data but visually nested inside the same card.
- Legacy free-text disciplines, genres, and locations coexist with canonical taxonomy IDs during migration.
- Profile completeness currently treats a name, bio, and opportunity preferences as three equal requirements. It does not prove quality, eligibility, or readiness and should not become a prominent score.
- Saved searches and following disappear or become visually weak when empty; their empty states do not explain the benefit or recovery path.
- Integration cards expose implementation-oriented labels, sync timestamps, scan windows, and backend mode language in the main Profile stack.
- Data export is owner-scoped, no-store, and cooldown protected, but it sits beside public privacy controls rather than in a dedicated Data section.

### Current public Profile

- `/profile/[userId]` can expose display name, bio, and an optional tracked-opportunity count.
- Private taxonomy preferences, eligibility attributes, email, account data, and Tracker records are excluded by the public projection.
- When no public field remains, the projection fails closed to a private-profile state.
- The current public page still links to deprecated `/opportunities-preview` routes.
- The target plan calls for selected public Works and links, but current Profile storage does not yet provide an explicit publication contract for them.
- Public Tracker count is a legacy field and conflicts with the target privacy boundary. The redesign removes it from the selected public composition rather than treating private activity as social proof.

## 5. Target information architecture

### Profile shell

Persistent section navigation:

1. **Overview** — what is public, what affects matching, connection attention, and one useful next action.
2. **Identity** — display name, short bio, profile image, links, and explicitly selected public Works when supported.
3. **Preferences** — private practice, role, language, opportunity type, geography, eligibility attributes, fee, deadline, and submission preferences.
4. **Privacy** — field-level visibility, public preview, and consequences before unpublishing.
5. **Integrations** — Gmail, forwarding address, and calendar subscription scope/status.
6. **Saved searches** — named repeated searches and notification intent.
7. **Following** — Organizations the creator follows.
8. **Data** — owner export, import, and future account-data lifecycle controls.

Desktop may use a quiet left rail. Narrow screens use an explicit section trigger or horizontally scrollable section navigation with the current section named. Every section has a stable URL and H1.

### `/profile` Overview

The Overview is a routing and understanding surface, not a dashboard of decorative metrics.

Required content:

- public-profile state with Preview action;
- a short statement of what Profile affects privately;
- one highest-value next step, if any;
- section rows showing plain status such as `Public`, `Private`, `Needs review`, `Connected`, or `Not set`;
- no profile percentage, engagement score, match score, streak, or customer-facing backend freshness.

### `/profile/identity`

Identity has its own save boundary. Public visibility is summarized beside each publishable field and links to Privacy for consequence changes.

Target fields:

- display name;
- short bio;
- optional profile image with no-image and failed-upload recovery;
- optional public links with safe URL validation;
- selected public Works only after Library gains an explicit public publication contract.

Identity changes do not alter private matching inputs. Removing a public Work must not delete or rewrite the private Library Work or historical submission snapshots.

### `/profile/preferences`

Preferences are private by default and split into ordinary-language groups.

#### Practice and role

- Begin with broad practice families and roles, then allow relevant refinement across the 12 independent facets.
- Show only terms relevant to the creator's current branch plus search for a known label.
- Persist canonical term IDs, not display labels.
- Labels may change while selections remain stable.
- Multi-practice and cross-disciplinary creators can choose more than one branch.
- A missing label or deprecated term gets a review explanation and replacement path; it is never silently deleted.

Customer preference language:

- **Show me opportunities like this** — contributes an explainable match reason.
- **Especially interested** — contributes a stronger preference signal without guaranteeing rank or eligibility.
- **Do not show this practice** — suppresses that canonical branch and descendants. The consequence is confirmed before saving.

Do not render `include`, `prefer`, `exclude`, weights, scheme versions, confidence, or internal facet IDs.

#### Opportunity types

Type remains independent from practice. Use the canonical opportunity-type set, including commissioned work, exhibitions, pitches, RFPs, and other supported types—not only the nine legacy checkboxes.

#### Geography and participation

Home/eligibility location, desired opportunity regions, remote/on-site willingness, and travel constraints are distinct values. A missing opportunity location rule means “not stated,” not confirmed eligibility.

#### Eligibility attributes

Optional private attributes may help compare stated opportunity rules. They are never published or sent to Organizations merely because they exist in Profile. Missa explains an intersection or contradiction but does not claim legal eligibility.

#### Cost, timing, and submission behavior

- maximum application fee and `no fee only` cannot silently contradict each other;
- a deadline window is a browse preference, not an instruction to invent dates for rolling or unknown calls;
- simultaneous-submission preference is separate from opportunity type and practice;
- unknown fee or unknown simultaneous policy explains why an item may not satisfy a hard filter.

Each preference group saves independently or participates in one clearly scoped `Save preferences` action with an unsaved-change summary. Identity and Privacy are never included in that mutation.

### `/profile/privacy`

Privacy shows a field map and a live public preview from the same public projection contract.

Required behavior:

- default private for matching, eligibility, Tracker, Library drafts, saved searches, following, integration, and account data;
- explicit public/private state for every publishable identity field;
- consequences described before a public field becomes private;
- no fallback that reveals hidden name, email, user ID, private field existence, or previous public content;
- public URL copy action only when the projection has publishable content;
- unpublishing selected Works removes them from public projection without deleting the private records;
- save, failure, restore, and concurrent-update states.

The redesigned public composition does not show Tracker counts, applications, eligibility attributes, matching preferences, saved searches, follows, integrations, or Organization memberships.

### `/profile/integrations`

Each integration is a separate connection row or detail section with:

- `Connected`, `Needs attention`, `Paused`, or `Not connected`;
- plain scope explanation;
- pending customer review count where actionable;
- connect, repair, pause, rotate, or disconnect actions only when valid;
- confirmation for destructive revocation;
- no raw provider error codes, job IDs, confidence thresholds, queue names, scan timestamps, or customer-facing source freshness.

Gmail and forwarding remain review-first by default. Automated changes, if offered, require an explicit narrow scope and reversible confirmation. Calendar subscription is a private bearer link with scope, rotate, and revoke behavior.

### `/profile/saved-searches`

Saved searches are named, repeatable opportunity queries. Each row shows criteria in customer language, notification state, edit, run, and delete. Empty state offers `Create saved search` and links back to current Opportunities filters when applicable.

Hard filters and broad Profile preferences remain distinct. A saved search can be narrower than Profile defaults and must explain when no current Missa records match without claiming no opportunities exist.

### `/profile/following`

Following shows Organization identity, current live-opportunity context when available, `View Organization`, and `Unfollow`. Empty state explains that following affects Inbox updates; it does not imply endorsement.

Deleted, merged, private, or suspended Organization records need a recoverable explanation rather than a broken row.

### `/profile/data`

Data includes:

- full owner export;
- Tracker-only and Library-only export scope where supported;
- import entry point;
- export cooldown, session-expired, preparation, download, and failure states;
- future deletion or account-lifecycle controls only after their server contract exists.

No export bytes are placed in page state, and no user-selected account ID may change export ownership.

### `/profile/[userId]`

The public profile is a calm identity page, not a private-product shell.

Required content when published:

- display name or intentionally chosen public identity;
- optional image and bio;
- optional public links;
- explicitly published Works once supported;
- a path to public Opportunities and Missa signup.

Required states:

- public with content;
- private;
- removed/not found;
- published identity with no public Works;
- previously published Work now private;
- no image or broken image;
- very long name, bio, and link labels.

## 6. State model and fixtures

Every visual direction must use the same fixtures:

1. **Active** — public identity, several private preferences, one saved search, followed Organizations, Gmail connected, calendar feed connected.
2. **New creator** — name only; no preferences, follows, searches, integrations, or public bio.
3. **Partially configured** — identity saved, practice selected, geography and opportunity types not set.
4. **Multi-practice** — several independent practice branches, roles, languages, and cross-disciplinary terms.
5. **Preference conflict** — a parent marked `Do not show` while a descendant is `Especially interested`.
6. **Deprecated term** — stored stable ID now points to a replacement label.
7. **Private identity** — all publishable fields private; public projection reveals nothing.
8. **Privacy conflict** — a selected public Work has since become private in Library.
9. **Integration attention** — Gmail authorization revoked and calendar bearer link should be rotated.
10. **Integration unavailable** — provider or Profile integration endpoint cannot load.
11. **Empty saved searches** and **empty following**.
12. **Large collections** — 24 saved searches, 40 followed Organizations, and 64 practice preferences.
13. **Mutation failure** — save rejected or connection lost while preserving edits and focus.
14. **Concurrent change** — server projection changed after the editor loaded.
15. **Export cooldown/session expired/failure**.

## 7. Responsive and accessibility contract

- Public, owner Profile, and onboarding are mobile-first.
- All controls are at least 44px high; destructive and privacy actions remain labelled.
- Profile sections are semantic navigation with `aria-current`; they are not fake tabs unless they implement the complete tab pattern.
- Each route has one H1. Group titles use a consistent heading hierarchy.
- Every form control has a persistent visible label, description association, field-specific error, and invalid state.
- Save status uses a polite live region; failures use an alert and preserve entered values.
- Unsaved changes are announced and protected before section navigation where loss is possible.
- Switches expose state and consequence in text; color and switch position are not the only cues.
- Dialogs and sheets use the installed focus-managed primitives, restore focus, and close with Escape.
- Taxonomy search and selection are keyboard operable; selected terms remain visible in a labelled list, not only as color chips.
- At 320px and 390px, no horizontal page overflow, clipped section navigation, nested scroll trap, or off-screen save action.
- At 200% zoom, section navigation remains reachable and fields do not overlap side summaries.
- Reduced motion disables nonessential transitions.

## 8. Content and visual contract

- Use `Profile`, never Passport.
- Use true white canvas, Aubergine for primary action/current navigation, and semantic colors only for real status.
- One Aubergine-filled primary action per normal view.
- Use cards sparingly; section hierarchy, labelled lists, and borders are preferred over a stack of unrelated boxes.
- Say `private preferences`, `public identity`, `saved search`, `following`, and `connection` in ordinary language.
- Do not show confidence, weights, taxonomy scheme version, internal account/user IDs, provider codes, queue names, freshness, last checked, or sync timestamps.
- Do not imply that Profile completion guarantees eligibility, better artistic judgment, acceptance, or opportunity coverage.

## 9. Architecture implications before product promotion

- Make Profile section state URL-backed with stable routes.
- Split identity, preferences, privacy, integrations, saved searches, following, and data into typed owner projections and scoped mutations.
- Preserve compatibility with current `/profile` and public `/profile/[userId]` routes.
- Expand the preferences projection beyond the current three guided browse layers without rendering the entire canonical graph.
- Map legacy free-text disciplines, genres, and locations to canonical IDs or explicitly labelled unresolved values; never silently coerce them.
- Define typed conflict behavior for ancestor/descendant preference contradictions.
- Define public image, link, and selected-Work publication contracts before rendering them as live features.
- Retire `trackedOpportunityCount` from the selected public composition and eventually from the public projection after compatibility review.
- Replace deprecated `/opportunities-preview` links in public Profile with canonical `/opportunities` during product implementation.
- Give integrations customer-safe status projections and real rotate/revoke/recovery APIs.
- Keep Profile owner APIs no-store, owner-scoped, audited where consequential, and transactional where several values must change together.
- Add URL, mutation rollback, mobile, zoom, keyboard, and assistive-technology tests before promotion.

## 10. Component-selection gate

No premium component is selected merely because it resembles a settings page. A candidate must first prove that it:

- supports stable Profile section navigation and narrow-screen reflow;
- keeps public identity, private matching, privacy, integrations, saved searches, following, and data visibly separate;
- handles all fixtures above without collapsing into a card wall;
- supports progressive 12-facet taxonomy refinement without a flat picker;
- provides accessible fields, validation, unsaved state, confirmation, and recovery;
- uses Missa tokens and ordinary language;
- remains local under `/design-system/*` until explicit product promotion approval.

The visual comparison must include at least three structurally different Profile directions using the same fixtures before any direction is selected.
