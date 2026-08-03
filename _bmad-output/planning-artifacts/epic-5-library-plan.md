# Epic 5 — Library, Preparation, and Lists

Status: Story 5.1 is implemented and in review. Stories 5.2 and 5.3 are planned.

## Epic outcome

Missa should help a creator move from “I found an opportunity” to “I am ready to submit” without rebuilding the same material every time.

The Library is the reusable source of truth. Preparation is opportunity-specific progress. Lists are the creator’s own organization layer.

The three surfaces must remain distinct:

| Surface | Owns | Does not own |
| --- | --- | --- |
| Library | reusable Works, Files, and Saved Answers | deadline/status state |
| Preparation | required materials and readiness for one tracked opportunity | canonical opportunity facts |
| Lists | personal grouping of tracked opportunities | Tracker status or checklist completion |

## Product journey

1. A creator opens Library and sees Works, Files, and Saved Answers with counts and clear empty states.
2. They add a Work, optionally attach a private File, and save reusable answers such as a short bio or artist statement.
3. They discover an opportunity and track it.
4. Missa creates a private preparation checklist from the opportunity’s extracted `requiredMaterials`.
5. On the opportunity detail or Tracker, the creator opens Prepare and sees what is complete, missing, uncertain, or not applicable.
6. They attach Library items to checklist requirements, create missing material inline, or mark a requirement complete when it is ready.
7. Missa explains readiness and keeps the submission CTA separate. Completing a checklist never changes Tracker status.
8. The creator can add the opportunity to one or more personal Lists such as “Poetry”, “This season”, or “High priority”.
9. Lists are filterable from Opportunities and Tracker; deleting a List never deletes an opportunity, submission, Work, or checklist.

## Design direction from `DESIGN.md`

- Use true white `#ffffff`, semantic tokens, and the existing Instrument Sans / Fraunces / Fragment Mono roles. No paper tint.
- Keep Passport calm and legible: generous spacing, one clear action per card, short explanations, and 44px controls.
- Use “Library”, “Work”, “File”, “Saved Answer”, “Prepare”, and “List” in user-facing language. Never render “Passport”, `SubmissionPackage`, internal IDs, or “Entity”.
- Use shadcn primitives already installed: Tabs, Card, Button, Dialog, Checkbox, Select, Badge, Popover, Toast/status regions.
- Mobile is a first-class submitter case at 390px. Checklist rows stack; Library pickers become full-width; list filters become horizontally scrollable or a compact sheet.
- Preserve calm empty states. Every empty state should explain what the user can add and why it helps.
- Use optimistic check/uncheck only with an error rollback and an `aria-live` status. Destructive actions require confirmation.

## Story 5.1 — Works, Files, Saved Answers CRUD

### Delivered baseline

- `LibraryWork`, `LibraryFile`, and `SavedAnswer` domain records are owner-scoped.
- JSON and Neon persistence exist for all three collections.
- Private API routes exist for list/create/update/delete operations.
- Library UI has Works, Files, and Saved Answers tabs, empty states, edit/delete controls, and Playwright coverage.
- Files use Vercel Blob private storage when configured; the upload route fails closed when storage is not configured.

### Remaining 5.1 release gate

- Set and verify the production Blob store/token in Vercel.
- Verify private download/access behavior before exposing a file picker in submissions.
- Run a disposable Neon rehearsal for upload metadata, reload, deletion, and orphan cleanup.

## Story 5.2 — Opportunity Preparation Checklist

### Goal

As a creator, I want a preparation checklist for every tracked opportunity so I know exactly what is ready before I submit.

### Data model

