---
title: Missa Organization Opportunities and call builder contract
version: "1.0-draft"
status: option-02-selected-local-composition-product-promotion-blocked
date: "2026-08-08"
parent_plan: ./missa-website-overhaul-plan-2026-08-08.md
organization_shell_contract: ./missa-organization-chooser-overview-contract-2026-08-08.md
current_routes:
  - /workspace
target_routes:
  - /organization/[id]/opportunities
  - /organization/[id]/opportunities/new
  - /organization/[id]/opportunities/[callId]
product_promotion_status: blocked
---

# Missa Organization Opportunities and call builder contract

This contract defines how an Organization creates, finds, edits, previews, publishes, closes, duplicates, imports, and operates its Opportunities. It is written before premium component selection.

The primary object name is **Opportunity**. “Call” is natural explanatory language. `OpenCall`, `Radar Opportunity`, `Submission Path`, `Entity`, taxonomy IDs, scheme versions, import confidence, worker state, and persistence language remain internal.

## 1. User objectives

### Opportunities list

The operator must be able to answer:

1. Which Opportunities belong to this Organization, Team, and Program?
2. Which are draft, published, closed, blocked, or awaiting a consequential action?
3. Which Opportunity should I open next?
4. Can I create, duplicate, import, preview, or close this Opportunity in my role?
5. What does each count mean and which exact filtered queue will it open?

Success feels like: “I can find the right Opportunity and understand its operational state without opening every record.”

### New Opportunity builder

The operator must be able to answer:

1. What facts will applicants see?
2. What creative work is accepted, preferred, required, or excluded?
3. Who is eligible, and where may they apply from?
4. What are the dates, fee, payment, award, stipend, and rights terms?
5. What questions, categories, Works, and files will the submission form require?
6. What is still blocking preview or publication?
7. What exactly will change when I publish?

Success feels like: “I can build this call section by section, recover from interruption, and publish only when the public facts and submission experience are valid.”

### Existing Opportunity operations

The operator must be able to answer:

1. What is currently public?
2. Which edits are safe immediately and which need applicant-facing confirmation?
3. How are submissions, review rounds, decisions, messages, and delivery attached?
4. If a public listing was connected, which values are Organization-owned and which came from the source record?
5. How do I close, reopen if policy allows, archive, or prepare a future edition without destroying history?

## 2. People, capabilities, and scope

Server capabilities, not client role guesses, decide which actions appear.

| Person mode | Default capability |
| --- | --- |
| Owner/Admin | Create, edit, validate, preview, publish, close, duplicate, import, and configure all Organization Opportunities subject to safeguards |
| Program manager | Operate assigned Programs and Opportunities; no unrelated Programs, Organization billing, or access administration |
| Team admin | Operate the Teams and Programs granted by policy; no Organization-wide actions by default |
| Reviewer | View only the call brief needed for assigned reviews; no builder or publication controls |
| Finance | View/edit fee, payment, payout, refund, and export areas granted by policy; no creative-practice or review control by default |
| Legal | View/edit guidelines, terms, consent, rights, and policy areas granted by policy; no unrelated operational control |
| Viewer | Read-only list/detail projections; no disabled mutation controls |
| Guest/Member | Explicit capability projection only; never infer broad access from the compatibility role |

Every list row, builder section, count, preview, and mutation is Organization-scoped and Program-scoped where applicable. A foreign ID returns not-found without revealing whether the object exists.

## 3. Authoritative domain boundaries

These concepts answer different questions and must remain separate in storage, validation, UI, and publication:

| Domain | Question | Examples / rule |
| --- | --- | --- |
| Opportunity type | What kind of opportunity is this? | Grant, residency, award, magazine call, exhibition, commission, contest |
| Practice taxonomy | What creative work does it concern? | 12 independent facets, 1,084 launch terms, stable IDs |
| Practice rule consequence | How does a term affect fit/routing? | Accepted, preferred, required, excluded |
| Eligibility | Who may apply? | Career stage, age, identity, disability, nationality, membership, Organization type |
| Geography/reach | Where may someone apply from or participate? | Worldwide, named countries/regions, remote, in-person location |
| Dates | When does the call open, close, or remain rolling? | Exact, rolling, until filled, unknown/conflicting draft state |
| Commercial terms | What does applying or being selected cost/pay? | Application fee, prize, stipend, commission, expenses, royalties, rights |
| Guidelines | What rules and context govern the call? | Public source URL and Organization-edited text |
| Submission categories | Which route or category does the applicant choose? | Poetry, short fiction, installation proposal; not a taxonomy substitute |
| Form fields | What must the applicant answer or upload? | Text, Work/file upload, category selection, fee acknowledgement |
| Work | What creative item is submitted? | One Submission can contain multiple Works and mixed outcomes |
| Review | How is submitted work assessed? | Round, assignment, recommendation; never decision state |
| Decision | What happened to each Work? | Accepted, declined, waitlisted per Work |

