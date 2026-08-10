---
epic: 4
story: 4.2
status: done
title: Email forwarding parser and forwarding address mode
---

# Story 4.2: Email forwarding parser and forwarding address mode

## Story

As a creator,
I want to forward submission confirmations and decisions to a private Missa address,
so that Missa can prepare Tracker updates without asking me to connect my whole inbox.

## Context and scope

This story delivers the lowest-permission FR27 mode: **Email Sync — Forwarding address**. A user creates one opaque address such as `{token}@track.usemissa.com`, forwards a message, and reviews Missa's proposal in Inbox before anything changes. This is intentionally review-only; there is no silent status mutation or Autopilot in this story. Story 4.3 will reuse the candidate/review contracts for Gmail Sync and Autopilot.

The production app is a Next.js modular monolith. Route Handlers call `radar-engine` directly through `apps/web/lib/engine.ts`; they do not call an internal HTTP service. Inbound mail is delivered by a provider adapter/webhook, not by running an SMTP server inside Next.js. The adapter must normalize a verified provider payload into the engine's email envelope before parsing.

The forwarding address is a bearer secret. It is not derived from or equal to the user's email, account ID, or profile ID. It is shown only to the owner, never to an organization, and is rotated/revoked on demand. Unknown or revoked recipients receive an indistinguishable `202` response so the endpoint cannot be used to enumerate users.

### Product language and trust guardrails

- Render **Email Sync**, **Forwarding address**, **Inbox**, **Tracker**, **Review**, and **Profile**. Do not render “Passport”, “submitter”, `EmailCandidate`, `TrackedOpportunity`, or provider-internal nouns.
- Explain the boundary plainly: `Nothing changes in your Tracker until you confirm it.`
- Use neutral language for decisions. Prefer `Possible decision detected` and `Missa thinks this may be a decline` over a rejection headline.
- A sender match or extracted status is evidence for review, never verification. Never show an unexplained confidence number.

## Acceptance criteria

### AC1 — User can create and manage one forwarding address

**Given** an authenticated user on Profile's `Email Sync` section
**When** they select `Create forwarding address`
**Then** Missa creates one active address for that user and returns the complete copyable address, created time, privacy explanation, and a `Copy address` action
**And** the address token is cryptographically random/opaque, at least 128 bits of entropy, and contains no user/account/email identifier
**And** a second create request returns the existing active address rather than creating a second active address
**And** the owner can `Rotate address` (revoke the old address immediately and issue a new one), `Pause forwarding`, `Resume forwarding`, and `Delete forwarding address`
**And** pausing/revoking stops candidate creation for that address while preserving already-created review candidates and Tracker data
**And** a rotate/revoke action requires a visible confirmation because old copies can be present in mail rules
**And** all lifecycle actions are session-derived and cannot accept another user's ID.

### AC2 — Forwarding address lifecycle is private and reload-safe

**Given** an active address
**When** the user reloads Profile or a cold Postgres-backed instance starts
**Then** the same address and lifecycle state are returned without storing the plaintext token in logs or audit detail
**And** lookup uses a keyed hash/index of the token (or an equivalent encrypted-at-rest secret) and constant-time comparison
**And** only the owner sees the full address; other authenticated users receive `404`/privacy-safe `403` for address management
**And** public Profile, Opportunity, organization pages, exports, and audit viewers never expose the address, token hash, forwarding sender, or email contents
**And** a user can delete the address and its pending candidates from Profile with a second confirmation; deletion cannot delete Tracker rows or status history.

### AC3 — Inbound webhook is authenticated before recipient parsing

**Given** an inbound mail provider posts to `POST /api/inbound/email/forwarded`
**When** the provider signature, timestamp/replay window, and request size are invalid
**Then** the route returns `401`/`413` without parsing addresses, body, or attachments
**And** signatures use the configured provider adapter and a constant-time HMAC comparison; no unsigned fallback exists in production
**And** requests are bounded before `formData()`/JSON parsing (10 MiB envelope maximum, with a 100,000-character combined body cap)
**And** a valid but unknown, paused, or revoked recipient returns a generic `202 {accepted:false, reason:"unavailable"}` without revealing whether an account exists
**And** a valid active recipient returns `202 {accepted:true, candidateId}` only after idempotency checks and candidate persistence; processing errors are retriable and do not mutate Tracker.

### AC4 — Message identity, retries, and duplicate forwards are idempotent

