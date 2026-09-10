# Connected Goals engine — September 7, 2026

Working route: /goals (authenticated). /design-system/goals remains a separate fictional design study and links to the connected route.

## Implemented

- Real catalogue search: public canonical opportunities plus organizations attached to public opportunities. Organization targets include their opportunities, not arbitrary name matches. Closed entries can be selected as targets; no reopening dates are invented.
- Account-owned Postgres goal, target, check-in and notification ledger tables. Additive 0045 migration applied to the configured Neon database. Existing records untouched except disposable test accounts created/removed during QA.
- Goal creation with dates, timezone, next step, 7/30-day/off cadence. UUID idempotency key and fingerprint prevent duplicate retries and reject changed payload replays. Atomic target validation and inserts.
- Progress derived from canonical tracker, actual submitted_at where available, otherwise earliest submitted-event recording time. Duplicate events do not double count. Current saved/preparing states don't count. This fallback is recording time, not claimed historical actual submission time; existing imported records without either timestamp are not counted.
- Goal target recommendations query current public open catalogue records, with explicit affinity reason. No prediction of success or full eligibility certification. No targets yields no goal-specific recommendations, not invented personalized results.
- Database clock and durable next_check_at independent of browser state. Owner revision checks on pause/resume/check-in. Cadence is elapsed 7/30-day intervals, not a promise of a fixed local weekday/time; timezone bounds progress dates.
- Scheduler locks due rows, deduplicates due slots, respects account in-app/reminder preferences, and writes to existing creator_inbox_alerts. Overlap safe. Notification ledger describes in-app insertion, not email/push receipt. Missed intervals coalesce into one current check-in rather than sending a backlog.
- Inbox recognizes goal check-in source, displays next step and links back to the specific owned goal.
- Existing protected /api/cron/tick invokes engine, including when ingestion itself is skipped. Dedicated /api/cron/goals endpoint uses CRON_SECRET bearer auth. Local worker command: node scripts/run-goals-worker.mjs. No browser interval needed; local worker needs host running. No hosted scheduler/deployment changed in this pass.

## Verification

scripts/tests/goals-integration.mjs: isolated owned account, real catalogue search, persistence, ownership denial, stale revision conflict, repeated submission event counting, concurrent due ticks and notification opt-out. Finally deletes its own test account and dependents.

scripts/tests/goals-browser.mjs: isolated signed-in test account, actual local HTTP APIs, real target search, create, reload/read-back, idempotent POST retry, pause/resume, recommendation request and 390px reflow. Test account removed afterwards. No third-party messages sent.

TypeScript and design-system checks passed. No deployment to Vercel or Cloudflare was performed.

## Remaining engine work

- Explicit program/series identity and annual-edition reconciliation, backed by confirmed publisher data. Organization matching alone is not proof of recurring program identity.
- Local-time preference UI, snooze, due-date edits, archive/completion policy, durable post-submission corrections and outcome goal types.
- Email consent/provider delivery and retries; external accountability partners require their own permissions. In-app is the only delivery channel here.
- Recommendation eligibility/budget/discipline integration and ranking beyond explicit chosen target affinity.
- App schema catalogue reconciliation: 0045 is additive SQL; Drizzle model/journal generation must reconcile existing duplicate 0042 history before automated migration promotion. No existing journal rewritten.

Do not label the complete annual accountability feature production-ready based on this first connected engine slice.

Local worker started during this session and polls every 60 seconds. It is a local development process, not a hosted availability guarantee.