The chooser and overview can summarize these domains. Only the appropriate builder section edits each one.

## 4. Current-state evidence and gaps

- The current `/workspace` landing nests Team, Program, Opportunity creation, publication, controls, form building, people, and billing in one page.
- An Opportunity can currently be created with only `programId` and `title` and published without a readiness validator.
- The Workspace `OpenCall` model stores title, lifecycle status, optional connected public-record ID, and guideline fields, but not the full opportunity type, dates, geography, eligibility, commercial terms, rights, or public media contract.
- Practice rules currently live on the internal form record, although they describe the Opportunity and should not be presented as a form-only concern.
- The visible taxonomy picker exposes only practice family, discipline, and genre; the canonical model has 12 independent facets and 1,084 launch terms.
- The engine verifies known term IDs, rule vocabulary, duplicate term/rule pairs, and a 128-rule ceiling, but does not yet resolve ancestor/descendant consequences or deprecated-term migration before publication.
- Categories are currently a comma-separated input and can drift into a second taxonomy.
- Application fee is embedded in the form editor and hard-coded as USD in the UI, while fee, currency, payment, prize/stipend, and rights are distinct commercial facts.
- The form builder uses array indexes as React keys, icon-only arrow text, and row controls that do not scale safely to mobile or large forms.
- Publishing does not surface API failure, confirm public scope, validate the form, or preserve a readiness report.
- Editing and closing rely on browser confirmation and silently ignore some failed requests.
- Connected public listings are labelled with the internal “claimed opportunity” concept and have no visible conflict/ownership contract.
- Guideline import stores source type, byte size, extraction length, confidence, warnings, and import time. Only the public source URL, imported draft text, and actionable review warnings belong in the builder; internal confidence and processing metadata do not.
- CSV import can preview up to 1,000 rows, create missing Teams/Programs, skip matching records, and reject invalid rows, but the current product has no complete user-facing review and commit flow.
- Current write routes authorize only owner/admin compatibility access despite the ten-role model; Program manager and scoped roles need typed capabilities.

The visual overhaul must not imply these gaps are solved. Product promotion requires the typed domain and readiness contracts below.

## 5. Opportunities list contract

### Page structure

1. Organization and role context inherited from the selected shell;
2. H1 `Opportunities` and one primary `Create Opportunity` action when authorized;
3. query, status, Program, Team, type, and attention filters with URL-backed state;
4. saved views only when they are durable and named;
5. compact structured table at desktop;
6. labelled row/card fallback on narrow screens;
7. explicit result count and filter announcement;
8. import as a secondary action with preview before commit.

### Row contract

Each row shows only scan-critical facts:

- title;
- Program and Team;
- public lifecycle: Draft, Published, Closed;
- separate readiness/attention consequence when relevant;
- type;
- opening/deadline state in ordinary language;
- submission count only when authorized and meaningful;
- one visible primary row destination;
- secondary menu for duplicate, preview, close/archive where authorized.

The row does not display a taxonomy badge wall, internal ID, connected-source ID, confidence, freshness, extraction/import metadata, or every lifecycle count.

### List states

- no Opportunities: explain Team/Program prerequisites and offer the next valid action;
- no Program: create/choose a Program before creating an Opportunity;
- no results: preserve filters and offer clear/reset;
- large portfolio: pagination or virtualization with stable selection and URL state;
- read-only role: rows remain useful, mutation controls are omitted;
- blocked draft: state the public consequence and link to the exact builder section;
- published with submissions: consequential edits and close actions explain applicant impact;
- connected public record conflict: identify the conflicting field in customer language without internal source-scoring terms;
- unavailable projection: show no stale or cross-tenant rows.

## 6. Builder architecture

The builder uses stable URL-backed sections, not one giant form and not a decorative stepper that blocks non-linear review:

