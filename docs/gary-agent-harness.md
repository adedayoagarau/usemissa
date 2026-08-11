# Gary agent harness

Status: implementation decision record

Owner: Missa platform

Last updated: 2026-08-11

## Outcome

Gary is a durable discovery-to-production system, not a single crawler script. The first production lane covers Poets & Writers. Source adapters can be added without cloning the scheduler, queue, reviewer, publisher, alerting, or dashboard.

The harness uses Neon/Postgres as its source of truth and Railway for long-running compute. Redis is deliberately deferred: Postgres row leases and `FOR UPDATE SKIP LOCKED` already provide the required durability, idempotency, retry, and low-volume concurrency. Redis becomes justified only when measured demand requires cross-process domain throttling, high-frequency event fan-out, or queue throughput that materially burdens Postgres.

## Product flow

```text
source adapter -> evidence store -> durable review queue -> DeepSeek recommendation
                                                        -> deterministic policy
                                                        -> public opportunity projection
                                                        -> email digest + admin dashboard
```

1. `gary-worker` claims a due source using a database lease, crawls within the source policy, stores source evidence, and enqueues changed observations.
2. `gary-reviewer` runs one morning cycle per configured local date. It claims jobs with row locks, sends bounded structured facts to DeepSeek, and stores the complete recommendation record.
3. The model cannot write to production. Publication requires deterministic gates: coherent identity, title, organizer, source URL, deadline, supported recommendation, and minimum confidence.
4. The publisher idempotently upserts one public opportunity per Gary call identity and preserves PW evidence. A publication may own multiple concurrent calls.
5. Low-confidence or incomplete records remain in `needs_human`. Operators can request publish, retry, hold, or reject in `/admin/gary`; the reviewer worker applies asynchronous publish requests.
6. The morning digest reports reviewed, published, held, failed, and estimated model cost. Database heartbeats provide Railway-independent evidence that each worker is doing useful work.

## Harness contracts

The design adapts three useful harness ideas:

- Microsoft Agent Framework: durable state and history around every service boundary, bounded context, background execution, approvals, and observability.
- LangChain: deterministic middleware before and after model calls. Gary's policy layer is code, not prompt prose.
- Harness Agent DLC: versioned artifacts, evaluation gates, deployment traceability, ownership, and rollback metadata.

References:

- https://learn.microsoft.com/en-us/agent-framework/agents/harness
- https://www.langchain.com/blog/how-to-build-a-custom-agent-harness
- https://www.harness.io/blog/introducing-harness-agent-dlc

## Durable entities

| Entity | Purpose | Identity |
| --- | --- | --- |
| `gary_harness_releases` | Git, parser, prompt, policy, and model version for each deployed artifact | Stable release hash |
| `gary_worker_heartbeats` | Latest useful-work heartbeat for crawler and reviewer | Worker kind |
| `gary_review_queue` | Retryable review/publication state machine | Opportunity + observation hash |
| `gary_ai_review_decisions` | Immutable structured model recommendation and cost | Queue + input hash + model + prompt |
| `gary_daily_digests` | Idempotent morning email delivery record | Local date + timezone + recipient hash |
| `gary_harness_audit_events` | Operator and worker action trail | Event ID; optional idempotency key |

Existing `gary_sources`, crawl runs/jobs, opportunities, observations, source pages, conflicts, profiles, links, and media remain the evidence layer.

## Authority and publication policy

- PW is the discovery source.
- The official host page is canonical when it clearly describes the same call.
- Similar organizer/title, description, and deadline identify the same call; formatting differences are not conflicts.
- One journal or press may have many concurrent calls. Organizer name alone never deduplicates opportunities.
- Host unavailability does not block a coherent PW record.
- Missing title, organizer, source URL, deadline, or confirmed identity blocks autonomous publication.
- Default autonomous threshold is `0.85`; it is configurable and visible in the dashboard.
- An operator publish request is durable and asynchronous. A queued request is not represented as published until the Railway reviewer confirms the public upsert.

## Railway topology

| Service | Command | Responsibility |
| --- | --- | --- |
| `gary-worker` | `gary-pw-worker --max-index-pages 50 --poll-seconds 60` | Freshness, crawl, evidence, review enqueue |
| `gary-reviewer` | `gary-review-worker --poll-seconds 60` | Morning AI review, gated publication, digest |
| Missa web | Existing web deployment | `/admin/gary` read model and operator commands |

Both workers use the Python Dockerfile and expose `/health` for deployment liveness. The dashboard uses database heartbeats for semantic health, because a live process is not proof that a crawl or review is progressing.

Required production variables:

| Variable | Service | Notes |
| --- | --- | --- |
| `DATABASE_URL` | both | Shared Neon database |
| `DEEPSEEK_API_KEY` | reviewer | Secret; configure in Railway, never in Git |
| `GARY_REVIEW_EMAIL` | reviewer | Digest recipient |
| `RESEND_API_KEY`, `RESEND_FROM` | reviewer | Existing Missa email provider |
| `GARY_DASHBOARD_URL` | reviewer | Production `/admin/gary` URL |
| `GARY_WORKER_MODE` | reviewer | Set to `reviewer`; crawler defaults safely when absent |
| `GARY_REVIEW_TIMEZONE` | reviewer | Default `America/Los_Angeles` |
| `GARY_REVIEW_HOUR` | reviewer | Default `8` |
| `GARY_DAILY_AI_COST_LIMIT_USD` | reviewer | Default `1.00` |
| `GARY_PUBLISH_THRESHOLD` | reviewer and web | Default `0.85` |

Service settings must point to the custom config files:

- `/tools/pw-grants-crawler/railway.crawler.json`
- `/tools/pw-grants-crawler/railway.reviewer.json`

## Retention recommendation

| Data | Retention | Rule |
| --- | --- | --- |
| Canonical records, extracted facts, decisions, hashes | Indefinite | Audit and reproducibility contract |
| Raw HTML and text evidence | 365 days | Remove body only after dry-run; retain hash and metadata |
| Render files and non-public media | 180 days | Public selected image remains with the profile/call |
| Model payload and raw response | 180 days | Retain hashes, recommendation, reason, tokens, and cost indefinitely |
| Operational errors and terminal failed payloads | 90 days | Keep active/retryable jobs |
| Railway logs | 30 days or provider plan | Durable outcomes belong in Neon |

No deletion job is enabled in this release. Retention cleanup should first ship as a dashboard-visible dry run with row and byte counts.

## Failure and rollback

- Database leases expire; another replica can resume abandoned work.
- Review jobs back off and become `needs_human` after the configured attempt ceiling.
- A model outage cannot stop crawling or erase evidence.
- A crawl outage cannot mutate public opportunities.
- A bad harness release can be rolled back in Railway; release metadata preserves which parser, prompt, model, and policy produced each decision.
- Queue actions are idempotent and audited.

## Expansion contract

The next source adds an adapter and source policy, not a cloned Gary. Each adapter must provide normalized identity candidates, evidence pages, fields, media selection, crawl delay, and freshness. It then enters the same review, publication, alert, and dashboard contracts.
