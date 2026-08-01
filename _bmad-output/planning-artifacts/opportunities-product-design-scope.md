---
title: Opportunities Product and Design Scope
product: Missa Passport
status: Scoped for design
date: 2026-07-31
benchmark: Chill Subs browse and publication detail
references:
  - DESIGN.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd/functional-requirements.md
  - _bmad-output/planning-artifacts/opportunities-backend-requirements.md
  - apps/web/app/(passport)/opportunities/page.tsx
---

# Opportunities Product and Design Scope

## 1. Executive decision

Opportunities should be built as a connected discovery system, not a single feed page.

Opportunities 1.0 should combine:

- the category clarity, search prominence, visible filters, and recognizable result identities seen in Chill Subs;
- Missa's deadline urgency, source freshness, trust evidence, and explicit unknown states;
- a quick-detail surface and dedicated opportunity page that help a user decide whether to apply;
- a one-click handoff to the official submission page without pretending Missa completed the submission;
- one-click tracking as a separate, optional personal action;
- structured saved searches that make the directory useful again tomorrow, not only today.

The recommended first-build shape is:

1. A public, indexable `All` browse and an authenticated `For you` experience tailored from information the user deliberately gives Missa.
2. A category-led grid of compact opportunity cards.
3. A desktop quick-detail sheet and canonical detail route with eligibility, requirements, provenance, and organization context.
4. A verified `Go to submission` action on cards and decision surfaces; no authentication required for the external handoff.
5. Authentication only when a user saves, follows, or tracks.
6. Structured preferences, search, and filters first; natural-language discovery and opt-in work matching later.

This is a benchmark-informed direction, not a Chill Subs clone. Chill Subs makes a large corpus approachable. Missa must make the next decision clearer and more trustworthy.

## 2. Product purpose

The Opportunities experience helps a writer or creative answer five questions quickly:

1. What is open for me right now?
2. Is this worth my time, money, and attention?
3. What would I need to prepare?
4. Where do I submit?
5. How do I keep it from slipping through the cracks?

The primary outcome is not a page view or a speculative match. It is a user reaching a credible official submission page with enough factual context to act. Tracking is the supporting continuity outcome.

### Primary promise

> Missa tailors submission opportunities for you.

### Product success moment

A user receives credible opportunities tailored to the kinds of submissions they are seeking, sees the exact deadline and requirements, and opens the verified submission destination in one click. They may also add it to Tracker.

## 3. Beachhead users

### Primary

- Writers looking for magazine calls, contests, prizes, fellowships, residencies, and grants.
- Early- and mid-career applicants who need help interpreting eligibility, fees, deadlines, and required materials.
- Repeat submitters who already use spreadsheets, bookmarks, newsletters, or competitor trackers.

### Secondary

- Visual artists, filmmakers, researchers, and other creative applicants as taxonomy and source coverage expands.
- Organization staff checking how their opportunities appear in Missa.
- Signed-out visitors arriving through search, a shared result, or an organization link.

### Initial domain boundary

The product should support the full existing opportunity type model, but launch content, examples, taxonomy quality, and QA should be strongest for literary opportunities. Broad labels must not obscure a weak corpus.

## 4. Benchmark assessment

### What Chill Subs gets right

- It makes category choice visible before users search.
- Search and filters occupy the top of the page, matching the user's core task.
- Quick toggles such as open, no fee, and pays reduce repeated filter work.
- Result count and sorting communicate the scale and order of the corpus.
- Publication marks and covers make cards easier to recognize and remember.
- Cards expose deadline, category, fee, and save actions without requiring a detail visit.
- Publication detail creates a calm, information-rich destination instead of overloading browse cards.

### What Missa should improve

- Make deadline urgency and unknown cutoff times impossible to miss.
- Distinguish official facts, Radar-extracted facts, and uncertain or missing facts.
- Show when a source was last checked and what changed.
- Make eligibility and preparation requirements decision-ready.
- Link directly to the official submission destination when it is safely known.
- Let users track an opportunity without bundling tracking into the outbound submission action.
- Keep public discovery useful while preserving personalized data behind authentication.

### What Missa should not copy

- Ratings, vibes, social proof, and notes before the core trust model is mature.
- A paid “better search” distinction that weakens the baseline browse experience.
- Duplicate save metaphors. `Track` is the personal continuity action; `Follow` belongs to organizations.
- Dense collections of badges without clear hierarchy.
- Cover imagery as a hard requirement. Identity assets should improve recognition but never block a complete listing.
- Personalized Fit, readiness, or manuscript claims before the user explicitly selects a work or supplies relevant criteria.

## 5. Experience principles

1. **Decision quality over directory volume.** The page should help users rule opportunities in or out.
2. **Tailored selection, factual explanation.** Missa personalizes which opportunities it surfaces; type, deadline, fee, prize, eligibility, requirements, and source state explain why each result deserves attention.
3. **Facts show their provenance.** The user can tell what came from the official source, when it was checked, and what remains uncertain.
4. **One click means one honest handoff.** `Go to submission` opens the validated official destination; it never reports that the application was submitted.
5. **Filters stay understandable.** Common controls remain visible; specialist criteria live in a clearly labeled filter sheet.
6. **Calm by default.** Urgency is reserved for a genuine closing deadline, changed requirement, or verification problem.
7. **The URL remembers the search.** Browse state is shareable, restorable, and compatible with browser navigation.
8. **Public facts, private personalization.** Opportunity data can be public; personal profiles, matches, searches, and tracking remain private.
9. **Personalization is explicit and controllable.** Opportunity tailoring uses preferences the user can inspect and change. Work-level Fit or readiness appears only after the user deliberately selects a Work.

## 6. Information architecture

### Surface family

| Surface | Purpose | Audience | Authentication |
| --- | --- | --- | --- |
| `/opportunities` | Browse, search, filter, sort | Everyone | Optional |
| Opportunity quick detail | Inspect core facts without losing browse context | Everyone | Optional |
| `/opportunities/[id]/[slug]` | Decide, verify, prepare, act | Everyone | Optional |
| Official submission handoff | Open the validated external submission destination | Everyone | Not required |
| Saved search dialog | Save current criteria and digest preference | Signed-in users | Required |
| `/opportunities/saved-searches` | Rename, edit, pause, or delete a search | Signed-in users | Required |
| Organization context | See the source organization and other open calls | Everyone | Optional |
| Tracker handoff | Add the opportunity with the approved initial planning status | Signed-in users | Required |
| Work comparison | Compare explicit Work metadata with stated opportunity requirements | Signed-in users | Later, opt-in only |

### Global Passport navigation

`Home · Opportunities · Tracker · Library · Calendar · Messages · Insights`

The Opportunities section should not introduce a second, competing navigation system. Category navigation is local to browse.

### Browse category model

Recommended top-level categories:

- `For you` — primary signed-in view tailored from explicit opportunity preferences, saved searches, and followed organizations; it is not a manuscript Fit claim.
- `All`
- `Magazines`
- `Grants`
- `Awards`
- `Residencies`
- `Fellowships`
- `Contests`
- `More`

`More` contains lower-volume types such as scholarships, festivals, conferences, RFPs, pitches, exhibitions, and commissions.

These labels are browse shortcuts over the canonical opportunity type field. They are not separate entities or hard-coded datasets.

### Taxonomy rules

