---
epic: 4
story: 4.1
status: done
title: CSV tracker import
---

# Story 4.1: CSV tracker import

## Story

As a creator switching from a spreadsheet or another tracker,
I want to import my existing submission history as CSV,
so that I can start using Missa without re-entering every opportunity by hand.

## Context and scope

This is the first story in Epic 4 (Passport — Import & Email Sync) and delivers FR26. It imports a user's personal tracker history; it does not import an organization's submission portal, reviewers, files, credentials, or email. The existing `radar-engine` owns opportunities, tracker status events, and user isolation. The web layer owns the upload and review workflow.

Missa must never perform a blind import. The workflow is:

```text
Upload CSV → Detect and map columns → Preview matches and issues
→ Resolve conflicts → Confirm → Commit atomically → Integrity report
```

The import is private to the authenticated user. Imported rows are not public opportunities, are not sent to organizations, and do not change Radar's canonical records. Rows that cannot be matched to Radar become private manual tracker entries so a user's history is still useful before Missa has supply-side dominance.

### Product language guardrails

- User-facing vocabulary is **Profile**, **Tracker**, **Import**, **opportunity**, **organization**, **work**, and **status**. Do not render “Passport”, “submitter”, `SubmissionPackage`, or internal adapter names.
- Lead with control and transparency: `Review before importing`, `Missa found 24 matches`, `Nothing changes until you confirm`.
- A fuzzy match is a suggestion, not proof. Never say that an imported row was verified merely because it matched a Radar opportunity.

## Acceptance criteria

### AC1 — Import is reachable only for an authenticated user

**Given** an authenticated user on `/tracker` or `/profile`
**When** they select the secondary action `Import tracker`
**Then** they are taken to `/import` within the authenticated Passport route group
**And** the page offers CSV import plus a `Download CSV template` link
**And** unauthenticated visitors are redirected to login with the existing return-path convention
**And** the UI does not accept a browser-supplied `userId`, account ID, or organization ID.

### AC2 — Upload limits and safe file handling are explicit

**Given** the Import page
**When** a user selects or drops a file
**Then** only `.csv`/`text/csv` files are accepted, with a maximum size of 5 MiB and 10,000 data rows
**And** empty files, binary/NUL-containing files, oversized files, and files with no header row receive a recoverable, row-independent error
**And** UTF-8 with or without a BOM is accepted; invalid UTF-8 is rejected with `Use a UTF-8 CSV file.`
**And** the file is parsed in memory for preview/commit and is not written to object storage or logged
**And** the response uses `Cache-Control: no-store` and never echoes the original CSV in an audit record.

### AC3 — RFC 4180 parsing is deterministic and safe

**Given** a valid CSV
**When** the parser reads it
**Then** it supports comma delimiters, CRLF/LF line endings, quoted fields, escaped quotes (`""`), commas/newlines inside quoted fields, Unicode, and trailing empty cells
**And** an unclosed quote or malformed row reports the one-based row and column and does not partially mutate the Tracker
**And** every cell is treated as text; no formula, macro, link handler, HTML, or script is evaluated
**And** cells beginning with `=`, `+`, `-`, or `@` are marked `formulaLike` in the preview and remain inert text; the user must explicitly keep or skip them before commit
**And** React/HTML output escapes cell text and never injects CSV values as markup.

### AC4 — Minimal schema and column mapping are visible

**Given** a CSV header row
**When** Missa detects columns
**Then** it recognizes case/whitespace-insensitive aliases for these logical fields:

| Logical field | Required | Examples of accepted aliases |
| --- | --- | --- |
| `title` | yes | Title, Opportunity, Call, Contest |
| `organization` | yes | Organization, Market, Venue, Publication |
| `status` | yes | Status, My Status, Stage |
| `deadline` | no | Deadline, Due Date, Closing Date |
| `submittedAt` | no | Date Sent, Submitted Date, Sent |
| `responseAt` | no | Date Response, Response Date |
| `work` | no | Piece, Work, Manuscript |
| `genre` | no | Genre, Category, Discipline |
| `fee` | no | Fee, Cost, Submission Fee |
| `notes` | no | Notes, Comments |
| `sourceUrl` | no | URL, Link, Guidelines URL |

