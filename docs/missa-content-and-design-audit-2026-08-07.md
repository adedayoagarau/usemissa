---
title: Missa Content and Design Audit
status: implementation-backed audit
audited: "2026-08-07"
baseline: live production and repository source
style_standard: ./missa-content-style-guide.md
---

# Missa content audit, overhaul, and design recommendations

## Executive decision

Missa already has the beginnings of a distinctive product: quiet editorial design, serious respect for creative work, and a visible evidence model. The main problem was not a lack of personality. It was inconsistency between that promise and the words or interactions people met across the product.

This pass establishes one writing system and applies it to the highest-value public, creator, organization, and lifecycle surfaces. It removes unsupported certainty, replaces internal implementation language, standardizes opportunity evidence, gives errors and empty states a useful next step, and clarifies the relationship between Profile and Organization.

The product should now move toward one design principle:

> **A calm working surface where the fact, its source, its limitation, and the next useful action stay together.**

The remaining priority is structural design work, especially on mobile opportunity discovery and the consistency of public navigation. Copy can reduce confusion; it cannot make a filter wall, low-quality source record, or fragmented shell disappear.

## Status key

- **Implemented:** changed in the repository in this overhaul.
- **Recommended:** design or system work that should follow this patch.
- **Needs policy or evidence:** cannot be responsibly written or designed until the business supplies a decision, source, or owner.
- **Data-system work:** requires a Opportunities, taxonomy, or source-quality change rather than a copy-only edit.

## Scope and method

### Evidence reviewed

This audit combines:

1. a fresh live-production review at desktop and mobile widths on 7 August 2026;
2. visual inspection of eight captured viewports;
3. a route and component review across the public site, Profile, Organization, authentication, alerts, and AI-assisted opportunity search;
4. the canonical naming, information architecture, design, and evidence documentation in this repository;
5. the revised [`Missa Content Style Guide`](./missa-content-style-guide.md) and [`Content Quick Reference`](./missa-content-quick-reference.md).

The screenshots below are the **pre-overhaul live baseline**. The code changes documented here are local repository changes and are not represented in those production captures.

### Review sequence

The review followed this order:

1. **Structure:** audience, purpose, hierarchy, route ownership, and next action.
2. **Truth:** claims, source state, confidence, and unsupported promises.
3. **Terminology:** canonical nouns, statuses, and product names.
4. **Prose:** clarity, warmth, rhythm, and unnecessary language.
5. **Interaction:** labels, actions, errors, empty states, and mobile comprehension.
6. **Design:** hierarchy, density, continuity, accessibility risk, and evidence presentation.

## What is already strong

### 1. Missa has a credible visual point of view

The homepage uses true white, dark ink, generous space, a warm coral accent, and an editorial display face without becoming ornamental. It feels considered and creator-facing rather than like a generic software template.

![Live homepage desktop baseline](../outputs/missa-content-design-audit-2026-08-07/01-homepage-live-viewport.png)

### 2. The methodology page contains the clearest version of the product promise

The methodology surface names a review date, explains evidence categories, and separates what Missa knows from what still needs confirmation. That is not a secondary trust page; it is the interaction model the rest of the product should inherit.

![Live methodology desktop baseline](../outputs/missa-content-design-audit-2026-08-07/05-methodology-live-viewport.png)

### 3. Public opportunity detail has the strongest functional hierarchy

The detail page gives the title, organization, important facts, and source action clear visual priority. It is a better foundation for the product than trying to fit every fact onto a browse card.

![Live opportunity-detail desktop baseline](../outputs/missa-content-design-audit-2026-08-07/03-opportunity-detail-live-viewport.png)

### 4. The product already treats uncertainty as visible state

Phrases such as **Recently checked**, **Check is aging**, and **Needs verification** create a useful distinction between a record being present and a claim being current. The overhaul preserves that distinction and makes it more consistent.

## Priority findings

### 1. P0 — Trust language exceeded the available evidence

**Baseline evidence:** The organization page used absolute or near-absolute claims including “live in minutes,” “nothing gets lost,” and “transparent by design.” The public opportunity experience also filled missing data with phrases that could be read as facts, such as a generic “Free” label or a polished summary assembled from unconfirmed fields.