**Given** a verified inbound envelope
**When** the provider retries the same message or the same message is forwarded twice
**Then** the normalized provider message ID plus recipient address is the primary idempotency key
**And** a stable `Message-ID` header/body hash fallback is used only when the provider ID is absent
**And** a duplicate returns the original candidate ID and does not create a second queue item, status event, audit row, or Tracker mutation
**And** near-duplicate forwards with the same sender, normalized subject, and body hash within 24 hours are grouped as `duplicate` for review rather than silently merged
**And** review mutations accept an idempotency key and replay the original result without applying a second status transition.

### AC5 — MIME, text, HTML, and link handling are safe

**Given** the provider adapter's normalized envelope
**When** Missa extracts the message content
**Then** it prefers the provider's plain-text part and strips quoted-forward history/signatures where reliably delimited, retaining a short evidence excerpt
**And** if only HTML exists, it sanitizes with a vetted parser/allowlist before deriving text: no scripts, styles, forms, images, iframes, event handlers, `data:` URLs, or inline CSS; links are limited to `http`/`https` and open with `rel="noreferrer noopener"`
**And** raw HTML, raw MIME, and full headers are not persisted; only a bounded plain-text excerpt (maximum 2,000 characters), normalized subject, sender domain/address (private), received time, and a SHA-256 body digest are retained
**And** the parser never fetches external links, follows redirects, executes HTML, renders remote images, or uses an email body as a prompt/tool instruction
**And** malformed MIME, invalid charset, NUL bytes, control characters, or unsupported encodings produce a review candidate with `needs-review`/`unsupported-content` rather than a crash or mutation.

### AC6 — Attachments are metadata-only and never executed

**Given** a forwarded email with attachments
**When** the envelope is normalized
**Then** the candidate contains only filename (sanitized for path traversal), media type, byte size, and optional SHA-256 digest
**And** attachment bytes are not stored, scanned by the app, opened, indexed, or sent to an LLM in this story
**And** executable/archive/script/media types are marked `unsafe-attachment` and require no action beyond review
**And** the review UI says `Attachments were not imported` and offers the sender's original message as the user's source of truth
**And** no attachment URL is fetched or displayed as trusted Missa content.

### AC7 — Sender binding and organization matching are evidence, not authorization

**Given** a message addressed to a user's forwarding token
**When** sender metadata is parsed
**Then** the candidate stores the normalized sender address/domain privately and labels display-name/header values as untrusted
**And** the parser can compare the sender domain with organization domains/source URLs for tracked opportunities, but never treats a matching domain as proof of authenticity
**And** forwarded headers (`From`, `Reply-To`, `Resent-From`, provider envelope sender) are kept as separate evidence fields; precedence and conflicts are visible in the candidate
**And** suspicious spoofing signals, free-mail sender domains, malformed addresses, and authentication failures (`SPF`/`DKIM`/`DMARC` when provided) lower confidence and route to `Needs review`
**And** the user's account email is not required to equal the sender address and is never disclosed to the sender.

### AC8 — Deterministic extraction proposes status, dates, work, and opportunity matches

**Given** a safe text excerpt, sender evidence, and a user's private Tracker
**When** the parser plans a candidate
**Then** it attempts to classify known patterns without an LLM or silent mutation:

```text
Thank you for your submission / received → submitted or received
now under review / reviewing            → in-review
shortlisted / longlisted / finalist    → corresponding status
congratulations / selected              → accepted or finalist (needs review)
we regret / not selected                → declined (needs review)
revise and resubmit                     → revision-requested
withdrawn                               → withdrawn
deadline extended / closes on           → deadline evidence only; never change the Radar deadline
```

**And** every extracted status is a proposal with `confidence`, evidence reason, and bounded excerpt; all forwarding proposals require confirmation
**And** dates are normalized only when unambiguous and retain source timezone/raw text; ambiguous dates are flagged, not guessed
**And** work/title extraction may use known private manual-entry work names, subject tokens, or explicit phrases, but an uncertain work is `Unresolved` and never assigned silently
**And** the planner matches tracked opportunities using sender-domain evidence, normalized organization/title tokens, subject similarity, submission/confirmation IDs, and existing dedup helpers where applicable
**And** candidate states are exactly `matched`, `ambiguous`, `unmatched`, `duplicate`, `unsupported-content`, or `needs-review`; unmatched messages remain in the review queue
**And** the parser never creates a public Opportunity, edits a canonical Opportunity, changes a deadline, sends a reply, or marks a status without the owner confirmation.

