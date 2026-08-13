# Ingestion v2 workbench contract

Status: proposed for internal review
Date: 2026-08-13

This is an operator workbench for understanding source ingestion before anything becomes customer-visible. It is shadow/review tooling. A completed run is not a published opportunity, and a queued request is not proof of worker execution.

## Users and jobs

- **Operator:** see what ran, what is blocked, and request one bounded shadow run.
- **Reviewer:** inspect source evidence, extracted fields, destination links, warnings, and quality before accepting a run for a later governed review step.
- **System owner:** compare v2 with Gary/Radar and decide whether a source adapter is ready for controlled promotion.

## Two interface shapes considered

### A. Linear-style worklist

One dense, keyboard-friendly run list with URL-backed filters and a selected detail panel. It optimizes for triage speed and makes status, source, quality, and failure code scannable in one row.

### B. Sentry-style issue investigation

A source-health inbox grouped by failure class, with each run opening into an evidence timeline, stack-like failure context, and related snapshots. It optimizes for diagnosis and recurring source problems.

### Chosen composition: worklist plus evidence inspector

The primary surface uses the Linear-style worklist as the index and the Sentry-style evidence inspector for the selected run. This keeps the common action—find the next run to inspect—fast while preserving enough evidence to explain a failure. Source configuration and promotion remain separate routes/actions so the workbench does not turn into an unsafe settings page.

## Information architecture

`/admin/ingestion-v2` contains:

1. **Queue:** recent runs, status/source/quality filters, search, and one bounded “Run shadow pass” action.
2. **Inspector:** selected run identity, lifecycle, source, mode, failure code, quality, snapshots, extracted fields, destination candidates, and warnings.
3. **Contract strip:** explicit separation of fetched, extracted, reviewed, and published states.

The workbench also supports **Queue all eligible**. This selects the active, trusted source registry entries in one audited shadow batch. Inactive, blocked, and needs-review entries are reported as held; they are not silently enqueued. Each source still receives its own durable run ID, so one failing source cannot hide the result of another.

Future routes should be:

- `/admin/ingestion-v2/sources/:sourceId` — source contract, adapter, destinations, cadence, latest health, and blocked/degraded evidence.
- `/admin/ingestion-v2/compare/:runId` — Gary/Radar/v2 field comparison and identity decisions.
- `/admin/ingestion-v2/promotion/:runId` — promotion gate, reviewer separation, receipt, and rollback plan.

## State contracts

Run states are `queued`, `running`, `completed`, `failed`, and `cancelled`. They are worker lifecycle states, not publication states.

Quality states are `accept`, `review`, and `reject`. They describe the current v2 artifact assessment only.

Publication is always shown separately as `shadow only` or `not published`; the current v2 worker must not imply public publication.

Failure codes are literal and stable: `robots-disallowed`, `blocked`, `not-found`, `timeout`, `invalid-content`, `model-error`, `database-error`, and `unknown`.

Unknown, unavailable, empty, zero, and not observed are distinct UI values. Raw source bodies and credentials never appear in the list; evidence views expose bounded, sanitized values and source links only.

## Interaction contracts

- Selecting a row updates `?run=<id>` and preserves filters. Refreshing or sharing the URL returns to the same selection.
- Filters are URL-backed and never change authorization. Search matches run ID, source ID, failure code, and status.
- The selected inspector has stable sections: **Why**, **Lifecycle**, **Evidence**, **Extraction**, **Destinations**, and **Warnings**.
- “Run shadow pass” requires an exact source selection and returns an acknowledgement with run ID. It never claims completion.
- Retry, cancel, publish, or edit-source controls are intentionally absent until their backend contracts include idempotency, expected state/version, audit receipt, and worker acknowledgement.
- On narrow screens the list becomes a full-width route state followed by the inspector; evidence is not trapped in a modal.
- All status colors have text labels. Focus order, keyboard row selection, visible focus, table headers, and `aria-live` acknowledgements are required.

## Operator journey

1. **Orient:** open the workbench and read the contract strip and latest-run freshness.
2. **Triage:** filter to failed, review, or a named source; sort is newest first.
3. **Diagnose:** open a run and read the failure code or quality reason before taking action.
4. **Verify:** inspect root/related snapshots, field provenance, destination role, and warnings.
5. **Compare:** move to the future comparison route to understand Gary/Radar agreement and identity confidence.
6. **Request:** queue one shadow pass when the source contract is understood; record the acknowledgement, not an assumed outcome.
7. **Govern:** only after benchmark, quality, identity, source maturity, and review gates pass may a separate promotion workflow be opened.

## Analytics contract

Analytics measure operator behavior, not source truth. IDs are internal run/source IDs; no raw HTML, tokens, private payloads, or full query strings are sent.

Events:

- `ingestion_workbench_viewed`: `run_count`, `selected_run`, `filters_present`, `data_maturity`.
- `ingestion_run_selected`: `source_id`, `status`, `quality_decision`, `failure_code`.
- `ingestion_run_filtered`: `filter_name`, `filter_value`.
- `ingestion_run_evidence_viewed`: `section`, `source_id`, `run_status`.
- `ingestion_shadow_run_requested`: `source_id`, `mode`, `request_result`.
- `ingestion_workbench_error`: `surface`, `error_code`.

The browser sends these through the existing PostHog wrapper and first-party event ledger. The server also records the shadow-run request because the API action must remain measurable when the browser closes immediately after acknowledgement.

## Promotion boundary

The workbench is read-only except for bounded shadow-run requests. It is not a public publishing console, source-secret manager, crawler control plane, or replacement for the evidence archive. Every later promotion action must show exact source evidence, field-level provenance, identity comparison, destination classification, quality score, reviewer, policy version, and an auditable receipt.
