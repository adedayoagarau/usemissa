---
epic: 2
story: 2.4
status: done
title: Export tracker and library data
---

# Story 2.4: Export tracker and library data

## Story

As a Missa user,
I want to download my tracker data in a portable format,
so that I can keep a copy of my work and never feel locked into Missa.

## Context and scope

This story delivers FR36's data-portability promise. The current Tracker is backed by `RadarStore.tracked`, `Opportunity`, and append-only `StatusEvent` records. The current Library route is only an alias; Epic 5 has not yet shipped Works, Files, or Saved Answers. Therefore this implementation must provide a lossless tracker export now and an extensible envelope that can report Library as unavailable without pretending empty Library data exists. When Epic 5 is complete, its records can be added to the same versioned envelope without replacing the tracker export contract.

The export is an authenticated, user-owned read. It must be session-derived, privacy-safe, and independent of public Profile visibility settings: a user's own export includes their own tracker rows even if their public count or profile fields are private. It must never export passwords, sessions, other users' data, organization-private review data, raw matching attributes, or the append-only audit log.

### Product language guardrails

- Use **Profile**, **Tracker**, **Library**, and **Export** in user-facing copy. Do not render “Passport”, “submitter”, “SubmissionPackage”, or other internal schema vocabulary.
- Use direct copy such as `Download your tracker` and `Your export includes tracked opportunities.` Avoid “data dump”, “backup”, or language implying the user is trapped.

## Acceptance criteria

### AC1 — Export controls are reachable from Profile

**Given** an authenticated user on `/profile`
**When** they reach the `Your data` section
**Then** they see a clear explanation that exports contain their Tracker data and two explicit format actions: `Download JSON` and `Download CSV`
**And** the section explains that Library data will be added when Library records are available, without showing a fake empty Library export
**And** unauthenticated users cannot reach the controls through an authenticated page and are redirected to login with the existing return-path convention.

### AC2 — Session-derived authorization and isolation

**Given** `GET /api/me/export`
**When** the request has no valid `missa_session` cookie, an invalid session, or an account without a linked user profile
**Then** the route returns `401` or a privacy-safe `404` and no export bytes
**And** the route accepts no `userId`, account ID, path, or arbitrary query that can select another user's data
**And** a valid user receives only rows where `TrackedOpportunity.userId` equals the session's linked user ID
**And** output contains no password hash, email, session token, other users' rows, organization membership/reviewer data, private Profile attributes/genres, or audit-log entries.

### AC3 — JSON export is lossless for the current Tracker

**Given** a valid authenticated user requests `GET /api/me/export?format=json`
**Then** the response is a UTF-8 JSON attachment with a stable filename such as `missa-tracker-YYYY-MM-DD.json`, `Content-Type: application/json; charset=utf-8`, `Content-Disposition: attachment`, and `Cache-Control: private, no-store`
**And** the top-level envelope is versioned and contains `exportVersion`, `generatedAt`, `included: ["tracker"]`, `omitted: ["library"]`, and `tracker`
**And** each tracker row includes the opportunity identity and current facts available to the user: `opportunityId`, `title`, `organizationName`, `type`, `opportunityStatus`, `myStatus`, `trackedAt`, `submittedAt` (when present), `deadline`, `deadlineKind`, `sourceUrl`, and complete ordered `statusEvents`
**And** timestamps are ISO 8601 strings, dates are ISO calendar dates when known, and absent values are omitted or `null` consistently according to the documented schema
**And** rows with a tracked opportunity that no longer has a canonical record are retained with their `opportunityId`, user status/events, and `dataState: "unavailable"` rather than silently dropped.

### AC4 — CSV export is flat and spreadsheet-safe