**And** the user sees the detected mapping before any commit
**And** each logical field can be remapped to one source column or `Not mapped`
**And** duplicate source-column assignments are blocked unless the user deliberately chooses the same source for a documented copy-through field
**And** `title`, `organization`, and `status` must be mapped before the user can continue; `deadline` is optional because rolling/unknown deadlines are valid
**And** the mapping and its validation errors are included in the preview response, not inferred silently at commit time.

### AC5 — Dates, fees, and status values are normalized without inventing facts

**Given** mapped optional fields
**When** values are normalized
**Then** dates accept ISO (`YYYY-MM-DD`) and unambiguous common calendar forms (`MM/DD/YYYY`, `DD/MM/YYYY` only when the entire file has a consistent locale); ambiguous dates are flagged for review
**And** date-only values remain date-only and are not shifted by a server timezone
**And** fees are preserved as raw text plus a parsed amount/currency only when unambiguous; `Free`, `0`, and blank are not treated as the same fact
**And** `myStatus` maps known values deterministically:

```text
saved/interested/considering       → saved
draft/preparing                    → preparing
sent/submitted                     → submitted
received/acknowledged              → received
pending/in review/reviewing        → in-review
longlisted/long list               → longlisted
shortlisted/short list              → shortlisted
finalist                            → finalist
accepted/acceptance                → accepted
declined/rejected/not accepted     → declined
waitlisted/wait list               → waitlisted
revision requested                 → revision-requested
withdrawn                          → withdrawn
delivered                           → delivered
archived                            → archived
```

**And** unknown statuses are `unmapped` and block that row until the user chooses a Missa status or skips it
**And** importing `submitted` sets `submittedAt` only when the mapped date is valid; it does not fabricate a timestamp.

### AC6 — Preview shows per-row matches, confidence, and reasons

**Given** a syntactically valid mapping
**When** the user selects `Preview matches`
**Then** Missa matches each row against existing Radar opportunities using the existing `findCanonical`/`normalizeName`/`titleSimilarity` dedup module and the normalized title + organization
**And** each row is classified as exactly one of `matched`, `ambiguous`, `unmatched`, `invalid`, or `duplicate-in-file`
**And** a matched row shows the selected opportunity title, organization, match reason, and confidence label (`High`, `Possible`, or `Needs review`); it does not imply verification
**And** an ambiguous row shows the top candidates and lets the user select one or choose `Create manual entry`
**And** an unmatched row explains `No Radar opportunity matched this row` and offers `Create manual entry` or `Skip`
**And** duplicate rows in the same file are grouped by normalized title + organization and have a documented default (keep the first row, skip later exact duplicates) that the user can change
**And** the summary visibly reports `Found`, `Will create`, `Needs review`, and `Will skip` counts before confirmation.

### AC7 — Imported history never changes a canonical opportunity

**Given** a row matched to an existing Radar opportunity
**When** the user confirms the import
**Then** Missa creates or updates only that user's tracker record and status events
**And** it does not edit the opportunity's title, organization, deadline, fee, genres, trust, source, status, or public visibility
**And** a row marked `Create manual entry` is stored as a private `ManualTrackerEntry`, not as a Radar opportunity and not as an organization-visible submission
**And** manual entries retain the imported title, organization, mapped metadata, original source row number, import timestamp, and source kind `csv`
**And** manual entries can be edited or deleted from the user's Tracker in a later story without requiring the original CSV.

### AC8 — Existing tracker conflicts have explicit choices

**Given** a matched opportunity is already tracked by the same user
**When** the imported row differs in status, submitted date, or notes
**Then** the preview labels it `Already tracked` and shows the current and imported values side by side
**And** the user chooses one of `Keep current`, `Use imported values`, or `Skip row`; `Keep current` is the default
**And** no status transition is silently inferred from a CSV timestamp or file row order
**And** if `Use imported values` is selected, the imported status is recorded as a user-originated event with an import note and existing event history is preserved
**And** selecting `Skip row` leaves the existing Tracker row unchanged.

### AC9 — Commit is staged, revalidated, and atomic

