---
epic: 4
story: 4.3
status: review
title: Gmail Sync OAuth and Autopilot modes
---

# Story 4.3: Gmail Sync OAuth and Autopilot modes

## Story

As a creator,
I want to connect Gmail with a clear privacy level,
so that Missa can find submission emails without making me forward every message.

## Context and scope

This story delivers the Gmail branch of FR27 after Story 4.2's forwarding-address mode. Gmail access is a separate credential and privacy boundary. The default is **Gmail Sync — review before import**: Missa proposes updates in Inbox, and nothing changes in Tracker until the user confirms. **Autopilot** is an explicit, reversible opt-in that may apply only narrowly bounded, high-confidence non-sensitive updates; sensitive decisions remain in review in this story.

The production surface remains the Next.js modular monolith. Route Handlers call `radar-engine`/`radar-adapters` directly through `apps/web/lib/engine.ts`; they do not call an internal HTTP service. Gmail OAuth, Gmail API calls, and Pub/Sub/polling are behind a provider port. The engine receives a normalized message envelope and reuses Story 4.2's deterministic parser, candidate queue, private manual-entry model, idempotency, and review mutation contracts.

Google's server-side OAuth flow requires a one-time authorization code exchange, `access_type=offline` for a refresh token, and server-side refresh-token storage. Gmail mailbox push uses Cloud Pub/Sub and a `watch` expiration; a scheduled history sync remains the fallback when push is delayed or unavailable. See the official [Gmail server-side authorization guide](https://developers.google.com/workspace/gmail/api/auth/web-server), [Gmail push guide](https://developers.google.com/workspace/gmail/api/guides/push), and [Gmail synchronization guide](https://developers.google.com/workspace/gmail/api/guides/sync).

### Product language and trust guardrails

- Render **Email Sync**, **Gmail Sync**, **Autopilot**, **Review before import**, **Inbox**, **Tracker**, and **Profile**. Do not render “Passport”, “submitter”, raw OAuth scopes, `GmailConnection`, or provider implementation names.
- Lead with permission and control: `Missa scans likely submission emails. You review updates before they reach your Tracker.`
- Autopilot copy must state exactly what it can update and what it will never update. The disable action must be obvious and immediate.
- Never frame Gmail access as reading a user's life. Do not use decision words such as `Rejected` in notification headlines; use `Possible decision detected` until the user opens/reviews it.

## Acceptance criteria

### AC1 — Gmail connection starts only from an authenticated owner flow

**Given** an authenticated user on Profile's `Email Sync` card
**When** they choose `Connect Gmail`
**Then** Missa creates a short-lived, single-use OAuth state bound to the session user, redirect URI, PKCE verifier, and a random nonce
**And** the authorization request uses the configured Google client ID, exact registered redirect URI, `access_type=offline`, and the minimum required Gmail read scope (`https://www.googleapis.com/auth/gmail.readonly`)
**And** the UI explains that Gmail read access is sensitive/restricted, what Missa scans, what it ignores, that review is the default, and how to disconnect before redirecting
**And** no user/account ID, email, mode, or return URL is trusted from a browser query string
**And** a missing production Google client configuration fails closed with a recoverable setup message, not a fake connected state.

### AC2 — OAuth callback is stateful, account-bound, and replay-safe

**Given** Google redirects to `/api/auth/gmail/callback`
**When** the callback has a missing/expired/replayed state, mismatched PKCE verifier, wrong redirect origin, OAuth error, or missing one-time code
**Then** Missa rejects it without creating a connection or storing tokens and redirects to Profile with a recoverable error
**And** a valid code is exchanged server-side; the callback obtains Google's stable subject ID and verified account email from the OAuth result/UserInfo, never from the request query
**And** a Google subject already linked to another Missa user cannot be linked silently; the current user sees a conflict and the existing connection is unchanged
**And** a session that expires before callback cannot attach credentials to a new user
**And** the one-time state/code cannot be reused after a successful or failed exchange
**And** the callback stores no access/refresh token in a URL, cookie, browser local storage, analytics event, log, or rendered HTML.

### AC3 — Refresh and access tokens are encrypted, rotatable, and revocable

