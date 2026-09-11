---
title: "deterministic-fit-v1 Phase 0–1 specification"
type: "planning-specification"
status: "complete"
implementationStatus: "phase-1-pure-replay-in-progress-pre-production"
date: "2026-08-20"
policyVersion: "deterministic-fit-v1"
scope: "Phase 0 evidence and Phase 1 pure policy/replay"
---

# deterministic-fit-v1: Phase 0–1 specification

This specification is complete. Phase 0 evidence and the pure Phase 1 policy/replay implementation are complete for pre-production replay. It remains an implementation contract and evaluation plan, not authorization to change live ordering.

Current execution state: `pre-production / replay-only / production-catalogue-verified`. The database/catalogue facts are read-only verified; web runtime, traffic, account behavior, and later promotion gates remain unverified.

## 1. Executive decision

### Build

Build `deterministic-fit-v1` inside the existing TypeScript/PostgreSQL architecture:

```text
authenticated creator
  -> private creator context
  -> canonical published/open Opportunity pool
  -> dispute, safety, and hard-eligibility gates
  -> candidate and evidence provenance
  -> versioned features
  -> deterministic relevance score
  -> separate evidence confidence
  -> diversity/concentration reranking
  -> contribution-derived explanation
  -> stable account-bound feed snapshot
  -> first-party request/impression/action evidence
  -> offline replay and shadow evaluation
```

Each evaluated Opportunity has four separate customer-relevant outputs:

1. `eligibilityState`: `eligible`, `ineligible`, `needs_input`, or `unknown`.
2. `relevanceScore`: a bounded match to explicit intent, feasibility, affinity, value, and timing. It is never an acceptance probability, quality judgment, or winner prediction.
3. `scoreConfidence`: completeness, freshness, provenance, and authority of the evidence. It is not relevance and is not a likelihood of acceptance.
4. `explanation`: positive reasons, material watchouts, missing information, and relevant exclusions derived from the features and gates that actually affected the decision.

Phase 0 evidence and baseline measured current behavior, production truth availability, signal ownership, and the evaluation corpus without ranking changes. After its evidence corpus and ownership decisions passed review, Phase 1 pure policy types, canonical evidence adapters, fixtures, replay reports, and policy diffs were completed while retaining the current serving order.

### Do not build in this milestone

- No learned ranker, acceptance predictor, winner predictor, or artistic-quality score.
- No LLM-generated ranking decision or independent LLM explanation.
- No external recommendation vendor, vector database, Python serving layer, Kafka, feature store, or recommender microservice.
- No migration, production-data mutation, deployment, live ordering change, or promotion of local design-review routes.
- No forced onboarding questionnaire, Profile-completion wizard, public Profile publication, Work upload requirement, or hidden preference gate.
- No demographic or protected-trait inference.
- No use of a Save as evidence of eligibility, fit, application intent, submission, identity, acceptance, or outcome.

### Why policy before screens or ML