**Given** the user has reviewed mapping, matches, formula-like warnings, conflicts, and skips
**When** they select `Import selected rows`
**Then** the client sends the original file, mapping, row decisions, and a short-lived signed `previewToken` to `POST /api/me/imports/tracker/commit`
**And** the token binds the preview to the session user, source file SHA-256, mapping version, and a 15-minute expiry; it contains no row contents
**And** the server reparses and revalidates the file before mutation; a changed file, expired token, changed mapping, or changed candidate set returns `409 Preview is out of date. Please preview again.`
**And** the server rejects unresolved required fields, unknown statuses, malformed selected rows, or unconfirmed formula-like values with `400` and no mutation
**And** all selected matches/manual entries and status events are validated against a cloned store, then persisted in one transaction/snapshot; a persistence error restores the prior store and returns a recoverable `500`
**And** an accepted commit never produces a partial import, even when a later row fails validation
**And** intentional skips and invalid rows are reported separately from imported rows.

### AC10 — Import API is session-derived and abuse-limited

**Given** `POST /api/me/imports/tracker/preview` or `/commit`
**When** the session is missing, invalid, or not linked to a user profile
**Then** the route returns `401`/privacy-safe `404` and never parses or mutates the file
**And** no request parameter can select another user
**And** preview is limited to 5 requests per 10 minutes per account and commit to 3 requests per 10 minutes per account in the current web process; excess requests return `429` with `Retry-After`
**And** these process-local guards are documented as temporary abuse protection, not a durable cross-instance quota
**And** request bodies are bounded before parsing and all error messages omit file contents, email addresses, tokens, and other users' data.

### AC11 — Result report and audit are privacy-safe

**Given** a successful commit
**Then** the response includes a stable import ID, `imported`, `matched`, `createdManual`, `skipped`, `needsReview`, and row-level error/reason counts
**And** the UI shows `Import complete` with a link back to Tracker and a `Review imported rows` action
**And** one append-only audit event `tracker.imported` records account ID, user ID, source kind `csv`, timestamp, source hash, and aggregate counts only
**And** no title, notes, source URL, full CSV, status-event note, or file content is written to the audit detail
**And** no audit event is emitted for preview-only requests or a commit that mutates nothing.

### AC12 — Import interaction follows DESIGN.md and is accessible

**Given** desktop, tablet, keyboard navigation, reduced motion, and a 390px viewport
**Then** the flow uses a single-column mobile layout and a readable table/card preview without horizontal scrolling
**And** controls are at least 44×44px, have visible labels, focus-visible rings, loading/disabled/error states, and preserve button width while loading
**And** required fields and row errors are communicated by text and icons, not color alone; counts have accessible names
**And** the current step is announced with `aria-current`, errors use `role="alert"`, progress/result updates use `aria-live="polite"`, and keyboard focus moves to the first actionable error after validation
**And** the page uses the true-white `#ffffff` canvas, existing semantic tokens, Instrument Sans/Fraunces/Fragment Mono roles, and existing shadcn primitives from `DESIGN.md`
**And** primary Aubergine is reserved for the current commit action; mapping, download, back, and skip actions use secondary/tertiary treatments
**And** motion is limited to explaining step changes and honors `prefers-reduced-motion`.

## Import contracts

### Preview request

`POST /api/me/imports/tracker/preview` accepts `multipart/form-data` with `file`. The route is session-derived and returns `Cache-Control: no-store`.

```ts
interface TrackerImportPreview {
  previewToken: string;
  expiresAt: string;
  sourceHash: string;
  columns: string[];
  detectedMapping: Record<ImportField, string | null>;
  rows: Array<{
    rowNumber: number;
    values: Partial<Record<ImportField, string>>;
    normalized: Partial<Record<ImportField, string | number | null>>;
    classification: 'matched' | 'ambiguous' | 'unmatched' | 'invalid' | 'duplicate-in-file';
    candidates: Array<{ opportunityId: string; title: string; organizationName?: string; confidence: 'high' | 'possible' }>;
    defaultAction: 'match' | 'create-manual' | 'skip' | 'needs-review';
    warnings: Array<'formulaLike' | 'ambiguousDate' | 'unknownStatus' | 'duplicate'>;
    errors: string[];
  }>;
  summary: { total: number; matched: number; createManual: number; needsReview: number; skipped: number };
}
```

