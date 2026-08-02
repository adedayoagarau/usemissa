---
epic: 2
story: 2.2
status: ready-for-dev
title: Public Profile / Profile page
---

# Story 2.2: Public Profile / Profile page

## Story

As a Missa user,
I want a Profile that I can complete and share publicly,
so that organizations can understand who I am before I submit.

## Context and scope

This story implements the first public presence promised by the homepage's **Build your profile** CTA. It is the profile identity surface, not the Works/Files library and not privacy settings. The public route must be useful to an organization visitor while exposing only the explicitly public identity fields in this story.

The existing account flow creates an `Account` linked to a `UserProfile` (`packages/radar-engine/src/auth/accounts.ts`). `UserProfile` currently has `displayName`, `genres`, and `attributes`, but no `bio`; the existing Radar/Postgres adapter stores user records as JSONB in `radar_users`, so adding an optional field is backwards compatible and does not require a new relational table or migration. There is currently no `/profile` page or profile API.

### Product language guardrail

The user-facing name is **Profile**. Do not render “Passport”, “My Passport”, “submitter”, “Universal Submitter Profile”, or schema terms in this page, navigation, metadata, validation, empty state, or API error copy. The route group may remain internally named `(passport)` because it is an implementation boundary; that internal name must never leak to rendered UI. The public route is `/profile/[userId]`, and the authenticated editing route is `/profile`.

## Acceptance criteria

### AC1 — Authenticated Profile page and owner access

**Given** an authenticated account with a linked `UserProfile`
**When** the user visits `/profile`
**Then** the page renders on a true-white canvas with the existing Missa app navigation and a clear `Profile` page title
**And** the owner sees their current display name and bio in labelled fields
**And** an unauthenticated request redirects to `/login?next=%2Fprofile`
**And** the page never renders the account email, session token, internal account ID, or raw user object.

### AC2 — Edit and persist display name and bio

