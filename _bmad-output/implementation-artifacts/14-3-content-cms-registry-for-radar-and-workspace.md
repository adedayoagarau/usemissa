# Story 14.3: Content/CMS registry for Radar and Workspace content

Status: done

## Story

As a Missa platform operator, I want one registry for Radar opportunities,
claimed listings, and organization open calls, so that I can understand what
content exists, its lifecycle, and where its source of truth lives.

## Scope

Build a read-only `/admin/content` registry over the current Radar opportunity
and Workspace open-call records. This is a registry/read surface, not a claim
that Missa already has a durable editorial CMS.

## Current implementation context

- Radar canonical opportunities live in `RadarStore.opportunities`; duplicate
  records must remain distinguishable from canonical rows.
- Claims live in `RadarStore.claims`; source freshness is available through
  `RadarStore.sources` and opportunity timestamps.
- Workspace open calls live in `WorkspaceStore.openCalls` and are reached via
  entities/programs; organization names come from Radar organizations.
- Existing safe management/read links include `/admin/radar`, `/workspace`,
  `/org/:id`, and the existing open-call/API routes. Do not add unguarded
  mutation buttons to the platform registry.

## Acceptance criteria

1. Rows identify content type (`Radar opportunity` or `Workspace open call`),
   title, organization when known, lifecycle status, source/maturity, and last
   observed timestamp.
2. Radar and Workspace records remain visibly distinct and are not merged into
   one misleading count.
3. Search and type/status filters work on the client without a second backend
   authority or page overflow.
4. Duplicate Radar rows, unclaimed content, drafts, and unavailable timestamps
   are labelled truthfully.
5. Each row links only to an existing safe read/management surface.
6. The page explicitly calls out planned CMS capabilities: drafts, media
   assets, revisions, approvals, scheduled publishing, and editorial roles.

## Test plan

- Unit: registry projection, organization mapping, duplicate/status labels,
  empty/unavailable state.
- Route/page: platform-admin protection and no mutation side effects.
- E2E: type/status/search filters and mobile table behavior.

## Implementation and validation

- Added the read-only `/admin/content` registry and `GET /api/admin/content`
  over canonical/duplicate Radar opportunities and Workspace open calls.
- Rows retain content type, lifecycle, organization, source, maturity, observed
  time, and safe links. Radar records are never relabelled as Workspace calls.
- Added search, type/status filters, mobile-contained table behavior, and an
  explicit target list for drafts, media, revisions, approvals, scheduling,
  and editorial roles that still need durable CMS models.
- Focused projection tests cover Radar/Workspace separation and duplicate
  visibility; the platform E2E covers the page/filter controls.
