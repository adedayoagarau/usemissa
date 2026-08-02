---
epic: 2
story: 2.3
status: ready-for-dev
title: Profile privacy settings
---

# Story 2.3: Profile privacy settings

## Story

As a Missa user,
I want to choose which parts of my Profile are visible publicly,
so that I can share enough context to be understood without exposing information I want to keep private.

## Context and scope

Story 2.2 shipped the owner Profile at `/profile`, the public page at `/profile/[userId]`, and the public projection containing display name and optional bio. This story adds the owner's privacy controls and makes the public projection honor them. The public route must remain usable without an account and the owner must not need to expose tracker or matching data to use Missa.

The existing `UserProfile` is persisted as JSONB in `radar_users`; adding an optional privacy object is backwards compatible with demo JSON and existing Postgres rows. Do not create a second auth system, a second user table, or a new database migration for this story.

### Product language and safety guardrails

- The user-facing term is **Profile**. Never render “Passport”, “My Passport”, “submitter”, or internal schema terms in this feature's UI, metadata, validation, or empty states.
- Visibility controls use the plain labels **Public** and **Private**. Explain consequences in direct language; do not use euphemisms.
- `displayName` and `bio` were public fields introduced by Story 2.2. Existing users therefore retain those public defaults when no privacy object exists. The newly introduced tracked count is private by default.
- Missing or unknown future privacy keys fail closed (private) rather than becoming public accidentally. Never expose email, password hashes, account IDs, sessions, eligibility attributes, genres, saved searches, alerts, followed organizations, opportunity titles/statuses, works, files, or other matching/tracker details through a privacy toggle.

## Acceptance criteria

### AC1 — Owner can view privacy settings

**Given** an authenticated user with a Profile
**When** they visit `/profile`
**Then** a clearly labelled `Privacy` section appears alongside Profile editing
**And** it shows the current visibility state for `Display name`, `Short bio`, and `Tracked opportunity count`
**And** each state is communicated with text (`Public` or `Private`) as well as the switch state, never by color alone
**And** the owner-only response includes normalized settings even when the stored privacy object is absent.

### AC2 — Privacy controls are explicit and accessible

**Given** the Privacy section
**When** the owner toggles a setting
**Then** the control has an accessible name that includes the field and destination (for example, `Make short bio public`)
**And** the visible `Public`/`Private` text updates immediately in the form without changing the public page until the owner saves
**And** the owner can reach, toggle, cancel/restore, and save every setting by keyboard
**And** controls remain at least 44x44px on touch layouts.

### AC3 — Save privacy settings through the owner-only API

**Given** the owner has changed one or more visibility settings
**When** they activate `Save privacy settings`
**Then** the client sends a session-derived request to `PATCH /api/me/profile/privacy` without a browser-supplied user ID
**And** the server validates the allowed settings keys/values, merges the patch with effective defaults, persists the complete normalized settings through the same Radar store, and returns those settings plus a public-profile URL
**And** the UI shows a labelled success confirmation (`Privacy settings saved`) without a full page navigation
**And** a reload/cold start returns the same settings.

### AC4 — Public projection respects visibility for visitors

**Given** a public request to `/profile/[userId]` or `GET /api/profile/[userId]`
**When** the corresponding setting is `private`
**Then** that field is omitted from the public response and rendered page
**And** a private bio does not leave an empty heading, placeholder, character count, or serialized key in the public DOM/JSON
**And** a private tracked count is not shown anywhere on the public page
**And** when a field is `public`, its normalized value is rendered exactly as in Story 2.2.

### AC5 — Tracked opportunity count is opt-in and aggregate only

**Given** the `Tracked opportunity count` control
**When** the owner sets it to `Public` and saves
**Then** the public projection may include a current integer count of opportunities the user tracks
**And** the count contains no opportunity IDs, titles, organizations, deadlines, statuses, Fit Scores, or tracker events
**And** count defaults to `Private` when no setting exists or when an unrecognized setting is read
**And** the count is recomputed from the current store rather than copied into a second mutable profile field.

### AC6 — Display name privacy has a safe public outcome

**Given** the owner sets `Display name` to `Private`
**When** a visitor opens the public route
**Then** the page does not show the owner's display name or any fallback containing their email, account ID, or user ID
**And** if no public identity field remains, the route renders the intentional state `This profile is private.` without rendering any identity fallback
**And** the owner can still see and edit their name on `/profile`.