```ts
type ChecklistItemState = 'missing' | 'ready' | 'complete' | 'not-applicable';

interface OpportunityChecklist {
  id: string;
  userId: string;
  opportunityId: string;
  trackedAt: string;
  sourceVersion?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistItem {
  id: string;
  checklistId: string;
  label: string;
  normalizedKey: string;
  order: number;
  state: ChecklistItemState;
  libraryWorkId?: string;
  libraryFileId?: string;
  savedAnswerId?: string;
  note?: string;
  source: 'opportunity-required-material' | 'user-added';
  sourceConfidence?: 'high' | 'possible' | 'unknown';
  createdAt: string;
  updatedAt: string;
}
```

Rules:

- Generate items from `Opportunity.fields.requiredMaterials` when a user first tracks an opportunity.
- Snapshot the labels into the user’s checklist. A later Radar refresh must not silently delete personal progress.
- Offer an explicit “Review changed requirements” action when the canonical opportunity requirements change.
- Checklist records are private to the user. They never modify the canonical Opportunity, public Profile, organization data, or Tracker status.
- A checklist may reference Library records only when the referenced record belongs to the same user.
- `complete` means the creator says the requirement is ready; it is not a claim that an organization accepted or validated the material.
- Empty or uncertain extracted requirements produce a visible “Requirements are not confirmed” state rather than fabricated rows.

### API contracts

- `GET /api/me/opportunities/:id/checklist` — session-derived checklist, progress summary, and requirement provenance.
- `POST /api/me/opportunities/:id/checklist/refresh` — explicitly reconcile changed required-material data; preserves completed items by normalized key.
- `PATCH /api/me/checklist-items/:id` — update state, note, or Library reference; owner-scoped and idempotent.
- `POST /api/me/opportunities/:id/checklist/items` — add a personal requirement.
- `DELETE /api/me/checklist-items/:id` — remove only user-added items; canonical extracted items become `not-applicable` instead of disappearing.

All mutations require an idempotency key, emit a private audit event, and return `Cache-Control: private, no-store`.

### UI surfaces and interactions

- Opportunity detail: add a `Prepare` tab/section beside Overview, Eligibility, and What you need.
- Tracker: show a compact progress badge such as `3 of 5 ready`; never use progress color as the only signal.
- Prepare panel: heading, source note, progress count, checklist rows, Library attach action, add requirement action, refresh-changes notice, and submission CTA.
- Clicking a row toggles complete with keyboard support, pending state, rollback on failure, and an `aria-live` confirmation.
- Attach opens a searchable Library picker grouped by Works, Files, and Saved Answers. “Add to Library” opens a short inline form without losing checklist context.
- “Not applicable” requires a deliberate action and optional note; it is visually distinct from complete.
- The bottom action says `Review and submit` or `Go to submission`, depending on whether Missa has an internal submission path. It does not imply that checking every box submits anything.

### Backend and AI boundaries

- `radar-engine` owns checklist creation, reconciliation, progress, ownership, state transitions, and idempotency.
- `radar-adapters` owns additive Neon tables and reload-safe persistence.
- Next.js owns authenticated routes and the Prepare UI.
- Existing Radar extraction supplies `requiredMaterials`, confidence, and source evidence. No new LLM call is needed to check boxes.
- If a future AI assistant suggests a missing material or Library match, it must be advisory, cite the source requirement, and require explicit confirmation. It must never mark an item complete or submit on the creator’s behalf.

### Story 5.2 acceptance gates

- Tracking an opportunity creates a checklist exactly once.
- Required-material labels remain traceable to the opportunity evidence.
- Check/uncheck, attach, not-applicable, add, refresh, and delete interactions work at 390px and keyboard-only.
- Two users cannot read or mutate each other’s checklist/items.
- Checklist progress survives Neon reload and does not alter `myStatus`, deadlines, canonical fields, or public projections.
- Missing/uncertain requirements are honest and recoverable.
- Engine, API, persistence, accessibility, and Playwright tests pass.

## Story 5.3 — Custom Lists

### Goal

As a creator, I want to organize tracked opportunities into my own Lists so I can work by project, season, genre, or priority instead of only by system status.

### Data model