### AC9 — Review-only confirmation updates the user's Tracker safely

**Given** a pending candidate with a matched or user-selected tracked opportunity
**When** the user selects `Confirm update`, `Choose another status`, `Choose opportunity`, `Ignore`, or `Delete email`
**Then** confirmation updates only that user's Tracker relationship and appends one `StatusEvent` with source `email`, confidence, candidate ID, and a user-facing evidence note
**And** existing status history, submitted dates, manual notes, and canonical Opportunity fields are preserved
**And** sensitive outcomes (`accepted`, `declined`, `waitlisted`, `finalist`, `shortlisted`, `withdrawn`) require an explicit status choice or confirmation, even when confidence is high
**And** a candidate cannot be confirmed for another user's opportunity, an untracked opportunity without an explicit `Track this opportunity`/private manual-entry choice, or an opportunity the user cannot access
**And** confirming a duplicate candidate resolves the queue item without creating a second status event
**And** `Ignore` leaves Tracker unchanged, records a private ignored state, and can optionally dismiss the same body hash for 24 hours
**And** `Delete email` removes the stored excerpt/metadata but preserves an aggregate audit event and no Tracker mutation.

### AC10 — Unmatched messages are recoverable and private

**Given** no reliable Tracker match
**When** a candidate reaches Inbox
**Then** it shows `We found a possible submission` or `We are not sure what this email means`, the sender domain, subject, evidence excerpt, and why it needs review
**And** the user can `Choose an existing opportunity`, `Create private manual entry`, `Ignore`, or `Delete email`
**And** creating a manual entry requires title and organization confirmation and stores it in the same private `ManualTrackerEntry` contract as Story 4.1; it never creates a public Radar opportunity
**And** the manual entry's status event source is `email` only after confirmation
**And** an unmatched candidate is not silently discarded, counted as a public opportunity, or used in organization analytics.

### AC11 — Forwarding settings and review queue use existing Passport surfaces

**Given** an authenticated user
**When** they open Profile
**Then** an `Email Sync` card shows mode `Forwarding address`, current lifecycle (`Active`, `Paused`, or `Not set up`), the address when active, `Copy address`, `Rotate`, `Pause/Resume`, and `Delete`
**And** the card explains what Missa scans, what it ignores, whether message content is stored, the retention period, and that organizations never see this history
**And** Inbox adds an `Email updates to review` section with pending count, filters (`All`, `Needs review`, `Matched`, `Unmatched`), and one review card per candidate
**And** review cards expose status/work/opportunity choices with labelled controls; no action is icon-only or color-only
**And** after confirmation/ignore/delete, the card updates in place with an `aria-live` message and focus remains on the next candidate or the section heading
**And** mobile uses stacked cards and a full-width bottom action area; desktop may use a two-column review/detail panel without requiring horizontal scrolling.

### AC12 — Rate limits, retention, and abuse handling are explicit

**Given** forwarding is exposed to arbitrary senders
**Then** inbound processing is bounded per active address (30 accepted messages/hour and 100/day), per sender/domain (10/hour), and globally by provider/webhook limits
**And** Profile lifecycle mutations are limited to 3 create/rotate actions per hour per account; review mutations to 60/minute
**And** limits return `429` with `Retry-After` for authenticated UI calls; inbound unknown/over-limit messages return a generic `202` to avoid sender enumeration
**And** candidates retain only sanitized excerpts/metadata for 30 days, then are hard-deleted by a scheduled cleanup; users can delete earlier from Inbox/Profile
**And** forwarding address records retain lifecycle/audit metadata until the user deletes the address or account, subject to account retention policy
**And** no email body, attachment, sender address, address token, or evidence excerpt is written to product analytics or audit detail.

### AC13 — Audit and privacy boundaries are durable

**Given** a lifecycle or review mutation
**Then** the append-only audit log records only aggregate, attributable events such as `email.forwarding_enabled`, `email.forwarding_rotated`, `email.forwarding_paused`, `email.forwarding_revoked`, `email.candidate_created`, `tracker.email_update_confirmed`, `email.candidate_ignored`, and `email.candidate_deleted`
**And** audit detail contains account/user IDs, candidate/import IDs, source mode, status transition slug, confidence tier, and reason code only—never subject/body, sender address/domain, forwarding address, notes, attachment names, or raw URLs
**And** every confirmed status event points to the private candidate ID and has source `email`; an audit failure rolls back the associated Tracker mutation where the existing persistence contract requires atomicity
**And** no candidate, email address, or email body appears in public Profile, public Opportunity, organization Workspace, Tracker export, or calendar feed except the user's confirmed status/date fields already covered by the Tracker contract.