**Given** a valid authenticated user requests `GET /api/me/export?format=csv`
**Then** the response is a UTF-8 CSV attachment with a stable filename such as `missa-tracker-YYYY-MM-DD.csv`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`, and `Cache-Control: private, no-store`
**And** the first row contains the documented columns in this order:

```text
opportunity_id,title,organization_name,type,opportunity_status,my_status,tracked_at,submitted_at,deadline,deadline_kind,source_url,data_state,status_events_json
```

**And** one row is emitted per tracked opportunity, including unavailable canonical records
**And** fields are correctly quoted/escaped for commas, quotes, Unicode, and line breaks; `status_events_json` is valid compact JSON inside one CSV cell
**And** no spreadsheet formula can be executed from an exported text field (prefix a leading `=`, `+`, `-`, or `@` value with a safe apostrophe or use the project's documented CSV-injection mitigation)
**And** CSV values contain the same user-owned tracker facts as JSON, with `status_events_json` preserving event history.

### AC5 — Format and scope validation

**Given** `/api/me/export`
**When** `format` is omitted
**Then** JSON is selected as the documented default
**When** `format` is not exactly `json` or `csv`
**Then** the route returns `400` with a recoverable message and no bytes
**When** `scope` is omitted or `scope=all`
**Then** the current response includes Tracker and declares `omitted: ["library"]` while Library is unavailable
**When** `scope=tracker`
**Then** only Tracker is included and `omitted` is empty
**When** `scope=library` is requested before Epic 5's Library exists
**Then** the route returns `409` with a stable message (`Library export is not available yet.`) and no misleading empty file
**And** unknown query parameters are ignored or rejected consistently without changing the user scope (choose rejection for security-sensitive scope selectors).

### AC6 — Library extension is additive, not a rewrite

**Given** Epic 5 later provides Works, Files, and Saved Answers repositories
**When** `scope=all` is requested
**Then** the same envelope version and content-disposition contract can add `library` with explicit `works`, `files`, and `savedAnswers` arrays
**And** `scope=tracker` remains byte-compatible in its tracker shape
**And** this story does not invent Library schemas, empty records, or upload/file URLs.

### AC7 — Download interaction and feedback

**Given** the user activates either format action
**When** the export succeeds
**Then** the browser downloads the attachment without navigating away from Profile
**And** the UI exposes a short `Export downloaded` status through an `aria-live` region and preserves both actions for another format
**When** the export fails with `401`, `409`, `429`, or `5xx`
**Then** no partial/HTML response is treated as a file, the user sees an inline recoverable message, and focus remains near the export controls.

### AC8 — Audit and rate-limit behavior

**Given** an export completes successfully
**Then** one append-only audit record is created with action `data.exported`, the account ID, target `user_profile` (or stable `data_export` target), timestamp, format, scope, and row count only
**And** no row contents, title text, bio, email, or status-event notes are written to the audit detail
**And** repeated downloads do not mutate Tracker data or mark rows as read/submitted
**And** the endpoint has a documented per-account cooldown (60 seconds in the current web process) and returns `429` with `Retry-After` when exceeded; this is abuse protection, not an authorization mechanism, and must not be described as a durable cross-instance quota until a shared rate-limit store exists.

### AC9 — Responsive, accessible, and design-system compliance

**Given** desktop, tablet, keyboard navigation, and a 390px mobile viewport
**Then** the `Your data` card remains readable with no horizontal overflow, visible labels, and at least 44x44px controls on touch layouts
**And** buttons have visible focus, loading, disabled, hover, and error states; loading preserves width
**And** status/error text is announced with `role=status`/`role=alert` as appropriate and explains recovery
**And** the page uses the true-white `#ffffff` canvas, existing semantic tokens, Instrument Sans/Fraunces/Fragment Mono roles, and existing shadcn primitives from `DESIGN.md`
**And** no user-facing copy contains “Passport” or “submitter”, and motion honors `prefers-reduced-motion`.

## Export contract

### JSON envelope (v1)

The route should expose a server/domain helper (for example `exportTracker(userId)`) that returns a serializable object before format encoding. The canonical JSON shape is:

```ts
interface TrackerExportV1 {
  exportVersion: 1;
  generatedAt: string; // ISO 8601
  included: ['tracker'];
  omitted: Array<'library'>;
  tracker: Array<{
    opportunityId: string;
    title?: string;
    organizationName?: string;
    type?: string;
    opportunityStatus?: string;
    myStatus: string;
    trackedAt: string;
    submittedAt?: string;
    deadline?: string;
    deadlineKind?: string;
    sourceUrl?: string;
    dataState: 'available' | 'unavailable';
    statusEvents: Array<{
      at: string;
      from?: string;
      to: string;
      source: 'user' | 'radar';
      note?: string;
    }>;
  }>;
}
```

Do not include `FitScore`, matching reasons, `UserAttributes`, genres, alerts, follow rows, account credentials, or engine-internal snapshots. `statusEvents` are the user's own tracker history and remain part of the lossless export; CSV must escape them safely.