Do not put raw CSV bytes or account credentials in `previewToken`; use an HMAC-signed, base64url payload with the existing session secret and constant-time signature comparison.

### Commit request and response

`POST /api/me/imports/tracker/commit` accepts the original `file`, the `previewToken`, the selected mapping, and a JSON decision map keyed by one-based row number. Decisions are `match(opportunityId)`, `create-manual`, `keep-current`, `use-imported`, or `skip`. The server validates every decision against the refreshed preview before applying it.

```ts
interface TrackerImportResult {
  importId: string;
  imported: number;
  matched: number;
  createdManual: number;
  skipped: number;
  needsReview: number;
  reasons: Array<{ rowNumber: number; code: string; message: string }>;
}
```

### Manual tracker entry

Add a private domain contract rather than fabricating a public Radar opportunity:

```ts
interface ManualTrackerEntry {
  id: string;
  userId: string;
  title: string;
  organizationName: string;
  work?: string;
  genre?: string;
  myStatus: MyStatus;
  deadline?: string;
  submittedAt?: string;
  responseAt?: string;
  feeRaw?: string;
  notes?: string;
  sourceUrl?: string;
  sourceKind: 'csv';
  sourceRow: number;
  importedAt: string;
}
```

Manual entries belong to the user's Tracker projection and export, are excluded from public opportunity browse/detail and organization views, and must survive JSONB/Postgres reloads. The persistence adapter should add the collection atomically (for the current compatibility store, a JSONB `radar_manual_tracker_entries` table or equivalent versioned store field). Do not add a public relational opportunity row for a manual entry.

## UI and interaction requirements

- Add `/import` under the authenticated route group. The entry screen contains a labelled file input, drag/drop affordance, size/type guidance, `Download CSV template`, and a plain-language privacy note: `Your file is used to prepare this import and is not shared with organizations.`
- Use a four-step shell: `Upload`, `Map columns`, `Review`, `Import`. Preserve the file/mapping/decisions while moving backward. On refresh or expiry, explain that the preview has expired and ask the user to upload again; never silently commit stale state.
- In Review, provide filters for `All`, `Matched`, `Needs review`, `Will create`, and `Will skip`. Desktop may use a table; mobile uses stacked row cards with the same fields and actions. Candidate selection is a labelled radio group, not an icon-only menu.
- The commit action is disabled while unresolved required errors, conflicts, or formula-like warnings remain. Confirmation copy includes the exact selected count and says that existing Tracker data will not be deleted.
- Link `Import tracker` from Tracker and Profile; do not add a new primary navigation item until the workflow has usage evidence. After success, link back to Tracker and highlight imported rows with a non-color-only `Imported` label.

## Ordered implementation checklist

1. Read `DESIGN.md`, Epic 4 requirements, `docs/missa-strategy.md` import sections, completed Stories 2.2–2.4, Tracker/domain types, dedup module, auth helpers, and both store adapters.
2. Add the `ManualTrackerEntry` domain contract and persistence/load/save compatibility without exposing entries through public Radar projections.
3. Implement a bounded RFC 4180 UTF-8 parser with row/column errors, formula-like warnings, max-byte/max-row guards, and unit fixtures for quotes, commas, newlines, BOM, Unicode, malformed quotes, and hostile cells.
4. Implement header alias detection, user-editable mapping, date/fee/status normalization, source-hash generation, and HMAC-signed expiring preview tokens.
5. Implement the engine import planner: dedup matching via the existing module, candidate confidence/reasons, duplicate-in-file grouping, conflict detection, and deterministic preview sorting.
6. Implement transactional commit against a cloned store, matched tracker/status-event updates, private manual entries, rollback on persistence failure, and `tracker.imported` audit metadata.
7. Add session-derived preview/commit routes, no-store headers, bounded multipart handling, validation, 401/400/409/429/500 responses, and temporary process-local rate guards.
8. Build the `/import` stepper and Tracker/Profile links using existing shadcn primitives; implement mobile cards, keyboard/focus management, live announcements, reduced motion, and true-white design tokens.
9. Extend Tracker and the existing export projection to include private manual entries without changing canonical opportunity semantics or leaking them publicly.
10. Add engine, parser, route, persistence, accessibility, and E2E tests; run focused and full validation before review. Do not commit from the developer agent.