- **Type** describes the opportunity container: grant, award, residency, fellowship, contest, magazine call.
- **Discipline** describes the broad practice: writing, visual arts, film, music, research.
- **Genre** narrows a discipline: poetry, fiction, nonfiction, criticism, photography.
- **Career stage** describes eligibility, not quality: emerging, early-career, established, student.
- **Location** distinguishes remote, any location, region-limited, and on-site requirements.

The interface must not alternate casually between type, discipline, category, and genre. Labels should follow these definitions in filters, cards, saved searches, URLs, and analytics.

### Public corpus and publication policy

Opportunity lifecycle and publication safety are separate concerns. Add a canonical `publicationState` with at least:

- `draft` — ingested but not ready for public use;
- `reviewable` — available to verification/admin workflows;
- `published` — eligible for public browse and detail;
- `suppressed` — removed for safety, legal, quality, or duplicate concerns;
- `withdrawn` — previously public but removed by the authoritative organization or source.

The default `All` browse includes only `published` opportunities whose public status is `opening-soon`, `open`, `closing-soon`, or `deadline-extended`.

- `Open now` narrows that set to `open`, `closing-soon`, and `deadline-extended`.
- `Opening soon` may be exposed as a filter, but is not represented as already accepting applications.
- `discovered`, `needs-verification`, `uncertain`, `duplicate`, `draft`, `reviewable`, `suppressed`, and `withdrawn` records do not appear in public browse.
- Closed or archived records may retain a public archival detail page when previously published and still safe, but never appear in the default result set.
- Duplicate records redirect to the canonical opportunity.

Publication requires a safe canonical URL, title, organization identity, type, actionable deadline semantics, source provenance, and no unresolved safety block. Emergency unpublish must take effect without waiting for the next ingestion cycle.

## 7. Browse page specification

### Page hierarchy

1. Passport app header.
2. Page title and a short utility sentence.
3. Local category navigation.
4. Primary search field.
5. Visible filter bar and quick toggles.
6. Active criteria summary and saved-search action.
7. Result count, sort, and optional future view control.
8. Result grid.
9. Pagination or progressive loading.

The white page canvas should remain visible. Sections are separated with spacing and dividers before tinted panels, borders, or shadows.

### Heading and introduction

Recommended signed-out copy:

> **Opportunities**
>
> Calls, grants, awards, and residencies—checked and kept current by Missa.

Recommended signed-in `For you` copy:

> **Opportunities for you**
>
> Submission opportunities tailored to what you are looking for.

### Search

The initial search matches:

- opportunity title;
- organization name;
- keywords;
- genres and disciplines;
- eligible locations;
- relevant guideline text where search indexing is safe and accurate.

Search should be debounced after typing, submit on Enter, and write the query to the URL. The visible label must remain `Search opportunities`; natural-language interpretation is not part of the first release.

Version 1 search uses a curated public search document, not raw snapshots or entire scraped guideline pages. It normalizes Unicode and case, supports full-token and prefix matching, and ranks title matches before organization, type, genre, and curated summary matches. It does not promise typo correction or phrase-query syntax. Queries are limited to 200 characters, special characters are safely escaped, and empty queries return the selected category/filter result set.

### Always-visible filters

- Type
- Discipline or genre
- Location
- Fee
- Deadline

### Quick toggles

- Open now
- Verified
- No fee

`Pays` may be added when prize and compensation data are reliable enough to avoid misleading users.

### More filters

- Prize or funding range
- Career stage
- Eligibility keywords
- Simultaneous submissions allowed
- Required materials
- Specific included or excluded keywords

### Filter behavior

- Desktop filter changes update results immediately and preserve focus.
- Mobile filters use a bottom sheet with a result count and explicit `Show results` action.
- Active criteria appear as removable chips below the toolbar.
- `Clear all` appears only when criteria are active.
- Category changes retain compatible criteria and remove incompatible ones with a brief explanation.
- Query state is encoded in stable URL parameters.
- Back and forward navigation restores the exact result state.
- A copied URL reproduces the same public search without exposing private profile data.

The mobile filter surface is a labelled modal dialog. Opening it moves focus to its heading or first changed control, makes the background inert, traps Tab focus, supports Escape and an explicit Close action, prevents background scroll, retains draft criteria through rotation or virtual-keyboard changes, and restores focus to the filter trigger when closed. `Show N results` applies the draft; closing without applying retains the previously active result set.

### Results controls

Show:

- total matching results;
- current sort;
- a `Save search` action for signed-in users;
- a sign-in continuation when a signed-out user attempts to save.

Sort choices:

- `Recommended` — default only inside an active `For you` view;
- `Soonest deadline` — default for signed-out and `All`;
- `Recently verified`;
- `Recently added`.

Do not expose `Best fit`, internal confidence, trust, or Fit numbers as sort labels. `Recommended` means tailored from explicit opportunity preferences, not judged against a manuscript.

### `For you` contract

`For you` is part of the first signed-in browse design. It activates when the user has at least one explicit preference or saved search containing a canonical type, discipline, genre, location, fee, deadline, career-stage, or simultaneous-submission criterion. It means `tailored to what you told Missa you want`, not `your work fits`.

- Candidate opportunities must match at least one explicit opportunity preference or saved search, or come from a followed organization.
- Only explicit saved-search criteria filter or rank the set; general browse behavior does not infer the user's eligibility.
- Published eligibility remains visible as an opportunity fact but is not silently compared with the person.
- Ranking prioritizes explicit preference and saved-search matches, then deadline urgency, recently verified changes, and followed organizations.
- If the threshold is not met, `All` remains selected and a non-blocking prompt offers `Create a saved search`.
- If tailoring is active but returns no results, the empty state names the preferences used and offers to widen or edit them.
- Protected or sensitive attributes are never inferred from clicks, searches, source prose, or other behavior. A sensitive requirement may be displayed only when explicitly published; any later personal comparison uses only attributes the user knowingly supplied and can remove.

### Result density

- Desktop: three-column grid at wide viewports.
- Medium desktop and tablet: two-column grid.
- Mobile: one-column list.
- First response: 24 results.
- Subsequent results: a `Load more` control backed by keyset pagination.

The cursor includes the sort key, immutable opportunity ID tie-breaker, filter hash, and contract version. Null placement is defined per sort. Activating `Load more` retains focus on the control, appends results without reordering prior items, announces the number added, and writes a restorable cursor/page state to browser history. Returning from detail restores the query, cursor, scroll position, and originating card focus.

A dense list view is a later addition. The quick-detail inspector is part of the first design because it lets users verify time-sensitive facts and reach the submission destination without losing their search position.

## 8. Opportunity card specification

### Card hierarchy

Every card should answer, in order:

1. What is it?
2. Who is it from?
3. When does it close?
4. What does it cost and what does it offer?
5. Can I trust the information?
6. Where can I submit or inspect more detail?
7. Do I want to track it?

### Required content

- Opportunity title
- Organization name
- Opportunity type
- Discipline or primary genre when known
- Deadline date and relative urgency, such as `Jul 31 · Today`, `Tomorrow`, or `12 days left`
- Fee status: `No fee`, exact fee, or `Fee not confirmed`
- Prize, grant, or compensation when reliably known
- One compact preference match in `For you`, such as `Matches Poetry · No fee`, with a `Why am I seeing this?` explanation
- Verification/freshness label
- `Go to submission` when a validated destination exists
- Track action or tracked state as a separate secondary control

### Optional content

- Organization mark or publication cover
- Location or remote status
- Closing-soon or recently-changed signal
- Length or submission limit