### CSV encoder

Use a shared, tested CSV encoder in `apps/web/lib` or `packages/radar-engine` rather than string concatenation in a Route Handler. It must quote every field containing comma, quote, CR, or LF; double embedded quotes; normalize CRLF row endings; preserve Unicode; and mitigate spreadsheet formula injection. Keep columns in the AC4 order.

## API and persistence design

- Add an engine-level `exportTracker(userId, now?)` method (or a clearly named equivalent) that reads `store.tracked` and canonical opportunities without mutating them. It must include unavailable tracked rows and sort deterministically by `trackedAt`, then `opportunityId`.
- Keep formatting (JSON/CSV and headers) in `apps/web`, not in the core engine. The engine returns domain data; the route owns content negotiation and attachment names.
- Add `GET /api/me/export` in `apps/web/app/api/me/export/route.ts`. Resolve the session via `getSessionAccountFromToken` and `SESSION_COOKIE`; never accept a user ID.
- Supported query parameters are `format=json|csv` (default `json`) and `scope=tracker|all` (default `all`). `scope=library` returns the documented `409` until Epic 5 exists. Reject unknown scope/format values with `400`.
- Set `Content-Disposition: attachment; filename="missa-tracker-YYYY-MM-DD.ext"`, `Cache-Control: private, no-store`, and the correct content type. Avoid `public`, `s-maxage`, or shared caches because the bytes are private.
- Use a module-level per-account cooldown map for the current web process, with a small bounded map/cleanup so it cannot grow without limit. Return `429` and `Retry-After: 60` on cooldown. Mark this as a temporary abuse guard in code comments; do not add Redis or a new vendor in this story.
- Call `persistRadar()` only if a mutation occurs; export itself is read-only. Record the audit event after successful encoding/response preparation, without failing a download solely because the audit write is unavailable unless the existing audit contract requires atomicity.
- Do not add Drizzle tables or modify the Neon relational schema. Existing `radar_users`, `radar_tracked`, and JSONB data remain the source of truth for current export rows.

## UI and interaction requirements

- Extend the authenticated `/profile` page from Stories 2.2/2.3 with a `Your data` card. Keep it separate from privacy toggles and Profile text fields.
- Add a small client `ExportButtons` component using `fetch`, checking `response.ok` and content type before creating a Blob/object URL. Never download an error JSON/HTML as if it were an export.
- Buttons: `Download JSON` (primary export action) and `Download CSV` (secondary). Both have accessible names and loading/disabled states; do not use icon-only controls.
- Explain the current scope: `Tracker is available now. Library export will appear when you have Library data.` Do not show an empty Library panel while Epic 5 is incomplete.
- Use `Card`, `Button`, `Label`/text primitives, inline status, and the existing profile layout. Do not introduce a new settings route or third-party download library.
- If the user is rate-limited, show `You can download another export in a moment.` and keep the controls usable after the cooldown expires. If the session expired, link back to login with a return path.

## Ordered implementation checklist

1. Read `DESIGN.md`, Stories 2.2/2.3 Dev Notes and QA Results, existing Tracker types/engine, `/profile`, auth helpers, and persistence adapter.
2. Add a deterministic engine/domain export projection for a user, including unavailable tracked rows and full status events without private matching data.
3. Add unit tests for authorization projection, sorting, missing opportunities, status event preservation, and non-mutation.
4. Add tested JSON/CSV encoders and formula-injection mitigation with fixture rows containing quotes, commas, Unicode, and line breaks.
5. Add `GET /api/me/export` with session authorization, format/scope validation, attachment headers, no-store policy, cooldown/429, and privacy-safe audit.
6. Extend Profile with `Your data` export controls and client-side download/error/status interactions using existing shadcn primitives.
7. Add route/E2E tests for JSON, CSV, unknown format/scope, unauthenticated access, cross-user isolation, unavailable Library, cooldown, and no private data leakage.
8. Validate desktop/mobile/keyboard/reduced-motion behavior and vocabulary against `DESIGN.md`.
9. Run typecheck, lint, build, Radar tests, web tests, and runtime smoke checks; write results below. Do not commit from the developer agent.

## Dependencies and compatibility notes

