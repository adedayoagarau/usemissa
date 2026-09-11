# Missa repository-wide product inventory

Date: September 5, 2026. Scope extends beyond the active chat: current source tree, historical commits (including August), canonical architecture docs and present uncommitted worker work. This is a structural product inventory, with deeper creator-workspace findings in the linked audit. It is not a comprehensive code review or production certification. Gemini authorship cannot be established from filenames or commit subjects; all relevant shared-checkout work is included regardless of author.

## Index and evidence

Machine-readable companion: repository-surface-map-2026-09-05.json. Captures all 195 page entry files (93 design-system previews), 174 API route files, 37 backend entry files selected by filename and 157 test.ts files. Counts are file counts, not feature or passing-test counts. Entries include imports to support follow-up tracing; aliases/re-exported handlers may not be captured by the method scanner.

## Product areas

| Area | Existing backend/source | Existing frontend | Next audit/build need |
|---|---|---|---|
| Public opportunity catalogue | opportunityRepository, canonicalOpportunityProjection, taxonomy and opportunity contracts | /opportunities, /opportunities/[id], /discover/[slug] | Validate filter/count parity, source freshness and save handoff; do not rebuild catalogue |
| Directory and geographic discovery | profileRepository, countries contracts, source identity and geography migrations | /directory, /journals, /presses, /residencies, /grants, /countries | Verify live geographic coverage, empty states, migrations and category parity |
| Organization/publication profiles | organizationMediaDiscovery, profileIssueDiscovery, media extraction/review, profile repository | /journal, /press, /residency, /grant, /org variants; InstitutionProfileView | Check actual durable media quality and correct kind-specific presentation |
| Literary rankings and response telemetry | ranking repository/engine, awards/rankings/telemetry schema and ingestion scripts | /rankings/magazines, /compare, /plan, /claim; report-response and telemetry components | Work is actively changing. Verify source provenance, formulas, claim controls, and connection to creator response estimates |
| Account and onboarding | creatorAccountRepository, creatorPreferenceRepository, auth and /api/me/onboarding | /signup, /login, recovery routes, /onboarding | Real account continuity, skip/resume, recommendation preferences |
| Creator workspace and tracker | canonicalTracker, creatorTrackerRepository, imports and status APIs | /home, /tracker, /saved; workspace entry and separate prototypes | Consolidate navigation and wire agreed saved/awaiting/history UX; see deeper audit |
| Private work library | creatorLibraryRepository, workspace work models | /library and /library/works/[workId] | Check version/media lifecycle and ownership. Optional convenience, never prerequisite to external apply |
| Inbox/following/discovery alerts | creatorInboxRepository, notification/preference repositories, follow APIs | /inbox and discovery controls | Verify account-backed follow/save produces correct notifications and preferences apply |
| Calendar | creatorCalendarRepository, calendar-providers, provider routes and encrypted credentials | /calendar, CalendarWorkspace, feed controls | Existing Google/Microsoft code. Need runtime certification and tracker-to-provider projection, not new duplicate connector |
| Email and reminders | mail-service, effect ledger, Resend webhook, alert-delivery, cron tick | notification preferences, admin email previews | Verify actual dispatch, retry/cancellation/suppression and per-application response notifications |
| Gmail and forwarding | GoogleGmailProvider, sync worker/routes, email candidate review | GmailSyncCard and EmailForwardingCard in ProfileProduct | Existing implementation, not verified operational; audit authority, OAuth, evidence accuracy, dates and retention |
| Public creator portfolio | portfolio draft/media/publish/handle APIs; profile repositories | /profile/portfolio, /[handle], CreatorPortfolioStudio | Validate account draft → preview → publish → public view, conflicts and media, without recreating it |
| Hosted applications | workspace-engine RelationalWorkspace finalize/withdraw, submission paths and owner submission reads | hosted open-call routes, creator submission detail, organization submissions | Separate Missa-hosted submission from external application tracking; test actual hosted flow |
| Organization operations | entity/program/open-call commands, review assignment, decisions and delivery task methods | /organization/[organizationId] overview/opportunities/submissions/reviews/decisions/messages/people/settings/insights; /workspace variants | Determine canonical routes and authority; eliminate confusing duplicate navigation, test tenant permissions |
| Reviewer product | review assignments and completeReview; reviewer endpoints | /reviews, /reviews/[assignmentId], reviewer routes | Test assignment access, completion and decision handoff |
| Billing and administration | Stripe webhook, platform billing/message/CRM/audit/control ledgers | /admin billing/messaging/CRM/governance/support/analytics/system etc. | Verify configured integrations and governed effects, not just populated dashboards |
| Ingestion and publishing operations | ingestion-v2; Radar discovery/review/lifecycle/content/enrichment workers; publication gates | /admin/radar, /admin/ingestion-v2, /admin/gary, content/taxonomy surfaces | Verify live jobs, publication gates, coverage and source-specific quality; commit claims alone are insufficient |
| Public editorial/marketing | content/editorial workers and public routes | homepage, about, privacy, methodology and organization landing | Compare current source and content against design system and remaining requested page list |

## Historical work that predates this session

- 57ddfae6c: durable product overhaul documentation (August 31).
- 52e005da8: relational follow flow (August 30).
- 4d9c8d20c / c3137f5bc: calendar and creator relational test work (August 30). Historical test claims require current reruns before relying on them.
- 701371028 / 8a4117c51: governed operations and durable message effects (August 27).
- d7bfb892b: malware scan provider (August 27); provider availability unverified here.
- d270233cc: resumable first-Save handoff (August 17).
- 7ff3aa001 / b6a1918d7: account portfolio persistence/publishing (September 4).
- 6d3550273 / cff0ef795: mail infrastructure/templates/recovery and deadline delivery (September 4–5).

Subjects identify work to trace, not proof of feature completion. Companion source map identifies current files.

## Main reconciliation risks

1. Multiple implementations/authority paths: legacy Radar stores, canonical relational creator repositories, and separate design-system local previews. Test the active branch, not the easier legacy path.
2. Multiple navigation generations: older IA describes /workspace as organization entry while current creator work also touches it. Establish route ownership from actual code before design.
3. Source response data exists in different representations. Unify before claiming precise personal expectations.
4. Provider adapter, frontend connection button, migration file and successful live integration are four different facts.
5. Rejected prototypes remain in the repository as research artifacts, not approved UX.
6. Migration journal/order concerns are recorded in creator-workspace-direction-2026-09-05.md and need reconciliation with actual applied state.

## How to proceed without losing backend work

Use this inventory as the starting index for each slice. Before creating an API/component, trace its existing route → repository → schema → tests. Record one of: source present, wired in UI, locally tested, provider-tested, production verified. Do not collapse these into a single Done label.

Saved immediate work: ../NEXT-STEPS-creator-workspace.md. The next product slice remains the creator workspace, building on the existing platform rather than expanding infrastructure blindly.