![Live organization page desktop baseline](../outputs/missa-content-design-audit-2026-08-07/04-for-organizations-live-viewport.png)

**Why it matters:** These statements concern speed, reliability, price, or process integrity. They may influence whether a creator spends time applying or an organization trusts Missa with a program. Optimism cannot substitute for evidence.

**Implemented:**

- removed unproved speed, completeness, rights, and transparency claims;
- changed unknown fee language to **Fee unclear**;
- changed missing deadline language to **Deadline needs confirmation**;
- reserved **No fee** for explicit source evidence;
- replaced claims of external delivery with the exact state Missa records;
- made SEO descriptions natural, source-aware summaries instead of machine-like field joins.

**Recommended:** Create a claim register for every public statement about speed, scale, security, access, outcomes, pricing, and reliability. Each entry should have an owner, source, scope, measurement date, expiry date, and approved wording.

### 2. P0 — Low-information source records can damage the homepage promise

**Baseline evidence:** A live opportunity with a weak title and thin metadata appeared inside the homepage hero. The layout gave the record high visual authority even though its content did not meet the same quality bar as the surrounding brand copy. On mobile, this record occupied much of the next viewport.

![Live homepage mobile baseline](../outputs/missa-content-design-audit-2026-08-07/07-homepage-live-mobile.png)

**Why it matters:** The hero is the strongest trust surface. A record titled with a fragment, duplicated category, malformed location, or aggregator-style name makes the entire product feel less reliable.

**Implemented:** The hero fallback and evidence labels are now clearer, and the copy no longer implies that profile matching is complete when it is not.

**Data-system work:** Add an editorial quality gate before a Opportunities record can be featured or indexed prominently. At minimum, reject or quarantine:

- titles below a useful semantic threshold, including generic fragments such as “here”;
- duplicate discipline and genre labels;
- malformed or mixed location codes;
- organization names that are missing or copied from an aggregator;
- summaries made only from raw field fragments;
- records with no stable official-source path when one is required.

The homepage should select only from records that pass the gate. When none pass, use the designed editorial fallback rather than the least-bad record.

### 3. P1 — Public navigation looked like an authenticated product shell

**Baseline evidence:** The public opportunity browser exposed links for Tracker, Library, Calendar, Messages, and Insights. Most led to authentication, so the navigation described a product state the visitor did not yet have. The mobile header showed only **Log in**, with no equally visible account-creation action.

![Live opportunities desktop baseline](../outputs/missa-content-design-audit-2026-08-07/02-opportunities-live-viewport.png)

**Why it matters:** Navigation is a promise about what is available now. Repeated authentication detours make the product feel unfinished and blur the boundary between public discovery and Profile.

**Implemented:**

- simplified public navigation to Home, Opportunities, Guides, and For organizations;
- kept Profile destinations inside authenticated navigation;
- added a visible mobile account-creation action;
- changed the unauthenticated save control from a dead button into an explicit login path;
- removed duplicate card actions.

**Recommended:** Use one shared public header component across the homepage, discovery, guides, methodology, organization marketing, and authentication. Allow only small contextual variations, such as the active section.

### 4. P1 — Mobile discovery makes filters more prominent than opportunities

**Baseline evidence:** At 390 × 844, the heading and expanded filter controls consume almost the entire first viewport. The first opportunity begins below the fold, so the page makes people configure a search before they can understand the inventory.

![Live opportunities mobile baseline](../outputs/missa-content-design-audit-2026-08-07/08-opportunities-live-mobile.png)

**Why it matters:** On a browse surface, seeing a useful result is the fastest way to understand what the product contains. The current hierarchy treats filters as the product.

**Recommended design:**

1. Show the result count, sort state, and first opportunity within the first mobile viewport.
2. Collapse secondary filters into a bottom sheet or full-screen filter panel.
3. Keep a compact sticky row with **Filters**, **Sort**, and active-filter count.
4. Render applied filters as removable chips after the sheet closes.
5. Preserve the query in the URL and retain scroll position when a filter changes.
6. Give **Clear all** equal visibility in the panel and empty-result state.

Success criterion: on a 390 × 844 viewport, the title and meaningful content from the first result are visible without interaction.

### 5. P1 — Browse cards carried too much low-priority language