### AC7 — Owner preview never bypasses privacy accidentally

**Given** the owner clicks `View public profile`
**When** `/profile/[userId]` is opened
**Then** the page uses the same public projection and privacy rules as an unauthenticated visitor (it is a real preview, not an owner-only leak)
**And** owner-only settings and edit controls remain on `/profile` only.

### AC8 — Defaults, legacy rows, and future fields are deterministic

**Given** a legacy user record with no privacy object
**Then** the effective settings are exactly `{ displayName: 'public', bio: 'public', trackedOpportunityCount: 'private' }`
**And** reading the settings does not require rewriting every legacy row
**And** any missing future field uses `private` until explicitly added to the supported contract and opted in
**And** a malformed/unknown visibility value is treated as `private` and surfaced as a recoverable owner-side reset, not exposed publicly.

### AC9 — Authorization, validation, and error handling

**Given** `PATCH /api/me/profile/privacy`
**When** there is no valid session, the body is malformed, an unknown key is present, or a value is not exactly `public`/`private`
**Then** the server returns `401` or `400` with a stable, non-sensitive JSON error and does not mutate the profile
**And** the endpoint never accepts a user ID or account ID from the client
**And** the UI preserves unsaved toggle choices after a recoverable network/server error and explains how to retry.

### AC10 — Audit and privacy-safe persistence

**Given** a successful change to one or more settings
**Then** one append-only audit entry is recorded through the existing `RadarEngine.recordAudit`/`recordAudit` primitive with the actor account ID, target `user_profile`, timestamp, and action `profile.privacy_updated`
**And** audit detail may list changed field names and their public/private values but never stores bio text, email, tracker rows, or other profile contents
**And** a no-op save (no effective setting changed) returns success without emitting duplicate audit entries.

### AC11 — Responsive, design-system, and vocabulary compliance

**Given** desktop, tablet, and a 390px mobile viewport
**Then** the Profile and Privacy sections remain readable with no horizontal overflow, labels remain visible, and all touch controls are at least 44x44px
**And** the page uses true white (`#ffffff`) as its canvas, existing semantic Missa tokens, shadcn primitives, and Instrument Sans/Fraunces/Fragment Mono roles from `DESIGN.md`
**And** focus-visible states, semantic labels, `aria-checked`/`aria-describedby`, and inline errors meet WCAG 2.1 AA
**And** motion honors `prefers-reduced-motion`
**And** rendered copy contains neither “Passport” nor “submitter”.

## API and data contracts

### Domain types and effective settings

Extend `packages/radar-engine/src/domain/types.ts` with an optional JSON-compatible object:

```ts
export type ProfileVisibility = 'public' | 'private';

export interface ProfilePrivacySettings {
  displayName: ProfileVisibility;
  bio: ProfileVisibility;
  trackedOpportunityCount: ProfileVisibility;
}

export interface ProfilePrivacyPatch {
  displayName?: ProfileVisibility;
  bio?: ProfileVisibility;
  trackedOpportunityCount?: ProfileVisibility;
}

export interface UserProfile {
  // existing fields...
  privacy?: Partial<ProfilePrivacySettings>;
}
```

Use one engine helper for defaults and normalization, for example:

- `profilePrivacy(userId): ProfilePrivacySettings | undefined` — returns effective defaults for an existing user, `undefined` for an unknown user.
- `updateProfilePrivacy(userId, patch): { user: UserProfile; settings: ProfilePrivacySettings; changedFields: Array<keyof ProfilePrivacySettings> }` — validates keys/values, applies a complete normalized object, and does not partially mutate on failure.
- Update `publicUserProfile` from Story 2.2 to apply effective settings and include `trackedOpportunityCount` only when public. Keep its return type privacy-safe and omit private keys entirely. For an existing user whose three supported fields are all private, return a marker such as `{ isPrivate: true }` with no identity fields so the public page can render the intentional private-profile state; return `undefined` only for an unknown user.

The public projection must calculate the aggregate count from `store.tracked` (`userId` match) at read time. Do not expose raw `store.users` or return `privacy` settings to public callers.

### Owner endpoint

