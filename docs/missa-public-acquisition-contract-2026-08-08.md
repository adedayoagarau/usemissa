---
title: Missa public and acquisition screen contract
version: "1.0"
status: surface-aware-selection-implemented-locally-not-deployed
date: "2026-08-08"
routes: /, /about, /for-organizations, /guides, /guides/[slug], /methodology, /discover/[slug], /profile/[userId], /waitlist
product_promotion_status: implemented-locally-not-deployed
---

# Missa public and acquisition screen contract

## 1. Purpose

The public site should help a person answer one of four questions:

1. **Creator:** Is there a credible Opportunity worth opening now?
2. **Creator:** Can Missa help me decide, prepare, and keep track without replacing the official call?
3. **Organization:** Can Missa support the actual path from a published call to per-Work decisions and delivery?
4. **Reader/search visitor:** Can I trust this page’s scope, source links, and limitations enough to continue?

Acquisition is a consequence of useful evidence and a coherent product path. It is not a license to invent activity, decorate records with unrelated media, expose operational freshness, or claim that Missa has verified an Organization or Opportunity more broadly than the data supports.

## 2. Current implementation truth

Repository inspection on 8 August 2026 found:

- `/` reads up to three open Opportunities and has explicit load-failure handling;
- signed-out Home links to `/opportunities-preview` and `/discover/opportunities/[id]`, while signed-in Home links to `/opportunities`;
- Home uses three static stock images as rotating media for live Opportunity records rather than source-attached Opportunity media;
- Home’s Organization/source label falls back to `opportunityFreshness(...).label`, making an internal source-check state appear where identity should be;
- Home can render a broad `Verified` badge from `organizationVerified`, even though Organization claim and Opportunity fact confirmation are narrower concepts;
- Home simultaneously offers open `/signup` and “Join the waitlist,” while signup immediately creates an account and session;
- Home includes a Profile completeness illustration and legacy-looking Profile sections that no longer match the selected Profile contract;
- About, Guides, Guide detail, and Methodology visibly display shared `Reviewed` dates; Methodology teaches public “Freshness,” source-check signals, and next-refresh behavior;
- Guide detail can show real source links and matching Opportunities, but its empty copy refers to the “current source snapshot” and “next refresh”;
- `/for-organizations` is a dedicated marketing surface, but its claims must be reconciled against current call, submission, review, decision, message, delivery, people, billing, and insight capabilities;
- `/waitlist` has a working duplicate-tolerant API path, honeypot, validation, success, and service-failure states;
- `/profile/[userId]` uses an intentionally small public projection, but that projection can still expose a public Tracker count and cannot yet publish selected Works or links;
- public pages implement several unrelated headers and route names rather than the shared-shell contract.

The redesign may model target states locally, but it must label unsupported behavior and cannot promote until its data and policy exist.

## 3. Public data and claim boundaries

| Public fact | Allowed source | Boundary |
| --- | --- | --- |
| Opportunity title and Organization | Published customer-safe Opportunity projection | Missing Organization remains “Organization not listed,” never a freshness or confidence label |
| Deadline, fee, geography, type, eligibility, and practice | Their independent typed fields | Unknown, rolling, conflicting, and missing remain explicit; no inferred eligibility |
| Official source | Safe public source name and URL | No fetch/check/process timestamp, score, source tier, provider code, or internal health state |
| Opportunity image | Organization/source-provided media with a rights/provenance record | No unrelated stock image presented as if it belongs to the call; no visible “Opportunity photo” label |
| Organization identity status | Narrow approved claim | “Organization-managed page” only when the claim contract supports it; never a general quality endorsement |
| Fit explanation | Signed-in private preference intersection | “Why this may fit,” never an artistic judgement or eligibility guarantee |
| Public Profile | Explicitly published identity fields and later selected public Works/links | No private taxonomy preferences, eligibility attributes, Tracker counts, application history, Inbox, or Organization membership |
| Editorial date | Publication/update date of the article itself | Never presented as Opportunity/source freshness or an assurance that linked calls are current |

## 4. Media contract

- A real Opportunity image is shown only when the record has approved source/Organization media and an explicit presentation right or policy.
- Media stores source URL, canonical asset URL, attribution/credit where required, alt-text decision, crop/focal point, and failure state.
- Meaningful images use concise factual alt text. Decorative ambient images use empty alt text.
- When no Opportunity image exists, use a quiet Missa-owned fallback based on type or no-image geometry; do not invent a photograph, logo, or Organization identity.
- Broken, unsafe, oversized, unsupported, or extreme-aspect media falls back without moving the decisive facts below the first viewport.
- The UI never adds a heading or badge named “Opportunity photo.” The image is part of the composition, not metadata the user must read.
- A source image can identify the call but does not verify the call, Organization, deadline, or rights status by itself.

