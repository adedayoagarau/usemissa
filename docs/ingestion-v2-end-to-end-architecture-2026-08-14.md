# Ingestion v2 as the singular ingestion layer — architecture assessment and implementation plan

**Date:** 2026-08-14
**Framing:** v2 becomes the only ingestion layer — a Railway graph of workers that runs discovery through to a published opportunity on a creator's screen. Gary and Radar are retired. This document reads the current code from that vantage point: what v2 must absorb before the others can be switched off, and what has to be built that exists nowhere today.

---

## Verdict

v2 has the right instincts and the wrong size.

Its contracts, provenance model, fail-closed reflexes, and destination-reconciliation logic are genuinely good — better designed than what they replace. But v2 is **2,144 lines against 18,425 lines** of radar-engine + radar-adapters, and the missing 89% is not boilerplate. It is the taxonomy binding, the LLM extractor with validators, the JS rendering fallback, the deadline parser, the status engine, the enrichment lane, the content reviewer, and the only code in the repository that can move an opportunity into public view.

**Today v2 physically cannot publish an opportunity.** This is not a tuning problem — there are four independent hard stops, each verifiable in code. Promoting v2 is a porting project with a real engineering plan behind it, not a configuration flag.

The good news: the boundaries v2 drew are correct, so the port is additive. Nothing in the design needs to be undone.

---

## 1. The trace: one grant, from pw.org to a creator's screen

Following a single Poets & Writers grant through the code as it exists.

| # | Hop | Code | Status |
|---|-----|------|--------|
| 1 | Source selected from registry | `catalog.ts:createIngestionCatalog` | Works |
| 2 | Due-source claim (`FOR UPDATE SKIP LOCKED`) | `persistence.ts:claimDueIngestionV2Schedules` | Works |
| 3 | Enqueue to BullMQ | `queues.ts:enqueuePipeline` | Works |
| 4 | robots.txt preflight + landing fetch | `adapters/html.ts:assertRobotsAllowed` | Works, but re-fetches robots on every single request |
| 5 | Extract fields (regex or DeepSeek) | `adapters/html.ts:extract` | Brittle; site-specific selectors; **no pagination** |
| 6 | Fetch classified detail pages | `execution.ts:78` | **Hard cap of 5 per run** |
| 7 | Deterministic quality score | `quality.ts:assessEvidenceQuality` | Works |
| 8 | Publisher reconciliation + DeepSeek review | `publisher.ts:reviewForPublication` | Works — the strongest part of v2 |
| 9 | Fail-closed promotion gate | `promotion.ts:evaluatePromotionGate` | **Never called outside tests** |
| 10 | Write canonical row as `reviewable` | `canonicalWriter.ts:promoteApprovedArtifact` | Writes |
| 11 | Taxonomy / genres | — | **Does not exist in v2** |
| 12 | `deadline_date` | `canonicalWriter.ts:16` | **Almost always null** |
| 13 | `status` lifecycle | `canonicalWriter.ts:39` | **Hardcoded `'open'`, never recomputed** |
| 14 | Content written `review_status='pending'` | `canonicalWriter.ts:63` | **Nothing in v2 approves it** |
| 15 | Call profile / reading window | — | **Never written by v2** |
| 16 | `reviewable` → `published` | `radar-adapters/reviewWorker.ts:161` | **Only exists in the system being retired** |
| 17 | DB trigger `missa_publication_gate` | `db/migrations/0025` | **Would raise on every v2 row** |
| 18 | Public browse query | `opportunityRepository.ts:522` | Filters `publication_state = 'published'` — never matches |

**The record stops at step 10 and cannot advance.** A creator never sees it.

---

## 2. The blockers, ranked

### B1 — Nothing in v2 can publish (hard stop)

The only `reviewable` → `published` transition in the repository is `radar-adapters/src/reviewWorker.ts:161`. If Radar is switched off today, no opportunity ever becomes public regardless of how well v2 runs.

`evaluatePublicationRubric` (`publicationRubric.ts`) is the five-gate decision that governs it. It is well written and worth porting wholesale — not rewriting.

### B2 — The database trigger would reject every v2 row (hard stop)

`missa_publication_gate` requires all of: source URL, evidence with `organization_confirmed` **and** `destination_reconciled`, `opportunity_contents.review_status = 'approved'`, a destination URL, an active status, **and** a `deadline_date` or a non-unknown reading period.