## Dependencies and compatibility notes

- Epic 1 provides the Radar store, Postgres adapter, IDs, clock, and `persistRadar()` path. Use those contracts; do not open a second database connection from a route.
- Stories 2.2–2.4 provide the session-derived Profile APIs, privacy boundary, Tracker projection, and export contract. Import must never route through public Profile visibility and must keep manual entries private.
- Epic 3's Tracker views and status pipeline are the consumer of imported matched/manual rows. Extend existing projections instead of creating a parallel Tracker.
- Reuse `packages/radar-engine/src/dedup/dedup.ts`; do not copy a second fuzzy-match algorithm into `apps/web`.
- The current compatibility Postgres adapter rewrites JSONB collections in a transaction. Preserve that atomic behavior and rehearse the additive manual-entry persistence on a disposable database before applying it to Neon.
- Do not add Gmail, Sheets, Airtable, Notion, Submittable, XLSX, ZIP, files, works, organization submissions, or OAuth in this story; those are later import sources/domains.

## Testing and validation requirements

### Unit/contract tests

- Parser: RFC 4180 quoting, CRLF/LF, BOM, Unicode, embedded line breaks, malformed quote/column diagnostics, empty values, size/row limits, formula-like warnings, and no code evaluation.
- Mapping/normalization: aliases, duplicate assignments, required-field validation, status map, unknown status, ISO/unambiguous dates, ambiguous dates, fee preservation, source hash stability.
- Planner: high/possible/ambiguous/unmatched matches using the existing dedup module, duplicate-in-file grouping, deterministic row order, existing tracker conflicts, and no canonical opportunity mutation.
- Commit: own-user isolation, manual-entry privacy, status-event preservation, keep/use/skip conflict decisions, stale-token rejection, no partial mutation on validation/persistence failure, idempotent retry behavior, and audit aggregate only.
- Persistence: save/load manual entries through JSON and Postgres adapters; legacy stores without the collection still load.

### Route/E2E smoke

1. Log in, open `/import` from Tracker/Profile, download the template, and upload a representative CSV.
2. Verify detected mapping and remapping, then preview matched, ambiguous, unmatched, duplicate, unknown-status, and formula-like rows.
3. Resolve rows on desktop and 390px mobile using keyboard only; verify focus and live status announcements.
4. Commit selected rows; verify one integrity report, Tracker rows/status events, private manual entries, and no canonical opportunity changes.
5. Retry with a changed/expired preview token; verify `409` and no mutation. Retry without auth or with another account; verify `401`/isolation.
6. Exceed preview/commit limits; verify `429`/`Retry-After`. Simulate persistence failure; verify rollback and a recoverable message.
7. Export Tracker data and verify manual entries are represented without public/profile leakage.

### Required commands before review

```text
npm run typecheck --workspace=@missa/radar-engine
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm test --workspace=@missa/radar-engine
npm run test:e2e --workspace=@missa/web -- e2e/tracker-import.spec.ts
```

## Explicitly out of scope

- Gmail/Outlook forwarding or OAuth sync, Sheets/Airtable/Notion connectors, Submittable/Duotrope/Chill Subs adapters, XLSX/ZIP/PDF import, URL extraction, or background import jobs.
- Organization portal migration, submission records, works/files, reviewers, decisions, messages, payments, credentials, or organization-visible data.
- Automatic deletion/overwrite of existing Tracker rows, automatic sensitive status changes, automatic publication of manual entries, or blind fuzzy-match acceptance.
- Public Profile/Opportunity changes, Radar canonical field updates, trust/verification changes, or matching-attribute export.
- Durable distributed rate limiting, object storage, resumable uploads, virus scanning, or third-party CSV/parser libraries unless a later architecture decision requires them.
- New primary navigation IA, bulk undo after a confirmed import, or import scheduling; the integrity report and existing export provide the recovery boundary for this first release.

## Dev Notes / Dev Agent Record

