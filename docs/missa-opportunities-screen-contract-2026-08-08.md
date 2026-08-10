---
title: Missa Opportunities screen contract
version: "2.0-draft"
status: approved-and-implemented-locally
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
baseline_audit: ./missa-opportunity-journey-phase-0-audit-2026-08-08.md
component_selection: option-2-approved-for-product
detail_direction_status: selected-local-composition
detail_direction_review: ./missa-opportunity-detail-directions-2026-08-08.md
detail_selected_review_route: /design-system/opportunity-detail
routes: /opportunities, /opportunities/[slug]
---

# Missa Opportunities screen contract

## Product implementation status

The migration boundary and implementation evidence are recorded in [`missa-first-promotion-tranche-preflight-2026-08-08.md`](./missa-first-promotion-tranche-preflight-2026-08-08.md). Option 2 is now implemented locally on canonical public browse and detail routes with customer-safe evidence, permitted media, the full progressive taxonomy, one Save-to-Tracker action, and typed authentication return.

The implementation has not been deployed. Remaining gates are real-device checks, stable remote preview review, and explicit production approval.

## Approved visual direction

- Desktop: Option 2, “Curated Catalogue,” using persistent progressive filters and a two-column media catalogue.
- Mobile: Option 1, “Editorial Index,” using compact filter access and dense image-led list rows.
- Verified local reference route: `/design-system/opportunities-overhaul`.
- Implementation evidence: `outputs/missa-opportunities-overhaul-2026-08-08/desktop-option-2-final.png` and `outputs/missa-opportunities-overhaul-2026-08-08/mobile-option-1-final.png`.
- Approval authorizes the implemented Option 2 product composition on `/opportunities` and `/opportunities/[slug]`; other product families remain page-by-page gated.
- The selected detail synthesis is available at `/design-system/opportunity-detail`. It combines the Decision Brief’s editorial identity, the Evidence Ledger’s labelled facts, and the Guided Pursuit’s narrow-screen reading order.
- The earlier comparison remains available at `/design-system/opportunity-detail-directions`; the selected synthesis now powers the canonical local product detail.

## 1. Job and success

### Browse

The person is deciding which opportunities deserve closer attention.

Success means they can:

- understand the inventory quickly;
- see a useful result on mobile without configuring the whole taxonomy first;
- narrow the list without losing query or scroll context;
- compare decisive facts without reading every card;
- open a result and return to the same browse state;
- save one opportunity without choosing between two labels for the same action;
- use the browse page whether signed out or signed in.

### Detail

The person is deciding whether to save, track, prepare for, or apply to one opportunity.

Success means they can:

- identify the opportunity and Organization;
- understand deadline, fee, location/reach, eligibility, and requirements;
- distinguish unknown or conflicting information from confirmed facts;
- open the official source;
- continue through the right signed-out or signed-in action;
- return to the exact browse context.

## 2. Users and modes

| Mode | Browse value | Detail value | Private additions |
| --- | --- | --- | --- |
| Signed out | Full public inventory and filters | Full public record and official source | None |
| Signed in, incomplete Profile | Same inventory | Same public record | Save to Tracker and prompt to improve relevant preferences, not a fake fit score |
| Signed in, useful Profile | Personalized ordering or section, never a hidden inventory | Public record plus concise observable reasons | Save to Tracker, compare with relevant Work, apply handoff |
| Returning from login | Same query, filters, selected record, and scroll | Same record and intended action | Complete save/track/apply intent safely |

## 3. Canonical routes and state

- `/opportunities` is public and signed-in browse.
- `/opportunities/[slug]` is public and signed-in detail.
- `/opportunities-preview` and `/discover/opportunities/[id]` become compatibility redirects.
- Query state remains in the URL.
- The selected result and originating query are encoded so Back and authentication return correctly.
- Unknown/stale taxonomy IDs are removed safely; the URL is normalized without sending them to repository SQL.
- Customer state no longer includes `verifiedOnly`, `recently-verified`, source age, or refresh prompts.

