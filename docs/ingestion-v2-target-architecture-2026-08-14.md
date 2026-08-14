# Missa ingestion — target architecture

**Date:** 2026-08-14 (post-handoff)
**Status:** design. Supersedes the "Target" section of `ingestion-v2-end-to-end-architecture-2026-08-14.md`; the assessment and blocker list in that document still stand except where corrected below.

---

## Where we actually are

Verified against `main` after the handoff commits, not assumed:

- **v2 is writing to production.** The promotion path is live and the first-party destination fix (`d9434611e`) is deployed.
- **v2 still cannot publish.** `canonicalWriter.ts` writes `publication_state` as `reviewable` only. The single line in the repository that sets `published` is `radar-adapters/src/reviewWorker.ts:161`. Everything visible on usemissa.com today was published by Radar's review agent. **The day Radar is switched off, the catalog stops growing.** This is the one blocker from the prior assessment that has not moved and it is now the highest-priority item.
- **The directory problem is measured, not theoretical.** 373 directory-sourced records were published; 357 had no reconcilable first-party destination and were quarantined. That is a **95.7% failure rate**. Sixteen records out of 373 resolved.
- **There is no repair path for the 357.** They sit in `reviewable`. Nothing re-fetches them, and Casa na Ilha was fixed by hand.
- **The organization is still not an entity.** `canonicalWriter.ts:13` derives the source ID from `source.url`, so `opportunity_sources` still records the directory. The new policy doc says "do not use the directory name as the organization" — correct, and there is currently nowhere else to put it.

That 95.7% is the number this architecture is designed around.

---

## Why the current shape produces 95.7%

The pipeline is built as a **crawler**: fetch a page, extract fields, follow a few links, write a row. The actual problem is **entity resolution**: deciding that a listing on `resartis.org` and a page on `casanailha.org` are the same program, run by an organization we should know about, in a session that opens in October.

Three specific causes:

1. **Recall is capped at 5.** `execution.ts` follows at most five candidate links per run, and there is no pagination. A Res Artis index page carries dozens of residencies. We were never going to see most of them.
2. **Matching is exact-string.** `compareOpportunityIdentity` accepts a match on identical canonical URL, or identical normalized title *and* organization. Across a directory→host boundary neither is likely: the directory writes "Multidisciplinary Residence Oct/Nov/Dec 26 — Ilhabela Island, Brazil"; the host page is titled "The Multidisciplinary Residency Program." Those are the same thing and share no exact key.
3. **A lead and an opportunity are the same row.** Every directory listing became a canonical opportunity immediately, so a resolution failure became a *published* defect rather than a queued piece of work.

Fixing (1) and (2) without fixing (3) just publishes more wrong records faster.

---

## The core decision: entities first

**Organization is the primary entity, keyed by domain.** Not the opportunity, not the source. "First-party" is fundamentally a claim about a domain, so the domain is the natural key: `casanailha.org` is one organization, permanently, and everything else hangs off it.

Four durable entities:

```text
Organization  (casanailha.org)
  └── Program      (The Multidisciplinary Residency Program)
        └── Call   (Oct–Nov–Dec 2026 session)   ← what users apply to
              └── Evidence (snapshots, past cohorts, media, guidelines)

Lead  (resartis.org/open-call/...) ── resolves to ──> Call
      never public, always retained as provenance
```

Why this shape:

- **A program is where recurrence lives.** Casa na Ilha runs sessions every year. Knowing the program lets us predict the next open date instead of waiting to observe it — which is what "plan their open dates" requires.
- **Enrichment amortizes.** Who the organization is, where they are, past residents, images — that work attaches to the organization once and serves every call it ever runs. Today we would redo it per opportunity.
- **A page becomes terminal.** The opportunity page can carry the org's story, the program's history, and this session's specifics because all three exist as data.
- **Leads become cheap.** A lead is a URL and a claim. It costs nothing to hold thousands, and it can never reach the public catalog without resolving. The 357 become a work queue instead of an incident.

---

## The pipeline: six layers

```text
  ┌─────────────┐
  │ 1 DISCOVER  │  directories, feeds, search, sitemaps → LEADS
  └──────┬──────┘  cheap · high volume · never public
         v
  ┌─────────────┐
  │ 2 RESOLVE   │  lead → first-party host → org → program → call
  └──────┬──────┘  the hard part · where DeepSeek earns its cost
         │
         ├── confident ──> accept
         ├── plausible ──> human queue
         └── weak ──────> hold as lead, retry later
         v
  ┌─────────────┐
  │ 3 ENRICH    │  org profile · past cohorts · media · cycle history
  └──────┬──────┘  runs per ORGANIZATION, not per opportunity
         v
  ┌─────────────┐
  │ 4 COMPOSE   │  validated facts + fact-constrained brief
  └──────┬──────┘
         v
  ┌─────────────┐
  │ 5 PUBLISH   │  five gates · v2 owns the transition · human queue
  └──────┬──────┘
         v
  ┌─────────────┐
  │ 6 MAINTAIN  │  freshness · expiry · drift · re-resolve
  └─────────────┘
```