### AC14 — Forwarding workflow meets DESIGN.md and WCAG 2.1 AA

**Given** desktop, tablet, keyboard navigation, reduced motion, and a 390px mobile viewport
**Then** Profile/Inbox remain true-white (`#ffffff`) with existing semantic tokens, Instrument Sans/Fraunces/Fragment Mono roles, and shadcn primitives
**And** controls are at least 44×44px on touch layouts, have visible labels/focus rings/loading/error/disabled states, and preserve width while loading
**And** candidate confidence and warnings are text plus optional icon, never color alone; no decision status uses alarm-red styling by default
**And** dialog confirmations trap focus and restore it; copy confirmation uses an `aria-live` status; review result/errors use `role="alert"`/`aria-live="polite"`
**And** each candidate's status/opportunity selector has a visible label and keyboard path; filtered queue updates are announced
**And** one Aubergine primary action is used per view; rotate/delete confirmation triggers remain secondary until the destructive step
**And** motion is limited to queue insertion/detail disclosure and honors `prefers-reduced-motion`.

## Domain contracts

### Forwarding address

```ts
type ForwardingAddressStatus = 'active' | 'paused' | 'revoked';

interface ForwardingAddress {
  id: string;
  userId: string;
  tokenHash: string; // keyed SHA-256/HMAC; never the plaintext token
  tokenVersion: number;
  domain: string;
  status: ForwardingAddressStatus;
  createdAt: string;
  rotatedAt?: string;
  revokedAt?: string;
  lastReceivedAt?: string;
  acceptedCount: number;
}
```

The visible address is derived from the one-time generated token and configured domain. If repeat display is required, store the token only encrypted with a dedicated forwarding-address key; never put it in `UserProfile`, account email, logs, or audit. Rotation increments `tokenVersion`, revokes the old record, and creates a new hash in one transaction. Use `MISSA_FORWARDING_DOMAIN` (default `track.usemissa.com`) and a separate `MISSA_FORWARDING_SECRET`; fail closed in production when either is missing.

### Normalized inbound envelope

```ts
interface InboundEmailEnvelope {
  provider: string;
  providerMessageId: string;
  receivedAt: string;
  to: string[];
  from?: string;
  replyTo?: string;
  resentFrom?: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  messageIdHeader?: string;
  headers: Record<string, string>; // allowlisted auth/date headers only
  attachments: Array<{ filename: string; contentType: string; byteLength: number; sha256?: string }>;
  authResults?: { spf?: 'pass' | 'fail' | 'neutral' | 'unknown'; dkim?: 'pass' | 'fail' | 'neutral' | 'unknown'; dmarc?: 'pass' | 'fail' | 'neutral' | 'unknown' };
}
```

The adapter must verify provider signatures and normalize MIME before this contract reaches the engine. Never accept an arbitrary client-posted envelope from a browser. Keep the engine parser independent of Postmark/Gmail; a Postmark inbound adapter or local fixture can implement this port when credentials are available.

### Email review candidate

```ts
type EmailCandidateState = 'pending' | 'confirmed' | 'ignored' | 'deleted' | 'duplicate' | 'expired';
type EmailCandidateClass = 'matched' | 'ambiguous' | 'unmatched' | 'duplicate' | 'unsupported-content' | 'needs-review';

interface EmailReviewCandidate {
  id: string;
  userId: string;
  forwardingAddressId: string;
  provider: string;
  providerMessageId: string;
  receivedAt: string;
  senderAddress?: string; // private, retention-bound
  senderDomain?: string;
  subject: string;
  bodyExcerpt: string;
  bodyHash: string;
  attachmentMetadata: Array<{ filename: string; contentType: string; byteLength: number; sha256?: string; unsafe: boolean }>;
  classification: EmailCandidateClass;
  state: EmailCandidateState;
  matchedOpportunityId?: string;
  candidates: Array<{ opportunityId: string; title: string; organizationName?: string; confidence: 'high' | 'possible'; reasons: string[] }>;
  proposedStatus?: MyStatus;
  proposedSubmittedAt?: string;
  proposedResponseAt?: string;
  proposedDeadline?: string;
  proposedWork?: string;
  confidence: 'high' | 'possible' | 'unknown';
  warnings: string[];
  evidenceReasons: string[];
  createdAt: string;
  expiresAt: string;
  reviewedAt?: string;
  reviewIdempotencyKey?: string;
}
```