### Identity assets

- Use organization logos, publication marks, or covers when source rights and quality are acceptable.
- Use a typographic monogram fallback when no asset exists.
- Never use a blank placeholder box.
- Images use consistent aspect ratios and meaningful alternative text.
- Missing imagery must not change card height dramatically or reduce information access.

### Action model

- `Go to submission` is the primary action when the validated submission destination is available. It opens the official submission page in a new tab with the destination host in its accessible name.
- `View details` opens quick detail while preserving the result position; the title opens the canonical detail route.
- `Track` is a separate secondary action and never happens silently when the user leaves for the submission site.
- When tracked, the control becomes `Tracked` and remains operable for undo or Tracker navigation.
- The whole card title links to detail; the entire card is not one oversized link.
- `Follow organization` belongs on detail and organization surfaces, avoiding competing card actions.
- When a submission destination is missing, stale, unsafe, or changed, the card replaces `Go to submission` with `View details`; it never guesses a URL.

### Personalization boundary

Default browse cards and default detail surfaces show no Fit tier, manuscript name, `Ready to apply`, or personalized eligibility claim.

Tailoring explanations are allowed because they repeat explicit opportunity preferences, for example `Matches your Poetry and No fee preferences`. They must not become qualitative claims such as `Strong fit`, `Perfect for you`, or `Your poem aligns`.

Work-level Fit is a later, opt-in flow that begins with an explicit user action such as `Check against a work`. The user selects a Work or supplies criteria, sees exactly which data will be compared, and can remove that context. Only then may Missa use the existing tiers:

- Strong
- Possible
- Weak
- Not eligible
- Unknown

The tier must be paired with factual reasons, watchouts, disqualifiers, and missing data. `Not eligible` states the exact published rule and never implies a judgment about quality. This flow is not required for the first build.

### Trust presentation

Use human-readable evidence, for example:

- `Official page · details checked 4h ago`
- `Official source · checked Jul 30`
- `Needs verification`
- `Details changed Jul 29`

Never show the raw Radar trust score. Color supports the label but is not its only carrier.

### Provenance, verification, and freshness

These are separate signals and must not collapse into a score threshold:

- **Provenance:** `Official organization page`, `Partner feed`, `Directory`, or another named source class.
- **Confirmation:** `Organization confirmed` only when an authorized organization has affirmed the effective fact set.
- **Freshness:** `Details checked [time]` only after fetch, extraction, validation, and canonical processing succeed. A successful fetch followed by failed processing does not refresh this label.
- **Verified filter:** includes an organization-confirmed record, or a record from an official organization page that completed processing within policy, has no unresolved conflict or safety flag, and meets minimum required-field completeness.

Proposed freshness policy for the first build: official details closing within 30 days expire from `Verified` after 7 days without successful processing; other official details expire after 30 days. Organization-confirmed facts follow the same freshness clock unless the organization republishes or reconfirms them. The interface says what was checked and when; it never uses `Verified` to imply endorsement, legitimacy, quality, or guaranteed eligibility.

### Quick-detail inspector

Quick detail is the bridge between scanning and leaving Missa.

- Desktop: a right-side sheet wide enough for readable facts without covering the entire results grid.
- Mobile: a full-height sheet or canonical detail page; never a narrow desktop drawer squeezed onto a phone.
- Opening preserves the active filters, result order, scroll position, and originating card focus.
- Closing restores focus to the exact card or action that opened it.
- Browser history reflects the opened opportunity so Back closes quick detail before leaving the browse state.

The inspector contains, in this order:

1. Opportunity type, organization, title, and close state.
2. Exact deadline, relative urgency, and timezone or `Time not specified`.
3. Fee, prize, length/limit, location, and eligibility summary.
4. `Official page · checked [date/time]` provenance.
5. `What they ask for` requirements list.
6. `Go to submission` primary action and `Official guidelines` secondary action.
7. Track and report-issue utilities.

It must not contain invented personal summaries, manuscript names, readiness checkmarks, or `Why this is a strong fit` until the user deliberately enters the later Work-comparison flow.

## 9. Opportunity detail specification

The detail page is the decision surface. It should feel as calm and legible as the benchmark publication page while containing stronger evidence and next-step guidance.

### Above the fold

- Breadcrumb back to the preserved browse state
- Organization identity and opportunity type
- Title
- Status, deadline, and relative time
- Fee and prize or compensation
- Trust/freshness label
- `Go to submission` primary action when the destination is validated
- `Track` secondary action or tracked state
- `Follow organization` secondary action
- `Official guidelines` external action
- Optional organization mark or cover

### Core sections

#### Overview

- Plain-language summary
- Discipline and genres
- Location or remote requirement
- Open and close dates
- Fee, prize, funding, or compensation
- Simultaneous submission policy

#### At a glance

- Type, discipline, and genre
- Deadline and relative urgency
- Deadline timezone or explicit unknown state
- Fee and prize or funding
- Length, location, and submission method
- Source freshness and material changes

This is factual for every user. It does not change based on inferred personal context.

#### Eligibility

- Career stage
- Geography or residency
- Age, membership, student, publication-history, or identity requirements when explicitly stated
- Clear distinction between confirmed requirements and inferred keywords

#### What you will need

- Required works or samples
- File types or limits
- Statement, biography, proposal, references, budget, or CV
- Any requirement not yet confirmed

This section prepares for a future Library/checklist integration. It does not require FR29 to exist before the detail page ships.

#### Dates and process

- Opens
- Deadline and timezone when known
- Expected notification date when stated
- Expected response window when reliably derived
- Recently extended or changed dates with old and new values

#### Source and freshness

- Official source URL
- Last checked time
- Claimed or unclaimed organization status when useful
- What Missa extracted versus what the organization confirmed
- Material change history
- Report an issue action

#### About the organization

- Organization name and short factual summary
- Follow state
- Other currently open opportunities
- Link to an organization page when available

### Detail navigation

Use anchored sections for the first build. Add tabs only when each destination contains enough stable information to justify a separate view. Empty tabs should never ship.

### One-click official submission handoff

`Official guidelines` and `Go to submission` must:

- open the canonical source;
- clearly communicate that the user is leaving Missa;
- record an anonymous/product-safe outbound event without delaying navigation;
- never imply that Missa submitted the application;
- warn when the destination is unverified or recently changed.

Show the destination host beside each external action. `Official guidelines` opens the source of terms; `Go to submission` appears only when a distinct, validated submission URL exists. If both URLs are identical, show one `Open official page` action. Validate protocol and redirect destination at click time, block known-unsafe hosts, warn when the host changed since verification, and include new-tab behavior in the accessible name. If the source is unavailable, keep the detail page visible and replace the outbound action with a truthful unavailable state and issue-report path.

For a currently verified destination, the action is genuinely one click: no confirmation modal, no forced login, no mandatory tracking, and no artificial countdown. Missa may show a non-blocking `Did you submit?` check-in when the user returns, but it must not mark the item Submitted without explicit confirmation.

## 10. Saved searches

Saved searches turn one browsing session into a persistent Radar.

### Creation

`Save search` opens a compact dialog prefilled from the current URL state.

Required fields:

- Name
- Included criteria summary

Optional first-release setting:

- Include in digest

The dialog should not require the user to rebuild filters that are already active.

### Management

Users can:

- open a saved search;
- rename it;
- edit its criteria;
- include or exclude it from digest;
- delete it with recoverable confirmation;
- see when it last produced new results.