**Baseline evidence:** Cards combined type, deadline state, discipline, genre, location, source freshness, fee, prize, fit state, save, view, and apply treatment. Several labels rendered at approximately 10–11 pixels, discipline could repeat as genre, and unauthenticated visitors saw **Fit signal pending** even though no personal fit calculation was possible.

**Why it matters:** Dense cards are not automatically informative. When every attribute competes equally, the decision-making facts—title, organization, deadline, fee, location, and evidence state—become harder to scan. Small secondary type also creates an accessibility risk, even where contrast may pass.

**Implemented:**

- deduplicated discipline and genre labels;
- removed the unauthenticated fit state;
- made public and signed-in actions distinct;
- corrected the public sort label from an implied recommendation to **Soonest deadline**;
- standardized fee and evidence language.

**Recommended design:**

- keep five primary card facts: title, organization, deadline, fee, and location or eligibility reach;
- show one compact evidence status with its last successful check date;
- reserve fit reasons for signed-in people with enough profile context;
- move prize, secondary taxonomy, and preparation details to the record page;
- use 12 pixels only for terse metadata and 14 pixels for any sentence that must be understood;
- provide a consistent two-action footer: primary task plus save/track.

### 6. P1 — Public shells feel like related brands, not one product

**Baseline evidence:** The homepage, opportunity browser, opportunity detail, organization marketing, methodology, and login each use noticeably different headers, spacing systems, and visual densities. Individually they are competent; together they weaken continuity.

![Live login desktop baseline](../outputs/missa-content-design-audit-2026-08-07/06-login-live-viewport.png)

**Why it matters:** A visitor moving from a search result to detail, then to signup, should retain confidence that they are in the same system. Re-learning the shell adds friction precisely at conversion points.

**Recommended design:** Define one public-shell contract:

- one wordmark size range;
- one desktop and one mobile header height;
- one container grid;
- one primary-button treatment;
- one account-entry pattern;
- one footer content model;
- one rule for where evidence status appears;
- one transition into Profile or Organization after authentication.

Keep the homepage’s editorial composition and the detail page’s information clarity. The goal is continuity, not uniform page templates.

### 7. P1 — Internal implementation language leaked into organization-facing pages

**Repository evidence:** Organization described “compatibility-store aggregates,” “provider-backed compatibility state,” “centralized membership boundary,” “durable message ledger,” and the “existing organization-admin APIs.” These phrases may be accurate engineering notes but do not answer an organization’s task.

**Implemented:** Replaced internal architecture with user-visible state and boundaries. Examples:

| Before                                                                          | After                                                                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Current organization workflow reporting. These are compatibility-store aggregates. | A current snapshot of your submission workflow. These numbers update as submissions and decisions are recorded in the organization area. |
| Organization seats and roles use the existing centralized membership boundary.  | Invite teammates and assign roles. Only organization owners and admins can manage access.                                    |
| No durable message ledger yet.                                                  | Provider delivery history is not shown here.                                                                                 |
| Track accepted Work handoffs.                                                   | Track the work that follows an accepted submission.                                                                          |

Technical precision remains appropriate in platform-admin and operational tooling, where the audience needs those distinctions.

### 8. P1 — Organization marketing needs product proof, not illustrative certainty

**Baseline evidence:** The organization page is visually polished, but the hero is very tall and the first primary action sits close to the fold. The showcase included product-like views and measurements without a sufficiently prominent distinction between live product data and illustration.

**Implemented:**

- labelled product showcase views as illustrative;
- removed an invented “12 min” response indicator;
- replaced unsupported rights and completeness claims;
- removed the unimplemented pricing destination;
- repaired organization signup paths and contact links;
- rewrote the page around a clear call from first click to final decision.

**Recommended design:**

- reduce desktop hero height so the main CTA and first proof point are visible together;
- keep one dominant CTA, **Create a Organization**, and one lower-emphasis path to contact;
- replace decorative metrics with dated, attributable customer proof when available;
- show one real end-to-end workflow: opportunity → form → review → decision → applicant message;
- label every prototype or sample record directly in the visual, not only in nearby body copy.

### 9. P2 — Authentication copy explained the design instead of the task