- Implemented a bounded RFC 4180 parser in `packages/radar-engine/src/import/trackerImport.ts`. It accepts UTF-8/BOM, CRLF/LF, quoted commas/newlines, escaped quotes, Unicode, and trailing empty cells; rejects NUL/invalid UTF-8/oversized files/unclosed quotes and marks formula-like cells inertly.
- Added alias mapping, required-field validation, conservative status/date/fee normalization, duplicate-in-file grouping, deterministic Radar matching using existing `normalizeName`/`titleSimilarity`, confidence/reason candidates, and existing-tracker conflict projections.
- Added private `ManualTrackerEntry` domain/store contracts. JSON and Postgres adapters persist/load `manualTrackerEntries` (`radar_manual_tracker_entries`) additively; legacy stores default to an empty collection. Tracker views and Story 2.4 exports include manual rows without adding public Opportunities.
- Added engine `commitTrackerImport` with user-scoped matched tracker updates, user-originated import events, private manual rows, idempotency marker, and aggregate result reporting. Canonical Opportunity objects are never mutated.
- Added HMAC-SHA256, base64url, 15-minute preview tokens bound to session user, source SHA-256, mapping hash, and candidate-set hash. Preview/commit routes reparse and revalidate before mutation, reject stale previews with 409, use no-store responses, and enforce process-local 5/10-minute preview and 3/10-minute commit guards.
- Added atomic commit rollback around the existing `persistRadar()` whole-store transaction and one privacy-safe `tracker.imported` audit record only when rows mutate. Audit detail contains account/user IDs, source hash/kind, and aggregate counts only.
- Added authenticated `/import` four-step shell (Upload → Map columns → Review → Import), template download, drag/drop and file limits, mapping controls, candidate/row decisions, filters, live status/error messaging, mobile-safe cards, and Tracker/Profile `Import tracker` links. User-facing copy stays on Profile/Tracker/Import vocabulary; no Passport/submitter language rendered.
- Validation: `npm test --workspace=@missa/radar-engine` (60 tests pass), `npm test --workspace=@missa/radar-adapters` (15 pass, 1 Postgres integration skip), `npm run build --workspace=@missa/radar-engine`, `npm run build --workspace=@missa/radar-adapters`, `npm run build --workspace=@missa/web`, `npm run typecheck --workspace=@missa/web`, `npm run lint --workspace=@missa/web` (2 pre-existing warnings in `app/api/opportunities/route.ts`), and `npm run test:e2e --workspace=@missa/web -- e2e/tracker-import.spec.ts` (3/3 pass: API commit/privacy/export, changed-file stale token + unauthenticated, and UI stepper).

### File List

- `packages/radar-engine/src/domain/types.ts`
- `packages/radar-engine/src/store/store.ts`
- `packages/radar-engine/src/import/trackerImport.ts`
- `packages/radar-engine/src/index.ts`
- `packages/radar-engine/src/engine.ts`
- `packages/radar-engine/src/tracker/tracker.ts`
- `packages/radar-engine/test/import.test.ts`
- `packages/radar-adapters/src/postgresSchema.ts`
- `packages/radar-adapters/src/postgresStore.ts`
- `apps/web/lib/tracker-import-token.ts`
- `apps/web/app/api/me/imports/tracker/preview/route.ts`
- `apps/web/app/api/me/imports/tracker/commit/route.ts`
- `apps/web/app/(passport)/import/page.tsx`
- `apps/web/components/tracker-import-stepper.tsx`
- `apps/web/app/(passport)/tracker/page.tsx`
- `apps/web/app/profile/profile-form.tsx`
- `apps/web/components/tracker-item-row.tsx`
- `apps/web/e2e/tracker-import.spec.ts`

### Change Log

- 2026-08-02: Implemented CSV tracker import parser, mapping/planner, private manual-entry persistence, staged HMAC preview/atomic commit routes, Profile/Tracker links, UI stepper, and focused tests.

## Review Notes / QA Results

Complete during developer and QA review. The reviewer must specifically verify that manual entries stay private, unmatched rows never become public opportunities, a stale preview cannot mutate data, and no rendered copy uses “Passport” or “submitter”.

### QA validation (2026-08-02)

**Result: FAIL — formula-like values are not gated before commit.**

Validation performed:

