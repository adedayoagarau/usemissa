# Profile contract

Missa's Profile is the user's durable working context. It is deliberately separate from `RadarProfile`, which remains the saved-search model used by the browse experience.

## Workflow

The profile is one workflow with five sections:

1. **About you** — display name, pronouns, location, and a private short bio.
2. **Your practice** — disciplines, genres/forms, career stage, and languages.
3. **Your work** — reusable materials such as bios, statements, CVs, work links, and saved answers.
4. **Preferences** — location, fee, deadline, and simultaneous-submission preferences used to tailor recommendations.
5. **Privacy** — explicit controls for public discovery, location, contact details, and default material sharing.

The UI reports section states instead of a misleading single completion percentage. `discoverReady` requires About + Practice. `applyReady` additionally requires at least one material marked `ready`. `publicReady` requires About plus an explicit public-profile choice.

## API

- `GET /api/users/:id/profile` → `{ profile, readiness, displayName, genres }`
- `PATCH /api/users/:id/profile` → updates a whitelisted profile patch and legacy genre/name fields
- `GET /api/users/:id/profile/materials`
- `POST /api/users/:id/profile/materials`
- `PATCH|DELETE /api/users/:id/profile/materials/:materialId`

Every route is self-scoped through the authenticated account. Materials are owned by the profile's user and are never returned through a public route.

## Persistence boundary

The first vertical slice embeds `ProfileDetails.materials` in the existing `radar_users` JSON document. This uses the current Postgres compatibility writer without introducing a second source of truth. If material search, sharing analytics, or organization-facing public profiles become significant, normalize materials into a relational table with a migration and preserve the same API contract.

## AI boundary

No AI system owns or silently edits Profile data. Fit explanations remain deterministic and cite profile signals. Future AI assistance may draft a bio, classify a work, or suggest missing materials only after an explicit user action; the suggestion must be labeled, reviewable, undoable, and opt-outable. Submission snapshots must capture the exact profile/material versions the user approved.