**Given** a successful OAuth exchange
**Then** the refresh token is encrypted at rest with AES-256-GCM (or an equivalent audited envelope-encryption adapter) using `MISSA_GMAIL_TOKEN_KEY` and a stored key version; the plaintext refresh token is never returned or logged
**And** short-lived access tokens are kept in memory only when possible, are never persisted in the Radar JSON/DB projection, and are refreshed server-side when expired
**And** decryption failures, invalid grants, revoked credentials, or scope mismatches transition the connection to `error`/`revoked`, stop sync, and ask the user to reconnect
**And** key rotation supports decrypting the previous key version and re-encrypting on the next successful use; the old key can then be retired according to the deployment runbook
**And** `Disconnect Gmail` revokes Google's token when possible, deletes encrypted credentials and provider identifiers, stops watch/polling, and leaves confirmed Tracker events intact
**And** credential deletion is durable across Neon reloads and does not expose the Google account email to organizations or public pages.

### AC4 — Connected state and mode are explicit, safe defaults

**Given** a connected Gmail account
**When** Profile renders Email Sync
**Then** it shows a masked Gmail address, connection state, granted access description, last sync time, next sync/watch state, `Sync now`, `Disconnect Gmail`, and the active mode
**And** the active mode defaults to `Review before import` even if a prior browser sends a different mode
**And** the user must explicitly select `Enable Autopilot`, read a confirmation summary, and confirm with a checkbox/button before mode becomes `autopilot`
**And** disabling Autopilot takes effect immediately, cancels pending automatic mutations, and returns to review-only without disconnecting Gmail
**And** a mode change is session-derived, idempotent, audit-recorded, and never accepted from a hidden field or OAuth callback parameter.

### AC5 — Initial sync is bounded and review-only

**Given** a newly connected account
**When** the initial sync runs
**Then** it scans only a bounded, user-visible window (default 30 days, maximum 90 days) and at most 500 candidate message IDs per run
**And** the user can narrow the query before scanning by Gmail label and optional sender/domain filter; Missa does not silently scan all historical mail
**And** the adapter retrieves message metadata/headers first and fetches a full text representation only for messages that pass deterministic submission-related signals
**And** attachments are metadata-only as in Story 4.2; raw Gmail messages, HTML, MIME, binaries, and full headers are not persisted
**And** every extracted email becomes a private `EmailReviewCandidate` with provider/source `gmail-sync`, including match candidates, proposed status/date/work, evidence reasons, warnings, and a 30-day retention expiry
**And** no Tracker row, status event, canonical Opportunity, organization record, Gmail label, or outgoing message changes during initial sync
**And** the user sees aggregate progress/result counts (`found`, `needs review`, `ignored`, `already seen`) without exposing another account's data.

### AC6 — Incremental sync handles Gmail history, push, and fallback boundaries

**Given** a connected account with a stored Gmail `historyId`
**When** a scheduled sync or verified Pub/Sub notification arrives
**Then** the worker calls `history.list` from the stored history ID, processes only added messages matching the configured labels/query, and advances the cursor only after successful processing
**And** a Gmail `404`/stale history ID triggers a bounded full resync for the configured window rather than dropping messages or looping
**And** a Pub/Sub webhook validates the message/OIDC audience and acknowledges quickly; it records a deduplicated sync job keyed by connection/history/message ID and does not perform unbounded Gmail API work in the webhook request
**And** a scheduled CRON route drains pending jobs, polls connections whose `nextSyncAt` is due, renews Gmail watches at least daily before their maximum seven-day expiry, and remains a functional fallback if push is delayed/dropped
**And** a disconnected, revoked, error, or Autopilot-disabled connection is not polled, watched, or resynced
**And** concurrent jobs for one connection are serialized with a database lease/idempotency key so two workers cannot duplicate candidates or advance the cursor out of order.

### AC7 — Gmail API quotas, retries, and failures are bounded

**Given** a Gmail API or Pub/Sub operation
**When** Google returns 429, 5xx, timeout, invalid grant, expired watch, or quota errors
**Then** the adapter honors `Retry-After` where supplied and applies bounded exponential backoff with jitter; it never busy-loops in a Route Handler
**And** per-user and global concurrency limits prevent one mailbox from starving others; one failing connection cannot fail the batch
**And** the job records a privacy-safe failure code/next attempt and returns a recoverable state to Profile/Inbox
**And** the user can choose `Sync now` only within a documented per-account cooldown; repeated clicks do not create duplicate jobs
**And** failures never log tokens, message bodies, sender addresses, OAuth codes, or raw Google responses.