v2 satisfies the first two. It fails the rest:
- content is written `'pending'` and v2 has no content reviewer;
- `deadline_date` is almost always null (see B3);
- `opportunity_call_profiles` is written only by `radar-adapters/enrichmentWorker.ts:220`, which v2 does not have.

So even if B1 were fixed by flipping the state directly, Postgres would raise `23514`.

### B3 — Deadlines are extracted in a format the writer discards

`adapters/html.ts:deadlineFromHtml` returns human text — `"January 15, 2026"`. `canonicalWriter.ts:16` accepts only `/^\d{4}-\d{2}-\d{2}$/`. Every HTML-sourced deadline becomes `null`, which sets `deadline_kind='unknown'`, which fails the freshness gate.

For grants this is not a technicality. The deadline is the single most decision-relevant fact on the page.

`radar-engine/src/extraction/dates.ts` and `isPlausibleOpportunityDate` already solve this properly and are unused by v2.

### B4 — The publishing writer produces content the reviewer must block

`deepseekWriter.ts:76` sets `content.sourceUrl` to the **destination** URL. `contentWorker.ts:286` reviews it against `opportunity_sources.url` — the **landing** URL that `canonicalWriter.ts:upsertSource` stored. `reviewOpportunityContent` requires `content.sourceUrl === context.sourceUrl` and requires every highlight's `sourceUrl` to match too.

Result: `sourcePresent = false` → decision `'blocked'` → `content_ok = false` → never publishable. Two components that were built to work together disagree on what "source" means.

### B5 — The fail-closed promotion gate is not wired in

`evaluatePromotionGate` enforces source health, authoritative destination, ≥0.8 recall, ≥0.8 agreement, ≥0.75 quality, dedup, and no critical warnings. `grep` finds it referenced **only in the test file**.

The live promote path (`execution.ts:133`) checks just `publisher.decision === 'approve'`. The rubric documented in `ingestion-v2-publication-rubric-2026-08-13.md` describes gates the running code does not apply.

### B6 — Deduplication never consults the database

`identity.ts` builds a strong opportunity identity, but `compareOpportunityIdentity` is only ever used to compare a source page against its own destination *within one run*. `canonicalWriter.ts:13` derives the canonical ID from a SHA of the URL alone.

The same grant listed on P&W and on the funder's own site produces two rows. Cross-source dedup — a core reason to have an identity model — is absent. Gate 2 of the rubric ("does not duplicate an existing canonical opportunity") is not implemented.

### B7 — A network call sits inside an open Postgres transaction

`canonicalWriter.ts:64` calls `writeWithDeepSeek` between `begin` and `commit`. Two consequences:

1. A 30-second LLM call holds a pooled Neon connection open. This is precisely the anti-pattern `docs/railway-topology.md` records having fixed for Radar ("no pooled transaction remains open during network fetches") to stop Neon pooler protocol errors.
2. Any writer failure — missing key, HTTP error, failed shape check — rolls back the **entire promotion**. The opportunity is lost, not just its prose.

### B8 — One queue, one worker, `concurrency: 1`

`execution.ts:141`. A single run is: robots + landing + up to 5×(robots + detail) = up to 12 sequential HTTP requests, each with a 20s timeout. The scheduler claims 25 due sources every 5 minutes; the worker drains them one at a time. Throughput is roughly one source per minute in the good case.

This is the gap between "a shadow benchmark" and "the singular ingestion layer."

---

## 3. The source authority model: discovery is not canonical

This is the correction that reshapes the rest of the design. There are **three hops, not two**, and v2 currently collapses them.

| Hop | Example | Role | Registry tier |
|---|---|---|---|
| Discovery surface | `resartis.org/open-call/multidisciplinary-residence-...` | Aggregator. Tells us the opportunity exists. Provenance only. | tier 2, `followsOutboundLinks: true` |
| **Canonical source** | `casanailha.org/the-multidisciplinary-residency-program/` | The organization's own page. Authoritative for dates, fees, eligibility, materials, contact. | tier 0, `authorityKind: official-source` |
| Opportunity instance | The Oct–Nov–Dec 2026 session | One dated call belonging to a recurring program. | — |