1. **Basics** — title, type, Team, Program, short public summary, optional public image;
2. **Guidelines** — official URL, public guideline text, safe import/review;
3. **Practice rules** — 12-facet progressive taxonomy search and accepted/preferred/required/excluded consequences;
4. **Eligibility** — explicit eligibility statements and structured rules where safely supported;
5. **Place** — application reach, participation mode, and event/location facts;
6. **Dates** — opening, deadline kind/date, schedule, timezone when required;
7. **Fees and terms** — fee/currency, prize/stipend/commission, expenses, royalties, rights, payment/refund policy;
8. **Submission form** — categories, questions, Works/files, required state, applicant preview;
9. **Review and publish** — public preview, applicant-flow preview, readiness summary, consequential confirmation.

Each section:

- has a typed projection and mutation;
- saves independently;
- preserves edits after failure;
- records whether the change is draft-only or affects a published call;
- can be revisited directly by URL;
- exposes field-associated errors and a section summary;
- never claims “saved” before the server confirms.

The builder is non-linear after Basics establishes the draft. Publication remains blocked until required sections are valid.

## 7. Practice-rule contract

- Search aliases and progressive facet groups; never render a flat 1,084-term select.
- Store stable canonical IDs; labels are presentation only.
- Support all 12 independent facets when they are relevant.
- Show each selected term’s facet and ordinary consequence.
- `Accepted`: submissions may include this practice.
- `Preferred`: it is especially relevant but not required.
- `Required`: every applicable submission/Work must satisfy it as defined by policy.
- `Excluded`: this practice is not accepted.
- Explain ancestor/descendant conflicts before save and block publication until resolved.
- Preserve unknown/deprecated IDs in a review state; never silently discard or relabel them.
- Categories and form branching do not replace canonical practice rules.
- Eligibility, geography, type, fee, and materials never become practice terms.
- A rule limit is a safety boundary, not a target. Large rule sets need grouped review and conflict search.

## 8. Guidelines and import contract

### Guideline import

- The operator provides a public URL and explicitly starts import.
- Block private/local-network URLs and unsafe redirects.
- Imported text is a draft, never authoritative until reviewed and saved.
- Show actionable warnings such as “The PDF text may be incomplete”; do not show extraction confidence, byte length, character counts, worker details, or import timestamps.
- Preserve the previous saved text until the operator confirms replacement.
- Keep the official URL visible and editable.

### CSV Opportunity import

- Source choice may help header mapping but never changes the authoritative Organization scope.
- Preview before commit with valid, invalid, duplicate, and skipped rows.
- Show Team and Program creation consequences before commit.
- Invalid rows block commit; warnings do not disappear.
- Maximum-size/row errors explain the limit and recovery.
- Commit is idempotent or has a durable import key before product promotion.
- A partial commit must identify created/skipped/failed rows and provide recovery; the current all-plan-then-loop behavior is not enough evidence for this contract.
- Imported published state cannot bypass the same readiness validation as a manually built Opportunity.

## 9. Autosave, concurrency, and recovery

- Save section drafts on explicit save or a clearly announced, debounced autosave contract; never mix the two invisibly.
- Show `Saving`, `Saved`, `Could not save`, and `Changed elsewhere` with text.
- Failed edits remain in the field and survive section navigation when safe.
- Concurrent changes offer compare/reload/keep-my-draft; last-write-wins without notice is rejected.
- Draft recovery identifies the Organization and Opportunity before restoring.
- Switching Organization with unsaved changes requires a scoped guard.
- Browser close/navigation guards are a fallback, not the primary recovery system.
- Create, duplicate, import, publish, close, and send-like actions use idempotency keys or equivalent replay protection.

## 10. Publication readiness and consequential edits

Publishing is a state transition, not a button that sets `status = published`.

The readiness service returns typed section results:

- ready;
- incomplete with field/section issues;
- conflict requiring a decision;
- unavailable, where publication fails closed.

At minimum, publication requires:

- valid title, type, Team, and Program;
- public description/guideline contract;
- explicit dates/deadline state;
- explicit geography/reach state;
- practice rules reviewed, including conflicts/deprecated terms;
- eligibility reviewed or explicitly stated as not supplied;
- commercial terms reviewed, with unknown distinct from zero/free;
- valid applicant form with at least the required Work/file/answer model;
- public preview and applicant-flow preview;
- current authorization and Organization scope.

Before final confirmation, state:

- what becomes public;
- when submissions open;
- whether fees/payment are active;
- which connected public listing will update or coexist;
- what applicants with existing drafts will experience.

Editing a published Opportunity classifies changes:

- safe presentation correction;
- consequential applicant-facing change;
- submission-form change affecting new drafts only;
- change requiring notice to existing submitters;
- disallowed while the call is active.

Closing states whether new submissions stop immediately, what happens to drafts/payments, and which review/decision work continues. Historical submissions and decisions are never deleted by closing.

