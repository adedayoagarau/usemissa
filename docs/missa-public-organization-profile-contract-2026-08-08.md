# Missa public Organization profile screen contract

Date: 8 August 2026  
Status: Option 2 implemented on the existing local public route; deployment and full public-profile promotion blocked  
Selected visual direction: **02 — Opportunity-first profile**

## 1. Purpose

A public Organization profile helps a creator decide:

1. Is this the Organization I think it is?
2. What does it do and where does it operate?
3. Which Opportunities are currently available?
4. What kinds of practices have its published Opportunities included?
5. Where can I read authoritative information or contact the Organization?
6. Should I follow it for future Opportunities?

The primary action is to open a relevant Opportunity. Following and visiting the official website are secondary actions. The page is not a corporate dashboard, a review site, or a Missa endorsement.

## 2. Current implementation truth

The current unauthenticated `/org/[organizationId]` page can provide:

- Organization name;
- Organization domains and a coarse `verified` boolean in the underlying record;
- published hosted Opportunities only;
- linked Opportunity deadline and coarse fee state when a hosted call points to a canonical Opportunity;
- a canonical public URL and basic Organization/ItemList structured data;
- signed-in Organization follow/unfollow mutations elsewhere in the product.

The current Organization model does not contain:

- slug, public biography, legal/public identity distinction, logo, cover image, location, accessibility information, social links, contact policy, or public email;
- declared mission, organization type, founding date, languages, or public team;
- public Programs or program descriptions beyond internal names;
- Organization-level practice taxonomy assignments;
- complete historical/closed Opportunity publication records for a public archive;
- follower counts, reviews, ratings, response rates, award history, or public operational metrics;
- a public claim method suitable for a broad “verified” endorsement.

The local design can model target-state content, but every unsupported field is identified as a target contract and never connected to current product data.

The existing local `/org/[organizationId]` route now uses the selected Opportunity-first composition over the current allowlist. It leads with the Organization name and published hosted Opportunities, distinguishes a hosted application from published details, uses optional approved Opportunity identity media with a quiet fallback, and states missing deadline and fee links without inference. Canonical practice labels are derived only from the displayed linked Opportunities. Internal Program names, domains, verification state, people, commercial facts, workflow records, and operational metadata remain excluded.

Because the current public Organization model has no biography, official website, location, languages, contact policy, logo, public Program visibility, or narrow managed-page claim, the route states those absences instead of filling them from private or inferred data. Follow, report, public-profile editing, redirects, and historical archives remain unimplemented.

## 3. Public projection

Public Organization fields must be allowlisted. Billing, seats, membership, internal domains, submissions, reviews, decisions, messages, payouts, internal notes, audit history, source health, confidence, freshness, and provider identifiers never appear.

| Public fact | Source | Boundary |
| --- | --- | --- |
| Public name | Organization-owned profile | Distinct from legal billing name |
| Logo/cover | Organization-owned media | Optional; alt text or decorative semantics required |
| About | Organization-owned profile | Plain text or safely rendered rich text |
| Official website | Organization-owned and domain-checked | External link; safe protocol and clear destination |
| Location/languages | Organization-owned profile | No inferred location from a domain |
| Contact route | Organization-owned policy | Contact form or public address only; never member email leakage |
| Active Opportunities | Published call + canonical Opportunity projection | Drafts and tenant-private state excluded |
| Practice context | Aggregate of displayed/published Opportunity taxonomy | “Opportunities have included,” never “Organization expertise” |
| Program context | Publicly enabled Program projection | Internal team structure is not automatically public |
| Follow state | Signed-in user relationship | Private to the viewer; follower count is not required |
| Identity status | Narrow domain/claim evidence | “Organization-managed page” only when the claim contract supports it; not a quality endorsement |

## 4. Taxonomy rules

- The canonical 12-facet creative-practice taxonomy belongs primarily to Opportunities and Works.
- A public Organization page may aggregate a small set of practice-family, discipline, form, medium, audience, or language labels from the Opportunities currently displayed.
- Each aggregate label is introduced as “Opportunities have included” and links or filters to the supporting Opportunities.
- Multi-valued labels are non-additive and never shown as audience-share percentages.
- Opportunity type, eligibility, geography, fee, deadline, and source kind remain outside the creative-practice taxonomy.
- No practice term implies the Organization is qualified, inclusive, safe, prestigious, or a good fit.
- Missing or sparse taxonomy remains missing; it is not inferred from biography or imagery.

## 5. Identity and credibility

- The page names the official website and, when supported, the narrow fact that the page is Organization-managed.
- A check icon never means Missa endorses quality, legitimacy, safety, payment reliability, or selection fairness.
- A directory-discovered Organization without a claim receives neutral explanatory copy and an official-source link when available.
- Duplicate or renamed Organizations require canonical redirects and visible former-name context when relevant.
- Broken, unsafe, or unavailable outbound links are replaced by a clear unavailable state.
- Issue reporting is available without exposing the internal review process.

## 6. Opportunities