The policy is already written down, in Gary's `PROFILE_SCHEMA.md`: the directory *"is the discovery and editorial-vetting source. The publication or press website is canonical for current submission guidelines, reading periods, contact details, fees, and payment."* Directory values are retained as provenance and never silently substituted for host values.

It is also already encoded in the registry: `registry/helpers.ts:63` sets `organizationName` only when `tier === 0`, and `helpers.ts:64` sets `followsOutboundLinks` only for tier 2. Radar enforces it operationally with `RADAR_MAX_TIER=0` — directories are crawled for *discovery*, and only organization sources produce opportunities. `sourcePromotionWorker.ts` is the bridge: it takes an outbound link from a directory, verifies robots, canonical URL, anti-automation terms, and call signals, then promotes the organization's own site into the canonical source lane under operator review.

**v2 discards all of this.** `catalog.ts` reads `tier` but uses it for only two things — the schedule lane and whether `pageRole` is `landing` or `detail` (`catalog.ts:50`). Nothing filters ingestion by tier, and there is no hop that resolves a directory listing to the organization behind it. Run v2 over Res Artis today and `canonicalWriter.upsertSource` stores `resartis.org` as the source of record. That is precisely the outcome the policy forbids.

So the question my earlier draft left open — is the canonical source the landing page or the authoritative destination? — has a third answer: **neither**. It is the organization's own page, reached by a resolution step that does not exist in v2.

### What must exist that exists nowhere in v2

`canonicalWriter.ts` never sets `organization_id`. It reads an `organization` string only to build `search_document` and a boolean confirmation flag. There is no organization entity, no program, and no cycle.

For a Missa opportunity page to be terminal — the creator does not need to go anywhere else — ingestion must produce four things, not one:

1. **Organization profile** — who Casa Na Ilha is, where, what they do, built from their own site. Gary models this as `gary_profiles` / `gary_profile_observations` / `gary_profile_aliases` with a conservative attachment policy (exact host + normalized name attaches; similar names on different domains become review candidates; a shared submission platform never merges). That policy is sound and should be ported rather than reinvented.
2. **Program** — "the Multidisciplinary Residency Program" as a durable entity, distinct from any one call. This is what makes "plan their open dates" possible: a program has a recurrence pattern, and past sessions predict future ones.
3. **Call instance** — the Oct–Nov–Dec 2026 session, with its own deadline, fee, and window. Gary's rule applies: *"One profile may own multiple annual contests or open reading periods; annual opportunities remain separate records."*
4. **Supporting evidence** — past residents/winners, images, guidelines. Radar's enrichment worker already has job kinds for exactly this (`media`, `winners`, `guidelines`, `call-profile`) writing to `opportunity_call_profiles`, `opportunity_call_prizes`, and `opportunity_call_windows`.

Every one of those four exists somewhere in the retiring systems. None exists in v2. This is the largest single body of work in the migration, and it is bigger than the publish plumbing in Phase 0.

### A registry data issue worth fixing first

`sources.json` contains two Res Artis entries with contradictory authority:

- `src_platform-resartis_res_artis_opportunities_415` — tier 2, `kind: directory`, `authorityKind: directory`, trust score 50. Correct.
- `src_visual-residency_res_artis_network_206` — tier 0, `kind: organization-website`, `authorityKind: official-source`, trust score 80, `organizationName: "Res Artis Network"`. **Wrong** by the policy above: resartis.org is an aggregator, not the residency provider.

Only the second passes `trustedSource()` (which requires `curated`/`verified` and score ≥60), so it is the one v2 would actually ingest — and it would attribute Casa Na Ilha's residency to "Res Artis Network." Before any tier-based gating is trusted, the registry needs an audit for other aggregators mislabelled as tier 0.

---

## 4. Target: the Railway graph

Today v2 is one queue called `pipeline` doing everything inside one job. The graph splits it into stages that scale, fail, and are observed independently — one Docker image, mode-switched, exactly as the root `Dockerfile` already does for Radar.