## 4. Browse information hierarchy

### Always visible

1. Public/authenticated shell.
2. Page title and one short sentence.
3. Search.
4. Result count and current sort.
5. Compact Filters action with active count.
6. Active-filter summary when filters exist.
7. Results.

### Quick browse choices

- Opportunity type/category.
- Broad practice/discipline.
- Location/reach.
- Fee.
- Deadline.
- Open now when it materially changes the inventory.

### Advanced filter flow

- Discipline, form, genre, subgenre, medium, technique, mode, role, theme, audience, and language appear progressively and only when useful.
- Dependent controls do not occupy the main page in a disabled state.
- Eligibility filters remain separate from practice taxonomy.
- Include/prefer/exclude is a Profile preference model, not a public browse toggle.

### Mobile first viewport

At 390×844, the first viewport must contain:

- identity/account entry;
- title;
- search;
- result count and sort;
- compact Filters action;
- meaningful content from the first result.

The target is for the first result to begin before y=520, leaving enough room to understand its identity and decisive facts.

## 5. Opportunity result contract

### Objective

Support a fast pursue/skip decision and a confident transition to detail.

### Decisive content

- Optional source-provided image or quiet neutral fallback. Render the image directly; do not add a visible media heading or caption.
- Opportunity type only when it aids comparison.
- Title.
- Organization name or exact unknown state.
- Deadline state and exact/rolling/unknown treatment.
- Fee state.
- Location or eligibility reach, whichever is more decisive.
- One signed-out primary action: View opportunity.
- One signed-in state action: Save to Tracker, Continue preparing, or In Tracker.
- Do not show separate Save and Track controls; they are the same initial `saved` state in the current domain model.
- A secondary list action appears only after the opportunity is in Tracker and only when lists are useful in that context.

### Deferred to detail

- Full taxonomy.
- Prize structure.
- Preparation list.
- Rights.
- Complete eligibility.
- Full source explanation.
- Internal confidence, freshness, or trust scores.

### Visual and content limits

- Maximum two status labels before the title.
- No sentence necessary for the decision uses text smaller than 14px.
- Metadata can use 12px only when short and redundant with an icon/position.
- Long title and Organization names wrap predictably; do not truncate both.
- Cards with no image remain balanced without inventing an identity asset.
- The whole card may be a detail link only if nested controls remain semantically and interactively valid; otherwise use an explicit detail link.

## 6. Detail information hierarchy

1. Back to preserved results.
2. Optional useful image/identity context.
3. Opportunity type, title, Organization.
4. Decisive fact summary: deadline, fee, location/reach, status.
5. Primary action appropriate to auth and submission state.
6. Plain summary when source-backed and useful.
7. Eligibility.
8. Requirements and preparation.
9. Call-specific facts such as prize, rights, word/page limits, or simultaneous submissions.
10. Official source/guidelines.
11. Report an issue.
12. Related opportunities only after the decision content.

There is no customer-facing freshness component or update message. Operational source check times, scores, refresh state, and monitoring actions are absent. “Organization confirmed” may appear only when a documented customer-safe standard and action require it; it must not be bundled with backend source health.

## 7. Taxonomy contract

- Stable canonical IDs drive URL, repository, saved search, Profile, Work, and Organization rules.
- Labels are presentation and can change.
- Browse defaults to broad, high-value facets.
- Detail displays a small curated subset that helps a human understand the call.
- Signed-in reasons show observable intersections such as `Photography · Nigeria · No fee`.
- A valid zero-result term produces a coverage-aware message, not “no such opportunities exist.”
- Multi-parent terms are not forced into one breadcrumb.
- Deprecated selections remain readable and offer a replacement when edited.
- Practice taxonomy never implies eligibility.

## 8. States to design before component selection

### Browse

- Initial loading and streaming.
- Populated default.
- Query results.
- Filters applied.
- Updating without page jump.
- Zero query results.
- Zero filtered results.
- Valid taxonomy with no current coverage.
- Invalid/deprecated URL term.
- Repository/network failure.
- Pagination/load-more success and failure.
- Signed-out.
- Signed-in with incomplete Profile.
- Signed-in with private reasons.