**Given** the owner is on `/profile`
**When** they submit a valid display name and bio
**Then** the UI sends an authenticated mutation using the session-derived account/user identity (the browser must not be trusted to choose another user's ID)
**And** the response includes the normalized saved profile
**And** the page updates without a full page navigation and shows a labelled confirmation such as `Profile saved`
**And** a subsequent request, cold start, or server-rendered page reads the saved values from the same Radar store.

### AC3 — Validation and recoverable errors

**Given** a profile edit form
**When** the display name is blank or longer than 120 characters
**Then** the save is rejected with an inline message explaining the valid range and no partial mutation is persisted
**When** the bio is longer than 1,000 characters
**Then** the save is rejected with an inline message explaining the limit and no partial mutation is persisted
**When** the request is malformed, unauthenticated, or fails to persist
**Then** the route returns a stable JSON error with the appropriate `400`, `401`, or `500` status and the UI preserves the user's unsaved input while explaining how to retry.

### AC4 — Public Profile route

**Given** a user ID that belongs to a user profile
**When** any visitor (authenticated or unauthenticated) visits `/profile/[userId]`
**Then** the page renders a public Profile using only the public response contract: display name, non-empty bio, and a link/affordance back to the opportunity experience
**And** the page provides a useful empty state when no bio exists without exposing private data
**And** the page is readable and usable without an account.

### AC5 — Public data isolation and not-found behavior

**Given** a visitor requests `/profile/[userId]` for an unknown user, an account without a linked profile, or a malformed ID
**Then** the route returns a normal not-found page/`404` response and does not reveal whether an account exists
**And** public responses never include email, password hash, account ID, session data, saved searches/RadarProfiles, genres or eligibility attributes, tracked opportunities, alerts, followed organizations, library works/files, or privacy settings
**And** API responses set a privacy-safe cache policy (`no-store` unless a later privacy review explicitly allows public caching).

### AC6 — Public link and owner preview affordances

**Given** the owner is viewing `/profile`
**Then** the page exposes a visible `View public profile` link that targets `/profile/{userId}` in a new or same tab according to the existing app link conventions
**And** the public page never exposes an owner-only edit control to visitors
**And** keyboard users can reach both the edit save action and public-profile link in a predictable order.

### AC7 — Completeness/onboarding state is derived, not a second workflow

**Given** the owner has not supplied a bio
**Then** `/profile` shows a calm, actionable completeness prompt identifying `Add a short bio` as the next step
**And** completeness is derived from the required identity fields (display name and bio) rather than a new onboarding table or duplicated state machine
**And** saving the bio immediately updates the derived completion state
**And** this story does not block browsing Opportunities when the profile is incomplete.

### AC8 — Auditability

**Given** an authenticated owner changes their profile
**When** the mutation succeeds
**Then** one append-only audit entry is recorded through the existing `recordAudit` primitive, with the actor account ID, a stable profile target type/ID, timestamp, and a privacy-safe action/detail (for example `profile.updated`)
**And** the audit detail never stores the raw bio text or other private profile contents.

### AC9 — Responsive and accessible behavior

**Given** desktop, tablet, and a 390px mobile viewport
**Then** Profile remains a single-column, touch-usable surface with no horizontal overflow and controls at least 44x44px on touch layouts
**And** labels remain visible (placeholders do not replace labels), focus-visible states use the Missa terracotta focus ring, and inline errors are associated with their fields
**And** the page meets WCAG 2.1 AA contrast and keyboard requirements, has a meaningful page heading, and honors `prefers-reduced-motion`
**And** any icon-only control has an accessible name.

### AC10 — Vocabulary and design-system regression guard

**Given** the implementation is reviewed in the rendered DOM and screenshots
**Then** the primary page background is `#ffffff` (true white), with existing Missa semantic tokens for ink, borders, surfaces, and terracotta actions
**And** the implementation uses existing shadcn/ui primitives and Instrument Sans/Fraunces/Fragment Mono roles according to `DESIGN.md`
**And** no rendered copy contains “Passport” or “submitter”.

## API and data contracts

### Domain model

- Extend `UserProfile` in `packages/radar-engine/src/domain/types.ts` with `bio?: string` (optional for backwards compatibility with demo JSON and existing Postgres JSONB rows).
- Keep `genres` and `attributes` as existing matching inputs. They are not public in this story.
- Add an engine-level profile update/read boundary rather than mutating `store.users` from a page component. Suggested public methods (names may follow existing engine conventions):
  - `updateUserProfile(userId, patch: { displayName: string; bio?: string }): UserProfile`
  - `publicUserProfile(userId): { id: string; displayName: string; bio?: string } | undefined`
- Validate and normalize in the domain boundary: trim display name and bio, reject the limits above, and preserve an omitted bio as an empty/undefined value consistently.
- Record the audit entry through `recordAudit` from the authenticated route/engine context. Do not log bio content.

### Route handlers

Implement these Next.js Route Handlers under `apps/web/app/api`:

1. `GET /api/me/profile`
   - Resolve the session using `getSessionAccount`/`getSessionAccountFromToken` and the existing `MISSA_SESSION_SECRET` contract.
   - Return `401 { error: "Not authenticated" }` when no valid session exists.
   - Return owner-only data `{ id, displayName, bio, completeness, publicUrl }`.

2. `PATCH /api/me/profile`
   - Require the session; never accept a browser-supplied `userId`.
   - Accept JSON `{ displayName?: string; bio?: string }`; reject unknown/malformed values with a stable `400` error.
   - On success persist via `persistRadar()` when `DATABASE_URL` is configured and return the normalized profile with `Cache-Control: no-store`.
   - On mutation, append exactly one privacy-safe audit record.

3. `GET /api/profile/[userId]`
   - Public, read-only endpoint using the same engine/domain helper as the page.
   - Return only the public profile contract `{ id, displayName, bio? }`, `404` for unknown/malformed users, and `Cache-Control: no-store` until privacy settings are implemented and reviewed.

The route contract must not add a second auth system, direct `pg` import, or a second schema authority. Existing `/api/users/[id]/profiles` routes are saved-search/RadarProfile compatibility routes and must not be repurposed for a public identity profile.

## UI and interaction requirements

- Add an authenticated `/profile` page and a public `/profile/[userId]` page. Because `app/(passport)/layout.tsx` currently gates the whole route group, keep the public dynamic route outside that auth-gated layout or create a dedicated public layout; do not make public profile visitors sign in.
- Add `Profile` to the account menu (or the existing authenticated navigation affordance) so a user can reach it from every Passport surface. Do not add a new primary nav category unless the existing IA requires it.
- Use existing `Card`, `Input`, `Textarea`, `Label`, `Button`, and toast/inline feedback primitives. Do not hand-roll a new design system.
- Owner view: page heading, short explanatory copy, display name field, bio textarea, derived completeness prompt, `Save changes` primary action, and `View public profile` secondary link.
- Public view: name-led identity header, bio when present, an intentional empty state when absent, and a clear path to browse opportunities/sign up. Do not show a decorative “portfolio” panel until Library/Works exists.
- Loading state preserves form width; save action has default, hover, active, focus-visible, loading, disabled, and error states. Use only one terracotta-filled primary action in the view.
- Confirm save with a toast or inline status; do not use a blocking dialog for routine profile edits. Preserve unsaved values after a recoverable network/server error.
- Do not introduce paper/cream canvas, gratuitous gradients, pill-shaped primary buttons, or unsupported icon-only controls. Follow `DESIGN.md` exactly.

## Ordered implementation tasks

1. [x] Read `DESIGN.md`, this story, the naming decisions, and the existing auth/profile-related code before editing.
2. [x] Extend `UserProfile` with the optional bio field and add a domain-safe profile update/public projection method in `packages/radar-engine` with unit tests for normalization, limits, missing user, and public-field projection.
3. [x] Add audit coverage for profile updates using the existing append-only `recordAudit` primitive without persisting raw private values.
4. [x] Add `GET /api/me/profile`, `PATCH /api/me/profile`, and `GET /api/profile/[userId]` route handlers. Reuse the session helper and `persistRadar`; validate request/response shapes at the route boundary.
5. [x] Add `/profile` owner UI and `/profile/[userId]` public UI, keeping the public route outside the auth-gated Passport layout. Add the account-menu link and owner/public navigation affordances.
6. [x] Add component/page styles using existing CSS variables/shadcn primitives and true-white surface tokens; verify no user-facing “Passport” or “submitter” strings are introduced.
7. [x] Add focused tests: engine/domain unit tests, route contract tests, and Playwright coverage for owner edit/persist, public visitor, unauthenticated owner redirect, validation errors, and no private-data leakage.
8. [x] Run typecheck, lint, build, the relevant package tests, and the web runtime smoke flow. Capture results in the QA Results section below; do not commit from the developer agent.

## Dependencies and compatibility notes

- Story 2.1 auth pages/session cookie contract is complete and must remain unchanged (`missa_session`, HMAC verification, `MISSA_SESSION_SECRET`).
- `apps/web/lib/engine.ts` uses a demo in-memory world without `DATABASE_URL` and a Postgres-backed production engine when configured. Profile mutations must work in both modes; call `persistRadar()` for production.
- Radar users are persisted as JSONB in `radar_users`; no new migration is required for the optional `bio` field. Do not run a broad production migration or modify the existing relational opportunity schema for this story.
- Existing route groups and server components are split between page and route-handler bundles. Preserve the `globalThis` singleton behavior in `apps/web/lib/engine.ts`; do not introduce a per-route store.
- Keep the one-way dependency rule: `workspace-engine` must not import `apps/web` or the reverse domain direction; this story belongs to Radar/account data.
- The worktree is already dirty with unrelated homepage, organization, opportunity, and persistence changes. Limit edits to the story's relevant files and do not reset or commit unrelated changes.

## Testing and validation requirements

### Unit/contract tests

- Existing `radar-engine` tests remain green.
- New profile tests cover: display name trimming/limits, bio trimming/limit, missing user, public projection excluding email/account ID/attributes/genres, and audit detail not containing bio text.
- Route tests cover `401`/`403` boundaries, `400` validation, `404` not-found, response shape, `no-store`, and persistence invocation.

### Runtime/E2E smoke

1. Sign up through `/signup` or log in through `/login`.
2. Visit `/profile`; verify the owner form is shown and the account menu links to Profile.
3. Save a valid name/bio; verify immediate confirmation, refresh, and verify values persist.
4. Open `/profile/{userId}` in a logged-out context; verify only the public name/bio render and no email/private values appear in body or JSON.
5. Submit blank/over-limit values; verify inline recovery messages and no partial save.
6. Visit `/profile` logged out; verify redirect includes the return path.
7. Run the same checks at 390px width with keyboard navigation and reduced motion enabled.

### Required commands before review

```text
npm run typecheck --workspace=@missa/web
npm run lint --workspace=@missa/web
npm run build --workspace=@missa/web
npm test --workspace=@missa/radar-engine
npm run test:e2e --workspace=@missa/web
```

## Explicitly out of scope

- Privacy controls and per-field public/private toggles (Story 2.3 owns these; this story only establishes a stable public projection and default public identity fields).
- Works, Files, Saved Answers, portfolio items, uploads, or Library tabs (Epic 5).
- Saved-search/RadarProfile editor, opportunity matching preferences, Fit Score, Tracker, Inbox, or Insights content.
- CSV import, Gmail sync, email forwarding, calendar integrations, or organization submissions.
- Public profile search/indexing, vanity slugs, follower counts, tracked-opportunity counts, social links, avatars, analytics, SEO expansion, or public profile comments.
- New database tables, broad migration rewrites, a second auth/session system, or changes to production domain/Vercel configuration.
- “Passport” as a user-facing label; internal route-group/file naming may remain for compatibility only.

## Dev Notes / Dev Agent Record

### Implementation summary

- Extended `UserProfile` with optional `bio`, plus public projection and patch types. Added `RadarEngine.updateUserProfile`, `publicUserProfile`, and derived `profileCompleteness`; validation trims display name/bio, rejects blank/over-limit values, and leaves matching fields untouched.
- Added owner-safe `GET/PATCH /api/me/profile` routes. They derive identity only from the signed session cookie, return `no-store`, normalize response shape, persist through `persistRadar`, and append one `profile.updated` audit event whose detail contains no profile content.
- Added public `GET /api/profile/[userId]` with a strict safe ID check, `404` for unknown/malformed IDs, and a public-only `{ id, displayName, bio? }` contract.
- Added owner `/profile` and unauthenticated `/profile/[userId]` pages. Owner editing uses existing shadcn `Card`, `Input`, `Textarea`, `Label`, and `Button` primitives with inline status/error feedback and unsaved-input preservation. Public view has a name-led identity surface, intentional missing-bio state, and opportunity/sign-up paths.
- Added `Profile` account-menu and mobile-navigation links. Public profile is outside the auth-gated `(passport)` layout. Profile surfaces use `bg-white`, existing Missa tokens, self-hosted fonts, 44px touch controls, visible labels, and focus-visible rings.

### Validation

- `npm run build --workspace=@missa/radar-engine` — passed.
- `npm test --workspace=@missa/radar-engine` — passed (50 tests).
- `npm run typecheck --workspace=@missa/web` — passed.
- `npm run lint --workspace=@missa/web` — passed with 2 pre-existing warnings in `app/api/opportunities/route.ts` (`_createdAt`, `_simultaneousAllowed`).
- `npm run build --workspace=@missa/web` — passed; generated `/profile`, `/profile/[userId]`, `/api/me/profile`, and `/api/profile/[userId]` routes.
- Runtime smoke on `next start` port 3012 with demo mode: unauthenticated `/profile` redirected to `/login?next=%2Fprofile`; signup, owner GET/PATCH, public GET/page, and validation error all returned expected results; public API returned `Cache-Control: no-store` and excluded private fields.
- Focused Playwright profile suite (`npx playwright test e2e/profile.spec.ts` against the running dev server) — passed 3/3: owner edit/persist and public projection isolation, validation recovery plus unauthenticated redirect, and 390px no-overflow/touch controls. The repository webServer could not be started concurrently because an existing Next dev lock was active; the suite was run against that existing server with the same demo-mode environment.
- No commits made; leader owns commit and review. Route contract and full Playwright coverage remain available for the validation pass.

### File list

- `packages/radar-engine/src/domain/types.ts`
- `packages/radar-engine/src/engine.ts`
- `packages/radar-engine/src/index.ts`
- `packages/radar-engine/test/profile.test.ts`
- `apps/web/app/api/me/profile/route.ts`
- `apps/web/app/api/profile/[userId]/route.ts`
- `apps/web/app/profile/page.tsx`
- `apps/web/app/profile/profile-form.tsx`
- `apps/web/app/profile/[userId]/page.tsx`
- `apps/web/components/app-nav.tsx`
- `apps/web/app/(passport)/layout.tsx`
- `apps/web/app/(workspace)/layout.tsx`

### Change Log

- 2026-08-02: Implemented profile domain, owner/public APIs, profile UI, navigation affordances, privacy-safe audit, unit tests, and validation.
- 2026-08-02: Added focused Profile Playwright coverage for owner/public journeys, validation, privacy isolation, redirect, and mobile layout.

Status: review

## Review Notes

Leader review: PASS. The implementation keeps the public projection deliberately narrow, derives owner identity from the signed session, records a privacy-safe `profile.updated` audit event, and keeps the public route outside the auth-gated layout. The owner and public surfaces use the existing shadcn primitives, semantic Missa tokens, true-white canvas, visible labels, and 44px touch targets required by `DESIGN.md`. The focused Playwright suite now covers owner edit/persist, public privacy isolation, validation recovery, unauthenticated redirect, and 390px layout behavior. No user-facing Passport/submitter vocabulary was introduced by this story.

The only validation limitation is that the smoke run used the demo in-memory engine because the local environment did not expose `DATABASE_URL`; Neon cold-start persistence remains part of the Epic 2 environment validation. No product-code blocker remains for this story.

## QA Results / Validation Results

VALIDATION: PASS WITH LIMITATION

- Mode: light (Epic 2 has more than three stories)
- Runtime: OK — existing Next.js dev server at `http://127.0.0.1:3001` using the local demo engine (`DATABASE_URL` unset). A separate port could not be started because another Next dev process owned the repository dev lock.
- Unauthenticated owner guard: PASS — `GET /profile` returned `307` with `Location: /login?next=%2Fprofile`.
- Auth/signup and owner flow: PASS — created a fresh account through `/signup`, loaded `/profile`, read `GET /api/me/profile` (`200`, `Cache-Control: no-store`), patched a trimmed display name and bio through `PATCH /api/me/profile` (`200`), saw `Profile saved`, and confirmed a subsequent owner read returned the normalized values.
- Public contract/privacy: PASS — logged-out `GET /api/profile/user_0005` returned only `{ id, displayName, bio }` with `200` and `Cache-Control: no-store`; the logged-out `/profile/user_0005` page rendered the name and bio, included a Log in path, and did not expose the test account email or private profile fields. Unknown IDs returned `404` with `{ error: "Profile not found" }` and `no-store`.
- Validation recovery: PASS — blank display name returned `400` with `Display name must be between 1 and 120 characters.` and the form retained the unsaved blank value. The focused Playwright suite also submits a 1,001-character bio and confirms the inline `Bio must be 1,000 characters or fewer.` error without partial persistence.
- Mobile smoke/accessibility basics: PASS — Playwright-style headless checks at `390x844` with reduced motion found the owner and logged-out public pages rendered, save confirmation appeared, public navigation worked, and both pages had `scrollWidth === 390` (no horizontal overflow). Labels and semantic buttons were usable in the tested flow.
- Focused Playwright profile suite: PASS — `profile.spec.ts` passed 3/3 against the running demo-mode server, covering owner edit/persist, public projection/privacy, validation recovery, unauthenticated redirect, and mobile overflow/touch controls.
- Build/unit checks: PASS — `npm run typecheck --workspace=@missa/web`, `npm run lint --workspace=@missa/web`, `npm run build --workspace=@missa/web`, and `npm test --workspace=@missa/radar-engine` all passed. Lint retains two pre-existing unused-variable warnings in `app/api/opportunities/route.ts`.

Known limitation: the smoke used the in-memory demo engine, so cold-start persistence against Neon/Postgres was not verified in this pass. Run the profile flow with `DATABASE_URL` against a disposable/rehearsed database during the Epic 2 full validation.