Implement `GET` and `PATCH` at `apps/web/app/api/me/profile/privacy/route.ts`:

- Resolve the session with `getSessionAccountFromToken` and `SESSION_COOKIE`; use `MISSA_SESSION_SECRET` exactly as Story 2.2.
- `GET` returns `{ settings, publicUrl }` with `Cache-Control: no-store`; `401` when unauthenticated and `404` only if the linked profile cannot be resolved.
- `PATCH` accepts exactly `{ displayName?: 'public' | 'private'; bio?: 'public' | 'private'; trackedOpportunityCount?: 'public' | 'private' }`. Reject arrays, unknown keys, missing/invalid values, and user IDs with `400`.
- Return `{ settings, publicUrl, changedFields }` with `no-store` after persistence. Call `persistRadar()` when `DATABASE_URL` is configured; keep demo mode functional.
- Record one `profile.privacy_updated` audit entry only when `changedFields.length > 0`, using a stable detail string/JSON listing field names and visibility values, never raw profile contents.

### Public endpoint and page

Update `apps/web/app/api/profile/[userId]/route.ts` and `apps/web/app/profile/[userId]/page.tsx` to use the privacy-aware `publicUserProfile` helper. Keep the existing safe user ID validation and `Cache-Control: no-store`. Public responses contain only visible fields and an aggregate count when opted in, or `{ isPrivate: true }` when all supported fields are private. Do not add owner/session information to this route.

## UI and interaction requirements

- Extend the Story 2.2 `ProfileForm` rather than creating a parallel settings page or design system.
- Add a `Privacy` card/section below or beside profile details with a short explanation: `Choose what visitors can see on your public profile.`
- Each row contains a visible field name, one-sentence consequence, current `Public`/`Private` status, and an accessible shadcn `Switch` or equivalent. Avoid color-only semantics.
- Keep profile-content save and privacy save as separate, explicit mutations so a user can edit text without changing visibility and vice versa. Use the existing page's single primary `Save changes`; use an outlined `Save privacy settings` action for the privacy section. Loading preserves button width.
- Add a clear `Private` warning when the display name is hidden: `Visitors will not see your name on your public profile.`
- Add an aggregate-count explanation: `Shows only how many opportunities you track—not which ones.`
- After a successful privacy save, update the controlled state and show `Privacy settings saved` via existing inline status/toast. On failure, preserve toggles and show a recoverable inline message.
- The public profile's private state should be calm and direct (for example, `This profile is private.`) and must not use a red error treatment. If no public identity fields remain, prefer a privacy-safe not-found/private state over leaking that a private account exists.
- The public page's owner preview is intentionally identical to an anonymous visit; do not add an `Edit profile` link there.
- Do not add privacy controls for email, matching attributes, genres, alerts, tracker rows, works/files, or future Library data in this story. Those fields are always private or owned by later stories.

## Ordered implementation checklist

1. Read `DESIGN.md`, Story 2.2's Dev Notes/QA Results, naming decisions, existing `ProfileForm`, profile routes, `UserProfile`, and persistence adapter before editing.
2. Add `ProfileVisibility`, `ProfilePrivacySettings`, and `ProfilePrivacyPatch` types plus a default/normalization helper in `packages/radar-engine`; preserve compatibility with legacy JSONB rows.
3. Update the engine's privacy-aware public projection and aggregate tracked-count derivation; add `profilePrivacy` and `updateProfilePrivacy` methods with no partial mutation.
4. Add the owner privacy route (`GET/PATCH /api/me/profile/privacy`) with session-derived authorization, schema validation, persistence, no-store headers, and audit behavior.
5. Update `GET /api/profile/[userId]` and the public profile page to honor visibility and private-profile behavior without changing the existing route contract for visible fields.
6. Extend `ProfileForm` with accessible privacy controls, explicit save/cancel behavior, status copy, and owner warnings; use existing shadcn components and true-white tokens.
7. Add focused unit tests for defaults, malformed settings, no-op updates, audit detail, public projection, tracked count, and private display name/bio.
8. Add route/component/E2E coverage for owner save, anonymous public reads, owner preview parity, legacy defaults, invalid requests, no private-data leakage, and mobile keyboard use.
9. Run typecheck, lint, build, Radar tests, web tests, and runtime smoke checks. Record all results in QA Results; the developer must not commit.