```ts
interface CustomList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  colorToken?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface CustomListMembership {
  listId: string;
  userId: string;
  opportunityId: string;
  addedAt: string;
}
```

Rules:

- A user can create multiple Lists and an opportunity can belong to multiple Lists.
- Membership is allowed only for an opportunity the user tracks; adding to a List never implicitly tracks it unless the UI explicitly says `Track and add`.
- Deleting or archiving a List removes memberships but never deletes opportunities, Tracker events, Works, Files, or checklists.
- Names are trimmed and bounded; duplicate names are rejected case-insensitively for one user.
- Lists are private. They never appear on public opportunities, organization pages, exports unless explicitly selected, or analytics.

### API contracts

- `GET/POST /api/me/lists`
- `PATCH/DELETE /api/me/lists/:id`
- `POST/DELETE /api/me/lists/:id/opportunities/:opportunityId`
- `GET /api/me/lists/:id/opportunities`

Use owner-derived IDs, private no-store responses, idempotency for membership changes, and append-only audit events for structural mutations.

### UI surfaces and interactions

- Library does not become the home of Lists; Lists appear as an organizing layer in Opportunities and Tracker.
- Opportunity card/detail: `Add to List` popover with search, checked memberships, inline `Create list`, and a saved confirmation.
- Tracker: List filter alongside existing status/type/deadline filters; show active List chips with clear/remove actions.
- A Lists management view can live under Tracker settings or a compact panel, but it must not add a new top-level navigation item in this epic.
- Empty List state explains how to add opportunities; archived Lists remain recoverable from management.
- Multi-select and keyboard interaction should be supported on desktop; mobile uses a bottom sheet/popover with full-width rows.

### Story 5.3 acceptance gates

- Create, rename, archive/delete, add, remove, filter, and multi-list membership work end to end.
- Untracked opportunities cannot be added accidentally.
- List mutations survive reload and preserve Tracker/checklist state.
- Cross-user list IDs and memberships are isolated.
- Existing Opportunities and Tracker filters remain understandable when List filters are active.
- API, engine, persistence, mobile, keyboard, and Playwright tests pass.

## Delivery sequence

1. Finish Story 5.1 release gate: configure private Blob storage and verify file access/deletion.
2. Build Story 5.2 domain + Neon persistence + engine tests.
3. Add Story 5.2 API and Prepare UI on Opportunity detail, then Tracker progress.
4. Add Library picker/inline creation to the Prepare flow.
5. Run Story 5.2 privacy, reload, mobile, and E2E checks; mark it review.
6. Build Story 5.3 domain/API/persistence and integrate Add to List with Opportunities.
7. Add Tracker List filtering and management interactions; run isolation/E2E checks.
8. Re-run full build and update export boundaries so Library, checklists, and Lists are additive and explicit.

## Cross-epic boundaries

- Epic 5 does not implement organization submission forms or replace official submission links; Epic 6 owns the organization form and Epic 6.5 owns submitter uploads against that form.
- A Work in Library is creator-owned reusable material. A Workspace Submission Work is a submitted snapshot/record; the submission flow must copy references intentionally and never mutate the Library item retroactively.
- Story 5.2 prepares a creator but does not claim that an organization received, reviewed, or accepted anything.
- Story 5.3 organizes opportunities but does not replace Tracker status, deadlines, or system recommendations.

## Epic definition of done

- All three surfaces are private, reload-safe, owner-scoped, and documented.
- The creator journey works: Library → Opportunity → Prepare → List/Tracker → submission handoff.
- No raw file bytes, saved answer bodies, private checklist notes, or List names leak into public/organization projections.
- `DESIGN.md` checks pass: true white, semantic tokens, correct type roles, 44px controls, mobile behavior, keyboard focus, reduced-motion-safe interactions, and honest source/status language.
- Full engine/adapters/web/E2E validation passes, with live Neon rehearsal performed on a disposable branch for destructive persistence tests.