The first-Save slice is locally complete, but its completion note says it is not production promotion and leaves durable recommendation provenance, transactional Opportunity-version protection, dispute/safety authority, and production Neon verification open ([completion note L3-L9](../implementation-artifacts/first-save-focused-handoff-completion-note.md#L3-L9)). Expanded onboarding would otherwise collect answers without stable meaning, retention, edit/clear behavior, or a measured effect. ML would amplify the current split between the compatibility and PostgreSQL rankers.

The product boundary remains: public Opportunity reading is open; private matching is account-owned; Profile is a private control surface, not a score; Tracker is the private workbench; official sources and canonical Opportunity state are authoritative. This follows the approved distinction between tailored selection and factual explanation ([Opportunity product scope L110-L120](../planning-artifacts/opportunities-product-design-scope.md#L110-L120)).

## 2. Current-state evidence matrix

Evidence was inspected in the shared worktree on 2026-08-20. `main` points to `3ba7f0646 fix: keep ingestion v2 ids valid for public contracts`; the current branch is `codex/first-save-focused-handoff` at `d88e0e3f4 (HEAD) fix(ingestion): Repair daily opportunity review loop`. Existing unrelated modified and untracked Radar, ingestion, design-system, and writing files are preserved. No `AGENTS.md` file was found by `rg --files -g 'AGENTS.md'`.

The local shell did not contain production credentials during the original review. A follow-up read-only Railway verification on 2026-08-21 confirmed the production database schema, catalogue scale, worker mode, migration ledger, and database query baseline. Web traffic, HTTP latency, real Neon Auth account behavior, and canonical dispute/safety authority remain **production-unverified**. See the [production verification artifact](../implementation-artifacts/deterministic-fit-v1-phase-0-production-verification-2026-08-21.md). Local code and planning documents do not establish production parity by themselves.

| Area                                                  | Status                                                      | Evidence                                                                                                                                                                                                                                                                                | Implication                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Opportunity repository seam                           | Implemented                                                 | `packages/radar-engine/src/opportunityPorts.ts:L195-L215` defines `OpportunityRepository`; `apps/web/app/api/opportunities/route.ts:L7-L24` derives account context server-side, validates output, and sets authenticated `private, no-store`.                                          | Use this seam; do not add a recommender HTTP service.                         |
| Compatibility browse                                  | Implemented, not policy-equivalent                          | `apps/web/lib/opportunityRepository.ts:L60-L155` builds reasons from compatibility preferences, taxonomy, Work, saved searches, and follows; `L207-L225` orders `recommended` by reason count then deadline.                                                                            | Baseline to freeze, not v1.                                                   |
| PostgreSQL browse                                     | Implemented, not policy-equivalent                          | `packages/radar-adapters/src/opportunityRepository.ts:L226-L356` reads canonical public facts and private augmentation; `L452-L463` orders `recommended` by verification, deadline, processing freshness, and ID; `L777-L835` paginates with a sort-key cursor.                         | Current runtimes expose different ranking semantics.                          |
| Public/open gate                                      | Implemented in query paths                                  | PostgreSQL requires published plus four open statuses (`opportunityRepository.ts:L114-L119`, `L520-L526`); compatibility excludes archived, closed, duplicate, and uncertain items (`apps/web/lib/opportunityRepository.ts:L207-L214`).                                                 | Reuse, then add explicit safety/dispute authority.                            |
| Eligibility matching                                  | Implemented, incomplete for v1 semantics                    | `packages/radar-engine/src/matching/fit.ts:L9-L69` emits reasons/watchouts/disqualifiers; `matching.ts:L82-L103` matches preferences and career stages; `matching.ts:L49-L64` can reject missing fee/deadline evidence.                                                                 | Implement four-state eligibility; unknown is not negative.                    |
| Tailoring reasons                                     | Partial                                                     | `opportunityPorts.ts:L72-L76` exposes only tracked/following/reasons; PostgreSQL maps at most four reasons (`opportunityRepository.ts:L686-L758`).                                                                                                                                      | Add contribution, watchout, missingness, and version provenance.              |
| Profile opportunity preferences                       | Implemented locally; canonical ownership unresolved         | `packages/radar-engine/src/domain/types.ts:L425-L441`; `/api/me/profile` update at `apps/web/app/api/me/profile/route.ts:L42-L75`; dual-write note at `packages/radar-adapters/src/postgresStore.ts:L78-L120`.                                                                          | Use explicit fields in fixtures; reconcile authority before serving.          |
| Taxonomy                                              | Implemented with migration boundary                         | Independent versioned facets and separation from eligibility/geography/source are defined in `docs/missa-practice-taxonomy.md:L1-L21`; relational preferences are `packages/db/src/schema.ts:L2105-L2139`.                                                                              | Stable IDs/version only; never infer eligibility from practice.               |
| Saved searches                                        | Partial, compatibility-first                                | Compatibility routes write `RadarProfile` directly (`apps/web/app/api/users/[id]/profiles/route.ts:L7-L34`, `.../profiles/[profileId]/route.ts:L7-L54`); relational `saved_searches` exists at `packages/db/src/schema.ts:L1556-L1573`.                                                 | Explicit signal, but owner/read parity is unresolved.                         |
| Organization follows                                  | Partial, split runtime                                      | Compatibility uses `engine.store.follows` (`apps/web/app/api/users/[id]/following/route.ts:L5-L37`); PostgreSQL reads `organization_follows` (`opportunityRepository.ts:L298-L308`, `packages/db/src/schema.ts:L1636-L1650`).                                                           | Reversible affinity only; reconcile write/read split.                         |
| Private Work metadata                                 | Partial, opt-in only                                        | `LibraryWork` has private taxonomy assignments (`packages/radar-engine/src/domain/types.ts:L481-L499`); `work_taxonomy_terms` exists (`packages/db/src/schema.ts:L2056-L2077`); current SQL reads legacy JSON (`opportunityRepository.ts:L271-L294`).                                   | Metadata-only and account-scoped; absent Work is unavailable, not negative.   |
| Tracker/first Save                                    | Implemented locally; promotion gated                        | First-Save intent and revalidation: `apps/web/lib/firstSaveIntent.ts:L116-L184`, `apps/web/app/api/journey/first-save/resume/route.ts:L116-L192`; canonical unique create-or-get: `packages/radar-adapters/src/canonicalTracker.ts:L249-L310`, `packages/db/src/schema.ts:L1575-L1634`. | Save is interest only; provenance and version locking remain open.            |
| Tracker progression                                   | Implemented, not unified                                    | Canonical status events: `apps/web/app/api/me/tracker/[opportunityId]/status/route.ts:L44-L81`; legacy vocabulary: `packages/radar-engine/src/domain/types.ts:L679-L747`.                                                                                                               | Later soft affinity/evaluation only after parity.                             |
| First-party analytics                                 | Generic ledger implemented; recommendation authority absent | Ledger fields/idempotency: `packages/db/src/schema.ts:L2788-L2825`; first-Save says analytics is non-authoritative (`apps/web/lib/firstSaveAnalytics.ts:L47-L67`); client route rejects authoritative transitions (`apps/web/app/api/analytics/events/route.ts:L73-L89`).               | Add a recommendation evidence contract later; analytics remains a projection. |
| Source/evidence                                       | Partial                                                     | PostgreSQL maps source/processing times, confirmation, verification, taxonomy, rules, materials, and changes (`packages/radar-adapters/src/opportunityRepository.ts:L310-L356`, `L870-L915`).                                                                                           | Enough for read-only fixtures, not a complete point-in-time feature contract. |
| Opportunity-version guard                             | Blocked                                                     | Deferred work says no version/lock contract exists between revalidation and Tracker creation (`_bmad-output/implementation-artifacts/deferred-work.md:L3-L8`).                                                                                                                          | Phase 0 dependency; no invented migration.                                    |
| Dispute/removal/safety authority                      | Blocked                                                     | Deferred work says disputed or unsafe records cannot yet be distinguished truthfully (`deferred-work.md:L5-L7`).                                                                                                                                                                        | Personalized serving cannot claim a complete safety gate yet.                 |
| Real Neon Auth/account-without-Profile Tracker access | Production-unverified                                       | Completion note records local verification but production Neon state as a gate (`first-save-focused-handoff-completion-note.md:L5-L9`); local branch is in `resume/route.ts:L49-L60`.                                                                                                   | Phase 0 performs read-only verification if credentials become available.      |
| Local review/prototype routes                         | Local/prototype only                                        | First-Save prototype is synthetic, in-memory, and performs no auth, persistence, ranking, or external request (`apps/web/components/design-system/first-save-journey-prototype/NOTES.md:L1-L34`).                                                                                       | Never use as product or production evidence.                                  |
| `deterministic-fit-v1` policy                         | Implemented pre-production; replay-only                     | Pure policy, adapters, fixtures, replay, and manifest exist; no serving path invokes it.                                                                                                                                                                                                | Promotion requires the gates in §11.                                          |
| Production scale/traffic/worker state                 | Database/catalogue verified; traffic/HTTP unverified        | Railway read-only verification measured schema, catalogue, worker, and database-query facts; web traffic, HTTP latency, and account behavior remain unverified.                                                                                                                         | Keep traffic/runtime verification separate from replay completion.            |
| Browser CI baseline                                   | Unresolved dependency                                       | Focused first-Save tests passed only in an isolated demo-backed checkout (`first-save-focused-handoff.md:L92-L97`).                                                                                                                                                                     | Keep separate from Phase 1 policy exit.                                       |

### Current decision

Current `recommended` is not a trustworthy single policy: one runtime uses compatibility reason-count ordering and another uses evidence/deadline ordering. Implement and replay v1 first; retain current serving order.

## 3. Canonical signal inventory

### Signal conventions

All inputs use a typed envelope:

```ts
type Signal<T> = {
  value: T | null;
  state: "known" | "unknown" | "not_provided" | "conflict" | "redacted";
  source:
    | "creator-explicit"
    | "creator-action"
    | "creator-inferred"
    | "opportunity-source"
    | "opportunity-review"
    | "system-context";
  observedAt: string;
  effectiveAt?: string;
  sourceRef?: string;
  taxonomyVersion?: number;
  sourceVersion?: string;
  policyVersion?: string;
  confidence: number;
  editable: boolean;
  clearable: boolean;
  retentionClass:
    "account-private" | "action-history" | "catalogue-evidence" | "operational";
};
```

`unknown`, `not_provided`, and `conflict` are not false. Missing information cannot be a negative preference. Explicit creator input overrides inferred behavior. Derived signals retain their inputs and derivation version.

### Creator inputs

| Input                                           | Owner/source; time/version/confidence                                                                                                                   | Edit/undo/retention                                                                | Permitted use and boundary                                                                                          | Missing and decision role                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Practice include/prefer/exclude                 | Profile private preferences; target `account_taxonomy_preferences`, compatibility user snapshot; update time; taxonomy version; explicit confidence 1.0 | Edit/remove/clear in Profile; account-private history only if approved             | Intent/affinity; exclude may gate only against confirmed Opportunity taxonomy; never identity/eligibility inference | No value means no stated practice; soft score/explain; confirmed exclude can hard-exclude |
| Opportunity type, discipline, genre, form, role | Profile preferences or saved-search predicates; explicit time and schema/taxonomy version                                                               | Edit/clear; saved search rename/edit/pause/delete                                  | Explicit intent and explanation; no protected inference                                                             | Missing is unknown; soft score unless creator explicitly marks a hard constraint          |
| Geography and participation mode                | Proposed private Profile field; not a complete current canonical read; explicit time/geography version/confidence 1.0                                   | Edit/scope/clear; private by default                                               | Feasibility against source-backed remote/local/hybrid/travel facts; never infer nationality/residence               | Skipped is unknown; confirmed mismatch may gate                                           |
| Fees, currency, funding, travel                 | Current `maxFeeCents`/`noFeeOnly`; proposed normalized budget/travel-support fields; explicit time/schema version                                       | Edit/clear; preserve currency semantics                                            | Fee feasibility; distinguish entry fee, travel, materials, prize, stipend, and funding                              | Unknown fee/support is unknown, not paid; only confirmed mismatch can gate                |
| Accessibility                                   | Proposed private field; explicit only; policy/version and time                                                                                          | Edit/clear/delete under privacy controls                                           | Compare only with source-backed access information; never infer sensitive traits                                    | Missing source facts are unknown/needs input; no exclusion from absence                   |
| Preparation capacity                            | Proposed private preference; explicit time/policy version                                                                                               | Edit/clear                                                                         | Preparation runway/timing score; no quality judgment                                                                | Missing is unavailable; soft score/watchout                                               |
| Career stage and goals                          | Current `careerStages`; proposed stated goals; explicit time/version                                                                                    | Edit/clear; private                                                                | Intent and confirmed stage rule; stage is not quality                                                               | Missing unknown; confirmed comparable mismatch may gate                                   |
| Saved search                                    | `saved_searches` target or compatibility `RadarProfile`; explicit predicate and update time/version                                                     | Rename/edit/pause/delete                                                           | Strong intent and explanation from predicate overlap                                                                | No search means no contribution; soft score, not blanket exclusion                        |
| Followed Organization                           | `organization_follows` target or compatibility follows; explicit follow time                                                                            | Unfollow removes future affinity; audit/history retention reviewed                 | Affinity and factual explanation; never endorsement, prestige, or eligibility                                       | Not followed is not negative; soft score only                                             |
| Selected private Work taxonomy                  | `LibraryWork`, target `work_taxonomy_terms`, current compatibility JSON; creator-selected term IDs, Work/update time, taxonomy version                  | Edit/delete Work; disable/clear matching                                           | Optional metadata-only affinity; no raw text, files, filenames, or public projection                                | No selected Work/opt-out means unavailable; soft score/explain only                       |
| Save/Tracker status                             | `tracked_opportunities` and `tracked_status_events`; explicit action/status time and canonical Opportunity version                                      | Undo/unsave/archive/correct explicitly; retain action history under approved class | Weak affinity/evaluation signal; later progression may be stronger; never eligibility/identity/outcome              | No Save is not negative; soft score only after provenance                                 |
| Dismiss/correction/pause/reset                  | Proposed recommendation action ledger; explicit time and policy/event version                                                                           | Undo/reset/clear/pause; corrections append                                         | Negative relevance for stated item/context; user control and evaluation                                             | No event is unknown; never global exclusion without explicit scope                        |
| Served/rendered/viewable/open behavior          | Proposed first-party evidence; occurrence/ingestion time and event schema                                                                               | Account deletion/reset retention; minimized raw events                             | Evaluation and weak affinity; not a negative if not rendered                                                        | Missing event is missing evidence, not rejection                                          |
| Locale/time zone                                | Validated request/system context; request time/context version                                                                                          | Creator can change; request history separately retained                            | Deadline normalization/display only; not geography eligibility                                                      | Missing uses display default; never a gate                                                |
| Eligibility self-description                    | Proposed private field, explicit only, purpose/privacy version                                                                                          | Edit/clear/export/delete; never public or analytics                                | Compare only to corresponding source rule                                                                           | Skipped unknown; confirmed mismatch may gate                                              |

Sensitive/protected attributes are never inferred from practice, language, name, IP, browsing, Work content, or country proxy. They are used only when a stated Opportunity rule makes an explicit private answer necessary.

### Opportunity inputs

| Input                                      | Owner/source; time/version/confidence                                                                                 | Retention/correction                                                        | Permitted v1 use                                   | Gate/score/explain                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Canonical ID/version and publication state | `opportunities`, `opportunity_versions`, approved publication authority; effective time/schema/policy version         | Immutable version history; correction/new version; suppression/removal path | Join, point-in-time provenance, public pool        | Publication is a hard gate; version is provenance                                    |
| Lifecycle/deadline/timezone                | Canonical status/deadline/change tables plus source evidence; effective/source/processing time and source version     | Append changes; recheck at serve time                                       | Open gate, timing/feasibility, explanation         | Confirmed closed/past deadline gates; conflict/stale/unknown is uncertainty          |
| Source identity/official destination       | `opportunity_sources`, source evidence, controlled outbound validation; source ID, URL, checked/processed time        | Evidence locator and correction/removal path                                | Provenance and destination safety                  | Unsafe/withdrawn destination gates; confidence/explain                               |
| Freshness/verification evidence            | `opportunity_source_evidence`, `verified_until`, successful processing time                                           | Evidence append-only; stale becomes stale/unknown                           | Confidence and watchout; limited timing            | Surface-specific gate only where policy says verified-only                           |
| Organization identity                      | `radar_organizations`, confirmed links, source evidence; effective time/authority                                     | Merge/redirect audit and correction                                         | Candidate provenance and concentration group       | Duplicate/safety/diversity; not prestige                                             |
| Type and call profile                      | Canonical type; optional reviewed `OpportunityCallProfile`; source/time/version                                       | Correct through version/change                                              | Intent, timing, factual explanation                | Score/diversity; no acceptance inference                                             |
| Taxonomy assignments                       | `opportunity_taxonomy_terms`, source/organization/reviewer assignment; term/facet/certainty/taxonomy version/evidence | Correct/reject with audit; new version                                      | Intent, affinity, coverage, diversity, explanation | Confirmed explicit exclusion can gate; probable/inferred soft score; unknown missing |
| Eligibility rules                          | `opportunity_eligibility_rules` and detail projection; rule/value/description/certainty/source                        | Versioned correction/dispute path                                           | Four-state eligibility and watchouts               | Confirmed comparable mismatch gates; unknown becomes needs input/unknown             |
| Geography/participation/travel             | Current location plus proposed normalized evidence; effective/source time and confidence                              | Correction/version/source locator                                           | Feasibility and explanation                        | Confirmed mismatch only can gate                                                     |
| Fee/currency/other cost                    | `fee_status`, `fee_cents`, `fee_currency`, source evidence; disclosure/effective time                                 | Corrected fee/version/change                                                | Fee feasibility and factual explanation            | Confirmed mismatch may gate; unknown never rejects                                   |
| Funding/support/prize                      | Proposed normalized facts; current prize is not funding; source/effective time/currency                               | Correction/version/evidence                                                 | Feasibility/value facts; never prestige            | Soft score/watchout/explain                                                          |
| Accessibility                              | Proposed structured source facts; source/effective time                                                               | Correction/removal path                                                     | Feasibility against explicit need                  | Confirmed incompatibility only can gate                                              |
| Required materials/preparation             | `opportunity_required_materials`; proposed effort estimate; source/time/schema                                        | Version/change                                                              | Preparation score/watchout                         | Soft score; missing unknown                                                          |
| Duplicate/merged relationship              | Canonical dedup authority; effective time/policy                                                                      | Redirect/merge history                                                      | Candidate dedup/concentration                      | Confirmed duplicate gates                                                            |
| Dispute/removal/safety                     | Proposed canonical authority; decision/effective time/reason/policy version                                           | Append decision/correction/emergency suppression                            | Safety gate and bounded explanation                | Confirmed unsafe/disputed/removed gates; absent authority is unknown                 |
| Competition history/enrichment             | Reviewed evidence only; source URL, evidence/edition/outcome version                                                  | Review/correction queue; no unreviewed publication                          | Metadata/explanation/coverage only                 | Never acceptance/winner prediction                                                   |

Official sources and canonical Opportunity state own facts. Compatibility JSON, generic analytics, notifications, and design prototypes cannot silently become authorities.

## 4. Policy contract

### 4.1 Pure policy interfaces

These are Phase 1 contracts. They do not authorize a migration; adapters may initially construct them from fixtures and read-only projections.

```ts
export type EligibilityState =
  "eligible" | "ineligible" | "needs_input" | "unknown";

export type MissingReason =
  | "not-provided"
  | "not-modeled"
  | "source-omitted"
  | "stale"
  | "conflict"
  | "redacted"
  | "not-applicable";

export interface RecommendationSignal<T> {
  key: string;
  value?: T;
  missing?: MissingReason;
  source: string;
  sourceRef?: string;
  observedAt: string;
  effectiveAt?: string;
  taxonomyVersion?: number;
  sourceVersion?: string;
  confidence: number; // 0..1 evidence confidence, not relevance
  explicit: boolean;
}

export interface RecommendationContext {
  accountId: string;
  contextVersion: string;
  now: string;
  locale?: RecommendationSignal<string>;
  timeZone?: RecommendationSignal<string>;
  practice: RecommendationSignal<{
    include: string[];
    prefer: string[];
    exclude: string[];
  }>;
  opportunityPreferences: RecommendationSignal<{
    types?: string[];
    disciplines?: string[];
    genres?: string[];
    locations?: string[];
    participation?: string[];
    maxFee?: { amountMinor: number; currency: string };
    noFeeOnly?: boolean;
    travel?: "willing" | "unwilling" | "unknown";
    accessibility?: string[];
    preparationDays?: number;
    careerStages?: string[];
    goals?: string[];
  }>;
  savedSearches: Array<RecommendationSignal<Record<string, unknown>>>;
  followedOrganizations: Array<RecommendationSignal<string>>;
  selectedWorks: Array<
    RecommendationSignal<{
      workId: string;
      taxonomyTermIds: string[];
    }>
  >;
  trackerSignals: Array<
    RecommendationSignal<{
      opportunityId: string;
      status: string;
      occurredAt: string;
    }>
  >;
  behaviorSignals: Array<
    RecommendationSignal<{
      opportunityId: string;
      action: "rendered" | "viewable" | "opened" | "saved" | "dismissed";
      occurredAt: string;
    }>
  >;
  explicitEligibility?: RecommendationSignal<Record<string, string>>;
}

export interface OpportunityEvidence {
  opportunityId: string;
  versionId: string;
  title: string;
  publicationState:
    "published" | "reviewable" | "suppressed" | "withdrawn" | "unknown";
  lifecycle:
    | "opening-soon"
    | "open"
    | "closing-soon"
    | "deadline-extended"
    | "closed"
    | "unknown";
  type: string;
  taxonomy: RecommendationSignal<Array<{ termId: string; certainty: string }>>;
  eligibilityRules: Array<
    RecommendationSignal<{
      key: string;
      value?: string;
      description: string;
    }>
  >;
  geography: RecommendationSignal<{
    mode: "remote" | "hybrid" | "onsite" | "travel-required" | "unknown";
    regions?: string[];
  }>;
  fee: RecommendationSignal<{
    status: "no-fee" | "paid" | "unknown";
    amountMinor?: number;
    currency?: string;
  }>;
  funding?: RecommendationSignal<{
    kind: string;
    amountMinor?: number;
    currency?: string;
  }>;
  accessibility?: RecommendationSignal<string[]>;
  preparation?: RecommendationSignal<{
    requiredMaterialCount?: number;
    estimatedDays?: number;
  }>;
  deadline?: RecommendationSignal<{
    kind: string;
    date?: string;
    timeZone?: string;
  }>;
  source: RecommendationSignal<{
    sourceId: string;
    url: string;
    authority: string;
  }>;
  safety: RecommendationSignal<{
    state: "clear" | "disputed" | "removed" | "unsafe" | "unknown";
  }>;
  organization?: RecommendationSignal<{
    organizationId: string;
    name: string;
  }>;
}

export interface EligibilityDecision {
  state: EligibilityState;
  hardReasons: Array<{
    code: string;
    signalKeys: string[];
    customerSafe: boolean;
  }>;
  missing: Array<{ code: string; signalKeys: string[] }>;
  gateVersion: string;
}

export interface FeatureContribution {
  group: "explicit-intent" | "feasibility" | "affinity" | "value-timing";
  key: string;
  value?: number;
  missing?: MissingReason;
  confidence: number;
  normalized: number;
  weight: number;
  contribution: number;
  signalRefs: string[];
}

export interface PolicyExplanation {
  positiveReasons: Array<{
    code: string;
    label: string;
    contributionKeys: string[];
  }>;
  watchouts: Array<{ code: string; label: string; signalKeys: string[] }>;
  missingInformation: Array<{
    code: string;
    label: string;
    signalKeys: string[];
  }>;
  exclusions: Array<{ code: string; label: string; signalKeys: string[] }>;
  policyVersion: "deterministic-fit-v1";
}

export interface RecommendationCandidateResult {
  opportunityId: string;
  eligibilityState: EligibilityState;
  relevanceScore: number; // integer 0..1000; never a probability
  scoreConfidence: number; // integer 0..1000; evidence confidence only
  contributions: FeatureContribution[];
  explanation: PolicyExplanation;
  provenance: {
    candidateGenerators: string[];
    opportunityVersionId: string;
    taxonomyVersion?: number;
    sourceEvidenceRefs: string[];
  };
}

export interface RecommendationFeedSnapshot {
  feedId: string;
  accountId: string;
  surface:
    | "browse"
    | "search"
    | "home"
    | "digest"
    | "notification"
    | "onboarding-preview";
  queryHash: string;
  contextHash: string;
  policyVersion: "deterministic-fit-v1" | "baseline";
  orderedOpportunityIds: string[];
  generatedAt: string;
  expiresAt: string;
}
```

Raw contributions, internal authority/safety signals, exact weights, account IDs, sensitive eligibility values, and operational fields never enter public DTOs.

### 4.2 Eligibility gates

Eligibility is evaluated before relevance and cannot be traded away by score or diversity.

1. Only canonical `published` Opportunities enter the personalized pool. `draft`, `reviewable`, `suppressed`, `withdrawn`, and unknown publication state do not become eligible.
2. Confirmed unsafe, disputed, removed, or emergency-suppressed items are `ineligible`. If the safety authority is unavailable, the result is `unknown` and is excluded from high-confidence personalized surfaces; it is not declared safe.
3. Closed, archived, duplicate, or confirmed past-deadline items are `ineligible`. Rolling, until-filled, conflicting, date-only, or stale deadline facts remain uncertainty according to surface policy.
4. An explicit creator taxonomy exclusion hard-excludes only when the Opportunity assignment is confirmed. Probable/inferred taxonomy does not hard-exclude.
5. Citizenship, residence, age, career stage, membership, discipline, location, or other rule mismatches hard-exclude only when both Opportunity rule and creator value are explicit/confirmed and comparable.
6. Explicit no-travel, no-fee, fee ceiling, accessibility, remote, or participation constraints hard-exclude only against confirmed corresponding facts. Unknown fee, travel support, accessibility, or location never rejects.
7. Duplicate canonical records are removed. Already saved/tracked records remain eligible unless a surface explicitly suppresses completed actions; Save never becomes an eligibility signal.

State semantics:

- `eligible`: all required gates pass with no unresolved material gate.
- `ineligible`: at least one confirmed hard mismatch or safety/publication failure.
- `needs_input`: a creator answer could resolve a material gate.
- `unknown`: source/evidence is absent, stale, conflicting, or unavailable.

`needs_input` and `unknown` remain observable in replay and may appear as bounded watchouts or a clarification module. They do not silently enter high-confidence notifications.

### 4.3 Candidates and provenance

Logical generators are named even when the initial implementation uses one bounded SQL pool:

`explicit-taxonomy`, `explicit-opportunity-preferences`, `saved-search`, `followed-organization`, `selected-work-taxonomy` (opt-in), `deadline-and-preparation`, `fresh-catalogue`, and `baseline-open-catalogue`.

Generators merge by canonical Opportunity ID. Raw generator scores are not compared. Every candidate retains generator names, Opportunity version, taxonomy scheme, source evidence references, effective time, and missingness.

### 4.4 Features, normalization, and hypotheses

Weights are **testable hypotheses**, not calibrated truths. Changes require a new policy manifest/version, replay diff, fixture review, and curator approval.

| Group            | Weight | Initial feature weights                                                                |
| ---------------- | -----: | -------------------------------------------------------------------------------------- |
| Explicit intent  |     45 | taxonomy 20; Opportunity type 10; saved-search overlap 10; stated goal/stage 5         |
| Feasibility      |     25 | fee/cost 8; participation/geography 5; preparation runway 7; materials/accessibility 5 |
| Affinity         |     15 | opt-in Work taxonomy 7; followed Organization 4; explicit behavior 4                   |
| Value and timing |     15 | deadline/timing 6; novelty/recency 5; decision-value facts 4                           |

Normalization hypotheses:

- exact governed taxonomy overlap `1.0`; descendant/ancestor overlap `0.75`; related/broader overlap `0.5`; no relation `0`.
- exact type match `1`; no stated type unavailable; mismatch gates only when explicitly hard-constrained.
- saved-search score is the satisfied structured-predicate weight divided by available predicate weight, capped so one broad search cannot dominate.
- confirmed no-fee against no-fee preference `1`; fee within explicit ceiling declines toward the ceiling; unknown fee is unavailable, not `0`.
- confirmed compatible geography/mode `1`; unknown is unavailable; confirmed mismatch is a gate.
- preparation compares confirmed/estimated days remaining with explicit creator capacity; no false precision when estimates are absent.
- Work uses only creator-selected canonical terms; no raw Work text/files/filenames.
- viewable/open is weak behavior; Save/Track stronger; preparation/submission later and only after canonical event parity. Served-but-not-rendered is not negative.
- deadline proximity can raise usefulness but cannot override closed/unsafe/unknown gates.

For group `g`:

```text
groupScore(g) =
  sum(featureWeight[j] * normalized[j] * confidence[j] for available j)
  / sum(featureWeight[j] * confidence[j] for available j)
```

If no feature in a group is available, omit that group from the base denominator. Missing optional information is not a zero preference.

```text
baseScore =
  1000 * sum(groupWeight[g] * groupScore(g) for available groups)
          / sum(groupWeight[g] for available groups)
```

Use fixed-point integer basis points (`0..1000`) after deterministic rounding. Never label the score as a probability, fit likelihood, or acceptance chance.

### 4.5 Separate confidence

`scoreConfidence` describes evidence completeness, freshness, provenance, and authority, not relevance. Initial hypothesis:

```text
completeness = available weighted feature mass / declared feature mass
freshness = weighted freshness within each signal TTL
provenance = weighted authority and locator completeness
authority = publication, eligibility, taxonomy, and destination authority health

scoreConfidence = round(1000 * (
  0.35 * completeness + 0.25 * freshness +
  0.25 * provenance + 0.15 * authority
))
```

Apply conservative floors: unresolved material eligibility caps confidence at `400`; conflicting deadline caps timing confidence at `500`; unknown source/destination authority prevents high-confidence notification use. Constants are hypotheses.

### 4.6 Diversity and concentration

Rerank the eligible/servable set, not isolated items:

```text
pageValue(candidate, selected) =
  0.82 * relevance(candidate)
  - 0.18 * maxSimilarity(candidate, selected)
  - organizationConcentrationPenalty
  - typeConcentrationPenalty
  + boundedDiscoveryBonus
```

Initial constraints: no more than two from one Organization in the first ten unless explicitly requested; avoid more than three consecutive results of one type; at most one bounded discovery slot in the first ten; no diversity rule restores `ineligible`, `needs_input`, or disallowed `unknown`; no protected-trait quota in v1. Search, browse, digest, notification, and onboarding preview use separate thresholds and constraints.

### 4.7 Stable ordering and pagination

One feed snapshot uses one policy, feature, taxonomy, eligibility, and explanation version through pagination. The current PostgreSQL cursor is a sort-key/ID cursor (`packages/radar-adapters/src/opportunityRepository.ts:L764-L775`), not a policy-version-bound snapshot.

The later serving boundary must bind an opaque signed/server-resolved cursor or snapshot to account, surface, query/context hash, versions, ordered IDs, generated/expiry times, and ordinal. Later pages recheck live publication, safety, and deadline without silently re-ranking the remaining list. Preference or policy changes create a new snapshot.

Tie-break order: page value descending; relevance descending; confidence descending; authority tier descending; deadline ascending/nulls last; successful processing time descending; canonical Opportunity ID ascending.

### 4.8 Contribution-derived explanations

The explanation generator reads contributions, gates, and missingness. It is deterministic and templated; it is not an independent model. Each reason must trace to a non-zero contribution or a gate fact that affected servability. Watchouts state material uncertainty. Missing information says what Missa needs to verify. No explanation may claim “perfect fit,” “best,” “likely to win,” “likely to be accepted,” or “your Work qualifies.”

```json
{
  "positiveReasons": [
    {
      "code": "intent.taxonomy",
      "label": "Matches the poetry practice you selected",
      "contributionKeys": ["explicit-intent.taxonomy"]
    },
    {
      "code": "feasibility.remote",
      "label": "Can be entered remotely",
      "contributionKeys": ["feasibility.participation"]
    }
  ],
  "watchouts": [
    {
      "code": "evidence.residency-unknown",
      "label": "Residency requirements need checking",
      "signalKeys": ["opportunity.eligibility.residency"]
    }
  ],
  "missingInformation": [],
  "exclusions": [],
  "policyVersion": "deterministic-fit-v1"
}
```

### 4.9 Fallback and versioning

If context assembly, canonical reads, scoring, reranking, snapshot creation, or event persistence fails, return the existing requested public sort or safe default with `policyVersion: "baseline"`. The fallback is independent of recommendation tables, PostHog, workers, LLMs, external providers, and partial events.

Version separately: policy, feature set, eligibility gates, taxonomy scheme, explanation, event schema, and surface policy. An activation manifest names versions, checksums/configuration, evaluation report, curator approval, and rollback target. Rollback changes the active policy pointer to baseline or the previous approved version; it never deletes evidence or changes canonical Opportunity/Tracker state.

## 5. First-Save signal contract

### Durable provenance

The existing `discovery.opportunity_saved` event is not sufficient. It is a bounded analytics event, and its implementation states that analytics never owns the Save transition (`apps/web/lib/firstSaveAnalytics.ts:L31-L67`). Before personalized serving promotion, canonical Save/Tracker state must retain or link:

- account ID and canonical Tracker ID;
- Opportunity ID and exact `opportunityVersionId` read at intent/revalidation;
- taxonomy scheme and assignment digest/IDs;
- source ID, official URL, evidence IDs/versions, checked/processed timestamps, and destination-host state;
- eligibility rule IDs/digests and safety/dispute decision state;
- first-Save `journeyId`, intent version, original/current material fingerprints, and acknowledgment time;
- policy/feature/surface versions if attributed to a recommendation exposure;
- action occurrence/ingestion time, idempotency key, actor, and canonical source;
- undo/clear state and correction linkage.

This is a separately approved durable domain record or approved extension of the Tracker event contract. Phase 1 defines the contract and replay adapter only; it does not migrate production or persist new production signal rows.

### Behavior

- First explicit Save creates or resumes one account-bound intent, revalidates current facts, and performs one idempotent Tracker create-or-get.
- Repeated Save, retry, multi-tab, or lost response returns the same Tracker row. It does not inflate relevance.
- `created` and `already-present` are separate receipts for the same canonical state.
- Unsave/clear is creator-controlled, reversible, and removes future positive affinity/explanations. It does not silently rewrite historical exposure/action evidence.
- Tracker progression can become a later soft affinity/evaluation signal only after canonical event parity. It never proves eligibility or acceptance likelihood.
- A changed Opportunity retains the historical Save version and shows current state separately. A stale version is not silently relabeled current.
- Closed, removed, unsafe, or disputed items are not newly saved by personalized policy. Existing Tracker history follows Tracker retention and is not presented as an active application.
- Analytics mirrors canonical events and evaluation; it cannot create Tracker state, authorize Opportunity eligibility, or override correction/reset.

Recommendation signal history is account-private. The privacy contract excludes matching, saved searches, follows, Works, eligibility attributes, Opportunity titles, and Tracker details from public projection ([privacy story L22-L28](../../_bmad-output/implementation-artifacts/2-3-privacy-settings.md#L22-L28)). Deletion, pause, reset, and clear must propagate to active context, snapshots, derived features, optional Work-derived rows, and future exports under the approved retention schedule.

## 6. Evaluation corpus

Phase 0 creates a versioned corpus. Every fixture contains creator context, Opportunity versions/evidence, current time, timezone, expected eligibility state, feature availability, expected explanation, and ordering constraints.

### Creator fixtures

- Emerging creator in Ghana (`Africa/Accra`, GHS budget, remote-first, no travel, poetry/sound, incomplete Profile).
- Established creator in Brazil (`America/Sao_Paulo`, BRL budget, hybrid/in-person, Portuguese/English, stage-specific grants).
- Interdisciplinary creator in India (`Asia/Kolkata`, film/design, multi-parent taxonomy, no-fee preference, incomplete goals).
- Creator in Canada (`America/Toronto`, CAD/USD ambiguity, travel-supported opportunities, accessibility need explicitly supplied).
- Creator in Nigeria (`Africa/Lagos`, emerging, short preparation capacity, local/cross-border, no hidden nationality inference).
- Creator in Japan (`Asia/Tokyo`, language-specific practice, strict deadline window, remote-only).
- Creator with no preferences or Work; all private matching inputs unknown.
- Creator with contradictory explicit include/exclude ancestor/descendant terms; the policy must not silently choose.
- Creator whose explicit current Profile preference overrides older opens.
- Identical creator with Work matching enabled versus disabled.
- Creator with personalization paused/reset and creator with all signals cleared.

### Opportunity fixtures

- Local Ghana residency with GHS fee, exact local eligibility, confirmed source, and Africa/Accra timing.
- Remote global poetry call with no fee and confirmed deadline.
- Hybrid programme with confirmed travel requirement and EUR support; creator currency differs.
- In-person residency with no support and confirmed region restriction.
- Grant with funding and no entry fee; fee is not confused with prize/funding.
- Paid USD contest against an explicit no-fee constraint.
- Fee not disclosed; no-fee creator gets unknown/watchout, not rejection.
- Accessibility confirmed, absent, and contradictory.
- Short deadline with materials whose estimated preparation exceeds creator capacity.
- Rolling, until-filled, date-only, conflicting, stale, and timezone-boundary deadlines.
- Citizenship, residence, and unrestricted cross-border rules compared only with explicit creator data.
- Sparse Opportunity with title/type/deadline but no taxonomy, fee, location, or eligibility evidence.
- Contradictory Opportunity with competing source deadlines/fees.
- Inferred/probable taxonomy and rejected taxonomy assignments.
- Disputed, removed, suppressed, duplicate, merged, closed, and stale records.
- Highly concentrated pool: ten from one Organization and ten from distinct Organizations with equal scores.
- New, recently verified, and older items with equal intent match.
- Unknown, changed-host, unsafe, and validated official submission destinations.
- Competition enrichment with reviewed official evidence, probable evidence, gaps, and no named current outcome; it cannot predict acceptance.

### Representation

The corpus covers multiple countries, regions, currencies, time zones, languages, source tiers, and catalogue-density bands. Each fact is labelled confirmed, probable, inferred, unknown, conflicting, stale, or not provided. Under-documented regions and sparse evidence are mandatory fixtures; several countries alone are not representative.

## 7. Golden and adversarial tests

### Determinism and score behavior

- Same inputs, time, manifest, and surface produce byte-for-byte identical results, contributions, explanations, and tie order.
- Input insertion order, generator order, object-key order, and database row order do not affect output.
- Fixed-point rounding is stable across supported Node runtimes.
- Removing one explicit positive feature changes only affected contributions/explanations.
- Missing optional features are omitted from group denominators, not scored as zero.

### Eligibility invariants

- Confirmed ineligibility defeats positive relevance, confidence, follow, Save, discovery bonus, and diversity.
- Confirmed hard-eligibility violation rate is zero in the corpus.
- Unknown fee, location, accessibility, deadline, taxonomy, or source evidence never becomes rejection.
- Explicit creator preference overrides inferred behavior.
- Inferred/probable taxonomy cannot hard-exclude.
- Sensitive/protected traits are never inferred from practice, language, location proxy, name, behavior, or Work content.
- Diversity cannot restore ineligible, needs-input, or disallowed unknown items.

### Explanation faithfulness

- Every positive reason maps to a non-zero contribution or gate fact affecting servability.
- Every watchout maps to material unknown/conflict/staleness or a scored constraint.
- Removing a stated reason reduces the score, removes the reason, or records a logged replacement.
- No acceptance, winning, quality, or unbounded Work-readiness claims.
- Explanations use the actual source/version and creator input used.

### Fallback and pagination

- Context, scoring, reranking, snapshot, or event failure returns the independent baseline catalogue.
- A snapshot paginated twice returns the same policy-bound order for live-safe items.
- A policy/config change between pages does not reorder the snapshot.
- Preference edit starts a new snapshot; old snapshot does not mutate.
- Live removal/closure is rechecked and never returned.

### Privacy, correction, and action tests

- Account A’s context, Work, searches, follows, Tracker, snapshot, contributions, and actions never appear for Account B.
- Client-supplied account IDs cannot choose context.
- Clear/delete/disable Work matching removes future contributions and explanations.
- Unfollow removes future affinity; history remains access-controlled.
- Opportunity correction invalidates affected features without rewriting old Save provenance.
- Reset/pause returns explicit-only or baseline policy as requested.
- Repeated Save is create-or-get; lost-response retry returns `already-present`.
- Stale material snapshot requires review and cannot create from old facts.
- Tracker progression is recorded by canonical mutation; analytics-only requests are not authority.

## 8. Evaluation plan

Acceptance or winner rate is not the primary KPI. Those outcomes are delayed, organizer-controlled, incompletely reported, selectively observed, and affected by access and exposure.

| Metric                         | Definition and use                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Eligibility violation rate     | Confirmed hard-ineligible items served/ranked as eligible; release target zero.                                         |
| Eligible-candidate recall      | Eligible candidates surfaced at K / eligible candidates available under the same query/surface.                         |
| Precision@K and graded NDCG@K  | Curator-rated usefulness at K, compared with both current rankers and baseline.                                         |
| Catalogue/segment coverage     | Distinct eligible items exposed, segmented by country, source, discipline, type, fee, and density.                      |
| Missingness                    | Unknown/needs-input rates by source, country, locale, discipline, stage, fee band, and density.                         |
| Diversity/concentration        | Organization/type/taxonomy/geography novelty, top-organization share, and consecutive-type run.                         |
| Explanation faithfulness       | Reasons supported by actual contributions/gates / displayed reasons; target 100% in release fixtures.                   |
| Fallback rate                  | Baseline-served requests / recommendation requests; must not silently create empty feeds.                               |
| Latency                        | Candidate, feature, score, rerank, snapshot, total p50/p95/p99.                                                         |
| Event completeness/duplication | Required fields present; duplicate IDs or conflicting idempotency payloads.                                             |
| Creator correction rate        | Dismissal, correction, reset, or preference edit after exposure; a control signal, not an automatic negative label.     |
| Safety/privacy failures        | Unauthorized access, private leakage, unsafe/closed exposure, and incorrect hard exclusion; target zero.                |
| Meaningful progress            | Save/Track/preparation/submission after viewable exposure, position- and segment-aware; not a sole optimization target. |

Use two trained curators for eligibility, relevance, and explanation review; retain disagreement and adjudication. Use point-in-time joins for historical cases. Do not treat unseen/below-fold items as negatives. Keep acceptance/winner information in a separate descriptive evidence track.

Recommendation evidence distinguishes requested, served, rendered, viewable, opened, and action. Served-but-not-rendered is not negative. Events carry opaque account-bound feed/request IDs, item/ordinal, policy/feature/taxonomy/eligibility versions, safe reason codes, occurrence/ingestion times, and idempotency identity. Raw private inputs and sensitive values stay out of generic analytics.

## 9. Phase 0 execution plan

Phase 0 is evidence and baseline work. It does not change production ordering or write production data.

The current Phase 0 evidence package is recorded in the [baseline report](../implementation-artifacts/deterministic-fit-v1-phase-0-baseline-2026-08-20.md), [signal ownership review](../implementation-artifacts/deterministic-fit-v1-phase-0-signal-ownership-review-2026-08-20.md), [compatibility fixture](../../packages/radar-engine/test/fixtures/phase-0-compatibility-ranking-fixtures.json), [PostgreSQL fixture](../../packages/radar-adapters/test/fixtures/phase-0-postgres-ranking-fixtures.json), [global corpus](../../packages/radar-engine/test/fixtures/phase-0-global-evaluation-corpus.json), [Phase 0/1 closure](../implementation-artifacts/deterministic-fit-v1-phase-0-1-closure-2026-08-21.md), and [ADR-003](../../docs/decisions/003-deterministic-fit-v1-policy-boundary.md). Phase 0 and Phase 1 engineering work is complete for pre-production replay; production/promotion dependencies remain visible and serving remains inactive.

1. **Verify production schema/runtime truth.** If read-only credentials become available, query table existence, migrations/ledger, runtime flags, auth provider path, canonical Opportunity/Tracker/Profile/Taxonomy/Work/Follow tables, worker modes, and deployment metadata. Record timestamp, environment, exact predicates, and verified/inferred status. Without credentials, retain the unverified labels in this document.
2. **Measure scale/traffic/latency/worker state.** Capture published/open counts, source/evidence completeness, segment counts, browse request volume, p50/p95/p99, errors/fallbacks, queue age, worker freshness, and blocked/reviewable counts with exact predicates and timestamps.
3. **Freeze current ranking fixtures.** Capture compatibility and PostgreSQL recommended, deadline, verified, recently-added, filtered, and anonymous baseline outputs with runtime/store flags. Keep both paths separate.
4. **Reconcile ownership/privacy/retention.** Assign owner, canonical source, origin, observed/effective time, edit/clear endpoint, retention, deletion propagation, and permitted use for every signal in Section 3.
5. **Create the representative corpus.** Implement Section 6 fixtures, expected invariants, curator rubric, and segment labels.
6. **Record an ADR.** Separate eligibility, relevance, confidence, diversity, explanation, source authority, and fallback; reject ML/vendor/vector/microservice/acceptance-prediction options for this phase; name rollback owners.

### Phase 0 exit gate

Current compatibility and PostgreSQL behavior are measurable; production boundaries are explicit; ownership/privacy/retention is reviewed; and the corpus represents global creators plus sparse, contradictory, stale, disputed, removed, closed, fee/currency, travel, accessibility, preparation, and concentration cases. No personalized order changes.

## 10. Phase 1 execution plan

Phase 1 is pure policy, adapters, fixtures, replay, and diffs. It retains current serving order.

1. **Pure policy in `@missa/radar-engine`.** Add `recommendation/types.ts`, `eligibility.ts`, `features.ts`, `score.ts`, `rerank.ts`, `explain.ts`, `policy.ts`, and replay fixtures. No database/network/analytics/model dependency.
2. **Canonical evidence adapters in `@missa/radar-adapters`.** Transform current projections and approved read-only rows into context/evidence with source, version, time, confidence, and missingness. Compatibility fallback must be explicit.
3. **Replay reports and diffs.** Compare compatibility, PostgreSQL, and v1 by eligibility, score/confidence, contributions, explanations, ordering, coverage, concentration, missingness, and fallback, segmented by surface and creator/Opportunity fixture.
4. **No serving integration.** Do not change `buildOrder`, cursor semantics, public response schemas, or route sort behavior. Define only a later inactive composition boundary behind `OpportunityRepository`.
5. **Policy manifest.** Record policy/feature/gate/taxonomy/explanation/surface/event versions, weights, constants, corpus version, report checksum, and rollback target. Weights remain hypotheses.

### Phase 1 exit gate

Results are deterministic; invariants pass; confirmed eligibility violations are zero in the representative corpus; explanations are faithful; curator review is acceptable; fallback is independent; and no live request ordering changes.

## 11. Promotion gates and later shadow boundary

The sequence is replay → shadow → internal/curator review → bounded canary → surface-by-surface promotion. Phase 0/1 do not cross into shadow serving without separate approval.

Later shadow integration may invoke v1 behind the `OpportunityRepository` composition boundary only after canonical signal parity, durable recommendation evidence, stable snapshot design, and a human approval gate. Shadow output must not change response order, Tracker state, publication state, or public Profile. Notifications, SSE, and digest workers may invalidate or request recomputation but never become recommendation or publication authority.

## 12. Progressive onboarding handoff

Future onboarding is private, skippable, resumable, and progressive. The auth contract defines its job as enough private context for useful Opportunities, with save-and-continue and visible skip ([auth contract L70-L92](../../docs/missa-auth-onboarding-contract-2026-08-08.md#L70-L92)). It is not a forced signup questionnaire or Profile-completion wizard.

| Question                       | Why ask                                                  | Policy effect                                      | If skipped                                            | Edit/clear                                 | Preview copy                                                                    |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| Creative fields/roles          | Compare practice with accepted practice                  | Taxonomy intent/affinity; no eligibility inference | Practice contribution unavailable                     | Profile Preferences; remove/clear terms    | “Showing more Opportunities tagged with the practices you selected.”            |
| Desired Opportunity types      | Prioritize useful containers                             | Explicit type contribution                         | Type intent unavailable; open catalogue remains       | Profile Preferences/saved searches         | “This changes which Opportunity types are prioritized.”                         |
| Geography/participation        | Distinguish local, remote, hybrid, travel                | Feasibility and confirmed geography gates          | Items may be unknown/watchouts; no inferred location  | Profile Preferences; clear                 | “We need your participation preference to verify these calls.”                  |
| Fees/funding/travel            | Separate entry fees from support and prizes              | Fee/cost feasibility and explicit hard constraints | Unknown fee/support does not reject                   | Profile Preferences; clear each            | “No-fee matches are prioritized; an undisclosed fee stays marked for checking.” |
| Accessibility                  | Compare source-backed access information                 | Feasibility only against explicit need             | Access match unknown; no exclusion from absence       | Private Preferences; clear                 | “Missa only uses this to compare with stated access information.”               |
| Preparation capacity           | Avoid impossible short windows                           | Preparation/timing contribution                    | No preparation contribution; factual deadline remains | Profile Preferences; clear                 | “We can compare the deadline with the preparation time you gave us.”            |
| Goals/stage                    | Distinguish useful opportunities without grading creator | Intent and confirmed stage rule                    | No stage/goal contribution                            | Profile Preferences; clear                 | “This is not a quality score.”                                                  |
| Optional private Work matching | Compare selected canonical Work terms                    | Affinity only, after deliberate opt-in             | Work is not used                                      | Library Work/Profile control; delete/clear | “This also matches the practice tags on the Work you chose.”                    |

Every question states that the answer is private, editable, reversible, and clearable, and shows whether it affects eligibility, relevance, confidence, or explanation. Skipping never blocks public browse or first-Save value.

## 13. Implementation backlog

| ID    | Exact area and story                                                                                    | Dependencies                        | Acceptance/tests                                                                                            | Rollout gate                  | Rollback                                  |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| DF-00 | ADR in `docs/decisions/` separating gates, relevance, confidence, diversity, explanations, and fallback | Phase 0 ownership review            | Alternatives, rejection of acceptance prediction, versions, owners, rollback documented                     | Phase 0 exit                  | Leave proposed; no activation             |
| DF-01 | Freeze current ranking fixtures in `packages/radar-engine`/`packages/radar-adapters` tests              | Read-only current-state inspection  | Both rankers captured with inputs, time, runtime/store flags                                                | Phase 0                       | Remove derived fixtures only              |
| DF-02 | Add pure types in `packages/radar-engine/src/recommendation/`                                           | DF-00                               | Compiles with no adapter/database imports; states/missingness represented                                   | Phase 1 start                 | Inactive module removal                   |
| DF-03 | Implement gates in `recommendation/eligibility.ts`                                                      | DF-02; safety semantics             | Confirmed-only exclusion, unknown/needs-input tests, zero violations                                        | Phase 1 safety gate           | Replay-only; baseline unchanged           |
| DF-04 | Implement features/score/confidence in `features.ts`/`score.ts`                                         | DF-02/03; corpus                    | Bounds, denominator, monotonicity, deterministic fixtures                                                   | Phase 1 policy gate           | Revert manifest/version                   |
| DF-05 | Implement contribution explanations in `explain.ts`                                                     | DF-04; content/privacy review       | Faithfulness and prohibited-language tests                                                                  | Curator gate                  | Keep baseline reasons                     |
| DF-06 | Implement rerank/tie-break in `rerank.ts`                                                               | DF-04; concentration fixtures       | Caps pass; ineligible cannot re-enter; stable order                                                         | Curator gate                  | Disable reranker in replay                |
| DF-07 | Add read-only canonical adapters in `packages/radar-adapters/src/recommendation/`                       | DF-01; ownership parity             | Source/version/time/confidence/missingness; account isolation                                               | Adapter review                | Fixture adapters only; no silent fallback |
| DF-08 | Add replay/diff CLI and reports                                                                         | DF-03–07                            | Segment and surface diffs include eligibility, coverage, concentration, confidence, explanation             | Phase 1 exit                  | Rerun prior manifest                      |
| DF-09 | Define durable recommendation evidence near first-Save/platform analytics adapters                      | Provenance/privacy/retention review | Request/served/rendered/viewable/action, idempotency, versions, reset/delete; analytics cannot mutate state | Separate promotion dependency | Do not write new records                  |
| DF-10 | Define stable feed snapshot/cursor boundary adjacent to `OpportunityRepository`                         | DF-08/09; scale measurement         | Account/query/policy binding; one policy through pages; live safety recheck                                 | Later shadow gate             | Keep current cursor/order                 |
| DF-11 | Add inactive shadow invocation at repository composition                                                | DF-08–10; explicit approval         | No order/response/Tracker/publication mutation; failure does not affect serving                             | Shadow gate                   | Remove flag; baseline authority           |
| DF-12 | Map onboarding questions to Profile edit/clear contracts in planning/UI docs                            | DF-00/05; privacy review            | Purpose/effect/skip/edit/clear/preview for every question                                                   | Separate product promotion    | Leave local route unchanged               |

No story authorizes migration, production write, deployment, live order change, or promotion by itself.

## 14. First-Save promotion dependencies

Keep these unresolved and separate:

- Transactional Opportunity-version protection between revalidation and Tracker creation.
- Canonical dispute/removal/safety authority.
- Real Neon Auth and Tracker verification for accounts without completed Profiles.
- Durable recommendation-signal provenance and creator undo/clear, including Opportunity taxonomy/source snapshot.
- Repository-wide browser CI baseline.

The handoff leaves all five open ([deferred work L3-L8](../implementation-artifacts/deferred-work.md#L3-L8)). Phase 1 may implement pure interfaces, adapters, and fixtures, but must not imply production verification or live recommendation authority.

## 15. Validation and non-actions

The specification is the only requested file change. Run only:

```bash
npx prettier --write _bmad-output/planning-artifacts/deterministic-fit-v1-phase-0-1-spec-2026-08-20.md
npx prettier --check _bmad-output/planning-artifacts/deterministic-fit-v1-phase-0-1-spec-2026-08-20.md
git diff --check
```

No schema, migration, production data, deployment, external vendor, live ranking, Profile publication, onboarding promotion, or unrelated worktree change was authorized.