## Dependencies and compatibility notes

- Story 2.2 is complete and provides the profile routes, form, public projection, audit convention, and optional `bio`; modify those surfaces instead of duplicating them.
- Story 2.1's session cookie contract (`missa_session`, HMAC, `MISSA_SESSION_SECRET`) is unchanged.
- `apps/web/lib/engine.ts` uses a global singleton per process; keep it so a privacy mutation is visible to server pages and route handlers in the same warm process.
- User records persist as JSONB in `radar_users`; no Drizzle migration or new relational table is needed. Do not run the broad production migration command.
- `store.tracked` is already the source of truth for tracked opportunity rows; derive the count from it and do not introduce a denormalized count.
- Existing worktree changes outside Profile/privacy are unrelated. Do not reset, stage, or commit them.

## Testing and validation requirements

### Unit and route contracts

- `radar-engine`: defaults for legacy rows, strict public/private validation, unknown key rejection, complete normalized settings, no-op update, malformed stored values fail closed, count derivation, and privacy-aware projection.
- Audit: exactly one entry for an effective change, none for no-op, changed field names only, no bio/email/tracker content.
- Route: `401`, `400`, `404`, `Cache-Control: no-store`, session-derived user boundary, response shape, persistence invocation, and no private fields in public JSON.

### Runtime/E2E smoke

1. Log in and open `/profile`; verify all three settings and defaults (`Display name Public`, `Short bio Public`, `Tracked opportunity count Private`) appear.
2. Set bio Private and count Public, save, refresh, and verify settings persist.
3. Open `/profile/{userId}` logged out; verify bio is absent and only an aggregate count appears.
4. Set display name Private, save, and verify the public page contains no name/email/user ID and uses the intentional private state.
5. Reopen public profile as owner; verify it matches anonymous output (no owner bypass).
6. Send malformed/unknown-key requests to the API; verify no mutation and recoverable errors.
7. Verify legacy fixture users with no privacy object resolve to the documented defaults.
8. Repeat at 390px with keyboard navigation and `prefers-reduced-motion`.

### Required commands before review

```text
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm test --workspace=@missa/radar-engine
npm run test:e2e --workspace=@missa/web
```

## Explicitly out of scope

- Works, Files, Saved Answers, portfolio uploads, or Library privacy controls (Epic 5; add explicit fields only when those objects exist).
- Privacy for email, password, session cookies, eligibility attributes, genres, saved searches, Fit Scores, alerts, followed organizations, tracker rows, deadlines, opportunity titles, or submission data; these remain private by contract.
- Public profile discovery/search, vanity slugs, avatars, social links, comments, messaging, analytics, SEO metadata, or profile blocking/reporting.
- Organization-specific profile access, reviewer/admin visibility, teams, Workspace permissions, exports, CSV/Gmail import, or billing.
- A second database, migration rewrite, auth system, or broad persistence refactor.
- Renaming the internal `(passport)` route group; only rendered language is changed/guarded.

## Dev Notes / Dev Agent Record

### Implementation summary

- Added `ProfileVisibility`, `ProfilePrivacySettings`, and `ProfilePrivacyPatch` to the existing `UserProfile` JSON shape. Legacy rows resolve to `{ displayName: 'public', bio: 'public', trackedOpportunityCount: 'private' }`; unknown stored values fail closed to `private`.
- Added `RadarEngine.profilePrivacy` and strict `updateProfilePrivacy` with no partial mutation, normalized complete settings, changed-field reporting, no-op behavior, and public projection support. `publicUserProfile` now omits private fields and computes `trackedOpportunityCount` live from `store.tracked`; an existing profile with no public fields returns `{ isPrivate: true }`, while unknown users remain `undefined`.
- Added session-safe `GET/PATCH /api/me/profile/privacy` with exact key/value validation, `Cache-Control: no-store`, `persistRadar`, and one `profile.privacy_updated` audit entry only for effective changes. Audit detail contains changed field names/visibility values only.
- Extended the Story 2.2 `ProfileForm` with a separate Privacy card, visible Public/Private labels, accessible switches, display-name private warning, aggregate-count explanation, explicit save and restore controls, inline recoverable errors, and success feedback. Owner page passes normalized settings; public page uses the same projection for owner preview and anonymous visits, including the calm `This profile is private.` state.
- Added focused engine and Playwright coverage for defaults, malformed values, no-op updates, live count derivation, private identity, public projection, owner save, anonymous output, malformed API requests, keyboard switches, and 390px overflow.