### Criteria coverage

The UI should expose the capabilities already present in `MatchCriteria`:

- types;
- genres;
- keywords;
- maximum fee or no-fee-only;
- verified-only;
- deadline window;
- locations;
- simultaneous-submission requirement.

Discipline and career stage should be added only with a clear canonical data model; they should not be stored as ambiguous keyword substitutions.

### Later intelligence

Natural-language discovery may later interpret a request such as “fully funded poetry residencies in Europe closing this autumn.” It must always show the resulting structured criteria, let the user correct them, and never silently invent eligibility.

## 11. Authentication and continuation

Browse and detail should be public. Personalization and mutation require authentication.

### Signed-out behavior

- Default category is `All`.
- Cards show factual information and freshness with no personalized Fit tier.
- A validated `Go to submission` action works without authentication.
- Track, save search, and follow open authentication with a clear reason.
- The full return URL and intended action are preserved.
- After authentication, Missa completes or resumes the requested action once, with confirmation.

Continuation uses a signed, expiring, one-use intent with an allow-listed internal return path, server-side action parameters, CSRF/origin protection, and an idempotency key. Missa revalidates the opportunity and action after authentication. If the deadline, publication state, or destination materially changed, it asks the user to confirm rather than replaying silently. Cancelled, expired, already-completed, and multi-tab attempts return to a safe internal page with a clear explanation.

### Signed-in behavior

- Default category is `For you` once the user has supplied enough explicit opportunity preferences; otherwise Missa uses `All` and offers a lightweight preference setup without blocking browse.
- `For you` ranks by those preferences, saved searches, deadline urgency, and followed organizations—not by an inferred manuscript Fit.
- Personal criteria and match reasons never appear in public URLs or metadata.

## 12. Tracking and following

### Track flow

1. User selects `Track`.
2. Button enters a short pending state without layout shift.
3. The item is created idempotently with the approved initial planning status.
4. Button becomes `Tracked`.
5. A toast confirms `Added to Tracker` with `View Tracker` as a supporting action.

Tracking should not force the user to choose a status, list, work, or reminder first. Those are progressive enhancements inside Tracker.

The product vocabulary target is `Interested`; the current engine creates `saved`. Phase 0 must choose one invariant and migrate the domain, persisted records, analytics, and UI together. Until that decision is complete, implementation must not silently relabel only the button response.

`Tracked` is a persistent state, not an ambiguous combined action. Detail exposes separate `View in Tracker` and `Stop tracking` actions. Stopping tracking must explain whether history is archived or removed; the recommended behavior is to archive personal history. Closed opportunities may still be tracked for history or reopening alerts, but the interface must not present that as an active application.

Track, Follow, and Save Search each define pending, success, retryable failure, permanent failure, duplicate, authentication-expired, and rollback states. Errors remain associated with the initiating control, preserve input, prevent duplicate submission, and provide a retry. Toasts support confirmation but never replace the persistent resulting state.

Tracking and outbound submission remain separate. `Go to submission` never creates or updates a Tracker item. When a user returns from the official site, an optional check-in may offer `I submitted`, `Not yet`, and `Dismiss`; only `I submitted` changes personal status.

### Follow flow

1. User selects `Follow organization` on detail.
2. Missa confirms the organization and what follow means.
3. State updates to `Following`.
4. Alerts from that organization become eligible for the digest.

Following an organization and tracking one opportunity are distinct and must not be bundled silently. Follow does not silently enable email. The confirmation states which in-app or digest surfaces may change; delivery channel, cadence, timezone, pause, unsubscribe, and deduplication are configured explicitly before any outbound notification.

## 13. States and edge cases

| State | Required behavior |
| --- | --- |
| Initial loading | Structure-matched skeletons; no full-page spinner |
| Filter refresh | Preserve existing results until replacement is ready; show subtle progress |
| No corpus | Explain that no open opportunities are available in the category |
| Zero matches | Name the active criteria, offer removable suggestions, and retain the query |
| Search error | Preserve criteria and provide retry |
| Invalid URL criteria | Ignore unsafe/unknown values, retain valid criteria, and explain what was removed |
| Rate limited | Retain state, state when retry is possible, and do not imitate zero results |
| Service maintenance | Distinguish unavailable data from an empty corpus and provide retry |
| Missing image | Show a typographic organization identity, never a broken box |
| Unknown fee | Say `Fee not confirmed`, not `Free` |
| Rolling deadline | Say `Rolling` and explain what is known |
| Timezone unknown | State that the official source controls the cutoff |
| Closing soon | Use urgency only inside the configured threshold |
| Deadline changed | Show old and new dates and the check time |
| Closed during session | Disable `Go to submission`; keep Track available for history when appropriate and explain the closure |
| Duplicate opportunity | Resolve to the canonical detail page |
| Needs verification | Keep the uncertainty visible beside affected facts |
| Not eligible | Explain the exact disqualifier and allow the user to inspect the source |
| Personal Fit not requested | Omit Fit entirely; do not display `Unknown fit` |
| Already tracked | Show tracked state and a route to Tracker |
| Submission destination missing | Replace outbound CTA with `View official guidelines` and report-issue path |
| Submission destination changed | Warn with the old and new host before navigation until reverified |
| Returned from external submission | Offer a non-blocking explicit status check-in; never infer completion |
| Signed out action | Preserve browse state and action through authentication |
| Offline or interrupted | Preserve search input and avoid false success states |
| Detail missing or withdrawn | Explain the record state, return focus to browse, and suggest current results |
| Session expired | Preserve non-sensitive state and restart authentication safely |
| Action failure | Keep the initiating control and error together; offer retry or reversal |
| Issue report failure | Retain the report content and provide a safe retry |

Dates use machine-readable values in markup and localized visible formats. Exact date-time and timezone are available in supporting text. A date-only deadline is inclusive of that calendar date but must not invent an hour or timezone; the UI says `Time not specified` and defers the cutoff to the official source. `Soonest deadline` sorts exact dates first with immutable ID tie-breaking, followed by rolling, until-filled, and unknown deadlines. Conflicting deadlines cannot qualify for public browse until resolved.

## 14. Responsive behavior

### Desktop

- Maximum content width follows the Passport layout system.
- Category navigation may scroll horizontally before wrapping into multiple lines.
- Search spans the available content width.
- Filters form a single clear toolbar where space allows.
- Results use three columns at wide widths.
- Quick detail opens as a right-side sheet and leaves enough browse context visible to orient the user.

### Tablet

- Results use two columns.
- Less common filters move into `All filters`.
- Sort and result count remain visible.

### Mobile

- Results use one column.
- Category navigation scrolls horizontally with visible overflow cues.
- Search remains at the top of the browse controls.
- Filters open in an accessible bottom sheet.
- The sheet has `Clear` and `Show N results` actions.
- Detail sections become one column.
- A sticky bottom `Go to submission` action is acceptable only if it does not cover content, browser controls, or accessibility zoom; Track remains available as a secondary action.
- At 320 CSS pixels and at 200 percent text resize, the page retains all content and controls without two-dimensional page scrolling.
- Bottom actions account for safe-area insets, the virtual keyboard, and focused content.

## Design package: required screens and interactions

Before implementation, the Opportunities design package must cover the following connected surfaces. These are design frames and interaction states, not necessarily separate routes.

### A. Foundation boards

