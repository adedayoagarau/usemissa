# Directory and creator portfolio integration handoff

Updated September 4, 2026. Backend-worker handoff reconciled with the current checkout. This is the shared frontend/backend integration reference; deployment and real-account end-to-end success are separate verification gates.

## Reading-window filters

`/journals` and `/directory` accept `?window=open`, `?window=closing_soon`, `?window=opening_soon`, and `?window=closed`.

- Filter pills: `apps/web/components/directory-browse-view.tsx`.
- Route wiring: `apps/web/app/directory/page.tsx`, `apps/web/app/journals/page.tsx`, and `apps/web/components/directory-category-page.tsx` pass `scheduleState` to the repository.
- Resolution/query implementation: `packages/radar-adapters/src/profileRepository.ts` and `packages/radar-engine/src/availability/magazineSchedule.ts`.
- Reconciliation required: the supplied backend summary says filtering executes against resolved live deadlines and schedule profiles directly in Neon. The inspected repository instead queries profile data, resolves schedules into cards, then applies the schedule-state filter in application code. Do not describe SQL-side filtering or live-deadline authority as verified until that implementation is reconciled. The `open` branch includes `always_open`.

## Account portfolio endpoints

| Operation | Endpoint |
| --- | --- |
| Load private draft, revision and publication status | `GET /api/creator/portfolio-draft` |
| Save private draft with revision conflict protection | `PUT /api/creator/portfolio-draft` |
| Upload owned media | `POST /api/creator/portfolio-media` |
| Serve authorized media | `GET /api/creator/portfolio-media/[id]` |
| Publish reviewed snapshot | `POST /api/creator/portfolio-publish` |
| Unpublish while keeping draft and handle | `DELETE /api/creator/portfolio-publish` |
| Read current handle | `GET /api/me/handles` |
| Check availability | `GET /api/me/handles/availability?handle=...` |
| Claim/reserve handle | `POST /api/me/handles` |
| Rename handle | `PATCH /api/me/handles` |

**Correction to the supplied handoff:** `POST /api/me/handles/publish` is retired and returns 409 directing the owner to Public profile settings. It does not reserve a handle or publish a portfolio. Existing handle reservation, invite and rename rules remain authoritative.

## Frontend journey and persistence boundaries

- Account → Public profile (`/profile/portfolio`) is the authenticated editor. Handle selection sits below display name; it is optional while drafting and required for first publication.
- The public portfolio lives at `/@<handle>` and reads a published snapshot, never the mutable private draft. Editing does not change publication until Publish changes. Unpublishing removes public snapshot/media access.
- Private account saves await server confirmation and use revisions; stale writes surface a conflict rather than overwrite another revision. IndexedDB holds a local recovery copy. It is **not automatic offline synchronization or conflict merging**; failed server writes must not show account-save success.
- `/design-system/creator-profile-settings` and `/design-system/creator-profile-v2` remain device-local previews. Importing a preview into an account is explicit and browser-local.
- Avatar, book-cover, work-image and audio uploads use the media endpoint. Current storage is owned PostgreSQL media, with 20 MB/file and 100 MB/account limits, not a CDN pipeline. Serving requires ownership or inclusion in a published snapshot.

## Source map and verification

- UI: `apps/web/components/creator-portfolio-studio.tsx`, `apps/web/components/portfolio-handle-field.tsx`.
- Client persistence: `apps/web/lib/creator-portfolio-draft.ts`.
- Public schema/projection: `apps/web/lib/creator-portfolio-schema.ts`.
- Storage: `packages/radar-adapters/src/creatorProfileRepository.ts`.
- Schema migration: `packages/db/migrations/0041_creator_portfolios.sql`.
- API source: `apps/web/app/api/creator/` and `apps/web/app/api/me/handles/`.
- Design and validation history: [Public creator profile design](public-creator-profile-design.md).
- Directory design: [Discovery design system](discovery-design-system-2026-09-04.md).

Prior slice validation includes focused browser tests with mocked account transport and isolated PostgreSQL ownership/snapshot tests. This handoff was checked against source; it does not certify a production deployment, native-phone sign-in or real cross-device account use. No creator profile was published to prepare this handoff.