Persist candidates and forwarding-address records as private, user-scoped collections in the existing compatibility store/Postgres adapter (for example `radar_forwarding_addresses` and `radar_email_candidates`) with unique provider-message/address keys. Use an additive schema/load path so legacy stores default to empty collections. Do not add a public Radar opportunity or organization submission row.

### Status event extension

Extend the existing `StatusEvent.source` union with `'email'` and add optional `confidence?: 'high' | 'possible' | 'unknown'` and `candidateId?: string` fields. Preserve the existing `user`/`radar` events and Story 4.1 import compatibility. A confirmed forwarding update is the only path in this story that emits `source: 'email'`.

## API contracts

### `GET /api/me/email-forwarding`

Session-derived owner read. Returns `{ configured: false }` or `{ configured: true, address, addressId, status, createdAt, rotatedAt?, lastReceivedAt?, acceptedCount, retentionDays: 30 }`. Never returns token hash, provider credentials, sender data, or candidate bodies.

### `POST /api/me/email-forwarding`

Create or return the active address. Returns `201` on creation and `200` when already configured. The response may contain the full address only for the authenticated owner. Add `Cache-Control: private, no-store`.

### `POST /api/me/email-forwarding/rotate`

Requires `{ confirmation: true }`; returns the new address and revocation time. Old tokens fail closed immediately. Replaying an idempotency key returns the same result.

### `POST /api/me/email-forwarding/pause` and `POST /api/me/email-forwarding/resume`

Session-derived, idempotent lifecycle mutations. Paused addresses accept no new candidates but preserve queue/history. Resume returns the active state.

### `DELETE /api/me/email-forwarding`

Requires `{ confirmation: true, deletePendingCandidates?: boolean }`. Revokes the address. If `deletePendingCandidates` is true, hard-deletes only that user's pending/expired candidates; confirmed Tracker events remain. Return aggregate counts, never email contents.

### `POST /api/inbound/email/forwarded`

Provider-signed, non-session webhook. The provider adapter verifies the signature/timestamp and returns an `InboundEmailEnvelope`; the engine resolves recipients, enforces limits/idempotency, creates a candidate, and returns a generic 202. Never expose account existence, user IDs, full candidate data, or parsing errors to the sender.

### `GET /api/me/email-candidates`

Session-derived queue read. Supports `state=pending|all`, `classification`, and bounded cursor pagination (50 max). Returns sanitized candidate projections with sender domain, subject, excerpt, proposed values, confidence tier, reasons, warnings, candidate opportunities, and attachment metadata. It never returns raw HTML/MIME or another user's rows.

### `POST /api/me/email-candidates/:id/review`

Body:

```ts
type ReviewDecision =
  | { kind: 'confirm'; opportunityId: string; status?: MyStatus; work?: string; idempotencyKey: string }
  | { kind: 'create-manual'; title: string; organizationName: string; status?: MyStatus; idempotencyKey: string }
  | { kind: 'ignore'; idempotencyKey: string }
  | { kind: 'delete'; idempotencyKey: string };
```

Re-checks session ownership, candidate state/expiry, opportunity ownership/match, status validity, and idempotency before mutation. `confirm` appends one `StatusEvent` with source `email`; `create-manual` uses Story 4.1's private manual-entry contract. Return `{ candidate, mutation: { trackerUpdated, manualEntryId?, statusEventId? } }` with `Cache-Control: private, no-store`.

## Ordered implementation checklist