```text
                    ┌──────────────┐
                    │  scheduler   │  claims due sources (Postgres lease)
                    └──────┬───────┘
                           v
  ┌────────────┐   ┌──────────────┐   ┌──────────────┐
  │ discovery  │──>│    fetch     │──>│   extract    │
  │ (find new  │   │ (robots,     │   │ (LLM + det-  │
  │  sources)  │   │  render,     │   │  erministic  │
  └────────────┘   │  paginate)   │   │  validators) │
                   └──────────────┘   └──────┬───────┘
                                             v
                   ┌──────────────┐   ┌──────────────┐
                   │   enrich     │<──│   identity   │ dedup vs canonical
                   │ (call profile│   │  resolution  │
                   │  media, fees)│   └──────────────┘
                   └──────┬───────┘
                          v
                   ┌──────────────┐   ┌──────────────┐
                   │    decide    │──>│    write     │ reviewable + evidence
                   │ (5 gates)    │   └──────┬───────┘
                   └──────┬───────┘          v
                          │           ┌──────────────┐
                          │           │    writer    │ editorial + facts
                          │           └──────┬───────┘
                          │                  v
                          │           ┌──────────────┐
                          └──────────>│content review│──> published
                                      └──────┬───────┘
                                             v
                                       human-review
```

| Railway service | `MISSA_WORKER_MODE` | Queue | Concurrency | Notes |
|---|---|---|---|---|
| `v2-scheduler` | `v2-scheduler` | — | 1 | Owns the Postgres lease; enqueues only |
| `v2-fetch` | `v2-fetch` | `fetch` | 8–16 | Per-host token bucket; robots cache; Playwright fallback |
| `v2-extract` | `v2-extract` | `extract` | 4–8 | LLM + validators; LLM budget ceiling |
| `v2-enrich` | `v2-enrich` | `enrich` | 4 | Call profile, fees, media, materials |
| `v2-decide` | `v2-decide` | `decide` | 4 | Identity resolution + five gates |
| `v2-write` | `v2-write` | `write` | 2 | Canonical write; **no network calls in transaction** |
| `v2-writer` | `v2-writer` | `writer` | 4 | Editorial generation |
| `v2-content-review` | `v2-content-review` | `review` | 4 | Approves content, then publishes |

Why this shape:

- **Fetching is I/O-bound and rate-limited per host; extraction is cost-bound per token.** Coupling them forces one concurrency number to serve two opposite constraints — the root cause of B8.
- **A stage that fails should not lose the work before it.** Today a DeepSeek writer error discards a completed crawl (B7). With a durable snapshot handoff, the writer retries against stored evidence.
- **Each stage gets its own telemetry row.** v2 currently has no `workerTelemetry` at all — only `console.log`. Radar's `radar_agent_runs` / `radar_agent_handoffs` model already works; v2 should adopt it rather than invent one.

Keep BullMQ + Upstash. The queue is not the bottleneck and the prefix isolation is already right.

---

## 5. Intelligence: where the models go

The rule already written into radar-adapters is the correct one and should be carried into v2 verbatim: **the LLM proposes, the validators dispose.**

| Stage | Model | Job | Guardrail | If it is wrong |
|---|---|---|---|---|
| Extraction | Claude (tool-forced) | Structured fields from page text | `validateCandidate` + `isPlausibleOpportunityDate` + signal detection | Field dropped, not published |
| Taxonomy | Same call | Term IDs from a **candidate list only** | IDs not in the candidate set are discarded | Falls back to registry terms |
| Identity | Deterministic | Canonical URL + title/org normalization | No model involved | Ambiguous → human review |
| Destination review | DeepSeek | Does the destination match the source record? | Runs only after deterministic reconciliation passes; failure → `review` | Fails closed |
| Editorial writer | Claude | Creator-facing prose | Facts allowlist; no invented values | Content blocked, opportunity still publishable as facts-only |

**Provider note.** Missa runs on DeepSeek. This costs nothing here: `productionEngine.ts:208` already prefers DeepSeek whenever `DEEPSEEK_API_KEY` is set, and `LlmExtractor` speaks it natively through OpenAI-style function calling. What we are porting is the safety rails, not the model — they are provider-agnostic. Keep the `provider` abstraction so a second model stays possible, but assume no Anthropic key exists.

One real bug to fix during the port: `llmExtractor.ts:210` returns `{}` when DeepSeek does not come back with a tool call. An empty result is not an error, so it skips the `DeterministicExtractor` fallback and produces a blank opportunity titled after the source. On a DeepSeek-only setup this is the most likely silent failure in the system. A missing tool call must throw so the fallback engages.

