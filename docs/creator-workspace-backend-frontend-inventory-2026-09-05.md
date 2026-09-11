# Creator workspace inventory — September 5, 2026

## Verification boundary

Source audit of current shared checkout, including uncommitted parallel-worker changes. No production database query, provider connection, email delivery, migration execution, or end-to-end certification performed. Existing code is not proof of configured/running services. This audit supersedes earlier conversational assumptions that calendar and Gmail integrations would be wholly new builds.

## Inventory

| Capability | Backend evidence | Frontend evidence | Remaining alignment |
|---|---|---|---|
| Save an existing opportunity | canonicalTracker.ts; account-scoped tracker endpoints; revision/idempotency support | save-to-tracker-button.tsx; tracker-product.tsx | Reuse real flow in approved workspace design; confirm undo and shared saved-state behavior across browse/rankings/workspace |
| Status/outcomes | canonical tracker status commands and tracked_status_events | tracker-product status actions | Actual event dates, corrections and reversal semantics; simple Submitted/Still working flow |
| My applications | canonical tracker listing; separate legacy Radar pipeline | /tracker uses TrackerProduct; creator-workspace.tsx also exists | Consolidate entry points; new design prototypes are NOT approved replacement UI |
| Manual/imported records | trackerImportPersistence.ts; canonicalTrackerImport.ts; import preview/commit routes | tracker-import-stepper.tsx | Verify imported rows appear consistently under relational authority; preserve manual entry as fallback |
| Personal finish dates | Generic calendar event CRUD exists | Calendar editor; local tracker prototype target field | Durable per-application target and timezone contract not found in canonical tracker projection |
| Calendar | creatorCalendarRepository.ts; encrypted provider credentials, OAuth, sync jobs/projections; calendar-providers.ts supports Google/Microsoft; ICS feed | calendar-workspace.tsx uses connections/events/sync APIs; feed button | Project tracked deadlines/response dates into provider-synced events, reconcile updates/deletions, background dispatch and provider QA |
| Notifications | creatorNotificationRepository; notification preferences endpoint; alert-delivery and cron tick; Resend webhook and mail service | notification-preferences-panel; tracker has notify toggle | Per-application event type/timing/channel overrides, response-check-in scheduling, cancellation on outcomes, account/legacy alert parity |
| Response estimates | Legacy responseStats; call profile response_time_days; directory response min/max/label; rankings telemetry median/p90 | Calendar renders expectedResponseBy; legacy tracker shows estimates; rankings telemetry panels | One provenance-aware estimator consumed everywhere; canonical tracker lacks estimate fields |
| Gmail detection | OAuth/sync routes, GoogleGmailProvider, gmail-sync-worker, cron, email review repository | GmailSyncCard in profile-product | Verify actual configuration, OAuth approval, persistence authority, matching accuracy and date evidence before enabling/promising automation |
| Forwarded email | forwarding routes, candidate review routes | EmailForwardingCard in profile-product | Existing surface is not proof of reliable original date extraction; not a basis for precise response statistics |
| Creator onboarding | account onboarding route/repository/taxonomy | creator-onboarding and /onboarding | Full signed-in journey and preference-to-workspace handoff QA |
| Public portfolio | Existing portfolio APIs and integration handoff | creator portfolio studio/account editor | Reuse; do not require manuscripts or public profile completion to track applications |

Paths above are relative to apps/web/components, apps/web/lib, apps/web/app/api or packages/radar-adapters/src unless explicitly otherwise.

## Concrete blockers

1. CanonicalTrackerItem in packages/radar-adapters/src/canonicalTracker.ts lacks expectedResponseBy and submission/response date fields. apps/web/app/(passport)/tracker/page.tsx selects this projection under relational authority; only the legacy branch maps expectedResponseBy.
2. Canonical status UPDATE changes status/revision/updated_at, records an event, but does not set submitted_at. creatorCalendarRepository.listTrackerItems consumes submitted_at. No submitted_at assignment trigger was found in the migration search. Verify database triggers before final runtime conclusion, then fix the shared contract.
3. packages/radar-engine/src/tracker/responseStats.ts counts received/in-review as responses and supplies a generic 90-day fallback. Distinguish acknowledgement, intermediate update and decision; remove unsupported expectations for sparse data.
4. creatorCalendarRepository builds a single date from submitted_at + call-profile response_time_days, without response-method/source range metadata or terminal-status filtering in that projection. Calendar UI maps deadlines regardless of status; ICS feed applies pre-submission filtering only to deadlines. Align all lifecycle rules.
5. Calendar UI combines generic stored events with computed tracker dates. Provider jobs operate on stored calendar event IDs; canonical save/status code has no calendar projection call. Do not assume visible tracker dates are provider-synced. Add a shared idempotent projection/reconciliation path and prove it.
6. Deadline delivery iterates engine.store alerts and users while preferences can use the relational repository. Establish that canonical saves generate the expected alerts and cancellations before claiming account-backed reminder delivery.
7. Response information exists in multiple models (profile ranges, call-profile days, rankings telemetry, legacy tracked events). No unified source/freshness/statistic/sample-size contract was identified. Do not average unlike statistics or invent ranges from a single average.

## Build order

1. Agree canonical application contract: submittedAt/responseAt with provenance, correctable dates, optional personal target, reminder overrides, response estimate metadata and authoritative destination.
2. Connect existing response datasets through one tested estimator. Separate decision from acknowledgement, distinguish user-reported evidence from observed evidence, omit unsupported estimates.
3. Bridge canonical lifecycle to calendar projection and reminders: save/update/submit/outcome/undo; no duplicate events; no stale reminders. Verify Google/Microsoft authorization and a background job runner while UI is closed.
4. Ideate and implement Saved / Awaiting responses / History on existing account-backed components, with direct Apply and notification dropdown. Replace manual-first prototype, not the underlying working infrastructure.
5. Run signed-in end-to-end tests on desktop/iPhone/Android: save, return, correct date, submit, calendar update, actual reminder delivery, record decision, stop reminders, undo, disconnect, retry/conflict behavior.
6. Gmail automation remains a separate release gate, reusing existing implementation only after an audit of configuration, permission, persistence, matching and timestamp fidelity. No need to begin a duplicate integration.

## Handoff truth

This is an inventory, not an implementation completion report. No existing worker code changed during the audit. Provider runtime/credentials, live response-data coverage and migration application remain unverified.