1. **Opportunity taxonomy and content model** — type, discipline, genre, status, fee, prize, deadline, eligibility, requirements, source, and explicit unknown labels.
2. **Deadline language and urgency scale** — Today, Tomorrow, days left, date-only, exact date-time, timezone unknown, Rolling, Until filled, Extended, Closed, and Conflicting.
3. **Opportunity card anatomy** — with image, monogram fallback, no fee, paid fee, prize, missing fields, tracked, closing today, and destination unavailable.
4. **Action hierarchy** — `Go to submission`, `View details`, `Track`, `Official guidelines`, `Follow organization`, and `Report an issue` across browse, quick detail, and full detail.
5. **Source and freshness language** — official page, partner feed, organization confirmed, recently checked, stale, changed, and needs verification.
6. **Tailoring model** — the opportunity types, disciplines, genres, locations, fees, career stages, and deadline preferences users can select, inspect, change, or clear.

### B. Desktop frames

1. Signed-in browse default: `For you`, Recommended, populated grid, and visible tailoring explanation.
2. Category state: Contests selected with deadline-first cards.
3. Search state: query entered, results updating, active query visible.
4. Filter popover: one open filter with selected and clear states.
5. Multi-filter state: active chips, result count, sort, and Save search.
6. Quick-detail inspector: factual overview and one-click submission handoff.
7. Full opportunity detail: long-form decision surface and anchored sections.
8. Saved-search dialog: prefilled criteria, naming, digest choice, success, and error.
9. Track mutation: idle, pending, tracked, retry, and View Tracker.
10. External destination changed or unverified warning.
11. Returned-from-submission check-in with explicit status choices.
12. Zero results with criteria recovery.
13. Loading and filter-refresh states without layout shift.
14. Service error, withdrawn opportunity, and unavailable submission destination.
15. Preference setup and edit state, including insufficient preferences and widened results.

### C. Mobile frames

1. Browse list with horizontally scrollable categories.
2. Search focused with the virtual keyboard accounted for.
3. Filter trigger with active count.
4. Full-height filter sheet with draft selections and `Show N results`.
5. Opportunity quick detail/full detail with factual hierarchy.
6. Sticky `Go to submission` plus secondary Track action.
7. Saved-search and authentication continuation sheets.
8. Zero, error, deadline-changed, and destination-unavailable states.
9. Mobile preference setup and `Why am I seeing this?` disclosure.

### D. Later opt-in personalization frames

These are designed after the facts-first loop is validated and are not part of the first implementation:

1. `Check against a work` entry point.
2. Work selector with clear data-use explanation.
3. Comparison result with reasons, watchouts, hard disqualifiers, and missing facts.
4. Requirements/readiness checklist based on actual selected files and answers.
5. Clear or switch Work state.

### E. Interaction prototypes

The following behaviors need clickable or motion prototypes, not static frames alone:

| Interaction | Required behavior | Motion budget |
| --- | --- | --- |
| Category change | Active underline moves, results preserve stable layout, result count updates | 120–180ms |
| Tailoring explanation | `Why am I seeing this?` reveals matched preferences and an Edit preferences action | 180ms |
| Search | Debounced results, Enter submission, clear control, URL update | No decorative delay |
| Filter popover | Opens from trigger, keyboard selection, Escape close, focus return | 180ms |
| Mobile filter sheet | Draft vs applied state, trapped focus, swipe/close parity, `Show N results` | Up to 280ms |
| Card hover/focus | Border and action emphasis only; no lift, tilt, or spring | 120ms |
| Quick detail | Sheet enters, URL/history updates, background remains oriented, focus moves to title | Up to 280ms |
| Track | Pending label without width shift, persistent tracked state, toast with Tracker link | 120–180ms |
| Save search | Prefilled dialog, inline validation, success state, focus restoration | Up to 280ms |
| Go to submission | Immediate verified navigation in a new tab; no blocking animation | Immediate |
| Return check-in | Non-blocking reveal; explicit status mutation only after user choice | 180ms |
| Load more | Append without reordering; announce count; preserve focus | 180ms max |
| Deadline change | Old/new values disclose calmly; no flashing or looping pulse | 180ms |

Interior-style interaction references may inform the sheet, morphing action state, animated underline, filter disclosure, and toast choreography. They must be adapted to Missa's existing shadcn primitives, semantic tokens, reduced-motion rules, and restrained motion language; no third-party flourish is adopted merely because it is available.

### F. State matrix that must be signed off

Every primary component must be reviewed in default, hover, focus-visible, pressed, disabled, loading, success, retryable error, permanent error, signed-out, and reduced-motion states. Data-bearing components additionally need known, unknown, stale, changed, closed, and conflicting states. Desktop approval alone does not complete a component.

### G. Design sequence

1. Approve foundations: taxonomy, tailoring model, deadline language, card anatomy, and action hierarchy.
2. Design browse, search, filters, and result states.
3. Design quick detail and full detail together so facts and actions remain consistent.
4. Prototype `Go to submission`, Track, Save search, history/focus restoration, and return check-in.
5. Complete mobile, accessibility, and adverse-state passes.
6. Validate the facts-first loop before designing opt-in Work comparison.

## 15. Visual design direction

This surface follows the root `DESIGN.md`.

### Canvas and color

- Primary canvas: true white `#ffffff`.
- No paper, cream, or beige page tint.
- Neutral surfaces and borders provide structure without turning every object into a card.
- Missa terracotta is reserved for the primary action, active state, or one meaningful emphasis.
- Green is reserved for verified or positive states.
- Closing-soon urgency is not styled as a generic error.

### Typography

- Instrument Sans for interface and body copy.
- Fragment Mono for dates, amounts, and compact data where alignment matters.
- Fraunces only for an exceptional major statement; it should not make every card feel editorial.

### Shape and elevation

- Cards use consistent restrained radii.
- Borders are subtle and elevation is rare.
- Hover states clarify interactivity without making the grid visually noisy.
- Dividers, spacing, and alignment do most of the organizational work.

### Density

Passport is calmer than Workspace, but browse is not a marketing page. Cards should be compact enough to compare while leaving one unmistakable reading path.

## 16. Accessibility requirements

- Meet WCAG 2.1 AA at minimum.
- Use a logical heading hierarchy and one page-level `h1`.
- Give every filter a persistent accessible name.
- Support full keyboard operation for search, categories, filters, sorting, dialogs, cards, and pagination.
- Maintain visible focus treatment on white and tinted surfaces.
- Do not communicate trust, status, urgency, or any later Fit result through color alone.
- Announce changed result counts through a polite live region without interrupting typing.
- Restore focus after closing filter or saved-search dialogs.
- Give every pointer target either a 44 by 44 CSS pixel target or sufficient spacing to meet WCAG 2.2 target-size exceptions; this includes chips, close buttons, pagination, and icon actions.
- Respect text enlargement to 200 percent without clipped filters or card actions.
- Mark decorative images appropriately and write useful alternative text for informative marks or covers.
- Avoid nested interactive controls inside a card-wide link.
- Provide reduced-motion behavior for loading, sorting, and state transitions.
- Use ordinary links with `aria-current="page"` for category navigation. Focused categories scroll into view without requiring a swipe gesture.
- Mark changing results `aria-busy`; announce one result summary after debounce settles, not on every keystroke.
- In reduced-motion mode, remove shimmer, parallax, auto-scroll, and animated result reordering.
- Verify text contrast at 4.5:1, large text at 3:1, and focus indicators and meaningful non-text controls at 3:1. Test forced-colors mode.