## 11. Required fixtures

Every visual direction must exercise the same fixtures:

1. no Team or Program;
2. empty Opportunity list;
3. one draft;
4. mixed draft/published/closed list;
5. large portfolio;
6. no filter results;
7. read-only Viewer;
8. scoped Program manager;
9. Finance-only commercial section;
10. Legal-only guideline/terms section;
11. long title, Team, and Program names;
12. missing optional image and extreme image crop;
13. incomplete Basics;
14. unknown opportunity type/import mapping;
15. exact, rolling, until-filled, and conflicting deadline states;
16. unknown fee versus explicitly free;
17. multiple currencies and paid call;
18. broad and narrow practice rules;
19. ancestor/descendant rule conflict;
20. deprecated/unknown taxonomy ID;
21. large practice-rule selection;
22. eligibility conflict;
23. geography conflict;
24. no form fields;
25. long form with repeated labels and required files;
26. invalid category/form branch;
27. guideline HTML import success;
28. incomplete PDF extraction warning;
29. blocked/private guideline URL;
30. CSV preview with valid, duplicate, invalid, and skipped rows;
31. import exceeds row/size limit;
32. failed section save with preserved edits;
33. concurrent change;
34. recovered draft;
35. publish-ready draft;
36. publish blocked by multiple sections;
37. readiness unavailable;
38. publish request replay/interruption;
39. published change affecting existing drafts;
40. connected public-record conflict;
41. close call with active drafts/payments;
42. foreign Organization/Opportunity ID;
43. mobile urgent correction;
44. 200% zoom and keyboard-only builder navigation.

## 12. Responsive and accessibility contract

- Desktop: persistent Organization shell and builder section rail; 36px compact controls only for frequent operators; optional preview panel with explicit minimums and one scroll owner.
- Tablet: collapsible section index and full-width editor; public/applicant previews open in a focus-managed sheet or page.
- Mobile: 44px controls, current Organization and Opportunity always visible, horizontal or drawer section navigation, labelled list rows, sticky save/review action only when it does not obscure errors.
- Bulk import and very large form reordering may recommend desktop, but status, validation, correction, preview, publish recovery, and urgent close actions remain usable on mobile.
- One H1 per route; section heading hierarchy is stable.
- Every input has a persistent label, description, and associated error.
- Reordering has Move up/down and keyboard alternatives; drag is never the only method.
- Validation summary links/focuses the exact section and field.
- Publish/close dialogs trap focus, support Escape before final submission, and restore trigger focus.
- Status and readiness never rely on color alone.
- Reduced motion is honored; no essential effect depends on hover or animation.

## 13. Visual and content contract

- True-white canvas, hairline borders, compact operational rhythm.
- Aubergine for the single dominant action, current navigation, and focus—not for lifecycle status.
- Lichen, ochre, mineral blue, and red retain their semantic roles.
- Table/list for the Opportunity inventory; cards only for readiness summary, grouped controls, and previews.
- No badge wall. Status, deadline, type, Program, and one attention consequence are enough for list scanning.
- Use `Organization`, `Team`, `Program`, `Opportunity`, `Submission`, `Work`, `Review`, `Decision`, `Guidelines`, and `Form`.
- Use direct actions: `Create Opportunity`, `Save section`, `Preview public page`, `Preview submission form`, `Review issues`, `Publish Opportunity`, `Close Opportunity`.
- Do not show source freshness, confidence, extraction scores, scheme version, internal IDs, import byte/character counts, queue names, worker language, or “Opportunity photo” labels.

## 14. Product-promotion gates

No selected local composition may enter product routes until:

- the Organization Opportunity model owns or safely projects type, dates, geography, eligibility, commercial terms, practice rules, public content/media, and form sections;
- role/capability projections support scoped Program manager, Finance, Legal, Viewer, and compatibility roles;
- a typed readiness validator fails closed and is enforced by every publish/import path;
- taxonomy conflicts, deprecated/unknown terms, and all 12 facets have a canonical editing/migration contract;
- guidelines and CSV imports are reviewable, bounded, tenant-scoped, and replay-safe;
- section mutations support concurrency and preserved-error recovery;
- published-change and close-call impact policies are implemented;
- list and builder target routes preserve Organization/Program context;
- tenant-leakage, authorization, idempotency, import, readiness, taxonomy, keyboard, responsive, and assistive-technology tests pass;
- authenticated integration and product-route diff receive explicit approval.

Until then, all Organization Opportunities and builder work remains under `/design-system/*`.