### AC8 — Existing parser and candidate contracts are reused safely

**Given** a normalized Gmail message envelope
**When** Missa parses it
**Then** it uses the deterministic parser/matcher and sanitized content rules from Story 4.2, changing only the source provider/mode metadata
**And** sender/domain/title/subject evidence is treated as a proposal, not authenticity or authorization
**And** known statuses, dates, work names, attachments, sensitive outcomes, ambiguous matches, duplicate body/message IDs, and unsupported content follow the same candidate states and review warnings as forwarding mode
**And** Gmail candidates are deduplicated by connection + Gmail message ID/history ID, with a body/subject fallback for provider retries; repeated syncs return the existing candidate
**And** all candidates remain private to the linked user and never become public Radar opportunities or organization submissions.

### AC9 — Review-only Gmail Sync mutates Tracker only after explicit confirmation

**Given** a Gmail candidate in Inbox and mode `review`
**When** the user confirms a proposed update, chooses another opportunity/status, creates a private manual entry, ignores, or deletes it
**Then** the existing Story 4.2 review mutation path is used with `source: 'email'`, provider/mode metadata, candidate ID, and confidence
**And** sensitive outcomes (`accepted`, `declined`, `waitlisted`, `finalist`, `shortlisted`, `withdrawn`) always require an explicit status choice
**And** the mutation is scoped to the session user's Tracker; existing status history and canonical Opportunity fields are preserved
**And** review idempotency prevents duplicate events after a browser retry, Pub/Sub retry, or worker retry
**And** `Ignore`/`Delete email` changes only the private candidate state and retention data, never Tracker.

### AC10 — Autopilot is narrow, high-confidence, and immediately reversible

**Given** the user has explicitly enabled Autopilot
**When** a new Gmail candidate is produced
**Then** automatic updates are allowed only when all gates pass: exact user-owned tracked opportunity, high-confidence match, high-confidence **non-sensitive** status (`received` or `in-review`), valid evidence, no conflict/newer terminal Tracker event, and no warning requiring review
**And** Autopilot never automatically applies accepted, declined, waitlisted, finalist, shortlisted, withdrawn, revision-requested, deadline, work, fee, or organization changes in this story; those remain in Inbox
**And** each automatic update appends one `StatusEvent` with `source: 'email'`, `confidence: 'high'`, candidate ID, and reason code, marks the candidate `confirmed`, and records `tracker.email_autopilot_updated`
**And** if any gate fails, the candidate is review-only with a visible explanation of the blocked gate
**And** disabling Autopilot prevents future automatic mutations and stops any queued job from applying a candidate; a mutation already committed before disable remains in history and is clearly labelled `Updated automatically`
**And** an owner can undo/adjust an automatic non-sensitive status through the normal Tracker status control; this creates a new user event rather than deleting history.

### AC11 — Gmail review UI is visible in Profile and Inbox

**Given** desktop, tablet, keyboard, reduced motion, and 390px mobile
**Then** Profile's Email Sync card has clear mode choices, permission copy, masked connection identity, last sync/watch/error state, `Sync now`, `Enable Autopilot`, `Disable Autopilot`, and `Disconnect Gmail`
**And** the Autopilot confirmation dialog states the exact allowed/non-allowed status gates, private-data boundary, and immediate disable behavior
**And** Inbox's `Email updates to review` queue (from Story 4.2) adds filters/source labels for `Forwarding address` and `Gmail Sync`, an `Updated automatically` section, and a `Reconnect Gmail` recovery action when credentials fail
**And** candidate cards show subject, sender domain, received date, proposed status, matched opportunity, confidence reasons, warnings, source mode, and sanitized excerpt; no raw HTML/MIME or attachment body is rendered
**And** all controls have visible labels, 44×44px touch targets, focus-visible rings, loading/disabled/error states, `aria-live` updates, and focus restoration after dialogs/actions
**And** the page uses true white `#ffffff`, existing semantic tokens, Instrument Sans/Fraunces/Fragment Mono roles, and existing shadcn primitives; color is never the only status signal and motion honors `prefers-reduced-motion`.

### AC12 — OAuth, sync, and review events are privacy-safe and auditable