### Layer 2 in detail — the part that has to be right

Resolution is a **scored match, not a boolean**. This is the direct fix for the 95.7%.

Signals, cheapest first:

| Signal | Weight | Notes |
|---|---|---|
| Outbound link from lead to candidate domain | high | The directory told us where to go. Strongest single signal and nearly free. |
| Candidate domain ≠ directory domain | gate | Already implemented as `isPotentialDestination`. |
| Organization name similarity | medium | Fuzzy, not exact. "Casa na Ilha" vs "Casa Na Ilha Residency". |
| Program name similarity | medium | Embedding similarity, not string equality — this is what exact matching gets wrong. |
| Date overlap between lead and candidate | medium | A session with matching months corroborates strongly. |
| Same opportunity type | low | Cheap sanity check. |
| DeepSeek judgment | medium | One vote among several, never the sole authority. Asked to *refute*, not confirm. |

Three bands: **auto-accept**, **human queue**, **hold**. The thresholds are tuned against the 357 — we have a labelled set of hard cases, which is a genuine asset. Publish the score with every decision so the bands can be moved with evidence.

Embeddings live in **pgvector on Neon**. No new vendor: we already have the database, the volumes are small, and program-name similarity is the one place string matching demonstrably fails.

### Layer 5 — v2 must own the publish transition

Port `evaluatePublicationRubric` into v2 and give v2 the `reviewable → published` write. Until that ships, retiring Radar breaks the product. This is a small piece of work with the largest consequence of anything in this document.

---

## The Railway graph

One image, mode-switched, as the root `Dockerfile` already does.

| Service | Layer | Scaling constraint | Concurrency |
|---|---|---|---|
| `v2-scheduler` | — | Owns the Postgres lease, enqueues only | 1 |
| `v2-discover` | 1 | Per-host politeness | 4 |
| `v2-fetch` | 1–3 | Network I/O, per-host token bucket | 8–16 |
| `v2-render` | 1–3 | Memory (Chromium), called only on JS shells | 2 |
| `v2-resolve` | 2 | DeepSeek tokens and spend ceiling | 4 |
| `v2-enrich` | 3 | Per-organization, not per-call | 4 |
| `v2-compose` | 4 | DeepSeek tokens | 4 |
| `v2-publish` | 5 | Database writes | 2 |
| `v2-maintain` | 6 | Batch, off-peak | 2 |

The separation exists because these have genuinely different limits: fetching is bounded by politeness, resolution by token spend, rendering by memory. One concurrency number cannot serve all three, which is why everything currently runs at `concurrency: 1`.

Every stage writes a telemetry row using the existing `radar_agent_runs` / `radar_agent_handoffs` model. v2 has no telemetry at all today.

---

## Infrastructure

### Add

| Need | Recommendation | Why |
|---|---|---|
| Snapshot storage | **Cloudflare R2** | Full HTML currently sits in Neon (`html text not null`), up to 6 per run. Wrong storage class, and it will dominate the database bill before it dominates anything else. Keep hash + metadata in Postgres, bodies in R2. |
| JS rendering | **Playwright on a Railway service** | Many organization sites are JS-rendered; `rendered` is always `false` today. `radar-adapters/playwrightFetcher.ts` already exists — wrap it as a service rather than buying Browserless. |
| Error tracking | **Sentry** | Failures are `console.log` today. Non-negotiable once six services are running. |
| Similarity matching | **pgvector on Neon** | No new vendor. Solves the exact-string matching failure directly. |

### Keep

Vercel (web), Neon (canonical), Upstash (queues), Railway (workers), DeepSeek (models). Nothing here is the bottleneck and the queue prefix isolation is already correct.

### Explicitly not adding

A separate search cluster, a workflow engine, or a vector database. Every one of those is a plausible-sounding purchase that adds an operational surface without touching the 95.7%.

---

## Cost control

None exists today. Required before Layer 2 runs at volume:

- **Content-hash short-circuit.** `PageSnapshot.contentHash` is already computed and stored and nothing reads it. On a daily cadence over a stable registry this is the largest available saving and is nearly free.
- **Cheapest signal first.** Resolution runs the free signals before any model call; most leads should resolve or die without touching DeepSeek.
- **Per-day spend ceiling** that degrades to deterministic extraction rather than halting ingestion.
- **Token accounting per run**, written to the run record so cost is attributable to a source.

---

## Sequence

1. **v2 owns publishing.** Port the rubric, take the `reviewable → published` write. Removes the dependency on Radar.
2. **Repair the 357.** A batch job over quarantined rows, and the labelled set that tunes Layer 2's thresholds. Product value and engineering signal from the same work.
3. **Split the graph**, add telemetry and per-host politeness.
4. **Entities.** Organization, program, call. The largest phase.
5. **Resolution scoring** with embeddings, tuned on (2).
6. **Enrichment and composition** — the terminal page.
7. **Retire Radar, then Gary**, after v2 holds production alone through a full deadline cycle.

Steps 1 and 2 are independent of everything else and should start immediately.
