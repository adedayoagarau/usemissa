---
title: Missa Opportunity Layer Master Plan
version: "0.1"
status: proposed
last_updated: "2026-09-09"
owners: Founder, Backend/Data, Frontend/Product, Research/Ops
planning_horizon: proof-gated, not date-driven
---

# Missa Opportunity Layer Master Plan

## Purpose

This plan turns “the opportunity layer of the internet” into bounded programs. It supplements—without replacing—the existing PRD, architecture, and epics.

The full system is:

`publish -> identify -> verify -> distribute -> discover -> evaluate -> prepare -> apply -> confirm -> track -> decide -> remember`

A route, schema, crawler, or prototype is not completion. Each program closes only with its stated evidence.

## Ownership contract

| Lane | Owns | Completion evidence |
| --- | --- | --- |
| **BE — Backend/Data** | Contracts, schema, migrations, ingestion, reconciliation, APIs, permissions, workers, durable events, observability | Tests, migration receipt, example payloads, worker run, database readback, failure/recovery evidence |
| **FE — Frontend/Product** | Journeys, information architecture, page states, components, accessibility, responsive behavior, browser validation | Type/design checks, browser tests, screenshots, keyboard/mobile/zoom/reduced-motion review |
| **SH — Shared/Product/Ops** | Product decisions, source policy, taxonomy, research, publisher operations, privacy/legal review, partnerships, metrics | Approved decision, research ledger, operating procedure, signed pilot, or measured result |

### Agent handoff rule

Every backend handoff must include the contract/schema diff, migration and rollback boundary, success and error payloads, auth rules, fixtures, verification evidence, and unresolved risks. Frontend may start against agreed fixtures, but is not integrated until it passes against the real API. Track BE and FE status independently.

## Program map

| Program | Outcome | Exit gate |
| --- | --- | --- |
| P0. Baseline | Honest map of present capability and approved wedges | Current-state ledger and decisions approved |
| P1. Opportunity Contract | Versioned shared definition of opportunity data | Varied contract fixtures pass |
| P2. Opportunity Graph | Durable identities, editions, evidence, and history | Duplicate/recurrence/change suite passes |
| P3. Trust Operations | Public records remain accurate and correctable | Accuracy, expiry, correction, and quarantine thresholds pass |
| P4. Creator Loop | Discovery becomes confirmed pursuit and retained history | Real end-to-end journey passes |
| P5. Publisher OS | Organizations publish and operate recurring calls | Paid pilots complete and renew |
| P6. Distribution | External systems consume Missa records | One sustained real partner integration |
| P7. Global Coverage | Country-by-country depth without weaker authority | Each regional pilot passes before scale |
| P8. Governance | Safe aggregate intelligence and category stewardship | Privacy/governance review plus measured utility |

## P0 — Establish control

### P0.1 Current-state audit — SH with BE/FE evidence

- Inventory public, authenticated, admin, organization, ranking, and API routes.
- Label each capability: production-verified, deployed-unverified, locally verified, implemented-unverified, prototype, research, or planned.
- Reconcile migrations, databases, workers, providers, and the dirty checkout.
- Baseline coverage, freshness, publication quality, creator activation, and organization usage.

Deliverable: `opportunity-layer-current-state-ledger.md`.

### P0.2 Wedge decisions — SH

Approve the first repeat-use creator segment, paid organization segment, complete opportunity wedge, three creator metrics, one organization outcome worth paying for, and public promise. Candidate first wedge: literary publications, grants, and residencies. Candidate customer: recurring small-to-mid-sized publishers/program operators.

### P0.3 Measurement contract — BE + SH

Define identity, consent, retention, and events for view, save, preparation started, application-ready, destination opened, submission explicitly confirmed, correction, decision, outcome, publisher update, review completion, and renewal.

## P1 — Opportunity Layer Contract v1

### Shared

- P1.S1: Define Organization, Program, Opportunity, Edition, Application Path, Requirement, Eligibility Rule, Benefit, Cost, Evidence, Change, Submission, Decision, and Outcome.
- P1.S2: Preserve distinct organizer, host, funder, partner, nominator, and platform authority.
- P1.S3: Approve lifecycle transitions, correction rules, and compatibility policy.