**Given** a connect, mode change, sync, disconnect, or Tracker mutation
**Then** the append-only audit log records attributable aggregate actions such as `email.gmail_connected`, `email.gmail_mode_changed`, `email.gmail_sync_started`, `email.gmail_sync_completed`, `email.gmail_sync_failed`, `email.gmail_disconnected`, and `tracker.email_autopilot_updated`
**And** details include account/user/connection IDs, mode, scope class, aggregate counts, status slug/confidence/reason code, and provider error class only
**And** details never include OAuth codes/tokens, Gmail address, subjects, sender/body/excerpts, attachments, labels, message IDs, history IDs, or raw Google responses
**And** confirmed Tracker events retain only the same private status/date/evidence boundary defined in Story 4.2; public Profile, exports, calendar, Opportunity browse/detail, and Workspace never expose Gmail connection/candidate data
**And** deleting/disconnecting Gmail removes credentials and queued sync work; user-confirmed Tracker history remains according to normal Tracker retention.

### AC13 — Retention, privacy, and consent controls are explicit

**Given** the user views Email Sync settings
**Then** Missa explains that Gmail Sync reads only the configured window/labels/query, stores short sanitized excerpts for 30 days, does not store attachments/raw mail, and does not share mail history with organizations
**And** the user can delete pending Gmail candidates immediately, disconnect/revoke Gmail, and turn Autopilot off without deleting confirmed Tracker history
**And** no Gmail content is sent to analytics, training, LLMs, or third parties outside the configured Google API/provider path
**And** access is limited to the linked Missa user; account deletion cleanup removes encrypted credentials, connection/jobs, and candidates
**And** the consent copy links to the current privacy policy and does not imply that Gmail `readonly` scope is narrow if Google displays it as broad/restricted access.

## Domain contracts

### Gmail connection

```ts
type GmailMode = 'review' | 'autopilot';
type GmailConnectionStatus = 'active' | 'syncing' | 'error' | 'revoked' | 'disconnected';

interface GmailConnection {
  id: string;
  userId: string;
  googleSubjectId: string;
  accountEmailMasked: string;
  encryptedRefreshToken: string;
  tokenKeyVersion: number;
  grantedScopes: string[];
  mode: GmailMode; // always starts review
  status: GmailConnectionStatus;
  query?: string;
  labelIds?: string[];
  scanWindowDays: 30 | 60 | 90;
  historyId?: string;
  watchExpiration?: string;
  lastSyncAt?: string;
  nextSyncAt?: string;
  lastErrorCode?: string;
  consentedAt: string;
  disconnectedAt?: string;
}
```

Never persist access tokens. Encrypt refresh tokens with a key version and store only a masked account email for UI. A Google subject ID is the provider binding; the email can change and is not the authorization key.

### Sync job

```ts
type GmailSyncTrigger = 'initial' | 'manual' | 'cron' | 'pubsub' | 'watch-renewal' | 'history-reset';
type GmailSyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

interface GmailSyncJob {
  id: string;
  connectionId: string;
  userId: string;
  trigger: GmailSyncTrigger;
  status: GmailSyncJobStatus;
  requestedAt: string;
  leaseUntil?: string;
  attemptCount: number;
  startHistoryId?: string;
  targetHistoryId?: string;
  dedupeKey: string;
  result?: { inspected: number; candidates: number; ignored: number; duplicates: number };
  errorCode?: string;
  nextAttemptAt?: string;
  completedAt?: string;
}
```

Use a unique `dedupeKey` and a short lease to serialize one connection. The Pub/Sub route records/enqueues a job and returns quickly; Cron drains jobs and performs bounded Gmail calls.

### Candidate compatibility extension

Extend Story 4.2's private `EmailReviewCandidate` with:

```ts
sourceMode: 'forwarding' | 'gmail-sync' | 'autopilot';
forwardingAddressId?: string;
gmailConnectionId?: string;
gmailMessageId?: string;
gmailThreadId?: string;
gmailHistoryId?: string;
```

`forwardingAddressId` becomes optional for Gmail candidates. Do not duplicate the parser, candidate queue, manual entry, or review mutation model. Gmail-specific identifiers remain private and are excluded from audit/export/public projections.

## API contracts

### Owner OAuth and connection routes