- Story 2.2 provides `/profile`, the account/session contract, and the Profile owner form. Story 2.3 adds privacy settings; export must not accidentally route through public Profile projection or omit private tracker data from the owner's own export.
- `packages/radar-engine/src/domain/types.ts` owns `TrackedOpportunity`, `StatusEvent`, `MyStatus`, and `Opportunity`; use these existing types and status vocabulary.
- `apps/web/lib/engine.ts` uses the global process singleton and `persistRadar`; do not create a second store or call `pg` from a route.
- Existing `CalendarFeedButton`/iCal export is a separate calendar representation and must not be reused as the Tracker export contract.
- `apps/web/app/(passport)/library/page.tsx` currently redirects to Opportunities; do not treat that route as evidence of Library records.
- The repository is dirty with unrelated homepage, organization, opportunity, and profile/privacy work. Limit changes to export-relevant files and never reset or commit other agents' changes.

## Testing and validation requirements

### Unit/contract tests

- Engine: own-user filtering, deterministic sort, missing opportunity retention, full status-event history, no mutation, no private fields.
- Encoders: JSON schema/version, CSV header/order, escaping/Unicode/newline handling, formula injection mitigation, stable filenames/date.
- Route: `401`/`400`/`409`/`429`, content type/disposition/cache headers, query validation, session-only scope, audit metadata, no cross-user access.

### Runtime/E2E smoke

1. Log in and open `/profile`; verify both download actions and current-scope explanation.
2. Download JSON; parse it and verify `exportVersion`, tracker rows, status events, `included`, `omitted`, and no email/password/session/private matching fields.
3. Download CSV; verify filename, exact header order, one row per tracked opportunity, escaped content, and valid `status_events_json`.
4. Try `scope=library` before Epic 5; verify a clear `409` and no downloaded fake file.
5. Log out or use a different account; verify `401` and no bytes from the first user's tracker.
6. Repeat within the cooldown; verify `429`/`Retry-After`, then retry after the window.
7. Run desktop and 390px mobile keyboard/reduced-motion checks.

### Required commands before review

```text
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm test --workspace=@missa/radar-engine
npm run test:e2e --workspace=@missa/web
```

## Explicitly out of scope

- Building the Library domain, Works/Files/Saved Answers tables, uploads, or Library UI (Epic 5); only an additive future envelope slot is documented.
- CSV tracker import, Gmail/email sync, calendar subscriptions, public exports, organization/reviewer exports, admin exports, or audit-log downloads.
- Exporting email, password hashes, session cookies, profile matching attributes/genres, Fit Scores, alerts, following, organization membership, submissions, reviews, decisions, or delivery data.
- Durable cross-instance rate-limit infrastructure, queues, object storage, emailed exports, scheduled exports, ZIP/PDF formats, or third-party export libraries.
- New database tables/migrations, replacing the existing store, or changing Vercel/Neon deployment configuration.
- “Passport” or “submitter” in rendered copy; internal route group names may remain unchanged.

## Dev Notes / Dev Agent Record

- Implemented `RadarEngine.exportTracker(userId, now?)` as a deterministic own-user projection. It sorts by `trackedAt` then `opportunityId`, clones status events, excludes matching/account data, and keeps orphaned tracked rows with `dataState: "unavailable"`.
- Added `TrackerExportV1`/`TrackerExportRow` domain contracts and `apps/web/lib/tracker-export.ts` with stable CSV columns, CRLF rows, quote/newline escaping, Unicode preservation, compact status-event JSON, and formula-injection mitigation for leading `=`, `+`, `-`, and `@` values.
- Added session-derived `GET /api/me/export` with `format=json|csv`, `scope=all|tracker`, explicit `scope=library` 409, unknown-query rejection, private no-store attachment headers, bounded 60-second per-account cooldown (`429` + `Retry-After: 60`), and one `data.exported` audit record after successful encoding. Audit persistence uses the existing `persistRadar` contract; no tracker mutation occurs.
- Added Profile `Your data` card and accessible `Download JSON`/`Download CSV` controls. The client checks status and content type before creating a Blob, preserves the page, announces `Export downloaded`, keeps loading widths stable, and gives recoverable inline errors (including a return-path Login link for expired sessions). Library is described as future data without a fake export.
- Tests: `packages/radar-engine/test/export.test.ts` covers user isolation, deterministic ordering, missing opportunities, event preservation, and non-mutation. `apps/web/lib/tracker-export.test.ts` covers CSV formula mitigation, quoting, Unicode, embedded JSON, and CRLF termination. `apps/web/e2e/profile-export.spec.ts` covers profile controls, JSON/CSV attachment contracts, tracker scope, cooldown, unavailable Library response, unauthenticated access, and user-selected scope rejection.
- Validation passed: `npm test --workspace=@missa/radar-engine` (54 tests), `node --import tsx --test apps/web/lib/tracker-export.test.ts` (1 pass), `npm run typecheck --workspace=@missa/web`, `npm run build --workspace=@missa/web`, `npm run lint --workspace=@missa/web` (2 pre-existing warnings in `app/api/opportunities/route.ts`), and focused `npm run test:e2e --workspace=@missa/web -- e2e/profile-export.spec.ts` (3/3).
- Design checks: controls use existing shadcn `Button`/`Card` primitives, `min-h-11` touch targets, semantic color tokens, true-white Profile canvas, accessible status/error regions, and no rendered Passport/submitter vocabulary. No Library schema or database migration was added.