**Baseline evidence:** The login panel referred to a “public design preview,” an internal implementation description that did not help someone sign in.

**Implemented:** Authentication now explains what a person can do, uses specific pending states, gives clearer error recovery, and links back to public opportunities.

**Recommended design:** On mobile, prioritize the form and move the illustration or supporting story below it. Preserve the split-screen editorial moment on wider screens.

### 10. P2 — Generic empty and error states interrupted an otherwise humane voice

**Repository evidence:** Several surfaces used generic failures, passive empty states, or technically correct but unhelpful labels. These included save errors without recovery, blank review states, and lists that did not explain how they become populated.

**Implemented:** Applied the guide’s patterns:

- **Error:** what failed → what is safe → what to do next.
- **Empty state:** what is empty → why or when it changes → one relevant action.
- **Success:** exact result → what is now available.
- **Decision:** exact status → retained record → next step only when useful.

## Content architecture after the overhaul

### Public layer

Purpose: orient, build trust, and let people inspect useful records before creating an account.

The public layer now leads with source-linked opportunity discovery rather than broad personalization claims. Public navigation no longer pretends Profile tools are already available. Opportunity records use the same fee, deadline, organization, and source language across homepage, browse, guides, detail, and organization pages.

### Profile

Purpose: help a creator understand fit, prepare, track, and keep a durable record of their work.

Profile now distinguishes a recommendation from a decision. Fit reasons only appear when a signed-in person and sufficient profile context exist. Tracker, inbox, Ask Missa, and submissions use state-first language, clearer deadlines, and useful empty states.

### Organization

Purpose: help an organization publish a clear opportunity, receive work, review it, make decisions, communicate, and preserve the record.

Organization now favors ordinary operational language over backend architecture. The overhaul standardizes **opportunity**, **submission**, **work**, **review**, **decision**, **team**, and **activity** while preserving narrower internal model names in code where needed.

### Community and lifecycle

Purpose: keep people informed without pretending to know how they feel.

Alerts and AI-assisted answers now lead with the fact, explain why the update exists, preserve the source or current state, and offer a bounded next action. Celebration is reserved for confirmed milestones.

## Implementation ledger

| Surface                                        | Main problem                                                                             | Overhaul status                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Canonical guide                                | Competitor-derived voice was not sufficiently transformed into an intrinsic Missa system | **Implemented:** v1.1 voice architecture, syntax, presets, provenance, release gates, governance |
| Daily writing                                  | Full guide was too long for routine use                                                  | **Implemented:** companion quick reference                                                       |
| Homepage                                       | Generic tailoring claim, unsupported fallback, broken footer destinations                | **Implemented:** evidence-led hero, honest fallback, canonical Profile language, real links     |
| Public browse                                  | Authenticated-looking nav, false recommendation label, dense uncertain cards             | **Implemented in copy/interaction; design restructuring recommended**                            |
| Public detail                                  | Mechanical summary, inconsistent fee/deadline state                                      | **Implemented:** natural SEO summary and canonical evidence language                             |
| Guides and organization records                | Terminology and unknown states varied by route                                           | **Implemented:** shared wording for fee, deadline, source, and action                            |
| For organizations                              | Unsupported claims, dead destinations, unclear sample status                             | **Implemented in content; proof and shell design recommended**                                   |
| Authentication                                 | Internal preview copy and generic failures                                               | **Implemented**                                                                                  |
| Profile opportunity detail                    | “Paid submission,” “Free to submit,” and ambiguous unknowns                              | **Implemented:** Application fee, No fee, Fee unclear                                            |
| Tracker and inbox                              | Vague date and status language                                                           | **Implemented**                                                                                  |
| Ask Missa                                      | AI confidence and source boundaries were too quiet                                       | **Implemented:** published-only scope, source visibility, limitation language                    |
| Organization home                                 | Unproved instant approval and technical access language                                  | **Implemented**                                                                                  |
| Forms and reviews                              | Generic save errors, incomplete labels, inconsistent pending actions                     | **Implemented**                                                                                  |
| Submissions, decisions, reviews                | Internal or model-centred descriptions                                                   | **Implemented**                                                                                  |
| Messages, delivery, insights, people, settings | Backend terms exposed to organizations                                                   | **Implemented**                                                                                  |
| Alert delivery                                 | Generic update framing                                                                   | **Implemented:** reason, current state, next step                                                |
| Source-record quality                          | Weak titles, organizations, summaries, tags, and locations can still publish             | **Data-system work**                                                                             |
| Pricing, privacy, terms, proof                 | No approved public content or evidence supplied                                          | **Needs policy or evidence**                                                                     |

