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
- `GET /api/users/:id/profile/suggestions` → review-required deterministic suggestions
- `GET /api/users/:id/submission-drafts`
- `POST /api/users/:id/submission-drafts` → prepare a packet for an opportunity
- `PATCH|POST /api/users/:id/submission-drafts/:draftId` → save selection or confirm submission

Every route is self-scoped through the authenticated account. Materials are owned by the profile's user and are never returned through a public route.

## Persistence boundary

The compatibility path still embeds `ProfileDetails.materials` in `radar_users`, while migration `0003_dizzy_terror.sql` / `0004_wise_mulholland_black.sql` introduces normalized `profiles`, `profile_preferences`, `profile_privacy`, `profile_materials`, `submission_drafts`, and `submission_draft_materials` tables. The Postgres adapter dual-writes those tables when they exist, preserving older deployments while the cutover is rehearsed.

## AI boundary

No AI system owns or silently edits Profile data. Fit explanations and the current “Missa suggestions” provider are deterministic and cite profile signals. A future AI provider may draft a bio, classify a work, or suggest missing materials only after an explicit user action; the suggestion must be labeled, reviewable, undoable, and opt-outable. Submission snapshots capture the exact profile/material versions the user approved.