## Review Notes

Leader review: PASS. The export is a read-only, session-derived projection with deterministic ordering, orphan retention, complete status history, explicit versioning, safe JSON/CSV encoding, private no-store attachment headers, and bounded process-local abuse protection. The UI keeps Profile as the home for the workflow, checks response content before downloading, preserves focus/status feedback, and clearly separates current Tracker support from future Library data. The canonical focused E2E and independent route checks cover the authorization, format/scope, 409/429, isolation, and mobile interaction boundaries. The shared canvas token was normalized to true white during review to match `DESIGN.md`.

## QA Results / Validation Results

Developer validation is PASS for the focused Story 2.4 suite. Full web build and repository-wide E2E remain leader-level checks; the cooldown is intentionally process-local per the story's scope and is not a durable cross-instance quota.

### QA validation (2026-08-02)

**Result: PASS.**

Validated the canonical focused suite from a fresh web server:

- `npm run test:e2e --workspace=@missa/web -- e2e/profile-export.spec.ts` — **2 passed** (6.1s).
- `npm test --workspace=@missa/radar-engine -- --test-name-pattern='tracker export|profile'` — **54 passed** (the workspace command builds the package and runs all compiled tests; the name-pattern shell expansion did not narrow the final output, but all tests passed).
- Direct `node --test apps/web/lib/tracker-export.test.ts` is not a supported repository command and fails to resolve the TypeScript ESM import without the web test runner; this is a tooling invocation limitation, not an encoder assertion failure.

Manual authenticated route checks against a fresh `next dev` process confirmed:

- no cookie or invalid session → `401`, JSON error, `Cache-Control: private, no-store`, and no attachment bytes;
- `format=xml`, `scope=other`, unknown query keys, and a user-id selector → `400` with no bytes;
- `scope=library` → `409` with the stable `Library export is not available yet.` message and no fake file;
- valid JSON tracker export → `200`, attachment filename `missa-tracker-YYYY-MM-DD.json`, `application/json; charset=utf-8`, private no-store cache policy, versioned envelope, and no tracked rows for a new account;
- repeated export for the same account → `429` with `Retry-After: 60` and no attachment.

Mobile/interaction smoke at a 390px viewport with reduced motion enabled confirmed:

- no horizontal overflow (`scrollWidth === viewport width`);
- `Download JSON` and `Download CSV` are both 160×44px, retain visible text labels, and are reachable by keyboard after the existing navigation controls;
- rendered Profile text contains neither `Passport` nor `submitter`.

Privacy review: the engine projection filters by the session-linked user ID, retains orphaned tracker rows as `dataState: "unavailable"`, clones ordered status events, and excludes account credentials, matching attributes/genres, audit details, and organization data. CSV encoding quotes commas/quotes/newlines, preserves Unicode, uses CRLF rows, and prefixes formula-leading cells with an apostrophe.

The shared app canvas was also normalized to true white during leader review: `--bg` now resolves to `#ffffff`, and the shared app/mobile navigation uses the white surface explicitly. This removes the prior paper-tinted shell mismatch with `DESIGN.md` without changing the export interaction contract.

### Addendum: Library export completion (2026-08-02)

`scope=library` now returns a private JSON envelope or CSV rows for Works,
Files, and Saved Answers. `scope=all` includes the same Library envelope beside
the tracker. Export controls expose both formats, and every response remains
session-owned, no-store, audited, and subject to the existing cooldown.