### Result

- Useful image.
- No image.
- Broken image.
- Long title/Organization.
- Unknown Organization.
- Exact, rolling, until-filled, conflicting, and unknown deadline.
- No fee, paid fee, fee not stated, fee not confirmed.
- Open, opening soon, closing soon, closed during session.
- Saved, tracked, preparing, submitted.
- External submission unavailable/unsafe/changed.

### Detail

- Full source-backed content.
- Partial content.
- Conflicting consequential facts.
- Required materials unknown.
- Eligibility unknown or complex.
- Closed/archived after opening.
- Not found/merged duplicate.
- Official source unavailable.
- Signed-out action requiring return after login.
- Saved/in Tracker, preparing, submitted, or archived.
- Issue report success/failure.

## 9. Interaction contract

- Search submission and clear are keyboard and touch accessible.
- Filters open a dedicated experience; the Filters action never doubles as Clear all.
- Filter changes preserve focus and announce result updates without stealing focus.
- Clear all is visible inside the filter flow and near active-filter summaries.
- Closing filters returns focus to the Filters action.
- Selecting a result preserves scroll and query context.
- Back restores the prior result position.
- Authentication preserves the intended save/apply action.
- Closing the mobile detail sheet restores focus to the originating result and restores scroll position.
- Disabled actions state why or are omitted; they do not appear as unexplained dead controls.

## 10. Mobile and accessibility contract

- 44px minimum touch areas for customer actions.
- No horizontal page overflow at 320px or 390px.
- Category/type navigation must have a visible scroll or alternate selection affordance.
- No essential information appears only on hover.
- Focus order reaches result content without traversing the full advanced taxonomy.
- Image alt is meaningful only when the image identifies the opportunity or Organization; decorative imagery uses empty alt.
- Status and urgency never rely on color alone.
- Loading, result count, update, and error announcements are polite and concise.
- Page reflows at 200% zoom.
- Automated axe, keyboard, screen-reader semantics, reduced motion, contrast, and touch-target checks are required before promotion.

## 11. Analytics contract

Track only events that answer product questions:

- browse viewed with public/signed-in mode;
- search submitted/cleared;
- filter opened, changed, cleared;
- zero-result query and zero-coverage taxonomy;
- result opened and position;
- official source opened;
- save/apply intent and completion/failure;
- auth return completed/abandoned;
- issue report opened/submitted;
- return from detail with state restored.

Do not include private profile text, raw search content that may be sensitive, or taxonomy attributes beyond the approved analytics policy.

## 12. Data and architecture changes implied

- Merge public and authenticated page composition while keeping private projections server-controlled.
- Consolidate Save and Track into one customer action backed by the existing `saved` Tracker status; retain richer Tracker status transitions after entry.
- Remove freshness filter/sort controls from customer URL generation.
- Stop rendering freshness/check/process fields in public components.
- Split customer-safe source provenance from Admin source-health projection.
- Preserve legacy query parsing temporarily for old links, but normalize to customer-safe state.
- Add/strengthen publication-quality gating for title, Organization identity, source quality, and feature eligibility.
- Carry the optional identity/source image into detail.
- Preserve stable slugs and redirects when duplicate records merge.

## 13. Acceptance gates before premium component comparison

- Browse and detail information hierarchy approved.
- Mobile first-viewport contract approved.
- Quick vs. advanced taxonomy exposure approved.
- All listed states represented in low-fidelity flows.
- Public/signed-in route continuity agreed.
- Freshness and Admin/public data split agreed.
- Existing behavior-to-preserve list mapped to tests.
- The authenticated mobile sheet retains browse state, restores focus, and passes accessible-name checks.
- Visual exploration shows exactly three coherent directions based on this same contract.

Only after those gates should premium components be compared. A candidate succeeds by satisfying this contract, not by looking attractive in the registry.