`radar-adapters/src/llmExtractor.ts` already implements the first two properly — forced tool use, a bounded candidate-term list (max 64), invented IDs filtered out, dates plausibility-checked, deterministic signal detection running alongside, and a `DeterministicExtractor` fallback when the provider fails. **This is the single most valuable thing to port.** v2's `adapters/deepseek.ts` is a much weaker instrument and should be retired in its favour.

Cost control does not exist anywhere today and must be built:

- token accounting per run, written to the run record;
- a per-day spend ceiling that degrades to the deterministic extractor rather than stopping ingestion;
- **skip re-extraction when `content_hash` is unchanged** — `PageSnapshot.contentHash` is already computed and stored, and nothing consults it. On a daily cadence across a stable registry this is likely the single largest cost saving available, and it is nearly free to implement.

---

## 6. The publishing writer

Scope confirmed: both the canonical structured facts **and** the creator-facing editorial layer, with grants held to the highest helpfulness bar.

**Two artifacts, one pass, separate trust levels.**

1. **Canonical facts** (`opportunities` + evidence tables) — deadline, fee, eligibility, materials, destination. Deterministic, provenance-tagged, each traceable to a snapshot ID. Never model-authored without validation. This is what powers filtering, deadline alerts, and the tracker.
2. **Editorial brief** (`opportunity_contents`) — summary, highlights, preparation, unknowns, next action. Model-authored, but constrained to the verified facts from (1).

Three existing writers collapse into this:

| Existing | Fate |
|---|---|
| `radar-engine/content/opportunityContent.ts` | **Keep the contract and the reviewer.** `reviewOpportunityContent` is a real guardrail — bounded lengths, source-linked highlights, promotional-claim detection. Port into v2 as the content-review stage. |
| `canonicalWriter.ts` | Keep, but fix B4 and B7 — align the source URL contract and move the LLM call outside the transaction. |
| `deepseekWriter.ts` | Replace. Its shape checks are good; its source-URL contract is wrong and it has no fact allowlist. |

For grants specifically, "as helpful as possible" means the brief must answer, with a citation for each: **who is eligible, what it costs, what you must prepare, when it is due, and what happens after you apply.** Anything absent must appear in `unknowns` rather than being smoothed over — which is what the existing builder already does and what makes it worth keeping.

The non-negotiable constraint: the writer receives an allowlist of verified facts and may not introduce a value outside it. `deepseekWriter.ts` gestures at this in its system prompt; it needs to be enforced in code by diffing generated highlight values against the extracted field set.

---

## 7. Guardrails, ranked by damage if they fail

| Rank | Guardrail | Status today |
|---|---|---|
| 1 | **Never publish an invented fact** | Partial. Prompts say it; only `reviewOpportunityContent` enforces it, and v2 does not run it. |
| 2 | **Never publish a dead or wrong destination** | **Strong.** `publisher.ts` reconciliation is the best code in v2. |
| 3 | **Never show an expired call as open** | **Missing in v2.** Status is hardcoded `'open'` and never recomputed. The browse query defends against this (`opportunityRepository.ts:527`) but ingestion should not rely on the read path. |
| 4 | **Fail closed on ambiguity** | Designed correctly, wired incompletely (B5). |
| 5 | **Human review for anything uncertain** | Queue tables exist in Radar; **v2 has no human-review path at all.** |
| 6 | **robots / ToS compliance** | Real and fail-closed. But no `crawl-delay`, no per-host rate limiting, and robots is re-fetched per request. |
| 7 | **LLM cost ceiling** | **Does not exist.** No accounting, no cap, no caching. |
| 8 | **Production write safety** | Weak. `MISSA_INGESTION_V2_PROMOTE_APPROVED=1` simultaneously unlocks the production database role (`safety.ts:6`) and flips every source to `promote` mode (`worker.ts:31`). One variable, full blast radius. Promotion should be a per-source allowlist. |

Doc-vs-code drift worth naming: the publication rubric doc describes five gates as operative; the running promote path applies one of them. `railway-topology.md` lists `content-worker` as implemented but unprovisioned — accurate, and it means the content approval step has never actually run in production against real traffic.

---

## 8. Limits at 10× volume