## 17. Data and service requirements

The current page reads all active opportunities from the engine store, maps them in memory, and sorts by deadline. That is sufficient for a minimal authenticated feed, not for a public searchable directory.

### Query service

Add an authoritative opportunity query boundary that supports:

- text search;
- category/type;
- discipline and genre;
- location;
- fee range and no-fee-only;
- verified-only;
- deadline window;
- simultaneous-submission policy;
- status;
- sort;
- cursor or page;
- authenticated user context for explicit opportunity tailoring, tracked, and following state; later opt-in Work comparison is a separate request.

Filtering, sorting, and pagination must happen server-side. Do not send the whole corpus to the browser.

The production query path must read a row-level repository, not materialize `RadarEngine.store` or raw snapshots per request. Add queryable columns and indexes for publication state, type, discipline/genre, deadline, fee, location, verification evidence, public search document, and canonical identity.

### Response boundaries

Define three contracts rather than one optional mixed response:

- `OpportunityBrowseDTO` contains only the required public fields for result cards and explicit unknown states.
- `OpportunityDetailDTO` adds eligibility, requirements, provenance, safe change history, organization context, and external destinations.
- `OpportunityPersonalStateDTO` contains explicit tailoring explanations plus tracked/following state resolved exclusively from the authenticated session.
- A later `OpportunityWorkComparisonDTO` contains Fit explanations only after an authenticated user explicitly selects a Work.

Public HTML, metadata, and DTOs are cacheable only when they contain no personalization. Authenticated augmentation is private and `no-store`, or is loaded through a separate private request. Crawlers receive only the public projection. Automated tests render the same opportunity for two accounts and an anonymous visitor to prove criteria, tracking, following, and any later explicit Work comparison do not cross boundaries.

### Public opportunity DTO

The browse/detail response may include:

- canonical id and slug;
- title and organization identity;
- public status;
- type, discipline, and genres;
- open date and deadline;
- fee and prize;
- location;
- eligibility summary;
- requirements summary;
- canonical source URL;
- public freshness and trust explanation;
- optional authenticated tracked/following state.

It must not expose:

- raw trust, confidence, or freshness scores;
- internal suspicious-language signals;
- unmoderated extraction conflicts;
- private user criteria;
- organization or user contact data not intended for publication;
- adapter or infrastructure details.

### Derived presentation fields

Create one shared presentation boundary for:

- deadline label and relative days;
- fee label;
- compensation label;
- public status label;
- freshness label;
- identity fallback;
- canonical browse URL.

Browse and detail must not independently reinterpret the same facts.

### Validation and persistence boundaries

- Validate request parameters and public responses through shared contracts.
- Preserve `@missa/db` as the database/migration authority.
- Treat legacy or snapshot stores as compatibility boundaries during migration, not as a second schema authority.
- Rehearse any data-model migration on disposable data before applying it to a live corpus.
- Keep Track and Follow writes idempotent.

The current whole-store Postgres compatibility writer is not the target for public query or concurrent user mutations. Phase 0 requires an expand/backfill/verify/cutover/contract plan under `@missa/db`:

1. Add authoritative relational tables, constraints, and indexes without removing compatibility reads.
2. Backfill queryable opportunity projections and user mutation records from current stores.
3. Verify counts, canonical identities, statuses, and representative queries on a disposable database copy.
4. Dual-read or shadow-read and compare before switching public queries.
5. Move Track, Follow, and Saved Search writes to transactions with composite uniqueness constraints and `INSERT ... ON CONFLICT` semantics.
6. Add transactional audit/outbox events where downstream digest or analytics delivery depends on a write.
7. Remove compatibility authority only after rollback and reconciliation are proven.

### Data gaps to resolve

- Canonical discipline separate from genre.
- Career-stage eligibility as structured data.
- Opportunity and organization slugs.
- Organization identity asset rights, source, dimensions, and fallbacks.
- Deadline timezone and rolling-deadline semantics.
- Confirmed versus inferred field provenance.
- Public-safe change history.
- Typed eligibility operators, normalized jurisdictions, provenance, confidence, and rule versions.
- A publication-safety state independent of ingestion status.
- A canonical verification evidence policy independent of trust score.

## 18. Search, indexing, and SEO

- Server-render the public browse and detail routes.
- Give every opportunity a stable canonical URL.
- Generate factual title, description, and social metadata.
- Use indexable category landing states.
- Mark arbitrary personal or deeply filtered query URLs as non-canonical or `noindex` where appropriate.
- Add structured data only where the chosen schema accurately represents the opportunity; do not force all types into a misleading job or event schema.
- Preserve an opportunity detail page after closure, with status and archival context, when the source remains trustworthy.
- Redirect duplicate records to their canonical opportunity.

Canonical detail URLs use the immutable opportunity ID as identity and an optional readable slug, for example `/opportunities/[id]/[slug]`. Slug changes create aliases and redirect to the current canonical form; duplicate IDs redirect to the canonical opportunity ID. The ID never changes when a title or organization name changes.

## 19. Performance requirements

Targets for representative production data and a mid-tier mobile device:

- LCP at or below 2.5 seconds at the 75th percentile.
- CLS below 0.1.
- Search/filter feedback begins within 100 ms.
- Common filter results settle within 500 ms when served from a warm region/cache.
- First browse response contains no more data than the initial result set needs.
- Identity images are correctly sized, lazy-loaded below the fold, and never block text.
- Personal tracked/following augmentation is batched so an authenticated page does not perform one storage round-trip per card.

The benchmark harness must record corpus size, filter cardinality, concurrent requests, region/database distance, and cache state. Budgets are measured separately for database query, server render, response transfer, and client hydration. Query fixtures include `EXPLAIN ANALYZE` evidence for common and worst-case filter combinations.

## 20. Analytics and product learning

### Events

- `opportunities_viewed`
- `opportunity_category_selected`
- `opportunity_search_submitted`
- `opportunity_filter_changed`
- `opportunity_sort_changed`
- `opportunity_tailoring_explanation_opened`
- `opportunity_preferences_updated`
- `opportunity_zero_results`
- `trust_explanation_opened`
- `opportunity_tracked`
- `organization_followed`
- `saved_search_created`
- `saved_search_opened`
- `official_guidelines_opened`
- `official_submission_opened`
- `submission_return_checkin_shown`
- `submission_return_status_confirmed`
- `opportunity_issue_reported`
- `auth_continuation_started`
- `auth_continuation_completed`

### Product metrics

- Browse-to-detail rate
- Browse-to-official-submission rate
- Detail-to-official-submission rate
- Search-to-official-submission rate
- Detail-to-track rate
- Time to first official-submission outbound
- Saved-search creation rate
- Preference setup completion and edit rate
- Saved-search return rate
- Zero-result rate by category and criterion
- Official-guideline outbound rate
- Official-submission destination error rate
- Returned-from-submission status-confirmation rate
- Authentication continuation completion
- Track completion error rate

### Analytics constraints

- Do not record raw private profile fields.
- Avoid storing raw free-text searches longer than necessary; redact obvious personal information.
- Do not record selected Work content or later Fit reason text without explicit approval and a documented retention policy.
- Separate signed-out browsing from signed-in personalization analysis.

## 21. Content guidelines