- `npm run test:e2e --workspace=@missa/web -- e2e/tracker-import.spec.ts` — **2 passed** (4.1s) on a fresh web server. The tests cover the matched + private manual-entry happy path and unauthenticated/stale-token rejection.
- `npm run typecheck --workspace=@missa/web` — **passed**.
- Direct compiled-domain reproduction confirmed the blocking issue: a matched row with a Notes value beginning `=SUM(A1)` receives `warnings: ["formulaLike"]`, but `commitTrackerImport(..., { "2": "match" })` returns `imported: 1`, `needsReview: 0`, and creates the tracker row. The same happens for `+`, `-`, and `@` leading cells because the commit guard only blocks formula-like rows when `raw === undefined`.

Why this blocks acceptance:

- AC3 requires formula-like cells to remain inert and says the user must explicitly keep or skip them before commit.
- AC9 requires unconfirmed formula-like values to return `400` with no mutation.
- The review UI pre-populates matched rows with `match` and does not require a separate confirmation for warning-bearing rows; `unresolved` therefore reaches zero even though the warning is unresolved.

Required fix before PASS:

1. Treat formula-like and ambiguous-date warnings as unresolved unless the decision explicitly records a deliberate resolution (for example, a dedicated `keep-imported`/`confirm-warning` choice, or an equivalent server-validated acknowledgement map).
2. Make the client keep the import action disabled while those warnings remain unconfirmed and expose the resolution in text, not color alone.
3. Add a unit/route test proving a warning-bearing matched row returns `400` and leaves the store unchanged until explicit confirmation.

Other checks passed during review: canonical opportunities remain unchanged in the happy-path E2E; unmatched rows appear only in the authenticated user's Tracker and not `/api/opportunities`; stale/unauthenticated commit attempts do not mutate; token verification is HMAC-bound to user/file/mapping/candidate set; preview/commit responses are private no-store; rendered import copy contains neither `Passport` nor `submitter`.

Mobile/true-white checks were not promoted to a passing result because the formula gate is blocking. The import shell uses 44px controls and white card surfaces, but the shared app shell still inherits the project-wide `#fafaf9` body/nav token noted in Story 2.4 QA rather than a true-white global canvas.

### QA revalidation after formula-warning fix (2026-08-02)

**Result: PASS with a shared-shell design follow-up.**

- `npm run test:e2e --workspace=@missa/web -- e2e/tracker-import.spec.ts` — **3 passed** (3.6s), including the authenticated shell reachability test.
- `npm test --workspace=@missa/radar-engine` — **59 passed**, including the new explicit formula-warning regression.
- `npm run typecheck --workspace=@missa/web` — **passed**.
- Direct compiled-domain check: a matched row containing `=SUM(A1)` is now blocked when submitted with the implicit `match` decision (`imported: 0`, `needsReview: 1`, no tracker mutation) and succeeds only with an explicit `{ action: "use-imported", opportunityId }` resolution.
- The review step now leaves warning, error, ambiguous, and conflict rows unresolved; the import action remains disabled until a deliberate resolution or skip is selected.
- Existing privacy/stale-token checks remain green: manual unmatched rows stay in the authenticated Tracker and out of `/api/opportunities`; unauthenticated/stale commits return `401`/`409` without mutation.
- 390px reduced-motion smoke: no horizontal overflow; Choose CSV, Review columns, and Download CSV template are visible 44px controls; rendered copy contains neither `Passport` nor `submitter`.

**Follow-up:** the `/import` stepper itself is transparent over the global body token, which currently computes to `rgb(250, 250, 249)` (`#fafaf9`) rather than DESIGN.md's true-white canvas. Card/file surfaces are `#ffffff`. This is the same shared shell token issue recorded in Story 2.4 and should be corrected centrally without changing import behavior.

### Developer follow-up after QA

The formula/ambiguous-date gate was corrected after the reproduction above: server commit now requires an explicit `use-imported`, `keep-current`, or `create-manual` decision (or `skip`) for warning-bearing rows; the client leaves warning rows unresolved until that action is selected. Added `formula-like cells require an explicit resolution before commit` coverage in `packages/radar-engine/test/import.test.ts`; the Radar suite is now 60/60 passing. The import shell now explicitly paints its page canvas true white; the shared app shell's existing global token remains a separate project-wide follow-up. The QA note above should be re-run by the leader after this fix.

## Status

done