### Backend/Data

- P1.B1: Publish versioned JSON Schema and TypeScript contracts.
- P1.B2: Define stable IDs, canonical keys, aliases, and edition recurrence.
- P1.B3: Define field-level evidence, conflict, supersession, and uncertainty.
- P1.B4: Map existing tables/contracts without destructive migration.

### Frontend/Product

- P1.F1: Specify the public anatomy of an opportunity.
- P1.F2: Make source, freshness, uncertainty, costs, requirements, and application route legible.
- P1.F3: Design partial, conflicting, changed, closed, and unsafe states.

Fixture gate: magazine submission, paid prize, residency, grant, fellowship, funded degree, rolling call, cancelled call, recurring call with changed URL, nomination-only call, online-only organization, and multilingual source must all be representable with provenance.

## P2 — Canonical Opportunity Graph

### Backend/Data

- P2.B1: Reconcile schema and migrations before graph changes.
- P2.B2: Implement stable organization, program, opportunity, and edition identities.
- P2.B3: Implement aliases and canonical URL history.
- P2.B4: Model organizer/host/funder/partner/nominator/platform relationships.
- P2.B5: Link facts to evidence; preserve conflicts and supersession.
- P2.B6: Generate deterministic duplicate and recurrence candidates.
- P2.B7: Store append-only change history and expose graph/history APIs.

### Frontend/Product

- P2.F1: Show organization/program identity and relationships.
- P2.F2: Separate current and previous editions.
- P2.F3: Show what changed and why.
- P2.F4: Preserve saved state through canonical redirects.

Exit: a recurring program may move domains, change platform, and publish a new edition without losing identity or history.

## P3 — Trust, freshness, and corrections

### Backend/Data

- P3.B1: Per-source cadence, scheduling, lag, and health.
- P3.B2: Critical-field expiry for deadline, eligibility, fee, and application path.
- P3.B3: Field-level change detection.
- P3.B4: Automatic quarantine for unsafe, expired, missing, or conflicting evidence.
- P3.B5: Correction workflow and audit trail.
- P3.B6: Publisher confirmation with scoped permissions.

### Frontend/Product

- P3.F1: Evidence/freshness disclosure.
- P3.F2: Changed/closed/unsafe recovery states.
- P3.F3: Report and correction-status experience.
- P3.F4: Public methodology and aggregate trust dashboard.

### Shared/Ops

- P3.S1: Source acceptance and country research procedure.
- P3.S2: Correction severity, response target, and escalation.
- P3.S3: Monthly sampled accuracy audit.

Proposed pilot targets for approval: >=98% sampled critical-field accuracy; <1% open-now results found closed; 100% of published records with a proven official destination or explicit bounded exception; critical corrections acknowledged within one business day and resolved or quarantined within two.

## P4 — Creator action loop

### Backend/Data

- P4.B1: One canonical save per account/opportunity/edition.
- P4.B2: Durable reusable works, files, answers, bios, budgets, and versions.
- P4.B3: Evidence-derived deterministic preparation checklist.
- P4.B4: Immutable application-ready snapshot and portable export.
- P4.B5: Outbound handoff event distinct from submission confirmation.
- P4.B6: Explicit confirmation, receipt, correction, withdrawal, and undo.
- P4.B7: Reminders, calendar sync, decisions, outcomes, and funnel metrics.

### Frontend/Product

- P4.F1: Discovery -> Save with fit reasons and official source.
- P4.F2: Tracker organized around next actions.
- P4.F3: Application workspace using Library materials.
- P4.F4: Requirement validation and recovery.
- P4.F5: Export/transfer/open-official-form flow.
- P4.F6: Explicit “I submitted” receipt flow; never infer it from a click.
- P4.F7: Calendar, reminders, decisions, and durable history.
- P4.F8: Desktop, 390px, keyboard, 200% zoom, long-content, and reduced-motion validation.

Exit: a new creator completes the entire loop across sessions and devices.

## P5 — Publisher operating system

### Backend/Data