- Use plain industry nouns.
- Prefer `No fee` to `Free`.
- Prefer `Fee not confirmed` to guessing.
- Prefer `Official source` to vague `Source`.
- Prefer `Checked 4 hours ago` to raw timestamps in primary UI.
- Prefer `Not eligible: applicants must live in Canada` to `Low fit`.
- Prefer `No opportunities match these filters` to `Nothing here`.
- Avoid “perfect match,” “guaranteed,” “best,” or other claims the engine cannot prove.
- Treat extracted summaries as factual condensations, not promotional rewrites.

## 22. Safety, privacy, and integrity

- Sanitize all source-derived content before rendering.
- Allow-list or validate external protocols and canonical URLs.
- Add `noopener` and `noreferrer` where appropriate for external navigation.
- Never expose an applicant's saved criteria, eligibility attributes, or tracking state publicly.
- Distinguish organization-confirmed facts from Radar interpretations.
- Give users a visible way to report incorrect, discriminatory, fraudulent, or expired listings.
- Preserve an audit trail for material opportunity changes and organization overrides.
- Do not convert weak extraction confidence into confident user-facing prose.
- Never infer protected or sensitive user attributes. Display only explicit published requirements; personalize against sensitive data only when the user knowingly supplies it and can inspect, correct, or remove it.

### Issue reporting

The first report flow is deliberately small: signed-in users choose `Incorrect details`, `Closed or expired`, `Unsafe or suspicious`, or `Other`, may add a short note, see a privacy warning, and receive a reference/confirmation state. It accepts no file upload in the first build. Reports are rate-limited, deduplicated, audited, and routed to moderation; suspected fraud can immediately suppress the outbound destination pending review. Users can see that a report was received, but not private moderation notes.

## 23. Component scope

### New or substantially revised components

- `OpportunityBrowseHeader`
- `OpportunityCategoryNav`
- `OpportunitySearch`
- `OpportunityFilterBar`
- `OpportunityFilterSheet`
- `ActiveCriteria`
- `OpportunityResultsToolbar`
- `OpportunityGrid`
- `OpportunityCard`
- `OpportunityIdentity`
- `OpportunityDeadline`
- `OpportunityFee`
- `OpportunityTailoringReason`
- `OpportunityTrustSummary`
- `OpportunityQuickDetail`
- `OpportunityDetailHeader`
- `OpportunityFacts`
- `OpportunityEligibility`
- `OpportunityRequirements`
- `OpportunitySourceHistory`
- `OfficialSubmissionLink`
- `SubmissionReturnCheckIn`
- `DeadlineChangeNotice`
- `OrganizationSummary`
- `SavedSearchDialog`
- `SavedSearchManager`
- `OpportunityPreferenceSetup`
- `TrackButton`
- `FollowButton`

### Shared primitives

- Button
- Badge
- Tabs or horizontal navigation
- Select/combobox
- Popover
- Dialog
- Sheet
- Checkbox
- Radio group
- Skeleton
- Empty state
- Toast
- Tooltip
- Pagination

Components should use semantic tokens and variants from the design system. Opportunity-specific components should not introduce one-off hex values, spacing scales, or status vocabulary.

## 24. Suggested implementation boundaries

Exact paths may change during implementation, but responsibility should remain clear.

```text
apps/web/app/(passport)/opportunities/page.tsx
apps/web/app/(passport)/opportunities/[opportunityId]/[slug]/page.tsx
apps/web/components/opportunities/opportunity-browse-header.tsx
apps/web/components/opportunities/opportunity-category-nav.tsx
apps/web/components/opportunities/opportunity-filter-bar.tsx
apps/web/components/opportunities/opportunity-filter-sheet.tsx
apps/web/components/opportunities/opportunity-card.tsx
apps/web/components/opportunities/opportunity-grid.tsx
apps/web/components/opportunities/opportunity-quick-detail.tsx
apps/web/components/opportunities/opportunity-detail.tsx
apps/web/components/opportunities/official-submission-link.tsx
apps/web/components/opportunities/submission-return-check-in.tsx
apps/web/components/opportunities/saved-search-dialog.tsx
apps/web/lib/opportunities/query.ts
apps/web/lib/opportunities/presentation.ts
apps/web/e2e/opportunities.spec.ts
packages/contracts/src/opportunities.ts
```

The query and presentation layers should remain testable without rendering React. Page components should orchestrate authenticated/public context rather than contain corpus filtering logic.

## 25. Delivery phases

### Phase 0 — Data and contract foundation

- Confirm taxonomy and URL parameter contract.
- Confirm the explicit tailoring preference contract and its relationship to saved searches.
- Create the server-side query boundary.
- Define a public-safe opportunity DTO.
- Add stable opportunity detail identifiers.
- Centralize display labels for deadline, fee, compensation, and freshness.
- Add query and DTO tests.
- Add publication-state, verification-evidence, field-provenance, and typed-eligibility contracts.
- Complete the `@missa/db` expand/backfill/cutover design and rehearse it on disposable data.
- Choose and migrate the initial Tracker status invariant.

**Exit:** the application can query a deterministic, paginated, publication-safe result set without loading the whole corpus into the page; concurrent user mutations no longer depend on whole-store replacement.

### Phase 1 — Browse that works

- Public browse route with signed-in enhancement.
- `For you` ranking and plain-language tailoring reasons from explicit preferences.
- Lightweight preference setup, edit, clear, and insufficient-preference states.
- Category navigation.
- Search.
- Visible filters and mobile filter sheet.
- Sort, result count, active criteria, and URL persistence.
- Responsive opportunity grid and cards.
- Validated one-click `Go to submission` action on cards.
- Track continuation and tracked state.
- Loading, empty, zero-result, error, and missing-image states.
- Keyboard, focus, zoom/reflow, live-result announcement, and modal-filter acceptance tests.
- Public/private cache-isolation tests.

**Exit:** a user can find a credible opportunity and open its validated official submission destination on desktop or mobile using pointer, keyboard, or the supported screen-reader path; tracking remains available as a separate action.

### Phase 2 — Decision-quality detail

- Public detail route.
- Browse-preserving quick-detail inspector.
- Eligibility, requirements, fee/prize, dates, and location.
- Explained freshness/trust and source provenance.
- Organization context, follow, and other open opportunities.
- Official-guideline, `Go to submission`, return check-in, and issue-reporting actions.
- Closed, changed, uncertain, and duplicate states.
- Keyboard and screen-reader coverage for detail, outbound handoff, Track, Follow, and report flows.
- External destination, continuation-intent, and issue-report safety tests.

**Exit:** a user can decide whether an opportunity deserves preparation time without guessing about core facts.

### Phase 3 — Persistent discovery

- Save the current search.
- Full criteria editing and management.
- Digest inclusion.
- Saved-search return/new-result indicators.
- Stronger `For you` composition from saved searches, followed organizations, and recent relevant changes.
- Saved-search validation, stale-criteria migration, failure recovery, pause/delete undo, and consent tests.

**Exit:** a user can create a repeatable Radar and return to newly relevant opportunities.

### Phase 4 — Quality and learning

- Accessibility audit and keyboard QA.
- Production analytics.
- SEO/canonical behavior.
- Performance tuning with representative corpus size.
- Responsive visual QA.
- Content and trust-language QA.

**Exit:** the experience passes full regression and production-readiness validation and can support product learning. Accessibility, privacy, security, performance, and observability are incremental exit criteria in every earlier phase; Phase 4 is not their first review.

### Release boundaries