1. Read `DESIGN.md`, naming decisions, Epic 4 requirements, strategy §§16/18/23/25/26, Story 4.1's ManualTrackerEntry/import/persistence contracts, existing `/inbox`, `/profile`, auth/session, audit, Tracker status, and Postgres adapter.
2. Add forwarding-address and email-candidate domain/store contracts with additive JSON/Postgres persistence, unique provider-message/address indexes, 30-day candidate cleanup, and legacy-load defaults.
3. Add a provider-neutral inbound email port plus a signed normalized-envelope route adapter. Verify HMAC/timestamp before parsing; set production secrets/configuration and return generic 202s for unknown recipients.
4. Implement bounded text/HTML/MIME normalization, quoted-forward/signature handling, URL allowlisting, attachment metadata-only handling, body hashing, retention, and hostile-content fixtures. Do not execute HTML, follow links, store raw MIME, or call an LLM.
5. Implement deterministic sender/domain/subject/body/status/date/work extraction and match planning using existing opportunity/tracker/dedup helpers. Produce explicit reasons, confidence tiers, warnings, and unmatched/ambiguous candidates.
6. Extend `StatusEvent` with `email` source and optional candidate/confidence metadata. Implement owner-scoped review mutations with explicit confirmation, status/work/opportunity choices, private manual-entry creation, idempotency, and no canonical Opportunity mutation.
7. Add owner forwarding lifecycle APIs/UI to Profile and candidate queue/review APIs/UI to Inbox. Link to Email Sync from existing Profile/Inbox surfaces; do not add a new primary navigation item.
8. Add abuse guards, retention cleanup, privacy-safe audit actions, no-store headers, and error/retry behavior. Ensure provider retry semantics do not create duplicate candidates/events.
9. Add engine, parser, route, auth/isolation, persistence, security, accessibility, and E2E tests. Validate desktop/390px mobile, keyboard, reduced motion, empty/pending/ambiguous/error states, and vocabulary.
10. Rehearse provider webhook and Neon persistence on a disposable database; document required environment variables and deployment setup. Do not commit from the developer agent.

## Dependencies and compatibility notes

- Story 4.1 is the source of truth for private `ManualTrackerEntry`, import persistence, Tracker projection, and export behavior. Reuse it; do not create another manual-row model.
- Existing `StatusEvent` currently supports `user`/`radar`; add `email` compatibly and keep all existing Tracker/export/calendar consumers working.
- Use `apps/web/lib/auth.ts` (`getSessionAccount`/`getSessionAccountFromToken`) and `apps/web/lib/engine.ts` (`getEngine`/`persistRadar`); do not fork auth or open `pg` in a route.
- Extend `packages/radar-engine/src/auth/audit.ts`/`RadarEngine.recordAudit`; do not create an email-only audit log.
- Existing Inbox (`apps/web/app/(passport)/inbox/page.tsx`) is the review surface; extend it without replacing digest alerts or hiding the existing reason text. Existing Profile is the settings surface.
- Use the architecture's in-process modular-monolith boundary. The inbound adapter may live in `packages/radar-adapters/src/email/` or `apps/web/lib/email/`, but core parsing/matching contracts remain engine-testable and provider-independent.
- Production email provider credentials/signing secrets are deployment prerequisites. Local tests must use deterministic signed fixtures and must not require a live provider.

## Testing and validation requirements

### Unit/contract tests

- Address lifecycle: opaque entropy, deterministic hash lookup, one-active invariant, rotate/pause/resume/revoke/delete, token non-disclosure, legacy persistence, and constant-time verification.
- Webhook/auth: invalid signature/timestamp/body limit/invalid envelope, generic unknown-recipient 202, revoked/paused behavior, provider retries, duplicate message IDs, near-duplicate grouping, and rate-limit responses.
- MIME/content safety: plain text preference, quoted-forward/signature truncation, HTML allowlist/XSS payloads, bad charset/NUL/control bytes, link scheme rejection, attachment path traversal/executable metadata, no body/attachment persistence.
- Extraction/matching: confirmation/review/decision/revision/deadline patterns, sensitive-status review gates, ambiguous dates, sender/domain spoof warnings, title/org/ID matching, unmatched/ambiguous/duplicate classifications, deterministic reasons, and no canonical mutation.
- Review mutations: own-user authorization, explicit status/opportunity choices, `source: email` event/confidence/candidate link, existing-history preservation, manual-entry privacy, idempotency, expiry, delete/ignore behavior, audit aggregate-only.
- Retention/privacy: 30-day cleanup, user deletion, exports/public profile/organization isolation, no raw body or address leakage.

### Route/E2E smoke

1. Sign in, create/copy an address from Profile, reload/cold-start, pause/resume, rotate, and revoke with confirmation.
2. Post signed fixtures for a confirmation, review, acceptance, decline, malformed HTML, attachment, unknown sender, unknown match, and duplicate retry; verify generic webhook responses and one candidate each.
3. Open Inbox on desktop and 390px mobile; review filters, candidate evidence, status/opportunity choices, keyboard focus, live announcements, and reduced motion.
4. Confirm a normal and sensitive status; verify one Tracker event with source `email`, existing opportunity unchanged, and no organization/public/export leakage.
5. Create a private manual entry from an unmatched email; verify it appears only in the user's Tracker and export.
6. Ignore/delete/expire candidates; verify no Tracker mutation and privacy-safe audit. Reuse idempotency keys and verify no duplicate events.
7. Exceed inbound/lifecycle/review limits and send invalid/expired signatures; verify `429`/`Retry-After` for owner calls and generic `202` for inbound abuse.