- P5.B1: Organization ownership and roles.
- P5.B2: Versioned opportunity authoring, preview, scheduled lifecycle, and corrections.
- P5.B3: Optional Missa intake with configurable requirements.
- P5.B4: Review, conflicts, scoring, decisions, communication, and audit.
- P5.B5: Reporting, recurring-cycle cloning, billing, and provider reconciliation.

### Frontend/Product

- P5.F1: Organization onboarding and claim recovery.
- P5.F2: Plain-language opportunity builder and evidence preview.
- P5.F3: Submission inbox and accessible review.
- P5.F4: Decisions, delivery, applicant communication, and cycle reporting.

### Shared/Commercial

- P5.S1: Recruit 5–10 design partners.
- P5.S2: Define one paid operational outcome and price.
- P5.S3: Measure onboarding/support burden and renewal.

Exit: three organizations complete real cycles, at least two pay, and renewal intent is evidenced.

## P6 — Distribution infrastructure

### Backend/Data

- P6.B1: Versioned public API with quotas and attribution.
- P6.B2: Change feeds, webhooks, RSS/Atom, calendar, and bulk export.
- P6.B3: Structured-data mapping and canonical URL policy.
- P6.B4: Embeds, cache/revocation, partner telemetry, and abuse controls.

### Frontend/Product

- P6.F1: API documentation with working examples.
- P6.F2: No-code feed/embed builder.
- P6.F3: Attribution/evidence components and partner health dashboard.

### Shared/Partnerships

- P6.S1: Choose one university, arts council, funder, publisher network, or directory partner.
- P6.S2: Establish licensing, correction, redistribution, and attribution terms.

Exit: one external partner consumes updates for 90 days without manual re-entry.

## P7 — Global expansion

### Expansion doctrine

Expansion is country-by-country inside regional waves—not “turn on a continent.” Every country receives a coverage ledger; every source receives an authority contract. Directories discover; official publishers establish public facts. Publish honest coverage by country, language, type, and freshness.

Every regional pilot contains six packages:

1. **SH Research:** country ledger, languages, ecosystems, official indexes, independent publishers, platforms, addresses, and source terms.
2. **BE:** source contracts, fixtures, locale/date/currency/address handling, identity resolution, schedules, reconciliation, and gates.
3. **FE:** geography filters, eligibility explanations, local dates/time/currency, multilingual evidence, and coverage disclosure.
4. **SH Partnerships:** local reviewers, publishers, universities/arts bodies, and correction channels.
5. **SH Compliance:** privacy, minors, payments/fees, communications, and jurisdiction review before regulated workflows.
6. **Proof:** representative records, accuracy, freshness, open-now quality, conflicts, and user/publisher evidence.

### Wave A — Africa

Initial clusters: West (Nigeria, Ghana, Senegal, Côte d’Ivoire); East (Kenya, Uganda, Tanzania, Rwanda, Ethiopia); Southern (South Africa, Zimbabwe, Zambia, Botswana, Namibia); North (Egypt, Morocco, Tunisia, Algeria); Central (Cameroon, DRC, Republic of the Congo).

- Reconcile the existing 54-country literary ledger.
- Expand into visual arts, film, music, performance, grants, residencies, and fellowships.
- Research in English, French, Arabic, Portuguese, and relevant local languages with local review.
- Separate Africa-based, Africa-eligible, diaspora-focused, and globally open.
- Keep address, online-only status, host location, applicant geography, and required presence distinct.

Gate: five countries across three subregions; >=100 verified current opportunities across five types; zero directory-only public authority.

### Wave B — Europe

Clusters: EU/cross-border programs; UK/Ireland; Germany/France/Benelux; Nordics; Central/Eastern; Southern Europe/Balkans.

Priorities: Creative Europe, EU Funding & Tenders, EURAXESS, Erasmus Mundus, MSCA, national arts/research councils, cultural institutes, and first-party hosts. Add consortium/delegated authority, EU/EEA eligibility, GDPR/data-transfer review, multilingual canonical records, and multiple currencies.

Gate: one cross-border program family plus four countries from different language groups.

### Wave C — Asia

Clusters: South Asia; East Asia; Southeast Asia; Central Asia; West Asia.

- Support Unicode-native names, aliases, addresses, and search.
- Preserve original-language evidence with reviewed English summaries.
- Test timezone and local-calendar interpretation.
- Separate nationality, residence, affiliation, nomination, and required presence.
- Map ministry, university, foundation, embassy, and platform authority.