- **First shippable slice:** Phases 0–2. This is the launch-critical loop: public browse → trustworthy quick/full detail → official submission handoff, with optional authenticated Track.
- **Opportunities 1.0:** adds Phase 3 persistent discovery and Phase 4 production regression/learning instrumentation.
- **Post-1.0:** contains the later opportunities listed below.

No phase may ship by treating accessibility, privacy isolation, publication safety, or mutation correctness as later polish.

### Later opportunities

- Natural-language search with visible interpreted criteria.
- Grid/list density switch.
- Calendar-aware filters.
- Preparation checklist and Library handoff.
- Personalized explanations learned from explicit user corrections.
- Explicit Work comparison and readiness after Library foundations exist.
- Organization profile expansion.
- Recently viewed and compare workflows.

## 26. Explicitly out of scope for the first build

- Community ratings, vibes, comments, or reviews
- Notes on organizations
- Paid search quality tiers
- AI-only or conversational search
- Native mobile applications
- In-Missa application submission
- Default or inferred manuscript Fit and readiness claims
- Work comparison before the user explicitly selects a Work or supplies criteria
- Full Library or preparation checklist
- Custom opportunity lists
- Real-time push alert configuration
- Dark mode
- Organization administration or claim redesign
- Public applicant profiles
- A full organization profile redesign
- User-visible raw trust or fit scores
- Unauthenticated issue reporting or evidence uploads
- Automatic email delivery when a user follows an organization

## 27. Acceptance criteria

### Browse

- A signed-out visitor can browse and open public opportunity details.
- Search, category, filters, and sort reproduce through the URL.
- Desktop, tablet, and mobile layouts meet the defined result density.
- No filter combination requires downloading the complete corpus.
- Zero-result states identify active criteria and provide a clear recovery path.
- Default results contain only `published` opportunities in the documented public status set.
- `Verified` filter results satisfy the evidence and freshness predicate; expiring the predicate removes the label/filter inclusion without hiding the factual record.
- An eligible signed-in user defaults to `For you`; a signed-out user or user without sufficient preferences defaults to `All` and `Soonest deadline`.
- Every tailored result can explain which explicit preference or saved search caused it to appear.
- Users can inspect, edit, or clear the preferences used for tailoring.
- No default card claims manuscript-level Fit.

### Cards

- Every card shows title, organization, type, deadline state, fee state, freshness/trust, official-submission availability, and Track state.
- Cards in `For you` may show a factual preference match but never a qualitative manuscript judgment.
- No Fit label, manuscript name, or readiness state appears until the user explicitly starts the later Work-comparison flow.
- An unknown fee is never presented as no fee.
- Missing identity imagery has a polished fallback.
- Card title, `Go to submission`, Track, and supporting actions have non-conflicting accessible interaction targets.

### Detail

- The quick-detail and full-detail surfaces distinguish factual opportunity data from source provenance.
- Eligibility and required materials are readable without opening accordions one by one.
- The official source and last check are visible.
- Deadline changes show old and new values when available.
- No visitor receives a fabricated Fit or readiness claim.
- Closed and uncertain listings remain truthful and navigable.

### Actions

- Track and Follow are idempotent.
- A validated `Go to submission` action works in one click without authentication, forced tracking, or a confirmation modal.
- The outbound action clearly opens the official destination and never marks the application Submitted.
- A return check-in updates status only after explicit user confirmation.
- A signed-out action resumes after authentication without losing browse state.
- A successful Track creates the approved initial Tracker status exactly once and reports whether the record was created or already existed.
- Saved searches preserve all supported criteria and can be edited or deleted.

### Quality

- Automated tests cover query parsing, filter combinations, sort, pagination, public/private DTOs, and action continuation.
- End-to-end tests cover signed-out browse, filtering, quick detail, full detail, official submission handoff, tracking, return check-in, and saved search creation.
- Keyboard-only and screen-reader smoke tests pass for the primary journey.
- `git diff --check`, targeted lint, typecheck, and relevant tests pass.
- Production-like corpus testing meets the performance targets.
- Supported accessibility matrix: latest Chrome keyboard-only; latest Safari with VoiceOver on macOS; mobile Safari with VoiceOver for browse, filter, quick detail, full detail, official submission handoff, and Track. Record focus order/restoration, names, states, errors, announcements, reflow at 320 CSS pixels, and 200 percent text resize with zero keyboard traps.
- Concurrency tests prove Track, Follow, and Save Search survive simultaneous writes without duplication or lost updates.
- Security tests cover malicious query parameters, unsafe external URLs, CSRF/origin failure, replayed continuation intents, and public/private cache isolation.

## 28. Key risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Taxonomy grows inconsistent across verticals | Establish canonical type/discipline/genre definitions before adding UI aliases |
| Browse feels impressive but facts are incomplete | Make uncertainty explicit and prioritize completeness of decision fields |
| Product implies knowledge of the user's work | Omit Fit by default; require explicit Work selection before any comparison |
| Public access leaks personal context | Separate public DTOs and metadata from authenticated enhancement |
| Images introduce rights or quality problems | Record source/rights and keep a strong typographic fallback |
| In-memory filtering fails at corpus scale | Build the query boundary before the polished browse layer |
| `Verified` becomes misleading as data ages | Tie the label to source, check time, provenance, and freshness rules |
| Submit, Track, save, and follow compete | Use `Go to submission` as the outbound action, Track as personal continuity, Follow at organization scope, and Save search at query scope |
| One-click handoff is mistaken for completed submission | Use `Go to submission`, show destination host, never auto-update status, and require explicit return confirmation |
| Broad first release delays value | Hold natural language, alternate density views, community features, and full Library handoff for later |
| Data migration destabilizes Radar | Preserve the database authority and compatibility boundary; rehearse cutovers |

## 29. Recommended defaults to approve

Unless product review changes them, implementation should proceed with these defaults:

1. Public browse and public opportunity detail; authentication only for personal actions.
2. `For you` as the eligible signed-in default, tailored from explicit opportunity preferences and saved searches; `All` for signed-out or insufficient-context states.
3. Category-led three-column browse, a right-side quick-detail inspector, and a dedicated detail route.
4. Type, discipline/genre, location, fee, and deadline as visible filters.
5. Open now, Verified, and No fee as quick toggles.
6. `Go to submission` as the primary validated outbound action; Track as personal continuity; Follow as the organization action.
7. Structured URL-based search before natural-language interpretation.
8. Optional organization imagery with a first-class typographic fallback.
9. Quick detail for fast decisions and anchored full-detail sections before tabs.
10. A server-side query foundation before visual implementation.
11. A separate publication-safety state and a strict evidence-based `Verified` predicate.
12. Immutable-ID canonical detail URLs with readable slugs.
13. Keyset-backed `Load more` pagination for the first build.
14. Explain every tailored result through user-controlled preferences; no manuscript Fit or readiness claim before explicit Work selection.
15. Phases 0–2 as the first shippable slice; saved-search persistence completes Opportunities 1.0.

## 30. Definition of the first complete build

The first shippable build is complete when a signed-in user receives credible submission opportunities tailored to preferences they control, understands why each result appeared, sees the source and deadline, and opens the official submission page in one click. Signed-out visitors retain a useful public `All` browse, and anyone may optionally Track an opportunity after signing in. Saved-search creation and management complete Opportunities 1.0 in Phase 3. Work-level Fit and readiness remain a later explicit flow.

That is the smallest version that establishes Missa's real advantage. Anything less is a styled directory; anything materially larger risks delaying the core loop.