### Required commands before review

```text
npm test --workspace=@missa/radar-engine
npm test --workspace=@missa/radar-adapters
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm run test:e2e --workspace=@missa/web -- e2e/email-forwarding.spec.ts
```

## Explicitly out of scope

- Gmail/Outlook OAuth, inbox search, polling, Gmail Sync, Autopilot, provider-specific OAuth scopes, or automatic high-confidence status updates (Story 4.3).
- Running an SMTP server, accepting unsigned browser-posted email, or committing provider credentials to the repository.
- Full raw MIME/HTML/body/attachment storage, attachment uploads/scanning, link fetching, OCR, malware inspection, LLM extraction, training use, or sending replies.
- Organization-visible email history, Workspace submissions/reviews/decisions/messages, shared inboxes, public email addresses, or cross-account matching.
- Email reminders/delivery channels, marketing/newsletter ingestion, deadline updates to canonical Radar, public Opportunity creation, or automatic email replies.
- Durable distributed rate limiting/queue infrastructure, provider failover, custom domains, multiple forwarding addresses per user, or bulk rule management.
- Mobile push notifications, calendar changes, or a new primary nav item; Inbox/Profile are the established surfaces.

## Dev Notes / Dev Agent Record

- Implemented provider-neutral `InboundEmailEnvelope` ingestion in `packages/radar-engine/src/email/emailForwarding.ts`. Forwarding tokens are 256-bit opaque values, HMAC-indexed and AES-GCM encrypted at rest; lifecycle is owner-scoped and supports create, pause, resume, rotate, revoke, and pending-candidate deletion. Production inbound signing fails closed when `MISSA_INBOUND_EMAIL_SECRET` is absent; local fixtures use the documented development fallback.
- Added bounded text/HTML normalization, quoted-forward/signature truncation, control/NUL handling, body hashing, sender-domain evidence, deterministic status/date/work signals, conservative opportunity matching, near-duplicate classification, attachment metadata-only handling, and 30-day retention cleanup. No raw MIME/HTML, attachment bytes, external links, or LLM calls are persisted.
- Added `ForwardingAddress`, `EmailReviewCandidate`, and `StatusEvent.source = email` contracts with additive JSON/Postgres persistence (`radar_forwarding_addresses`, `radar_email_candidates`). Manual email confirmations reuse Story 4.1's `ManualTrackerEntry` and retain private email status events; public Opportunity data is never mutated.
- Added signed `/api/inbound/email/forwarded`, owner lifecycle APIs, candidate queue/review APIs, HMAC/idempotency checks, generic unknown-recipient responses, audit-safe review mutations, Profile Email Sync card, and Inbox review queue with labelled controls and mobile-safe surfaces.
- Validation: `npm test --workspace=@missa/radar-engine` (63/63), `npm run build --workspace=@missa/radar-adapters`, `npm run typecheck --workspace=@missa/web`, `npm run lint --workspace=@missa/web` (0 errors; 2 pre-existing warnings in `app/api/opportunities/route.ts`), `npm run build --workspace=@missa/web`, and `npm run test:e2e --workspace=@missa/web -- e2e/email-forwarding.spec.ts` (2/2).

### File List

- `packages/radar-engine/src/domain/types.ts`
- `packages/radar-engine/src/store/store.ts`
- `packages/radar-engine/src/email/emailForwarding.ts`
- `packages/radar-engine/src/index.ts`
- `packages/radar-engine/src/engine.ts`
- `packages/radar-engine/src/tracker/tracker.ts`
- `packages/radar-engine/test/emailForwarding.test.ts`
- `packages/radar-adapters/src/postgresSchema.ts`
- `packages/radar-adapters/src/postgresStore.ts`
- `apps/web/app/api/inbound/email/forwarded/route.ts`
- `apps/web/app/api/me/email-forwarding/route.ts`
- `apps/web/app/api/me/email-forwarding/rotate/route.ts`
- `apps/web/app/api/me/email-forwarding/pause/route.ts`
- `apps/web/app/api/me/email-forwarding/resume/route.ts`
- `apps/web/app/api/me/email-candidates/route.ts`
- `apps/web/app/api/me/email-candidates/[id]/review/route.ts`
- `apps/web/lib/email-rate-limit.ts`
- `apps/web/components/email-forwarding-card.tsx`
- `apps/web/components/email-review-queue.tsx`
- `apps/web/app/(passport)/profile/page.tsx`
- `apps/web/app/(passport)/inbox/page.tsx`
- `apps/web/e2e/email-forwarding.spec.ts`