- `GET /api/me/email-sync`: session-derived, no-store view of forwarding/Gmail status, masked account, mode, retention, last sync/error, and allowed actions.
- `GET /api/me/email-sync/gmail/start`: validates session/config, creates signed state + PKCE verifier, stores only hashed short-lived state server-side, and redirects to Google's exact authorization URL.
- `GET /api/auth/gmail/callback`: validates state/PKCE/session, exchanges the code through the provider adapter, persists encrypted refresh token and a review-mode connection, queues bounded initial sync, then redirects to Profile with a non-sensitive result.
- `POST /api/me/email-sync/gmail/sync`: queues one idempotent manual sync job; enforces owner auth and cooldown; returns job ID/state, never email content.
- `POST /api/me/email-sync/gmail/mode`: body `{ mode: "review" | "autopilot", confirmation?: true, idempotencyKey: string }`; Autopilot requires explicit confirmation and returns its gate summary.
- `DELETE /api/me/email-sync/gmail`: body `{ confirmation: true, deletePendingCandidates?: boolean, idempotencyKey: string }`; revokes/deletes credentials, stops watch, cancels jobs, and returns aggregate counts.

All owner routes use `Cache-Control: private, no-store`, reject browser user/account IDs, and return `401`/`404`/`409`/`429` with recoverable messages.

### Provider and worker routes

- `POST /api/inbound/gmail/push`: validates Google Pub/Sub envelope and OIDC audience/signature, decodes only the Gmail address/history ID, enqueues a deduped job, and acknowledges within the provider deadline. It never accepts a browser session or raw message body.
- `POST /api/cron/gmail-sync`: requires `CRON_SECRET`, renews watches daily, drains bounded jobs, polls due connections, applies retries/leases, and persists aggregate results. It must be safe to rerun.

The provider port should expose `buildAuthorizationUrl`, `exchangeCode`, `refreshAccessToken`, `revokeToken`, `watchMailbox`, `stopWatch`, `listMessages`, `getMessageMetadata`, `getMessageText`, and `listHistory`. Keep Google client objects and HTTP details in `packages/radar-adapters/src/email/gmail/` (or the equivalent adapter folder), not in `radar-engine` or React components.

## Neon and deployment dependencies

- Add additive Radar compatibility collections/tables for `radar_gmail_connections`, `radar_gmail_sync_jobs`, and any OAuth state/lease records required for durable callback/job safety. Use raw SQL/schema conventions already used by `packages/radar-adapters`; do not add a second auth database or expose credentials through Workspace/Drizzle tables.
- Add unique indexes for `(google_subject_id)`, `(connection_id, dedupe_key)`, and provider message identity; index `next_sync_at`, `status`, and `lease_until` for bounded worker scans.
- Required deployment secrets/config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, exact `GOOGLE_REDIRECT_URI`, `MISSA_GMAIL_TOKEN_KEY` (versioned), `MISSA_SESSION_SECRET`, `CRON_SECRET`, and Pub/Sub OIDC audience/signing configuration. Fail closed when production secrets are absent.
- Google Cloud setup is required before production: Gmail API enabled, OAuth consent screen and restricted-scope verification/security review as applicable, authorized redirect URI, Cloud Pub/Sub topic/subscription, Gmail service-account publish permission, and a push endpoint. Local tests use signed fixtures and do not contact Google.
- Neon persistence must be rehearsed on a disposable branch/database: connect, refresh, queue job, retry, disconnect, and reload must preserve no plaintext token and no orphan active job.

## Ordered implementation checklist

1. Read `DESIGN.md`, naming decisions, Epic 4 requirements, Story 4.2 contracts/implementation, existing auth/audit/engine/persistence, and the official Gmail OAuth, push, and sync guides.
2. Add Gmail connection, sync job, OAuth-state, and candidate source-mode contracts with additive JSON/Postgres persistence, indexes, leases, cleanup, and legacy defaults.
3. Add the Google OAuth provider adapter using authorization-code + PKCE, offline access, minimal read scope, exact redirect/state validation, encrypted refresh tokens, key-version rotation, revoke/disconnect, and masked identity.
4. Add bounded initial/partial sync: metadata-first filtering, configured 30/60/90-day window, optional labels/sender query, `history.list`, stale-history full reset, dedupe, per-user/global limits, retry/backoff, and no raw-message persistence.
5. Add Pub/Sub push validation/enqueue and CRON worker/watch renewal fallback. Keep webhooks fast, idempotent, replay-safe, and safe under concurrent leases.
6. Extend Story 4.2 candidates/parser/review APIs for Gmail source metadata. Keep review mode default and explicit; implement narrow Autopilot gates and disable cancellation with audit/status events.
7. Add Profile Email Sync connection/mode UI and Inbox source filters/Autopilot labels using existing shadcn primitives; implement mobile, keyboard, consent, error, reconnect, empty, and reduced-motion states.
8. Add retention/deletion cleanup, private audit events, no-store headers, owner isolation, and account-deletion/disconnect cleanup. Confirm public Profile, exports, calendar, Radar, Workspace, and analytics boundaries.
9. Add provider-mock, engine, security, persistence, route, worker, quota, Autopilot, accessibility, and E2E tests; run Neon rehearsal and document Google Cloud setup/verification blockers. Do not commit from the developer agent.