## 5. Page contracts

### 5.1 Home `/`

Primary question: **What useful thing can I do with Missa now?**

Required order:

1. shared public shell;
2. literal creator value and one primary action determined by access policy;
3. a small, honest set of real open Opportunities or a useful unavailable/no-record state;
4. a concise decision-to-Tracker-to-application story;
5. an Organization workflow entry;
6. Guides/methodology entry and footer.

Rules:

- if signup is open, primary action is Create account or Browse Opportunities; do not simultaneously claim access requires a waitlist;
- if access is closed, signup becomes waitlist/invite-aware and the policy is consistent across Home, auth, and API behavior;
- signed-in visitors see Open Missa and can resume a private task, but public Opportunity proof remains public;
- featured records are chosen by a safe editorial/availability policy, never because the first database row has an image;
- absence of a featured record does not become a fabricated demo card;
- no “Verified,” freshness, confidence, profile-completeness, or decorative metric language;
- if Opportunity data is unavailable, the page remains useful and says the section is temporarily unavailable.

### 5.2 About `/about`

Primary question: **What does Missa believe and what does it actually do?**

- concise product purpose for creators and Organizations;
- principles: source first, unknowns remain unknown, private by default, per-Work outcomes, and official-source authority;
- no duplicated methodology detail, launch chronology, operational update date, or unsupported scale claim;
- next actions: Browse Opportunities, read Methodology, or For organizations.

### 5.3 For organizations `/for-organizations`

Primary question: **Can Missa support the program I need to run?**

Required story:

1. publish a clear Opportunity;
2. define practice, eligibility, geography, dates, fee, and form separately;
3. receive Submissions containing one or more Works;
4. assign reviews without broad tenant access;
5. record per-Work decisions;
6. communicate outcomes with recipient-level truth;
7. coordinate accepted-Work delivery;
8. manage roles, settings, billing, and operational insight.

Every claim is classified as **available**, **limited**, **planned**, or omitted. Planned capability never appears as a working-product screenshot or customer proof. No decorative customer counts, invented conversion rates, fake logos, or implied benchmarks.

### 5.4 Guides `/guides` and `/guides/[slug]`

Primary questions: **Which guide answers my current decision?** and **What should I do next?**

- index is grouped by user job, not all 1,084 taxonomy terms;
- search/filter appears only when guide volume justifies it;
- article reading and source links precede conversion modules;
- related Opportunities use the canonical public card/detail contract;
- an article’s update date may be visible when editorially meaningful, clearly labelled as the guide’s date;
- no “live source-linked records,” “current source snapshot,” or “next refresh” language;
- no related records means “Missa has no matching published records in this collection,” not that no Opportunities exist.

### 5.5 Methodology `/methodology`

Primary question: **How does Missa use public evidence, and what remains my responsibility?**

Explain:

- official Organization/source pages remain authoritative;
- Missa stores facts, sources, conflicts, and unknowns separately;
- publication requires a customer-safe minimum evidence set;
- a record may still contain unknown or conflicting facts;
- Missa does not guarantee eligibility, acceptance, safety, availability, or unchanged third-party pages;
- people can report an issue or open the official source.

Do not teach internal freshness classes, source tiers, confidence, scores, fetch/process state, refresh cadence, verified-until dates, or worker behavior. Those belong in Platform Admin.

### 5.6 Curated collection `/discover/[slug]`

Primary question: **What does this collection include, and which current records match it?**

- every collection has a stable ID, canonical URL, title, plain inclusion rule, and supported Opportunity-type/taxonomy mapping;
- creative-practice facets, Opportunity type, geography, eligibility, fee, and deadline remain independent;
- collections do not become a second uncontrolled taxonomy or duplicate browse;
- stale slug/term mappings redirect or show a recovery path;
- thin/zero coverage is explicit and does not imply the world is empty;
- indexability requires enough original explanatory value beyond a filter result.

### 5.7 Public Profile `/profile/[userId]`

Primary question: **What has this creator intentionally chosen to publish?**

Target public projection:

- public display name/handle;
- biography;
- selected public Works with media/fallback and rights/privacy decisions;
- selected public links;
- optional small set of creator-authored public practice labels when explicitly published.