### Validation

- `npm test --workspace=@missa/radar-engine` — passed (53 tests).
- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run build --workspace=@missa/web` — passed; generated `/api/me/profile/privacy` alongside profile routes.
- `npm run lint --workspace=@missa/web` — passed with 2 pre-existing warnings in `app/api/opportunities/route.ts` (`_createdAt`, `_simultaneousAllowed`).
- Focused Playwright privacy suite (`npx playwright test e2e/profile-privacy.spec.ts` against a fresh dev server on port 3014) — passed 3/3. Covers persistence, public omission/count, private-profile state, malformed request recovery, owner preview parity, keyboard switches, and mobile no-overflow.
- No commits made; leader owns review and commit. No database migration required because privacy remains optional JSONB on `radar_users`.

### File list

- `packages/radar-engine/src/domain/types.ts`
- `packages/radar-engine/src/engine.ts`
- `packages/radar-engine/src/index.ts`
- `packages/radar-engine/test/profile.test.ts`
- `apps/web/app/api/me/profile/privacy/route.ts`
- `apps/web/app/profile/page.tsx`
- `apps/web/app/profile/profile-form.tsx`
- `apps/web/app/profile/[userId]/page.tsx`
- `apps/web/e2e/profile-privacy.spec.ts`

### Change Log

- 2026-08-02: Implemented privacy defaults/normalization, owner privacy API, privacy-aware public projection, aggregate count, Profile controls, audit behavior, private-profile state, and focused tests.
- 2026-08-02: Hardened route validation error handling across Next.js bundles; canonical privacy Playwright run now returns stable 400 responses for malformed settings.

Status: review

## Review Notes

Leader review: PASS. Privacy remains an extension of the existing Profile journey: one owner surface, one session-derived mutation boundary, one privacy-aware public projection, and no second persistence or auth system. Legacy rows resolve to the documented defaults, unknown values fail closed, aggregate tracking count is recomputed from tracker rows, and all-private profiles use the explicit privacy-safe state without returning an identifying fallback. The route validation guard was hardened after canonical E2E exposed a Next bundle `instanceof` edge case; malformed requests now reliably return 400. The implementation follows `DESIGN.md` with true-white surfaces, semantic Missa tokens, shadcn controls, visible Public/Private labels, 44px touch targets, and no user-facing Passport/submitter vocabulary.

The only environment limitation is that the recorded runtime validation used demo/in-memory mode; Neon cold-start persistence remains part of the broader Epic 2 environment validation. No product blocker remains for this story.

## QA Results / Validation Results

VALIDATION: PASS

- Mode: light (Epic 2 has more than three stories; unit tests were not rerun here because the developer reported the 53/53 radar-engine suite as passing.)
- Build/runtime: the canonical privacy Playwright command started a fresh Next dev server on `http://127.0.0.1:3100` successfully. A separate clean dev server also served the owner/public profile routes.
- Main-case smoke: owner defaults returned `200` with `{ displayName: "public", bio: "public", trackedOpportunityCount: "private" }`; a valid patch returned `200`, persisted after reload, returned `Cache-Control: no-store`, and public projection omitted a private bio while exposing only the aggregate tracked count. An all-private profile returned `{ isPrivate: true }` and the public page rendered `This profile is private.` without a visible name/email/ID fallback. The owner preview used the same public projection.
- Canonical E2E: `npm run test:e2e --workspace=@missa/web -- e2e/profile-privacy.spec.ts` ran 3 tests and passed 3/3 after the stable `error.name` route guard was added. Coverage includes persistence, public omission/count, private-profile state, malformed/unknown-key recovery, owner-preview parity, keyboard switches, and mobile overflow.
- Mobile/a11y smoke: the Playwright mobile test passed at `390x844`; all three switches were present, keyboard Space toggled while focus remained on the switch, and `document.documentElement.scrollWidth <= 390`.
- No database migration was introduced or required (privacy remains optional JSON on the existing user record); no external infrastructure was added.

No QA code changes or commits were made. Leader review/commit may proceed.