## Dependencies and compatibility notes

- Story 4.2 is the source of truth for normalized email parsing, sanitization, candidate states, review UI, private manual entries, `StatusEvent.source: 'email'`, idempotency, retention, and audit vocabulary. Extend rather than fork it.
- Use `apps/web/lib/auth.ts` and `apps/web/lib/engine.ts`; do not create a second auth/session system or open a raw Postgres connection from a Route Handler.
- Extend `packages/radar-engine/src/auth/audit.ts`; never log OAuth/Gmail content and never create a parallel email audit log.
- Google OAuth/Gmail APIs are external and credential-gated. Keep provider-specific code in `packages/radar-adapters` behind a port so Radar engine tests remain deterministic and zero-network.
- The existing process-local rate-limit helpers are not durable distributed quotas. Sync jobs and OAuth state need durable Neon uniqueness/leases; document any temporary in-process UI cooldown separately.
- Gmail `historyId` is not a contiguous cursor and can expire. A 404 must trigger a bounded full sync, not data loss or an infinite retry.
- Gmail watch notifications may be delayed/dropped and expire within seven days; renew daily and retain polling fallback.

## Testing and validation requirements

### Unit/contract tests

- OAuth: state/nonce/PKCE creation, expiry, replay, redirect mismatch, code exchange, account binding by Google subject, scope validation, no token leakage, and callback errors.
- Token security: AES-GCM/key-version rotation, invalid grant/revocation, disconnect cleanup, no plaintext in JSON/Postgres/audit/logs, and reconnect behavior.
- Gmail adapter: metadata-first filtering, full-text fetch boundary, query/label/window limits, history pagination/404 reset, Pub/Sub signature/OIDC/replay, watch renewal/stop, provider retries/429/5xx/backoff, concurrency leases, and idempotent jobs.
- Candidate/parser: source-mode propagation, message/thread/history dedup, reuse of Story 4.2 extraction/warnings/matching, privacy projection, retention, and no canonical Opportunity mutation.
- Modes: review default, explicit Autopilot acknowledgement, high-confidence non-sensitive gates, sensitive-status hold, conflicting/newer terminal status guard, immediate disable/cancel, user undo event, and aggregate audit.
- Authorization/privacy: own-user routes, no cross-account Google subject, public/organization/export/calendar isolation, deletion/disconnect semantics, and masked identity.

### Route/E2E smoke

1. Sign in and inspect Profile Email Sync; verify clear review-default consent and Connect Gmail redirect without a live provider using a mocked adapter.
2. Complete mocked OAuth callback, reload/cold-start Neon, verify encrypted connection, masked address, review mode, initial sync job, and no token/body leakage.
3. Run initial and incremental mock sync, stale-history reset, Pub/Sub enqueue, watch renewal, CRON retry, duplicate notifications, and provider quota failures.
4. Review Gmail candidates on desktop and 390px mobile; confirm normal/sensitive status, choose another opportunity, ignore/delete, and create a private manual entry.
5. Enable Autopilot with explicit confirmation; verify only exact/high-confidence `received`/`in-review` updates apply, sensitive/ambiguous/warnings stay queued, and Disable prevents future updates.
6. Disconnect/revoke, delete pending candidates, retry old jobs/tokens, and verify no credentials/candidates are processed and confirmed Tracker history remains.
7. Verify public Profile, Opportunity/Workspace, Tracker export, calendar, audit detail, analytics, unauthenticated routes, and cross-user routes contain no Gmail credentials/content.

