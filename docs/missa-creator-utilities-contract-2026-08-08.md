---
title: Missa creator Home, Import, and Ask contract
version: "1.0"
status: contract-ready-for-local-visual-comparison
date: "2026-08-08"
routes: /home, /import, /ask
product_promotion_status: blocked
---

# Missa creator Home, Import, and Ask contract

## 1. Product boundary

These three utilities support different jobs:

- **Home** helps a signed-in creator resume the single most useful next task.
- **Import** lets a creator bring a private external tracker into Missa without changing anything before review.
- **Ask Missa** performs bounded, source-backed Opportunity search when enabled; it does not replace browse, detail, Tracker, or professional judgement.

They do not become primary destinations merely because routes exist. Home must earn its place with a useful next-task projection. Import belongs to Tracker. Ask Missa is a capability-gated utility.

## 2. Current implementation truth

### Home

- `/home` currently redirects to `/inbox`;
- no typed creator next-task projection or priority policy exists;
- the authenticated navigation currently treats Home as a peer destination despite the absence of a Home product;
- Inbox, Tracker, Library, Profile, hosted application drafts, and integration review each have data that could eventually contribute, but no reconciled cross-product model exists.

### Import

- `/import` is authenticated and Profile-scoped;
- the current CSV flow supports upload, detected/manual column mapping, preview, per-row decisions, and a result summary;
- it allows up to 5 MiB and 10,000 data rows and treats cells as text rather than evaluating formulas;
- preview is rate-limited in memory, expires after 15 minutes, and signs user, file hash, mapping hash, and candidate-set hash;
- commit re-parses the same file, rejects changed preview inputs/candidates, requires explicit resolution, snapshots the in-memory store, restores on error, records an audit entry, and persists only after commit;
- current candidate options expose a `confidence` label; that implementation score is not a user-facing decision explanation;
- `genre` is accepted as one import column even though Work taxonomy has 12 independent facets and must not be reduced to a legacy genre field;
- preview/commit rate limits are process-local rather than durable/distributed, and product promotion still requires a real database transaction/idempotency contract.

### Ask Missa

- `/ask` redirects to Opportunities when the feature flag is off;
- the current service is a durable, read-only, authenticated Opportunity-search conversation with idempotency keys and account-scoped history;
- the first search planner is deterministic: it recognizes a bounded set of Opportunity types, fee intent, simple query terms, and deadline/recommended sorting;
- it does not perform open-ended reasoning, eligibility judgement, Organization operations, submission mutation, or web search;
- result cards include official-source links, deadline, and fee, but currently expose last-checked timestamps and Organization-confirmed state;
- assistant copy explicitly says the last-checked time is kept visible, which violates the customer-facing freshness boundary;
- the UI loads only the latest conversation automatically and has no complete conversation-management contract;
- the API accepts an Organization ID only after membership checking, but the current creator UI does not expose an Organization assistant mode.

## 3. Home contract

Primary question: **What should I continue now?**

Home is justified only when the server can provide a privacy-safe `CreatorHomeProjection` with explicit sources and priority reasons. Otherwise `/home` should redirect to canonical Opportunities, not Inbox.

### 3.1 Candidate priority order

1. ambiguous or incomplete application/payment submission result requiring confirmation;
2. hosted application draft with a real near deadline;
3. explicit decision/message that the creator has not seen;
4. Tracker item with a creator-set preparation deadline or official deadline approaching;
5. email/import item awaiting the creator’s review;
6. interrupted Library/Profile task that blocks a chosen application;
7. a small set of relevant open Opportunities with transparent private reasons;
8. new-account orientation when no activity exists.

This order is a target policy, not a claim that all supporting models exist. It requires versioned server logic and tests before UI promotion.

### 3.2 Required composition

1. plain greeting and current private scope;
2. one primary next task with reason and destination;
3. a short attention list when more than one consequential item exists;
4. saved/in-progress work grouped by product rather than card type;
5. a restrained new-opportunity continuation only after urgent owned work;
6. useful new-account empty state.

### 3.3 Prohibited Home patterns

- generic dashboard metrics, activity feed, streaks, completeness percentages, or “productivity” score;
- customer-facing freshness, source confidence, worker state, or recommendation score;
- unread/urgent language when no durable state supports it;
- inferred priority from artistic value, Organization prestige, or hidden Profile attributes;
- duplicated Inbox, Tracker, and Library modules with independent state;
- forcing Home to exist when Opportunities is the more useful default.

### 3.4 Home edge states

- new account with no Profile inputs;
- no activity but useful public Opportunities;
- one interrupted task and many competing tasks;
- two items with the same deadline/timezone;
- hidden/removed Opportunity, deleted message target, withdrawn Submission, unavailable file;
- private-fit conflict and incomplete Profile;
- subsystem partial failure where other sections remain usable;
- session expiry, slow response, response after navigation;
- long/multilingual titles and 320–1536px widths.

## 4. Tracker Import contract

Primary question: **Can I trust exactly what will change before I import?**

### 4.1 Step model

1. **Choose file** — CSV constraints, privacy, template, safe parsing.
2. **Map columns** — persistent source and target names, required fields, sample values.
3. **Review rows** — matched, possible match, manual entry, conflict, warning, invalid, duplicate, skip.
4. **Confirm import** — exact counts by action and consequence; no write before this step.
5. **Result** — durable receipt, added/updated/skipped/unresolved counts, exact route to imported rows.

### 4.2 Matching and taxonomy