Private Profile preferences, eligibility attributes, location used for matching, Tracker counts, saved searches, follows, applications, messages, and Organization membership never appear. A private/no-content Profile is different from not found or removed. Public handles require collision, rename, redirect, abuse, and reserved-word policy before replacing IDs.

### 5.8 Waitlist `/waitlist`

The waitlist exists only when product access is intentionally closed or staged. If signup remains open, retire this route and redirect to signup while preserving campaign attribution.

If retained:

- explain what the person is waiting for and whether existing invitees can log in;
- request only the minimum email/consent data;
- duplicate entries return the same calm confirmation;
- invalid email, rate limit, database failure, and delayed confirmation are distinct;
- campaign fields remain bounded and never become a hidden profiling system;
- confirmation does not promise a date Missa cannot guarantee.

## 6. Taxonomy and collection rules

- The 12 creative-practice facets are independent and use stable canonical IDs.
- Public Home uses only a few human-readable examples; it never exposes the graph or a flat term cloud.
- Guide and collection routing may use practice family, discipline, form, genre, medium, audience, theme, technique/material, language, context, tradition/movement, and interdisciplinary terms where they genuinely define the collection.
- Opportunity type, identity eligibility, career stage, geography, fee, deadline, and source kind stay outside the creative-practice taxonomy.
- Multiple labels are non-additive and do not become percentages, rankings, or proof of fit.
- A deprecated or culturally sensitive term resolves through reviewed aliases/mappings; the public UI does not silently rename historical source wording.

## 7. Edge-state fixtures

All local directions must exercise:

- signed out and signed in;
- open signup and waitlist-only policy;
- three valid Opportunities, no suitable featured record, no published records, and repository unavailable;
- real image, no image, broken/unsafe image, extreme aspect ratio, attribution, and missing alt decision;
- missing Organization, missing/rolling/conflicting deadline, unknown/paid/no fee, unsafe official link;
- long title, long Organization, multilingual and mixed RTL content;
- guide with/without related records and failed external source;
- curated collection with active, thin, zero, stale-term, and non-indexable states;
- public Profile with selected content, private, no public content, removed Work, and not found;
- waitlist duplicate, invalid, pending, success, rate-limited, and unavailable;
- 320, 390, 768, 1280, and 1536px, plus zoom/reflow and reduced motion.

## 8. Content, SEO, and analytics

- Structured-data `dateModified` may describe the page/article without rendering backend source freshness.
- Canonical URLs follow the target route map; compatibility pages are `noindex` or redirect after parity.
- Public search and collection analytics record the page/job/query state without private Profile attributes.
- Key events: primary path chosen, Opportunity opened, official source opened, account journey started, Organization inquiry started, guide continued to Opportunity, issue reported, waitlist submitted.
- Impression metrics do not imply a human read or an Opportunity outcome.
- Marketing copy follows Style Guide 2.0: literal headings, direct actions, no inflated certainty, and no generic AI language.

## 9. Accessibility and responsive contract

- shared public shell and footer have stable landmarks and current-route semantics;
- a meaningful Opportunity card begins within the first 390×844 viewport when records exist;
- decisive facts precede secondary taxonomy and narrative;
- all mobile targets are at least 44px and never hover-only;
- images do not carry essential text and fallbacks retain layout stability;
- long editorial pages have semantic headings, useful link text, and optional contents only when length warrants it;
- external links identify the destination in text/context; opening a new tab is not the only cue;
- errors are associated with the waitlist field and preserved after failure;
- loading, unavailable, and empty are distinct and announced without blocking unrelated content.

## 10. Component and promotion gates

Premium references may provide anatomy only after this page contract. Reject candidates that require generic stock media, broad verification badges, testimonial logos without proof, decorative metrics, freshness UI, card walls, hidden mobile CTAs, or taxonomy-as-navigation.

Before product promotion:

- access policy resolves signup versus waitlist;
- shared shell direction is selected;
- customer-safe Opportunity and Organization projections are typed;
- Opportunity media provenance/rights/fallback model exists;
- public Profile projection removes Tracker count and defines selected Work/link publication;
- Home/Guide/Methodology freshness and verification language is rewritten;
- every For organizations claim maps to current evidence or is explicitly planned/omitted;
- canonical redirects and structured data are updated together;
- desktop/mobile/keyboard/screen-reader/zoom/high-contrast checks pass;
- explicit page-family approval is recorded.

Product promotion remains blocked.