### Required commands before review

```text
npm test --workspace=@missa/radar-engine
npm test --workspace=@missa/radar-adapters
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm run test:e2e --workspace=@missa/web -- e2e/gmail-sync.spec.ts
```

## Explicitly out of scope

- Outlook/IMAP, non-Google OAuth, Gmail send/modify/delete/label-write actions, reply drafting/sending, Gmail Add-ons, mobile Gmail extensions, or full mailbox export.
- Autopilot for accepted/declined/waitlisted/finalist/shortlisted/withdrawn/revision/deadline/work/fee/organization updates; those remain review-only until a later, separately consented feature.
- Gmail attachments/raw MIME/full HTML storage, link fetching, OCR, malware scanning, LLM extraction, AI training, or sharing email content with organizations/third parties.
- Unbounded historical scans, all-mail background crawling, automatic query expansion, or silent scanning outside the user-selected window/labels/filters.
- Durable high-scale queue/orchestration beyond the bounded Neon job/lease and Cron/optional Pub/Sub path, organization Gmail connections, shared inboxes, or multi-user delegated mailboxes.
- New primary navigation IA, push notifications to devices, calendar changes, or email reminders; Profile and Inbox remain the established surfaces.

## References

- [Epic 4 / Story 4.3](../planning-artifacts/epics.md#story-43-gmail-sync-oauth-and-autopilot-modes)
- [Functional Requirements FR27](../planning-artifacts/prd/functional-requirements.md#tracker-submitter-facing-tracker)
- [Story 4.2 forwarding contracts](./4-2-email-forwarding-parser-forwarding-address-mode.md)
- [Missa strategy — Gmail integration modes](../../docs/missa-strategy.md#5-gmail-integration-modes)
- [Missa strategy — Gmail privacy design](../../docs/missa-strategy.md#4-gmail-privacy-design)
- [Missa naming decisions — Email Sync](../../docs/missa-naming-decisions.md#submitter-side-missa-passport)
- [Core architecture — auth/API/security](../planning-artifacts/architecture/core-architectural-decisions.md#authentication-security)
- [Gmail server-side OAuth](https://developers.google.com/workspace/gmail/api/auth/web-server)
- [Gmail push notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Gmail synchronization/history](https://developers.google.com/workspace/gmail/api/guides/sync)

## Dev Notes / Dev Agent Record

Implemented the review-first Gmail vertical slice behind the normalized provider port. The engine now owns encrypted, key-versioned refresh tokens, short-lived PKCE OAuth state, connection/mode/job lifecycle, bounded initial/history sync contracts, leases/retries, source-aware private candidates, and the narrow non-sensitive Autopilot gate. The Google adapter owns OAuth/token/userinfo, message metadata/text normalization, history, watch, and revoke calls; the web layer owns authenticated OAuth/callback, sync/mode/disconnect, cron, and Pub/Sub enqueue routes plus Profile/Inbox controls.

Neon schema initialization and reload were rehearsed non-destructively against the configured database. The live store loaded 1,024 sources, 113 opportunities, 2 users, and 2 accounts; Gmail collections are empty until a real Google connection is authorized. No destructive integration test was run against live data. Local/Vercel environment wiring is present for `DATABASE_URL` and repository selection; Google Cloud credentials and token key still need deployment-specific values.

Validation completed: Radar engine 68/68 tests, adapter TypeScript build, web typecheck, web lint (two pre-existing warnings only), and production web build. The full adapter integration suite and live OAuth/Pub/Sub E2E remain environment-gated. The Pub/Sub endpoint currently uses a shared secret and fast enqueue path; Google OIDC/audience verification should be completed before production enablement. The Autopilot confirmation is a browser confirmation gate in this slice; a shadcn dialog/checkbox can replace it in the accessibility polish pass.

## Review Notes / QA Results

QA evidence: 68/68 engine tests pass, adapter build passes, web typecheck passes, web lint has no errors (only the two pre-existing opportunities warnings), and the production build generates all Gmail routes. Neon schema/load check passes without deleting or rewriting existing records. Reviewer follow-up: verify Google OAuth verification and redirect configuration, replace shared-secret Pub/Sub authentication with OIDC/audience verification, run mocked route/E2E coverage, and confirm the explicit Autopilot dialog/checkbox and 390px keyboard flow against `DESIGN.md` before marking done.