- show match reasons such as normalized title, Organization, source URL, or known Opportunity ID; do not expose a raw confidence score;
- a possible match remains a creator decision unless an exact stable identifier proves identity;
- imported status maps only to valid Tracker states and never changes an Organization Submission;
- imported Work title remains separate from Opportunity title;
- legacy genre/practice columns enter a taxonomy-review step using canonical IDs, aliases, facet labels, and unresolved values;
- no legacy value silently becomes a canonical term;
- Opportunity type, eligibility, geography, fee, and dates remain outside Work taxonomy;
- imported notes and source URLs are treated as untrusted private text/links.

### 4.3 Safety and privacy

- parse CSV as inert text; neutralize formulas in export and never execute/import spreadsheet formula semantics;
- enforce MIME/extension, byte, row, column, cell-length, and processing-time limits on the server;
- the preview token is user-bound, file/mapping/candidate-bound, expiring, and single-purpose;
- commit uses a durable idempotency key and database transaction; concurrent Tracker changes trigger re-preview or an explicit comparison;
- rate limiting is durable/distributed enough for the deployed topology;
- no Organization receives imported data unless the creator later submits it deliberately;
- raw files are not retained beyond the declared processing policy; logs/analytics exclude row content;
- canceling before commit changes nothing; a failed commit changes nothing;
- repeated commit returns the same receipt or a safe already-imported result.

### 4.4 Import edge states

- no file, wrong type, empty file, malformed quoting/encoding, huge file, too many rows/columns, duplicate headers;
- formula-like cells, ambiguous dates/locales, unknown status, duplicate rows, duplicate existing Tracker item;
- exact match, several candidates, no candidate, changed candidate set, expired preview;
- current/imported status conflict, newer concurrent Tracker update, source URL mismatch;
- all rows valid, all rows skipped, mixed result, no-op import;
- preview/commit rate limit, timeout, offline after review, ambiguous commit response, persistence failure;
- keyboard-only mapping and row resolution, screen-reader error summary, 320px review cards, large desktop comparison.

## 5. Ask Missa contract

Primary question: **Can Missa help me find or clarify a published Opportunity while showing the supporting records?**

### 5.1 Supported scope

- search published Opportunities by plain-language query;
- interpret only supported filters and show the parsed search state;
- summarize customer-safe deadline, fee, Opportunity type, geography, and practice facts;
- link every result to canonical Missa detail and the official source;
- suggest a broader or corrected query when no records match;
- let the creator report a wrong result or continue in browse.

Ask Missa must state when a request is outside this scope. It never declares eligibility, predicts acceptance, ranks artistic quality, gives legal/financial advice, sends applications, changes Tracker state without a separate explicit action, or exposes Organization/private/Admin data.

### 5.2 Evidence boundary

- result evidence contains customer-safe source name, URL, and the exact public facts used;
- no checked/fetched/processed timestamp, source tier, confidence, organization-confirmed boolean, worker state, internal record ID, or raw extraction evidence;
- “Official source” means the destination linked for the Opportunity, not that every displayed fact is current or Organization-endorsed;
- conflicting or unknown facts are named in the answer/result rather than collapsed into confidence;
- generated prose never outranks the canonical Opportunity projection or official source;
- citations remain attached to the claim/result they support.

### 5.3 Conversation behavior

- new conversation, latest/history list, rename/delete/export policy, and retention are explicit before exposing durable history controls;
- each send has a durable idempotency key and clear pending/completed/failed/ambiguous state;
- user input remains after failure;
- retry does not duplicate a turn;
- late responses do not overwrite a newer conversation or navigate the user unexpectedly;
- a result opens in route history with a return to the exact conversation and scroll/focus state;
- the composer explains the bounded scope without internal engine names;
- feature disabled, database unavailable, no answer, unsafe request, source unavailable, partial results, and rate limit are distinct states.

### 5.4 Taxonomy behavior

- the parser/search layer may resolve aliases and canonical IDs across all 12 facets, but the answer shows only relevant human labels;
- Opportunity type, eligibility, career stage, geography, fee, and deadline remain separate parsed filters;
- a query can combine facets without turning intersections into a fit or eligibility score;
- ambiguous terms ask a focused clarification when the distinction materially changes results;
- no matching records means no match in Missa’s current published collection, not no Opportunities in the world;
- deprecated/culturally sensitive terms use reviewed public labels while preserving source wording where needed.

## 6. Shared responsive and accessibility contract

- Home begins with the actual next task on a phone, not navigation plus metrics;
- Import becomes labelled row cards on mobile and retains a desktop comparison view where useful;
- Ask uses a full-height mobile conversation with a reachable composer that responds to safe-area and software keyboard;
- all touch targets are at least 44px;
- step/state changes are announced without turning entire dynamic regions into noisy live regions;
- focus moves deliberately after import errors, step transitions, Ask send/result, and route returns;
- loading spinners have text, reduced motion is respected, and progress never relies on animation;
- long source/title/Organization names, RTL snippets, code-like URLs, and user text wrap safely;
- no horizontal page overflow at 320, 390, 768, 1280, and 1536px.

## 7. Component and promotion gates

Premium dashboard, stepper, upload, mapping-table, chat, source-card, alert, progress, dialog, and Sheet references may provide anatomy only. Reject candidates that create a metric-wall Home, hide import consequences, expose match/source confidence, show freshness, imply a general-purpose AI assistant, use chat bubbles without citation/action structure, or turn every result into an interactive nested card.

Before promotion:

- Home projection and priority policy exist or `/home` intentionally redirects to Opportunities;
- Import uses durable rate limiting, transaction/idempotency, typed taxonomy review, and accessible large-file behavior;
- Ask removes checked/confirmed customer metadata, has a typed customer-safe evidence projection, and passes tenant/privacy review;
- canonical shell and route choices are selected;
- desktop/mobile/keyboard/screen-reader/zoom/high-contrast and network/concurrency tests pass;
- explicit page-family approval is recorded.

Product promotion remains blocked.