- **Snapshot storage.** Full HTML in Postgres (`persistence.ts`, `html text not null`), up to 6 snapshots per run, no compression or TTL. At 5,000 sources/day this is tens of GB/month in Neon. Move bodies to object storage, keep hash + metadata in Postgres.
- **Coverage ceiling.** No pagination, plus `detailLimit` capped at 5 (`execution.ts:78`). A 25-page directory yields 5 opportunities. This caps the catalogue far below what the sources contain — and it is invisible, because nothing logs what was skipped.
- **No JS rendering.** `rendered` is always `false`. v2 detects anti-bot challenges but has no fallback. `radar-adapters/playwrightFetcher.ts` and Gary's bounded renderer both solve this and neither is reachable from v2.
- **No per-host politeness.** Nothing spaces requests to one origin. Raising concurrency without this converts a throughput fix into a blocking risk on the sources that matter most.
- **Observability blind spot.** No worker telemetry, no per-stage metrics, no alerting. `readRecentIngestionV2Runs` powers the admin workbench, which is the only window in.
- **Runtime DDL.** `ensurePromotionSchema` runs `ALTER TABLE` on every promotion (`canonicalWriter.ts:70`). Acceptable for a warm-up guard; wrong for a hot path.

---

## 9. The operator surface: one set of actions, two skins

v2 must fail closed and route anything uncertain to a human. There is currently nowhere for that human to stand.

**The command line** has four entry points (`cli.ts`, `worker.ts`, `run-cli.ts`, `compare-cli.ts`), configured entirely by environment variables. `run-cli.ts` can only run the four hardcoded benchmark sources — the worker knows the full registry, the CLI does not. There is no way to inspect a finished run, and no way to try a single arbitrary URL without editing code.

**The workbench** (`ingestion-v2-workbench.tsx`, 835 lines) lists runs, shows one run's snapshots and fields, and queues work. That is all. There is no approve, no reject, no edit, no retry — the word "publish" appears fifteen times in the component and no action behind it exists.

So neither surface can do the one thing the design most depends on: a person saying *yes, this is right* or *no, that date is wrong*.

The fix is not to build the missing buttons twice. Define the operations **once**, in `@missa/ingestion-v2`, as typed functions:

`runSource` · `runUrl` (ad-hoc, no registry entry needed) · `inspectRun` · `approve` · `reject` · `correctField` · `addSource` · `retryStage`

The CLI becomes a thin argument parser over that module. The admin API route becomes a thin HTTP wrapper over the same module. Today the route re-implements source selection that the CLI has its own narrower copy of — that divergence is already visible and will widen with every feature.

Two properties matter more than the interface design:

- **Every operator action is an audited, append-only decision**, the way `radar_review_decisions` already works. A human correcting a deadline is evidence, not a silent overwrite.
- **A correction teaches the system.** If an operator fixes the same field on the same source three times, that is a signal about the adapter, and it should be visible rather than buried in a diff.

`runUrl` is worth calling out separately: the fastest debugging loop is pasting a URL and seeing exactly what the pipeline extracts, what it decides, and why. That single command will save more time during Phases 0–3 than any dashboard.

---

## 10. Implementation plan

### Phase 0 — Make one opportunity reach a screen (staging)

The goal is a single real grant traced end to end, not a batch. Nothing else matters until this passes.

1. Port `evaluatePublicationRubric` from `radar-adapters/src/publicationRubric.ts` into v2 as the decide stage.
2. Build the v2 content-review stage using `reviewOpportunityContent` from radar-engine; only it may set `publication_state = 'published'`.
3. Fix B4: make `content.sourceUrl` and every highlight `sourceUrl` agree with the `opportunity_sources.url` that `upsertSource` writes. Per section 3, the canonical source is the **organization's own page** — so for Phase 0 pick a tier-0 organization source where discovery and canonical are already the same host, and defer the resolution hop to Phase 3.
4. Fix B3: replace `deadlineFromHtml` with `radar-engine/src/extraction/dates.ts` + `isPlausibleOpportunityDate`, and normalize to ISO before the writer.
5. Fix B7: move `writeWithDeepSeek` out of the transaction — write the canonical row, commit, then generate content in a separate stage.
6. Wire `evaluatePromotionGate` into `execution.ts` so the documented gate actually runs.
7. Write `opportunity_call_profiles` for at least reading-period kind, or accept a normalized deadline as the sole freshness proof.

8. Build the minimum operator loop (section 9): the shared actions module, `runUrl`, and approve/reject wired into both the CLI and the workbench. Without it nothing uncertain can be resolved, so nothing can safely publish.