- Active Opportunities are the decisive content and appear before long institutional history.
- Each card supports optional source media, a quiet fallback, long titles, Organization/Program context, deadline kind, fee, reach, eligibility summary, and one primary Open action.
- No visible “Opportunity photo” field label is used.
- Exact, rolling, unknown, conflicting, extended, closed-while-viewing, and unavailable-source states remain explicit.
- Hosted submission and external application routes are distinguished before the user commits.
- Closed/historical Opportunities are a separate archive only when the data contract can preserve their public record.
- The page never displays acceptance probability, quality score, internal confidence, source freshness, or follower popularity as decision evidence.

## 7. Follow behavior

- Signed-out intent preserves return to this Organization after authentication.
- Signed-in Follow/Following is one stateful action with optimistic rollback on failure.
- Following means “show me future Opportunities and updates allowed by policy,” not newsletter consent, endorsement, or guaranteed notification.
- Unfollow is reversible and does not alter Tracker records or submissions.
- The page does not expose follower count by default.

## 8. Information architecture candidates

### 01 — Editorial profile

Institutional story and image lead, followed by current Opportunities. Strong for rich cultural identity, but can delay the creator’s immediate decision.

### 02 — Opportunity-first profile

Organization identity and source actions lead into current Opportunities, with About, Programs, and practice context as supporting sections. This best matches the creator’s task while keeping the Organization legible.

### 03 — Program directory

Public Programs lead and Opportunities group beneath them. Strong for universities, funders, and multi-program institutions, but unsafe until public Program visibility and descriptions are first-class.

After all three directions passed the same fixture and responsive validation, **02 — Opportunity-first profile** was selected. It keeps the creator's immediate choices ahead of institutional history, preserves a compact identity/source boundary, and translates most cleanly to narrow screens. Options 01 and 03 remain in the local comparison switcher.

## 9. Required states and adversarial fixtures

1. rich Organization profile with active Opportunities;
2. current implementation minimum: name and published calls only;
3. no active Opportunities;
4. one active Opportunity;
5. 30+ active Opportunities;
6. exact deadline;
7. rolling deadline;
8. deadline unknown;
9. conflicting deadline;
10. no fee;
11. known application fee;
12. fee unclear;
13. hosted submission;
14. external application;
15. mixed hosted and external;
16. source media available;
17. no logo;
18. no cover image;
19. broken opportunity image;
20. long Organization name;
21. long Opportunity title;
22. Unicode Organization and Program names;
23. Organization-managed page;
24. unconfirmed Organization identity;
25. renamed Organization;
26. official website unavailable;
27. unsafe website protocol rejected;
28. signed out;
29. signed in and not following;
30. following;
31. follow pending;
32. follow failed with rollback;
33. taxonomy-rich Opportunities;
34. no taxonomy;
35. multi-valued taxonomy;
36. one public Program;
37. many public Programs;
38. Program visibility unavailable;
39. loading;
40. partial Opportunity data;
41. recoverable load failure;
42. Organization removed or merged;
43. issue-report dialog and focus restoration;
44. 320, 390, 768, 1280, and 1536 pixel viewports;
45. keyboard-only navigation and controls;
46. 200% and 400% zoom.

## 10. Premium Shadcn Studio anatomy

| Job | Premium anatomy | Missa adaptation |
| --- | --- | --- |
| Identity header | `card/card-07`, `avatar/avatar-03`, `badge/badge-04` | Optional logo fallback, narrow Organization-managed status, public facts, no social-proof counters |
| Opportunity card | `card/card-06`; `card/card-05` only for one genuinely featured item | Source media/fallback, decisive facts, and one Open action; no gradient CTA or hover-only content |
| Section navigation | `tabs/tabs-11`; overflow from `tabs/tabs-14` | URL-backed Overview, Opportunities, About, and Programs only when sections exist |
| Public facts | `list/list-03` | Website, location, language, contact, and identity source as labelled facts |
| Practice context | `badge/badge-04` with `list/list-03` support | Small non-interactive labels tied to supporting Opportunities; not Organization expertise |
| Follow action | `button/button-01` stateful variants | Signed-out return path, pending, success, failure, and rollback |
| Issue report | `dialog/dialog-01` plus `form/form-06` | Persistent labels, safe categories, focus restoration, no internal case status |
| Missing/unconfirmed/error | `alert/alert-17`–`alert/alert-20` | Durable explanation and safe next step; no confidence or freshness |
| Loading | `skeleton/skeleton-03` and `skeleton/skeleton-09` | Match identity and Opportunity-card geometry |
| Mobile sections | Full page with `tabs/tabs-14` overflow | Primary identity and active Opportunities remain in reading order; no essential content hidden in a sheet |

## 11. Product promotion gates

Promotion remains blocked until:

- an allowlisted public Organization profile model exists;
- slugs, redirects, rename/merge history, and canonical metadata exist;
- public logo/cover media have upload, moderation, transform, alt, and fallback contracts;
- official website/contact links are protocol-safe and Organization-managed;
- Organization-managed identity wording is backed by a narrow durable claim method;
- public Program visibility is explicit rather than inherited from internal structure;
- active and historical Opportunity projection is canonical and privacy-safe;
- taxonomy aggregation is derived from displayed Opportunities with supporting links;
- follow state supports auth return, idempotency, pending, rollback, and privacy;
- report flows, unavailable links, removed/merged Organizations, and failure states are implemented;
- structured data matches visible public facts;
- keyboard, screen-reader, touch, phone, tablet, zoom, long content, optional media, and failure QA pass;
- the user explicitly approves product integration.
