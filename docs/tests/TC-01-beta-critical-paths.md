# TC-01: Missa beta critical paths

## TC-01-01: Creator account journey

**Priority:** Critical
**Design ref:** `docs/beta-readiness-2026-09-06.md`

**Preconditions:** latest production build completed; local server is healthy; configured database is reachable.

**Steps and checkpoints:**

1. Run the account, onboarding, and Saved/Tracker browser specifications against the local server.
2. Confirm signup returns 201 and reaches onboarding.
3. Confirm onboarding state survives a reload.
4. Save a published opportunity, then open Saved and Tracker.

- CP1: No tested account route returns 500.
- CP2: The saved title is visible after a fresh navigation.
- CP3: Unauthenticated private routes return to login with the intended destination.

**Cleanup:** reserved `@example.com` QA accounts may be removed after a passing run; preserve them after failure for diagnosis.

## TC-01-02: Public discovery

**Priority:** Critical
**Design ref:** `docs/discovery-beta-and-rankings-2026-09-06.md`

1. Run the discovery and rankings browser specifications at 390px and desktop widths.
2. Open one opportunity and one magazine from their listings.
3. Exercise search, filters, tabs, comparison, and methodology navigation.

- CP1: Every primary public route returns 200.
- CP2: Opportunity and magazine detail links resolve.
- CP3: No tested route has horizontal overflow at 390px.

## TC-01-03: Canonical magazine profile

**Priority:** Critical
**Design ref:** `docs/journal-profile-consolidation-2026-09-06.md`

1. Open `/journals/cincinnati-review?from=ranking` without following redirects.
2. Verify the 308 Location is `/journal/cincinnati-review?from=ranking`.
3. Open the canonical page and inspect ranking, submission, contact, media, and opportunity sections.
4. Open A Public Space and verify its prize history remains.

- CP1: Query parameters survive the redirect.
- CP2: No `pw.org` or public discovery-source link is rendered.
- CP3: External actions use the publication website or its official submission portal.
- CP4: Existing ranking and unique legacy content remain visible.

**Cleanup:** none.