**Exit criterion:** one Poets & Writers grant reaches `publication_state = 'published'` on staging, with correct deadline and approved content, and renders in the browse query.

### Phase 1 — Split into the Railway graph

9. Split the single `pipeline` queue into `fetch` / `extract` / `enrich` / `decide` / `write` / `writer` / `review`, handing off durable snapshot IDs rather than in-memory objects.
10. Add `MISSA_WORKER_MODE=v2-*` branches to the root `Dockerfile` (the pattern is already there).
11. Adopt `workerTelemetry` + `radar_agent_runs` / `radar_agent_handoffs` so every stage is observable.
12. Per-host token bucket and a process-lifetime robots cache in the fetch stage (`playwrightFetcher.ts` already caches robots per origin — reuse the approach).
13. Raise concurrency per stage only once (11) is in place.

### Phase 2 — Intelligence

14. Port `LlmExtractor` into v2 with its taxonomy candidate-list binding, `validateCandidate`, and `DeterministicExtractor` fallback. Retire `adapters/deepseek.ts`.
15. Populate `genres` / taxonomy assignments on write — currently `'{}'`.
16. Add pagination to the HTML adapter and raise `detailLimit`, logging what was skipped.
17. Add the Playwright fallback for anti-bot and JS-shell pages.
18. Content-hash short-circuit: skip extraction and LLM spend when the snapshot hash is unchanged.
19. Token accounting + daily spend ceiling that degrades to deterministic extraction.

### Phase 3 — Source authority, organizations, and programs

This is the largest phase and the one that makes a Missa page terminal. Nothing here exists in v2.

20. **Audit the registry** for aggregators mislabelled as tier 0 (`Res Artis Network` is one). Tier-based gating is only as good as the tier data.
21. **Gate ingestion by tier in v2**: directories become discovery-only; only tier-0 organization sources produce opportunities. This is Radar's `RADAR_MAX_TIER=0` policy, which `catalog.ts` currently ignores.
22. **Build the resolution hop** — directory listing → organization's own page. Port `sourcePromotionWorker`'s verification (robots, canonical URL, anti-automation terms, call signals) and its operator-review mode.
23. **Organization profile entity**: identity, aliases, host URL, observations with field-level provenance. Port Gary's attachment policy from `PROFILE_SCHEMA.md` — conservative matching, review candidates for near-misses, never merge on a shared submission platform.
24. **Program entity + recurrence**, distinct from the call instance, so open dates can be predicted from past sessions rather than only observed.
25. **Enrichment lane**: media (with rights status), past winners/residents, guidelines, call profile. Port `enrichmentWorker`'s four job kinds and the `opportunity_call_profiles` / `_prizes` / `_windows` tables.
26. Set `organization_id` on write — `canonicalWriter.ts` does not set it at all today.

### Phase 4 — Identity, freshness, and the writer

27. Cross-source dedup: query canonical opportunities by identity before writing; ambiguous → human review (rubric gate 2). This matters more once directories and org sites are both feeding the same program.
28. Per-opportunity freshness loop — schedules are per-source today, so a published grant's deadline is never re-checked. Port the status engine so `closing-soon` / expiry transitions actually happen.
29. Replace `deepseekWriter.ts` with a fact-allowlisted writer, enforced in code rather than in the prompt, now able to draw on org profile, program history, and past winners.
30. Build the human-review queue and admin surface for v2 (extend the existing workbench).

### Phase 5 — Retire Gary and Radar

31. Absorb Gary's remaining unique capability: calendar/pager backfill and official-site following.
32. Run v2 and Radar in parallel on the same sources; compare published output, not extraction artifacts.
33. Move snapshot bodies to object storage.
34. Switch off Radar workers, then Gary. Delete `radar-adapters` workers only after v2 has held production alone for a full deadline cycle.

---

## Sequencing note

Phase 3 is the real weight of this migration — the organization and program layer is what makes a Missa page terminal, and none of it exists in v2 today. But it depends on nothing in Phases 0–2, so it can be scoped and staffed in parallel once the source authority model is settled.

Phases 0 and 1 are separable and Phase 0 is small — most of it is wiring code that already exists and fixing two contract mismatches. It is worth doing on its own, because until one opportunity completes the trace, every estimate past it is guesswork. The scale work in Phase 1 is meaningless if the pipeline it scales cannot publish.