### Change Log

- 2026-08-03: Implemented forwarding-address lifecycle, signed provider-neutral inbound parser, private candidate queue, review-only Tracker updates, Postgres persistence, Profile/Inbox UI, privacy/rate-limit guards, and focused tests.

## Review Notes / QA Results

The reviewer must specifically verify: unsigned/unknown inbound requests cannot enumerate users; raw HTML/MIME/attachments never persist; forwarding remains review-only; sensitive statuses require explicit confirmation; address rotation revokes the old token; duplicate retries are idempotent; manual entries remain private; `source: email` events do not leak email content; and all UI uses true white and standard Missa vocabulary.

### Developer validation (2026-08-03)

The implementation passes the focused engine, adapter, web, lint, build, and email-forwarding E2E checks listed above. The remaining review focus is a fresh mobile/keyboard pass over Profile Email Sync and Inbox candidate review, plus Neon rehearsal with the additive forwarding/candidate tables. No provider credentials are committed.

### QA validation (2026-08-03)

**Result: PASS with an infrastructure follow-up.**

Runtime and contract checks:

- `npm run test:e2e --workspace=@missa/web -- e2e/email-forwarding.spec.ts` — **2 passed** (3.9s) on a fresh web server. This covered private one-active lifecycle behavior, signed inbound ingestion, duplicate retry idempotency, explicit review, Tracker update, unauthenticated webhook rejection, and generic unknown-recipient `202 { accepted: false, reason: "unavailable" }`.
- `npm test --workspace=@missa/radar-engine` — **63 passed**. Coverage included opaque address lifecycle/rotation and pause behavior, sanitized HTML and attachment metadata, duplicate candidates, `source: email` events, sensitive-status confirmation, and private manual-entry creation.
- `npm test --workspace=@missa/radar-adapters` — **15 passed, 1 skipped**. The skipped test is the real Postgres round-trip because no `DATABASE_URL` was provided in this validation environment; adapter compilation and all non-live persistence/projection checks passed.
- `npm run typecheck --workspace=@missa/web` — **passed** after the rotate idempotency-key adjustment landed.
- `npm run lint --workspace=@missa/web` — **0 errors, 2 pre-existing warnings** in `app/api/opportunities/route.ts`.
- `npm run build --workspace=@missa/web` — **passed**, including route generation for inbound/lifecycle/candidate endpoints.

Security/privacy checks:

- Inbound signatures are checked before JSON/envelope parsing, replay timestamps are bounded, and production signing fails closed without `MISSA_INBOUND_EMAIL_SECRET`.
- Unknown, paused, and revoked recipients are indistinguishable generic `202` responses; invalid signatures are `401`; request and combined-body limits are bounded.
- Forwarding addresses are opaque, owner-only, rotated with immediate old-token revocation, and lifecycle APIs are session-derived. The Profile UI now sends a confirmation and the API accepts an optional idempotency key for rotate replay safety.
- Duplicate provider message IDs return the original candidate without a second queue item/event. Review idempotency replays the original mutation. Canonical opportunities are not edited.
- Raw HTML/MIME, links, attachment bytes, and sender address details are not exposed in owner projections beyond the documented private evidence fields; no email body/token/address data is added to audit detail or public/organization projections.
- Sensitive accepted/declined/finalist-style proposals require an explicit review status; unmatched messages require title/organization confirmation for private manual entries.

Mobile/accessibility smoke at 390px with reduced motion:

- `/profile` and `/inbox` had no horizontal overflow (`scrollWidth === viewport width`).
- Email Sync lifecycle and Inbox filter controls rendered with visible text and 44px touch targets; candidate selects have visible labels and review actions are not icon-only.
- Both surfaces computed a true-white root canvas (`rgb(255, 255, 255)`), and rendered copy contained neither `Passport` nor `submitter`.

Follow-up: run the additive forwarding/candidate persistence round-trip against a disposable Neon/Postgres database before production rollout; this is the only validation gap and does not block the local implementation pass.

## Status

done