## Core content components to standardize

These should become reusable interface patterns rather than prose recreated route by route.

### 1. Evidence strip

Contains:

- evidence status;
- last successful check date;
- official source name;
- one limitation when relevant;
- source action.

Example:

> Recently checked · 7 August 2026. The official page lists the deadline; the fee is unclear. Read the official source.

### 2. Opportunity fact block

Use the same order everywhere:

1. deadline with time zone when available;
2. fee state;
3. eligibility or location;
4. required materials;
5. award, payment, or benefit;
6. rights or terms;
7. official source.

Unknown fields remain visible only when the absence itself matters. Do not create a wall of “not confirmed” labels for optional information.

### 3. Fit explanation

Contains:

- one observable profile detail;
- one observable opportunity requirement;
- one limitation or next check.

Example:

> This may fit because your profile includes poetry and the call accepts poetry in English. Confirm the location requirement before preparing your work.

### 4. State panel

Contains:

- exact current state;
- time or actor when relevant;
- what the state does and does not prove;
- next action.

Use it for submission, review, message, billing, and delivery states.

### 5. Empty state

Contains:

- the named empty object;
- how it becomes populated or why it is empty;
- one relevant action.

Do not use an aspirational quotation where a person needs orientation.

### 6. Recovery message

Contains:

- what failed;
- whether entered or existing work is safe;
- the shortest safe recovery action;
- support path when retry is not enough.

## Recommended information hierarchy

### Opportunity browse

1. Result count and active query.
2. Sort and filter controls.
3. Opportunity cards.
4. Applied-filter explanation or empty-state recovery.
5. Account value after a person has inspected useful inventory.

### Opportunity detail

1. What it is and who offers it.
2. Deadline, fee, eligibility, and evidence state.
3. Why it may fit, if personal context exists.
4. What to prepare.
5. Rights, award, and other consequential details.
6. Official source and apply action.
7. Related records.

### Organization review

1. Round and deadline.
2. Assigned work and progress.
3. Criteria and score definitions.
4. Discussion or notes.
5. Decision boundary and who can act.
6. Activity history.

## Design-system recommendations

### Public shell

- Create one shared header and footer contract.
- Keep true white as the primary surface; use tint to group evidence or state, not to simulate paper.
- Retain the editorial display face for high-level storytelling and use the UI face for actions, metadata, and dense records.
- Limit a public page to one dominant action per section.
- Give evidence state a stable position and visual treatment across cards and details.

### Typography and density

- Set 14 pixels as the default readable UI-copy floor.
- Reserve 12 pixels for short metadata with strong contrast.
- Avoid 10–11 pixel sentences that carry fee, deadline, or evidence meaning.
- Use line length of roughly 55–75 characters for explanatory copy.
- Reduce repeated uppercase eyebrow labels on dense operational pages; use them for hierarchy, not decoration.

### Responsive behavior

- Make results visible before expanded filters.
- Keep primary actions reachable without overlapping sticky controls.
- Test long opportunity and organization names at 320, 390, 768, and 1280 pixels.
- Ensure source, save, and apply actions remain distinguishable without relying on icon shape or colour alone.
- Let tables become labelled cards on narrow screens when horizontal scrolling hides task context.

### Evidence visualization

- Use one icon and label for each evidence state, but never colour alone.
- Pair relative language such as **Recently checked** with an exact date in the detail view.
- Distinguish **source checked** from **fact confirmed**.
- Keep warnings close to the affected fact rather than in a distant global banner.
- Show conflicts as conflicts; do not silently choose the friendlier value.

### Product proof

- Use real, permissioned screenshots or data where possible.
- Label illustrative screens inside the frame.
- Attach customer metrics to a named cohort, period, and method.
- Remove counters, response times, or outcome rates that exist only to make a mockup feel active.

## Roadmap

### Now: trust and consistency

