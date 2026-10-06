# Organization action parity: moving day-to-day actions into `/organization/[id]`

Date: 2026-10-06

## Why

In the Organization product (`/organization/[id]`), only three screens could change anything: the Opportunity creator and editor, the Portal Studio, and the blind-review setting. Every other screen showed records but offered no actions. The day-to-day actions lived on the legacy `/workspace` and `/submissions` pages, and nothing linked the two areas in either direction.

Production runs the compatibility workspace: `MISSA_WORKSPACE_RELATIONAL_AUTHORITY` is not set. That made the gap larger than "the actions live elsewhere". In that mode:

- the Portal Studio shows "Relational authority is required";
- the editor's **Publish** button can never be enabled, because its readiness check needs a relational configuration version;
- the blind-review setting answers every save with 503;
- `?section=review` in Settings crashed. Its unavailable-copy branch did not exclude `review`.

So an Organization could not set up Teams or Programs, build a form, or publish from the new product.

## What moved

Every control below calls an existing route that works in the compatibility workspace. The server re-checks `organization.manage`, so only Owners and Admins can use them.

| Action | Where | Route |
| --- | --- | --- |
| Create a Team, add a Program | Settings → Structure (dialogs) | `POST teams`, `POST teams/[entityId]/programs` |
| Build the submission form (questions, categories, fee, kinds of work) | Opportunity editor → Submission form | `POST/PATCH open-calls/[id]/submission-paths` |
| Publish an Opportunity | Opportunity editor → Review and publish (AlertDialog). Needs a saved form with at least one question | `POST open-calls/[id]/publish` |
| Close an Opportunity | Opportunity editor → Review and publish (destructive AlertDialog) | `DELETE open-calls/[id]` |
| Link a claimed Missa listing when creating a draft | New Opportunity | `POST open-calls` (`radarOpportunityId`) |
| Add a person, change a role, remove access | People access dossier (Dialog / AlertDialog). Server owner and last-admin safeguards apply | `POST members`, `PATCH/DELETE members/[accountId]` |
| Assign a reviewer in an existing or new round | Submission dossier → Reviews | `POST review-rounds`, `POST review-rounds/[id]/assign` |
| Record or change a Work's outcome | Submission dossier → Decisions, and the Decisions desk (RadioGroup dialog with the consequence stated) | `POST works/[id]/decision` |
| Set up a delivery task (with an optional due date), and mark it complete or reopen it | Submission dossier → Delivery, and the Delivery desk | `POST works/[id]/delivery-tasks`, `PATCH delivery-tasks/[id]` |
| Export Submissions | Submissions header (CSV in compatibility mode, JSON in relational mode) | `GET insights/export`, `GET submissions/export` |

Some actions existed in code but had no screen. One of them now has a screen:

| Action | Where | Route |
| --- | --- | --- |
| Email decisions: choose Works, add an optional note, preview every letter, then send | Decisions header | `POST decision-emails/preview`, `POST decision-emails/send` |

The send uses one idempotency key per reviewed batch, so retrying never sends twice. If the letter check holds a letter, it is shown and needs an explicit "send anyway". The control is hidden, with an explanation, unless `RESEND_API_KEY`, `RESEND_FROM` and `DATABASE_URL` are set.

Server change: the compatibility branch of `review-rounds/[roundId]/assign` now refuses a duplicate assignment (same reviewer, Submission and round) with 409. It also returns 400 instead of 500 for a malformed body.

## What did not move, and why

| Capability | Decision | Reason |
| --- | --- | --- |
| Bulk Submission actions | Not needed yet | The route only previews and changes nothing (`execution: 'preview-only'`). It also returns 503 in production. |
| JSON Submission export | Shown in relational mode only | The route is relational-only. The CSV export covers production. |
| Importing Opportunities and Submissions | Defer | Useful for migrating from Submittable, Google Forms or Airtable. But a Submission import can write a terminal status without per-Work Decisions (gate 3 of the Submissions, Reviews and Decisions contract), so that needs fixing first. |
| Erasure requests, retention policy | Defer to the relational cutover | Relational-only (503 in production). Erasure also has no list, reject or execute route, so a screen would collect requests that never run. |
| Reviewer groups, recusal, reassignment | Defer to the relational cutover | Relational-only (503 in production). Reassignment also skips the membership check that assignment has. |
| SCIM provisioning | Do not expose; fix first | One deployment-wide token for one Organization, and no token management. It can reuse and globally deactivate an account from another Organization, grant Owner, skip seat limits, and demote the last admin without a guard. |
| Billing actions | Unchanged | Organization paid plans are switched off. |

## Follow-ups

- Point the remaining `/workspace` entry points at `/organization/[id]`: the `AppNav` Organization link, `MissaSiteHeader`, platform-admin views, and the Stripe return URLs. Then make `/workspace` a compatibility redirect, as the overhaul coverage audit intends.
- In relational mode:
  - the assign route can return 500 after the assignment is created, because the advisory conflict check reads the compatibility store;
  - several compatibility-only routes throw (decision emails, imports, insights, Work files).