Gate: six countries across three subregions and four writing systems in fixtures and UI tests.

### Wave D — Latin America and the Caribbean

Clusters: Brazil; Mexico; Argentina/Chile/Colombia; Costa Rica/Panama/Guatemala; Jamaica/Trinidad and Tobago/Barbados/Dominican Republic/Cuba/Haiti/Puerto Rico.

- Cover ministry, state, municipal, university, and foundation sources.
- Separate residence and nationality.
- Date monetary evidence to avoid misleading inflation-sensitive values.
- Model regional and overseas-territory relationships.
- Preserve accents in Spanish/Portuguese search and canonicalization.

Gate: Brazil, two Spanish-speaking countries, and two Caribbean jurisdictions with locally reviewed samples.

### Wave E — Oceania and the Pacific

Clusters: Australia; New Zealand/Aotearoa; Papua New Guinea; Fiji; a bounded Samoa/Tonga/Vanuatu/Solomon Islands pilot.

- Represent Indigenous/community eligibility only from explicit evidence.
- Model travel, visa, residence, remoteness, and island-location constraints.
- Map national, state/territory, council, university, and regional-body authority.

Gate: Australia, New Zealand/Aotearoa, and three Pacific states with explicit local authority.

### North America completion

- Audit the US for quality and under-covered types/communities rather than raw volume.
- Add Canada through federal, provincial, territorial, arts council, Indigenous, university, English, and French sources.
- Treat Mexico operationally in the Latin America wave while preserving its geography.
- Represent Greenland/territories only through their actual administrative authorities.

Gate: US quality/freshness audit plus bilingual, multi-province Canada pilot.

### Antarctica

Do not create a general ingestion program. Attach research, arts, or residency opportunities to the administering institution/country and record Antarctica as the activity location.

## P8 — Governance and network intelligence

### Backend/Data

- Consent and permission ledger; aggregate thresholds; re-identification protection.
- Explainable ranking inputs; export, deletion, correction, retention, and audit controls.

### Frontend/Product

- Plain-language consent and preferences.
- “Why this opportunity,” ranking limitations, personal export/deletion, and coverage dashboards.

### Shared/Governance

- Specification change process; regional advisers; appeals/corrections; scam, fee, discrimination, minor, and sensitive-data rules; annual transparency report.

Exit: aggregate intelligence improves outcomes without undisclosed use of private content.

## Execution sequence

### Now

1. P0 current-state audit.
2. Approve wedge and proof metrics.
3. Draft P1 contract.
4. Select the first Africa cluster and fellowship fixture tranche.

### Next

1. Close P2 identity/evidence gaps for the wedge.
2. Establish P3 freshness/correction operations.
3. Finish P4 discovery-to-confirmed-submission.
4. Recruit P5 design partners.

### Then

1. Complete real publisher cycles.
2. Launch one P6 partner integration.
3. Scale Africa only after its gate.
4. Begin Europe, Asia, Latin America/Caribbean, and Oceania/Pacific as separately gated programs.

The regional order reflects existing Africa work and available European institutional sources; it is not a claim of market size or importance.

## Ticket format

Use `OL-[program]-[lane]-[number]`, for example `OL-P1-BE-01`, `OL-P3-FE-02`, or `OL-P7-AFR-SH-01`.

Every ticket includes outcome, owner lane, dependencies, in/out of scope, contract references, acceptance criteria, failure/recovery states, verification evidence, deployment/publication boundary, and the other-lane follow-up if required.

## Founder dashboard

Review monthly: critical-field accuracy and correction time; wedge/regional coverage; save-to-prepare-to-confirm conversion; creator return cycles; completed and renewed publisher cycles; external API/embed usage; end-to-end reliability; privacy/correction/export health.

## Decisions required before execution

1. Confirm or replace the first complete wedge.
2. Confirm the first paid organization segment.
3. Approve or revise the proposed trust thresholds.
4. Choose 5–10 Africa pilot countries.
5. Decide whether Europe follows Africa or runs as a small parallel institutional pilot.
6. Name the owner for BE, FE, and SH lanes.