1. Merge and release this content overhaul after validation.
2. Add automated checks for broken public links and retired terminology.
3. Create the source-record quality gate and remove weak records from featured placements.
4. Define owners for pricing, privacy, terms, security, and public claims.
5. Review transactional email templates against the same state and evidence rules.

### Next: mobile discovery and shell continuity

1. Prototype the compact mobile filter model.
2. Consolidate public headers, account entry, and footers.
3. Redesign opportunity cards around decision-critical facts.
4. Convert the evidence strip and state panel into shared components.
5. Run moderated comprehension tests with creators and organization administrators.

### Then: proof and lifecycle depth

1. Replace illustrative organization proof with permissioned product evidence.
2. Build a complete messaging and delivery history with accurate provider states.
3. Add organization-owned response-time and status expectations.
4. Create channel templates for newsletters, deadline reminders, review assignments, decisions, and support.
5. Introduce a quarterly content-governance review using real support and product data.

## Measurement plan

Track whether the overhaul improves understanding and task completion, not whether it merely sounds better.

### Discovery

- percentage of mobile visits that reach a first opportunity card;
- filter-open to filter-apply completion;
- empty-result recovery rate;
- public detail views per browse visit;
- official-source click rate;
- save or account-creation conversion after record inspection.

### Evidence quality

- percentage of published records passing the editorial quality gate;
- low-information title rate;
- unknown fee and deadline rate by source;
- stale-source rate;
- rate of source conflicts shown, reviewed, and resolved;
- corrections reported per 1,000 record views.

### Profile

- percentage of recommendations with at least one inspectable fit reason;
- profile completion before first save or track action;
- tracker status comprehension in usability tests;
- successful recovery after a save or upload error.

### Organization

- time from opportunity draft to publish, measured before making a speed claim;
- incomplete-form abandonment;
- review assignment completion by deadline;
- decision-message delivery state coverage;
- support contacts caused by status or role confusion.

### Content quality

- one-read comprehension for consequential copy;
- percentage of audited surfaces using canonical terms;
- broken or misleading destination count;
- unsupported public claim count;
- error messages with a safe recovery action;
- empty states with one relevant next step.

## Release and governance checklist

Before shipping this overhaul:

- [ ] TypeScript and lint checks pass for the web app.
- [ ] Formatting and repository diff checks pass.
- [ ] Public links resolve to the destination named by their labels.
- [ ] Unknown fee, deadline, organization, and location states use canonical language.
- [ ] No copy claims external delivery when only an internal request or record exists.
- [ ] Mobile browse is manually checked at 390 × 844 after deployment.
- [ ] Homepage featured records pass the editorial quality gate or use the fallback.
- [ ] Pricing, privacy, terms, security, scale, and outcome claims have named owners and evidence.
- [ ] Consequential AI-assisted copy keeps its source and limitation visible.
- [ ] A creator and an organization administrator can each explain the current state and next step after one read.

## Screenshot appendix: audited live baseline

These captures document the production baseline reviewed on 7 August 2026.

### A. Homepage, desktop

![Homepage desktop](../outputs/missa-content-design-audit-2026-08-07/01-homepage-live-viewport.png)

### B. Opportunity browse, desktop

![Opportunity browse desktop](../outputs/missa-content-design-audit-2026-08-07/02-opportunities-live-viewport.png)

### C. Opportunity detail, desktop

![Opportunity detail desktop](../outputs/missa-content-design-audit-2026-08-07/03-opportunity-detail-live-viewport.png)

### D. For organizations, desktop

![For organizations desktop](../outputs/missa-content-design-audit-2026-08-07/04-for-organizations-live-viewport.png)

### E. Methodology, desktop

![Methodology desktop](../outputs/missa-content-design-audit-2026-08-07/05-methodology-live-viewport.png)

### F. Login, desktop

![Login desktop](../outputs/missa-content-design-audit-2026-08-07/06-login-live-viewport.png)

### G. Homepage, mobile

![Homepage mobile](../outputs/missa-content-design-audit-2026-08-07/07-homepage-live-mobile.png)

### H. Opportunity browse, mobile

![Opportunity browse mobile](../outputs/missa-content-design-audit-2026-08-07/08-opportunities-live-mobile.png)

